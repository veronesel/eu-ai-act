"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { CONFORMITY_ROUTES, NOTIFIED_BODY_ILLUSTRATIVE_NOTE } from "@/lib/domain/provider-suite";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Info, Loader2, CheckCircle2, Circle } from "lucide-react";

const EVIDENCE_LINKS = [
  { label: "B1 Risk Management", href: "/provider/risk-management" },
  { label: "B2 Data Governance", href: "/provider/data-governance" },
  { label: "B3 Technical Documentation", href: "/provider/technical-documentation" },
  { label: "B4 Record-Keeping", href: "/provider/record-keeping" },
  { label: "B5 Instructions for Use", href: "/provider/transparency-instructions" },
  { label: "B6 Human Oversight Design", href: "/provider/human-oversight-design" },
  { label: "B7 Accuracy/Robustness/Cyber", href: "/provider/accuracy-robustness-cyber" },
  { label: "B8 QMS", href: "/provider/qms" },
];

export function ConformityClient({ applicable, notApplicable, assessmentBySystem, declarationBySystem, ceBySystem }: any) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {applicable.map((s: any) => (
        <SystemConformityCard
          key={s.id}
          system={s}
          assessment={assessmentBySystem[s.id]}
          declaration={declarationBySystem[s.id]}
          ce={ceBySystem[s.id]}
          expanded={expanded === s.id}
          onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
          onChanged={() => router.refresh()}
        />
      ))}

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2 mt-4">Provider-role systems — not high-risk</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notApplicable.map((s: any) => <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SystemConformityCard({ system, assessment, declaration, ce, expanded, onToggle, onChanged }: any) {
  const [route, setRoute] = useState(assessment?.route ?? "internal_control_annex_vi");
  const [assessor, setAssessor] = useState(assessment?.assessor ?? "");
  const [notifiedBodyNumber, setNotifiedBodyNumber] = useState(assessment?.notified_body_number ?? "");
  const [checklist, setChecklist] = useState<Array<{ item: string; done: boolean }>>(() => {
    try { return JSON.parse(assessment?.checklist_json ?? "[]"); } catch { return []; }
  });
  const [saving, setSaving] = useState(false);
  const outcome = assessment?.outcome ?? "in_progress";
  const passed = outcome === "passed";

  async function saveAssessment(patch: any) {
    setSaving(true);
    const res = await fetch(`/api/provider/conformity-assessment/${system.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route, assessor, notified_body_number: notifiedBodyNumber, checklist_json: JSON.stringify(checklist), ...patch }),
    });
    setSaving(false);
    if (res.ok) onChanged();
  }

  function toggleItem(idx: number) {
    const next = checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c));
    setChecklist(next);
    saveAssessment({ checklist_json: JSON.stringify(next) });
  }

  async function issueDeclaration() {
    setSaving(true);
    await fetch(`/api/provider/declarations/${system.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "issued" }) });
    setSaving(false);
    onChanged();
  }

  async function affixCe() {
    setSaving(true);
    await fetch(`/api/provider/ce-marking/${system.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "affixed" }) });
    setSaving(false);
    onChanged();
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
        <Badge tone={toneForStatus(outcome)}>{outcome.replace(/_/g, " ")}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[var(--text-muted)]">Conformity route</label>
              <select className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={route} onChange={(e) => { setRoute(e.target.value); if (e.target.value === "internal_control_annex_vi") setNotifiedBodyNumber(""); saveAssessment({ route: e.target.value, notified_body_number: e.target.value === "internal_control_annex_vi" ? null : notifiedBodyNumber }); }}>
                {CONFORMITY_ROUTES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-muted)]">Assessor</label>
              <input className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={assessor} onChange={(e) => setAssessor(e.target.value)} onBlur={() => saveAssessment({})} />
            </div>
          </div>

          {route === "notified_body_annex_vii" ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs">
                <Info className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>{NOTIFIED_BODY_ILLUSTRATIVE_NOTE}</span>
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)]">Notified body number (illustrative only)</label>
                <input className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={notifiedBodyNumber} onChange={(e) => setNotifiedBodyNumber(e.target.value)} onBlur={() => saveAssessment({})} />
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">Internal-control route — no notified body is engaged; the notified-body number field stays blank.</p>
          )}

          <div>
            <p className="text-xs font-medium mb-1.5">Checklist</p>
            <div className="space-y-1">
              {checklist.map((item, i) => (
                <button key={i} onClick={() => toggleItem(i)} className="w-full flex items-center gap-2 text-xs text-left rounded-md border border-[var(--panel-border)] px-2.5 py-1.5 hover:bg-white/5">
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Circle className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />}
                  {item.item}
                </button>
              ))}
              {checklist.length === 0 && <p className="text-xs text-[var(--text-muted)]">No checklist items on record.</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5">Evidence — links to B1-B8 records</p>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-[10px] rounded-full border border-[var(--panel-border)] px-2.5 py-1 hover:bg-white/5 text-aegis-teal">{l.label}</Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Outcome:</span>
            {["in_progress", "passed", "failed"].map((o) => (
              <button key={o} disabled={saving} onClick={() => saveAssessment({ outcome: o })} className={`px-2 py-1 rounded-md text-[10px] font-medium border ${outcome === o ? "bg-aegis-emerald/20 border-aegis-emerald/50 text-aegis-emerald" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"}`}>
                {o.replace(/_/g, " ")}
              </button>
            ))}
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--panel-border)]">
            <div>
              <p className="text-xs font-medium mb-1">Art. 47 — Declaration of conformity</p>
              <Badge tone={toneForStatus(declaration?.status ?? "not_started")}>{(declaration?.status ?? "not_started").replace(/_/g, " ")}</Badge>
              {declaration?.issued_at && <p className="text-[10px] text-[var(--text-muted)] mt-1">Issued {formatDate(declaration.issued_at)}</p>}
              {declaration?.status !== "issued" && (
                <button disabled={!passed || saving} title={!passed ? "Only available once the conformity outcome is passed" : undefined} onClick={issueDeclaration} className="mt-2 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-40">
                  Issue declaration
                </button>
              )}
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Art. 48 — CE marking</p>
              <Badge tone={toneForStatus(ce?.status ?? "not_started")}>{(ce?.status ?? "not_started").replace(/_/g, " ")}</Badge>
              {ce?.affixed_at && <p className="text-[10px] text-[var(--text-muted)] mt-1">Affixed {formatDate(ce.affixed_at)}</p>}
              {ce?.status !== "affixed" && (
                <button disabled={!passed || saving} title={!passed ? "Only available once the conformity outcome is passed" : undefined} onClick={affixCe} className="mt-2 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-40">
                  Affix CE marking
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
