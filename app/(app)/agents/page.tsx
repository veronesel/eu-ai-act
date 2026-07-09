import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { SectionHeading } from "@/components/ui/Glass";
import { AGENT_LIST } from "@/lib/ai/agents/registry";
import { isAnthropicConfigured } from "@/lib/ai/client";
import { AgentsClient } from "./AgentsClient";

export default function AgentsPage() {
  const db = getDb();
  const user = getCurrentUser()!;
  const systems = db.prepare(`SELECT id, name FROM ai_systems ORDER BY name`).all() as any[];
  const proposals = db.prepare(`SELECT * FROM agent_proposals ORDER BY created_at DESC`).all() as any[];
  const runs = db.prepare(`SELECT id, agent_key, system_id, started_at, finished_at, status, input_tokens, output_tokens, error_text FROM agent_runs ORDER BY started_at DESC LIMIT 30`).all() as any[];
  const systemMap = Object.fromEntries(systems.map((s) => [s.id, s.name]));

  const agentMeta = AGENT_LIST.map((a) => ({
    key: a.key,
    label: a.label,
    description: a.description,
    needsSystem: a.needsSystem,
    extraInputKey: a.extraInputKey ?? null,
    extraInputLabel: a.extraInputLabel ?? null,
    informationalOnly: !!a.informationalOnly,
  }));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Agentic Layer — Runs &amp; Proposals"
        subtitle="Every agent makes real Anthropic tool-use calls. Write-capable agents never touch an operational table directly — they queue a PENDING_CONFIRMATION proposal that a human with the right role must approve."
      />
      <AgentsClient
        agents={agentMeta}
        systems={systems}
        proposals={proposals}
        runs={runs}
        systemMap={systemMap}
        currentUserRole={user.role_code}
        configured={isAnthropicConfigured()}
      />
    </div>
  );
}
