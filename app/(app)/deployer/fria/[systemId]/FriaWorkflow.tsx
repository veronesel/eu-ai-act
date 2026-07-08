"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Copy, Loader2, Send, CheckCircle2 } from "lucide-react";

const SECTION_FIELDS: Array<{ key: string; label: string; article: string; placeholder: string }> = [
  { key: "process_description", label: "Description of the deployer's process in which the system is used", article: "Art. 27(1)(a)", placeholder: "Describe how the AI system is used within the underlying business process..." },
  { key: "timeframe_frequency", label: "Period of time and frequency the system is intended to be used", article: "Art. 27(1)(b)", placeholder: "E.g. continuous use, one assessment per applicant..." },
  { key: "affected_persons", label: "Categories of natural persons and groups likely to be affected", article: "Art. 27(1)(c)", placeholder: "Who is affected by decisions this system informs..." },
  { key: "specific_risks", label: "Specific risks of harm likely to impact the affected categories", article: "Art. 27(1)(d)", placeholder: "Risk of bias, opacity, disproportionate impact..." },
  { key: "human_oversight_measures", label: "Human oversight measures, per the instructions for use", article: "Art. 27(1)(e)", placeholder: "Named reviewer, override authority, escalation triggers..." },
  { key: "mitigation_measures", label: "Measures to be taken in the case of materialisation of those risks", article: "Art. 27(1)(f)", placeholder: "Governance/mitigation/complaint-handling measures..." },
];

export function FriaWorkflow({ system, fria, cloneSource, cloneSourceFria, today }: { system: any; fria: any; cloneSource: any; cloneSourceFria: any; today: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SECTION_FIELDS.map((f) => [f.key, fria[f.key] ?? ""]))
  );
  const [dpiaChecked, setDpiaChecked] = useState(!!fria.dpia_crossref);
  const [dpiaRef, setDpiaRef] = useState(fria.dpia_crossref ?? "");
  const [status, setStatus] = useState(fria.status);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [current, setCurrent] = useState(fria);

  const canClone = !!cloneSource && !!cloneSourceFria && cloneSourceFria.process_description;

  async function patch(body: any) {
    setSaving(true);
    const res = await fetch(`/api/deployer/fria/${system.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setCurrent(updated);
      router.refresh();
      return updated;
    }
  }

  async function saveAll() {
    await patch({
      ...values,
      dpia_crossref: dpiaChecked ? (dpiaRef || "Cross-referenced to GDPR Art. 35 DPIA (see linked reference).") : null,
      status,
    });
  }

  async function cloneFromSource() {
    setCloning(true);
    const res = await fetch(`/api/deployer/fria/${system.id}/clone`, { method: "POST" });
    setCloning(false);
    if (res.ok) {
      const updated = await res.json();
      setValues(Object.fromEntries(SECTION_FIELDS.map((f) => [f.key, updated[f.key] ?? ""])));
      setDpiaChecked(!!updated.dpia_crossref);
      setDpiaRef(updated.dpia_crossref ?? "");
      setStatus(updated.status);
      setCurrent(updated);
      router.refresh();
    }
  }

  async function markNotified() {
    setNotifying(true);
    const updated = await patch({ notification_status: "notified", notified_at: new Date().toISOString() });
    setNotifying(false);
    if (updated) setCurrent(updated);
  }

  return (
    <div className="space-y-6">
      <GlassCard className="border-sky-500/30 bg-sky-500/5">
        <p className="text-xs text-[var(--text-secondary)]">
          <strong className="text-sky-300">Art. 27(5) template status —</strong> the AI Office FRIA template is pending as of {today}; this structure follows Art. 27(1) directly and will be re-mapped once the official template is published.
        </p>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-heading font-semibold">Trigger</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{fria.trigger_reason}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-muted)]">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs">
              <option value="not_started">not started</option>
              <option value="in_progress">in progress</option>
              <option value="complete">complete</option>
            </select>
            <Badge tone={toneForStatus(current.status)}>{current.status.replace(/_/g, " ")}</Badge>
          </div>
        </div>
      </GlassCard>

      {cloneSource && (
        <GlassCard className="border-aegis-violet/40 bg-aegis-violet/5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-heading font-semibold flex items-center gap-2"><Copy className="h-4 w-4 text-aegis-violet" /> Art. 27(2) reuse-in-similar-cases</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                This system is a similar case to <strong>{cloneSource.name}</strong>. Art. 27(2) lets a deployer reuse a previously completed FRIA for materially similar deployments instead of duplicating the assessment from scratch.
              </p>
            </div>
            <button
              onClick={cloneFromSource}
              disabled={!canClone || cloning}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-violet to-aegis-indigo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shrink-0"
            >
              {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Clone from {cloneSource.name}&apos;s FRIA
            </button>
          </div>
          {!canClone && <p className="text-[10px] text-amber-400 mt-2">Source FRIA has no completed section text yet — nothing to clone.</p>}
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="font-heading font-semibold mb-4">Art. 27(1) structured assessment</h3>
        <div className="space-y-4">
          {SECTION_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-[var(--text-muted)]">{f.label} <span className="text-[10px]">({f.article})</span></label>
              <textarea
                rows={2}
                className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm"
                placeholder={f.placeholder}
                value={values[f.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="border-t border-[var(--panel-border)] pt-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dpia" checked={dpiaChecked} onChange={(e) => setDpiaChecked(e.target.checked)} />
              <label htmlFor="dpia" className="text-sm">Already covered by Eurobank&apos;s GDPR Art. 35 Data Protection Impact Assessment — cross-reference rather than duplicate (Art. 27(4))</label>
            </div>
            {dpiaChecked && (
              <input
                type="text"
                className="w-full mt-2 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm"
                placeholder="DPIA reference / link, e.g. DPIA-2025-014 section 3"
                value={dpiaRef}
                onChange={(e) => setDpiaRef(e.target.value)}
              />
            )}
          </div>

          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save FRIA
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-heading font-semibold mb-1">Art. 27(3) — notification to the market surveillance authority</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-3">Once complete, notify Banca d&apos;Italia by submitting the results of the FRIA using the template referenced above.</p>
        <div className="flex items-center gap-3">
          <Badge tone={current.notification_status === "notified" ? "success" : "neutral"}>{current.notification_status.replace(/_/g, " ")}</Badge>
          {current.notified_at && <span className="text-xs text-[var(--text-muted)]">Notified {formatDate(current.notified_at)}</span>}
          {current.notification_status !== "notified" && (
            <button onClick={markNotified} disabled={notifying} className="inline-flex items-center gap-2 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
              {notifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Mark notified to Banca d&apos;Italia
            </button>
          )}
          {current.notification_status === "notified" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        </div>
      </GlassCard>
    </div>
  );
}
