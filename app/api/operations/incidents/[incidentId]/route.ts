import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { INCIDENT_STATUS_FLOW } from "@/lib/domain/operations";

export async function PATCH(req: NextRequest, { params }: { params: { incidentId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned") && !canWrite(user.role_code, "provider_suite_owned")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM serious_incidents WHERE id = ?`).get(params.incidentId) as any;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.status && !INCIDENT_STATUS_FLOW.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  // deadline_at is never client-writable — only ever computed server-side at creation time (see POST /api/operations/incidents).
  delete body.deadline_at;

  const fields = ["status", "report_text", "authority_notified", "provider_notified"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (body.status === "reported" && !existing.reported_at) {
    updates.push("reported_at = ?");
    values.push(nowIso());
  }
  if (updates.length) {
    values.push(params.incidentId);
    db.prepare(`UPDATE serious_incidents SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  return NextResponse.json(db.prepare(`SELECT * FROM serious_incidents WHERE id = ?`).get(params.incidentId));
}
