"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, ShieldAlert } from "lucide-react";

export function EuDatabaseClient({ applicable, selfAssessmentSystems, trulyNotApplicable, regBySystem }: any) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {applicable.map((s: any) => (
          <RegistrationCard key={s.id} system={s} registration={regBySystem[s.id]} requireSelfAssessment={false} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
        ))}
      </div>

      {selfAssessmentSystems.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-400" /> Art. 6(3)-exception systems — self-assessment summary required</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-2 max-w-3xl">
            The full Provider suite does not apply to these systems (not high-risk), but the Digital Omnibus reinstated an always-required Annex VIII self-assessment summary for any system relying on the Art. 6(3) narrow exception, regardless of Provider-suite applicability.
          </p>
          <div className="space-y-3">
            {selfAssessmentSystems.map((s: any) => (
              <RegistrationCard key={s.id} system={s} registration={regBySystem[s.id]} requireSelfAssessment expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
            ))}
          </div>
        </div>
      )}

      {trulyNotApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2">Provider-role systems — not applicable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trulyNotApplicable.map((s: any) => <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrationCard({ system, registration, requireSelfAssessment, expanded, onToggle, onChanged }: any) {
  const [form, setForm] = useState({
    provider_identity: registration?.provider_identity ?? "Eurobank Capital SpA",
    system_description: registration?.system_description ?? "",
    member_states: registration?.member_states ?? "Italy",
    self_assessment_summary: registration?.self_assessment_summary ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = registration?.status ?? "not_started";

  async function save(patch: any) {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/provider/eu-database/${system.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, self_assessment_required: requireSelfAssessment ? 1 : 0, ...patch }),
    });
    setSaving(false);
    if (res.ok) onChanged();
    else setError((await res.json()).error ?? "Save failed");
  }

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
        <Badge tone={toneForStatus(status)}>{status.replace(/_/g, " ")}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {!requireSelfAssessment && (
            <>
              <div>
                <label className="text-[10px] text-[var(--text-muted)]">Provider identity</label>
                <input className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-sm" value={form.provider_identity} onChange={(e) => setForm({ ...form, provider_identity: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)]">System description</label>
                <textarea className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-sm" rows={2} value={form.system_description} onChange={(e) => setForm({ ...form, system_description: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)]">Member states of deployment</label>
                <input className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-sm" value={form.member_states} onChange={(e) => setForm({ ...form, member_states: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] text-[var(--text-muted)]">
              Self-assessment summary {requireSelfAssessment && <span className="text-amber-400">(always required — Digital Omnibus / Art. 6(3) exception)</span>}
            </label>
            <textarea className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-sm" rows={3} value={form.self_assessment_summary} onChange={(e) => setForm({ ...form, self_assessment_summary: e.target.value })} />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => save({})} disabled={saving} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
            {status !== "registered" && (
              <button onClick={() => save({ status: "registered" })} disabled={saving} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
                Mark registered
              </button>
            )}
            {registration?.registered_at && <span className="text-[10px] text-[var(--text-muted)] ml-auto">Registered {formatDate(registration.registered_at)}</span>}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
