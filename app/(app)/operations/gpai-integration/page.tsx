import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { GpaiBoard } from "./GpaiBoard";

export default function GpaiIntegrationPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE gpai_integration = 1 ORDER BY name`).all() as any[];
  const systemIds = systems.map((s) => s.id);
  const integrations =
    systemIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM gpai_integrations WHERE system_id IN (${systemIds.map(() => "?").join(",")})`)
          .all(...systemIds) as any[]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="GPAI Downstream Integration"
        subtitle="Art. 51-56 (GPAI-model provider obligations, reference-only from Eurobank's downstream position), Art. 25 (value-chain responsibility shift), and the enumerated Art. 53 obligations that attach if Eurobank's own fine-tuning shifts it into a provider role for the fine-tuned model."
      />
      <GpaiBoard systems={systems} integrations={integrations} />
    </div>
  );
}
