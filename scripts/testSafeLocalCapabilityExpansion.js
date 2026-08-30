import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  authorizeLocalExecution,
  buildExecution21MFlow,
  buildExecutionPreview,
  createAudioExtractExecutionPlan,
  createExecutionFingerprint,
  createMediaProbeExecutionPlan,
  createVideoResizeExecutionPlan,
  createVideoTrimExecutionPlan,
  defaultPhase21OBoundary,
  deferredSafeLocalCapabilities,
  evaluateLocalExecutionEligibility,
  fingerprintFile,
  getCapability,
  getSafeLocalCapabilityProfile,
  localExecutionGateDecisions,
  localExecutionModes,
  localExecutionRollbackStatuses,
  localExecutionStatuses,
  localToolAdapters,
  productIds,
  productKnowledgeNodes,
  rollbackLocalExecution,
  runPhase21OSafeLocalCapabilityMatrixProof,
  runSafeLocalExecution,
  safeLocalCapabilityProfiles,
  safeLocalExecutionBlockers,
  safeLocalOutputProfiles,
  safeLocalToolAllowlist,
  safeLocalVerificationProfiles,
  validateSafeLocalRuntimeRegistry
} from "../src/capabilities/index.js";

function pass(label) {
  console.log(`PASS ${label}`);
}

function flowFor(capabilityId, fixture, currentUserInputs = {}) {
  return buildExecution21MFlow({
    intentId: `test_21o_${capabilityId.toLowerCase()}_intent`,
    requestId: `test_21o_${capabilityId.toLowerCase()}_request`,
    traceId: `test_21o_${capabilityId.toLowerCase()}_trace`,
    userNeed: `Run safe local ${capabilityId}`,
    productId: productIds.production,
    primaryCapabilityId: capabilityId
  }, {
    currentUserInputs,
    validationContext: {
      mediaDurationSeconds: fixture.durationSeconds
    }
  }, [], {}, {
    intentVersion: "1.0.0",
    createdAt: "2026-08-29T00:00:00.000Z"
  });
}

const boundary = defaultPhase21OBoundary(process.cwd());
fs.mkdirSync(boundary.fixtureSourceRoot, { recursive: true });
fs.mkdirSync(boundary.artifactRoot, { recursive: true });

const matrix = runPhase21OSafeLocalCapabilityMatrixProof(process.cwd());
const fixture = matrix.fixture;
const byCapability = Object.fromEntries(matrix.proofs.map((proof) => [proof.capabilityId, proof]));

assert.equal(matrix.proof.runtimeProvenReusable, true);
assert.ok(matrix.proofs.length >= 3);
assert.ok(matrix.proofs.some((proof) => proof.capabilityId !== "VIDEO_TRIM"));
pass("A runtime is not VIDEO_TRIM-only");

assert.equal(getSafeLocalCapabilityProfile("MEDIA_PROBE").executionMode, localExecutionModes.readOnly);
assert.equal(getSafeLocalCapabilityProfile("VIDEO_RESIZE").executionMode, localExecutionModes.derivedArtifact);
pass("B capability profile resolution");

assert.equal(localToolAdapters.FFMPEG_LOCAL.supports("AUDIO_EXTRACT"), true);
assert.equal(safeLocalToolAllowlist.FFMPEG_LOCAL.operations.includes("resize"), true);
pass("C adapter resolution");

assert.equal(safeLocalVerificationProfiles.VIDEO_RESIZE_DIMENSIONS_SOURCE.capabilityId, "VIDEO_RESIZE");
assert.equal(safeLocalVerificationProfiles.MEDIA_PROBE_STRUCTURED_OBSERVATION.capabilityId, "MEDIA_PROBE");
pass("D verifier resolution");

assert.equal(byCapability.MEDIA_PROBE.executionMode, localExecutionModes.readOnly);
assert.equal(byCapability.MEDIA_PROBE.executionResult.derivedArtifacts.length, 0);
assert.equal(byCapability.MEDIA_PROBE.rollback.status, localExecutionRollbackStatuses.notApplicable);
pass("E read-only execution mode");

assert.equal(byCapability.VIDEO_RESIZE.executionMode, localExecutionModes.derivedArtifact);
assert.equal(byCapability.VIDEO_RESIZE.executionResult.derivedArtifacts.length, 1);
pass("F derived-artifact execution mode");

