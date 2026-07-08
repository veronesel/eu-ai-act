import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM human_oversight_operations WHERE system_id = ? ORDER BY occurred_at`).all(params.systemId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { overseer_name, event_type, reason_code?, notes? }
  if (!body.overseer_name) return NextResponse.json({ error: "overseer_name is required" }, { status: 400 });
  if (!["override", "escalation", "routine_check"].includes(body.event_type)) return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });

  const db = getDb();
  const now = nowIso();
  const id = newId("hoo");
  db.prepare(`INSERT INTO human_oversight_operations (id, system_id, overseer_name, shift_date, event_type, reason_code, notes, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, params.systemId, body.overseer_name, now, body.event_type, body.reason_code ?? null, body.notes ?? null, now);

  const rows = db.prepare(`SELECT * FROM human_oversight_operations WHERE system_id = ? ORDER BY occurred_at`).all(params.systemId);
  return NextResponse.json(rows);
}
