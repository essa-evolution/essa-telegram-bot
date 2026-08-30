export const pricingRevalidationStatus = "PRICE_REVALIDATION_REQUIRED_BEFORE_LIVE_USE";

export const budgetModes = {
  freeOnly: "FREE_ONLY",
  lowCost: "LOW_COST",
  standard: "STANDARD",
  premium: "PREMIUM",
  humanApprovalRequired: "HUMAN_APPROVAL_REQUIRED"
};

export const taskBudgetPolicy = {
  taskMaxUsd: null,
  workflowMaxUsd: null,
  projectDailyBudget: null,
  userPlanBudget: null,
  providerBudget: null,
  modes: Object.values(budgetModes)
};

export function estimateTokens(request = {}) {
  const budget = request.contextBudget || request.contextPack?.budget || {};
  const chars = budget.usedChars || budget.maxChars || JSON.stringify(request.contextPack || {}).length || 0;

  return {
    estimatedInputTokens: Math.ceil(chars / 4),
    estimatedOutputTokens: request.estimatedOutputTokens || 1000
  };
}

export function estimateCost({ provider, model, request = {}, toolCost = 0 } = {}) {
  if (!provider || !model) {
    return {
      provider: provider?.providerId || null,
      model: model?.modelId || null,
      inputCost: 0,
      outputCost: 0,
      toolCost,
      totalEstimatedCost: toolCost,
      pricingVersion: "local_zero_cost",
      pricingVerifiedAt: null,
      priceRevalidationRequired: false
    };
  }

  const pricing = model.pricing || provider.costMetadata?.pricing || {};
  const { estimatedInputTokens, estimatedOutputTokens } = estimateTokens(request);

  if (pricing.priceRevalidationRequired || pricing.inputPerMillionUsd == null || pricing.outputPerMillionUsd == null) {
    return {
      provider: provider.providerId,
      model: model.modelId,
      inputCost: null,
      outputCost: null,
      toolCost,
      totalEstimatedCost: null,
      estimatedInputTokens,
      estimatedOutputTokens,
      pricingVersion: pricing.pricingVersion || pricingRevalidationStatus,
      pricingVerifiedAt: pricing.pricingVerifiedAt || null,
      priceRevalidationRequired: true
    };
  }

  const inputCost = (estimatedInputTokens / 1000000) * pricing.inputPerMillionUsd;
  const outputCost = (estimatedOutputTokens / 1000000) * pricing.outputPerMillionUsd;

  return {
    provider: provider.providerId,
    model: model.modelId,
    inputCost,
    outputCost,
    toolCost,
    totalEstimatedCost: inputCost + outputCost + toolCost,
    estimatedInputTokens,
    estimatedOutputTokens,
    pricingVersion: pricing.pricingVersion,
    pricingVerifiedAt: pricing.pricingVerifiedAt,
    priceRevalidationRequired: false
  };
}

export function evaluateBudget({ request = {}, estimatedCost = null, external = false } = {}) {
  const checks = [];

  if (request.budgetMode === budgetModes.freeOnly && external) {
    checks.push({ code: "free_only_blocks_external_model", passed: false });
  }

  if (external && request.maxCostUsd === 0) {
    checks.push({ code: "task_budget_exhausted", passed: false });
  }

  if (
    external &&
    typeof request.maxCostUsd === "number" &&
    typeof estimatedCost?.totalEstimatedCost === "number" &&
    estimatedCost.totalEstimatedCost > request.maxCostUsd
  ) {
    checks.push({ code: "estimated_cost_exceeds_task_budget", passed: false });
  }

  return {
    ok: checks.every((check) => check.passed !== false),
    checks
  };
}
