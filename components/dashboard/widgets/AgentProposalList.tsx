import Link from "next/link";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { Sparkles } from "lucide-react";

export interface ProposalRow {
  id: string;
  agent_key: string;
  proposal_summary: string;
  target_record_type: string;
  status: string;
  approver_role_required: string;
  created_at: string;
}

/** Agent-proposal queue — graceful empty state since the Agentic Layer module is built concurrently. */
export function AgentProposalList({ proposals, emptyText }: { proposals: ProposalRow[]; emptyText?: string }) {
  if (proposals.length === 0) {
    return <EmptyState icon={Sparkles} text={emptyText ?? "No agent proposals queued yet."} />;
  }
  return (
    <ul className="space-y-2">
      {proposals.map((p) => (
        <li key={p.id}>
          <Link href="/agents" className="block rounded-lg border border-[var(--panel-border)] bg-white/[0.02] hover:bg-white/[0.05] transition-colors px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium leading-snug">{p.proposal_summary}</span>
              <Badge tone={toneForStatus(p.status)}>{p.status}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
              <span>{p.agent_key}</span>
              <span>&middot;</span>
              <span>{p.target_record_type.replace(/_/g, " ")}</span>
              <span>&middot;</span>
              <span>{formatDate(p.created_at)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
