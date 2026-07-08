import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM explanation_requests WHERE id = ?`).get(params.id) as any;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const decision = db.prepare(`SELECT * FROM decision_records WHERE id = ?`).get(row.decision_reference) ?? null;
  return NextResponse.json({ ...row, decision });
}

// Art. 86 — persist the human-edited explanation draft, or mark it sent to the affected person.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { drafted_response, status, sent_at? }
  if (!["open", "drafted", "sent"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM explanation_requests WHERE id = ?`).get(params.id) as any;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare(`UPDATE explanation_requests SET drafted_response = ?, status = ?, sent_at = ? WHERE id = ?`)
    .run(body.drafted_response ?? existing.drafted_response, body.status, body.status === "sent" ? (body.sent_at ?? new Date().toISOString()) : existing.sent_at, params.id);

  const updated = db.prepare(`SELECT * FROM explanation_requests WHERE id = ?`).get(params.id);
  return NextResponse.json(updated);
}
