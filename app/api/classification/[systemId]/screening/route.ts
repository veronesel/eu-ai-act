import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { PROHIBITED_LIMBS } from "@/lib/domain/classification";

export async function GET(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM prohibited_practice_screenings WHERE system_id = ?`).all(params.systemId);
  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json(); // { limb_code, result, rationale, safe_harbour_notes }
  if (!PROHIBITED_LIMBS.some((l) => l.code === body.limb_code)) return NextResponse.json({ error: "Unknown limb" }, { status: 400 });
  if (!["pass", "fail", "not_applicable"].includes(body.result)) return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  if (body.result === "fail" && !body.rationale) return NextResponse.json({ error: "A rationale is required to record a failed limb" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM prohibited_practice_screenings WHERE system_id = ? AND limb_code = ?`).get(params.systemId, body.limb_code) as any;
  if (existing) {
    db.prepare(`UPDATE prohibited_practice_screenings SET result = ?, rationale = ?, safe_harbour_notes = ?, decided_by = ?, decided_at = ? WHERE id = ?`)
      .run(body.result, body.rationale ?? null, body.safe_harbour_notes ?? null, user.id, nowIso(), existing.id);
  } else {
    db.prepare(`INSERT INTO prohibited_practice_screenings (id, system_id, limb_code, result, rationale, safe_harbour_notes, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(newId("scr"), params.systemId, body.limb_code, body.result, body.rationale ?? null, body.safe_harbour_notes ?? null, user.id, nowIso());
  }

  // Hard stop: any failed limb blocks the system immediately.
  const anyFail = db.prepare(`SELECT count(*) c FROM prohibited_practice_screenings WHERE system_id = ? AND result = 'fail'`).get(params.systemId) as any;
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (anyFail.c > 0) {
    db.prepare(`UPDATE ai_systems SET classification_status = 'prohibited_blocked' WHERE id = ?`).run(params.systemId);
    const failed = db.prepare(`SELECT * FROM prohibited_practice_screenings WHERE system_id = ? AND result = 'fail'`).all(params.systemId) as any[];
    const rationale = "Blocked under " + failed.map((f) => PROHIBITED_LIMBS.find((l) => l.code === f.limb_code)?.article).join(", ") + ": " + failed.map((f) => f.rationale).join(" ");
    const existingDet = db.prepare(`SELECT id FROM high_risk_determinations WHERE system_id = ?`).get(params.systemId) as any;
    if (existingDet) {
      db.prepare(`UPDATE high_risk_determinations SET final_determination = 'prohibited_blocked', determination_rationale = ?, confirmed_by = ?, confirmed_at = ? WHERE id = ?`).run(rationale, user.id, nowIso(), existingDet.id);
    } else {
      db.prepare(`INSERT INTO high_risk_determinations (id, system_id, final_determination, determination_rationale, confirmed_by, confirmed_at) VALUES (?, ?, 'prohibited_blocked', ?, ?, ?)`).run(newId("det"), params.systemId, rationale, user.id, nowIso());
    }
  } else if (system.classification_status === "not_screened" || system.classification_status === "prohibited_blocked") {
    db.prepare(`UPDATE ai_systems SET classification_status = 'screening_in_progress' WHERE id = ?`).run(params.systemId);
  }

  const rows = db.prepare(`SELECT * FROM prohibited_practice_screenings WHERE system_id = ?`).all(params.systemId);
  return NextResponse.json(rows);
}
