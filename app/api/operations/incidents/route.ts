import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { SEVERITY_TIER_DAYS, computeIncidentDeadline } from "@/lib/domain/operations";

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.prepare(`SELECT * FROM serious_incidents ORDER BY incident_detected_at DESC`).all());
}

// D4 intake. Owned by DEPLOYER_OPS_MGR or AI_PRODUCT_OWNER — either write scope is accepted per the build spec.
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned") && !canWrite(user.role_code, "provider_suite_owned")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.system_id) return NextResponse.json({ error: "system_id required" }, { status: 400 });
  if (!body.description) return NextResponse.json({ error: "description required" }, { status: 400 });
  if (!body.incident_detected_at) return NextResponse.json({ error: "incident_detected_at required" }, { status: 400 });
  if (!SEVERITY_TIER_DAYS[body.severity_tier]) return NextResponse.json({ error: "Invalid severity_tier" }, { status: 400 });

  const db = getDb();
  const system = db.prepare(`SELECT id FROM ai_systems WHERE id = ?`).get(body.system_id);
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  // deadline_at is ALWAYS computed here from incident_detected_at + the statutory tier day-count.
  // A client-supplied deadline_at (if any) is ignored — never trusted.
  const deadlineAt = computeIncidentDeadline(body.incident_detected_at, body.severity_tier);

  const id = newId("inc");
  db.prepare(
    `INSERT INTO serious_incidents (id, system_id, description, severity_tier, incident_detected_at, deadline_at, reported_at, status, report_text, authority_notified, provider_notified)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 'detected', NULL, 0, 0)`
  ).run(id, body.system_id, body.description, body.severity_tier, body.incident_detected_at, deadlineAt);

  return NextResponse.json(db.prepare(`SELECT * FROM serious_incidents WHERE id = ?`).get(id), { status: 201 });
}
