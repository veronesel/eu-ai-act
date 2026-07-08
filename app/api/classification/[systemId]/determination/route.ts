import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { evaluateArt6_3 } from "@/lib/domain/classification";

export async function GET(_req: NextRequest, { params }: { params: { systemId: string } }) {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM high_risk_determinations WHERE system_id = ? ORDER BY rowid DESC LIMIT 1`).get(params.systemId);
  return NextResponse.json(row ?? null);
}

// body: { annex_iii_category, biometrics_branch, limb1..limb4, performs_profiling, claim_exception }
export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const db = getDb();
  const system = db.prepare(`SELECT * FROM ai_systems WHERE id = ?`).get(params.systemId) as any;
  if (!system) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (system.classification_status === "prohibited_blocked") {
    return NextResponse.json({ error: "System is blocked at the prohibited-practice screening stage and cannot proceed to Annex III matching." }, { status: 409 });
  }

  const body = await req.json();
  const biometricsBranch: string = body.biometrics_branch ?? "not_biometric";
  const isVerificationOnly = biometricsBranch === "verification_excluded" && !body.annex_iii_category;
  const hasAnnexMatch = !!body.annex_iii_category || ["identification", "categorisation", "emotion_recognition"].includes(biometricsBranch);

  let finalDetermination: string;
  let rationale: string;

  if (!hasAnnexMatch) {
    finalDetermination = "out_of_scope";
    rationale = isVerificationOnly
      ? "Not matched to Annex III at all. Annex III point 1(a) expressly excludes biometric verification whose sole purpose is confirming a claimed identity (1:1 match) — this system was never matched to begin with, not merely found 'not high-risk'."
      : "No Annex III category matched. System falls outside Annex III entirely.";
  } else if (body.claim_exception) {
    const evalResult = evaluateArt6_3(
      { limb1: body.limb1 ?? "no", limb2: body.limb2 ?? "no", limb3: body.limb3 ?? "no", limb4: body.limb4 ?? "no" },
      !!body.performs_profiling
    );
    finalDetermination = evalResult.qualifies ? "not_high_risk" : "high_risk";
    rationale = `Annex III match: ${body.annex_iii_category}. Art. 6(3) exception claimed. ${evalResult.rationale}`;
  } else {
    finalDetermination = "high_risk";
    rationale = body.determination_rationale || `Matches Annex III category ${body.annex_iii_category}; Art. 6(3) exception not claimed.`;
  }

  const existing = db.prepare(`SELECT id FROM high_risk_determinations WHERE system_id = ?`).get(params.systemId) as any;
  const payload = [
    body.annex_iii_category ?? null, biometricsBranch,
    body.claim_exception ? (body.limb1 ?? null) : null, body.claim_exception ? "Narrow procedural task limb." : null,
    body.claim_exception ? (body.limb2 ?? null) : null, body.claim_exception ? "Improves prior human activity limb." : null,
    body.claim_exception ? (body.limb3 ?? null) : null, body.claim_exception ? "Detects deviation without replacing assessment limb." : null,
    body.claim_exception ? (body.limb4 ?? null) : null, body.claim_exception ? "Preparatory task limb." : null,
    body.performs_profiling ? 1 : 0, finalDetermination, rationale, user.id, nowIso(),
  ];
  if (existing) {
    db.prepare(`UPDATE high_risk_determinations SET annex_iii_category=?, biometrics_branch=?, art6_3_limb1=?, art6_3_limb1_rationale=?, art6_3_limb2=?, art6_3_limb2_rationale=?, art6_3_limb3=?, art6_3_limb3_rationale=?, art6_3_limb4=?, art6_3_limb4_rationale=?, performs_profiling=?, final_determination=?, determination_rationale=?, confirmed_by=?, confirmed_at=? WHERE id = ?`)
      .run(...payload, existing.id);
  } else {
    db.prepare(`INSERT INTO high_risk_determinations (id, system_id, annex_iii_category, biometrics_branch, art6_3_limb1, art6_3_limb1_rationale, art6_3_limb2, art6_3_limb2_rationale, art6_3_limb3, art6_3_limb3_rationale, art6_3_limb4, art6_3_limb4_rationale, performs_profiling, final_determination, determination_rationale, confirmed_by, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(newId("det"), params.systemId, ...payload);
  }

  db.prepare(`UPDATE ai_systems SET classification_status = ?, annex_iii_category = ?, risk_classification_rationale = ? WHERE id = ?`)
    .run(finalDetermination === "out_of_scope" ? "not_high_risk" : finalDetermination, body.annex_iii_category ?? null, rationale, params.systemId);

  const updated = db.prepare(`SELECT * FROM high_risk_determinations WHERE system_id = ?`).get(params.systemId);
  return NextResponse.json(updated);
}
