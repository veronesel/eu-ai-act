import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { friaNotTriggeredReason } from "@/lib/domain/deployer";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Scale, ShieldOff, Copy } from "lucide-react";

export default function DeployerFriaPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE deployer_role_applies = 1 ORDER BY name`).all() as any[];
  const friaRows = db.prepare(`SELECT * FROM fria_assessments`).all() as any[];
  const friaBySystem = Object.fromEntries(friaRows.map((f) => [f.system_id, f]));

  const applicable = systems.filter((s) => s.classification_status === "high_risk");
  const notApplicable = systems.filter((s) => s.classification_status !== "high_risk");
  const triggered = applicable.filter((s) => friaBySystem[s.id]?.triggered);
  const notTriggered = applicable.filter((s) => !friaBySystem[s.id]?.triggered);

  const today = formatDate(new Date().toISOString());

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Fundamental Rights Impact Assessment (FRIA)"
        subtitle="Art. 27 — required for high-risk Annex III 5(b)/5(c) systems (creditworthiness/credit-scoring, insurance risk-pricing), or where Eurobank deploys as a body governed by public law / provider of a public service. Includes the Art. 27(2) reuse-in-similar-cases action and the Art. 27(3) market-surveillance-authority notification step."
      />

      <GlassCard className="border-sky-500/30 bg-sky-500/5">
        <p className="text-xs text-[var(--text-secondary)]">
          <strong className="text-sky-300">Art. 27(5) template status —</strong> the AI Office FRIA template is pending as of {today}; this workflow follows the Art. 27(1) statutory structure directly and will be re-mapped once the official template is published.
        </p>
      </GlassCard>

      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2"><Scale className="h-4 w-4 text-aegis-emerald" /> Triggered</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {triggered.map((s) => {
            const fria = friaBySystem[s.id];
            return (
              <Link key={s.id} href={`/deployer/fria/${s.id}`}>
                <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold text-sm leading-snug">{s.name}</h3>
                    <Badge tone={toneForStatus(fria?.status ?? "not_started")}>{(fria?.status ?? "not_started").replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{fria?.trigger_reason}</p>
                  {fria?.cloned_from_system_id && (
                    <p className="text-[10px] text-aegis-violet mt-2 flex items-center gap-1"><Copy className="h-3 w-3" /> Eligible for Art. 27(2) clone-from-similar-case</p>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-aegis-emerald">Open FRIA <ArrowRight className="h-3 w-3" /></span>
                </GlassCard>
              </Link>
            );
          })}
          {triggered.length === 0 && <p className="text-sm text-[var(--text-muted)]">No triggered FRIAs.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-semibold text-sm mb-3 text-[var(--text-muted)]">Not triggered</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notTriggered.map((s) => (
            <Link key={s.id} href={`/deployer/fria/${s.id}`}>
              <GlassCard className="h-full hover:border-white/20 transition-colors cursor-pointer opacity-90">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-sm leading-snug">{s.name}</h3>
                  <Badge tone="neutral">not triggered</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-3">{friaNotTriggeredReason(s)}</p>
              </GlassCard>
            </Link>
          ))}
          {notTriggered.length === 0 && <p className="text-sm text-[var(--text-muted)]">—</p>}
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
