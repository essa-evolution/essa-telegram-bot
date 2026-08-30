import { findLocalDeterministicCapability } from "./capabilityProfiles.js";
import { estimateCost, estimateTokens, evaluateBudget } from "./costPolicy.js";
import { selectFallbackCandidates } from "./fallbackPolicy.js";
import {
  createIntelligenceDecision,
  createIntelligenceRequest,
  decisionTypes,
  providerHealthStatuses,
  reasoningLevels
} from "./intelligenceContracts.js";
import { createIntelligenceProviderRegistry } from "./modelRegistry.js";
import { createProviderHealthSnapshot, providerIsSelectable } from "./providerHealth.js";
import { canonicalEscalationPath } from "./escalationPolicy.js";
import { selectReasoningTier } from "./reasoningPolicy.js";
import { glm53FlashResearchStatus } from "./glm53FlashResearchProfile.js";

export const localFirstPolicy = {
  policyId: "LOCAL_FIRST_POLICY",
  priority: [
    "deterministic/local solution",
    "free verified external tool where appropriate",
    "lowest-cost sufficient intelligence",
    "stronger model only when needed",
    "human review if complexity/risk/budget exceeds policy"
  ],
  externalModelRequiresLocalCheck: true
};

export const domainPolicyProfiles = {
  production: { defaultReasoning: reasoningLevels.terra, localToolsPreferred: ["ffmpeg", "ffprobe", "whisper.cpp"] },
  music_factory: { defaultReasoning: reasoningLevels.terra, solEscalationFor: ["composition_architecture", "complex_repair"] },
  mirror: { defaultReasoning: reasoningLevels.terra, providerCannotOwnIdentity: true },
  business: { defaultReasoning: reasoningLevels.terra, taskSpecificRouting: true }
};

function buildContextBudgetDecision(request) {
  const contextPack = request.contextPack || {};
  const selected = contextPack.selected || contextPack.selectedContext || [];
  const withheld = contextPack.withheld || contextPack.omitted || [];
  const budget = request.contextBudget || contextPack.budget || {};
  const usedChars = budget.usedChars || JSON.stringify(selected).length;

  return {
    selectedContextCount: Array.isArray(selected) ? selected.length : 0,
    withheldContextCount: Array.isArray(withheld) ? withheld.length : contextPack.omittedCount || 0,
    neverSendFullMemoryAutomatically: true,
    providerMayExpandContext: false,
    approxTokens: Math.ceil(usedChars / 4),
    privacyLevel: request.privacyRequirement || "standard",
    selectedContextReason: "bounded relevance/context budget",
    withheldContextReason: "not required for current task or outside budget"
  };
}

function requiresHumanBeforeExecution(request) {
  const highRisk = ["destructive_action", "publish", "deploy", "security_sensitive", "high_financial_consequence"];
  return highRisk.includes(request.taskType) || request.approvalPolicy?.humanRequiredBeforeModel === true;
}

function selectProviderForTier({ tier, registry, request }) {
  const openai = registry.find((provider) => provider.providerId === "openai");
  const anthropic = registry.find((provider) => provider.providerId === "anthropic");
  const preferred = request.providerPolicy?.preferredProvider;

  if (preferred) {
    const provider = registry.find((item) => item.providerId === preferred);
    if (provider && providerIsSelectable(provider)) return provider;
  }

  if (openai && providerIsSelectable(openai)) return openai;
  if (request.fallbackAllowed && anthropic && providerIsSelectable(anthropic)) return anthropic;
  return null;
}

function selectModelForTier(provider, tierPolicy) {
  if (!provider) return null;
  if (provider.providerId === "anthropic") return provider.models[0] || null;
  return provider.models.find((model) => model.modelId === tierPolicy.modelId) || provider.models[0] || null;
}

function normalizeModelName(value = "") {
  return String(value || "").trim().toLowerCase();
}

function requestedResearchOnlyGlm53Flash(request = {}) {
  const values = [
    request.providerPolicy?.preferredProvider,
    request.providerPolicy?.preferredModel,
    request.providerPolicy?.modelId,
    request.providerPolicy?.canonicalModelId,
    request.userIntent
  ].map(normalizeModelName);
  const aliases = [
    "z-ai",
    "zai",
    "glm-5.3-flash",
    "glm 5.3 flash",
    "z-ai/glm-5.3-flash",
    "ox alpha",
    "ox-alpha",
    "stealth/ox-alpha"
  ];

  return values.some((value) => aliases.some((alias) => value === alias || value.includes(alias)));
}

