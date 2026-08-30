import {
  propertyIngestionMatchOutcomes,
  propertyIngestionValidationStatuses,
  clonePropertyIngestionValue
} from "./propertyIngestionContracts.js";

export const propertyReviewerDecisionTypes = {
  acceptAsNewProperty: "ACCEPT_AS_NEW_PROPERTY",
  confirmExactMatch: "CONFIRM_EXACT_MATCH",
  markProbableMatchForReview: "MARK_PROBABLE_MATCH_FOR_REVIEW",
  rejectMatch: "REJECT_MATCH",
  keepSeparateProperties: "KEEP_SEPARATE_PROPERTIES",
  acknowledgeConflict: "ACKNOWLEDGE_CONFLICT",
  acceptWithGaps: "ACCEPT_WITH_GAPS",
  keepInQuarantine: "KEEP_IN_QUARANTINE",
  rejectSourceRecord: "REJECT_SOURCE_RECORD",
  requestMoreEvidence: "REQUEST_MORE_EVIDENCE"
};

export const forbiddenPropertyReviewerDecisionTypes = [
  "PUBLISH_NOW",
  "EXECUTE_MERGE",
  "WRITE_TO_DB",
  "PAY",
  "BOOK",
  "ACTIVATE_PROVIDER"
];

export const propertyReviewerDecisionStatuses = {
  draft: "DRAFT",
  readyForReview: "READY_FOR_REVIEW",
  approvedAsDecision: "APPROVED_AS_DECISION",
  rejectedAsDecision: "REJECTED_AS_DECISION",
  superseded: "SUPERSEDED",
  cancelled: "CANCELLED"
};

export const propertyReviewerExecutionStatuses = {
  notExecuted: "NOT_EXECUTED"
};

export const propertyReviewerRoles = {
  reviewer: "PROPERTY_REVIEWER",
  compliance: "PROPERTY_COMPLIANCE",
  admin: "PROPERTY_ADMIN"
};

export const propertyReviewerReasonCodes = {
  exactIdentityMatch: "EXACT_IDENTITY_MATCH",
  projectBuildingUnitMatch: "PROJECT_BUILDING_UNIT_MATCH",
  sourceAliasMatch: "SOURCE_ALIAS_MATCH",
  insufficientEvidence: "INSUFFICIENT_EVIDENCE",
  conflictingIdentity: "CONFLICTING_IDENTITY",
  conflictingPrice: "CONFLICTING_PRICE",
  malformedSource: "MALFORMED_SOURCE",
  missingRequiredSourceData: "MISSING_REQUIRED_SOURCE_DATA",
  duplicateSourceRecord: "DUPLICATE_SOURCE_RECORD",
  professionalReviewRequired: "PROFESSIONAL_REVIEW_REQUIRED",
  manualReviewRequired: "MANUAL_REVIEW_REQUIRED"
};

export const propertyReviewerDecisionAuditEvents = {
  created: "DECISION_CREATED",
  validated: "DECISION_VALIDATED",
  readyForReview: "DECISION_READY_FOR_REVIEW",
  approvedAsDecision: "DECISION_APPROVED_AS_DECISION",
  rejectedAsDecision: "DECISION_REJECTED_AS_DECISION",
  superseded: "DECISION_SUPERSEDED",
  cancelled: "DECISION_CANCELLED"
};

export const propertyReviewerDecisionContract = {
  modelType: "PropertyReviewerDecision",
  decisionId: null,
  ingestionId: null,
  sourceRecordId: null,
  canonicalPropertyId: null,
  decisionType: null,
  reviewerRole: propertyReviewerRoles.reviewer,
  reviewerId: null,
  reasonCode: null,
  rationale: "",
  evidenceRefs: [],
  warningsAcknowledged: [],
  createdAt: null,
  decisionStatus: propertyReviewerDecisionStatuses.draft,
  executionStatus: propertyReviewerExecutionStatuses.notExecuted,
  supersedesDecisionId: null,
  auditMetadata: {
    actorType: "LOCAL_HUMAN_REVIEWER_PLACEHOLDER",
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0,
    mergeActions: 0,
    publishActions: 0,
    quarantineMutations: 0
  }
};

