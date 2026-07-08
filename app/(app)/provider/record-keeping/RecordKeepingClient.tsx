"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock, Loader2, Plus } from "lucide-react";

const EVENT_TYPES = ["inference_batch", "model_version_change", "threshold_change", "manual_review_override", "note"];

export function RecordKeepingClient({ applicable, notApplicable, logs }: { applicable: any[]; notApplicable: any[]; logs: any[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);
  const bySystem = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const l of logs) (map[l.system_id] ??= []).push(l);
    return map;
  }, [logs]);

  return (
    <div className="space-y-3">
      {applicable.map((s) => (
        <SystemLogCard key={s.id} system={s} logs={bySystem[s.id] ?? []} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
      ))}

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2 mt-4">Provider-role systems — not high-risk</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notApplicable.map((s) => <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SystemLogCard({ system, logs, expanded, onToggle, onChanged }: any) {
  const [adding, setAdding] = useState(false);
  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <div>
            <h3 className="font-heading font-semibold text-sm">{system.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{system.business_function}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral"><Lock className="h-3 w-3" /> immutable — Art. 12/19</Badge>
          <span className="text-xs text-[var(--text-muted)]">{logs.length} entries</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {logs.map((l: any) => (
            <div key={l.id} className="flex items-start justify-between gap-3 border-l-2 border-[var(--panel-border)] pl-3 py-1 text-sm">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{l.event_type.replace(/_/g, " ")}</span>
                <p>{l.event_detail}</p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">{formatDate(l.logged_at)}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-[var(--text-muted)]">No log entries yet.</p>}

          {!adding ? (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">
              <Plus className="h-3.5 w-3.5" /> Append log entry
            </button>
          ) : (
            <AddLogForm systemId={system.id} onDone={() => { setAdding(false); onChanged(); }} onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </GlassCard>
  );
}

function AddLogForm({ systemId, onDone, onCancel }: { systemId: string; onDone: () => void; onCancel: () => void }) {
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/provider/record-keeping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_id: systemId, event_type: eventType, event_detail: detail }) });
    setSaving(false);
    onDone();
  }

  return (
    <div className="border border-aegis-emerald/30 rounded-lg p-3 space-y-2 bg-black/20">
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Event type</label>
        <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={eventType} onChange={(e) => setEventType(e.target.value)}>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Event detail</label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving || !detail} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Append entry
        </button>
        <button onClick={onCancel} className="text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">Cancel</button>
      </div>
    </div>
  );
}
