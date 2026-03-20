export type Priority = "P0" | "P1" | "P2" | "P3" | "P4";
export type Category = "infra" | "app" | "network" | "security" | "db";

export interface TriageResult {
  priority: Priority;
  category: Category;
  summary: string;
  isNoise: boolean;
  noiseReason?: string;
  rootCause: string;
  actions: string[];
  escalation: EscalationPath;
  slackSummary: string;
}

export interface EscalationPath {
  team: string;
  channel: string;
  runbook?: string;
  contacts: string[];
}

export interface Alert {
  id: string;
  raw: string;
  timestamp: number;
  source: "paste" | "pagerduty" | "opsgenie" | "webhook";
  triage?: TriageResult;
  status: "pending" | "triaging" | "triaged" | "incident_created";
}

export interface Incident {
  id: string;
  title: string;
  priority: Priority;
  category: Category;
  alerts: string[];
  summary: string;
  actions: string[];
  escalation: EscalationPath;
  createdAt: number;
}

// Message types for background communication
export type MessageType =
  | { type: "TRIAGE_ALERT"; payload: { alertText: string; alertId: string } }
  | { type: "TRIAGE_RESULT"; payload: { alertId: string; result: TriageResult } }
  | { type: "TRIAGE_ERROR"; payload: { alertId: string; error: string } }
  | { type: "TRIAGE_STREAM"; payload: { alertId: string; chunk: string } }
  | { type: "OPEN_SIDEPANEL" }
  | { type: "CONTENT_ALERT"; payload: { alertText: string; source: "pagerduty" | "opsgenie" } };
