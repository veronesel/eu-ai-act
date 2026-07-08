import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { SectionHeading } from "@/components/ui/Glass";
import { ManagementReviewClient } from "./ManagementReviewClient";

export default function ManagementReviewPage() {
  const db = getDb();
  const user = getCurrentUser();

  const reviews = db.prepare(`SELECT * FROM management_review_records ORDER BY review_date DESC`).all() as any[];
  const actions = db.prepare(`SELECT * FROM management_review_actions ORDER BY due_at ASC`).all() as any[];
  const actionsByReview: Record<string, any[]> = {};
  for (const a of actions) (actionsByReview[a.review_id] ??= []).push(a);
  const users = db.prepare(`SELECT id, name, title FROM users ORDER BY name`).all() as any[];

  // Live input-pack readout — computed fresh on every load, not hardcoded.
  const totalSystems = (db.prepare(`SELECT count(*) c FROM ai_systems`).get() as any).c;
  const classifiedSystems = (db.prepare(`SELECT count(*) c FROM ai_systems WHERE classification_status != 'not_screened'`).get() as any).c;
  const friaTriggered = (db.prepare(`SELECT count(*) c FROM fria_assessments WHERE triggered = 1`).get() as any).c;
  const friaComplete = (db.prepare(`SELECT count(*) c FROM fria_assessments WHERE triggered = 1 AND status = 'complete'`).get() as any).c;
  const openIncidents = (db.prepare(`SELECT count(*) c FROM serious_incidents WHERE status NOT IN ('reported', 'closed')`).get() as any).c;
  const openFindings = (db.prepare(`SELECT count(*) c FROM audit_findings WHERE status = 'open'`).get() as any).c;

  const livePack = {
    totalSystems,
    classifiedSystems,
    classificationPct: totalSystems > 0 ? Math.round((classifiedSystems / totalSystems) * 100) : 0,
    friaTriggered,
    friaComplete,
    openIncidents,
    openFindings,
  };

  const canWriteHere = !!user && (user.role_code === "EXEC_SPONSOR" || user.role_code === "REG_COMPLIANCE_LEAD");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Management Review"
        subtitle="The periodic cadence where leadership sits with the current state of the AI Act programme, records decisions, and assigns follow-up actions. Input-pack completeness is pulled live from the underlying systems of record."
      />
      <ManagementReviewClient reviews={reviews} actionsByReview={actionsByReview} users={users} livePack={livePack} canWrite={canWriteHere} />
    </div>
  );
}
