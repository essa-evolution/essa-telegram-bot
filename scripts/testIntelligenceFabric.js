import {
  activationStates,
  budgetModes,
  createIntelligenceProviderRegistry,
  decisionTypes,
  evaluateVerificationControlledEscalation,
  getModelProfile,
  openAiGpt56Profiles,
  providerHealthStatuses,
  reasoningLevels,
  routeIntelligenceRequest
} from "../src/intelligence/index.js";
import { loadLisaCharacterCore } from "../src/identity/lisaCharacterCore.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function noProviderCalls(decision) {
  return decision.policyChecks.some((check) =>
    ["provider_calls_disabled_in_phase_21c", "provider_calls_disabled_in_phase_21k_ox"].includes(check.code) &&
    check.passed
  );
}

const trim = routeIntelligenceRequest({
  requestId: "A",
  taskType: "video_trim",
  userIntent: "Trim video 00:04-00:19",
  requiredCapabilities: ["video_trim"]
});
check(
  trim.decisionType === decisionTypes.localTool &&
    trim.selectedLocalTool === "FFmpeg" &&
    trim.estimatedCost.totalEstimatedCost === 0 &&
    noProviderCalls(trim),
  "A video trim routes to local FFmpeg with no LLM",
  trim
);

const classify = routeIntelligenceRequest({
  requestId: "B",
  taskType: "classification",
  taskComplexity: "bulk_simple",
  userIntent: "Classify 10,000 product descriptions"
});
check(
  classify.decisionType === decisionTypes.externalModel &&
    classify.selectedProvider === "openai" &&
    classify.selectedModel === "gpt-5.6-luna" &&
    classify.estimatedCost.priceRevalidationRequired === true,
  "B bulk simple classification dry-routes to Luna",
  classify
);

const productionIntent = routeIntelligenceRequest({
  requestId: "C",
  domain: "production",
  taskType: "production_intent",
  taskComplexity: "normal",
  userIntent: "Create semantic ProductionIntent from normal transcript"
});
check(
  productionIntent.selectedModel === "gpt-5.6-terra" &&
    productionIntent.reasoningLevel === reasoningLevels.terra,
  "C normal ProductionIntent dry-routes to Terra",
  productionIntent
);

const architecture = routeIntelligenceRequest({
  requestId: "D",
  taskType: "architecture",
  taskComplexity: "complex",
  qualityRequirement: "high",
  userIntent: "Architecturally redesign ESSA Music Factory"
});
check(
  architecture.selectedModel === "gpt-5.6-sol" &&
    architecture.reasoningLevel === reasoningLevels.solStandard,
  "D complex architecture dry-routes to Sol",
  architecture
);

const failedRepair = routeIntelligenceRequest({
  requestId: "E",
  taskType: "multi_failure_repair",
  taskComplexity: "exceptional",
  qualityRequirement: "critical",
  repairAttempts: 2
});
check(
  failedRepair.selectedModel === "gpt-5.6-sol" &&
    failedRepair.reasoningLevel === reasoningLevels.solMax,
  "E repeated repair failures dry-route to Sol Max",
  failedRepair
);

const verification = evaluateVerificationControlledEscalation({
  decision: failedRepair,
  verification: { passed: false, failedAttempts: 1 }
});
check(
  verification.escalationRequired === true &&
    verification.reason === "verification_controls_outcome",
  "F verifier failure escalates or repairs; provider completion is not proof",
  verification
);

const budgetBlocked = routeIntelligenceRequest({
  requestId: "G",
  taskType: "semantic_planning",
  maxCostUsd: 0
});
check(
  budgetBlocked.decisionType === decisionTypes.blocked &&
    budgetBlocked.policyChecks.some((check) => check.code === "task_budget_exhausted"),
  "G exhausted budget blocks external model",
  budgetBlocked
);

const unavailableRegistry = createIntelligenceProviderRegistry().map((provider) =>
  provider.providerId === "openai"
    ? { ...provider, health: providerHealthStatuses.unavailable }
    : provider
);
const openAiUnavailable = routeIntelligenceRequest({
  requestId: "H",
  taskType: "semantic_planning",
  providerPolicy: { preferredProvider: "openai" }
}, { registry: unavailableRegistry });
check(
  openAiUnavailable.selectedProvider === "anthropic" ||
    [decisionTypes.humanRequired, decisionTypes.blocked].includes(openAiUnavailable.decisionType),
  "H OpenAI unavailable uses allowed alternative or controlled failure",
  openAiUnavailable
);

const stt = routeIntelligenceRequest({
  requestId: "I",
  taskType: "transcription",
  requiredCapabilities: ["local_transcription"]
});
check(
  stt.decisionType === decisionTypes.localTool &&
    stt.selectedLocalTool === "whisper.cpp",
  "I local whisper.cpp transcription avoids paid STT",
  stt
);

const lisaCore = loadLisaCharacterCore();
const lisaGeneration = routeIntelligenceRequest({
  requestId: "J",
  taskType: "content_planning",
  contextPack: {
    selected: [lisaCore],
    budget: { usedChars: 1000 }
  }
});
check(
  lisaCore.providerIndependent === true &&
    lisaGeneration.contextBudgetDecision.neverSendFullMemoryAutomatically === true &&
    lisaGeneration.policyChecks.every((check) => check.code !== "secrets_not_in_request_contract" || check.passed),
  "J Lisa Character Core remains ESSA-owned and bounded in context",
  { lisaCore, decision: lisaGeneration }
);

const registry = createIntelligenceProviderRegistry();
const openai = registry.find((provider) => provider.providerId === "openai");
const anthropic = registry.find((provider) => provider.providerId === "anthropic");
check(
  openai.models.length === 3 &&
    openAiGpt56Profiles.every((model) => model.providerId === "openai" && model.executable === false) &&
    getModelProfile("openai", "gpt-5.6-sol").reasoningProfiles.includes("SOL_MAX") &&
    openai.credentialRequirements.includes("OPENAI_API_KEY") &&
    openai.status === activationStates.architectureOnly,
  "OpenAI Luna/Terra/Sol are non-executing models under one provider",
  openai
);

check(
  anthropic.providerId === "anthropic" &&
    anthropic.models[0].modelId === "claude_agent_sdk" &&
    anthropic.executable === false,
  "Claude coexists as optional provider-independent Anthropic profile",
  anthropic
);

const secretAttempt = routeIntelligenceRequest({
  requestId: "secret",
  taskType: "semantic_planning",
  contextPack: { OPENAI_API_KEY: "sk-test-secret" }
});
check(
  secretAttempt.policyChecks.some((check) => check.code === "secrets_not_in_request_contract" && check.passed === false),
  "Secret-like values are detected by policy checks",
  secretAttempt.policyChecks
);

const freeOnly = routeIntelligenceRequest({
  requestId: "free",
  taskType: "semantic_planning",
  budgetMode: budgetModes.freeOnly
});
check(
  freeOnly.decisionType === decisionTypes.blocked &&
    freeOnly.policyChecks.some((check) => check.code === "free_only_blocks_external_model"),
  "FREE_ONLY blocks external model when no local path satisfies task",
  freeOnly
);

if (failures > 0) {
  console.error(`Intelligence Fabric tests failed: ${failures}`);
  process.exit(1);
}

console.log("Intelligence Fabric tests passed.");
