import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { DISCLOSURE_TYPES } from "@/lib/domain/operations";

// One-click "create disclosure record" action offered from the rule-based Transparency Compliance Scan.
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.system_id) return NextResponse.json({ error: "system_id required" }, { status: 400 });
  const disclosureType = DISCLOSURE_TYPES.includes(body.disclosure_type) ? body.disclosure_type : "ai_interaction";

  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(body.system_id) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const id = newId("trd");
  db.prepare(
    `INSERT INTO transparency_disclosures (id, system_id, disclosure_type, disclosure_text, status, verification_log, deadline_at, updated_at)
     VALUES (?, ?, ?, ?, 'missing', ?, ?, ?)`
  ).run(id, body.system_id, disclosureType, null, null, null, nowIso());

  return NextResponse.json(db.prepare(`SELECT * FROM transparency_disclosures WHERE id = ?`).get(id));
}
