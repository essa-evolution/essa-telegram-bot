import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  dryRunLiveScriptGenerationPreflight,
  externalZeroCounters,
  firstLiveScriptGenerationRoute,
  firstLiveScriptTokenBounds,
  liveScriptGenerationBoundaryStatus,
  proposedFirstLiveSpendingCeilingUsd,
  runLiveScriptGenerationFailureTests,
  verifiedOpenAiGpt56Pricing
} from "../src/intelligence/index.js";

const passed = [];
function pass(label) {
  passed.push(label);
  console.log(`PASS ${label}`);
}

const preflight = dryRunLiveScriptGenerationPreflight({
  env: {
    OPENAI_API_KEY: "present_for_presence_only"
  }
});

assert.equal(preflight.phase, "21S-A");
pass("A phase marker present");
assert.equal(preflight.status, liveScriptGenerationBoundaryStatus.readyForLiveScriptGeneration);
pass("B dry run reaches ready boundary");
assert.equal(preflight.liveExecutionState, liveScriptGenerationBoundaryStatus.liveExecutionNotAuthorized);
pass("C live execution remains unauthorized");
assert.equal(preflight.liveScriptGenerateCallMade, false);
pass("D no SCRIPT_GENERATE live call made");
assert.equal(preflight.externalProviderCallMade, false);
pass("E no provider call made");
assert.deepEqual(preflight.selectedRoute, firstLiveScriptGenerationRoute);
pass("F selected route is explicit and single");
assert.equal(preflight.selectedRoute.automaticFallbackAllowed, false);
pass("G paid fallback disabled");
assert.equal(preflight.selectedRoute.maxExternalAttempts, 1);
pass("H max external attempts is one");
assert.equal(preflight.providerActivationState, "READY_FOR_ACTIVATION");
pass("I provider activation state is readiness only");
assert.equal(preflight.providerHealth, "AVAILABLE");
pass("J provider health is dry-route selectable");
assert.equal(preflight.credentialPresence.OPENAI_API_KEY, "CREDENTIAL_PRESENT");
pass("K credential presence state is value-free");
assert.equal(JSON.stringify(preflight).includes("present_for_presence_only"), false);
pass("L credential value not preserved");

assert.equal(verifiedOpenAiGpt56Pricing.models["gpt-5.6-luna"].inputPerMillionUsd, 0.20);
pass("M Luna input pricing verified");
assert.equal(verifiedOpenAiGpt56Pricing.models["gpt-5.6-luna"].outputPerMillionUsd, 1.20);
pass("N Luna output pricing verified");
assert.equal(verifiedOpenAiGpt56Pricing.models["gpt-5.6-luna"].contextWindowTokens, 1050000);
pass("O Luna context window recorded");
assert.equal(preflight.costEstimate.maxCostUsd, 0.0066);
pass("P max cost estimate calculated");
assert.equal(preflight.costGuard.status, "PASS");
pass("Q cost guard passes under ceiling");
assert.equal(preflight.costGuard.proposedCeilingUsd, proposedFirstLiveSpendingCeilingUsd);
pass("R proposed spending ceiling recorded");
assert.deepEqual(preflight.tokenBounds, firstLiveScriptTokenBounds);
pass("S token bounds recorded");

assert.equal(preflight.scriptGenerateContract.capabilityId, "SCRIPT_GENERATE");
pass("T SCRIPT_GENERATE contract exists");
assert.equal(preflight.scriptGenerateContract.inputSource, "CANONICAL_ARTIFACTS_ONLY");
pass("U inputs derive from canonical artifacts");
assert.equal(preflight.scriptGenerateContract.missingInputs.length, 0);
pass("V no missing canonical inputs in fixture");
assert.equal(preflight.productionScriptArtifactContract.modelType, "ProductionScriptArtifact");
pass("W ProductionScriptArtifact contract exists");
assert.equal(preflight.productionScriptArtifactContract.verificationStatus, "PENDING_GENERATION");
pass("X script artifact not pretending generation");
assert.equal(preflight.productionScriptArtifactContract.qualityReviewStatus, "NOT_RUN");
pass("Y quality review not run before generation");
assert.ok(preflight.productionScriptArtifactContract.modelRouteProvenance.internalOnly);
pass("Z provider provenance internal by default");

