"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/Glass";
import { X, ArrowRight } from "lucide-react";

export interface HelpNode {
  id: string;
  label: string;
  what: string;
  purpose: string;
  article?: string;
  relationships?: { label: string; targetId?: string }[];
  whereInApp?: { label: string; href: string }[];
}

export function InfoPanelHost({ nodes, selectedId, onSelect }: { nodes: HelpNode[]; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const selected = nodes.find((n) => n.id === selectedId);
  if (!selected) return null;
  return (
    <GlassCard className="mt-4 border-aegis-emerald/30">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-heading font-semibold">{selected.label}</h4>
        <button onClick={() => onSelect(null)} className="text-[var(--text-muted)] hover:text-[var(--foreground)]"><X className="h-4 w-4" /></button>
      </div>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">What it is</dt>
          <dd className="text-[var(--text-secondary)] mt-0.5">{selected.what}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Purpose</dt>
          <dd className="text-[var(--text-secondary)] mt-0.5">{selected.purpose}</dd>
        </div>
        {selected.article && (
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Article reference</dt>
            <dd className="text-[var(--text-secondary)] mt-0.5">{selected.article}</dd>
          </div>
        )}
        {!!selected.relationships?.length && (
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Relationships</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {selected.relationships.map((r) => (
                <button
                  key={r.label}
                  onClick={() => r.targetId && onSelect(r.targetId)}
                  className="text-xs rounded-full border border-[var(--panel-border)] px-2.5 py-1 hover:bg-white/5"
                >
                  {r.label}
                </button>
              ))}
            </dd>
          </div>
        )}
        {!!selected.whereInApp?.length && (
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Where in the app</dt>
            <dd className="mt-1 space-y-1">
              {selected.whereInApp.map((w) => (
                <Link key={w.href} href={w.href} className="flex items-center gap-1 text-xs text-aegis-emerald hover:underline">
                  {w.label} <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </GlassCard>
  );
}

export function useSelection() {
  return useState<string | null>(null);
}
