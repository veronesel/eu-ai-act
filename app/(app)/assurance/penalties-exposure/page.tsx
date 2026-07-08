import { SectionHeading } from "@/components/ui/Glass";
import { PENALTY_TIERS, DEFAULT_TURNOVER_EUR } from "@/lib/domain/assurance";
import { PenaltyCalculatorClient } from "./PenaltyCalculatorClient";

export default function PenaltiesExposurePage() {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Penalty Exposure Reference"
        subtitle="Art. 99 — the three administrative-fine tiers, and a working calculator that applies the statutory rule: the greater of the fixed amount or the percentage of worldwide annual turnover."
      />
      <PenaltyCalculatorClient tiers={PENALTY_TIERS as any} defaultTurnover={DEFAULT_TURNOVER_EUR} />
    </div>
  );
}
