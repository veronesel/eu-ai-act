import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!(user.role_code === "EXEC_SPONSOR" || user.role_code === "REG_COMPLIANCE_LEAD")) {
    return NextResponse.json({ error: "Only the Exec Sponsor or Reg Compliance Lead may update literacy records" }, { status: 403 });
  }

  const body = await req.json();
  const pct = Number(body.completion_pct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return NextResponse.json({ error: "completion_pct must be between 0 and 100" }, { status: 400 });

  const db = getDb();
  db.prepare(`UPDATE ai_literacy_records SET completion_pct = ?, updated_at = ? WHERE id = ?`).run(Math.round(pct), nowIso(), params.id);
  const row = db.prepare(`SELECT * FROM ai_literacy_records WHERE id = ?`).get(params.id);
  return NextResponse.json(row);
}
