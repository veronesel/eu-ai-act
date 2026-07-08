// Canonical 10-system demo portfolio — shape is fixed (§7), specifics vary per regeneration (§13).
export type BiometricsBranch = "identification" | "categorisation" | "emotion_recognition" | "verification_excluded" | "not_biometric";

export interface SystemTemplate {
  key: string; // stable demo_seed_key across regenerations
  nameOptions: string[];
  descriptionOptions: string[];
  businessFunction: string;
  ownerId: string;
  providerRoleApplies: boolean;
  deployerRoleApplies: boolean;
  gpaiIntegration: boolean;
  gpaiModelReference?: string;
  fineTunedByEurobank?: boolean;
  // Classification facts (ground truth the generator seeds; the agent must independently re-derive these)
  prohibited: { limb: string; result: "pass" | "fail"; rationale: string }[];
  annexIIICategory: string | null;
  biometricsBranch: BiometricsBranch;
  art63: { limb1: "yes" | "no"; limb2: "yes" | "no"; limb3: "yes" | "no"; limb4: "yes" | "no"; performsProfiling: boolean; claimed: boolean } | null;
  finalDetermination: "not_high_risk" | "high_risk" | "prohibited_blocked" | "out_of_scope";
  determinationRationale: string;
  friaTrigger: boolean;
  friaTriggerReason?: string;
  conformityRoute: "not_applicable" | "internal_control_annex_vi" | "notified_body_annex_vii";
}

const PROHIBITED_LIMBS = ["ab", "c", "d", "e", "f", "g", "h", "omnibus_ncii"];

function allPass(rationaleFn: (limb: string) => string) {
  return PROHIBITED_LIMBS.map((limb) => ({ limb, result: "pass" as const, rationale: rationaleFn(limb) }));
}

