export const technologyTypes = {
  aiModel: "AI_MODEL",
  modelProvider: "MODEL_PROVIDER",
  agentFramework: "AGENT_FRAMEWORK",
  codingAgent: "CODING_AGENT",
  openSourceTool: "OPEN_SOURCE_TOOL",
  imageTool: "IMAGE_TOOL",
  videoTool: "VIDEO_TOOL",
  voiceTool: "VOICE_TOOL",
  musicTool: "MUSIC_TOOL",
  browserTool: "BROWSER_TOOL",
  automationTool: "AUTOMATION_TOOL",
  databaseTool: "DATABASE_TOOL",
  searchResearchTool: "SEARCH_RESEARCH_TOOL",
  securityTool: "SECURITY_TOOL",
  infrastructureTool: "INFRASTRUCTURE_TOOL",
  mcpTool: "MCP_TOOL",
  businessTool: "BUSINESS_TOOL",
  other: "OTHER"
};

export const technologyEventTypes = {
  discovered: "DISCOVERED",
  update: "UPDATE",
  breakingChange: "BREAKING_CHANGE",
  newOpportunity: "NEW_OPPORTUNITY",
  capabilityGap: "ESSA_CAPABILITY_GAP",
  costChange: "COST_CHANGE"
};

export const sourceTrustTiers = {
  tier1Official: "TIER_1_OFFICIAL",
  tier2IndependentTechnical: "TIER_2_INDEPENDENT_TECHNICAL",
  tier3RepositoryCommunity: "TIER_3_REPOSITORY_COMMUNITY",
  tier4SocialSignal: "TIER_4_SOCIAL_SIGNAL"
};

export const evidenceStatuses = {
  officialFact: "OFFICIAL_FACT",
  independentEvidence: "INDEPENDENT_EVIDENCE",
  communitySignal: "COMMUNITY_SIGNAL",
  socialClaim: "SOCIAL_CLAIM",
  unknown: "UNKNOWN"
};

export const claimStatuses = {
  verified: "VERIFIED",
  probable: "PROBABLE",
  unverified: "UNVERIFIED",
  conflicting: "CONFLICTING",
  unknown: "UNKNOWN"
};

export const technologyLifecycleStatuses = {
  discovered: "DISCOVERED",
  watch: "WATCH",
  research: "RESEARCH",
  benchmarkPending: "BENCHMARK_PENDING",
  benchmarked: "BENCHMARKED",
  adoptionReview: "ADOPTION_REVIEW",
  approved: "APPROVED",
  active: "ACTIVE",
  deprecated: "DEPRECATED",
  rejected: "REJECTED",
  archived: "ARCHIVED"
};

export const openSourceSecurityStates = {
  discovered: "DISCOVERED",
  researched: "RESEARCHED",
  securityReviewRequired: "SECURITY_REVIEW_REQUIRED",
  safeFixtureTestAllowed: "SAFE_FIXTURE_TEST_ALLOWED",
  sandboxTestAllowed: "SANDBOX_TEST_ALLOWED",
  adoptionReviewRequired: "ADOPTION_REVIEW_REQUIRED",
  approved: "APPROVED",
  rejected: "REJECTED"
};

export const recommendationStates = {
  ignore: "IGNORE",
  watch: "WATCH",
  research: "RESEARCH",
  securityReview: "SECURITY_REVIEW",
  benchmark: "BENCHMARK",
  adoptionReview: "ADOPTION_REVIEW",
  adoptFuture: "ADOPT_FUTURE",
  reject: "REJECT"
};

export const alertLevels = {
  info: "INFO",
  watch: "WATCH",
  important: "IMPORTANT",
  urgent: "URGENT"
};

export const costChangeClasses = {
  improvement: "COST_IMPROVEMENT",
  regression: "COST_REGRESSION",
  freeAlternative: "FREE_ALTERNATIVE",
  unknown: "UNKNOWN"
};

export const scoutAgentRole = {
  roleId: "ESSA_TECH_SCOUT",
  purpose: "Detect relevant technology changes and candidate technologies.",
  mayAdopt: false,
  mayInstall: false,
  mayCreateKeys: false,
  mayCallProviders: false,
  output: "TechnologyCandidate"
};

export const researchAgentRole = {
  roleId: "ESSA_TECH_RESEARCHER",
  purpose: "Convert candidates into evidence-separated research artifacts.",
  mayAdopt: false,
  mayInstall: false,
  mayCallCandidate: false,
  output: "TechnologyResearchArtifact"
};

export const verifierAgentRole = {
  roleId: "ESSA_TECH_VERIFIER",
  purpose: "Verify identity, availability, versions, capabilities, license, pricing, API status, conflicts and unknowns.",
  mayAdopt: false,
  mayInstall: false,
  mayCallCandidate: false,
  output: "TechnologyVerification"
};

export const fitAnalyzerRole = {
  roleId: "ESSA_TECH_FIT_ANALYZER",
  purpose: "Map researched technology to ESSA products, capabilities, gaps, costs, quality, speed and migration impact.",
  mayMutateCapabilityFabric: false,
  output: "TechnologyEssaFit"
};

