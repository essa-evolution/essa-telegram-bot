import {
  propertyAuthorityActions,
  propertyAuthorityStatuses
} from "./propertyActorAuthorityContracts.js";
import { validateAddPropertyIntentEligibility } from "./propertyActorAuthority.js";
import { buildPropertyActorAuthorityFixtureSet } from "./propertyActorAuthorityFixtures.js";
import {
  buildMandateFixtures,
  buildPropertyMandateDraft
} from "./propertyMandate.js";
import {
  buildPropertyMandateReviewFixtures,
  createPropertyMandateReviewOutcome,
  propertyMandateReviewOutcomeTypes,
  propertyMandateReviewPackageStatuses,
  propertyMandateReviewReasonCodes
} from "./propertyMandateReview.js";

const now = "2026-08-22T00:00:00.000Z";

export const propertyAuthorityActivationActionTypes = {
  activateReviewedAuthorityGrantLocalProof: "ACTIVATE_REVIEWED_AUTHORITY_GRANT_LOCAL_PROOF"
};

export const blockedAuthorityActivationActions = [
  "ACTIVATE_PRODUCTION_AUTHORITY",
  "ACTIVATE_LEGAL_AUTHORITY",
  "SIGN_MANDATE",
  "NOTARIZE_MANDATE",
  "REGISTER_MANDATE",
  "PUBLISH_LISTING",
  "CREATE_PROPERTY",
  "TRANSFER_OWNERSHIP",
  "START_PAYMENT",
  "BOOK_PROPERTY",
  "START_TRANSACTION"
];

export const authorityActivationPreflightStatuses = {
  readyForApproval: "READY_FOR_APPROVAL",
  blockedReviewOutcome: "BLOCKED_REVIEW_OUTCOME",
  blockedVersionMismatch: "BLOCKED_VERSION_MISMATCH",
  blockedFingerprint: "BLOCKED_FINGERPRINT",
  blockedSignature: "BLOCKED_SIGNATURE",
  blockedJurisdiction: "BLOCKED_JURISDICTION",
  blockedLegalReview: "BLOCKED_LEGAL_REVIEW",
  blockedEvidence: "BLOCKED_EVIDENCE",
  blockedScope: "BLOCKED_SCOPE",
  blockedEscalation: "BLOCKED_ESCALATION",
  blockedDelegation: "BLOCKED_DELEGATION",
  blockedExpired: "BLOCKED_EXPIRED",
  blockedRevoked: "BLOCKED_REVOKED",
  blockedSuperseded: "BLOCKED_SUPERSEDED",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH",
  blockedGrantorAuthority: "BLOCKED_GRANTOR_AUTHORITY"
};

export const authorityActivationApprovalStatuses = {
  pending: "PENDING_EXPLICIT_LOCAL_HUMAN_APPROVAL",
  approved: "APPROVED_BY_LOCAL_HUMAN",
  blocked: "APPROVAL_BLOCKED"
};

export const authorityActivationExecutionStatuses = {
  draft: "DRAFT",
  approved: "APPROVED",
  committed: "COMMITTED",
  verified: "VERIFIED",
  alreadyActiveIdempotent: "ALREADY_ACTIVE_IDEMPOTENT",
  rolledBack: "ROLLED_BACK",
  blocked: "BLOCKED",
  failed: "FAILED"
};

export const signatureReadinessStates = {
  notRequiredLocalProof: "NOT_REQUIRED_LOCAL_PROOF",
  requiredNotSatisfied: "REQUIRED_NOT_SATISFIED",
  satisfiedLocalProof: "SATISFIED_LOCAL_PROOF",
  bothPartiesSatisfiedLocalProof: "BOTH_PARTIES_SATISFIED_LOCAL_PROOF",
  organizationSignatorySatisfiedLocalProof: "ORGANIZATION_SIGNATORY_SATISFIED_LOCAL_PROOF",
  notaryRequiredNotSatisfied: "NOTARY_REQUIRED_NOT_SATISFIED",
  unknown: "UNKNOWN",
  notActive: "NOT_ACTIVE"
};

export const jurisdictionReadinessStates = {
  localDemoReady: "LOCAL_DEMO_READY",
  reviewRequired: "REVIEW_REQUIRED",
  unknown: "UNKNOWN",
  blocked: "BLOCKED",
  notSupported: "NOT_SUPPORTED"
};

export const legalReviewReadinessStates = {
  noneRequiredLocalProof: "NONE_REQUIRED_LOCAL_PROOF",
  satisfiedLocalProof: "SATISFIED_LOCAL_PROOF",
  requiredNotSatisfied: "REQUIRED_NOT_SATISFIED",
  unknown: "UNKNOWN",
  notActive: "NOT_ACTIVE"
};

export const authorityActivationAuditEvents = {
  intentCreated: "AUTHORITY_ACTIVATION_INTENT_CREATED",
  preflightPassed: "AUTHORITY_ACTIVATION_PREFLIGHT_PASSED",
  approvalGranted: "AUTHORITY_ACTIVATION_APPROVAL_GRANTED",
  started: "AUTHORITY_ACTIVATION_STARTED",
  committed: "AUTHORITY_ACTIVATION_COMMITTED",
  verified: "AUTHORITY_ACTIVATION_VERIFIED",
  rollbackRequested: "AUTHORITY_ACTIVATION_ROLLBACK_REQUESTED",
  rolledBack: "AUTHORITY_ACTIVATION_ROLLED_BACK",
  failed: "AUTHORITY_ACTIVATION_FAILED"
};

