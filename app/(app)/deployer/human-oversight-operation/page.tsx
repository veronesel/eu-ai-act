import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { overallOverrideRatePct } from "@/lib/domain/deployer";
import { ArrowRight, UsersRound, ShieldOff, TrendingUp } from "lucide-react";

export default function HumanOversightOperationPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE deployer_role_applies = 1 ORDER BY name`).all() as any[];
  const events = db.prepare(`SELECT system_id, event_type FROM human_oversight_operations`).all() as any[];

  const eventsBySystem = new Map<string, any[]>();
  for (const e of events) {
    if (!eventsBySystem.has(e.system_id)) eventsBySystem.set(e.system_id, []);
    eventsBySystem.get(e.system_id)!.push(e);
  }

  const applicable = systems.filter((s) => s.classification_status === "high_risk");
  const notApplicable = systems.filter((s) => s.classification_status !== "high_risk");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Human Oversight — Operation"
        subtitle="Art. 14 as operated under Art. 26 — the live log of named-overseer events (routine checks, escalations, and overrides) for each high-risk deployed system. A rising override rate is a genuine early-warning signal, not noise."
      />

      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><UsersRound className="h-4 w-4 text-aegis-emerald" /> Applicable — deployer role, high-risk</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {applicable.map((s) => {
            const sysEvents = eventsBySystem.get(s.id) ?? [];
            const rate = overallOverrideRatePct(sysEvents);
            return (
              <Link key={s.id} href={`/deployer/human-oversight-operation/${s.id}`}>
                <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold text-sm leading-snug">{s.name}</h3>
                    <Badge tone={rate >= 20 ? "danger" : rate >= 10 ? "warning" : "success"}>
                      <TrendingUp className="h-3 w-3" /> {rate}% override
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">{sysEvents.length} logged oversight events</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-aegis-emerald">Open log &amp; chart <ArrowRight className="h-3 w-3" /></span>
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
