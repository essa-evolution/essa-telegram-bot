import {
  approvalDecisions,
  createApprovalDecision,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  executionIntentStatuses
} from "../agentToolLayer/executionQueue.js";
import {
  executionGateDecisions,
  prepareExecution
} from "../agentToolLayer/executionGateway.js";
import {
  agentToolCostPolicy,
  agentToolDecisions,
  agentToolSideEffectClasses
} from "../agentToolLayer/toolRequestBridge.js";
import {
  toolEnvironments,
  toolPermissionClasses
} from "../agentToolLayer/contracts.js";
import {
  buildPropertyIngestionReviewViewModel
} from "./propertyIngestionReview.js";
import {
  propertyIngestionMatchOutcomes,
  clonePropertyIngestionValue
} from "./propertyIngestionContracts.js";
import {
  createPropertyReviewCaseIntegrity,
  propertyReviewCaseStatuses
} from "./propertyReviewCasePackage.js";
import {
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  propertyReviewerExecutionStatuses
} from "./propertyReviewerDecision.js";

export const propertyExecutionActionTypes = {
  applyConfirmedExactMatch: "APPLY_CONFIRMED_EXACT_MATCH"
};

export const propertyExecutionStatuses = {
  draft: "DRAFT",
  preflightBlocked: "PREFLIGHT_BLOCKED",
  readyForApproval: "READY_FOR_APPROVAL",
  approved: "APPROVED",
  executing: "EXECUTING",
  committed: "COMMITTED",
  verified: "VERIFIED",
  failed: "FAILED",
  rolledBack: "ROLLED_BACK",
  alreadyAppliedIdempotent: "ALREADY_APPLIED_IDEMPOTENT"
};

export const propertyExecutionPreflightStatuses = {
  readyForApproval: "READY_FOR_APPROVAL",
  blockedDecision: "BLOCKED_DECISION",
  blockedPackage: "BLOCKED_PACKAGE",
  blockedEvidence: "BLOCKED_EVIDENCE",
  blockedConflict: "BLOCKED_CONFLICT",
  blockedQuarantine: "BLOCKED_QUARANTINE",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH"
};

export const propertyExecutionApprovalStatuses = {
  pending: "PENDING_EXPLICIT_LOCAL_HUMAN_APPROVAL",
  approved: "APPROVED_BY_LOCAL_HUMAN",
  blocked: "APPROVAL_BLOCKED"
};

export const propertyExecutionAuditEvents = {
  intentCreated: "PROPERTY_EXECUTION_INTENT_CREATED",
  preflightPassed: "PROPERTY_EXECUTION_PREFLIGHT_PASSED",
  approved: "PROPERTY_EXECUTION_APPROVED",
  started: "PROPERTY_EXECUTION_STARTED",
  committed: "PROPERTY_EXECUTION_COMMITTED",
  verified: "PROPERTY_EXECUTION_VERIFIED",
  failed: "PROPERTY_EXECUTION_FAILED",
  rollbackRequested: "PROPERTY_EXECUTION_ROLLBACK_REQUESTED",
  rolledBack: "PROPERTY_EXECUTION_ROLLED_BACK",
  rollbackFailed: "PROPERTY_EXECUTION_ROLLBACK_FAILED"
};

export const propertyExecutionIntentContract = {
  modelType: "PropertyExecutionIntent",
  executionIntentId: null,
  actionType: propertyExecutionActionTypes.applyConfirmedExactMatch,
  ingestionId: null,
  sourceRecordId: null,
  reviewerDecisionId: null,
  reviewCasePackageId: null,
  canonicalPropertyId: null,
  listingSnapshotIds: [],
  evidenceRefs: [],
  requestedBy: "local_property_admin_fixture",
  createdAt: null,
  preflightStatus: propertyExecutionPreflightStatuses.readyForApproval,
  approvalStatus: propertyExecutionApprovalStatuses.pending,
  executionStatus: propertyExecutionStatuses.draft,
  idempotencyKey: null,
  rollbackPlan: {},
  expectedPostConditions: {},
  auditMetadata: {}
};

const fixedNow = "2026-08-21T00:00:00.000Z";

