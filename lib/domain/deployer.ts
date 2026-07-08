// Pure domain logic for the Deployer Obligations Suite (C1-C5, Art. 26/27/14(operation)/85-87).
// Deliberately free of any DB import so it is safe to use from client components as well as
// server pages/API routes (server code fetches rows via getDb() and hands them to these functions).

export interface DeployerLiteSystem {
  annex_iii_category: string | null;
  classification_status: string;
}

/**
 * Art. 27(1) FRIA is only mandatory for: (a) bodies governed by public law, or private entities
 * providing public services, deploying any Annex III high-risk system, or (b) any deployer of an
 * Annex III 5(b) creditworthiness/credit-scoring or 5(c) life/health-insurance risk-pricing system.
 * Eurobank Capital SpA is a private-law commercial bank, so branch (a) never applies to it; branch (b)
 * is what actually triggers the two credit-scoring systems in the demo portfolio.
 */
export function friaNotTriggeredReason(system: DeployerLiteSystem): string {
  if (system.classification_status !== "high_risk") {
    return "Art. 26 Deployer-obligation suite not applicable — system is not classified high-risk.";
  }
  const cat = system.annex_iii_category ?? "";
  if (cat.startsWith("5(b)") || cat.startsWith("5(c)")) {
    return "Annex III category matches 5(b)/5(c) — this should be triggered; check the seeded fria_assessments row for a data issue.";
  }
  return `Not triggered by the Art. 27(1) criteria: the system's Annex III category (${cat || "none recorded"}) is not 5(b) creditworthiness/credit-scoring or 5(c) life/health-insurance risk-pricing, and Eurobank Capital SpA is a private-law commercial bank — not a body governed by public law, nor a private entity providing public services — for this deployment. Neither limb of the Art. 27(1) trigger is met.`;
}

export interface OversightEventRow {
  shift_date: string;
  event_type: string; // override | escalation | routine_check
}

export interface OverrideRatePoint {
  date: string;
  total: number;
  overrides: number;
  overrideRatePct: number;
}

/**
 * Buckets human-oversight-operation events by shift_date and computes the override rate per bucket.
 * Kept as a small, reusable, side-effect-free function so the C3 chart here and the Deployer Ops
 * dashboard (built elsewhere) can share the exact same calculation over rows fetched from
 * human_oversight_operations.
 */
export function computeOverrideRateSeries(events: OversightEventRow[]): OverrideRatePoint[] {
  const byDate = new Map<string, { total: number; overrides: number }>();
  for (const e of events) {
    const day = (e.shift_date || "").slice(0, 10);
    const bucket = byDate.get(day) ?? { total: 0, overrides: 0 };
    bucket.total += 1;
    if (e.event_type === "override") bucket.overrides += 1;
    byDate.set(day, bucket);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, overrides }]) => ({
      date,
      total,
      overrides,
      overrideRatePct: total > 0 ? Math.round((overrides / total) * 1000) / 10 : 0,
    }));
}

export function overallOverrideRatePct(events: OversightEventRow[]): number {
  if (events.length === 0) return 0;
  const overrides = events.filter((e) => e.event_type === "override").length;
  return Math.round((overrides / events.length) * 1000) / 10;
}

export interface DecisionFactor {
  factor: string;
  value: string;
  direction: "positive" | "negative" | "neutral" | string;
  weight: "high" | "medium" | "low" | string;
}

const WEIGHT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Builds a case-specific, plain-language draft explanation (Art. 86) directly from a decision
 * record's logged factors — not a generic template. A human at Eurobank is expected to review and
 * edit this draft before it is sent.
 */
export function synthesizeExplanationDraft(opts: {
  systemName: string;
  outcome: string;
  factors: DecisionFactor[];
  affectedPerson: string;
}): string {
  const { systemName, outcome, factors, affectedPerson } = opts;
  if (!factors || factors.length === 0) {
    return "Insufficient logged detail to draft a case-specific explanation — documentation gap. This decision has no linked decision_records factor data; escalate to Model Risk before responding to the data subject.";
  }

  const describe = (f: DecisionFactor) => `${f.factor.toLowerCase()} (${f.value})`;
  const negative = factors.filter((f) => f.direction === "negative").sort((a, b) => (WEIGHT_ORDER[a.weight] ?? 9) - (WEIGHT_ORDER[b.weight] ?? 9));
  const positive = factors.filter((f) => f.direction === "positive");
  const primary = negative.filter((f) => f.weight === "high");
  const secondary = negative.filter((f) => f.weight !== "high");

  let text = `Dear ${affectedPerson},\n\n`;
  text += `Thank you for asking for an explanation of the ${systemName} outcome (${outcome}). This was an AI-assisted decision reviewed by a human case officer before being finalised.\n\n`;

  if (primary.length) {
    text += `It was primarily driven by ${primary.map(describe).join(" and ")}. `;
  } else if (secondary.length) {
    text += `It was driven by ${secondary.map(describe).join(" and ")}. `;
  }
  if (secondary.length && primary.length) {
    text += `It was also influenced, to a lesser extent, by ${secondary.map(describe).join(" and ")}. `;
  }
  if (positive.length) {
    text += `On the positive side, ${positive.map(describe).join(" and ")} weighed in your favour, but did not outweigh the factors above. `;
  }

  text += `\n\nUnder Article 86 of the EU AI Act you have the right to receive this explanation and to request that a human review this decision. If you believe it is incorrect, or you can provide further information, please contact us and we will arrange a manual review.\n\nEurobank Capital SpA — AI Deployment Operations`;
  return text;
}

export const DEPLOYER_HIGH_RISK_NOT_APPLICABLE_NOTE =
  "Art. 26 Deployer-obligation suite not applicable — system is not classified high-risk.";
