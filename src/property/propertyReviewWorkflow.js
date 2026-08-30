import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import {
  propertyProfessionalReviewRequirements,
  propertyReviewCaseStatuses,
  propertyReviewHandoffTargetRoles
} from "./propertyReviewCasePackage.js";
import {
  buildPropertyIngestionReviewViewModel
} from "./propertyIngestionReview.js";
import {
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  propertyReviewerExecutionStatuses
} from "./propertyReviewerDecision.js";

export const propertyReviewAssignmentStatuses = {
  unassigned: "UNASSIGNED",
  assigned: "ASSIGNED",
  acceptedByReviewer: "ACCEPTED_BY_REVIEWER",
  returnedToQueue: "RETURNED_TO_QUEUE",
  closed: "CLOSED"
};

export const propertyReviewStatuses = {
  notStarted: "NOT_STARTED",
  inReview: "IN_REVIEW",
  waitingForEvidence: "WAITING_FOR_EVIDENCE",
  decisionRecorded: "DECISION_RECORDED",
  blocked: "BLOCKED",
  reviewComplete: "REVIEW_COMPLETE"
};

export const propertyReviewPriorities = {
  low: "LOW",
  normal: "NORMAL",
  high: "HIGH",
  urgentReview: "URGENT_REVIEW"
};

export const propertyEvidenceRequestStatuses = {
  draft: "DRAFT",
  recorded: "RECORDED",
  waiting: "WAITING",
  satisfiedLocalProof: "SATISFIED_LOCAL_PROOF",
  cancelled: "CANCELLED"
};

export const propertyEvidenceRequestTypes = {
  ownershipDocument: "OWNERSHIP_DOCUMENT",
  authorityDocument: "AUTHORITY_DOCUMENT",
  propertyIdentityEvidence: "PROPERTY_IDENTITY_EVIDENCE",
  priceClarification: "PRICE_CLARIFICATION",
  locationClarification: "LOCATION_CLARIFICATION",
  projectDocument: "PROJECT_DOCUMENT",
  sourceClarification: "SOURCE_CLARIFICATION",
  otherStructured: "OTHER_STRUCTURED"
};

export const propertyReviewAuditEvents = {
  handoffCreated: "HANDOFF_CREATED",
  queueItemCreated: "QUEUE_ITEM_CREATED",
  reviewAssigned: "REVIEW_ASSIGNED",
  reviewAccepted: "REVIEW_ACCEPTED",
  reviewStarted: "REVIEW_STARTED",
  moreEvidenceRequested: "MORE_EVIDENCE_REQUESTED",
  reviewReturned: "REVIEW_RETURNED",
  decisionLinked: "DECISION_LINKED",
  reviewBlocked: "REVIEW_BLOCKED",
  reviewCompleted: "REVIEW_COMPLETED"
};

export const localPropertyReviewerIdentities = {
  propertyReviewer: "reviewer_property_001",
  compliance: "compliance_local_001",
  admin: "admin_local_001"
};

export const propertyReviewHandoffQueueItemContract = {
  modelType: "PropertyReviewHandoffQueueItem",
  queueItemId: null,
  handoffId: null,
  packageId: null,
  packageVersion: null,
  ingestionId: null,
  canonicalPropertyId: null,
  targetRole: propertyReviewHandoffTargetRoles.propertyReviewer,
  assignedReviewerId: null,
  assignmentStatus: propertyReviewAssignmentStatuses.unassigned,
  reviewStatus: propertyReviewStatuses.notStarted,
  priority: propertyReviewPriorities.normal,
  requestedReviewType: propertyProfessionalReviewRequirements.propertyReviewRequired,
  packageReadiness: propertyReviewCaseStatuses.incomplete,
  professionalReviewRequirements: [],
  conflictFlags: [],
  gapFlags: [],
  createdAt: null,
  assignedAt: null,
  reviewStartedAt: null,
  reviewCompletedAt: null,
  lastUpdatedAt: null,
  auditRefs: [],
  executionStatus: propertyReviewerExecutionStatuses.notExecuted
};

