import { activationStates, providerHealthStatuses } from "./intelligenceContracts.js";
import { capabilityValues, createUnknownCapabilityMatrix } from "./capabilityProfiles.js";
import { pricingRevalidationStatus } from "./costPolicy.js";

export const glm53FlashResearchSourcePath = "artifacts/research/OxAlphaResearchArtifact.json";

export const glm53FlashResearchStatus = {
  watchResearchOnly: "WATCH_RESEARCH_ONLY",
  canonicalModelId: "z-ai/glm-5.3-flash",
  historicalAliases: ["Ox Alpha", "stealth/ox-alpha"],
  sourceOfTruth: glm53FlashResearchSourcePath,
  providerCallsAllowed: false,
  externalActivationAllowed: false,
  openRouterConnectionAllowed: false,
  apiKeyCreationAllowed: false,
  benchmarkCallsAllowed: false,
  phaseStop: "21K-OX",
  nextPhaseBlocked: "21L"
};

export const glm53FlashTechRadarEntry = {
  radarId: "GLM_5_3_FLASH",
  canonicalName: "GLM-5.3-Flash",
  canonicalModelId: glm53FlashResearchStatus.canonicalModelId,
  developer: "Z.ai",
  historicalAliases: glm53FlashResearchStatus.historicalAliases,
  status: glm53FlashResearchStatus.watchResearchOnly,
  sourceOfTruth: glm53FlashResearchSourcePath,
  firstObservedAsAlias: "2026-08-20",
  canonicalReleaseDate: "2026-08-26",
  availability: "listed_currently_as_glm_5_3_flash_not_ox_alpha_alias",
  contextWindow: {
    publicSummary: "about_1m_tokens",
    openRouterModelContextTokens: 1310720,
    openRouterTopProviderContextTokens: 1048576,
    conflict: "different_metadata_fields_expose_different_context_caps"
  },
  maxOutputTokens: 131072,
  supportedInputs: {
    text: true,
    image: true,
    video: true,
    audio: false,
    requiresProviderSpecificVideoRevalidation: true
  },
  outputModalities: ["text"],
  capabilityBoundaries: {
    modelCapability: ["text_reasoning", "image_input_reasoning", "video_input_reasoning", "coding_reasoning", "tool_call_schema"],
    agentHarnessCapability: ["browser_use", "computer_use", "workflow_orchestration", "repo_editing_by_host_agent"],
    externalToolCapability: ["ffmpeg_rendering", "ffprobe_inspection", "local_transcription", "browser_capture"],
    notModelNative: ["autonomous_video_rendering", "file_system_mutation", "deployment", "publishing"]
  },
  pricing: {
    currentStatus: pricingRevalidationStatus,
    standardInputPerMillionUsd: 0.15,
    standardOutputPerMillionUsd: 0.5,
    discountedInputPerMillionUsd: 0.075,
    discountedOutputPerMillionUsd: 0.25,
    discountExpiresAtUtc: "2026-09-09T16:00:00.000Z",
    pricingMayChange: true
  },
  security: {
    dataHandlingStatus: "CONFLICTING_ROUTE_DEPENDENT",
    promptCompletionRetention: "route_dependent_conflicting",
    trainingUse: "route_dependent_conflicting",
    providerSubprocessorsKnown: false,
    sendEssaSourceAllowed: false,
    sendSecretsAllowed: false,
    sendUserMediaAllowed: false,
    requiresSecurityReview: true,
    requiresLegalReview: true
  },
  benchmarkStatus: {
    vendorBenchmarks: "PUBLISHED_VENDOR_REPORTED",
    independentBenchmarks: "NOT_REPRODUCED_FOR_ESSA",
    superiorityClaimsAgainstGpt56Sol: "UNVERIFIED",
    superiorityClaimsAgainstClaudeFable5: "UNVERIFIED",
    essaBenchmarkCallsAllowedInPhase21K: false
  },
  revalidationRequiredBefore: [
    "tech_radar_promotion",
    "provider_activation",
    "provider_connection",
    "benchmark_execution",
    "sending_essa_context",
    "sending_user_media",
    "budgeting",
    "quality_history_scoring"
  ]
};

export const glm53FlashModelProfile = {
  providerId: "z-ai",
  modelId: "glm-5.3-flash",
  canonicalExternalModelId: glm53FlashResearchStatus.canonicalModelId,
  role: "RESEARCH_CANDIDATE",
  executable: false,
  activationState: activationStates.architectureOnly,
  radarStatus: glm53FlashResearchStatus.watchResearchOnly,
  historicalAliases: glm53FlashResearchStatus.historicalAliases,
  sourceOfTruth: glm53FlashResearchSourcePath,
  defaultUse: [],
  capabilities: createUnknownCapabilityMatrix({
    reasoning: capabilityValues.yes,
    coding: capabilityValues.yes,
    structured_output: capabilityValues.partial,
    tool_calling: capabilityValues.yes,
    long_context: capabilityValues.yes,
    multilingual: capabilityValues.partial,
    vision: capabilityValues.yes,
    image_input: capabilityValues.yes,
    video_input: capabilityValues.yes,
    audio_input: capabilityValues.no,
    video_understanding: capabilityValues.partial,
    video_rendering: capabilityValues.no,
    computer_use: capabilityValues.no,
    agent_orchestration: capabilityValues.partial,
    latency_class: "UNKNOWN_REVALIDATION_REQUIRED",
    cost_class: "PAID_REVALIDATION_REQUIRED"
  }),
  pricing: {
    pricingVersion: pricingRevalidationStatus,
    pricingVerifiedAt: null,
    priceRevalidationRequired: true,
    inputPerMillionUsd: null,
    outputPerMillionUsd: null,
    previewFreeAliasExpiredOrUnreliable: true
  },
  health: providerHealthStatuses.notConfigured,
  security: glm53FlashTechRadarEntry.security,
  selectionPolicy: {
    selectableForUserTasks: false,
    selectableForBenchmarks: false,
    reason: "Phase 21K-OX keeps GLM-5.3-Flash as WATCH/RESEARCH ONLY from OxAlphaResearchArtifact."
  }
};

