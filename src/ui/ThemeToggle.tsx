import React, { useState, useEffect, useRef } from "react";

export type ThemeMode = "dark" | "light" | "system";

const STORAGE_KEY = "alert-triage-theme";

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("light", resolved === "light");
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved) {
      setMode(saved);
      applyTheme(saved);
    }
    // Also try chrome.storage
    try {
      chrome.storage?.local?.get(STORAGE_KEY, (data) => {
        const val = data[STORAGE_KEY] as ThemeMode | undefined;
        if (val) {
          setMode(val);
          applyTheme(val);
          localStorage.setItem(STORAGE_KEY, val);
        }
      });
    } catch {}
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    try {
      chrome.storage?.local?.set({ [STORAGE_KEY]: newMode });
    } catch {}
    setOpen(false);
  };

  const icons: Record<ThemeMode, JSX.Element> = {
    light: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    dark: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    system: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  };

  const labels: Record<ThemeMode, string> = {
    dark: "Dark",
    light: "Light",
    system: "System",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="theme-toggle-btn"
        title={`Theme: ${labels[mode]}`}
        aria-label={`Current theme: ${labels[mode]}. Click to change.`}
      >
        {icons[mode]}
      </button>
      {open && (
        <div className="theme-dropdown">
          {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              className={`theme-dropdown-item ${mode === m ? "active" : ""}`}
            >
              <span className="theme-dropdown-icon">{icons[m]}</span>
              <span>{labels[m]}</span>
              {mode === m && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
