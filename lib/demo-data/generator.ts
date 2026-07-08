import { getDb, newId, nowIso } from "../db/client";
import { seedStatic } from "../db/seed-static";
import { PORTFOLIO, pick, makeRng } from "./portfolio";

const OPERATIONAL_TABLES = [
  "agent_proposals", "agent_runs",
  "obligation_evidence_links",
  "audit_findings", "internal_audit_engagements",
  "management_review_actions", "management_review_records",
  "serious_incidents", "monitoring_flags",
  "post_market_monitoring_events", "post_market_monitoring_plans",
  "gpai_integrations", "transparency_disclosures",
  "decision_records", "explanation_requests", "complaints",
  "deployer_logs", "human_oversight_operations", "fria_assessments", "deployer_obligation_checklists",
  "corrective_action_notifications", "corrective_actions",
  "eu_database_registrations", "ce_marking_records", "declarations_of_conformity", "conformity_assessments",
  "accuracy_robustness_records", "human_oversight_designs", "transparency_instructions",
  "record_keeping_logs", "technical_documentation_versions", "technical_documentation_sections",
  "data_governance_records", "risk_management_records",
  "authority_information_requests", "regulatory_challenges",
  "high_risk_determinations", "prohibited_practice_screenings",
  "lifecycle_history", "ai_systems",
];

