import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

const VALID_STATUSES = ["open", "remediating", "closed"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "internal_audit")) return NextResponse.json({ error: "Only Internal Audit may update a finding" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM audit_findings WHERE id = ?`).get(params.id) as any;
  if (!existing) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const status = body.status && VALID_STATUSES.includes(body.status) ? body.status : existing.status;
  const remediation_owner = body.remediation_owner !== undefined ? body.remediation_owner : existing.remediation_owner;
  const due_at = body.due_at !== undefined ? body.due_at : existing.due_at;
  const linked_evidence = body.linked_evidence !== undefined ? body.linked_evidence : existing.linked_evidence;

  db.prepare(`UPDATE audit_findings SET status = ?, remediation_owner = ?, due_at = ?, linked_evidence = ? WHERE id = ?`).run(status, remediation_owner, due_at, linked_evidence, params.id);
  const row = db.prepare(`SELECT * FROM audit_findings WHERE id = ?`).get(params.id);
  return NextResponse.json(row);
}
