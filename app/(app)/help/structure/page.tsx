"use client";

import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Constellation, ConstellationNode, ConstellationEdge } from "@/components/help/Constellation";
import { InfoPanelHost, HelpNode, useSelection } from "@/components/help/InfoPanel";

const NODES: ConstellationNode[] = [
  { id: "a", label: "A · Foundation & Governance", x: 15, y: 15, color: "#10B981" },
  { id: "b", label: "B · Provider Obligations", x: 50, y: 8, color: "#06B6D4" },
  { id: "c", label: "C · Deployer Obligations", x: 85, y: 15, color: "#8B5CF6" },
  { id: "d", label: "D · Cross-Cutting Operations", x: 78, y: 55, color: "#6366F1" },
  { id: "e", label: "E · Assurance & Reporting", x: 20, y: 55, color: "#F59E0B" },
  { id: "systems", label: "ai_systems (spine)", x: 50, y: 32, color: "#E7E9EE" },
  { id: "agents", label: "Agentic Layer", x: 50, y: 55, color: "#10B981" },
];

const EDGES: ConstellationEdge[] = [
  { from: "systems", to: "a" }, { from: "systems", to: "b" }, { from: "systems", to: "c" },
  { from: "systems", to: "d" }, { from: "systems", to: "e" }, { from: "systems", to: "agents" },
  { from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "a" },
];

const HELP_NODES: HelpNode[] = [
  { id: "a", label: "A · Foundation & Governance", what: "AI System Inventory, Classification & Screening, AI Literacy, and the Governance & Competent Authority Map.", purpose: "Establishes the system-of-record every other module deep-links into, and decides upfront which systems are blocked, out of scope, or high-risk.", article: "Art. 4, 5, 6, 21", whereInApp: [{ label: "AI System Inventory", href: "/systems" }, { label: "Classification & Screening", href: "/classification" }, { label: "Governance Map", href: "/governance" }], relationships: [{ label: "feeds", targetId: "systems" }] },
  { id: "b", label: "B · Provider Obligations Suite", what: "Eleven modules (B1-B11) plus corrective actions (B12) implementing Art. 9-20 and 43-49 for systems Eurobank builds and places on the market in its own name.", purpose: "Only applies where a system is both Provider-role AND high-risk.", article: "Art. 16 umbrella", whereInApp: [{ label: "Provider suite", href: "/provider/risk-management" }] },
  { id: "c", label: "C · Deployer Obligations Suite", what: "Five modules (C1-C5) implementing Art. 26-27 and Art. 85-87 for systems Eurobank uses under its own authority.", purpose: "Only applies where a system is both Deployer-role AND high-risk (C1-C4); C5 individual rights apply more narrowly per request.", article: "Art. 26 umbrella", whereInApp: [{ label: "Deployer suite", href: "/deployer/obligations" }] },
  { id: "d", label: "D · Cross-Cutting Operations", what: "Transparency disclosures, GPAI downstream integration, post-market monitoring, and serious incident reporting.", purpose: "Applies regardless of high-risk classification — the risk-tier-agnostic obligations.", article: "Art. 50, 51-56, 72, 73", whereInApp: [{ label: "Cross-cutting ops", href: "/operations/transparency-certain-systems" }] },
  { id: "e", label: "E · Assurance & Reporting", what: "Internal audit, management review, the obligations traceability matrix, and the penalty exposure reference.", purpose: "Independent assurance layer, read-only into every other module.", article: "Art. 82, 83, 99", whereInApp: [{ label: "Assurance suite", href: "/assurance/obligations-matrix" }] },
  { id: "systems", label: "ai_systems (spine)", what: "The core aggregate every classification, obligation, and evidence record deep-links into.", purpose: "Single system of record for lifecycle stage, value-chain role, and classification status.", whereInApp: [{ label: "AI System Inventory", href: "/systems" }] },
  { id: "agents", label: "Agentic Layer", what: "Nine AI copilots that draft proposals against the real Anthropic API, gated behind human approval.", purpose: "Every write-capable agent produces a PENDING_CONFIRMATION proposal — nothing is committed until a human approves.", whereInApp: [{ label: "Agent runs & proposals", href: "/agents" }] },
];

export default function StructurePage() {
  const [selected, setSelected] = useSelection();
  return (
    <div>
      <SectionHeading title="How Aegis is structured" subtitle="Click any node to see what it is, why it exists, and where to find it." />
      <GlassCard>
        <Constellation nodes={NODES} edges={EDGES} selectedId={selected} onSelect={setSelected} />
      </GlassCard>
      <InfoPanelHost nodes={HELP_NODES} selectedId={selected} onSelect={setSelected} />
    </div>
  );
}