const unsupportedFlow = flowFor("BOOK_COVER", fixture, {
  book_title: "Book",
  author: "Lisa",
  genre_theme: "memoir",
  desired_style: "minimal"
});
const unsupportedPlan = {
  ...createVideoTrimExecutionPlan({
    sourceAssetId: fixture.sourceAssetId,
    sourcePath: fixture.localPathRef,
    startSeconds: 1,
    endSeconds: 2
  }, boundary),
  capabilityId: "BOOK_COVER",
  toolId: "not_allowed"
};
assert.ok(evaluateLocalExecutionEligibility({
  flow: unsupportedFlow,
  executionPlan: unsupportedPlan,
  boundary
}).blockers.includes(safeLocalExecutionBlockers.notEligibleSafeLocalExecution));
pass("G unsupported capability blocked");

const duplicateRegistry = validateSafeLocalRuntimeRegistry([
  ...safeLocalCapabilityProfiles,
  { ...safeLocalCapabilityProfiles[0] }
]);
assert.ok(duplicateRegistry.some((item) => item.blockers.includes(safeLocalExecutionBlockers.duplicateProfile)));
pass("H duplicate runtime profile blocked");

const missingVerifier = validateSafeLocalRuntimeRegistry([
  { ...safeLocalCapabilityProfiles[0], capabilityId: "TEST_PROFILE", verificationProfileId: "MISSING" }
]);
assert.ok(missingVerifier[0].blockers.includes(safeLocalExecutionBlockers.missingVerifier));
pass("I missing verifier blocked");

const mismatchPlan = {
  ...createVideoResizeExecutionPlan({
    sourceAssetId: fixture.sourceAssetId,
    sourcePath: fixture.localPathRef
  }, boundary),
  toolAdapterId: "NOT_FFMPEG"
};
assert.ok(evaluateLocalExecutionEligibility({
  flow: flowFor("VIDEO_RESIZE", fixture, { source_video: fixture.localPathRef, target_profile: "VIDEO_RESIZE_320x180" }),
  executionPlan: mismatchPlan,
  boundary
}).blockers.includes(safeLocalExecutionBlockers.toolCapabilityMismatch));
pass("J mismatched adapter blocked");

assert.ok(fs.existsSync(fixture.localPathRef));
pass("K source readable");

const observation = byCapability.MEDIA_PROBE.executionResult.observations[0];
assert.equal(observation.modelType, "MediaProbeResult");
pass("L observation returned");

assert.ok(observation.duration >= 7.5);
pass("M duration observed");

assert.deepEqual(observation.dimensions, { width: 640, height: 360 });
pass("N dimensions observed");

assert.equal(observation.video.present, true);
assert.equal(observation.audio.present, true);
pass("O stream metadata observed");

assert.equal(byCapability.MEDIA_PROBE.executionResult.derivedArtifacts.length, 0);
pass("P no derived artifact");

assert.equal(fingerprintFile(fixture.localPathRef), fixture.fingerprint);
pass("Q source unchanged");

assert.equal(byCapability.MEDIA_PROBE.verification.verified, true);
pass("R verified");

for (const capabilityId of ["VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"]) {
  const proof = byCapability[capabilityId];
  assert.equal(proof.eligibility.eligible, true);
  assert.equal(proof.result.debugProvenance.gate.decision, localExecutionGateDecisions.authorized);
  assert.equal(proof.result.debugProvenance.toolInvocation.exitCode, 0);
  assert.equal(proof.executionResult.derivedArtifacts.length, 1);
  assert.equal(proof.verification.verified, true);
  assert.equal(proof.sourcePreservation, true);
  assert.ok(proof.executionResult.derivedArtifacts[0].lineage.capabilityId === capabilityId);
  assert.ok([
    localExecutionRollbackStatuses.available,
    localExecutionRollbackStatuses.notApplicable
  ].includes(proof.rollback.status));
}
pass("S valid input for every promoted derived capability");
pass("T eligibility true for every promoted derived capability");
pass("U execution authorized for every promoted derived capability");
pass("V local tool invoked for every promoted derived capability");
pass("W expected output created for every promoted derived capability");
pass("X verification passed for every promoted derived capability");
pass("Y source unchanged for every promoted derived capability");
pass("Z lineage valid for every promoted derived capability");
pass("AA rollback state correct for every promoted derived capability");

const resizePlan = createVideoResizeExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef
}, boundary);
const resizeFlow = flowFor("VIDEO_RESIZE", fixture, {
  source_video: fixture.localPathRef,
  target_profile: "VIDEO_RESIZE_320x180"
});

assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: resizePlan, boundary, extraFlags: ["-filter_script"] }).blockers.includes(safeLocalExecutionBlockers.unsafeFlagBlocked));
pass("AB raw flags blocked");

assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: resizePlan, boundary, extraFlags: ["&&"] }).blockers.includes(safeLocalExecutionBlockers.unsafeFlagBlocked));
pass("AC shell injection blocked");

assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: resizePlan, boundary, rawOutputPath: "..\\outside.mp4" }).blockers.includes(safeLocalExecutionBlockers.pathTraversalBlocked));
pass("AD path traversal blocked");

const outsidePlan = createVideoResizeExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  outputPath: path.join(process.cwd(), "outside_phase21o_resize.mp4")
}, boundary);
assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: outsidePlan, boundary }).blockers.includes(safeLocalExecutionBlockers.blockedOutputBoundary));
pass("AE outside output boundary blocked");

const overwritePlan = createVideoResizeExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  outputPath: fixture.localPathRef
}, boundary);
assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: overwritePlan, boundary }).blockers.includes(safeLocalExecutionBlockers.blockedSourceOverwrite));
pass("AF source overwrite blocked");

assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: resizePlan, boundary, executableOverride: "cmd.exe" }).blockers.includes(safeLocalExecutionBlockers.arbitraryExecutableBlocked));
pass("AG arbitrary executable blocked");

const invalidProfilePlan = createVideoResizeExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  targetProfile: "UNKNOWN_PROFILE"
}, boundary);
assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: invalidProfilePlan, boundary }).blockers.includes(safeLocalExecutionBlockers.unsupportedProfile));
pass("AH unsupported profile blocked");

assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: { ...resizePlan, operation: "transcode" }, boundary }).blockers.includes(safeLocalExecutionBlockers.unsupportedOperation));
pass("AI unsupported operation blocked");

const textPath = path.join(boundary.fixtureSourceRoot, "phase21o_not_media.txt");
fs.writeFileSync(textPath, "not media\n", "utf8");
const textPlan = createMediaProbeExecutionPlan({
  sourceAssetId: "phase21o_text_source",
  sourcePath: textPath
}, boundary);
assert.ok(evaluateLocalExecutionEligibility({
  flow: flowFor("MEDIA_PROBE", { ...fixture, localPathRef: textPath }, { source_media: textPath }),
  executionPlan: textPlan,
  boundary
}).blockers.includes(safeLocalExecutionBlockers.invalidFileType));
pass("AJ file type mismatch blocked");

const giantPlan = createVideoResizeExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  targetWidth: 9999,
  targetHeight: 9999
}, boundary);
assert.ok(evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: giantPlan, boundary }).blockers.includes(safeLocalExecutionBlockers.resourceLimit));
pass("AK resource limit blocked");

assert.equal(getCapability("VIDEO_TRIM").metadata.safeLocalExecutionAvailable, true);
assert.equal(getCapability("MEDIA_PROBE").metadata.safeLocalExecutionAvailable, true);
assert.equal(getCapability("VIDEO_RESIZE").metadata.safeLocalExecutionAvailable, true);
assert.equal(getCapability("AUDIO_EXTRACT").metadata.safeLocalExecutionAvailable, true);
pass("AL only proven capability promoted");

assert.equal(getCapability("IMAGE_GENERATE").metadata.safeLocalExecutionAvailable, undefined);
assert.ok(deferredSafeLocalCapabilities.some((item) => item.capabilityId === "IMAGE_RESIZE"));
pass("AM unproven remains disabled/non-executable");

assert.ok(productKnowledgeNodes.find((node) => node.nodeId === "production_media_probe_safe_local"));
assert.ok(productKnowledgeNodes.find((node) => node.nodeId === "production_video_resize_safe_local"));
assert.ok(productKnowledgeNodes.find((node) => node.nodeId === "production_audio_extract_safe_local"));
pass("AN Product Knowledge matches runtime truth");

const probePreview = buildExecutionPreview({
  primaryCapabilityId: "MEDIA_PROBE",
  productId: productIds.production
}, {
  providedInputs: { source_media: fixture.localPathRef }
});
assert.equal(probePreview.expectedArtifacts.includes("MediaProbeResult"), true);
assert.equal(probePreview.approvalPlan.providerActivationApprovalRequired, false);
pass("AO Preview matches runtime truth");

assert.equal(byCapability.MEDIA_PROBE.result.debugProvenance.gate.eligibility.preflightReady, true);
assert.equal(byCapability.VIDEO_RESIZE.result.debugProvenance.gate.eligibility.preflightReady, true);
pass("AP Preflight matches runtime truth");

assert.equal(getSafeLocalCapabilityProfile("VIDEO_EDIT"), null);
pass("AQ no category-wide auto-enable");

assert.equal(/ffmpeg|ffprobe|codec|cli flags/i.test(byCapability.VIDEO_RESIZE.executionResult.userSummary), false);
pass("AR user chooses outcome, not CLI flags");

