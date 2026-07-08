import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { TechDocClient } from "./TechDocClient";

export default function TechnicalDocumentationDetailPage({ params }: { params: { systemId: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) notFound();
  const sections = db.prepare(`SELECT * FROM technical_documentation_sections WHERE system_id = ? ORDER BY annex_iv_point`).all(params.systemId) as any[];
  const versionsBySection: Record<string, any[]> = {};
  for (const s of sections) {
    versionsBySection[s.id] = db.prepare(`SELECT * FROM technical_documentation_versions WHERE section_id = ? ORDER BY version DESC`).all(s.id) as any[];
  }
  const users = db.prepare(`SELECT id, name FROM users`).all() as any[];

  return (
    <div className="space-y-6">
      <SectionHeading
        title={`Technical Documentation — ${system.name}`}
        subtitle={system.description}
        action={<Link href="/provider/technical-documentation" className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]">&larr; All systems</Link>}
      />
      <TechDocClient system={system} sections={sections} versionsBySection={versionsBySection} users={users} />
    </div>
  );
}
