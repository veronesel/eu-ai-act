import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "provider_suite_owned")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const body = await req.json();
  const existing = db.prepare(`SELECT * FROM post_market_monitoring_plans WHERE system_id = ?`).get(params.systemId) as any;

  if (existing) {
    const fields = ["methodology", "metrics_tracked", "review_cadence_months", "next_review_at"];
    const updates: string[] = [];
    const values: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(body[f]);
      }
    }
    if (updates.length) {
      values.push(existing.id);
      db.prepare(`UPDATE post_market_monitoring_plans SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
  } else {
    db.prepare(
      `INSERT INTO post_market_monitoring_plans (id, system_id, methodology, metrics_tracked, review_cadence_months, next_review_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(newId("pmp"), params.systemId, body.methodology ?? null, body.metrics_tracked ?? null, Number(body.review_cadence_months) || 6, body.next_review_at ?? null);
  }

  return NextResponse.json(db.prepare(`SELECT * FROM post_market_monitoring_plans WHERE system_id = ?`).get(params.systemId));
}
