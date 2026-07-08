import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems, selfAssessmentRequired } from "@/lib/domain/provider-suite";
import { EuDatabaseClient } from "./EuDatabaseClient";

export default function EuDatabasePage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable: notHighRisk } = partitionProviderSystems(systems);

  const determinations = db.prepare(`SELECT * FROM high_risk_determinations`).all() as any[];
  const detBySystem: Record<string, any> = {};
  for (const d of determinations) detBySystem[d.system_id] = d; // one row per system in this dataset

  const selfAssessmentSystems = notHighRisk.filter((s) => selfAssessmentRequired(detBySystem[s.id]));
  const trulyNotApplicable = notHighRisk.filter((s) => !selfAssessmentRequired(detBySystem[s.id]));

  const relevantIds = [...applicable, ...selfAssessmentSystems].map((s) => s.id);
  const registrations = relevantIds.length ? (db.prepare(`SELECT * FROM eu_database_registrations WHERE system_id IN (${relevantIds.map(() => "?").join(",")})`).all(...relevantIds) as any[]) : [];
  const regBySystem = Object.fromEntries(registrations.map((r) => [r.system_id, r]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="EU Database Registration"
        subtitle="Art. 49 / Art. 71 / Annex VIII — registration of high-risk systems in the EU database before placing on the market. The Digital Omnibus reinstated an always-required self-assessment summary for systems relying on the Art. 6(3) narrow exception."
      />
      <EuDatabaseClient applicable={applicable} selfAssessmentSystems={selfAssessmentSystems} trulyNotApplicable={trulyNotApplicable} regBySystem={regBySystem} />
    </div>
  );
}
