import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { sectionId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { action: 'save' | 'approve', content }
  const db = getDb();
  const section = db.prepare(`SELECT * FROM technical_documentation_sections WHERE id = ?`).get(params.sectionId) as any;
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let newStatus = section.status;
  let newContent = section.content;
  let versionBump = false;

  if (body.action === "approve") {
    if (body.content !== undefined && body.content !== section.content) {
      return NextResponse.json({ error: "Save content changes before approving — approval must be an explicit, separate human action" }, { status: 400 });
    }
    if (section.status === "approved") return NextResponse.json({ error: "Already approved" }, { status: 400 });
    newStatus = "approved";
  } else {
    // 'save': content edits never silently auto-approve. Editing previously-approved content reverts it to draft for re-review.
    newContent = body.content ?? section.content;
    if (newContent !== section.content) {
      versionBump = true;
      newStatus = section.status === "approved" ? "draft" : section.status;
    }
  }

  const newVersion = versionBump ? section.version + 1 : section.version;
  db.prepare(`UPDATE technical_documentation_sections SET content = ?, status = ?, version = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
    .run(newContent, newStatus, newVersion, user.id, nowIso(), params.sectionId);

  if (versionBump || body.action === "approve") {
    db.prepare(`INSERT INTO technical_documentation_versions (id, section_id, version, content, status, saved_by, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(newId("tdv"), params.sectionId, newVersion, newContent, newStatus, user.id, nowIso());
  }

  return NextResponse.json(db.prepare(`SELECT * FROM technical_documentation_sections WHERE id = ?`).get(params.sectionId));
}
