import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { PostureHeader, type PostureMetric } from "../widgets/PostureHeader";
import { ActionInbox, type ActionItem } from "../widgets/ActionInbox";
import { Kanban, type KanbanColumn } from "../widgets/Kanban";
import { GaugeRing } from "../widgets/GaugeRing";
import { AlertTriangle, ArrowRight, Landmark } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function QualityConformityMgrDashboard({ user }: { user: SessionUser }) {
  const db = getDb();

  const qmsRecords = db.prepare(`SELECT * FROM qms_records`).all() as any[];
  const qmsScore = qmsRecords.length
    ? Math.round(
        (qmsRecords.reduce((sum, r) => sum + (r.status === "complete" ? 1 : r.status === "in_progress" ? 0.5 : 0), 0) / qmsRecords.length) * 100
      )
    : 0;

  const highRiskProviderSystems = db.prepare(`SELECT * FROM ai_systems WHERE classification_status = 'high_risk' AND provider_role_applies = 1 ORDER BY name`).all() as any[];
  const systemIds = highRiskProviderSystems.map((s) => s.id);
  const inClause = systemIds.length ? systemIds.map(() => "?").join(",") : "''";

  const conformityRows = systemIds.length ? (db.prepare(`SELECT * FROM conformity_assessments WHERE system_id IN (${inClause})`).all(...systemIds) as any[]) : [];
  const conformityBySystem = Object.fromEntries(conformityRows.map((r) => [r.system_id, r]));

  const euDbRows = systemIds.length ? (db.prepare(`SELECT * FROM eu_database_registrations WHERE system_id IN (${inClause})`).all(...systemIds) as any[]) : [];
  const euDbBySystem = Object.fromEntries(euDbRows.map((r) => [r.system_id, r]));

  const ceRows = systemIds.length ? (db.prepare(`SELECT * FROM ce_marking_records WHERE system_id IN (${inClause})`).all(...systemIds) as any[]) : [];
  const ceBySystem = Object.fromEntries(ceRows.map((r) => [r.system_id, r]));

  const docRows = systemIds.length ? (db.prepare(`SELECT * FROM declarations_of_conformity WHERE system_id IN (${inClause})`).all(...systemIds) as any[]) : [];
  const docBySystem = Object.fromEntries(docRows.map((r) => [r.system_id, r]));

  const kanbanColumns: KanbanColumn[] = [
    { key: "not_started", label: "Not started", tone: "neutral", cards: [] },
    { key: "in_progress", label: "In progress", tone: "info", cards: [] },
    { key: "passed", label: "Passed", tone: "success", cards: [] },
    { key: "registered", label: "Registered", tone: "success", cards: [] },
  ];
  for (const s of highRiskProviderSystems) {
    const conf = conformityBySystem[s.id];
    const euDb = euDbBySystem[s.id];
    let col = "not_started";
    let subtitle = "No conformity assessment started";
    if (conf) {
      if (conf.outcome === "in_progress") {
        col = "in_progress";
        subtitle = "Assessment in progress";
      } else if (conf.outcome === "failed") {
        col = "in_progress";
        subtitle = "Failed - rework required";
      } else if (conf.outcome === "passed") {
        if (euDb?.status === "registered") {
          col = "registered";
          subtitle = "Passed & registered in EU database";
        } else {
          col = "passed";
          subtitle = `Passed - EU database ${euDb?.status?.replace(/_/g, " ") ?? "not started"}`;
        }
      }
    }
    kanbanColumns.find((c) => c.key === col)!.cards.push({ id: s.id, title: s.name, subtitle, href: `/systems/${s.id}` });
  }

  const conformityPassedCount = highRiskProviderSystems.filter((s) => conformityBySystem[s.id]?.outcome === "passed").length;
  const euDbRegisteredCount = euDbRows.filter((r) => r.status === "registered").length;
  const ceAffixedCount = ceRows.filter((r) => r.status === "affixed").length;

  const selfAssessmentGaps = euDbRows.filter((r) => r.self_assessment_required === 1 && !r.self_assessment_summary);

  const metrics: PostureMetric[] = [
    { kind: "gauge", label: "QMS maturity", pct: qmsScore, sublabel: `${qmsRecords.length} policy areas` },
    { kind: "gauge", label: "Conformity passed", pct: highRiskProviderSystems.length ? Math.round((conformityPassedCount / highRiskProviderSystems.length) * 100) : 0, sublabel: `${conformityPassedCount}/${highRiskProviderSystems.length} systems` },
    { kind: "count", label: "EU database registered", value: euDbRegisteredCount, icon: Landmark },
    { kind: "count", label: "CE marking affixed", value: ceAffixedCount },
  ];

  const mustItems: ActionItem[] = [];
  const canItems: ActionItem[] = [];

  for (const r of selfAssessmentGaps) {
    mustItems.push({ id: r.id, label: "Omnibus self-assessment summary missing", detail: "Required for EU database registration under the reinstated Annex VIII field", href: "/provider/eu-database" });
  }
  for (const s of highRiskProviderSystems.filter((s) => conformityBySystem[s.id]?.outcome === "failed")) {
    mustItems.push({ id: `fail-${s.id}`, label: `Conformity assessment failed: ${s.name}`, detail: "Rework required before re-submission", href: "/provider/conformity-assessment" });
  }
  for (const s of highRiskProviderSystems.filter((s) => conformityBySystem[s.id]?.outcome === "passed" && ceBySystem[s.id]?.status !== "affixed")) {
    mustItems.push({ id: `ce-${s.id}`, label: `CE marking not affixed: ${s.name}`, detail: "Conformity passed but CE marking is outstanding", href: "/provider/conformity-assessment" });
  }
  for (const s of highRiskProviderSystems.filter((s) => conformityBySystem[s.id]?.outcome === "passed" && docBySystem[s.id]?.status !== "issued")) {
    mustItems.push({ id: `doc-${s.id}`, label: `Declaration of conformity not issued: ${s.name}`, detail: "Conformity passed but declaration is outstanding", href: "/provider/conformity-assessment" });
  }
  for (const s of highRiskProviderSystems.filter((s) => conformityBySystem[s.id]?.outcome === "in_progress")) {
    canItems.push({ id: `prog-${s.id}`, label: `Conformity assessment in progress: ${s.name}`, href: "/provider/conformity-assessment" });
  }
  for (const q of qmsRecords.filter((q) => q.status === "not_started")) {
    canItems.push({ id: q.id, label: `QMS policy area not started: ${q.policy_area}`, href: "/provider/qms" });
  }

  return (
    <div className="space-y-6">
      <PostureHeader name={user.name} title={user.title} mission={user.mission} metrics={metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <GlassCard>
            <SectionHeading title="Conformity assessment pipeline" subtitle="High-risk provider systems, from assessment start through EU database registration." />
            <Kanban columns={kanbanColumns} />
          </GlassCard>

          <GlassCard>
            <SectionHeading title="CE marking &amp; declaration of conformity" subtitle="Status grid across high-risk provider systems." />
            {highRiskProviderSystems.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No high-risk provider systems in scope.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--panel-border)]">
                      <th className="py-1.5 px-1 font-medium">System</th>
                      <th className="py-1.5 px-1 font-medium">Conformity</th>
                      <th className="py-1.5 px-1 font-medium">CE marking</th>
                      <th className="py-1.5 px-1 font-medium">Declaration</th>
                      <th className="py-1.5 px-1 font-medium">EU database</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskProviderSystems.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--panel-border)] last:border-0">
                        <td className="py-1.5 px-1"><Link href={`/systems/${s.id}`} className="hover:text-aegis-emerald">{s.name}</Link></td>
                        <td className="py-1.5 px-1"><Badge tone={toneForStatus(conformityBySystem[s.id]?.outcome ?? "not_started")}>{(conformityBySystem[s.id]?.outcome ?? "not_started").replace(/_/g, " ")}</Badge></td>
                        <td className="py-1.5 px-1"><Badge tone={toneForStatus(ceBySystem[s.id]?.status ?? "not_started")}>{(ceBySystem[s.id]?.status ?? "not_started").replace(/_/g, " ")}</Badge></td>
                        <td className="py-1.5 px-1"><Badge tone={toneForStatus(docBySystem[s.id]?.status ?? "not_started")}>{(docBySystem[s.id]?.status ?? "not_started").replace(/_/g, " ")}</Badge></td>
                        <td className="py-1.5 px-1"><Badge tone={toneForStatus(euDbBySystem[s.id]?.status ?? "not_started")}>{(euDbBySystem[s.id]?.status ?? "not_started").replace(/_/g, " ")}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link href="/provider/conformity-assessment" className="inline-flex items-center gap-1 text-xs text-aegis-emerald hover:underline mt-3">
              Open conformity assessment workspace <ArrowRight className="h-3 w-3" />
            </Link>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="font-heading font-semibold text-sm">Omnibus self-assessment summary tracker</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Digital Omnibus reinstates the Annex VIII field requiring a self-assessment summary for every EU database registration. {selfAssessmentGaps.length} of {euDbRows.filter((r) => r.self_assessment_required === 1).length || 0} required summaries are outstanding.
            </p>
            <GaugeRing
              pct={
                euDbRows.filter((r) => r.self_assessment_required === 1).length
                  ? Math.round(((euDbRows.filter((r) => r.self_assessment_required === 1).length - selfAssessmentGaps.length) / euDbRows.filter((r) => r.self_assessment_required === 1).length) * 100)
                  : 100
              }
              label="Self-assessment summaries complete"
              size={90}
            />
          </GlassCard>
        </div>

        <div>
          <ActionInbox must={mustItems} can={canItems} />
        </div>
      </div>
    </div>
  );
}
