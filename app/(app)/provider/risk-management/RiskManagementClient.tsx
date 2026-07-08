"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { RISK_SCALE_ANCHORS, LIFECYCLE_PHASES, riskLevel } from "@/lib/domain/provider-suite";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, Plus, ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";

function anchorLabel(kind: "likelihood" | "severity", v: number) {
  return `${v} — ${RISK_SCALE_ANCHORS[v][kind]}`;
}

export function RiskManagementClient({ applicable, notApplicable, records, users }: { applicable: any[]; notApplicable: any[]; records: any[]; users: any[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);
  const [heatMode, setHeatMode] = useState<"inherent" | "residual">("inherent");
  const recordsBySystem = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of records) (map[r.system_id] ??= []).push(r);
    return map;
  }, [records]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <RiskHeatmap records={records} mode={heatMode} onModeChange={setHeatMode} />

      <div className="space-y-3">
        {applicable.map((s) => (
          <SystemRiskCard
            key={s.id}
            system={s}
            records={recordsBySystem[s.id] ?? []}
            users={users}
            userMap={userMap}
            expanded={expanded === s.id}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2">Provider-role systems — not high-risk</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notApplicable.map((s) => (
              <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskHeatmap({ records, mode, onModeChange }: { records: any[]; mode: "inherent" | "residual"; onModeChange: (m: "inherent" | "residual") => void }) {
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const r of records) {
    const l = mode === "inherent" ? r.likelihood : r.residual_likelihood;
    const s = mode === "inherent" ? r.severity : r.residual_severity;
    if (!l || !s) continue;
    grid[l - 1][s - 1] += 1;
  }
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold">Portfolio risk heatmap</h3>
          <p className="text-xs text-[var(--text-secondary)]">Likelihood × severity roll-up across every open risk record for Provider-role high-risk systems.</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {(["inherent", "residual"] as const).map((m) => (
            <button key={m} onClick={() => onModeChange(m)} className={`px-2.5 py-1 rounded-md text-xs border ${mode === m ? "bg-aegis-emerald/20 border-aegis-emerald/50 text-aegis-emerald" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-[10px] text-[var(--text-muted)] py-1 pr-1 shrink-0">
          <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1.5">
            {[5, 4, 3, 2, 1].map((l) =>
              [1, 2, 3, 4, 5].map((s) => {
                const count = grid[l - 1][s - 1];
                const { tone } = riskLevel(l, s);
                const bg = tone === "danger" ? "bg-rose-500/25 border-rose-500/50" : tone === "warning" ? "bg-amber-500/20 border-amber-500/50" : "bg-emerald-500/15 border-emerald-500/40";
                const Icon = tone === "danger" ? AlertOctagon : tone === "warning" ? AlertTriangle : ShieldCheck;
                const iconColor = tone === "danger" ? "text-rose-400" : tone === "warning" ? "text-amber-400" : "text-emerald-400";
                return (
                  <div key={`${l}-${s}`} title={`Likelihood ${anchorLabel("likelihood", l)} × Severity ${anchorLabel("severity", s)}`} className={`aspect-square rounded-md border ${bg} flex flex-col items-center justify-center gap-0.5`}>
                    <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                    <span className="text-xs font-semibold">{count || ""}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1 px-1">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5 (severity →)</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function SystemRiskCard({ system, records, users, userMap, expanded, onToggle, onChanged }: any) {
  const [adding, setAdding] = useState(false);
  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <div>
            <h3 className="font-heading font-semibold text-sm">{system.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{system.business_function}</p>
          </div>
        </div>
        <Badge tone={records.length ? "info" : "warning"}>{records.length} risk record{records.length === 1 ? "" : "s"}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {records.map((r: any) => (
            <div key={r.id} className="border border-[var(--panel-border)] rounded-lg p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{r.lifecycle_phase.replace(/_/g, " ")}</span>
                  <p className="font-medium mt-0.5">{r.risk_description}</p>
                </div>
                <Badge tone={toneForStatus(r.status)}>{r.status}</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-[var(--text-secondary)]">
                <div>Likelihood: <strong>{anchorLabel("likelihood", r.likelihood)}</strong></div>
                <div>Severity: <strong>{anchorLabel("severity", r.severity)}</strong></div>
                {r.residual_likelihood && <div>Residual likelihood: <strong>{anchorLabel("likelihood", r.residual_likelihood)}</strong></div>}
                {r.residual_severity && <div>Residual severity: <strong>{anchorLabel("severity", r.residual_severity)}</strong></div>}
              </div>
              {r.mitigation && <p className="text-xs text-[var(--text-secondary)] mt-2 bg-black/20 rounded p-2">Mitigation: {r.mitigation}</p>}
              <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)]">
                <span>Owner: {userMap[r.owner_id] ?? "—"} · Review every {r.review_cadence_months}mo · Next review {formatDate(r.next_review_at)}</span>
                <StatusButtons record={r} onChanged={onChanged} />
              </div>
            </div>
          ))}
          {records.length === 0 && <p className="text-sm text-[var(--text-muted)]">No risk records yet for this system.</p>}

          {!adding ? (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">
              <Plus className="h-3.5 w-3.5" /> Add risk record
            </button>
          ) : (
            <AddRiskForm systemId={system.id} users={users} onDone={() => { setAdding(false); onChanged(); }} onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </GlassCard>
  );
}

function StatusButtons({ record, onChanged }: { record: any; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  async function setStatus(status: string) {
    setSaving(true);
    await fetch(`/api/provider/risk-management/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSaving(false);
    onChanged();
  }
  if (record.status === "closed") return null;
  return (
    <div className="flex gap-1">
      {record.status !== "mitigated" && <button disabled={saving} onClick={() => setStatus("mitigated")} className="hover:underline">mark mitigated</button>}
      <button disabled={saving} onClick={() => setStatus("closed")} className="hover:underline">close</button>
    </div>
  );
}

function AddRiskForm({ systemId, users, onDone, onCancel }: { systemId: string; users: any[]; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    lifecycle_phase: LIFECYCLE_PHASES[0],
    risk_description: "",
    likelihood: 3,
    severity: 3,
    mitigation: "",
    residual_likelihood: "",
    residual_severity: "",
    review_cadence_months: 6,
    next_review_at: "",
    owner_id: users[0]?.id ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/provider/risk-management", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_id: systemId,
        ...form,
        residual_likelihood: form.residual_likelihood || null,
        residual_severity: form.residual_severity || null,
        next_review_at: form.next_review_at ? new Date(form.next_review_at).toISOString() : null,
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="border border-aegis-emerald/30 rounded-lg p-3 space-y-2 bg-black/20">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Lifecycle phase</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.lifecycle_phase} onChange={(e) => setForm({ ...form, lifecycle_phase: e.target.value })}>
            {LIFECYCLE_PHASES.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Owner</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Risk description</label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={form.risk_description} onChange={(e) => setForm({ ...form, risk_description: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Likelihood</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{anchorLabel("likelihood", v)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Severity</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.severity} onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{anchorLabel("severity", v)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Mitigation</label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Residual likelihood (optional)</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.residual_likelihood} onChange={(e) => setForm({ ...form, residual_likelihood: e.target.value })}>
            <option value="">— not yet assessed —</option>
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{anchorLabel("likelihood", v)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Residual severity (optional)</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.residual_severity} onChange={(e) => setForm({ ...form, residual_severity: e.target.value })}>
            <option value="">— not yet assessed —</option>
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{anchorLabel("severity", v)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Review cadence (months)</label>
          <input type="number" min={1} className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.review_cadence_months} onChange={(e) => setForm({ ...form, review_cadence_months: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Next review date</label>
          <input type="date" className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.next_review_at} onChange={(e) => setForm({ ...form, next_review_at: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving || !form.risk_description} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save risk record
        </button>
        <button onClick={onCancel} className="text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">Cancel</button>
      </div>
    </div>
  );
}
