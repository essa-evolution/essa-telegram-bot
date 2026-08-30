import assert from "assert";
import fs from "fs";
import {
  applyPropertyReviewWorkflowTransition,
  buildPropertyReviewerInbox,
  buildPropertyReviewWorkflowViewModel,
  classifyPropertyReviewPriority,
  createLisaPropertyReviewWorkflowExplanation,
  createPropertyEvidenceRequest,
  createPropertyReviewAssignment,
  localPropertyReviewerIdentities,
  propertyEvidenceRequestStatuses,
  propertyEvidenceRequestTypes,
  propertyReviewAssignmentContract,
  propertyReviewAssignmentStatuses,
  propertyReviewAuditEvents,
  propertyReviewHandoffQueueItemContract,
  propertyReviewPriorities,
  propertyReviewStatuses,
  propertyReviewWorkflowTransitionMatrix,
  validatePropertyReviewWorkflowTransition
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

const viewModel = buildPropertyReviewWorkflowViewModel();
const unassigned = viewModel.queue.find((item) => item.fixtureId === "A");
const assigned = viewModel.queue.find((item) => item.fixtureId === "B");
const compliance = viewModel.queue.find((item) => item.fixtureId === "C");
const waiting = viewModel.queue.find((item) => item.fixtureId === "D");
const superseded = viewModel.queue.find((item) => item.fixtureId === "E");
const quarantine = viewModel.queue.find((item) => item.fixtureId === "F");
const complete = viewModel.queue.find((item) => item.fixtureId === "G");
const returned = viewModel.queue.find((item) => item.fixtureId === "H");

assert.equal(propertyReviewHandoffQueueItemContract.modelType, "PropertyReviewHandoffQueueItem");
assert.equal(propertyReviewHandoffQueueItemContract.executionStatus, "NOT_EXECUTED");
assert.ok(["queueItemId", "handoffId", "packageId", "packageVersion", "ingestionId", "canonicalPropertyId", "targetRole", "assignedReviewerId", "assignmentStatus", "reviewStatus", "priority", "requestedReviewType", "packageReadiness", "professionalReviewRequirements", "conflictFlags", "gapFlags", "createdAt", "assignedAt", "reviewStartedAt", "reviewCompletedAt", "lastUpdatedAt", "auditRefs", "executionStatus"]
  .every((key) => Object.prototype.hasOwnProperty.call(propertyReviewHandoffQueueItemContract, key)));
pass("A queue item contract has required fields", propertyReviewHandoffQueueItemContract);

assert.equal(propertyReviewAssignmentContract.modelType, "PropertyReviewAssignment");
assert.equal(propertyReviewAssignmentContract.auditMetadata.localOnly, true);
assert.equal(propertyReviewAssignmentContract.auditMetadata.dbMutations, 0);
const assignment = createPropertyReviewAssignment({
  assignmentId: "assignment_test_001",
  queueItemId: unassigned.queueItemId,
  reviewerId: localPropertyReviewerIdentities.propertyReviewer,
  assignedAt: "2026-08-21T00:00:00.000Z"
});
assert.equal(assignment.reviewerId, "reviewer_property_001");
pass("B assignment contract is local-only", assignment);

assert.deepEqual(Object.values(propertyReviewAssignmentStatuses), ["UNASSIGNED", "ASSIGNED", "ACCEPTED_BY_REVIEWER", "RETURNED_TO_QUEUE", "CLOSED"]);
pass("C assignment states are workflow-only", propertyReviewAssignmentStatuses);

assert.deepEqual(Object.values(propertyReviewStatuses), ["NOT_STARTED", "IN_REVIEW", "WAITING_FOR_EVIDENCE", "DECISION_RECORDED", "BLOCKED", "REVIEW_COMPLETE"]);
assert.equal(complete.reviewStatus, propertyReviewStatuses.reviewComplete);
assert.equal(complete.executionStatus, "NOT_EXECUTED");
pass("D review status model separates review complete from execution", { statuses: propertyReviewStatuses, complete });

assert.equal(classifyPropertyReviewPriority(quarantine), propertyReviewPriorities.urgentReview);
assert.equal(classifyPropertyReviewPriority(compliance), propertyReviewPriorities.high);
assert.equal(classifyPropertyReviewPriority(complete), propertyReviewPriorities.low);
pass("E priority model is deterministic operational routing only", {
  quarantine: quarantine.priority,
  compliance: compliance.priority,
  complete: complete.priority
});

const inbox = buildPropertyReviewerInbox({
  workflowViewModel: viewModel,
  filters: { reviewerId: localPropertyReviewerIdentities.propertyReviewer }
});
assert.ok(inbox.boundedCaseSummaries.length >= 1);
assert.ok(!JSON.stringify(inbox).includes("rawPayload"));
assert.equal(inbox.executionStatus, "NOT_EXECUTED");
pass("F reviewer inbox returns bounded summaries", inbox.boundedCaseSummaries);

const filteredByRole = buildPropertyReviewWorkflowViewModel({ filters: { reviewerRole: "PROPERTY_COMPLIANCE" } });
assert.ok(filteredByRole.filteredQueue.length >= 1);
assert.ok(filteredByRole.filteredQueue.every((item) => item.targetRole === "PROPERTY_COMPLIANCE"));
const filteredByStatus = buildPropertyReviewWorkflowViewModel({ filters: { reviewStatus: propertyReviewStatuses.waitingForEvidence } });
assert.ok(filteredByStatus.filteredQueue.every((item) => item.reviewStatus === propertyReviewStatuses.waitingForEvidence));
pass("G queue filters work for role and status", {
  role: filteredByRole.filteredQueue.map((item) => item.queueItemId),
  status: filteredByStatus.filteredQueue.map((item) => item.queueItemId)
});

assert.ok(propertyReviewWorkflowTransitionMatrix.assignment.UNASSIGNED.includes("ASSIGNED"));
assert.ok(propertyReviewWorkflowTransitionMatrix.review.IN_REVIEW.includes("WAITING_FOR_EVIDENCE"));
assert.ok(!propertyReviewWorkflowTransitionMatrix.review.NOT_STARTED.includes("REVIEW_COMPLETE"));
pass("H transition matrix is explicit", propertyReviewWorkflowTransitionMatrix);

const invalid = validatePropertyReviewWorkflowTransition(unassigned, { reviewStatus: propertyReviewStatuses.reviewComplete });
assert.ok(!invalid.ok);
assert.ok(invalid.errors.includes("review_transition_not_allowed"));
pass("I invalid direct completion is rejected", invalid);

const assignedResult = applyPropertyReviewWorkflowTransition(unassigned, {
  assignmentStatus: propertyReviewAssignmentStatuses.assigned,
  assignedReviewerId: localPropertyReviewerIdentities.propertyReviewer,
  eventType: propertyReviewAuditEvents.reviewAssigned
});
assert.ok(assignedResult.ok);
assert.equal(assignedResult.item.assignmentStatus, propertyReviewAssignmentStatuses.assigned);
assert.equal(assignedResult.item.auditPreview.at(-1).eventType, propertyReviewAuditEvents.reviewAssigned);
pass("J assignment transition appends audit event", assignedResult.item.auditPreview.at(-1));

const evidenceRequest = createPropertyEvidenceRequest({
  requestId: "evidence_request_test_001",
  packageId: waiting.packageId,
  requestedBy: localPropertyReviewerIdentities.propertyReviewer,
  evidenceType: propertyEvidenceRequestTypes.ownershipDocument,
  reasonCode: "OWNERSHIP_EVIDENCE_REQUIRED",
  requestedAt: "2026-08-21T00:00:00.000Z",
  status: propertyEvidenceRequestStatuses.waiting
});
assert.equal(evidenceRequest.externalMessageSent, false);
assert.equal(evidenceRequest.externalCalls, 0);
assert.equal(waiting.reviewStatus, propertyReviewStatuses.waitingForEvidence);
pass("K evidence request contract and waiting state are local", evidenceRequest);

assert.ok(unassigned.package?.modelType === "PropertyReviewCasePackage");
assert.equal(unassigned.packageId, unassigned.package.packageId);
pass("L case package linkage reuses Phase 22K package", { queueItemId: unassigned.queueItemId, packageId: unassigned.packageId });

assert.ok(superseded.decisionHistory.some((decision) => decision.decisionStatus === "SUPERSEDED"));
assert.ok(superseded.reviewerDecision?.supersededVisible);
pass("M decision linkage preserves superseded decision visibility", superseded.reviewerDecision);

const completeValidation = validatePropertyReviewWorkflowTransition({
  ...superseded,
  reviewStatus: propertyReviewStatuses.decisionRecorded
}, { reviewStatus: propertyReviewStatuses.reviewComplete });
assert.ok(completeValidation.ok);
pass("N review completion validates only after decision recorded", completeValidation);

assert.ok(viewModel.queue.every((item) => item.auditPreview.length >= 2));
assert.ok(viewModel.queue.every((item) => item.auditPreview.every((event) => event.appendOnly && event.executionStatus === "NOT_EXECUTED")));
pass("O audit preview is append-only and non-executing", viewModel.queue.map((item) => ({ queueItemId: item.queueItemId, events: item.auditPreview.length })));

const lisa = createLisaPropertyReviewWorkflowExplanation(buildPropertyReviewWorkflowViewModel({ selectedQueueItemId: compliance.queueItemId }));
assert.ok(lisa.explanation.includes("Review workflow and Property execution are separate"));
assert.equal(lisa.providerCalls, 0);
pass("P Lisa internal guide separates workflow from execution", lisa);

assert.ok([unassigned, assigned, compliance, waiting, superseded, quarantine, complete, returned].every(Boolean));
pass("Q local fixtures A-H exist", viewModel.queue.map((item) => ({ fixtureId: item.fixtureId, fixtureLabel: item.fixtureLabel, queueItemId: item.queueItemId })));

assert.equal(viewModel.providerCalls, 0);
assert.equal(viewModel.externalCalls, 0);
assert.equal(viewModel.dbMutations, 0);
assert.equal(viewModel.mergeActions, 0);
assert.equal(viewModel.publishActions, 0);
assert.equal(viewModel.quarantineMutations, 0);
assert.equal(viewModel.payments, 0);
assert.equal(viewModel.bookingActions, 0);
assert.equal(viewModel.transactionActions, 0);
assert.ok(viewModel.queue.every((item) => item.executionStatus === "NOT_EXECUTED"));
pass("R local workflow state mutation only and all side-effect counters remain zero", viewModel.summary);

const source = fs.readFileSync("src/property/propertyReviewWorkflow.js", "utf8");
assert.ok(!source.includes("createClient("));
assert.ok(!source.includes("supabase."));
assert.ok(!source.includes("axios."));
assert.ok(!source.includes("fetch("));
assert.ok(!source.includes("executeMerge"));
assert.ok(!source.includes("publishListing"));
assert.ok(!source.includes("sendMail"));
pass("S no provider/database/execution dispatch path exists in workflow module");

const ui = fs.readFileSync("workspace/modules/propertyReviewQueueUi.js", "utf8");
assert.ok(ui.includes("REVIEW WORKFLOW ONLY - PROPERTY EXECUTION DISABLED"));
assert.ok(ui.includes("Review Queue Filters"));
assert.ok(ui.includes("My Review Inbox"));
assert.ok(ui.includes("Evidence Requests"));
assert.ok(ui.includes("Navigator Internal Routing"));
pass("T internal review UI surfaces are wired");

assert.equal(returned.assignmentStatus, propertyReviewAssignmentStatuses.returnedToQueue);
assert.equal(returned.reviewStatus, propertyReviewStatuses.notStarted);
pass("U returned-to-queue case remains workflow-only", returned);

console.log("Property review workflow tests passed.");
