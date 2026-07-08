"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { BadgeCheck, Loader2 } from "lucide-react";

const STATUSES = ["not_started", "in_progress", "complete"] as const;

export function QmsClient({ records, users, maturity }: { records: any[]; users: any[]; maturity: number }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--panel-border)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={`${maturity} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-heading font-semibold">{maturity}%</div>
          </div>
          <div>
            <h3 className="font-heading font-semibold flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-aegis-emerald" /> QMS maturity score</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{records.filter((r) => r.status === "complete").length} of {records.length} policy areas complete.</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {records.map((r) => (
          <QmsRow key={r.id} record={r} users={users} onChanged={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function QmsRow({ record, users, onChanged }: any) {
  const [owner, setOwner] = useState(record.owner_id ?? "");
  const [link, setLink] = useState(record.policy_document_link ?? "");
  const [saving, setSaving] = useState(false);

  async function update(patch: any) {
    setSaving(true);
    await fetch(`/api/provider/qms/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSaving(false);
    onChanged();
  }

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{record.policy_area}</p>
        <Badge tone={toneForStatus(record.status)}>{record.status.replace(/_/g, " ")}</Badge>
      </div>
      <div className="mt-3 flex gap-1.5">
        {STATUSES.map((s) => (
          <button key={s} disabled={saving} onClick={() => update({ status: s })} className={`px-2 py-1 rounded-md text-[10px] font-medium border ${record.status === s ? "bg-aegis-emerald/20 border-aegis-emerald/50 text-aegis-emerald" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"}`}>
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <select className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={owner} onChange={(e) => { setOwner(e.target.value); update({ owner_id: e.target.value }); }}>
          <option value="">— unassigned —</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input placeholder="Policy document link" className="rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-xs" value={link} onChange={(e) => setLink(e.target.value)} onBlur={() => update({ policy_document_link: link })} />
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-2">Updated {formatDate(record.updated_at)} {saving && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</p>
    </GlassCard>
  );
}
