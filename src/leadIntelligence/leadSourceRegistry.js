import {
  createLeadSourceProvider,
  leadSourceCostClasses,
  leadSourceTypes
} from "./leadContracts.js";

export const leadSourceRegistry = [
  createLeadSourceProvider({
    providerId: "LOCAL_SYNTHETIC_BUSINESS_FIXTURE",
    sourceType: leadSourceTypes.localDataset,
    capabilities: ["BUSINESS_DISCOVERY", "BUSINESS_DATA_NORMALIZE", "BUSINESS_DEDUPLICATE"],
    supportsSearch: true,
    supportsDirectoryDiscovery: true,
    supportsStructuredExport: true,
    costClass: leadSourceCostClasses.freeLocal,
    rateLimitClass: "LOCAL_FIXTURE_ONLY",
    robotsTermsReviewRequired: false,
    privacyReviewRequired: false,
    activationState: "LOCAL_FIXTURE_ONLY"
  }),
  createLeadSourceProvider({
    providerId: "GENERIC_PUBLIC_DIRECTORY_PROVIDER",
    sourceType: leadSourceTypes.publicDirectory,
    capabilities: ["BUSINESS_DISCOVERY", "BUSINESS_ENTITY_VERIFY"],
    supportsSearch: true,
    supportsDirectoryDiscovery: true,
    costClass: leadSourceCostClasses.externalProviderRequired
  }),
  createLeadSourceProvider({
    providerId: "GENERIC_SEARCH_PROVIDER",
    sourceType: leadSourceTypes.searchProvider,
    capabilities: ["BUSINESS_DISCOVERY", "BUSINESS_ENTITY_VERIFY"],
    supportsSearch: true,
    costClass: leadSourceCostClasses.paidProviderRequired
  }),
  createLeadSourceProvider({
    providerId: "OPEN_SOURCE_LEAD_DISCOVERY_PROVIDER",
    sourceType: leadSourceTypes.openSourceDiscoveryTool,
    capabilities: ["BUSINESS_DISCOVERY", "BUSINESS_DATA_NORMALIZE"],
    supportsSearch: true,
    supportsWebsiteDiscovery: true,
    costClass: leadSourceCostClasses.localCompute,
    rateLimitClass: "AUDIT_REQUIRED_BEFORE_USE",
    activationState: "ARCHITECTURE_ONLY"
  })
];

export function listLeadSourceProviders() {
  return leadSourceRegistry.map((provider) => ({ ...provider, capabilities: [...provider.capabilities] }));
}

export function createLeadSourceReplacementProbe(capability = "BUSINESS_DISCOVERY") {
  return {
    capabilityId: capability,
    beforeProvider: "GENERIC_PUBLIC_DIRECTORY_PROVIDER",
    afterProvider: "GENERIC_SEARCH_PROVIDER",
    businessDiscoveryMeaningStable: true,
    providerDetailsHiddenFromNormalUi: true,
    providerCalls: 0,
    externalCalls: 0
  };
}
