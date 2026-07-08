// Agent 3 — FRIA Drafting Agent (Art. 27 Fundamental Rights Impact Assessment).
import { getDb } from "@/lib/db/client";
import { computeOverrideRateSeries, overallOverrideRatePct } from "@/lib/domain/deployer";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

export const FRIA_SECTIONS = [
  "process_description",
  "timeframe_frequency",
  "affected_persons",
  "specific_risks",
  "human_oversight_measures",
  "mitigation_measures",
  "dpia_crossref",
] as const;

function getSystem(systemId: string) {
  const db = getDb();
  const row = db.prepare(`SELECT id, name, description, business_function, annex_iii_category, classification_status FROM ai_systems WHERE id = ?`).get(systemId) as any;
  if (!row) throw new Error(`Unknown system id: ${systemId}`);
  return row;
}

export const friaAgent: AgentDefinition = {
  key: "fria",
  label: "FRIA Drafting Agent",
  description: "Drafts sections of a Fundamental Rights Impact Assessment (Art. 27) from the deployer obligation checklist and the human-oversight operation log — proposes each drafted section to DEPLOYER_OPS_MGR for review.",
  needsSystem: true,
  systemPrompt: `You are the FRIA Drafting Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), drafting Fundamental Rights Impact Assessment (Art. 27) sections for a deployed high-risk AI system.

Ground rules:
- Ground every claim in the deployer obligation checklist and human-oversight operation log you actually queried — do not invent affected-person categories, risks, or oversight measures that are not supported by the system's description or the queried records.
- If the FRIA has not been triggered for this system, or the underlying evidence is too thin to draft a credible section, say so explicitly rather than drafting speculative content.
- Paraphrase and cite Art. 27 in your own words; never quote regulation text verbatim.
- Draft only the section you were asked for (or the most useful one to complete next if unspecified) in a single run.

Work through get_system_details and get_deployer_obligation_checklist and get_human_oversight_operation_log to gather the actual operational evidence, then call draft_fria_section as your final action.`,
  tools: [
    {
      name: "get_system_details",
      description: "Fetch the system's facts, Annex III category, and the current FRIA record (trigger status, existing section content).",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_deployer_obligation_checklist",
      description: "Fetch the Art. 26 deployer obligation checklist items for this system (which are checked, with what evidence).",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "get_human_oversight_operation_log",
      description: "Fetch the human-oversight-in-operation event log (overrides, escalations, routine checks) and the computed override rate, to ground the FRIA's specific_risks and human_oversight_measures sections.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "draft_fria_section",
      description: "Final action. Queues a drafted FRIA section for human review by DEPLOYER_OPS_MGR. Does NOT write to fria_assessments directly.",
      input_schema: {
        type: "object",
        properties: {
          systemId: { type: "string" },
          sectionName: { type: "string", enum: [...FRIA_SECTIONS] },
          content: { type: "string" },
        },
        required: ["systemId", "sectionName", "content"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) => {
    const section = ctx.extraInput?.sectionName;
    return `Draft a FRIA section for AI system ${ctx.systemId}${section ? `, specifically the "${section}" section` : ", choosing the most useful section to complete next"}. Gather the deployer checklist and oversight log first, then call draft_fria_section.`;
  },
  executeTool: async (name, input, ctx) => {
    const systemId = (input?.systemId as string) || ctx.systemId;
    if (!systemId) throw new Error("systemId is required");
    const db = getDb();

    switch (name) {
      case "get_system_details": {
        const fria = db.prepare(`SELECT triggered, trigger_reason, status, process_description, timeframe_frequency, affected_persons, specific_risks, human_oversight_measures, mitigation_measures, dpia_crossref FROM fria_assessments WHERE system_id = ?`).get(systemId);
        return { system: getSystem(systemId), fria: fria ?? { note: "No fria_assessments row on file." } };
      }

      case "get_deployer_obligation_checklist":
        return db.prepare(`SELECT item_code, item_label, is_checked, evidence_link FROM deployer_obligation_checklists WHERE system_id = ? ORDER BY rowid`).all(systemId);

      case "get_human_oversight_operation_log": {
        const events = db.prepare(`SELECT overseer_name, shift_date, event_type, reason_code, notes, occurred_at FROM human_oversight_operations WHERE system_id = ? ORDER BY occurred_at`).all(systemId) as any[];
        return {
          events,
          overrideRateSeries: computeOverrideRateSeries(events),
          overallOverrideRatePct: overallOverrideRatePct(events),
        };
      }

      case "draft_fria_section": {
        const summary = `Drafted FRIA section "${input.sectionName}" for "${getSystem(systemId).name}".`;
        const { proposalId } = createProposal({
          agentKey: "fria",
          ctx,
          targetRecordType: "fria",
          targetRecordId: systemId,
          proposalSummary: summary,
          payload: { systemId, sectionName: input.sectionName, content: input.content },
        });
        return { queued: true, proposalId, message: "FRIA section draft queued for human review (DEPLOYER_OPS_MGR / EXEC_SPONSOR)." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