export const authorityActivationSideEffectCounters = {
  localAuthorityActivationMutations: 0,
  unrelatedAuthorityMutations: 0,
  canonicalPropertyMutation: 0,
  listingMutation: 0,
  ownershipMutation: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value = {}) {
  let hash = 2166136261;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `activation_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function arraysEqual(left = [], right = []) {
  return stableStringify(left) === stableStringify(right);
}

function actionConflict(intent = {}) {
  const allowed = new Set(intent.allowedActions || []);
  return (intent.deniedActions || []).some((action) => allowed.has(action));
}

function allowedSignature(readiness) {
  return [
    signatureReadinessStates.notRequiredLocalProof,
    signatureReadinessStates.satisfiedLocalProof,
    signatureReadinessStates.bothPartiesSatisfiedLocalProof,
    signatureReadinessStates.organizationSignatorySatisfiedLocalProof
  ].includes(readiness);
}

function allowedLegal(readiness) {
  return [
    legalReviewReadinessStates.noneRequiredLocalProof,
    legalReviewReadinessStates.satisfiedLocalProof
  ].includes(readiness);
}

function audit(eventType, input = {}) {
  return {
    eventType,
    activationIntentId: input.activationIntentId || null,
    authorityGrantId: input.authorityGrantId || null,
    activationRecordId: input.activationRecordId || null,
    timestamp: input.timestamp || now,
    appendOnly: true,
    ...authorityActivationSideEffectCounters
  };
}

function approvalScopeFor(intent = {}) {
  return {
    activationIntentId: intent.activationIntentId,
    authorityGrantId: intent.authorityGrantId,
    granteeActorId: intent.granteeActorId,
    propertyId: intent.propertyId,
    projectId: intent.projectId,
    allowedActions: clone(intent.allowedActions),
    deniedActions: clone(intent.deniedActions),
    validFrom: intent.validFrom,
    validUntil: intent.validUntil,
    mandateDraftVersion: intent.mandateDraftVersion,
    mandateDraftFingerprint: intent.mandateDraftFingerprint,
    reviewOutcomeId: intent.mandateReviewOutcomeId
  };
}

function currentProofFingerprint(intent = {}) {
  return fingerprint({
    actionType: intent.actionType,
    authorityGrantId: intent.authorityGrantId,
    mandateDraftVersion: intent.mandateDraftVersion,
    mandateDraftFingerprint: intent.mandateDraftFingerprint,
    mandateReviewOutcomeId: intent.mandateReviewOutcomeId,
    granteeActorId: intent.granteeActorId,
    propertyId: intent.propertyId,
    projectId: intent.projectId,
    allowedActions: intent.allowedActions,
    deniedActions: intent.deniedActions,
    validFrom: intent.validFrom,
    validUntil: intent.validUntil
  });
}

export function createPropertyAuthorityActivationIntent(input = {}) {
  const proposed = input.proposedAuthorityGrant || {};
  const pkg = input.reviewPackage || {};
  const outcome = input.reviewOutcome || {};
  const request = input.mandateRequest || {};
  const intent = {
    modelType: "PropertyAuthorityActivationIntent",
    activationIntentId: input.activationIntentId || `authority_activation_${proposed.authorityGrantId || "local"}`,
    actionType: input.actionType || propertyAuthorityActivationActionTypes.activateReviewedAuthorityGrantLocalProof,
    authorityGrantId: proposed.authorityGrantId || input.authorityGrantId || null,
    mandateRequestId: request.mandateRequestId || pkg.mandateRequestId || null,
    mandateDraftId: pkg.mandateDraftId || outcome.mandateDraftId || input.mandateDraftId || null,
    mandateDraftVersion: pkg.draftVersion || outcome.draftVersion || input.mandateDraftVersion || null,
    mandateDraftFingerprint: pkg.draftFingerprint || outcome.draftFingerprint || input.mandateDraftFingerprint || null,
    mandateReviewPackageId: pkg.mandateReviewPackageId || outcome.mandateReviewPackageId || null,
    mandateReviewOutcomeId: outcome.outcomeId || null,
    grantorActorId: request.grantorActorId || pkg.grantorActorId || null,
    granteeActorId: request.granteeActorId || pkg.granteeActorId || proposed.actorId || null,
    propertyId: request.propertyId || pkg.propertyId || proposed.propertyId || null,
    propertyCandidateRef: request.propertyCandidateRef || pkg.propertyCandidateRef || proposed.propertyCandidateRef || null,
    projectId: request.projectId || pkg.projectId || proposed.scope?.projectScope || null,
    organizationId: request.granteeOrganizationId || pkg.granteeOrganizationId || proposed.organizationId || null,
    authorityType: proposed.authorityType || input.authorityType || null,
    allowedActions: clone(proposed.allowedActions || input.allowedActions || []),
    deniedActions: clone(proposed.deniedActions || input.deniedActions || []),
    authorityScope: clone(proposed.scope || input.authorityScope || {}),
    validFrom: proposed.validFrom || request.validFrom || null,
    validUntil: proposed.validUntil || request.validUntil || null,
    jurisdiction: proposed.jurisdiction || request.jurisdiction || pkg.jurisdictionContext || "UNKNOWN",
    signatureReadiness: input.signatureReadiness || signatureReadinessStates.requiredNotSatisfied,
    jurisdictionReadiness: input.jurisdictionReadiness || jurisdictionReadinessStates.unknown,
    legalReviewReadiness: input.legalReviewReadiness || legalReviewReadinessStates.requiredNotSatisfied,
    requestedBy: input.requestedBy || "local_property_admin_fixture",
    createdAt: input.createdAt || now,
    approvalStatus: authorityActivationApprovalStatuses.pending,
    executionStatus: authorityActivationExecutionStatuses.draft,
    source: {
      proposedAuthorityGrant: clone(proposed),
      reviewPackage: clone(pkg),
      reviewOutcome: clone(outcome),
      mandateRequest: clone(request)
    },
    rollbackPlan: {
      rollbackType: "RESTORE_PREVIOUS_LOCAL_AUTHORITY_STATE",
      destructive: false,
      preservesAudit: true
    },
    expectedPostConditions: {
      status: propertyAuthorityStatuses.activeLocalProof,
      localProofOnly: true,
      noProductionLegalAuthority: true,
      allowedActions: clone(proposed.allowedActions || []),
      deniedActions: clone(proposed.deniedActions || [])
    },
    ...authorityActivationSideEffectCounters
  };
  intent.activationProofFingerprint = currentProofFingerprint(intent);
  intent.idempotencyKey = input.idempotencyKey || intent.activationProofFingerprint;
  intent.auditMetadata = {
    audit: [audit(authorityActivationAuditEvents.intentCreated, intent)],
    approvalRequired: true,
    lisaCanApprove: false,
    navigatorCanApprove: false,
    providerCanApprove: false
  };
  return intent;
}

export function createLocalPropertyAuthorityActivationStore(initialAuthorities = []) {
  const authorities = new Map();
  const records = new Map();
  const idempotency = new Map();
  const auditTrail = [];
  initialAuthorities.filter(Boolean).forEach((authority) => {
    authorities.set(authority.authorityGrantId, clone(authority));
  });
  return {
    getAuthority(authorityGrantId) {
      return clone(authorities.get(authorityGrantId));
    },
    setAuthority(authority) {
      authorities.set(authority.authorityGrantId, clone(authority));
    },
    allAuthorities() {
      return Array.from(authorities.values()).map(clone);
    },
    hasIdempotency(key) {
      return idempotency.has(key);
    },
    getByIdempotency(key) {
      return clone(idempotency.get(key));
    },
    rememberIdempotency(key, record) {
      idempotency.set(key, clone(record));
    },
    addRecord(record) {
      records.set(record.activationRecordId, clone(record));
    },
    getRecord(recordId) {
      return clone(records.get(recordId));
    },
    records() {
      return Array.from(records.values()).map(clone);
    },
    appendAudit(event) {
      auditTrail.push(clone(event));
    },
    auditTrail() {
      return auditTrail.map(clone);
    }
  };
}

export function validatePropertyAuthorityActivationPreflight(intent = {}, store = null) {
  const pkg = intent.source?.reviewPackage || {};
  const outcome = intent.source?.reviewOutcome || {};
  const request = intent.source?.mandateRequest || {};
  const reasons = [];
  const block = (status, reason) => ({ ok: false, status, reasons: [reason, ...reasons].filter(Boolean), approvalRequired: false, ...authorityActivationSideEffectCounters });

  if (intent.actionType !== propertyAuthorityActivationActionTypes.activateReviewedAuthorityGrantLocalProof ||
    blockedAuthorityActivationActions.includes(intent.actionType)) {
    return block(authorityActivationPreflightStatuses.blockedStateMismatch, "Only ACTIVATE_REVIEWED_AUTHORITY_GRANT_LOCAL_PROOF is allowed.");
  }
  if (!intent.authorityGrantId || !pkg.mandateReviewPackageId || !outcome.outcomeId) {
    return block(authorityActivationPreflightStatuses.blockedStateMismatch, "Activation requires a proposed grant, review package, and review outcome.");
  }
  if (store?.hasIdempotency?.(intent.idempotencyKey)) {
    return block(authorityActivationPreflightStatuses.blockedIdempotency, "Identical activation proof was already committed locally.");
  }
  if (request.requestStatus === "EXPIRED" || pkg.lifecycleWarnings?.includes("EXPIRED")) {
    return block(authorityActivationPreflightStatuses.blockedExpired, "Mandate request is expired.");
  }
  if (request.requestStatus === "REVOKED" || pkg.lifecycleWarnings?.includes("BLOCKED_REVOKED")) {
    return block(authorityActivationPreflightStatuses.blockedRevoked, "Mandate request is revoked.");
  }
  if (request.requestStatus === "SUPERSEDED" || pkg.packageStatus === propertyMandateReviewPackageStatuses.superseded) {
    return block(authorityActivationPreflightStatuses.blockedSuperseded, "Mandate request is superseded.");
  }
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.blockedByJurisdiction ||
    pkg.jurisdictionContext === "UNKNOWN" ||
    intent.jurisdictionReadiness !== jurisdictionReadinessStates.localDemoReady) {
    return block(authorityActivationPreflightStatuses.blockedJurisdiction, "Only LOCAL_DEMO jurisdiction readiness may activate local proof.");
  }
  if (pkg.scopeWarnings?.some((item) => item.code === propertyMandateReviewReasonCodes.authorityEscalationAttempt)) {
    return block(authorityActivationPreflightStatuses.blockedEscalation, "Mandate attempts authority escalation.");
  }
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.waitingForEvidence || (pkg.missingEvidence || []).length) {
    return block(authorityActivationPreflightStatuses.blockedEvidence, "Evidence is still missing.");
  }
  if (pkg.packageStatus === propertyMandateReviewPackageStatuses.blockedByScope || pkg.scopeWarnings?.some((item) => item.code === propertyMandateReviewReasonCodes.actionScopeTooBroad)) {
    return block(authorityActivationPreflightStatuses.blockedScope, "Scope is not locally reviewable.");
  }
  if (pkg.delegationWarnings?.some((item) => item.code === propertyMandateReviewReasonCodes.invalidDelegation)) {
    return block(authorityActivationPreflightStatuses.blockedDelegation, "Delegation is not allowed.");
  }
  if (outcome.outcomeType === propertyMandateReviewOutcomeTypes.grantorAuthorityInsufficient) {
    return block(authorityActivationPreflightStatuses.blockedGrantorAuthority, "Grantor authority was insufficient.");
  }
  if (outcome.outcomeType !== propertyMandateReviewOutcomeTypes.readyForFutureSignature || (outcome.reasonCodes || []).length) {
    return block(authorityActivationPreflightStatuses.blockedReviewOutcome, "Review outcome is not clean READY_FOR_FUTURE_SIGNATURE.");
  }
  if (pkg.draftVersion !== outcome.draftVersion || pkg.mandateDraftId !== outcome.mandateDraftId) {
    return block(authorityActivationPreflightStatuses.blockedVersionMismatch, "Review package and outcome pin different draft versions.");
  }
  if (pkg.draftFingerprint !== outcome.draftFingerprint || pkg.draftFingerprint !== intent.mandateDraftFingerprint) {
    return block(authorityActivationPreflightStatuses.blockedFingerprint, "Draft fingerprint changed after review.");
  }
  if (!allowedSignature(intent.signatureReadiness)) {
    return block(authorityActivationPreflightStatuses.blockedSignature, "Signature readiness is not satisfied for local proof.");
  }
  if (!allowedLegal(intent.legalReviewReadiness)) {
    return block(authorityActivationPreflightStatuses.blockedLegalReview, "Legal review readiness is not satisfied for local proof.");
  }
  if (actionConflict(intent)) {
    return block(authorityActivationPreflightStatuses.blockedScope, "Allowed and denied actions conflict.");
  }
  return {
    ok: true,
    status: authorityActivationPreflightStatuses.readyForApproval,
    approvalRequired: true,
    reasons: ["Clean reviewed mandate can be activated only as local proof after exact human approval."],
    ...authorityActivationSideEffectCounters
  };
}

export function buildAuthorityActivationPreview(intent = {}) {
  return {
    modelType: "PropertyAuthorityActivationPreview",
    authorityGrantId: intent.authorityGrantId,
    beforeState: intent.source?.proposedAuthorityGrant?.status || propertyAuthorityStatuses.requested,
    afterState: propertyAuthorityStatuses.activeLocalProof,
    onlyMutation: "proposed AuthorityGrant.status -> ACTIVE_LOCAL_PROOF in LocalPropertyAuthorityActivationStore",
    willNotChange: [
      "ownership/legal title",
      "canonical property facts",
      "listing records",
      "payments/bank details",
      "external providers",
      "production database"
    ],
    allowedActions: clone(intent.allowedActions || []),
    deniedActions: clone(intent.deniedActions || []),
    localProofOnly: true,
    noProductionLegalAuthority: true,
    ...authorityActivationSideEffectCounters
  };
}

export function createAuthorityActivationApproval(intent = {}, input = {}) {
  const scope = input.scope || approvalScopeFor(intent);
  const exactScope = stableStringify(scope) === stableStringify(approvalScopeFor(intent));
  const human = String(input.decidedBy || "").startsWith("human:");
  const forbiddenActor = /lisa|navigator|provider|ai:/i.test(String(input.decidedBy || ""));
  const approved = human && !forbiddenActor && exactScope;
  return {
    modelType: "PropertyAuthorityActivationApproval",
    approvalId: input.approvalId || `approval_${intent.activationIntentId || "local"}`,
    activationIntentId: intent.activationIntentId,
    authorityGrantId: intent.authorityGrantId,
    approvalStatus: approved ? authorityActivationApprovalStatuses.approved : authorityActivationApprovalStatuses.blocked,
    decidedBy: input.decidedBy || null,
    decidedAt: input.decidedAt || now,
    exactScope,
    approvalToken: approved ? fingerprint({ scope, decidedBy: input.decidedBy, proof: intent.activationProofFingerprint }) : null,
    invalidatesOn: ["draftVersion", "draftFingerprint", "scope", "validity", "grantee", "property", "reviewOutcome"],
    scope: clone(scope),
    lisaCanApprove: false,
    navigatorCanApprove: false,
    providerCanApprove: false,
    ...authorityActivationSideEffectCounters
  };
}

export function createApprovalForIntent(intent = {}) {
  return createAuthorityActivationApproval(intent, {
    decidedBy: "human:local_property_admin_fixture",
    scope: approvalScopeFor(intent)
  });
}

export function prepareAuthorityActivationThroughGateway(intent = {}, approval = {}, preflight = null) {
  const checked = preflight || validatePropertyAuthorityActivationPreflight(intent);
  const allowed = checked.ok && approval.approvalStatus === authorityActivationApprovalStatuses.approved;
  return {
    modelType: "ExecutionGatewayAuthorityActivationPreflight",
    actionType: intent.actionType,
    allowed,
    status: allowed ? "GATEWAY_LOCAL_PROOF_READY" : "GATEWAY_BLOCKED",
    reason: allowed ? "Exact reviewed local proof activation may proceed." : checked.status || approval.approvalStatus,
    executionMode: "LOCAL_ONLY",
    providerCallsAllowed: false,
    externalCallsAllowed: false,
    productionWritesAllowed: false,
    paymentActionsAllowed: false,
    ...authorityActivationSideEffectCounters
  };
}

export function capturePropertyAuthorityActivationBeforeState(authority = {}) {
  return {
    authorityGrantId: authority.authorityGrantId,
    status: authority.status || propertyAuthorityStatuses.requested,
    allowedActions: clone(authority.allowedActions || []),
    deniedActions: clone(authority.deniedActions || []),
    scope: clone(authority.scope || {}),
    validFrom: authority.validFrom || null,
    validUntil: authority.validUntil || null,
    localProofOnly: authority.localProofOnly || false
  };
}

export function verifyPropertyAuthorityActivationPostConditions(input = {}) {
  const { intent = {}, beforeState = {}, afterAuthority = {}, allAuthorities = [] } = input;
  const unrelatedChanged = allAuthorities
    .filter((authority) => authority.authorityGrantId !== intent.authorityGrantId)
    .some((authority) => authority.status === propertyAuthorityStatuses.activeLocalProof);
  const ok = afterAuthority.status === propertyAuthorityStatuses.activeLocalProof &&
    afterAuthority.localProofOnly === true &&
    afterAuthority.noProductionLegalAuthority === true &&
    arraysEqual(afterAuthority.allowedActions, intent.allowedActions) &&
    arraysEqual(afterAuthority.deniedActions, intent.deniedActions) &&
    !actionConflict(afterAuthority) &&
    afterAuthority.validFrom === intent.validFrom &&
    afterAuthority.validUntil === intent.validUntil &&
    afterAuthority.mandateDraftFingerprint === intent.mandateDraftFingerprint &&
    afterAuthority.mandateReviewOutcomeId === intent.mandateReviewOutcomeId &&
    beforeState.authorityGrantId === intent.authorityGrantId &&
    !unrelatedChanged;
  return {
    ok,
    status: ok ? "POST_CONDITIONS_VERIFIED" : "POST_CONDITIONS_FAILED",
    unrelatedAuthorityMutations: unrelatedChanged ? 1 : 0,
    ...authorityActivationSideEffectCounters
  };
}

export function commitPropertyAuthorityActivationLocalProof(input = {}) {
  const { intent = {}, approval = {}, store = createLocalPropertyAuthorityActivationStore(), mutationOverride = {} } = input;
  const preflight = validatePropertyAuthorityActivationPreflight(intent, store);
  if (preflight.status === authorityActivationPreflightStatuses.blockedIdempotency) {
    return {
      ok: true,
      status: authorityActivationExecutionStatuses.alreadyActiveIdempotent,
      activationRecord: store.getByIdempotency(intent.idempotencyKey),
      afterAuthority: store.getAuthority(intent.authorityGrantId),
      ...authorityActivationSideEffectCounters
    };
  }
  const gateway = prepareAuthorityActivationThroughGateway(intent, approval, preflight);
  if (!gateway.allowed) {
    return { ok: false, status: authorityActivationExecutionStatuses.blocked, preflight, gateway, ...authorityActivationSideEffectCounters };
  }
  const current = store.getAuthority(intent.authorityGrantId) || intent.source?.proposedAuthorityGrant || {};
  const beforeState = capturePropertyAuthorityActivationBeforeState(current);
  const activationRecordId = `activation_record_${intent.authorityGrantId}`;
  const afterAuthority = {
    ...clone(current),
    ...mutationOverride,
    authorityGrantId: intent.authorityGrantId,
    actorId: intent.granteeActorId,
    organizationId: intent.organizationId,
    propertyId: intent.propertyId,
    propertyCandidateRef: intent.propertyCandidateRef,
    authorityType: intent.authorityType,
    allowedActions: clone(intent.allowedActions),
    deniedActions: clone(intent.deniedActions),
    scope: clone(intent.authorityScope),
    validFrom: intent.validFrom,
    validUntil: intent.validUntil,
    status: propertyAuthorityStatuses.activeLocalProof,
    localProofOnly: true,
    noProductionLegalAuthority: true,
    activatedAt: now,
    activationRecordId,
    mandateDraftFingerprint: intent.mandateDraftFingerprint,
    mandateReviewOutcomeId: intent.mandateReviewOutcomeId
  };
  const post = verifyPropertyAuthorityActivationPostConditions({
    intent,
    beforeState,
    afterAuthority,
    allAuthorities: [...store.allAuthorities().filter((authority) => authority.authorityGrantId !== intent.authorityGrantId), afterAuthority]
  });
  if (!post.ok) {
    return { ok: false, status: authorityActivationExecutionStatuses.failed, preflight, gateway, post, ...authorityActivationSideEffectCounters };
  }
  const activationRecord = {
    modelType: "PropertyAuthorityActivationRecord",
    activationRecordId,
    activationIntentId: intent.activationIntentId,
    authorityGrantId: intent.authorityGrantId,
    idempotencyKey: intent.idempotencyKey,
    beforeState,
    afterState: capturePropertyAuthorityActivationBeforeState(afterAuthority),
    approvalId: approval.approvalId,
    approvalToken: approval.approvalToken,
    committedAt: now,
    localProofOnly: true,
    rollbackAvailable: true,
    auditMetadata: {
      audit: [
        audit(authorityActivationAuditEvents.preflightPassed, intent),
        audit(authorityActivationAuditEvents.approvalGranted, intent),
        audit(authorityActivationAuditEvents.started, intent),
        audit(authorityActivationAuditEvents.committed, { ...intent, activationRecordId }),
        audit(authorityActivationAuditEvents.verified, { ...intent, activationRecordId })
      ]
    },
    ...authorityActivationSideEffectCounters,
    localAuthorityActivationMutations: 1
  };
  store.setAuthority(afterAuthority);
  store.addRecord(activationRecord);
  store.rememberIdempotency(intent.idempotencyKey, activationRecord);
  activationRecord.auditMetadata.audit.forEach((event) => store.appendAudit(event));
  return {
    ok: true,
    status: authorityActivationExecutionStatuses.verified,
    preflight,
    gateway,
    post,
    activationRecord,
    afterAuthority,
    ...authorityActivationSideEffectCounters,
    localAuthorityActivationMutations: 1
  };
}

export function rollbackPropertyAuthorityActivationLocalProof(input = {}) {
  const { activationRecord = {}, store = createLocalPropertyAuthorityActivationStore() } = input;
  if (!activationRecord.rollbackAvailable || !activationRecord.beforeState?.authorityGrantId) {
    return { ok: false, status: "ROLLBACK_NOT_AVAILABLE", ...authorityActivationSideEffectCounters };
  }
  const current = store.getAuthority(activationRecord.authorityGrantId) || {};
  const restored = {
    ...current,
    status: activationRecord.beforeState.status,
    localProofOnly: activationRecord.beforeState.localProofOnly,
    rollbackOfActivationRecordId: activationRecord.activationRecordId
  };
  store.setAuthority(restored);
  store.appendAudit(audit(authorityActivationAuditEvents.rollbackRequested, activationRecord));
  store.appendAudit(audit(authorityActivationAuditEvents.rolledBack, activationRecord));
  return {
    ok: true,
    status: authorityActivationExecutionStatuses.rolledBack,
    restoredAuthority: restored,
    auditTrail: store.auditTrail(),
    ...authorityActivationSideEffectCounters,
    localAuthorityActivationMutations: 1
  };
}

export function createPropertyAuthorityHistoryItem(record = {}) {
  return {
    modelType: "PropertyAuthorityActivationHistoryItem",
    activationRecordId: record.activationRecordId,
    activationIntentId: record.activationIntentId,
    authorityGrantId: record.authorityGrantId,
    status: "LOCAL_PROOF_RECORDED",
    committedAt: record.committedAt,
    localProofOnly: true,
    rollbackAvailable: record.rollbackAvailable === true,
    auditEvents: record.auditMetadata?.audit?.map((event) => event.eventType) || [],
    ...authorityActivationSideEffectCounters
  };
}

function cleanReadyOutcome(pkg, outcomeId) {
  return createPropertyMandateReviewOutcome(pkg, {
    outcomeId,
    outcomeType: propertyMandateReviewOutcomeTypes.readyForFutureSignature,
    reasonCodes: []
  });
}

function draftFor(request, fixtures) {
  return buildPropertyMandateDraft(request, { fixtures });
}

export function buildAuthorityActivationFixtures() {
  const review = buildPropertyMandateReviewFixtures();
  const mandate = buildMandateFixtures();
  const { fixtures, requests } = mandate;
  const baseReady = {
    signatureReadiness: signatureReadinessStates.satisfiedLocalProof,
    jurisdictionReadiness: jurisdictionReadinessStates.localDemoReady,
    legalReviewReadiness: legalReviewReadinessStates.noneRequiredLocalProof
  };
  const managerDraft = draftFor(requests.ownerManager, fixtures);
  const escalationDraft = draftFor(requests.escalation, fixtures);
  const developerDraft = draftFor(requests.developerRepresentative, fixtures);
  const developerZDraft = draftFor(requests.developerOutOfScope, fixtures);
  const tempDraft = draftFor(requests.tempCleaning, fixtures);
  const agentOutcome = cleanReadyOutcome(review.packages.ready, "mandate_outcome_activation_agent_ready");
  const managerOutcome = cleanReadyOutcome(review.packages.ownerManager, "mandate_outcome_activation_manager_ready");
  const developerOutcome = cleanReadyOutcome(review.packages.developer, "mandate_outcome_activation_developer_ready");
  const tempOutcome = cleanReadyOutcome(review.packages.tempCleaning, "mandate_outcome_activation_temp_ready");
  const agentIntent = createPropertyAuthorityActivationIntent({
    proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
    reviewPackage: review.packages.ready,
    reviewOutcome: agentOutcome,
    mandateRequest: review.v1Draft.request,
    activationIntentId: "authority_activation_agent",
    ...baseReady
  });
  return {
    review,
    intents: {
      agentIntent,
      unsignedAgent: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
        reviewPackage: review.packages.ready,
        reviewOutcome: agentOutcome,
        mandateRequest: review.v1Draft.request,
        activationIntentId: "authority_activation_unsigned_agent",
        ...baseReady,
        signatureReadiness: signatureReadinessStates.requiredNotSatisfied
      }),
      versionMismatch: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
        reviewPackage: review.packages.v2,
        reviewOutcome: agentOutcome,
        mandateRequest: review.v1Draft.request,
        activationIntentId: "authority_activation_version_mismatch",
        ...baseReady
      }),
      managerActivation: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: managerDraft.proposedAuthorityGrant,
        reviewPackage: review.packages.ownerManager,
        reviewOutcome: managerOutcome,
        mandateRequest: managerDraft.request,
        activationIntentId: "authority_activation_manager",
        ...baseReady
      }),
      managerSaleBlocked: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: escalationDraft.proposedAuthorityGrant,
        reviewPackage: review.packages.escalation,
        reviewOutcome: createPropertyMandateReviewOutcome(review.packages.escalation, {
          outcomeId: "mandate_outcome_activation_manager_sale_blocked",
          outcomeType: propertyMandateReviewOutcomeTypes.scopeReductionRequired
        }),
        mandateRequest: escalationDraft.request,
        activationIntentId: "authority_activation_manager_sale",
        ...baseReady
      }),
      developerActivation: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: developerDraft.proposedAuthorityGrant,
        reviewPackage: review.packages.developer,
        reviewOutcome: developerOutcome,
        mandateRequest: developerDraft.request,
        activationIntentId: "authority_activation_developer",
        ...baseReady
      }),
      developerZBlocked: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: developerZDraft.proposedAuthorityGrant,
        reviewPackage: review.packages.developerOutOfScope,
        reviewOutcome: createPropertyMandateReviewOutcome(review.packages.developerOutOfScope, {
          outcomeId: "mandate_outcome_activation_developer_z_blocked",
          outcomeType: propertyMandateReviewOutcomeTypes.scopeReductionRequired
        }),
        mandateRequest: developerZDraft.request,
        activationIntentId: "authority_activation_developer_z",
        ...baseReady
      }),
      tempActivation: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: tempDraft.proposedAuthorityGrant,
        reviewPackage: review.packages.tempCleaning,
        reviewOutcome: tempOutcome,
        mandateRequest: tempDraft.request,
        activationIntentId: "authority_activation_temp_cleaning",
        ...baseReady
      }),
      unknownJurisdiction: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
        reviewPackage: review.packages.jurisdictionUnknown,
        reviewOutcome: cleanReadyOutcome(review.packages.jurisdictionUnknown, "mandate_outcome_activation_unknown_jurisdiction"),
        mandateRequest: review.v1Draft.request,
        activationIntentId: "authority_activation_unknown_jurisdiction",
        ...baseReady,
        jurisdictionReadiness: jurisdictionReadinessStates.unknown
      }),
      legalBlocked: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
        reviewPackage: review.packages.ready,
        reviewOutcome: agentOutcome,
        mandateRequest: review.v1Draft.request,
        activationIntentId: "authority_activation_legal_blocked",
        ...baseReady,
        legalReviewReadiness: legalReviewReadinessStates.requiredNotSatisfied
      }),
      expired: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
        reviewPackage: review.packages.expired,
        reviewOutcome: cleanReadyOutcome(review.packages.expired, "mandate_outcome_activation_expired"),
        mandateRequest: { ...requests.expired, requestStatus: "EXPIRED" },
        activationIntentId: "authority_activation_expired",
        ...baseReady
      }),
      revoked: createPropertyAuthorityActivationIntent({
        proposedAuthorityGrant: review.v1Draft.proposedAuthorityGrant,
        reviewPackage: review.packages.revoked,
        reviewOutcome: cleanReadyOutcome(review.packages.revoked, "mandate_outcome_activation_revoked"),
        mandateRequest: { ...requests.revoked, requestStatus: "REVOKED" },
        activationIntentId: "authority_activation_revoked",
        ...baseReady
      })
    },
    sideEffectCounters: clone(authorityActivationSideEffectCounters)
  };
}

export function buildPropertyAuthorityActivationViewModel(input = {}) {
  const fixtures = buildAuthorityActivationFixtures();
  const key = input.caseKey || input.case || "agent";
  const byKey = {
    agent: fixtures.intents.agentIntent,
    unsigned: fixtures.intents.unsignedAgent,
    versionMismatch: fixtures.intents.versionMismatch,
    manager: fixtures.intents.managerActivation,
    escalation: fixtures.intents.managerSaleBlocked,
    developer: fixtures.intents.developerActivation,
    developerZ: fixtures.intents.developerZBlocked,
    tempCleaning: fixtures.intents.tempActivation,
    jurisdiction: fixtures.intents.unknownJurisdiction,
    legal: fixtures.intents.legalBlocked,
    expired: fixtures.intents.expired,
    revoked: fixtures.intents.revoked
  };
  const intent = byKey[key] || fixtures.intents.agentIntent;
  const store = createLocalPropertyAuthorityActivationStore([intent.source.proposedAuthorityGrant].filter(Boolean));
  const preflight = validatePropertyAuthorityActivationPreflight(intent, store);
  const approval = preflight.ok ? createApprovalForIntent(intent) : createAuthorityActivationApproval(intent, {});
  const gateway = prepareAuthorityActivationThroughGateway(intent, approval, preflight);
  const result = preflight.ok ? commitPropertyAuthorityActivationLocalProof({ intent, approval, store }) : null;
  const repeat = result?.ok ? commitPropertyAuthorityActivationLocalProof({ intent, approval, store }) : null;
  const rollback = result?.activationRecord ? rollbackPropertyAuthorityActivationLocalProof({ activationRecord: result.activationRecord, store }) : null;
  const historyItem = result?.activationRecord ? createPropertyAuthorityHistoryItem(result.activationRecord) : null;
  return {
    modelType: "PropertyAuthorityActivationViewModel",
    route: "#property-authority-activation",
    caseKey: key,
    banner: "LOCAL CONTROLLED AUTHORITY ACTIVATION PROOF. NO PRODUCTION LEGAL AUTHORITY. NO EXTERNAL SIGNATURE. NO PRODUCTION WRITE.",
    intent,
    preflight,
    preview: buildAuthorityActivationPreview(intent),
    approval,
    gateway,
    result,
    repeat,
    rollback,
    historyItem,
    addPropertyIntegration: {
      status: result?.ok ? "AUTHORITY_ACTIVE_LOCAL_PROOF" : preflight.status,
      nextStep: result?.ok ? "READY_FOR_NEXT_CONTROLLED_PROPERTY_STEP" : "BLOCKED",
      listingCreated: false,
      propertyPublished: false,
      productionWrite: false
    },
    lisaGuide: createLisaAuthorityActivationGuide("Is this production legal authority?", { preflight }),
    navigatorRouting: createNavigatorAuthorityActivationRouting("reviewed mandate to activation preflight"),
    publicSafeBoundary: {
      publicPassportLeakage: false,
      publicDiscoveryLeakage: false,
      approvalTokenExposed: false,
      evidenceRefsExposed: false,
      reviewerNotesExposed: false
    },
    ...authorityActivationSideEffectCounters,
    localAuthorityActivationMutations: result?.localAuthorityActivationMutations || 0
  };
}

export function buildActivatedAuthorityResolverProof(result = null, fixtures = buildPropertyActorAuthorityFixtureSet()) {
  if (!result?.afterAuthority) return { ok: false, status: "NO_ACTIVE_AUTHORITY" };
  const authority = result.afterAuthority;
  const relationship = {
    modelType: "PropertyRelationship",
    relationshipId: authority.relationshipId,
    actorId: authority.actorId,
    organizationId: authority.organizationId,
    propertyId: authority.propertyId,
    propertyCandidateRef: authority.propertyCandidateRef,
    relationshipType: "AGENCY_REPRESENTATIVE",
    relationshipStatus: "ACTIVE_LOCAL_PROOF"
  };
  const intent = {
    modelType: "AddPropertyIntent",
    addPropertyIntentId: "intent_activation_resolver_proof",
    actorId: authority.actorId,
    organizationId: authority.organizationId,
    relationshipClaimId: relationship.relationshipId,
    authorityGrantId: authority.authorityGrantId,
    propertyId: authority.propertyId,
    propertyCandidateRef: authority.propertyCandidateRef,
    intendedAction: propertyAuthorityActions.createSaleListing,
    evidenceRefs: authority.evidenceRefs || []
  };
  return validateAddPropertyIntentEligibility({
    intent,
    actors: fixtures.actors,
    organizations: fixtures.organizations,
    memberships: fixtures.memberships,
    capabilityGrants: fixtures.capabilityGrants,
    relationships: [...fixtures.relationships, relationship],
    authorityGrants: [...fixtures.authorityGrants, authority],
    authorityEvidence: fixtures.authorityEvidence,
    jurisdictionContexts: fixtures.jurisdictionContexts
  });
}

export function createLisaAuthorityActivationGuide(question = "", context = {}) {
  const text = String(question || "").toLowerCase();
  return {
    modelType: "LisaAuthorityActivationGuide",
    mayApprove: false,
    mayExecute: false,
    answer: text.includes("production") || text.includes("legal")
      ? "This is only local proof authority. It does not sign, notarize, register, publish, transfer title, or create production legal authority."
      : `Activation state is ${context.preflight?.status || "unknown"}. Lisa can explain blockers and next steps, but cannot approve or execute.`,
    ...authorityActivationSideEffectCounters
  };
}

export function createNavigatorAuthorityActivationRouting(input = "") {
  return {
    modelType: "NavigatorAuthorityActivationRouting",
    input,
    hash: "#property-authority-activation",
    routeOnly: true,
    navigatorCanApprove: false,
    navigatorCanExecute: false,
    ...authorityActivationSideEffectCounters
  };
}
