import {
  buildPropertyIngestionReviewViewModel
} from "./propertyIngestionReview.js";
import {
  createPropertyExecutionFingerprint,
  createPropertyExecutionIntent,
  createLocalPropertyExecutionStore,
  executePropertyExecutionIntentThroughGateway,
  preflightPropertyExecutionIntent,
  propertyExecutionActionTypes,
  propertyExecutionApprovalStatuses,
  propertyExecutionPreflightStatuses,
  propertyExecutionStatuses,
  rollbackPropertyExecutionLocalProof,
  createLisaPropertyExecutionExplanation,
  evaluatePropertyExecutionEligibility,
  createExplicitLocalPropertyExecutionApproval
} from "./propertyExecutionIntent.js";
import {
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes
} from "./propertyReviewerDecision.js";

const fixedNow = "2026-08-21T00:00:00.000Z";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sideEffectCounters(overrides = {}) {
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
    commercialTransactionActions: 0,
    ...overrides
  };
}

function itemFor(ingestionId = "ingest_agency_listing_tower_b_0501") {
  const viewModel = buildPropertyIngestionReviewViewModel({ selectedIngestionId: ingestionId });
  return viewModel.queue.find((item) => item.ingestionId === ingestionId) || viewModel.selected;
}

function safeTokenReference(token = "") {
  if (!token) return null;
  const text = String(token);
  return {
    tokenRef: `approval_token_ref_${createPropertyExecutionFingerprint({ token: text }).fingerprint}`,
    tokenPreview: `${text.slice(0, 12)}...${text.slice(-8)}`,
    redacted: true,
    rawTokenMaterialShown: false
  };
}

function mapTimeline(record = {}, result = {}) {
  const audit = record.audit || [];
  const mapped = [
    { eventType: "INTENT_CREATED", timestamp: fixedNow, source: "PropertyExecutionIntent" },
    { eventType: result.preflight?.ok === false ? "PREFLIGHT_BLOCKED" : "PREFLIGHT_PASSED", timestamp: fixedNow, source: "PropertyExecutionPreflight" },
    result.approval ? { eventType: "APPROVAL_GRANTED", timestamp: result.approval.decidedAt || fixedNow, source: "ExecutionQueueApproval" } : null,
    result.gateway ? { eventType: result.gateway.decision === "READY" ? "GATEWAY_READY" : "GATEWAY_BLOCKED", timestamp: result.gateway.trace?.at || fixedNow, source: "ExecutionGateway" } : null,
    ...audit.map((event) => ({
      eventType: String(event.eventType || "").replace("PROPERTY_EXECUTION_", ""),
      timestamp: event.timestamp || fixedNow,
      source: "PropertyExecutionAudit",
      rawEventType: event.eventType
    }))
  ].filter(Boolean);
  return mapped.map((event, index) => ({ order: index + 1, appendOnly: true, ...event }));
}

function diffForRecord(record = {}, intent = {}) {
  const before = record.before || record.beforeStateSnapshot?.mapping || null;
  const after = record.after || record.rollback?.restoredMapping || null;
  return {
    allowedChange: "canonical-resolution association",
    before: before
      ? `source/listing -> ${before.canonicalPropertyId || "no applied canonical association"}`
      : "source/listing -> no applied canonical association",
    after: after
      ? `source/listing -> ${after.canonicalPropertyId || "no applied canonical association"}`
      : `source/listing -> ${intent.canonicalPropertyId || "MISSING"}`,
    changedFields: record.executionStatus === propertyExecutionStatuses.verified ? ["canonicalPropertyId", "associationStatus", "executionIntentId", "updatedAt"] : [],
    unchanged: [
      "canonical Property identity",
      "Property facts",
      "ownership",
      "source evidence",
      "listing history",
      "quarantine",
      "other Properties"
    ]
  };
}

