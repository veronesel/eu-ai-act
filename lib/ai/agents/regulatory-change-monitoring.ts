// Agent 7 — Regulatory Change Monitoring Agent. Background monitor, INFORMATIONAL ONLY.
// Writes ONLY to regulatory_change_watch with added_by='agent'. Deliberately has no internet
// access and must draw exclusively from a small, honestly-labelled offline demo corpus embedded
// directly in the system prompt below — never invent a new legal development.
import { getDb, newId, nowIso } from "@/lib/db/client";
import type { AgentDefinition, AgentRunContext } from "../types";

// Mirrors the 4 seeded entries in lib/db/seed-static.ts REGULATORY_CHANGE_WATCH — kept in sync by
// hand since this is a small, deliberately-frozen demo corpus, not a live feed.
const OFFLINE_CORPUS = [
  {
    instrument: "Digital Omnibus on AI",
    title: "Political agreement reached between Council and European Parliament",
    summary: "Council adopted its position 29 Jun 2026; European Parliament endorsed 16 Jun 2026. Amends AI Act timelines, the Art. 5 prohibitions list, Annex VIII, and the special-category-data lawful basis for bias testing. Not yet published in the Official Journal.",
    status: "agreed",
    dateBasis: "Council 29 Jun 2026 / EP 16 Jun 2026",
  },
  {
    instrument: "GPAI Code of Practice",
    title: "General-Purpose AI Code of Practice published",
    summary: "Voluntary code of practice for GPAI model providers, intended to help demonstrate compliance with Art. 53 and Art. 55 pending harmonised standards.",
    status: "in_force",
    dateBasis: "Published 10 Jul 2025",
  },
  {
    instrument: "High-Risk Classification Guidelines",
    title: "Commission draft guidelines on Annex III high-risk classification",
    summary: "Draft Commission guidelines clarifying the Art. 6(3) narrow-exception test and Annex III category boundaries.",
    status: "draft",
    dateBasis: "Draft circulated 19 May 2026",
  },
  {
    instrument: "Art. 50 Transparency Guidelines",
    title: "Draft guidelines on Art. 50 transparency obligations",
    summary: "Draft Commission guidance on disclosure obligations for AI-interaction, emotion recognition, biometric categorisation and generative-content watermarking.",
    status: "draft",
    dateBasis: "Draft circulated 8 May 2026",
  },
];

const CORPUS_TEXT = OFFLINE_CORPUS.map(
  (c, i) => `${i + 1}. [${c.instrument}] ${c.title} — status: ${c.status}, date basis: ${c.dateBasis}. ${c.summary}`
).join("\n");

export const regulatoryChangeMonitoringAgent: AgentDefinition = {
  key: "regulatory_change_monitoring",
  label: "Regulatory Change Monitoring Agent",
  description: "Background monitor that checks the regulatory change watch list against a small, frozen offline demo corpus (not a live feed) and appends any missing entries. Informational only.",
  needsSystem: false,
  informationalOnly: true,
  systemPrompt: `You are the Regulatory Change Monitoring Agent for Eurobank Capital SpA's EU AI Act compliance program (Aegis).

IMPORTANT — you have NO live internet access and NO knowledge of regulatory developments beyond what is listed below. This is an offline demo corpus, not a live feed. Never claim to have checked "the latest" official sources, never invent a regulatory development that is not in this list, and say so explicitly if asked to go beyond it.

Your fixed offline corpus (the only regulatory developments you may reference):
${CORPUS_TEXT}

Your job each run: call get_regulatory_change_watch to see what is already logged, compare it against your fixed corpus above (matching by instrument name), and call append_reference_entry only for a corpus entry that is genuinely missing from the current watch list. Do not append duplicates, and do not append anything outside the corpus above. If everything in the corpus is already logged, say so and make no tool calls to append_reference_entry.`,
  tools: [
    {
      name: "get_regulatory_change_watch",
      description: "Fetch the current regulatory_change_watch table rows (instrument, title, status, added_by).",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "append_reference_entry",
      description:
        "Writes a new row directly to regulatory_change_watch with added_by='agent'. Only ever use this for an entry drawn verbatim from your fixed offline corpus that is not already present in the watch list. Never invent an entry.",
      input_schema: {
        type: "object",
        properties: {
          instrument: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          status: { type: "string", enum: ["draft", "agreed", "in_force", "superseded"] },
          dateBasis: { type: "string" },
        },
        required: ["instrument", "title", "summary", "status", "dateBasis"],
      },
    },
  ],
  buildInitialMessage: () =>
    `Check the regulatory change watch list against your fixed offline corpus and append any genuinely missing entries. This is a compliance-sync check, not a live search — you have no ability to discover anything outside your corpus.`,
  executeTool: async (name, input) => {
    const db = getDb();

    switch (name) {
      case "get_regulatory_change_watch":
        return db.prepare(`SELECT instrument, title, summary, status, date_basis, added_by, created_at FROM regulatory_change_watch ORDER BY created_at`).all();

      case "append_reference_entry": {
        const inCorpus = OFFLINE_CORPUS.some((c) => c.instrument.toLowerCase() === String(input.instrument).toLowerCase());
        if (!inCorpus) {
          throw new Error("Refused: this instrument is not in the fixed offline corpus. This agent may not invent new regulatory developments.");
        }
        const existing = db.prepare(`SELECT id FROM regulatory_change_watch WHERE instrument = ?`).get(input.instrument);
        if (existing) {
          return { skipped: true, message: "An entry for this instrument already exists — not appending a duplicate." };
        }
        const id = newId("chg");
        db.prepare(
          `INSERT INTO regulatory_change_watch (id, instrument, title, summary, status, date_basis, source_note, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'agent', ?)`
        ).run(id, input.instrument, input.title, input.summary, input.status, input.dateBasis, "Agent-appended from the fixed offline demo corpus — not a live feed.", nowIso());
        return { appended: true, id, message: "Entry written directly to regulatory_change_watch with added_by='agent'. No proposal was created — this agent never writes to agent_proposals." };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};
