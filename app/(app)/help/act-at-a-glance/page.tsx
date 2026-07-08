import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import Link from "next/link";

const TITLES = [
  { title: "Title I", name: "General provisions", summary: "Defines scope and key terms — what counts as an 'AI system', who is a 'provider' vs 'deployer', and how the Regulation applies across the value chain.", modules: [] as { label: string; href: string }[] },
  { title: "Title II", name: "Prohibited practices", summary: "A short list of AI uses banned outright — manipulation exploiting vulnerabilities, social scoring, certain biometric and profiling uses. Screened before anything else.", modules: [{ label: "Classification & Screening", href: "/classification" }] },
  { title: "Title III", name: "High-risk AI systems", summary: "The Annex III catalogue of high-risk use-cases and the full Provider (Art. 9-49) and Deployer (Art. 26-27) obligation sets that attach to them.", modules: [{ label: "Provider suite", href: "/provider/risk-management" }, { label: "Deployer suite", href: "/deployer/obligations" }] },
  { title: "Title IV", name: "Transparency for certain systems", summary: "Disclosure duties that apply regardless of risk tier — telling people they're talking to an AI, labelling synthetic content, flagging emotion-recognition or biometric-categorisation use.", modules: [{ label: "Transparency (certain systems)", href: "/operations/transparency-certain-systems" }] },
  { title: "Title V", name: "General-purpose AI models", summary: "Obligations on the companies that build foundation models — technical documentation, transparency to downstream integrators, and heavier duties for systemic-risk models. Mostly upstream of Eurobank, but the Art. 25 provider-shift test can pull Eurobank in.", modules: [{ label: "GPAI downstream integration", href: "/operations/gpai-integration" }] },
  { title: "Title VII", name: "Governance", summary: "The AI Office, the European AI Board, and national competent authorities. Describes infrastructure the Commission and Member States operate — Aegis models Eurobank's relationship to it, not the infrastructure itself.", modules: [{ label: "Governance & Authority Map", href: "/governance" }] },
  { title: "Title VIII", name: "EU database, post-market monitoring, incident reporting", summary: "Registration of high-risk systems, ongoing monitoring once a system is on the market, and statutory-clock incident reporting.", modules: [{ label: "EU Database Registration", href: "/provider/eu-database" }, { label: "Post-Market Monitoring", href: "/operations/post-market-monitoring" }, { label: "Serious Incidents", href: "/operations/incidents" }] },
  { title: "Title XII", name: "Penalties", summary: "Three tiers of administrative fines depending on which obligation was breached.", modules: [{ label: "Penalty Exposure Reference", href: "/assurance/penalties-exposure" }] },
];

export default function ActAtAGlancePage() {
  return (
    <div>
      <SectionHeading title="The Act at a glance" subtitle="A plain-language, paraphrased orientation to Regulation (EU) 2024/1689's structure — never verbatim article text." />
      <div className="space-y-3">
        {TITLES.map((t) => (
          <GlassCard key={t.title}>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-aegis-emerald">{t.title}</span>
              <h3 className="font-heading font-semibold">{t.name}</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5">{t.summary}</p>
            {t.modules.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {t.modules.map((m) => (
                  <Link key={m.href} href={m.href} className="text-xs text-aegis-teal hover:underline">{m.label} →</Link>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
        <GlassCard className="border-amber-500/30 bg-amber-500/5">
          <p className="text-xs text-[var(--text-secondary)]">
            Title VI (innovation measures / regulatory sandboxes) and the voluntary codes-of-conduct provisions describe infrastructure Member States and the
            Commission operate — Aegis treats these as reference/informational content rather than a company workflow to build.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
