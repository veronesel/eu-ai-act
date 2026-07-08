import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { HumanOversightDesignClient } from "./HumanOversightDesignClient";

export default function HumanOversightDesignPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const records =
    applicableIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM human_oversight_designs WHERE system_id IN (${applicableIds.map(() => "?").join(",")})`)
          .all(...applicableIds) as any[]);
  const recordBySystem = Object.fromEntries(records.map((r) => [r.system_id, r]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Human Oversight — Design"
        subtitle="Art. 14 (design-time) — the oversight affordances Eurobank designs into the system before it is placed on the market: stop/override controls, confidence-threshold gating, escalation triggers, and explainability outputs."
      />
      <div className="glass-panel px-4 py-3 text-xs text-[var(--text-secondary)]">
        This is the <strong className="text-[var(--foreground)]">design-time</strong> record — what the system is built to allow. It is distinct from the Deployer suite&apos;s <strong className="text-[var(--foreground)]">operation</strong> log of actual overrides and escalations, tracked separately at <code className="text-aegis-teal">/deployer/human-oversight-operation</code>.
      </div>
      <HumanOversightDesignClient applicable={applicable} notApplicable={notApplicable} recordBySystem={recordBySystem} />
    </div>
  );
}
