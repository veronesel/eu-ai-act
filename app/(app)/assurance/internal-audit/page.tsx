import { getDb } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { SectionHeading } from "@/components/ui/Glass";
import { InternalAuditListClient } from "./InternalAuditListClient";

export default function InternalAuditPage() {
  const db = getDb();
  const user = getCurrentUser();
  const engagements = db.prepare(`SELECT * FROM internal_audit_engagements ORDER BY created_at DESC`).all() as any[];
  const findingCounts = db
    .prepare(`SELECT engagement_id, count(*) total, sum(CASE WHEN status = 'open' THEN 1 ELSE 0 END) open_count FROM audit_findings GROUP BY engagement_id`)
    .all() as any[];
  const countsById = Object.fromEntries(findingCounts.map((f) => [f.engagement_id, f]));
  const systems = db.prepare(`SELECT id, name, demo_seed_key FROM ai_systems ORDER BY name`).all() as any[];
  const canWriteHere = !!user && canWrite(user.role_code, "internal_audit");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Internal Audit"
        subtitle="Independent assurance across the whole AI Act program. This module is read-only into every other system of record — it observes and tags, it never edits provider, deployer, or cross-cutting data directly."
      />
      <InternalAuditListClient engagements={engagements} countsById={countsById} systems={systems} canWrite={canWriteHere} />
    </div>
  );
}
