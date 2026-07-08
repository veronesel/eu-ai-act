"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { PMM_EVENT_TYPES, PMM_SEVERITIES } from "@/lib/domain/operations";
import { formatDate } from "@/lib/utils";
import { RadioTower, Loader2, PlusCircle, ArrowUpRight } from "lucide-react";

export function PostMarketBoard({ systems, plans, events }: { systems: any[]; plans: any[]; events: any[] }) {
  const planBySystem = Object.fromEntries(plans.map((p) => [p.system_id, p]));

  return (
    <div className="space-y-4">
      {systems.map((s) => (
        <SystemMonitoringCard key={s.id} system={s} plan={planBySystem[s.id]} events={events.filter((e) => e.system_id === s.id)} />
      ))}
      {systems.length === 0 && (
        <GlassCard>
          <p className="text-sm text-[var(--text-muted)]">No Provider-role systems in scope for post-market monitoring.</p>
        </GlassCard>
      )}
    </div>
  );
}

function SystemMonitoringCard({ system, plan, events }: { system: any; plan: any; events: any[] }) {
  const router = useRouter();
  const [editingPlan, setEditingPlan] = useState(false);
  const [methodology, setMethodology] = useState(plan?.methodology ?? "");
  const [metrics, setMetrics] = useState(plan?.metrics_tracked ?? "");
  const [cadence, setCadence] = useState(plan?.review_cadence_months ?? 6);
  const [savingPlan, setSavingPlan] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

  async function savePlan() {
    setSavingPlan(true);
    await fetch(`/api/operations/post-market-monitoring/plan/${system.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodology, metrics_tracked: metrics, review_cadence_months: Number(cadence) }),
    });
    setSavingPlan(false);
    setEditingPlan(false);
    router.refresh();
  }

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <RadioTower className="h-4 w-4 text-aegis-teal" />
          <h3 className="font-heading font-semibold text-sm">{system.name}</h3>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">{system.business_function}</span>
      </div>

      {!plan ? (
        <p className="text-sm text-[var(--text-muted)]">No monitoring plan on file.</p>
      ) : !editingPlan ? (
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Methodology</div>
            <p className="text-[var(--text-secondary)] mt-0.5">{plan.methodology}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Metrics tracked</div>
            <p className="text-[var(--text-secondary)] mt-0.5">{plan.metrics_tracked}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Cadence / next review</div>
            <p className="text-[var(--text-secondary)] mt-0.5">
              Every {plan.review_cadence_months} months — next {formatDate(plan.next_review_at)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={methodology} onChange={(e) => setMethodology(e.target.value)} rows={2} placeholder="Methodology" className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs" />
          <textarea value={metrics} onChange={(e) => setMetrics(e.target.value)} rows={2} placeholder="Metrics tracked" className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-muted)]">Review cadence (months)</label>
            <input type="number" min={1} max={24} value={cadence} onChange={(e) => setCadence(e.target.value)} className="w-20 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" />
          </div>
          <div className="flex gap-2">
            <button onClick={savePlan} disabled={savingPlan} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-aegis-emerald/40 text-aegis-emerald px-2 py-1 hover:bg-aegis-emerald/10 disabled:opacity-50">
              {savingPlan && <Loader2 className="h-3 w-3 animate-spin" />} save plan
            </button>
            <button onClick={() => setEditingPlan(false)} className="text-xs rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5">cancel</button>
          </div>
        </div>
      )}
      {plan && !editingPlan && (
        <button onClick={() => setEditingPlan(true)} className="text-[10px] text-aegis-emerald mt-2 hover:underline">
          edit plan
        </button>
      )}

      <div className="border-t border-[var(--panel-border)] mt-3 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Monitoring event log ({events.length})</span>
          <button onClick={() => setShowAddEvent((v) => !v)} className="inline-flex items-center gap-1 text-[10px] text-aegis-emerald hover:underline">
            <PlusCircle className="h-3 w-3" /> log event
          </button>
        </div>

        {showAddEvent && <AddEventForm systemId={system.id} onAdded={() => { setShowAddEvent(false); router.refresh(); }} />}

        <div className="space-y-2 mt-2">
          {events.length === 0 && <p className="text-xs text-[var(--text-muted)]">No monitoring events logged.</p>}
          {events.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 border border-[var(--panel-border)] rounded-lg px-3 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={toneForStatus(e.severity)}>{e.severity}</Badge>
                  <span className="text-xs text-[var(--text-muted)]">{e.event_type.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{e.description}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatDate(e.occurred_at)}</p>
              </div>
              {e.severity === "high" && (
                <Link href="/provider/corrective-actions" className="shrink-0 inline-flex items-center gap-1 text-[10px] text-rose-300 hover:underline">
                  Review in Corrective Actions <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function AddEventForm({ systemId, onAdded }: { systemId: string; onAdded: () => void }) {
  const [eventType, setEventType] = useState<string>(PMM_EVENT_TYPES[0]);
  const [severity, setSeverity] = useState<string>("low");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!description.trim()) return;
    setSaving(true);
    await fetch(`/api/operations/post-market-monitoring/events/${systemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, severity, description, occurred_at: new Date(occurredAt).toISOString() }),
    });
    setSaving(false);
    setDescription("");
    onAdded();
  }

  return (
    <div className="border border-[var(--panel-border)] rounded-lg p-3 space-y-2 mb-2 bg-black/10">
      <div className="grid grid-cols-2 gap-2">
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs">
          {PMM_EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs">
          {PMM_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Observation description" className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs" />
      <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" />
      <button onClick={submit} disabled={saving} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-aegis-emerald/40 text-aegis-emerald px-2 py-1 hover:bg-aegis-emerald/10 disabled:opacity-50">
        {saving && <Loader2 className="h-3 w-3 animate-spin" />} add event
      </button>
    </div>
  );
}
