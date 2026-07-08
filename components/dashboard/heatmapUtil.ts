import type { HeatmapCell, HeatmapItem } from "./widgets/RiskHeatmap";

export interface RiskRow {
  id: string;
  likelihood: number;
  severity: number;
  risk_description: string;
  system_name: string;
  system_id: string;
}

/** Groups flat risk-management rows into the 5x5 (likelihood x severity) cell shape RiskHeatmap expects. */
export function buildHeatmapCells(rows: RiskRow[]): HeatmapCell[] {
  const map = new Map<string, HeatmapCell>();
  for (let l = 1; l <= 5; l++) {
    for (let s = 1; s <= 5; s++) {
      map.set(`${l}-${s}`, { likelihood: l, severity: s, count: 0, items: [] });
    }
  }
  for (const r of rows) {
    const key = `${r.likelihood}-${r.severity}`;
    const cell = map.get(key);
    if (!cell) continue;
    cell.count += 1;
    const item: HeatmapItem = { id: r.id, label: `${r.system_name}: ${r.risk_description}`, href: `/systems/${r.system_id}` };
    if (cell.items.length < 8) cell.items.push(item);
  }
  return Array.from(map.values());
}
