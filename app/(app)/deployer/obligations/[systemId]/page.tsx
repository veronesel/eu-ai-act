import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { ObligationChecklistDetail } from "./ObligationChecklistDetail";

export default function DeployerObligationsDetailPage({ params }: { params: { systemId: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) notFound();

  if (system.classification_status !== "high_risk") {
    return (
      <div className="space-y-6">
        <SectionHeading title={`Deployer Obligation Checklist — ${system.name}`} subtitle={system.description} />
        <GlassCard className="border-dashed">
          <p className="text-sm text-[var(--text-secondary)]">Art. 26 Deployer-obligation suite not applicable — system is not classified high-risk.</p>
        </GlassCard>
      </div>
    );
  }

  const items = db.prepare(`SELECT * FROM deployer_obligation_checklists WHERE system_id = ? ORDER BY rowid`).all(params.systemId) as any[];

  return (
    <div className="space-y-6">
      <SectionHeading title={`Deployer Obligation Checklist — ${system.name}`} subtitle={system.description} />
      <ObligationChecklistDetail systemId={system.id} items={items} />
    </div>
  );
}
