"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";

interface LivePack {
  totalSystems: number;
  classifiedSystems: number;
  classificationPct: number;
  friaTriggered: number;
  friaComplete: number;
  openIncidents: number;
  openFindings: number;
}

interface Review {
  id: string;
  review_date: string;
  input_pack_notes: string | null;
  decisions: string | null;
  status: string;
  next_review_due: string | null;
}

interface Action {
  id: string;
  review_id: string;
  action_text: string;
  owner_id: string | null;
  due_at: string | null;
  status: string;
}

function livePackSummary(p: LivePack): string {
  return `Classification coverage ${p.classificationPct}% (${p.classifiedSystems}/${p.totalSystems} systems). FRIA completion ${p.friaComplete}/${p.friaTriggered} triggered assessments. Open serious incidents: ${p.openIncidents}. Open internal-audit findings: ${p.openFindings}.`;
}

export function ManagementReviewClient({
  reviews,
  actionsByReview,
  users,
  livePack,
  canWrite,
}: {
  reviews: Review[];
  actionsByReview: Record<string, Action[]>;
  users: { id: string; name: string; title: string }[];
  livePack: LivePack;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="font-heading font-semibold mb-1 text-sm">Input-pack completeness — live readout</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">Computed fresh from the underlying systems of record every time this page loads — nothing here is a stored snapshot.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LiveStat label="Classification coverage" value={`${livePack.classificationPct}%`} detail={`${livePack.classifiedSystems}/${livePack.totalSystems} systems`} tone={livePack.classificationPct === 100 ? "success" : "warning"} />
          <LiveStat label="FRIA completion" value={`${livePack.friaComplete}/${livePack.friaTriggered}`} detail="triggered assessments complete" tone={livePack.friaTriggered === 0 || livePack.friaComplete === livePack.friaTriggered ? "success" : "warning"} />
          <LiveStat label="Open serious incidents" value={String(livePack.openIncidents)} detail="not yet reported/closed" tone={livePack.openIncidents === 0 ? "success" : "danger"} />
          <LiveStat label="Open audit findings" value={String(livePack.openFindings)} detail="from Internal Audit" tone={livePack.openFindings === 0 ? "success" : "warning"} />
        </div>
      </GlassCard>

      {canWrite && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Schedule / record a review"}
          </button>
        </div>
      )}

      {showForm && <NewReviewForm livePack={livePack} onCreated={() => { setShowForm(false); router.refresh(); }} />}

      <div className="space-y-4">
        {reviews.length === 0 && <GlassCard className="text-sm text-[var(--text-muted)]">No management reviews on record yet.</GlassCard>}
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} actions={actionsByReview[r.id] ?? []} users={users} canWrite={canWrite} onChanged={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function LiveStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "success" | "warning" | "danger" }) {
  const color = tone === "success" ? "text-emerald-400" : tone === "warning" ? "text-amber-400" : "text-rose-400";
  return (
    <div className="rounded-xl border border-[var(--panel-border)] p-3">
      <div className={`text-xl font-heading font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-wide">{label}</div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{detail}</div>
    </div>
  );
}

function NewReviewForm({ livePack, onCreated }: { livePack: LivePack; onCreated: () => void }) {
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextReviewDue, setNextReviewDue] = useState("");
  const [decisions, setDecisions] = useState("");
  const [notes, setNotes] = useState(livePackSummary(livePack));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/assurance/management-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_date: reviewDate, input_pack_notes: notes, decisions, next_review_due: nextReviewDue || null }),
    });
    setSaving(false);
    if (res.ok) onCreated();
    else setError((await res.json()).error ?? "Failed to save review.");
  }

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-3 text-sm">New review record</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Review date</label>
            <input type="date" className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Next review due</label>
            <input type="date" className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={nextReviewDue} onChange={(e) => setNextReviewDue(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Input pack notes (pre-filled from the live readout above — edit freely)</label>
          <textarea className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Decisions</label>
          <textarea className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" rows={3} value={decisions} onChange={(e) => setDecisions(e.target.value)} placeholder="What did leadership decide at this review?" />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save review
        </button>
      </div>
    </GlassCard>
  );
}

function ReviewCard({
  review,
  actions,
  users,
  canWrite,
  onChanged,
}: {
  review: Review;
  actions: Action[];
  users: { id: string; name: string; title: string }[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [showActionForm, setShowActionForm] = useState(false);

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-aegis-teal" />
          <span className="font-medium text-sm">{formatDate(review.review_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={toneForStatus(review.status)}>{review.status}</Badge>
          {review.next_review_due && <span className="text-xs text-[var(--text-muted)]">Next due {formatDate(review.next_review_due)}</span>}
        </div>
      </div>

      {review.input_pack_notes && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Input pack</div>
          <p className="text-xs text-[var(--text-secondary)] bg-black/20 rounded p-2">{review.input_pack_notes}</p>
        </div>
      )}
      {review.decisions && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Decisions</div>
          <p className="text-xs text-[var(--text-secondary)]">{review.decisions}</p>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--panel-border)] pt-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Actions ({actions.length})</div>
          {canWrite && (
            <button onClick={() => setShowActionForm((v) => !v)} className="text-xs text-aegis-emerald hover:underline">
              {showActionForm ? "cancel" : "+ add action"}
            </button>
          )}
        </div>
        {showActionForm && <NewActionForm reviewId={review.id} users={users} onCreated={() => { setShowActionForm(false); onChanged(); }} />}
        <div className="mt-2 space-y-2">
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} users={users} canWrite={canWrite} onChanged={onChanged} />
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function ActionRow({ action, users, canWrite, onChanged }: { action: Action; users: { id: string; name: string }[]; canWrite: boolean; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const owner = users.find((u) => u.id === action.owner_id);

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch(`/api/assurance/management-review/actions/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    onChanged();
  }

  return (
    <div className="flex items-center justify-between gap-3 text-xs border border-[var(--panel-border)] rounded-lg px-3 py-2">
      <div>
        <div>{action.action_text}</div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{owner?.name ?? "unassigned"} · due {formatDate(action.due_at)}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge tone={toneForStatus(action.status)}>{action.status}</Badge>
        {canWrite && action.status !== "closed" && (
          <select disabled={saving} value={action.status} onChange={(e) => updateStatus(e.target.value)} className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-[10px]">
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="closed">closed</option>
          </select>
        )}
      </div>
    </div>
  );
}

function NewActionForm({ reviewId, users, onCreated }: { reviewId: string; users: { id: string; name: string }[]; onCreated: () => void }) {
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSaving(true);
    await fetch(`/api/assurance/management-review/${reviewId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_text: text, owner_id: owner || null, due_at: due || null }),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-[var(--panel-border)] p-2">
      <input className="w-full rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" placeholder="Action text" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">— owner —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      <button onClick={submit} disabled={saving} className="text-xs rounded-md bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
        {saving ? "Saving…" : "Add action"}
      </button>
    </div>
  );
}
