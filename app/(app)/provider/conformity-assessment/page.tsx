import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { partitionProviderSystems } from "@/lib/domain/provider-suite";
import { ConformityClient } from "./ConformityClient";

export default function ConformityAssessmentPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems WHERE provider_role_applies = 1 ORDER BY name`).all() as any[];
  const { applicable, notApplicable } = partitionProviderSystems(systems);
  const applicableIds = applicable.map((s) => s.id);
  const inClause = applicableIds.length ? `(${applicableIds.map(() => "?").join(",")})` : "(NULL)";
  const assessments = applicableIds.length ? (db.prepare(`SELECT * FROM conformity_assessments WHERE system_id IN ${inClause}`).all(...applicableIds) as any[]) : [];
  const declarations = applicableIds.length ? (db.prepare(`SELECT * FROM declarations_of_conformity WHERE system_id IN ${inClause}`).all(...applicableIds) as any[]) : [];
  const ceMarkings = applicableIds.length ? (db.prepare(`SELECT * FROM ce_marking_records WHERE system_id IN ${inClause}`).all(...applicableIds) as any[]) : [];

  const assessmentBySystem = Object.fromEntries(assessments.map((a) => [a.system_id, a]));
  const declarationBySystem = Object.fromEntries(declarations.map((d) => [d.system_id, d]));
  const ceBySystem = Object.fromEntries(ceMarkings.map((c) => [c.system_id, c]));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Conformity Assessment, Declaration &amp; CE Marking"
        subtitle="Art. 43 conformity assessment route, Art. 47 EU declaration of conformity, Art. 48 CE marking — issued only once the conformity outcome has passed."
      />
      <ConformityClient applicable={applicable} notApplicable={notApplicable} assessmentBySystem={assessmentBySystem} declarationBySystem={declarationBySystem} ceBySystem={ceBySystem} />
    </div>
  );
}
