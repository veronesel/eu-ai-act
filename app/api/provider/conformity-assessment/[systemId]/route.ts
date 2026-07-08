import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "conformity_assessment")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });
  if (!system.provider_role_applies || system.classification_status !== "high_risk") {
    return NextResponse.json({ error: "Conformity assessment only applies to Provider-role, high-risk systems" }, { status: 400 });
  }
  if (body.route && !["internal_control_annex_vi", "notified_body_annex_vii"].includes(body.route)) {
    return NextResponse.json({ error: "Invalid route" }, { status: 400 });
  }
  if (body.outcome && !["in_progress", "passed", "failed"].includes(body.outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  // Never fabricate a notified body number for the internal-control route.
  const effectiveRoute = body.route ?? (db.prepare(`SELECT route FROM conformity_assessments WHERE system_id = ?`).get(params.systemId) as any)?.route;
  const notifiedBodyNumber = effectiveRoute === "internal_control_annex_vi" ? null : body.notified_body_number ?? null;

  const existing = db.prepare(`SELECT * FROM conformity_assessments WHERE system_id = ?`).get(params.systemId) as any;
  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];
    const map: Record<string, any> = { route: body.route, checklist_json: body.checklist_json, assessor: body.assessor, notified_body_number: notifiedBodyNumber, outcome: body.outcome, certificate_reference: body.certificate_reference, certificate_expiry: body.certificate_expiry };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) {
        updates.push(`${k} = ?`);
        values.push(v);
      }
    }
    updates.push(`updated_at = ?`);
    values.push(nowIso(), existing.id);
    db.prepare(`UPDATE conformity_assessments SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  } else {
    db.prepare(
      `INSERT INTO conformity_assessments (id, system_id, route, checklist_json, assessor, notified_body_number, outcome, certificate_reference, certificate_expiry, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(newId("cfa"), params.systemId, body.route ?? "internal_control_annex_vi", body.checklist_json ?? "[]", body.assessor ?? null, notifiedBodyNumber, body.outcome ?? "in_progress", body.certificate_reference ?? null, body.certificate_expiry ?? null, nowIso());
  }
  return NextResponse.json(db.prepare(`SELECT * FROM conformity_assessments WHERE system_id = ?`).get(params.systemId));
}
