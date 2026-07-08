import { GlassCard, SectionHeading } from "@/components/ui/Glass";

const ROWS = [
  ["ai_systems inventory", "A custom AI System Inventory application, cross-referenced to Archer's existing Application/Technology Asset catalog"],
  ["Classification & screening (A2)", "A sub-form / related application with calculated fields implementing the Art. 5 checklist and Annex III matcher logic (candidates for calculated-field formulas or a custom JavaScript object where branching logic exceeds calculated-field capability)"],
  ["Provider Obligations Suite (B1-B12)", "A parent \"AI Provider Obligation\" application with child records per Art. 9-17/43/47-49 obligation, workflow-driven status, linked to Archer's Policy and Risk Management modules where equivalents already exist"],
  ["Deployer Obligations Suite (C1-C5)", "A parent \"AI Deployer Obligation\" application, FRIA as a structured sub-form reusing Archer's existing Impact Assessment patterns where the org has them"],
  ["Serious Incident Reporting (D4)", "Extension of Archer's Incident Management application, with the four-tier deadline computed via a calculated field referencing incident_detected_at"],
  ["Regulatory Obligations Traceability Matrix (E3)", "Archer's native Regulatory/Obligation architecture (Policy Program → Obligation → Control), populated via the REST API from this app's regulatory_obligations_matrix table during migration"],
  ["Agentic functions (§11)", "Custom JavaScript objects invoked from Archer workflow, calling out to the Anthropic API as an external data service exactly as this reference app does — the HITL PENDING_CONFIRMATION pattern maps directly onto an Archer workflow approval stage"],
  ["Regulatory Change Watch", "A small custom application or, if licensed, a scheduled external-data-feed job, feeding the same Regulatory/Obligation architecture"],
];

export default function ArcherPortabilityPage() {
  return (
    <div>
      <SectionHeading title="Archer portability appendix" subtitle="How every Aegis aggregate maps onto an Archer IRM equivalent, for later porting." />
      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-4 w-1/3">Aegis concept</th>
                <th className="py-2 pl-4">Archer equivalent</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([a, b]) => (
                <tr key={a} className="border-t border-[var(--panel-border)] align-top">
                  <td className="py-3 pr-4 font-medium">{a}</td>
                  <td className="py-3 pl-4 text-[var(--text-secondary)]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      <GlassCard className="mt-4 border-amber-500/30 bg-amber-500/5">
        <p className="text-sm text-[var(--text-secondary)]">
          Flag explicitly: Archer&apos;s Broadhead framework operates in a browser/iframe context only — any client-side logic built here as a standalone
          Next.js component (the Aurora SVG diagrams, the SSE agent trace) needs re-implementation as embedded HTML/JS within Archer&apos;s supported
          surfaces, not a direct lift-and-shift.
        </p>
      </GlassCard>
    </div>
  );
}
