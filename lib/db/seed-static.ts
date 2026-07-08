import { getDb, newId, nowIso } from "./client";

export const ROLES = [
  { id: "user_exec", role_code: "EXEC_SPONSOR", name: "Alessandra Ferri", title: "Deputy CEO & Chief AI Officer", mission: "Own the AI Act posture at board level; approve policy and EU database sign-offs (Art. 4, Art. 49)" },
  { id: "user_reg", role_code: "REG_COMPLIANCE_LEAD", name: "Francesca Riva", title: "Head of AI Regulatory Affairs", mission: "Own classification, obligations mapping, and the Banca d'Italia / AI Office relationship" },
  { id: "user_prod", role_code: "AI_PRODUCT_OWNER", name: "Davide Colombo", title: "Head of Retail Credit Models", mission: "Own Provider-side obligations for systems Eurobank builds (Art. 9-17, Annex IV)" },
  { id: "user_risk", role_code: "AI_MODEL_RISK_MGR", name: "Giulia Santoro", title: "AI & Model Risk Manager", mission: "Run risk management, accuracy/robustness/cyber testing (Art. 9, Art. 15)" },
  { id: "user_data", role_code: "DATA_GOVERNANCE_LEAD", name: "Elena Marchetti", title: "Chief Data Steward", mission: "Govern training/validation/test data quality and provenance (Art. 10)" },
  { id: "user_qms", role_code: "QUALITY_CONFORMITY_MGR", name: "Marco Bellini", title: "Head of AI Quality & Conformity", mission: "Run the QMS, conformity assessment, CE marking, EU database registration (Art. 17, 43, 47-49)" },
  { id: "user_deploy", role_code: "DEPLOYER_OPS_MGR", name: "Chiara Moretti", title: "Head of AI Deployment Operations", mission: "Own Deployer obligations, human oversight in operation, FRIA, incident escalation (Art. 26, 27, 73)" },
  { id: "user_audit", role_code: "INTERNAL_AUDITOR", name: "Riccardo De Luca", title: "Head of Internal Audit", mission: "Independent assurance across the whole AI Act program" },
] as const;

export const PERMISSION_MATRIX: Record<string, { readAll: boolean; write: string[] }> = {
  EXEC_SPONSOR: { readAll: true, write: ["approvals"] },
  REG_COMPLIANCE_LEAD: { readAll: true, write: ["classification", "obligations_matrix", "regulatory_change_watch", "governance"] },
  AI_PRODUCT_OWNER: { readAll: true, write: ["provider_suite_owned"] },
  AI_MODEL_RISK_MGR: { readAll: true, write: ["risk_management", "accuracy_robustness"] },
  DATA_GOVERNANCE_LEAD: { readAll: true, write: ["data_governance"] },
  QUALITY_CONFORMITY_MGR: { readAll: true, write: ["qms", "conformity_assessment", "eu_database", "ce_marking", "declarations"] },
  DEPLOYER_OPS_MGR: { readAll: true, write: ["deployer_suite_owned"] },
  INTERNAL_AUDITOR: { readAll: true, write: ["internal_audit"] },
};

const BASELINES = [
  {
    id: "original_2024_1689",
    label: "Original AI Act timeline (Regulation (EU) 2024/1689 as adopted)",
    description: "The timeline as it appears in the Regulation as originally adopted and published in the Official Journal, unaffected by the Digital Omnibus.",
    annex_iii_standalone_date: "2026-08-02",
    annex_i_embedded_date: "2027-08-02",
    art5_ncii_csam_date: null,
    art50_2_watermark_existing_date: "2026-08-02",
    sandboxes_date: "2026-08-02",
    art50_general_transparency_date: "2026-08-02",
    art51_55_gpai_date: "2025-08-02",
    is_default: 0,
  },
  {
    id: "digital_omnibus_agreed",
    label: "Digital Omnibus on AI (agreed text, pending OJ publication)",
    description: "Political agreement reached by Council (29 Jun 2026) and European Parliament (16 Jun 2026). Not yet published in the Official Journal. Regulation (EU) 2024/1689 as originally adopted remains binding law until publication.",
    annex_iii_standalone_date: "2027-12-02",
    annex_i_embedded_date: "2028-08-02",
    art5_ncii_csam_date: "2026-12-02",
    art50_2_watermark_existing_date: "2026-12-02",
    sandboxes_date: "2027-08-02",
    art50_general_transparency_date: "2026-08-02",
    art51_55_gpai_date: "2025-08-02",
    is_default: 1,
  },
];

