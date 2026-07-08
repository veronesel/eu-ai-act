"use client";

import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Constellation, ConstellationNode, ConstellationEdge } from "@/components/help/Constellation";
import { InfoPanelHost, HelpNode, useSelection } from "@/components/help/InfoPanel";

const NODES: ConstellationNode[] = [
  { id: "ai_systems", label: "ai_systems", x: 50, y: 30, color: "#E7E9EE" },
  { id: "classification", label: "classification & screening", x: 15, y: 12 },
  { id: "provider", label: "Provider suite tables", x: 50, y: 8 },
  { id: "deployer", label: "Deployer suite tables", x: 85, y: 12 },
  { id: "ops", label: "Cross-cutting ops tables", x: 85, y: 50 },
  { id: "assurance", label: "Assurance tables", x: 15, y: 50 },
  { id: "agents", label: "agent_runs / agent_proposals", x: 50, y: 55 },
  { id: "obligations", label: "regulatory_obligations_matrix", x: 50, y: 5 },
];

const EDGES: ConstellationEdge[] = [
  { from: "ai_systems", to: "classification" }, { from: "ai_systems", to: "provider" },
  { from: "ai_systems", to: "deployer" }, { from: "ai_systems", to: "ops" },
  { from: "ai_systems", to: "assurance" }, { from: "ai_systems", to: "agents" },
  { from: "obligations", to: "provider" }, { from: "obligations", to: "deployer" }, { from: "obligations", to: "ops" },
];

const HELP_NODES: HelpNode[] = [
  { id: "ai_systems", label: "ai_systems", what: "The central aggregate: name, description, lifecycle stage, provider/deployer role flags, classification status, Annex III category, GPAI flags.", purpose: "Every other table foreign-keys to this one.", whereInApp: [{ label: "System inventory", href: "/systems" }] },
  { id: "classification", label: "Classification tables", what: "prohibited_practice_screenings, high_risk_determinations, regulatory_challenges.", purpose: "Decide, per system, whether it's blocked, out of scope, or high-risk — gates everything else.", whereInApp: [{ label: "Classification", href: "/classification" }] },
  { id: "provider", label: "Provider suite tables", what: "risk_management_records, data_governance_records, technical_documentation_sections, conformity_assessments, eu_database_registrations, corrective_actions, and more.", purpose: "Evidence for Art. 9-20 and 43-49 Provider obligations.", whereInApp: [{ label: "Provider suite", href: "/provider/risk-management" }] },
  { id: "deployer", label: "Deployer suite tables", what: "deployer_obligation_checklists, fria_assessments, human_oversight_operations, deployer_logs, complaints, explanation_requests.", purpose: "Evidence for Art. 26-27 and Art. 85-87 Deployer obligations.", whereInApp: [{ label: "Deployer suite", href: "/deployer/obligations" }] },
  { id: "ops", label: "Cross-cutting ops tables", what: "transparency_disclosures, gpai_integrations, post_market_monitoring_plans/events, serious_incidents.", purpose: "Risk-tier-agnostic obligations that apply regardless of classification.", whereInApp: [{ label: "Cross-cutting ops", href: "/operations/transparency-certain-systems" }] },
  { id: "assurance", label: "Assurance tables", what: "internal_audit_engagements, audit_findings, management_review_records, regulatory_obligations_matrix.", purpose: "Independent, read-only assurance layer over everything else.", whereInApp: [{ label: "Assurance suite", href: "/assurance/obligations-matrix" }] },
  { id: "agents", label: "agent_runs / agent_proposals", what: "Every agent invocation and every proposal it produced, with approval status.", purpose: "The human-in-the-loop audit trail for AI-assisted actions.", whereInApp: [{ label: "Agents", href: "/agents" }] },
  { id: "obligations", label: "regulatory_obligations_matrix", what: "The explicit regulation → article → obligation → owning module → persona chain.", purpose: "The traceability spine linking every table above back to a specific article.", whereInApp: [{ label: "Obligations matrix", href: "/assurance/obligations-matrix" }] },
];

export default function EntityMapPage() {
  const [selected, setSelected] = useSelection();
  return (
    <div>
      <SectionHeading title="Entity map" subtitle="ER-style map of the core data aggregates. Click a node for details." />
      <GlassCard><Constellation nodes={NODES} edges={EDGES} selectedId={selected} onSelect={setSelected} /></GlassCard>
      <InfoPanelHost nodes={HELP_NODES} selectedId={selected} onSelect={setSelected} />
    </div>
  );
}
