import { createBlindReviewPackage } from "./blindReview.js";
import { BENCHMARK_RECOMMENDATIONS } from "./contracts.js";
import { getBenchmarkProviderAdapters } from "./providerAdapters.js";
import { createProductionBookDraftBenchmarkFixture } from "./productionBookFixture.js";
import { calculateManualAverage, checkStructuredCompliance, QUALITY_RUBRIC } from "./rubric.js";

function nowIso() {
  return new Date().toISOString();
}

function redactResult(result = {}) {
  return {
    ...result,
    metadata: {
      ...(result.metadata || {}),
      requiredEnv: result.metadata?.requiredEnv || undefined
    }
  };
}

function summarizeFailures(results = []) {
  return results
    .filter((result) => !result.ok)
    .map((result) => ({
      providerId: result.providerId,
      modelId: result.modelId,
      errors: result.errors,
      status: result.metadata?.status || null
    }));
}

function createCapabilityRecommendation(results = []) {
  const successful = results.filter((result) => result.ok);

  if (!successful.length) {
    return {
      capability: "production_book.create_chapter_draft",
      recommendation: BENCHMARK_RECOMMENDATIONS.KEEP_TESTING,
      reason: "No provider produced benchmark content. Configure providers and implement explicit benchmark adapters before comparing quality."
    };
  }

  return {
    capability: "production_book.create_chapter_draft",
    recommendation: BENCHMARK_RECOMMENDATIONS.KEEP_TESTING,
    reason: "Human blind review is required before declaring BEST_QUALITY, BEST_VALUE, BEST_SPEED or BEST_STRUCTURED.",
    candidates: successful.map((result) => ({
      providerId: result.providerId,
      modelId: result.modelId,
      latencyMs: result.latencyMs,
      estimatedCost: result.estimatedCost,
      structuredCompliance: result.structuredCompliance
    }))
  };
}

export function createBenchmarkReport({
  task,
  results = [],
  blindReviewPackage,
  humanScorecards = []
} = {}) {
  const scoreSummary = humanScorecards.map((scorecard) => ({
    candidateId: scorecard.candidateId,
    average: calculateManualAverage(scorecard),
    recommendation: scorecard.recommendation || BENCHMARK_RECOMMENDATIONS.KEEP_TESTING
  }));

  return {
    title: "ESSA MODEL BENCHMARK REPORT",
    generatedAt: nowIso(),
    benchmarkTask: task,
    providerResults: results.map(redactResult),
    blindOutputs: blindReviewPackage.blindOutputs,
    qualityRubric: QUALITY_RUBRIC,
    humanScorecards,
    scoreSummary,
    costPerformance: results.map((result) => ({
      providerId: result.providerId,
      modelId: result.modelId,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: result.estimatedCost,
      retries: result.metadata?.retries || 0,
      failures: result.ok ? 0 : 1,
      rateLimitErrors: (result.errors || []).filter((error) => String(error).includes("rate_limit")).length
    })),
    failures: summarizeFailures(results),
    recommendationByCapability: createCapabilityRecommendation(results),
    safety: {
      productionFlowTouched: false,
      defaultProviderChanged: false,
      envChanged: false,
      providerCallsRequireExplicitFlag: true,
      apiKeysRedacted: true
    },
    debugOnlyProviderMapping: blindReviewPackage.providerMappingForDebugOnly
  };
}

export async function runProductionBookModelBenchmark({
  allowProviderCalls = false,
  executeProviderCall = false,
  openaiModel = null,
  maxOutputTokens = 1200,
  maxEstimatedCostUsd = null,
  maxProviderCalls = 1,
  openAiInputUsdPer1m = null,
  openAiOutputUsdPer1m = null,
  env = process.env,
  adapters = getBenchmarkProviderAdapters()
} = {}) {
  const task = createProductionBookDraftBenchmarkFixture();
  const results = [];

  for (const adapter of adapters) {
    const started = Date.now();
    const result = await adapter.run(task, {
      allowProviderCalls,
      executeProviderCall,
      openaiModel,
      maxOutputTokens,
      maxEstimatedCostUsd,
      maxProviderCalls,
      openAiInputUsdPer1m,
      openAiOutputUsdPer1m,
      env
    });
    const normalized = {
      ...result,
      latencyMs: result.latencyMs || Date.now() - started
    };

    normalized.structuredCompliance = checkStructuredCompliance(normalized, task);
    results.push(normalized);
  }

  const blindReviewPackage = createBlindReviewPackage(results);

  return createBenchmarkReport({
    task,
    results,
    blindReviewPackage
  });
}