export const propertyReviewAssignmentContract = {
  modelType: "PropertyReviewAssignment",
  assignmentId: null,
  queueItemId: null,
  reviewerRole: propertyReviewHandoffTargetRoles.propertyReviewer,
  reviewerId: null,
  assignedBy: "local_property_admin_fixture",
  assignedAt: null,
  status: propertyReviewAssignmentStatuses.assigned,
  notesCode: null,
  auditMetadata: {
    localOnly: true,
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

export const propertyEvidenceRequestContract = {
  modelType: "PropertyEvidenceRequest",
  requestId: null,
  packageId: null,
  requestedBy: null,
  evidenceType: propertyEvidenceRequestTypes.otherStructured,
  reasonCode: null,
  requestedAt: null,
  status: propertyEvidenceRequestStatuses.draft,
  externalMessageSent: false,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0
};

export const propertyReviewerInboxContract = {
  modelType: "PropertyReviewerInbox",
  filters: {},
  items: [],
  boundedCaseSummaries: [],
  omittedRawPayload: true,
  executionStatus: propertyReviewerExecutionStatuses.notExecuted,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0
};

export const propertyReviewWorkflowTransitionMatrix = {
  assignment: {
    [propertyReviewAssignmentStatuses.unassigned]: [propertyReviewAssignmentStatuses.assigned],
    [propertyReviewAssignmentStatuses.assigned]: [
      propertyReviewAssignmentStatuses.acceptedByReviewer,
      propertyReviewAssignmentStatuses.returnedToQueue,
      propertyReviewAssignmentStatuses.closed
    ],
    [propertyReviewAssignmentStatuses.acceptedByReviewer]: [
      propertyReviewAssignmentStatuses.returnedToQueue,
      propertyReviewAssignmentStatuses.closed
    ],
    [propertyReviewAssignmentStatuses.returnedToQueue]: [propertyReviewAssignmentStatuses.assigned],
    [propertyReviewAssignmentStatuses.closed]: []
  },
  review: {
    [propertyReviewStatuses.notStarted]: [propertyReviewStatuses.inReview, propertyReviewStatuses.blocked],
    [propertyReviewStatuses.inReview]: [
      propertyReviewStatuses.waitingForEvidence,
      propertyReviewStatuses.decisionRecorded,
      propertyReviewStatuses.blocked
    ],
    [propertyReviewStatuses.waitingForEvidence]: [
      propertyReviewStatuses.inReview,
      propertyReviewStatuses.decisionRecorded,
      propertyReviewStatuses.blocked
    ],
    [propertyReviewStatuses.decisionRecorded]: [propertyReviewStatuses.reviewComplete],
    [propertyReviewStatuses.blocked]: [propertyReviewStatuses.inReview],
    [propertyReviewStatuses.reviewComplete]: []
  }
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function hasRequirement(item, requirement) {
  return (item.professionalReviewRequirements || []).includes(requirement);
}

export function classifyPropertyReviewPriority(item = {}) {
  if (item.reviewStatus === propertyReviewStatuses.reviewComplete) return propertyReviewPriorities.low;
  if (item.packageReadiness === propertyReviewCaseStatuses.blockedByQuarantine) return propertyReviewPriorities.urgentReview;
  if (item.conflictFlags?.length || hasRequirement(item, propertyProfessionalReviewRequirements.complianceReviewRequired)) return propertyReviewPriorities.high;
  if (item.gapFlags?.length || hasRequirement(item, propertyProfessionalReviewRequirements.ownershipEvidenceRequired)) return propertyReviewPriorities.high;
  if (hasRequirement(item, propertyProfessionalReviewRequirements.legalReviewRequired)) return propertyReviewPriorities.urgentReview;
  if (item.packageReadiness === propertyReviewCaseStatuses.reviewedDecisionRecorded) return propertyReviewPriorities.low;
  return propertyReviewPriorities.normal;
}

export function createPropertyReviewAuditEvent(input = {}) {
  return {
    modelType: "PropertyReviewWorkflowAuditEvent",
    auditEventId: input.auditEventId || `audit_${input.queueItemId || "unknown"}_${input.eventType || "event"}`,
    eventType: input.eventType,
    queueItemId: input.queueItemId || null,
    handoffId: input.handoffId || null,
    packageId: input.packageId || null,
    previousAssignmentStatus: input.previousAssignmentStatus || null,
    nextAssignmentStatus: input.nextAssignmentStatus || null,
    previousReviewStatus: input.previousReviewStatus || null,
    nextReviewStatus: input.nextReviewStatus || null,
    reviewerRole: input.reviewerRole || null,
    reviewerId: input.reviewerId || null,
    timestamp: input.timestamp || "2026-08-21T00:00:00.000Z",
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
}

export function createPropertyReviewAssignment(input = {}) {
  return {
    ...clone(propertyReviewAssignmentContract),
    ...input,
    auditMetadata: {
      ...clone(propertyReviewAssignmentContract.auditMetadata),
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

export function createPropertyEvidenceRequest(input = {}) {
  return {
    ...clone(propertyEvidenceRequestContract),
    ...input,
    externalMessageSent: false,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0
  };
}

function baseQueueItemFromReviewItem(reviewItem = {}, overrides = {}) {
  const pkg = reviewItem.reviewCasePackage || {};
  const handoff = reviewItem.reviewCaseHandoff || {};
  const currentDecision = reviewItem.currentDecision || null;
  const item = {
    ...clone(propertyReviewHandoffQueueItemContract),
    queueItemId: `queue_${reviewItem.ingestionId || "unknown"}`,
    handoffId: handoff.handoffId || null,
    packageId: pkg.packageId || null,
    packageVersion: pkg.packageVersion || null,
    ingestionId: reviewItem.ingestionId || null,
    canonicalPropertyId: reviewItem.canonicalPropertyId || null,
    targetRole: handoff.targetRole || propertyReviewHandoffTargetRoles.propertyReviewer,
    assignedReviewerId: null,
    assignmentStatus: propertyReviewAssignmentStatuses.unassigned,
    reviewStatus: propertyReviewStatuses.notStarted,
    requestedReviewType: handoff.requestedReviewType || propertyProfessionalReviewRequirements.propertyReviewRequired,
    packageReadiness: pkg.caseStatus || propertyReviewCaseStatuses.incomplete,
    professionalReviewRequirements: clone(pkg.professionalReviewRequirements || []),
    conflictFlags: clone(reviewItem.conflicts || []),
    gapFlags: clone(reviewItem.gaps || []),
    createdAt: pkg.generatedAt || "2026-08-21T00:00:00.000Z",
    assignedAt: null,
    reviewStartedAt: null,
    reviewCompletedAt: null,
    lastUpdatedAt: pkg.generatedAt || "2026-08-21T00:00:00.000Z",
    auditRefs: [],
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    sourceSummary: clone(pkg.sourceSummary || {}),
    packageSummary: pkg.summary || "",
    package: pkg,
    handoff,
    reviewerDecision: currentDecision ? {
      decisionId: currentDecision.decisionId,
      decisionType: currentDecision.decisionType,
      decisionStatus: currentDecision.decisionStatus,
      supersedesDecisionId: currentDecision.supersedesDecisionId || null,
      supersededVisible: reviewItem.decisionHistory?.some((decision) => decision.decisionStatus === propertyReviewerDecisionStatuses.superseded) || false,
      executionStatus: currentDecision.executionStatus
    } : null,
    decisionHistory: clone(reviewItem.decisionHistory || []),
    evidenceRequests: [],
    assignments: [],
    auditPreview: [
      createPropertyReviewAuditEvent({
        auditEventId: `audit_${reviewItem.ingestionId}_handoff_created`,
        eventType: propertyReviewAuditEvents.handoffCreated,
        queueItemId: `queue_${reviewItem.ingestionId || "unknown"}`,
        handoffId: handoff.handoffId || null,
        packageId: pkg.packageId || null
      }),
      createPropertyReviewAuditEvent({
        auditEventId: `audit_${reviewItem.ingestionId}_queue_item_created`,
        eventType: propertyReviewAuditEvents.queueItemCreated,
        queueItemId: `queue_${reviewItem.ingestionId || "unknown"}`,
        handoffId: handoff.handoffId || null,
        packageId: pkg.packageId || null
      })
    ],
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
  const merged = { ...item, ...clone(overrides) };
  merged.priority = overrides.priority || classifyPropertyReviewPriority(merged);
  return merged;
}

function fixtureOverrides() {
  return {
    ingest_agency_listing_tower_b_0501: {
      fixtureId: "A",
      fixtureLabel: "Unassigned normal review"
    },
    ingest_duplicate_partner_tower_b_0501: {
      fixtureId: "B",
      fixtureLabel: "Assigned Property Reviewer case",
      assignedReviewerId: localPropertyReviewerIdentities.propertyReviewer,
      assignmentStatus: propertyReviewAssignmentStatuses.assigned,
      assignedAt: "2026-08-21T00:10:00.000Z",
      assignments: [createPropertyReviewAssignment({
        assignmentId: "assign_queue_duplicate_partner_001",
        queueItemId: "queue_ingest_duplicate_partner_tower_b_0501",
        reviewerId: localPropertyReviewerIdentities.propertyReviewer,
        assignedAt: "2026-08-21T00:10:00.000Z",
        notesCode: "LOCAL_FIXTURE_ASSIGNED"
      })]
    },
    ingest_agency_listing_tower_b_0501_price_130000: {
      fixtureId: "C",
      fixtureLabel: "Compliance case with conflict",
      targetRole: propertyReviewHandoffTargetRoles.propertyCompliance,
      assignedReviewerId: localPropertyReviewerIdentities.compliance,
      assignmentStatus: propertyReviewAssignmentStatuses.assigned,
      requestedReviewType: propertyProfessionalReviewRequirements.complianceReviewRequired
    },
    ingest_manual_gap_record_city_missing: {
      fixtureId: "D",
      fixtureLabel: "Waiting for ownership evidence",
      assignedReviewerId: localPropertyReviewerIdentities.propertyReviewer,
      assignmentStatus: propertyReviewAssignmentStatuses.acceptedByReviewer,
      reviewStatus: propertyReviewStatuses.waitingForEvidence,
      evidenceRequests: [createPropertyEvidenceRequest({
        requestId: "evidence_req_manual_gap_ownership_001",
        packageId: "pkg_ingest_manual_gap_record_city_missing_1_0_0",
        requestedBy: localPropertyReviewerIdentities.propertyReviewer,
        evidenceType: propertyEvidenceRequestTypes.ownershipDocument,
        reasonCode: "OWNERSHIP_EVIDENCE_REQUIRED",
        requestedAt: "2026-08-21T00:20:00.000Z",
        status: propertyEvidenceRequestStatuses.waiting
      })]
    },
    ingest_owner_sub_batumi_0707: {
      fixtureId: "E",
      fixtureLabel: "Case with superseded decision",
      assignedReviewerId: localPropertyReviewerIdentities.admin,
      assignmentStatus: propertyReviewAssignmentStatuses.acceptedByReviewer,
      reviewStatus: propertyReviewStatuses.decisionRecorded,
      targetRole: propertyReviewHandoffTargetRoles.propertyAdmin
    },
    ingest_invalid_negative_area: {
      fixtureId: "F",
      fixtureLabel: "Blocked quarantine case",
      targetRole: propertyReviewHandoffTargetRoles.propertyAdmin,
      reviewStatus: propertyReviewStatuses.blocked,
      priority: propertyReviewPriorities.urgentReview
    },
    ingest_developer_unit_tower_b_0501: {
      fixtureId: "G",
      fixtureLabel: "Review complete but execution not performed",
      assignedReviewerId: localPropertyReviewerIdentities.propertyReviewer,
      assignmentStatus: propertyReviewAssignmentStatuses.closed,
      reviewStatus: propertyReviewStatuses.reviewComplete,
      reviewCompletedAt: "2026-08-21T00:30:00.000Z",
      priority: propertyReviewPriorities.low
    },
    ingest_agency_listing_tower_b_0501_removed: {
      fixtureId: "H",
      fixtureLabel: "Returned-to-queue case",
      assignmentStatus: propertyReviewAssignmentStatuses.returnedToQueue,
      reviewStatus: propertyReviewStatuses.notStarted,
      assignedReviewerId: null
    }
  };
}

function applyWorkflowFilters(items = [], filters = {}) {
  return items.filter((item) => {
    if (filters.reviewerRole && item.targetRole !== filters.reviewerRole) return false;
    if (filters.reviewerId && item.assignedReviewerId !== filters.reviewerId) return false;
    if (filters.assignmentStatus && item.assignmentStatus !== filters.assignmentStatus) return false;
    if (filters.reviewStatus && item.reviewStatus !== filters.reviewStatus) return false;
    if (filters.requestedReviewType && item.requestedReviewType !== filters.requestedReviewType) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.packageReadiness && item.packageReadiness !== filters.packageReadiness) return false;
    if (filters.hasConflict === true && !item.conflictFlags.length) return false;
    if (filters.hasGaps === true && !item.gapFlags.length) return false;
    if (filters.professionalReviewRequirement && !item.professionalReviewRequirements.includes(filters.professionalReviewRequirement)) return false;
    if (filters.canonicalPropertyId && item.canonicalPropertyId !== filters.canonicalPropertyId) return false;
    return true;
  });
}

export function validatePropertyReviewWorkflowTransition(item = {}, next = {}) {
  const errors = [];
  const nextAssignmentStatus = next.assignmentStatus || item.assignmentStatus;
  const nextReviewStatus = next.reviewStatus || item.reviewStatus;
  const assignmentAllowed = propertyReviewWorkflowTransitionMatrix.assignment[item.assignmentStatus] || [];
  const reviewAllowed = propertyReviewWorkflowTransitionMatrix.review[item.reviewStatus] || [];
  if (next.assignmentStatus && next.assignmentStatus !== item.assignmentStatus && !assignmentAllowed.includes(nextAssignmentStatus)) {
    errors.push("assignment_transition_not_allowed");
  }
  if (next.reviewStatus && next.reviewStatus !== item.reviewStatus && !reviewAllowed.includes(nextReviewStatus)) {
    errors.push("review_transition_not_allowed");
  }
  if (nextReviewStatus === propertyReviewStatuses.reviewComplete && !item.reviewerDecision && next.linkDecision !== true) {
    errors.push("review_complete_requires_recorded_decision");
  }
  if (item.reviewStatus === propertyReviewStatuses.notStarted && nextReviewStatus === propertyReviewStatuses.reviewComplete) {
    errors.push("not_started_cannot_complete_directly");
  }
  return {
    ok: errors.length === 0,
    errors,
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0
  };
}

export function applyPropertyReviewWorkflowTransition(item = {}, next = {}) {
  const validation = validatePropertyReviewWorkflowTransition(item, next);
  if (!validation.ok) return { ok: false, item: clone(item), validation };
  const now = next.timestamp || "2026-08-21T00:40:00.000Z";
  const updated = {
    ...clone(item),
    assignmentStatus: next.assignmentStatus || item.assignmentStatus,
    reviewStatus: next.reviewStatus || item.reviewStatus,
    assignedReviewerId: next.assignedReviewerId === undefined ? item.assignedReviewerId : next.assignedReviewerId,
    assignedAt: next.assignmentStatus === propertyReviewAssignmentStatuses.assigned ? now : item.assignedAt,
    reviewStartedAt: next.reviewStatus === propertyReviewStatuses.inReview ? now : item.reviewStartedAt,
    reviewCompletedAt: next.reviewStatus === propertyReviewStatuses.reviewComplete ? now : item.reviewCompletedAt,
    lastUpdatedAt: now,
    executionStatus: propertyReviewerExecutionStatuses.notExecuted
  };
  const event = createPropertyReviewAuditEvent({
    auditEventId: `audit_${item.queueItemId}_${next.eventType || "transition"}_${updated.auditPreview.length + 1}`,
    eventType: next.eventType || propertyReviewAuditEvents.reviewStarted,
    queueItemId: item.queueItemId,
    handoffId: item.handoffId,
    packageId: item.packageId,
    previousAssignmentStatus: item.assignmentStatus,
    nextAssignmentStatus: updated.assignmentStatus,
    previousReviewStatus: item.reviewStatus,
    nextReviewStatus: updated.reviewStatus,
    reviewerRole: updated.targetRole,
    reviewerId: updated.assignedReviewerId,
    timestamp: now
  });
  updated.auditPreview = [...(item.auditPreview || []), event];
  return { ok: true, item: updated, validation };
}

export function buildPropertyReviewWorkflowViewModel({
  ingestionReviewViewModel = buildPropertyIngestionReviewViewModel(),
  selectedQueueItemId = null,
  filters = {},
  overrides = {}
} = {}) {
  const localOverrides = { ...fixtureOverrides(), ...overrides };
  const queue = ingestionReviewViewModel.queue
    .map((reviewItem) => baseQueueItemFromReviewItem(reviewItem, localOverrides[reviewItem.ingestionId] || {}));
  const filteredQueue = applyWorkflowFilters(queue, filters);
  const selected = filteredQueue.find((item) => item.queueItemId === selectedQueueItemId) || filteredQueue[0] || null;
  return {
    modelType: "PropertyReviewWorkflowViewModel",
    accessBoundary: "INTERNAL / ADMIN / LOCAL PROOF",
    workflowBanner: "REVIEW WORKFLOW ONLY - PROPERTY EXECUTION DISABLED",
    queue,
    filteredQueue,
    selected,
    filters: clone(filters),
    assignmentStatuses: clone(propertyReviewAssignmentStatuses),
    reviewStatuses: clone(propertyReviewStatuses),
    priorities: clone(propertyReviewPriorities),
    targetRoles: clone(propertyReviewHandoffTargetRoles),
    evidenceRequestTypes: clone(propertyEvidenceRequestTypes),
    summary: {
      total: queue.length,
      unassigned: queue.filter((item) => item.assignmentStatus === propertyReviewAssignmentStatuses.unassigned).length,
      assigned: queue.filter((item) => item.assignmentStatus === propertyReviewAssignmentStatuses.assigned).length,
      inReview: queue.filter((item) => item.reviewStatus === propertyReviewStatuses.inReview).length,
      waitingForEvidence: queue.filter((item) => item.reviewStatus === propertyReviewStatuses.waitingForEvidence).length,
      reviewComplete: queue.filter((item) => item.reviewStatus === propertyReviewStatuses.reviewComplete).length,
      highPriority: queue.filter((item) => [propertyReviewPriorities.high, propertyReviewPriorities.urgentReview].includes(item.priority)).length,
      executionPerformed: 0
    },
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

export function buildPropertyReviewerInbox({
  workflowViewModel = buildPropertyReviewWorkflowViewModel(),
  filters = {}
} = {}) {
  const items = applyWorkflowFilters(workflowViewModel.queue, filters);
  return {
    ...clone(propertyReviewerInboxContract),
    filters: clone(filters),
    items,
    boundedCaseSummaries: items.map((item) => ({
      queueItemId: item.queueItemId,
      packageId: item.packageId,
      packageVersion: item.packageVersion,
      propertyId: item.canonicalPropertyId,
      source: item.sourceSummary?.sourceName || item.sourceSummary?.sourceType || "MISSING",
      reviewType: item.requestedReviewType,
      packageStatus: item.packageReadiness,
      priority: item.priority,
      assignment: `${item.assignmentStatus}${item.assignedReviewerId ? ` / ${item.assignedReviewerId}` : ""}`,
      reviewStatus: item.reviewStatus,
      hasConflict: item.conflictFlags.length > 0,
      hasGaps: item.gapFlags.length > 0,
      professionalReviewRequirement: item.professionalReviewRequirements.join(", "),
      currentReviewerDecision: item.reviewerDecision
        ? `${item.reviewerDecision.decisionType} / ${item.reviewerDecision.decisionStatus}`
        : "NO REVIEWER DECISION RECORDED",
      execution: propertyReviewerExecutionStatuses.notExecuted
    })),
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0
  };
}

export function buildBoundedPropertyReviewWorkflowContext(viewModel = buildPropertyReviewWorkflowViewModel()) {
  const selected = viewModel.selected || {};
  const boundedContext = buildContextPackage({
    intent: "property_review_workflow_internal",
    maxItems: 4,
    maxChars: 1800,
    memoryItems: [
      {
        id: "review_workflow_selected",
        text: JSON.stringify({
          queueItemId: selected.queueItemId,
          packageId: selected.packageId,
          assignmentStatus: selected.assignmentStatus,
          reviewStatus: selected.reviewStatus,
          priority: selected.priority,
          reviewerDecision: selected.reviewerDecision,
          executionStatus: selected.executionStatus
        }),
        relevance: 1,
        source: "PropertyReviewWorkflow"
      },
      {
        id: "review_package_link",
        text: JSON.stringify({
          packageId: selected.packageId,
          packageVersion: selected.packageVersion,
          packageReadiness: selected.packageReadiness,
          professionalReviewRequirements: selected.professionalReviewRequirements
        }),
        relevance: 0.94,
        source: "PropertyReviewCasePackage"
      },
      {
        id: "evidence_requests",
        text: JSON.stringify(selected.evidenceRequests || []),
        relevance: 0.9,
        source: "PropertyEvidenceRequest"
      }
    ]
  });
  return {
    intent: "PROPERTY_REVIEW_WORKFLOW_INTERNAL",
    accessBoundary: viewModel.accessBoundary,
    selectedQueueItemId: selected.queueItemId || null,
    boundedContext,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function createLisaPropertyReviewWorkflowExplanation(viewModel = buildPropertyReviewWorkflowViewModel()) {
  const selected = viewModel.selected || {};
  const blockers = [
    selected.conflictFlags?.length ? `conflicts: ${selected.conflictFlags.join(", ")}` : "",
    selected.gapFlags?.length ? `gaps: ${selected.gapFlags.join(", ")}` : "",
    selected.reviewStatus === propertyReviewStatuses.blocked ? "review is blocked" : ""
  ].filter(Boolean);
  return {
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    accessBoundary: viewModel.accessBoundary,
    queueItemId: selected.queueItemId || null,
    explanation: [
      `There are ${viewModel.summary.total} local review workflow case(s); ${viewModel.summary.unassigned} are unassigned and ${viewModel.summary.waitingForEvidence} are waiting for evidence.`,
      selected.queueItemId ? `Selected case ${selected.queueItemId} is ${selected.assignmentStatus} and ${selected.reviewStatus}.` : "No selected case.",
      selected.priority ? `Priority is ${selected.priority}; it is operational review priority only, not a property, fraud, investment or risk score.` : "",
      blockers.length ? `Current blockers: ${blockers.join("; ")}.` : "No workflow blocker is selected.",
      selected.reviewerDecision ? `Recorded decision: ${selected.reviewerDecision.decisionType} / ${selected.reviewerDecision.decisionStatus}.` : "No reviewer decision is linked for the selected case.",
      selected.reviewStatus === propertyReviewStatuses.reviewComplete ? "Review complete means the workflow review is complete only." : "",
      "Review workflow and Property execution are separate.",
      "Nothing has been merged, published, restored from quarantine, written to production, paid, booked or transacted."
    ].filter(Boolean).join(" "),
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}
