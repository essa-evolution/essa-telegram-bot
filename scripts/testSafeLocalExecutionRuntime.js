import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  authorizeLocalExecution,
  buildExecution21MFlow,
  createExecutionApprovalDecision,
  createExecutionApprovalRequest,
  createExecutionInputAnswer,
  createExecutionInputDraft,
  createExecutionIntentDraft,
  createLocalExecutionRequest,
  createSyntheticVideoFixture,
  createVideoTrimExecutionPlan,
  defaultPhase21NBoundary,
  evaluateLocalExecutionEligibility,
  executionApprovalStates,
  executionApprovalTypes,
  fingerprintFile,
  getCapability,
  localExecutionGateDecisions,
  localExecutionStatuses,
  productIds,
  productKnowledgeNodes,
  rollbackLocalExecution,
  runPhase21NSafeLocalExecutionProof,
  runSafeLocalExecution,
  safeLocalExecutionBlockers,
  safeLocalToolAllowlist,
  verifyLocalExecutionArtifact
} from "../src/capabilities/index.js";
import {
  getAgentTool,
  prepareExecution
} from "../src/agentToolLayer/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const boundary = defaultPhase21NBoundary(process.cwd());
fs.mkdirSync(boundary.artifactRoot, { recursive: true });
fs.mkdirSync(boundary.tempRoot, { recursive: true });

const proofRun = runPhase21NSafeLocalExecutionProof(process.cwd());
const fixture = proofRun.proof.fixtureSource;

assert.equal(proofRun.eligibility.eligible, true);
assert.equal(proofRun.eligibility.capabilityId, "VIDEO_TRIM");
pass("A VIDEO_TRIM eligible", proofRun.eligibility);

const bookFlow = buildExecution21MFlow({
  intentId: "book_not_local_exec",
  requestId: "book_not_local_exec_request",
  traceId: "book_not_local_exec_trace",
  userNeed: "Сделай обложку",
  productId: productIds.publishing,
  primaryCapabilityId: "BOOK_COVER"
}, {
  currentUserInputs: {
    book_title: "Book",
    author: "Lisa",
    genre_theme: "memoir",
    desired_style: "minimal"
  }
});
const bookPlan = { ...proofRun.executionPlan, capabilityId: "BOOK_COVER", toolId: "not_allowed" };
assert.equal(evaluateLocalExecutionEligibility({ flow: bookFlow, executionPlan: bookPlan, boundary }).eligible, false);
pass("B provider capability not eligible");

assert.ok(evaluateLocalExecutionEligibility({ flow: bookFlow, executionPlan: bookPlan, boundary }).blockers.includes(safeLocalExecutionBlockers.paymentRequired));
pass("C payment capability not eligible");

const publishFlow = buildExecution21MFlow({
  intentId: "publish_not_local_exec",
  requestId: "publish_not_local_exec_request",
  traceId: "publish_not_local_exec_trace",
  userNeed: "Опубликуй книгу",
  productId: productIds.publishing,
  primaryCapabilityId: "PUBLISHING_PACKAGE"
});
assert.equal(evaluateLocalExecutionEligibility({ flow: publishFlow, executionPlan: { ...proofRun.executionPlan, capabilityId: "PUBLISHING_PACKAGE" }, boundary }).eligible, false);
pass("D publish not eligible");

assert.equal(evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: proofRun.executionPlan, boundary, deployRequired: true }).eligible, false);
pass("E deploy not eligible");

assert.equal(evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: proofRun.executionPlan, boundary, externalMutationRequired: true }).eligible, false);
pass("F external mutation not eligible");

const invalidRangePlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 6,
  endSeconds: 2
}, boundary);
const invalidEligibility = evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: invalidRangePlan, boundary });
assert.equal(invalidEligibility.eligible, false);
assert.ok(invalidEligibility.blockers.includes(safeLocalExecutionBlockers.invalidRange));
pass("G invalid input not eligible", invalidEligibility.blockers);

assert.equal(evaluateLocalExecutionEligibility({
  flow: proofRun.flow,
  executionPlan: proofRun.executionPlan,
  boundary,
  intentVersion: "old",
  expectedIntentVersion: "new"
}).eligible, false);
pass("H stale intent not eligible");

