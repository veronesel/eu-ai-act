// Shared helper for the write-capable "propose_..." / "draft_..." tool that ends every
// proposal-producing agent. Never writes to an operational table — only queues a row in
// agent_proposals for human review. The human-in-the-loop commit happens in
// app/api/agents/proposals/[proposalId]/route.ts on approval.
import { getDb, newId, nowIso } from "@/lib/db/client";
import { approverRoleRequired } from "./approval-matrix";
import type { AgentRunContext } from "./types";

export function createProposal(opts: {
  agentKey: string;
  ctx: AgentRunContext;
  targetRecordType: string;
  targetRecordId: string | null;
  proposalSummary: string;
  payload: Record<string, unknown>;
}): { proposalId: string } {
  const db = getDb();
  const id = newId("prop");
  db.prepare(
    `INSERT INTO agent_proposals (id, agent_run_id, agent_key, system_id, target_record_type, target_record_id, proposal_summary, proposal_payload_json, status, approver_role_required, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(
    id,
    opts.ctx.agentRunId,
    opts.agentKey,
    opts.ctx.systemId ?? null,
    opts.targetRecordType,
    opts.targetRecordId,
    opts.proposalSummary,
    JSON.stringify(opts.payload),
    approverRoleRequired(opts.targetRecordType),
    nowIso()
  );
  return { proposalId: id };
}
