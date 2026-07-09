"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

interface AuthorityRequest {
  id: string;
  authority: string;
  system_id: string | null;
  request_text: string;
  received_at: string;
  sla_days: number;
  sla_is_default: number;
  response_due_at: string;
  response_notes: string | null;
  responded_at: string | null;
  status: string;
}

function computedStatus(r: AuthorityRequest): string {
  if (r.status === "responded") return "responded";
  const days = daysUntil(r.response_due_at);
  return days !== null && days < 0 ? "overdue" : "open";
}

export function AuthorityRequestsClient({ requests, systems, canWrite }: { requests: AuthorityRequest[]; systems: { id: string; name: string }[]; canWrite: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ authority: "Banca d'Italia", system_id: "", request_text: "", sla_days: "" });
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  async function submit() {
    setSaving(true);
    await fetch("/api/governance/authority-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authority: form.authority, system_id: form.system_id || null, request_text: form.request_text, sla_days: form.sla_days ? Number(form.sla_days) : undefined }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ authority: "Banca d'Italia", system_id: "", request_text: "", sla_days: "" });
    router.refresh();
  }

  async function respond(id: string) {
    setSaving(true);
    await fetch(`/api/governance/authority-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response_notes: responseNotes }) });
    setSaving(false);
    setRespondingId(null);
    setResponseNotes("");
    router.refresh();
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-heading font-semibold">Art. 21 — Cooperation with competent authorities</h3>
        {canWrite && (
          <button onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" /> Log a request
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        Reasoned information requests from Banca d&apos;Italia, the ECB/SSM, Garante, or the Art. 77 fundamental-rights body, with a response tracked against
        a &quot;reasonable time&quot; SLA. The Article does not fix a number of days — the 15-working-day default below is a modelling choice, flagged whenever it
        applies, not a statutory figure.
      </p>

      {showForm && (
        <div className="mb-4 border border-[var(--panel-border)] rounded-lg p-3 space-y-2">
          <input className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" placeholder="Authority" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} />
          <select className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={form.system_id} onChange={(e) => setForm({ ...form, system_id: e.target.value })}>
            <option value="">No specific system</option>
            {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <textarea className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" rows={2} placeholder="Request text" value={form.request_text} onChange={(e) => setForm({ ...form, request_text: e.target.value })} />
          <input className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" placeholder="SLA days (defaults to 15 if left blank)" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} />
          <button onClick={submit} disabled={saving || !form.authority || !form.request_text} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Log request
          </button>
        </div>
      )}

      <div className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-[var(--text-muted)]">No authority information requests on record.</p>}
        {requests.map((r) => {
          const status = computedStatus(r);
          const system = systems.find((s) => s.id === r.system_id);
          return (
            <div key={r.id} className="border border-[var(--panel-border)] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{r.authority}{system ? ` — ${system.name}` : ""}</span>
                <Badge tone={toneForStatus(status)}>{status}</Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{r.request_text}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Received {formatDate(r.received_at)} · due {formatDate(r.response_due_at)} ({r.sla_days} days{r.sla_is_default ? ", default — not a statutory figure" : ""})
              </p>
              {r.response_notes && <p className="text-xs text-[var(--text-secondary)] bg-black/20 rounded p-2 mt-2">{r.response_notes}</p>}
              {status !== "responded" && canWrite && (
                respondingId === r.id ? (
                  <div className="mt-2 flex gap-2">
                    <input className="flex-1 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" placeholder="Response notes" value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)} />
                    <button onClick={() => respond(r.id)} disabled={saving} className="text-xs rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5">Save</button>
                  </div>
                ) : (
                  <button onClick={() => setRespondingId(r.id)} className="text-[10px] text-aegis-emerald mt-2 hover:underline">Log response</button>
                )
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
