import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "ce_marking")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const assessment = db.prepare(`SELECT * FROM conformity_assessments WHERE system_id = ?`).get(params.systemId) as any;
  if (body.status === "affixed" && assessment?.outcome !== "passed") {
    return NextResponse.json({ error: "CE marking can only be affixed once the conformity assessment outcome is passed" }, { status: 400 });
  }
  // Never fabricate a notified body number for the internal-control route.
  const notifiedBodyNumber = assessment?.route === "internal_control_annex_vi" ? null : assessment?.notified_body_number ?? null;

  const existing = db.prepare(`SELECT * FROM ce_marking_records WHERE system_id = ?`).get(params.systemId) as any;
  const affixedAt = body.status === "affixed" ? nowIso() : existing?.affixed_at ?? null;
  if (existing) {
    db.prepare(`UPDATE ce_marking_records SET status = ?, affixed_at = ?, notified_body_number = ? WHERE id = ?`).run(body.status ?? existing.status, affixedAt, notifiedBodyNumber, existing.id);
  } else {
    db.prepare(`INSERT INTO ce_marking_records (id, system_id, affixed_at, notified_body_number, status) VALUES (?, ?, ?, ?, ?)`)
      .run(newId("cem"), params.systemId, affixedAt, notifiedBodyNumber, body.status ?? "not_started");
  }
  return NextResponse.json(db.prepare(`SELECT * FROM ce_marking_records WHERE system_id = ?`).get(params.systemId));
}
