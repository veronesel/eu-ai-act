"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import type { OverrideRatePoint } from "@/lib/domain/deployer";

const EVENT_TYPES = ["routine_check", "escalation", "override"] as const;
const EARLY_WARNING_THRESHOLD_PCT = 20;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as OverrideRatePoint;
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] backdrop-blur-md px-3 py-2 text-xs shadow-lg">
      <div className="font-medium">{formatDate(label)}</div>
      <div className="text-[var(--text-secondary)] mt-1">{p.overrides} override{p.overrides === 1 ? "" : "s"} of {p.total} event{p.total === 1 ? "" : "s"}</div>
      <div className="text-aegis-teal font-medium">{p.overrideRatePct}% override rate</div>
    </div>
  );
}

export function OversightOperationDetail({ systemId, events, series, overallRate }: { systemId: string; events: any[]; series: OverrideRatePoint[]; overallRate: number }) {
  const router = useRouter();
  const [overseerName, setOverseerName] = useState("");
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>("routine_check");
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const spike = series.some((p) => p.overrideRatePct >= EARLY_WARNING_THRESHOLD_PCT);

  async function submitEvent() {
    if (!overseerName.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/deployer/human-oversight-operation/${systemId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overseer_name: overseerName,
        event_type: eventType,
        reason_code: eventType === "override" ? reasonCode || "unspecified" : null,
        notes: notes || (eventType === "override" ? "Officer overrode system recommendation after manual review." : "Routine oversight check."),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setOverseerName("");
      setReasonCode("");
      setNotes("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading font-semibold">Override rate over time</h3>
          <Badge tone={overallRate >= EARLY_WARNING_THRESHOLD_PCT ? "danger" : overallRate >= 10 ? "warning" : "success"}>{overallRate}% overall</Badge>
        </div>
        {spike && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> One or more shifts crossed the {EARLY_WARNING_THRESHOLD_PCT}% override-rate line — treat this as a genuine early-warning signal (model drift, edge-case surge, or a policy gap), not noise.
          </p>
        )}
        {series.length > 0 ? (
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--panel-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--panel-border)" }} tickLine={false} />
                <YAxis unit="%" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--panel-border)" }} tickLine={false} width={44} />
                <ReferenceLine y={EARLY_WARNING_THRESHOLD_PCT} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "early-warning", fill: "#F59E0B", fontSize: 10, position: "insideTopRight" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="overrideRatePct" stroke="#06B6D4" strokeWidth={2} dot={{ r: 4, fill: "#06B6D4", strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No oversight events logged yet.</p>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="font-heading font-semibold mb-3">Log a new oversight event</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <input placeholder="Overseer name" className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={overseerName} onChange={(e) => setOverseerName(e.target.value)} />
          <select value={eventType} onChange={(e) => setEventType(e.target.value as any)} className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
          {eventType === "override" && (
            <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
              <option value="">reason code…</option>
              <option value="insufficient_data">insufficient data</option>
              <option value="borderline_case">borderline case</option>
              <option value="manual_policy_exception">manual policy exception</option>
            </select>
          )}
          <input placeholder="Notes (optional)" className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button onClick={submitEvent} disabled={submitting || !overseerName.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Log event
        </button>
      </GlassCard>

      <GlassCard>
        <h3 className="font-heading font-semibold mb-3">Event log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--panel-border)]">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Overseer</th>
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2 pr-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((e) => (
                <tr key={e.id} className="border-b border-[var(--panel-border)]/50">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(e.occurred_at)}</td>
                  <td className="py-2 pr-3">{e.overseer_name}</td>
                  <td className="py-2 pr-3">
                    <Badge tone={e.event_type === "override" ? "warning" : e.event_type === "escalation" ? "info" : "neutral"}>{e.event_type.replace("_", " ")}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-muted)]">{e.reason_code ?? "—"}</td>
                  <td className="py-2 pr-3 text-[var(--text-secondary)]">{e.notes ?? "—"}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-[var(--text-muted)]">No events logged.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
