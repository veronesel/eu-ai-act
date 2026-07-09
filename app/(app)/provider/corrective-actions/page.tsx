import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems, OUT_OF_SCOPE_VALUE_CHAIN_ROLES } from "@/lib/domain/provider-suite";
import { CorrectiveActionsClient } from "./CorrectiveActionsClient";
import { Info } from "lucide-react";

export default function CorrectiveActionsPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const actions =
    applicableIds.length === 0
      ? []
      : (db.prepare(`SELECT * FROM corrective_actions WHERE system_id IN (${applicableIds.map(() => "?").join(",")}) ORDER BY created_at DESC`).all(...applicableIds) as any[]);
  const actionIds = actions.map((a) => a.id);
  const notifications = actionIds.length ? (db.prepare(`SELECT * FROM corrective_action_notifications WHERE corrective_action_id IN (${actionIds.map(() => "?").join(",")})`).all(...actionIds) as any[]) : [];

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Corrective Actions"
        subtitle="Art. 20 — non-conformity identification, corrective/preventive/withdrawal action, and the duty-of-information fan-out to downstream parties and authorities."
      />
      <CorrectiveActionsClient applicable={applicable} notApplicable={notApplicable} actions={actions} notifications={notifications} />

      <GlassCard className="border-sky-500/30 bg-sky-500/5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading font-semibold text-sm mb-2">Value-chain roles deliberately out of scope for Eurobank</h3>
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              {OUT_OF_SCOPE_VALUE_CHAIN_ROLES.map((r) => (
                <p key={r.article}><strong className="text-[var(--foreground)]">{r.article} ({r.role}):</strong> {r.rationale}</p>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
