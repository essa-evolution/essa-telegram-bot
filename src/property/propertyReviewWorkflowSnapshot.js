import {
  applyPropertyReviewWorkflowTransition,
  buildPropertyReviewWorkflowViewModel,
  propertyReviewAssignmentStatuses,
  propertyReviewStatuses,
  propertyReviewWorkflowTransitionMatrix
} from "./propertyReviewWorkflow.js";
import {
  propertyReviewerExecutionStatuses
} from "./propertyReviewerDecision.js";
import {
  runLocalPropertyIngestionFixtureBatch
} from "./propertyIngestionPipeline.js";
import {
  propertyIngestionFixtureBatch
} from "./propertyIngestionFixtures.js";

export const propertyReviewWorkflowSnapshotSchemaVersion = "1.0.0";

export const propertyReviewWorkflowRestoreStates = {
  restoreReady: "RESTORE_READY",
  restoredLocalProof: "RESTORED_LOCAL_PROOF",
  blockedIntegrity: "RESTORE_BLOCKED_INTEGRITY",
  blockedSchema: "RESTORE_BLOCKED_SCHEMA",
  blockedReference: "RESTORE_BLOCKED_REFERENCE",
  blockedStateConflict: "RESTORE_BLOCKED_STATE_CONFLICT"
};

export const propertyReviewWorkflowRollbackEvents = {
  requested: "ROLLBACK_REQUESTED",
  validated: "ROLLBACK_VALIDATED",
  appliedLocalProof: "ROLLBACK_APPLIED_LOCAL_PROOF",
  blocked: "ROLLBACK_BLOCKED"
};

export const propertyReviewWorkflowSnapshotContract = {
  modelType: "PropertyReviewWorkflowSnapshot",
  snapshotId: null,
  snapshotVersion: "1.0.0",
  createdAt: null,
  createdByLocalActor: "local_property_admin_fixture",
  workflowSchemaVersion: propertyReviewWorkflowSnapshotSchemaVersion,
  queueItems: [],
  assignments: [],
  reviewStates: [],
  evidenceRequests: [],
  decisionRefs: [],
  casePackageRefs: [],
  auditEvents: [],
  currentStateFingerprint: null,
  previousSnapshotId: null,
  reasonForSnapshot: null,
  restoreMetadata: {},
  sideEffectCounters: {
    canonicalPropertyMutation: 0,
    listingMutation: 0,
    quarantineMutation: 0,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    mergeActions: 0,
    publishActions: 0,
    paymentActions: 0,
    bookingActions: 0,
    transactionActions: 0
  }
};

