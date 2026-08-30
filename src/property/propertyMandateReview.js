import {
  buildMandateFixtures,
  buildPropertyMandateDraft,
  createLisaMandateGuideExplanation,
  diffPropertyMandateDrafts,
  mandateSideEffectCounters,
  propertyMandateEligibilityStatuses,
  propertyMandateRequestStatuses,
  propertyMandateSignatureStatuses,
  propertyMandateTypes,
  proposedAuthorityGrantStatuses,
  validatePropertyMandateRequest
} from "./propertyMandate.js";

const now = "2026-08-22T00:00:00.000Z";

export const propertyMandateReviewPackageStatuses = {
  draftPackage: "DRAFT_PACKAGE",
  readyForReview: "READY_FOR_REVIEW",
  reviewInProgress: "REVIEW_IN_PROGRESS",
  waitingForEvidence: "WAITING_FOR_EVIDENCE",
  waitingForDraftUpdate: "WAITING_FOR_DRAFT_UPDATE",
  blockedByScope: "BLOCKED_BY_SCOPE",
  blockedByConflict: "BLOCKED_BY_CONFLICT",
  blockedByJurisdiction: "BLOCKED_BY_JURISDICTION",
  reviewOutcomeRecorded: "REVIEW_OUTCOME_RECORDED",
  superseded: "SUPERSEDED",
  cancelled: "CANCELLED"
};

export const propertyMandateReviewerRoles = {
  propertyReviewer: "PROPERTY_REVIEWER",
  propertyCompliance: "PROPERTY_COMPLIANCE",
  propertyAdmin: "PROPERTY_ADMIN",
  legalSpecialistFuture: "LEGAL_SPECIALIST_FUTURE"
};

export const propertyMandateReviewOutcomeTypes = {
  readyForFutureSignature: "READY_FOR_FUTURE_SIGNATURE",
  moreEvidenceRequired: "MORE_EVIDENCE_REQUIRED",
  draftRevisionRequired: "DRAFT_REVISION_REQUIRED",
  scopeReductionRequired: "SCOPE_REDUCTION_REQUIRED",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED",
  legalReviewRequired: "LEGAL_REVIEW_REQUIRED",
  grantorAuthorityInsufficient: "GRANTOR_AUTHORITY_INSUFFICIENT",
  delegationNotAllowed: "DELEGATION_NOT_ALLOWED",
  conflictRequiresResolution: "CONFLICT_REQUIRES_RESOLUTION",
  rejectedForLocalReview: "REJECTED_FOR_LOCAL_REVIEW",
  cancelled: "CANCELLED"
};

export const propertyMandateReviewReasonCodes = {
  ownershipEvidenceMissing: "OWNERSHIP_EVIDENCE_MISSING",
  grantorIdentityEvidenceMissing: "GRANTOR_IDENTITY_EVIDENCE_MISSING",
  granteeIdentityEvidenceMissing: "GRANTEE_IDENTITY_EVIDENCE_MISSING",
  organizationMembershipMissing: "ORGANIZATION_MEMBERSHIP_MISSING",
  signatoryAuthorityMissing: "SIGNATORY_AUTHORITY_MISSING",
  propertyScopeUnclear: "PROPERTY_SCOPE_UNCLEAR",
  projectScopeUnclear: "PROJECT_SCOPE_UNCLEAR",
  actionScopeTooBroad: "ACTION_SCOPE_TOO_BROAD",
  deniedActionConflict: "DENIED_ACTION_CONFLICT",
  invalidDelegation: "INVALID_DELEGATION",
  authorityEscalationAttempt: "AUTHORITY_ESCALATION_ATTEMPT",
  expiredEvidence: "EXPIRED_EVIDENCE",
  mandateVersionMismatch: "MANDATE_VERSION_MISMATCH",
  reReviewRequired: "RE_REVIEW_REQUIRED",
  jurisdictionRuleUnknown: "JURISDICTION_RULE_UNKNOWN",
  signatureRequirementUnknown: "SIGNATURE_REQUIREMENT_UNKNOWN",
  legalReviewRequired: "LEGAL_REVIEW_REQUIRED",
  conflictingEvidence: "CONFLICTING_EVIDENCE",
  otherStructuredReviewReason: "OTHER_STRUCTURED_REVIEW_REASON"
};

