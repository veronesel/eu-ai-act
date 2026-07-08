"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/Glass";
import { FlowDiagram, FlowState, FlowTransition } from "@/components/help/FlowDiagram";

const WORKFLOWS: Record<string, { title: string; states: FlowState[]; transitions: FlowTransition[] }> = {
  classification: {
    title: "Classification & Screening (A2)",
    states: [
      { id: "not_screened", label: "Not screened" },
      { id: "screening_in_progress", label: "Screening in progress" },
      { id: "high_risk", label: "High-risk", tone: "success" },
      { id: "not_high_risk", label: "Not high-risk", tone: "success" },
      { id: "prohibited_blocked", label: "Prohibited — blocked", tone: "danger" },
    ],
    transitions: [
      { from: "not_screened", to: "screening_in_progress", label: "screening starts", who: "REG_COMPLIANCE_LEAD" },
      { from: "screening_in_progress", to: "high_risk", label: "Annex III match, no exception", who: "REG_COMPLIANCE_LEAD" },
      { from: "screening_in_progress", to: "not_high_risk", label: "no match / exception applies", who: "REG_COMPLIANCE_LEAD" },
      { from: "screening_in_progress", to: "prohibited_blocked", label: "Art.5 limb fails", who: "system (hard stop)" },
    ],
  },
  conformity: {
    title: "Conformity Assessment (B9→B10→B11)",
    states: [
      { id: "not_started", label: "Not started" },
      { id: "in_progress", label: "In progress" },
      { id: "passed", label: "Passed" },
      { id: "registered", label: "EU database registered", tone: "success" },
    ],
    transitions: [
      { from: "not_started", to: "in_progress", label: "checklist opened", who: "QUALITY_CONFORMITY_MGR" },
      { from: "in_progress", to: "passed", label: "all items evidenced", who: "QUALITY_CONFORMITY_MGR" },
      { from: "passed", to: "registered", label: "DoC + CE + EU DB filed", who: "QUALITY_CONFORMITY_MGR" },
    ],
  },
  fria: {
    title: "FRIA (C2)",
    states: [
      { id: "not_started", label: "Not triggered / not started" },
      { id: "in_progress", label: "In progress" },
      { id: "complete", label: "Complete", tone: "success" },
      { id: "notified", label: "Authority notified", tone: "success" },
    ],
    transitions: [
      { from: "not_started", to: "in_progress", label: "trigger fires (Art.27)", who: "DEPLOYER_OPS_MGR" },
      { from: "in_progress", to: "complete", label: "sections completed", who: "DEPLOYER_OPS_MGR" },
      { from: "complete", to: "notified", label: "Art.27(3) filing", who: "DEPLOYER_OPS_MGR" },
    ],
  },
  incident: {
    title: "Serious Incident Reporting (D4)",
    states: [
      { id: "detected", label: "Detected" },
      { id: "classified", label: "Classified" },
      { id: "reporting_drafted", label: "Reporting drafted" },
      { id: "reported", label: "Reported", tone: "success" },
      { id: "closed", label: "Closed", tone: "success" },
    ],
    transitions: [
      { from: "detected", to: "classified", label: "severity tier set", who: "DEPLOYER_OPS_MGR" },
      { from: "classified", to: "reporting_drafted", label: "report drafted", who: "DEPLOYER_OPS_MGR / agent proposal" },
      { from: "reporting_drafted", to: "reported", label: "filed with authority", who: "DEPLOYER_OPS_MGR" },
      { from: "reported", to: "closed", label: "closeout", who: "DEPLOYER_OPS_MGR" },
    ],
  },
  agent: {
    title: "Agent Proposal → Approval (§11)",
    states: [
      { id: "run", label: "Agent run" },
      { id: "pending", label: "Pending confirmation" },
      { id: "approved", label: "Approved — committed", tone: "success" },
      { id: "rejected", label: "Rejected", tone: "danger" },
    ],
    transitions: [
      { from: "run", to: "pending", label: "tool-use loop ends", who: "system" },
      { from: "pending", to: "approved", label: "human approves", who: "owning persona / EXEC_SPONSOR" },
      { from: "pending", to: "rejected", label: "human rejects", who: "owning persona / EXEC_SPONSOR" },
    ],
  },
};

export function WorkflowsClient() {
  const [active, setActive] = useState("classification");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const wf = WORKFLOWS[active];
  const selectedTransitions = wf.transitions.filter((t) => t.from === selectedState || t.to === selectedState);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(WORKFLOWS).map(([key, w]) => (
          <button
            key={key}
            onClick={() => { setActive(key); setSelectedState(null); }}
            className={`text-xs rounded-lg px-3 py-1.5 border ${active === key ? "border-aegis-emerald bg-aegis-emerald/10 text-aegis-emerald" : "border-[var(--panel-border)] text-[var(--text-secondary)]"}`}
          >
            {w.title}
          </button>
        ))}
      </div>
      <GlassCard>
        <h3 className="font-heading font-semibold mb-2">{wf.title}</h3>
        <FlowDiagram states={wf.states} transitions={wf.transitions} selectedId={selectedState} onSelect={setSelectedState} />
        {selectedState && (
          <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
            {selectedTransitions.map((t, i) => (
              <div key={i}>Transition <strong>{t.label}</strong> — who can act: <span className="text-aegis-emerald">{t.who}</span></div>
            ))}
            {selectedTransitions.length === 0 && <div className="text-[var(--text-muted)]">Terminal or starting state.</div>}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
