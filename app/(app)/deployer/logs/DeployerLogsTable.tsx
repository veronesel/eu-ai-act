"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

function retentionBadge(retentionExpiresAt: string) {
  const days = daysUntil(retentionExpiresAt);
  if (days === null) return { tone: "neutral" as const, label: "unknown" };
  if (days < 0) return { tone: "success" as const, label: `Minimum retention satisfied ${formatDate(retentionExpiresAt)}` };
  if (days <= 30) return { tone: "warning" as const, label: `Boundary in ${days} day${days === 1 ? "" : "s"} — do not purge before ${formatDate(retentionExpiresAt)}` };
  return { tone: "success" as const, label: `Safely within window — boundary ${formatDate(retentionExpiresAt)}` };
}

export function DeployerLogsTable({ systems, logsBySystem, applicable }: { systems: any[]; logsBySystem: Record<string, any[]>; applicable: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  async function addBatch(systemId: string) {
    setCreating(systemId);
    await fetch(`/api/deployer/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_id: systemId }),
    });
    setCreating(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {systems.map((s) => {
        const logs = logsBySystem[s.id] ?? [];
        return (
          <GlassCard key={s.id} className={applicable ? "" : "opacity-80 border-dashed"}>
            <h3 className="font-heading font-semibold text-sm leading-snug mb-2">{s.name}</h3>
            <div className="space-y-2">
              {logs.map((l) => {
                const badge = retentionBadge(l.retention_expires_at);
                return (
                  <div key={l.id} className="border border-[var(--panel-border)] rounded-lg p-2">
                    <p className="text-xs font-medium">{l.log_batch_label}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Generated {formatDate(l.generated_at)}</p>
                    <Badge tone={badge.tone} className="mt-2 w-full justify-center text-[10px]">{badge.label}</Badge>
                  </div>
                );
              })}
              {logs.length === 0 && <p className="text-xs text-[var(--text-muted)]">No log batches recorded.</p>}
            </div>
            <button
              onClick={() => addBatch(s.id)}
              disabled={creating === s.id}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] rounded-lg border border-[var(--panel-border)] px-2.5 py-1.5 hover:bg-white/5 disabled:opacity-50"
            >
              {creating === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Record new log batch
            </button>
          </GlassCard>
        );
      })}
      {systems.length === 0 && <p className="text-sm text-[var(--text-muted)]">—</p>}
    </div>
  );
}
