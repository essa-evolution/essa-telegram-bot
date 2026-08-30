import {
  claimStatuses,
  createTechnologyBenchmarkPlan,
  createTechnologyReviewItem,
  openSourceSecurityStates,
  recommendationStates,
  technologyEventTypes
} from "./technologyContracts.js";

export function recommendTechnology({ candidate = {}, research = {}, fit = {}, risk = {} } = {}) {
  if (risk.securityStatus === openSourceSecurityStates.rejected) return recommendationStates.reject;
  if (risk.securityStatus === openSourceSecurityStates.securityReviewRequired) return recommendationStates.securityReview;
  if (candidate.eventType === technologyEventTypes.breakingChange) return recommendationStates.research;
  if (fit.fillsGap || fit.potentialSavingsClass === "FREE_ALTERNATIVE") return recommendationStates.benchmark;
  if (research.socialClaims?.length && !research.officialFacts?.length) return recommendationStates.watch;
  if (!fit.relevantCapabilities?.length && !fit.capabilityCandidates?.length) return recommendationStates.ignore;
  return recommendationStates.watch;
}

export function createTechnologyRecommendationPackage({ candidate = {}, research = {}, fit = {}, risk = {}, comparison = {} } = {}) {
  const recommendation = recommendTechnology({ candidate, research, fit, risk, comparison });
  const reviewItem = createTechnologyReviewItem({
    candidateId: candidate.candidateId,
    summary: `${candidate.name} (${candidate.technologyType})`,
    whyEssaCares: fit.fillsGap ? "Matches an ESSA capability gap." : "Relevant only after evidence review.",
    affectedProducts: fit.relevantProducts,
    affectedCapabilities: fit.relevantCapabilities,
    evidenceStatus: research.officialFacts?.length ? claimStatuses.verified : claimStatuses.unverified,
    securityStatus: risk.securityStatus,
    possibleBenefit: fit.potentialSavingsClass || fit.potentialQualityGainClass || "UNKNOWN",
    possibleRisk: risk.reasons?.join("; ") || comparison.security || "UNKNOWN",
    recommendation,
    nextSafeAction: recommendation === recommendationStates.benchmark ? "prepare_future_fixture_benchmark_for_human_approval" : "human_review"
  });

  return {
    candidateId: candidate.candidateId,
    recommendation,
    reviewItem,
    benchmarkPlan: recommendation === recommendationStates.benchmark
      ? createTechnologyBenchmarkPlan({
          planId: `${candidate.candidateId}_future_benchmark`,
          candidateId: candidate.candidateId,
          benchmarkType: candidate.technologyType === "AI_MODEL" ? "MODEL_BENCHMARK_PLAN" : "TOOL_BENCHMARK_PLAN",
          comparesAgainst: fit.relevantCapabilities
        })
      : null,
    providerCalls: 0,
    externalCalls: 0,
    installs: 0,
    activations: 0,
    apiKeysCreated: 0
  };
}

