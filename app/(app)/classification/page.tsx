import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { ArrowRight } from "lucide-react";

export default function ClassificationPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems ORDER BY name`).all() as any[];
  const determinations = db.prepare(`SELECT * FROM high_risk_determinations`).all() as any[];
  const detByOccSystem = Object.fromEntries(determinations.map((d) => [d.system_id, d]));

  const funnel = {
    not_screened: systems.filter((s) => s.classification_status === "not_screened").length,
    screening_in_progress: systems.filter((s) => s.classification_status === "screening_in_progress").length,
    out_of_scope: systems.filter((s) => detByOccSystemFinal(s, detByOccSystem) === "out_of_scope").length,
    not_high_risk: systems.filter((s) => detByOccSystemFinal(s, detByOccSystem) === "not_high_risk").length,
    high_risk: systems.filter((s) => s.classification_status === "high_risk").length,
    prohibited_blocked: systems.filter((s) => s.classification_status === "prohibited_blocked").length,
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Prohibited-Practice &amp; High-Risk Classification"
        subtitle="Art. 5(1) prohibited-practice screening, the Annex III matcher (with the three-way biometrics branch), and the Art. 6(3) narrow-exception test — the state machine that decides everything downstream."
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <FunnelStat label="Not screened" value={funnel.not_screened} tone="neutral" />
        <FunnelStat label="Screening in progress" value={funnel.screening_in_progress} tone="info" />
        <FunnelStat label="Out of scope (unmatched)" value={funnel.out_of_scope} tone="neutral" />
        <FunnelStat label="Screened — not high-risk" value={funnel.not_high_risk} tone="success" />
        <FunnelStat label="High-risk" value={funnel.high_risk} tone="warning" />
        <FunnelStat label="Prohibited — blocked" value={funnel.prohibited_blocked} tone="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {systems.map((s) => {
          const det = detByOccSystem[s.id];
          return (
            <Link key={s.id} href={`/classification/${s.id}`}>
              <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-sm leading-snug">{s.name}</h3>
                  <Badge tone={toneForStatus(det?.final_determination === "out_of_scope" ? "out_of_scope" : s.classification_status)}>
                    {det?.final_determination === "out_of_scope" ? "out of scope" : s.classification_status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {det?.determination_rationale && <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-3">{det.determination_rationale}</p>}
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-aegis-emerald">Open workflow <ArrowRight className="h-3 w-3" /></span>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function detByOccSystemFinal(s: any, map: Record<string, any>): string {
  const det = map[s.id];
  if (!det) return "";
  return det.final_determination;
}

const TONE_TEXT: Record<string, string> = { neutral: "text-[var(--text-secondary)]", info: "text-sky-400", success: "text-emerald-400", warning: "text-amber-400", danger: "text-rose-400" };

function FunnelStat({ label, value, tone }: { label: string; value: number; tone: "neutral" | "info" | "success" | "warning" | "danger" }) {
  return (
    <GlassCard className="text-center py-4">
      <div className={`text-2xl font-heading font-semibold ${TONE_TEXT[tone]}`}>{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-wide">{label}</div>
    </GlassCard>
  );
}
