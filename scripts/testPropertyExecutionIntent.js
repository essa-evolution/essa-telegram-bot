import assert from "assert";
import fs from "fs";
import {
  buildPropertyExecutionProofFixtures,
  buildPropertyIngestionReviewViewModel,
  createExplicitLocalPropertyExecutionApproval,
  createLocalPropertyExecutionStore,
  createPropertyExecutionIntent,
  createPropertyExecutionPreview,
  evaluatePropertyExecutionEligibility,
  executePropertyExecutionIntentThroughGateway,
  preflightPropertyExecutionIntent,
  propertyExecutionActionTypes,
  propertyExecutionPreflightStatuses,
  propertyExecutionStatuses,
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  rollbackPropertyExecutionLocalProof
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

function itemFor(ingestionId) {
  const vm = buildPropertyIngestionReviewViewModel({ selectedIngestionId: ingestionId });
  return vm.queue.find((item) => item.ingestionId === ingestionId);
}

const exact = itemFor("ingest_agency_listing_tower_b_0501");
const created = createPropertyExecutionIntent({ item: exact });
assert.ok(created.ok);
assert.equal(created.intent.modelType, "PropertyExecutionIntent");
assert.equal(created.intent.actionType, propertyExecutionActionTypes.applyConfirmedExactMatch);
assert.equal(created.intent.preflightStatus, propertyExecutionPreflightStatuses.readyForApproval);
pass("A PropertyExecutionIntent contract created for exact approved decision", created.intent);

const wrongAction = createPropertyExecutionIntent({ item: exact, actionType: "MERGE_PROPERTIES" });
assert.equal(wrongAction.preflightStatus, propertyExecutionPreflightStatuses.blockedDecision);
pass("B only APPLY_CONFIRMED_EXACT_MATCH is allowed", wrongAction);

const noDecision = evaluatePropertyExecutionEligibility({ item: { ...exact, currentDecision: null } });
assert.equal(noDecision.preflightStatus, propertyExecutionPreflightStatuses.blockedDecision);
pass("C blocked fixture A no reviewer decision", noDecision.reason);

const draftDecision = { ...exact.currentDecision, decisionStatus: propertyReviewerDecisionStatuses.draft };
assert.equal(evaluatePropertyExecutionEligibility({ item: { ...exact, currentDecision: draftDecision } }).preflightStatus, propertyExecutionPreflightStatuses.blockedDecision);
pass("D blocked fixture B draft decision");

const wrongType = { ...exact.currentDecision, decisionType: propertyReviewerDecisionTypes.rejectMatch };
assert.equal(evaluatePropertyExecutionEligibility({ item: { ...exact, currentDecision: wrongType } }).preflightStatus, propertyExecutionPreflightStatuses.blockedDecision);
pass("E blocked fixture C wrong decision type");

const conflict = itemFor("ingest_agency_listing_tower_b_0501_price_130000");
assert.equal(evaluatePropertyExecutionEligibility({ item: conflict }).preflightStatus, propertyExecutionPreflightStatuses.blockedConflict);
pass("F blocked fixture D unresolved conflict/wrong decision cannot execute");

const quarantine = itemFor("ingest_invalid_negative_area");
assert.ok([
  propertyExecutionPreflightStatuses.blockedDecision,
  propertyExecutionPreflightStatuses.blockedQuarantine
].includes(evaluatePropertyExecutionEligibility({ item: quarantine }).preflightStatus));
pass("G blocked fixture E quarantined source cannot execute");

const missingEvidenceDecision = { ...exact.currentDecision, evidenceRefs: [] };
assert.equal(evaluatePropertyExecutionEligibility({ item: { ...exact, currentDecision: missingEvidenceDecision } }).preflightStatus, propertyExecutionPreflightStatuses.blockedEvidence);
pass("H blocked fixture F missing evidence cannot execute");

const invalidPackage = { ...exact.reviewCasePackage, integrity: { ...exact.reviewCasePackage.integrity, fingerprint: "tampered" } };
assert.equal(evaluatePropertyExecutionEligibility({ item: exact, packageValue: invalidPackage }).preflightStatus, propertyExecutionPreflightStatuses.blockedPackage);
pass("I blocked fixture G invalid package fingerprint cannot execute");

const aiApproval = createExplicitLocalPropertyExecutionApproval({ executionIntentId: "x", approvalToken: "token", normalizedInput: { canonicalPropertyId: exact.canonicalPropertyId } }, { decidedBy: "AI" });
assert.equal(aiApproval.status, "APPROVAL_BLOCKED");
pass("J blocked fixture H AI/provider approval rejected", aiApproval);

const preview = createPropertyExecutionPreview(created.intent);
assert.ok(preview.willChange.join(" ").includes("canonical association"));
assert.ok(preview.willNotChange.includes("Property facts"));
pass("K execution preview separates will-change and will-not-change", preview);

const store = createLocalPropertyExecutionStore({ item: exact });
const preflight = preflightPropertyExecutionIntent(created.intent, { store });
assert.equal(preflight.status, propertyExecutionPreflightStatuses.readyForApproval);
pass("L preflight passes before local approval", preflight);

const success = executePropertyExecutionIntentThroughGateway({ intent: created.intent, store });
assert.ok(success.ok);
assert.equal(success.status, propertyExecutionStatuses.verified);
assert.equal(success.gateway.decision, "READY");
assert.equal(store.getMapping(exact.sourceRecordId).canonicalPropertyId, exact.canonicalPropertyId);
assert.equal(success.localApprovedAssociationMutations, 1);
pass("M success chain reaches ExecutionGateway and local atomic commit verifies", {
  status: success.status,
  gateway: success.gateway.decision,
  beforeAfterDiff: success.beforeAfterDiff
});

const idempotent = executePropertyExecutionIntentThroughGateway({ intent: created.intent, store });
assert.equal(idempotent.status, propertyExecutionStatuses.alreadyAppliedIdempotent);
assert.equal(store.listExecutionRecords().length, 1);
pass("N repeated execution is idempotent", idempotent.status);

const mismatchStore = createLocalPropertyExecutionStore({ item: exact });
mismatchStore.setMapping(exact.sourceRecordId, { ...mismatchStore.getMapping(exact.sourceRecordId), canonicalPropertyId: "prop_changed_elsewhere" });
const mismatch = executePropertyExecutionIntentThroughGateway({ intent: created.intent, store: mismatchStore });
assert.equal(mismatch.status, propertyExecutionPreflightStatuses.blockedStateMismatch);
pass("O blocked fixture J state mismatch protects stale execution plan", mismatch);

const rollback = rollbackPropertyExecutionLocalProof({ executionRecordId: success.executionRecord.executionRecordId, store });
assert.equal(rollback.status, propertyExecutionStatuses.rolledBack);
assert.equal(store.getMapping(exact.sourceRecordId).canonicalPropertyId, null);
assert.ok(rollback.rollbackVerification.executionHistoryPreserved);
pass("P rollback restores before-state association and preserves audit", rollback.rollbackVerification);

const failureStore = createLocalPropertyExecutionStore({ item: exact });
const failure = executePropertyExecutionIntentThroughGateway({ intent: created.intent, store: failureStore, failAfterCommit: true });
assert.equal(failure.status, propertyExecutionStatuses.failed);
assert.equal(failureStore.getMapping(exact.sourceRecordId).canonicalPropertyId, null);
pass("Q synthetic failure leaves no partial association", failure.status);

const source = fs.readFileSync("src/property/propertyExecutionIntent.js", "utf8");
assert.ok(!source.includes("fetch("));
assert.ok(!source.includes("supabase."));
assert.ok(!source.includes("createClient("));
assert.ok(!source.includes("publishListing"));
assert.ok(!source.includes("createPayment"));
assert.ok(!source.includes("chargePayment"));
assert.ok(!source.includes("bookProperty"));
pass("R no provider/database/publish/payment dispatch path exists");

const ui = fs.readFileSync("workspace/modules/propertyExecutionProofUi.js", "utf8");
assert.ok(ui.includes("executePropertyExecutionIntentThroughGateway"));
assert.ok(!ui.includes("executeAtomicAssociationCommit"));
assert.ok(ui.includes("Lisa/Navigator/provider/model cannot approve"));
pass("S UI cannot directly bypass gateway executor");

const navigator = fs.readFileSync("src/property/propertyNavigatorBridge.js", "utf8");
assert.ok(!navigator.includes("executePropertyExecutionIntentThroughGateway"));
assert.ok(!navigator.includes("executeAtomicAssociationCommit"));
pass("T Navigator cannot bypass ExecutionGateway");

const fixtures = buildPropertyExecutionProofFixtures();
assert.equal(fixtures.lisa.mayApproveExecution, false);
assert.equal(fixtures.success.providerCalls, 0);
assert.equal(fixtures.success.externalCalls, 0);
assert.equal(fixtures.success.productionDbMutations, 0);
assert.equal(fixtures.success.publishActions, 0);
assert.equal(fixtures.success.paymentActions, 0);
assert.equal(fixtures.success.bookingActions, 0);
assert.equal(fixtures.success.commercialTransactionActions, 0);
pass("U Lisa cannot approve and all forbidden side-effect counters remain zero");

console.log("Property execution intent tests passed.");
