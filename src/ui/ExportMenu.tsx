import React, { useState, useRef, useEffect } from "react";
import type { TriageResult, Priority, Incident } from "../shared/types";
import { copyToClipboard } from "../shared/utils";

type ExportData =
  | { type: "triage"; result: TriageResult; alertRaw?: string }
  | { type: "incident"; incident: Incident };

interface ExportMenuProps {
  data: ExportData;
  size?: "sm" | "md";
}

function priorityLabel(p: Priority): string {
  const map: Record<Priority, string> = {
    P0: "CRITICAL",
    P1: "HIGH",
    P2: "MEDIUM",
    P3: "LOW",
    P4: "INFO",
  };
  return map[p] || p;
}

function toMarkdown(data: ExportData): string {
  const now = new Date().toLocaleString();
  let md = `# IncidentIQ Report\n\n`;
  md += `**Generated:** ${now}\n\n---\n\n`;

  if (data.type === "triage") {
    const r = data.result;
    md += `## Alert Triage\n\n`;
    md += `| Field | Value |\n|-------|-------|\n`;
    md += `| Priority | **${r.priority}** (${priorityLabel(r.priority)}) |\n`;
    md += `| Category | ${r.category} |\n`;
    md += `| Noise | ${r.isNoise ? `Yes - ${r.noiseReason || ""}` : "No"} |\n\n`;
    md += `### Summary\n${r.summary}\n\n`;
    md += `### Root Cause\n${r.rootCause}\n\n`;
    md += `### Recommended Actions\n`;
    r.actions.forEach((a, i) => {
      md += `${i + 1}. ${a}\n`;
    });
    md += `\n### Escalation\n`;
    md += `- **Team:** ${r.escalation.team}\n`;
    md += `- **Channel:** ${r.escalation.channel}\n`;
    if (r.escalation.runbook) md += `- **Runbook:** ${r.escalation.runbook}\n`;
    md += `- **Contacts:** ${r.escalation.contacts.join(", ")}\n`;
    md += `\n### Slack Summary\n\`\`\`\n${r.slackSummary}\n\`\`\`\n`;
    if (data.alertRaw) {
      md += `\n### Raw Alert\n\`\`\`\n${data.alertRaw}\n\`\`\`\n`;
    }
  } else {
    const inc = data.incident;
    md += `## Incident Report\n\n`;
    md += `| Field | Value |\n|-------|-------|\n`;
    md += `| Priority | **${inc.priority}** (${priorityLabel(inc.priority)}) |\n`;
    md += `| Category | ${inc.category} |\n`;
    md += `| Created | ${new Date(inc.createdAt).toLocaleString()} |\n\n`;
    md += `### ${inc.title}\n\n`;
    md += `### Actions\n`;
    inc.actions.forEach((a, i) => {
      md += `${i + 1}. ${a}\n`;
    });
    md += `\n### Escalation\n`;
    md += `- **Team:** ${inc.escalation.team}\n`;
    md += `- **Channel:** ${inc.escalation.channel}\n`;
    if (inc.escalation.runbook) md += `- **Runbook:** ${inc.escalation.runbook}\n`;
    md += `- **Contacts:** ${inc.escalation.contacts.join(", ")}\n`;
    md += `\n### Summary\n\`\`\`\n${inc.summary}\n\`\`\`\n`;
  }

  return md;
}

