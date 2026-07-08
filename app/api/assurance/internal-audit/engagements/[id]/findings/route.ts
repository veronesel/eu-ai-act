import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

const VALID_SEVERITY = ["low", "medium", "high", "critical"];
const VALID_TAGS = ["compliant_but_risky", "formal_non_compliance"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "internal_audit")) return NextResponse.json({ error: "Only Internal Audit may log a finding" }, { status: 403 });

  const body = await req.json();
  if (!body.title || typeof body.title !== "string") return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!VALID_SEVERITY.includes(body.severity)) return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  if (!VALID_TAGS.includes(body.finding_tag)) return NextResponse.json({ error: "Invalid finding_tag" }, { status: 400 });

  const db = getDb();
  const engagement = db.prepare(`SELECT id FROM internal_audit_engagements WHERE id = ?`).get(params.id);
  if (!engagement) return NextResponse.json({ error: "Engagement not found" }, { status: 404 });

  const id = newId("fnd");
  db.prepare(
    `INSERT INTO audit_findings (id, engagement_id, system_id, title, severity, finding_tag, linked_evidence, remediation_owner, due_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
  ).run(id, params.id, body.system_id ?? null, body.title, body.severity, body.finding_tag, body.linked_evidence ?? null, body.remediation_owner ?? null, body.due_at ?? null, nowIso());

  const row = db.prepare(`SELECT * FROM audit_findings WHERE id = ?`).get(id);
  return NextResponse.json(row, { status: 201 });
}