export const propertyReviewerDecisionAuditContract = {
  modelType: "PropertyReviewerDecisionAudit",
  auditRecordId: null,
  eventType: null,
  decisionId: null,
  ingestionId: null,
  sourceRecordId: null,
  previousDecisionStatus: null,
  nextDecisionStatus: null,
  reviewerRole: null,
  reviewerId: null,
  reasonCode: null,
  evidenceRefs: [],
  timestamp: null,
  appendOnly: true,
  executionStatus: propertyReviewerExecutionStatuses.notExecuted,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0,
  bookingActions: 0,
  transactionActions: 0,
  mergeActions: 0,
  publishActions: 0,
  quarantineMutations: 0
};

export const propertyReviewerDecisionCompatibilityMatrix = {
  [propertyIngestionMatchOutcomes.exactMatch]: [
    propertyReviewerDecisionTypes.confirmExactMatch,
    propertyReviewerDecisionTypes.rejectMatch,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ],
  [propertyIngestionMatchOutcomes.probableMatchReviewRequired]: [
    propertyReviewerDecisionTypes.markProbableMatchForReview,
    propertyReviewerDecisionTypes.rejectMatch,
    propertyReviewerDecisionTypes.keepSeparateProperties,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ],
  [propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate]: [
    propertyReviewerDecisionTypes.acceptAsNewProperty,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ],
  [propertyIngestionMatchOutcomes.conflictReviewRequired]: [
    propertyReviewerDecisionTypes.acknowledgeConflict,
    propertyReviewerDecisionTypes.keepSeparateProperties,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ],
  [propertyIngestionValidationStatuses.acceptedWithGaps]: [
    propertyReviewerDecisionTypes.acceptWithGaps,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ],
  [propertyIngestionValidationStatuses.quarantined]: [
    propertyReviewerDecisionTypes.keepInQuarantine,
    propertyReviewerDecisionTypes.rejectSourceRecord,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ],
  [propertyIngestionValidationStatuses.rejected]: [
    propertyReviewerDecisionTypes.rejectSourceRecord,
    propertyReviewerDecisionTypes.requestMoreEvidence
  ]
};

function clone(value) {
  return clonePropertyIngestionValue(value);
}

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function getPropertyReviewerDecisionReviewStates(reviewItem = {}) {
  if (reviewItem.validationStatus === propertyIngestionValidationStatuses.quarantined) return [propertyIngestionValidationStatuses.quarantined];
  if (reviewItem.validationStatus === propertyIngestionValidationStatuses.rejected) return [propertyIngestionValidationStatuses.rejected];
  return uniq([
    reviewItem.validationStatus === propertyIngestionValidationStatuses.acceptedWithGaps
      ? propertyIngestionValidationStatuses.acceptedWithGaps
      : null,
    reviewItem.matchOutcome
  ]);
}

export function getAllowedPropertyReviewerDecisionTypes(reviewItem = {}) {
  return uniq(getPropertyReviewerDecisionReviewStates(reviewItem)
    .flatMap((state) => propertyReviewerDecisionCompatibilityMatrix[state] || []));
}

export function buildPropertyReviewerEvidenceRefs(reviewItem = {}) {
  const refs = [
    { refType: "PropertyIngestionAudit", refId: reviewItem.ingestionId },
    { refType: "PropertySourceRecord", refId: reviewItem.sourceRecordId },
    reviewItem.normalizationStatus === "NORMALIZED"
      ? { refType: "NormalizedPropertyCandidate", refId: `candidate:${reviewItem.sourceRecordId}` }
      : null,
    reviewItem.matchOutcome
      ? { refType: "MatchOutcome", refId: reviewItem.matchOutcome }
      : null,
    reviewItem.canonicalPropertyId
      ? { refType: "CanonicalProperty", refId: reviewItem.canonicalPropertyId }
      : null,
    reviewItem.listingSnapshotId
      ? { refType: "ListingSnapshot", refId: reviewItem.listingSnapshotId }
      : null,
    ...(reviewItem.conflicts || []).map((conflict) => ({ refType: "ConflictEvidence", refId: conflict })),
    ...(reviewItem.gaps || []).map((gap) => ({ refType: "EvidenceGap", refId: gap }))
  ].filter(Boolean);
  return refs.map((ref) => ({ ...ref, sourceBacked: true }));
}

