import assert from "assert";
import fs from "fs";
import {
  buildPropertyExecutionHistoryFixtures,
  buildPropertyExecutionDetailViewModel,
  createPropertyExecutionHistoryViewModel,
  createLisaPropertyExecutionHistoryExplanation,
  filterPropertyExecutionHistory,
  inspectPropertyExecutionApproval,
  propertyExecutionActionTypes,
  propertyExecutionStatuses
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

const fixtures = buildPropertyExecutionHistoryFixtures();
assert.equal(fixtures.items.length, 10);
assert.ok(fixtures.items.every((item) => item.modelType === "PropertyExecutionHistoryItem"));
assert.ok(fixtures.items.every((item) => item.actionType === propertyExecutionActionTypes.applyConfirmedExactMatch || item.executionStatus === "REVIEW_COMPLETE_NO_EXECUTION"));
pass("A execution history items cover local fixtures A-J", fixtures.items.map((item) => `${item.label}:${item.executionStatus}`));

const verified = fixtures.items.find((item) => item.label === "A_VERIFIED");
assert.equal(verified.executionStatus, propertyExecutionStatuses.verified);
assert.equal(verified.sideEffectCounters.providerCalls, 0);
assert.equal(verified.sideEffectCounters.productionDbMutations, 0);
pass("B verified history item exposes required fields", verified);

const detail = buildPropertyExecutionDetailViewModel(verified);
["intent", "eligibility", "reviewerDecision", "casePackage", "preflight", "approval", "gateway", "beforeState", "changeScope", "afterState", "verification", "rollback", "audit", "sideEffects"].forEach((key) => {
  assert.ok(Object.prototype.hasOwnProperty.call(detail.sections, key));
});
pass("C execution detail view contains all required sections", Object.keys(detail.sections));

const approval = inspectPropertyExecutionApproval({ ...verified, approval: fixtures.detailInputs.verified.approval });
assert.equal(approval.rawTokenMaterialShown, false);
assert.ok(approval.approvalTokenReference.tokenRef);
assert.equal(approval.approvedAction, propertyExecutionActionTypes.applyConfirmedExactMatch);
pass("D approval inspection is bounded and token-safe", approval);

assert.equal(detail.sections.reviewerDecision.controlPoint, "REVIEWER DECISION");
assert.equal(detail.sections.approval.modelType, "PropertyExecutionApprovalInspection");
pass("E reviewer decision and execution approval are separate control points");

assert.ok(detail.sections.audit.length >= 6);
assert.deepEqual(detail.sections.audit.map((event) => event.order), detail.sections.audit.map((_, index) => index + 1));
pass("F execution timeline is append ordered", detail.sections.audit.map((event) => event.eventType));

assert.ok(detail.sections.changeScope.before.includes("no applied canonical association"));
assert.ok(detail.sections.changeScope.after.includes(verified.canonicalPropertyId));
assert.ok(detail.sections.changeScope.unchanged.includes("ownership"));
pass("G before/after diff shows only canonical-resolution association", detail.sections.changeScope);

const blocked = filterPropertyExecutionHistory(fixtures.items, { blockedOnly: true });
assert.ok(blocked.some((item) => item.executionStatus === "BLOCKED_DECISION"));
assert.ok(blocked.some((item) => item.executionStatus === "BLOCKED_CONFLICT"));
assert.ok(blocked.some((item) => item.executionStatus === "BLOCKED_STATE_MISMATCH"));
pass("H blocked records are inspectable", blocked.map((item) => item.label));

assert.ok(fixtures.items.some((item) => item.executionStatus === propertyExecutionStatuses.failed));
assert.ok(fixtures.items.some((item) => item.executionStatus === propertyExecutionStatuses.rolledBack));
assert.ok(fixtures.items.some((item) => item.executionStatus === propertyExecutionStatuses.alreadyAppliedIdempotent));
pass("I failed, rollback and idempotent outcomes are represented");

const broken = fixtures.items.find((item) => item.label === "I_BROKEN_LINKAGE");
assert.equal(buildPropertyExecutionDetailViewModel(broken).integrity.status, "INTEGRITY_WARNING");
pass("J broken linkage yields integrity warning");

assert.equal(filterPropertyExecutionHistory(fixtures.items, { verifiedOnly: true }).length, 2);
assert.equal(filterPropertyExecutionHistory(fixtures.items, { failedOnly: true }).length, 1);
assert.ok(filterPropertyExecutionHistory(fixtures.items, { hasRollback: true }).every((item) => item.rollbackStatus === propertyExecutionStatuses.rolledBack));
pass("K filters work for verified/failed/rollback");

const lisa = createLisaPropertyExecutionHistoryExplanation(verified);
assert.equal(lisa.mayApproveExecution, false);
assert.ok(lisa.explanation.includes("Provider calls"));
pass("L Lisa internal guide explains history without approving", lisa);

const vm = createPropertyExecutionHistoryViewModel();
assert.equal(vm.route, "#property-execution-history");
assert.equal(vm.navigatorRoute, "Покажи историю исполнения Property");
assert.equal(vm.newExecutionActionTypes, 0);
pass("M history view model exposes internal route and Navigator routing", { route: vm.route, navigator: vm.navigatorRoute });

const ui = fs.readFileSync("workspace/modules/propertyExecutionProofUi.js", "utf8");
assert.ok(ui.includes("renderPropertyExecutionHistoryUi"));
assert.ok(ui.includes("WHY WAS THIS APPROVED?"));
assert.ok(ui.includes("INTERNAL EXECUTION HISTORY / APPROVAL INSPECTION / AUDIT CONSOLE"));
assert.ok(!ui.includes("executeAtomicAssociationCommit"));
pass("N history UI is read-only and does not expose direct executor");

const reviewQueue = fs.readFileSync("workspace/modules/propertyReviewQueueUi.js", "utf8");
assert.ok(reviewQueue.includes("VIEW EXECUTION HISTORY"));
assert.ok(reviewQueue.includes("#property-execution-history"));
pass("O review queue links to execution history");

const app = fs.readFileSync("workspace/app.js", "utf8");
assert.ok(app.includes("#property-execution-history"));
assert.ok(app.includes("renderPropertyExecutionHistoryUi"));
pass("P app route is wired");

assert.equal(fixtures.providerCalls, 0);
assert.equal(fixtures.externalCalls, 0);
assert.equal(fixtures.productionDbMutations, 0);
assert.ok(fixtures.items.every((item) => item.sideEffectCounters.ownershipMutations === 0));
assert.ok(fixtures.items.every((item) => item.sideEffectCounters.publishActions === 0));
assert.ok(fixtures.items.every((item) => item.sideEffectCounters.paymentActions === 0));
pass("Q all forbidden side-effect counters remain zero");

console.log("Property execution history tests passed.");
