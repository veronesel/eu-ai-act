"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { synthesizeExplanationDraft, type DecisionFactor } from "@/lib/domain/deployer";
import { Loader2, Plus, ScaleIcon, MessageSquareWarning, Send, FileWarning, Shield } from "lucide-react";

function complaintTone(status: string): BadgeTone {
  if (status === "closed") return "success";
  if (status === "investigating") return "warning";
  return "info";
}

function explanationTone(status: string): BadgeTone {
  if (status === "sent") return "success";
  if (status === "drafted") return "warning";
  return "info";
}

export function IndividualRightsWorkspace({
  systems,
  complaints,
  explanationRequests,
  decisionById,
}: {
  systems: any[];
  complaints: any[];
  explanationRequests: any[];
  decisionById: Record<string, any>;
}) {
  return (
    <div className="space-y-8">
      <ComplaintsSection systems={systems} complaints={complaints} />
      <ExplanationRequestsSection requests={explanationRequests} decisionById={decisionById} />
      <WhistleblowerCard />
    </div>
  );
}

// ---------------- Art. 85 — Complaints ----------------

function ComplaintsSection({ systems, complaints }: { systems: any[]; complaints: any[] }) {
  const router = useRouter();
  const [systemId, setSystemId] = useState(systems[0]?.id ?? "");
  const [complainant, setComplainant] = useState("");
  const [nature, setNature] = useState("");
  const [routedTo, setRoutedTo] = useState("Banca d'Italia");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fileComplaint() {
    if (!systemId || !complainant.trim() || !nature.trim()) return;
    setSubmitting(true);
    await fetch(`/api/deployer/individual-rights/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_id: systemId, complainant, nature, routed_to: routedTo }),
    });
    setSubmitting(false);
    setComplainant("");
    setNature("");
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch(`/api/deployer/individual-rights/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-1 flex items-center gap-2"><MessageSquareWarning className="h-4 w-4 text-aegis-emerald" /> Complaints — Art. 85</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Any natural person may lodge a complaint concerning this system with the market surveillance authority.</p>

      <div className="space-y-2 mb-4">
        {complaints.map((c) => (
          <div key={c.id} className="border border-[var(--panel-border)] rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium">{c.complainant} <span className="text-xs text-[var(--text-muted)]">— {c.system_name}</span></p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{c.nature}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Filed {formatDate(c.filed_at)} · routed to {c.routed_to}{c.closed_at ? ` · closed ${formatDate(c.closed_at)}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={complaintTone(c.status)}>{c.status.replace(/_/g, " ")}</Badge>
                {c.status !== "closed" && (
                  <div className="flex gap-1">
                    {c.status === "open" && (
                      <button disabled={updatingId === c.id} onClick={() => setStatus(c.id, "investigating")} className="text-[10px] rounded-md border border-sky-500/40 text-sky-300 px-2 py-1 hover:bg-sky-500/10">Investigate</button>
                    )}
                    <button disabled={updatingId === c.id} onClick={() => setStatus(c.id, "closed")} className="text-[10px] rounded-md border border-emerald-500/40 text-emerald-300 px-2 py-1 hover:bg-emerald-500/10">Close</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {complaints.length === 0 && <p className="text-sm text-[var(--text-muted)]">No complaints on record.</p>}
      </div>

      <div className="border-t border-[var(--panel-border)] pt-4">
        <p className="text-xs text-[var(--text-muted)] mb-2">File a new complaint</p>
        <div className="grid md:grid-cols-4 gap-2">
          <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
            {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="Complainant" className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={complainant} onChange={(e) => setComplainant(e.target.value)} />
          <input placeholder="Nature of complaint" className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm md:col-span-1" value={nature} onChange={(e) => setNature(e.target.value)} />
          <input placeholder="Routed to" className="rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={routedTo} onChange={(e) => setRoutedTo(e.target.value)} />
        </div>
        <button onClick={fileComplaint} disabled={submitting || !systemId || !complainant.trim() || !nature.trim()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} File complaint
        </button>
      </div>
    </GlassCard>
  );
}

// ---------------- Art. 86 — Explanation requests ----------------

function ExplanationRequestsSection({ requests, decisionById }: { requests: any[]; decisionById: Record<string, any> }) {
  const [selectedId, setSelectedId] = useState<string | null>(requests.find((r) => r.status === "open")?.id ?? requests[0]?.id ?? null);
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-1 flex items-center gap-2"><ScaleIcon className="h-4 w-4 text-aegis-emerald" /> Explanation requests — Art. 86</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Affected persons subject to a decision produced or materially informed by a high-risk AI system may request a clear and meaningful explanation of that individual decision.</p>

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {requests.map((r) => {
            const due = daysUntil(r.due_at);
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left border rounded-lg p-3 transition-colors ${selectedId === r.id ? "border-aegis-emerald/50 bg-aegis-emerald/5" : "border-[var(--panel-border)] hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{r.system_name}</span>
                  <Badge tone={explanationTone(r.status)}>{r.status}</Badge>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{r.affected_person}</p>
                {r.status !== "sent" && (
                  <p className={`text-[10px] mt-1 font-medium ${due !== null && due <= 3 ? "text-rose-400" : due !== null && due <= 7 ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
                    {due !== null && due >= 0 ? `Due in ${due} day${due === 1 ? "" : "s"}` : due !== null ? `Overdue by ${Math.abs(due)} day${Math.abs(due) === 1 ? "" : "s"}` : "No due date"}
                  </p>
                )}
              </button>
            );
          })}
          {requests.length === 0 && <p className="text-sm text-[var(--text-muted)]">No explanation requests on record.</p>}
        </div>

        <div>
          {selected ? (
            <ExplanationDetail request={selected} decision={decisionById[selected.decision_reference]} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Select a request to view its decision detail and draft a response.</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function ExplanationDetail({ request, decision }: { request: any; decision: any }) {
  const router = useRouter();
  let factors: DecisionFactor[] = [];
  let parseError = false;
  if (decision?.decision_factors_json) {
    try {
      factors = JSON.parse(decision.decision_factors_json);
    } catch {
      parseError = true;
    }
  }

  const initialDraft = useMemo(() => {
    if (request.drafted_response) return request.drafted_response;
    if (!decision) return "";
    return synthesizeExplanationDraft({
      systemName: request.system_name,
      outcome: decision.decision_outcome,
      factors,
      affectedPerson: request.affected_person,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const [draft, setDraft] = useState(initialDraft);
  const [saving, setSaving] = useState<"draft" | "sent" | null>(null);

  async function save(status: "drafted" | "sent") {
    setSaving(status === "sent" ? "sent" : "draft");
    await fetch(`/api/deployer/individual-rights/explanation/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drafted_response: draft, status, sent_at: status === "sent" ? new Date().toISOString() : null }),
    });
    setSaving(null);
    router.refresh();
  }

  if (!decision) {
    return (
      <div className="border border-dashed border-amber-500/40 rounded-lg p-4">
        <p className="text-sm text-amber-300 flex items-center gap-2"><FileWarning className="h-4 w-4" /> Insufficient logged detail to draft a case-specific explanation — documentation gap.</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">No decision_records row was found for reference &quot;{request.decision_reference}&quot;. Escalate to Model Risk before responding to this data subject.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-[var(--panel-border)] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{decision.subject_name}</p>
          <Badge tone={["declined", "not shortlisted"].includes(decision.decision_outcome) ? "danger" : "success"}>{decision.decision_outcome}</Badge>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">Decided {formatDate(decision.decided_at)} · reference {decision.id}</p>

        {parseError ? (
          <p className="text-xs text-rose-400 mt-2">Decision factor data is malformed — cannot render a factor table.</p>
        ) : (
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--panel-border)]">
                <th className="py-1.5 pr-2">Factor</th>
                <th className="py-1.5 pr-2">Value</th>
                <th className="py-1.5 pr-2">Direction</th>
                <th className="py-1.5 pr-2">Weight</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((f, i) => (
                <tr key={i} className="border-b border-[var(--panel-border)]/50">
                  <td className="py-1.5 pr-2">{f.factor}</td>
                  <td className="py-1.5 pr-2">{f.value}</td>
                  <td className={`py-1.5 pr-2 ${f.direction === "negative" ? "text-rose-400" : f.direction === "positive" ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>{f.direction}</td>
                  <td className="py-1.5 pr-2 capitalize">{f.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <label className="text-xs text-[var(--text-muted)]">Draft response (synthesized from the factors above — edit before sending)</label>
        <textarea
          rows={10}
          className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs font-mono leading-relaxed"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={request.status === "sent"}
        />
        <div className="flex items-center gap-2 mt-2">
          {request.status !== "sent" && (
            <>
              <button onClick={() => save("drafted")} disabled={saving !== null} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
                {saving === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save draft
              </button>
              <button onClick={() => save("sent")} disabled={saving !== null} className="inline-flex items-center gap-1.5 text-xs rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
                {saving === "sent" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Mark sent
              </button>
            </>
          )}
          {request.status === "sent" && <Badge tone="success">Sent {formatDate(request.sent_at)}</Badge>}
        </div>
      </div>
    </div>
  );
}

// ---------------- Art. 87 — Whistleblower cross-link ----------------

function WhistleblowerCard() {
  return (
    <GlassCard className="border-aegis-indigo/30 bg-aegis-indigo/5">
      <h3 className="font-heading font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-aegis-indigo" /> Whistleblower protection — Art. 87</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Infringements of this Regulation may be reported through Eurobank&apos;s existing whistleblower channel under Directive (EU) 2019/1937. This is a cross-reference only — Aegis does not operate a parallel reporting system for AI Act infringement reports.
      </p>
    </GlassCard>
  );
}