const approvalRequest = createExecutionApprovalRequest({
  intentId: proofRun.flow.draft.intentId,
  intentVersion: "1.0.0",
  capabilityId: "VIDEO_TRIM",
  approvalType: executionApprovalTypes.userConfirmation,
  scope: { action: "VIDEO_TRIM", capabilityId: "OTHER" }
});
const approvalDecision = createExecutionApprovalDecision({
  approvalRequestId: approvalRequest.approvalRequestId,
  decision: executionApprovalStates.approved,
  acknowledgedScope: approvalRequest.scope
});
const invalidToken = {
  approvalRequestId: approvalRequest.approvalRequestId,
  intentId: "different",
  intentVersion: "1.0.0",
  capabilityId: "VIDEO_TRIM",
  approvalType: executionApprovalTypes.userConfirmation,
  scope: approvalRequest.scope,
  status: "ACTIVE",
  authorizationFingerprint: "bad"
};
assert.equal(evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: proofRun.executionPlan, boundary, approvalTokens: [invalidToken] }).eligible, false);
assert.equal(approvalDecision.decision, executionApprovalStates.approved);
pass("I invalid token blocks where required");

assert.equal(proofRun.eligibility.sourcePreservationGuaranteed, true);
pass("J source preservation required");

assert.ok(fs.existsSync(fixture.localPathRef));
assert.ok(fixture.durationSeconds >= 7.5);
pass("K synthetic video generated", fixture);

assert.ok(safeLocalToolAllowlist.VIDEO_TRIM.executableNames.includes("ffmpeg"));
assert.ok(getAgentTool("media.local.mock"));
pass("L local tool found");

const args = proofRun.result.debugProvenance.toolInvocation.args;
assert.equal(Array.isArray(args), true);
assert.equal(args.includes("&&"), false);
assert.equal(args.includes(";"), false);
pass("M structured command built safely", args);

assert.equal(proofRun.result.debugProvenance.toolInvocation.exitCode, 0);
pass("N FFmpeg invoked");

assert.equal(proofRun.result.derivedArtifacts.length, 1);
assert.ok(fs.existsSync(proofRun.result.derivedArtifacts[0].localPathRef));
pass("O derived artifact created", proofRun.result.derivedArtifacts[0]);

assert.equal(proofRun.result.sourcePreserved, true);
assert.equal(proofRun.proof.sourceFingerprintBefore, proofRun.proof.sourceFingerprintAfter);
pass("P source not overwritten");

const secondPlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 2,
  endSeconds: 5
}, boundary);
assert.notEqual(secondPlan.requestedOutput.localPathRef, proofRun.executionPlan.requestedOutput.localPathRef);
pass("Q unique output name", {
  first: proofRun.executionPlan.requestedOutput.localPathRef,
  second: secondPlan.requestedOutput.localPathRef
});

assert.equal(proofRun.result.executionRecord.modelType, "ExecutionRecord");
assert.equal(proofRun.result.executionRecord.status, localExecutionStatuses.succeeded);
pass("R execution record created");

assert.ok(proofRun.result.executionFingerprint);
pass("S execution fingerprint", proofRun.result.executionFingerprint);

assert.equal(proofRun.result.derivedArtifacts[0].lineage.sourceAssetId, fixture.sourceAssetId);
assert.equal(proofRun.result.derivedArtifacts[0].lineage.executionId, proofRun.result.executionId);
pass("T artifact lineage", proofRun.result.derivedArtifacts[0].lineage);

assert.equal(proofRun.result.verification.modelType, "ExecutionVerificationResult");
pass("U ffprobe invoked");

assert.ok(proofRun.result.verification.checks.find((item) => item.code === "OUTPUT_READABLE").passed);
pass("V output readable");

assert.ok(proofRun.result.verification.checks.find((item) => item.code === "DURATION_MATCHES_REQUEST").passed);
pass("W duration verified", proofRun.result.verification.expectedVsObserved);

assert.ok(fs.statSync(proofRun.result.derivedArtifacts[0].localPathRef).size > 0);
pass("X non-empty artifact");

assert.ok(proofRun.result.verification.checks.find((item) => item.code === "SOURCE_FINGERPRINT_UNCHANGED").passed);
pass("Y source fingerprint unchanged");

assert.ok(proofRun.result.derivedArtifacts[0].artifactFingerprint);
pass("Z artifact fingerprint recorded");

assert.equal(proofRun.result.status, localExecutionStatuses.succeeded);
assert.equal(proofRun.result.verification.verified, true);
pass("AA success only after verification");

const failurePlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 4,
  endSeconds: 5
}, boundary);
const failureGate = authorizeLocalExecution({
  eligibility: evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: failurePlan, boundary })
});
const failureResult = runSafeLocalExecution({
  gate: failureGate,
  executionId: "phase21n_tool_failure",
  simulateToolFailure: true
});
assert.equal(failureResult.status, localExecutionStatuses.failed);
assert.equal(failureResult.derivedArtifacts.length, 0);
pass("AB tool failure -> FAILED");

const verificationFailurePlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 1,
  endSeconds: 3
}, boundary);
const verificationFailureGate = authorizeLocalExecution({
  eligibility: evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: verificationFailurePlan, boundary })
});
const verificationFailure = runSafeLocalExecution({
  gate: verificationFailureGate,
  executionId: "phase21n_verification_failure",
  simulateVerificationFailure: true
});
assert.equal(verificationFailure.status, localExecutionStatuses.verificationFailed);
pass("AC verification failure -> VERIFICATION_FAILED");

assert.equal(verificationFailure.derivedArtifacts.length, 0);
pass("AD partial artifact not trusted");

assert.equal(proofRun.result.rollbackAvailable, true);
pass("AE rollback available");

const rollbackResult = rollbackLocalExecution(proofRun.result, boundary);
assert.equal(rollbackResult.status, "COMPLETED");
assert.equal(fs.existsSync(proofRun.result.derivedArtifacts[0].localPathRef), false);
pass("AF rollback removes derived only", rollbackResult);

assert.equal(fs.existsSync(fixture.localPathRef), true);
assert.equal(fingerprintFile(fixture.localPathRef), fixture.fingerprint);
pass("AG rollback preserves source");

assert.equal(rollbackResult.auditUpdated, true);
pass("AH rollback audit updated");

const idempotentPlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 3,
  endSeconds: 4
}, boundary);
const idempotentGate = authorizeLocalExecution({
  eligibility: evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: idempotentPlan, boundary })
});
const firstIdempotent = runSafeLocalExecution({ gate: idempotentGate, executionId: "phase21n_idempotent_a" });
const secondIdempotent = runSafeLocalExecution({ gate: idempotentGate, executionId: "phase21n_idempotent_b" });
assert.equal(secondIdempotent.status, localExecutionStatuses.reuseExistingResult);
pass("AI duplicate execution controlled");

const collisionPlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 3,
  endSeconds: 4
}, boundary);
assert.notEqual(collisionPlan.requestedOutput.localPathRef, idempotentPlan.requestedOutput.localPathRef);
pass("AJ output collision controlled");

const overwritePlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 1,
  endSeconds: 2,
  outputPath: fixture.localPathRef
}, boundary);
const overwriteEligibility = evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: overwritePlan, boundary });
assert.ok(overwriteEligibility.blockers.includes(safeLocalExecutionBlockers.blockedSourceOverwrite));
pass("AK source=output blocked");

const traversalEligibility = evaluateLocalExecutionEligibility({
  flow: proofRun.flow,
  executionPlan: proofRun.executionPlan,
  boundary,
  rawOutputPath: "..\\outside.mp4"
});
assert.ok(traversalEligibility.blockers.includes(safeLocalExecutionBlockers.pathTraversalBlocked));
pass("AL path traversal blocked");

const outsidePlan = createVideoTrimExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  startSeconds: 1,
  endSeconds: 2,
  outputPath: path.join(process.cwd(), "outside_phase21n.mp4")
}, boundary);
assert.ok(evaluateLocalExecutionEligibility({ flow: proofRun.flow, executionPlan: outsidePlan, boundary }).blockers.includes(safeLocalExecutionBlockers.blockedOutputBoundary));
pass("AM outside boundary blocked");

assert.ok(evaluateLocalExecutionEligibility({
  flow: proofRun.flow,
  executionPlan: proofRun.executionPlan,
  boundary,
  extraFlags: ["&&"]
}).blockers.includes(safeLocalExecutionBlockers.unsafeFlagBlocked));
pass("AN arbitrary shell fragment blocked");

assert.ok(evaluateLocalExecutionEligibility({
  flow: proofRun.flow,
  executionPlan: proofRun.executionPlan,
  boundary,
  executableOverride: "cmd.exe"
}).blockers.includes(safeLocalExecutionBlockers.arbitraryExecutableBlocked));
pass("AO arbitrary executable blocked");

assert.ok(evaluateLocalExecutionEligibility({
  flow: proofRun.flow,
  executionPlan: proofRun.executionPlan,
  boundary,
  extraFlags: ["-filter_script"]
}).blockers.includes(safeLocalExecutionBlockers.unsafeFlagBlocked));
pass("AP unsafe flag blocked");

