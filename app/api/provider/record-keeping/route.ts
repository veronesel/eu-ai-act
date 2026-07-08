import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

// Append-only: this route supports GET (list) and POST (append) only.
// There is deliberately no PATCH or DELETE handler — record_keeping_logs are immutable once written (Art. 12/19).

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.prepare(`SELECT * FROM record_keeping_logs ORDER BY logged_at DESC`).all());
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.system_id || !body.event_type || !body.event_detail) {
    return NextResponse.json({ error: "system_id, event_type and event_detail required" }, { status: 400 });
  }
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(body.system_id) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });
  if (!system.provider_role_applies || system.classification_status !== "high_risk") {
    return NextResponse.json({ error: "Record-keeping only applies to Provider-role, high-risk systems" }, { status: 400 });
  }

  const id = newId("rkl");
  db.prepare(`INSERT INTO record_keeping_logs (id, system_id, event_type, event_detail, logged_at) VALUES (?, ?, ?, ?, ?)`)
    .run(id, body.system_id, body.event_type, body.event_detail, nowIso());
  return NextResponse.json(db.prepare(`SELECT * FROM record_keeping_logs WHERE id = ?`).get(id));
}
