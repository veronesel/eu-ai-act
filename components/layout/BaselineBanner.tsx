"use client";

import { useState } from "react";
import { useBaseline } from "@/lib/context/BaselineProvider";
import { Info, X } from "lucide-react";

export function BaselineBanner() {
  const { baselines, activeId, setActiveId } = useBaseline();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || baselines.length < 2) return null;

  const otherId = baselines.find((b) => b.id !== activeId)?.id;

  return (
    <div className="px-6 py-2 bg-aegis-violet/10 border-b border-aegis-violet/20 text-xs flex items-center gap-3">
      <Info className="h-3.5 w-3.5 text-aegis-violet shrink-0" />
      <p className="text-[var(--text-secondary)]">
        <strong className="text-[var(--foreground)]">Digital Omnibus on AI:</strong> political agreement reached (Council 29 Jun 2026, European Parliament 16 Jun 2026).
        Not yet published in the Official Journal. Until publication, Regulation (EU) 2024/1689 as originally adopted remains the binding law.
        Dates shown reflect the agreed text.
      </p>
      <button
        onClick={() => otherId && setActiveId(otherId)}
        className="shrink-0 rounded-md border border-aegis-violet/40 px-2 py-1 text-aegis-violet hover:bg-aegis-violet/10"
      >
        View {activeId === "digital_omnibus_agreed" ? "original-timeline" : "Digital-Omnibus"} dates
      </button>
      <button onClick={() => setDismissed(true)} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
