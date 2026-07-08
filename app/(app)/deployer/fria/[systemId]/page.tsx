import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { friaNotTriggeredReason } from "@/lib/domain/deployer";
import { formatDate } from "@/lib/utils";
import { FriaWorkflow } from "./FriaWorkflow";

export default function DeployerFriaDetailPage({ params }: { params: { systemId: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) notFound();

  const today = formatDate(new Date().toISOString());

  if (system.classification_status !== "high_risk") {
    return (
      <div className="space-y-6">
        <SectionHeading title={`FRIA — ${system.name}`} subtitle={system.description} />
        <GlassCard className="border-dashed">
          <p className="text-sm text-[var(--text-secondary)]">Art. 26 Deployer-obligation suite not applicable — system is not classified high-risk, so the Art. 27 FRIA duty cannot be engaged either.</p>
        </GlassCard>
      </div>
    );
  }

  const fria = db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(params.systemId) as any;

  if (!fria?.triggered) {
    return (
      <div className="space-y-6">
        <SectionHeading title={`FRIA — ${system.name}`} subtitle={system.description} />
        <GlassCard className="border-dashed">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Not triggered</p>
          <p className="text-sm text-[var(--text-secondary)]">{friaNotTriggeredReason(system)}</p>
        </GlassCard>
        <GlassCard className="border-sky-500/30 bg-sky-500/5">
          <p className="text-xs text-[var(--text-secondary)]">
            <strong className="text-sky-300">Art. 27(5) template status —</strong> the AI Office FRIA template is pending as of {today}; should this system&apos;s trigger criteria change, this workflow will follow the Art. 27(1) statutory structure directly and be re-mapped once the official template is published.
          </p>
        </GlassCard>
      </div>
    );
  }

  const cloneSource = fria.cloned_from_system_id
    ? (db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(fria.cloned_from_system_id) as any)
    : null;
  const cloneSourceFria = cloneSource
    ? (db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(cloneSource.id) as any)
    : null;

  return (
    <div className="space-y-6">
      <SectionHeading title={`FRIA — ${system.name}`} subtitle={system.description} />
      <FriaWorkflow system={system} fria={fria} cloneSource={cloneSource} cloneSourceFria={cloneSourceFria} today={today} />
    </div>
  );
}
