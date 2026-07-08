import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "declarations")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });

  const assessment = db.prepare(`SELECT * FROM conformity_assessments WHERE system_id = ?`).get(params.systemId) as any;
  if (body.status === "issued" && assessment?.outcome !== "passed") {
    return NextResponse.json({ error: "A declaration of conformity can only be issued once the conformity assessment outcome is passed" }, { status: 400 });
  }

  const existing = db.prepare(`SELECT * FROM declarations_of_conformity WHERE system_id = ?`).get(params.systemId) as any;
  const issuedAt = body.status === "issued" ? nowIso() : existing?.issued_at ?? null;
  const documentText = body.status === "issued" ? `EU Declaration of Conformity for ${system.business_function} system, issued under ${assessment?.route === "notified_body_annex_vii" ? "notified-body (Annex VII)" : "internal-control (Annex VI)"} route.` : existing?.document_text ?? null;

  if (existing) {
    db.prepare(`UPDATE declarations_of_conformity SET status = ?, issued_at = ?, document_text = ? WHERE id = ?`).run(body.status ?? existing.status, issuedAt, documentText, existing.id);
  } else {
    db.prepare(`INSERT INTO declarations_of_conformity (id, system_id, issued_at, document_text, status) VALUES (?, ?, ?, ?, ?)`)
      .run(newId("doc"), params.systemId, issuedAt, documentText, body.status ?? "not_started");
  }
  return NextResponse.json(db.prepare(`SELECT * FROM declarations_of_conformity WHERE system_id = ?`).get(params.systemId));
}