assert.equal(byCapability.AUDIO_EXTRACT.result.debugProvenance.toolInvocation.toolClass, "FFMPEG_FFPROBE");
pass("AS local deterministic tool selected internally");

assert.equal(byCapability.VIDEO_RESIZE.result.debugProvenance.gate.eligibility.flow.approvalDiscovery.approvalRequests.length, 0);
pass("AT no unnecessary approval");

assert.ok(byCapability.AUDIO_EXTRACT.executionResult.userSummary.includes("исходник не измен"));
pass("AU human-readable result");

assert.ok(byCapability.AUDIO_EXTRACT.result.debugProvenance.toolInvocation.args.length > 0);
pass("AV advanced provenance separated");

assert.equal(matrix.proof.externalCallCounters.externalProviderCalls, 0);
pass("AW external provider calls = 0");

assert.equal(matrix.proof.externalCallCounters.externalModelCalls, 0);
pass("AX external model calls = 0");

assert.equal(matrix.proof.externalCallCounters.paymentActions, 0);
pass("AY payment actions = 0");

assert.equal(matrix.proof.externalCallCounters.publishActions, 0);
pass("AZ publish actions = 0");

assert.equal(matrix.proof.externalCallCounters.deployActions, 0);
pass("BA deploy actions = 0");

assert.equal(matrix.proof.externalCallCounters.adActions, 0);
pass("BB ad actions = 0");

assert.equal(matrix.proof.externalCallCounters.externalAccountMutations, 0);
pass("BC external account mutations = 0");

assert.equal(matrix.proof.externalCallCounters.productionDbMutations, 0);
pass("BD production DB mutations = 0");

assert.equal(matrix.proof.externalCallCounters.envKeyBillingChanges, 0);
pass("BE env/key/billing changes = 0");

const trimFingerprint = byCapability.VIDEO_TRIM.result.executionFingerprint;
const resizeFingerprint = createExecutionFingerprint({
  intentId: byCapability.VIDEO_TRIM.result.debugProvenance.gate.intentId,
  intentVersion: "1.0.0",
  capabilityId: "VIDEO_RESIZE",
  sourceFingerprint: fixture.fingerprint,
  normalizedParameters: resizePlan.normalizedParameters,
  toolClass: resizePlan.toolClass,
  requestedOutputSemantics: resizePlan.requestedOutput.artifactType
});
assert.notEqual(trimFingerprint, resizeFingerprint);

const failurePlan = createVideoResizeExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  targetProfile: "VIDEO_RESIZE_320x180"
}, boundary);
const failureGate = authorizeLocalExecution({
  eligibility: evaluateLocalExecutionEligibility({ flow: resizeFlow, executionPlan: failurePlan, boundary })
});
const failure = runSafeLocalExecution({
  gate: failureGate,
  executionId: "phase21o_resize_tool_failure",
  simulateToolFailure: true
});
assert.equal(failure.status, localExecutionStatuses.failed);
assert.equal(failure.sourcePreserved, true);
assert.equal(failure.derivedArtifacts.length, 0);

const verificationFailurePlan = createAudioExtractExecutionPlan({
  sourceAssetId: fixture.sourceAssetId,
  sourcePath: fixture.localPathRef,
  targetProfile: "AUDIO_WAV_STANDARD"
}, boundary);
const audioFlow = flowFor("AUDIO_EXTRACT", fixture, {
  source_media: fixture.localPathRef,
  target_profile: "AUDIO_WAV_STANDARD"
});
const verificationFailure = runSafeLocalExecution({
  gate: authorizeLocalExecution({
    eligibility: evaluateLocalExecutionEligibility({ flow: audioFlow, executionPlan: verificationFailurePlan, boundary })
  }),
  executionId: "phase21o_audio_verification_failure",
  simulateVerificationFailure: true
});
assert.equal(verificationFailure.status, localExecutionStatuses.verificationFailed);

const resizeRollback = rollbackLocalExecution(byCapability.VIDEO_RESIZE.result, boundary);
assert.equal(resizeRollback.status, localExecutionRollbackStatuses.completed);
assert.equal(fs.existsSync(byCapability.VIDEO_RESIZE.executionResult.derivedArtifacts[0].localPathRef), false);
assert.equal(fs.existsSync(fixture.localPathRef), true);
assert.equal(rollbackLocalExecution(byCapability.MEDIA_PROBE.result, boundary).status, localExecutionRollbackStatuses.notApplicable);

assert.ok(safeLocalOutputProfiles.VIDEO_RESIZE_320x180);
assert.ok(fs.existsSync(matrix.proofPath));

console.log("Safe Local Capability Expansion tests passed.");
