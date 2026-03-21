import React, { useState, useEffect, useCallback } from "react";

const ONBOARDING_KEY = "alert-triage-onboarding-done";

interface Step {
  title: string;
  description: string;
  icon: JSX.Element;
}

const steps: Step[] = [
  {
    title: "Welcome to Alert Triage",
    description:
      "Your AI-powered SRE companion. Cut through alert noise, classify incidents instantly, and reduce MTTR with intelligent triage that understands your infrastructure.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="onboarding-icon">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: "Paste or Receive Alerts",
    description:
      "Paste alert text directly into the inbox, or let the PagerDuty/OpsGenie integration auto-capture alerts from your browser. One click on any incident page sends it straight to triage.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="onboarding-icon">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    ),
  },
  {
    title: "AI Classifies Automatically",
    description:
      "Every alert is analyzed by AI and assigned a priority (P0 critical through P4 informational), categorized (infra, app, network, security, db), with root cause analysis, recommended actions, and escalation paths.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="onboarding-icon">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

function createConfetti() {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;overflow:hidden;";
  document.body.appendChild(container);

  const colors = [
    "#f43f5e",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
  ];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = Math.random() * 8 + 4;
    const rotation = Math.random() * 360;
    const shape = Math.random() > 0.5 ? "50%" : "0";

    piece.style.cssText = `
      position:absolute;
      top:-10px;
      left:${left}%;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:${shape};
      transform:rotate(${rotation}deg);
      animation:confetti-fall ${1.5 + Math.random()}s ease-out ${delay}s forwards;
      opacity:0;
    `;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3000);
}

export function OnboardingTour({ onComplete }: { onComplete?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setVisible(true);
    }
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    try {
      chrome.storage?.local?.set({ [ONBOARDING_KEY]: true });
    } catch {}
    createConfetti();
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    try {
      chrome.storage?.local?.set({ [ONBOARDING_KEY]: true });
    } catch {}
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Glass card */}
        <div className="onboarding-card">
          {/* Skip button */}
          <button onClick={skip} className="onboarding-skip" aria-label="Skip onboarding">
            Skip
          </button>

          {/* Icon */}
          <div className="onboarding-icon-wrap">{current.icon}</div>

          {/* Content */}
          <h2 className="onboarding-title">{current.title}</h2>
          <p className="onboarding-desc">{current.description}</p>

          {/* Progress dots */}
          <div className="onboarding-dots">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`onboarding-dot ${i === step ? "active" : ""}`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="onboarding-nav">
            {step > 0 ? (
              <button onClick={prev} className="onboarding-btn-secondary">
                Back
              </button>
            ) : (
              <div />
            )}
            <button onClick={next} className="onboarding-btn-primary">
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
