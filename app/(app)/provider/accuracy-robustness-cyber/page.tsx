import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { AccuracyRobustnessClient } from "./AccuracyRobustnessClient";

export default function AccuracyRobustnessCyberPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const records =
    applicableIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM accuracy_robustness_records WHERE system_id IN (${applicableIds.map(() => "?").join(",")}) ORDER BY test_date DESC`)
          .all(...applicableIds) as any[]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Accuracy, Robustness &amp; Cybersecurity"
        subtitle="Art. 15 — accuracy metrics tracked over time, robustness/adversarial testing, and a cybersecurity control checklist. No control is ever assumed passed by default."
      />
      <AccuracyRobustnessClient applicable={applicable} notApplicable={notApplicable} records={records} />
    </div>
  );
}
