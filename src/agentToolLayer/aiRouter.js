import { createAiProviderRoutingContract } from "./contracts.js";

export const aiProviderReadinessRegistry = [
  createAiProviderRoutingContract({
    providerId: "claude_agent_sdk",
    modelId: "claude-sonnet-5",
    capabilities: ["structured_reasoning", "semantic_planning", "json_output"],
    qualityTier: "high",
    latencyClass: "standard",
    costClass: "METERED",
    contextWindowTokens: 1000000,
    available: false,
    remainingQuota: null,
    fallbackPriority: 20
  }),
  createAiProviderRoutingContract({
    providerId: "openai_future",
    modelId: null,
    capabilities: ["structured_reasoning", "coding", "json_output"],
    qualityTier: "high",
    latencyClass: "standard",
    costClass: "METERED",
    available: false,
    fallbackPriority: 30
  }),
  createAiProviderRoutingContract({
    providerId: "local_open_source_future",
    modelId: null,
    capabilities: ["local_reasoning", "private_context"],
    qualityTier: "variable",
    latencyClass: "local",
    costClass: "LOCAL",
    available: false,
    fallbackPriority: 80
  })
];

export function selectAiProviderForTask(task = {}, registry = aiProviderReadinessRegistry) {
  const candidates = registry
    .filter((provider) =>
      (task.requiredCapabilities || []).every((capability) => provider.capabilities.includes(capability))
    )
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.fallbackPriority - b.fallbackPriority;
    });

  const selected = candidates[0] || null;

  return {
    selected,
    candidates,
    policy: {
      sourceOfTruth: "ESSA Core",
      identityPolicyMutableByProvider: false,
      contextPolicyMutableByProvider: false
    }
  };
}