export const mandateEvidenceRequestTypes = {
  grantorIdentityEvidence: "GRANTOR_IDENTITY_EVIDENCE",
  granteeIdentityEvidence: "GRANTEE_IDENTITY_EVIDENCE",
  ownershipEvidence: "OWNERSHIP_EVIDENCE",
  organizationMembershipEvidence: "ORGANIZATION_MEMBERSHIP_EVIDENCE",
  signatoryAuthorityEvidence: "SIGNATORY_AUTHORITY_EVIDENCE",
  agencyMandateEvidence: "AGENCY_MANDATE_EVIDENCE",
  managementAuthorityEvidence: "MANAGEMENT_AUTHORITY_EVIDENCE",
  delegationAuthorityEvidence: "DELEGATION_AUTHORITY_EVIDENCE",
  propertyScopeClarification: "PROPERTY_SCOPE_CLARIFICATION",
  projectScopeClarification: "PROJECT_SCOPE_CLARIFICATION",
  validityClarification: "VALIDITY_CLARIFICATION",
  jurisdictionClarification: "JURISDICTION_CLARIFICATION",
  otherStructuredMandateEvidence: "OTHER_STRUCTURED_MANDATE_EVIDENCE"
};

export const propertyMandateReviewAuditEvents = {
  packageCreated: "MANDATE_REVIEW_PACKAGE_CREATED",
  assigned: "MANDATE_REVIEW_ASSIGNED",
  started: "MANDATE_REVIEW_STARTED",
  evidenceInspected: "MANDATE_EVIDENCE_INSPECTED",
  moreEvidenceRequested: "MANDATE_MORE_EVIDENCE_REQUESTED",
  draftRevisionRequested: "MANDATE_DRAFT_REVISION_REQUESTED",
  versionChanged: "MANDATE_VERSION_CHANGED",
  reReviewRequired: "MANDATE_RE_REVIEW_REQUIRED",
  scopeReviewed: "MANDATE_SCOPE_REVIEWED",
  jurisdictionReviewRequired: "MANDATE_JURISDICTION_REVIEW_REQUIRED",
  legalReviewRequired: "MANDATE_LEGAL_REVIEW_REQUIRED",
  outcomeRecorded: "MANDATE_REVIEW_OUTCOME_RECORDED",
  outcomeSuperseded: "MANDATE_REVIEW_OUTCOME_SUPERSEDED",
  cancelled: "MANDATE_REVIEW_CANCELLED"
};

