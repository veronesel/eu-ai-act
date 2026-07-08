import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

const VALID_STATUSES = ["planned", "in_progress", "completed"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "internal_audit")) return NextResponse.json({ error: "Only Internal Audit may update an engagement" }, { status: 403 });

  const body = await req.json();
  if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const db = getDb();
  db.prepare(`UPDATE internal_audit_engagements SET status = ? WHERE id = ?`).run(body.status, params.id);
  const row = db.prepare(`SELECT * FROM internal_audit_engagements WHERE id = ?`).get(params.id);
  return NextResponse.json(row);
}
