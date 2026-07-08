import { GlassCard } from "@/components/ui/Glass";
import { CircleSlash } from "lucide-react";
import { PROVIDER_NOT_APPLICABLE_REASON } from "@/lib/domain/provider-suite";

/**
 * Visually distinct "not applicable" state for Provider-role systems that are NOT high-risk.
 * Never render a blank/grayed-out row for these — always show the reasoning explicitly.
 */
export function NotApplicableCard({ name, businessFunction, classificationStatus }: { name: string; businessFunction?: string; classificationStatus?: string }) {
  return (
    <GlassCard className="border-dashed border-[var(--panel-border)] bg-black/10 opacity-80">
      <div className="flex items-start gap-3">
        <CircleSlash className="h-5 w-5 text-[var(--text-muted)] shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">{name}</p>
          {businessFunction && <p className="text-xs text-[var(--text-muted)]">{businessFunction}</p>}
          <p className="text-xs text-[var(--text-muted)] mt-1.5 italic">{PROVIDER_NOT_APPLICABLE_REASON}</p>
          {classificationStatus && <p className="text-[10px] text-[var(--text-muted)] mt-1">Current classification: {classificationStatus.replace(/_/g, " ")}</p>}
        </div>
      </div>
    </GlassCard>
  );
}
