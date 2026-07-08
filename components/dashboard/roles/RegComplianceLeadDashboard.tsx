import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { PostureHeader, type PostureMetric } from "../widgets/PostureHeader";
import { ActionInbox, type ActionItem } from "../widgets/ActionInbox";
import { Funnel, type FunnelStage } from "../widgets/Funnel";
import { AgentProposalList } from "../widgets/AgentProposalList";
import { GaugeRing } from "../widgets/GaugeRing";
import { Building2, ArrowRight, Gavel } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function RegComplianceLeadDashboard({ user }: { user: SessionUser }) {
  const db = getDb();

  const systems = db.prepare(`SELECT id, classification_status FROM ai_systems`).all() as any[];
  const determinations = db.prepare(`SELECT system_id, final_determination FROM high_risk_determinations`).all() as any[];
  const detBySystem = Object.fromEntries(determinations.map((d) => [d.system_id, d.final_determination]));

  const funnelCounts = {
    not_screened: systems.filter((s) => s.classification_status === "not_screened").length,
    screening_in_progress: systems.filter((s) => s.classification_status === "screening_in_progress").length,
    out_of_scope: systems.filter((s) => detBySystem[s.id] === "out_of_scope").length,
    not_high_risk: systems.filter((s) => s.classification_status === "not_high_risk" && detBySystem[s.id] !== "out_of_scope").length,
    high_risk: systems.filter((s) => s.classification_status === "high_risk").length,
    prohibited_blocked: systems.filter((s) => s.classification_status === "prohibited_blocked").length,
  };
  const funnelStages: FunnelStage[] = [
    { label: "Not screened", value: funnelCounts.not_screened, tone: "neutral" },
    { label: "Screening in progress", value: funnelCounts.screening_in_progress, tone: "info" },
    { label: "Out of scope", value: funnelCounts.out_of_scope, tone: "neutral" },
    { label: "Not high-risk", value: funnelCounts.not_high_risk, tone: "success" },
    { label: "High-risk", value: funnelCounts.high_risk, tone: "warning" },
    { label: "Prohibited - blocked", value: funnelCounts.prohibited_blocked, tone: "danger" },
  ];

  // Obligations matrix completeness (rough): applicable obligations with at least one linked evidence record
  const obligations = db.prepare(`SELECT id, article_ref, obligation, is_not_applicable FROM regulatory_obligations_matrix`).all() as any[];
  const applicable = obligations.filter((o) => !o.is_not_applicable);
  const evidenceRows = db.prepare(`SELECT DISTINCT obligation_id FROM obligation_evidence_links WHERE status IN ('partial','complete')`).all() as any[];
  const withEvidence = new Set(evidenceRows.map((r) => r.obligation_id));
  const applicableWithEvidence = applicable.filter((o) => withEvidence.has(o.id)).length;
  const obligationsPct = applicable.length ? Math.round((applicableWithEvidence / applicable.length) * 100) : 0;

  const changeWatch = db.prepare(`SELECT * FROM regulatory_change_watch ORDER BY created_at DESC LIMIT 5`).all() as any[];

  const proposalsRaw = db.prepare(`SELECT id, agent_key, proposal_summary, target_record_type, status, approver_role_required, created_at FROM agent_proposals ORDER BY created_at DESC`).all() as any[];
  const classificationProposals = proposalsRaw.filter((p) => /classif|document/i.test(p.agent_key));

  const openAuthorityRequests = db.prepare(`SELECT * FROM authority_information_requests WHERE status IN ('open','overdue') ORDER BY response_due_at ASC`).all() as any[];
  const pendingChallenges = db.prepare(`SELECT rc.*, s.name as system_name FROM regulatory_challenges rc JOIN ai_systems s ON s.id = rc.system_id WHERE rc.outcome = 'pending' ORDER BY rc.response_due_at ASC`).all() as any[];

  const openRegulatoryItems = openAuthorityRequests.length + pendingChallenges.length;

  const metrics: PostureMetric[] = [
    { kind: "gauge", label: "Screening coverage", pct: systems.length ? Math.round(((systems.length - funnelCounts.not_screened - funnelCounts.screening_in_progress) / systems.length) * 100) : 0, sublabel: `${systems.length} systems total` },
    { kind: "count", label: "High-risk", value: funnelCounts.high_risk, tone: "warning" },
    { kind: "count", label: "Prohibited - blocked", value: funnelCounts.prohibited_blocked, tone: funnelCounts.prohibited_blocked > 0 ? "danger" : "success" },
    { kind: "count", label: "Open regulatory items", value: openRegulatoryItems, tone: openRegulatoryItems > 0 ? "warning" : "success" },
  ];

  const mustItems: ActionItem[] = [];
  const canItems: ActionItem[] = [];

  for (const r of openAuthorityRequests) {
    const d = daysUntil(r.response_due_at);
    mustItems.push({ id: r.id, label: `Authority information request from ${r.authority}`, detail: `${d !== null && d < 0 ? "Overdue" : "Due"} ${formatDate(r.response_due_at)} - SLA ${r.sla_days}d`, href: "/governance" });
  }
  for (const c of pendingChallenges) {
    mustItems.push({ id: c.id, label: `Regulatory challenge on ${c.system_name}`, detail: `Response due ${formatDate(c.response_due_at)}`, href: `/classification/${c.system_id}` });
  }
  for (const p of classificationProposals.filter((p) => p.status === "pending")) {
    canItems.push({ id: p.id, label: p.proposal_summary, detail: `${p.agent_key} - awaiting review`, href: "/agents" });
  }
  for (const c of changeWatch.filter((c) => c.status === "draft")) {
    canItems.push({ id: c.id, label: c.title, detail: `${c.instrument} - draft, monitor for adoption`, href: "/governance" });
  }

  return (
    <div className="space-y-6">
      <PostureHeader name={user.name} title={user.title} mission={user.mission} metrics={metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <GlassCard>
            <SectionHeading title="Classification funnel" subtitle="Where every system in the portfolio sits in the Art. 5 / Art. 6 screening state machine." />
            <Funnel stages={funnelStages} />
          </GlassCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard className="flex flex-col items-center justify-center text-center gap-2">
              <GaugeRing pct={obligationsPct} label="Obligations matrix evidence" sublabel={`${applicableWithEvidence}/${applicable.length} applicable obligations`} size={100} />
              <Link href="/assurance/obligations-matrix" className="text-xs text-aegis-emerald hover:underline inline-flex items-center gap-1">
                Open obligations matrix <ArrowRight className="h-3 w-3" />
              </Link>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-aegis-teal" />
                <h3 className="font-heading font-semibold text-sm">Competent authority map</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Banca d&apos;Italia relationship, information requests, and cooperation channel status for the AI Office and national market-surveillance authority.
              </p>
              <Link href="/governance" className="inline-flex items-center gap-1 text-sm text-aegis-emerald hover:underline">
                Open governance workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </GlassCard>
          </div>

          <GlassCard>
            <SectionHeading title="Regulatory change watch" subtitle="Latest tracked instruments affecting the AI Act obligations model." />
            {changeWatch.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No regulatory change entries recorded.</p>
            ) : (
              <ul className="space-y-2.5">
                {changeWatch.map((c) => (
                  <li key={c.id} className="border-b border-[var(--panel-border)] pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">{c.title}</span>
                      <Badge tone={toneForStatus(c.status)}>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{c.instrument} &middot; {c.date_basis}</p>
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
        <div className="flex items-center gap-2 mb-1">
          <Gavel className="h-4 w-4 text-aegis-indigo" />
          <h3 className="font-heading font-semibold text-sm">Agent proposal queue - classification &amp; documentation</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-3">Proposals from agents working on classification or documentation drafting tasks, surfaced here for your review.</p>
        <AgentProposalList proposals={classificationProposals} emptyText="No classification or documentation agent proposals yet." />
      </GlassCard>
    </div>
  );
}
