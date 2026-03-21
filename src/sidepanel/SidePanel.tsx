import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Alert, TriageResult, Incident, MessageType, Priority } from "../shared/types";
import type { FavoriteItem } from "../shared/favorites";
import { getFavorites, getFavoritesCount } from "../shared/favorites";
import {
  generateId,
  priorityBadge,
  timeAgo,
  copyToClipboard,
} from "../shared/utils";
import { ThemeToggle } from "../ui/ThemeToggle";
import { OnboardingTour } from "../ui/OnboardingTour";
import { CommandPalette, type PaletteCommand } from "../ui/CommandPalette";
import { FavoriteButton } from "../ui/FavoriteButton";
import { ApiErrorFallback } from "../ui/ApiErrorFallback";
import { ExportMenu } from "../ui/ExportMenu";

type Tab = "inbox" | "incidents" | "favorites";

export function SidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inputText, setInputText] = useState("");
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [favItems, setFavItems] = useState<FavoriteItem[]>([]);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for triage results
  useEffect(() => {
    const listener = (msg: MessageType) => {
      if (msg.type === "TRIAGE_RESULT") {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === msg.payload.alertId
              ? { ...a, triage: msg.payload.result, status: "triaged" }
              : a
          )
        );
      }
      if (msg.type === "TRIAGE_ERROR") {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === msg.payload.alertId ? { ...a, status: "pending" } : a
          )
        );
        setApiErrors((prev) => ({
          ...prev,
          [msg.payload.alertId]: msg.payload.error,
        }));
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Check for pending alerts from content script
  useEffect(() => {
    const checkPending = () => {
      chrome.storage.local.get("pendingAlerts", (data) => {
        const pending = data.pendingAlerts || [];
        if (pending.length > 0) {
          const newAlerts: Alert[] = pending.map(
            (p: { text: string; source: string; timestamp: number }) => ({
              id: generateId(),
              raw: p.text,
              timestamp: p.timestamp,
              source: p.source as Alert["source"],
              status: "pending" as const,
            })
          );
          setAlerts((prev) => [...newAlerts, ...prev]);
          chrome.storage.local.set({ pendingAlerts: [] });
          // Auto-triage
          newAlerts.forEach((a) => triageAlert(a));
        }
      });
    };
    checkPending();
    const interval = setInterval(checkPending, 2000);
    return () => clearInterval(interval);
  }, []);

  const triageAlert = useCallback((alert: Alert) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, status: "triaging" } : a))
    );
    chrome.runtime.sendMessage({
      type: "TRIAGE_ALERT",
      payload: { alertText: alert.raw, alertId: alert.id },
    });
  }, []);

  const addAlert = useCallback(() => {
    if (!inputText.trim()) return;
    const alert: Alert = {
      id: generateId(),
      raw: inputText.trim(),
      timestamp: Date.now(),
      source: "paste",
      status: "pending",
    };
    setAlerts((prev) => [alert, ...prev]);
    setInputText("");
    triageAlert(alert);
    inputRef.current?.focus();
  }, [inputText, triageAlert]);

  const createIncident = useCallback(
    (alert: Alert) => {
      if (!alert.triage) return;
      const incident: Incident = {
        id: generateId(),
        title: alert.triage.summary,
        priority: alert.triage.priority,
        category: alert.triage.category,
        alerts: [alert.id],
        summary: alert.triage.slackSummary,
        actions: alert.triage.actions,
        escalation: alert.triage.escalation,
        createdAt: Date.now(),
      };
      setIncidents((prev) => [incident, ...prev]);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id ? { ...a, status: "incident_created" } : a
        )
      );
      setActiveTab("incidents");
    },
    []
  );

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearAll = () => {
    setAlerts([]);
    setIncidents([]);
  };

  // Load favorites count
  const refreshFavorites = useCallback(async () => {
    const count = await getFavoritesCount();
    setFavCount(count);
    if (activeTab === "favorites") {
      const items = await getFavorites();
      setFavItems(items);
    }
  }, [activeTab]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  // Command palette commands
  const paletteCommands: PaletteCommand[] = [
    {
      id: "triage-alert",
      label: "Triage Alert",
      shortcut: "Ctrl+Enter",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
      action: () => {
        setActiveTab("inbox");
        setTimeout(() => inputRef.current?.focus(), 100);
      },
    },
    {
      id: "view-incidents",
      label: "View Incidents",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      action: () => setActiveTab("incidents"),
    },
    {
      id: "create-incident",
      label: "Create Incident",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
      action: () => {
        const triaged = alerts.find((a) => a.status === "triaged" && a.triage);
        if (triaged) createIncident(triaged);
        else setActiveTab("inbox");
      },
    },
    {
      id: "view-favorites",
      label: "View Favorites",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      action: () => {
        setActiveTab("favorites");
        refreshFavorites();
      },
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
      action: () => {
        // Cycle theme: dark -> light -> system -> dark
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : current === "light" ? "dark" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.classList.toggle("light", next === "light");
        localStorage.setItem("alert-triage-theme", next);
        try { chrome.storage?.local?.set({ "alert-triage-theme": next }); } catch {}
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
      action: () => {
        // Placeholder for future settings panel
        setActiveTab("inbox");
      },
    },
    {
      id: "pagerduty-mode",
      label: "PagerDuty Mode",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
      action: () => {
        chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url?.includes("pagerduty.com")) {
            chrome.tabs.sendMessage(tabs[0].id!, { type: "ACTIVATE_TRIAGE_MODE" });
          }
        });
      },
    },
    {
      id: "slack-summary",
      label: "Slack Summary",
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="8" x2="12" y2="8"/><line x1="8" y1="16" x2="14" y2="16"/></svg>,
      action: async () => {
        const triaged = alerts.filter((a) => a.triage);
        if (triaged.length > 0) {
          const summary = triaged
            .map((a) => a.triage!.slackSummary)
            .join("\n\n");
          await copyToClipboard(summary);
          setCopiedId("slack-all");
          setTimeout(() => setCopiedId(null), 2000);
        }
      },
    },
  ];

  const stats = {
    total: alerts.length,
    p0: alerts.filter((a) => a.triage?.priority === "P0").length,
    p1: alerts.filter((a) => a.triage?.priority === "P1").length,
    noise: alerts.filter((a) => a.triage?.isNoise).length,
  };

  return (
    <div className="h-screen flex flex-col">
      <OnboardingTour />
      <CommandPalette commands={paletteCommands} />
      {/* Header */}
      <div className="header-bar px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              AT
            </div>
            <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>TriageFlow AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {alerts.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {stats.total > 0 && (
          <div className="flex gap-3 text-[10px] text-gray-500 mb-3">
            <span>{stats.total} alerts</span>
            {stats.p0 > 0 && (
              <span className="text-red-400">{stats.p0} P0</span>
            )}
            {stats.p1 > 0 && (
              <span className="text-orange-400">{stats.p1} P1</span>
            )}
            {stats.noise > 0 && (
              <span className="text-yellow-400">{stats.noise} noise</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {(["inbox", "incidents", "favorites"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "favorites") refreshFavorites();
              }}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${
                activeTab === tab
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab === "favorites" ? (
                <span className="flex items-center justify-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  {tab}
                  {favCount > 0 && (
                    <span className="favorites-badge">{favCount}</span>
                  )}
                </span>
              ) : (
                <>
                  {tab}
                  {tab === "incidents" && incidents.length > 0 && (
                    <span className="ml-1 text-blue-400">({incidents.length})</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "inbox" && (
          <div className="p-4 space-y-3">
            {/* Input */}
            <div className="space-y-2">
              <textarea
                ref={inputRef}
                className="textarea-field text-sm"
                rows={4}
                placeholder="Paste alert text here...&#10;Or use the Triage button on PagerDuty/OpsGenie"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addAlert();
                }}
              />
              <button
                className="btn-primary text-sm w-full"
                onClick={addAlert}
                disabled={!inputText.trim()}
              >
                Add &amp; Triage Alert
              </button>
            </div>

            {/* Alert list */}
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <div className="text-3xl mb-2">&#x1F6A8;</div>
                <p className="text-sm">No alerts yet</p>
                <p className="text-xs mt-1">
                  Paste an alert or use PagerDuty/OpsGenie integration
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    expanded={expandedAlert === alert.id}
                    onToggle={() =>
                      setExpandedAlert(
                        expandedAlert === alert.id ? null : alert.id
                      )
                    }
                    onRetriage={() => {
                      setApiErrors((prev) => {
                        const next = { ...prev };
                        delete next[alert.id];
                        return next;
                      });
                      triageAlert(alert);
                    }}
                    onCreateIncident={() => createIncident(alert)}
                    onCopy={(text) => handleCopy(text, alert.id)}
                    copied={copiedId === alert.id}
                    onFavToggle={refreshFavorites}
                    apiError={apiErrors[alert.id]}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "incidents" && (
          <div className="p-4 space-y-3">
            {incidents.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <div className="text-3xl mb-2">&#x1F4CB;</div>
                <p className="text-sm">No incidents created</p>
                <p className="text-xs mt-1">
                  Create incidents from triaged alerts
                </p>
              </div>
            ) : (
              incidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  onCopy={(text) => handleCopy(text, inc.id)}
                  copied={copiedId === inc.id}
                  onFavToggle={refreshFavorites}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="p-4 space-y-3">
            {favItems.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <div className="text-3xl mb-2">&#x2B50;</div>
                <p className="text-sm">No favorites yet</p>
                <p className="text-xs mt-1">
                  Star alerts and incidents to save them here
                </p>
              </div>
            ) : (
              favItems.map((fav) => (
                <div key={fav.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {fav.priority && (
                          <span className={`badge ${priorityBadge(fav.priority as Priority)}`}>
                            {fav.priority}
                          </span>
                        )}
                        {fav.category && (
                          <span className="badge bg-gray-700/50 text-gray-300 border border-gray-600/30 text-[10px]">
                            {fav.category}
                          </span>
                        )}
                        <span className="badge bg-gray-700/50 text-gray-400 border border-gray-600/30 text-[10px] capitalize">
                          {fav.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200">{fav.title}</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        {timeAgo(fav.timestamp)}
                      </p>
                    </div>
                    <FavoriteButton
                      item={fav}
                      onToggle={() => refreshFavorites()}
                    />
                  </div>
                  {fav.snippet && (
                    <pre className="text-[10px] text-gray-500 bg-gray-950 rounded p-2 mt-2 overflow-x-auto max-h-16 whitespace-pre-wrap">
                      {fav.snippet}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Command palette hint */}
      <div className="px-4 py-1.5 text-center border-t" style={{ borderColor: "var(--border-primary)" }}>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          <kbd className="cmd-palette-kbd-sm">Ctrl</kbd>+<kbd className="cmd-palette-kbd-sm">Shift</kbd>+<kbd className="cmd-palette-kbd-sm">K</kbd> command palette
        </p>
      </div>
    </div>
  );
}

/* ─── Alert Card ─── */
function AlertCard({
  alert,
  expanded,
  onToggle,
  onRetriage,
  onCreateIncident,
  onCopy,
  copied,
  onFavToggle,
  apiError,
}: {
  alert: Alert;
  expanded: boolean;
  onToggle: () => void;
  onRetriage: () => void;
  onCreateIncident: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
  onFavToggle?: () => void;
  apiError?: string;
}) {
  const t = alert.triage;
  const isLoading = alert.status === "triaging";

  const favItem: FavoriteItem = {
    id: alert.id,
    type: "alert",
    title: t?.summary || alert.raw.slice(0, 80),
    priority: t?.priority,
    category: t?.category,
    timestamp: alert.timestamp,
    snippet: t?.slackSummary || alert.raw.slice(0, 200),
  };

  return (
    <div
      className={`card transition-all ${
        t?.priority === "P0" ? "animate-pulse-border border-red-500/30" : ""
      } ${isLoading ? "shimmer" : ""}`}
    >
      {/* Header row */}
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {t && (
              <>
                <span className={`badge ${priorityBadge(t.priority)}`}>
                  {t.priority}
                </span>
                <span className="badge bg-gray-700/50 text-gray-300 border border-gray-600/30 text-[10px]">
                  {t.category}
                </span>
                {t.isNoise && (
                  <span className="badge bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 text-[10px]">
                    NOISE
                  </span>
                )}
              </>
            )}
            {isLoading && (
              <span className="text-[10px] text-blue-400 flex items-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                Analyzing...
              </span>
            )}
            <span className="text-[10px] text-gray-600 ml-auto whitespace-nowrap">
              {alert.source} &middot; {timeAgo(alert.timestamp)}
            </span>
          </div>
          <p className="text-xs text-gray-300 truncate">
            {t?.summary || alert.raw.slice(0, 100)}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {t && <FavoriteButton item={favItem} size="sm" onToggle={onFavToggle ? () => onFavToggle() : undefined} />}
          <span className="text-gray-600 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* API Error */}
      {apiError && !isLoading && (
        <div className="mt-2">
          <ApiErrorFallback error={apiError} onRetry={onRetriage} />
        </div>
      )}

      {/* Expanded */}
      {expanded && t && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
          {/* Root cause */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Root Cause
            </h4>
            <p className="text-xs text-gray-300">{t.rootCause}</p>
          </div>

          {t.isNoise && t.noiseReason && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2">
              <p className="text-xs text-yellow-400">
                Noise: {t.noiseReason}
              </p>
            </div>
          )}

          {/* Actions */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Recommended Actions
            </h4>
            <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
              {t.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </div>

          {/* Escalation */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Escalation Path
            </h4>
            <div className="text-xs text-gray-300 space-y-0.5">
              <p>
                Team: <span className="text-white">{t.escalation.team}</span>
              </p>
              <p>
                Channel:{" "}
                <span className="text-blue-400">{t.escalation.channel}</span>
              </p>
              {t.escalation.runbook && (
                <p>
                  Runbook:{" "}
                  <span className="text-green-400">{t.escalation.runbook}</span>
                </p>
              )}
              <p>
                Contacts: {t.escalation.contacts.join(", ")}
              </p>
            </div>
          </div>

          {/* Raw alert */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Raw Alert
            </h4>
            <pre className="text-[10px] text-gray-500 bg-gray-950 rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap">
              {alert.raw}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(t.slackSummary);
              }}
            >
              {copied ? "Copied!" : "Copy Slack Summary"}
            </button>
            <ExportMenu
              data={{ type: "triage", result: t, alertRaw: alert.raw }}
              size="sm"
            />
            {alert.status !== "incident_created" && (
              <button
                className="btn-primary text-xs flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateIncident();
                }}
              >
                Create Incident
              </button>
            )}
            {alert.status === "incident_created" && (
              <span className="text-[10px] text-green-400 self-center">
                Incident created
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded but no triage yet and not loading */}
      {expanded && !t && !isLoading && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <pre className="text-[10px] text-gray-500 bg-gray-950 rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap mb-2">
            {alert.raw}
          </pre>
          <button className="btn-primary text-xs w-full" onClick={onRetriage}>
            Triage Now
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Incident Card ─── */
function IncidentCard({
  incident,
  onCopy,
  copied,
  onFavToggle,
}: {
  incident: Incident;
  onCopy: (text: string) => void;
  copied: boolean;
  onFavToggle?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const favItem: FavoriteItem = {
    id: incident.id,
    type: "incident",
    title: incident.title,
    priority: incident.priority,
    category: incident.category,
    timestamp: incident.createdAt,
    snippet: incident.summary,
  };

  return (
    <div className="card">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${priorityBadge(incident.priority)}`}>
              {incident.priority}
            </span>
            <span className="badge bg-gray-700/50 text-gray-300 border border-gray-600/30 text-[10px]">
              {incident.category}
            </span>
          </div>
          <p className="text-xs text-gray-200">{incident.title}</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Created {timeAgo(incident.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <FavoriteButton item={favItem} size="sm" onToggle={onFavToggle ? () => onFavToggle() : undefined} />
          <span className="text-gray-600 text-xs">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Actions
            </h4>
            <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
              {incident.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Escalation
            </h4>
            <div className="text-xs text-gray-300 space-y-0.5">
              <p>
                Team: <span className="text-white">{incident.escalation.team}</span>
              </p>
              <p>
                Channel:{" "}
                <span className="text-blue-400">
                  {incident.escalation.channel}
                </span>
              </p>
              <p>Contacts: {incident.escalation.contacts.join(", ")}</p>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Slack Summary
            </h4>
            <pre className="text-[10px] text-gray-400 bg-gray-950 rounded p-2 whitespace-pre-wrap">
              {incident.summary}
            </pre>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(incident.summary);
              }}
            >
              {copied ? "Copied!" : "Copy Slack Summary"}
            </button>
            <ExportMenu
              data={{ type: "incident", incident }}
              size="sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
