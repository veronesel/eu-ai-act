import type { Tone } from "../tone";
import { TONE_TEXT } from "../tone";

export interface FunnelStage {
  label: string;
  value: number;
  tone: Tone;
}

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-slate-500/50",
  info: "bg-sky-500/60",
  success: "bg-emerald-500/60",
  warning: "bg-amber-500/60",
  danger: "bg-rose-500/60",
};

/** Horizontal stacked-bar funnel — width proportional to share of total. */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const total = Math.max(1, stages.reduce((sum, s) => sum + s.value, 0));

  return (
    <div>
      <div className="flex h-8 w-full rounded-lg overflow-hidden border border-[var(--panel-border)]">
        {stages.map((s, i) => {
          const pct = (s.value / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className={`${TONE_BAR[s.tone]} flex items-center justify-center text-[11px] font-semibold text-white/90 border-r border-black/10 last:border-r-0`}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${s.value}`}
            >
              {pct > 8 ? s.value : ""}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-3">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full shrink-0 ${TONE_BAR[s.tone]}`} />
            <span className="text-[var(--text-secondary)]">{s.label}</span>
            <span className={`ml-auto font-semibold ${TONE_TEXT[s.tone]}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
