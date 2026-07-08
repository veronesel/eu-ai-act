import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "deployer_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json(); // { status }
  if (!["open", "investigating", "closed"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM complaints WHERE id = ?`).get(params.id) as any;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.prepare(`UPDATE complaints SET status = ?, closed_at = ? WHERE id = ?`)
    .run(body.status, body.status === "closed" ? nowIso() : existing.closed_at, params.id);

  const updated = db.prepare(`SELECT * FROM complaints WHERE id = ?`).get(params.id);
  return NextResponse.json(updated);
}
