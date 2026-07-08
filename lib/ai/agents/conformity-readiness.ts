// Agent 4 — Conformity Assessment Readiness Agent (Art. 43, Annex VI/VII).
// Produces a punch list of gaps ahead of a conformity assessment. This is informational — approving
// the resulting proposal never flips conformity_assessments.outcome to 'passed'; only a human
// running the actual assessment can do that, elsewhere in the app.
import { getDb } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

function getSystem(systemId: string) {
  const db = getDb();
  const row = db.prepare(`SELECT id, name, description, business_function, classification_status, provider_role_applies, conformity_assessment_route FROM ai_systems WHERE id = ?`).get(systemId) as any;
  if (!row) throw new Error(`Unknown system id: ${systemId}`);
  return row;
}

export const conformityReadinessAgent: AgentDefinition = {
  key: "conformity_readiness",
  label: "Conformity Assessment Readiness Agent",
  description:
    "Reviews the QMS, technical documentation, risk management, and data governance status for a system and produces a gap punch list ahead of its conformity assessment — informational only, never changes the assessment outcome.",
  needsSystem: true,
  systemPrompt: `You are the Conformity Assessment Readiness Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), preparing Eurobank's Quality & Conformity team for an Art. 43 conformity assessment (Annex VI internal-control route for this portfolio).

Your job is to produce a punch list of concrete, specific gaps — not a pass/fail verdict. You have no authority to declare a system conformity-assessment-ready; that determination is made by a human running the actual assessment elsewhere in the app. Make this explicit in your final summary.

Ground rules:
- Every gap you list must be traceable to a specific queried record (an incomplete QMS policy area, an Annex IV section still in 'draft' status, an open risk_management_records item, a data_governance_records quality_gaps note) — do not invent generic gaps.
- If everything you queried looks complete, say so plainly rather than manufacturing gaps to fill the list.
- Paraphrase and cite the relevant articles (Art. 17 QMS, Art. 11 technical documentation, Art. 9 risk management, Art. 10 data governance, Art. 43 conformity assessment) in your own words.

Work through get_qms_status, get_technical_documentation_status, get_risk_management_status, and get_data_governance_status, then call propose_readiness_gap_list as your final action.`,
  tools: [
    {
      name: "get_qms_status",
      description: "Fetch the organisation-wide Art. 17 Quality Management System policy areas and their completion status (not_started / in_progress / complete).",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "get_technical_documentation_status",
      description: "Fetch the status of every Annex IV technical-documentation section for this system.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_risk_management_status",
      description: "Fetch the Art. 9 risk management records for this system, including open/closed status and review cadence.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_data_governance_status",
      description: "Fetch the Art. 10 data governance records for this system, including any recorded quality gaps.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "propose_readiness_gap_list",
      description:
        "Final action. Queues a punch list of conformity-assessment readiness gaps for human review by QUALITY_CONFORMITY_MGR. This is informational only — approving it never changes conformity_assessments.outcome, which only a human running the actual assessment can set.",
      input_schema: {
        type: "object",
        properties: {
          systemId: { type: "string" },
          gaps: { type: "array", items: { type: "string" }, description: "One entry per concrete gap, each traceable to a specific queried record. Empty array if no gaps found." },
        },
        required: ["systemId", "gaps"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) => `Assess conformity-assessment readiness for AI system ${ctx.systemId}. Query all four status tools, then call propose_readiness_gap_list.`,
  executeTool: async (name, input, ctx) => {
    const systemId = (input?.systemId as string) || ctx.systemId;
    const db = getDb();

    switch (name) {
      case "get_qms_status":
        return db.prepare(`SELECT policy_area, status, updated_at FROM qms_records ORDER BY rowid`).all();

      case "get_technical_documentation_status": {
        if (!systemId) throw new Error("systemId is required");
        return db.prepare(`SELECT annex_iv_point, title, status, version FROM technical_documentation_sections WHERE system_id = ? ORDER BY annex_iv_point`).all(systemId);
      }

      case "get_risk_management_status": {
        if (!systemId) throw new Error("systemId is required");
        return db.prepare(`SELECT lifecycle_phase, risk_description, status, review_cadence_months, next_review_at FROM risk_management_records WHERE system_id = ?`).all(systemId);
      }

      case "get_data_governance_status": {
        if (!systemId) throw new Error("systemId is required");
        return db.prepare(`SELECT dataset_name, purpose, quality_checks_run, quality_gaps, special_category_basis_necessity_rationale, updated_at FROM data_governance_records WHERE system_id = ?`).all(systemId);
      }

      case "propose_readiness_gap_list": {
        if (!systemId) throw new Error("systemId is required");
        const existingAssessment = db.prepare(`SELECT id FROM conformity_assessments WHERE system_id = ?`).get(systemId) as any;
        const gaps: string[] = Array.isArray(input.gaps) ? input.gaps : [];
        const summary = `Conformity-assessment readiness punch list for "${getSystem(systemId).name}": ${gaps.length} gap(s) identified. Informational only — approving this proposal does NOT change the conformity assessment outcome.`;
        const { proposalId } = createProposal({
          agentKey: "conformity_readiness",
          ctx,
          targetRecordType: "conformity_readiness",
          targetRecordId: existingAssessment?.id ?? null,
          proposalSummary: summary,
          payload: { systemId, gaps },
        });
        return { queued: true, proposalId, message: "Readiness gap list queued for human review (QUALITY_CONFORMITY_MGR / EXEC_SPONSOR). This is a punch list, not a pass/fail verdict." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
