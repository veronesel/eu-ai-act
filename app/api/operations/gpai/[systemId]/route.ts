import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db/client";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { standardArt53Obligations, ART55_REFERENCE_NOTE } from "@/lib/domain/operations";

// Art. 25 provider-shift re-assessment. Owned by REG_COMPLIANCE_LEAD under the "classification" scope
// (closest existing match — this is the same value-chain-responsibility judgment call as classification).
export async function PATCH(req: NextRequest, { params }: { params: { systemId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!canWrite(user.role_code, "classification")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const integration = db.prepare(`SELECT * FROM gpai_integrations WHERE system_id = ?`).get(params.systemId) as any;
  if (!integration) return NextResponse.json({ error: "No GPAI integration on record for this system" }, { status: 404 });

  const body = await req.json();
  const flag = body.provider_shift_flag ? 1 : 0;
  const obligations = flag ? JSON.stringify([...standardArt53Obligations(), ART55_REFERENCE_NOTE]) : JSON.stringify([]);

  db.prepare(
    `UPDATE gpai_integrations SET provider_shift_flag = ?, provider_shift_rationale = ?, art53_obligations_json = ?, updated_at = ? WHERE system_id = ?`
  ).run(flag, body.provider_shift_rationale ?? integration.provider_shift_rationale, obligations, nowIso(), params.systemId);

  return NextResponse.json(db.prepare(`SELECT * FROM gpai_integrations WHERE system_id = ?`).get(params.systemId));
}
