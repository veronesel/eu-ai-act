// Agent 1 — Classification & Screening Agent.
// Independently re-derives the Art. 5(1) prohibited-practice screening, the Annex III high-risk
// match (including the three-way biometrics branch), and the Art. 6(3) narrow-exception test from
// a system's own description and business function. Deliberately does NOT read the seeded
// classification_status / annex_iii_category / risk_classification_rationale fields, nor the
// existing high_risk_determinations row, so the model has to reach its own conclusion rather than
// parroting ground truth already in the DB. This is exercised against the seeded "Customer
// Trustworthiness Score" proposal system (demo_seed_key sys_social_scoring_blocked), which the
// agent must independently conclude is an Art. 5(1)(c) social-scoring prohibited practice.
import { getDb } from "@/lib/db/client";
import { PROHIBITED_LIMBS, ANNEX_III_CATEGORIES, BIOMETRICS_BRANCHES, ART6_3_LIMBS } from "@/lib/domain/classification";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

interface SystemFacts {
  id: string;
  name: string;
  description: string;
  business_function: string;
  lifecycle_stage: string;
  provider_role_applies: number;
  deployer_role_applies: number;
  gpai_integration: number;
  gpai_model_reference: string | null;
  fine_tuned_by_eurobank: number;
}

function getSystemFacts(systemId: string): SystemFacts {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, description, business_function, lifecycle_stage, provider_role_applies, deployer_role_applies, gpai_integration, gpai_model_reference, fine_tuned_by_eurobank
       FROM ai_systems WHERE id = ?`
    )
    .get(systemId) as SystemFacts | undefined;
  if (!row) throw new Error(`Unknown system id: ${systemId}`);
  return row;
}

export const classificationAgent: AgentDefinition = {
  key: "classification",
  label: "Classification & Screening Agent",
  description:
    "Independently reasons through Art. 5(1) prohibited-practice screening, the Annex III high-risk matcher (including the three-way biometrics branch), and the Art. 6(3) narrow-exception test from a system's own description — then proposes a determination for REG_COMPLIANCE_LEAD review.",
  needsSystem: true,
  systemPrompt: `You are the Classification & Screening Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis).

Your job is to independently classify one AI system by reasoning from its own description and business function — never by assuming an answer, and never by inventing facts that are not in the tool outputs you receive.

You must work through three questions, in order, and reach your OWN conclusion at each step:

1. Prohibited practices (Art. 5(1), paraphrased — the tool gives you the eight limb definitions plus the Digital Omnibus non-consensual-intimate-imagery/CSAM limb). For each limb, decide pass/fail/not_applicable by applying the limb's definition to the system's actual description. A single "fail" is a hard stop: the system is blocked and you should not proceed to the Annex III / Art. 6(3) analysis — the practice is unlawful outright.
2. Annex III high-risk matching (only if no prohibited-practice fail). Decide whether the system's function matches one of the Annex III categories, including the three-way biometrics branch test (identification and categorisation and emotion recognition are high-risk; verification — a 1:1 confirmation of a claimed identity with no reference database of other candidates — is expressly excluded from Annex III altogether, so a "biometric" system can still be out of scope). If no category matches, the system is out of scope of Annex III (a different outcome from "screened, not high-risk").
3. Art. 6(3) narrow exception (only if Annex III matched). This exception is NEVER available if the system performs profiling of natural persons, regardless of how the four limbs are answered — that guard overrides everything else. Otherwise it is available only if at least one of the four limbs is satisfied.

Cite the relevant article for every conclusion you state, paraphrased in your own words — never quote the regulation verbatim.

