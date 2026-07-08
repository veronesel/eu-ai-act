import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { computeOverrideRateSeries, overallOverrideRatePct } from "@/lib/domain/deployer";
import { OversightOperationDetail } from "./OversightOperationDetail";

export default function HumanOversightOperationDetailPage({ params }: { params: { systemId: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) notFound();

  if (system.classification_status !== "high_risk") {
    return (
      <div className="space-y-6">
        <SectionHeading title={`Human Oversight — Operation — ${system.name}`} subtitle={system.description} />
        <GlassCard className="border-dashed">
          <p className="text-sm text-[var(--text-secondary)]">Art. 26 Deployer-obligation suite not applicable — system is not classified high-risk.</p>
        </GlassCard>
      </div>
    );
  }

  const events = db.prepare(`SELECT * FROM human_oversight_operations WHERE system_id = ? ORDER BY occurred_at`).all(params.systemId) as any[];
  const series = computeOverrideRateSeries(events);
  const overallRate = overallOverrideRatePct(events);

  return (
    <div className="space-y-6">
      <SectionHeading title={`Human Oversight — Operation — ${system.name}`} subtitle={system.description} />
      <OversightOperationDetail systemId={system.id} events={events} series={series} overallRate={overallRate} />
    </div>
  );
}