export const PORTFOLIO: SystemTemplate[] = [
  {
    key: "sys_credit_mortgage",
    nameOptions: ["Retail Mortgage Affordability Model", "Retail Mortgage & Consumer Credit Scoring Model", "Home Lending Creditworthiness Engine"],
    descriptionOptions: [
      "An in-house model that scores retail mortgage and consumer credit applicants on creditworthiness using income, bureau, and behavioural features, producing an approve/refer/decline recommendation reviewed by a credit officer.",
    ],
    businessFunction: "Retail Credit Underwriting",
    ownerId: "user_prod",
    providerRoleApplies: true,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: no manipulative, exploitative, social-scoring, or biometric element present in a creditworthiness model of this design.`),
    annexIIICategory: "5(b) creditworthiness / credit scoring",
    biometricsBranch: "not_biometric",
    art63: null,
    finalDetermination: "high_risk",
    determinationRationale: "Matches Annex III point 5(b) (evaluation of creditworthiness / credit scoring of natural persons). The Art. 6(3) narrow-exception test was considered but not claimed: the model materially influences the credit decision rather than performing a narrow procedural task, so it is high-risk without qualification.",
    friaTrigger: true,
    friaTriggerReason: "Annex III 5(b) creditworthiness/credit-scoring system deployed by Eurobank (Art. 27(1)).",
    conformityRoute: "internal_control_annex_vi",
  },
  {
    key: "sys_credit_sme",
    nameOptions: ["SME Credit Risk Rating Model", "Business Lending Risk Rating Engine", "Corporate & SME Credit Scoring Model"],
    descriptionOptions: [
      "An in-house model that rates small and medium enterprise borrowers for credit risk using financial statement data, sector risk, and repayment history, feeding the SME lending decision workflow.",
    ],
    businessFunction: "SME Credit Risk",
    ownerId: "user_prod",
    providerRoleApplies: true,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: no manipulative, exploitative, social-scoring, or biometric element present in an SME credit-rating model of this design.`),
    annexIIICategory: "5(b) creditworthiness / credit scoring",
    biometricsBranch: "not_biometric",
    art63: null,
    finalDetermination: "high_risk",
    determinationRationale: "Matches Annex III point 5(b) (evaluation of creditworthiness / credit scoring of natural persons, extended to sole traders/SME principals). Same obligation family as the retail mortgage model (#1); second high-risk system in the credit-scoring portfolio.",
    friaTrigger: true,
    friaTriggerReason: "Annex III 5(b) creditworthiness/credit-scoring system deployed by Eurobank (Art. 27(1)). Similar in kind to the retail mortgage FRIA (#1) — eligible for the Art. 27(2) reuse action.",
    conformityRoute: "internal_control_annex_vi",
  },
  {
    key: "sys_hr_recruitment",
    nameOptions: ["AI-Assisted Recruitment Screening Tool", "Candidate CV Screening & Ranking Assistant", "Recruitment Shortlisting AI"],
    descriptionOptions: [
      "An in-house tool that screens and ranks job applicant CVs against role requirements to produce a shortlist for recruiters, used across Eurobank's hiring pipeline.",
    ],
    businessFunction: "Human Resources - Recruitment",
    ownerId: "user_prod",
    providerRoleApplies: true,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: recruitment screening on job-relevant criteria; no manipulation, social scoring, or biometric element identified.`),
    annexIIICategory: "4(a) employment / recruitment",
    biometricsBranch: "not_biometric",
    art63: null,
    finalDetermination: "high_risk",
    determinationRationale: "Matches Annex III point 4(a) (recruitment or selection of natural persons, in particular targeted job advertisements, analysing/filtering applications, evaluating candidates). Directly shortlists candidates, so it is not a narrow procedural task under Art. 6(3).",
    friaTrigger: false,
    conformityRoute: "internal_control_annex_vi",
  },
  {
    key: "sys_hr_monitoring",
    nameOptions: ["Staff Performance & Task Allocation Monitoring", "Workforce Productivity & Task Allocation AI", "Employee Performance Monitoring System"],
    descriptionOptions: [
      "An in-house system that monitors staff task completion and allocates work items across operations teams based on predicted performance and workload, informing manager decisions on task assignment and performance review input.",
    ],
    businessFunction: "Operations - Workforce Management",
    ownerId: "user_prod",
    providerRoleApplies: true,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: workforce monitoring on task/performance metrics; no manipulation, social scoring, or biometric/emotion element identified.`),
    annexIIICategory: "4(b) employment / worker management",
    biometricsBranch: "not_biometric",
    art63: null,
    finalDetermination: "high_risk",
    determinationRationale: "Matches Annex III point 4(b) (monitoring and evaluation of performance/behaviour of persons in employment relationships). Influences task allocation and performance-review input directly, so it is not a narrow procedural task under Art. 6(3).",
    friaTrigger: false,
    conformityRoute: "internal_control_annex_vi",
  },
  {
    key: "sys_aml_fraud",
    nameOptions: ["AML / Fraud Transaction Monitoring AI", "Real-Time Payment Fraud Detection Model", "Anti-Money-Laundering Transaction Screening AI"],
    descriptionOptions: [
      "An in-house model that scores payment transactions in real time for anti-money-laundering and fraud risk, flagging suspicious activity for the financial-crime investigations team.",
    ],
    businessFunction: "Financial Crime - AML/Fraud",
    ownerId: "user_prod",
    providerRoleApplies: true,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: fraud/AML transaction scoring; no manipulation, social scoring, or biometric element identified.`),
    annexIIICategory: null,
    biometricsBranch: "not_biometric",
    art63: { limb1: "no", limb2: "no", limb3: "yes", limb4: "no", performsProfiling: false, claimed: true },
    finalDetermination: "not_high_risk",
    determinationRationale: "Annex III point 5(b) expressly excludes AI systems used for the purpose of detecting financial fraud. The system's sole purpose is fraud/AML detection, not creditworthiness scoring, so it falls outside 5(b) rather than merely qualifying for the Art. 6(3) exception. Recorded as a considered negative determination, not a default.",
    friaTrigger: false,
    conformityRoute: "not_applicable",
  },
  {
    key: "sys_chatbot",
    nameOptions: ["Customer Service Virtual Assistant", "Digital Banking Chatbot Assistant", "Customer Support AI Assistant"],
    descriptionOptions: [
      "A customer-facing conversational assistant built on a licensed third-party GPAI model, fine-tuned by Eurobank on internal product and policy documents to answer customer service queries in the mobile banking app.",
    ],
    businessFunction: "Customer Service",
    ownerId: "user_deploy",
    providerRoleApplies: false,
    deployerRoleApplies: true,
    gpaiIntegration: true,
    gpaiModelReference: "Vendor foundation model (licensed, fine-tuned in-house)",
    fineTunedByEurobank: true,
    prohibited: allPass((l) => `Limb ${l}: customer service chatbot; no manipulation, social scoring, or biometric element identified.`),
    annexIIICategory: null,
    biometricsBranch: "not_biometric",
    art63: null,
    finalDetermination: "not_high_risk",
    determinationRationale: "Not an Annex III system. Art. 50(1) AI-interaction transparency applies as a natural-person-facing conversational system. Because Eurobank fine-tuned the underlying GPAI model in a way that could change its intended purpose, the Art. 25 provider-shift check is flagged for review (see D2).",
    friaTrigger: false,
    conformityRoute: "not_applicable",
  },
  {
    key: "sys_video_kyc",
    nameOptions: ["Video KYC Identity & Watchlist Screening", "Remote Biometric Identity Verification & Watchlist Screening", "Digital Onboarding Biometric Screening AI"],
    descriptionOptions: [
      "A licensed vendor system used during digital account opening that captures a live facial image and matches it 1:many against a sanctions/PEP reference database to identify watchlisted individuals, in addition to confirming the applicant's claimed identity.",
    ],
    businessFunction: "Customer Onboarding - KYC",
    ownerId: "user_deploy",
    providerRoleApplies: false,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: watchlist/identity screening at onboarding; no manipulation, social scoring, workplace emotion-inference, or law-enforcement real-time biometric element identified.`),
    annexIIICategory: "1(a) biometric identification",
    biometricsBranch: "identification",
    art63: null,
    finalDetermination: "high_risk",
    determinationRationale: "Matches Annex III point 1(a). The system performs remote biometric IDENTIFICATION — matching a captured facial image 1:many against a sanctions/PEP reference database to determine who the person is among many candidates. This is distinct from, and not covered by, the Annex III point 1(a) carve-out for biometric VERIFICATION (1:1 confirmation that a person is who they claim to be), which applies only to the identity-confirmation half of this system's function. Because the watchlist-matching function is 1:many identification, the system as a whole is correctly classified high-risk.",
    friaTrigger: false,
    conformityRoute: "not_applicable",
  },
  {
    key: "sys_credit_memo",
    nameOptions: ["AI Credit-Memo Drafting & Summarization Copilot", "Credit Memo Drafting Assistant", "Loan Committee Memo Summarization Copilot"],
    descriptionOptions: [
      "An in-house copilot, built on a licensed GPAI model, that drafts and summarizes credit memos for relationship managers ahead of loan committee review; a human relationship manager edits and owns the final memo.",
    ],
    businessFunction: "Corporate Banking - Credit Memo Preparation",
    ownerId: "user_prod",
    providerRoleApplies: true,
    deployerRoleApplies: true,
    gpaiIntegration: true,
    gpaiModelReference: "Vendor foundation model (licensed, lightly prompted, not fine-tuned)",
    fineTunedByEurobank: false,
    prohibited: allPass((l) => `Limb ${l}: drafting/summarization copilot; no manipulation, social scoring, or biometric element identified.`),
    annexIIICategory: null,
    biometricsBranch: "not_biometric",
    art63: { limb1: "yes", limb2: "yes", limb3: "no", limb4: "no", performsProfiling: false, claimed: true },
    finalDetermination: "not_high_risk",
    determinationRationale: "Not an Annex III system — drafts and summarizes text for human review rather than scoring, ranking, or deciding on natural persons. Deliberately low-risk contrast case to the flagship credit-scoring systems. Limited Art. 50(1) transparency applies as an AI-drafted content assistant.",
    friaTrigger: false,
    conformityRoute: "not_applicable",
  },
  {
    key: "sys_social_scoring_blocked",
    nameOptions: ["\"Customer Trustworthiness Score\" proposal", "\"Universal Customer Reliability Index\" proposal", "\"Customer Behaviour Trust Score\" proposal"],
    descriptionOptions: [
      "A proposed cross-product score that would evaluate customers' general trustworthiness from banking behaviour, social media signals, and payment history, and use the resulting score to determine eligibility and pricing across unrelated products and services.",
    ],
    businessFunction: "Proposed - Cross-Product Customer Scoring",
    ownerId: "user_reg",
    providerRoleApplies: false,
    deployerRoleApplies: false,
    gpaiIntegration: false,
    prohibited: [
      ...PROHIBITED_LIMBS.filter((l) => l !== "c").map((limb) => ({ limb, result: "pass" as const, rationale: `Limb ${limb}: not implicated by this proposal.` })),
      { limb: "c", result: "fail" as const, rationale: "The proposal evaluates or classifies natural persons over a period of time based on social behaviour and inferred personal characteristics unrelated to the context in which the data was generated, and uses the resulting score to affect customers' access to and pricing of unrelated products — a textbook Art. 5(1)(c) social-scoring practice leading to detrimental treatment disproportionate to the original context." },
    ],
    annexIIICategory: null,
    biometricsBranch: "not_biometric",
    art63: null,
    finalDetermination: "prohibited_blocked",
    determinationRationale: "Blocked under Art. 5(1)(c): social scoring of natural persons leading to unjustified or disproportionate detrimental treatment in unrelated contexts. The system was never built — screening stopped it at the proposal stage.",
    friaTrigger: false,
    conformityRoute: "not_applicable",
  },
  {
    key: "sys_faceid_login",
    nameOptions: ["Mobile Banking App Face-ID Login", "Biometric App Login (Face Match)", "Mobile App Biometric Sign-In"],
    descriptionOptions: [
      "A licensed vendor biometric login feature that compares a live selfie against the single facial template the customer enrolled on their own device, solely to confirm the app user is the account holder before granting access — a 1:1 match with no reference database.",
    ],
    businessFunction: "Digital Channels - App Authentication",
    ownerId: "user_deploy",
    providerRoleApplies: false,
    deployerRoleApplies: true,
    gpaiIntegration: false,
    prohibited: allPass((l) => `Limb ${l}: on-device biometric login; no manipulation, social scoring, workplace emotion-inference, or law-enforcement real-time biometric element identified.`),
    annexIIICategory: null,
    biometricsBranch: "verification_excluded",
    art63: null,
    finalDetermination: "out_of_scope",
    determinationRationale: "Not matched to Annex III at all (not merely 'not high-risk'). Annex III point 1(a) expressly excludes biometric VERIFICATION whose sole purpose is confirming that a person is who they claim to be (1:1 match against their own previously enrolled template, no reference database of other candidates). This is the deliberate negative-contrast case: 'biometric' appears in the description, but the verification carve-out means it is never matched to Annex III in the first place — the single most common real-world over-classification error.",
    friaTrigger: false,
    conformityRoute: "not_applicable",
  },
];

export function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

// Simple deterministic-seedable PRNG (mulberry32) so "regenerate" is varied but reproducible per call.
export function makeRng(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