const OBLIGATIONS: Array<{ article: string; obligation: string; module: string; path: string; persona: string; na?: string }> = [
  { article: "Art. 5(1)(a)-(f)", obligation: "Screen out and block prohibited AI practices before build", module: "A2 Classification & Screening", path: "/classification", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 6, Annex III", obligation: "Classify as high-risk (or confirm the narrow Art. 6(3) exception)", module: "A2 Classification & Screening", path: "/classification", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 9", obligation: "Establish and maintain a risk management system across the lifecycle", module: "B1 Risk Management System", path: "/provider/risk-management", persona: "AI_MODEL_RISK_MGR" },
  { article: "Art. 10", obligation: "Govern training/validation/test data quality, provenance, bias examination", module: "B2 Data Governance", path: "/provider/data-governance", persona: "DATA_GOVERNANCE_LEAD" },
  { article: "Art. 11, Annex IV", obligation: "Maintain technical documentation", module: "B3 Technical Documentation", path: "/provider/technical-documentation", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 12, Art. 19", obligation: "Maintain automatically generated, immutable logs", module: "B4 Record-Keeping", path: "/provider/record-keeping", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 13", obligation: "Provide instructions for use to deployers", module: "B5 Transparency & Instructions for Use", path: "/provider/transparency-instructions", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 14 (design)", obligation: "Design human oversight measures into the system", module: "B6 Human Oversight - Design", path: "/provider/human-oversight-design", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 15", obligation: "Ensure accuracy, robustness, cybersecurity", module: "B7 Accuracy, Robustness & Cybersecurity", path: "/provider/accuracy-robustness-cyber", persona: "AI_MODEL_RISK_MGR" },
  { article: "Art. 16", obligation: "General provider-obligations umbrella", module: "B1-B11 (collectively)", path: "/provider", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 17", obligation: "Maintain a quality management system", module: "B8 Quality Management System", path: "/provider/qms", persona: "QUALITY_CONFORMITY_MGR" },
  { article: "Art. 25", obligation: "Determine value-chain responsibility shifts on substantial modification", module: "D2 GPAI Downstream Integration", path: "/operations/gpai-integration", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 43, Annex VI/VII", obligation: "Conduct conformity assessment", module: "B9 Conformity Assessment", path: "/provider/conformity-assessment", persona: "QUALITY_CONFORMITY_MGR" },
  { article: "Art. 47", obligation: "Issue the EU declaration of conformity", module: "B10 EU Declaration of Conformity & CE Marking", path: "/provider/conformity-assessment", persona: "QUALITY_CONFORMITY_MGR" },
  { article: "Art. 48", obligation: "Affix CE marking", module: "B10 EU Declaration of Conformity & CE Marking", path: "/provider/conformity-assessment", persona: "QUALITY_CONFORMITY_MGR" },
  { article: "Art. 49, Art. 71, Annex VIII", obligation: "Register in the EU database for high-risk AI systems", module: "B11 EU Database Registration", path: "/provider/eu-database", persona: "QUALITY_CONFORMITY_MGR" },
  { article: "Art. 18", obligation: "Retain technical documentation and QMS records for 10 years from placing on the market", module: "B3/B4 Retention", path: "/provider/technical-documentation", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 20", obligation: "Take corrective action on non-conforming systems; inform downstream parties and authorities", module: "B12 Corrective Actions", path: "/provider/corrective-actions", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 21", obligation: "Cooperate with competent authorities on reasoned information requests", module: "A4 Governance & Competent Authority Map", path: "/governance", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 22", obligation: "Appoint an EU authorised representative (non-EU-established providers only)", module: "N/A", path: "/help/regulatory-context", persona: "REG_COMPLIANCE_LEAD", na: "Eurobank is an Italian-established entity; this obligation only attaches to providers established outside the Union." },
  { article: "Art. 23", obligation: "Importer obligations (third-country product importers only)", module: "N/A", path: "/help/regulatory-context", persona: "REG_COMPLIANCE_LEAD", na: "Eurobank does not place a third party's high-risk system on the EU market for resale/onward supply." },
  { article: "Art. 24", obligation: "Distributor obligations (supply-chain resellers only)", module: "N/A", path: "/help/regulatory-context", persona: "REG_COMPLIANCE_LEAD", na: "Eurobank deploys vendor systems internally under its own authority, which is deployment, not distribution." },
  { article: "Art. 26", obligation: "Deployer obligations: oversight assignment, monitoring, log-keeping, cooperation", module: "C1 Deployer Obligation Checklist", path: "/deployer/obligations", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 27", obligation: "Conduct a fundamental rights impact assessment where triggered", module: "C2 FRIA", path: "/deployer/fria", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 14 (operation)", obligation: "Operate human oversight in production", module: "C3 Human Oversight - Operation", path: "/deployer/human-oversight-operation", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 26(6)", obligation: "Retain deployer logs for at least 6 months", module: "C4 Deployer Logs & Retention", path: "/deployer/logs", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 80", obligation: "Respond to a market-surveillance challenge of a provider's non-high-risk self-assessment", module: "A2 (regulatory challenge scenario)", path: "/classification", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 82", obligation: "Recognise that a formally compliant system can still be found to present a risk", module: "E1 Internal Audit (finding tag)", path: "/assurance/internal-audit", persona: "INTERNAL_AUDITOR" },
  { article: "Art. 83", obligation: "Track formal/administrative non-compliance distinct from substantive risk", module: "E1 Internal Audit (finding tag)", path: "/assurance/internal-audit", persona: "INTERNAL_AUDITOR" },
  { article: "Art. 85", obligation: "Provide a channel for individuals to lodge a complaint with the market surveillance authority", module: "C5 Individual Rights & Remedies", path: "/deployer/individual-rights", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 86", obligation: "Give affected individuals a clear, meaningful explanation of an AI-assisted decision", module: "C5 Individual Rights & Remedies", path: "/deployer/individual-rights", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 87", obligation: "Cross-reference infringement-reporting/whistleblower protections", module: "C5 Individual Rights & Remedies", path: "/deployer/individual-rights", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 50(1),(3),(4)", obligation: "Disclose AI interaction / emotion-recognition / biometric-categorization use to natural persons", module: "D1 Transparency for Certain Systems", path: "/operations/transparency-certain-systems", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 50(2)", obligation: "Machine-readable watermarking of generative output", module: "D1 Transparency for Certain Systems", path: "/operations/transparency-certain-systems", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 51-55", obligation: "Track integrated GPAI vendor models' provider obligations (due-diligence/reference)", module: "D2 GPAI Downstream Integration", path: "/operations/gpai-integration", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 25 + Art. 53", obligation: "Assess provider-shift risk from fine-tuning an integrated GPAI model, and enumerate Art. 53 obligations if the shift is confirmed", module: "D2 GPAI Downstream Integration", path: "/operations/gpai-integration", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 4", obligation: "Promote and encourage AI literacy with proportionate measures", module: "A3 AI Literacy Program", path: "/literacy", persona: "EXEC_SPONSOR" },
  { article: "Art. 72", obligation: "Conduct post-market monitoring", module: "D3 Post-Market Monitoring", path: "/operations/post-market-monitoring", persona: "AI_PRODUCT_OWNER" },
  { article: "Art. 73", obligation: "Report serious incidents within the statutory tiered deadlines", module: "D4 Serious Incident Reporting", path: "/operations/incidents", persona: "DEPLOYER_OPS_MGR" },
  { article: "Art. 74-84", obligation: "Cooperate with the competent market surveillance authority", module: "A4 Governance & Competent Authority Map", path: "/governance", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Art. 99", obligation: "Understand penalty-tier exposure", module: "E4 Penalty Exposure Reference", path: "/assurance/penalties-exposure", persona: "EXEC_SPONSOR" },
  { article: "Digital Omnibus, new Art. 5 limb", obligation: "Screen for AI-generated non-consensual intimate imagery / CSAM", module: "A2 (extended checklist)", path: "/classification", persona: "REG_COMPLIANCE_LEAD" },
  { article: "Digital Omnibus, special-category-data basis", obligation: "Document the necessity-test rationale for bias-testing data use", module: "B2 Data Governance", path: "/provider/data-governance", persona: "DATA_GOVERNANCE_LEAD" },
  { article: "Digital Omnibus, Annex VIII reinstatement", obligation: "Always capture the self-assessment summary for Art. 6(3)-exception systems", module: "B11 EU Database Registration", path: "/provider/eu-database", persona: "QUALITY_CONFORMITY_MGR" },
];

const REGULATORY_CHANGE_WATCH = [
  { instrument: "Digital Omnibus on AI", title: "Political agreement reached between Council and European Parliament", summary: "Council adopted its position 29 Jun 2026; European Parliament endorsed 16 Jun 2026. Amends AI Act timelines, the Art. 5 prohibitions list, Annex VIII, and the special-category-data lawful basis for bias testing. Not yet published in the Official Journal.", status: "agreed", date_basis: "Council 29 Jun 2026 / EP 16 Jun 2026", source_note: "Seeded reference entry — offline demo corpus, not a live feed." },
  { instrument: "GPAI Code of Practice", title: "General-Purpose AI Code of Practice published", summary: "Voluntary code of practice for GPAI model providers, intended to help demonstrate compliance with Art. 53 and Art. 55 pending harmonised standards.", status: "in_force", date_basis: "Published 10 Jul 2025", source_note: "Seeded reference entry — offline demo corpus, not a live feed." },
  { instrument: "High-Risk Classification Guidelines", title: "Commission draft guidelines on Annex III high-risk classification", summary: "Draft Commission guidelines clarifying the Art. 6(3) narrow-exception test and Annex III category boundaries.", status: "draft", date_basis: "Draft circulated 19 May 2026", source_note: "Seeded reference entry — offline demo corpus, not a live feed." },
  { instrument: "Art. 50 Transparency Guidelines", title: "Draft guidelines on Art. 50 transparency obligations", summary: "Draft Commission guidance on disclosure obligations for AI-interaction, emotion recognition, biometric categorisation and generative-content watermarking.", status: "draft", date_basis: "Draft circulated 8 May 2026", source_note: "Seeded reference entry — offline demo corpus, not a live feed." },
];

const QMS_POLICY_AREAS = [
  "Regulatory-compliance strategy",
  "Design, quality-control and quality-assurance techniques",
  "Examination, test and validation procedures",
  "Technical specifications, including standards applied",
  "Data-management systems and procedures",
  "The Art. 9 risk-management system as embedded in the QMS",
  "Post-market monitoring procedures",
  "Incident-handling procedures",
  "Communication with authorities procedures",
  "Accountability framework defining management responsibility",
];

export function seedStatic() {
  const db = getDb();
  const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, role_code, name, title, mission) VALUES (@id, @role_code, @name, @title, @mission)`);
  const tx = db.transaction(() => {
    for (const r of ROLES) insertUser.run(r);

    const insertBaseline = db.prepare(`INSERT OR IGNORE INTO regulatory_baselines
      (id, label, description, annex_iii_standalone_date, annex_i_embedded_date, art5_ncii_csam_date, art50_2_watermark_existing_date, sandboxes_date, art50_general_transparency_date, art51_55_gpai_date, is_default)
      VALUES (@id, @label, @description, @annex_iii_standalone_date, @annex_i_embedded_date, @art5_ncii_csam_date, @art50_2_watermark_existing_date, @sandboxes_date, @art50_general_transparency_date, @art51_55_gpai_date, @is_default)`);
    for (const b of BASELINES) insertBaseline.run(b);

    const obligationCount = db.prepare(`SELECT COUNT(*) c FROM regulatory_obligations_matrix`).get() as { c: number };
    if (obligationCount.c === 0) {
      const insertObl = db.prepare(`INSERT INTO regulatory_obligations_matrix (id, article_ref, obligation, owning_module, owning_module_path, primary_persona, is_not_applicable, not_applicable_rationale) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const o of OBLIGATIONS) {
        insertObl.run(newId("obl"), o.article, o.obligation, o.module, o.path, o.persona, o.na ? 1 : 0, o.na ?? null);
      }
    }

    const changeWatchCount = db.prepare(`SELECT COUNT(*) c FROM regulatory_change_watch`).get() as { c: number };
    if (changeWatchCount.c === 0) {
      const insertChange = db.prepare(`INSERT INTO regulatory_change_watch (id, instrument, title, summary, status, date_basis, source_note, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'seed', ?)`);
      for (const c of REGULATORY_CHANGE_WATCH) {
        insertChange.run(newId("chg"), c.instrument, c.title, c.summary, c.status, c.date_basis, c.source_note, nowIso());
      }
    }

    const qmsCount = db.prepare(`SELECT COUNT(*) c FROM qms_records`).get() as { c: number };
    if (qmsCount.c === 0) {
      const insertQms = db.prepare(`INSERT INTO qms_records (id, policy_area, owner_id, policy_document_link, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
      QMS_POLICY_AREAS.forEach((area, i) => {
        insertQms.run(newId("qms"), area, "user_qms", null, i < 6 ? "in_progress" : "not_started", nowIso());
      });
    }

    const literacyCount = db.prepare(`SELECT COUNT(*) c FROM ai_literacy_records`).get() as { c: number };
    if (literacyCount.c === 0) {
      const insertLit = db.prepare(`INSERT INTO ai_literacy_records (id, department, role_code, training_name, completion_pct, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
      const depts: Array<[string, string, number]> = [
        ["Retail Credit Models", "AI_PRODUCT_OWNER", 92],
        ["Model Risk", "AI_MODEL_RISK_MGR", 88],
        ["Data Governance", "DATA_GOVERNANCE_LEAD", 95],
        ["Quality & Conformity", "QUALITY_CONFORMITY_MGR", 80],
        ["Deployment Operations", "DEPLOYER_OPS_MGR", 74],
        ["Internal Audit", "INTERNAL_AUDITOR", 100],
        ["Executive Committee", "EXEC_SPONSOR", 65],
        ["Regulatory Affairs", "REG_COMPLIANCE_LEAD", 97],
      ];
      for (const [dept, role, pct] of depts) {
        insertLit.run(newId("lit"), dept, role, "EU AI Act Foundations (Art. 4 literacy programme)", pct, nowIso());
      }
    }
  });
  tx();
}

export function getActiveBaselineId(): string {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM regulatory_baselines WHERE is_default = 1`).get() as { id: string } | undefined;
  return row?.id ?? "digital_omnibus_agreed";
}
