import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM regulatory_challenges WHERE system_id = ? ORDER BY challenge_received_at DESC`).all(params.systemId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  const id = newId("chl");
  const receivedAt = nowIso();
  const dueAt = new Date(Date.now() + 15 * 86400000).toISOString();
  db.prepare(`INSERT INTO regulatory_challenges (id, system_id, authority, challenge_received_at, challenge_notes, response_due_at, response_notes, responded_at, outcome) VALUES (?, ?, 'Banca d''Italia', ?, ?, ?, NULL, NULL, 'pending')`)
    .run(id, params.systemId, receivedAt, body.challenge_notes ?? "Formal challenge to the Art. 6(3) non-high-risk self-assessment.", dueAt);
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json(); // { id, response_notes, outcome }
  const db = getDb();
  if (!["self_assessment_upheld", "reclassified_high_risk"].includes(body.outcome)) return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  db.prepare(`UPDATE regulatory_challenges SET response_notes = ?, responded_at = ?, outcome = ? WHERE id = ?`).run(body.response_notes ?? null, nowIso(), body.outcome, body.id);

  if (body.outcome === "reclassified_high_risk") {
    db.prepare(`UPDATE ai_systems SET classification_status = 'high_risk' WHERE id = ?`).run(params.systemId);
    db.prepare(`UPDATE high_risk_determinations SET final_determination = 'high_risk', determination_rationale = determination_rationale || ' [Reclassified high-risk following Art. 80 market-surveillance challenge, ' || ? || ']' WHERE system_id = ?`).run(user.name, params.systemId);
  }
  return NextResponse.json({ ok: true });
}
