import { getDb } from "@/lib/db/client";
import { SectionHeading } from "@/components/ui/Glass";
import { computeEvidenceStatus, ensureEvidenceLinksSeeded, type EvidenceStatus } from "@/lib/domain/assurance-evidence";
import { ObligationsMatrixClient } from "./ObligationsMatrixClient";

export default function ObligationsMatrixPage() {
  const db = getDb();
  ensureEvidenceLinksSeeded(db);

  const rows = db.prepare(`SELECT * FROM regulatory_obligations_matrix ORDER BY article_ref`).all() as any[];
  const links = db.prepare(`SELECT obligation_id, status FROM obligation_evidence_links`).all() as { obligation_id: string; status: string }[];
  const linksByObligation: Record<string, { status: string }[]> = {};
  for (const l of links) (linksByObligation[l.obligation_id] ??= []).push({ status: l.status });

  const enriched = rows.map((r) => ({
    ...r,
    evidence_status: computeEvidenceStatus(db, r, linksByObligation) as EvidenceStatus,
  }));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Regulatory Obligations Traceability Matrix"
        subtitle="Every article-level obligation Aegis tracks, mapped to the module and persona that owns it — including the explicit N/A calls for Art. 22-24, which only attach to non-EU-established providers, importers, and distributors respectively."
      />
      <ObligationsMatrixClient rows={enriched} />
    </div>
  );
}
