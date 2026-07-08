import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

const VALID_STATUSES = ["open", "in_progress", "closed"];

function canWriteReview(roleCode: string): boolean {
  return roleCode === "EXEC_SPONSOR" || roleCode === "REG_COMPLIANCE_LEAD";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWriteReview(user.role_code)) return NextResponse.json({ error: "Only the Exec Sponsor or Reg Compliance Lead may update a review action" }, { status: 403 });

  const body = await req.json();
  if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const db = getDb();
  db.prepare(`UPDATE management_review_actions SET status = ? WHERE id = ?`).run(body.status, params.id);
  const row = db.prepare(`SELECT * FROM management_review_actions WHERE id = ?`).get(params.id);
  return NextResponse.json(row);
}
