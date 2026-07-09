// Server-only: DB-backed evidence rollup for the E3 Obligations Traceability Matrix.
// Split out from lib/domain/assurance.ts because that file is also imported by client components,
// and this one touches better-sqlite3 (Node-only) via lib/db/client.
import type Database from "better-sqlite3";
import { newId } from "@/lib/db/client";

export type EvidenceStatus = "not_applicable" | "no_evidence" | "partial" | "complete";

function heuristicCount(db: Database.Database, articleRef: string, path: string | null): { count: number; total: number } {
  const q = (sql: string, ...args: any[]) => (db.prepare(sql).get(...args) as any)?.c ?? 0;
  const systemsTotal = () => q(`SELECT count(*) c FROM ai_systems`);
  const highRiskProviderTotal = () => q(`SELECT count(*) c FROM ai_systems WHERE classification_status = 'high_risk' AND provider_role_applies = 1`);
  const highRiskDeployerTotal = () => q(`SELECT count(*) c FROM ai_systems WHERE classification_status = 'high_risk' AND deployer_role_applies = 1`);

  if (!path) return { count: 0, total: 1 };

  if (path === "/provider/conformity-assessment") {
    if (articleRef.startsWith("Art. 47")) return { count: q(`SELECT count(*) c FROM declarations_of_conformity WHERE status = 'issued'`), total: highRiskProviderTotal() || 1 };
    if (articleRef.startsWith("Art. 48")) return { count: q(`SELECT count(*) c FROM ce_marking_records WHERE status = 'affixed'`), total: highRiskProviderTotal() || 1 };
    return { count: q(`SELECT count(*) c FROM conformity_assessments WHERE outcome = 'passed'`), total: highRiskProviderTotal() || 1 };
  }
  if (path === "/provider/technical-documentation") {
    if (articleRef.startsWith("Art. 18")) return { count: q(`SELECT count(*) c FROM technical_documentation_sections WHERE retain_until IS NOT NULL`), total: highRiskProviderTotal() || 1 };
    return { count: q(`SELECT count(*) c FROM technical_documentation_sections WHERE status = 'approved'`), total: q(`SELECT count(*) c FROM technical_documentation_sections`) || 1 };
  }
  if (path === "/classification") {
    if (articleRef.startsWith("Art. 80")) return { count: q(`SELECT count(*) c FROM regulatory_challenges`), total: 1 };
    return { count: q(`SELECT count(*) c FROM high_risk_determinations`), total: systemsTotal() || 1 };
  }

  const MAP: Record<string, { sql: string; total?: () => number }> = {
    "/provider/risk-management": { sql: `SELECT count(*) c FROM risk_management_records`, total: () => highRiskProviderTotal() * 2 || 1 },
    "/provider/data-governance": { sql: `SELECT count(*) c FROM data_governance_records`, total: highRiskProviderTotal },
    "/provider/record-keeping": { sql: `SELECT count(*) c FROM record_keeping_logs`, total: () => highRiskProviderTotal() * 3 || 1 },
    "/provider/transparency-instructions": { sql: `SELECT count(*) c FROM transparency_instructions WHERE status = 'approved'`, total: highRiskProviderTotal },
    "/provider/human-oversight-design": { sql: `SELECT count(*) c FROM human_oversight_designs`, total: highRiskProviderTotal },
    "/provider/accuracy-robustness-cyber": { sql: `SELECT count(*) c FROM accuracy_robustness_records WHERE result IN ('tested','passed')`, total: () => highRiskProviderTotal() * 3 || 1 },
    "/provider": { sql: `SELECT count(*) c FROM ai_systems WHERE provider_role_applies = 1` },
    "/provider/qms": { sql: `SELECT count(*) c FROM qms_records WHERE status = 'complete'`, total: () => q(`SELECT count(*) c FROM qms_records`) || 1 },
    "/provider/eu-database": { sql: `SELECT count(*) c FROM eu_database_registrations WHERE status = 'registered'`, total: highRiskProviderTotal },
    "/provider/corrective-actions": { sql: `SELECT count(*) c FROM corrective_actions` },
    "/deployer/obligations": { sql: `SELECT count(*) c FROM deployer_obligation_checklists WHERE is_checked = 1`, total: () => highRiskDeployerTotal() * 7 || 1 },
    "/deployer/fria": { sql: `SELECT count(*) c FROM fria_assessments WHERE triggered = 1 AND status = 'complete'`, total: () => q(`SELECT count(*) c FROM fria_assessments WHERE triggered = 1`) || 1 },
    "/deployer/human-oversight-operation": { sql: `SELECT count(*) c FROM human_oversight_operations` },
    "/deployer/logs": { sql: `SELECT count(*) c FROM deployer_logs` },
    "/deployer/individual-rights": { sql: `SELECT count(*) c FROM complaints` },
    "/operations/transparency-certain-systems": { sql: `SELECT count(*) c FROM transparency_disclosures WHERE status = 'present'`, total: () => q(`SELECT count(*) c FROM transparency_disclosures`) || 1 },
    "/operations/gpai-integration": { sql: `SELECT count(*) c FROM gpai_integrations`, total: () => q(`SELECT count(*) c FROM ai_systems WHERE gpai_integration = 1`) || 1 },
    "/operations/post-market-monitoring": { sql: `SELECT count(*) c FROM post_market_monitoring_plans`, total: () => highRiskProviderTotal() || 1 },
    "/operations/incidents": { sql: `SELECT count(*) c FROM serious_incidents WHERE status IN ('reported','closed')`, total: () => q(`SELECT count(*) c FROM serious_incidents`) || 1 },
    "/assurance/internal-audit": { sql: `SELECT count(*) c FROM audit_findings` },
    "/governance": { sql: `SELECT count(*) c FROM authority_information_requests` },
    "/literacy": { sql: `SELECT count(*) c FROM ai_literacy_records WHERE completion_pct >= 80`, total: () => q(`SELECT count(*) c FROM ai_literacy_records`) || 1 },
  };
  const entry = MAP[path];
  if (!entry) return { count: 0, total: 1 };
  return { count: q(entry.sql), total: entry.total ? entry.total() : 1 };
}

