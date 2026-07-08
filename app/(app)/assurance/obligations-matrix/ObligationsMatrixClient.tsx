"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Download, Search } from "lucide-react";

interface ObligationRow {
  id: string;
  article_ref: string;
  obligation: string;
  owning_module: string;
  owning_module_path: string | null;
  primary_persona: string;
  is_not_applicable: number;
  not_applicable_rationale: string | null;
  evidence_status: "not_applicable" | "no_evidence" | "partial" | "complete";
}

const EVIDENCE_TONE: Record<string, BadgeTone> = {
  not_applicable: "neutral",
  no_evidence: "danger",
  partial: "warning",
  complete: "success",
};

const EVIDENCE_LABEL: Record<string, string> = {
  not_applicable: "not applicable",
  no_evidence: "no evidence",
  partial: "partial evidence",
  complete: "evidenced",
};

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function ObligationsMatrixClient({ rows }: { rows: ObligationRow[] }) {
  const [articleQuery, setArticleQuery] = useState("");
  const [persona, setPersona] = useState("all");
  const [evidenceFilter, setEvidenceFilter] = useState("all");

  const personas = useMemo(() => Array.from(new Set(rows.map((r) => r.primary_persona))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = articleQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.article_ref.toLowerCase().includes(q) && !r.obligation.toLowerCase().includes(q)) return false;
      if (persona !== "all" && r.primary_persona !== persona) return false;
      if (evidenceFilter !== "all" && r.evidence_status !== evidenceFilter) return false;
      return true;
    });
  }, [rows, articleQuery, persona, evidenceFilter]);

  function exportCsv() {
    const header = ["Article", "Obligation", "Owning module", "Path", "Primary persona", "Evidence status", "N/A rationale"];
    const lines = [header, ...filtered.map((r) => [
      r.article_ref, r.obligation, r.owning_module, r.owning_module_path ?? "", r.primary_persona,
      EVIDENCE_LABEL[r.evidence_status], r.not_applicable_rationale ?? "",
    ])].map((cols) => cols.map((c) => csvEscape(String(c))).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-obligations-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-[var(--text-muted)]">Search article / obligation</label>
            <div className="relative mt-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
              <input
                className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] pl-8 pr-3 py-2 text-sm"
                placeholder="e.g. Art. 9, or &quot;data governance&quot;"
                value={articleQuery}
                onChange={(e) => setArticleQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Owning persona</label>
            <select className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={persona} onChange={(e) => setPersona(e.target.value)}>
              <option value="all">All personas</option>
              {personas.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Evidence status</label>
            <select className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={evidenceFilter} onChange={(e) => setEvidenceFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="not_applicable">Not applicable</option>
              <option value="no_evidence">No evidence</option>
              <option value="partial">Partial evidence</option>
              <option value="complete">Evidenced</option>
            </select>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-white/5">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Showing {filtered.length} of {rows.length} obligations. Evidence status combines any recorded evidence links with a live heuristic read of the owning module&apos;s underlying records — it is a coverage signal, not a certification.
        </p>
      </GlassCard>

      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--panel-border)]">
              <th className="px-4 py-3 font-medium">Article</th>
              <th className="px-4 py-3 font-medium">Obligation</th>
              <th className="px-4 py-3 font-medium">Owning module</th>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[var(--panel-border)] last:border-0 hover:bg-white/5">
                <td className="px-4 py-3 font-medium whitespace-nowrap align-top">{r.article_ref}</td>
                <td className="px-4 py-3 align-top max-w-md">
                  {r.obligation}
                  {r.is_not_applicable === 1 && r.not_applicable_rationale && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">{r.not_applicable_rationale}</div>
                  )}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  {r.owning_module_path && r.owning_module_path !== "/help/regulatory-context" ? (
                    <Link href={r.owning_module_path} className="text-aegis-emerald hover:underline">{r.owning_module}</Link>
                  ) : (
                    <span className="text-[var(--text-secondary)]">{r.owning_module}</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-[var(--text-secondary)]">{r.primary_persona.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <Badge tone={EVIDENCE_TONE[r.evidence_status]}>{EVIDENCE_LABEL[r.evidence_status]}</Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No obligations match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
