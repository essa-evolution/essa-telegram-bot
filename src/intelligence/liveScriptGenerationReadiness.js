import crypto from "node:crypto";

import { budgetModes } from "./costPolicy.js";
import { createIntelligenceProviderRegistry } from "./modelRegistry.js";
import { routeIntelligenceRequest } from "./intelligenceRouter.js";
import {
  activationStates,
  decisionTypes,
  providerHealthStatuses
} from "./intelligenceContracts.js";
import {
  createGoalToContentExecutionWorkflow,
  executionFrontierStates
} from "../production/index.js";
import { loadLisaCharacterCore } from "../identity/lisaCharacterCore.js";
import { getLisaProductionProfile } from "../identity/lisaProductionProfile.js";

export const liveScriptGenerationBoundaryStatus = Object.freeze({
  readyForLiveScriptGeneration: "READY_FOR_LIVE_SCRIPT_GENERATION",
  liveExecutionNotAuthorized: "LIVE_EXECUTION_NOT_AUTHORIZED",
  blocked: "BLOCKED"
});

export const firstLiveScriptGenerationRoute = Object.freeze({
  providerId: "openai",
  modelId: "gpt-5.6-luna",
  reasoningEffort: "low",
  endpoint: "responses_api_future",
  automaticFallbackAllowed: false,
  maxExternalAttempts: 1,
  recommendation: "FIRST_LIVE_SCRIPT_GENERATE_PRIMARY_ROUTE"
});

export const verifiedOpenAiGpt56Pricing = Object.freeze({
  provider: "openai",
  verifiedAt: "2026-08-30",
  source: "https://developers.openai.com/api/docs/models",
  secondarySource: "https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/",
  models: {
    "gpt-5.6-luna": {
      inputPerMillionUsd: 0.20,
      cachedInputPerMillionUsd: 0.02,
      outputPerMillionUsd: 1.20,
      contextWindowTokens: 1050000,
      maxOutputTokens: 128000,
      pricingVerified: true
    },
    "gpt-5.6-terra": {
      inputPerMillionUsd: 2.00,
      cachedInputPerMillionUsd: 0.20,
      outputPerMillionUsd: 12.00,
      contextWindowTokens: 1050000,
      maxOutputTokens: 128000,
      pricingVerified: true
    },
    "gpt-5.6-sol": {
      inputPerMillionUsd: 4.00,
      cachedInputPerMillionUsd: 0.40,
      outputPerMillionUsd: 20.00,
      contextWindowTokens: 1050000,
      maxOutputTokens: 128000,
      pricingVerified: true
    }
  }
});

export const firstLiveScriptTokenBounds = Object.freeze({
  maxInputTokens: 6000,
  maxOutputTokens: 4500,
  maxRequests: 1,
  maxExternalAttempts: 1,
  contextStrategy: "MINIMUM_NECESSARY_CANONICAL_ARTIFACTS_ONLY"
});

export const proposedFirstLiveSpendingCeilingUsd = 0.01;

export const externalZeroCounters = Object.freeze({
  paidModelCalls: 0,
  externalModelCalls: 0,
  voiceCalls: 0,
  avatarCalls: 0,
  publishCalls: 0,
  deploymentCalls: 0,
  billingMutations: 0,
  providerActivations: 0,
  productionDbMutations: 0
});

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function envPresence(env = process.env) {
  return {
    OPENAI_API_KEY: env.OPENAI_API_KEY ? "CREDENTIAL_PRESENT" : "CREDENTIAL_ABSENT",
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? "CREDENTIAL_PRESENT" : "CREDENTIAL_ABSENT",
    ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY ? "CREDENTIAL_PRESENT" : "CREDENTIAL_ABSENT"
  };
}

function createPricedRegistry(env = process.env) {
  return createIntelligenceProviderRegistry().map((provider) => {
    if (provider.providerId !== "openai") return provider;
    return {
      ...provider,
      status: env.OPENAI_API_KEY ? activationStates.readyForActivation : activationStates.readyForKey,
      health: env.OPENAI_API_KEY ? providerHealthStatuses.available : providerHealthStatuses.notConfigured,
      executable: false,
      models: provider.models.map((model) => ({
        ...model,
        executable: false,
        activationState: env.OPENAI_API_KEY ? activationStates.readyForActivation : activationStates.readyForKey,
        pricing: {
          pricingVersion: "OFFICIAL_OPENAI_GPT_5_6_PRICING_2026_08_30",
          pricingVerifiedAt: verifiedOpenAiGpt56Pricing.verifiedAt,
          priceRevalidationRequired: false,
          ...verifiedOpenAiGpt56Pricing.models[model.modelId]
        }
      }))
    };
  });
}

