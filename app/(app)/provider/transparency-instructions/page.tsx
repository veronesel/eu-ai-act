import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { TransparencyInstructionsClient } from "./TransparencyInstructionsClient";

export default function TransparencyInstructionsPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const records =
    applicableIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM transparency_instructions WHERE system_id IN (${applicableIds.map(() => "?").join(",")})`)
          .all(...applicableIds) as any[]);
  const recordBySystem = Object.fromEntries(records.map((r) => [r.system_id, r]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Transparency &amp; Instructions for Use"
        subtitle="Art. 13 — the instructions for use Eurobank, as Provider, owes every Deployer of the system: intended purpose, known limitations, the human-oversight measures the deployer must operate, expected lifetime, and maintenance needs."
      />
      <TransparencyInstructionsClient applicable={applicable} notApplicable={notApplicable} recordBySystem={recordBySystem} />
    </div>
  );
}