export function createPropertyReviewerDecision(input = {}) {
  return {
    ...clone(propertyReviewerDecisionContract),
    ...input,
    evidenceRefs: clone(input.evidenceRefs || []),
    warningsAcknowledged: [...(input.warningsAcknowledged || [])],
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    auditMetadata: {
      ...clone(propertyReviewerDecisionContract.auditMetadata),
      ...(input.auditMetadata || {}),
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0,
      bookingActions: 0,
      transactionActions: 0,
      mergeActions: 0,
      publishActions: 0,
      quarantineMutations: 0
    }
  };
}

function needsCanonicalPropertyId(decisionType) {
  return [
    propertyReviewerDecisionTypes.confirmExactMatch,
    propertyReviewerDecisionTypes.rejectMatch,
    propertyReviewerDecisionTypes.keepSeparateProperties,
    propertyReviewerDecisionTypes.acknowledgeConflict
  ].includes(decisionType);
}

export function validatePropertyReviewerDecision(decision = {}, reviewItem = {}) {
  const errors = [];
  const warnings = [];
  const allowed = getAllowedPropertyReviewerDecisionTypes(reviewItem);
  if (decision.modelType !== "PropertyReviewerDecision") errors.push("decision_model_type_invalid");
  if (!decision.decisionId) errors.push("decision_id_required");
  if (!decision.ingestionId || decision.ingestionId !== reviewItem.ingestionId) errors.push("ingestion_id_mismatch_or_missing");
  if (!decision.sourceRecordId || decision.sourceRecordId !== reviewItem.sourceRecordId) errors.push("source_record_id_mismatch_or_missing");
  if (!Object.values(propertyReviewerDecisionTypes).includes(decision.decisionType)) errors.push("decision_type_unknown");
  if (forbiddenPropertyReviewerDecisionTypes.includes(decision.decisionType)) errors.push("forbidden_execution_decision_type");
  if (decision.decisionType && !allowed.includes(decision.decisionType)) errors.push("decision_type_not_allowed_for_review_state");
  if (!Object.values(propertyReviewerDecisionStatuses).includes(decision.decisionStatus)) errors.push("decision_status_unknown");
  if (decision.executionStatus !== propertyReviewerExecutionStatuses.notExecuted) errors.push("execution_status_must_remain_not_executed");
  if (!Object.values(propertyReviewerRoles).includes(decision.reviewerRole)) errors.push("reviewer_role_not_allowed");
  if (!decision.reviewerId) errors.push("reviewer_identity_required");
  if (!Object.values(propertyReviewerReasonCodes).includes(decision.reasonCode)) errors.push("reason_code_required");
  if (!decision.rationale || decision.rationale.trim().length < 8) errors.push("rationale_required");
  if (!Array.isArray(decision.evidenceRefs) || decision.evidenceRefs.length === 0) errors.push("evidence_refs_required");
  if (needsCanonicalPropertyId(decision.decisionType) && !decision.canonicalPropertyId) errors.push("canonical_property_id_required_for_decision_type");
  if (decision.canonicalPropertyId && reviewItem.canonicalPropertyId && decision.canonicalPropertyId !== reviewItem.canonicalPropertyId) {
    errors.push("canonical_property_id_mismatch");
  }
  if (["AI", "PROVIDER", "EXTERNAL_AGENT"].includes(decision.auditMetadata?.actorType) &&
    decision.decisionStatus === propertyReviewerDecisionStatuses.approvedAsDecision) {
    errors.push("ai_or_provider_cannot_approve_reviewer_decision");
  }
  if (decision.decisionStatus === propertyReviewerDecisionStatuses.approvedAsDecision) {
    warnings.push("approved_as_decision_only_no_execution");
  }
  return {
    ok: errors.length === 0,
    status: errors.length ? "REJECTED_AS_DECISION" : "VALID_DECISION_CONTRACT",
    allowedDecisionTypes: allowed,
    errors,
    warnings,
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

export function createPropertyReviewerDecisionAuditEvent(input = {}) {
  return {
    ...clone(propertyReviewerDecisionAuditContract),
    ...input,
    evidenceRefs: clone(input.evidenceRefs || []),
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0,
    mergeActions: 0,
    publishActions: 0,
    quarantineMutations: 0
  };
}

export function buildPropertyReviewerDecisionAuditTrail(decisions = []) {
  return decisions.flatMap((decision) => {
    const base = {
      decisionId: decision.decisionId,
      ingestionId: decision.ingestionId,
      sourceRecordId: decision.sourceRecordId,
      nextDecisionStatus: decision.decisionStatus,
      reviewerRole: decision.reviewerRole,
      reviewerId: decision.reviewerId,
      reasonCode: decision.reasonCode,
      evidenceRefs: decision.evidenceRefs,
      timestamp: decision.createdAt
    };
    const events = [
      createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_created`,
        eventType: propertyReviewerDecisionAuditEvents.created
      }),
      createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_validated`,
        eventType: propertyReviewerDecisionAuditEvents.validated
      })
    ];
    if (decision.decisionStatus === propertyReviewerDecisionStatuses.readyForReview) {
      events.push(createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_ready`,
        eventType: propertyReviewerDecisionAuditEvents.readyForReview
      }));
    }
    if (decision.decisionStatus === propertyReviewerDecisionStatuses.approvedAsDecision) {
      events.push(createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_approved`,
        eventType: propertyReviewerDecisionAuditEvents.approvedAsDecision
      }));
    }
    if (decision.decisionStatus === propertyReviewerDecisionStatuses.rejectedAsDecision) {
      events.push(createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_rejected`,
        eventType: propertyReviewerDecisionAuditEvents.rejectedAsDecision
      }));
    }
    if (decision.decisionStatus === propertyReviewerDecisionStatuses.superseded) {
      events.push(createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_superseded`,
        eventType: propertyReviewerDecisionAuditEvents.superseded
      }));
    }
    if (decision.decisionStatus === propertyReviewerDecisionStatuses.cancelled) {
      events.push(createPropertyReviewerDecisionAuditEvent({
        ...base,
        auditRecordId: `audit_${decision.decisionId}_cancelled`,
        eventType: propertyReviewerDecisionAuditEvents.cancelled
      }));
    }
    return events;
  });
}

