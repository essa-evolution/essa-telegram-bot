export function createTechnologyComparison({ candidate = {}, fit = {}, research = {} } = {}) {
  return {
    candidateId: candidate.candidateId || null,
    capabilityCoverage: fit.relevantCapabilities?.length ? "RELEVANT_CAPABILITIES_MATCHED" : "NO_CURRENT_MATCH",
    qualityPotential: fit.potentialQualityGainClass || "UNKNOWN",
    costPotential: fit.potentialSavingsClass || "UNKNOWN",
    latency: "UNKNOWN",
    localCapability: fit.localExecutionPotential || "UNKNOWN",
    privacy: candidate.provider ? "PROVIDER_DEPENDENT_REVIEW_REQUIRED" : "UNKNOWN",
    security: candidate.openSourceStatus === "OPEN_SOURCE" ? "OPEN_SOURCE_SECURITY_GATE_REQUIRED" : "PROVIDER_SECURITY_REVIEW_REQUIRED",
    maturity: research.officialFacts?.length ? "OFFICIAL_PRESENCE_CONFIRMED" : "UNVERIFIED_OR_EARLY",
    maintenance: candidate.repositoryRefs?.length ? "REPOSITORY_REVIEW_REQUIRED" : "UNKNOWN",
    integrationEffort: fit.migrationImpact || "UNKNOWN",
    providerDependency: fit.providerDependency || "UNKNOWN",
    license: candidate.licenseStatus || "UNKNOWN",
    reliability: "REQUIRES_BENCHMARK_OR_OPERATIONAL_HISTORY",
    benchmarkEvidence: fit.qualityRecords?.some((record) => record.qualityScore != null) ? "ESSA_MEASURED" : "INTERNET_CLAIMS_ONLY",
    noPreciseScore: true
  };
}

