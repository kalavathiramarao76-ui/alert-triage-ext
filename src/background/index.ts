import { TRIAGE_SYSTEM_PROMPT, buildTriagePrompt } from "../shared/prompts";
import type { TriageResult, MessageType } from "../shared/types";

const API_URL = "https://sai.sharedllm.com/v1/chat/completions";
const MODEL = "gpt-oss:120b";

// Open side panel on action click
chrome.sidePanel
  ?.setPanelBehavior?.({ openPanelOnActionClick: false })
  .catch(() => {});

chrome.runtime.onMessage.addListener(
  (message: MessageType, _sender, sendResponse) => {
    if (message.type === "TRIAGE_ALERT") {
      handleTriage(message.payload.alertText, message.payload.alertId);
      sendResponse({ ok: true });
    }
    if (message.type === "OPEN_SIDEPANEL") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          (chrome.sidePanel as any)?.open?.({ tabId: tabs[0].id });
        }
      });
      sendResponse({ ok: true });
    }
    if (message.type === "CONTENT_ALERT") {
      // Store alert for side panel to pick up
      chrome.storage.local.get("pendingAlerts", (data) => {
        const pending = data.pendingAlerts || [];
        pending.push({
          text: message.payload.alertText,
          source: message.payload.source,
          timestamp: Date.now(),
        });
        chrome.storage.local.set({ pendingAlerts: pending });
      });
      // Open side panel
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          (chrome.sidePanel as any)?.open?.({ tabId: tabs[0].id });
        }
      });
      sendResponse({ ok: true });
    }
    return true;
  }
);

async function handleTriage(alertText: string, alertId: string) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: TRIAGE_SYSTEM_PROMPT },
          { role: "user", content: buildTriagePrompt(alertText) },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response - handle code fences
    let jsonStr = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1];
    }
    jsonStr = jsonStr.trim();

    let result: TriageResult;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON object
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        result = JSON.parse(objMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Validate required fields
    if (!result.priority || !result.category) {
      throw new Error("Invalid triage result: missing priority or category");
    }

    // Broadcast result
    chrome.runtime.sendMessage({
      type: "TRIAGE_RESULT",
      payload: { alertId, result },
    } as MessageType).catch(() => {});

    // Also store in local storage for persistence
    chrome.storage.local.get("triageResults", (data) => {
      const results = data.triageResults || {};
      results[alertId] = result;
      chrome.storage.local.set({ triageResults: results });
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    chrome.runtime.sendMessage({
      type: "TRIAGE_ERROR",
      payload: { alertId, error },
    } as MessageType).catch(() => {});
  }
}
