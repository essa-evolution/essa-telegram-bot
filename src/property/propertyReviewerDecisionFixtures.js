import {
  createPropertyReviewerDecision,
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  propertyReviewerReasonCodes,
  propertyReviewerRoles
} from "./propertyReviewerDecision.js";

const fixedNow = "2026-08-20T00:00:00.000Z";
const exactCanonicalPropertyId = "prop_georgia_batumi_batumi_ingested_residence_tower_b_0501";

function evidenceRefs(...refs) {
  return refs.map(([refType, refId]) => ({ refType, refId, sourceBacked: true }));
}

export const propertyReviewerDecisionFixtures = {
  exactConfirm: createPropertyReviewerDecision({
    decisionId: "decision_exact_confirm_agency_0501",
    ingestionId: "ingest_agency_listing_tower_b_0501",
    sourceRecordId: "agency_listing_tower_b_0501",
    canonicalPropertyId: exactCanonicalPropertyId,
    decisionType: propertyReviewerDecisionTypes.confirmExactMatch,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: propertyReviewerReasonCodes.projectBuildingUnitMatch,
    rationale: "Project, building and unit identifiers match the existing canonical property candidate.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_agency_listing_tower_b_0501"],
      ["PropertySourceRecord", "agency_listing_tower_b_0501"],
      ["CanonicalProperty", exactCanonicalPropertyId],
      ["MatchOutcome", "EXACT_MATCH"]
    ),
    warningsAcknowledged: [],
    createdAt: fixedNow,
    decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision
  }),
  exactReject: createPropertyReviewerDecision({
    decisionId: "decision_exact_reject_duplicate_0501",
    ingestionId: "ingest_duplicate_partner_tower_b_0501",
    sourceRecordId: "duplicate_partner_tower_b_0501",
    canonicalPropertyId: exactCanonicalPropertyId,
    decisionType: propertyReviewerDecisionTypes.rejectMatch,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: propertyReviewerReasonCodes.conflictingIdentity,
    rationale: "Reviewer wants additional identity review before accepting this duplicate source match.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_duplicate_partner_tower_b_0501"],
      ["PropertySourceRecord", "duplicate_partner_tower_b_0501"],
      ["CanonicalProperty", exactCanonicalPropertyId],
      ["MatchOutcome", "EXACT_MATCH"]
    ),
    warningsAcknowledged: ["duplicate_source_review_required"],
    createdAt: fixedNow,
    decisionStatus: propertyReviewerDecisionStatuses.readyForReview
  }),
  conflictAcknowledge: createPropertyReviewerDecision({
    decisionId: "decision_conflict_ack_price_130000",
    ingestionId: "ingest_agency_listing_tower_b_0501_price_130000",
    sourceRecordId: "agency_listing_tower_b_0501_price_130000",
    canonicalPropertyId: exactCanonicalPropertyId,
    decisionType: propertyReviewerDecisionTypes.acknowledgeConflict,
    reviewerRole: propertyReviewerRoles.compliance,
    reviewerId: "local_property_compliance_placeholder",
    reasonCode: propertyReviewerReasonCodes.conflictingPrice,
    rationale: "Price observations disagree; conflict is acknowledged but no canonical price is overwritten.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_agency_listing_tower_b_0501_price_130000"],
      ["ConflictEvidence", "conflicting_price_observation:125000,125000,125000->130000_USD"],
      ["CanonicalProperty", exactCanonicalPropertyId],
      ["MatchOutcome", "CONFLICT_REVIEW_REQUIRED"]
    ),
    warningsAcknowledged: ["conflicting_price_observation"],
    createdAt: fixedNow,
    decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision
  }),
  quarantineKeep: createPropertyReviewerDecision({
    decisionId: "decision_quarantine_keep_invalid_area",
    ingestionId: "ingest_invalid_negative_area",
    sourceRecordId: "invalid_negative_area",
    canonicalPropertyId: null,
    decisionType: propertyReviewerDecisionTypes.keepInQuarantine,
    reviewerRole: propertyReviewerRoles.admin,
    reviewerId: "local_property_admin_placeholder",
    reasonCode: propertyReviewerReasonCodes.malformedSource,
    rationale: "Record contains impossible area and price values, so it remains quarantined.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_invalid_negative_area"],
      ["PropertySourceRecord", "invalid_negative_area"],
      ["EvidenceGap", "city_missing"]
    ),
    warningsAcknowledged: ["area_impossible_negative", "price_impossible_negative"],
    createdAt: fixedNow,
    decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision
  }),
  requestMoreEvidence: createPropertyReviewerDecision({
    decisionId: "decision_gap_request_more_evidence",
    ingestionId: "ingest_manual_gap_record_city_missing",
    sourceRecordId: "manual_gap_record_city_missing",
    canonicalPropertyId: "prop_georgia_unknown_manual_gap_record_city_missing",
    decisionType: propertyReviewerDecisionTypes.requestMoreEvidence,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: propertyReviewerReasonCodes.insufficientEvidence,
    rationale: "City and price evidence are incomplete; reviewer requests additional source evidence.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_manual_gap_record_city_missing"],
      ["PropertySourceRecord", "manual_gap_record_city_missing"],
      ["EvidenceGap", "city_missing"]
    ),
    warningsAcknowledged: ["city_missing"],
    createdAt: fixedNow,
    decisionStatus: propertyReviewerDecisionStatuses.readyForReview
  }),
  supersededPrevious: createPropertyReviewerDecision({
    decisionId: "decision_superseded_previous_owner_0707",
    ingestionId: "ingest_owner_sub_batumi_0707",
    sourceRecordId: "owner_sub_batumi_0707",
    canonicalPropertyId: "prop_georgia_batumi_owner_local_residence_owner_tower_0707",
    decisionType: propertyReviewerDecisionTypes.requestMoreEvidence,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: propertyReviewerReasonCodes.insufficientEvidence,
    rationale: "Initial reviewer requested more evidence before accepting the owner submission.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_owner_sub_batumi_0707"],
      ["PropertySourceRecord", "owner_sub_batumi_0707"]
    ),
    createdAt: "2026-08-20T00:00:00.000Z",
    decisionStatus: propertyReviewerDecisionStatuses.superseded
  }),
  supersedingCurrent: createPropertyReviewerDecision({
    decisionId: "decision_superseding_accept_owner_0707",
    ingestionId: "ingest_owner_sub_batumi_0707",
    sourceRecordId: "owner_sub_batumi_0707",
    canonicalPropertyId: "prop_georgia_batumi_owner_local_residence_owner_tower_0707",
    decisionType: propertyReviewerDecisionTypes.acceptAsNewProperty,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: propertyReviewerReasonCodes.manualReviewRequired,
    rationale: "Later reviewer accepts the local owner submission as a new property candidate decision only.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_owner_sub_batumi_0707"],
      ["PropertySourceRecord", "owner_sub_batumi_0707"],
      ["CanonicalProperty", "prop_georgia_batumi_owner_local_residence_owner_tower_0707"]
    ),
    createdAt: "2026-08-21T00:00:00.000Z",
    decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision,
    supersedesDecisionId: "decision_superseded_previous_owner_0707"
  }),
  invalidIncompatible: createPropertyReviewerDecision({
    decisionId: "decision_invalid_quarantine_exact_match",
    ingestionId: "ingest_invalid_negative_area",
    sourceRecordId: "invalid_negative_area",
    canonicalPropertyId: null,
    decisionType: propertyReviewerDecisionTypes.confirmExactMatch,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: propertyReviewerReasonCodes.exactIdentityMatch,
    rationale: "Invalid fixture tries to confirm an exact match for a quarantined record.",
    evidenceRefs: evidenceRefs(
      ["PropertyIngestionAudit", "ingest_invalid_negative_area"],
      ["PropertySourceRecord", "invalid_negative_area"]
    ),
    createdAt: fixedNow,
    decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision
  })
};

export const propertyReviewerDecisionFixtureList = Object.values(propertyReviewerDecisionFixtures);
