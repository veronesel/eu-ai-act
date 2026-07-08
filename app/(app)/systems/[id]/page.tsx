import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { LifecycleStepper } from "./LifecycleStepper";
import { AlertOctagon, ArrowRight, Info } from "lucide-react";

export default function SystemDetailPage({ params }: { params: { id: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.id) as any;
  if (!system) notFound();

  const owner = db.prepare(`SELECT name, title FROM users WHERE id = ?`).get(system.owner_persona_id) as any;
  const determination = db.prepare(`SELECT * FROM high_risk_determinations WHERE system_id = ? ORDER BY rowid DESC LIMIT 1`).get(params.id) as any;
  const lifecycleHistory = db.prepare(`SELECT * FROM lifecycle_history WHERE system_id = ? ORDER BY entered_at`).all(params.id) as any[];
  const isHighRisk = system.classification_status === "high_risk";
  const isOutOfScope = determination?.final_determination === "out_of_scope";
  const isBlocked = system.classification_status === "prohibited_blocked";

  const providerApplicable = !!system.provider_role_applies && isHighRisk;
  const deployerApplicable = !!system.deployer_role_applies && isHighRisk;

  const counts = {
    risk: (db.prepare(`SELECT count(*) c FROM risk_management_records WHERE system_id = ?`).get(params.id) as any).c,
    techDoc: db.prepare(`SELECT status, count(*) c FROM technical_documentation_sections WHERE system_id = ? GROUP BY status`).all(params.id) as any[],
    fria: db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(params.id) as any,
    gpai: db.prepare(`SELECT * FROM gpai_integrations WHERE system_id = ?`).get(params.id) as any,
    incidents: (db.prepare(`SELECT count(*) c FROM serious_incidents WHERE system_id = ? AND status != 'closed'`).get(params.id) as any).c,
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title={system.name}
        subtitle={system.description}
        action={<Link href="/systems" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]">&larr; All systems</Link>}
      />

      {system.provider_role_applies && system.deployer_role_applies && (
        <GlassCard className="border-aegis-violet/40 bg-aegis-violet/5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-aegis-violet shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>You are both sides of this system.</strong> Eurobank designed and put this system into service in its own name (Provider, Art. 3(3)) <em>and</em> uses it under its own authority (Deployer, Art. 3(4)) — the full Provider and Deployer obligation suites both apply to this single system (Art. 25 value-chain logic).
            </p>
          </div>
        </GlassCard>
      )}

      {isBlocked && (
        <GlassCard className="border-rose-500/40 bg-rose-500/5">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-300">Blocked at screening — Art. 5(1)(c) prohibited practice</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{determination?.determination_rationale}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {isOutOfScope && (
        <GlassCard className="border-sky-500/40 bg-sky-500/5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sky-300">Outside Annex III entirely — not merely &quot;not high-risk&quot;</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{determination?.determination_rationale}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="font-heading font-semibold mb-4">Lifecycle</h3>
        <LifecycleStepper systemId={system.id} current={system.lifecycle_stage} history={lifecycleHistory} disabled={isBlocked} />
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="font-heading font-semibold mb-3">Classification</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Status</span><Badge tone={toneForStatus(system.classification_status)}>{system.classification_status.replace(/_/g, " ")}</Badge></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Annex III category</span><span>{system.annex_iii_category ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Owner</span><span>{owner?.name}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Conformity route</span><span className="capitalize">{system.conformity_assessment_route.replace(/_/g, " ")}</span></div>
          </div>
          <Link href={`/classification/${system.id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-aegis-emerald hover:underline">
            Open screening record <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </GlassCard>

        <GlassCard>
          <h3 className="font-heading font-semibold mb-3">Value-chain role &amp; obligation gating</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Provider role applies</span><span>{system.provider_role_applies ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Deployer role applies</span><span>{system.deployer_role_applies ? "Yes" : "No"}</span></div>
            {system.provider_role_applies && !isHighRisk && !isBlocked && (
              <p className="text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--panel-border)]">Art. 16 Provider-obligation suite (B1-B11) not applicable — system is not classified high-risk. Only risk-tier-agnostic cross-cutting obligations (Art. 50 transparency, Art. 25/53 GPAI duties) apply.</p>
            )}
            {system.deployer_role_applies && !isHighRisk && !isBlocked && (
              <p className="text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--panel-border)]">Art. 26 Deployer-obligation suite (C1-C4) not applicable — system is not classified high-risk.</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {providerApplicable && (
          <GlassCard>
            <h4 className="font-medium text-sm mb-2">Provider suite</h4>
            <p className="text-xs text-[var(--text-muted)] mb-2">Risk records: {counts.risk} · Tech doc sections: {counts.techDoc.reduce((a, b) => a + b.c, 0)}</p>
            <Link href="/provider/risk-management" className="text-sm text-aegis-emerald hover:underline">Open Provider suite &rarr;</Link>
          </GlassCard>
        )}
        {deployerApplicable && (
          <GlassCard>
            <h4 className="font-medium text-sm mb-2">Deployer suite</h4>
            <p className="text-xs text-[var(--text-muted)] mb-2">FRIA: {counts.fria ? (counts.fria.triggered ? counts.fria.status : "not triggered") : "—"}</p>
            <Link href="/deployer/obligations" className="text-sm text-aegis-emerald hover:underline">Open Deployer suite &rarr;</Link>
          </GlassCard>
        )}
        {!!system.gpai_integration && (
          <GlassCard>
            <h4 className="font-medium text-sm mb-2">GPAI integration</h4>
            <p className="text-xs text-[var(--text-muted)] mb-2">{counts.gpai?.vendor_model_name} {counts.gpai?.provider_shift_flag ? "· provider-shift flagged" : ""}</p>
            <Link href="/operations/gpai-integration" className="text-sm text-aegis-emerald hover:underline">Open GPAI tracking &rarr;</Link>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
