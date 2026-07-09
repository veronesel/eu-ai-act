import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { formatDate } from "@/lib/utils";
import { PostureHeader, type PostureMetric } from "../widgets/PostureHeader";
import { ActionInbox, type ActionItem } from "../widgets/ActionInbox";
import { GaugeRing } from "../widgets/GaugeRing";
import { AgentProposalList } from "../widgets/AgentProposalList";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function DataGovernanceLeadDashboard({ user }: { user: SessionUser }) {
  const db = getDb();

  const datasets = db
    .prepare(`SELECT dg.*, s.name as system_name FROM data_governance_records dg JOIN ai_systems s ON s.id = dg.system_id ORDER BY dg.updated_at DESC`)
    .all() as any[];

  const total = datasets.length;
  const qualityChecked = datasets.filter((d) => d.quality_checks_run && d.quality_checks_run.trim().length > 0).length;
  const qualityPct = total ? Math.round((qualityChecked / total) * 100) : 0;

  const biasExamined = datasets.filter((d) => d.bias_characteristics_examined && d.bias_characteristics_examined.trim().length > 0).length;
  const biasPct = total ? Math.round((biasExamined / total) * 100) : 0;

  const lawfulBasisDocumented = datasets.filter((d) => d.special_category_basis_necessity_rationale && d.special_category_basis_necessity_rationale.trim().length > 0).length;

  const flaggedGaps = datasets.filter((d) => d.quality_gaps && d.quality_gaps.trim().length > 0 && !/^no material gaps/i.test(d.quality_gaps.trim()));

  const proposalsRaw = db.prepare(`SELECT id, agent_key, proposal_summary, target_record_type, status, approver_role_required, created_at FROM agent_proposals ORDER BY created_at DESC`).all() as any[];
  const dataProposals = proposalsRaw.filter((p) => /data/i.test(p.agent_key) || /data_governance/i.test(p.target_record_type));

  const metrics: PostureMetric[] = [
    { kind: "count", label: "Datasets tracked", value: total },
    { kind: "gauge", label: "Quality-check coverage", pct: qualityPct, sublabel: `${qualityChecked}/${total} datasets` },
    { kind: "gauge", label: "Bias examined", pct: biasPct, sublabel: `${biasExamined}/${total} datasets` },
    { kind: "count", label: "Flagged remediation gaps", value: flaggedGaps.length, tone: flaggedGaps.length > 0 ? "warning" : "success", icon: AlertTriangle },
  ];

  const mustItems: ActionItem[] = flaggedGaps.map((d) => ({
    id: d.id,
    label: `Quality gap: ${d.dataset_name}`,
    detail: `${d.system_name} - ${d.quality_gaps}`,
    href: "/provider/data-governance",
  }));

  const canItems: ActionItem[] = [];
  for (const p of dataProposals.filter((p) => p.status === "pending")) {
    canItems.push({ id: p.id, label: p.proposal_summary, detail: `${p.agent_key} - awaiting review`, href: "/agents" });
  }
  for (const d of datasets.filter((d) => !d.special_category_basis_necessity_rationale || d.special_category_basis_necessity_rationale.trim().length === 0).slice(0, 5)) {
    canItems.push({ id: `basis-${d.id}`, label: `No special-category basis recorded: ${d.dataset_name}`, detail: d.system_name, href: "/provider/data-governance" });
  }

  return (
    <div className="space-y-6">
      <PostureHeader name={user.name} title={user.title} mission={user.mission} metrics={metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard className="flex items-center justify-center py-6">
              <GaugeRing pct={qualityPct} label="Quality checks run" sublabel={`${qualityChecked}/${total}`} size={100} />
            </GlassCard>
            <GlassCard className="flex items-center justify-center py-6">
              <GaugeRing pct={biasPct} label="Bias examined" sublabel={`${biasExamined}/${total}`} size={100} />
            </GlassCard>
            <GlassCard className="flex flex-col items-center justify-center text-center py-6 gap-2">
              <ShieldCheck className="h-6 w-6 text-aegis-emerald" />
              <div className="font-heading text-2xl font-semibold">{lawfulBasisDocumented}/{total}</div>
              <div className="text-xs text-[var(--text-secondary)]">Special-category lawful-basis rationale documented</div>
            </GlassCard>
          </div>

          <GlassCard>
            <SectionHeading title="Bias-examination status by dataset" subtitle="Which training/validation/test datasets have had bias characteristics examined." />
            <ul className="space-y-1.5">
              {datasets.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-xs border-b border-[var(--panel-border)] pb-1.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-medium">{d.dataset_name}</span>
                    <span className="text-[var(--text-muted)]"> ({d.purpose}) &middot; {d.system_name}</span>
                  </div>
                  <span className={`shrink-0 font-medium ${d.bias_characteristics_examined ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                    {d.bias_characteristics_examined ? "Examined" : "Not examined"}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/provider/data-governance" className="inline-flex items-center gap-1 text-xs text-aegis-emerald hover:underline mt-3">
              Open data governance register <ArrowRight className="h-3 w-3" />
            </Link>
          </GlassCard>

          <GlassCard>
            <SectionHeading title="Gaps &amp; remediation" subtitle="Datasets with an open quality gap flagged in the latest review." />
            {flaggedGaps.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No open data-quality gaps flagged.</p>
            ) : (
              <ul className="space-y-2">
                {flaggedGaps.map((d) => (
                  <li key={d.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-xs font-medium">{d.dataset_name} &middot; {d.system_name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{d.quality_gaps}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Last updated {formatDate(d.updated_at)}</p>
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

      <GlassCard>
        <SectionHeading title="Agent proposal queue - data governance" subtitle="Agent proposals touching dataset quality, bias, or lawful-basis records." />
        <AgentProposalList proposals={dataProposals} emptyText="No data governance agent proposals yet." />
      </GlassCard>
    </div>
  );
}
