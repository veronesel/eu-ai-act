import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { PostMarketBoard } from "./PostMarketBoard";

export default function PostMarketMonitoringPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const systemIds = systems.map((s) => s.id);
  const plans =
    systemIds.length === 0
      ? []
      : (db.prepare(`SELECT * FROM post_market_monitoring_plans WHERE system_id IN (${systemIds.map(() => "?").join(",")})`).all(...systemIds) as any[]);
  const events =
    systemIds.length === 0
      ? []
      : (db
          .prepare(`SELECT * FROM post_market_monitoring_events WHERE system_id IN (${systemIds.map(() => "?").join(",")}) ORDER BY occurred_at DESC`)
          .all(...systemIds) as any[]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Post-Market Monitoring"
        subtitle="Art. 72 — providers must actively and systematically collect, document and analyse relevant data on the performance of high-risk AI systems throughout their lifetime, against a documented methodology."
      />
      <PostMarketBoard systems={systems} plans={plans} events={events} />
    </div>
  );
}
