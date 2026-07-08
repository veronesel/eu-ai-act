import { NextRequest, NextResponse } from "next/server";
import { getDb, newId } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ACCURACY_RESULT_OPTIONS } from "@/lib/domain/provider-suite";

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.prepare(`SELECT * FROM accuracy_robustness_records ORDER BY test_date DESC`).all());
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "accuracy_robustness")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.system_id || !body.metric_name) return NextResponse.json({ error: "system_id and metric_name required" }, { status: 400 });
  if (!["accuracy_metric", "robustness_test", "cyber_control"].includes(body.record_type)) return NextResponse.json({ error: "Invalid record_type" }, { status: 400 });
  // Result must always be explicitly recorded — never defaulted to "passed".
  if (!body.result || !ACCURACY_RESULT_OPTIONS.includes(body.result)) {
    return NextResponse.json({ error: "A result (tested/not_tested/passed/failed) must be explicitly recorded" }, { status: 400 });
  }

  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(body.system_id) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });
  if (!system.provider_role_applies || system.classification_status !== "high_risk") {
    return NextResponse.json({ error: "Accuracy/robustness/cyber records only apply to Provider-role, high-risk systems" }, { status: 400 });
  }

  const id = newId("arr");
  db.prepare(
    `INSERT INTO accuracy_robustness_records (id, system_id, record_type, metric_name, metric_value, test_date, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, body.system_id, body.record_type, body.metric_name, body.metric_value || null, body.test_date || null, body.result, body.notes || null);
  return NextResponse.json(db.prepare(`SELECT * FROM accuracy_robustness_records WHERE id = ?`).get(id));
}