function historyItemFromResult({ label, item, intent, result, preflight, eligibility, blockedReason = null, integrityWarnings = [] } = {}) {
  const record = result?.executionRecord || {};
  const approval = result?.approval || null;
  const before = record.beforeStateSnapshot || null;
  const after = record.after || null;
  const status = result?.status || preflight?.preflightStatus || eligibility?.preflightStatus || propertyExecutionStatuses.preflightBlocked;
  const counters = sideEffectCounters({
    localApprovedAssociationMutations: result?.localApprovedAssociationMutations || record.localApprovedAssociationMutations || 0,
    providerCalls: result?.providerCalls || 0,
    externalCalls: result?.externalCalls || 0,
    productionDbMutations: result?.productionDbMutations || 0,
    publishActions: result?.publishActions || 0,
    paymentActions: result?.paymentActions || 0,
    bookingActions: result?.bookingActions || 0,
    commercialTransactionActions: result?.commercialTransactionActions || 0
  });
  return {
    modelType: "PropertyExecutionHistoryItem",
    label,
    executionRecordId: record.executionRecordId || `local_history_${label}`,
    executionIntentId: intent?.executionIntentId || null,
    actionType: intent?.actionType || propertyExecutionActionTypes.applyConfirmedExactMatch,
    canonicalPropertyId: intent?.canonicalPropertyId || item?.canonicalPropertyId || null,
    ingestionId: intent?.ingestionId || item?.ingestionId || null,
    sourceRecordId: intent?.sourceRecordId || item?.sourceRecordId || null,
    reviewerDecisionId: intent?.reviewerDecisionId || item?.currentDecision?.decisionId || null,
    reviewCasePackageId: intent?.reviewCasePackageId || item?.reviewCasePackage?.packageId || null,
    executionStatus: status,
    preflightStatus: preflight?.status || preflight?.preflightStatus || eligibility?.preflightStatus || null,
    approvalStatus: approval ? propertyExecutionApprovalStatuses.approved : result?.approval?.status || propertyExecutionApprovalStatuses.pending,
    approvalActor: approval?.decidedBy || null,
    approvalScope: approval?.scope || null,
    approvalCreatedAt: approval?.decidedAt || null,
    executionStartedAt: record.audit?.find((event) => event.eventType === "PROPERTY_EXECUTION_STARTED")?.timestamp || null,
    executionCompletedAt: record.audit?.find((event) => ["PROPERTY_EXECUTION_VERIFIED", "PROPERTY_EXECUTION_FAILED", "PROPERTY_EXECUTION_ROLLED_BACK"].includes(event.eventType))?.timestamp || null,
    verificationStatus: record.verification?.status || (status === propertyExecutionStatuses.verified ? propertyExecutionStatuses.verified : null),
    rollbackStatus: record.rollback?.status || (status === propertyExecutionStatuses.rolledBack ? propertyExecutionStatuses.rolledBack : "NOT_ROLLED_BACK"),
    idempotencyKey: intent?.idempotencyKey || record.idempotencyKey || null,
    beforeStateFingerprint: before?.fingerprint || null,
    afterStateFingerprint: after ? createPropertyExecutionFingerprint(after) : null,
    auditEventCount: record.audit?.length || 0,
    sideEffectCounters: counters,
    blockedReason,
    integrityWarnings
  };
}

function buildBaseIntent() {
  const item = itemFor();
  const created = createPropertyExecutionIntent({ item });
  return { item, intent: created.intent };
}

