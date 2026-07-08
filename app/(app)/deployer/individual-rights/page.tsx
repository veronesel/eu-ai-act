import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { IndividualRightsWorkspace } from "./IndividualRightsWorkspace";

export default function IndividualRightsPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE deployer_role_applies = 1 AND classification_status = 'high_risk' ORDER BY name`).all() as any[];
  const systemNameById = Object.fromEntries((db.prepare(`SELECT id, name FROM ai_systems`).all() as any[]).map((s) => [s.id, s.name]));

  const complaints = (db.prepare(`SELECT * FROM complaints ORDER BY filed_at DESC`).all() as any[]).map((c) => ({ ...c, system_name: systemNameById[c.system_id] ?? "Unknown system" }));
  const explanationRequests = (db.prepare(`SELECT * FROM explanation_requests ORDER BY due_at ASC`).all() as any[]).map((r) => ({ ...r, system_name: systemNameById[r.system_id] ?? "Unknown system" }));
  const decisionRecords = db.prepare(`SELECT * FROM decision_records`).all() as any[];
  const decisionById = Object.fromEntries(decisionRecords.map((d) => [d.id, d]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Individual Rights &amp; Remedies"
        subtitle="Art. 85-87 — the Act's own grouping of remedies available to affected persons: the right to lodge a complaint, the right to a clear explanation of an individual decision, and the cross-reference to Union infringement-reporting/whistleblower protection."
      />
      <IndividualRightsWorkspace
        systems={systems}
        complaints={complaints}
        explanationRequests={explanationRequests}
        decisionById={decisionById}
      />
    </div>
  );
}
