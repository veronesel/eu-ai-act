import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "qms")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  const record = db.prepare(`SELECT * FROM qms_records WHERE id = ?`).get(params.id) as any;
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.status && !["not_started", "in_progress", "complete"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const fields = ["status", "owner_id", "policy_document_link"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(body[f] || null);
    }
  }
  updates.push(`updated_at = ?`);
  values.push(nowIso(), params.id);
  db.prepare(`UPDATE qms_records SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json(db.prepare(`SELECT * FROM qms_records WHERE id = ?`).get(params.id));
}
