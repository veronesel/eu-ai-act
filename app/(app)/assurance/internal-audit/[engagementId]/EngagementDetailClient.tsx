"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { FINDING_TAG_META } from "@/lib/domain/assurance";
import { AlertTriangle, Gavel, Loader2, Plus, X, ArrowUpRight } from "lucide-react";

interface Finding {
  id: string;
  engagement_id: string;
  system_id: string | null;
  title: string;
  severity: string;
  finding_tag: string;
  linked_evidence: string | null;
  remediation_owner: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
}

const SEVERITY_TONE: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger",
};

function FindingTagBadge({ tag }: { tag: string }) {
  const meta = FINDING_TAG_META[tag];
  if (!meta) return <Badge tone="neutral">{tag}</Badge>;
  const isRisky = meta.tone === "risky";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isRisky ? "bg-violet-500/10 text-violet-300 border-violet-500/40" : "bg-rose-500/10 text-rose-300 border-rose-500/40"
      }`}
      title={meta.description}
    >
      {isRisky ? <AlertTriangle className="h-3 w-3" /> : <Gavel className="h-3 w-3" />}
      {meta.label} ({meta.article})
    </span>
  );
}

export function EngagementDetailClient({
  engagement,
  findings,
  scopeSystems,
  systems,
  users,
  canWrite,
}: {
  engagement: any;
  findings: Finding[];
  scopeSystems: { id: string; name: string }[];
  systems: { id: string; name: string }[];
  users: { id: string; name: string; title: string }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function setEngagementStatus(status: string) {
    setStatusSaving(true);
    await fetch(`/api/assurance/internal-audit/engagements/${engagement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setStatusSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Fieldwork {formatDate(engagement.fieldwork_start)} – {formatDate(engagement.fieldwork_end)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Created {formatDate(engagement.created_at)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={toneForStatus(engagement.status)}>{engagement.status.replace(/_/g, " ")}</Badge>
            {canWrite && (
              <select
                disabled={statusSaving}
                value={engagement.status}
                onChange={(e) => setEngagementStatus(e.target.value)}
                className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs"
              >
                <option value="planned">planned</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
              </select>
            )}
          </div>
        </div>
        {scopeSystems.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-[var(--text-muted)] mb-1">Systems in scope</div>
            <div className="flex flex-wrap gap-2">
              {scopeSystems.map((s) => (
                <Link key={s.id} href={`/systems/${s.id}`} className="text-xs rounded-full border border-[var(--panel-border)] px-2.5 py-1 hover:bg-white/5 inline-flex items-center gap-1">
                  {s.name} <ArrowUpRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">Findings</h3>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New finding"}
          </button>
        )}
      </div>

      {showForm && <NewFindingForm engagementId={engagement.id} systems={systems} users={users} onCreated={() => { setShowForm(false); router.refresh(); }} />}

      {findings.length === 0 && <GlassCard className="text-sm text-[var(--text-muted)]">No findings logged for this engagement.</GlassCard>}

      <div className="space-y-3">
        {findings.map((f) => (
          <FindingCard key={f.id} finding={f} systems={systems} users={users} canWrite={canWrite} onChanged={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  systems,
  users,
  canWrite,
  onChanged,
}: {
  finding: Finding;
  systems: { id: string; name: string }[];
  users: { id: string; name: string; title: string }[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const system = systems.find((s) => s.id === finding.system_id);
  const owner = users.find((u) => u.id === finding.remediation_owner);

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch(`/api/assurance/internal-audit/findings/${finding.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    onChanged();
  }

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-medium">{finding.title}</div>
          {system && (
            <Link href={`/systems/${system.id}`} className="text-xs text-aegis-emerald hover:underline inline-flex items-center gap-1 mt-1">
              {system.name} <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={SEVERITY_TONE[finding.severity] ?? "neutral"}>{finding.severity}</Badge>
          <FindingTagBadge tag={finding.finding_tag} />
        </div>
      </div>

      {finding.linked_evidence && <p className="text-xs text-[var(--text-secondary)] mt-2 bg-black/20 rounded p-2">Evidence: {finding.linked_evidence}</p>}

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-[var(--text-muted)]">
          Owner: {owner?.name ?? "unassigned"} · Due {formatDate(finding.due_at)}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={toneForStatus(finding.status)}>{finding.status}</Badge>
          {canWrite && finding.status !== "closed" && (
            <select disabled={saving} value={finding.status} onChange={(e) => updateStatus(e.target.value)} className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs">
              <option value="open">open</option>
              <option value="remediating">remediating</option>
              <option value="closed">closed</option>
            </select>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function NewFindingForm({
  engagementId,
  systems,
  users,
  onCreated,
}: {
  engagementId: string;
  systems: { id: string; name: string }[];
  users: { id: string; name: string; title: string }[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [systemId, setSystemId] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [tag, setTag] = useState("formal_non_compliance");
  const [evidence, setEvidence] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/assurance/internal-audit/engagements/${engagementId}/findings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        system_id: systemId || null,
        severity,
        finding_tag: tag,
        linked_evidence: evidence || null,
        remediation_owner: owner || null,
        due_at: due || null,
      }),
    });
    setSaving(false);
    if (res.ok) onCreated();
    else setError((await res.json()).error ?? "Failed to create finding.");
  }

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-3 text-sm">New finding</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--text-muted)]">Title</label>
          <input className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">System (optional)</label>
            <select className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={systemId} onChange={(e) => setSystemId(e.target.value)}>
              <option value="">— none —</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Severity</label>
            <select className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Finding tag</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setTag("compliant_but_risky")}
              className={`flex-1 text-xs rounded-lg border px-3 py-2 text-left ${tag === "compliant_but_risky" ? "bg-violet-500/15 border-violet-500/50 text-violet-300" : "border-[var(--panel-border)] text-[var(--text-secondary)]"}`}
            >
              <span className="font-medium">Compliant but risky (Art. 82)</span>
              <div className="text-[10px] mt-0.5 opacity-80">Passes formal checks but still presents risk in practice.</div>
            </button>
            <button
              type="button"
              onClick={() => setTag("formal_non_compliance")}
              className={`flex-1 text-xs rounded-lg border px-3 py-2 text-left ${tag === "formal_non_compliance" ? "bg-rose-500/15 border-rose-500/50 text-rose-300" : "border-[var(--panel-border)] text-[var(--text-secondary)]"}`}
            >
              <span className="font-medium">Formal non-compliance (Art. 83)</span>
              <div className="text-[10px] mt-0.5 opacity-80">A documented breach of a specific obligation.</div>
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Linked evidence (free text reference — e.g. &quot;B3 Technical Documentation&quot;)</label>
          <input className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Remediation owner</label>
            <select className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">— unassigned —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Due date</label>
            <input type="date" className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Log finding
        </button>
      </div>
    </GlassCard>
  );
}
