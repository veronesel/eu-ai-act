"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck, ShieldAlert, Flame } from "lucide-react";

export interface HeatmapItem {
  id: string;
  label: string;
  href?: string;
}

export interface HeatmapCell {
  likelihood: number; // 1-5
  severity: number; // 1-5
  count: number;
  items: HeatmapItem[];
}

/** Hand-rolled 5x5 likelihood x severity heatmap. Optionally interactive (click to inspect a cell). */
export function RiskHeatmap({ cells, interactive = false }: { cells: HeatmapCell[]; interactive?: boolean }) {
  const [selected, setSelected] = useState<{ likelihood: number; severity: number } | null>(null);
  const byKey = new Map(cells.map((c) => [`${c.likelihood}-${c.severity}`, c]));
  const maxCount = Math.max(1, ...cells.map((c) => c.count));

  const selectedCell = selected ? byKey.get(`${selected.likelihood}-${selected.severity}`) : null;

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-[10px] text-[var(--text-muted)] py-1 pr-1">
          <span className="rotate-0 self-end">Sev 5</span>
          <span className="self-end">4</span>
          <span className="self-end">3</span>
          <span className="self-end">2</span>
          <span className="self-end">Sev 1</span>
        </div>
        <div className="flex-1 grid grid-cols-5 gap-1">
          {[5, 4, 3, 2, 1].map((severity) =>
            [1, 2, 3, 4, 5].map((likelihood) => {
              const cell = byKey.get(`${likelihood}-${severity}`);
              const count = cell?.count ?? 0;
              const intensity = count / maxCount;
              const riskScore = likelihood * severity;
              const isSelected = selected?.likelihood === likelihood && selected?.severity === severity;
              const bg =
                count === 0
                  ? "rgba(148,163,184,0.06)"
                  : riskScore >= 15
                  ? `rgba(244,63,94,${0.25 + intensity * 0.55})`
                  : riskScore >= 8
                  ? `rgba(245,158,11,${0.25 + intensity * 0.55})`
                  : `rgba(16,185,129,${0.2 + intensity * 0.5})`;
              return (
                <button
                  key={`${likelihood}-${severity}`}
                  type="button"
                  disabled={!interactive || count === 0}
                  onClick={() => setSelected(isSelected ? null : { likelihood, severity })}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs font-semibold transition-all ${
                    interactive && count > 0 ? "cursor-pointer hover:scale-105" : "cursor-default"
                  } ${isSelected ? "ring-2 ring-aegis-emerald" : ""}`}
                  style={{ background: bg }}
                  title={`Likelihood ${likelihood} x Severity ${severity}: ${count} risk(s)`}
                >
                  {count > 0 ? count : ""}
                </button>
              );
            })
          )}
          <div className="col-span-5 grid grid-cols-5 text-center text-[10px] text-[var(--text-muted)] mt-1">
            <span>L1</span>
            <span>L2</span>
            <span>L3</span>
            <span>L4</span>
            <span>L5</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Low</span>
        <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-amber-400" /> Elevated</span>
        <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-rose-400" /> Critical</span>
        {interactive && <span className="ml-auto italic">Click a cell to inspect</span>}
      </div>

      {interactive && selectedCell && selectedCell.count > 0 && (
        <div className="mt-3 rounded-lg border border-[var(--panel-border)] bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Likelihood {selectedCell.likelihood} &times; Severity {selectedCell.severity} &mdash; {selectedCell.count} risk record{selectedCell.count === 1 ? "" : "s"}
          </div>
          <ul className="space-y-1">
            {selectedCell.items.map((it) => (
              <li key={it.id} className="text-xs text-[var(--text-secondary)]">
                {it.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
