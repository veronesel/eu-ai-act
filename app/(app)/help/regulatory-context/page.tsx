import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { AlertTriangle } from "lucide-react";

export default function RegulatoryContextPage() {
  return (
    <div className="space-y-4">
      <SectionHeading title="Regulatory context" subtitle="Plain-language orientation. Paraphrased — never verbatim article text." />

      <GlassCard className="border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)]">
            Aegis is a reference / demo implementation built for Eurobank Capital SpA, a fictional entity. It is <strong>not a certified compliance tool
            and not legal advice</strong>. Article mappings should be verified against the consolidated EUR-Lex text before any real-world use.
          </p>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-heading font-semibold mb-2">Regulation (EU) 2024/1689 — structure</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          The AI Act regulates AI systems by risk tier rather than by sector: a short list of prohibited practices (Title II), a much larger regime for
          &quot;high-risk&quot; systems matched against the Annex III catalogue (Title III), lighter transparency duties for certain other systems (Title IV),
          separate obligations on general-purpose AI model builders (Title V), EU/national governance bodies (Title VII), and market-surveillance
          machinery including an EU database, post-market monitoring, and incident reporting (Title VIII).
        </p>
      </GlassCard>

      <GlassCard>
        <h3 className="font-heading font-semibold mb-2">The Digital Omnibus on AI</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          The first amending instrument to the Act. As modeled in this build, it has political agreement from the Council (29 Jun 2026) and the European
          Parliament (16 Jun 2026) but has not yet been published in the Official Journal. It pushes back several Annex III deadlines, adds a new Art. 5
          prohibition for AI-generated non-consensual intimate imagery / CSAM, widens the lawful basis for processing special-category data for bias
          testing, reinstates a mandatory self-assessment summary field in the EU database for Art. 6(3)-exception systems, and clarifies that national
          competent authorities — not the AI Office — retain supervisory competence over GPAI-based systems in specific sectors including financial
          institutions. See the <a href="/help/dual-timeline" className="text-aegis-emerald hover:underline">dual-timeline explainer</a> for the exact dates.
        </p>
      </GlassCard>

      <GlassCard>
        <h3 className="font-heading font-semibold mb-2">The GPAI Code of Practice</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          A voluntary code of practice for general-purpose AI model providers (published 10 Jul 2025), intended to help demonstrate compliance with the
          Title V transparency and copyright obligations pending harmonised standards. Eurobank tracks its vendors&apos; signatory status as part of GPAI
          due diligence (see <a href="/operations/gpai-integration" className="text-aegis-emerald hover:underline">GPAI Downstream Integration</a>) — it
          doesn&apos;t control whether a vendor signs it.
        </p>
      </GlassCard>
    </div>
  );
}
