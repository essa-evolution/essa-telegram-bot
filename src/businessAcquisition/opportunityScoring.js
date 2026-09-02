import { createOpportunityScore } from "./businessAcquisitionContracts.js";

const tierScore = {
  HIGH_FIT: 4,
  MEDIUM_FIT: 3,
  LOW_FIT: 2,
  NOT_QUALIFIED: 1,
  INSUFFICIENT_EVIDENCE: 0
};

function clamp(value, max) {
  return Math.min(max, Math.max(0, Number(value || 0)));
}

export function scoreBusinessAcquisitionOpportunity({
  prospect = {},
  digitalAudit = {},
  qualification = {},
  verification = {},
  scoreOverrides = {}
} = {}) {
  const opportunityCount = digitalAudit.inferredOpportunities?.length || 0;
  const demoFit = digitalAudit.recommendedDemoTypes?.length ? 3 : 0;
  const complexityPenalty = prospect.website ? 1 : 0;
  const componentScores = {
    digitalGap: clamp(opportunityCount * 2, 4),
    commercialPotential: clamp(tierScore[qualification.qualificationTier] || 0, 4),
    essaProductFit: clamp(qualification.essaCapabilityMatches?.length || 0, 4),
    demoCommunicationValue: demoFit,
    implementationComplexity: Math.max(0, 3 - complexityPenalty),
    publicEvidenceQuality: verification.verificationStatus === "VERIFIED" ? 2 : verification.sourceCount ? 1 : 0,
    ...scoreOverrides
  };

  return createOpportunityScore({
    prospectId: prospect.prospectId,
    componentScores,
    evidenceRefs: [
      ...(digitalAudit.sourceRefs || []).map((source) => source.sourceId),
      ...(qualification.evidenceForNeeds || []).map((item) => item.signalId)
    ]
  });
}
