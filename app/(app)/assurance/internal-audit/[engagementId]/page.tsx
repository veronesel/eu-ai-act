import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { SectionHeading } from "@/components/ui/Glass";
import { EngagementDetailClient } from "./EngagementDetailClient";

export default function EngagementDetailPage({ params }: { params: { engagementId: string } }) {
  const db = getDb();
  const user = getCurrentUser();
  const engagement = db.prepare(`SELECT * FROM internal_audit_engagements WHERE id = ?`).get(params.engagementId) as any;
  if (!engagement) notFound();

  const findings = db.prepare(`SELECT * FROM audit_findings WHERE engagement_id = ? ORDER BY created_at DESC`).all(params.engagementId) as any[];
  const systems = db.prepare(`SELECT id, name, demo_seed_key FROM ai_systems ORDER BY name`).all() as any[];
  const users = db.prepare(`SELECT id, name, title FROM users ORDER BY name`).all() as any[];
  const scopeKeys: string[] = engagement.systems_in_scope ? JSON.parse(engagement.systems_in_scope) : [];
  const namesByKey = Object.fromEntries(systems.map((s) => [s.demo_seed_key, s]));
  const scopeSystems = scopeKeys.map((k) => namesByKey[k]).filter(Boolean);

  const canWriteHere = !!user && canWrite(user.role_code, "internal_audit");

  return (
    <div className="space-y-6">
      <SectionHeading title={engagement.scope} subtitle="Internal Audit engagement — read-only into every other module's records; findings and tags are Internal Audit's own assessment." />
      <EngagementDetailClient engagement={engagement} findings={findings} scopeSystems={scopeSystems} systems={systems} users={users} canWrite={canWriteHere} />
    </div>
  );
}
