import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM internal_audit_engagements ORDER BY created_at DESC`).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "internal_audit")) return NextResponse.json({ error: "Only Internal Audit may open a new engagement" }, { status: 403 });

  const body = await req.json();
  if (!body.scope || typeof body.scope !== "string") return NextResponse.json({ error: "Scope is required" }, { status: 400 });

  const db = getDb();
  const id = newId("eng");
  db.prepare(
    `INSERT INTO internal_audit_engagements (id, scope, systems_in_scope, fieldwork_start, fieldwork_end, status, created_at) VALUES (?, ?, ?, ?, ?, 'planned', ?)`
  ).run(id, body.scope, JSON.stringify(Array.isArray(body.systems_in_scope) ? body.systems_in_scope : []), body.fieldwork_start ?? null, body.fieldwork_end ?? null, nowIso());

  return NextResponse.json({ id }, { status: 201 });
}
