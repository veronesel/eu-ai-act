import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { PostureHeader, type PostureMetric } from "../widgets/PostureHeader";
import { ActionInbox, type ActionItem } from "../widgets/ActionInbox";
import { AgentProposalList } from "../widgets/AgentProposalList";
import { Wrench, ArrowRight, FileText } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

export function AiProductOwnerDashboard({ user }: { user: SessionUser }) {
  const db = getDb();

  const ownedSystems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 AND owner_persona_id = ? ORDER BY name`).all(user.id) as any[];
  const ownedIds = ownedSystems.map((s) => s.id);
  const inClause = ownedIds.length ? ownedIds.map(() => "?").join(",") : "''";

  const techDocRows = ownedIds.length
    ? (db.prepare(`SELECT system_id, status, COUNT(*) c FROM technical_documentation_sections WHERE system_id IN (${inClause}) GROUP BY system_id, status`).all(...ownedIds) as any[])
    : [];
  const techDocTotal = techDocRows.reduce((sum, r) => sum + r.c, 0);
  const techDocApproved = techDocRows.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.c, 0);
  const techDocPct = techDocTotal ? Math.round((techDocApproved / techDocTotal) * 100) : 0;

  const conformityRows = ownedIds.length ? (db.prepare(`SELECT system_id, outcome FROM conformity_assessments WHERE system_id IN (${inClause})`).all(...ownedIds) as any[]) : [];
  const conformityBySystem = Object.fromEntries(conformityRows.map((r) => [r.system_id, r.outcome]));
  const highRiskOwned = ownedSystems.filter((s) => s.classification_status === "high_risk");
  const conformityPassed = highRiskOwned.filter((s) => conformityBySystem[s.id] === "passed").length;

  const openRisks = ownedIds.length ? (db.prepare(`SELECT r.*, s.name as system_name FROM risk_management_records r JOIN ai_systems s ON s.id = r.system_id WHERE r.system_id IN (${inClause}) AND r.status = 'open' ORDER BY r.next_review_at ASC`).all(...ownedIds) as any[]) : [];

  const openCorrective = ownedIds.length
    ? (db.prepare(`SELECT ca.*, s.name as system_name FROM corrective_actions ca JOIN ai_systems s ON s.id = ca.system_id WHERE ca.system_id IN (${inClause}) AND ca.status != 'closed' ORDER BY ca.created_at DESC`).all(...ownedIds) as any[])
    : [];

  const proposalsRaw = db.prepare(`SELECT id, agent_key, proposal_summary, target_record_type, status, approver_role_required, created_at, system_id FROM agent_proposals ORDER BY created_at DESC`).all() as any[];
  const techDocProposals = proposalsRaw.filter((p) => /document/i.test(p.agent_key) || /technical_doc/i.test(p.target_record_type));

  const metrics: PostureMetric[] = [
    { kind: "count", label: "Systems owned", value: ownedSystems.length, icon: FileText },
    { kind: "gauge", label: "Tech-doc sections approved", pct: techDocPct, sublabel: `${techDocApproved}/${techDocTotal} sections` },
    { kind: "count", label: "Open corrective actions", value: openCorrective.length, tone: openCorrective.length > 0 ? "danger" : "success", icon: Wrench },
    { kind: "gauge", label: "Conformity passed (high-risk)", pct: highRiskOwned.length ? Math.round((conformityPassed / highRiskOwned.length) * 100) : 0, sublabel: `${conformityPassed}/${highRiskOwned.length} systems` },
  ];

  const mustItems: ActionItem[] = [];
  const canItems: ActionItem[] = [];

  for (const ca of openCorrective) {
    mustItems.push({
      id: ca.id,
      label: `Corrective action: ${ca.non_conformity_description}`,
      detail: `${ca.system_name} - ${ca.status}${ca.poses_health_safety_risk ? " - health/safety risk flagged" : ""}`,
      href: "/provider/corrective-actions",
    });
  }
  for (const r of openRisks.filter((r) => r.next_review_at && daysUntil(r.next_review_at)! < 0)) {
    mustItems.push({ id: r.id, label: `Overdue risk review: ${r.risk_description}`, detail: `${r.system_name} - was due ${formatDate(r.next_review_at)}`, href: "/provider/risk-management" });
  }
  for (const p of techDocProposals.filter((p) => p.status === "pending")) {
    canItems.push({ id: p.id, label: p.proposal_summary, detail: `${p.agent_key} - technical documentation draft awaiting review`, href: "/agents" });
  }
  for (const r of openRisks.filter((r) => !r.next_review_at || daysUntil(r.next_review_at)! >= 0).slice(0, 5)) {
    canItems.push({ id: r.id, label: `Open risk item: ${r.risk_description}`, detail: `${r.system_name} - next review ${formatDate(r.next_review_at)}`, href: "/provider/risk-management" });
  }

  return (
    <div className="space-y-6">
      <PostureHeader name={user.name} title={user.title} mission={user.mission} metrics={metrics} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <GlassCard>
            <SectionHeading title="System lifecycle rail" subtitle="Systems Eurobank builds and owns as Provider. Open a system for the full lifecycle stepper." />
            {ownedSystems.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No owned provider-role systems found.</p>
            ) : (
              <ul className="space-y-2">
                {ownedSystems.map((s) => (
                  <li key={s.id}>
                    <Link href={`/systems/${s.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--panel-border)] bg-white/[0.02] hover:bg-white/[0.05] transition-colors px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] capitalize">{s.lifecycle_stage.replace(/_/g, " ")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge tone={toneForStatus(s.classification_status)}>{s.classification_status.replace(/_/g, " ")}</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard>
            <SectionHeading title="Technical documentation completeness" subtitle="Annex IV section status across owned systems." />
            {ownedSystems.map((s) => {
              const rows = techDocRows.filter((r) => r.system_id === s.id);
              const total = rows.reduce((sum, r) => sum + r.c, 0);
              if (total === 0) return null;
              const approved = rows.find((r) => r.status === "approved")?.c ?? 0;
              const pending = rows.find((r) => r.status === "agent_drafted_pending_review")?.c ?? 0;
              const draft = rows.find((r) => r.status === "draft")?.c ?? 0;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-[var(--panel-border)] last:border-0">
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 text-[var(--text-muted)]">
                    <span className="text-emerald-400 font-medium">{approved} approved</span> &middot; <span className="text-sky-400">{pending} pending review</span> &middot; <span className="text-[var(--text-muted)]">{draft} draft</span> / {total}
                  </span>
                </div>
              );
            })}
          </GlassCard>
        </div>

        <div>
          <ActionInbox must={mustItems} can={canItems} />
        </div>
      </div>

      <GlassCard>
        <SectionHeading title="Agent proposal queue - technical documentation drafts" subtitle="Agent-drafted Annex IV sections awaiting your review and approval." />
        <AgentProposalList proposals={techDocProposals} emptyText="No technical documentation agent proposals yet." />
      </GlassCard>
    </div>
  );
}
