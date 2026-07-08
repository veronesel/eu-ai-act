import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { IncidentsBoard } from "./IncidentsBoard";

export default function IncidentsPage() {
  const db = getDb();
  const incidents = db.prepare(`SELECT * FROM serious_incidents ORDER BY incident_detected_at DESC`).all() as any[];
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE deployer_role_applies = 1 ORDER BY name`).all() as any[];
  const eligibleSystems = systems.filter((s) => s.classification_status === "high_risk");
  const systemById = Object.fromEntries(systems.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Serious Incident Reporting"
        subtitle="Art. 73 — providers and deployers of high-risk AI systems must report serious incidents to the relevant market surveillance authority within tiered statutory deadlines from becoming aware of the incident."
      />
      <IncidentsBoard incidents={incidents} systemById={systemById} eligibleSystems={eligibleSystems} />
    </div>
  );
}