export const propertyReviewWorkflowSnapshotDiffContract = {
  modelType: "PropertyReviewWorkflowSnapshotDiff",
  fromSnapshotId: null,
  toSnapshotId: null,
  assignmentsChanged: [],
  reviewStatusesChanged: [],
  evidenceRequestsAddedOrClosed: [],
  decisionsLinked: [],
  packageVersionsChanged: [],
  auditEventsAdded: [],
  queueItemsAdded: [],
  queueItemsRemoved: [],
  reviewerChanges: [],
  propertyChanges: [],
  executionStatus: propertyReviewerExecutionStatuses.notExecuted
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

export function createPropertyReviewWorkflowSnapshotFingerprint(value = {}) {
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

function sanitizeSnapshotValue(value = {}) {
  const sanitized = clone(value);
  const text = stableStringify(sanitized);
  const forbidden = ["rawPayload", "ownerText", "reviewNote", "process.env", "SUPABASE", "OPENAI_API_KEY", "token", "secret", "password"];
  if (forbidden.some((term) => text.includes(term))) {
    throw new Error("Unsafe data detected in PropertyReviewWorkflowSnapshot.");
  }
  return sanitized;
}

function versionFromPrevious(previousSnapshot) {
  if (!previousSnapshot?.snapshotVersion) return "1.0.0";
  const [major = "1", minor = "0"] = previousSnapshot.snapshotVersion.split(".");
  return `${major}.${Number(minor) + 1}.0`;
}

function flattenSnapshotState(viewModel = {}) {
  const queueItems = (viewModel.queue || []).map((item) => ({
    queueItemId: item.queueItemId,
    handoffId: item.handoffId,
    packageId: item.packageId,
    packageVersion: item.packageVersion,
    ingestionId: item.ingestionId,
    canonicalPropertyId: item.canonicalPropertyId,
    targetRole: item.targetRole,
    assignedReviewerId: item.assignedReviewerId,
    assignmentStatus: item.assignmentStatus,
    reviewStatus: item.reviewStatus,
    priority: item.priority,
    requestedReviewType: item.requestedReviewType,
    packageReadiness: item.packageReadiness,
    professionalReviewRequirements: clone(item.professionalReviewRequirements || []),
    conflictFlags: clone(item.conflictFlags || []),
    gapFlags: clone(item.gapFlags || []),
    createdAt: item.createdAt,
    assignedAt: item.assignedAt,
    reviewStartedAt: item.reviewStartedAt,
    reviewCompletedAt: item.reviewCompletedAt,
    lastUpdatedAt: item.lastUpdatedAt,
    executionStatus: propertyReviewerExecutionStatuses.notExecuted
  }));
  return {
    queueItems,
    assignments: (viewModel.queue || []).flatMap((item) => clone(item.assignments || [])),
    reviewStates: queueItems.map((item) => ({
      queueItemId: item.queueItemId,
      assignmentStatus: item.assignmentStatus,
      reviewStatus: item.reviewStatus,
      assignedReviewerId: item.assignedReviewerId,
      lastUpdatedAt: item.lastUpdatedAt
    })),
    evidenceRequests: (viewModel.queue || []).flatMap((item) => clone(item.evidenceRequests || [])),
    decisionRefs: (viewModel.queue || []).filter((item) => item.reviewerDecision).map((item) => ({
      queueItemId: item.queueItemId,
      decisionId: item.reviewerDecision.decisionId,
      decisionType: item.reviewerDecision.decisionType,
      decisionStatus: item.reviewerDecision.decisionStatus,
      supersedesDecisionId: item.reviewerDecision.supersedesDecisionId || null,
      executionStatus: propertyReviewerExecutionStatuses.notExecuted
    })),
    casePackageRefs: (viewModel.queue || []).map((item) => ({
      queueItemId: item.queueItemId,
      packageId: item.packageId,
      packageVersion: item.packageVersion,
      packageReadiness: item.packageReadiness,
      integrityFingerprint: item.package?.integrity?.fingerprint || null
    })),
    auditEvents: (viewModel.queue || []).flatMap((item) => clone(item.auditPreview || []))
  };
}

export function captureCanonicalPropertyImmutabilityFingerprint() {
  const batch = runLocalPropertyIngestionFixtureBatch(propertyIngestionFixtureBatch);
  const state = {
    properties: batch.store?.properties || [],
    facts: batch.store?.facts || [],
    listingSnapshots: batch.store?.listingSnapshots || [],
    quarantine: batch.quarantine || []
  };
  return {
    ...createPropertyReviewWorkflowSnapshotFingerprint(state),
    canonicalPropertyCount: state.properties.length,
    listingSnapshotCount: state.listingSnapshots.length,
    quarantineCount: state.quarantine.length
  };
}

export function createWorkflowSnapshot({
  workflowViewModel = buildPropertyReviewWorkflowViewModel(),
  previousSnapshot = null,
  createdAt = "2026-08-21T00:00:00.000Z",
  createdByLocalActor = "local_property_admin_fixture",
  reasonForSnapshot = "LOCAL_WORKFLOW_SNAPSHOT"
} = {}) {
  const flattened = flattenSnapshotState(workflowViewModel);
  const base = {
    ...clone(propertyReviewWorkflowSnapshotContract),
    snapshotId: `snapshot_property_review_workflow_${previousSnapshot ? versionFromPrevious(previousSnapshot).replaceAll(".", "_") : "1_0_0"}`,
    snapshotVersion: versionFromPrevious(previousSnapshot),
    createdAt,
    createdByLocalActor,
    workflowSchemaVersion: propertyReviewWorkflowSnapshotSchemaVersion,
    ...flattened,
    previousSnapshotId: previousSnapshot?.snapshotId || null,
    reasonForSnapshot,
    restoreMetadata: {
      restoreSupported: true,
      restoreScope: "LOCAL_REVIEW_WORKFLOW_ONLY",
      propertyExecutionEnabled: false,
      canonicalPropertyFingerprint: captureCanonicalPropertyImmutabilityFingerprint()
    },
    sideEffectCounters: clone(propertyReviewWorkflowSnapshotContract.sideEffectCounters)
  };
  const withoutFingerprint = { ...base, currentStateFingerprint: null };
  return sanitizeSnapshotValue({
    ...base,
    currentStateFingerprint: createPropertyReviewWorkflowSnapshotFingerprint(withoutFingerprint)
  });
}

function verifyReferences(snapshot = {}) {
  const errors = [];
  const queueIds = new Set((snapshot.queueItems || []).map((item) => item.queueItemId));
  const packageIds = new Set((snapshot.casePackageRefs || []).map((ref) => ref.packageId));
  (snapshot.reviewStates || []).forEach((state) => {
    if (!queueIds.has(state.queueItemId)) errors.push(`broken_review_state_ref:${state.queueItemId}`);
  });
  (snapshot.decisionRefs || []).forEach((ref) => {
    if (!queueIds.has(ref.queueItemId)) errors.push(`broken_decision_queue_ref:${ref.queueItemId}`);
    if (!ref.decisionId) errors.push("broken_decision_id");
  });
  (snapshot.casePackageRefs || []).forEach((ref) => {
    if (!queueIds.has(ref.queueItemId)) errors.push(`broken_package_queue_ref:${ref.queueItemId}`);
    if (!ref.packageId) errors.push("broken_package_id");
  });
  (snapshot.queueItems || []).forEach((item) => {
    if (!packageIds.has(item.packageId)) errors.push(`missing_package_ref:${item.packageId}`);
  });
  return errors;
}

function verifyStateCompatibility(snapshot = {}) {
  const errors = [];
  (snapshot.queueItems || []).forEach((item) => {
    if (!Object.values(propertyReviewAssignmentStatuses).includes(item.assignmentStatus)) errors.push(`invalid_assignment_status:${item.queueItemId}`);
    if (!Object.values(propertyReviewStatuses).includes(item.reviewStatus)) errors.push(`invalid_review_status:${item.queueItemId}`);
    if (item.reviewStatus === propertyReviewStatuses.reviewComplete && item.assignmentStatus !== propertyReviewAssignmentStatuses.closed) {
      errors.push(`review_complete_requires_closed_assignment:${item.queueItemId}`);
    }
  });
  return errors;
}

function verifyAuditContinuity(snapshot = {}) {
  const queueIds = new Set((snapshot.queueItems || []).map((item) => item.queueItemId));
  return (snapshot.auditEvents || [])
    .filter((event) => event.queueItemId && !queueIds.has(event.queueItemId))
    .map((event) => `broken_audit_queue_ref:${event.auditEventId}`);
}

export function verifyWorkflowSnapshotIntegrity(snapshot = {}) {
  const errors = [];
  if (snapshot.modelType !== "PropertyReviewWorkflowSnapshot") errors.push("snapshot_model_type_invalid");
  if (!snapshot.snapshotId) errors.push("snapshot_id_required");
  if (!/^\d+\.\d+\.\d+$/.test(snapshot.snapshotVersion || "")) errors.push("snapshot_version_malformed");
  if (snapshot.workflowSchemaVersion !== propertyReviewWorkflowSnapshotSchemaVersion) errors.push("unsupported_schema_version");
  ["queueItems", "assignments", "reviewStates", "evidenceRequests", "decisionRefs", "casePackageRefs", "auditEvents"].forEach((key) => {
    if (!Array.isArray(snapshot[key])) errors.push(`missing_required_section:${key}`);
  });
  errors.push(...verifyReferences(snapshot), ...verifyStateCompatibility(snapshot), ...verifyAuditContinuity(snapshot));
  const expected = createPropertyReviewWorkflowSnapshotFingerprint({ ...snapshot, currentStateFingerprint: null });
  if (snapshot.currentStateFingerprint?.fingerprint !== expected.fingerprint) errors.push("fingerprint_mismatch");
  return {
    ok: errors.length === 0,
    status: errors.length ? "SNAPSHOT_INTEGRITY_INVALID" : "SNAPSHOT_INTEGRITY_VALID",
    errors,
    expectedFingerprint: expected,
    actualFingerprint: snapshot.currentStateFingerprint || null,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0
  };
}

export function restorePropertyReviewWorkflowSnapshot(snapshot = {}) {
  const integrity = verifyWorkflowSnapshotIntegrity(snapshot);
  if (!integrity.ok) {
    const status = integrity.errors.includes("unsupported_schema_version")
      ? propertyReviewWorkflowRestoreStates.blockedSchema
      : integrity.errors.some((error) => error.includes("_ref") || error.includes("missing_package"))
        ? propertyReviewWorkflowRestoreStates.blockedReference
        : integrity.errors.some((error) => error.includes("status") || error.includes("review_complete"))
          ? propertyReviewWorkflowRestoreStates.blockedStateConflict
          : propertyReviewWorkflowRestoreStates.blockedIntegrity;
    return { ok: false, status, integrity, restoredState: null, providerCalls: 0, externalCalls: 0, dbMutations: 0 };
  }
  return {
    ok: true,
    status: propertyReviewWorkflowRestoreStates.restoredLocalProof,
    integrity,
    restoredState: {
      queueItems: clone(snapshot.queueItems),
      assignments: clone(snapshot.assignments),
      reviewStates: clone(snapshot.reviewStates),
      evidenceRequests: clone(snapshot.evidenceRequests),
      decisionRefs: clone(snapshot.decisionRefs),
      casePackageRefs: clone(snapshot.casePackageRefs),
      auditEvents: clone(snapshot.auditEvents),
      activeSnapshotId: snapshot.snapshotId
    },
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    canonicalPropertyMutation: 0,
    listingMutation: 0,
    quarantineMutation: 0
  };
}

function byId(items = [], key = "queueItemId") {
  return new Map(items.map((item) => [item[key], item]));
}

export function diffPropertyReviewWorkflowSnapshots(fromSnapshot = {}, toSnapshot = {}) {
  const fromQueue = byId(fromSnapshot.queueItems);
  const toQueue = byId(toSnapshot.queueItems);
  const fromEvidence = byId(fromSnapshot.evidenceRequests, "requestId");
  const toEvidence = byId(toSnapshot.evidenceRequests, "requestId");
  const fromDecisions = byId(fromSnapshot.decisionRefs, "decisionId");
  const toDecisions = byId(toSnapshot.decisionRefs, "decisionId");
  const diff = {
    ...clone(propertyReviewWorkflowSnapshotDiffContract),
    fromSnapshotId: fromSnapshot.snapshotId || null,
    toSnapshotId: toSnapshot.snapshotId || null,
    queueItemsAdded: [...toQueue.keys()].filter((id) => !fromQueue.has(id)),
    queueItemsRemoved: [...fromQueue.keys()].filter((id) => !toQueue.has(id)),
    evidenceRequestsAddedOrClosed: [...toEvidence.values()].filter((item) => !fromEvidence.has(item.requestId) || fromEvidence.get(item.requestId)?.status !== item.status),
    decisionsLinked: [...toDecisions.values()].filter((item) => !fromDecisions.has(item.decisionId)),
    auditEventsAdded: (toSnapshot.auditEvents || []).filter((event) => !(fromSnapshot.auditEvents || []).some((old) => old.auditEventId === event.auditEventId)),
    propertyChanges: [],
    executionStatus: propertyReviewerExecutionStatuses.notExecuted
  };
  [...toQueue.entries()].forEach(([id, next]) => {
    const prev = fromQueue.get(id);
    if (!prev) return;
    if (prev.assignmentStatus !== next.assignmentStatus || prev.assignedReviewerId !== next.assignedReviewerId) {
      diff.assignmentsChanged.push({ queueItemId: id, before: prev.assignmentStatus, after: next.assignmentStatus });
    }
    if (prev.reviewStatus !== next.reviewStatus) {
      diff.reviewStatusesChanged.push({ queueItemId: id, before: prev.reviewStatus, after: next.reviewStatus });
    }
    if (prev.assignedReviewerId !== next.assignedReviewerId) {
      diff.reviewerChanges.push({ queueItemId: id, before: prev.assignedReviewerId, after: next.assignedReviewerId });
    }
    if (prev.packageVersion !== next.packageVersion) {
      diff.packageVersionsChanged.push({ queueItemId: id, before: prev.packageVersion, after: next.packageVersion });
    }
  });
  return diff;
}

export function rollbackPropertyReviewWorkflowSnapshot({ fromSnapshot, toSnapshot, actor = "local_property_admin_fixture", reasonCode = "LOCAL_ROLLBACK_PROOF", timestamp = "2026-08-21T00:00:00.000Z" } = {}) {
  const requested = { eventType: propertyReviewWorkflowRollbackEvents.requested, fromSnapshotId: fromSnapshot?.snapshotId || null, toSnapshotId: toSnapshot?.snapshotId || null, actor, reasonCode, timestamp };
  const restore = restorePropertyReviewWorkflowSnapshot(toSnapshot);
  const audit = [requested];
  if (!restore.ok) {
    audit.push({ ...requested, eventType: propertyReviewWorkflowRollbackEvents.blocked });
    return { ok: false, status: restore.status, rollbackAudit: audit, activeState: null, providerCalls: 0, externalCalls: 0, dbMutations: 0 };
  }
  audit.push(
    { ...requested, eventType: propertyReviewWorkflowRollbackEvents.validated },
    { ...requested, eventType: propertyReviewWorkflowRollbackEvents.appliedLocalProof }
  );
  return {
    ok: true,
    status: "ROLLBACK_APPLIED_LOCAL_PROOF",
    rollbackAudit: audit,
    activeState: restore.restoredState,
    historicalSnapshotsPreserved: true,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    canonicalPropertyMutation: 0,
    listingMutation: 0,
    quarantineMutation: 0
  };
}

export function createLocalPropertyReviewWorkflowSnapshotAdapter(initialSnapshots = []) {
  const snapshots = [...initialSnapshots.map(clone)];
  return {
    adapterType: "LOCAL_SERIALIZED_PROPERTY_REVIEW_WORKFLOW_SNAPSHOT_ADAPTER",
    save(snapshot) {
      const verified = verifyWorkflowSnapshotIntegrity(snapshot);
      if (!verified.ok) return { ok: false, status: "SAVE_BLOCKED_INTEGRITY", verified };
      snapshots.push(clone(snapshot));
      return { ok: true, status: "SAVED_LOCAL_PROOF", snapshotId: snapshot.snapshotId, count: snapshots.length };
    },
    list() {
      return snapshots.map(clone);
    },
    get(snapshotId) {
      return clone(snapshots.find((snapshot) => snapshot.snapshotId === snapshotId) || null);
    },
    serialize() {
      return `${JSON.stringify(sanitizeSnapshotValue({ snapshots }), null, 2)}\n`;
    },
    clearLocalProof() {
      snapshots.splice(0, snapshots.length);
      return { ok: true, status: "CLEARED_LOCAL_PROOF" };
    }
  };
}

export function buildPropertyReviewWorkflowSnapshotFixtures() {
  const v1State = buildPropertyReviewWorkflowViewModel();
  const v1 = createWorkflowSnapshot({ workflowViewModel: v1State, reasonForSnapshot: "Initial queue" });
  const assigned = applyPropertyReviewWorkflowTransition(v1State.queue.find((item) => item.queueItemId === "queue_ingest_agency_listing_tower_b_0501"), {
    assignmentStatus: propertyReviewAssignmentStatuses.assigned,
    assignedReviewerId: "reviewer_property_001",
    eventType: "REVIEW_ASSIGNED"
  }).item;
  const v2State = buildPropertyReviewWorkflowViewModel({ overrides: { [assigned.ingestionId]: assigned } });
  const v2 = createWorkflowSnapshot({ workflowViewModel: v2State, previousSnapshot: v1, reasonForSnapshot: "Reviewer assigned" });
  const evidenceItem = v2State.queue.find((item) => item.queueItemId === "queue_ingest_manual_gap_record_city_missing");
  const evidenceUpdated = { ...evidenceItem, evidenceRequests: [...evidenceItem.evidenceRequests, { requestId: "snapshot_fixture_evidence_req", packageId: evidenceItem.packageId, requestedBy: "reviewer_property_001", evidenceType: "OWNERSHIP_DOCUMENT", reasonCode: "LOCAL_SNAPSHOT_PROOF", requestedAt: "2026-08-21T00:00:00.000Z", status: "WAITING", externalMessageSent: false, providerCalls: 0, externalCalls: 0, dbMutations: 0 }] };
  const v3State = buildPropertyReviewWorkflowViewModel({ overrides: { [assigned.ingestionId]: assigned, [evidenceUpdated.ingestionId]: evidenceUpdated } });
  const v3 = createWorkflowSnapshot({ workflowViewModel: v3State, previousSnapshot: v2, reasonForSnapshot: "Evidence requested" });
  const decisionItem = v3State.queue.find((item) => item.queueItemId === "queue_ingest_agency_listing_tower_b_0501_reobs_123000");
  const decisionLinked = { ...decisionItem, reviewStatus: propertyReviewStatuses.decisionRecorded };
  const v4State = buildPropertyReviewWorkflowViewModel({ overrides: { [assigned.ingestionId]: assigned, [evidenceUpdated.ingestionId]: evidenceUpdated, [decisionLinked.ingestionId]: decisionLinked } });
  const v4 = createWorkflowSnapshot({ workflowViewModel: v4State, previousSnapshot: v3, reasonForSnapshot: "Decision linked" });
  return { v1, v2, v3, v4, diffV2V4: diffPropertyReviewWorkflowSnapshots(v2, v4), restoreV2: restorePropertyReviewWorkflowSnapshot(v2), rollbackV4ToV2: rollbackPropertyReviewWorkflowSnapshot({ fromSnapshot: v4, toSnapshot: v2 }) };
}

export function createLisaPropertyReviewWorkflowSnapshotExplanation({ snapshot, diff, restoreResult, rollbackResult } = {}) {
  return {
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    accessBoundary: "INTERNAL / ADMIN / LOCAL PROOF",
    explanation: [
      snapshot ? `Snapshot ${snapshot.snapshotId} version ${snapshot.snapshotVersion} stores local review workflow state only.` : "No snapshot selected.",
      diff ? `Diff shows ${diff.assignmentsChanged.length} assignment change(s), ${diff.reviewStatusesChanged.length} review status change(s), ${diff.evidenceRequestsAddedOrClosed.length} evidence request change(s), and ${diff.decisionsLinked.length} linked decision(s).` : "",
      restoreResult ? `Restore status is ${restoreResult.status}. It rebuilds review workflow state only.` : "",
      rollbackResult ? `Rollback status is ${rollbackResult.status}; historical snapshots remain preserved.` : "",
      "This does not change canonical Property, listings, quarantine, providers, payments, bookings or transactions.",
      "Reviewer Decision is still not Property Execution."
    ].filter(Boolean).join(" "),
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}