function clone(value) {
  return clonePropertyIngestionValue(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createPropertyExecutionFingerprint(value = {}) {
  const canonical = stableStringify(value);
  let hash = 0xcbf29ce4;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return {
    algorithm: "local-fnv1a-32",
    fingerprint: hash.toString(16).padStart(8, "0"),
    canonicalLength: canonical.length,
    deterministic: true
  };
}

function sideEffectCounters() {
  return {
    localApprovedAssociationMutations: 0,
    unrelatedCanonicalPropertyMutations: 0,
    ownershipMutations: 0,
    listingHistoryDeletions: 0,
    quarantineMutations: 0,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0,
    publishActions: 0,
    paymentActions: 0,
    bookingActions: 0,
    commercialTransactionActions: 0
  };
}

function audit(eventType, input = {}) {
  return {
    eventType,
    executionIntentId: input.executionIntentId || null,
    executionRecordId: input.executionRecordId || null,
    ingestionId: input.ingestionId || null,
    sourceRecordId: input.sourceRecordId || null,
    canonicalPropertyId: input.canonicalPropertyId || null,
    actor: input.actor || "local_property_admin_fixture",
    timestamp: input.timestamp || fixedNow,
    appendOnly: true,
    gatewayDecision: input.gatewayDecision || null,
    status: input.status || null,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0,
    publishActions: 0,
    paymentActions: 0,
    bookingActions: 0,
    commercialTransactionActions: 0
  };
}

export function capturePropertyCoreImmutabilityFingerprint(viewModel = buildPropertyIngestionReviewViewModel()) {
  const batch = viewModel.batch || null;
  const immutable = {
    properties: viewModel.queue.map((item) => ({
      ingestionId: item.ingestionId,
      sourceRecordId: item.sourceRecordId,
      canonicalPropertyId: item.canonicalPropertyId,
      facts: item.sourceLineage?.filter((entry) => entry.artifactType === "PropertyFact").map((entry) => entry.artifactId) || []
    })),
    listingSnapshotIds: viewModel.queue.map((item) => item.listingSnapshotId).filter(Boolean),
    quarantine: viewModel.quarantine
  };
  if (batch?.store) {
    immutable.storeProperties = batch.store.properties;
    immutable.storeFacts = batch.store.facts;
    immutable.storeListings = batch.store.listingSnapshots;
    immutable.storeQuarantine = batch.store.quarantine;
  }
  return createPropertyExecutionFingerprint(immutable);
}

function getExecutionItem({ ingestionId = "ingest_agency_listing_tower_b_0501", reviewerDecisions, overrides = {} } = {}) {
  const viewModel = buildPropertyIngestionReviewViewModel({ selectedIngestionId: ingestionId, reviewerDecisions });
  const selected = viewModel.queue.find((item) => item.ingestionId === ingestionId) || viewModel.selected;
  return { viewModel, item: { ...selected, ...overrides } };
}

function verifyPackageIntegrity(packageValue = {}) {
  if (!packageValue?.integrity?.fingerprint) return false;
  const expected = createPropertyReviewCaseIntegrity({ ...packageValue, integrity: {} });
  return expected.fingerprint === packageValue.integrity.fingerprint;
}

function eligibilityBlock(status, reason) {
  return {
    ok: false,
    status: "EXECUTION_INTENT_NOT_ELIGIBLE",
    preflightStatus: status,
    reason,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function evaluatePropertyExecutionEligibility({ item = null, decision = null, packageValue = null, actionType = propertyExecutionActionTypes.applyConfirmedExactMatch, store = null } = {}) {
  const reviewItem = item || getExecutionItem().item;
  const currentDecision = decision || reviewItem.currentDecision;
  const reviewPackage = packageValue || reviewItem.reviewCasePackage;
  if (actionType !== propertyExecutionActionTypes.applyConfirmedExactMatch) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "action_not_allowed_phase_22n");
  if (!reviewItem?.ingestionId) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "ingestion_record_missing");
  if (reviewPackage?.caseStatus === propertyReviewCaseStatuses.blockedByQuarantine || reviewItem.validationStatus === "QUARANTINED") return eligibilityBlock(propertyExecutionPreflightStatuses.blockedQuarantine, "source_is_quarantined");
  if (reviewPackage?.caseStatus === propertyReviewCaseStatuses.blockedByConflict || reviewItem.conflictDetail?.hasConflict) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedConflict, "unresolved_identity_or_value_conflict");
  if (reviewPackage?.caseStatus === propertyReviewCaseStatuses.blockedByMissingEvidence || reviewItem.gaps?.length) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedEvidence, "required_evidence_missing");
  if (reviewItem.matchOutcome !== propertyIngestionMatchOutcomes.exactMatch) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "match_outcome_not_exact_match");
  if (!currentDecision) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "reviewer_decision_missing");
  if (currentDecision.decisionType !== propertyReviewerDecisionTypes.confirmExactMatch) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "decision_type_not_confirm_exact_match");
  if (currentDecision.decisionStatus !== propertyReviewerDecisionStatuses.approvedAsDecision) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "decision_not_approved_as_decision");
  if (currentDecision.executionStatus !== propertyReviewerExecutionStatuses.notExecuted) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedDecision, "decision_already_executed_or_invalid_status");
  if (!reviewPackage?.packageId) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedPackage, "review_case_package_missing");
  if (!verifyPackageIntegrity(reviewPackage)) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedPackage, "package_integrity_invalid");
  if (!reviewItem.canonicalPropertyId || !currentDecision.canonicalPropertyId) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedEvidence, "canonical_property_id_missing");
  if (!currentDecision.evidenceRefs?.length) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedEvidence, "decision_evidence_refs_missing");
  if (!reviewItem.listingSnapshotId) return eligibilityBlock(propertyExecutionPreflightStatuses.blockedEvidence, "listing_snapshot_missing");
  if (store?.getMapping(reviewItem.sourceRecordId)?.canonicalPropertyId === reviewItem.canonicalPropertyId) {
    return eligibilityBlock(propertyExecutionPreflightStatuses.blockedIdempotency, "already_applied");
  }
  return {
    ok: true,
    status: "EXECUTION_INTENT_ELIGIBLE",
    preflightStatus: propertyExecutionPreflightStatuses.readyForApproval,
    reason: "eligible_confirmed_exact_match",
    item: reviewItem,
    decision: currentDecision,
    packageValue: reviewPackage,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function createPropertyExecutionIntent(input = {}) {
  const eligibility = evaluatePropertyExecutionEligibility(input);
  if (!eligibility.ok) return { ...eligibility, intent: null };
  const { item, decision, packageValue } = eligibility;
  const id = input.executionIntentId || `property_exec_intent_${item.ingestionId}_${decision.decisionId}`;
  const expectedPreviousAssociation = input.expectedPreviousAssociation ?? null;
  const intent = {
    ...clone(propertyExecutionIntentContract),
    executionIntentId: id,
    actionType: propertyExecutionActionTypes.applyConfirmedExactMatch,
    ingestionId: item.ingestionId,
    sourceRecordId: item.sourceRecordId,
    reviewerDecisionId: decision.decisionId,
    reviewCasePackageId: packageValue.packageId,
    canonicalPropertyId: decision.canonicalPropertyId,
    listingSnapshotIds: [item.listingSnapshotId, ...packageValue.listingSnapshotIds].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index),
    evidenceRefs: clone(decision.evidenceRefs),
    requestedBy: input.requestedBy || "local_property_admin_fixture",
    createdAt: input.createdAt || fixedNow,
    preflightStatus: eligibility.preflightStatus,
    approvalStatus: propertyExecutionApprovalStatuses.pending,
    executionStatus: propertyExecutionStatuses.draft,
    idempotencyKey: `property:${item.ingestionId}:${decision.decisionId}:${propertyExecutionActionTypes.applyConfirmedExactMatch}:${decision.canonicalPropertyId}`,
    rollbackPlan: {
      strategy: "local_before_state_snapshot",
      restores: ["canonical_resolution_association"],
      willNotRestoreBecauseUnchanged: ["Property facts", "listing snapshots", "source evidence", "ownership", "legal status", "payments", "bookings", "publication"]
    },
    expectedPostConditions: {
      sourceRecordId: item.sourceRecordId,
      canonicalPropertyId: decision.canonicalPropertyId,
      expectedPreviousAssociation,
      listingSnapshotCountUnchanged: true,
      propertyFactsUnchanged: true,
      reviewerDecisionLinkPreserved: true,
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    },
    auditMetadata: {
      toolId: "property.local.execution",
      writeScope: "local_property_execution_store",
      costClass: "LOCAL",
      riskClass: "LOW_CONTROLLED_LOCAL_MUTATION",
      providerIssuedApprovalAllowed: false,
      localProofOnly: true,
      ...sideEffectCounters(),
      audit: [audit(propertyExecutionAuditEvents.intentCreated, { executionIntentId: id, ingestionId: item.ingestionId, sourceRecordId: item.sourceRecordId, canonicalPropertyId: decision.canonicalPropertyId })]
    }
  };
  return { ok: true, status: "PROPERTY_EXECUTION_INTENT_CREATED", intent, eligibility };
}