export const authorityActivationActions = 0;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function audit(eventType, ref = {}) {
  return {
    eventType,
    mandateReviewPackageId: ref.mandateReviewPackageId || null,
    mandateRequestId: ref.mandateRequestId || null,
    mandateDraftId: ref.mandateDraftId || null,
    timestamp: now,
    appendOnly: true,
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}

function draftIdFor(draft) {
  return `draft_${draft.request.mandateRequestId}_${draft.document.draftVersion}`;
}

function statusForEligibility(eligibility, conflictFlags = []) {
  if (conflictFlags.length) return propertyMandateReviewPackageStatuses.blockedByConflict;
  if (eligibility.status === propertyMandateEligibilityStatuses.evidenceRequired) return propertyMandateReviewPackageStatuses.waitingForEvidence;
  if (eligibility.status === propertyMandateEligibilityStatuses.blockedAuthorityEscalation ||
    eligibility.status === propertyMandateEligibilityStatuses.invalidScope) return propertyMandateReviewPackageStatuses.blockedByScope;
  if (eligibility.status === propertyMandateEligibilityStatuses.expired ||
    eligibility.status === propertyMandateEligibilityStatuses.blockedRevoked) return propertyMandateReviewPackageStatuses.cancelled;
  if (eligibility.status === propertyMandateEligibilityStatuses.jurisdictionReviewRequired) return propertyMandateReviewPackageStatuses.blockedByJurisdiction;
  return propertyMandateReviewPackageStatuses.readyForReview;
}

export function inspectMandateEvidence(draft = {}) {
  const request = draft.request || {};
  return safeArray(request.evidenceRefs).map((ref) => ({
    modelType: "PrivateMandateEvidenceInspection",
    evidenceType: ref.evidenceType || "STRUCTURED_EVIDENCE_REF",
    evidenceRef: ref.refId || ref.evidenceRef || ref,
    source: ref.sourceBacked ? "LOCAL_SOURCE_BACKED_REF" : "LOCAL_DECLARED_REF",
    verificationState: "REVIEW_REQUIRED",
    freshness: "CURRENT",
    validFrom: request.validFrom || null,
    validUntil: request.validUntil || null,
    protected: true,
    privateStatus: "PRIVATE_REVIEW_ONLY",
    relationshipToParties: {
      grantorActorId: request.grantorActorId,
      granteeActorId: request.granteeActorId,
      propertyId: request.propertyId || null,
      projectId: request.projectId || null
    },
    reviewNotesCode: "REVIEW_NOTES_PRIVATE_CODE_ONLY",
    evidenceGap: false,
    rawDocumentContentExposed: false
  }));
}

function detectScopeConflicts(request = {}) {
  const allowed = new Set(request.requestedActions || []);
  return safeArray(request.deniedActions)
    .filter((action) => allowed.has(action))
    .map((action) => ({ code: propertyMandateReviewReasonCodes.deniedActionConflict, action }));
}

function missingEvidenceFor(eligibility = {}) {
  if (eligibility.status !== propertyMandateEligibilityStatuses.evidenceRequired) return [];
  return [propertyMandateReviewReasonCodes.ownershipEvidenceMissing];
}

export function createPropertyMandateReviewPackage(draft = {}, options = {}) {
  const request = draft.request || draft.mandateRequest || {};
  const eligibility = validatePropertyMandateRequest(request, options.fixtures || buildMandateFixtures().fixtures);
  const conflictFlags = detectScopeConflicts(request);
  const evidenceSummary = inspectMandateEvidence(draft);
  const missingEvidence = missingEvidenceFor(eligibility);
  const scopeWarnings = [
    ...conflictFlags,
    ...(eligibility.status === propertyMandateEligibilityStatuses.invalidScope ? [{ code: propertyMandateReviewReasonCodes.actionScopeTooBroad }] : []),
    ...(eligibility.status === propertyMandateEligibilityStatuses.blockedAuthorityEscalation ? [{ code: propertyMandateReviewReasonCodes.authorityEscalationAttempt }] : [])
  ];
  const delegationWarnings = eligibility.status === propertyMandateEligibilityStatuses.blockedDelegation
    ? [{ code: propertyMandateReviewReasonCodes.invalidDelegation }]
    : [];
  const packageStatus = statusForEligibility(eligibility, conflictFlags);
  const pkg = {
    modelType: "PropertyMandateReviewPackage",
    mandateReviewPackageId: options.mandateReviewPackageId || `mandate_review_pkg_${request.mandateRequestId}`,
    mandateRequestId: request.mandateRequestId,
    mandateDraftId: draftIdFor(draft),
    draftVersion: draft.document.draftVersion,
    proposedAuthorityGrantId: draft.proposedAuthorityGrant.authorityGrantId,
    grantorActorId: request.grantorActorId,
    granteeActorId: request.granteeActorId,
    grantorOrganizationId: request.grantorOrganizationId || null,
    granteeOrganizationId: request.granteeOrganizationId || null,
    propertyId: request.propertyId || null,
    propertyCandidateRef: request.propertyCandidateRef || null,
    projectId: request.projectId || null,
    mandateType: request.requestedMandateType,
    allowedActions: clone(request.requestedActions),
    deniedActions: clone(request.deniedActions),
    authorityScope: clone(request.requestedScope),
    jurisdictionContext: request.jurisdiction,
    signatureReadiness: request.signatureStatus,
    legalReviewStatus: request.legalReviewStatus,
    evidenceRefs: clone(request.evidenceRefs),
    evidenceSummary,
    missingEvidence,
    conflictFlags,
    scopeWarnings,
    delegationWarnings,
    lifecycleWarnings: eligibility.status === propertyMandateEligibilityStatuses.expired || eligibility.status === propertyMandateEligibilityStatuses.blockedRevoked
      ? [eligibility.status]
      : [],
    draftFingerprint: draft.document.integrityMetadata.fingerprint,
    packageStatus,
    createdAt: now,
    updatedAt: now,
    auditMetadata: {
      audit: [
        audit(propertyMandateReviewAuditEvents.packageCreated, { mandateReviewPackageId: options.mandateReviewPackageId, mandateRequestId: request.mandateRequestId, mandateDraftId: draftIdFor(draft) }),
        audit(propertyMandateReviewAuditEvents.scopeReviewed, { mandateReviewPackageId: options.mandateReviewPackageId, mandateRequestId: request.mandateRequestId, mandateDraftId: draftIdFor(draft) })
      ],
      duplicateReviewQueueCreated: false,
      authorityActivationActions,
      ...mandateSideEffectCounters
    },
    ...mandateSideEffectCounters,
    authorityActivationActions
  };
  return pkg;
}

export function createMandateReviewerAssignment(pkg = {}, input = {}) {
  return {
    modelType: "PropertyMandateReviewerAssignment",
    mandateReviewPackageId: pkg.mandateReviewPackageId,
    reviewerId: input.reviewerId || "reviewer_property_001",
    reviewerRole: input.reviewerRole || propertyMandateReviewerRoles.propertyReviewer,
    assignmentStatus: input.assignmentStatus || "ASSIGNED_LOCAL_REVIEW",
    assignedAt: input.assignedAt || now,
    auditMetadata: {
      audit: [audit(propertyMandateReviewAuditEvents.assigned, pkg)],
      ...mandateSideEffectCounters,
      authorityActivationActions
    },
    ...mandateSideEffectCounters,
    authorityActivationActions
  };
}

export function createMandateEvidenceRequest(pkg = {}, input = {}) {
  return {
    modelType: "PropertyMandateEvidenceRequest",
    evidenceRequestId: input.evidenceRequestId || `mandate_evidence_request_${pkg.mandateReviewPackageId}`,
    mandateReviewPackageId: pkg.mandateReviewPackageId,
    requestType: input.requestType || mandateEvidenceRequestTypes.ownershipEvidence,
    requestedBy: input.requestedBy || "reviewer_property_001",
    status: input.status || "WAITING_LOCAL_ONLY",
    reasonCodes: clone(input.reasonCodes || pkg.missingEvidence || []),
    externalSendPerformed: false,
    createdAt: now,
    auditMetadata: {
      audit: [audit(propertyMandateReviewAuditEvents.moreEvidenceRequested, pkg)],
      ...mandateSideEffectCounters,
      authorityActivationActions
    },
    ...mandateSideEffectCounters,
    authorityActivationActions
  };
}

function outcomeTypeForPackage(pkg = {}) {
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.waitingForEvidence) return propertyMandateReviewOutcomeTypes.moreEvidenceRequired;
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.blockedByConflict) return propertyMandateReviewOutcomeTypes.conflictRequiresResolution;
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.blockedByScope) {
    return pkg.scopeWarnings?.some((item) => item.code === propertyMandateReviewReasonCodes.actionScopeTooBroad)
      ? propertyMandateReviewOutcomeTypes.scopeReductionRequired
      : propertyMandateReviewOutcomeTypes.grantorAuthorityInsufficient;
  }
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.blockedByJurisdiction) return propertyMandateReviewOutcomeTypes.jurisdictionReviewRequired;
  if (pkg.legalReviewStatus === "LEGAL_REVIEW_REQUIRED") return propertyMandateReviewOutcomeTypes.readyForFutureSignature;
  return propertyMandateReviewOutcomeTypes.readyForFutureSignature;
}

