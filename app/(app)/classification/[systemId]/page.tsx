import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { ClassificationWorkflow } from "./ClassificationWorkflow";

export default function ClassificationDetailPage({ params }: { params: { systemId: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) notFound();
  const screenings = db.prepare(`SELECT * FROM prohibited_practice_screenings WHERE system_id = ?`).all(params.systemId) as any[];
  const determination = db.prepare(`SELECT * FROM high_risk_determinations WHERE system_id = ? ORDER BY rowid DESC LIMIT 1`).get(params.systemId) as any;
  const challenges = db.prepare(`SELECT * FROM regulatory_challenges WHERE system_id = ? ORDER BY challenge_received_at DESC`).all(params.systemId) as any[];

  return (
    <div className="space-y-6">
      <SectionHeading title={`Classification — ${system.name}`} subtitle={system.description} />
      <ClassificationWorkflow system={system} screenings={screenings} determination={determination} challenges={challenges} />
    </div>
  );
}
