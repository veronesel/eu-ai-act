import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { PostureHeader, type PostureMetric } from "../widgets/PostureHeader";
import { ActionInbox, type ActionItem } from "../widgets/ActionInbox";
import { RiskHeatmap } from "../widgets/RiskHeatmap";
import { buildHeatmapCells, type RiskRow } from "../heatmapUtil";
import { ArrowRight, Flame } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function AiModelRiskMgrDashboard({ user }: { user: SessionUser }) {
  const db = getDb();

  const riskRows = db
    .prepare(`SELECT r.*, s.name as system_name FROM risk_management_records r JOIN ai_systems s ON s.id = r.system_id`)
    .all() as any[];

  const heatmapCells = buildHeatmapCells(riskRows as RiskRow[]);

  const openRisks = riskRows.filter((r) => r.status === "open");
  const overdueReviews = riskRows.filter((r) => r.next_review_at && (daysUntil(r.next_review_at) ?? 0) < 0);
  const highSeverity = riskRows.filter((r) => (r.residual_severity ?? r.severity) >= 4);
  const avgResidual = riskRows.length
    ? Math.round(
        (riskRows.reduce((sum, r) => sum + (r.residual_likelihood ?? r.likelihood) * (r.residual_severity ?? r.severity), 0) / riskRows.length) * 10
      ) / 10
    : 0;

  const topResidual = [...riskRows]
    .sort((a, b) => (b.residual_likelihood ?? b.likelihood) * (b.residual_severity ?? b.severity) - (a.residual_likelihood ?? a.likelihood) * (a.residual_severity ?? a.severity))
    .slice(0, 10);

  const accuracyRecords = db
    .prepare(`SELECT ar.*, s.name as system_name FROM accuracy_robustness_records ar JOIN ai_systems s ON s.id = ar.system_id ORDER BY ar.test_date DESC LIMIT 12`)
    .all() as any[];

  const metrics: PostureMetric[] = [
    { kind: "count", label: "Open risk records", value: openRisks.length, tone: openRisks.length > 0 ? "warning" : "success" },
    { kind: "count", label: "Overdue reviews", value: overdueReviews.length, tone: overdueReviews.length > 0 ? "danger" : "success" },
    { kind: "count", label: "High residual severity", value: highSeverity.length, tone: highSeverity.length > 0 ? "danger" : "success", icon: Flame },
    { kind: "count", label: "Avg residual risk score", value: avgResidual, sublabel: "likelihood x severity (1-25)" },
  ];

  const mustItems: ActionItem[] = [];
  const canItems: ActionItem[] = [];

  for (const r of overdueReviews) {
    mustItems.push({ id: r.id, label: `Overdue review: ${r.risk_description}`, detail: `${r.system_name} - was due ${formatDate(r.next_review_at)}`, href: "/provider/risk-management" });
  }
  for (const r of topResidual.filter((r) => (r.residual_likelihood ?? r.likelihood) * (r.residual_severity ?? r.severity) >= 15).slice(0, 5)) {
    mustItems.push({ id: `top-${r.id}`, label: `Critical residual risk: ${r.risk_description}`, detail: `${r.system_name} - residual score ${(r.residual_likelihood ?? r.likelihood) * (r.residual_severity ?? r.severity)}`, href: `/systems/${r.system_id}` });
  }
  const soonReviews = riskRows.filter((r) => r.next_review_at && (daysUntil(r.next_review_at) ?? 999) >= 0 && (daysUntil(r.next_review_at) ?? 999) <= 30);
  for (const r of soonReviews.slice(0, 6)) {
    canItems.push({ id: `soon-${r.id}`, label: `Review upcoming: ${r.risk_description}`, detail: `${r.system_name} - due ${formatDate(r.next_review_at)}`, href: "/provider/risk-management" });
  }

  return (
    <div className="space-y-6">
      <PostureHeader name={user.name} title={user.title} mission={user.mission} metrics={metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <GlassCard>
            <SectionHeading title="Portfolio risk heatmap" subtitle="All risk-management records, portfolio-wide. Click a cell to inspect the underlying records." />
            <RiskHeatmap cells={heatmapCells} interactive />
          </GlassCard>

          <GlassCard>
            <SectionHeading title="Top residual risks" subtitle="Sorted by residual severity x likelihood, highest first." />
            {topResidual.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No risk-management records recorded.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--panel-border)]">
                      <th className="py-1.5 px-1 font-medium">System</th>
                      <th className="py-1.5 px-1 font-medium">Risk</th>
                      <th className="py-1.5 px-1 font-medium text-center">Residual L</th>
                      <th className="py-1.5 px-1 font-medium text-center">Residual S</th>
                      <th className="py-1.5 px-1 font-medium text-center">Score</th>
                      <th className="py-1.5 px-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topResidual.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--panel-border)] last:border-0">
                        <td className="py-1.5 px-1">
                          <Link href={`/systems/${r.system_id}`} className="hover:text-aegis-emerald">{r.system_name}</Link>
                        </td>
                        <td className="py-1.5 px-1 max-w-[240px] truncate" title={r.risk_description}>{r.risk_description}</td>
                        <td className="py-1.5 px-1 text-center">{r.residual_likelihood ?? "—"}</td>
                        <td className="py-1.5 px-1 text-center">{r.residual_severity ?? "—"}</td>
                        <td className="py-1.5 px-1 text-center font-semibold">{(r.residual_likelihood ?? r.likelihood) * (r.residual_severity ?? r.severity)}</td>
                        <td className="py-1.5 px-1"><Badge tone={toneForStatus(r.status)}>{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link href="/provider/risk-management" className="inline-flex items-center gap-1 text-xs text-aegis-emerald hover:underline mt-3">
              Open full risk register <ArrowRight className="h-3 w-3" />
            </Link>
          </GlassCard>

          <GlassCard>
            <SectionHeading title="Accuracy &amp; robustness testing" subtitle="Most recent metric and test records across the portfolio." />
            {accuracyRecords.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No accuracy/robustness records recorded.</p>
            ) : (
              <ul className="space-y-1.5">
                {accuracyRecords.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-xs border-b border-[var(--panel-border)] pb-1.5 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <span className="font-medium">{a.system_name}</span>
                      <span className="text-[var(--text-muted)]"> &middot; {a.metric_name}{a.metric_value ? ` = ${a.metric_value}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[var(--text-muted)]">{formatDate(a.test_date)}</span>
                      {a.result && <Badge tone={toneForStatus(a.result)}>{a.result}</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        <div>
          <ActionInbox must={mustItems} can={canItems} />
        </div>
      </div>
    </div>
  );
}