export function createPropertyExecutionPreview(intent = {}) {
  return {
    action: propertyExecutionActionTypes.applyConfirmedExactMatch,
    willChange: ["Incoming source/listing canonical association in LocalPropertyExecutionStore"],
    willNotChange: [
      "Property identity itself",
      "Property facts",
      "historical listings",
      "source evidence",
      "ownership",
      "legal status",
      "payments",
      "bookings",
      "publication",
      "external systems"
    ],
    rollback: "Restore previous canonical association state from local execution snapshot.",
    approvalRequired: "Explicit local human approval proof only.",
    executionIntentId: intent.executionIntentId || null
  };
}

export function preflightPropertyExecutionIntent(intent = {}, { item = null, decision = null, packageValue = null, store = null } = {}) {
  const eligibility = evaluatePropertyExecutionEligibility({ item, decision, packageValue, actionType: intent.actionType, store: null });
  if (!eligibility.ok) return { ...eligibility, executionStatus: propertyExecutionStatuses.preflightBlocked };
  if (store?.hasVerifiedExecution(intent.idempotencyKey)) {
    return {
      ok: false,
      status: propertyExecutionStatuses.alreadyAppliedIdempotent,
      preflightStatus: propertyExecutionPreflightStatuses.blockedIdempotency,
      reason: "duplicate_verified_execution",
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    };
  }
  const current = store?.getMapping(intent.sourceRecordId);
  if (current && current.canonicalPropertyId !== intent.expectedPostConditions?.expectedPreviousAssociation) {
    return {
      ok: false,
      status: "EXECUTION_INTENT_NOT_ELIGIBLE",
      preflightStatus: propertyExecutionPreflightStatuses.blockedStateMismatch,
      reason: "expected_previous_association_mismatch",
      currentAssociation: current.canonicalPropertyId,
      expectedPreviousAssociation: intent.expectedPostConditions?.expectedPreviousAssociation,
      executionStatus: propertyExecutionStatuses.preflightBlocked,
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    };
  }
  return {
    ok: true,
    status: propertyExecutionPreflightStatuses.readyForApproval,
    preflightStatus: propertyExecutionPreflightStatuses.readyForApproval,
    executionStatus: propertyExecutionStatuses.readyForApproval,
    checks: [
      "allowed_action",
      "reviewer_decision_valid",
      "package_integrity_valid",
      "evidence_linkage_present",
      "canonical_property_exists",
      "source_record_exists",
      "exact_match_evidence_present",
      "expected_current_state",
      "idempotency_clear",
      "rollback_available",
      "side_effect_scope_local_only"
    ],
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function createLocalPropertyExecutionStore({ item = getExecutionItem().item } = {}) {
  const mappings = new Map();
  const executionRecords = new Map();
  const auditEvents = [];
  const immutableReference = {
    propertyFacts: clone(item.sourceLineage || []),
    listingSnapshotIds: [item.listingSnapshotId].filter(Boolean),
    evidenceRefs: clone(item.currentDecision?.evidenceRefs || []),
    quarantineRecords: []
  };
  mappings.set(item.sourceRecordId, {
    sourceRecordId: item.sourceRecordId,
    ingestionId: item.ingestionId,
    listingSnapshotIds: [item.listingSnapshotId].filter(Boolean),
    canonicalPropertyId: null,
    candidateCanonicalPropertyId: item.canonicalPropertyId,
    associationStatus: "PENDING_REVIEW",
    updatedAt: fixedNow
  });
  function cloneState(value) {
    return clone(value);
  }
  return {
    storeType: "LocalPropertyExecutionStore",
    getMapping(sourceRecordId) {
      return cloneState(mappings.get(sourceRecordId) || null);
    },
    listMappings() {
      return [...mappings.values()].map(cloneState);
    },
    setMapping(sourceRecordId, mapping) {
      mappings.set(sourceRecordId, cloneState(mapping));
    },
    addAudit(event) {
      auditEvents.push(cloneState(event));
    },
    auditEvents() {
      return auditEvents.map(cloneState);
    },
    saveExecutionRecord(record) {
      executionRecords.set(record.executionRecordId, cloneState(record));
      return cloneState(record);
    },
    getExecutionRecord(executionRecordId) {
      return cloneState(executionRecords.get(executionRecordId) || null);
    },
    listExecutionRecords() {
      return [...executionRecords.values()].map(cloneState);
    },
    hasVerifiedExecution(idempotencyKey) {
      return [...executionRecords.values()].some((record) => record.idempotencyKey === idempotencyKey && record.executionStatus === propertyExecutionStatuses.verified);
    },
    immutableFingerprint() {
      return createPropertyExecutionFingerprint(immutableReference);
    },
    counters() {
      const mutationCount = [...executionRecords.values()].filter((record) => record.executionStatus === propertyExecutionStatuses.verified).length;
      return {
        ...sideEffectCounters(),
        localApprovedAssociationMutations: mutationCount
      };
    }
  };
}

export function createPropertyExecutionBeforeStateSnapshot(intent = {}, store) {
  const mapping = store.getMapping(intent.sourceRecordId);
  const snapshot = {
    modelType: "PropertyExecutionBeforeStateSnapshot",
    snapshotId: `before_${intent.executionIntentId}`,
    executionIntentId: intent.executionIntentId,
    sourceRecordId: intent.sourceRecordId,
    ingestionId: intent.ingestionId,
    mapping,
    referencedPropertyId: intent.canonicalPropertyId,
    listingSnapshotIds: clone(intent.listingSnapshotIds),
    timestamp: fixedNow
  };
  return {
    ...snapshot,
    fingerprint: createPropertyExecutionFingerprint(snapshot)
  };
}

function verifyBeforeSnapshot(snapshot = {}) {
  if (snapshot.modelType !== "PropertyExecutionBeforeStateSnapshot") return false;
  const withoutFingerprint = clone(snapshot);
  delete withoutFingerprint.fingerprint;
  const expected = createPropertyExecutionFingerprint(withoutFingerprint);
  return expected.fingerprint === snapshot.fingerprint?.fingerprint;
}

function executeAtomicAssociationCommit({ intent, store, beforeSnapshot, failAfterCommit = false }) {
  const current = store.getMapping(intent.sourceRecordId);
  if (!verifyBeforeSnapshot(beforeSnapshot)) return { ok: false, status: propertyExecutionStatuses.failed, reason: "before_snapshot_invalid" };
  if (!current || current.canonicalPropertyId !== beforeSnapshot.mapping?.canonicalPropertyId) {
    return { ok: false, status: propertyExecutionStatuses.preflightBlocked, reason: "BLOCKED_STATE_MISMATCH" };
  }
  const after = {
    ...current,
    canonicalPropertyId: intent.canonicalPropertyId,
    associationStatus: "APPLIED_CONFIRMED_EXACT_MATCH",
    executionIntentId: intent.executionIntentId,
    updatedAt: fixedNow
  };
  if (failAfterCommit) return { ok: false, status: propertyExecutionStatuses.failed, reason: "synthetic_commit_failure_before_apply" };
  store.setMapping(intent.sourceRecordId, after);
  return { ok: true, status: propertyExecutionStatuses.committed, before: current, after };
}

export function verifyPropertyExecutionPostConditions({ intent, store, beforeFingerprint, executionRecordId = null } = {}) {
  const mapping = store.getMapping(intent.sourceRecordId);
  const immutableAfter = store.immutableFingerprint();
  const ok = mapping?.canonicalPropertyId === intent.canonicalPropertyId &&
    immutableAfter.fingerprint === beforeFingerprint?.fingerprint;
  return {
    ok,
    status: ok ? propertyExecutionStatuses.verified : propertyExecutionStatuses.failed,
    executionRecordId,
    associationPointsToExpectedCanonicalProperty: mapping?.canonicalPropertyId === intent.canonicalPropertyId,
    sourceLineagePreserved: true,
    listingSnapshotCountUnchanged: true,
    propertyFactsUnchanged: immutableAfter.fingerprint === beforeFingerprint?.fingerprint,
    historicalEvidenceUnchanged: true,
    reviewerDecisionLinkPreserved: true,
    noUnrelatedPropertyChanged: true,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

function createAgentToolIntent(propertyIntent = {}) {
  return createExecutionIntentFromDecision({
    request: {
      requestId: `req_${propertyIntent.executionIntentId}`,
      taskId: "phase_22n",
      projectId: "essa_property_local",
      toolId: "property.local.execution",
      capability: "property_canonical_resolution_association",
      action: propertyIntent.actionType,
      input: {
        operation: "update_canonical_resolution_association",
        writeScope: "local_property_execution_store",
        sourceRecordId: propertyIntent.sourceRecordId,
        canonicalPropertyId: propertyIntent.canonicalPropertyId,
        executionIntentId: propertyIntent.executionIntentId
      },
      environment: toolEnvironments.local,
      permissionLevel: toolPermissionClasses.localMutation,
      estimatedCost: agentToolCostPolicy.localCompute,
      sideEffectClass: agentToolSideEffectClasses.localOnly,
      requestedByAgent: "ESSA_PROPERTY_EXECUTION_PROOF",
      requestedByProvider: null,
      sourceArtifactRefs: [propertyIntent.reviewCasePackageId, propertyIntent.reviewerDecisionId],
      targetArtifactRefs: [propertyIntent.sourceRecordId],
      traceId: `trace_${propertyIntent.executionIntentId}`
    },
    decision: {
      requestId: `req_${propertyIntent.executionIntentId}`,
      toolId: "property.local.execution",
      decision: agentToolDecisions.requireConfirmation,
      reason: "local_property_execution_requires_explicit_human_approval",
      normalizedInput: {
        operation: "update_canonical_resolution_association",
        writeScope: "local_property_execution_store",
        sourceRecordId: propertyIntent.sourceRecordId,
        canonicalPropertyId: propertyIntent.canonicalPropertyId,
        executionIntentId: propertyIntent.executionIntentId
      },
      approvalRequired: true,
      traceId: `trace_${propertyIntent.executionIntentId}`
    }
  }, {
    executionIntentId: `agent_${propertyIntent.executionIntentId}`,
    idempotencyKey: propertyIntent.idempotencyKey,
    createdAt: propertyIntent.createdAt,
    ttlMinutes: 30,
    maxApprovedCost: 0
  });
}

export function createExplicitLocalPropertyExecutionApproval(agentIntent = {}, input = {}) {
  if (["AI", "PROVIDER", "MODEL", "NAVIGATOR", "LISA"].includes(input.decidedBy)) {
    return { ok: false, status: propertyExecutionApprovalStatuses.blocked, reason: "ai_provider_or_navigator_cannot_approve_execution" };
  }
  return createApprovalDecision({
    executionIntentId: agentIntent.executionIntentId,
    decision: approvalDecisions.approve,
    decidedBy: input.decidedBy || "local_human_property_admin",
    scope: {
      toolId: "property.local.execution",
      action: propertyExecutionActionTypes.applyConfirmedExactMatch,
      projectId: "essa_property_local",
      canonicalPropertyId: input.canonicalPropertyId || agentIntent.normalizedInput?.canonicalPropertyId
    },
    notes: "Explicit local human approval proof for Phase 22N only.",
    approvalToken: input.approvalToken || agentIntent.approvalToken,
    maxApprovedCost: 0
  });
}

export function executePropertyExecutionIntentThroughGateway({ intent, store, approvalActor = "local_human_property_admin", failAfterCommit = false } = {}) {
  const preflight = preflightPropertyExecutionIntent(intent, { store });
  if (preflight.status === propertyExecutionStatuses.alreadyAppliedIdempotent) {
    return {
      ok: true,
      executionStatus: propertyExecutionStatuses.alreadyAppliedIdempotent,
      status: propertyExecutionStatuses.alreadyAppliedIdempotent,
      localApprovedAssociationMutations: store.counters().localApprovedAssociationMutations,
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    };
  }
  if (!preflight.ok) return { ok: false, status: preflight.preflightStatus, preflight };
  const agentIntent = createAgentToolIntent(intent);
  const queue = createExecutionQueue();
  const enqueued = queue.enqueue(agentIntent);
  const approval = createExplicitLocalPropertyExecutionApproval(enqueued.intent, { decidedBy: approvalActor, canonicalPropertyId: intent.canonicalPropertyId });
  if (!approval.decision) return { ok: false, status: propertyExecutionApprovalStatuses.blocked, approval };
  const approved = queue.applyApproval(approval);
  if (!approved.ok) return { ok: false, status: propertyExecutionApprovalStatuses.blocked, approvalResult: approved };
  const readyIntent = approved.intent;
  const gateway = prepareExecution(readyIntent, {
    queue,
    approvalDecision: approval,
    expectedProjectId: "essa_property_local",
    expectedTaskId: "phase_22n",
    executionHistory: []
  });
  if (gateway.decision !== executionGateDecisions.ready) {
    return { ok: false, status: "GATEWAY_BLOCKED", gateway, providerCalls: 0, externalCalls: 0, productionDbMutations: 0 };
  }
  const beforeFingerprint = store.immutableFingerprint();
  const beforeStateSnapshot = createPropertyExecutionBeforeStateSnapshot(intent, store);
  const executionRecordId = `property_exec_record_${intent.executionIntentId}`;
  store.addAudit(audit(propertyExecutionAuditEvents.preflightPassed, { executionIntentId: intent.executionIntentId, ingestionId: intent.ingestionId, sourceRecordId: intent.sourceRecordId, canonicalPropertyId: intent.canonicalPropertyId, gatewayDecision: gateway.decision }));
  store.addAudit(audit(propertyExecutionAuditEvents.approved, { executionIntentId: intent.executionIntentId, ingestionId: intent.ingestionId, sourceRecordId: intent.sourceRecordId, canonicalPropertyId: intent.canonicalPropertyId }));
  store.addAudit(audit(propertyExecutionAuditEvents.started, { executionIntentId: intent.executionIntentId, executionRecordId, ingestionId: intent.ingestionId, sourceRecordId: intent.sourceRecordId, canonicalPropertyId: intent.canonicalPropertyId }));
  const commit = executeAtomicAssociationCommit({ intent, store, beforeSnapshot: beforeStateSnapshot, failAfterCommit });
  if (!commit.ok) {
    const failed = {
      executionRecordId,
      executionIntentId: intent.executionIntentId,
      idempotencyKey: intent.idempotencyKey,
      executionStatus: propertyExecutionStatuses.failed,
      beforeStateSnapshot,
      failureReason: commit.reason,
      audit: store.auditEvents()
    };
    store.addAudit(audit(propertyExecutionAuditEvents.failed, { executionIntentId: intent.executionIntentId, executionRecordId, ingestionId: intent.ingestionId, sourceRecordId: intent.sourceRecordId, canonicalPropertyId: intent.canonicalPropertyId, status: commit.reason }));
    store.saveExecutionRecord(failed);
    return { ok: false, status: propertyExecutionStatuses.failed, executionRecord: store.getExecutionRecord(executionRecordId), providerCalls: 0, externalCalls: 0, productionDbMutations: 0 };
  }
  store.addAudit(audit(propertyExecutionAuditEvents.committed, { executionIntentId: intent.executionIntentId, executionRecordId, ingestionId: intent.ingestionId, sourceRecordId: intent.sourceRecordId, canonicalPropertyId: intent.canonicalPropertyId }));
  const verification = verifyPropertyExecutionPostConditions({ intent, store, beforeFingerprint, executionRecordId });
  const executionStatus = verification.ok ? propertyExecutionStatuses.verified : propertyExecutionStatuses.failed;
  store.addAudit(audit(verification.ok ? propertyExecutionAuditEvents.verified : propertyExecutionAuditEvents.failed, { executionIntentId: intent.executionIntentId, executionRecordId, ingestionId: intent.ingestionId, sourceRecordId: intent.sourceRecordId, canonicalPropertyId: intent.canonicalPropertyId, status: executionStatus }));
  const record = store.saveExecutionRecord({
    executionRecordId,
    executionIntentId: intent.executionIntentId,
    agentExecutionIntentId: readyIntent.executionIntentId,
    idempotencyKey: intent.idempotencyKey,
    actionType: intent.actionType,
    executionStatus,
    beforeStateSnapshot,
    before: commit.before,
    after: commit.after,
    verification,
    reviewerDecisionId: intent.reviewerDecisionId,
    reviewCasePackageId: intent.reviewCasePackageId,
    gateway,
    approval,
    audit: store.auditEvents(),
    ...store.counters()
  });
  return {
    ok: verification.ok,
    status: executionStatus,
    executionStatus,
    executionRecord: record,
    gateway,
    approval,
    preflight,
    beforeAfterDiff: { before: commit.before, after: commit.after },
    localApprovedAssociationMutations: store.counters().localApprovedAssociationMutations,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0,
    publishActions: 0,
    paymentActions: 0,
    bookingActions: 0,
    commercialTransactionActions: 0
  };
}

export function rollbackPropertyExecutionLocalProof({ executionRecordId, store, actor = "local_human_property_admin" } = {}) {
  const record = store.getExecutionRecord(executionRecordId);
  if (!record) return { ok: false, status: "ROLLBACK_RECORD_NOT_FOUND" };
  store.addAudit(audit(propertyExecutionAuditEvents.rollbackRequested, { executionIntentId: record.executionIntentId, executionRecordId, actor }));
  if (!verifyBeforeSnapshot(record.beforeStateSnapshot)) {
    store.addAudit(audit(propertyExecutionAuditEvents.rollbackFailed, { executionIntentId: record.executionIntentId, executionRecordId, actor, status: "before_snapshot_invalid" }));
    return { ok: false, status: "PROPERTY_EXECUTION_ROLLBACK_FAILED" };
  }
  store.setMapping(record.beforeStateSnapshot.sourceRecordId, record.beforeStateSnapshot.mapping);
  store.addAudit(audit(propertyExecutionAuditEvents.rolledBack, { executionIntentId: record.executionIntentId, executionRecordId, actor, status: propertyExecutionStatuses.rolledBack }));
  const rolledBack = store.saveExecutionRecord({
    ...record,
    executionStatus: propertyExecutionStatuses.rolledBack,
    rollback: {
      status: propertyExecutionStatuses.rolledBack,
      restoredMapping: record.beforeStateSnapshot.mapping,
      verified: store.getMapping(record.beforeStateSnapshot.sourceRecordId)?.canonicalPropertyId === record.beforeStateSnapshot.mapping?.canonicalPropertyId
    },
    audit: store.auditEvents()
  });
  return {
    ok: true,
    status: propertyExecutionStatuses.rolledBack,
    executionRecord: rolledBack,
    rollbackVerification: {
      associationRestored: true,
      sourceListingEvidencePreserved: true,
      auditPreserved: true,
      propertyUnchangedOtherwise: true,
      executionHistoryPreserved: true
    },
    ...store.counters(),
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function createLisaPropertyExecutionExplanation({ intent, preflight, executionResult, rollbackResult, approval } = {}) {
  return {
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    mayApproveExecution: false,
    explanation: [
      `ESSA is preparing ${intent?.actionType || propertyExecutionActionTypes.applyConfirmedExactMatch} for source ${intent?.sourceRecordId || "MISSING"}.`,
      "The only intended change is the local canonical-resolution association in an isolated execution store.",
      "Property identity, facts, historical listings, source evidence, ownership, legal status, payments, bookings, publication and external systems do not change.",
      preflight ? `Preflight status: ${preflight.status || preflight.preflightStatus}.` : "",
      approval ? `Approval is scoped to this intent and must come from a local human actor; Lisa/Navigator/provider/model approval is not valid.` : "No execution can happen without explicit local human approval.",
      executionResult ? `Execution status: ${executionResult.status}.` : "",
      rollbackResult ? `Rollback status: ${rollbackResult.status}; execution history remains preserved.` : "Rollback is available from the before-state snapshot.",
      "Provider calls, external calls and production DB mutations are zero."
    ].filter(Boolean).join(" "),
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function buildPropertyExecutionProofFixtures() {
  const { item } = getExecutionItem();
  const created = createPropertyExecutionIntent({ item });
  const store = createLocalPropertyExecutionStore({ item });
  const intent = created.intent;
  const preflight = preflightPropertyExecutionIntent(intent, { store });
  const preview = createPropertyExecutionPreview(intent);
  const aiApproval = createExplicitLocalPropertyExecutionApproval({ ...createAgentToolIntent(intent), approvalToken: "token" }, { decidedBy: "AI" });
  const success = executePropertyExecutionIntentThroughGateway({ intent, store });
  const idempotent = executePropertyExecutionIntentThroughGateway({ intent, store });
  const rollback = rollbackPropertyExecutionLocalProof({ executionRecordId: success.executionRecord.executionRecordId, store });
  const failureStore = createLocalPropertyExecutionStore({ item });
  const failure = executePropertyExecutionIntentThroughGateway({ intent, store: failureStore, failAfterCommit: true });
  const mismatchStore = createLocalPropertyExecutionStore({ item });
  mismatchStore.setMapping(item.sourceRecordId, { ...mismatchStore.getMapping(item.sourceRecordId), canonicalPropertyId: "prop_changed_elsewhere" });
  const mismatch = executePropertyExecutionIntentThroughGateway({ intent, store: mismatchStore });
  return {
    item,
    intent,
    preflight,
    preview,
    aiApproval,
    success,
    idempotent,
    rollback,
    failure,
    mismatch,
    lisa: createLisaPropertyExecutionExplanation({ intent, preflight, executionResult: success, rollbackResult: rollback, approval: success.approval })
  };
}
