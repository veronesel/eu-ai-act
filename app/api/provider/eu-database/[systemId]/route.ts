import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "eu_database")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const selfAssessmentRequired = body.self_assessment_required ? 1 : 0;
  if (body.status === "registered" && selfAssessmentRequired && !(body.self_assessment_summary ?? "").trim()) {
    return NextResponse.json({ error: "The self-assessment summary is required before this system can be marked registered" }, { status: 400 });
  }

  const existing = db.prepare(`SELECT * FROM eu_database_registrations WHERE system_id = ?`).get(params.systemId) as any;
  const registeredAt = body.status === "registered" ? nowIso() : existing?.registered_at ?? null;

  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];
    const map: Record<string, any> = {
      provider_identity: body.provider_identity,
      system_description: body.system_description,
      status: body.status,
      member_states: body.member_states,
      self_assessment_summary: body.self_assessment_summary,
      self_assessment_required: selfAssessmentRequired,
      registered_at: registeredAt,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) {
        updates.push(`${k} = ?`);
        values.push(v);
      }
    }
    values.push(params.systemId);
    db.prepare(`UPDATE eu_database_registrations SET ${updates.join(", ")} WHERE system_id = ?`).run(...values);
  } else {
    db.prepare(
      `INSERT INTO eu_database_registrations (id, system_id, provider_identity, system_description, status, member_states, self_assessment_summary, self_assessment_required, registered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId("edb"),
      params.systemId,
      body.provider_identity || null,
      body.system_description || null,
      body.status || "not_started",
      body.member_states || null,
      body.self_assessment_summary || null,
      selfAssessmentRequired,
      registeredAt
    );
  }
  return NextResponse.json(db.prepare(`SELECT * FROM eu_database_registrations WHERE system_id = ?`).get(params.systemId));
}
