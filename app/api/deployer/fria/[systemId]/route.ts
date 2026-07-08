import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

const EDITABLE_FIELDS = [
  "process_description",
  "timeframe_frequency",
  "affected_persons",
  "specific_risks",
  "human_oversight_measures",
  "mitigation_measures",
  "dpia_crossref",
  "status",
  "notification_status",
  "notified_at",
];

export async function GET(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(params.systemId);
  return NextResponse.json(row ?? null);
}

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM fria_assessments WHERE system_id = ?`).get(params.systemId) as any;
  if (!existing) return NextResponse.json({ error: "No FRIA record for this system" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, any> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(", ");
  if (setClauses) {
    db.prepare(`UPDATE fria_assessments SET ${setClauses}, updated_at = @updated_at WHERE id = @id`)
      .run({ ...updates, updated_at: nowIso(), id: existing.id });
  }

  const updated = db.prepare(`SELECT * FROM fria_assessments WHERE id = ?`).get(existing.id);
  return NextResponse.json(updated);
}
