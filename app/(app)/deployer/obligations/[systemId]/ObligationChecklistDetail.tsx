"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function ObligationChecklistDetail({ systemId, items }: { systemId: string; items: any[] }) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, any>>(Object.fromEntries(items.map((i) => [i.item_code, i])));
  const [saving, setSaving] = useState<string | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>(Object.fromEntries(items.map((i) => [i.item_code, i.evidence_link ?? ""])));

  const checked = Object.values(local).filter((r: any) => r.is_checked).length;
  const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;

  async function save(itemCode: string, patch: { is_checked?: boolean; evidence_link?: string }) {
    setSaving(itemCode);
    const res = await fetch(`/api/deployer/obligations/${systemId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_code: itemCode, ...patch }),
    });
    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setLocal((prev) => ({ ...prev, [itemCode]: updated }));
      router.refresh();
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Art. 26 checklist</h3>
        <Badge tone={pct === 100 ? "success" : pct >= 50 ? "warning" : "danger"}>{checked} / {items.length} complete ({pct}%)</Badge>
      </div>
      <div className="space-y-3">
        {items.map((i) => {
          const rec = local[i.item_code] ?? i;
          return (
            <div key={i.id} className="border border-[var(--panel-border)] rounded-lg p-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-emerald-500"
                  checked={!!rec.is_checked}
                  disabled={saving === i.item_code}
                  onChange={(e) => save(i.item_code, { is_checked: e.target.checked })}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{i.item_label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Updated {formatDate(rec.updated_at)}{saving === i.item_code && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Evidence link / reference"
                      className="flex-1 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs"
                      value={evidenceDraft[i.item_code] ?? ""}
                      onChange={(e) => setEvidenceDraft((prev) => ({ ...prev, [i.item_code]: e.target.value }))}
                    />
                    <button
                      onClick={() => save(i.item_code, { evidence_link: evidenceDraft[i.item_code] })}
                      disabled={saving === i.item_code}
                      className="text-xs rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