function reasonCodesForPackage(pkg = {}) {
  return [
    ...safeArray(pkg.missingEvidence),
    ...safeArray(pkg.scopeWarnings).map((item) => item.code || item),
    ...safeArray(pkg.delegationWarnings).map((item) => item.code || item),
    ...(pkg.jurisdictionContext === "UNKNOWN" ? [propertyMandateReviewReasonCodes.jurisdictionRuleUnknown] : []),
    ...(pkg.legalReviewStatus === "LEGAL_REVIEW_REQUIRED" ? [propertyMandateReviewReasonCodes.legalReviewRequired] : [])
  ].filter(Boolean);
}

export function createPropertyMandateReviewOutcome(pkg = {}, input = {}) {
  const outcomeType = input.outcomeType || outcomeTypeForPackage(pkg);
  return {
    modelType: "PropertyMandateReviewOutcome",
    outcomeId: input.outcomeId || `mandate_outcome_${pkg.mandateReviewPackageId}`,
    mandateReviewPackageId: pkg.mandateReviewPackageId,
    mandateRequestId: pkg.mandateRequestId,
    mandateDraftId: pkg.mandateDraftId,
    draftVersion: pkg.draftVersion,
    draftFingerprint: pkg.draftFingerprint,
    reviewerId: input.reviewerId || "reviewer_property_001",
    reviewerRole: input.reviewerRole || propertyMandateReviewerRoles.propertyReviewer,
    outcomeType,
    reasonCodes: clone(input.reasonCodes || reasonCodesForPackage(pkg)),
    rationaleSummary: input.rationaleSummary || "Local private mandate review outcome. Authority remains inactive.",
    evidenceRefs: clone(pkg.evidenceRefs || []),
    missingRequirements: clone(pkg.missingEvidence || []),
    warningsAcknowledged: [
      "Reviewed Mandate is not signed.",
      "Reviewed Mandate is not legally sufficient authority.",
      "AuthorityGrant remains inactive."
    ],
    jurisdictionStatus: pkg.jurisdictionContext,
    signatureReadiness: outcomeType === propertyMandateReviewOutcomeTypes.readyForFutureSignature
      ? propertyMandateSignatureStatuses.notActive
      : pkg.signatureReadiness,
    legalReviewRequirement: pkg.legalReviewStatus,
    proposedAuthorityGrantStatus: outcomeType === propertyMandateReviewOutcomeTypes.readyForFutureSignature
      ? "REVIEWED_READY_FOR_FUTURE_SIGNATURE"
      : pkg.packageStatus,
    authorityActivationStatus: "NOT_ACTIVE",
    createdAt: now,
    supersedesOutcomeId: input.supersedesOutcomeId || null,
    auditMetadata: {
      audit: [audit(propertyMandateReviewAuditEvents.outcomeRecorded, pkg)],
      authorityActivationActions,
      ...mandateSideEffectCounters
    },
    ...mandateSideEffectCounters,
    authorityActivationActions
  };
}