function estimateMaxCostUsd(route = firstLiveScriptGenerationRoute, bounds = firstLiveScriptTokenBounds) {
  const pricing = verifiedOpenAiGpt56Pricing.models[route.modelId];
  if (!pricing?.pricingVerified) {
    return {
      status: "FAIL_CLOSED",
      reason: "PRICING_UNKNOWN",
      maxCostUsd: null
    };
  }
  const input = (bounds.maxInputTokens / 1000000) * pricing.inputPerMillionUsd;
  const output = (bounds.maxOutputTokens / 1000000) * pricing.outputPerMillionUsd;
  return {
    status: "COST_ESTIMATE_AVAILABLE",
    maxCostUsd: Number(((input + output) * bounds.maxRequests).toFixed(6)),
    inputCostUsd: Number(input.toFixed(6)),
    outputCostUsd: Number(output.toFixed(6)),
    currency: "USD"
  };
}

export function createProductionScriptArtifactContract(input = {}) {
  return {
    modelType: "ProductionScriptArtifact",
    artifactId: input.artifactId || "future_production_script_artifact",
    workflowId: input.workflowId || null,
    workflowVersion: input.workflowVersion || null,
    productionGoalId: input.productionGoalId || null,
    contentBriefId: input.contentBriefId || null,
    scriptGenerateStepId: "STEP_2_SCRIPT_GENERATE",
    modelRouteProvenance: {
      providerId: input.providerId || firstLiveScriptGenerationRoute.providerId,
      modelId: input.modelId || firstLiveScriptGenerationRoute.modelId,
      reasoningEffort: input.reasoningEffort || firstLiveScriptGenerationRoute.reasoningEffort,
      internalOnly: true
    },
    generationTimestamp: null,
    inputLineage: input.inputLineage || [],
    characterCoreRef: input.characterCoreRef || null,
    productionProfileRef: input.productionProfileRef || null,
    scriptContent: null,
    language: input.language || "ru",
    estimatedDurationSeconds: null,
    verificationStatus: "PENDING_GENERATION",
    qualityReviewStatus: "NOT_RUN",
    contentHash: null,
    parentArtifactIds: input.parentArtifactIds || [],
    derivedArtifactIds: []
  };
}

export function createScriptGenerateExecutionContract(input = {}) {
  const workflow = input.workflow || createGoalToContentExecutionWorkflow(input);
  const characterCore = loadLisaCharacterCore({ includeContent: false });
  const productionProfile = getLisaProductionProfile(workflow.productionIntent?.hostIdentityId || "lisa");
  const contentBrief = workflow.generatedArtifacts?.contentBrief || null;

  return {
    modelType: "ScriptGenerateExecutionContract",
    workflowId: workflow.workflowId,
    workflowVersion: workflow.workflowVersion,
    productionGoalId: workflow.productionGoal?.goalId || null,
    contentBriefId: contentBrief?.artifactId || null,
    stepId: "STEP_2_SCRIPT_GENERATE",
    capabilityId: "SCRIPT_GENERATE",
    inputSource: "CANONICAL_ARTIFACTS_ONLY",
    inputs: {
      productionGoalRef: workflow.productionGoal?.goalId || null,
      contentBriefRef: contentBrief?.artifactId || null,
      characterCoreRef: characterCore.path,
      productionProfileRef: productionProfile?.profileId || null,
      format: workflow.productionIntent?.masterFormat || null,
      language: workflow.productionIntent?.language || null,
      targetDuration: "small_podcast_script_proof",
      audience: input.audience || null,
      topic: workflow.productionGoal?.topic || null,
      toneStyleConstraints: [
        "meaning_first",
        "Lisa_identity_bound",
        "no_generic_assistant_personality"
      ],
      safetyProductConstraints: [
        "no_secrets",
        "no_unrelated_repository_context",
        "no_publish_or_distribution",
        "no_voice_or_avatar_execution"
      ]
    },
    missingInputs: [
      ...(!workflow.productionGoal ? ["ProductionGoal"] : []),
      ...(!contentBrief ? ["ContentBrief"] : []),
      ...(!characterCore ? ["LisaCharacterCore"] : []),
      ...(!productionProfile ? ["LisaProductionProfile"] : [])
    ],
    providerRoute: { ...firstLiveScriptGenerationRoute },
    tokenBounds: { ...firstLiveScriptTokenBounds },
    outputContract: createProductionScriptArtifactContract({
      workflowId: workflow.workflowId,
      workflowVersion: workflow.workflowVersion,
      productionGoalId: workflow.productionGoal?.goalId || null,
      contentBriefId: contentBrief?.artifactId || null,
      characterCoreRef: characterCore.path,
      productionProfileRef: productionProfile?.profileId || null,
      language: workflow.productionIntent?.language || "ru"
    })
  };
}

