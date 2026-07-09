"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Play, Loader2, ChevronDown, ChevronUp, AlertTriangle, Bot, CheckCircle2, XCircle } from "lucide-react";

interface AgentMeta {
  key: string;
  label: string;
  description: string;
  needsSystem: boolean;
  extraInputKey: string | null;
  extraInputLabel: string | null;
  informationalOnly: boolean;
}
interface TraceStep {
  type: "text" | "tool_call" | "tool_result" | "error" | "done";
  text?: string;
  name?: string;
  input?: unknown;
  output?: unknown;
  message?: string;
  status?: string;
}

function canApprove(role: string, requiredRole: string): boolean {
  if (role === "EXEC_SPONSOR") return true;
  return role === requiredRole;
}

export function AgentsClient({
  agents, systems, proposals, runs, systemMap, currentUserRole, configured,
}: {
  agents: AgentMeta[]; systems: { id: string; name: string }[]; proposals: any[]; runs: any[]; systemMap: Record<string, string>; currentUserRole: string; configured: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [traces, setTraces] = useState<Record<string, TraceStep[]>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const [proposalFilter, setProposalFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  async function runAgent(agent: AgentMeta) {
    setRunning(agent.key);
    setTraces((t) => ({ ...t, [agent.key]: [] }));
    setExpanded(agent.key);

    const body: any = {};
    if (agent.needsSystem) body.systemId = selections[agent.key];
    else if (agent.extraInputKey) body.extraInput = { [agent.extraInputKey]: selections[agent.key] };
    else if (selections[agent.key]) body.systemId = selections[agent.key];

    try {
      const res = await fetch(`/api/agents/${agent.key}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setTraces((t) => ({ ...t, [agent.key]: [{ type: "error", message: err.error ?? "Request failed" }] }));
        setRunning(null);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const step: TraceStep = JSON.parse(line);
            setTraces((t) => ({ ...t, [agent.key]: [...(t[agent.key] ?? []), step] }));
          } catch {
            // ignore malformed chunk
          }
        }
      }
    } catch (err: any) {
      setTraces((t) => ({ ...t, [agent.key]: [...(t[agent.key] ?? []), { type: "error", message: err?.message ?? String(err) }] }));
    } finally {
      setRunning(null);
      router.refresh();
    }
  }

  async function decide(proposalId: string, decision: "approved" | "rejected") {
    setDeciding(proposalId);
    await fetch(`/api/agents/proposals/${proposalId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    setDeciding(null);
    router.refresh();
  }

  const filteredProposals = proposalFilter === "all" ? proposals : proposals.filter((p) => p.status === proposalFilter);

  return (
    <div className="space-y-8">
      {!configured && (
        <GlassCard className="border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)]">
              <strong>ANTHROPIC_API_KEY is not configured</strong> in this environment. Every other module works fully without it, but running an agent
              here will return a clear error rather than a fake response. Set it in <code>.env.local</code> and restart to enable this module — see
              <code> SETUP.md</code>.
            </p>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const trace = traces[agent.key] ?? [];
          const isRunning = running === agent.key;
          const isExpanded = expanded === agent.key;
          return (
            <GlassCard key={agent.key}>
              <div className="flex items-start gap-2">
                <Bot className="h-5 w-5 text-aegis-teal shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-sm">{agent.label}</h3>
                    {agent.informationalOnly && <Badge tone="neutral">informational only</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{agent.description}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {agent.needsSystem && (
                  <select
                    className="flex-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs"
                    value={selections[agent.key] ?? ""}
                    onChange={(e) => setSelections((s) => ({ ...s, [agent.key]: e.target.value }))}
                  >
                    <option value="">Select a system…</option>
                    {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                {agent.extraInputKey && (
                  <input
                    className="flex-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs"
                    placeholder={agent.extraInputLabel ?? agent.extraInputKey}
                    value={selections[agent.key] ?? ""}
                    onChange={(e) => setSelections((s) => ({ ...s, [agent.key]: e.target.value }))}
                  />
                )}
                {!agent.needsSystem && !agent.extraInputKey && (
                  <select
                    className="flex-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs"
                    value={selections[agent.key] ?? ""}
                    onChange={(e) => setSelections((s) => ({ ...s, [agent.key]: e.target.value }))}
                  >
                    <option value="">Whole portfolio (no system filter)</option>
                    {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <button
                  onClick={() => runAgent(agent)}
                  disabled={isRunning || !configured || (agent.needsSystem && !selections[agent.key]) || (!!agent.extraInputKey && !selections[agent.key])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shrink-0"
                >
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
                </button>
              </div>

              {trace.length > 0 && (
                <div className="mt-3">
                  <button onClick={() => setExpanded(isExpanded ? null : agent.key)} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--foreground)]">
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {trace.length} trace step{trace.length === 1 ? "" : "s"}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto bg-black/30 rounded-lg p-2.5 font-mono">
                      {trace.map((step, i) => (
                        <div key={i} className="text-[10px] leading-relaxed">
                          {step.type === "text" && <p className="text-[var(--text-secondary)]">{step.text}</p>}
                          {step.type === "tool_call" && <p className="text-aegis-teal">→ tool_call: {step.name}({JSON.stringify(step.input).slice(0, 160)})</p>}
                          {step.type === "tool_result" && <p className="text-aegis-emerald">← tool_result: {step.name} {JSON.stringify(step.output).slice(0, 200)}</p>}
                          {step.type === "error" && <p className="text-rose-400">✕ error: {step.message}</p>}
                          {step.type === "done" && <p className="text-[var(--text-muted)]">— run {step.status} —</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg font-semibold">Proposal queue</h3>
          <div className="flex gap-1.5">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button key={f} onClick={() => setProposalFilter(f)} className={`text-[10px] rounded-full px-2.5 py-1 border ${proposalFilter === f ? "border-aegis-emerald text-aegis-emerald" : "border-[var(--panel-border)] text-[var(--text-muted)]"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filteredProposals.length === 0 && <GlassCard><p className="text-sm text-[var(--text-muted)]">No {proposalFilter !== "all" ? proposalFilter : ""} proposals.</p></GlassCard>}
          {filteredProposals.map((p) => {
            const canDecide = p.status === "pending" && canApprove(currentUserRole, p.approver_role_required);
            let payload: any = {};
            try { payload = JSON.parse(p.proposal_payload_json); } catch {}
            return (
              <GlassCard key={p.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.proposal_summary}</span>
                      <Badge tone={toneForStatus(p.status)}>{p.status}</Badge>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {p.agent_key} · target: {p.target_record_type} · {p.system_id ? systemMap[p.system_id] ?? p.system_id : "no system"} · requires {p.approver_role_required} approval · {formatDate(p.created_at)}
                    </p>
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button disabled={!canDecide || deciding === p.id} onClick={() => decide(p.id, "approved")} title={!canDecide ? `Only ${p.approver_role_required} or EXEC_SPONSOR can decide this` : undefined} className="inline-flex items-center gap-1 text-xs rounded-md border border-emerald-500/40 text-emerald-300 px-2 py-1 hover:bg-emerald-500/10 disabled:opacity-40">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button disabled={!canDecide || deciding === p.id} onClick={() => decide(p.id, "rejected")} className="inline-flex items-center gap-1 text-xs rounded-md border border-rose-500/40 text-rose-300 px-2 py-1 hover:bg-rose-500/10 disabled:opacity-40">
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
                <details className="mt-2">
                  <summary className="text-[10px] text-aegis-emerald cursor-pointer">View payload</summary>
                  <pre className="text-[10px] text-[var(--text-secondary)] bg-black/30 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(payload, null, 2)}</pre>
                </details>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-3">Recent runs</h3>
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-1.5 pr-3">Agent</th><th className="py-1.5 px-3">System</th><th className="py-1.5 px-3">Started</th><th className="py-1.5 px-3">Status</th><th className="py-1.5 pl-3">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--panel-border)]">
                    <td className="py-1.5 pr-3">{r.agent_key}</td>
                    <td className="py-1.5 px-3">{r.system_id ? systemMap[r.system_id] ?? "—" : "—"}</td>
                    <td className="py-1.5 px-3">{formatDate(r.started_at)}</td>
                    <td className="py-1.5 px-3"><Badge tone={toneForStatus(r.status)}>{r.status}</Badge></td>
                    <td className="py-1.5 pl-3">{r.input_tokens + r.output_tokens || "—"}</td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td colSpan={5} className="py-3 text-[var(--text-muted)]">No agent runs yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
