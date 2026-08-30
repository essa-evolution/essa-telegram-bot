import { reasoningLevels } from "./intelligenceContracts.js";

export const solReasoningProfiles = {
  standard: "SOL_STANDARD",
  high: "SOL_HIGH",
  max: "SOL_MAX"
};

export const reasoningTierPolicy = [
  {
    tier: reasoningLevels.luna,
    complexity: ["simple", "bulk_simple"],
    quality: ["draft", "standard"],
    taskTypes: ["classification", "extraction", "metadata_generation", "simple_transformation"],
    modelId: "gpt-5.6-luna"
  },
  {
    tier: reasoningLevels.terra,
    complexity: ["normal", "moderate"],
    quality: ["standard", "high"],
    taskTypes: ["semantic_planning", "production_intent", "content_planning", "coding"],
    modelId: "gpt-5.6-terra"
  },
  {
    tier: reasoningLevels.solStandard,
    complexity: ["complex", "high"],
    quality: ["high", "critical"],
    taskTypes: ["architecture", "debugging", "advanced_coding", "cross_module_reasoning"],
    modelId: "gpt-5.6-sol"
  },
  {
    tier: reasoningLevels.solMax,
    complexity: ["exceptional"],
    quality: ["critical"],
    taskTypes: ["major_architecture_conflict", "unresolved_repair", "multi_failure_repair"],
    modelId: "gpt-5.6-sol",
    solProfile: solReasoningProfiles.max
  }
];

export function selectReasoningTier(request = {}) {
  const failedAttempts = Number(request.verificationState?.failedAttempts || request.repairAttempts || 0);

  if (failedAttempts >= 2 || request.taskComplexity === "exceptional") {
    return reasoningTierPolicy[3];
  }

  return reasoningTierPolicy.find((policy) => policy.taskTypes.includes(request.taskType)) ||
    reasoningTierPolicy.find((policy) => policy.complexity.includes(request.taskComplexity)) ||
    reasoningTierPolicy.find((policy) => policy.quality.includes(request.qualityRequirement)) ||
    reasoningTierPolicy[1];
}
