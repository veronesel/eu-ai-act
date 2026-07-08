// Aegis data model — see AEGIS build spec §5. Single-file SQLite schema, applied idempotently on boot.
export const SCHEMA_SQL = `
-- ============ Users / RBAC ============
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role_code TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  mission TEXT NOT NULL
);

-- ============ Regulatory baselines (dual timeline, §2.2) ============
CREATE TABLE IF NOT EXISTS regulatory_baselines (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  annex_iii_standalone_date TEXT NOT NULL,
  annex_i_embedded_date TEXT NOT NULL,
  art5_ncii_csam_date TEXT,
  art50_2_watermark_existing_date TEXT NOT NULL,
  sandboxes_date TEXT NOT NULL,
  art50_general_transparency_date TEXT NOT NULL,
  art51_55_gpai_date TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0
);

-- ============ Core aggregate ============
CREATE TABLE IF NOT EXISTS ai_systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  business_function TEXT NOT NULL,
  owner_persona_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  provider_role_applies INTEGER NOT NULL DEFAULT 0,
  deployer_role_applies INTEGER NOT NULL DEFAULT 0,
  lifecycle_stage TEXT NOT NULL DEFAULT 'concept',
  classification_status TEXT NOT NULL DEFAULT 'not_screened',
  annex_iii_category TEXT,
  gpai_integration INTEGER NOT NULL DEFAULT 0,
  gpai_model_reference TEXT,
  fine_tuned_by_eurobank INTEGER NOT NULL DEFAULT 0,
  risk_classification_rationale TEXT,
  conformity_assessment_route TEXT NOT NULL DEFAULT 'not_applicable',
  eu_database_registration_status TEXT NOT NULL DEFAULT 'not_started',
  ce_marking_status TEXT NOT NULL DEFAULT 'not_started',
  declaration_of_conformity_status TEXT NOT NULL DEFAULT 'not_started',
  demo_seed_key TEXT,
  placed_on_market_at TEXT
);

CREATE TABLE IF NOT EXISTS lifecycle_history (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  entered_at TEXT NOT NULL,
  notes TEXT
);

-- ============ Classification & screening ============
CREATE TABLE IF NOT EXISTS prohibited_practice_screenings (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  limb_code TEXT NOT NULL, -- ab, c, d, e, f, g, h, omnibus_ncii
  result TEXT NOT NULL DEFAULT 'not_applicable', -- pass | fail | not_applicable
  rationale TEXT,
  safe_harbour_notes TEXT,
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS high_risk_determinations (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  annex_iii_category TEXT,
  biometrics_branch TEXT, -- identification | categorisation | emotion_recognition | verification_excluded | not_biometric
  art6_3_limb1 TEXT, art6_3_limb1_rationale TEXT,
  art6_3_limb2 TEXT, art6_3_limb2_rationale TEXT,
  art6_3_limb3 TEXT, art6_3_limb3_rationale TEXT,
  art6_3_limb4 TEXT, art6_3_limb4_rationale TEXT,
  performs_profiling INTEGER NOT NULL DEFAULT 0,
  final_determination TEXT NOT NULL, -- not_high_risk | high_risk | prohibited_blocked | out_of_scope
  determination_rationale TEXT,
  confirmed_by TEXT REFERENCES users(id),
  confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS regulatory_challenges (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  authority TEXT NOT NULL DEFAULT 'Banca d''Italia',
  challenge_received_at TEXT NOT NULL,
  challenge_notes TEXT,
  response_due_at TEXT,
  response_notes TEXT,
  responded_at TEXT,
  outcome TEXT NOT NULL DEFAULT 'pending' -- pending | self_assessment_upheld | reclassified_high_risk
);

CREATE TABLE IF NOT EXISTS ai_literacy_records (
  id TEXT PRIMARY KEY,
  department TEXT NOT NULL,
  role_code TEXT NOT NULL,
  training_name TEXT NOT NULL,
  completion_pct INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS authority_information_requests (
  id TEXT PRIMARY KEY,
  authority TEXT NOT NULL,
  system_id TEXT REFERENCES ai_systems(id) ON DELETE SET NULL,
  request_text TEXT NOT NULL,
  received_at TEXT NOT NULL,
  sla_days INTEGER NOT NULL DEFAULT 15,
  sla_is_default INTEGER NOT NULL DEFAULT 1,
  response_due_at TEXT NOT NULL,
  response_notes TEXT,
  responded_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' -- open | responded | overdue
);

CREATE TABLE IF NOT EXISTS regulatory_change_watch (
  id TEXT PRIMARY KEY,
  instrument TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL, -- draft | agreed | in_force | superseded
  date_basis TEXT NOT NULL,
  source_note TEXT NOT NULL,
  added_by TEXT NOT NULL DEFAULT 'seed', -- seed | agent
  created_at TEXT NOT NULL
);

-- ============ Provider Obligations Suite ============
CREATE TABLE IF NOT EXISTS risk_management_records (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  lifecycle_phase TEXT NOT NULL,
  risk_description TEXT NOT NULL,
  likelihood INTEGER NOT NULL, -- 1-5
  severity INTEGER NOT NULL, -- 1-5
  mitigation TEXT,
  residual_likelihood INTEGER,
  residual_severity INTEGER,
  review_cadence_months INTEGER NOT NULL DEFAULT 6,
  next_review_at TEXT,
  owner_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_governance_records (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  dataset_name TEXT NOT NULL,
  purpose TEXT NOT NULL, -- training | validation | test
  provenance TEXT,
  collection_methodology TEXT,
  bias_characteristics_examined TEXT,
  quality_checks_run TEXT,
  quality_gaps TEXT,
  special_category_basis_necessity_rationale TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS technical_documentation_sections (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  annex_iv_point INTEGER NOT NULL, -- 1-9
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | agent_drafted_pending_review | approved
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL,
  retain_until TEXT
);

CREATE TABLE IF NOT EXISTS technical_documentation_versions (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES technical_documentation_sections(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT,
  status TEXT NOT NULL,
  saved_by TEXT,
  saved_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS record_keeping_logs (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_detail TEXT NOT NULL,
  logged_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transparency_instructions (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  intended_purpose TEXT,
  known_limitations TEXT,
  human_oversight_measures TEXT,
  expected_lifetime TEXT,
  maintenance_needs TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS human_oversight_designs (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  stop_override_mechanism TEXT,
  confidence_threshold_gating TEXT,
  escalation_triggers TEXT,
  explainability_outputs TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accuracy_robustness_records (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL, -- accuracy_metric | robustness_test | cyber_control
  metric_name TEXT,
  metric_value TEXT,
  test_date TEXT,
  result TEXT, -- tested | not_tested | passed | failed
  notes TEXT
);

CREATE TABLE IF NOT EXISTS qms_records (
  id TEXT PRIMARY KEY,
  policy_area TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id),
  policy_document_link TEXT,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | complete
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conformity_assessments (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  route TEXT NOT NULL, -- internal_control_annex_vi | notified_body_annex_vii
  checklist_json TEXT NOT NULL DEFAULT '[]',
  assessor TEXT,
  notified_body_number TEXT,
  outcome TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | passed | failed
  certificate_reference TEXT,
  certificate_expiry TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS declarations_of_conformity (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  issued_at TEXT,
  document_text TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
);

CREATE TABLE IF NOT EXISTS ce_marking_records (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  affixed_at TEXT,
  notified_body_number TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
);

CREATE TABLE IF NOT EXISTS eu_database_registrations (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  provider_identity TEXT,
  system_description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  member_states TEXT,
  self_assessment_summary TEXT,
  self_assessment_required INTEGER NOT NULL DEFAULT 0,
  registered_at TEXT
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  non_conformity_description TEXT NOT NULL,
  action_type TEXT NOT NULL, -- corrective | preventive | withdrawal
  action_description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | closed
  poses_health_safety_risk INTEGER NOT NULL DEFAULT 0,
  authority_notified INTEGER NOT NULL DEFAULT 0,
  authority_notified_at TEXT,
  source_flag_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS corrective_action_notifications (
  id TEXT PRIMARY KEY,
  corrective_action_id TEXT NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  party TEXT NOT NULL, -- deployer | distributor | importer | authorised_representative | authority
  notified_at TEXT,
  notes TEXT
);

-- ============ Deployer Obligations Suite ============
CREATE TABLE IF NOT EXISTS deployer_obligation_checklists (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_label TEXT NOT NULL,
  is_checked INTEGER NOT NULL DEFAULT 0,
  evidence_link TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fria_assessments (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  triggered INTEGER NOT NULL DEFAULT 0,
  trigger_reason TEXT,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | complete
  process_description TEXT,
  timeframe_frequency TEXT,
  affected_persons TEXT,
  specific_risks TEXT,
  human_oversight_measures TEXT,
  mitigation_measures TEXT,
  dpia_crossref TEXT,
  notification_status TEXT NOT NULL DEFAULT 'not_notified',
  notified_at TEXT,
  cloned_from_system_id TEXT REFERENCES ai_systems(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS human_oversight_operations (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  overseer_name TEXT NOT NULL,
  shift_date TEXT NOT NULL,
  event_type TEXT NOT NULL, -- override | escalation | routine_check
  reason_code TEXT,
  notes TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deployer_logs (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  log_batch_label TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  retention_expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  complainant TEXT NOT NULL,
  nature TEXT NOT NULL,
  routed_to TEXT NOT NULL DEFAULT 'Banca d''Italia',
  status TEXT NOT NULL DEFAULT 'open', -- open | investigating | closed
  filed_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS explanation_requests (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  affected_person TEXT NOT NULL,
  decision_reference TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  drafted_response TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | drafted | sent
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS decision_records (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  decision_outcome TEXT NOT NULL,
  decision_factors_json TEXT NOT NULL DEFAULT '[]',
  decided_at TEXT NOT NULL
);

-- ============ Cross-cutting Operations ============
CREATE TABLE IF NOT EXISTS transparency_disclosures (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  disclosure_type TEXT NOT NULL, -- ai_interaction | watermarking | biometric_categorisation
  disclosure_text TEXT,
  status TEXT NOT NULL DEFAULT 'missing', -- missing | present | stale
  verification_log TEXT,
  deadline_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gpai_integrations (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  vendor_model_name TEXT NOT NULL,
  code_of_practice_signatory INTEGER NOT NULL DEFAULT 0,
  systemic_risk_flag INTEGER NOT NULL DEFAULT 0,
  provider_shift_flag INTEGER NOT NULL DEFAULT 0,
  provider_shift_rationale TEXT,
  art53_obligations_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_market_monitoring_plans (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  methodology TEXT,
  metrics_tracked TEXT,
  review_cadence_months INTEGER NOT NULL DEFAULT 6,
  next_review_at TEXT
);

CREATE TABLE IF NOT EXISTS post_market_monitoring_events (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- performance_drift | user_complaint | near_miss
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monitoring_flags (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  flag_text TEXT NOT NULL,
  severity TEXT NOT NULL,
  source_agent_run_id TEXT,
  created_at TEXT NOT NULL,
  acted_on INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS serious_incidents (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity_tier TEXT, -- death_serious_harm | critical_infra_disruption | fundamental_rights_widespread | other_serious
  incident_detected_at TEXT NOT NULL,
  deadline_at TEXT,
  reported_at TEXT,
  status TEXT NOT NULL DEFAULT 'detected', -- detected | classified | reporting_drafted | reported | closed
  report_text TEXT,
  authority_notified INTEGER NOT NULL DEFAULT 0,
  provider_notified INTEGER NOT NULL DEFAULT 0
);

-- ============ Assurance & Reporting ============
CREATE TABLE IF NOT EXISTS internal_audit_engagements (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  systems_in_scope TEXT,
  fieldwork_start TEXT,
  fieldwork_end TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES internal_audit_engagements(id) ON DELETE CASCADE,
  system_id TEXT REFERENCES ai_systems(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL, -- low | medium | high | critical
  finding_tag TEXT NOT NULL DEFAULT 'formal_non_compliance', -- compliant_but_risky (Art82) | formal_non_compliance (Art83)
  linked_evidence TEXT,
  remediation_owner TEXT REFERENCES users(id),
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | remediating | closed
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS management_review_records (
  id TEXT PRIMARY KEY,
  review_date TEXT NOT NULL,
  input_pack_notes TEXT,
  decisions TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  next_review_due TEXT
);

CREATE TABLE IF NOT EXISTS management_review_actions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES management_review_records(id) ON DELETE CASCADE,
  action_text TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id),
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS regulatory_obligations_matrix (
  id TEXT PRIMARY KEY,
  article_ref TEXT NOT NULL,
  obligation TEXT NOT NULL,
  owning_module TEXT NOT NULL,
  owning_module_path TEXT,
  primary_persona TEXT NOT NULL,
  is_not_applicable INTEGER NOT NULL DEFAULT 0,
  not_applicable_rationale TEXT
);

CREATE TABLE IF NOT EXISTS obligation_evidence_links (
  id TEXT PRIMARY KEY,
  obligation_id TEXT NOT NULL REFERENCES regulatory_obligations_matrix(id) ON DELETE CASCADE,
  system_id TEXT REFERENCES ai_systems(id) ON DELETE CASCADE,
  evidence_table TEXT,
  evidence_record_id TEXT,
  status TEXT NOT NULL DEFAULT 'no_evidence' -- no_evidence | partial | complete
);

-- ============ Agentic layer ============
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  agent_key TEXT NOT NULL,
  trigger_context TEXT,
  system_id TEXT REFERENCES ai_systems(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running', -- running | completed | failed
  tool_calls_json TEXT NOT NULL DEFAULT '[]',
  trace_json TEXT NOT NULL DEFAULT '[]',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  error_text TEXT
);

CREATE TABLE IF NOT EXISTS agent_proposals (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  system_id TEXT REFERENCES ai_systems(id) ON DELETE SET NULL,
  target_record_type TEXT NOT NULL,
  target_record_id TEXT,
  proposal_summary TEXT NOT NULL,
  proposal_payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approver_role_required TEXT NOT NULL,
  approved_by TEXT REFERENCES users(id),
  decided_at TEXT,
  created_at TEXT NOT NULL
);
`;
