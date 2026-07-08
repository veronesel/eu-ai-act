import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM deployer_logs ORDER BY generated_at DESC`).all();
  return NextResponse.json(rows);
}

// Records a new deployer log batch with retention_expires_at set to the Art. 26(6) statutory
// minimum of 6 months from today (180 days) — never hand-typed.
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { system_id }
  if (!body.system_id) return NextResponse.json({ error: "system_id is required" }, { status: 400 });

  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(body.system_id) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const now = new Date();
  const retentionExpires = new Date(now);
  retentionExpires.setDate(retentionExpires.getDate() + 180);

  const id = newId("dlg");
  db.prepare(`INSERT INTO deployer_logs (id, system_id, log_batch_label, generated_at, retention_expires_at) VALUES (?, ?, ?, ?, ?)`)
    .run(id, body.system_id, `${system.business_function} log batch - ${now.getFullYear()}`, nowIso(), retentionExpires.toISOString());

  const rows = db.prepare(`SELECT * FROM deployer_logs WHERE system_id = ? ORDER BY generated_at DESC`).all(body.system_id);
  return NextResponse.json(rows);
}