export function createSupersedingPropertyReviewerDecision(previousDecision = {}, input = {}) {
  const supersededDecision = createPropertyReviewerDecision({
    ...previousDecision,
    decisionStatus: propertyReviewerDecisionStatuses.superseded
  });
  const currentDecision = createPropertyReviewerDecision({
    ...input,
    supersedesDecisionId: previousDecision.decisionId
  });
  return {
    previousDecision: supersededDecision,
    currentDecision,
    auditTrail: buildPropertyReviewerDecisionAuditTrail([supersededDecision, currentDecision]),
    appendOnly: true,
    executionStatus: propertyReviewerExecutionStatuses.notExecuted
  };
}

export function createSuggestedPropertyReviewerDecision(input = {}) {
  return createPropertyReviewerDecision({
    ...input,
    decisionStatus: propertyReviewerDecisionStatuses.draft,
    auditMetadata: {
      ...(input.auditMetadata || {}),
      actorType: "AI_SUGGESTION_NOT_APPROVAL"
    }
  });
}

export function blockPropertyReviewerDecisionExecution(decision = {}) {
  return {
    ok: false,
    status: "EXECUTION_LAYER_NOT_ACTIVE_PHASE_22J",
    decisionId: decision.decisionId || null,
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    message: "Phase 22J records review decisions only. No merge, write, publish, provider, payment, booking, transaction or quarantine mutation is executed.",
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0,
    mergeActions: 0,
    publishActions: 0,
    quarantineMutations: 0
  };
}
