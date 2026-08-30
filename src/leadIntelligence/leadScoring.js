import { qualificationTiers } from "./leadContracts.js";

const tierScore = {
  [qualificationTiers.highFit]: 4,
  [qualificationTiers.mediumFit]: 3,
  [qualificationTiers.lowFit]: 2,
  [qualificationTiers.notQualified]: 1,
  [qualificationTiers.insufficientEvidence]: 0
};

export function scoreLead({ qualification = {}, verification = {}, needSignals = [], entity = {} } = {}) {
  const componentScores = {
    qualification: tierScore[qualification.qualificationTier] || 0,
    verification: verification.verificationStatus === "VERIFIED" ? 2 : 0,
    needSignals: Math.min(3, needSignals.length),
    freshness: entity.dataFreshness === "CURRENT" ? 2 : entity.dataFreshness === "AGING" ? 1 : 0,
    contactability: entity.publicBusinessEmail || entity.publicBusinessPhone || entity.website ? 1 : 0
  };
  const total = Object.values(componentScores).reduce((sum, value) => sum + value, 0);
  return {
    totalClass: total >= 9 ? "HIGH_PRIORITY" : total >= 6 ? "MEDIUM_PRIORITY" : total >= 3 ? "LOW_PRIORITY" : "INSUFFICIENT_EVIDENCE",
    componentScores,
    evidence: qualification.evidenceForNeeds || [],
    confidence: verification.confidenceClass || "UNKNOWN",
    reviewRequired: true
  };
}