Call the tools in order: get_system_details, run_prohibited_practice_checklist, match_annex_iii_category, evaluate_art6_3_exception, and finish with propose_classification_determination as your final action, carrying your own reasoned conclusions. The tools give you only reference material (limb/category definitions) and the system's factual description — they never tell you the answer. Do not fabricate details about the system beyond what get_system_details returns.`,
  tools: [
    {
      name: "get_system_details",
      description: "Fetch the AI system's name, description, business function, lifecycle stage, and provider/deployer role flags. Does NOT return any existing classification conclusion — you must derive that yourself.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "run_prohibited_practice_checklist",
      description: "Returns the system's factual description plus the definitions of all Art. 5(1) prohibited-practice limbs (including the Digital Omnibus NCII/CSAM limb) for you to reason over. Does not tell you which limbs pass or fail.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "match_annex_iii_category",
      description: "Returns the system's factual description plus the full list of Annex III high-risk categories and the three-way biometrics branch options for you to match against. Does not tell you which category applies.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "evaluate_art6_3_exception",
      description: "Returns the system's factual description plus the four Art. 6(3) narrow-exception limb definitions for you to evaluate. Does not tell you the answer.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "propose_classification_determination",
      description:
        "Final action. Queues a proposed classification determination for human review by REG_COMPLIANCE_LEAD (or EXEC_SPONSOR). Does NOT write to any operational table directly.",
      input_schema: {
        type: "object",
        properties: {
          systemId: { type: "string" },
          prohibited_results: {
            type: "array",
            description: "One entry per Art. 5(1) limb you evaluated.",
            items: {
              type: "object",
              properties: {
                limb_code: { type: "string" },
                result: { type: "string", enum: ["pass", "fail", "not_applicable"] },
                rationale: { type: "string" },
              },
              required: ["limb_code", "result", "rationale"],
            },
          },
          annex_iii_category: { type: ["string", "null"], description: "One of ANNEX_III_CATEGORIES, or null if unmatched." },
          biometrics_branch: { type: "string", description: "One of: identification, categorisation, emotion_recognition, verification_excluded, not_biometric." },
          art6_3_claim: {
            type: ["object", "null"],
            description: "Null if the exception was never reached (blocked, or not Annex III-matched).",
            properties: {
              limb1: { type: "string", enum: ["yes", "no"] },
              limb2: { type: "string", enum: ["yes", "no"] },
              limb3: { type: "string", enum: ["yes", "no"] },
              limb4: { type: "string", enum: ["yes", "no"] },
              performs_profiling: { type: "boolean" },
            },
          },
          final_determination: { type: "string", enum: ["not_high_risk", "high_risk", "prohibited_blocked", "out_of_scope"] },
          rationale: { type: "string", description: "Full reasoned rationale citing articles, in your own words." },
        },
        required: ["systemId", "prohibited_results", "final_determination", "rationale"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) =>
    `Classify AI system ${ctx.systemId}. Work through the screening tools in the order described in your instructions, reach your own conclusion at each step, and finish with propose_classification_determination.`,
  executeTool: async (name, input, ctx) => {
    const systemId = (input?.systemId as string) || ctx.systemId;
    if (!systemId) throw new Error("systemId is required");

    switch (name) {
      case "get_system_details":
        return getSystemFacts(systemId);

      case "run_prohibited_practice_checklist":
        return { system: getSystemFacts(systemId), limbs: PROHIBITED_LIMBS };

      case "match_annex_iii_category":
        return { system: getSystemFacts(systemId), annex_iii_categories: ANNEX_III_CATEGORIES, biometrics_branches: BIOMETRICS_BRANCHES };

      case "evaluate_art6_3_exception":
        return { system: getSystemFacts(systemId), art6_3_limbs: ART6_3_LIMBS };

      case "propose_classification_determination": {
        const summary = `Proposed classification for "${getSystemFacts(systemId).name}": ${input.final_determination.replace(/_/g, " ")}.`;
        const { proposalId } = createProposal({
          agentKey: "classification",
          ctx,
          targetRecordType: "classification",
          targetRecordId: systemId,
          proposalSummary: summary,
          payload: {
            systemId,
            prohibited_results: input.prohibited_results ?? [],
            annex_iii_category: input.annex_iii_category ?? null,
            biometrics_branch: input.biometrics_branch ?? "not_biometric",
            art6_3_claim: input.art6_3_claim ?? null,
            final_determination: input.final_determination,
            rationale: input.rationale,
          },
        });
        return { queued: true, proposalId, message: "Classification determination queued for human review (REG_COMPLIANCE_LEAD / EXEC_SPONSOR)." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
