// Content script for PagerDuty and OpsGenie pages
// Injects a "Triage Alert" button and auto-extracts alert data

(function () {
  const BUTTON_ID = "ai-alert-triage-btn";

  function isPagerDuty(): boolean {
    return window.location.hostname.includes("pagerduty.com");
  }

  function isOpsGenie(): boolean {
    return window.location.hostname.includes("opsgenie.com");
  }

  function extractPagerDutyAlert(): string {
    const parts: string[] = [];

    // Title
    const title =
      document.querySelector('[data-test-id="incident-title"]') ||
      document.querySelector(".incident-title") ||
      document.querySelector("h1") ||
      document.querySelector('[class*="IncidentTitle"]');
    if (title?.textContent) parts.push(`Title: ${title.textContent.trim()}`);

    // Service
    const service =
      document.querySelector('[data-test-id="incident-service-name"]') ||
      document.querySelector('[class*="ServiceName"]') ||
      document.querySelector(".service-name");
    if (service?.textContent)
      parts.push(`Service: ${service.textContent.trim()}`);

    // Urgency
    const urgency =
      document.querySelector('[class*="urgency"]') ||
      document.querySelector('[class*="Urgency"]');
    if (urgency?.textContent)
      parts.push(`Urgency: ${urgency.textContent.trim()}`);

    // Description / details
    const desc =
      document.querySelector('[class*="IncidentDescription"]') ||
      document.querySelector('[class*="incident-description"]') ||
      document.querySelector('[data-test-id="incident-description"]') ||
      document.querySelector(".incident-body");
    if (desc?.textContent)
      parts.push(`Description: ${desc.textContent.trim()}`);

    // Status
    const status =
      document.querySelector('[class*="StatusBadge"]') ||
      document.querySelector('[class*="status"]');
    if (status?.textContent) parts.push(`Status: ${status.textContent.trim()}`);

    // Fallback: grab main content
    if (parts.length === 0) {
      const main = document.querySelector("main") || document.body;
      const text = main.textContent?.slice(0, 2000).trim() || "";
      parts.push(`PagerDuty Alert:\n${text}`);
    }

    return parts.join("\n");
  }

  function extractOpsGenieAlert(): string {
    const parts: string[] = [];

    // Alert title
    const title =
      document.querySelector('[class*="alert-detail-title"]') ||
      document.querySelector('[class*="AlertTitle"]') ||
      document.querySelector("h1");
    if (title?.textContent) parts.push(`Title: ${title.textContent.trim()}`);

    // Message
    const message =
      document.querySelector('[class*="alert-message"]') ||
      document.querySelector('[class*="AlertMessage"]');
    if (message?.textContent)
      parts.push(`Message: ${message.textContent.trim()}`);

    // Priority
    const priority =
      document.querySelector('[class*="priority"]') ||
      document.querySelector('[class*="Priority"]');
    if (priority?.textContent)
      parts.push(`Priority: ${priority.textContent.trim()}`);

    // Tags
    const tags = document.querySelectorAll('[class*="tag"]');
    const tagTexts: string[] = [];
    tags.forEach((t) => {
      if (t.textContent?.trim()) tagTexts.push(t.textContent.trim());
    });
    if (tagTexts.length) parts.push(`Tags: ${tagTexts.join(", ")}`);

    // Description
    const desc =
      document.querySelector('[class*="description"]') ||
      document.querySelector('[class*="Description"]');
    if (desc?.textContent)
      parts.push(`Description: ${desc.textContent.trim()}`);

    // Fallback
    if (parts.length === 0) {
      const main = document.querySelector("main") || document.body;
      const text = main.textContent?.slice(0, 2000).trim() || "";
      parts.push(`OpsGenie Alert:\n${text}`);
    }

    return parts.join("\n");
  }

  function createTriageButton(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      AI Triage
    `;
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #dc2626, #ea580c);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      font-family: -apple-system, system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4), 0 0 0 0 rgba(220, 38, 38, 0);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.05)";
      btn.style.boxShadow =
        "0 6px 25px rgba(220, 38, 38, 0.5), 0 0 0 3px rgba(220, 38, 38, 0.15)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow =
        "0 4px 20px rgba(220, 38, 38, 0.4), 0 0 0 0 rgba(220, 38, 38, 0)";
    });

    btn.addEventListener("click", () => {
      btn.innerHTML = `
        <span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:atspin 0.6s linear infinite;margin-right:6px;vertical-align:middle;"></span>
        Extracting...
      `;

      const alertText = isPagerDuty()
        ? extractPagerDutyAlert()
        : extractOpsGenieAlert();
      const source = isPagerDuty() ? "pagerduty" : "opsgenie";

      chrome.runtime.sendMessage(
        {
          type: "CONTENT_ALERT",
          payload: { alertText, source },
        },
        () => {
          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Sent to Triage
          `;
          btn.style.background = "linear-gradient(135deg, #059669, #10b981)";

          setTimeout(() => {
            btn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px;">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              AI Triage
            `;
            btn.style.background =
              "linear-gradient(135deg, #dc2626, #ea580c)";
          }, 2500);
        }
      );
    });

    return btn;
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes atspin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!isPagerDuty() && !isOpsGenie()) return;

    injectStyles();
    const btn = createTriageButton();
    document.body.appendChild(btn);
  }

  // Run on load and observe for SPA navigation
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-check on URL changes (SPA)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 1000);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
