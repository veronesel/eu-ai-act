import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems ORDER BY name`).all();
  return NextResponse.json(systems);
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  if (!body.name || !body.description || !body.business_function) {
    return NextResponse.json({ error: "name, description, and business_function are required" }, { status: 400 });
  }
  const db = getDb();
  const id = newId("sys");
  db.prepare(`INSERT INTO ai_systems (id, name, description, business_function, owner_persona_id, created_at, provider_role_applies, deployer_role_applies, lifecycle_stage, classification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'concept', 'not_screened')`)
    .run(id, body.name, body.description, body.business_function, user.id, nowIso(), body.provider_role_applies ? 1 : 0, body.deployer_role_applies ? 1 : 0);
  db.prepare(`INSERT INTO lifecycle_history (id, system_id, stage, entered_at, notes) VALUES (?, ?, 'concept', ?, 'System proposed.')`).run(newId("lch"), id, nowIso());
  return NextResponse.json({ id }, { status: 201 });
}
