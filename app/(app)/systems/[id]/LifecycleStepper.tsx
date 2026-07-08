"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Check } from "lucide-react";

const STAGES = ["concept", "screening", "development", "pre_deployment", "in_production", "monitored", "retired"];

export function LifecycleStepper({ systemId, current, history, disabled }: { systemId: string; current: string; history: any[]; disabled?: boolean }) {
  const router = useRouter();
  const [viewing, setViewing] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const currentIdx = STAGES.indexOf(current);

  async function advance(stage: string) {
    setAdvancing(true);
    await fetch(`/api/systems/${systemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lifecycle_stage: stage }) });
    setAdvancing(false);
    router.refresh();
  }

  const viewedRecord = viewing ? history.find((h) => h.stage === viewing) : null;

  return (
    <div>
      <div className="flex items-center overflow-x-auto pb-2">
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const isCurrent = i === currentIdx;
          const reached = i <= currentIdx;
          return (
            <div key={stage} className="flex items-center shrink-0">
              <button
                onClick={() => setViewing(stage)}
                disabled={!reached}
                className={`flex flex-col items-center gap-1 px-2 ${reached ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                  isCurrent ? "border-aegis-emerald bg-aegis-emerald/20 text-aegis-emerald" : done ? "border-aegis-emerald bg-aegis-emerald text-white" : "border-[var(--panel-border)] text-[var(--text-muted)]"
                }`}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-[10px] whitespace-nowrap capitalize ${isCurrent ? "text-[var(--foreground)] font-medium" : "text-[var(--text-muted)]"}`}>{stage.replace(/_/g, " ")}</span>
              </button>
              {i < STAGES.length - 1 && <div className={`h-0.5 w-8 ${i < currentIdx ? "bg-aegis-emerald" : "bg-[var(--panel-border)]"}`} />}
            </div>
          );
        })}
      </div>

      {viewedRecord && (
        <div className="mt-3 text-xs text-[var(--text-secondary)] bg-black/20 rounded-lg p-3">
          Entered <strong className="capitalize">{viewedRecord.stage.replace(/_/g, " ")}</strong> on {formatDate(viewedRecord.entered_at)}. {viewedRecord.notes}
        </div>
      )}

      {!disabled && currentIdx < STAGES.length - 1 && (
        <button
          onClick={() => advance(STAGES[currentIdx + 1])}
          disabled={advancing}
          className="mt-3 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50"
        >
          Advance to {STAGES[currentIdx + 1].replace(/_/g, " ")} &rarr;
        </button>
      )}
      {disabled && <p className="mt-3 text-xs text-[var(--text-muted)]">Lifecycle progression is locked — this system is blocked at screening.</p>}
    </div>
  );
}
