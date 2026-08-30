import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  compileWorkflowRecipe,
  createAutonomousWorkflowOrchestrationProof,
  createSyntheticVideoFixture,
  createWorkflowViewModel,
  defaultPhase21QBoundary,
  executeWorkflow,
  executionWorkflowBlockers,
  executionWorkflowClasses,
  executionWorkflowStatuses,
  executionWorkflowStepStatuses,
  localMediaRepurposeRecipe,
  preflightExecutionWorkflow,
  rollbackExecutionWorkflow,
  validateVerifiedWorkflowHandoff,
  validateWorkflowBindings,
  validateWorkflowDag
} from "../src/capabilities/index.js";

function pass(label) {
  console.log(`PASS ${label}`);
}

function assertZeroExternalCounters(counters = {}) {
  [
    "externalProviderCalls",
    "externalModelCalls",
    "paidProviderCalls",
    "externalCalls",
    "paymentActions",
    "publishActions",
    "deployActions",
    "adActions",
    "socialDispatches",
    "externalAccountMutations",
    "productionDbMutations",
    "envKeyBillingChanges"
  ].forEach((key) => assert.equal(counters[key] || 0, 0, key));
}

const boundary = defaultPhase21QBoundary(process.cwd());
fs.mkdirSync(boundary.root, { recursive: true });
const sourceAsset = createSyntheticVideoFixture(boundary);

assert.equal(localMediaRepurposeRecipe.recipeId, "LOCAL_MEDIA_REPURPOSE_PROOF");
assert.equal(localMediaRepurposeRecipe.executionClass, executionWorkflowClasses.safeLocalMultiStep);
assert.deepEqual(localMediaRepurposeRecipe.requiredCapabilities, ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"]);
pass("A recipe contract is canonical");

const workflow = compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 2, trimEnd: 5 });
assert.equal(workflow.modelType, "ExecutionWorkflow");
assert.equal(workflow.workflowClass, executionWorkflowClasses.safeLocalMultiStep);
assert.equal(workflow.steps.length, 4);
assert.ok(workflow.steps.every((step) => step.modelType === "ExecutionWorkflowStep"));
assert.ok(workflow.steps.some((step) => step.status === executionWorkflowStepStatuses.waitingForDependency));
pass("B workflow and step contracts are present");

assert.equal(validateWorkflowDag(workflow).ok, true);
assert.deepEqual(workflow.dependencies.map((edge) => `${edge.from}->${edge.to}`), [
  "STEP_1_MEDIA_PROBE->STEP_2_VIDEO_TRIM",
  "STEP_2_VIDEO_TRIM->STEP_3_VIDEO_RESIZE",
  "STEP_2_VIDEO_TRIM->STEP_4_AUDIO_EXTRACT"
]);
assert.equal(workflow.steps.filter((step) => step.parallelizable).length, 2);
pass("C DAG is deterministic and exposes parallelizable downstream branches");

const cyclic = compileWorkflowRecipe({ boundary, sourceAsset });
cyclic.steps[0].dependsOn = ["STEP_4_AUDIO_EXTRACT"];
assert.ok(validateWorkflowDag(cyclic).blockers.includes(executionWorkflowBlockers.cycle));
const self = compileWorkflowRecipe({ boundary, sourceAsset });
self.steps[1].dependsOn = ["STEP_2_VIDEO_TRIM"];
assert.ok(validateWorkflowDag(self).blockers.includes(executionWorkflowBlockers.selfDependency));
const missingDep = compileWorkflowRecipe({ boundary, sourceAsset });
missingDep.steps[1].dependsOn = ["MISSING_STEP"];
assert.ok(validateWorkflowDag(missingDep).blockers.includes(executionWorkflowBlockers.missingDependency));
pass("D DAG blockers catch cycle, self dependency and missing dependency");

assert.equal(validateWorkflowBindings(workflow).ok, true);
const badBinding = compileWorkflowRecipe({ boundary, sourceAsset });
badBinding.steps[2].inputBindings[0].outputName = "missing";
assert.ok(validateWorkflowBindings(badBinding).blockers.includes(executionWorkflowBlockers.invalidBinding));
const badType = compileWorkflowRecipe({ boundary, sourceAsset });
badType.steps[2].inputBindings[0].expectedType = "AudioArtifact";
assert.ok(validateWorkflowBindings(badType).blockers.includes(executionWorkflowBlockers.typeMismatch));
pass("E bindings resolve user, source, output and observation contracts");

assert.equal(preflightExecutionWorkflow(workflow).workflowReady, true);
const missingInput = compileWorkflowRecipe({ boundary, sourceAsset });
missingInput.materialInputs.sourceVideo = null;
assert.ok(preflightExecutionWorkflow(missingInput).blockers.includes(executionWorkflowBlockers.missingInput));
const externalStep = compileWorkflowRecipe({ boundary, sourceAsset });
externalStep.steps.push({ ...workflow.steps[0], stepId: "STEP_EXTERNAL", capabilityId: "SOCIAL_PUBLISH", dependsOn: [] });
assert.ok(preflightExecutionWorkflow(externalStep).blockers.includes(executionWorkflowBlockers.phaseBoundary));
pass("F preflight gates inputs, capability profiles, adapters and phase boundary");

