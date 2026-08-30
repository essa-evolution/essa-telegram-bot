import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  createSafeLocalExecutionUiAuditArtifact,
  createSafeLocalExecutionWorkspaceViewModel,
  createSyntheticVideoFixture,
  defaultPhase21PBoundary,
  executeSafeLocalWorkspaceAction,
  localExecutionRollbackStatuses,
  localExecutionStatuses,
  rollbackSafeLocalWorkspaceResult,
  safeLocalWorkspaceCapabilities
} from "../src/capabilities/index.js";

function pass(label) {
  console.log(`PASS ${label}`);
}

const boundary = defaultPhase21PBoundary(process.cwd());
fs.mkdirSync(boundary.fixtureSourceRoot, { recursive: true });
fs.mkdirSync(boundary.artifactRoot, { recursive: true });
fs.mkdirSync(boundary.tempRoot, { recursive: true });
fs.mkdirSync(boundary.screenshotRoot, { recursive: true });

const fixture = createSyntheticVideoFixture(boundary);
const capabilityIds = safeLocalWorkspaceCapabilities.map((item) => item.capabilityId);

assert.deepEqual(capabilityIds, ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"]);
pass("A only proven safe-local capabilities are exposed");

const initial = createSafeLocalExecutionWorkspaceViewModel({ capabilityId: "VIDEO_TRIM", boundary });
assert.equal(initial.modelType, "SafeLocalExecutionWorkspaceViewModel");
assert.equal(initial.route, "#execution/VIDEO_TRIM");
assert.equal(initial.sourceAsset.selected, false);
assert.equal(initial.inputState.sourcePathInRoute, false);
assert.equal(initial.userActions.find((action) => action.action === "EXECUTE_LOCAL").enabled, false);
pass("B pending view model does not expose raw source path or runnable CTA");

const readyTrim = createSafeLocalExecutionWorkspaceViewModel({
  capabilityId: "VIDEO_TRIM",
  boundary,
  sourceAsset: fixture,
  inputs: { startSeconds: 2, endSeconds: 5 }
});
assert.equal(readyTrim.sourceAsset.selected, true);
assert.equal(readyTrim.preflightState.ready, true);
assert.equal(readyTrim.eligibility.eligible, true);
assert.equal(readyTrim.userActions.find((action) => action.action === "EXECUTE_LOCAL").enabled, true);
pass("C CTA follows LocalExecutionEligibility");

const invalidTrim = createSafeLocalExecutionWorkspaceViewModel({
  capabilityId: "VIDEO_TRIM",
  boundary,
  sourceAsset: fixture,
  inputs: { startSeconds: 7, endSeconds: 2 }
});
assert.equal(invalidTrim.eligibility.eligible, false);
assert.equal(invalidTrim.userActions.find((action) => action.action === "EXECUTE_LOCAL").enabled, false);
pass("D invalid range blocks CTA");

const staleTrim = createSafeLocalExecutionWorkspaceViewModel({
  capabilityId: "VIDEO_TRIM",
  boundary,
  sourceAsset: fixture,
  inputs: { startSeconds: 1, endSeconds: 2 },
  intentVersion: "0.9.0",
  expectedIntentVersion: "1.0.0"
});
assert.equal(staleTrim.eligibility.eligible, false);
pass("E stale intent version blocks execution");

const deferred = createSafeLocalExecutionWorkspaceViewModel({
  capabilityId: "IMAGE_RESIZE",
  boundary,
  sourceAsset: fixture
});
assert.equal(deferred.executionMode, null);
assert.equal(deferred.userActions.find((action) => action.action === "EXECUTE_LOCAL").enabled, false);
pass("F deferred capability is visible as blocked, not executable");

const executions = [
  ["MEDIA_PROBE", {}],
  ["VIDEO_TRIM", { startSeconds: 2, endSeconds: 5 }],
  ["VIDEO_RESIZE", { targetProfile: "VIDEO_RESIZE_320x180" }],
  ["AUDIO_EXTRACT", { targetProfile: "AUDIO_WAV_STANDARD" }]
].map(([capabilityId, inputs]) => executeSafeLocalWorkspaceAction({
  capabilityId,
  sourceAsset: fixture,
  inputs,
  boundary
}));

for (const run of executions) {
  assert.equal(run.ok, true);
  assert.equal(run.result.status, localExecutionStatuses.succeeded);
  assert.equal(run.viewModel.executionState, "SUCCEEDED");
  assert.equal(run.viewModel.result.succeededAfterVerification, true);
  assert.equal(run.viewModel.result.executionId, run.result.executionId);
  assert.equal(run.viewModel.sourcePreserved, true);
  assert.equal(run.counters.externalCalls, 0);
}
pass("G promoted capabilities execute locally and succeed only after verification");

const probe = executions.find((run) => run.result.capabilityId === "MEDIA_PROBE");
assert.equal(probe.viewModel.derivedArtifacts.length, 0);
assert.equal(probe.viewModel.observations.length, 1);
assert.equal(probe.viewModel.rollback.status, localExecutionRollbackStatuses.notApplicable);
pass("H MEDIA_PROBE presents observation without artifact rollback");

const derivedRuns = executions.filter((run) => run.result.derivedArtifacts.length === 1);
for (const run of derivedRuns) {
  assert.equal(run.viewModel.derivedArtifacts.length, 1);
  assert.ok(run.viewModel.derivedArtifacts[0].access.href.startsWith("/api/safe-local/artifacts/"));
  assert.equal(run.viewModel.rollback.available, true);
  assert.ok(fs.existsSync(run.result.derivedArtifacts[0].localPathRef));
}
pass("I derived results expose bounded artifact cards");

const rollback = rollbackSafeLocalWorkspaceResult({
  capabilityId: "VIDEO_RESIZE",
  sourceAsset: fixture,
  inputs: { targetProfile: "VIDEO_RESIZE_320x180" },
  result: executions.find((run) => run.result.capabilityId === "VIDEO_RESIZE").result,
  boundary
});
assert.equal(rollback.ok, true);
assert.equal(rollback.rollbackResult.status, localExecutionRollbackStatuses.completed);
assert.equal(rollback.viewModel.executionState, "ROLLED_BACK");
assert.equal(rollback.viewModel.derivedArtifacts.length, 0);
assert.equal(fs.existsSync(fixture.localPathRef), true);
pass("J rollback deletes only derived artifact and preserves source");

const failed = executeSafeLocalWorkspaceAction({
  capabilityId: "AUDIO_EXTRACT",
  sourceAsset: fixture,
  inputs: { targetProfile: "AUDIO_WAV_STANDARD" },
  boundary,
  simulateVerificationFailure: true
});
assert.equal(failed.ok, false);
assert.equal(failed.result.status, localExecutionStatuses.verificationFailed);
assert.equal(failed.viewModel.result.succeededAfterVerification, false);
pass("K verification failure is not presented as success");

const audit = createSafeLocalExecutionUiAuditArtifact(readyTrim, {
  browserErrors: { consoleErrors: 0, pageErrors: 0, failedRequests: 0, runtimeExceptions: 0 }
});
assert.equal(audit.artifactType, "SafeLocalExecutionUiAuditArtifact");
assert.equal(audit.ctaState.enabled, true);
assert.equal(audit.externalActionCounters.externalProviderCalls, 0);
assert.equal(audit.externalActionCounters.paymentActions, 0);
assert.equal(audit.externalActionCounters.publishActions, 0);
assert.equal(audit.externalActionCounters.deployActions, 0);
pass("L UI audit artifact captures CTA, verification and zero external counters");

console.log("Safe Local Execution Workspace tests passed.");
