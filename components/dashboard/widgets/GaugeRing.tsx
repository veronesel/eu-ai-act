import { TONE_RING, toneForPct, type Tone } from "../tone";

/** Pure-CSS conic-gradient radial gauge. Server-renderable, no client JS required. */
export function GaugeRing({ pct, label, sublabel, size = 84, tone }: { pct: number; label: string; sublabel?: string; size?: number; tone?: Tone }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const resolvedTone = tone ?? toneForPct(clamped);
  const color = TONE_RING[resolvedTone];
  const inner = size - 18;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-full flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(148,163,184,0.15) 0deg)`,
        }}
      >
        <div
          className="rounded-full flex items-center justify-center bg-[var(--background)]"
          style={{ width: inner, height: inner }}
        >
          <span className="font-heading text-lg font-semibold">{clamped}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-medium leading-tight">{label}</div>
        {sublabel && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