function toPlainText(data: ExportData): string {
  const now = new Date().toLocaleString();
  let txt = `TRIAGEFLOW AI REPORT\nGenerated: ${now}\n${"=".repeat(50)}\n\n`;

  if (data.type === "triage") {
    const r = data.result;
    txt += `ALERT TRIAGE\n${"-".repeat(30)}\n`;
    txt += `Priority:  ${r.priority} (${priorityLabel(r.priority)})\n`;
    txt += `Category:  ${r.category}\n`;
    txt += `Noise:     ${r.isNoise ? `Yes - ${r.noiseReason || ""}` : "No"}\n\n`;
    txt += `SUMMARY\n${r.summary}\n\n`;
    txt += `ROOT CAUSE\n${r.rootCause}\n\n`;
    txt += `RECOMMENDED ACTIONS\n`;
    r.actions.forEach((a, i) => {
      txt += `  ${i + 1}. ${a}\n`;
    });
    txt += `\nESCALATION\n`;
    txt += `  Team:     ${r.escalation.team}\n`;
    txt += `  Channel:  ${r.escalation.channel}\n`;
    if (r.escalation.runbook) txt += `  Runbook:  ${r.escalation.runbook}\n`;
    txt += `  Contacts: ${r.escalation.contacts.join(", ")}\n`;
    txt += `\nSLACK SUMMARY\n${r.slackSummary}\n`;
    if (data.alertRaw) {
      txt += `\nRAW ALERT\n${data.alertRaw}\n`;
    }
  } else {
    const inc = data.incident;
    txt += `INCIDENT REPORT\n${"-".repeat(30)}\n`;
    txt += `Title:     ${inc.title}\n`;
    txt += `Priority:  ${inc.priority} (${priorityLabel(inc.priority)})\n`;
    txt += `Category:  ${inc.category}\n`;
    txt += `Created:   ${new Date(inc.createdAt).toLocaleString()}\n\n`;
    txt += `ACTIONS\n`;
    inc.actions.forEach((a, i) => {
      txt += `  ${i + 1}. ${a}\n`;
    });
    txt += `\nESCALATION\n`;
    txt += `  Team:     ${inc.escalation.team}\n`;
    txt += `  Channel:  ${inc.escalation.channel}\n`;
    if (inc.escalation.runbook) txt += `  Runbook:  ${inc.escalation.runbook}\n`;
    txt += `  Contacts: ${inc.escalation.contacts.join(", ")}\n`;
    txt += `\nSUMMARY\n${inc.summary}\n`;
  }

  return txt;
}