export function computeEvidenceStatus(
  db: Database.Database,
  row: { id: string; article_ref: string; owning_module_path: string | null; is_not_applicable: number },
  linksByObligation: Record<string, { status: string }[]>
): EvidenceStatus {
  if (row.is_not_applicable) return "not_applicable";
  const links = linksByObligation[row.id];
  if (links && links.length > 0) {
    if (links.some((l) => l.status === "complete")) return "complete";
    if (links.some((l) => l.status === "partial")) return "partial";
    return "no_evidence";
  }
  const { count, total } = heuristicCount(db, row.article_ref, row.owning_module_path);
  if (count <= 0) return "no_evidence";
  if (total > 0 && count >= total) return "complete";
  return "partial";
}

// One-time illustrative evidence-link seeding — idempotent, keeps the matrix from being 100% heuristic-only.
export function ensureEvidenceLinksSeeded(db: Database.Database) {
  const existing = (db.prepare(`SELECT count(*) c FROM obligation_evidence_links`).get() as any).c;
  if (existing > 0) return;

  const obligations = db.prepare(`SELECT id, article_ref FROM regulatory_obligations_matrix`).all() as { id: string; article_ref: string }[];
  const findByArticle = (prefix: string) => obligations.find((o) => o.article_ref.startsWith(prefix))?.id;

  const anyRisk = db.prepare(`SELECT id, system_id FROM risk_management_records LIMIT 1`).get() as any;
  const anyTechDoc = db.prepare(`SELECT id, system_id FROM technical_documentation_sections WHERE status = 'approved' LIMIT 1`).get() as any;
  const anyFinding = db.prepare(`SELECT id, system_id FROM audit_findings WHERE finding_tag = 'compliant_but_risky' LIMIT 1`).get() as any;
  const anyFinding2 = db.prepare(`SELECT id, system_id FROM audit_findings WHERE finding_tag = 'formal_non_compliance' LIMIT 1`).get() as any;
  const anyLit = db.prepare(`SELECT id FROM ai_literacy_records LIMIT 1`).get() as any;
  const anyFria = db.prepare(`SELECT id, system_id FROM fria_assessments WHERE status = 'complete' LIMIT 1`).get() as any;

  const ins = db.prepare(
    `INSERT INTO obligation_evidence_links (id, obligation_id, system_id, evidence_table, evidence_record_id, status) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const rows: Array<[string | undefined, any, string, string]> = [
    [findByArticle("Art. 9"), anyRisk, "risk_management_records", "complete"],
    [findByArticle("Art. 11"), anyTechDoc, "technical_documentation_sections", "partial"],
    [findByArticle("Art. 82"), anyFinding, "audit_findings", "complete"],
    [findByArticle("Art. 83"), anyFinding2, "audit_findings", "complete"],
    [findByArticle("Art. 4"), anyLit, "ai_literacy_records", "partial"],
    [findByArticle("Art. 27"), anyFria, "fria_assessments", "complete"],
  ];
  for (const [obligationId, rec, table, status] of rows) {
    if (!obligationId || !rec) continue;
    ins.run(newId("oel"), obligationId, rec.system_id ?? null, table, rec.id, status);
  }
}
