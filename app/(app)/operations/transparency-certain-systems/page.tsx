import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { TransparencyBoard } from "./TransparencyBoard";

export default function TransparencyPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems ORDER BY name`).all() as any[];
  const disclosures = db.prepare(`SELECT * FROM transparency_disclosures ORDER BY updated_at DESC`).all() as any[];
  const determinations = db.prepare(`SELECT * FROM high_risk_determinations`).all() as any[];
  const detBySystem = Object.fromEntries(determinations.map((d) => [d.system_id, d]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Transparency for Certain Systems"
        subtitle="Art. 50 — disclosure obligations that apply regardless of high-risk status: AI-interaction notices to natural persons (50(1)), machine-readable watermarking of generative output (50(2)), and biometric-categorisation / emotion-recognition disclosure (50(3))."
      />
      <TransparencyBoard systems={systems} disclosures={disclosures} detBySystem={detBySystem} />
    </div>
  );
}
