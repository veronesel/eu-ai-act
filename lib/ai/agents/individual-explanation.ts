// Agent 9 — Individual Explanation Drafting Agent (Art. 86).
// This output is the most likely to be read by someone outside the company. It MUST name the
// actual factors from decision_factors_json, and must say so explicitly as a documentation gap
// if the decision record lacks enough logged detail, rather than inventing plausible factors.
import { getDb } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

export const individualExplanationAgent: AgentDefinition = {
  key: "individual_explanation",
  label: "Individual Explanation Drafting Agent",
  description: "Drafts a plain-language, case-specific explanation of an AI-assisted decision (Art. 86) directly from the decision record's logged factors, for DEPLOYER_OPS_MGR review before it reaches the affected person.",
  needsSystem: false,
  extraInputKey: "explanationRequestId",
  extraInputLabel: "Explanation request ID (explanation_requests.id)",
  systemPrompt: `You are the Individual Explanation Drafting Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), drafting Art. 86 explanations of AI-assisted decisions for affected individuals.

This is the single most externally-visible output in this entire agentic layer — it may be read by the affected person themselves, or by their legal counsel. Get it right:

- You MUST name the actual logged factors from the decision record (e.g. "a debt-to-income ratio of 48%"), not a generic description of the system. Quote the factor names and values as logged.
- If the decision record's decision_factors_json is empty or too thin to support a genuine case-specific explanation, you MUST say so explicitly as a documentation gap in your draft (e.g. "This decision lacks sufficiently detailed logged factors to provide a case-specific explanation; escalate to Model Risk before responding.") — never invent plausible-sounding factors to fill the gap.
- Explain in plain language, addressed to the affected person, that a human reviewed the decision (if the record supports that) and that they have a right under Art. 86 to a meaningful explanation and to request human review.
- Paraphrase and cite Art. 86 in your own words, never verbatim regulation text.

Work through get_decision_record and get_risk_factors_for_decision to gather everything actually on file, then call draft_individual_explanation as your final action.`,
  tools: [
    {
      name: "get_decision_record",
      description: "Fetch the explanation request together with its linked decision record — subject, outcome, and the logged decision factors (decision_factors_json, parsed).",
      input_schema: { type: "object", properties: { explanationRequestId: { type: "string" } }, required: ["explanationRequestId"] },
    },
    {
      name: "get_risk_factors_for_decision",
      description: "Fetch the AI system's risk management records and any approved technical-documentation content, for extra context on known limitations to reflect honestly if relevant.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "draft_individual_explanation",
      description: "Final action. Queues a drafted explanation for human review by DEPLOYER_OPS_MGR before it is sent to the affected person. Does NOT write to explanation_requests directly.",
      input_schema: {
        type: "object",
        properties: {
          explanationRequestId: { type: "string" },
          explanationText: { type: "string" },
        },
        required: ["explanationRequestId", "explanationText"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) => {
    const explanationRequestId = ctx.extraInput?.explanationRequestId;
    if (!explanationRequestId) throw new Error("This agent requires an explanationRequestId (explanation_requests.id).");
    return `Draft the Art. 86 explanation for explanation request ${explanationRequestId}. Gather the decision record and risk-factor context first, then call draft_individual_explanation.`;
  },
  executeTool: async (name, input, ctx) => {
    const db = getDb();

    switch (name) {
      case "get_decision_record": {
        const explanationRequestId = (input?.explanationRequestId as string) || (ctx.extraInput?.explanationRequestId as string);
        if (!explanationRequestId) throw new Error("explanationRequestId is required");
        const request = db.prepare(`SELECT * FROM explanation_requests WHERE id = ?`).get(explanationRequestId) as any;
        if (!request) throw new Error(`Unknown explanation request id: ${explanationRequestId}`);
        const decision = db.prepare(`SELECT * FROM decision_records WHERE id = ?`).get(request.decision_reference) as any;
        const system = db.prepare(`SELECT id, name, business_function FROM ai_systems WHERE id = ?`).get(request.system_id) as any;
        let factors: unknown[] = [];
        if (decision?.decision_factors_json) {
          try {
            factors = JSON.parse(decision.decision_factors_json);
          } catch {
            factors = [];
          }
        }
        return {
          system,
          request: { id: request.id, affected_person: request.affected_person, requested_at: request.requested_at, due_at: request.due_at, status: request.status },
          decision: decision ? { subject_name: decision.subject_name, decision_outcome: decision.decision_outcome, decided_at: decision.decided_at, factors } : null,
        };
      }

      case "get_risk_factors_for_decision": {
        const systemId = input?.systemId as string;
        if (!systemId) throw new Error("systemId is required");
        const risks = db.prepare(`SELECT risk_description, mitigation, status FROM risk_management_records WHERE system_id = ?`).all(systemId);
        const approvedDocs = db.prepare(`SELECT annex_iv_point, title, content FROM technical_documentation_sections WHERE system_id = ? AND status = 'approved'`).all(systemId);
        return { risks, approvedTechnicalDocumentation: approvedDocs };
      }

      case "draft_individual_explanation": {
        const explanationRequestId = (input?.explanationRequestId as string) || (ctx.extraInput?.explanationRequestId as string);
        if (!explanationRequestId) throw new Error("explanationRequestId is required");
        const request = db.prepare(`SELECT affected_person FROM explanation_requests WHERE id = ?`).get(explanationRequestId) as any;
        const summary = `Drafted Art. 86 explanation for ${request?.affected_person ?? "affected person"} (request ${explanationRequestId}).`;
        const { proposalId } = createProposal({
          agentKey: "individual_explanation",
          ctx,
          targetRecordType: "individual_explanation",
          targetRecordId: explanationRequestId,
          proposalSummary: summary,
          payload: { explanationRequestId, explanationText: input.explanationText },
        });
        return { queued: true, proposalId, message: "Explanation draft queued for human review (DEPLOYER_OPS_MGR / EXEC_SPONSOR) before it is sent to the affected person." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