export function buildPropertyExecutionHistoryFixtures() {
  const { item, intent } = buildBaseIntent();

  const verifiedStore = createLocalPropertyExecutionStore({ item });
  const verifiedPreflight = preflightPropertyExecutionIntent(intent, { store: verifiedStore });
  const verified = executePropertyExecutionIntentThroughGateway({ intent, store: verifiedStore });

  const idempotent = executePropertyExecutionIntentThroughGateway({ intent, store: verifiedStore });

  const failureStore = createLocalPropertyExecutionStore({ item });
  const failed = executePropertyExecutionIntentThroughGateway({ intent, store: failureStore, failAfterCommit: true });

  const rollbackStore = createLocalPropertyExecutionStore({ item });
  const executedForRollback = executePropertyExecutionIntentThroughGateway({ intent, store: rollbackStore });
  const rollback = rollbackPropertyExecutionLocalProof({ executionRecordId: executedForRollback.executionRecord.executionRecordId, store: rollbackStore });

  const mismatchStore = createLocalPropertyExecutionStore({ item });
  mismatchStore.setMapping(item.sourceRecordId, { ...mismatchStore.getMapping(item.sourceRecordId), canonicalPropertyId: "prop_changed_elsewhere" });
  const mismatch = executePropertyExecutionIntentThroughGateway({ intent, store: mismatchStore });

  const noDecisionItem = { ...item, currentDecision: null };
  const noDecision = evaluatePropertyExecutionEligibility({ item: noDecisionItem });
  const conflictItem = itemFor("ingest_agency_listing_tower_b_0501_price_130000");
  const conflict = evaluatePropertyExecutionEligibility({ item: conflictItem });
  const aiApproval = createExplicitLocalPropertyExecutionApproval({ executionIntentId: intent.executionIntentId, approvalToken: "approval_sensitive_fixture", normalizedInput: { canonicalPropertyId: intent.canonicalPropertyId } }, { decidedBy: "AI" });
  const broken = historyItemFromResult({
    label: "I_BROKEN_LINKAGE",
    item,
    intent: { ...intent, reviewerDecisionId: "missing_decision_link" },
    result: verified,
    preflight: verifiedPreflight,
    integrityWarnings: ["reviewer_decision_link_missing"]
  });
  const reviewOnly = historyItemFromResult({
    label: "J_REVIEW_COMPLETE_NO_EXECUTION",
    item: itemFor("ingest_developer_unit_tower_b_0501"),
    intent: null,
    result: { status: "REVIEW_COMPLETE_NO_EXECUTION" },
    preflight: { preflightStatus: "NOT_REQUESTED" },
    blockedReason: "review_complete_without_execution_intent"
  });

  const items = [
    historyItemFromResult({ label: "A_VERIFIED", item, intent, result: verified, preflight: verifiedPreflight }),
    historyItemFromResult({ label: "B_BLOCKED_DECISION", item: noDecisionItem, intent, result: { status: propertyExecutionPreflightStatuses.blockedDecision }, preflight: noDecision, eligibility: noDecision, blockedReason: noDecision.reason }),
    historyItemFromResult({ label: "C_BLOCKED_CONFLICT", item: conflictItem, intent: { ...intent, ingestionId: conflictItem.ingestionId, sourceRecordId: conflictItem.sourceRecordId, canonicalPropertyId: conflictItem.canonicalPropertyId }, result: { status: conflict.preflightStatus }, preflight: conflict, eligibility: conflict, blockedReason: conflict.reason }),
    historyItemFromResult({ label: "D_APPROVAL_BLOCKED", item, intent, result: { status: propertyExecutionApprovalStatuses.blocked, approval: aiApproval }, preflight: verifiedPreflight, blockedReason: aiApproval.reason }),
    historyItemFromResult({ label: "E_BLOCKED_STATE_MISMATCH", item, intent, result: mismatch, preflight: mismatch.preflight, blockedReason: mismatch.preflight?.reason }),
    historyItemFromResult({ label: "F_IDEMPOTENT_REPEAT", item, intent, result: idempotent, preflight: { status: propertyExecutionPreflightStatuses.blockedIdempotency }, blockedReason: "duplicate_verified_execution" }),
    historyItemFromResult({ label: "G_FAILED_SYNTHETIC", item, intent, result: failed, preflight: verifiedPreflight, blockedReason: failed.executionRecord?.failureReason }),
    historyItemFromResult({ label: "H_ROLLED_BACK", item, intent, result: rollback, preflight: verifiedPreflight }),
    broken,
    reviewOnly
  ];

  return {
    modelType: "PropertyExecutionHistoryFixtureSet",
    items,
    detailInputs: { item, intent, verified, verifiedPreflight, idempotent, failed, rollback, mismatch, aiApproval },
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function inspectPropertyExecutionApproval(item = {}) {
  const token = item.approval?.approvalToken || item.approvalToken || null;
  const scope = item.approval?.scope || item.approvalScope || {};
  return {
    modelType: "PropertyExecutionApprovalInspection",
    approvalTokenReference: safeTokenReference(token),
    approvedExecutionIntentId: item.approval?.executionIntentId || item.executionIntentId || null,
    approvedAction: scope.action || item.actionType || null,
    canonicalPropertyScope: scope.canonicalPropertyId || item.canonicalPropertyId || null,
    approvingActorType: item.approval?.decidedBy || item.approvalActor || null,
    approvalTimestamp: item.approval?.decidedAt || item.approvalCreatedAt || null,
    expirationState: item.approval?.expiresAt ? "EXPIRATION_PRESENT" : "EXPIRATION_NOT_MODELED_LOCALLY",
    consumedState: item.executionStatus === propertyExecutionStatuses.verified ? "CONSUMED_BY_VERIFIED_EXECUTION" : "NOT_CONSUMED_OR_BLOCKED",
    singleUseState: "SINGLE_USE_BY_IDEMPOTENCY_KEY",
    approvalDecisionResult: item.approval?.decision || item.approvalStatus || null,
    rawTokenMaterialShown: false
  };
}

export function buildPropertyExecutionDetailViewModel(historyItem = null) {
  const fixtures = buildPropertyExecutionHistoryFixtures();
  const selected = historyItem || fixtures.items[0];
  const { item, intent, verified, verifiedPreflight, rollback, idempotent, failed } = fixtures.detailInputs;
  const record = selected.label === "H_ROLLED_BACK"
    ? rollback.executionRecord
    : selected.label === "G_FAILED_SYNTHETIC"
      ? failed.executionRecord
      : verified.executionRecord;
  const result = selected.label === "H_ROLLED_BACK" ? rollback : selected.label === "F_IDEMPOTENT_REPEAT" ? idempotent : selected.label === "G_FAILED_SYNTHETIC" ? failed : verified;
  const approval = inspectPropertyExecutionApproval({ ...selected, approval: verified.approval });
  const timeline = mapTimeline(record, result);
  const diff = diffForRecord(record, intent);
  const integrityWarnings = [...(selected.integrityWarnings || [])];
  if (selected.reviewerDecisionId && selected.reviewerDecisionId !== intent.reviewerDecisionId && selected.label !== "J_REVIEW_COMPLETE_NO_EXECUTION") {
    integrityWarnings.push("decision_intent_linkage_warning");
  }
  return {
    modelType: "PropertyExecutionDetailViewModel",
    executionRecordId: selected.executionRecordId,
    historyItem: selected,
    sections: {
      intent: {
        requestedAction: selected.actionType,
        executionIntentId: selected.executionIntentId,
        sourceRecordId: selected.sourceRecordId,
        canonicalPropertyId: selected.canonicalPropertyId
      },
      eligibility: {
        status: selected.preflightStatus,
        reason: selected.blockedReason || "eligible_confirmed_exact_match",
        allowedActionOnly: propertyExecutionActionTypes.applyConfirmedExactMatch
      },
      reviewerDecision: {
        controlPoint: "REVIEWER DECISION",
        decisionId: selected.reviewerDecisionId,
        decisionType: item.currentDecision?.decisionType,
        decisionStatus: item.currentDecision?.decisionStatus,
        reviewerId: item.currentDecision?.reviewerId
      },
      casePackage: {
        packageId: selected.reviewCasePackageId,
        caseStatus: item.reviewCasePackage?.caseStatus,
        integrity: item.reviewCasePackage?.integrity
      },
      preflight: verifiedPreflight,
      approval,
      gateway: result.gateway || verified.gateway || null,
      beforeState: record.beforeStateSnapshot || null,
      changeScope: diff,
      afterState: record.after || record.rollback?.restoredMapping || null,
      verification: record.verification || null,
      rollback: record.rollback || { status: selected.rollbackStatus },
      audit: timeline,
      sideEffects: selected.sideEffectCounters
    },
    integrity: {
      status: integrityWarnings.length ? "INTEGRITY_WARNING" : "LINKAGE_OK_LOCAL_PROOF",
      warnings: integrityWarnings,
      fingerprint: createPropertyExecutionFingerprint(selected)
    },
    lisaGuide: createLisaPropertyExecutionHistoryExplanation(selected),
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function filterPropertyExecutionHistory(items = [], filters = {}) {
  return items.filter((item) => {
    if (filters.actionType && item.actionType !== filters.actionType) return false;
    if (filters.executionStatus && item.executionStatus !== filters.executionStatus) return false;
    if (filters.preflightStatus && item.preflightStatus !== filters.preflightStatus) return false;
    if (filters.approvalStatus && item.approvalStatus !== filters.approvalStatus) return false;
    if (filters.canonicalPropertyId && item.canonicalPropertyId !== filters.canonicalPropertyId) return false;
    if (filters.reviewerDecisionId && item.reviewerDecisionId !== filters.reviewerDecisionId) return false;
    if (filters.approvingActor && item.approvalActor !== filters.approvingActor) return false;
    if (filters.hasRollback === true && item.rollbackStatus !== propertyExecutionStatuses.rolledBack) return false;
    if (filters.failedOnly === true && item.executionStatus !== propertyExecutionStatuses.failed) return false;
    if (filters.blockedOnly === true && !String(item.executionStatus).includes("BLOCKED")) return false;
    if (filters.verifiedOnly === true && item.executionStatus !== propertyExecutionStatuses.verified) return false;
    return true;
  });
}

export function createPropertyExecutionHistoryViewModel({ filters = {}, selectedExecutionRecordId = null } = {}) {
  const fixtures = buildPropertyExecutionHistoryFixtures();
  const filtered = filterPropertyExecutionHistory(fixtures.items, filters);
  const selected = filtered.find((item) => item.executionRecordId === selectedExecutionRecordId) || filtered[0] || fixtures.items[0];
  return {
    modelType: "PropertyExecutionHistoryViewModel",
    accessBoundary: "INTERNAL / ADMIN / COMPLIANCE",
    route: "#property-execution-history",
    items: filtered,
    allItems: fixtures.items,
    selected,
    detail: buildPropertyExecutionDetailViewModel(selected),
    filters: clone(filters),
    navigatorRoute: "Покажи историю исполнения Property",
    propertyPassportLink: selected?.canonicalPropertyId ? `#property?propertyId=${selected.canonicalPropertyId}` : "#property",
    reviewQueueLinkage: "#property-review-queue",
    newExecutionActionTypes: 0,
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}

export function createLisaPropertyExecutionHistoryExplanation(historyItem = null) {
  const item = historyItem || buildPropertyExecutionHistoryFixtures().items[0];
  const wasBlocked = String(item.executionStatus).includes("BLOCKED") || item.approvalStatus === propertyExecutionApprovalStatuses.blocked;
  return {
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    source: "PropertyExecutionDetailViewModel",
    mayApproveExecution: false,
    explanation: [
      `Execution ${item.executionRecordId} requested ${item.actionType}.`,
      item.reviewerDecisionId ? `Reviewer Decision is ${item.reviewerDecisionId}.` : "No execution reviewer decision is linked.",
      item.approvalActor ? `Execution Approval was granted by ${item.approvalActor}.` : "Execution Approval was not granted or is not applicable.",
      wasBlocked ? `Execution was blocked: ${item.blockedReason || item.executionStatus}.` : `Execution status is ${item.executionStatus}.`,
      item.rollbackStatus === propertyExecutionStatuses.rolledBack ? "Rollback was performed and original execution history remains visible." : "Rollback was not used for this item.",
      "The only permitted action remains APPLY_CONFIRMED_EXACT_MATCH.",
      "Provider calls, external calls, production DB mutations, payments, bookings, publication and ownership mutations are zero."
    ].join(" "),
    providerCalls: 0,
    externalCalls: 0,
    productionDbMutations: 0
  };
}