assert.equal(preflight.lisaBinding.characterCoreBound, true);
pass("AA Lisa Character Core bound");
assert.equal(preflight.lisaBinding.productionProfileBound, true);
pass("AB Lisa Production Profile bound");
assert.equal(preflight.lisaBinding.genericAssistantPersonalityAllowed, false);
pass("AC generic assistant personality blocked");
assert.ok(preflight.qualityGate.checks.includes("character_core_binding"));
pass("AD quality gate checks Character Core binding");
assert.ok(preflight.qualityGate.checks.includes("lineage_integrity"));
pass("AE quality gate checks lineage integrity");
assert.equal(preflight.qualityGate.modelBasedReviewRequiresSeparateApproval, true);
pass("AF model-based quality review separately gated");

assert.equal(preflight.approvalContract.scope.workflowId, preflight.scriptGenerateContract.workflowId);
pass("AG scoped approval bound to one workflow");
assert.equal(preflight.approvalContract.scope.stepId, "STEP_2_SCRIPT_GENERATE");
pass("AH scoped approval bound to SCRIPT_GENERATE step");
assert.equal(preflight.approvalContract.scope.providerId, "openai");
pass("AI scoped approval bound to provider");
assert.equal(preflight.approvalContract.scope.modelId, "gpt-5.6-luna");
pass("AJ scoped approval bound to model");
assert.equal(preflight.approvalContract.scope.maxRequestCount, 1);
pass("AK scoped approval max request count one");
assert.equal(preflight.approvalContract.scope.automaticPaidFallbackAllowed, false);
pass("AL scoped approval forbids paid fallback");
assert.ok(preflight.approvalContract.doesNotAuthorize.includes("VOICE_RENDER"));
pass("AM scoped approval does not authorize voice");
assert.ok(preflight.approvalContract.doesNotAuthorize.includes("AVATAR_RENDER"));
pass("AN scoped approval does not authorize avatar");
assert.equal(preflight.approvalContract.executionAuthorityNow, false);
pass("AO approval contract does not execute today");

assert.equal(preflight.executionFrontier.currentStepId, "STEP_2_SCRIPT_GENERATE");
pass("AP frontier reaches SCRIPT_GENERATE");
assert.equal(preflight.executionFrontier.blocker, "LIVE_PROVIDER_EXECUTION_APPROVAL_REQUIRED");
pass("AQ frontier blocker explicit");
assert.equal(preflight.executionFrontier.doesNotAdvanceToVoiceRender, true);
pass("AR frontier does not advance to voice render");
assert.equal(preflight.retryPolicy.automaticPaidRetryAllowed, false);
pass("AS no paid retry");
assert.equal(preflight.paidFallbackPolicy.ifPrimaryFails, "STOP_NO_SILENT_SPEND");
pass("AT primary failure stops");

assert.ok(preflight.dataBoundary.sentExternallyInFutureLiveCall.includes("ContentBrief fields required for script generation"));
pass("AU data sent externally documented");
assert.ok(preflight.dataBoundary.neverSent.includes("API keys"));
pass("AV never-sent secrets documented");
assert.equal(preflight.privacyFindings.trainingPolicy.status, "VERIFIED");
pass("AW training policy status recorded");
assert.equal(preflight.privacyFindings.retentionPolicy.status, "VERIFIED_WITH_ACCOUNT_DEPENDENT_OPTIONS");
pass("AX retention policy status recorded");

for (const [key, value] of Object.entries(externalZeroCounters)) {
  assert.equal(preflight.externalCounters[key], value, key);
}
pass("AY all external counters zero");