const executedWorkflowFingerprints = new Map();
const success = executeWorkflow({ workflow, boundary, executedWorkflowFingerprints });
assert.equal(success.ok, true);
assert.equal(success.workflow.status, executionWorkflowStatuses.succeeded);
assert.equal(success.workflow.verification.verified, true);
assert.equal(success.workflow.finalOutputs.length, 4);
assert.ok(success.workflow.steps.every((step) => step.status === executionWorkflowStepStatuses.succeeded));
assert.equal(success.counters.workflowExecutionRequests, 1);
assert.equal(success.counters.stepExecutionRequests, 4);
assert.equal(success.counters.directFfmpegInvocationsByWorkflow, 0);
assertZeroExternalCounters(success.workflow.externalActionCounters);
pass("G execution performs one canonical workflow request and four safe local steps");

const resized = success.workflow.finalOutputs.find((output) => output.outputName === "resizedVideo")?.artifact;
const trimmed = success.workflow.finalOutputs.find((output) => output.outputName === "trimmedVideo")?.artifact;
const audio = success.workflow.finalOutputs.find((output) => output.outputName === "extractedAudio")?.artifact;
assert.ok(resized && fs.existsSync(resized.localPathRef));
assert.ok(trimmed && fs.existsSync(trimmed.localPathRef));
assert.ok(audio && fs.existsSync(audio.localPathRef));
assert.ok(success.workflow.lineage.nodes.length >= 4);
assert.ok(success.workflow.lineage.edges.length >= 3);
pass("H final artifacts, observations and lineage are verified");

const handoffBinding = success.workflow.steps.find((step) => step.capabilityId === "VIDEO_RESIZE").inputBindings[0];
assert.equal(validateVerifiedWorkflowHandoff(success.workflow, handoffBinding, {
  type: "VideoArtifact",
  verified: true,
  workflowId: success.workflow.workflowId,
  artifact: trimmed
}, boundary).ok, true);
assert.ok(validateVerifiedWorkflowHandoff(success.workflow, handoffBinding, {
  type: "VideoArtifact",
  verified: false,
  workflowId: success.workflow.workflowId,
  artifact: trimmed
}, boundary).blockers.includes(executionWorkflowBlockers.unverifiedUpstream));
assert.ok(validateVerifiedWorkflowHandoff(success.workflow, handoffBinding, {
  type: "VideoArtifact",
  verified: true,
  workflowId: "foreign",
  artifact: trimmed
}, boundary).blockers.includes(executionWorkflowBlockers.foreignArtifact));
pass("I verified handoff rejects unverified and foreign artifacts");

const stepFailure = executeWorkflow({
  workflow: compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 1, trimEnd: 4, workflowId: "workflow_step_failure_test" }),
  boundary,
  simulateStepFailure: "VIDEO_RESIZE"
});
assert.equal(stepFailure.ok, false);
assert.equal(stepFailure.workflow.status, executionWorkflowStatuses.failed);
assert.equal(stepFailure.workflow.steps.find((step) => step.capabilityId === "VIDEO_RESIZE").status, executionWorkflowStepStatuses.failed);
pass("J step failure produces partial/failure state without false success");

const verificationFailure = executeWorkflow({
  workflow: compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 1.5, trimEnd: 4.5, workflowId: "workflow_verification_failure_test" }),
  boundary,
  simulateVerificationFailure: "VIDEO_TRIM"
});
assert.equal(verificationFailure.ok, false);
assert.equal(verificationFailure.workflow.status, executionWorkflowStatuses.verificationFailed);
pass("K verification failure stops downstream handoff");

const stale = executeWorkflow({
  workflow: compileWorkflowRecipe({ boundary, sourceAsset, workflowId: "workflow_stale_test" }),
  boundary,
  expectedWorkflowVersion: "stale-version"
});
assert.equal(stale.ok, false);
assert.ok(stale.blockers.includes(executionWorkflowBlockers.staleWorkflow));
const duplicateWorkflow = compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 2.25, trimEnd: 5.25, workflowId: "workflow_duplicate_test" });
const firstDuplicate = executeWorkflow({ workflow: duplicateWorkflow, boundary, executedWorkflowFingerprints });
const secondDuplicate = executeWorkflow({ workflow: duplicateWorkflow, boundary, executedWorkflowFingerprints });
assert.equal(firstDuplicate.ok, true);
assert.equal(secondDuplicate.duplicate, true);
pass("L stale and duplicate submit guards work");

const viewModel = createWorkflowViewModel(success.workflow);
assert.equal(viewModel.route, "#workflow/LOCAL_MEDIA_REPURPOSE_PROOF");
assert.equal(viewModel.userActions.filter((action) => action.action === "EXECUTE_WORKFLOW").length, 1);
assert.equal(viewModel.sourceAsset.sourcePathInRoute, false);
assert.equal(viewModel.finalOutputs.length, 4);
pass("M UI view model exposes route, readiness, single execute action and outputs");

const sourceFingerprintBeforeRollback = sourceAsset.fingerprint;
const rollback = rollbackExecutionWorkflow(success.workflow, boundary);
assert.equal(rollback.ok, true);
assert.equal(rollback.workflow.status, executionWorkflowStatuses.rolledBack);
assert.equal(sourceFingerprintBeforeRollback, sourceAsset.fingerprint);
assert.ok(!fs.existsSync(resized.localPathRef));
assert.ok(fs.existsSync(sourceAsset.localPathRef));
pass("N rollback removes derived artifacts and preserves source");

const proofResult = createAutonomousWorkflowOrchestrationProof({ boundary });
assert.equal(proofResult.proof.status, "PHASE_21Q_AUTONOMOUS_WORKFLOW_ORCHESTRATION_PASS");
assert.ok(fs.existsSync(proofResult.proofPath));
assert.equal(path.normalize(proofResult.proofPath), path.normalize(boundary.proofPath));
assertZeroExternalCounters(proofResult.proof.externalCounters);
pass("O proof artifact is written with pass status and zero external counters");
