import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { ArrowRight, ShieldCheck, ShieldOff } from "lucide-react";

export default function DeployerObligationsPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE deployer_role_applies = 1 ORDER BY name`).all() as any[];
  const checklistRows = db.prepare(`SELECT * FROM deployer_obligation_checklists`).all() as any[];

  const bySystem = new Map<string, any[]>();
  for (const row of checklistRows) {
    if (!bySystem.has(row.system_id)) bySystem.set(row.system_id, []);
    bySystem.get(row.system_id)!.push(row);
  }

  const applicable = systems.filter((s) => s.classification_status === "high_risk");
  const notApplicable = systems.filter((s) => s.classification_status !== "high_risk");

  const totalItems = applicable.reduce((sum, s) => sum + (bySystem.get(s.id)?.length ?? 0), 0);
  const totalChecked = applicable.reduce((sum, s) => sum + (bySystem.get(s.id)?.filter((r) => r.is_checked).length ?? 0), 0);
  const portfolioPct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Deployer Obligation Checklist"
        subtitle="Art. 26 — the seven concrete deployer obligations, tracked per high-risk system: named overseer, input-data relevance, active monitoring, minimum log retention, suspend-on-serious-risk procedure, workers'-representative notification, and a cooperation channel with the competent authority."
      />

      <GlassCard className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-semibold">Portfolio completion</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{totalChecked} of {totalItems} Art. 26 checklist items complete across {applicable.length} deployer-applicable high-risk system{applicable.length === 1 ? "" : "s"}.</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-heading font-semibold text-aegis-emerald">{portfolioPct}%</div>
          <div className="w-40 h-2 rounded-full bg-black/20 mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-aegis-emerald to-aegis-teal" style={{ width: `${portfolioPct}%` }} />
          </div>
        </div>
      </GlassCard>

      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-aegis-emerald" /> Applicable — deployer role, high-risk</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {applicable.map((s) => {
            const items = bySystem.get(s.id) ?? [];
            const checked = items.filter((r) => r.is_checked).length;
            const pct = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
            return (
              <Link key={s.id} href={`/deployer/obligations/${s.id}`}>
                <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold text-sm leading-snug">{s.name}</h3>
                    <Badge tone={pct === 100 ? "success" : pct >= 50 ? "warning" : "danger"}>{pct}%</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">{checked} / {items.length} items complete</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-aegis-emerald">Open checklist <ArrowRight className="h-3 w-3" /></span>
                </GlassCard>
              </Link>
            );
          })}
          {applicable.length === 0 && <p className="text-sm text-[var(--text-muted)]">No deployer-applicable high-risk systems.</p>}
        </div>
      </div>

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2 text-[var(--text-muted)]"><ShieldOff className="h-4 w-4" /> Not applicable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {notApplicable.map((s) => (
              <GlassCard key={s.id} className="opacity-70 border-dashed">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-sm leading-snug">{s.name}</h3>
                  <Badge tone={toneForStatus(s.classification_status)}>{s.classification_status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">Art. 26 Deployer-obligation suite not applicable — system is not classified high-risk.</p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
