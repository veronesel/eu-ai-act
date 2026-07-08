import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { LIFECYCLE_PHASES } from "@/lib/domain/provider-suite";

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.prepare(`SELECT * FROM risk_management_records ORDER BY created_at DESC`).all());
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "risk_management")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.system_id) return NextResponse.json({ error: "system_id required" }, { status: 400 });
  if (!LIFECYCLE_PHASES.includes(body.lifecycle_phase)) return NextResponse.json({ error: "Invalid lifecycle_phase" }, { status: 400 });
  if (!body.risk_description) return NextResponse.json({ error: "risk_description required" }, { status: 400 });
  if (![1, 2, 3, 4, 5].includes(Number(body.likelihood)) || ![1, 2, 3, 4, 5].includes(Number(body.severity))) {
    return NextResponse.json({ error: "likelihood and severity must be 1-5" }, { status: 400 });
  }

  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(body.system_id) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });
  if (!system.provider_role_applies || system.classification_status !== "high_risk") {
    return NextResponse.json({ error: "Risk management records only apply to Provider-role, high-risk systems" }, { status: 400 });
  }

  const id = newId("rmr");
  db.prepare(
    `INSERT INTO risk_management_records (id, system_id, lifecycle_phase, risk_description, likelihood, severity, mitigation, residual_likelihood, residual_severity, review_cadence_months, next_review_at, owner_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
  ).run(
    id,
    body.system_id,
    body.lifecycle_phase,
    body.risk_description,
    Number(body.likelihood),
    Number(body.severity),
    body.mitigation || null,
    body.residual_likelihood ? Number(body.residual_likelihood) : null,
    body.residual_severity ? Number(body.residual_severity) : null,
    body.review_cadence_months ? Number(body.review_cadence_months) : 6,
    body.next_review_at || null,
    body.owner_id || null,
    nowIso()
  );
  return NextResponse.json(db.prepare(`SELECT * FROM risk_management_records WHERE id = ?`).get(id));
}
