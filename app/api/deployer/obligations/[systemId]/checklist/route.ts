import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM deployer_obligation_checklists WHERE system_id = ? ORDER BY rowid`).all(params.systemId);
  return NextResponse.json(rows);
}

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { item_code, is_checked?, evidence_link? }
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM deployer_obligation_checklists WHERE system_id = ? AND item_code = ?`).get(params.systemId, body.item_code) as any;
  if (!existing) return NextResponse.json({ error: "Unknown checklist item" }, { status: 404 });

  const is_checked = typeof body.is_checked === "boolean" ? (body.is_checked ? 1 : 0) : existing.is_checked;
  const evidence_link = typeof body.evidence_link === "string" ? body.evidence_link : existing.evidence_link;

  db.prepare(`UPDATE deployer_obligation_checklists SET is_checked = ?, evidence_link = ?, updated_at = ? WHERE id = ?`)
    .run(is_checked, evidence_link || null, nowIso(), existing.id);

  const updated = db.prepare(`SELECT * FROM deployer_obligation_checklists WHERE id = ?`).get(existing.id);
  return NextResponse.json(updated);
}
