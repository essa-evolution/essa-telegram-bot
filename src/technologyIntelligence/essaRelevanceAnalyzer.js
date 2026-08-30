import { getProductsForCapability } from "../capabilities/productCapabilityMap.js";
import { getCapability } from "../capabilities/capabilityRegistry.js";
import { providerCapabilityMap } from "../capabilities/providerCapabilityMap.js";
import { createIntelligenceProviderRegistry } from "../intelligence/modelRegistry.js";
import { qualityHistory } from "../intelligence/qualityHistory.js";
import { createProviderHealthSnapshot } from "../intelligence/providerHealth.js";
import { costChangeClasses, createTechnologyEssaFit, technologyTypes } from "./technologyContracts.js";

export function analyzeTechnologyEssaFit(candidate = {}, options = {}) {
  const currentProviders = options.providerRegistry || createIntelligenceProviderRegistry();
  const claimed = candidate.claimedCapabilities || [];
  const relevantCapabilities = claimed.filter((capabilityId) => Boolean(getCapability(capabilityId)));
  const relevantProducts = [...new Set(relevantCapabilities.flatMap(getProductsForCapability))];
  const capabilityCandidates = claimed
    .filter((capabilityId) => !getCapability(capabilityId))
    .map((capabilityId) => ({ capabilityId, proposedByCandidate: candidate.candidateId, reviewRequired: true }));
  const fillsGap = claimed.some((capabilityId) => (options.knownCapabilityGaps || []).includes(capabilityId));
  const providerDependency = candidate.technologyType === technologyTypes.openSourceTool ? "LOW_OR_LOCAL" : "EXTERNAL_PROVIDER_DEPENDENT";
  const localExecutionPotential = candidate.openSourceStatus === "OPEN_SOURCE" ? "POSSIBLE_AFTER_SECURITY_REVIEW" : "UNKNOWN";
  const replacesSomething = Object.values(providerCapabilityMap).some((provider) =>
    claimed.some((capabilityId) => provider.capabilities?.[capabilityId])
  );
  const providerHealthSignals = currentProviders.map(createProviderHealthSnapshot);
  const qualityRecords = qualityHistory.filter((record) =>
    record.model === candidate.versionOrModelId || record.canonicalModelId === candidate.versionOrModelId
  );

  return createTechnologyEssaFit({
    candidateId: candidate.candidateId,
    relevantProducts,
    relevantCapabilities,
    replacesSomething,
    complementsSomething: relevantCapabilities.length > 0 && !replacesSomething,
    fillsGap,
    potentialSavingsClass: candidate.pricingStatus === "FREE" ? costChangeClasses.freeAlternative : "UNKNOWN",
    potentialQualityGainClass: candidate.signals?.some((signal) => signal.qualityClaim) ? "CLAIMED_REQUIRES_BENCHMARK" : "UNKNOWN",
    potentialSpeedGainClass: "UNKNOWN",
    localExecutionPotential,
    providerDependency,
    migrationImpact: replacesSomething ? "MIGRATION_REVIEW_REQUIRED" : "LOW_UNTIL_ADOPTION",
    benchmarkRequired: true,
    capabilityCandidates,
    productOpportunityCandidates: fillsGap ? [{ candidateId: candidate.candidateId, reviewRequired: true }] : [],
    providerHealthSignals,
    qualityRecords
  });
}