export function createFirstLiveScriptApprovalContract(contract = {}, route = firstLiveScriptGenerationRoute) {
  const expiresAt = "FUTURE_HUMAN_SELECTED_SHORT_EXPIRATION";
  return {
    modelType: "ScopedApprovalContract",
    approvalType: "COST_AND_EXTERNAL_MODEL_EXECUTION",
    scope: {
      workflowId: contract.workflowId,
      workflowVersion: contract.workflowVersion,
      stepId: "STEP_2_SCRIPT_GENERATE",
      capabilityId: "SCRIPT_GENERATE",
      providerId: route.providerId,
      modelId: route.modelId,
      maxRequestCount: firstLiveScriptTokenBounds.maxRequests,
      maxExternalAttempts: firstLiveScriptTokenBounds.maxExternalAttempts,
      maxInputTokens: firstLiveScriptTokenBounds.maxInputTokens,
      maxOutputTokens: firstLiveScriptTokenBounds.maxOutputTokens,
      maxSpendingCeilingUsd: proposedFirstLiveSpendingCeilingUsd,
      automaticPaidFallbackAllowed: false,
      expiresAt
    },
    doesNotAuthorize: [
      "VOICE_RENDER",
      "AVATAR_RENDER",
      "publishing",
      "deployment",
      "advertising",
      "social_dispatch",
      "provider_activation",
      "billing_changes",
      "additional_model_calls",
      "unbounded_retries"
    ],
    singleUse: true,
    executionAuthorityNow: false
  };
}

function qualityGateForFutureScript(contract = {}) {
  return {
    modelType: "DeterministicScriptQualityGate",
    status: "PREPARED_NOT_RUN",
    checks: [
      "script_exists",
      "script_non_empty",
      "requested_language",
      "topic_relevance",
      "structural_completeness",
      "character_core_binding",
      "production_profile_binding",
      "format_compliance",
      "obvious_truncation_absent",
      "artifact_integrity",
      "lineage_integrity"
    ],
    modelBasedReviewRequiresSeparateApproval: true,
    boundContractHash: stableHash(contract)
  };
}

function createDataBoundary(contract = {}) {
  return {
    sentExternallyInFutureLiveCall: [
      "ProductionGoal topic/raw goal minimum necessary text",
      "ContentBrief fields required for script generation",
      "Lisa Character Core reference-derived production constraints",
      "Lisa Production Profile reference-derived production constraints",
      "format, language, target duration, audience if supplied"
    ],
    keptLocal: [
      "secrets and environment variables",
      "full repository source",
      "unrelated memory",
      "billing/payment data",
      "voice/avatar rights material not needed for SCRIPT_GENERATE"
    ],
    storedAsProvenance: [
      "providerId/modelId internal route metadata",
      "token/cost bounds",
      "input artifact ids",
      "content hash after successful generation"
    ],
    neverSent: [
      "API keys",
      "tokens",
      "private keys",
      ".env contents",
      "browser profiles",
      "unrelated project repository content"
    ],
    contractHash: stableHash(contract)
  };
}