const foreignRollback = rollbackLocalExecution({
  executionId: "foreign",
  derivedArtifacts: [{ artifactId: "foreign", localPathRef: path.join(process.cwd(), "foreign.mp4") }]
}, boundary);
assert.equal(foreignRollback.status, "BLOCKED");
pass("AQ rollback foreign artifact blocked");

assert.equal(proofRun.proof.externalProviderCalls + proofRun.proof.externalModelCalls + proofRun.proof.externalCalls, 0);
pass("AR no external network dependency");

assert.equal(/Open FFmpeg|run this command/i.test(proofRun.result.userSummary), false);
pass("AS user not asked to run FFmpeg");

assert.equal(proofRun.gate.decision, localExecutionGateDecisions.authorized);
assert.equal(proofRun.result.status, localExecutionStatuses.succeeded);
pass("AT system executes allowed local work");

assert.equal(evaluateLocalExecutionEligibility({ flow: publishFlow, executionPlan: { ...proofRun.executionPlan, capabilityId: "PUBLISHING_PACKAGE" }, boundary }).eligible, false);
pass("AU human authority boundaries preserved");

assert.equal(proofRun.flow.approvalDiscovery.approvalRequests.length, 0);
pass("AV no unnecessary approval invented");

assert.ok(proofRun.result.userSummary.includes("исходник не измен"));
pass("AW human-readable result", proofRun.result.userSummary);

assert.ok(proofRun.result.debugProvenance.toolInvocation.args.length > 0);
pass("AX technical provenance available separately");

assert.equal(proofRun.proof.externalProviderCalls, 0);
pass("AY external provider calls = 0");

assert.equal(proofRun.proof.externalModelCalls, 0);
pass("AZ external model calls = 0");

assert.equal(proofRun.proof.paymentActions, 0);
pass("BA payments = 0");

assert.equal(proofRun.proof.publishActions, 0);
pass("BB publish actions = 0");

assert.equal(proofRun.proof.deployActions, 0);
pass("BC deploy actions = 0");

assert.equal(proofRun.proof.adActions, 0);
pass("BD ads = 0");

assert.equal(proofRun.proof.externalAccountMutations, 0);
pass("BE external account mutations = 0");

assert.equal(proofRun.proof.productionDbMutations, 0);
pass("BF production DB mutations = 0");

assert.equal(proofRun.proof.envKeyBillingChanges, 0);
pass("BG env/key/billing changes = 0");

const localRequest = createLocalExecutionRequest({
  intentId: proofRun.flow.draft.intentId,
  inputDraftId: proofRun.flow.inputDraft.inputDraftId,
  preflightRef: proofRun.flow.rePreflight.preflight.decisionId,
  executionPlan: proofRun.executionPlan,
  sourceAssetRefs: [fixture.sourceAssetId],
  requestedOutputs: [proofRun.executionPlan.requestedOutput],
  executionBoundary: boundary
});
assert.equal(localRequest.capabilityId, "VIDEO_TRIM");

const sourceEqualsOutputGate = authorizeLocalExecution({ eligibility: overwriteEligibility });
const blockedResult = runSafeLocalExecution({ gate: sourceEqualsOutputGate, executionId: "phase21n_blocked" });
assert.equal(blockedResult.status, localExecutionStatuses.blocked);

const gatewayProbe = prepareExecution({
  executionIntentId: "phase21n_gateway_probe",
  toolId: "media.local.mock",
  capability: "render_local",
  action: "read",
  normalizedInput: { scope: "media/input" },
  status: "READY_FOR_EXECUTION",
  environment: "local",
  approvalRequired: false,
  costClass: "LOCAL_COMPUTE",
  estimatedCost: 0,
  maxApprovedCost: 0,
  idempotencyKey: "phase21n_gateway_probe"
});
assert.equal(gatewayProbe.executed, false);

const capability = getCapability("VIDEO_TRIM");
assert.equal(capability.metadata.safeLocalExecutionAvailable, true);
const pk = productKnowledgeNodes.find((node) => node.nodeId === "production_video_trim_safe_local");
assert.equal(pk.availabilityState, "LOCAL_READY");

const proofJson = JSON.parse(fs.readFileSync(proofRun.proofPath, "utf8"));
assert.equal(proofJson.resultStatus, localExecutionStatuses.succeeded);
assert.equal(proofJson.derivedArtifact.verificationState, "VERIFIED");

const verificationAgain = verifyLocalExecutionArtifact({
  executionId: "verification_after_rollback_expected_fail",
  executionPlan: proofRun.executionPlan,
  sourceFingerprintBefore: fixture.fingerprint
});
assert.equal(verificationAgain.verified, false);

console.log("Safe Local Execution Runtime tests passed.");
