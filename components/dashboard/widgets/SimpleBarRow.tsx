import type { Tone } from "../tone";
import { TONE_TEXT } from "../tone";

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-slate-500/60",
  info: "bg-sky-500/60",
  success: "bg-emerald-500/60",
  warning: "bg-amber-500/60",
  danger: "bg-rose-500/60",
};

export interface BarDatum {
  label: string;
  value: number;
  tone?: Tone;
  sublabel?: string;
}

/** Hand-rolled horizontal bar chart — thin marks, no axis chrome, label + value direct. */
export function SimpleBarRow({ data, maxValue }: { data: BarDatum[]; maxValue?: number }) {
  const max = maxValue ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const tone = d.tone ?? "info";
        const pct = max === 0 ? 0 : Math.max(2, (d.value / max) * 100);
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="text-[var(--text-secondary)]">{d.label}</span>
              <span className={`font-semibold ${TONE_TEXT[tone]}`}>
                {d.value}
                {d.sublabel && <span className="text-[var(--text-muted)] font-normal ml-1">{d.sublabel}</span>}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
