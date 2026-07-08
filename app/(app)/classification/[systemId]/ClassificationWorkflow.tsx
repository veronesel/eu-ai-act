"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { PROHIBITED_LIMBS, ANNEX_III_CATEGORIES, BIOMETRICS_BRANCHES, ART6_3_LIMBS } from "@/lib/domain/classification";
import { formatDate } from "@/lib/utils";
import { AlertOctagon, Loader2, ShieldCheck } from "lucide-react";

export function ClassificationWorkflow({ system, screenings, determination, challenges }: { system: any; screenings: any[]; determination: any; challenges: any[] }) {
  const router = useRouter();
  const [localScreenings, setLocalScreenings] = useState<Record<string, any>>(Object.fromEntries(screenings.map((s) => [s.limb_code, s])));
  const [saving, setSaving] = useState<string | null>(null);

  const isBlocked = system.classification_status === "prohibited_blocked";

  async function saveLimb(code: string, patch: any) {
    setSaving(code);
    const merged = { limb_code: code, result: "pass", rationale: "", ...localScreenings[code], ...patch };
    const res = await fetch(`/api/classification/${system.id}/screening`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(merged) });
    setSaving(null);
    if (res.ok) {
      setLocalScreenings((prev) => ({ ...prev, [code]: merged }));
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {isBlocked && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-300">Hard stop — this system is blocked</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{determination?.determination_rationale}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="font-heading font-semibold mb-1">Step 1 — Art. 5(1) prohibited-practice screening</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Any &quot;fail&quot; is a hard stop: the system is blocked immediately and routed to REG_COMPLIANCE_LEAD for a documented rejection record.</p>
        <div className="space-y-3">
          {PROHIBITED_LIMBS.map((limb) => {
            const rec = localScreenings[limb.code] ?? { result: "pass", rationale: "" };
            return (
              <div key={limb.code} className="border border-[var(--panel-border)] rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{limb.label} <span className="text-[10px] text-[var(--text-muted)]">({limb.article})</span></div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{limb.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(["pass", "fail", "not_applicable"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => saveLimb(limb.code, { result: r })}
                        disabled={saving === limb.code}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium border ${
                          rec.result === r
                            ? r === "fail" ? "bg-rose-500/20 border-rose-500/50 text-rose-300" : r === "pass" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-500/20 border-slate-500/50 text-slate-300"
                            : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"
                        }`}
                      >
                        {r.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                {rec.rationale && <p className="text-xs mt-2 text-[var(--text-secondary)] bg-black/20 rounded p-2">{rec.rationale}</p>}
                <RationaleEditor initial={rec.rationale ?? ""} onSave={(rationale) => saveLimb(limb.code, { rationale })} />
              </div>
            );
          })}
        </div>
      </GlassCard>

      {!isBlocked && <AnnexMatcher system={system} determination={determination} onSaved={() => router.refresh()} />}

      {!isBlocked && determination?.final_determination === "not_high_risk" && determination.art6_3_limb1 && (
        <RegulatoryChallengePanel systemId={system.id} challenges={challenges} onChanged={() => router.refresh()} />
      )}
    </div>
  );
}

function RationaleEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return <button onClick={() => setEditing(true)} className="text-[10px] text-aegis-emerald mt-1 hover:underline">{initial ? "edit rationale" : "add rationale"}</button>;
  }
  return (
    <div className="mt-2 flex gap-2">
      <input className="flex-1 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={() => { onSave(value); setEditing(false); }} className="text-xs rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5">Save</button>
    </div>
  );
}

function AnnexMatcher({ system, determination, onSaved }: { system: any; determination: any; onSaved: () => void }) {
  const [category, setCategory] = useState<string>(determination?.annex_iii_category ?? "");
  const [branch, setBranch] = useState<string>(determination?.biometrics_branch ?? "not_biometric");
  const [claimException, setClaimException] = useState(!!determination?.art6_3_limb1);
  const [limbs, setLimbs] = useState({
    limb1: determination?.art6_3_limb1 ?? "no",
    limb2: determination?.art6_3_limb2 ?? "no",
    limb3: determination?.art6_3_limb3 ?? "no",
    limb4: determination?.art6_3_limb4 ?? "no",
  });
  const [performsProfiling, setPerformsProfiling] = useState(!!determination?.performs_profiling);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(determination);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/classification/${system.id}/determination`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annex_iii_category: category || null, biometrics_branch: branch, claim_exception: claimException, ...limbs, performs_profiling: performsProfiling }),
    });
    setSaving(false);
    if (res.ok) {
      setResult(await res.json());
      onSaved();
    }
  }

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-1">Step 2 — Annex III matcher &amp; Art. 6(3) narrow-exception test</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-4">The biometrics branch is a real three-way decision: identification and categorisation and emotion recognition are high-risk; verification (1:1 identity confirmation) is expressly excluded from Annex III altogether.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[var(--text-muted)]">Annex III category (non-biometric)</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
            <option value="">— none —</option>
            {ANNEX_III_CATEGORIES.filter((c) => !c.startsWith("1(")).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Biometrics branch (point 1)</label>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
            {BIOMETRICS_BRANCHES.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input type="checkbox" id="claim" checked={claimException} onChange={(e) => setClaimException(e.target.checked)} />
        <label htmlFor="claim" className="text-sm">Provider believes the Art. 6(3) narrow-exception applies (system does not actually pose significant risk)</label>
      </div>

      {claimException && (
        <div className="mt-3 space-y-2 pl-6 border-l-2 border-[var(--panel-border)]">
          {ART6_3_LIMBS.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm">{l.label}</div>
                <div className="text-xs text-[var(--text-muted)]">{l.description}</div>
              </div>
              <select
                value={(limbs as any)[l.key]}
                onChange={(e) => setLimbs((prev) => ({ ...prev, [l.key]: e.target.value }))}
                className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="profiling" checked={performsProfiling} onChange={(e) => setPerformsProfiling(e.target.checked)} />
            <label htmlFor="profiling" className="text-sm">System performs profiling of natural persons</label>
          </div>
          {performsProfiling && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Non-overridable guard: profiling means this system is always high-risk, regardless of the four limbs above (Art. 6(3) subpara. 2).</p>
          )}
        </div>
      )}

      <button onClick={save} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save determination
      </button>

      {result?.final_determination && (
        <div className="mt-4 border-t border-[var(--panel-border)] pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)]">Final determination:</span>
            <Badge tone={toneForStatus(result.final_determination)}>{result.final_determination.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{result.determination_rationale}</p>
        </div>
      )}
    </GlassCard>
  );
}

function RegulatoryChallengePanel({ systemId, challenges, onChanged }: { systemId: string; challenges: any[]; onChanged: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function fileChallenge() {
    setSubmitting(true);
    await fetch(`/api/classification/${systemId}/challenge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge_notes: "Banca d'Italia requests the documented Art. 6(4) self-assessment record supporting the non-high-risk determination." }) });
    setSubmitting(false);
    onChanged();
  }

  async function respond(id: string, outcome: string) {
    setRespondingId(id);
    await fetch(`/api/classification/${systemId}/challenge`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, outcome, response_notes: "Self-assessment record and Art. 6(3) rationale submitted for review." }) });
    setRespondingId(null);
    onChanged();
  }

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-1">Art. 80 — Regulatory challenge scenario</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Banca d&apos;Italia, as market surveillance authority, may formally challenge a self-assessed non-high-risk determination made under the Art. 6(3) exception.</p>

      {challenges.length === 0 && <p className="text-sm text-[var(--text-muted)]">No challenges on record.</p>}
      <div className="space-y-3">
        {challenges.map((c) => (
          <div key={c.id} className="border border-[var(--panel-border)] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.authority}</span>
              <Badge tone={toneForStatus(c.outcome)}>{c.outcome.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{c.challenge_notes}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Received {formatDate(c.challenge_received_at)} · response due {formatDate(c.response_due_at)}</p>
            {c.outcome === "pending" && (
              <div className="mt-2 flex gap-2">
                <button disabled={respondingId === c.id} onClick={() => respond(c.id, "self_assessment_upheld")} className="text-xs rounded-md border border-emerald-500/40 text-emerald-300 px-2 py-1 hover:bg-emerald-500/10">Uphold self-assessment</button>
                <button disabled={respondingId === c.id} onClick={() => respond(c.id, "reclassified_high_risk")} className="text-xs rounded-md border border-rose-500/40 text-rose-300 px-2 py-1 hover:bg-rose-500/10">Reclassify high-risk</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={fileChallenge} disabled={submitting} className="mt-3 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
        Simulate authority challenge received
      </button>
    </GlassCard>
  );
}
