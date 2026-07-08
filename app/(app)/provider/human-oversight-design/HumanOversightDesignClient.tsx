"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

const FIELDS: Array<{ key: string; label: string }> = [
  { key: "stop_override_mechanism", label: "Stop / override mechanism" },
  { key: "confidence_threshold_gating", label: "Confidence-threshold gating" },
  { key: "escalation_triggers", label: "Escalation triggers" },
  { key: "explainability_outputs", label: "Explainability outputs" },
];

export function HumanOversightDesignClient({ applicable, notApplicable, recordBySystem }: { applicable: any[]; notApplicable: any[]; recordBySystem: Record<string, any> }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {applicable.map((s) => (
        <SystemOversightCard key={s.id} system={s} record={recordBySystem[s.id]} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
      ))}

      {notApplicable.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm text-[var(--text-muted)] mb-2 mt-4">Provider-role systems — not high-risk</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notApplicable.map((s) => <NotApplicableCard key={s.id} name={s.name} businessFunction={s.business_function} classificationStatus={s.classification_status} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SystemOversightCard({ system, record, expanded, onToggle, onChanged }: any) {
  const [form, setForm] = useState({
    stop_override_mechanism: record?.stop_override_mechanism ?? "",
    confidence_threshold_gating: record?.confidence_threshold_gating ?? "",
    escalation_triggers: record?.escalation_triggers ?? "",
    explainability_outputs: record?.explainability_outputs ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/provider/human-oversight-design/${system.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onChanged();
  }

  const complete = Object.values(form).every((v) => (v as string).trim().length > 0);

  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <div>
            <h3 className="font-heading font-semibold text-sm">{system.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{system.business_function}</p>
          </div>
        </div>
        <Badge tone={complete ? "success" : "warning"}>{complete ? "design complete" : "design incomplete"}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[10px] text-[var(--text-muted)]">{f.label}</label>
              <textarea className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-sm" rows={2} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save design record
            </button>
            {record?.updated_at && <span className="text-[10px] text-[var(--text-muted)] ml-auto">Updated {formatDate(record.updated_at)}</span>}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
