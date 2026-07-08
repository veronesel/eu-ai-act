import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });
  if (!system.provider_role_applies || system.classification_status !== "high_risk") {
    return NextResponse.json({ error: "Human oversight design only applies to Provider-role, high-risk systems" }, { status: 400 });
  }

  const existing = db.prepare(`SELECT * FROM human_oversight_designs WHERE system_id = ?`).get(params.systemId) as any;
  const fields = ["stop_override_mechanism", "confidence_threshold_gating", "escalation_triggers", "explainability_outputs"];
  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(body[f]);
      }
    }
    updates.push(`updated_at = ?`);
    values.push(nowIso(), existing.id);
    db.prepare(`UPDATE human_oversight_designs SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  } else {
    db.prepare(
      `INSERT INTO human_oversight_designs (id, system_id, stop_override_mechanism, confidence_threshold_gating, escalation_triggers, explainability_outputs, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newId("hod"), params.systemId, body.stop_override_mechanism || null, body.confidence_threshold_gating || null, body.escalation_triggers || null, body.explainability_outputs || null, nowIso());
  }
  return NextResponse.json(db.prepare(`SELECT * FROM human_oversight_designs WHERE system_id = ?`).get(params.systemId));
}
