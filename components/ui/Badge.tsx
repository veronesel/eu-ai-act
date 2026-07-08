import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Circle, type LucideIcon } from "lucide-react";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  neutral: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

const TONE_ICONS: Record<BadgeTone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Clock,
  neutral: Circle,
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  const Icon = TONE_ICONS[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", TONE_STYLES[tone], className)}>
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}

export function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (["approved", "passed", "complete", "closed", "registered", "affixed", "issued", "reported", "present", "high_risk"].includes(s)) return s === "high_risk" ? "danger" : "success";
  if (["pending", "in_progress", "draft", "agent_drafted_pending_review", "screening_in_progress", "open"].includes(s)) return "info";
  if (["overdue", "failed", "rejected", "prohibited_blocked", "missing", "stale"].includes(s)) return "danger";
  if (["not_started", "not_applicable", "not_screened", "no_evidence"].includes(s)) return "neutral";
  return "warning";
}
