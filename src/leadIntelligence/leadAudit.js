export function createLeadIntelligenceAuditArtifact({
  request,
  sourcePolicy,
  sourceProviders = [],
  entitiesDiscovered = [],
  normalizationResults = [],
  dedupeResult = {},
  verifications = [],
  qualifications = [],
  personalDataExcludedCount = 0,
  traceId = null
} = {}) {
  return {
    artifactType: "LeadIntelligenceAuditArtifact",
    request,
    sourcePolicy,
    sourceProviders,
    entitiesDiscovered: entitiesDiscovered.length,
    entitiesNormalized: normalizationResults.filter((item) => item.entity).length,
    duplicatesRemoved: dedupeResult.duplicatesRemoved || 0,
    entitiesVerified: verifications.filter((item) => item.verificationStatus === "VERIFIED").length,
    entitiesQualified: qualifications.filter((item) => !["NOT_QUALIFIED", "INSUFFICIENT_EVIDENCE"].includes(item.qualificationTier)).length,
    reviewRequiredCount: qualifications.filter((item) => item.reviewRequired).length,
    personalDataExcludedCount,
    providerCalls: 0,
    externalCalls: 0,
    outreachPerformed: false,
    timestamp: "2026-08-20T00:00:00.000Z",
    traceId: traceId || request?.traceId || null
  };
}
