import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { AlarmClock, CheckCircle2 } from "lucide-react";

export interface IncidentCountdownRow {
  id?: string;
  status: string; // detected | classified | reporting_drafted | reported | closed
  deadline_at: string | null;
  incident_detected_at?: string;
  severity_tier?: string | null;
}

/**
 * Reusable Art. 73 serious-incident deadline countdown. Self-contained: pass the incident row,
 * it renders inline. Safe to import from other trees (e.g. dashboards) — no external state,
 * no "use client" requirement, computes purely from the row's own fields at render time.
 */
export function IncidentCountdown({ incident, className }: { incident: IncidentCountdownRow; className?: string }) {
  const isClosedOut = incident.status === "reported" || incident.status === "closed";

  if (isClosedOut) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-emerald-400 ${className ?? ""}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {incident.status === "closed" ? "Closed" : "Reported to authority"}
      </span>
    );
  }

  if (!incident.deadline_at) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] ${className ?? ""}`}>
        <AlarmClock className="h-3.5 w-3.5" /> Deadline pending classification
      </span>
    );
  }

  const msLeft = new Date(incident.deadline_at).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86400000);
  const hoursLeft = Math.ceil(msLeft / 3600000);

  let tone: BadgeTone;
  let label: string;
  if (msLeft < 0) {
    tone = "danger";
    label = `Overdue by ${Math.abs(daysLeft)} day(s) — deadline was ${formatDate(incident.deadline_at)}`;
  } else if (hoursLeft <= 24) {
    tone = "danger";
    label = `${hoursLeft} hour(s) left — due ${formatDate(incident.deadline_at)}`;
  } else if (daysLeft <= 3) {
    tone = "warning";
    label = `${daysLeft} day(s) left — due ${formatDate(incident.deadline_at)}`;
  } else {
    tone = "info";
    label = `${daysLeft} day(s) left — due ${formatDate(incident.deadline_at)}`;
  }

  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
