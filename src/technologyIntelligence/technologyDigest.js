import { alertLevels, recommendationStates, technologyEventTypes } from "./technologyContracts.js";

function top(items = [], limit = 5) {
  return items.slice(0, limit);
}

export function createTechnologyDigest({ scanResult = {}, recommendations = [] } = {}) {
  const recommendationById = new Map(recommendations.map((item) => [item.candidateId, item]));
  const withRecommendation = (candidate) => ({
    candidateId: candidate.candidateId,
    name: candidate.name,
    recommendation: recommendationById.get(candidate.candidateId)?.recommendation || recommendationStates.watch,
    alertLevel: candidate.signals?.[0]?.priority || alertLevels.watch
  });

  return {
    title: "ESSA TECH RADAR - TODAY",
    new: top((scanResult.candidatesDiscovered || []).map(withRecommendation)),
    importantUpdates: top((scanResult.candidatesUpdated || []).map(withRecommendation)),
    potentialSavings: top((scanResult.opportunities || []).filter((candidate) => candidate.pricingStatus === "FREE").map(withRecommendation)),
    newCapabilities: top((scanResult.capabilityGapsMatched || []).map(withRecommendation)),
    breakingChanges: top((scanResult.breakingChanges || []).map(withRecommendation)),
    watch: top((scanResult.highPriorityItems || []).map(withRecommendation)),
    recommendedForTest: top(recommendations.filter((item) => item.recommendation === recommendationStates.benchmark)),
    noActionRequired: top((scanResult.ignoredNoise || []).map(withRecommendation)),
    providerCalls: 0,
    externalCalls: 0,
    installs: 0,
    activations: 0
  };
}

export function classifyTechnologyAlert(candidate = {}) {
  if (candidate.signals?.some((signal) => signal.priority === alertLevels.urgent)) return alertLevels.urgent;
  if (candidate.eventType === technologyEventTypes.breakingChange) return alertLevels.urgent;
  if (candidate.signals?.some((signal) => signal.priority === alertLevels.important)) return alertLevels.important;
  if (candidate.researchStatus === "RESEARCH_REQUIRED") return alertLevels.watch;
  return alertLevels.info;
}

