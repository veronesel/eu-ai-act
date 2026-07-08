// Which persona is allowed to approve/reject an agent_proposals row, keyed by target_record_type.
// EXEC_SPONSOR can always approve, as an escalation path, on top of the mapped persona below.
// This intentionally lives in the agentic layer (not lib/auth) because it governs proposal
// approval specifically, which is a narrower concept than the general canWrite() RBAC scopes.
export const APPROVAL_MATRIX: Record<string, string> = {
  classification: "REG_COMPLIANCE_LEAD",
  technical_documentation: "AI_PRODUCT_OWNER",
  fria: "DEPLOYER_OPS_MGR",
  conformity_readiness: "QUALITY_CONFORMITY_MGR",
  serious_incident: "DEPLOYER_OPS_MGR",
  transparency_disclosure: "AI_PRODUCT_OWNER",
  individual_explanation: "DEPLOYER_OPS_MGR",
};

export function approverRoleRequired(targetRecordType: string): string {
  return APPROVAL_MATRIX[targetRecordType] ?? "EXEC_SPONSOR";
}

export function canApproveProposal(roleCode: string, approverRoleRequired: string): boolean {
  if (roleCode === "EXEC_SPONSOR") return true;
  return roleCode === approverRoleRequired;
}
