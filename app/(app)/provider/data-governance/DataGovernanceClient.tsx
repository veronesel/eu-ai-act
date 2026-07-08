"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, Plus, ShieldAlert } from "lucide-react";

const PURPOSES = ["training", "validation", "test"] as const;

export function DataGovernanceClient({ applicable, notApplicable, records }: { applicable: any[]; notApplicable: any[]; records: any[] }) {
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
        <SystemDataCard key={s.id} system={s} records={bySystem[s.id] ?? []} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
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

function SystemDataCard({ system, records, expanded, onToggle, onChanged }: any) {
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
        <Badge tone={records.length ? "info" : "warning"}>{records.length} dataset{records.length === 1 ? "" : "s"}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {records.map((r: any) => (
            <div key={r.id} className="border border-[var(--panel-border)] rounded-lg p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{r.dataset_name}</p>
                <Badge tone="info">{r.purpose}</Badge>
              </div>
              <dl className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                {r.provenance && <div><dt className="text-[var(--text-muted)] inline">Provenance: </dt>{r.provenance}</div>}
                {r.collection_methodology && <div><dt className="text-[var(--text-muted)] inline">Methodology: </dt>{r.collection_methodology}</div>}
                {r.bias_characteristics_examined && <div><dt className="text-[var(--text-muted)] inline">Bias characteristics examined: </dt>{r.bias_characteristics_examined}</div>}
                {r.quality_checks_run && <div><dt className="text-[var(--text-muted)] inline">Quality checks run: </dt>{r.quality_checks_run}</div>}
                {r.quality_gaps && <div className="text-amber-400"><dt className="inline">Known gaps: </dt>{r.quality_gaps}</div>}
              </dl>
              {r.special_category_basis_necessity_rationale && (
                <div className="mt-2 flex items-start gap-2 bg-aegis-violet/10 border border-aegis-violet/30 rounded p-2 text-xs">
                  <ShieldAlert className="h-3.5 w-3.5 text-aegis-violet shrink-0 mt-0.5" />
                  <span><strong>Necessity-test rationale (special-category basis):</strong> {r.special_category_basis_necessity_rationale}</span>
                </div>
              )}
              <p className="text-[10px] text-[var(--text-muted)] mt-2">Updated {formatDate(r.updated_at)}</p>
            </div>
          ))}
          {records.length === 0 && <p className="text-sm text-[var(--text-muted)]">No dataset records yet for this system.</p>}

          {!adding ? (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">
              <Plus className="h-3.5 w-3.5" /> Add dataset record
            </button>
          ) : (
            <AddDataForm systemId={system.id} onDone={() => { setAdding(false); onChanged(); }} onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </GlassCard>
  );
}

function AddDataForm({ systemId, onDone, onCancel }: { systemId: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    dataset_name: "",
    purpose: "training" as (typeof PURPOSES)[number],
    provenance: "",
    collection_methodology: "",
    bias_characteristics_examined: "",
    quality_checks_run: "",
    quality_gaps: "",
    special_category_basis_necessity_rationale: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const necessityRequired = form.bias_characteristics_examined.trim().length > 0;

  async function submit() {
    if (necessityRequired && !form.special_category_basis_necessity_rationale.trim()) {
      setError("A necessity-test rationale is required whenever bias characteristics examined relies on special-category proxy data.");
      return;
    }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/provider/data-governance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_id: systemId, ...form }) });
    setSaving(false);
    if (res.ok) onDone();
    else setError((await res.json()).error ?? "Save failed");
  }

  return (
    <div className="border border-aegis-emerald/30 rounded-lg p-3 space-y-2 bg-black/20">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Dataset name</label>
          <input className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.dataset_name} onChange={(e) => setForm({ ...form, dataset_name: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Purpose</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as any })}>
            {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <Field label="Provenance" value={form.provenance} onChange={(v) => setForm({ ...form, provenance: v })} />
      <Field label="Collection methodology" value={form.collection_methodology} onChange={(v) => setForm({ ...form, collection_methodology: v })} />
      <Field label="Bias characteristics examined" value={form.bias_characteristics_examined} onChange={(v) => setForm({ ...form, bias_characteristics_examined: v })} />
      <Field label="Quality checks run" value={form.quality_checks_run} onChange={(v) => setForm({ ...form, quality_checks_run: v })} />
      <Field label="Known quality gaps" value={form.quality_gaps} onChange={(v) => setForm({ ...form, quality_gaps: v })} />
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">
          Special-category basis necessity-test rationale {necessityRequired && <span className="text-amber-400">(required — bias testing above relies on protected-attribute proxies)</span>}
        </label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={form.special_category_basis_necessity_rationale} onChange={(e) => setForm({ ...form, special_category_basis_necessity_rationale: e.target.value })} />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving || !form.dataset_name} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save dataset record
        </button>
        <button onClick={onCancel} className="text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-[var(--text-muted)]">{label}</label>
      <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
