import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

function canWriteReview(roleCode: string): boolean {
  return roleCode === "EXEC_SPONSOR" || roleCode === "REG_COMPLIANCE_LEAD";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWriteReview(user.role_code)) return NextResponse.json({ error: "Only the Exec Sponsor or Reg Compliance Lead may add a review action" }, { status: 403 });

  const body = await req.json();
  if (!body.action_text) return NextResponse.json({ error: "action_text is required" }, { status: 400 });

  const db = getDb();
  const review = db.prepare(`SELECT id FROM management_review_records WHERE id = ?`).get(params.id);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const id = newId("rva");
  db.prepare(`INSERT INTO management_review_actions (id, review_id, action_text, owner_id, due_at, status) VALUES (?, ?, ?, ?, ?, 'open')`).run(
    id, params.id, body.action_text, body.owner_id ?? null, body.due_at ?? null
  );
  const row = db.prepare(`SELECT * FROM management_review_actions WHERE id = ?`).get(id);
  return NextResponse.json(row, { status: 201 });
}
