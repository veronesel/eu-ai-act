// Shared tone tokens for dashboard widgets — mirrors the neutral/info/success/warning/danger
// vocabulary already established by components/ui/Badge.tsx and app/(app)/classification/page.tsx.
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-[var(--text-secondary)]",
  info: "text-sky-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-rose-400",
};

export const TONE_RING: Record<Tone, string> = {
  neutral: "#64748B",
  info: "#38BDF8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#F43F5E",
};

export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-slate-500/30",
  info: "border-sky-500/30",
  success: "border-emerald-500/30",
  warning: "border-amber-500/30",
  danger: "border-rose-500/30",
};

export const TONE_BG: Record<Tone, string> = {
  neutral: "bg-slate-500/10",
  info: "bg-sky-500/10",
  success: "bg-emerald-500/10",
  warning: "bg-amber-500/10",
  danger: "bg-rose-500/10",
};

/** Tone for a countdown given days remaining until a deadline (negative = overdue). */
export function toneForDaysRemaining(days: number | null): Tone {
  if (days === null) return "neutral";
  if (days < 0) return "danger";
  if (days <= 3) return "danger";
  if (days <= 14) return "warning";
  return "success";
}

/** Tone for a 0-100 completeness/coverage percentage. */
export function toneForPct(pct: number): Tone {
  if (pct >= 90) return "success";
  if (pct >= 60) return "info";
  if (pct >= 30) return "warning";
  return "danger";
}
