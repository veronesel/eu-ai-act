import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

function canWriteReview(roleCode: string): boolean {
  return roleCode === "EXEC_SPONSOR" || roleCode === "REG_COMPLIANCE_LEAD";
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM management_review_records ORDER BY review_date DESC`).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWriteReview(user.role_code)) return NextResponse.json({ error: "Only the Exec Sponsor or Reg Compliance Lead may record a management review" }, { status: 403 });

  const body = await req.json();
  if (!body.review_date) return NextResponse.json({ error: "review_date is required" }, { status: 400 });

  const db = getDb();
  const id = newId("rev");
  db.prepare(
    `INSERT INTO management_review_records (id, review_date, input_pack_notes, decisions, status, next_review_due) VALUES (?, ?, ?, ?, 'completed', ?)`
  ).run(id, body.review_date, body.input_pack_notes ?? null, body.decisions ?? null, body.next_review_due ?? null);

  const row = db.prepare(`SELECT * FROM management_review_records WHERE id = ?`).get(id);
  return NextResponse.json(row, { status: 201 });
}
