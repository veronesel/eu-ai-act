import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { isArt50InScope } from "@/lib/domain/operations";

// GET is open to all (read-only rule evaluation); POST triggers the same check and is what the UI button calls.
async function runScan() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems`).all() as any[];
  const disclosures = db.prepare(`SELECT DISTINCT system_id FROM transparency_disclosures`).all() as any[];
  const systemsWithDisclosure = new Set(disclosures.map((d) => d.system_id));

  const inScope = systems.filter((s) => isArt50InScope(s));
  const gaps = inScope
    .filter((s) => !systemsWithDisclosure.has(s.id))
    .map((s) => ({
      system_id: s.id,
      system_name: s.name,
      reason: s.gpai_integration
        ? "GPAI-integrated system with no transparency_disclosures record."
        : s.annex_iii_category && /^1\(/.test(s.annex_iii_category)
        ? "Biometric-related Annex III category with no transparency_disclosures record."
        : "Conversational/assistant surface with no transparency_disclosures record.",
    }));

  return NextResponse.json({ inScopeCount: inScope.length, gaps });
}

export async function POST() {
  return runScan();
}

export async function GET() {
  return runScan();
}
