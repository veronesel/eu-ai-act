import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM authority_information_requests ORDER BY received_at DESC`).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "governance")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.authority || !body.request_text) return NextResponse.json({ error: "authority and request_text are required" }, { status: 400 });

  const db = getDb();
  const id = newId("air");
  const receivedAt = body.received_at ?? nowIso();
  const slaDays = body.sla_days ? Number(body.sla_days) : 15;
  const slaIsDefault = body.sla_days ? 0 : 1;
  const dueAt = new Date(new Date(receivedAt).getTime() + slaDays * 86400000).toISOString();

  db.prepare(`INSERT INTO authority_information_requests (id, authority, system_id, request_text, received_at, sla_days, sla_is_default, response_due_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`)
    .run(id, body.authority, body.system_id ?? null, body.request_text, receivedAt, slaDays, slaIsDefault, dueAt);

  const row = db.prepare(`SELECT * FROM authority_information_requests WHERE id = ?`).get(id);
  return NextResponse.json(row, { status: 201 });
}
