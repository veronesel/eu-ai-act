// Agent 8 — Transparency Compliance Scanning Agent (Art. 50).
import { getDb } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

const DISCLOSURE_TYPES = ["ai_interaction", "watermarking", "biometric_categorisation"] as const;

function getSystem(systemId: string) {
  const db = getDb();
  const row = db.prepare(`SELECT id, name, description, business_function, gpai_integration, classification_status FROM ai_systems WHERE id = ?`).get(systemId) as any;
  if (!row) throw new Error(`Unknown system id: ${systemId}`);
  return row;
}

export const transparencyScanningAgent: AgentDefinition = {
  key: "transparency_scanning",
  label: "Transparency Compliance Scanning Agent",
  description: "Checks whether an AI-interaction/watermarking/biometric-categorisation disclosure (Art. 50) is present and adequate for a system, and proposes fixed disclosure text where it is missing or stale — proposes to AI_PRODUCT_OWNER for review.",
  needsSystem: true,
  systemPrompt: `You are the Transparency Compliance Scanning Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), reviewing Art. 50 transparency-for-certain-systems obligations: Art. 50(1) AI-interaction disclosure, Art. 50(2) machine-readable watermarking of generative output, and Art. 50(3)/(4) biometric-categorisation / emotion-recognition disclosure.

Ground rules:
- Only propose a fix for a disclosure that is actually missing or stale according to check_disclosure_text_present / check_watermarking_status — do not propose changes to disclosures that are already present and current.
- Base the disclosure type on what the system actually does (e.g. a natural-person-facing conversational system needs Art. 50(1); a system generating content needs Art. 50(2) watermarking) — do not guess a disclosure type unsupported by the system's description.
- Paraphrase and cite the relevant Art. 50 paragraph in your own words, never verbatim regulation text.
- Keep the disclosure text itself short, plain-language, and genuinely informative to the natural person encountering it.

Work through get_system_details, check_disclosure_text_present, and check_watermarking_status, then call propose_disclosure_fix only if you found a genuine gap.`,
  tools: [
    {
      name: "get_system_details",
      description: "Fetch the system's facts (description, business function, whether it integrates a GPAI model).",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "check_disclosure_text_present",
      description: "Fetch the system's Art. 50(1)/(3)/(4) transparency_disclosures rows (ai_interaction, biometric_categorisation) — text, status, verification log.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "check_watermarking_status",
      description: "Fetch the system's Art. 50(2) watermarking transparency_disclosures row — text, status, deadline.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "propose_disclosure_fix",
      description: "Final action, only when a genuine gap was found. Queues a fixed/new disclosure for human review by AI_PRODUCT_OWNER. Does NOT write to transparency_disclosures directly.",
      input_schema: {
        type: "object",
        properties: {
          systemId: { type: "string" },
          disclosureType: { type: "string", enum: [...DISCLOSURE_TYPES] },
          fixedText: { type: "string" },
        },
        required: ["systemId", "disclosureType", "fixedText"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) => `Scan transparency-disclosure compliance for AI system ${ctx.systemId}. Check both the AI-interaction/biometric-categorisation disclosures and the watermarking status, then propose a fix only if you find a genuine gap.`,
  executeTool: async (name, input, ctx) => {
    const systemId = (input?.systemId as string) || ctx.systemId;
    if (!systemId) throw new Error("systemId is required");
    const db = getDb();

    switch (name) {
      case "get_system_details":
        return getSystem(systemId);

      case "check_disclosure_text_present":
        return db.prepare(`SELECT disclosure_type, disclosure_text, status, verification_log, deadline_at, updated_at FROM transparency_disclosures WHERE system_id = ? AND disclosure_type IN ('ai_interaction','biometric_categorisation')`).all(systemId);

      case "check_watermarking_status":
        return db.prepare(`SELECT disclosure_type, disclosure_text, status, verification_log, deadline_at, updated_at FROM transparency_disclosures WHERE system_id = ? AND disclosure_type = 'watermarking'`).all(systemId);

      case "propose_disclosure_fix": {
        const existing = db.prepare(`SELECT id FROM transparency_disclosures WHERE system_id = ? AND disclosure_type = ?`).get(systemId, input.disclosureType) as any;
        const summary = `Proposed ${existing ? "fixed" : "new"} "${input.disclosureType}" disclosure text for "${getSystem(systemId).name}".`;
        const { proposalId } = createProposal({
          agentKey: "transparency_scanning",
          ctx,
          targetRecordType: "transparency_disclosure",
          targetRecordId: existing?.id ?? null,
          proposalSummary: summary,
          payload: { systemId, disclosureType: input.disclosureType, fixedText: input.fixedText },
        });
        return { queued: true, proposalId, message: "Disclosure fix queued for human review (AI_PRODUCT_OWNER / EXEC_SPONSOR)." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
