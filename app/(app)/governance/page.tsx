import { getDb } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { SectionHeading } from "@/components/ui/Glass";
import { GovernanceConstellation } from "./GovernanceConstellation";
import { AuthorityRequestsClient } from "./AuthorityRequestsClient";

export default function GovernancePage() {
  const db = getDb();
  const user = getCurrentUser();
  const requests = db.prepare(`SELECT * FROM authority_information_requests ORDER BY received_at DESC`).all() as any[];
  const systems = db.prepare(`SELECT id, name FROM ai_systems ORDER BY name`).all() as any[];
  const canWriteHere = !!user && canWrite(user.role_code, "governance");

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Governance & Competent Authority Map"
        subtitle="Who Eurobank answers to on AI, and how — plus the working intake and response workflow for Art. 21 information requests from any of them."
      />

      <GovernanceConstellation />

      <AuthorityRequestsClient requests={requests} systems={systems} canWrite={canWriteHere} />
    </div>
  );
}
