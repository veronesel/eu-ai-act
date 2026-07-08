import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { DataGovernanceClient } from "./DataGovernanceClient";

export default function DataGovernancePage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const records =
    applicableIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM data_governance_records WHERE system_id IN (${applicableIds.map(() => "?").join(",")}) ORDER BY updated_at DESC`)
          .all(...applicableIds) as any[]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Data Governance"
        subtitle="Art. 10 — training, validation and test dataset governance: provenance, collection methodology, bias characteristics examined, quality checks, and known gaps."
      />
      <div className="glass-panel px-4 py-3 text-xs text-[var(--text-secondary)]">
        <strong className="text-[var(--foreground)]">Digital Omnibus note:</strong> the special-category-data necessity-test lawful basis (below) was widened by the Digital Omnibus from high-risk-Provider-only to all AI systems — but only ever subject to a strict, documented necessity test. It is not a general licence to process special-category data.
      </div>
      <DataGovernanceClient applicable={applicable} notApplicable={notApplicable} records={records} />
    </div>
  );
}