const ANNEX_IV_SECTIONS = [
  { point: 1, title: "General description of the system" },
  { point: 2, title: "Detailed description of elements and development process" },
  { point: 3, title: "Monitoring, functioning and control information" },
  { point: 4, title: "Risk management system summary" },
  { point: 5, title: "Changes log across the lifecycle" },
  { point: 6, title: "Harmonised standards / common specifications applied" },
  { point: 7, title: "Copy of the EU declaration of conformity" },
  { point: 8, title: "Post-market monitoring plan" },
  { point: 9, title: "Performance metrics against intended purpose" },
];
const DEPLOYER_CHECKLIST_ITEMS = [
  ["overseer", "Assign a named competent human overseer"],
  ["input_relevance", "Confirm input-data relevance to intended purpose"],
  ["monitoring", "Confirm monitoring is active"],
  ["retention", "Confirm log retention of at least 6 months is running"],
  ["suspend_procedure", "Confirm the suspend-on-serious-risk procedure exists"],
  ["worker_notification", "Confirm workers'-representative notification where employment-context"],
  ["cooperation", "Confirm cooperation channel with the competent authority exists"],
] as const;

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function generateDemoData(seed?: number) {
  seedStatic();
  const db = getDb();
  const rnd = makeRng(seed ?? Date.now());

  const tx = db.transaction(() => {
    for (const table of OPERATIONAL_TABLES) db.exec(`DELETE FROM ${table}`);

    const insSystem = db.prepare(`INSERT INTO ai_systems
      (id, name, description, business_function, owner_persona_id, created_at, provider_role_applies, deployer_role_applies,
       lifecycle_stage, classification_status, annex_iii_category, gpai_integration, gpai_model_reference, fine_tuned_by_eurobank,
       risk_classification_rationale, conformity_assessment_route, eu_database_registration_status, ce_marking_status,
       declaration_of_conformity_status, demo_seed_key, placed_on_market_at)
      VALUES (@id, @name, @description, @business_function, @owner_persona_id, @created_at, @provider_role_applies, @deployer_role_applies,
       @lifecycle_stage, @classification_status, @annex_iii_category, @gpai_integration, @gpai_model_reference, @fine_tuned_by_eurobank,
       @risk_classification_rationale, @conformity_assessment_route, @eu_database_registration_status, @ce_marking_status,
       @declaration_of_conformity_status, @demo_seed_key, @placed_on_market_at)`);
    const insLifecycle = db.prepare(`INSERT INTO lifecycle_history (id, system_id, stage, entered_at, notes) VALUES (?, ?, ?, ?, ?)`);
    const insScreen = db.prepare(`INSERT INTO prohibited_practice_screenings (id, system_id, limb_code, result, rationale, safe_harbour_notes, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insDetermination = db.prepare(`INSERT INTO high_risk_determinations
      (id, system_id, annex_iii_category, biometrics_branch, art6_3_limb1, art6_3_limb1_rationale, art6_3_limb2, art6_3_limb2_rationale,
       art6_3_limb3, art6_3_limb3_rationale, art6_3_limb4, art6_3_limb4_rationale, performs_profiling, final_determination, determination_rationale, confirmed_by, confirmed_at)
      VALUES (@id, @system_id, @annex_iii_category, @biometrics_branch, @limb1, @limb1r, @limb2, @limb2r, @limb3, @limb3r, @limb4, @limb4r, @performs_profiling, @final_determination, @determination_rationale, @confirmed_by, @confirmed_at)`);
    const insChallenge = db.prepare(`INSERT INTO regulatory_challenges (id, system_id, authority, challenge_received_at, challenge_notes, response_due_at, response_notes, responded_at, outcome) VALUES (?, ?, 'Banca d''Italia', ?, ?, ?, ?, ?, ?)`);

    const insRisk = db.prepare(`INSERT INTO risk_management_records (id, system_id, lifecycle_phase, risk_description, likelihood, severity, mitigation, residual_likelihood, residual_severity, review_cadence_months, next_review_at, owner_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insData = db.prepare(`INSERT INTO data_governance_records (id, system_id, dataset_name, purpose, provenance, collection_methodology, bias_characteristics_examined, quality_checks_run, quality_gaps, special_category_basis_necessity_rationale, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insTechDoc = db.prepare(`INSERT INTO technical_documentation_sections (id, system_id, annex_iv_point, title, content, status, version, updated_by, updated_at, retain_until) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`);
    const insRecordLog = db.prepare(`INSERT INTO record_keeping_logs (id, system_id, event_type, event_detail, logged_at) VALUES (?, ?, ?, ?, ?)`);
    const insInstructions = db.prepare(`INSERT INTO transparency_instructions (id, system_id, intended_purpose, known_limitations, human_oversight_measures, expected_lifetime, maintenance_needs, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insOversightDesign = db.prepare(`INSERT INTO human_oversight_designs (id, system_id, stop_override_mechanism, confidence_threshold_gating, escalation_triggers, explainability_outputs, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insAccuracy = db.prepare(`INSERT INTO accuracy_robustness_records (id, system_id, record_type, metric_name, metric_value, test_date, result, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insConformity = db.prepare(`INSERT INTO conformity_assessments (id, system_id, route, checklist_json, assessor, notified_body_number, outcome, certificate_reference, certificate_expiry, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insDoc = db.prepare(`INSERT INTO declarations_of_conformity (id, system_id, issued_at, document_text, status) VALUES (?, ?, ?, ?, ?)`);
    const insCe = db.prepare(`INSERT INTO ce_marking_records (id, system_id, affixed_at, notified_body_number, status) VALUES (?, ?, ?, ?, ?)`);
    const insEuDb = db.prepare(`INSERT INTO eu_database_registrations (id, system_id, provider_identity, system_description, status, member_states, self_assessment_summary, self_assessment_required, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insCorrective = db.prepare(`INSERT INTO corrective_actions (id, system_id, non_conformity_description, action_type, action_description, status, poses_health_safety_risk, authority_notified, authority_notified_at, source_flag_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insCorrectiveNotif = db.prepare(`INSERT INTO corrective_action_notifications (id, corrective_action_id, party, notified_at, notes) VALUES (?, ?, ?, ?, ?)`);

    const insDeployerChecklist = db.prepare(`INSERT INTO deployer_obligation_checklists (id, system_id, item_code, item_label, is_checked, evidence_link, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insFria = db.prepare(`INSERT INTO fria_assessments (id, system_id, triggered, trigger_reason, status, process_description, timeframe_frequency, affected_persons, specific_risks, human_oversight_measures, mitigation_measures, dpia_crossref, notification_status, notified_at, cloned_from_system_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insOversightOp = db.prepare(`INSERT INTO human_oversight_operations (id, system_id, overseer_name, shift_date, event_type, reason_code, notes, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insDeployerLog = db.prepare(`INSERT INTO deployer_logs (id, system_id, log_batch_label, generated_at, retention_expires_at) VALUES (?, ?, ?, ?, ?)`);
    const insComplaint = db.prepare(`INSERT INTO complaints (id, system_id, complainant, nature, routed_to, status, filed_at, closed_at) VALUES (?, ?, ?, ?, 'Banca d''Italia', ?, ?, ?)`);
    const insExplanation = db.prepare(`INSERT INTO explanation_requests (id, system_id, affected_person, decision_reference, requested_at, due_at, drafted_response, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insDecision = db.prepare(`INSERT INTO decision_records (id, system_id, subject_name, decision_outcome, decision_factors_json, decided_at) VALUES (?, ?, ?, ?, ?, ?)`);

    const insDisclosure = db.prepare(`INSERT INTO transparency_disclosures (id, system_id, disclosure_type, disclosure_text, status, verification_log, deadline_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const insGpai = db.prepare(`INSERT INTO gpai_integrations (id, system_id, vendor_model_name, code_of_practice_signatory, systemic_risk_flag, provider_shift_flag, provider_shift_rationale, art53_obligations_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insPmmPlan = db.prepare(`INSERT INTO post_market_monitoring_plans (id, system_id, methodology, metrics_tracked, review_cadence_months, next_review_at) VALUES (?, ?, ?, ?, ?, ?)`);
    const insPmmEvent = db.prepare(`INSERT INTO post_market_monitoring_events (id, system_id, event_type, description, severity, occurred_at) VALUES (?, ?, ?, ?, ?, ?)`);
    const insIncident = db.prepare(`INSERT INTO serious_incidents (id, system_id, description, severity_tier, incident_detected_at, deadline_at, reported_at, status, report_text, authority_notified, provider_notified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const insEngagement = db.prepare(`INSERT INTO internal_audit_engagements (id, scope, systems_in_scope, fieldwork_start, fieldwork_end, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insFinding = db.prepare(`INSERT INTO audit_findings (id, engagement_id, system_id, title, severity, finding_tag, linked_evidence, remediation_owner, due_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insReview = db.prepare(`INSERT INTO management_review_records (id, review_date, input_pack_notes, decisions, status, next_review_due) VALUES (?, ?, ?, ?, ?, ?)`);
    const insReviewAction = db.prepare(`INSERT INTO management_review_actions (id, review_id, action_text, owner_id, due_at, status) VALUES (?, ?, ?, ?, ?, ?)`);

    const systemIds: Record<string, string> = {};
    const now = nowIso();

    for (const tpl of PORTFOLIO) {
      const id = newId("sys");
      systemIds[tpl.key] = id;
      const isBlocked = tpl.finalDetermination === "prohibited_blocked";
      const isHighRisk = tpl.finalDetermination === "high_risk";
      const isOutOfScope = tpl.finalDetermination === "out_of_scope";
      const scenarioRoll = rnd();
      const lifecycleStage = isBlocked ? "concept" : isOutOfScope || tpl.finalDetermination === "not_high_risk" ? pick(["in_production", "monitored"], rnd) : pick(["development", "pre_deployment", "in_production", "monitored"], rnd);
      const placedOnMarket = ["in_production", "monitored"].includes(lifecycleStage) ? daysFromNow(-Math.floor(rnd() * 500)) : null;

      insSystem.run({
        id,
        name: pick(tpl.nameOptions, rnd),
        description: pick(tpl.descriptionOptions, rnd),
        business_function: tpl.businessFunction,
        owner_persona_id: tpl.ownerId,
        created_at: daysFromNow(-Math.floor(rnd() * 600) - 60),
        provider_role_applies: tpl.providerRoleApplies ? 1 : 0,
        deployer_role_applies: tpl.deployerRoleApplies ? 1 : 0,
        lifecycle_stage: lifecycleStage,
        classification_status: isBlocked ? "prohibited_blocked" : isOutOfScope ? "not_high_risk" : isHighRisk ? "high_risk" : "not_high_risk",
        annex_iii_category: tpl.annexIIICategory,
        gpai_integration: tpl.gpaiIntegration ? 1 : 0,
        gpai_model_reference: tpl.gpaiModelReference ?? null,
        fine_tuned_by_eurobank: tpl.fineTunedByEurobank ? 1 : 0,
        risk_classification_rationale: tpl.determinationRationale,
        conformity_assessment_route: tpl.conformityRoute,
        eu_database_registration_status: isHighRisk && tpl.providerRoleApplies ? pick(["not_started", "in_progress", "registered"], rnd) : "not_applicable",
        ce_marking_status: isHighRisk && tpl.providerRoleApplies ? pick(["not_started", "in_progress", "affixed"], rnd) : "not_applicable",
        declaration_of_conformity_status: isHighRisk && tpl.providerRoleApplies ? pick(["not_started", "issued"], rnd) : "not_applicable",
        demo_seed_key: tpl.key,
        placed_on_market_at: placedOnMarket,
      });

      insLifecycle.run(newId("lch"), id, "concept", daysFromNow(-600), "System proposed.");
      if (lifecycleStage !== "concept") insLifecycle.run(newId("lch"), id, lifecycleStage, daysFromNow(-30), "Current stage.");

      // Prohibited practice screening
      for (const p of tpl.prohibited) {
        insScreen.run(newId("scr"), id, p.limb, p.result, p.rationale, p.limb === "omnibus_ncii" ? "Digital Omnibus safe-harbour test: not applicable — no generative/manipulation capability in scope for this system." : null, "user_reg", daysFromNow(-90));
      }

      // High-risk determination (only if not blocked at prohibited stage, or record the blocking determination too)
      insDetermination.run({
        id: newId("det"),
        system_id: id,
        annex_iii_category: tpl.annexIIICategory,
        biometrics_branch: tpl.biometricsBranch,
        limb1: tpl.art63?.limb1 ?? null,
        limb1r: tpl.art63 ? "Narrow procedural task limb assessed against the system's actual function." : null,
        limb2: tpl.art63?.limb2 ?? null,
        limb2r: tpl.art63 ? "Improves-result-of-prior-human-activity limb assessed." : null,
        limb3: tpl.art63?.limb3 ?? null,
        limb3r: tpl.art63 ? "Detects-deviation-without-replacing-assessment limb assessed." : null,
        limb4: tpl.art63?.limb4 ?? null,
        limb4r: tpl.art63 ? "Preparatory-task limb assessed." : null,
        performs_profiling: tpl.art63?.performsProfiling ? 1 : 0,
        final_determination: tpl.finalDetermination,
        determination_rationale: tpl.determinationRationale,
        confirmed_by: "user_reg",
        confirmed_at: daysFromNow(-85),
      });

      // Regulatory challenge scenario for Art 6(3)-exception systems (#5, #8), only sometimes
      if (tpl.art63?.claimed && rnd() < 0.5) {
        const challenged = rnd() < 0.4;
        insChallenge.run(
          newId("chl"), id, daysFromNow(-40),
          "Banca d'Italia requested the documented Art. 6(4) self-assessment record supporting the non-high-risk determination.",
          daysFromNow(-25),
          challenged ? "Self-assessment record and Art. 6(3) rationale submitted for review." : "Self-assessment record submitted; authority confirmed no further action.",
          challenged ? null : daysFromNow(-20),
          challenged ? "pending" : "self_assessment_upheld"
        );
      }

      if (isBlocked) continue; // #9 never proceeds past screening — no downstream suite records

      // --- Provider suite (only where provider_role_applies AND high_risk) ---
      const providerHighRisk = tpl.providerRoleApplies && isHighRisk;
      if (providerHighRisk) {
        insRisk.run(newId("rmr"), id, "development", `Model performance degradation risk identified during ${tpl.businessFunction.toLowerCase()} development.`, 3, 4, "Quarterly recalibration, drift monitoring thresholds, human review of edge cases.", 2, 2, 6, daysFromNow(60), "user_risk", "open", daysFromNow(-100));
        insRisk.run(newId("rmr"), id, "in_production", "Risk of disparate impact across protected groups in scoring outcomes.", 2, 5, "Fairness testing on protected-attribute proxies, quarterly disparate-impact review.", 1, 3, 6, daysFromNow(45), "user_risk", "open", daysFromNow(-70));

        insData.run(newId("dgr"), id, `${tpl.businessFunction} training dataset`, "training", "Internal transaction/application records, 2021-2025, EU residents only.", "Stratified sampling with oversampling of minority outcome classes.", "Age, gender proxy, geography reviewed for disparate impact.", "Completeness check, label leakage check, outlier scan.", scenarioRoll < 0.3 ? "Under-representation of self-employed applicants flagged; remediation in progress." : "No material gaps identified in latest review.", "Processing of special-category proxies for bias testing relies on the Digital-Omnibus-widened lawful basis; necessity test: no less-intrusive method available to detect disparate impact on protected groups.", daysFromNow(-40));

        ANNEX_IV_SECTIONS.forEach((s) => {
          const status = scenarioRoll < 0.25 && s.point > 6 ? "draft" : pick(["draft", "agent_drafted_pending_review", "approved"], rnd);
          insTechDoc.run(newId("tds"), id, s.point, s.title, `${s.title} for ${tpl.businessFunction}. Drafted from linked risk management, data governance, and accuracy/robustness records.`, status, "user_prod", daysFromNow(-Math.floor(rnd() * 60)), placedOnMarket ? new Date(new Date(placedOnMarket).setFullYear(new Date(placedOnMarket).getFullYear() + 10)).toISOString() : null);
        });

        for (let i = 0; i < 3; i++) {
          insRecordLog.run(newId("rkl"), id, pick(["inference_batch", "model_version_change", "threshold_change"], rnd), `Automated log entry ${i + 1} for ${tpl.businessFunction}.`, daysFromNow(-i * 15));
        }

        insInstructions.run(newId("tin"), id, `Intended for ${tpl.businessFunction.toLowerCase()} decision support; not intended as a sole automated decision without human review.`, "Performance may degrade outside the EU retail/SME population it was trained on.", "A named credit officer / manager must review and can override every system output before it takes effect.", "24 months before scheduled model refresh.", "Quarterly recalibration; immediate review on regulatory or portfolio shift.", pick(["draft", "approved"], rnd), daysFromNow(-50));

        insOversightDesign.run(newId("hod"), id, "Stop/override control available to the reviewing officer on every case.", "Cases below the confidence threshold are auto-routed to manual review.", "Escalation to Model Risk on repeated overrides or drift alerts.", "Top contributing factors surfaced per decision for the human reviewer.", daysFromNow(-50));

        insAccuracy.run(newId("arr"), id, "accuracy_metric", "AUC-ROC", (0.78 + rnd() * 0.15).toFixed(3), daysFromNow(-30), "tested", "Latest scheduled validation run.");
        insAccuracy.run(newId("arr"), id, "robustness_test", "Adversarial perturbation resistance", null, daysFromNow(-30), pick(["passed", "failed"], rnd) as string, "Feature-perturbation adversarial test suite.");
        insAccuracy.run(newId("arr"), id, "cyber_control", "Model extraction resistance", null, daysFromNow(-45), pick(["tested", "not_tested"], rnd) as string, "Query-budget rate limiting and output rounding.");

        const conformityOutcome = pick(["in_progress", "passed", "passed"], rnd);
        insConformity.run(newId("cfa"), id, "internal_control_annex_vi", JSON.stringify([{ item: "Risk management system reviewed", done: true }, { item: "Technical documentation complete", done: conformityOutcome === "passed" }, { item: "Accuracy/robustness evidence reviewed", done: true }]), "Internal Quality & Conformity team", null, conformityOutcome, conformityOutcome === "passed" ? `DOC-${tpl.key.toUpperCase()}` : null, null, daysFromNow(-20));
        insDoc.run(newId("doc"), id, conformityOutcome === "passed" ? daysFromNow(-15) : null, conformityOutcome === "passed" ? `EU Declaration of Conformity for ${tpl.businessFunction} system, issued under internal-control route (Annex VI).` : null, conformityOutcome === "passed" ? "issued" : "not_started");
        insCe.run(newId("cem"), id, conformityOutcome === "passed" ? daysFromNow(-15) : null, null, conformityOutcome === "passed" ? "affixed" : "not_started");
        insEuDb.run(newId("edb"), id, "Eurobank Capital SpA", `${tpl.businessFunction} high-risk AI system.`, conformityOutcome === "passed" ? pick(["in_progress", "registered"], rnd) : "not_started", "Italy", null, 0, conformityOutcome === "passed" && rnd() < 0.5 ? daysFromNow(-5) : null);

        if (scenarioRoll < 0.2) {
          const cid = newId("cor");
          insCorrective.run(cid, id, "Post-market monitoring identified a drift in scoring distribution exceeding the tolerance threshold.", "corrective", "Recalibration scheduled; interim manual review uplift for borderline cases.", "in_progress", 0, 0, null, null, daysFromNow(-10), daysFromNow(-2));
          insCorrectiveNotif.run(newId("cnf"), cid, "deployer", daysFromNow(-9), "Deployer Ops notified of interim manual-review uplift.");
        }
      } else if (tpl.providerRoleApplies) {
        // Provider-role but not high-risk: only risk-tier-agnostic D-suite applies (seeded below); still keep a light note.
        insRecordLog.run(newId("rkl"), id, "note", "Art. 16/26 obligation suite not applicable — system is not classified high-risk.", now);
      }

      // --- Deployer suite (only where deployer_role_applies AND high_risk) ---
      const deployerHighRisk = tpl.deployerRoleApplies && isHighRisk;
      if (deployerHighRisk) {
        DEPLOYER_CHECKLIST_ITEMS.forEach(([code, label]) => {
          const checked = code === "worker_notification" ? (tpl.annexIIICategory?.startsWith("4") ?? false) || rnd() < 0.5 : rnd() < 0.85;
          insDeployerChecklist.run(newId("doc2"), id, code, label, checked ? 1 : 0, checked ? "Evidence on file in deployer ops workspace." : null, daysFromNow(-Math.floor(rnd() * 30)));
        });

        const friaStatus = tpl.friaTrigger ? pick(["in_progress", "complete", "complete"], rnd) : "not_started";
        insFria.run(
          newId("fria"), id, tpl.friaTrigger ? 1 : 0, tpl.friaTriggerReason ?? null, friaStatus,
          tpl.friaTrigger ? `Deployment process for ${tpl.businessFunction}: automated scoring feeds a human-reviewed decision.` : null,
          tpl.friaTrigger ? "Continuous use, one assessment per applicant." : null,
          tpl.friaTrigger ? "Retail and SME banking customers applying for credit in Italy." : null,
          tpl.friaTrigger ? "Risk of biased or opaque credit decisions affecting access to financial services." : null,
          tpl.friaTrigger ? "Named credit officer review and override on every system output; escalation on repeated overrides." : null,
          tpl.friaTrigger ? "Fairness testing, recalibration cadence, manual-review uplift on drift." : null,
          tpl.friaTrigger && rnd() < 0.5 ? "Overlaps with GDPR Art. 35 DPIA section 3 (data minimisation) — cross-referenced, not duplicated." : null,
          friaStatus === "complete" ? "notified" : "not_notified",
          friaStatus === "complete" ? daysFromNow(-10) : null,
          tpl.key === "sys_credit_sme" ? systemIds["sys_credit_mortgage"] ?? null : null,
          daysFromNow(-20)
        );

        for (let i = 0; i < 4; i++) {
          const isOverride = rnd() < 0.15;
          insOversightOp.run(newId("hoo"), id, pick(["M. Conti", "S. Greco", "L. Bruno", "A. Fabbri"], rnd), daysFromNow(-i * 7), isOverride ? "override" : pick(["routine_check", "escalation"], rnd), isOverride ? pick(["insufficient_data", "borderline_case", "manual_policy_exception"], rnd) : null, isOverride ? "Officer overrode system recommendation after manual review." : "Routine oversight check.", daysFromNow(-i * 7));
        }

        insDeployerLog.run(newId("dlg"), id, `${tpl.businessFunction} log batch - ${new Date().getFullYear()}`, daysFromNow(-Math.floor(rnd() * 150)), daysFromNow(180 - Math.floor(rnd() * 150)));

        if (rnd() < 0.25) {
          insComplaint.run(newId("cmp"), id, "Affected data subject (name withheld)", "Customer disputes the outcome of an automated credit assessment.", pick(["open", "investigating", "closed"], rnd), daysFromNow(-Math.floor(rnd() * 60)), rnd() < 0.5 ? daysFromNow(-5) : null);
        }

        // Decision record + explanation request for the flagship credit/HR systems (#1-#4)
        if (["sys_credit_mortgage", "sys_credit_sme", "sys_hr_recruitment", "sys_hr_monitoring"].includes(tpl.key)) {
          const decisionId = newId("dec");
          const factors = tpl.key.startsWith("sys_credit")
            ? [
                { factor: "Debt-to-income ratio", value: "48%", direction: "negative", weight: "high" },
                { factor: "Bureau delinquency history (24m)", value: "1 late payment", direction: "negative", weight: "medium" },
                { factor: "Length of banking relationship", value: "6 years", direction: "positive", weight: "low" },
                { factor: "Requested amount vs. affordability model", value: "12% over model threshold", direction: "negative", weight: "high" },
              ]
            : [
                { factor: "Role-relevant experience match", value: "62% of required criteria", direction: "negative", weight: "high" },
                { factor: "Screening test score", value: "58/100 (threshold 65)", direction: "negative", weight: "medium" },
                { factor: "Internal referral", value: "none", direction: "neutral", weight: "low" },
              ];
          insDecision.run(decisionId, id, "Applicant / Employee (name withheld for demo)", tpl.key.startsWith("sys_credit") ? "declined" : "not shortlisted", JSON.stringify(factors), daysFromNow(-14));
          if (rnd() < 0.6) {
            const dueAt = daysFromNow(14);
            insExplanation.run(newId("exp"), id, "Affected data subject (name withheld)", decisionId, daysFromNow(-3), dueAt, null, "open", null);
          }
        }
      } else if (tpl.deployerRoleApplies) {
        insDeployerLog.run(newId("dlg"), id, `${tpl.businessFunction} log batch (non-high-risk, informational)`, daysFromNow(-30), daysFromNow(150));
      }

      // --- Cross-cutting D1: transparency disclosures ---
      if (tpl.key === "sys_chatbot") {
        insDisclosure.run(newId("trd"), id, "ai_interaction", "\"You're chatting with Eurobank's virtual assistant, an AI system. Ask for a human colleague at any time.\"", pick(["present", "present", "missing"], rnd), "Rendered on session start; verified in latest UI audit.", null, daysFromNow(-10));
      }
      if (tpl.key === "sys_video_kyc") {
        insDisclosure.run(newId("trd"), id, "ai_interaction", "\"This onboarding step uses an automated identity and watchlist screening system.\" (general Art. 50(1) AI-interaction notice — this is not the Art. 50(3) biometric-categorisation disclosure, which does not apply to an identification system.)", "present", "Displayed before biometric capture begins.", null, daysFromNow(-10));
      }
      if (tpl.key === "sys_credit_memo") {
        insDisclosure.run(newId("trd"), id, "watermarking", "Draft memo text is machine-readably marked as AI-generated pending relationship-manager review and sign-off.", pick(["present", "stale"], rnd), "Marking applied at generation time.", "2026-12-02", daysFromNow(-10));
      }

      // --- D2: GPAI integration ---
      if (tpl.gpaiIntegration) {
        const providerShift = !!tpl.fineTunedByEurobank;
        insGpai.run(
          newId("gpi"), id, tpl.gpaiModelReference ?? "Vendor foundation model", 1, 0, providerShift ? 1 : 0,
          providerShift ? "Eurobank fine-tuned this GPAI model on internal product/policy data in a way that changes its intended purpose from the vendor's general-purpose release, which may make Eurobank itself a provider of the fine-tuned model under Art. 25." : "Lightly prompted, not fine-tuned or substantially modified — Eurobank remains a downstream deployer, not a provider, of this model.",
          providerShift ? JSON.stringify([
            "Art. 53(1)(a) / Annex XI: maintain technical documentation for the fine-tuned model, available to the AI Office and national authorities.",
            "Art. 53(1)(b) / Annex XII: provide transparency information to any downstream integrators building on the fine-tuned version.",
            "Art. 53(1)(c): maintain a policy to comply with EU copyright law, including text/data-mining opt-outs.",
            "Art. 53(1)(d): publish a sufficiently detailed summary of the content used to fine-tune the model.",
            "If systemic-risk flag becomes positive: reference-only Art. 55 checklist (adversarial evaluation, systemic-risk assessment, model-level incident tracking, cybersecurity protections) — not expected at this fine-tuning scale.",
          ]) : JSON.stringify([]),
          daysFromNow(-15)
        );
      }

      // --- D3: post-market monitoring (provider-role systems) ---
      if (tpl.providerRoleApplies) {
        insPmmPlan.run(newId("pmp"), id, `Ongoing performance and drift monitoring for ${tpl.businessFunction}.`, "Score distribution drift, override rate, complaint volume, accuracy vs. holdout.", 3, daysFromNow(45));
        if (scenarioRoll < 0.3) {
          insPmmEvent.run(newId("pme"), id, pick(["performance_drift", "user_complaint", "near_miss"], rnd), `Monitoring observation logged for ${tpl.businessFunction}.`, pick(["low", "medium", "high"], rnd), daysFromNow(-Math.floor(rnd() * 20)));
        }
      }

      // --- D4: serious incidents (occasional, deployer-role high-risk systems) ---
      if (deployerHighRisk && rnd() < 0.18) {
        const tierPool: Array<[string, number]> = [
          ["death_serious_harm", 2],
          ["critical_infra_disruption", 2],
          ["fundamental_rights_widespread", 10],
          ["other_serious", 15],
        ];
        const [tier, days] = pick(tierPool, rnd);
        const detectedAt = daysFromNow(-Math.floor(rnd() * (days - 1)));
        const deadline = new Date(new Date(detectedAt).getTime() + days * 86400000).toISOString();
        const status = rnd() < 0.4 ? "reported" : pick(["detected", "classified", "reporting_drafted"], rnd);
        insIncident.run(newId("inc"), id, `Potential serious incident identified in ${tpl.businessFunction} operation.`, tier, detectedAt, deadline, status === "reported" ? daysFromNow(-1) : null, status, status === "reporting_drafted" || status === "reported" ? "Draft notification prepared for Banca d'Italia per Art. 73." : null, status === "reported" ? 1 : 0, status === "reported" ? 1 : 0);
      }
    }

    // Internal audit + management review (light, cross-cutting)
    const eng1 = newId("eng");
    insEngagement.run(eng1, "Annual AI Act Provider-Obligations Assurance Review", JSON.stringify(["sys_credit_mortgage", "sys_credit_sme", "sys_hr_recruitment"]), daysFromNow(-45), daysFromNow(-20), "completed", daysFromNow(-60));
    insFinding.run(newId("fnd"), eng1, systemIds["sys_credit_mortgage"], "Technical documentation Annex IV point 6 (harmonised standards) incomplete", "medium", "formal_non_compliance", "B3 Technical Documentation", "user_prod", daysFromNow(20), "open", daysFromNow(-30));
    insFinding.run(newId("fnd"), eng1, systemIds["sys_hr_recruitment"], "Recruitment model shows narrower shortlist rate for one age band despite passing all formal QMS checks", "high", "compliant_but_risky", "B1 Risk Management", "user_risk", daysFromNow(30), "open", daysFromNow(-25));

    const eng2 = newId("eng");
    insEngagement.run(eng2, "Deployer Obligations & FRIA Spot-Check", JSON.stringify(["sys_credit_mortgage", "sys_credit_sme", "sys_video_kyc"]), daysFromNow(-15), daysFromNow(-2), "in_progress", daysFromNow(-20));

    const rev1 = newId("rev");
    insReview.run(rev1, daysFromNow(-30), "Classification coverage 100%, FRIA completion tracked, 1 open incident at time of review.", "Board approved continued internal-control conformity route for all in-scope Annex III systems; requested quarterly override-rate reporting.", "completed", daysFromNow(60));
    insReviewAction.run(newId("rva"), rev1, "Close out Annex IV point 6 documentation gap", "user_prod", daysFromNow(20), "open");
  });

  tx();
  return { systemCount: PORTFOLIO.length };
}
