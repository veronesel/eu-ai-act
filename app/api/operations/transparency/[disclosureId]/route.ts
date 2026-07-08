import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { disclosureId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM transparency_disclosures WHERE id = ?`).get(params.disclosureId) as any;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.status && !["missing", "present", "stale"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const fields = ["disclosure_text", "status", "verification_log"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  updates.push("updated_at = ?");
  values.push(nowIso());
  values.push(params.disclosureId);
  db.prepare(`UPDATE transparency_disclosures SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json(db.prepare(`SELECT * FROM transparency_disclosures WHERE id = ?`).get(params.disclosureId));
}
