import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { PMM_EVENT_TYPES, PMM_SEVERITIES } from "@/lib/domain/operations";

export async function POST(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!PMM_EVENT_TYPES.includes(body.event_type)) return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
  if (!PMM_SEVERITIES.includes(body.severity)) return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  if (!body.description) return NextResponse.json({ error: "description required" }, { status: 400 });

  const db = getDb();
  const system = db.prepare(`SELECT id FROM ai_systems WHERE id = ?`).get(params.systemId);
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const id = newId("pme");
  db.prepare(
    `INSERT INTO post_market_monitoring_events (id, system_id, event_type, description, severity, occurred_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, params.systemId, body.event_type, body.description, body.severity, body.occurred_at || new Date().toISOString());

  return NextResponse.json(db.prepare(`SELECT * FROM post_market_monitoring_events WHERE id = ?`).get(id));
}
