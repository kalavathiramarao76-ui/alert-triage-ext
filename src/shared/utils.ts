import type { Priority } from "./types";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function priorityColor(p: Priority): string {
  const map: Record<Priority, string> = {
    P0: "text-red-400",
    P1: "text-orange-400",
    P2: "text-yellow-400",
    P3: "text-blue-400",
    P4: "text-gray-400",
  };
  return map[p];
}

export function priorityBadge(p: Priority): string {
  const map: Record<Priority, string> = {
    P0: "badge-p0",
    P1: "badge-p1",
    P2: "badge-p2",
    P3: "badge-p3",
    P4: "badge-p4",
  };
  return map[p];
}

export function categoryIcon(cat: string): string {
  const map: Record<string, string> = {
    infra: "server",
    app: "code",
    network: "globe",
    security: "shield",
    db: "database",
  };
  return map[cat] || "alert-circle";
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}
