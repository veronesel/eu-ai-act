"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { CORRECTIVE_ACTION_TYPES, NOTIFICATION_PARTIES } from "@/lib/domain/provider-suite";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, Plus, AlertOctagon, CircleSlash } from "lucide-react";

export function CorrectiveActionsClient({ applicable, notApplicable, actions, notifications }: any) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);
  const actionsBySystem = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const a of actions) (map[a.system_id] ??= []).push(a);
    return map;
  }, [actions]);
  const notificationsByAction = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const n of notifications) (map[n.corrective_action_id] ??= []).push(n);
    return map;
  }, [notifications]);

  return (
    <div className="space-y-3">
      {applicable.map((s: any) => (
        <SystemActionsCard
          key={s.id}
          system={s}
          actions={actionsBySystem[s.id] ?? []}
          notificationsByAction={notificationsByAction}
          expanded={expanded === s.id}
          onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
          onChanged={() => router.refresh()}
        />
      ))}

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2 mt-4">Provider-role systems — not high-risk</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notApplicable.map((s: any) => <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SystemActionsCard({ system, actions, notificationsByAction, expanded, onToggle, onChanged }: any) {
  const [adding, setAdding] = useState(false);
  const openCount = actions.filter((a: any) => a.status !== "closed").length;
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
        <Badge tone={openCount ? "warning" : "success"}>{openCount} open · {actions.length} total</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {actions.map((a: any) => (
            <ActionRow key={a.id} action={a} notifications={notificationsByAction[a.id] ?? []} onChanged={onChanged} />
          ))}
          {actions.length === 0 && <p className="text-sm text-[var(--text-muted)]">No corrective actions on record.</p>}

          {!adding ? (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">
              <Plus className="h-3.5 w-3.5" /> Log non-conformity &amp; action
            </button>
          ) : (
            <AddActionForm systemId={system.id} onDone={() => { setAdding(false); onChanged(); }} onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </GlassCard>
  );
}

function ActionRow({ action, notifications, onChanged }: { action: any; notifications: any[]; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const [notifyingAuthority, setNotifyingAuthority] = useState(false);
  const [addingParty, setAddingParty] = useState<string | null>(null);
  const deployerNotifs = notifications.filter((n) => n.party === "deployer");
  const authorityNotifs = notifications.filter((n) => n.party === "authority");
  const emptyParties = NOTIFICATION_PARTIES.filter((p) => p !== "deployer" && p !== "authority");

  const blockedFromClosing = !!action.poses_health_safety_risk && !action.authority_notified;

  async function updateStatus(status: string) {
    setSaving(true);
    const res = await fetch(`/api/provider/corrective-actions/${action.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setSaving(false);
    if (res.ok) onChanged();
  }

  async function notifyAuthority() {
    setNotifyingAuthority(true);
    await fetch(`/api/provider/corrective-actions/${action.id}/notifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ party: "authority", notes: "Banca d'Italia notified per Art. 20(2) — health/safety risk." }) });
    setNotifyingAuthority(false);
    onChanged();
  }

  async function notifyDeployer(notes: string) {
    setAddingParty(null);
    await fetch(`/api/provider/corrective-actions/${action.id}/notifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ party: "deployer", notes }) });
    onChanged();
  }

  return (
    <div className="border border-[var(--panel-border)] rounded-lg p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{action.action_type}</span>
          <p className="font-medium mt-0.5">{action.non_conformity_description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!!action.poses_health_safety_risk && <Badge tone="danger"><AlertOctagon className="h-3 w-3" /> health/safety risk</Badge>}
          <Badge tone={toneForStatus(action.status)}>{action.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>
      {action.action_description && <p className="text-xs text-[var(--text-secondary)] mt-2 bg-black/20 rounded p-2">{action.action_description}</p>}

      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Deployer notifications</p>
          {deployerNotifs.length === 0 && <p className="text-xs text-[var(--text-muted)]">None yet.</p>}
          {deployerNotifs.map((n) => <p key={n.id} className="text-xs text-[var(--text-secondary)]">{formatDate(n.notified_at)} — {n.notes}</p>)}
          {addingParty !== "deployer" ? (
            <button onClick={() => setAddingParty("deployer")} className="text-[11px] text-aegis-emerald hover:underline mt-1">notify deployer</button>
          ) : (
            <InlineNotifyForm onSubmit={notifyDeployer} onCancel={() => setAddingParty(null)} />
          )}
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Authority notification (Banca d&apos;Italia)</p>
          {authorityNotifs.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Not notified{action.poses_health_safety_risk ? " — required before this action can be closed" : ""}.</p>
          ) : (
            authorityNotifs.map((n) => <p key={n.id} className="text-xs text-[var(--text-secondary)]">{formatDate(n.notified_at)} — {n.notes}</p>)
          )}
          {authorityNotifs.length === 0 && (
            <button disabled={notifyingAuthority} onClick={notifyAuthority} className="text-[11px] text-aegis-emerald hover:underline mt-1 disabled:opacity-50">notify Banca d&apos;Italia</button>
          )}
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Distributor / importer / authorised representative</p>
        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><CircleSlash className="h-3 w-3" /> Genuinely empty — Eurobank&apos;s in-house EU-internal systems have no distributor, importer, or authorised-representative link in the chain.</p>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--panel-border)]">
        {action.status !== "in_progress" && action.status !== "closed" && (
          <button disabled={saving} onClick={() => updateStatus("in_progress")} className="text-xs rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5">start</button>
        )}
        {action.status !== "closed" && (
          <button disabled={saving || blockedFromClosing} title={blockedFromClosing ? "Authority notification required before closing a health/safety-risk action" : undefined} onClick={() => updateStatus("closed")} className="text-xs rounded-md border border-emerald-500/40 text-emerald-300 px-2 py-1 hover:bg-emerald-500/10 disabled:opacity-40">
            close
          </button>
        )}
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>
    </div>
  );
}

function InlineNotifyForm({ onSubmit, onCancel }: { onSubmit: (notes: string) => void; onCancel: () => void }) {
  const [notes, setNotes] = useState("Deployer Ops notified of the corrective action and interim measures.");
  return (
    <div className="mt-1 flex gap-1.5">
      <input className="flex-1 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1 text-[11px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button onClick={() => onSubmit(notes)} className="text-[11px] rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5">save</button>
      <button onClick={onCancel} className="text-[11px] text-[var(--text-muted)]">cancel</button>
    </div>
  );
}

function AddActionForm({ systemId, onDone, onCancel }: { systemId: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ non_conformity_description: "", action_type: CORRECTIVE_ACTION_TYPES[0] as string, action_description: "", poses_health_safety_risk: false });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await fetch("/api/provider/corrective-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_id: systemId, ...form }) });
    setSaving(false);
    onDone();
  }

  return (
    <div className="border border-aegis-emerald/30 rounded-lg p-3 space-y-2 bg-black/20">
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Non-conformity description</label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={form.non_conformity_description} onChange={(e) => setForm({ ...form, non_conformity_description: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-muted)]">Action type</label>
          <select className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}>
            {CORRECTIVE_ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs mt-4">
          <input type="checkbox" checked={form.poses_health_safety_risk} onChange={(e) => setForm({ ...form, poses_health_safety_risk: e.target.checked })} />
          Poses a health/safety risk (Art. 20(2) authority notification required before closing)
        </label>
      </div>
      <div>
        <label className="text-[10px] text-[var(--text-muted)]">Action description</label>
        <textarea className="w-full mt-0.5 rounded-md bg-black/30 border border-[var(--panel-border)] px-2 py-1.5 text-xs" rows={2} value={form.action_description} onChange={(e) => setForm({ ...form, action_description: e.target.value })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={saving || !form.non_conformity_description} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </button>
        <button onClick={onCancel} className="text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">Cancel</button>
      </div>
    </div>
  );
}
