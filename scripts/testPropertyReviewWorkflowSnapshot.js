import assert from "assert";
import fs from "fs";
import {
  buildPropertyReviewWorkflowSnapshotFixtures,
  buildPropertyReviewWorkflowViewModel,
  captureCanonicalPropertyImmutabilityFingerprint,
  createLisaPropertyReviewWorkflowSnapshotExplanation,
  createLocalPropertyReviewWorkflowSnapshotAdapter,
  createWorkflowSnapshot,
  diffPropertyReviewWorkflowSnapshots,
  propertyReviewWorkflowRestoreStates,
  propertyReviewWorkflowRollbackEvents,
  propertyReviewWorkflowSnapshotContract,
  propertyReviewWorkflowSnapshotSchemaVersion,
  restorePropertyReviewWorkflowSnapshot,
  rollbackPropertyReviewWorkflowSnapshot,
  verifyWorkflowSnapshotIntegrity
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

const beforeProperty = captureCanonicalPropertyImmutabilityFingerprint();
const viewModel = buildPropertyReviewWorkflowViewModel();
const snapshot = createWorkflowSnapshot({ workflowViewModel: viewModel, reasonForSnapshot: "TEST_INITIAL" });

assert.equal(propertyReviewWorkflowSnapshotContract.modelType, "PropertyReviewWorkflowSnapshot");
assert.equal(propertyReviewWorkflowSnapshotContract.sideEffectCounters.canonicalPropertyMutation, 0);
assert.ok(["snapshotId", "snapshotVersion", "createdAt", "createdByLocalActor", "workflowSchemaVersion", "queueItems", "assignments", "reviewStates", "evidenceRequests", "decisionRefs", "casePackageRefs", "auditEvents", "currentStateFingerprint", "previousSnapshotId", "reasonForSnapshot", "restoreMetadata", "sideEffectCounters"]
  .every((key) => Object.prototype.hasOwnProperty.call(propertyReviewWorkflowSnapshotContract, key)));
pass("A snapshot contract has required fields", propertyReviewWorkflowSnapshotContract);

assert.equal(snapshot.workflowSchemaVersion, propertyReviewWorkflowSnapshotSchemaVersion);
assert.ok(snapshot.queueItems.length >= 8);
assert.ok(snapshot.casePackageRefs.every((ref) => ref.packageId));
assert.ok(snapshot.decisionRefs.every((ref) => ref.executionStatus === "NOT_EXECUTED"));
pass("B snapshot creation preserves workflow sections and references", {
  snapshotId: snapshot.snapshotId,
  queueItems: snapshot.queueItems.length,
  decisions: snapshot.decisionRefs.length,
  packages: snapshot.casePackageRefs.length
});

const fixtures = buildPropertyReviewWorkflowSnapshotFixtures();
assert.equal(fixtures.v2.previousSnapshotId, fixtures.v1.snapshotId);
assert.equal(fixtures.v3.previousSnapshotId, fixtures.v2.snapshotId);
assert.equal(fixtures.v4.previousSnapshotId, fixtures.v3.snapshotId);
pass("C snapshot version lineage is preserved", [fixtures.v1, fixtures.v2, fixtures.v3, fixtures.v4].map((item) => ({
  snapshotId: item.snapshotId,
  version: item.snapshotVersion,
  previous: item.previousSnapshotId,
  reason: item.reasonForSnapshot
})));

const integrity = verifyWorkflowSnapshotIntegrity(snapshot);
assert.ok(integrity.ok);
assert.equal(integrity.status, "SNAPSHOT_INTEGRITY_VALID");
pass("D integrity fingerprint validates", integrity);

const tampered = { ...snapshot, reasonForSnapshot: "TAMPERED" };
const tamperedIntegrity = verifyWorkflowSnapshotIntegrity(tampered);
assert.ok(!tamperedIntegrity.ok);
assert.ok(tamperedIntegrity.errors.includes("fingerprint_mismatch"));
pass("E integrity failure detects changed content", tamperedIntegrity);

const adapter = createLocalPropertyReviewWorkflowSnapshotAdapter();
assert.equal(adapter.save(snapshot).status, "SAVED_LOCAL_PROOF");
const serialized = adapter.serialize();
assert.ok(serialized.includes("PropertyReviewWorkflowSnapshot"));
assert.ok(!serialized.includes("rawPayload"));
assert.ok(!serialized.includes("OPENAI_API_KEY"));
assert.ok(!serialized.includes("process.env"));
pass("F local persistence adapter serializes safely", { count: adapter.list().length, bytes: serialized.length });

const restored = restorePropertyReviewWorkflowSnapshot(snapshot);
assert.ok(restored.ok);
assert.equal(restored.status, propertyReviewWorkflowRestoreStates.restoredLocalProof);
assert.equal(restored.canonicalPropertyMutation, 0);
pass("G restore succeeds as local proof only", restored.status);

const invalidSchema = { ...snapshot, workflowSchemaVersion: "99.0.0" };
assert.equal(restorePropertyReviewWorkflowSnapshot(invalidSchema).status, propertyReviewWorkflowRestoreStates.blockedSchema);
pass("H restore blocks unsupported schema", restorePropertyReviewWorkflowSnapshot(invalidSchema));

const brokenRef = {
  ...snapshot,
  casePackageRefs: snapshot.casePackageRefs.slice(1)
};
brokenRef.currentStateFingerprint = snapshot.currentStateFingerprint;
assert.equal(restorePropertyReviewWorkflowSnapshot(brokenRef).status, propertyReviewWorkflowRestoreStates.blockedReference);
pass("I restore blocks broken references", restorePropertyReviewWorkflowSnapshot(brokenRef));

const diff = diffPropertyReviewWorkflowSnapshots(fixtures.v2, fixtures.v4);
assert.ok(diff.evidenceRequestsAddedOrClosed.length >= 1);
assert.ok(diff.reviewStatusesChanged.length >= 1);
assert.equal(diff.propertyChanges.length, 0);
pass("J snapshot diff reports workflow changes only", diff);

const rollback = rollbackPropertyReviewWorkflowSnapshot({ fromSnapshot: fixtures.v4, toSnapshot: fixtures.v2 });
assert.ok(rollback.ok);
assert.equal(rollback.status, "ROLLBACK_APPLIED_LOCAL_PROOF");
assert.ok(rollback.rollbackAudit.some((event) => event.eventType === propertyReviewWorkflowRollbackEvents.appliedLocalProof));
assert.equal(rollback.historicalSnapshotsPreserved, true);
pass("K rollback applies local state and preserves history", rollback);

const blockedRollback = rollbackPropertyReviewWorkflowSnapshot({ fromSnapshot: fixtures.v4, toSnapshot: tampered });
assert.ok(!blockedRollback.ok);
assert.ok(blockedRollback.rollbackAudit.some((event) => event.eventType === propertyReviewWorkflowRollbackEvents.blocked));
pass("L rollback blocked audit is append-only", blockedRollback.rollbackAudit);

const afterProperty = captureCanonicalPropertyImmutabilityFingerprint();
assert.equal(afterProperty.fingerprint, beforeProperty.fingerprint);
assert.equal(restored.listingMutation, 0);
assert.equal(restored.quarantineMutation, 0);
pass("M Property, Listing and quarantine immutability fingerprints remain identical", { beforeProperty, afterProperty });

const lisa = createLisaPropertyReviewWorkflowSnapshotExplanation({
  snapshot: fixtures.v4,
  diff,
  restoreResult: restored,
  rollbackResult: rollback
});
assert.ok(lisa.explanation.includes("local review workflow state only"));
assert.ok(lisa.explanation.includes("does not change canonical Property"));
assert.equal(lisa.providerCalls, 0);
pass("N Lisa explanation separates snapshot/rollback from Property execution", lisa);

assert.equal(snapshot.sideEffectCounters.providerCalls, 0);
assert.equal(snapshot.sideEffectCounters.externalCalls, 0);
assert.equal(snapshot.sideEffectCounters.dbMutations, 0);
assert.equal(snapshot.sideEffectCounters.mergeActions, 0);
assert.equal(snapshot.sideEffectCounters.publishActions, 0);
assert.equal(snapshot.sideEffectCounters.paymentActions, 0);
assert.equal(snapshot.sideEffectCounters.bookingActions, 0);
assert.equal(snapshot.sideEffectCounters.transactionActions, 0);
pass("O all provider/external/db/execution/payment counters remain zero", snapshot.sideEffectCounters);

const source = fs.readFileSync("src/property/propertyReviewWorkflowSnapshot.js", "utf8");
assert.ok(!source.includes("createClient("));
assert.ok(!source.includes("supabase."));
assert.ok(!source.includes("axios."));
assert.ok(!source.includes("fetch("));
assert.ok(!source.includes("executeMerge"));
assert.ok(!source.includes("publishListing"));
assert.ok(!source.includes("sendMail"));
pass("P snapshot module has no provider/database/execution dispatch path");

const ui = fs.readFileSync("workspace/modules/propertyReviewQueueUi.js", "utf8");
assert.ok(ui.includes("WORKFLOW SNAPSHOTS"));
assert.ok(ui.includes("REVIEW WORKFLOW SNAPSHOT / RESTORE ONLY"));
assert.ok(ui.includes("NO PROPERTY EXECUTION"));
assert.ok(ui.includes("NO CANONICAL PROPERTY MUTATION"));
pass("Q review queue UI snapshot surface is wired");

console.log("Property review workflow snapshot tests passed.");
