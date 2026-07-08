import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";

export async function GET() {
  const db = getDb();
  return NextResponse.json(db.prepare(`SELECT * FROM data_governance_records ORDER BY updated_at DESC`).all());
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "data_governance")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.system_id || !body.dataset_name) return NextResponse.json({ error: "system_id and dataset_name required" }, { status: 400 });
  if (!["training", "validation", "test"].includes(body.purpose)) return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  if ((body.bias_characteristics_examined ?? "").trim() && !(body.special_category_basis_necessity_rationale ?? "").trim()) {
    return NextResponse.json({ error: "A necessity-test rationale is required whenever bias characteristics examined relies on special-category proxy data" }, { status: 400 });
  }

  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(body.system_id) as any;
  if (!system) return NextResponse.json({ error: "Unknown system" }, { status: 404 });
  if (!system.provider_role_applies || system.classification_status !== "high_risk") {
    return NextResponse.json({ error: "Data governance records only apply to Provider-role, high-risk systems" }, { status: 400 });
  }

  const id = newId("dgr");
  db.prepare(
    `INSERT INTO data_governance_records (id, system_id, dataset_name, purpose, provenance, collection_methodology, bias_characteristics_examined, quality_checks_run, quality_gaps, special_category_basis_necessity_rationale, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    body.system_id,
    body.dataset_name,
    body.purpose,
    body.provenance || null,
    body.collection_methodology || null,
    body.bias_characteristics_examined || null,
    body.quality_checks_run || null,
    body.quality_gaps || null,
    body.special_category_basis_necessity_rationale || null,
    nowIso()
  );
  return NextResponse.json(db.prepare(`SELECT * FROM data_governance_records WHERE id = ?`).get(id));
}
