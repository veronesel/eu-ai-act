import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";

const ACTIONS: Record<string, { must: string[]; can: string[] }> = {
  EXEC_SPONSOR: { must: ["Clear the pending-approval queue", "Sign off EU database registrations", "Chair the board management review"], can: ["Review portfolio risk heatmap", "Toggle the regulatory baseline", "Read penalty exposure reference"] },
  REG_COMPLIANCE_LEAD: { must: ["Screen new/unclassified systems", "Respond to Art.80 regulatory challenges within the response window", "Respond to Art.21 authority information requests"], can: ["Review the regulatory change watch feed", "Run the Classification Agent", "Update the obligations matrix"] },
  AI_PRODUCT_OWNER: { must: ["Close open corrective actions", "Approve agent-drafted technical documentation before it counts as complete", "Keep Annex IV sections current"], can: ["Run the Technical Documentation Agent", "Review QMS status", "Track post-market monitoring events"] },
  AI_MODEL_RISK_MGR: { must: ["Action overdue risk reviews", "Investigate high-severity residual risks"], can: ["Update accuracy/robustness metrics", "Review the portfolio risk heatmap"] },
  DATA_GOVERNANCE_LEAD: { must: ["Close data-quality gaps flagged in governance records"], can: ["Document special-category-data necessity rationale", "Review bias-examination coverage"] },
  QUALITY_CONFORMITY_MGR: { must: ["Progress conformity assessments to a pass/fail outcome", "Complete EU database self-assessment summaries where required"], can: ["Run the Conformity Assessment Readiness Agent", "Update QMS policy areas"] },
  DEPLOYER_OPS_MGR: { must: ["Close open serious incidents within the statutory deadline", "Respond to open Art.86 explanation requests within their due date", "Complete triggered FRIAs"], can: ["Clone a FRIA from a similar case", "Run the Individual Explanation Drafting Agent", "Review override-rate trends"] },
  INTERNAL_AUDITOR: { must: ["Track remediation of open findings past due date"], can: ["Open new engagements", "Tag findings Art.82 vs Art.83", "Review the obligations matrix"] },
};

export default function RoleGuidesPage() {
  const db = getDb();
  const users = db.prepare(`SELECT * FROM users ORDER BY rowid`).all() as any[];

  return (
    <div>
      <SectionHeading title="Role guides" subtitle="Mission, and MUST vs. CAN action types, per persona." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((u) => {
          const actions = ACTIONS[u.role_code] ?? { must: [], can: [] };
          return (
            <GlassCard key={u.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold">{u.name}</h3>
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{u.role_code.replace(/_/g, " ")}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{u.mission}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-rose-400 mb-1">Must</div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1">{actions.must.map((a) => <li key={a}>• {a}</li>)}</ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-sky-400 mb-1">Can</div>
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1">{actions.can.map((a) => <li key={a}>• {a}</li>)}</ul>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
