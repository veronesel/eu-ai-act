// Pure domain data/logic for the Art. 5 / Annex III / Art. 6(3) classification workflow — used by UI, API routes, and the Classification Agent's tools.

export const PROHIBITED_LIMBS: Array<{ code: string; label: string; description: string; article: string }> = [
  {
    code: "ab",
    label: "Manipulative or exploitative techniques causing significant harm",
    description: "Does the system deploy subliminal, manipulative or deceptive techniques, or exploit vulnerabilities due to age, disability, or a specific socio-economic situation, in a way that materially distorts behaviour and is likely to cause significant harm?",
    article: "Art. 5(1)(a)+(b)",
  },
  {
    code: "c",
    label: "Social scoring",
    description: "Does the system evaluate or classify natural persons over time based on social behaviour or inferred/predicted personal characteristics, leading to detrimental or unfavourable treatment that is unjustified or disproportionate to the context in which the data was generated?",
    article: "Art. 5(1)(c)",
  },
  {
    code: "d",
    label: "Individual criminal-offence-risk profiling",
    description: "Does the system assess the risk of a natural person committing a criminal offence based solely on profiling or on assessing personality traits/characteristics, without an objective, verifiable link to criminal activity?",
    article: "Art. 5(1)(d)",
  },
  {
    code: "e",
    label: "Untargeted facial-image scraping",
    description: "Does the system create or expand facial-recognition databases through untargeted scraping of facial images from the internet or CCTV footage?",
    article: "Art. 5(1)(e)",
  },
  {
    code: "f",
    label: "Workplace/education emotion inference",
    description: "Does the system infer emotions of a natural person in the workplace or education institutions, other than for medical or safety reasons?",
    article: "Art. 5(1)(f)",
  },
  {
    code: "g",
    label: "Biometric categorisation of sensitive attributes",
    description: "Does the system categorise natural persons individually, based on their biometric data, to infer race, political opinions, trade union membership, religious or philosophical beliefs, sex life, or sexual orientation?",
    article: "Art. 5(1)(g)",
  },
  {
    code: "h",
    label: "Real-time remote biometric identification (law enforcement)",
    description: "Does the system perform real-time remote biometric identification in publicly accessible spaces for law enforcement purposes, outside the narrow statutory exceptions?",
    article: "Art. 5(1)(h)",
  },
  {
    code: "omnibus_ncii",
    label: "AI-generated non-consensual intimate imagery / CSAM (Digital Omnibus)",
    description: "Does the system generate or manipulate non-consensual intimate imagery or CSAM, without effective preventive safeguards meeting the Digital Omnibus safe-harbour test? [Guessing: exact lettering pending consolidated post-Omnibus text.]",
    article: "Digital Omnibus, new Art. 5 limb",
  },
];

export const ANNEX_III_CATEGORIES = [
  "1(a) biometric identification",
  "1(b) biometric categorisation",
  "1(c) emotion recognition",
  "2 critical infrastructure",
  "3 education and vocational training",
  "4(a) employment / recruitment",
  "4(b) employment / worker management",
  "5(a) essential private/public services access",
  "5(b) creditworthiness / credit scoring",
  "5(c) life/health insurance risk-pricing",
  "6 law enforcement",
  "7 migration, asylum and border control",
  "8 administration of justice and democratic processes",
];

export const BIOMETRICS_BRANCHES: Array<{ code: string; label: string; highRisk: boolean; description: string }> = [
  { code: "identification", label: "Remote biometric identification (1:many, against a reference database)", highRisk: true, description: "Matches a captured biometric sample against a reference database to determine who a person is among many candidates." },
  { code: "categorisation", label: "Biometric categorisation (inferring sensitive/protected attributes)", highRisk: true, description: "Infers or categorises natural persons based on biometric data." },
  { code: "emotion_recognition", label: "Emotion recognition", highRisk: true, description: "Infers emotions or intentions from biometric data." },
  { code: "verification_excluded", label: "Biometric verification (1:1, confirming a claimed identity) — expressly excluded", highRisk: false, description: "Sole purpose is confirming that a specific natural person is who they claim to be (1:1 match against their own previously enrolled template). Annex III point 1(a) expressly excludes this from high-risk status." },
  { code: "not_biometric", label: "Not a biometric system", highRisk: false, description: "No biometric processing is involved." },
];

export const ART6_3_LIMBS = [
  { key: "limb1", label: "Narrow procedural task", description: "Is the system intended to perform a narrow procedural task only?" },
  { key: "limb2", label: "Improves result of prior human activity", description: "Is the system intended to improve the result of a previously completed human activity?" },
  { key: "limb3", label: "Detects deviation from prior human decision-making pattern", description: "Is the system intended to detect decision-making patterns or deviations from prior patterns, without being meant to replace or influence the previously completed human assessment, without proper human review?" },
  { key: "limb4", label: "Preparatory task", description: "Is the system intended to perform a preparatory task to an assessment relevant for the high-risk use cases listed in Annex III?" },
];

export type FinalDetermination = "not_high_risk" | "high_risk" | "prohibited_blocked" | "out_of_scope";

export function evaluateArt6_3(limbs: { limb1: string; limb2: string; limb3: string; limb4: string }, performsProfiling: boolean): { qualifies: boolean; rationale: string } {
  if (performsProfiling) {
    return { qualifies: false, rationale: "Non-overridable guard (Art. 6(3) subparagraph 2): a system that performs profiling of natural persons is always high-risk, regardless of how the four limbs are answered." };
  }
  const anyYes = [limbs.limb1, limbs.limb2, limbs.limb3, limbs.limb4].some((v) => v === "yes");
  return {
    qualifies: anyYes,
    rationale: anyYes
      ? "At least one Art. 6(3) limb is satisfied and no profiling is performed — the system may be treated as not posing a significant risk, subject to the documented self-assessment being available on request (Art. 6(4))."
      : "None of the four Art. 6(3) limbs is satisfied — the exception is not available and the Annex III match stands as high-risk.",
  };
}