const failureTests = runLiveScriptGenerationFailureTests({
  env: {
    OPENAI_API_KEY: "present_for_presence_only"
  }
});
for (const test of failureTests) {
  assert.equal(test.passed, true, test.name);
  assert.equal(test.failedClosedBeforeExternalExecution, true, test.name);
}
pass("AZ all fail-closed cases pass");
assert.equal(failureTests.length, 15);
pass("BA required failure test count present");

const proofPreflight = dryRunLiveScriptGenerationPreflight();

const proof = {
  artifactType: "LiveScriptGenerationReadinessProof",
  phase: "21S-A",
  baselineCommit: "04fb9504607dc62b8212b4dc0333df80fd56b59d",
  architectureReused: [
    "Intelligence Fabric",
    "Intelligence Router",
    "provider/model registry",
    "provider health",
    "cost policy",
    "Capability Fabric",
    "ExecutionGateway boundary",
    "Scoped Approval Tokens",
    "ProductionGoal",
    "ProductionIntent",
    "ExecutionWorkflow",
    "ExecutionFrontier",
    "Goal-to-Content Workflow Foundation",
    "Lisa Character Core",
    "Lisa Production Profile"
  ],
  providerAdaptersDiscovered: [
    { providerId: "local", executable: true, activationState: "READY_FOR_ACTIVATION" },
    { providerId: "openai", executable: false, activationState: preflight.providerActivationState },
    { providerId: "z-ai", executable: false, activationState: "ARCHITECTURE_ONLY" },
    { providerId: "anthropic", executable: false, activationState: "ARCHITECTURE_ONLY" }
  ],
  credentialPresenceStates: proofPreflight.credentialPresence,
  candidateRoutes: [
    firstLiveScriptGenerationRoute,
    { providerId: "openai", modelId: "gpt-5.6-terra", recommendation: "WATCH_HIGHER_COST_THAN_NEEDED" },
    { providerId: "openai", modelId: "gpt-5.6-sol", recommendation: "REJECT_FOR_FIRST_PROOF_TOO_EXPENSIVE" },
    { providerId: "anthropic", modelId: "claude_agent_sdk", recommendation: "REJECT_NO_PAID_FALLBACK_FOR_FIRST_PROOF" }
  ],
  pricingProvenance: preflight.pricingProvenance,
  selectedCandidateRecommendation: {
    route: firstLiveScriptGenerationRoute,
    why: "Lowest verified OpenAI GPT-5.6 text route already represented in ESSA registry and sufficient for a small script-generation proof."
  },
  scriptExecutionContract: proofPreflight.scriptGenerateContract,
  artifactContract: proofPreflight.productionScriptArtifactContract,
  lisaIdentityBinding: proofPreflight.lisaBinding,
  qualityGate: proofPreflight.qualityGate,
  approvalContract: proofPreflight.approvalContract,
  costGuard: proofPreflight.costGuard,
  tokenBounds: proofPreflight.tokenBounds,
  retryPolicy: proofPreflight.retryPolicy,
  dataBoundary: proofPreflight.dataBoundary,
  privacyFindings: proofPreflight.privacyFindings,
  dryRunResult: {
    status: proofPreflight.status,
    liveExecutionState: proofPreflight.liveExecutionState,
    externalProviderCallMade: proofPreflight.externalProviderCallMade,
    liveScriptGenerateCallMade: proofPreflight.liveScriptGenerateCallMade
  },
  failureTests,
  externalCounters: proofPreflight.externalCounters,
  frontierState: proofPreflight.executionFrontier,
  blockers: proofPreflight.blockers,
  readinessStatus: proofPreflight.status,
  liveExecutionAuthorized: false,
  noPaidProviderCalls: true,
  phase21sLiveCallStoppedBeforeExecution: true
};

const proofPath = path.join(process.cwd(), "artifacts", "intelligence", "phase21s-a", "LiveScriptGenerationReadinessProof.json");
fs.mkdirSync(path.dirname(proofPath), { recursive: true });
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
assert.ok(fs.existsSync(proofPath));
pass("BB proof artifact written");

assert.equal(passed.length, 54);
console.log(`Live script generation readiness checks passed: ${passed.length}`);
