"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/Glass";
import { AUTHORITY_NODES } from "@/lib/domain/assurance";
import { Building2, ScrollText, ShieldQuestion } from "lucide-react";

const CENTER = { x: 50, y: 50 };

export function GovernanceConstellation() {
  const [selectedId, setSelectedId] = useState<string | null>(AUTHORITY_NODES[0].id);
  const selected = AUTHORITY_NODES.find((n) => n.id === selectedId);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="h-4 w-4 text-aegis-emerald" />
        <h3 className="font-heading font-semibold text-sm">Eurobank&apos;s regulatory constellation</h3>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">Click a node for what it is, what it can compel Eurobank to do, and the article base.</p>

      <div className="relative w-full aspect-[16/10] max-w-3xl mx-auto">
        <svg viewBox="0 0 100 62.5" className="w-full h-full" role="img" aria-label="Diagram of Eurobank's regulatory relationships">
          <defs>
            {AUTHORITY_NODES.map((n) => (
              <radialGradient key={n.id} id={`glow-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={n.color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={n.color} stopOpacity="0" />
              </radialGradient>
            ))}
            <radialGradient id="glow-center" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E7E9EE" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E7E9EE" stopOpacity="0" />
            </radialGradient>
            {AUTHORITY_NODES.map((n) => (
              <linearGradient key={`edge-${n.id}`} id={`edge-${n.id}`} gradientUnits="userSpaceOnUse" x1={CENTER.x} y1={CENTER.y * 0.625} x2={n.x} y2={n.y * 0.625}>
                <stop offset="0%" stopColor="#E7E9EE" stopOpacity="0.5" />
                <stop offset="100%" stopColor={n.color} stopOpacity="0.9" />
              </linearGradient>
            ))}
          </defs>

          {/* Edges */}
          {AUTHORITY_NODES.map((n) => (
            <line
              key={n.id}
              x1={CENTER.x}
              y1={CENTER.y * 0.625}
              x2={n.x}
              y2={n.y * 0.625}
              stroke={`url(#edge-${n.id})`}
              strokeWidth={selectedId === n.id ? 0.5 : 0.25}
              opacity={selectedId === n.id ? 1 : 0.6}
            />
          ))}

          {/* Center node */}
          <g>
            <circle cx={CENTER.x} cy={CENTER.y * 0.625} r="9" fill="url(#glow-center)" />
            <circle cx={CENTER.x} cy={CENTER.y * 0.625} r="2.6" fill="#E7E9EE" />
            <text x={CENTER.x} y={CENTER.y * 0.625 - 5} textAnchor="middle" fontSize="2.6" fill="#E7E9EE" fontWeight={600}>
              Eurobank Capital SpA
            </text>
          </g>

          {/* Satellite nodes */}
          {AUTHORITY_NODES.map((n) => {
            const isSelected = selectedId === n.id;
            const labelAbove = n.y > CENTER.y;
            return (
              <g key={n.id} className="cursor-pointer" onClick={() => setSelectedId(n.id)} tabIndex={0} role="button" aria-pressed={isSelected}>
                <circle cx={n.x} cy={n.y * 0.625} r={isSelected ? 8 : 6} fill={`url(#glow-${n.id})`} />
                <circle cx={n.x} cy={n.y * 0.625} r={isSelected ? 2.2 : 1.7} fill={n.color} stroke={isSelected ? "#E7E9EE" : "none"} strokeWidth={0.4} />
                <text
                  x={n.x}
                  y={n.y * 0.625 + (labelAbove ? 4.6 : -3.6)}
                  textAnchor="middle"
                  fontSize="2.3"
                  fill={isSelected ? "#E7E9EE" : "#9AA4B2"}
                  fontWeight={isSelected ? 600 : 400}
                >
                  {n.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: `${selected.color}66`, backgroundColor: `${selected.color}0d` }}>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selected.color }} />
            <h4 className="font-heading font-semibold text-sm">{selected.label}</h4>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                <ScrollText className="h-3 w-3" /> What it is
              </div>
              <p className="text-[var(--text-secondary)]">{selected.what}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
                <ShieldQuestion className="h-3 w-3" /> What it can compel Eurobank to do
              </div>
              <p className="text-[var(--text-secondary)]">{selected.canCompel}</p>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-[var(--text-muted)]">Article basis: {selected.article}</div>
        </div>
      )}
    </GlassCard>
  );
}
