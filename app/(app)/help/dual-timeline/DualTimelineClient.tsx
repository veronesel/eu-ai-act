"use client";

import { useBaseline } from "@/lib/context/BaselineProvider";
import { GlassCard } from "@/components/ui/Glass";
import { formatDate } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const ROWS: Array<{ key: keyof import("@/lib/context/BaselineProvider").RegulatoryBaseline; label: string }> = [
  { key: "art51_55_gpai_date", label: "Art. 51-55 GPAI obligations" },
  { key: "annex_iii_standalone_date", label: "Annex III (stand-alone) high-risk obligations" },
  { key: "art50_general_transparency_date", label: "Art. 50(1),(3),(4) general transparency" },
  { key: "art50_2_watermark_existing_date", label: "Art. 50(2) watermarking (systems already on market)" },
  { key: "art5_ncii_csam_date", label: "New Art. 5 prohibition — AI-generated NCII/CSAM" },
  { key: "sandboxes_date", label: "National AI regulatory sandboxes established" },
  { key: "annex_i_embedded_date", label: "Annex I (embedded/product) high-risk obligations" },
];

export function DualTimelineClient() {
  const { baselines, activeId, setActiveId } = useBaseline();
  const original = baselines.find((b) => b.id === "original_2024_1689");
  const omnibus = baselines.find((b) => b.id === "digital_omnibus_agreed");
  if (!original || !omnibus) return null;

  return (
    <div className="space-y-4">
      <GlassCard>
        <p className="text-sm text-[var(--text-secondary)]">
          As of today, the Digital Omnibus on AI has political agreement from both the Council (29 Jun 2026) and the European Parliament (16 Jun 2026),
          but has <strong>not yet been published in the Official Journal</strong>. Until publication, Regulation (EU) 2024/1689 as originally adopted remains
          the binding law. The toggle below is live-wired to the same setting used across the whole app.
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setActiveId("original_2024_1689")} className={`text-xs rounded-lg px-3 py-1.5 border ${activeId === "original_2024_1689" ? "border-aegis-emerald bg-aegis-emerald/10 text-aegis-emerald" : "border-[var(--panel-border)]"}`}>Original timeline active</button>
          <button onClick={() => setActiveId("digital_omnibus_agreed")} className={`text-xs rounded-lg px-3 py-1.5 border ${activeId === "digital_omnibus_agreed" ? "border-aegis-violet bg-aegis-violet/10 text-aegis-violet" : "border-[var(--panel-border)]"}`}>Digital Omnibus active</button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-4">Obligation</th>
                <th className="py-2 px-4">Original (2024/1689)</th>
                <th className="py-2 pl-4">Digital Omnibus (agreed)</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const o = original[row.key] as string | null;
                const d = omnibus[row.key] as string | null;
                const changed = o !== d;
                return (
                  <tr key={row.key} className="border-t border-[var(--panel-border)]">
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className={`py-2 px-4 ${activeId === "original_2024_1689" ? "text-[var(--foreground)] font-medium" : "text-[var(--text-muted)]"}`}>
                      {o ? formatDate(o) : "not present"}
                      {activeId === "original_2024_1689" && <CheckCircle2 className="inline h-3 w-3 ml-1.5 text-aegis-emerald" />}
                    </td>
                    <td className={`py-2 pl-4 ${activeId === "digital_omnibus_agreed" ? "text-[var(--foreground)] font-medium" : "text-[var(--text-muted)]"} ${changed ? "relative" : ""}`}>
                      {d ? formatDate(d) : "not present"}
                      {changed && <span className="ml-1.5 text-[10px] text-aegis-violet">changed</span>}
                      {activeId === "digital_omnibus_agreed" && <CheckCircle2 className="inline h-3 w-3 ml-1.5 text-aegis-violet" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
