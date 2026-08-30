import assert from "node:assert/strict";
import fs from "node:fs";

import { providerCapabilitySupport } from "../src/capabilities/capabilityContracts.js";
import { getProviderCandidatesForCapability, providerCapabilityMap } from "../src/capabilities/providerCapabilityMap.js";
import { runProductionBookModelBenchmark } from "../src/benchmarks/modelProvider/runner.js";
import {
  capabilityValues,
  createIntelligenceProviderRegistry,
  decisionTypes,
  getModelProfile,
  glm53FlashResearchSourcePath,
  glm53FlashResearchStatus,
  glm53FlashTechRadarEntry,
  providerIsSelectable,
  createProviderHealthSnapshot,
  qualityHistory,
  routeIntelligenceRequest,
  zAiProvider
} from "../src/intelligence/index.js";

let failures = 0;

async function check(label, fn) {
  try {
    const details = await fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

const artifact = JSON.parse(fs.readFileSync(glm53FlashResearchSourcePath, "utf8"));
const registry = createIntelligenceProviderRegistry();
const zAi = registry.find((provider) => provider.providerId === "z-ai");
const glm = getModelProfile("z-ai", "glm-5.3-flash", registry);

await check("A OxAlphaResearchArtifact is the source of truth", () => {
  assert.equal(artifact.artifactName, "OxAlphaResearchArtifact");
  assert.equal(glm53FlashResearchStatus.sourceOfTruth, glm53FlashResearchSourcePath);
});

await check("B canonical model replaces original Ox Alpha candidate assumption", () => {
  assert.equal(glm53FlashResearchStatus.canonicalModelId, "z-ai/glm-5.3-flash");
  assert.equal(glm53FlashTechRadarEntry.canonicalName, "GLM-5.3-Flash");
});

await check("C Ox Alpha is preserved only as historical alias", () => {
  assert.ok(glm53FlashResearchStatus.historicalAliases.includes("Ox Alpha"));
  assert.ok(glm53FlashResearchStatus.historicalAliases.includes("stealth/ox-alpha"));
  assert.notEqual(glm.modelId, "stealth/ox-alpha");
});

await check("D Z.ai provider exists only as architecture metadata", () => {
  assert.equal(zAi.providerId, "z-ai");
  assert.equal(zAi.executable, false);
  assert.equal(zAi.invokeAdapter, null);
});

await check("E GLM-5.3-Flash profile is not executable", () => {
  assert.equal(glm.executable, false);
  assert.equal(glm.selectionPolicy.selectableForUserTasks, false);
});

await check("F provider health prevents selection", () => {
  assert.equal(providerIsSelectable(zAi), false);
  assert.equal(createProviderHealthSnapshot(zAi).researchOnly, true);
});

await check("G provider health requires revalidation", () => {
  const snapshot = createProviderHealthSnapshot(zAi);
  assert.equal(snapshot.requiresRevalidation, true);
  assert.equal(snapshot.liveHealthCheckMade, false);
});

await check("H router blocks explicit Ox Alpha requests", () => {
  const decision = routeIntelligenceRequest({ requestId: "ox", userIntent: "Use Ox Alpha for this task" });
  assert.equal(decision.decisionType, decisionTypes.blocked);
  assert.equal(decision.selectedModel, "glm-5.3-flash");
  assert.ok(decision.policyChecks.some((item) => item.code === "glm_5_3_flash_watch_research_only_blocks_selection" && item.passed === false));
});

await check("I router blocks canonical GLM-5.3-Flash requests", () => {
  const decision = routeIntelligenceRequest({
    requestId: "glm",
    providerPolicy: { preferredProvider: "z-ai", preferredModel: "z-ai/glm-5.3-flash" }
  });
  assert.equal(decision.decisionType, decisionTypes.blocked);
  assert.equal(decision.fallbackCandidates.length, 0);
});

await check("J router still routes local media rendering to local tools", () => {
  const decision = routeIntelligenceRequest({ requestId: "local", taskType: "video_render", requiredCapabilities: ["local_video_render"] });
  assert.equal(decision.decisionType, decisionTypes.localTool);
  assert.equal(decision.selectedLocalTool, "FFmpeg");
});

await check("K video input and video rendering are distinct capabilities", () => {
  assert.equal(glm.capabilities.video_input, capabilityValues.yes);
  assert.equal(glm.capabilities.video_rendering, capabilityValues.no);
});

await check("L audio input is not claimed", () => {
  assert.equal(glm.capabilities.audio_input, capabilityValues.no);
});

await check("M structured output is partial, not overclaimed", () => {
  assert.equal(glm.capabilities.structured_output, capabilityValues.partial);
});

await check("N pricing is revalidation-gated", () => {
  assert.equal(glm.pricing.priceRevalidationRequired, true);
  assert.equal(glm53FlashTechRadarEntry.pricing.discountExpiresAtUtc, "2026-09-09T16:00:00.000Z");
});

await check("O Quality History has no benchmark score yet", () => {
  const record = qualityHistory.find((item) => item.canonicalModelId === "z-ai/glm-5.3-flash");
  assert.equal(record.status, "WATCH_RESEARCH_ONLY");
  assert.equal(record.qualityScore, null);
  assert.equal(record.providerCallsMade, false);
});

await check("P benchmark report lists GLM as disabled without a call", async () => {
  const report = await runProductionBookModelBenchmark({ allowProviderCalls: false, env: {} });
  const result = report.providerResults.find((item) => item.providerId === "z-ai");
  assert.equal(result.modelId, "z-ai/glm-5.3-flash");
  assert.ok(result.errors.includes("provider_disabled_research_only"));
  assert.equal(result.metadata.networkCallStatus, "NOT_EXECUTED");
});

await check("Q benchmark safety keeps provider calls disabled", async () => {
  const report = await runProductionBookModelBenchmark({ allowProviderCalls: true, executeProviderCall: true, env: {} });
  const result = report.providerResults.find((item) => item.providerId === "z-ai");
  assert.equal(result.metadata.status, "DISABLED");
  assert.equal(result.metadata.researchOnly, true);
});

await check("R provider capability map marks GLM research-only", () => {
  const entry = providerCapabilityMap.ZAI_GLM_5_3_FLASH;
  assert.equal(entry.researchOnly, true);
  assert.equal(entry.executableNow, false);
});

await check("S provider capability map does not verify video editing", () => {
  const entry = providerCapabilityMap.ZAI_GLM_5_3_FLASH;
  assert.equal(entry.capabilities.VIDEO_UNDERSTAND, providerCapabilitySupport.declaredNotVerified);
  assert.equal(entry.capabilities.VIDEO_EDIT, providerCapabilitySupport.unknown);
});

await check("T provider candidates never expose GLM as executable for video edit", () => {
  const candidates = getProviderCandidatesForCapability("VIDEO_EDIT");
  const candidate = candidates.find((item) => item.providerId === "ZAI_GLM_5_3_FLASH");
  assert.equal(candidate.executableNow, false);
  assert.equal(candidate.supportStatus, providerCapabilitySupport.unknown);
});

await check("U no OpenRouter or Z.ai credential is introduced", () => {
  assert.deepEqual(zAi.credentialRequirements, []);
  assert.equal(zAi.privacyMetadata.sendSecretsAllowed, false);
});

await check("V source-sensitive data is blocked by metadata", () => {
  assert.equal(glm.security.sendEssaSourceAllowed, false);
  assert.equal(glm.security.sendUserMediaAllowed, false);
  assert.equal(glm.security.requiresSecurityReview, true);
});

await check("W superiority claims remain unverified", () => {
  assert.equal(glm53FlashTechRadarEntry.benchmarkStatus.superiorityClaimsAgainstGpt56Sol, "UNVERIFIED");
  assert.equal(glm53FlashTechRadarEntry.benchmarkStatus.superiorityClaimsAgainstClaudeFable5, "UNVERIFIED");
});

await check("X Phase 21K-OX stops before Phase 21L", () => {
  assert.equal(glm53FlashResearchStatus.phaseStop, "21K-OX");
  assert.equal(glm53FlashResearchStatus.nextPhaseBlocked, "21L");
});

if (failures > 0) {
  console.error(`Phase 21K-OX GLM research tests failed: ${failures}`);
  process.exit(1);
}

console.log("Phase 21K-OX GLM research tests passed.");
