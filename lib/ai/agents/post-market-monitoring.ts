// Agent 6 — Post-Market Monitoring Agent (Art. 72). Background monitor, INFORMATIONAL ONLY.
// Never writes to agent_proposals or any operational table — the one agent whose final tool is a
// direct write, but only to the informational monitoring_flags table.
import { getDb, newId, nowIso } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";

export const postMarketMonitoringAgent: AgentDefinition = {
  key: "post_market_monitoring",
  label: "Post-Market Monitoring Agent",
  description: "Background monitor over post-market events and accuracy trends (Art. 72). Informational only — flags anomalies directly to the monitoring_flags log for a human to triage; never proposes changes to any operational record.",
  needsSystem: false,
  informationalOnly: true,
  systemPrompt: `You are the Post-Market Monitoring Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis), supporting the Art. 72 post-market monitoring obligation.

You are a background, informational-only agent. You do not draft documentation, do not propose classification changes, and cannot approve anything. Your only output is a monitoring flag — a short, specific note for a human (AI_PRODUCT_OWNER / Model Risk) to triage.

Ground rules:
- Only flag an anomaly when the queried events or accuracy trend actually support it — do not flag speculatively or manufacture concern where the data is unremarkable.
- Ground the flag text in specific queried data (an event description, a metric value, a trend direction) rather than generic language.
- If nothing anomalous is found, say so and do not call flag_anomaly at all — an empty result is a valid, honest outcome.
- Paraphrase and cite Art. 72 in your own words where relevant.

If a system was specified, scope your review to it. If not, review recent post-market events across the portfolio and use get_accuracy_trend on any system whose events look concerning.`,
  tools: [
    {
      name: "get_post_market_events",
      description: "Fetch recent post-market monitoring events (performance drift, user complaints, near-misses). Pass a systemId to scope to one system, or omit to see recent events across the whole portfolio.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } } },
    },
    {
      name: "get_accuracy_trend",
      description: "Fetch the accuracy/robustness metric history for one system, to check for degradation trends.",
      input_schema: { type: "object", properties: { systemId: { type: "string" } }, required: ["systemId"] },
    },
    {
      name: "flag_anomaly",
      description: "Writes a monitoring flag directly to the monitoring_flags log for human triage. This is a direct write to an informational table only — it never creates an agent_proposals row and never changes any operational record.",
      input_schema: {
        type: "object",
        properties: {
          systemId: { type: "string" },
          flagText: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["systemId", "flagText", "severity"],
      },
    },
  ],
  buildInitialMessage: (ctx: AgentRunContext) =>
    ctx.systemId
      ? `Review post-market monitoring data for AI system ${ctx.systemId}. Flag any genuine anomaly you find; if nothing is anomalous, say so and do not call flag_anomaly.`
      : `Review recent post-market monitoring events across the portfolio. Follow up with get_accuracy_trend on any system that looks concerning, and flag any genuine anomaly you find. If nothing is anomalous, say so and do not call flag_anomaly.`,
  executeTool: async (name, input, ctx) => {
    const db = getDb();
    const systemId = (input?.systemId as string) || ctx.systemId || undefined;

    switch (name) {
      case "get_post_market_events": {
        if (systemId) {
          return db.prepare(`SELECT event_type, description, severity, occurred_at FROM post_market_monitoring_events WHERE system_id = ? ORDER BY occurred_at DESC`).all(systemId);
        }
        return db
          .prepare(
            `SELECT pme.event_type, pme.description, pme.severity, pme.occurred_at, pme.system_id, s.name as system_name
             FROM post_market_monitoring_events pme JOIN ai_systems s ON s.id = pme.system_id
             ORDER BY pme.occurred_at DESC LIMIT 30`
          )
          .all();
      }

      case "get_accuracy_trend": {
        const sid = (input?.systemId as string) || systemId;
        if (!sid) throw new Error("systemId is required");
        return db.prepare(`SELECT record_type, metric_name, metric_value, test_date, result, notes FROM accuracy_robustness_records WHERE system_id = ? ORDER BY test_date`).all(sid);
      }

      case "flag_anomaly": {
        const sid = (input?.systemId as string) || systemId;
        if (!sid) throw new Error("systemId is required");
        if (!input.flagText) throw new Error("flagText is required");
        if (!["low", "medium", "high"].includes(input.severity)) throw new Error("severity must be low, medium, or high");
        const id = newId("flg");
        db.prepare(`INSERT INTO monitoring_flags (id, system_id, flag_text, severity, source_agent_run_id, created_at, acted_on) VALUES (?, ?, ?, ?, ?, ?, 0)`)
          .run(id, sid, input.flagText, input.severity, ctx.agentRunId, nowIso());
        return { flagged: true, flagId: id, message: "Monitoring flag written directly to monitoring_flags for human triage. No proposal was created — this agent never writes to agent_proposals." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
