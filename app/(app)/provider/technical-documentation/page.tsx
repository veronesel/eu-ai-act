import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { formatDate } from "@/lib/utils";
import { ArrowRight, FileClock } from "lucide-react";

export default function TechnicalDocumentationPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);

  const sectionsBySystem: Record<string, any[]> = {};
  for (const s of applicable) {
    sectionsBySystem[s.id] = db.prepare(`SELECT * FROM technical_documentation_sections WHERE system_id = ? ORDER BY annex_iv_point`).all(s.id) as any[];
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Technical Documentation"
        subtitle="Art. 11 / Annex IV — the 9-point technical documentation package, drawn up before the system is placed on the market and kept up to date. Each section is independently versioned and statused."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {applicable.map((s) => {
          const sections = sectionsBySystem[s.id] ?? [];
          const approved = sections.filter((sec) => sec.status === "approved").length;
          const retainUntil = sections.find((sec) => sec.retain_until)?.retain_until;
          return (
            <Link key={s.id} href={`/provider/technical-documentation/${s.id}`}>
              <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
                <h3 className="font-heading font-semibold text-sm">{s.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.business_function}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone={approved === 9 ? "success" : approved > 0 ? "warning" : "neutral"}>{approved}/9 sections approved</Badge>
                </div>
                {retainUntil && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-aegis-indigo">
                    <FileClock className="h-3 w-3" /> Art. 18 · 10-year retention until {formatDate(retainUntil)}
                  </div>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-aegis-emerald">Open document builder <ArrowRight className="h-3 w-3" /></span>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2">Provider-role systems — not high-risk</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notApplicable.map((s) => <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />)}
          </div>
        </div>
      )}
    </div>
  );
}
