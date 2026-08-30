import { qualificationTiers } from "./leadContracts.js";

function fit(value) {
  return value ? "MATCH" : "NO_MATCH";
}

export function qualifyLead({ request = {}, entity = {}, verification = {}, needSignals = [], essaMatches = [] } = {}) {
  const geographyFit = request.geography
    ? fit(`${entity.city} ${entity.region} ${entity.country}`.toLowerCase().includes(String(request.geography).toLowerCase().split(/[\/,]/)[0].trim()))
    : "MATCH";
  const industryFit = request.industries?.length
    ? fit(request.industries.some((industry) => `${entity.industry} ${entity.subIndustry}`.toLowerCase().includes(String(industry).toLowerCase())))
    : "MATCH";
  const targetFit = request.targetMarket
    ? fit(`${entity.industry} ${entity.businessType} ${entity.subIndustry}`.toLowerCase().includes(String(request.targetMarket).toLowerCase().replace(/s$/, "")))
    : "MATCH";

  let qualificationTier = qualificationTiers.insufficientEvidence;
  if (verification.verificationStatus === "VERIFIED" && essaMatches.length >= 3 && geographyFit === "MATCH") {
    qualificationTier = qualificationTiers.highFit;
  } else if (verification.sourceCount > 0 && essaMatches.length >= 2) {
    qualificationTier = qualificationTiers.mediumFit;
  } else if (essaMatches.length === 1) {
    qualificationTier = qualificationTiers.lowFit;
  } else if (verification.sourceCount > 0) {
    qualificationTier = qualificationTiers.notQualified;
  }

  return {
    businessId: entity.businessId,
    targetFit,
    geographyFit,
    industryFit,
    potentialNeeds: needSignals.map((signal) => signal.inferredNeed),
    evidenceForNeeds: needSignals.map((signal) => ({
      signalId: signal.signalId,
      observedEvidence: signal.observedEvidence,
      sourceRef: signal.sourceRef
    })),
    essaProductMatches: [...new Set(essaMatches.map((match) => match.productId))],
    essaCapabilityMatches: [...new Set(essaMatches.map((match) => match.capabilityId))],
    qualificationTier,
    qualificationReason: needSignals.length
      ? "Evidence-backed possible fit; requires human review before outreach."
      : "Insufficient observed need evidence.",
    reviewRequired: true
  };
}
