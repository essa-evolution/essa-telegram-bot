import assert from "node:assert/strict";

import {
  alertLevels,
  buildTechnologyResearchContext,
  claimStatuses,
  classifyEvidenceFromSource,
  classifyTechnologyAlert,
  costChangeClasses,
  createDefaultTechnologyScanSchedule,
  createTechnologyBenchmarkPlan,
  evidenceStatuses,
  fitAnalyzerRole,
  knownTechnologyCapabilityGaps,
  openSourceSecurityStates,
  recommendationStates,
  researchAgentRole,
  runTechnologyIntelligenceFixturePipeline,
  scoutAgentRole,
  sourceTrustTiers,
  technologyEventTypes,
  technologyIntelligenceFixtureSignals,
  technologyLifecycleStatuses,
  technologyRadar,
  technologySourceRegistry,
  verifierAgentRole,
  verifyTechnologyClaim
} from "../src/technologyIntelligence/index.js";

let failures = 0;

function check(label, fn) {
  try {
    const details = fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

const pipeline = runTechnologyIntelligenceFixturePipeline({
  signals: technologyIntelligenceFixtureSignals,
  knownCapabilityGaps: knownTechnologyCapabilityGaps,
  radar: [...technologyRadar]
});

const byId = (items, id) => items.find((item) => item.candidateId === id);
const candidate = (id) => byId(pipeline.scan.candidatesDiscovered, id);
const research = (id) => byId(pipeline.research, id);
const fit = (id) => byId(pipeline.relevance, id);
const rec = (id) => byId(pipeline.recommendations, id);
const risk = (id) => pipeline.risk[pipeline.scan.candidatesDiscovered.findIndex((item) => item.candidateId === id)];

check("A Scout candidate creation", () => {
  assert.equal(candidate("hypothetical_video_model").technologyType, "VIDEO_TOOL");
});

check("B source trust tiers", () => {
  assert.ok(technologySourceRegistry.some((source) => source.trustTier === sourceTrustTiers.tier1Official));
  assert.equal(classifyEvidenceFromSource({ sourceId: "social_signal" }), evidenceStatuses.socialClaim);
});

check("C social claim remains unverified", () => {
  const claim = verifyTechnologyClaim({ text: "viral claim", evidence: [{ sourceId: "social_signal" }] });
  assert.equal(claim.status, claimStatuses.unverified);
});

check("D official evidence upgrades confidence", () => {
  const claim = verifyTechnologyClaim({ text: "official claim", evidence: [{ sourceId: "official_documentation" }] });
  assert.equal(claim.status, claimStatuses.verified);
});

check("E ESSA capability-gap relevance", () => {
  assert.equal(fit("hypothetical_video_model").fillsGap, true);
  assert.ok(fit("hypothetical_video_model").capabilityCandidates.length === 0);
});

check("F irrelevant repo filtered/noise", () => {
  assert.ok(pipeline.scan.ignoredNoise.some((item) => item.candidateId === "irrelevant_viral_repository"));
  assert.equal(candidate("irrelevant_viral_repository"), undefined);
});

check("G security-risk candidate blocked", () => {
  assert.equal(risk("security_risk_repository").securityStatus, openSourceSecurityStates.rejected);
  assert.equal(risk("security_risk_repository").installsAllowed, false);
});

check("H provider update detected", () => {
  assert.ok(pipeline.scan.candidatesUpdated.some((item) => item.candidateId === "ox_alpha_glm_5_3_flash"));
});

check("I breaking change classified urgent", () => {
  assert.equal(candidate("model_deprecation").eventType, technologyEventTypes.breakingChange);
  assert.equal(classifyTechnologyAlert(candidate("model_deprecation")), alertLevels.urgent);
});

check("J price change classified", () => {
  assert.equal(candidate("provider_pricing_increase").signals[0].costChangeClass, costChangeClasses.regression);
  assert.ok(pipeline.scan.highPriorityItems.some((item) => item.candidateId === "provider_pricing_increase"));
});

check("K local/free alternative recognized", () => {
  assert.equal(fit("cheaper_local_alternative").potentialSavingsClass, costChangeClasses.freeAlternative);
  assert.equal(fit("cheaper_local_alternative").localExecutionPotential, "POSSIBLE_AFTER_SECURITY_REVIEW");
});

check("L recommendation WATCH", () => {
  assert.equal(rec("ox_alpha_glm_5_3_flash").recommendation, recommendationStates.watch);
});

check("M recommendation BENCHMARK", () => {
  assert.equal(rec("hypothetical_video_model").recommendation, recommendationStates.benchmark);
  assert.equal(rec("hypothetical_video_model").benchmarkPlan.providerCallsAllowed, false);
});

check("N recommendation REJECT", () => {
  assert.equal(rec("security_risk_repository").recommendation, recommendationStates.reject);
});

check("O no auto adoption", () => {
  assert.equal(rec("hypothetical_video_model").activations, 0);
  assert.notEqual(pipeline.radarEntries.find((item) => item.candidateId === "hypothetical_video_model").stage, technologyLifecycleStatuses.active);
});

check("P no auto install", () => {
  assert.equal(pipeline.audit.installs, 0);
  assert.equal(rec("hypothetical_open_voice_engine").installs, 0);
});

check("Q no API key creation", () => {
  assert.equal(pipeline.audit.apiKeysCreated, 0);
});

check("R no secret exposure", () => {
  assert.equal(pipeline.audit.secretChanges, 0);
});

check("S Tech Radar update", () => {
  assert.ok(pipeline.radarEntries.some((item) => item.candidateId === "capability_gap_match"));
});

check("T ReviewItem generation", () => {
  assert.equal(rec("hypothetical_video_model").reviewItem.nextSafeAction, "prepare_future_fixture_benchmark_for_human_approval");
});

check("U bounded research context", () => {
  const context = buildTechnologyResearchContext({
    sources: candidate("ox_alpha_glm_5_3_flash").sourceRefs,
    claims: research("ox_alpha_glm_5_3_flash").claims,
    maxClaims: 1,
    maxChars: 500
  });
  assert.equal(context.selectedClaims.length, 1);
  assert.equal(context.policy.neverSendFullMemoryAutomatically, true);
});

check("V benchmark handoff", () => {
  const plan = rec("hypothetical_video_model").benchmarkPlan;
  assert.equal(plan.benchmarkType, "TOOL_BENCHMARK_PLAN");
  assert.equal(plan.humanApprovalRequired, true);
});

check("W Quality History integration", () => {
  assert.ok(fit("ox_alpha_glm_5_3_flash").qualityRecords.some((record) => record.canonicalModelId === "z-ai/glm-5.3-flash"));
});

check("X Provider Health integration", () => {
  assert.ok(fit("ox_alpha_glm_5_3_flash").providerHealthSignals.some((snapshot) => snapshot.providerId === "z-ai" && snapshot.researchOnly === true));
});

check("Y Ox/GLM historical migration", () => {
  const ox = pipeline.radarEntries.find((item) => item.candidateId === "ox_alpha_glm_5_3_flash");
  assert.equal(ox.stage, technologyLifecycleStatuses.watch);
  assert.equal(ox.name, "Ox Alpha / GLM-5.3-Flash");
});

check("Z provider/external calls = 0", () => {
  assert.equal(pipeline.audit.providerCalls, 0);
  assert.equal(pipeline.audit.externalCalls, 0);
});

check("AA agent roles cannot adopt", () => {
  assert.equal(scoutAgentRole.mayAdopt, false);
  assert.equal(researchAgentRole.mayAdopt, false);
  assert.equal(verifierAgentRole.mayInstall, false);
  assert.equal(fitAnalyzerRole.mayMutateCapabilityFabric, false);
});

check("AB scheduling-ready only", () => {
  const schedule = createDefaultTechnologyScanSchedule();
  assert.equal(schedule.enabled, false);
  assert.equal(schedule.cadence, "scheduling_ready_only");
});

check("AC generic benchmark plan supports tool benchmarks", () => {
  const plan = createTechnologyBenchmarkPlan({ planId: "tool", candidateId: "candidate", benchmarkType: "TOOL_BENCHMARK_PLAN" });
  assert.equal(plan.installsAllowed, false);
  assert.equal(plan.secretAccessAllowed, false);
});

check("AD audit artifact captures no billing changes", () => {
  assert.equal(pipeline.audit.billingChanges, 0);
  assert.equal(pipeline.audit.artifactType, "TechnologyIntelligenceAuditArtifact");
});

if (failures > 0) {
  console.error(`Technology Intelligence tests failed: ${failures}`);
  process.exit(1);
}

console.log("Technology Intelligence tests passed.");

