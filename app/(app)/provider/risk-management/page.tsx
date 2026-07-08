import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { RiskManagementClient } from "./RiskManagementClient";

export default function RiskManagementPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const records =
    applicableIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM risk_management_records WHERE system_id IN (${applicableIds.map(() => "?").join(",")}) ORDER BY created_at DESC`)
          .all(...applicableIds) as any[]);
  const users = db.prepare(`SELECT id, name FROM users`).all() as any[];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Risk Management System"
        subtitle="Art. 9 — a continuous, iterative risk management system run across the entire lifecycle of each high-risk system Eurobank provides. Every risk carries a documented likelihood, severity, mitigation, and residual position."
      />
      <RiskManagementClient applicable={applicable} notApplicable={notApplicable} records={records} users={users} />
    </div>
  );
}
