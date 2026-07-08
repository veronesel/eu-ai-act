import { GlassCard } from "@/components/ui/Glass";
import { GaugeRing } from "./GaugeRing";
import { StatTile } from "./StatTile";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "../tone";

export type PostureMetric =
  | { kind: "gauge"; label: string; pct: number; sublabel?: string; tone?: Tone }
  | { kind: "count"; label: string; value: string | number; sublabel?: string; tone?: Tone; icon?: LucideIcon };

/**
 * Posture Header band — renders first, above everything else. Role mission line
 * + 3-4 headline metrics as gauges/big-numbers. Keep queries simple/fast (sqlite is tiny).
 */
export function PostureHeader({ name, title, mission, metrics }: { name: string; title: string; mission: string; metrics: PostureMetric[] }) {
  return (
    <GlassCard className="border-aegis-emerald/20">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{title}</div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight mt-0.5">{name}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xl">{mission}</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 lg:gap-6 lg:border-l lg:border-[var(--panel-border)] lg:pl-6">
          {metrics.map((m, i) =>
            m.kind === "gauge" ? (
              <GaugeRing key={i} pct={m.pct} label={m.label} sublabel={m.sublabel} tone={m.tone} />
            ) : (
              <StatTile key={i} label={m.label} value={m.value} sublabel={m.sublabel} tone={m.tone} icon={m.icon} />
            )
          )}
        </div>
      </div>
    </GlassCard>
  );
}