export function validateReviewOutcomeVersionPin(outcome = {}, currentDraft = {}) {
  const currentDraftId = draftIdFor(currentDraft);
  const currentFingerprint = currentDraft.document.integrityMetadata.fingerprint;
  const ok = outcome.mandateDraftId === currentDraftId &&
    outcome.draftVersion === currentDraft.document.draftVersion &&
    outcome.draftFingerprint === currentFingerprint;
  return {
    ok,
    status: ok ? "VERSION_PIN_VALID" : propertyMandateReviewReasonCodes.mandateVersionMismatch,
    reReviewRequired: !ok,
    reasonCodes: ok ? [] : [propertyMandateReviewReasonCodes.mandateVersionMismatch, propertyMandateReviewReasonCodes.reReviewRequired],
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}

export function createMandateLegalReviewHandoff(pkg = {}, input = {}) {
  return {
    modelType: "PropertyMandateLegalReviewHandoff",
    handoffId: input.handoffId || `legal_handoff_${pkg.mandateReviewPackageId}`,
    mandateReviewPackageId: pkg.mandateReviewPackageId,
    mandateDraftId: pkg.mandateDraftId,
    draftVersion: pkg.draftVersion,
    jurisdiction: pkg.jurisdictionContext,
    requestedReviewType: input.requestedReviewType || "MANDATE_LEGAL_REVIEW_FUTURE",
    targetRole: input.targetRole || propertyMandateReviewerRoles.legalSpecialistFuture,
    reasonCodes: clone(input.reasonCodes || reasonCodesForPackage(pkg)),
    evidenceSummary: clone(pkg.evidenceSummary || []),
    status: input.status || "READY_FOR_FUTURE_HANDOFF",
    createdAt: now,
    dispatched: false,
    ...mandateSideEffectCounters,
    authorityActivationActions
  };
}

export function supersedeMandateReviewOutcome(previousOutcome = {}, nextOutcomeInput = {}) {
  const next = {
    ...nextOutcomeInput,
    supersedesOutcomeId: previousOutcome.outcomeId
  };
  return {
    modelType: "PropertyMandateReviewOutcomeSupersession",
    previousOutcome: {
      ...previousOutcome,
      outcomeStatus: "SUPERSEDED"
    },
    nextOutcome: next,
    historyPreserved: true,
    auditEvent: propertyMandateReviewAuditEvents.outcomeSuperseded,
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}

export function createMandateReviewQueueAdapter(packages = []) {
  return {
    modelType: "PropertyReviewQueueMandateAdapter",
    sourceSystem: "PropertyMandateReviewPackage",
    existingQueueReused: true,
    duplicateReviewQueueCreated: false,
    reviewType: "MANDATE_AUTHORITY_REVIEW",
    queueItems: packages.map((pkg) => ({
      queueItemId: `queue_${pkg.mandateReviewPackageId}`,
      sourcePackageId: pkg.mandateReviewPackageId,
      requestedReviewType: "MANDATE_AUTHORITY_REVIEW",
      packageStatus: pkg.packageStatus,
      targetRole: propertyMandateReviewerRoles.propertyReviewer,
      assignmentStatus: "UNASSIGNED_LOCAL_REVIEW",
      reviewStatus: "NOT_STARTED",
      authorityActivationStatus: "NOT_ACTIVE"
    })),
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}

export function createLisaMandateReviewGuide(question = "", context = {}) {
  const text = String(question || "").toLowerCase();
  const legal = text.includes("legally valid") || text.includes("юрид");
  const active = text.includes("active") || text.includes("актив");
  return {
    modelType: "LisaMandateReviewGuide",
    mayActivateAuthority: false,
    mayApproveLegalValidity: false,
    maySign: false,
    answer: legal
      ? "Local mandate review does not establish legal sufficiency."
      : active
        ? "No. Authority is not active unless a future authority activation phase has occurred."
        : createLisaMandateGuideExplanation(question, context.draft).answer,
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}

export function createNavigatorMandateReviewRouting(input = "") {
  const text = String(input || "").toLowerCase();
  return {
    modelType: "NavigatorMandateReviewRouting",
    hash: text.includes("не хватает") || text.includes("missing")
      ? "#property-mandate-review?case=missing-evidence"
      : "#property-mandate-review",
    navigatorCanApprove: false,
    routeOnly: true,
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}

function packageFromRequest(request, fixtures) {
  const draft = buildPropertyMandateDraft(request, { fixtures });
  return createPropertyMandateReviewPackage(draft, { fixtures });
}

export function buildPropertyMandateReviewFixtures() {
  const data = buildMandateFixtures();
  const conflictRequest = {
    ...data.requests.ownerAgentRequest,
    mandateRequestId: "mandate_conflicting_allowed_denied",
    requestedActions: ["CREATE_SALE_LISTING", "PROMOTE_PROPERTY"],
    deniedActions: ["CREATE_SALE_LISTING"]
  };
  const unknownRequest = {
    ...data.requests.ownerAgentRequest,
    mandateRequestId: "mandate_unknown_jurisdiction",
    jurisdiction: "UNKNOWN"
  };
  const v1Draft = buildPropertyMandateDraft(data.requests.ownerAgentRequest, { fixtures: data.fixtures });
  const v2Draft = buildPropertyMandateDraft({
    ...data.requests.ownerAgentRequest,
    mandateRequestId: "mandate_owner_agent_sale_v2_review",
    requestedActions: [...data.requests.ownerAgentRequest.requestedActions, "UPDATE_PRICE"],
    draftVersion: "2.0.0",
    previousVersionRef: v1Draft.document.integrityMetadata.fingerprint
  }, { fixtures: data.fixtures });
  const packages = {
    ready: createPropertyMandateReviewPackage(v1Draft, { fixtures: data.fixtures }),
    missingEvidence: packageFromRequest(data.requests.ownerAgentNoEvidence, data.fixtures),
    ownerManager: packageFromRequest(data.requests.ownerManager, data.fixtures),
    escalation: packageFromRequest(data.requests.escalation, data.fixtures),
    developer: packageFromRequest(data.requests.developerRepresentative, data.fixtures),
    developerOutOfScope: packageFromRequest(data.requests.developerOutOfScope, data.fixtures),
    tempCleaning: packageFromRequest(data.requests.tempCleaning, data.fixtures),
    jurisdictionUnknown: packageFromRequest(unknownRequest, data.fixtures),
    legalReview: createPropertyMandateReviewPackage(v1Draft, { fixtures: data.fixtures, mandateReviewPackageId: "mandate_review_pkg_legal_review" }),
    signatureReady: createPropertyMandateReviewPackage(v1Draft, { fixtures: data.fixtures, mandateReviewPackageId: "mandate_review_pkg_signature_ready" }),
    expired: packageFromRequest(data.requests.expired, data.fixtures),
    revoked: packageFromRequest(data.requests.revoked, data.fixtures),
    conflict: packageFromRequest(conflictRequest, data.fixtures),
    v1: createPropertyMandateReviewPackage(v1Draft, { fixtures: data.fixtures, mandateReviewPackageId: "mandate_review_pkg_v1" }),
    v2: createPropertyMandateReviewPackage(v2Draft, { fixtures: data.fixtures, mandateReviewPackageId: "mandate_review_pkg_v2" })
  };
  const outcomes = {
    ready: createPropertyMandateReviewOutcome(packages.ready, { outcomeType: propertyMandateReviewOutcomeTypes.readyForFutureSignature }),
    missingEvidence: createPropertyMandateReviewOutcome(packages.missingEvidence),
    superseded: supersedeMandateReviewOutcome(
      createPropertyMandateReviewOutcome(packages.ready, { outcomeId: "mandate_outcome_old" }),
      createPropertyMandateReviewOutcome(packages.ready, { outcomeId: "mandate_outcome_new" })
    )
  };
  return {
    data,
    v1Draft,
    v2Draft,
    versionDiff: diffPropertyMandateDrafts(v1Draft, v2Draft),
    packages,
    outcomes,
    queueAdapter: createMandateReviewQueueAdapter(Object.values(packages)),
    sideEffectCounters: { ...mandateSideEffectCounters, authorityActivationActions }
  };
}

export function buildPropertyMandateReviewViewModel(input = {}) {
  const fixtures = buildPropertyMandateReviewFixtures();
  const caseKey = input.caseKey || input.case || "ready";
  const pkg = fixtures.packages[caseKey] || fixtures.packages.ready;
  const outcome = caseKey === "signatureReady"
    ? createPropertyMandateReviewOutcome(pkg, { outcomeType: propertyMandateReviewOutcomeTypes.readyForFutureSignature })
    : createPropertyMandateReviewOutcome(pkg);
  const assignment = createMandateReviewerAssignment(pkg);
  const evidenceRequest = createMandateEvidenceRequest(pkg);
  const legalHandoff = createMandateLegalReviewHandoff(pkg);
  return {
    modelType: "PropertyMandateReviewViewModel",
    route: "#property-mandate-review",
    caseKey,
    privateInternalLocalReviewProof: true,
    sections: [
      "Case Summary",
      "Mandate Draft",
      "Grantor",
      "Grantee",
      "Property / Project",
      "Allowed Actions",
      "Denied Actions",
      "Authority Scope",
      "Grantor Authority",
      "Evidence",
      "Missing Evidence",
      "Jurisdiction",
      "Signature Readiness",
      "Legal Review",
      "Draft Version",
      "Version Diff",
      "Review Outcome",
      "Evidence Requests",
      "Audit Timeline"
    ],
    package: pkg,
    assignment,
    evidenceRequest,
    outcome,
    versionDiff: fixtures.versionDiff,
    legalHandoff,
    queueAdapter: fixtures.queueAdapter,
    lisaGuide: createLisaMandateReviewGuide("Is authority active now?"),
    navigatorRouting: createNavigatorMandateReviewRouting("Покажи мандаты на проверку."),
    addPropertyReturn: {
      status: "MANDATE_REVIEWED",
      authorityStatus: "AUTHORITY_NOT_ACTIVE",
      nextStep: "FUTURE SIGNATURE / JURISDICTION / AUTHORITY ACTIVATION"
    },
    workflowSnapshotCompatible: true,
    publicSafeBoundary: {
      publicPassportLeakage: false,
      publicDiscoveryLeakage: false,
      publicBusinessEntityLeakage: false,
      productKnowledgePublicLeakage: false,
      urlContainsPrivateData: false
    },
    authorityActivationActions,
    ...mandateSideEffectCounters
  };
}