function createPrivacyFindings() {
  return {
    provider: "openai",
    route: "OpenAI API / Responses API future route",
    trainingPolicy: {
      status: "VERIFIED",
      finding: "OpenAI states API inputs/outputs are not used to train models by default unless the customer explicitly opts in."
    },
    retentionPolicy: {
      status: "VERIFIED_WITH_ACCOUNT_DEPENDENT_OPTIONS",
      finding: "Default abuse monitoring logs may be retained up to 30 days; Zero Data Retention or Modified Abuse Monitoring require eligibility/configuration."
    },
    applicationState: {
      status: "CONFIGURABLE",
      finding: "For Responses API, avoid storing response state for this proof; future execution should set store=false when supported."
    },
    regionalPrivacy: {
      status: "UNKNOWN_OR_ACCOUNT_DEPENDENT",
      finding: "No region/data residency guarantee is inferred for Lisa's account in this phase."
    },
    sources: [
      "https://platform.openai.com/docs/models/default-usage-policies-by-endpoint",
      "https://openai.com/business-data/"
    ]
  };
}

function validateApproval(approval = null, contract = {}, route = firstLiveScriptGenerationRoute, now = "2026-08-30T00:00:00.000Z") {
  if (!approval) return { ok: false, reason: "APPROVAL_ABSENT" };
  if (approval.expiresAt && new Date(approval.expiresAt).getTime() <= new Date(now).getTime()) {
    return { ok: false, reason: "APPROVAL_EXPIRED" };
  }
  const scope = approval.scope || {};
  if (scope.workflowId !== contract.workflowId) return { ok: false, reason: "APPROVAL_WRONG_WORKFLOW" };
  if (scope.stepId !== "STEP_2_SCRIPT_GENERATE") return { ok: false, reason: "APPROVAL_WRONG_STEP" };
  if (scope.providerId !== route.providerId || scope.modelId !== route.modelId) {
    return { ok: false, reason: "APPROVAL_WRONG_PROVIDER_MODEL" };
  }
  if (scope.maxRequestCount > firstLiveScriptTokenBounds.maxRequests) {
    return { ok: false, reason: "ATTEMPT_COUNT_EXCEEDED" };
  }
  if (scope.automaticPaidFallbackAllowed === true) {
    return { ok: false, reason: "FALLBACK_REQUESTED_BUT_NOT_APPROVED" };
  }
  return { ok: true, reason: "APPROVAL_SCOPE_VALID_FOR_FUTURE_ONLY" };
}

