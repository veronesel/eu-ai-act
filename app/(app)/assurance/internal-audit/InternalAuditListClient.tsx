"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Loader2, Plus, X } from "lucide-react";

interface Engagement {
  id: string;
  scope: string;
  systems_in_scope: string | null;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  status: string;
  created_at: string;
}

export function InternalAuditListClient({
  engagements,
  countsById,
  systems,
  canWrite,
}: {
  engagements: Engagement[];
  countsById: Record<string, { total: number; open_count: number }>;
  systems: { id: string; name: string; demo_seed_key: string | null }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const namesByKey = Object.fromEntries(systems.map((s) => [s.demo_seed_key, s.name]));

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New engagement"}
          </button>
        </div>
      )}

      {showForm && <NewEngagementForm systems={systems} onCreated={() => { setShowForm(false); router.refresh(); }} />}

      {engagements.length === 0 && (
        <GlassCard className="text-sm text-[var(--text-muted)]">No engagements on record yet.</GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {engagements.map((e) => {
          const scope: string[] = e.systems_in_scope ? JSON.parse(e.systems_in_scope) : [];
          const counts = countsById[e.id] ?? { total: 0, open_count: 0 };
          return (
            <Link key={e.id} href={`/assurance/internal-audit/${e.id}`}>
              <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-sm leading-snug">{e.scope}</h3>
                  <Badge tone={toneForStatus(e.status)}>{e.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  {scope.length > 0 ? scope.map((k) => namesByKey[k] ?? k).join(", ") : "No systems recorded in scope."}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  Fieldwork {formatDate(e.fieldwork_start)} – {formatDate(e.fieldwork_end)}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {counts.total} finding{counts.total === 1 ? "" : "s"} · {counts.open_count} open
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-aegis-emerald">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NewEngagementForm({ systems, onCreated }: { systems: { id: string; name: string; demo_seed_key: string | null }[]; onCreated: () => void }) {
  const [scope, setScope] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!scope.trim()) { setError("Scope is required."); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/assurance/internal-audit/engagements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, systems_in_scope: selected, fieldwork_start: start || null, fieldwork_end: end || null }),
    });
    setSaving(false);
    if (res.ok) onCreated();
    else setError((await res.json()).error ?? "Failed to create engagement.");
  }

  return (
    <GlassCard>
      <h3 className="font-heading font-semibold mb-3 text-sm">New engagement</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--text-muted)]">Scope</label>
          <input
            className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="e.g. Q3 Deployer Obligations & FRIA Spot-Check"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Fieldwork start</label>
            <input type="date" className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Fieldwork end</label>
            <input type="date" className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)]">Systems in scope</label>
          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--panel-border)] p-2 grid grid-cols-2 gap-1">
            {systems.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(s.demo_seed_key ?? s.id)}
                  onChange={(e) => {
                    const key = s.demo_seed_key ?? s.id;
                    setSelected((prev) => (e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)));
                  }}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create engagement
        </button>
      </div>
    </GlassCard>
  );
}
