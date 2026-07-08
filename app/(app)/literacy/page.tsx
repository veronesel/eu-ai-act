import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { SectionHeading } from "@/components/ui/Glass";
import { LiteracyClient } from "./LiteracyClient";

export default function LiteracyPage() {
  const db = getDb();
  const user = getCurrentUser();
  const records = db.prepare(`SELECT * FROM ai_literacy_records ORDER BY department`).all() as any[];
  const canWriteHere = !!user && (user.role_code === "EXEC_SPONSOR" || user.role_code === "REG_COMPLIANCE_LEAD");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="AI Literacy Program"
        subtitle="Art. 4 — building and evidencing the level of AI literacy Eurobank's staff and leadership need to operate this programme responsibly."
      />
      <LiteracyClient records={records} canWrite={canWriteHere} />
    </div>
  );
}