function printPDF(data: ExportData) {
  const md = toMarkdown(data);
  const priority =
    data.type === "triage" ? data.result.priority : data.incident.priority;
  const title =
    data.type === "triage"
      ? data.result.summary
      : data.incident.title;

  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>IncidentIQ Report</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a1a; font-size: 12px; }
      .print-header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px; }
      .print-header h1 { font-size: 18px; color: #dc2626; margin: 0 0 4px; }
      .print-header .subtitle { font-size: 11px; color: #666; }
      .print-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
      .print-badge-P0 { background: #fecaca; color: #991b1b; }
      .print-badge-P1 { background: #fed7aa; color: #9a3412; }
      .print-badge-P2 { background: #fef08a; color: #854d0e; }
      .print-badge-P3 { background: #bfdbfe; color: #1e40af; }
      .print-badge-P4 { background: #e5e7eb; color: #374151; }
      h2 { font-size: 14px; color: #333; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { text-align: left; padding: 4px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
      th { background: #f3f4f6; font-weight: 600; }
      pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; font-size: 10px; white-space: pre-wrap; overflow-wrap: break-word; }
      ol { padding-left: 20px; }
      li { margin-bottom: 4px; font-size: 11px; }
      .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    }
    body { margin: 0; padding: 20px 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a1a; font-size: 12px; }
    .print-header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px; }
    .print-header h1 { font-size: 18px; color: #dc2626; margin: 0 0 4px; }
    .print-header .subtitle { font-size: 11px; color: #666; }
    .print-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .print-badge-P0 { background: #fecaca; color: #991b1b; }
    .print-badge-P1 { background: #fed7aa; color: #9a3412; }
    .print-badge-P2 { background: #fef08a; color: #854d0e; }
    .print-badge-P3 { background: #bfdbfe; color: #1e40af; }
    .print-badge-P4 { background: #e5e7eb; color: #374151; }
    h2 { font-size: 14px; color: #333; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { text-align: left; padding: 4px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
    th { background: #f3f4f6; font-weight: 600; }
    pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; font-size: 10px; white-space: pre-wrap; overflow-wrap: break-word; }
    ol { padding-left: 20px; }
    li { margin-bottom: 4px; font-size: 11px; }
    .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>IncidentIQ Report</h1>
    <div class="subtitle">${new Date().toLocaleString()}</div>
    <div style="margin-top: 8px;">
      <span class="print-badge print-badge-${priority}">${priority} - ${priorityLabel(priority)}</span>
    </div>
  </div>
  ${renderPrintBody(data)}
  <div class="footer">Generated by IncidentIQ</div>
</body>
</html>`);

  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}

function renderPrintBody(data: ExportData): string {
  if (data.type === "triage") {
    const r = data.result;
    let html = `<h2>Summary</h2><p>${escHtml(r.summary)}</p>`;
    html += `<table><tr><th>Field</th><th>Value</th></tr>`;
    html += `<tr><td>Category</td><td>${escHtml(r.category)}</td></tr>`;
    html += `<tr><td>Noise</td><td>${r.isNoise ? `Yes - ${escHtml(r.noiseReason || "")}` : "No"}</td></tr>`;
    html += `</table>`;
    html += `<h2>Root Cause</h2><p>${escHtml(r.rootCause)}</p>`;
    html += `<h2>Recommended Actions</h2><ol>`;
    r.actions.forEach((a) => (html += `<li>${escHtml(a)}</li>`));
    html += `</ol>`;
    html += `<h2>Escalation</h2><table>`;
    html += `<tr><td>Team</td><td>${escHtml(r.escalation.team)}</td></tr>`;
    html += `<tr><td>Channel</td><td>${escHtml(r.escalation.channel)}</td></tr>`;
    if (r.escalation.runbook) html += `<tr><td>Runbook</td><td>${escHtml(r.escalation.runbook)}</td></tr>`;
    html += `<tr><td>Contacts</td><td>${escHtml(r.escalation.contacts.join(", "))}</td></tr>`;
    html += `</table>`;
    html += `<h2>Slack Summary</h2><pre>${escHtml(r.slackSummary)}</pre>`;
    if (data.alertRaw) {
      html += `<h2>Raw Alert</h2><pre>${escHtml(data.alertRaw)}</pre>`;
    }
    return html;
  } else {
    const inc = data.incident;
    let html = `<h2>${escHtml(inc.title)}</h2>`;
    html += `<table><tr><th>Field</th><th>Value</th></tr>`;
    html += `<tr><td>Category</td><td>${escHtml(inc.category)}</td></tr>`;
    html += `<tr><td>Created</td><td>${new Date(inc.createdAt).toLocaleString()}</td></tr>`;
    html += `</table>`;
    html += `<h2>Actions</h2><ol>`;
    inc.actions.forEach((a) => (html += `<li>${escHtml(a)}</li>`));
    html += `</ol>`;
    html += `<h2>Escalation</h2><table>`;
    html += `<tr><td>Team</td><td>${escHtml(inc.escalation.team)}</td></tr>`;
    html += `<tr><td>Channel</td><td>${escHtml(inc.escalation.channel)}</td></tr>`;
    if (inc.escalation.runbook) html += `<tr><td>Runbook</td><td>${escHtml(inc.escalation.runbook)}</td></tr>`;
    html += `<tr><td>Contacts</td><td>${escHtml(inc.escalation.contacts.join(", "))}</td></tr>`;
    html += `</table>`;
    html += `<h2>Summary</h2><pre>${escHtml(inc.summary)}</pre>`;
    return html;
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ExportMenu({ data, size = "sm" }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCopyMarkdown = async () => {
    await copyToClipboard(toMarkdown(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  const handleDownloadTxt = () => {
    const text = toPlainText(data);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `triageflow-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handlePrintPDF = () => {
    printPDF(data);
    setOpen(false);
  };

  const btnClass = size === "sm" ? "export-btn-sm" : "export-btn-md";

  return (
    <div className="export-menu-wrap" ref={menuRef}>
      <button
        className={`export-trigger ${btnClass}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        title="Export"
      >
        <svg width={size === "sm" ? 12 : 14} height={size === "sm" ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {size === "md" && <span>Export</span>}
      </button>

      {open && (
        <div className="export-dropdown">
          <button className="export-dropdown-item" onClick={handleCopyMarkdown}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            <span>{copied ? "Copied!" : "Copy Markdown"}</span>
          </button>
          <button className="export-dropdown-item" onClick={handleDownloadTxt}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            <span>Download .txt</span>
          </button>
          <button className="export-dropdown-item" onClick={handlePrintPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            <span>Print PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
