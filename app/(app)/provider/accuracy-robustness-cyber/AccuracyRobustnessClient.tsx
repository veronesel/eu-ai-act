"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { CYBER_CONTROLS, ACCURACY_RESULT_OPTIONS } from "@/lib/domain/provider-suite";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, Plus } from "lucide-react";

export function AccuracyRobustnessClient({ applicable, notApplicable, records }: { applicable: any[]; notApplicable: any[]; records: any[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);
  const bySystem = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of records) (map[r.system_id] ??= []).push(r);
    return map;
  }, [records]);

  return (
    <div className="space-y-3">
      {applicable.map((s) => (
        <SystemMetricsCard key={s.id} system={s} records={bySystem[s.id] ?? []} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
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

function SystemMetricsCard({ system, records, expanded, onToggle, onChanged }: any) {
  const [adding, setAdding] = useState<"accuracy_metric" | "robustness_test" | "cyber_control" | null>(null);
  const accuracyRecords = records.filter((r: any) => r.record_type === "accuracy_metric");
  const robustnessRecords = records.filter((r: any) => r.record_type === "robustness_test");
  const cyberRecords = records.filter((r: any) => r.record_type === "cyber_control");

  const chartData = useMemo(() => {
    const byMetric: Record<string, any[]> = {};
    for (const r of accuracyRecords) {
      const v = Number(r.metric_value);
      if (Number.isNaN(v)) continue;
      (byMetric[r.metric_name] ??= []).push({ date: formatDate(r.test_date), value: v });
    }
    return byMetric;
  }, [accuracyRecords]);

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
        <Badge tone="info">{records.length} records</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Accuracy metrics</h4>
              <AddButton kind="accuracy_metric" adding={adding} onClick={() => setAdding("accuracy_metric")} />
            </div>
            {Object.entries(chartData).map(([metric, points]) => (
              <div key={metric} className="mb-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">{metric}</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={40} />
                    <Tooltip contentStyle={{ background: "#0B1220", border: "1px solid var(--panel-border)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
            <RecordList records={accuracyRecords} />
            {adding === "accuracy_metric" && <AddRecordForm systemId={system.id} recordType="accuracy_metric" onDone={() => { setAdding(null); onChanged(); }} onCancel={() => setAdding(null)} />}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Robustness / adversarial test log</h4>
              <AddButton kind="robustness_test" adding={adding} onClick={() => setAdding("robustness_test")} />
            </div>
            <RecordList records={robustnessRecords} />
            {adding === "robustness_test" && <AddRecordForm systemId={system.id} recordType="robustness_test" onDone={() => { setAdding(null); onChanged(); }} onCancel={() => setAdding(null)} />}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Cybersecurity control checklist</h4>
              <AddButton kind="cyber_control" adding={adding} onClick={() => setAdding("cyber_control")} />
            </div>
            <div className="grid sm:grid-cols-3 gap-2 mb-2">
              {CYBER_CONTROLS.map((c) => {
                const rec = cyberRecords.filter((r: any) => r.metric_name === c.label).sort((a: any, b: any) => (b.test_date ?? "").localeCompare(a.test_date ?? ""))[0];
                return (
                  <div key={c.code} className="border border-[var(--panel-border)] rounded-lg p-2.5">
                    <p className="text-xs font-medium">{c.label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{c.description}</p>
                    <Badge tone={toneForStatus(rec?.result ?? "not_tested")} className="mt-2">{(rec?.result ?? "not_tested").replace(/_/g, " ")}</Badge>
                  </div>
                );
              })}
            </div>
            <RecordList records={cyberRecords} />
            {adding === "cyber_control" && <AddRecordForm systemId={system.id} recordType="cyber_control" onDone={() => { setAdding(null); onChanged(); }} onCancel={() => setAdding(null)} />}
          </section>
        </div>
      )}
    </GlassCard>
  );
}

function AddButton({ kind, adding, onClick }: { kind: string; adding: string | null; onClick: () => void }) {
  if (adding === kind) return null;
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-2.5 py-1 hover:bg-white/5">
      <Plus className="h-3 w-3" /> Add
    </button>
  );
}

function RecordList({ records }: { records: any[] }) {
  if (records.length === 0) return <p className="text-xs text-[var(--text-muted)]">No records yet.</p>;
  return (
    <div className="space-y-1.5">
      {records.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 text-xs border border-[var(--panel-border)] rounded-md px-2.5 py-1.5">
          <div>
            <span className="font-medium">{r.metric_name}</span>
            {r.metric_value && <span className="text-[var(--text-muted)]"> · {r.metric_value}</span>}
            {r.notes && <p className="text-[var(--text-muted)] text-[11px] mt-0.5">{r.notes}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[var(--text-muted)]">{formatDate(r.test_date)}</span>
            <Badge tone={toneForStatus(r.result ?? "not_tested")}>{(r.result ?? "not_tested").replace(/_/g, " ")}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddRecordForm({ systemId, recordType, onDone, onCancel }: { systemId: string; recordType: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ metric_name: "", metric_value: "", test_date: "", result: "not_tested", notes: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/provider/accuracy-robustness-cyber", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_id: systemId, record_type: recordType, ...form, test_date: form.test_date ? new Date(form.test_date).toISOString() : null }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="border border-aegis-emerald/30 rounded-lg p-3 space-y-2 bg-black/20 mt-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">{recordType === "cyber_control" ? "Control name" : "Metric / test name"}</label>
          <input className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })} />
        </div>
        {recordType === "accuracy_metric" && (
          <div>
            <label className="text-[10px] text-[var(--text-muted)]">Value</label>
            <input className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.metric_value} onChange={(e) => setForm({ ...form, metric_value: e.target.value })} />
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Test date</label>
          <input type="date" className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Result</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
            {ACCURACY_RESULT_OPTIONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Notes</label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving || !form.metric_name} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </button>
        <button onClick={onCancel} className="text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">Cancel</button>
      </div>
    </div>
  );
}
