// Pure, client-safe domain data for Assurance & Reporting (E1-E4) + A3 Literacy + A4 Governance.
// DB-backed evidence rollup logic lives in ./assurance-evidence.ts (server-only — touches better-sqlite3).

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

export type { EvidenceStatus } from "./assurance-evidence";

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
