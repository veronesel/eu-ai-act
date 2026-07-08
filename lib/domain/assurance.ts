// Pure domain data/logic for Assurance & Reporting (E1-E4) + A3 Literacy + A4 Governance.
import type Database from "better-sqlite3";
import { newId } from "@/lib/db/client";

// ============ E1 — finding tag teaching point ============
export const FINDING_TAG_META: Record<
  string,
  { label: string; article: string; tone: "risky" | "noncompliant"; description: string }
> = {
  compliant_but_risky: {
    label: "Compliant but risky",
    article: "Art. 82",
    tone: "risky",
    description:
      "The system passes every formal check yet an auditor judges it still presents risk in practice — Art. 82 requires Eurobank to act on that judgement even without a technical breach.",
  },
  formal_non_compliance: {
    label: "Formal non-compliance",
    article: "Art. 83",
    tone: "noncompliant",
    description:
      "A documented breach of a specific AI Act obligation — a gap against the letter of the Regulation, tracked separately from the substantive-risk judgement above.",
  },
};

// ============ E3 — obligations matrix evidence rollup ============
export type EvidenceStatus = "not_applicable" | "no_evidence" | "partial" | "complete";

// Maps an owning_module_path (disambiguated by article_ref where a path is shared) to a live count query.
function heuristicCount(db: Database.Database, articleRef: string, path: string | null): { count: number; total: number } {
  const q = (sql: string, ...args: any[]) => (db.prepare(sql).get(...args) as any)?.c ?? 0;
  const systemsTotal = () => q(`SELECT count(*) c FROM ai_systems`);
  const highRiskProviderTotal = () => q(`SELECT count(*) c FROM ai_systems WHERE classification_status = 'high_risk' AND provider_role_applies = 1`);
  const highRiskDeployerTotal = () => q(`SELECT count(*) c FROM ai_systems WHERE classification_status = 'high_risk' AND deployer_role_applies = 1`);

  if (!path) return { count: 0, total: 1 };

  // Disambiguate paths shared by multiple obligation rows using the article reference.
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
  const byArticle = Object.fromEntries(obligations.map((o) => [o.article_ref, o.id]));
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

// ============ E4 — Art. 99 penalty tiers ============
export const PENALTY_TIERS = [
  {
    key: "prohibited_practice",
    label: "Prohibited-practice infringement",
    article: "Art. 99(3)",
    flatFeeEUR: 35_000_000,
    pctOfTurnover: 7,
    description: "Placing on the market, putting into service, or using an AI practice banned outright under Art. 5.",
  },
  {
    key: "high_risk_obligation",
    label: "High-risk / Art. 50 obligation infringement",
    article: "Art. 99(4)",
    flatFeeEUR: 15_000_000,
    pctOfTurnover: 3,
    description: "Non-compliance with the provider, deployer, or transparency (Art. 50) obligations that apply to a high-risk or certain other regulated system.",
  },
  {
    key: "incorrect_information",
    label: "Incorrect, incomplete, or misleading information to authorities",
    article: "Art. 99(5)",
    flatFeeEUR: 7_500_000,
    pctOfTurnover: 1.5,
    description: "Supplying incorrect, incomplete, or misleading information to notified bodies or competent national authorities in reply to a request.",
  },
] as const;

export const DEFAULT_TURNOVER_EUR = 4_200_000_000;

// ============ A4 — governance constellation ============
export interface AuthorityNode {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  color: string;
  what: string;
  canCompel: string;
  article: string;
}

export const AUTHORITY_NODES: AuthorityNode[] = [
  {
    id: "bankit",
    label: "Banca d'Italia",
    shortLabel: "Banca d'Italia",
    x: 50,
    y: 14,
    color: "#10B981",
    what: "Italy's designated national competent market surveillance authority for the AI Act in the financial sector (Art. 70, Art. 74(8)).",
    canCompel:
      "Investigate a placed or deployed AI system, demand technical documentation and evidence, order corrective action or market withdrawal, issue reasoned information requests (Art. 21), and challenge a provider's non-high-risk self-assessment (Art. 80).",
    article: "Art. 70, 74-79, 80, 21",
  },
  {
    id: "ecb",
    label: "ECB / Single Supervisory Mechanism",
    shortLabel: "ECB / SSM",
    x: 85,
    y: 38,
    color: "#06B6D4",
    what: "Eurobank's prudential supervisor under the Single Supervisory Mechanism — not an AI Act competent authority in its own right.",
    canCompel:
      "Assess AI-related operational and model risk through ordinary prudential supervision (SREP) and expect AI governance to be embedded in existing risk-management and internal-control frameworks. Coordinates with, but does not substitute for, Banca d'Italia's AI Act role.",
    article: "SSM Regulation (EU) 1024/2013 — not an AI Act instrument",
  },
  {
    id: "aioffice",
    label: "EU AI Office",
    shortLabel: "EU AI Office",
    x: 50,
    y: 86,
    color: "#8B5CF6",
    what: "The European Commission body responsible for GPAI model oversight and for coordinating high-risk AI Act enforcement across the Union.",
    canCompel:
      "Its direct enforcement competence reaches mainly upstream — the GPAI model providers Eurobank integrates (Art. 88-94) — rather than Eurobank's own provider/deployer conduct, which stays with Banca d'Italia under the financial-institution carve-out (Art. 74(8)). It can still issue guidance and coordinate cross-border cases that touch Eurobank indirectly.",
    article: "Art. 88-94, Art. 74(8)",
  },
  {
    id: "garante",
    label: "Garante per la protezione dei dati personali",
    shortLabel: "Garante (DPA)",
    x: 15,
    y: 38,
    color: "#6366F1",
    what: "Italy's national data protection authority, competent for GDPR matters that arise inside an AI system (e.g. profiling, biometric data, special-category data used for bias testing).",
    canCompel:
      "Investigate and sanction GDPR-relevant processing, receive DPIA consultations, and coordinate with Banca d'Italia where an AI Act finding also raises a data-protection question — most visibly through the FRIA/DPIA cross-reference (Art. 27).",
    article: "GDPR Art. 51-59; cross-referenced via Art. 27",
  },
  {
    id: "art77",
    label: "Art. 77 fundamental-rights body",
    shortLabel: "Art. 77 body",
    x: 26,
    y: 68,
    color: "#F59E0B",
    what: "The national body designated to oversee fundamental-rights and equality implications of high-risk AI use — in Italy this role sits with the national equality/anti-discrimination body network.",
    canCompel:
      "Request access to AI Act documentation (technical documentation, logs, FRIA output) where relevant to protecting fundamental rights, and refer concerns onward to Banca d'Italia as market surveillance authority.",
    article: "Art. 77",
  },
];
