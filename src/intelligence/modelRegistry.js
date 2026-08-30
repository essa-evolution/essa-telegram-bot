import { productionAgentProviderRegistry } from "../productionAgent/providerRegistry.js";
import { activationStates, createIntelligenceProvider, providerHealthStatuses } from "./intelligenceContracts.js";
import { capabilityValues, createUnknownCapabilityMatrix } from "./capabilityProfiles.js";
import { pricingRevalidationStatus } from "./costPolicy.js";
import { glm53FlashModelProfile, glm53FlashResearchSourcePath, glm53FlashResearchStatus } from "./glm53FlashResearchProfile.js";

const openAiDryPricing = {
  pricingVersion: pricingRevalidationStatus,
  pricingVerifiedAt: null,
  priceRevalidationRequired: true,
  inputPerMillionUsd: null,
  outputPerMillionUsd: null,
  cachedInputPerMillionUsd: null
};

export const openAiGpt56Profiles = [
  {
    providerId: "openai",
    modelId: "gpt-5.6-luna",
    role: "LUNA",
    executable: false,
    activationState: activationStates.architectureOnly,
    reasoningProfiles: [],
    defaultUse: ["extraction", "classification", "routing_assistance", "metadata_generation", "simple_transformation"],
    capabilities: createUnknownCapabilityMatrix({
      reasoning: capabilityValues.partial,
      structured_output: capabilityValues.unknown,
      coding: capabilityValues.partial,
      latency_class: "LOW",
      cost_class: "LOW"
    }),
    pricing: openAiDryPricing
  },
  {
    providerId: "openai",
    modelId: "gpt-5.6-terra",
    role: "TERRA",
    executable: false,
    activationState: activationStates.architectureOnly,
    reasoningProfiles: [],
    defaultUse: ["general_reasoning", "production_planning", "semantic_analysis", "normal_coding", "content_planning"],
    capabilities: createUnknownCapabilityMatrix({
      reasoning: capabilityValues.yes,
      structured_output: capabilityValues.unknown,
      coding: capabilityValues.yes,
      latency_class: "STANDARD",
      cost_class: "STANDARD"
    }),
    pricing: openAiDryPricing
  },
  {
    providerId: "openai",
    modelId: "gpt-5.6-sol",
    role: "SOL",
    executable: false,
    activationState: activationStates.architectureOnly,
    reasoningProfiles: ["SOL_STANDARD", "SOL_HIGH", "SOL_MAX"],
    defaultUse: ["complex_architecture", "difficult_debugging", "advanced_coding", "cross_module_reasoning", "repair_planning"],
    capabilities: createUnknownCapabilityMatrix({
      reasoning: capabilityValues.yes,
      structured_output: capabilityValues.unknown,
      coding: capabilityValues.yes,
      agent_orchestration: capabilityValues.unknown,
      latency_class: "SLOWER",
      cost_class: "HIGH"
    }),
    pricing: openAiDryPricing
  }
];

export const localProvider = createIntelligenceProvider({
  providerId: "local",
  status: activationStates.readyForActivation,
  health: providerHealthStatuses.available,
  executable: true,
  models: [],
  capabilities: [
    "video_trim",
    "media_metadata",
    "local_transcription",
    "verified_documentation_lookup",
    "browser_observation",
    "deterministic_verification"
  ],
  costMetadata: { localCostUsd: 0 },
  privacyMetadata: { leavesServer: false }
});

export const openAiProvider = createIntelligenceProvider({
  providerId: "openai",
  status: activationStates.architectureOnly,
  health: providerHealthStatuses.notConfigured,
  executable: false,
  models: openAiGpt56Profiles,
  capabilities: ["reasoning", "coding", "structured_output"],
  credentialRequirements: ["OPENAI_API_KEY"],
  costMetadata: { pricing: openAiDryPricing },
  privacyMetadata: { serverSideSecretsOnly: true },
  invokeAdapter: null
});

export const zAiProvider = createIntelligenceProvider({
  providerId: "z-ai",
  status: activationStates.architectureOnly,
  health: providerHealthStatuses.notConfigured,
  executable: false,
  models: [glm53FlashModelProfile],
  capabilities: ["reasoning", "coding", "tool_calling", "structured_output", "long_context", "image_input", "video_input"],
  credentialRequirements: [],
  costMetadata: {
    pricingVersion: pricingRevalidationStatus,
    priceRevalidationRequired: true,
    researchOnly: true
  },
  privacyMetadata: {
    sourceOfTruth: glm53FlashResearchSourcePath,
    routeDependentConflicts: true,
    sendEssaSourceAllowed: false,
    sendSecretsAllowed: false,
    sendUserMediaAllowed: false
  },
  selectionPolicy: {
    selectableForUserTasks: false,
    selectableForBenchmarks: false,
    canonicalModelId: glm53FlashResearchStatus.canonicalModelId,
    historicalAliases: glm53FlashResearchStatus.historicalAliases,
    reason: "WATCH/RESEARCH ONLY until data handling, provider routing, pricing stability, and independent benchmark reproducibility are revalidated."
  },
  invokeAdapter: null
});

export function createAnthropicProviderFromProductionRegistry(registry = productionAgentProviderRegistry) {
  const claude = registry.find((provider) => provider.providerId === "claude_agent_sdk");

  return createIntelligenceProvider({
    providerId: "anthropic",
    status: activationStates.architectureOnly,
    health: claude?.health === "not_configured" ? providerHealthStatuses.notConfigured : providerHealthStatuses.experimental,
    executable: false,
    models: [
      {
        providerId: "anthropic",
        modelId: "claude_agent_sdk",
        role: "CLAUDE",
        executable: false,
        activationState: activationStates.architectureOnly,
        capabilities: createUnknownCapabilityMatrix({
          reasoning: capabilityValues.yes,
          coding: capabilityValues.yes,
          structured_output: capabilityValues.yes,
          agent_orchestration: capabilityValues.partial
        }),
        pricing: {
          pricingVersion: pricingRevalidationStatus,
          pricingVerifiedAt: null,
          priceRevalidationRequired: true
        },
        sourceRegistryProviderId: claude?.providerId || null
      }
    ],
    capabilities: claude?.capabilities || ["structured_reasoning", "semantic_planning"],
    credentialRequirements: ["ANTHROPIC_API_KEY"],
    costMetadata: { pricingVersion: pricingRevalidationStatus },
    privacyMetadata: { serverSideSecretsOnly: true },
    invokeAdapter: null
  });
}

export function createIntelligenceProviderRegistry(extraProviders = []) {
  return [
    localProvider,
    openAiProvider,
    zAiProvider,
    createAnthropicProviderFromProductionRegistry(),
    ...extraProviders.map(createIntelligenceProvider)
  ];
}

export function getModelProfile(providerId, modelId, registry = createIntelligenceProviderRegistry()) {
  const provider = registry.find((item) => item.providerId === providerId);
  return provider?.models.find((model) => model.modelId === modelId) || null;
}
