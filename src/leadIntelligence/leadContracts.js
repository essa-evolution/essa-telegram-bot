export const leadDataClasses = {
  publicBusinessData: "PUBLIC_BUSINESS_DATA",
  publicRoleContact: "PUBLIC_ROLE_CONTACT",
  personalData: "PERSONAL_DATA",
  sensitivePersonalData: "SENSITIVE_PERSONAL_DATA",
  unknown: "UNKNOWN"
};

export const leadFreshnessStates = {
  current: "CURRENT",
  aging: "AGING",
  stale: "STALE",
  unknown: "UNKNOWN"
};

export const businessVerificationStatuses = {
  verified: "VERIFIED",
  insufficientEvidence: "INSUFFICIENT_EVIDENCE",
  staleReviewRequired: "STALE_REVIEW_REQUIRED",
  rejectedPersonalData: "REJECTED_PERSONAL_DATA",
  reviewRequired: "REVIEW_REQUIRED"
};

export const dedupeStatuses = {
  unique: "UNIQUE",
  possibleDuplicate: "POSSIBLE_DUPLICATE",
  confirmedDuplicate: "CONFIRMED_DUPLICATE",
  reviewRequired: "REVIEW_REQUIRED"
};

export const qualificationTiers = {
  highFit: "HIGH_FIT",
  mediumFit: "MEDIUM_FIT",
  lowFit: "LOW_FIT",
  notQualified: "NOT_QUALIFIED",
  insufficientEvidence: "INSUFFICIENT_EVIDENCE"
};

export const leadFunnelStates = {
  discovered: "DISCOVERED",
  normalized: "NORMALIZED",
  deduped: "DEDUPED",
  verified: "VERIFIED",
  qualified: "QUALIFIED",
  reviewed: "REVIEWED",
  outreachReady: "OUTREACH_READY",
  futureContacted: "FUTURE_CONTACTED"
};

export const leadSourceTypes = {
  publicDirectory: "PUBLIC_DIRECTORY",
  searchProvider: "SEARCH_PROVIDER",
  websiteCrawler: "WEBSITE_CRAWLER",
  localDataset: "LOCAL_DATASET",
  businessRegistry: "BUSINESS_REGISTRY",
  mapsProvider: "MAPS_PROVIDER",
  browserAgent: "BROWSER_AGENT",
  openSourceDiscoveryTool: "OPEN_SOURCE_DISCOVERY_TOOL"
};

export const leadSourceCostClasses = {
  freeLocal: "FREE_LOCAL",
  localCompute: "LOCAL_COMPUTE",
  externalProviderRequired: "EXTERNAL_PROVIDER_REQUIRED",
  paidProviderRequired: "PAID_PROVIDER_REQUIRED",
  unknown: "UNKNOWN"
};

export const businessNeedSignalTypes = {
  noWebsiteFound: "NO_WEBSITE_FOUND",
  inactiveSocialPresence: "INACTIVE_SOCIAL_PRESENCE",
  noShortFormContentFound: "NO_SHORT_FORM_CONTENT_FOUND",
  outdatedWebExperience: "OUTDATED_WEB_EXPERIENCE",
  noVisibleBookingFlow: "NO_VISIBLE_BOOKING_FLOW",
  lowContentFrequency: "LOW_CONTENT_FREQUENCY"
};

export const leadConfidenceClasses = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  unknown: "UNKNOWN"
};

export const businessEntityContract = {
  businessId: null,
  legalOrDisplayName: "",
  businessType: "",
  industry: "",
  subIndustry: "",
  country: "",
  region: "",
  city: "",
  website: null,
  publicBusinessEmail: null,
  publicBusinessPhone: null,
  socialProfiles: [],
  directoryProfiles: [],
  publicDescription: "",
  sourceRefs: [],
  verificationStatus: businessVerificationStatuses.reviewRequired,
  dataFreshness: leadFreshnessStates.unknown,
  createdAt: null,
  updatedAt: null
};

export const leadDiscoveryRequestContract = {
  requestId: null,
  targetMarket: "",
  geography: "",
  industries: [],
  businessTypes: [],
  businessNeedHypothesis: "",
  desiredEssaProducts: [],
  desiredCapabilities: [],
  maxResults: 25,
  sourcePolicy: {},
  dataPolicy: {},
  freshnessRequirement: leadFreshnessStates.current,
  qualificationPolicy: {},
  traceId: null
};

export const leadSourceProviderContract = {
  providerId: null,
  sourceType: leadSourceTypes.localDataset,
  capabilities: [],
  publicBusinessDataOnly: true,
  supportsSearch: false,
  supportsDirectoryDiscovery: false,
  supportsWebsiteDiscovery: false,
  supportsStructuredExport: false,
  costClass: leadSourceCostClasses.freeLocal,
  rateLimitClass: "LOCAL_FIXTURE",
  robotsTermsReviewRequired: true,
  privacyReviewRequired: true,
  executable: false,
  activationState: "ARCHITECTURE_ONLY"
};

export const executionDisabledReason = "LEAD_INTELLIGENCE_LIVE_DISCOVERY_NOT_ENABLED_PHASE_21J_LI";

export function createBusinessEntity(input = {}) {
  return {
    ...businessEntityContract,
    ...input,
    socialProfiles: [...(input.socialProfiles || [])],
    directoryProfiles: [...(input.directoryProfiles || [])],
    sourceRefs: [...(input.sourceRefs || [])]
  };
}

export function createLeadDiscoveryRequest(input = {}) {
  return {
    ...leadDiscoveryRequestContract,
    ...input,
    requestId: input.requestId || `lead_discovery_${Date.now().toString(36)}`,
    industries: [...(input.industries || [])],
    businessTypes: [...(input.businessTypes || [])],
    desiredEssaProducts: [...(input.desiredEssaProducts || [])],
    desiredCapabilities: [...(input.desiredCapabilities || [])],
    sourcePolicy: { publicBusinessDataOnly: true, ...(input.sourcePolicy || {}) },
    dataPolicy: {
      permittedDataClasses: [leadDataClasses.publicBusinessData],
      prohibitedDataClasses: [leadDataClasses.personalData, leadDataClasses.sensitivePersonalData],
      ...(input.dataPolicy || {})
    },
    qualificationPolicy: { reviewRequiredBeforeOutreach: true, ...(input.qualificationPolicy || {}) },
    traceId: input.traceId || `lead_trace_${Date.now().toString(36)}`
  };
}

export function createLeadSourceProvider(input = {}) {
  return {
    ...leadSourceProviderContract,
    ...input,
    capabilities: [...(input.capabilities || [])],
    publicBusinessDataOnly: input.publicBusinessDataOnly !== false,
    executable: false
  };
}
