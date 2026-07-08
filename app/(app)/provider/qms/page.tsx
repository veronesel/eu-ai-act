import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { QmsClient } from "./QmsClient";

export default function QmsPage() {
  const db = getDb();
  const records = db.prepare(`SELECT * FROM qms_records ORDER BY rowid`).all() as any[];
  const users = db.prepare(`SELECT id, name FROM users`).all() as any[];
  const complete = records.filter((r) => r.status === "complete").length;
  const maturity = records.length ? Math.round((complete / records.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Quality Management System"
        subtitle="Art. 17 — the 10 mandatory QMS policy areas, held once at the organisation level (not per-system) and embedding the Art. 9 risk management system."
      />
      <QmsClient records={records} users={users} maturity={maturity} />
    </div>
  );
}