export function createTechnologyCandidate(input = {}) {
  return {
    candidateId: input.candidateId || null,
    name: input.name || "",
    technologyType: input.technologyType || technologyTypes.other,
    developer: input.developer || null,
    provider: input.provider || null,
    discoveredFrom: input.discoveredFrom || null,
    discoveredAt: input.discoveredAt || new Date(0).toISOString(),
    firstObservedAt: input.firstObservedAt || null,
    lastObservedAt: input.lastObservedAt || null,
    officialUrlRefs: [...(input.officialUrlRefs || [])],
    repositoryRefs: [...(input.repositoryRefs || [])],
    claimedCapabilities: [...(input.claimedCapabilities || [])],
    versionOrModelId: input.versionOrModelId || null,
    openSourceStatus: input.openSourceStatus || "UNKNOWN",
    licenseStatus: input.licenseStatus || "UNKNOWN",
    pricingStatus: input.pricingStatus || "UNKNOWN",
    availabilityStatus: input.availabilityStatus || "UNKNOWN",
    trustStatus: input.trustStatus || claimStatuses.unknown,
    researchStatus: input.researchStatus || "RESEARCH_REQUIRED",
    relevanceStatus: input.relevanceStatus || "UNASSESSED",
    lifecycleStatus: input.lifecycleStatus || technologyLifecycleStatuses.discovered,
    eventType: input.eventType || technologyEventTypes.discovered,
    signals: [...(input.signals || [])],
    sourceRefs: [...(input.sourceRefs || [])],
    providerCalls: input.providerCalls || 0,
    externalCalls: input.externalCalls || 0,
    installs: input.installs || 0,
    activations: input.activations || 0,
    apiKeysCreated: input.apiKeysCreated || 0
  };
}

export function createTechnologyResearchArtifact(input = {}) {
  return {
    artifactType: "TechnologyResearchArtifact",
    candidateId: input.candidateId || null,
    researchTimestamp: input.researchTimestamp || new Date(0).toISOString(),
    sources: [...(input.sources || [])],
    claims: [...(input.claims || [])],
    officialFacts: [...(input.officialFacts || [])],
    independentEvidence: [...(input.independentEvidence || [])],
    communitySignals: [...(input.communitySignals || [])],
    socialClaims: [...(input.socialClaims || [])],
    conflicts: [...(input.conflicts || [])],
    unknowns: [...(input.unknowns || [])],
    requiresRevalidation: [...(input.requiresRevalidation || [])],
    providerCalls: input.providerCalls || 0,
    externalCalls: input.externalCalls || 0
  };
}

export function createTechnologyEssaFit(input = {}) {
  return {
    candidateId: input.candidateId || null,
    relevantProducts: [...(input.relevantProducts || [])],
    relevantCapabilities: [...(input.relevantCapabilities || [])],
    replacesSomething: input.replacesSomething || false,
    complementsSomething: input.complementsSomething || false,
    fillsGap: input.fillsGap || false,
    potentialSavingsClass: input.potentialSavingsClass || "UNKNOWN",
    potentialQualityGainClass: input.potentialQualityGainClass || "UNKNOWN",
    potentialSpeedGainClass: input.potentialSpeedGainClass || "UNKNOWN",
    localExecutionPotential: input.localExecutionPotential || "UNKNOWN",
    providerDependency: input.providerDependency || "UNKNOWN",
    migrationImpact: input.migrationImpact || "UNKNOWN",
    benchmarkRequired: input.benchmarkRequired !== false,
    capabilityCandidates: [...(input.capabilityCandidates || [])],
    productOpportunityCandidates: [...(input.productOpportunityCandidates || [])],
    providerHealthSignals: [...(input.providerHealthSignals || [])],
    qualityRecords: [...(input.qualityRecords || [])]
  };
}

export function createTechnologyScanSchedule(input = {}) {
  return {
    scanId: input.scanId || null,
    sourceGroups: [...(input.sourceGroups || [])],
    cadence: input.cadence || "manual_fixture",
    priorityDomains: [...(input.priorityDomains || [])],
    lastRun: input.lastRun || null,
    nextRun: input.nextRun || null,
    enabled: input.enabled === true
  };
}

export function createTechnologyScanResult(input = {}) {
  return {
    scanId: input.scanId || null,
    candidatesDiscovered: [...(input.candidatesDiscovered || [])],
    candidatesUpdated: [...(input.candidatesUpdated || [])],
    breakingChanges: [...(input.breakingChanges || [])],
    opportunities: [...(input.opportunities || [])],
    capabilityGapsMatched: [...(input.capabilityGapsMatched || [])],
    researchRequired: [...(input.researchRequired || [])],
    highPriorityItems: [...(input.highPriorityItems || [])],
    ignoredNoise: [...(input.ignoredNoise || [])],
    sourceCount: input.sourceCount || 0,
    providerCalls: input.providerCalls || 0,
    externalCalls: input.externalCalls || 0,
    timestamp: input.timestamp || new Date(0).toISOString()
  };
}

export function createTechnologyReviewItem(input = {}) {
  return {
    candidateId: input.candidateId || null,
    summary: input.summary || "",
    whyEssaCares: input.whyEssaCares || "",
    affectedProducts: [...(input.affectedProducts || [])],
    affectedCapabilities: [...(input.affectedCapabilities || [])],
    evidenceStatus: input.evidenceStatus || claimStatuses.unknown,
    securityStatus: input.securityStatus || openSourceSecurityStates.discovered,
    possibleBenefit: input.possibleBenefit || "UNKNOWN",
    possibleRisk: input.possibleRisk || "UNKNOWN",
    recommendation: input.recommendation || recommendationStates.watch,
    nextSafeAction: input.nextSafeAction || "human_review"
  };
}

export function createTechnologyBenchmarkPlan(input = {}) {
  return {
    planId: input.planId || null,
    candidateId: input.candidateId || null,
    benchmarkType: input.benchmarkType || "GENERIC_TECHNOLOGY_BENCHMARK",
    comparesAgainst: [...(input.comparesAgainst || [])],
    requiredFixtureOnly: input.requiredFixtureOnly !== false,
    providerCallsAllowed: false,
    installsAllowed: false,
    secretAccessAllowed: false,
    qualityHistoryTarget: input.qualityHistoryTarget || "FUTURE_AFTER_APPROVED_BENCHMARK",
    verifierRequired: true,
    humanApprovalRequired: true
  };
}