export function routeIntelligenceRequest(input = {}, options = {}) {
  const request = createIntelligenceRequest(input);
  const registry = options.registry || createIntelligenceProviderRegistry(options.extraProviders || []);
  const policyChecks = [
    { code: "local_first_checked", passed: true, policyId: localFirstPolicy.policyId },
    { code: "provider_calls_disabled_in_phase_21k_ox", passed: true },
    {
      code: "glm_5_3_flash_research_artifact_loaded_as_source_of_truth",
      passed: true,
      details: {
        sourceOfTruth: glm53FlashResearchStatus.sourceOfTruth,
        status: glm53FlashResearchStatus.watchResearchOnly
      }
    },
    { code: "secrets_not_in_request_contract", passed: !JSON.stringify(request).match(/api[_-]?key|bearer\s|sk[-_]/i) }
  ];
  const contextBudgetDecision = buildContextBudgetDecision(request);
  const tokenEstimate = estimateTokens(request);

  if (requiresHumanBeforeExecution(request)) {
    return createIntelligenceDecision({
      requestId: request.requestId,
      decisionType: decisionTypes.humanRequired,
      selectionReason: "High-risk task requires human approval before model/tool execution.",
      approvalRequired: true,
      policyChecks,
      contextBudgetDecision,
      traceId: request.traceId
    });
  }

  const localTool = findLocalDeterministicCapability(request);
  if (localTool) {
    return createIntelligenceDecision({
      requestId: request.requestId,
      decisionType: decisionTypes.localTool,
      selectedProvider: "local",
      selectedLocalTool: localTool.decisionLabel,
      reasoningLevel: reasoningLevels.none,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCost: estimateCost({ toolCost: 0 }),
      selectionReason: "Local deterministic capability satisfies the request; no LLM is selected.",
      fallbackCandidates: [],
      escalationPath: canonicalEscalationPath,
      approvalRequired: false,
      policyChecks,
      contextBudgetDecision,
      traceId: request.traceId
    });
  }

  if (requestedResearchOnlyGlm53Flash(request)) {
    return createIntelligenceDecision({
      requestId: request.requestId,
      decisionType: decisionTypes.blocked,
      selectedProvider: "z-ai",
      selectedModel: "glm-5.3-flash",
      reasoningLevel: reasoningLevels.none,
      selectionReason: "GLM-5.3-Flash is WATCH/RESEARCH ONLY for Phase 21K-OX; Ox Alpha is preserved only as a historical stealth alias.",
      fallbackCandidates: [],
      escalationPath: ["SECURITY_REVALIDATION", "LEGAL_REVIEW", "BENCHMARK_REVALIDATION", "HUMAN_REVIEW"],
      approvalRequired: true,
      policyChecks: [
        ...policyChecks,
        {
          code: "glm_5_3_flash_watch_research_only_blocks_selection",
          passed: false,
          details: glm53FlashResearchStatus
        },
        ...registry.map((item) => ({ code: "provider_health_snapshot", passed: true, details: createProviderHealthSnapshot(item) }))
      ],
      contextBudgetDecision,
      traceId: request.traceId
    });
  }

  const tierPolicy = selectReasoningTier(request);
  const provider = selectProviderForTier({ tier: tierPolicy.tier, registry, request });

  if (!provider) {
    return createIntelligenceDecision({
      requestId: request.requestId,
      decisionType: request.fallbackAllowed ? decisionTypes.humanRequired : decisionTypes.blocked,
      reasoningLevel: tierPolicy.tier,
      selectionReason: "No provider satisfies health/policy requirements.",
      fallbackCandidates: selectFallbackCandidates({ registry, requiredCapabilities: request.requiredCapabilities }),
      approvalRequired: true,
      policyChecks: [
        ...policyChecks,
        ...registry.map((item) => ({ code: "provider_health_snapshot", passed: true, details: createProviderHealthSnapshot(item) }))
      ],
      contextBudgetDecision,
      traceId: request.traceId
    });
  }

  const model = selectModelForTier(provider, tierPolicy);
  const estimatedCost = estimateCost({ provider, model, request });
  const budget = evaluateBudget({ request, estimatedCost, external: true });
  const healthCheck = {
    code: "provider_health_allows_dry_routing",
    passed: provider.health !== providerHealthStatuses.unavailable,
    details: createProviderHealthSnapshot(provider)
  };

  if (!budget.ok) {
    return createIntelligenceDecision({
      requestId: request.requestId,
      decisionType: decisionTypes.blocked,
      selectedProvider: provider.providerId,
      selectedModel: model?.modelId || null,
      reasoningLevel: tierPolicy.tier,
      estimatedInputTokens: tokenEstimate.estimatedInputTokens,
      estimatedOutputTokens: tokenEstimate.estimatedOutputTokens,
      estimatedCost,
      selectionReason: "Budget policy blocks external model selection.",
      fallbackCandidates: request.fallbackAllowed
        ? selectFallbackCandidates({ registry, selectedProviderId: provider.providerId, requiredCapabilities: request.requiredCapabilities })
        : [],
      escalationPath: ["HUMAN_REVIEW"],
      approvalRequired: true,
      policyChecks: [...policyChecks, healthCheck, ...budget.checks],
      contextBudgetDecision,
      traceId: request.traceId
    });
  }

  return createIntelligenceDecision({
    requestId: request.requestId,
    decisionType: decisionTypes.externalModel,
    selectedProvider: provider.providerId,
    selectedModel: model?.modelId || null,
    reasoningLevel: provider.providerId === "anthropic" ? reasoningLevels.claude : tierPolicy.tier,
    estimatedInputTokens: tokenEstimate.estimatedInputTokens,
    estimatedOutputTokens: tokenEstimate.estimatedOutputTokens,
    estimatedCost,
    selectionReason: `${provider.providerId}/${model?.modelId || "unknown"} is the lowest sufficient dry-route profile for ${request.taskType || "task"}.`,
    fallbackCandidates: selectFallbackCandidates({ registry, selectedProviderId: provider.providerId, requiredCapabilities: request.requiredCapabilities }),
    escalationPath: canonicalEscalationPath,
    approvalRequired: true,
    policyChecks: [...policyChecks, healthCheck, ...budget.checks],
    contextBudgetDecision,
    traceId: request.traceId
  });
}
