// Shared domain data/logic for the Provider Obligations Suite (B1-B12, Art. 9-20).
// Pure functions + constants used by Provider suite pages, client components, and API routes.

export const PROVIDER_NOT_APPLICABLE_REASON =
  "Art. 16 Provider-obligation suite not applicable — system is not classified high-risk";

export interface SystemRow {
  id: string;
  name: string;
  description: string;
  business_function: string;
  provider_role_applies: number;
  deployer_role_applies: number;
  classification_status: string;
  lifecycle_stage: string;
  demo_seed_key: string | null;
  placed_on_market_at: string | null;
  conformity_assessment_route: string;
  [key: string]: any;
}

/** The B1-B11 suite only meaningfully applies where provider_role_applies=1 AND classification_status='high_risk'. */
export function partitionProviderSystems<T extends SystemRow>(systems: T[]): { applicable: T[]; notApplicable: T[] } {
  const providerSystems = systems.filter((s) => !!s.provider_role_applies);
  return {
    applicable: providerSystems.filter((s) => s.classification_status === "high_risk"),
    notApplicable: providerSystems.filter((s) => s.classification_status !== "high_risk"),
  };
}

// ---------------- B1 Risk Management ----------------

export const RISK_SCALE_ANCHORS: Record<number, { likelihood: string; severity: string }> = {
  1: { likelihood: "Rare — not expected to occur in the system's operating life", severity: "Negligible — no meaningful impact on rights, safety, or outcomes" },
  2: { likelihood: "Unlikely — could occur in isolated circumstances", severity: "Minor — limited, recoverable impact affecting few individuals" },
  3: { likelihood: "Possible — could plausibly occur under normal operating conditions", severity: "Moderate — material impact on outcomes for an identifiable group" },
  4: { likelihood: "Likely — expected to occur repeatedly during normal operation", severity: "Major — significant impact on fundamental rights, safety, or financial outcomes" },
  5: { likelihood: "Near-certain — expected to occur routinely absent mitigation", severity: "Severe — widespread or irreversible harm to affected persons" },
};

export const LIFECYCLE_PHASES = ["design", "development", "testing", "pre_deployment", "in_production", "post_market_monitoring"];

export function riskLevel(likelihood: number, severity: number): { score: number; tone: "success" | "warning" | "danger"; label: string } {
  const score = likelihood * severity;
  if (score >= 15) return { score, tone: "danger", label: "High" };
  if (score >= 8) return { score, tone: "warning", label: "Medium" };
  return { score, tone: "success", label: "Low" };
}

// ---------------- B7 Accuracy, Robustness & Cybersecurity ----------------

export const CYBER_CONTROLS = [
  { code: "data_poisoning", label: "Data-poisoning resistance", description: "Controls against manipulation of training/fine-tuning data to corrupt model behaviour." },
  { code: "model_evasion", label: "Model-evasion resistance", description: "Controls against adversarial inputs crafted to evade correct model classification at inference time." },
  { code: "model_extraction", label: "Model-extraction resistance", description: "Controls against reconstruction or theft of model logic/parameters via repeated querying." },
] as const;

export const ACCURACY_RESULT_OPTIONS = ["not_tested", "tested", "passed", "failed"] as const;

// ---------------- B9/B10 Conformity Assessment ----------------

export const CONFORMITY_ROUTES = [
  { code: "internal_control_annex_vi", label: "Internal control (Annex VI)", illustrative: false },
  { code: "notified_body_annex_vii", label: "Notified body (Annex VII)", illustrative: true },
] as const;

export const NOTIFIED_BODY_ILLUSTRATIVE_NOTE =
  "Illustrative — Eurobank's in-scope systems use the internal-control route. No Eurobank system in this portfolio actually engages a notified body.";

// ---------------- B11 EU Database Registration ----------------

/** Digital-Omnibus: self-assessment summary is always required once a system reached not_high_risk via the Art. 6(3) exception path. */
export function selfAssessmentRequired(determination: { final_determination?: string; art6_3_limb1?: string | null } | null | undefined): boolean {
  if (!determination) return false;
  return determination.final_determination === "not_high_risk" && determination.art6_3_limb1 != null;
}

// ---------------- B12 Corrective Actions ----------------

export const CORRECTIVE_ACTION_TYPES = ["corrective", "preventive", "withdrawal"] as const;
export const NOTIFICATION_PARTIES = ["deployer", "distributor", "importer", "authorised_representative", "authority"] as const;

export const OUT_OF_SCOPE_VALUE_CHAIN_ROLES = [
  { article: "Art. 22", role: "Authorised representative", rationale: "Only attaches to providers established outside the Union appointing an EU representative. Eurobank Capital SpA is Italian-established." },
  { article: "Art. 23", role: "Importer", rationale: "Only attaches to a party placing a third country's high-risk system on the EU market under its own name. Eurobank does not import third-party AI systems for resale." },
  { article: "Art. 24", role: "Distributor", rationale: "Only attaches to supply-chain resellers making a system available on the market without being the provider. Eurobank deploys vendor systems internally under its own authority — that is deployment, not distribution." },
];

// ---------------- Annex IV technical documentation ----------------

export const TECH_DOC_STATUSES = ["draft", "agent_drafted_pending_review", "approved"] as const;
