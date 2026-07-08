// Agent 5 — Serious Incident Classification & Reporting Agent (Art. 73).
import { getDb } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";
import { createProposal } from "../propose";

// Statutory day-counts per Art. 73 severity tier — a real deterministic computation, not an LLM guess.
export const SEVERITY_TIER_DAYS: Record<string, number> = {
  death_serious_harm: 2,
  critical_infra_disruption: 2,
  fundamental_rights_widespread: 10,
  other_serious: 15,
};

export const SEVERITY_TIER_DEFINITIONS = [
  { code: "death_serious_harm", label: "Death or serious harm to a person's health", days: 2, description: "The incident directly caused, or substantially contributed to, the death of a person or serious harm to a person's health." },
  { code: "critical_infra_disruption", label: "Serious and irreversible disruption of critical infrastructure", days: 2, description: "The incident caused a serious and irreversible disruption of the management or operation of critical infrastructure." },
  { code: "fundamental_rights_widespread", label: "Infringement of fundamental-rights obligations affecting a widespread group", days: 10, description: "The incident constitutes an infringement of Union law protecting fundamental rights, affecting a group of persons on a widespread scale." },
  { code: "other_serious", label: "Other serious harm to property or the environment", days: 15, description: "Any other serious harm to property or the environment that does not fall into the tiers above." },
];

export function computeStatutoryDeadline(incidentDetectedAt: string, tier: string): string {
  const days = SEVERITY_TIER_DAYS[tier];
  if (!days) throw new Error(`Unknown severity tier: ${tier}`);
  const detected = new Date(incidentDetectedAt);
  if (Number.isNaN(detected.getTime())) throw new Error(`Invalid incidentDetectedAt: ${incidentDetectedAt}`);
  return new Date(detected.getTime() + days * 86400000).toISOString();
}

export const seriousIncidentAgent: AgentDefinition = {
  key: "serious_incident",
  label: "Serious Incident Classification & Reporting Agent",
  description: "Classifies a serious incident's Art. 73 severity tier, computes the real statutory reporting deadline, and drafts a notification report for DEPLOYER_OPS_MGR review.",
  needsSystem: false,
  extraInputKey: "incidentId",
  extraInputLabel: "Serious incident ID (serious_incidents.id)",
  systemPrompt: `You are the Serious Incident Classification & Reporting Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), handling Art. 73 serious-incident reporting to Banca d'Italia as market surveillance authority.

Ground rules:
- Classify the severity tier by applying the four tier definitions to the incident's actual description — do not default to the most severe or least severe tier without justification.
- The statutory deadline is a REAL, deterministic calculation from the incident's detection timestamp and the tier's day-count — always call compute_statutory_deadline rather than estimating it yourself.
- Your drafted report must state the incident description, the severity tier and why it applies, and the statutory deadline, in your own paraphrased words citing Art. 73 — never quote regulation text verbatim.
- Do not invent facts about the incident beyond what get_incident_details returns.

Work through get_incident_details, then classify_severity_tier, then compute_statutory_deadline, then finish with draft_incident_report.`,
  tools: [
    {
      name: "get_incident_details",
      description: "Fetch the serious incident's description, detection timestamp, current status, and the AI system it relates to.",
      input_schema: { type: "object", properties: { incidentId: { type: "string" } }, required: ["incidentId"] },
    },
    {
      name: "classify_severity_tier",
      description: "Returns the four Art. 73 severity-tier definitions (with their statutory day-counts) for you to apply to the incident description. Does not tell you which tier applies.",
      input_schema: { type: "object", properties: { description: { type: "string", description: "The incident's description, to focus the returned reference material." } }, required: ["description"] },
    },
    {
      name: "compute_statutory_deadline",
      description: "Deterministically computes the real statutory reporting deadline from the incident's detection timestamp and the chosen severity tier. This is a real calculation, not an estimate.",
      input_schema: {
        type: "object",
        properties: {
          incidentDetectedAt: { type: "string", description: "ISO 8601 timestamp the incident was detected." },
          tier: { type: "string", enum: Object.keys(SEVERITY_TIER_DAYS) },
        },
        required: ["incidentDetectedAt", "tier"],
      },
    },
    {
      name: "draft_incident_report",
      description: "Final action. Queues a classified incident report for human review by DEPLOYER_OPS_MGR. Does NOT write to serious_incidents directly.",
      input_schema: {
        type: "object",
        properties: {
          incidentId: { type: "string" },
          severityTier: { type: "string", enum: Object.keys(SEVERITY_TIER_DAYS) },
          reportText: { type: "string" },
        },
        required: ["incidentId", "severityTier", "reportText"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) => {
    const incidentId = ctx.extraInput?.incidentId;
    if (!incidentId) throw new Error("This agent requires an incidentId (serious_incidents.id).");
    return `Classify and draft the Art. 73 report for serious incident ${incidentId}. Work through the tools in order and finish with draft_incident_report.`;
  },
  executeTool: async (name, input, ctx) => {
    const db = getDb();

    switch (name) {
      case "get_incident_details": {
        const incidentId = (input?.incidentId as string) || (ctx.extraInput?.incidentId as string);
        if (!incidentId) throw new Error("incidentId is required");
        const row = db
          .prepare(
            `SELECT si.*, s.name as system_name, s.business_function FROM serious_incidents si JOIN ai_systems s ON s.id = si.system_id WHERE si.id = ?`
          )
          .get(incidentId);
        if (!row) throw new Error(`Unknown incident id: ${incidentId}`);
        return row;
      }

      case "classify_severity_tier":
        return { tiers: SEVERITY_TIER_DEFINITIONS };

      case "compute_statutory_deadline": {
        const deadline = computeStatutoryDeadline(input.incidentDetectedAt, input.tier);
        return { deadline_at: deadline, days_used: SEVERITY_TIER_DAYS[input.tier] };
      }

      case "draft_incident_report": {
        const incidentId = (input?.incidentId as string) || (ctx.extraInput?.incidentId as string);
        if (!incidentId) throw new Error("incidentId is required");
        const incident = db.prepare(`SELECT incident_detected_at FROM serious_incidents WHERE id = ?`).get(incidentId) as any;
        if (!incident) throw new Error(`Unknown incident id: ${incidentId}`);
        const deadlineAt = computeStatutoryDeadline(incident.incident_detected_at, input.severityTier);
        const summary = `Drafted Art. 73 incident report — severity tier "${input.severityTier}", statutory deadline ${deadlineAt}.`;
        const { proposalId } = createProposal({
          agentKey: "serious_incident",
          ctx,
          targetRecordType: "serious_incident",
          targetRecordId: incidentId,
          proposalSummary: summary,
          payload: { incidentId, severityTier: input.severityTier, reportText: input.reportText, deadlineAt },
        });
        return { queued: true, proposalId, message: "Incident report queued for human review (DEPLOYER_OPS_MGR / EXEC_SPONSOR)." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
