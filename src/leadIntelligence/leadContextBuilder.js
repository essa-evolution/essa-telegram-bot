export function buildLeadResearchContext({ request = {}, entity = {}, verification = {}, needSignals = [], qualification = {} } = {}) {
  const selectedFields = {
    request: {
      targetMarket: request.targetMarket,
      geography: request.geography,
      desiredEssaProducts: request.desiredEssaProducts
    },
    business: {
      businessId: entity.businessId,
      legalOrDisplayName: entity.legalOrDisplayName,
      industry: entity.industry,
      city: entity.city,
      country: entity.country,
      website: entity.website,
      publicDescription: entity.publicDescription
    },
    verification: {
      verificationStatus: verification.verificationStatus,
      confidenceClass: verification.confidenceClass
    },
    needSignals: needSignals.map((signal) => ({
      signalType: signal.signalType,
      observedEvidence: signal.observedEvidence,
      allowedInterpretation: signal.allowedInterpretation
    })),
    qualification: {
      qualificationTier: qualification.qualificationTier,
      essaCapabilityMatches: qualification.essaCapabilityMatches
    }
  };
  const serialized = JSON.stringify(selectedFields);
  return {
    contextType: "LeadResearchContext",
    selectedFields,
    excludedFields: ["personalProfiles", "sensitivePersonalData", "rawDataset"],
    sourceRefs: entity.sourceRefs || [],
    contextChars: serialized.length,
    estimatedTokens: Math.ceil(serialized.length / 4),
    privacyClass: "PUBLIC_BUSINESS_DATA",
    providerMayExpandContext: false,
    neverSendFullDatasetAutomatically: true
  };
}
