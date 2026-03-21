import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

export interface PaletteCommand {
  id: string;
  label: string;
  icon: JSX.Element;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: PaletteCommand[];
}

const RECENT_KEY = "triageflow-recent-commands";
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(ids: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

/** Simple fuzzy match: all chars of query appear in order within target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return { match: true, score: 0 };

  let qi = 0;
  let score = 0;
  let prevMatch = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Consecutive matches score higher
      if (prevMatch === ti - 1) score += 3;
      // Start-of-word matches score higher
      else if (ti === 0 || t[ti - 1] === " ") score += 2;
      else score += 1;
      prevMatch = ti;
      qi++;
    }
  }

  return { match: qi === q.length, score };
}

export function CommandPalette({ commands }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut: Cmd+Shift+K / Ctrl+Shift+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter & sort commands
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent first, then rest
      const recent = getRecent();
      const recentCmds: PaletteCommand[] = [];
      const otherCmds: PaletteCommand[] = [];
      commands.forEach((cmd) => {
        if (recent.includes(cmd.id)) {
          recentCmds.push(cmd);
        } else {
          otherCmds.push(cmd);
        }
      });
      // Sort recent by order in recent array
      recentCmds.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id));
      return [...recentCmds, ...otherCmds];
    }
    return commands
      .map((cmd) => ({ cmd, ...fuzzyMatch(query, cmd.label) }))
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cmd);
  }, [commands, query]);

  // Clamp selected index
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (cmd: PaletteCommand) => {
      // Track recent
      const recent = getRecent().filter((id) => id !== cmd.id);
      recent.unshift(cmd.id);
      saveRecent(recent);

      setOpen(false);
      cmd.action();
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex]);
        }
      }
    },
    [filtered, selectedIndex, executeCommand]
  );

  if (!open) return null;

  const recentIds = getRecent();

  return (
    <div className="cmd-palette-overlay" onClick={() => setOpen(false)}>
      <div
        className="cmd-palette-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass card */}
        <div className="cmd-palette-card">
          {/* Search input */}
          <div className="cmd-palette-input-wrap">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cmd-palette-search-icon"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="cmd-palette-input"
              placeholder="Type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <kbd className="cmd-palette-kbd">ESC</kbd>
          </div>

          {/* Divider */}
          <div className="cmd-palette-divider" />

          {/* Command list */}
          <div ref={listRef} className="cmd-palette-list">
            {filtered.length === 0 && (
              <div className="cmd-palette-empty">
                No commands found
              </div>
            )}
            {filtered.map((cmd, i) => {
              const isRecent = !query.trim() && recentIds.includes(cmd.id);
              return (
                <button
                  key={cmd.id}
                  className={`cmd-palette-item ${i === selectedIndex ? "cmd-palette-item-active" : ""}`}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="cmd-palette-item-icon">{cmd.icon}</span>
                  <span className="cmd-palette-item-label">{cmd.label}</span>
                  {isRecent && (
                    <span className="cmd-palette-item-recent">recent</span>
                  )}
                  {cmd.shortcut && (
                    <kbd className="cmd-palette-item-shortcut">{cmd.shortcut}</kbd>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="cmd-palette-footer">
            <span>
              <kbd className="cmd-palette-kbd-sm">&uarr;&darr;</kbd> navigate
            </span>
            <span>
              <kbd className="cmd-palette-kbd-sm">&crarr;</kbd> select
            </span>
            <span>
              <kbd className="cmd-palette-kbd-sm">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