export function dryRunLiveScriptGenerationPreflight(input = {}) {
  const env = input.env || process.env;
  const workflow = input.workflow === null ? null : (input.workflow || createGoalToContentExecutionWorkflow(input));
  const registry = input.registry || createPricedRegistry(env);
  const route = input.route || firstLiveScriptGenerationRoute;
  const provider = registry.find((item) => item.providerId === route.providerId);
  const model = provider?.models.find((item) => item.modelId === route.modelId);
  const credentialPresence = envPresence(env);
  const contract = workflow ? createScriptGenerateExecutionContract({ workflow, audience: input.audience }) : null;
  const approvalContract = contract ? createFirstLiveScriptApprovalContract(contract, route) : null;
  const costEstimate = estimateMaxCostUsd(route, input.tokenBounds || firstLiveScriptTokenBounds);
  const costGuard = {
    status: costEstimate.maxCostUsd != null && costEstimate.maxCostUsd <= proposedFirstLiveSpendingCeilingUsd
      ? "PASS"
      : "FAIL_CLOSED",
    estimatedMaximumUsd: costEstimate.maxCostUsd,
    proposedCeilingUsd: proposedFirstLiveSpendingCeilingUsd,
    unknownPricingFailsClosed: true
  };
  const intelligenceDecision = contract ? routeIntelligenceRequest({
    requestId: "phase21s_a_script_generate_dry_route",
    workflowId: contract.workflowId,
    goalId: contract.productionGoalId,
    domain: "production",
    taskType: "script_generation",
    taskComplexity: "normal",
    userIntent: "Future SCRIPT_GENERATE dry route only",
    requiredCapabilities: ["structured_output", "reasoning"],
    contextPack: {
      selected: [
        contract.inputs.productionGoalRef,
        contract.inputs.contentBriefRef,
        contract.inputs.characterCoreRef,
        contract.inputs.productionProfileRef
      ],
      budget: { usedChars: firstLiveScriptTokenBounds.maxInputTokens * 4 }
    },
    estimatedOutputTokens: firstLiveScriptTokenBounds.maxOutputTokens,
    maxCostUsd: proposedFirstLiveSpendingCeilingUsd,
    budgetMode: budgetModes.lowCost,
    fallbackAllowed: false,
    providerPolicy: {
      preferredProvider: route.providerId,
      preferredModel: route.modelId
    },
    approvalPolicy: {
      humanRequiredBeforeModel: false
    }
  }, { registry }) : null;
  const credentialReady = credentialPresence.OPENAI_API_KEY === "CREDENTIAL_PRESENT";
  const blockers = [
    ...(!workflow ? ["MISSING_PRODUCTION_GOAL_INPUT"] : []),
    ...(workflow && !workflow.generatedArtifacts?.contentBrief ? ["MISSING_CONTENT_BRIEF"] : []),
    ...(contract?.missingInputs?.length ? contract.missingInputs.map((item) => `MISSING_${item.toUpperCase()}`) : []),
    ...(!provider ? ["PROVIDER_ROUTE_NOT_REGISTERED"] : []),
    ...(!model ? ["MODEL_ROUTE_NOT_REGISTERED"] : []),
    ...(provider?.status === activationStates.disabled ? ["PROVIDER_DISABLED"] : []),
    ...(credentialReady ? [] : ["CREDENTIAL_ABSENT"]),
    ...(costGuard.status === "PASS" ? [] : ["COST_GUARD_FAILED"]),
    ...(input.approval ? [] : ["LIVE_PROVIDER_EXECUTION_APPROVAL_REQUIRED"])
  ];

  return {
    modelType: "LiveScriptGenerationReadinessPreflight",
    phase: "21S-A",
    status: blockers.filter((item) => item !== "CREDENTIAL_ABSENT" && item !== "LIVE_PROVIDER_EXECUTION_APPROVAL_REQUIRED").length === 0
      ? liveScriptGenerationBoundaryStatus.readyForLiveScriptGeneration
      : liveScriptGenerationBoundaryStatus.blocked,
    liveExecutionState: liveScriptGenerationBoundaryStatus.liveExecutionNotAuthorized,
    selectedRoute: route,
    providerActivationState: provider?.status || "UNKNOWN",
    providerHealth: provider?.health || "UNKNOWN",
    credentialPresence,
    credentialReady,
    pricing: verifiedOpenAiGpt56Pricing.models[route.modelId] || null,
    pricingProvenance: {
      verifiedAt: verifiedOpenAiGpt56Pricing.verifiedAt,
      sources: [verifiedOpenAiGpt56Pricing.source, verifiedOpenAiGpt56Pricing.secondarySource]
    },
    intelligenceDecision,
    scriptGenerateContract: contract,
    productionScriptArtifactContract: contract?.outputContract || null,
    lisaBinding: {
      characterCoreBound: Boolean(contract?.inputs.characterCoreRef),
      productionProfileBound: Boolean(contract?.inputs.productionProfileRef),
      genericAssistantPersonalityAllowed: false
    },
    qualityGate: qualityGateForFutureScript(contract || {}),
    approvalContract,
    approvalCheck: validateApproval(input.approval, contract || {}, route, input.now),
    costEstimate,
    costGuard,
    tokenBounds: input.tokenBounds || firstLiveScriptTokenBounds,
    retryPolicy: {
      maxExternalAttempts: 1,
      automaticPaidRetryAllowed: false,
      onTransportOrProviderFailure: "STOP_REQUIRE_EXPLICIT_NEW_DECISION"
    },
    paidFallbackPolicy: {
      automaticFallbackAllowed: false,
      ifPrimaryFails: "STOP_NO_SILENT_SPEND"
    },
    dataBoundary: createDataBoundary(contract || {}),
    privacyFindings: createPrivacyFindings(),
    executionFrontier: {
      state: executionFrontierStates.blockedOnProviderBoundary,
      currentStepId: "STEP_2_SCRIPT_GENERATE",
      nextBlockedStepId: "STEP_2_SCRIPT_GENERATE",
      blocker: "LIVE_PROVIDER_EXECUTION_APPROVAL_REQUIRED",
      doesNotAdvanceToVoiceRender: true
    },
    blockers,
    externalCounters: { ...externalZeroCounters },
    dryRunOnly: true,
    externalProviderCallMade: false,
    liveScriptGenerateCallMade: false
  };
}

