// Shared domain data/logic for Cross-Cutting Operations (D1-D4, Art. 50-56/25/53/72/73).
// Pure functions + constants used by the /operations pages, client components, and API routes.

export interface OperationsSystemRow {
  id: string;
  name: string;
  description: string;
  business_function: string;
  gpai_integration: number;
  annex_iii_category: string | null;
  classification_status: string;
  deployer_role_applies: number;
  provider_role_applies: number;
  [key: string]: any;
}

// ---------------- D1 Transparency for Certain Systems (Art. 50) ----------------

export const DISCLOSURE_TYPES = ["ai_interaction", "watermarking", "biometric_categorisation"] as const;
export type DisclosureType = (typeof DISCLOSURE_TYPES)[number];

export const DISCLOSURE_TYPE_LABELS: Record<string, string> = {
  ai_interaction: "Art. 50(1) — AI-interaction notice",
  watermarking: "Art. 50(2) — Machine-readable watermarking",
  biometric_categorisation: "Art. 50(3) — Biometric-categorisation / emotion-recognition disclosure",
};

/**
 * Simple, deterministic, rule-based check for whether a system is plausibly in scope of Art. 50
 * and should therefore carry a transparency_disclosures record. This is NOT the AI-powered
 * Transparency Compliance Scanning Agent (that lives at /agents) — it is a rough, explainable
 * heuristic: GPAI-integrated systems, biometric-related Annex III categories, and systems whose
 * name/function reads as a natural-person-facing conversational surface.
 */
export function isArt50InScope(system: OperationsSystemRow): boolean {
  if (system.gpai_integration) return true;
  if (system.annex_iii_category && /^1\(/.test(system.annex_iii_category)) return true;
  const haystack = `${system.name} ${system.business_function} ${system.description}`.toLowerCase();
  if (/chatbot|virtual assistant|conversational|assistant/.test(haystack)) return true;
  return false;
}

export function watermarkStatusAgainstBaseline(
  disclosure: { status: string } | undefined,
  baselineDeadlineIso: string
): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (!disclosure) return { label: "No watermarking record on file", tone: "neutral" };
  const daysLeft = Math.ceil((new Date(baselineDeadlineIso).getTime() - Date.now()) / 86400000);
  if (disclosure.status === "stale") return { label: "Stale — marking present but flagged for refresh", tone: "warning" };
  if (disclosure.status === "present") {
    return daysLeft >= 0
      ? { label: `On track — marking in place, ${daysLeft} day(s) ahead of the baseline deadline`, tone: "success" }
      : { label: "Marking in place, past the baseline deadline — confirm still current", tone: "warning" };
  }
  return daysLeft >= 0
    ? { label: `Missing — ${daysLeft} day(s) remain before the baseline deadline`, tone: "warning" }
    : { label: "Missing and past the baseline deadline", tone: "danger" };
}

// ---------------- D2 GPAI Downstream Integration (Art. 51-56 / 25 / 53) ----------------

export function standardArt53Obligations(): string[] {
  return [
    "Art. 53(1)(a) / Annex XI: maintain technical documentation for the fine-tuned model, available to the AI Office and national authorities.",
    "Art. 53(1)(b) / Annex XII: provide transparency information to any downstream integrators building on the fine-tuned version.",
    "Art. 53(1)(c): maintain a policy to comply with EU copyright law, including text/data-mining opt-outs.",
    "Art. 53(1)(d): publish a sufficiently detailed summary of the content used to fine-tune the model.",
  ];
}

export const ART55_REFERENCE_NOTE =
  "If systemic-risk flag becomes positive: reference-only Art. 55 checklist (adversarial evaluation, systemic-risk assessment, model-level incident tracking, cybersecurity protections) — not expected at this fine-tuning scale.";

/** Parses the seeded art53_obligations_json, splitting the Art.55 reference note out from the enumerated Art.53 obligations. */
export function splitObligations(json: string): { art53: string[]; art55Note: string | null } {
  let items: string[] = [];
  try {
    items = JSON.parse(json ?? "[]");
  } catch {
    items = [];
  }
  const art55Note = items.find((i) => i.includes("Art. 55")) ?? null;
  const art53 = items.filter((i) => !i.includes("Art. 55"));
  return { art53, art55Note };
}

// ---------------- D3 Post-Market Monitoring (Art. 72) ----------------

export const PMM_EVENT_TYPES = ["performance_drift", "user_complaint", "near_miss"] as const;
export const PMM_SEVERITIES = ["low", "medium", "high"] as const;

// ---------------- D4 Serious Incident Reporting (Art. 73) ----------------

export const SEVERITY_TIER_DAYS: Record<string, number> = {
  death_serious_harm: 2,
  critical_infra_disruption: 2,
  fundamental_rights_widespread: 10,
  other_serious: 15,
};

export const SEVERITY_TIER_LABELS: Record<string, string> = {
  death_serious_harm: "Death or serious harm to health (2 days)",
  critical_infra_disruption: "Serious disruption to critical infrastructure (2 days)",
  fundamental_rights_widespread: "Widespread infringement of fundamental rights (10 days)",
  other_serious: "Other serious incident (15 days)",
};

export const INCIDENT_STATUS_FLOW = ["detected", "classified", "reporting_drafted", "reported", "closed"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS_FLOW)[number];

export function nextIncidentStatus(current: string): IncidentStatus | null {
  const idx = INCIDENT_STATUS_FLOW.indexOf(current as IncidentStatus);
  if (idx === -1 || idx === INCIDENT_STATUS_FLOW.length - 1) return null;
  return INCIDENT_STATUS_FLOW[idx + 1];
}

/** Server-side only: never trust a client-supplied deadline_at. */
export function computeIncidentDeadline(incidentDetectedAtIso: string, severityTier: string): string {
  const days = SEVERITY_TIER_DAYS[severityTier];
  if (!days) throw new Error(`Unknown severity tier: ${severityTier}`);
  return new Date(new Date(incidentDetectedAtIso).getTime() + days * 86400000).toISOString();
}
