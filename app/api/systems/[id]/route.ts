import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso, newId } from "@/lib/db/client";

const LIFECYCLE_STAGES = ["concept", "screening", "development", "pre_deployment", "in_production", "monitored", "retired"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.id);
  if (!system) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(system);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.id) as any;
  if (!system) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.lifecycle_stage && body.lifecycle_stage !== system.lifecycle_stage) {
    if (!LIFECYCLE_STAGES.includes(body.lifecycle_stage)) return NextResponse.json({ error: "Invalid lifecycle stage" }, { status: 400 });
    db.prepare(`INSERT INTO lifecycle_history (id, system_id, stage, entered_at, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(newId("lch"), params.id, body.lifecycle_stage, nowIso(), body.lifecycle_notes ?? null);
  }

  const fields = ["name", "description", "business_function", "owner_persona_id", "provider_role_applies", "deployer_role_applies", "lifecycle_stage", "gpai_integration", "gpai_model_reference", "fine_tuned_by_eurobank"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (updates.length) {
    values.push(params.id);
    db.prepare(`UPDATE ai_systems SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }
  const updated = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.id);
  return NextResponse.json(updated);
}
