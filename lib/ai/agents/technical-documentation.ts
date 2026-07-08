// Agent 2 — Technical Documentation Drafting Agent (Art. 11, Annex IV).
import { getDb } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

function getSystem(systemId: string) {
  const db = getDb();
  const row = db.prepare(`SELECT id, name, description, business_function, lifecycle_stage, classification_status, provider_role_applies FROM ai_systems WHERE id = ?`).get(systemId) as any;
  if (!row) throw new Error(`Unknown system id: ${systemId}`);
  return row;
}

export const technicalDocumentationAgent: AgentDefinition = {
  key: "technical_documentation",
  label: "Technical Documentation Drafting Agent",
  description:
    "Drafts or updates an Annex IV technical-documentation section from the system's actually-recorded risk management, accuracy/robustness, and conformity-assessment evidence — proposes the draft to AI_PRODUCT_OWNER for review.",
  needsSystem: true,
  systemPrompt: `You are the Technical Documentation Drafting Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), drafting Annex IV technical-documentation sections under Art. 11.

Ground rules:
- Never fabricate a metric, test result, or figure that is not present in the risk management, accuracy/robustness, or conformity-assessment records you queried. If a section's required content is not backed by underlying data, draft a clearly-marked gap note instead of inventing plausible-sounding content (e.g. "GAP: no accuracy_robustness_records of type 'robustness_test' found for this system as of this run — recommend Model Risk complete testing before this section is finalised.").
- Cite the relevant Annex IV point and Art. 11 in your own paraphrased words, never verbatim regulation text.
- Ground every substantive claim in a specific queried record; do not generalise from the system's business function alone.

Work through get_system_details, get_risk_management_records, get_accuracy_robustness_records, and get_conformity_assessment_status to gather what evidence actually exists, then call draft_annex_iv_section as your final action for the Annex IV point you were asked to draft (or the most incomplete one if not specified). Only draft one section per run.`,
  tools: [
    {
      name: "get_system_details",
      description: "Fetch the system's facts plus the current status of every Annex IV technical-documentation section already on file (point, title, status, whether it has content).",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_risk_management_records",
      description: "Fetch the system's Art. 9 risk management records (risk description, likelihood/severity, mitigation, residual risk, review cadence).",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_accuracy_robustness_records",
      description: "Fetch the system's Art. 15 accuracy metrics, robustness test results, and cybersecurity control test results.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_conformity_assessment_status",
      description: "Fetch the system's Art. 43 conformity-assessment record (route, checklist, outcome).",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "draft_annex_iv_section",
      description:
        "Final action. Queues a drafted (or gap-noted) Annex IV section for human review by AI_PRODUCT_OWNER. Does NOT write to technical_documentation_sections directly — on approval it becomes status 'agent_drafted_pending_review' pending explicit human approval, then 'approved'.",
      input_schema: {
        type: "object",
        properties: {
          systemId: { type: "string" },
          annexIvPoint: { type: "integer", minimum: 1, maximum: 9, description: "The Annex IV point number (1-9) being drafted." },
          content: { type: "string", description: "The drafted section text, or a GAP note if the underlying data is insufficient." },
        },
        required: ["systemId", "annexIvPoint", "content"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) => {
    const extraPoint = ctx.extraInput?.annexIvPoint;
    return `Draft Annex IV technical documentation for AI system ${ctx.systemId}${
      extraPoint ? `, specifically point ${extraPoint}` : ", choosing the most incomplete section to draft"
    }. Gather the underlying evidence first, then call draft_annex_iv_section.`;
  },
  executeTool: async (name, input, ctx) => {
    const systemId = (input?.systemId as string) || ctx.systemId;
    if (!systemId) throw new Error("systemId is required");
    const db = getDb();

    switch (name) {
      case "get_system_details": {
        const sections = db
          .prepare(`SELECT annex_iv_point, title, status, (LENGTH(COALESCE(content,'')) > 0) as has_content FROM technical_documentation_sections WHERE system_id = ? ORDER BY annex_iv_point`)
          .all(systemId);
        return { system: getSystem(systemId), sections };
      }

      case "get_risk_management_records":
        return db.prepare(`SELECT lifecycle_phase, risk_description, likelihood, severity, mitigation, residual_likelihood, residual_severity, review_cadence_months, status FROM risk_management_records WHERE system_id = ? ORDER BY created_at`).all(systemId);

      case "get_accuracy_robustness_records":
        return db.prepare(`SELECT record_type, metric_name, metric_value, test_date, result, notes FROM accuracy_robustness_records WHERE system_id = ?`).all(systemId);

      case "get_conformity_assessment_status":
        return db.prepare(`SELECT route, checklist_json, assessor, outcome, certificate_reference, certificate_expiry, updated_at FROM conformity_assessments WHERE system_id = ?`).get(systemId) ?? { note: "No conformity_assessments row on file for this system." };

      case "draft_annex_iv_section": {
        const point = Number(input.annexIvPoint);
        const existing = db.prepare(`SELECT id, title FROM technical_documentation_sections WHERE system_id = ? AND annex_iv_point = ?`).get(systemId, point) as any;
        const summary = `Drafted Annex IV point ${point}${existing?.title ? ` (${existing.title})` : ""} for "${getSystem(systemId).name}".`;
        const { proposalId } = createProposal({
          agentKey: "technical_documentation",
          ctx,
          targetRecordType: "technical_documentation",
          targetRecordId: existing?.id ?? null,
          proposalSummary: summary,
          payload: { systemId, annexIvPoint: point, content: input.content },
        });
        return { queued: true, proposalId, message: "Annex IV section draft queued for human review (AI_PRODUCT_OWNER / EXEC_SPONSOR)." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
