"use client";

export interface ConstellationNode {
  id: string;
  label: string;
  x: number; // 0-100
  y: number; // 0-100
  color?: string;
}
export interface ConstellationEdge {
  from: string;
  to: string;
  label?: string;
}

const COLORS = ["#10B981", "#06B6D4", "#8B5CF6", "#6366F1", "#F59E0B"];

export function Constellation({
  nodes,
  edges,
  selectedId,
  onSelect,
  height = 420,
}: {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 100 60" className="w-full" style={{ height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {edges.map((e, i) => {
        const a = byId[e.from];
        const b = byId[e.to];
        if (!a || !b) return null;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y * 0.6} x2={b.x} y2={b.y * 0.6} stroke="url(#edge-grad)" strokeWidth="0.3" />
            {e.label && (
              <g>
                <rect x={midX - 8} y={midY * 0.6 - 2.2} width="16" height="4" rx="1" fill="rgba(5,8,16,0.85)" />
                <text x={midX} y={midY * 0.6 + 0.7} fontSize="1.6" textAnchor="middle" fill="#9AA4B2">{e.label}</text>
              </g>
            )}
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const color = n.color ?? COLORS[i % COLORS.length];
        const isSelected = selectedId === n.id;
        return (
          <g key={n.id} onClick={() => onSelect?.(n.id)} className="cursor-pointer" style={{ pointerEvents: "all" }}>
            <circle cx={n.x} cy={n.y * 0.6} r={isSelected ? 2.4 : 1.8} fill={color} opacity={isSelected ? 1 : 0.85}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
            </circle>
            {isSelected && <circle cx={n.x} cy={n.y * 0.6} r="3.6" fill="none" stroke={color} strokeWidth="0.3" opacity="0.6" />}
            <text x={n.x} y={n.y * 0.6 + 4.2} fontSize="2.1" textAnchor="middle" fill="#E7E9EE" fontWeight={isSelected ? 600 : 400}>
              {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
