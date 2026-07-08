"use client";

import { useBaseline } from "@/lib/context/BaselineProvider";
import { GlassCard } from "@/components/ui/Glass";
import { formatDate, daysUntil } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

const DATE_LABELS: Array<{ key: keyof ReturnType<typeof useBaseline>["active"]; label: string }> = [
  { key: "annex_iii_standalone_date", label: "Annex III standalone high-risk systems" },
  { key: "art50_general_transparency_date", label: "Art. 50 general transparency" },
  { key: "art50_2_watermark_existing_date", label: "Art. 50(2) watermarking (existing systems)" },
  { key: "art51_55_gpai_date", label: "Art. 51-55 GPAI obligations" },
  { key: "annex_i_embedded_date", label: "Annex I embedded high-risk products" },
  { key: "sandboxes_date", label: "Regulatory sandboxes" },
];

/** Baseline-aware key-dates summary. Client component — reads the shared useBaseline() context. */
export function BaselineSummaryCard() {
  const { active } = useBaseline();

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-4 w-4 text-aegis-violet" />
        <h3 className="font-heading font-semibold text-sm">Active regulatory baseline</h3>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-3">{active.label}</p>
      <ul className="space-y-1.5">
        {DATE_LABELS.map(({ key, label }) => {
          const iso = active[key] as string | null;
          if (!iso) return null;
          const d = daysUntil(iso);
          const past = d !== null && d < 0;
          return (
            <li key={key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)]">{label}</span>
              <span className={`font-medium shrink-0 ${past ? "text-[var(--text-muted)]" : "text-aegis-violet"}`}>{formatDate(iso)}</span>
            </li>
          );
        })}
        {active.art5_ncii_csam_date && (
          <li className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">Art. 5 NCII/CSAM limb</span>
            <span className="font-medium text-aegis-violet">{formatDate(active.art5_ncii_csam_date)}</span>
          </li>
        )}
      </ul>
    </GlassCard>
  );
}
