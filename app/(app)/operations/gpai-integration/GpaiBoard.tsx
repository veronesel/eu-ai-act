"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge } from "@/components/ui/Badge";
import { splitObligations, ART55_REFERENCE_NOTE } from "@/lib/domain/operations";
import { formatDate } from "@/lib/utils";
import { Bot, ShieldQuestion, Loader2, ScrollText } from "lucide-react";

export function GpaiBoard({ systems, integrations }: { systems: any[]; integrations: any[] }) {
  const integrationBySystem = Object.fromEntries(integrations.map((g) => [g.system_id, g]));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {systems.map((s) => (
        <GpaiCard key={s.id} system={s} integration={integrationBySystem[s.id]} />
      ))}
      {systems.length === 0 && (
        <GlassCard className="xl:col-span-2">
          <p className="text-sm text-[var(--text-muted)]">No GPAI-integrated systems on record.</p>
        </GlassCard>
      )}
    </div>
  );
}

function GpaiCard({ system, integration }: { system: any; integration: any }) {
  const router = useRouter();
  const [rationale, setRationale] = useState(integration?.provider_shift_rationale ?? "");
  const [flag, setFlag] = useState(!!integration?.provider_shift_flag);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!integration) return null;
  const { art53, art55Note } = splitObligations(integration.art53_obligations_json);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/operations/gpai/${system.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_shift_flag: flag, provider_shift_rationale: rationale }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  return (
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-aegis-indigo" />
            <h3 className="font-heading font-semibold text-sm">{system.name}</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{integration.vendor_model_name}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={integration.code_of_practice_signatory ? "success" : "neutral"}>
          Code of Practice signatory (reference data): {integration.code_of_practice_signatory ? "yes" : "no"}
        </Badge>
        <Badge tone={integration.systemic_risk_flag ? "danger" : "neutral"}>
          Systemic-risk flag (reference data): {integration.systemic_risk_flag ? "yes" : "no"}
        </Badge>
      </div>

      <div className="border-t border-[var(--panel-border)] pt-3">
        <div className="flex items-center gap-2 mb-1">
          <ShieldQuestion className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">Art. 25 provider-shift check</span>
          <Badge tone={integration.provider_shift_flag ? "danger" : "success"}>
            {integration.provider_shift_flag ? "Provider shift confirmed" : "Downstream deployer only"}
          </Badge>
        </div>

        {!editing ? (
          <>
            <p className="text-xs text-[var(--text-secondary)]">{integration.provider_shift_rationale}</p>
            <button onClick={() => setEditing(true)} className="text-[10px] text-aegis-emerald mt-1 hover:underline">
              re-assess
            </button>
          </>
        ) : (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setFlag(v)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium border ${
                    flag === v ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"
                  }`}
                >
                  {v ? "Provider shift applies" : "Remains downstream deployer"}
                </button>
              ))}
            </div>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-aegis-emerald/40 text-aegis-emerald px-2 py-1 hover:bg-aegis-emerald/10 disabled:opacity-50">
                {saving && <Loader2 className="h-3 w-3 animate-spin" />} save assessment
              </button>
              <button onClick={() => setEditing(false)} className="text-xs rounded-md border border-[var(--panel-border)] px-2 py-1 hover:bg-white/5">
                cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {integration.provider_shift_flag ? (
        <div className="border-t border-[var(--panel-border)] pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-medium">Enumerated Art. 53(1) obligations (Eurobank as provider of the fine-tuned model)</span>
          </div>
          <ul className="space-y-1.5">
            {art53.map((o, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] border-l-2 border-rose-500/40 pl-2">
                {o}
              </li>
            ))}
          </ul>
          <div className="rounded-md border border-[var(--panel-border)] bg-black/20 px-3 py-2 text-[11px] text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">Art. 55 checklist — reference only.</span> {art55Note ?? ART55_REFERENCE_NOTE}
          </div>
        </div>
      ) : (
        <div className="border-t border-[var(--panel-border)] pt-3">
          <p className="text-xs text-[var(--text-secondary)]">
            Eurobank remains a downstream <span className="font-medium text-[var(--text-primary)]">deployer</span>, not a provider, of {integration.vendor_model_name}: no
            Art. 53 obligations attach. Full Art. 51-55 provider obligations remain the vendor&apos;s (upstream GPAI provider), tracked here for reference only.
          </p>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-muted)] mt-1">Last updated {formatDate(integration.updated_at)}</p>
    </GlassCard>
  );
}
