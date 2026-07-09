import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "governance")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { response_notes }
  const db = getDb();
  db.prepare(`UPDATE authority_information_requests SET response_notes = ?, responded_at = ?, status = 'responded' WHERE id = ?`)
    .run(body.response_notes ?? null, nowIso(), params.id);

  const row = db.prepare(`SELECT * FROM authority_information_requests WHERE id = ?`).get(params.id);
  return NextResponse.json(row);
}