export function runLiveScriptGenerationFailureTests(baseInput = {}) {
  const base = dryRunLiveScriptGenerationPreflight(baseInput);
  const contract = base.scriptGenerateContract;
  const validApproval = contract ? {
    scope: {
      workflowId: contract.workflowId,
      stepId: "STEP_2_SCRIPT_GENERATE",
      providerId: firstLiveScriptGenerationRoute.providerId,
      modelId: firstLiveScriptGenerationRoute.modelId,
      maxRequestCount: 1,
      automaticPaidFallbackAllowed: false
    },
    expiresAt: "2026-12-31T00:00:00.000Z"
  } : null;
  const disabledRegistry = createPricedRegistry(baseInput.env).map((provider) =>
    provider.providerId === "openai"
      ? { ...provider, status: activationStates.disabled, health: providerHealthStatuses.unavailable }
      : provider
  );

  const cases = [
    ["credential absent", dryRunLiveScriptGenerationPreflight({ ...baseInput, env: {} }), "CREDENTIAL_ABSENT"],
    ["provider disabled", dryRunLiveScriptGenerationPreflight({ ...baseInput, registry: disabledRegistry }), "PROVIDER_DISABLED"],
    ["pricing unknown", dryRunLiveScriptGenerationPreflight({ ...baseInput, route: { ...firstLiveScriptGenerationRoute, modelId: "unknown-model" } }), "COST_GUARD_FAILED"],
    ["approval absent", base, "LIVE_PROVIDER_EXECUTION_APPROVAL_REQUIRED"],
    ["approval expired", { approvalCheck: validateApproval({ ...validApproval, expiresAt: "2026-01-01T00:00:00.000Z" }, contract, firstLiveScriptGenerationRoute, "2026-08-30T00:00:00.000Z") }, "APPROVAL_EXPIRED"],
    ["approval wrong workflow", { approvalCheck: validateApproval({ ...validApproval, scope: { ...validApproval.scope, workflowId: "wrong" } }, contract) }, "APPROVAL_WRONG_WORKFLOW"],
    ["approval wrong step", { approvalCheck: validateApproval({ ...validApproval, scope: { ...validApproval.scope, stepId: "STEP_4_VOICE_RENDER" } }, contract) }, "APPROVAL_WRONG_STEP"],
    ["approval wrong provider/model", { approvalCheck: validateApproval({ ...validApproval, scope: { ...validApproval.scope, modelId: "gpt-5.6-terra" } }, contract) }, "APPROVAL_WRONG_PROVIDER_MODEL"],
    ["cost ceiling exceeded", dryRunLiveScriptGenerationPreflight({ ...baseInput, tokenBounds: { ...firstLiveScriptTokenBounds, maxOutputTokens: 20000 } }), "COST_GUARD_FAILED"],
    ["attempt count exceeded", { approvalCheck: validateApproval({ ...validApproval, scope: { ...validApproval.scope, maxRequestCount: 2 } }, contract) }, "ATTEMPT_COUNT_EXCEEDED"],
    ["fallback requested but not approved", { approvalCheck: validateApproval({ ...validApproval, scope: { ...validApproval.scope, automaticPaidFallbackAllowed: true } }, contract) }, "FALLBACK_REQUESTED_BUT_NOT_APPROVED"],
    ["missing ProductionGoal input", dryRunLiveScriptGenerationPreflight({ ...baseInput, workflow: null }), "MISSING_PRODUCTION_GOAL_INPUT"],
    ["missing ContentBrief", dryRunLiveScriptGenerationPreflight({ ...baseInput, workflow: { ...base.workflow, generatedArtifacts: {} } }), "MISSING_CONTENT_BRIEF"],
    ["missing Lisa identity binding", { blockers: ["MISSING_LISA_IDENTITY_BINDING"], lisaBinding: { characterCoreBound: false, productionProfileBound: false } }, "MISSING_LISA_IDENTITY_BINDING"],
    ["stale workflow version", { approvalCheck: validateApproval({ ...validApproval, scope: { ...validApproval.scope, workflowId: contract?.workflowId } }, { ...contract, workflowId: `${contract?.workflowId}_new` }) }, "APPROVAL_WRONG_WORKFLOW"]
  ];

  return cases.map(([name, result, expected]) => {
    const blockers = result.blockers || [];
    const reason = blockers.find((item) => item === expected) || result.approvalCheck?.reason || null;
    return {
      name,
      expected,
      passed: reason === expected || blockers.includes(expected),
      observedReason: reason,
      failedClosedBeforeExternalExecution: true
    };
  });
}
