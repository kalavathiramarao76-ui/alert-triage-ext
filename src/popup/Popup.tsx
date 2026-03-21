import React, { useState, useEffect, useCallback } from "react";
import type { TriageResult, MessageType } from "../shared/types";
import type { FavoriteItem } from "../shared/favorites";
import { generateId, priorityBadge, copyToClipboard } from "../shared/utils";
import { ThemeToggle } from "../ui/ThemeToggle";
import { FavoriteButton } from "../ui/FavoriteButton";
import { ApiErrorFallback } from "../ui/ApiErrorFallback";
import { ExportMenu } from "../ui/ExportMenu";

export function Popup() {
  const [alertText, setAlertText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [alertId] = useState(() => generateId());

  useEffect(() => {
    const listener = (msg: MessageType) => {
      if (msg.type === "TRIAGE_RESULT" && msg.payload.alertId === alertId) {
        setResult(msg.payload.result);
        setLoading(false);
      }
      if (msg.type === "TRIAGE_ERROR" && msg.payload.alertId === alertId) {
        setError(msg.payload.error);
        setLoading(false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [alertId]);

  const handleTriage = useCallback(() => {
    if (!alertText.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    chrome.runtime.sendMessage({
      type: "TRIAGE_ALERT",
      payload: { alertText: alertText.trim(), alertId },
    });
  }, [alertText, alertId]);

  const openSidePanel = () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
    window.close();
  };

  const handleCopy = async () => {
    if (result?.slackSummary) {
      await copyToClipboard(result.slackSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-[400px] min-h-[300px] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            AT
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>IncidentIQ</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>AI-powered alert triage</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={openSidePanel}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Open Full Panel &rarr;
          </button>
        </div>
      </div>

      {/* Input */}
      <textarea
        className="textarea-field text-sm"
        rows={5}
        placeholder="Paste an alert here...&#10;&#10;e.g., CRITICAL: CPU usage at 98% on prod-web-01, duration: 15min, service: checkout-api"
        value={alertText}
        onChange={(e) => setAlertText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTriage();
        }}
      />

      <button
        className="btn-primary text-sm w-full flex items-center justify-center gap-2"
        onClick={handleTriage}
        disabled={loading || !alertText.trim()}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          "Triage Alert"
        )}
      </button>

      {/* Error */}
      {error && (
        <ApiErrorFallback
          error={error}
          onRetry={handleTriage}
        />
      )}

      {/* Result */}
      {result && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${priorityBadge(result.priority)}`}>
              {result.priority}
            </span>
            <span className="badge bg-gray-700/50 text-gray-300 border border-gray-600/30">
              {result.category}
            </span>
            {result.isNoise && (
              <span className="badge bg-yellow-600/20 text-yellow-400 border border-yellow-500/30">
                NOISE
              </span>
            )}
            <FavoriteButton
              item={{
                id: alertId,
                type: "alert",
                title: result.summary,
                priority: result.priority,
                category: result.category,
                timestamp: Date.now(),
                snippet: result.slackSummary,
              } as FavoriteItem}
              size="sm"
            />
          </div>

          <p className="text-sm text-gray-200">{result.summary}</p>

          <div className="text-xs text-gray-400 space-y-1">
            <p>
              <span className="text-gray-500">Root cause:</span>{" "}
              {result.rootCause}
            </p>
            <p>
              <span className="text-gray-500">Escalate to:</span>{" "}
              {result.escalation.team} ({result.escalation.channel})
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs flex-1"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy Slack Summary"}
            </button>
            <ExportMenu
              data={{ type: "triage", result, alertRaw: alertText }}
              size="sm"
            />
            <button
              className="btn-primary text-xs flex-1"
              onClick={openSidePanel}
            >
              Full Details
            </button>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <p className="text-[10px] text-gray-600 text-center">
        Ctrl+Enter to triage | Works on PagerDuty &amp; OpsGenie
      </p>
    </div>
  );
}
