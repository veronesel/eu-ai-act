"use client";

export interface FlowState {
  id: string;
  label: string;
  tone?: "neutral" | "success" | "danger";
}
export interface FlowTransition {
  from: string;
  to: string;
  label: string;
  who: string;
}

const TONE_FILL: Record<string, string> = { neutral: "#334155", success: "#10B981", danger: "#F43F5E" };

export function FlowDiagram({ states, transitions, selectedId, onSelect }: { states: FlowState[]; transitions: FlowTransition[]; selectedId?: string | null; onSelect?: (id: string) => void }) {
  const n = states.length;
  const gapX = 100 / (n + 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 100 34" className="w-full min-w-[640px]" style={{ height: 220 }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#6366F1" />
          </marker>
        </defs>
        {states.slice(0, -1).map((s, i) => {
          const x1 = gapX * (i + 1) + 4;
          const x2 = gapX * (i + 2) - 4;
          const t = transitions.find((tr) => tr.from === s.id && tr.to === states[i + 1].id);
          return (
            <g key={`${s.id}-arrow`}>
              <line x1={x1} y1="8" x2={x2} y2="8" stroke="#6366F1" strokeWidth="0.3" markerEnd="url(#arrow)" />
              {t && (
                <text x={(x1 + x2) / 2} y="6.5" fontSize="1.5" textAnchor="middle" fill="#9AA4B2">{t.label}</text>
              )}
            </g>
          );
        })}
        {states.map((s, i) => {
          const x = gapX * (i + 1);
          const isSelected = selectedId === s.id;
          return (
            <g key={s.id} onClick={() => onSelect?.(s.id)} className="cursor-pointer">
              <rect x={x - 8} y="10" width="16" height="8" rx="1.5" fill={isSelected ? TONE_FILL[s.tone ?? "neutral"] : "rgba(15,23,42,0.8)"} stroke={TONE_FILL[s.tone ?? "neutral"]} strokeWidth="0.3" />
              <text x={x} y="14.6" fontSize="1.6" textAnchor="middle" fill="#E7E9EE">{s.label.length > 16 ? s.label.slice(0, 14) + "…" : s.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
