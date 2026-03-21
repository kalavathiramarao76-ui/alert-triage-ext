import React, { useState, useEffect, useCallback } from "react";

interface ApiErrorFallbackProps {
  error: string;
  onRetry: () => void;
  retryDelay?: number;
}

export function ApiErrorFallback({
  error,
  onRetry,
  retryDelay = 10,
}: ApiErrorFallbackProps) {
  const [countdown, setCountdown] = useState(retryDelay);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setCountdown(retryDelay);
    setPaused(false);
  }, [error, retryDelay]);

  useEffect(() => {
    if (paused || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, countdown]);

  useEffect(() => {
    if (countdown === 0 && !paused) {
      onRetry();
    }
  }, [countdown, paused, onRetry]);

  const handleManualRetry = useCallback(() => {
    setCountdown(retryDelay);
    setPaused(false);
    onRetry();
  }, [onRetry, retryDelay]);

  const progressPercent = ((retryDelay - countdown) / retryDelay) * 100;

  return (
    <div className="api-error-fallback">
      <div className="api-error-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div className="api-error-content">
        <p className="api-error-message">{error}</p>

        <div className="api-error-countdown-bar">
          <div
            className="api-error-countdown-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="api-error-actions">
          <span className="api-error-timer">
            {paused
              ? "Paused"
              : countdown > 0
              ? `Retrying in ${countdown}s`
              : "Retrying..."}
          </span>
          <div className="api-error-buttons">
            <button
              className="api-error-btn-pause"
              onClick={() => setPaused(!paused)}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button className="api-error-btn-retry" onClick={handleManualRetry}>
              Retry Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
