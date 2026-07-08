import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { RecordKeepingClient } from "./RecordKeepingClient";

export default function RecordKeepingPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const logs =
    applicableIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM record_keeping_logs WHERE system_id IN (${applicableIds.map(() => "?").join(",")}) ORDER BY logged_at DESC`)
          .all(...applicableIds) as any[]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Record-Keeping"
        subtitle="Art. 12 / Art. 19 — automatically generated logs across the system's lifetime. Append-only by design: entries are never edited or deleted once written."
      />
      <RecordKeepingClient applicable={applicable} notApplicable={notApplicable} logs={logs} />
    </div>
  );
}
