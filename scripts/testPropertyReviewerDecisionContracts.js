import assert from "assert";
import fs from "fs";
import {
  blockPropertyReviewerDecisionExecution,
  buildPropertyIngestionReviewViewModel,
  buildPropertyReviewerDecisionAuditTrail,
  createPropertyReviewerDecision,
  createSuggestedPropertyReviewerDecision,
  createSupersedingPropertyReviewerDecision,
  forbiddenPropertyReviewerDecisionTypes,
  getAllowedPropertyReviewerDecisionTypes,
  propertyReviewerDecisionCompatibilityMatrix,
  propertyReviewerDecisionContract,
  propertyReviewerDecisionFixtureList,
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  propertyReviewerExecutionStatuses,
  propertyReviewerReasonCodes,
  propertyReviewerRoles,
  validatePropertyReviewerDecision
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

const viewModel = buildPropertyIngestionReviewViewModel();
const exact = viewModel.queue.find((item) => item.ingestionId === "ingest_agency_listing_tower_b_0501");
const duplicate = viewModel.queue.find((item) => item.ingestionId === "ingest_duplicate_partner_tower_b_0501");
const conflict = viewModel.queue.find((item) => item.ingestionId === "ingest_agency_listing_tower_b_0501_price_130000");
const quarantine = viewModel.queue.find((item) => item.ingestionId === "ingest_invalid_negative_area");
const gaps = viewModel.queue.find((item) => item.ingestionId === "ingest_manual_gap_record_city_missing");
const owner = viewModel.queue.find((item) => item.ingestionId === "ingest_owner_sub_batumi_0707");

assert.equal(propertyReviewerDecisionContract.modelType, "PropertyReviewerDecision");
assert.equal(propertyReviewerDecisionContract.executionStatus, propertyReviewerExecutionStatuses.notExecuted);
assert.ok(["decisionId", "ingestionId", "sourceRecordId", "decisionType", "reviewerRole", "reviewerId", "reasonCode", "rationale", "evidenceRefs", "warningsAcknowledged", "createdAt", "decisionStatus", "executionStatus", "supersedesDecisionId", "auditMetadata"]
  .every((key) => Object.prototype.hasOwnProperty.call(propertyReviewerDecisionContract, key)));
pass("A reviewer decision contract has required fields", propertyReviewerDecisionContract);

assert.ok(Object.values(propertyReviewerDecisionTypes).includes("CONFIRM_EXACT_MATCH"));
assert.ok(!Object.values(propertyReviewerDecisionTypes).some((type) => forbiddenPropertyReviewerDecisionTypes.includes(type)));
pass("B decision types exclude executable commands", propertyReviewerDecisionTypes);

assert.deepEqual(Object.values(propertyReviewerDecisionStatuses), [
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED_AS_DECISION",
  "REJECTED_AS_DECISION",
  "SUPERSEDED",
  "CANCELLED"
]);
pass("C status model is decision-only and execution stays separate", propertyReviewerDecisionStatuses);

assert.ok(Object.values(propertyReviewerReasonCodes).includes("CONFLICTING_PRICE"));
assert.ok(Object.values(propertyReviewerReasonCodes).includes("INSUFFICIENT_EVIDENCE"));
pass("D reason codes are structured", propertyReviewerReasonCodes);

assert.ok(propertyReviewerDecisionCompatibilityMatrix.EXACT_MATCH.includes(propertyReviewerDecisionTypes.confirmExactMatch));
assert.ok(propertyReviewerDecisionCompatibilityMatrix.QUARANTINED.includes(propertyReviewerDecisionTypes.keepInQuarantine));
assert.ok(!propertyReviewerDecisionCompatibilityMatrix.QUARANTINED.includes(propertyReviewerDecisionTypes.confirmExactMatch));
pass("E compatibility matrix allows only state-compatible decisions", propertyReviewerDecisionCompatibilityMatrix);

assert.ok(exact.decisionDraft.evidenceRefs.length >= 4);
assert.ok(exact.decisionDraftValidation.ok);
pass("F decision draft has evidence context and validates", exact.decisionDraft);

const missingEvidence = createPropertyReviewerDecision({
  ...exact.decisionDraft,
  decisionId: "decision_missing_evidence",
  evidenceRefs: []
});
assert.ok(validatePropertyReviewerDecision(missingEvidence, exact).errors.includes("evidence_refs_required"));
pass("G evidence requirement rejects empty evidence", validatePropertyReviewerDecision(missingEvidence, exact));

const missingReviewer = createPropertyReviewerDecision({
  ...exact.decisionDraft,
  decisionId: "decision_missing_reviewer",
  reviewerId: ""
});
assert.ok(validatePropertyReviewerDecision(missingReviewer, exact).errors.includes("reviewer_identity_required"));
pass("H reviewer identity is required", validatePropertyReviewerDecision(missingReviewer, exact));

const invalidQuarantineDecision = propertyReviewerDecisionFixtureList.find((decision) => decision.decisionId === "decision_invalid_quarantine_exact_match");
const invalidResult = validatePropertyReviewerDecision(invalidQuarantineDecision, quarantine);
assert.ok(!invalidResult.ok);
assert.ok(invalidResult.errors.includes("decision_type_not_allowed_for_review_state"));
pass("I incompatible decision is blocked", invalidResult);

const providerApproval = createPropertyReviewerDecision({
  ...exact.decisionDraft,
  decisionId: "decision_provider_approval_attempt",
  decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision,
  auditMetadata: { actorType: "PROVIDER" }
});
assert.ok(validatePropertyReviewerDecision(providerApproval, exact).errors.includes("ai_or_provider_cannot_approve_reviewer_decision"));
pass("J provider cannot approve reviewer decision", validatePropertyReviewerDecision(providerApproval, exact));

const aiSuggestion = createSuggestedPropertyReviewerDecision({
  ...exact.decisionDraft,
  decisionId: "decision_ai_suggestion_only",
  decisionStatus: propertyReviewerDecisionStatuses.approvedAsDecision
});
assert.equal(aiSuggestion.decisionStatus, propertyReviewerDecisionStatuses.draft);
assert.equal(aiSuggestion.auditMetadata.actorType, "AI_SUGGESTION_NOT_APPROVAL");
pass("K AI suggestion is not approved decision", aiSuggestion);

const exactConfirm = propertyReviewerDecisionFixtureList.find((decision) => decision.decisionId === "decision_exact_confirm_agency_0501");
const auditTrail = buildPropertyReviewerDecisionAuditTrail([exactConfirm]);
assert.ok(auditTrail.length >= 3);
assert.ok(auditTrail.every((record) => record.appendOnly && record.executionStatus === propertyReviewerExecutionStatuses.notExecuted));
pass("L decision audit is append-only and non-executing", auditTrail);

const supersession = createSupersedingPropertyReviewerDecision(
  propertyReviewerDecisionFixtureList.find((decision) => decision.decisionId === "decision_superseded_previous_owner_0707"),
  propertyReviewerDecisionFixtureList.find((decision) => decision.decisionId === "decision_superseding_accept_owner_0707")
);
assert.equal(supersession.previousDecision.decisionStatus, propertyReviewerDecisionStatuses.superseded);
assert.equal(supersession.currentDecision.supersedesDecisionId, "decision_superseded_previous_owner_0707");
assert.ok(owner.decisionHistory.some((decision) => decision.decisionStatus === propertyReviewerDecisionStatuses.superseded));
pass("M supersession preserves previous decision and creates current decision", supersession);

const guard = blockPropertyReviewerDecisionExecution(exactConfirm);
assert.equal(guard.status, "EXECUTION_LAYER_NOT_ACTIVE_PHASE_22J");
assert.equal(guard.mergeActions, 0);
assert.equal(guard.publishActions, 0);
assert.equal(guard.quarantineMutations, 0);
pass("N execution guard blocks decision execution", guard);

const decisionSource = fs.readFileSync("src/property/propertyReviewerDecision.js", "utf8");
assert.ok(!decisionSource.includes("createClient("));
assert.ok(!decisionSource.includes("supabase."));
assert.ok(!decisionSource.includes("axios."));
assert.ok(!decisionSource.includes("fetch("));
assert.ok(!decisionSource.includes("executeMerge"));
assert.ok(!decisionSource.includes("publishListing"));
pass("O no execution/provider/database import path exists in decision module");

assert.ok(getAllowedPropertyReviewerDecisionTypes(conflict).includes(propertyReviewerDecisionTypes.acknowledgeConflict));
assert.ok(getAllowedPropertyReviewerDecisionTypes(quarantine).includes(propertyReviewerDecisionTypes.keepInQuarantine));
assert.ok(getAllowedPropertyReviewerDecisionTypes(gaps).includes(propertyReviewerDecisionTypes.requestMoreEvidence));
pass("P allowed decision options attach to review states", {
  exact: exact.availableDecisionTypes,
  conflict: conflict.availableDecisionTypes,
  quarantine: quarantine.availableDecisionTypes,
  gaps: gaps.availableDecisionTypes
});

assert.ok(viewModel.decisionSummary.totalDecisions >= 7);
assert.equal(viewModel.decisionSummary.executionPerformed, 0);
assert.equal(viewModel.decisionSummary.mergeActions, 0);
assert.equal(viewModel.decisionSummary.publishActions, 0);
assert.equal(viewModel.decisionSummary.quarantineMutations, 0);
pass("Q review view model exposes decision summary with zero mutation actions", viewModel.decisionSummary);

const filteredByDecision = buildPropertyIngestionReviewViewModel({
  filters: { decisionType: propertyReviewerDecisionTypes.requestMoreEvidence }
});
assert.ok(filteredByDecision.filteredQueue.length >= 1);
assert.ok(filteredByDecision.filteredQueue.every((item) => item.currentDecision?.decisionType === propertyReviewerDecisionTypes.requestMoreEvidence));
pass("R decision filters work", filteredByDecision.filteredQueue.map((item) => item.ingestionId));

const lisaView = buildPropertyIngestionReviewViewModel({
  selectedIngestionId: conflict.ingestionId
});
assert.ok(lisaView.selected.decisionHistory.length >= 1);
assert.ok(lisaView.selected.decisionExecutionGuard.message.includes("Phase 22J records review decisions only"));
pass("S Lisa/internal context has decision history and no-execution guard", {
  history: lisaView.selected.decisionHistory,
  guard: lisaView.selected.decisionExecutionGuard
});

assert.equal(viewModel.providerCalls, 0);
assert.equal(viewModel.externalCalls, 0);
assert.equal(viewModel.dbMutations, 0);
assert.equal(viewModel.payments, 0);
assert.equal(viewModel.bookingActions, 0);
assert.equal(viewModel.transactionActions, 0);
assert.ok(viewModel.queue.every((item) => item.decisionExecutionGuard.providerCalls === 0));
pass("T provider/external/db/payment/booking/transaction remain zero");

assert.ok(duplicate.currentDecision);
assert.ok(quarantine.currentDecision);
assert.ok(gaps.currentDecision);
pass("U local decision fixtures A-G are connected", propertyReviewerDecisionFixtureList.map((decision) => ({
  decisionId: decision.decisionId,
  ingestionId: decision.ingestionId,
  decisionType: decision.decisionType,
  decisionStatus: decision.decisionStatus
})));

const ui = fs.readFileSync("workspace/modules/propertyIngestionReviewUi.js", "utf8");
assert.ok(ui.includes("Available Decision Options"));
assert.ok(ui.includes("Decision Draft"));
assert.ok(ui.includes("Decision History"));
assert.ok(ui.includes("EXECUTION LAYER - NOT ACTIVE"));
assert.ok(ui.includes("DECISION RECORDED - NO PROPERTY MUTATION PERFORMED"));
pass("V UI decision state and history surfaces are wired");

console.log("Property reviewer decision contract tests passed.");
