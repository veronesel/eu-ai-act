"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { NotApplicableCard } from "@/components/provider/NotApplicableCard";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Info, Loader2 } from "lucide-react";

const FIELDS: Array<{ key: string; label: string }> = [
  { key: "intended_purpose", label: "Intended purpose" },
  { key: "known_limitations", label: "Known limitations" },
  { key: "human_oversight_measures", label: "Human-oversight measures (for the deployer to operate)" },
  { key: "expected_lifetime", label: "Expected lifetime" },
  { key: "maintenance_needs", label: "Maintenance needs" },
];

export function TransparencyInstructionsClient({ applicable, notApplicable, recordBySystem }: { applicable: any[]; notApplicable: any[]; recordBySystem: Record<string, any> }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(applicable[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {applicable.map((s) => (
        <SystemInstructionsCard key={s.id} system={s} record={recordBySystem[s.id]} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onChanged={() => router.refresh()} />
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

function SystemInstructionsCard({ system, record, expanded, onToggle, onChanged }: any) {
  const [form, setForm] = useState({
    intended_purpose: record?.intended_purpose ?? "",
    known_limitations: record?.known_limitations ?? "",
    human_oversight_measures: record?.human_oversight_measures ?? "",
    expected_lifetime: record?.expected_lifetime ?? "",
    maintenance_needs: record?.maintenance_needs ?? "",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const dualRole = !!system.provider_role_applies && !!system.deployer_role_applies;

  async function save(status: "draft" | "approved") {
    setSaving(status);
    await fetch(`/api/provider/transparency-instructions/${system.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, status }) });
    setSaving(null);
    onChanged();
  }

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
        <Badge tone={toneForStatus(record?.status ?? "draft")}>{(record?.status ?? "draft").replace(/_/g, " ")}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {dualRole && (
            <div className="flex items-start gap-2 rounded-lg border border-aegis-violet/30 bg-aegis-violet/10 px-3 py-2 text-xs">
              <Info className="h-3.5 w-3.5 text-aegis-violet shrink-0 mt-0.5" />
              <span><strong>You are both sides of this document.</strong> As Provider, Eurobank produces these instructions for use; the same company, wearing the Deployer hat, consumes them read-only for the same system (see the Deployer suite).</span>
            </div>
          )}
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[10px] text-[var(--text-muted)]">{f.label}</label>
              <textarea className="w-full mt-0.5 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1.5 text-sm" rows={2} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => save("draft")} disabled={!!saving} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
              {saving === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save draft
            </button>
            <button onClick={() => save("approved")} disabled={!!saving} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
              {saving === "approved" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Approve for deployer use
            </button>
            {record?.updated_at && <span className="text-[10px] text-[var(--text-muted)] ml-auto">Updated {formatDate(record.updated_at)}</span>}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
