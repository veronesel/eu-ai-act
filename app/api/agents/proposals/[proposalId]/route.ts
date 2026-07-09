import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { canApproveProposal } from "@/lib/ai/approval-matrix";

// Human-in-the-loop commit point: approving a proposal is the ONLY way any agent-proposed
// change reaches an operational table. Rejecting just closes the proposal — no table write.
function commitProposal(db: any, targetRecordType: string, payload: any, approverId: string) {
  switch (targetRecordType) {
    case "classification": {
      const { systemId, prohibited_results = [], annex_iii_category, biometrics_branch, art6_3_claim, final_determination, rationale } = payload;
      for (const r of prohibited_results) {
        const existing = db.prepare(`SELECT id FROM prohibited_practice_screenings WHERE system_id = ? AND limb_code = ?`).get(systemId, r.limb_code);
        if (existing) {
          db.prepare(`UPDATE prohibited_practice_screenings SET result = ?, rationale = ?, decided_by = ?, decided_at = ? WHERE id = ?`)
            .run(r.result, r.rationale ?? null, approverId, nowIso(), existing.id);
        } else {
          db.prepare(`INSERT INTO prohibited_practice_screenings (id, system_id, limb_code, result, rationale, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(newId("scr"), systemId, r.limb_code, r.result, r.rationale ?? null, approverId, nowIso());
        }
      }
      const existingDet = db.prepare(`SELECT id FROM high_risk_determinations WHERE system_id = ?`).get(systemId);
      const claim = art6_3_claim ?? {};
      const detFields = [
        annex_iii_category ?? null, biometrics_branch ?? "not_biometric",
        claim.limb1 ?? null, claim.limb2 ?? null, claim.limb3 ?? null, claim.limb4 ?? null,
        claim.performs_profiling ? 1 : 0, final_determination, rationale, approverId, nowIso(),
      ];
      if (existingDet) {
        db.prepare(
          `UPDATE high_risk_determinations SET annex_iii_category=?, biometrics_branch=?, art6_3_limb1=?, art6_3_limb2=?, art6_3_limb3=?, art6_3_limb4=?, performs_profiling=?, final_determination=?, determination_rationale=?, confirmed_by=?, confirmed_at=? WHERE id = ?`
        ).run(...detFields, existingDet.id);
      } else {
        db.prepare(
          `INSERT INTO high_risk_determinations (id, system_id, annex_iii_category, biometrics_branch, art6_3_limb1, art6_3_limb2, art6_3_limb3, art6_3_limb4, performs_profiling, final_determination, determination_rationale, confirmed_by, confirmed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(newId("det"), systemId, ...detFields);
      }
      db.prepare(`UPDATE ai_systems SET classification_status = ?, annex_iii_category = ?, risk_classification_rationale = ? WHERE id = ?`)
        .run(final_determination === "out_of_scope" ? "not_high_risk" : final_determination, annex_iii_category ?? null, rationale, systemId);
      return;
    }

    case "technical_documentation": {
      const { systemId, annexIvPoint, content } = payload;
      const section = db.prepare(`SELECT * FROM technical_documentation_sections WHERE system_id = ? AND annex_iv_point = ?`).get(systemId, annexIvPoint) as any;
      if (!section) return;
      const newVersion = (section.version ?? 1) + 1;
      db.prepare(`UPDATE technical_documentation_sections SET content = ?, status = 'approved', version = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
        .run(content, newVersion, approverId, nowIso(), section.id);
      db.prepare(`INSERT INTO technical_documentation_versions (id, section_id, version, content, status, saved_by, saved_at) VALUES (?, ?, ?, ?, 'approved', ?, ?)`)
        .run(newId("tdv"), section.id, newVersion, content, approverId, nowIso());
      return;
    }

    case "fria": {
      const { systemId, sectionName, content } = payload;
      const allowed = ["process_description", "timeframe_frequency", "affected_persons", "specific_risks", "human_oversight_measures", "mitigation_measures", "dpia_crossref"];
      if (!allowed.includes(sectionName)) return;
      db.prepare(`UPDATE fria_assessments SET ${sectionName} = ?, status = 'in_progress', updated_at = ? WHERE system_id = ?`).run(content, nowIso(), systemId);
      return;
    }

    case "conformity_readiness":
      // Informational punch list only — approving records human sign-off on the gap list but never
      // flips conformity_assessments.outcome. Nothing to commit to an operational table.
      return;

    case "serious_incident": {
      const { incidentId, severityTier, reportText, deadlineAt } = payload;
      db.prepare(`UPDATE serious_incidents SET severity_tier = ?, deadline_at = COALESCE(?, deadline_at), report_text = ?, status = 'reporting_drafted' WHERE id = ?`)
        .run(severityTier, deadlineAt ?? null, reportText, incidentId);
      return;
    }

    case "transparency_disclosure": {
      const { systemId, disclosureType, fixedText } = payload;
      const existing = db.prepare(`SELECT id FROM transparency_disclosures WHERE system_id = ? AND disclosure_type = ?`).get(systemId, disclosureType) as any;
      if (existing) {
        db.prepare(`UPDATE transparency_disclosures SET disclosure_text = ?, status = 'present', updated_at = ? WHERE id = ?`).run(fixedText, nowIso(), existing.id);
      } else {
        db.prepare(`INSERT INTO transparency_disclosures (id, system_id, disclosure_type, disclosure_text, status, updated_at) VALUES (?, ?, ?, ?, 'present', ?)`)
          .run(newId("trd"), systemId, disclosureType, fixedText, nowIso());
      }
      return;
    }

    case "individual_explanation": {
      const { explanationRequestId, explanationText } = payload;
      db.prepare(`UPDATE explanation_requests SET drafted_response = ?, status = 'drafted' WHERE id = ?`).run(explanationText, explanationRequestId);
      return;
    }

    default:
      return;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { proposalId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const db = getDb();
  const proposal = db.prepare(`SELECT * FROM agent_proposals WHERE id = ?`).get(params.proposalId) as any;
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proposal.status !== "pending") return NextResponse.json({ error: "Proposal already decided" }, { status: 409 });

  if (!canApproveProposal(user.role_code, proposal.approver_role_required)) {
    return NextResponse.json({ error: `Only ${proposal.approver_role_required} (or EXEC_SPONSOR) can decide this proposal.` }, { status: 403 });
  }

  const body = await req.json();
  if (!["approved", "rejected"].includes(body.decision)) return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });

  if (body.decision === "approved") {
    const payload = JSON.parse(proposal.proposal_payload_json);
    commitProposal(db, proposal.target_record_type, payload, user.id);
  }

  db.prepare(`UPDATE agent_proposals SET status = ?, approved_by = ?, decided_at = ? WHERE id = ?`).run(body.decision, user.id, nowIso(), params.proposalId);
  const updated = db.prepare(`SELECT * FROM agent_proposals WHERE id = ?`).get(params.proposalId);
  return NextResponse.json(updated);
}
