import type { LucideIcon } from "lucide-react";
import { TONE_TEXT, type Tone } from "../tone";

/** Big-number headline card for the Posture Header. */
export function StatTile({ label, value, sublabel, tone = "neutral", icon: Icon }: { label: string; value: string | number; sublabel?: string; tone?: Tone; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1 px-2 py-1 min-w-[104px]">
      {Icon && <Icon className={`h-4 w-4 mb-0.5 ${TONE_TEXT[tone]}`} />}
      <div className={`font-heading text-2xl font-semibold ${TONE_TEXT[tone]}`}>{value}</div>
      <div className="text-xs font-medium leading-tight">{label}</div>
      {sublabel && <div className="text-[10px] text-[var(--text-muted)]">{sublabel}</div>}
    </div>
  );
}
