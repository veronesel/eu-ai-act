import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM complaints ORDER BY filed_at DESC`).all();
  return NextResponse.json(rows);
}

// Art. 85 — intake of a new complaint against a specific deployed system, routed to the
// competent market surveillance authority (defaults to Banca d'Italia).
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { system_id, complainant, nature, routed_to? }
  if (!body.system_id || !body.complainant || !body.nature) {
    return NextResponse.json({ error: "system_id, complainant, and nature are required" }, { status: 400 });
  }

  const db = getDb();
  const system = db.prepare(`SELECT id FROM ai_systems WHERE id = ?`).get(body.system_id);
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const id = newId("cmp");
  db.prepare(`INSERT INTO complaints (id, system_id, complainant, nature, routed_to, status, filed_at, closed_at) VALUES (?, ?, ?, ?, ?, 'open', ?, NULL)`)
    .run(id, body.system_id, body.complainant, body.nature, body.routed_to || "Banca d'Italia", nowIso());

  const rows = db.prepare(`SELECT * FROM complaints ORDER BY filed_at DESC`).all();
  return NextResponse.json(rows);
}
