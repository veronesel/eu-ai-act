import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { formatDate, daysUntil } from "@/lib/utils";
import { PostureHeader, type PostureMetric } from "../widgets/PostureHeader";
import { ActionInbox, type ActionItem } from "../widgets/ActionInbox";
import { RiskHeatmap } from "../widgets/RiskHeatmap";
import { BaselineSummaryCard } from "../widgets/BaselineSummaryCard";
import { buildHeatmapCells, type RiskRow } from "../heatmapUtil";
import { toneForDaysRemaining, toneForPct } from "../tone";
import { CheckCircle2, ShieldAlert, Users, Coins, ArrowRight } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function ExecSponsorDashboard({ user }: { user: SessionUser }) {
  const db = getDb();

  const systems = db.prepare(`SELECT id, name, classification_status, provider_role_applies FROM ai_systems`).all() as any[];
  const totalSystems = systems.length;
  const screened = systems.filter((s) => s.classification_status !== "not_screened").length;
  const screeningCoveragePct = totalSystems ? Math.round((screened / totalSystems) * 100) : 0;

  const highRiskProviderSystems = systems.filter((s) => s.classification_status === "high_risk" && s.provider_role_applies);
  const highRiskProviderIds = highRiskProviderSystems.map((s) => s.id);
  const conformityPassedCount = highRiskProviderIds.length
    ? (db.prepare(
        `SELECT COUNT(DISTINCT system_id) c FROM conformity_assessments WHERE outcome = 'passed' AND system_id IN (${highRiskProviderIds.map(() => "?").join(",")})`
      ).get(...highRiskProviderIds) as any).c
    : 0;
  const conformityPct = highRiskProviderIds.length ? Math.round((conformityPassedCount / highRiskProviderIds.length) * 100) : 0;

  const openIncidents = (db.prepare(`SELECT COUNT(*) c FROM serious_incidents WHERE status != 'closed'`).get() as any).c;

  const friaTotal = (db.prepare(`SELECT COUNT(*) c FROM fria_assessments WHERE triggered = 1`).get() as any).c;
  const friaComplete = (db.prepare(`SELECT COUNT(*) c FROM fria_assessments WHERE triggered = 1 AND status = 'complete'`).get() as any).c;
  const friaPct = friaTotal ? Math.round((friaComplete / friaTotal) * 100) : 0;

  const metrics: PostureMetric[] = [
    { kind: "gauge", label: "Screening coverage", pct: screeningCoveragePct, sublabel: `${screened}/${totalSystems} systems` },
    { kind: "gauge", label: "High-risk conformity complete", pct: conformityPct, sublabel: `${conformityPassedCount}/${highRiskProviderIds.length} systems` },
    { kind: "count", label: "Open serious incidents", value: openIncidents, tone: openIncidents > 0 ? "danger" : "success", icon: ShieldAlert },
    { kind: "gauge", label: "FRIA completion", pct: friaPct, sublabel: `${friaComplete}/${friaTotal} triggered` },
  ];

  // Portfolio risk heatmap (all systems, all risk records)
  const riskRows = db
    .prepare(`SELECT r.id, r.likelihood, r.severity, r.risk_description, s.name as system_name, s.id as system_id FROM risk_management_records r JOIN ai_systems s ON s.id = r.system_id`)
    .all() as RiskRow[];
  const heatmapCells = buildHeatmapCells(riskRows);

  // Pending-my-approval: EXEC_SPONSOR can approve ANY pending proposal as an escalation path
  const pendingProposals = db
    .prepare(`SELECT id, agent_key, proposal_summary, target_record_type, approver_role_required, created_at FROM agent_proposals WHERE status = 'pending' ORDER BY created_at DESC`)
    .all() as any[];

  const latestReview = db.prepare(`SELECT * FROM management_review_records ORDER BY review_date DESC LIMIT 1`).get() as any;

  const mustItems: ActionItem[] = [];
  const canItems: ActionItem[] = [];

  const directEscalations = pendingProposals.filter((p) => p.approver_role_required === "EXEC_SPONSOR");
  for (const p of directEscalations) {
    mustItems.push({ id: p.id, label: p.proposal_summary, detail: `${p.agent_key} - requires your approval`, href: "/agents" });
  }
  if (openIncidents > 0) {
    mustItems.push({ id: "incidents", label: `${openIncidents} serious incident(s) still open`, detail: "Board-level exposure - review with Deployer Ops", href: "/operations/incidents" });
  }
  if (latestReview?.next_review_due) {
    const d = daysUntil(latestReview.next_review_due);
    if (d !== null && d <= 21) {
      mustItems.push({ id: "review", label: "Board management review due", detail: `Due ${formatDate(latestReview.next_review_due)}`, href: "/assurance/management-review" });
    }
  }
  for (const p of pendingProposals.filter((p) => p.approver_role_required !== "EXEC_SPONSOR")) {
    canItems.push({ id: p.id, label: p.proposal_summary, detail: `${p.agent_key} - routed to ${p.approver_role_required.replace(/_/g, " ")}, escalate if needed`, href: "/agents" });
  }
  if (latestReview?.next_review_due) {
    const d = daysUntil(latestReview.next_review_due);
    if (d !== null && d > 21) {
      canItems.push({ id: "review-fyi", label: "Next board management review scheduled", detail: `Due ${formatDate(latestReview.next_review_due)}`, href: "/assurance/management-review" });
    }
  }

  return (
    <div className="space-y-6">
      <PostureHeader name={user.name} title={user.title} mission={user.mission} metrics={metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <GlassCard>
            <SectionHeading title="Portfolio risk heatmap" subtitle="Risk-management records across the full portfolio, plotted by likelihood x severity." />
            <RiskHeatmap cells={heatmapCells} />
          </GlassCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BaselineSummaryCard />
            <GlassCard>
              <div className="flex items-center gap-2 mb-1">
                <Coins className="h-4 w-4 text-aegis-teal" />
                <h3 className="font-heading font-semibold text-sm">Penalty exposure</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Art. 99 tiered penalties reach up to EUR 35m or 7% of global annual turnover for prohibited-practice breaches. Review the full exposure model, mapped against the current portfolio.
              </p>
              <Link href="/assurance/penalties-exposure" className="inline-flex items-center gap-1 text-sm text-aegis-emerald hover:underline">
                Open penalty exposure reference <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </GlassCard>
          </div>

          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-aegis-indigo" />
              <h3 className="font-heading font-semibold text-sm">Board management review</h3>
            </div>
            {latestReview ? (
              <div className="text-sm space-y-1.5 mt-2">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Last review</span><span>{formatDate(latestReview.review_date)} - {latestReview.status}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Next review due</span><span className={toneForDaysRemaining(daysUntil(latestReview.next_review_due)) === "danger" ? "text-rose-400 font-medium" : ""}>{formatDate(latestReview.next_review_due)}</span></div>
                {latestReview.decisions && <p className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--panel-border)] mt-2">{latestReview.decisions}</p>}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] mt-2">No management review recorded yet.</p>
            )}
          </GlassCard>
        </div>

        <div>
          <ActionInbox must={mustItems} can={canItems} />
        </div>
      </div>

      <GlassCard>
        <SectionHeading
          title="Pending approvals - escalation view"
          subtitle="Every pending agent proposal in the portfolio. As Exec Sponsor you can approve any of these as an escalation path, regardless of the normal approver role."
        />
        {pendingProposals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> No pending proposals across the portfolio.</p>
        ) : (
          <ul className="space-y-2">
            {pendingProposals.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--panel-border)] pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate">{p.proposal_summary}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{p.agent_key} &middot; requires {p.approver_role_required.replace(/_/g, " ")}</p>
                </div>
                <Link href="/agents" className="shrink-0 text-xs text-aegis-emerald hover:underline flex items-center gap-1">
                  Review <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
