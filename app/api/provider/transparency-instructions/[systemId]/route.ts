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
    return NextResponse.json({ error: "Instructions for use only apply to Provider-role, high-risk systems" }, { status: 400 });
  }
  if (body.status && !["draft", "approved"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const existing = db.prepare(`SELECT * FROM transparency_instructions WHERE system_id = ?`).get(params.systemId) as any;
  const fields = ["intended_purpose", "known_limitations", "human_oversight_measures", "expected_lifetime", "maintenance_needs", "status"];
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
    db.prepare(`UPDATE transparency_instructions SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  } else {
    db.prepare(
      `INSERT INTO transparency_instructions (id, system_id, intended_purpose, known_limitations, human_oversight_measures, expected_lifetime, maintenance_needs, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId("tin"),
      params.systemId,
      body.intended_purpose || null,
      body.known_limitations || null,
      body.human_oversight_measures || null,
      body.expected_lifetime || null,
      body.maintenance_needs || null,
      body.status || "draft",
      nowIso()
    );
  }
  return NextResponse.json(db.prepare(`SELECT * FROM transparency_instructions WHERE system_id = ?`).get(params.systemId));
}
