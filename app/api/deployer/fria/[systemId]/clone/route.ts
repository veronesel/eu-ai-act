import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

// Art. 27(2) — reuse a previously completed FRIA for a materially similar deployment instead of
// duplicating the assessment from scratch. Copies the narrative section text (not the notification
// state, which the target system must still complete for itself).
export async function POST(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const target = db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(params.systemId) as any;
  if (!target) return NextResponse.json({ error: "No FRIA record for this system" }, { status: 404 });
  if (!target.cloned_from_system_id) return NextResponse.json({ error: "This FRIA has no designated clone source" }, { status: 400 });

  const source = db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(target.cloned_from_system_id) as any;
  if (!source) return NextResponse.json({ error: "Source system has no FRIA record" }, { status: 404 });
  if (!source.process_description) return NextResponse.json({ error: "Source FRIA has no completed section text to clone" }, { status: 400 });

  const sourceSystem = db.prepare(`SELECT name FROM ai_systems WHERE id = ?`).get(target.cloned_from_system_id) as any;

  const cloneNote = `[Cloned from ${sourceSystem?.name ?? "source system"}'s FRIA under Art. 27(2) — reuse in similar cases. Review and adjust for this system's specifics before marking complete.]\n\n`;

  db.prepare(`UPDATE fria_assessments SET
      process_description = ?,
      timeframe_frequency = ?,
      affected_persons = ?,
      specific_risks = ?,
      human_oversight_measures = ?,
      mitigation_measures = ?,
      dpia_crossref = ?,
      status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END,
      updated_at = ?
    WHERE id = ?`)
    .run(
      cloneNote + source.process_description,
      source.timeframe_frequency,
      source.affected_persons,
      source.specific_risks,
      source.human_oversight_measures,
      source.mitigation_measures,
      source.dpia_crossref,
      nowIso(),
      target.id
    );

  const updated = db.prepare(`SELECT * FROM fria_assessments WHERE id = ?`).get(target.id);
  return NextResponse.json(updated);
}
