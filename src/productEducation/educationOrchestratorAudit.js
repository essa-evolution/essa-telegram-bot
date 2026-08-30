import { productEducationAuditArtifactContract } from "./educationContracts.js";

export function createProductEducationAuditArtifact({ strategy, angles = [], channelBriefs = [], demoPlan } = {}) {
  return {
    ...productEducationAuditArtifactContract,
    sourceProduct: strategy.productId,
    sourceCapability: strategy.capabilityId,
    availability: strategy.availabilityTruth?.availabilityState,
    versions: strategy.sourceVersions,
    educationStrategy: strategy.strategyId,
    angleCount: angles.length,
    channelsPrepared: [...new Set(channelBriefs.map((brief) => brief.channel))],
    demoEligibility: demoPlan?.demoStatus || "DEMO_NOT_REQUESTED",
    allowedClaims: [...(strategy.availabilityTruth?.allowedClaims || [])],
    prohibitedClaims: [...(strategy.availabilityTruth?.prohibitedClaims || [])],
    freshness: strategy.freshnessStatus,
    executionPerformed: false,
    providerCalls: 0,
    timestamp: new Date().toISOString()
  };
}
