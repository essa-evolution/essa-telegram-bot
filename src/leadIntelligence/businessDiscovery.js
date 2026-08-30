import { routeIntelligenceRequest } from "../intelligence/intelligenceRouter.js";
import { productIds } from "../capabilities/productCapabilityMap.js";
import { verifyBusinessEntity } from "./businessVerification.js";
import { normalizeBusinessEntities } from "./businessEntityNormalizer.js";
import { createLeadIntelligenceAuditArtifact } from "./leadAudit.js";
import { buildLeadResearchContext } from "./leadContextBuilder.js";
import { dedupeBusinessEntities } from "./leadDeduplicator.js";
import {
  createLeadDiscoveryRequest,
  leadFunnelStates,
  leadFreshnessStates
} from "./leadContracts.js";
import { leadResearchPolicy } from "./leadResearchPolicy.js";
import { listLeadSourceProviders } from "./leadSourceRegistry.js";
import { createNeedSignals, matchEssaFit, createBrandOpportunityCandidate } from "./essaFitMatcher.js";
import { qualifyLead } from "./leadQualification.js";
import { scoreLead } from "./leadScoring.js";

export const fixtureBusinessEntities = [
  {
    businessId: "batumi_bistro_1",
    legalOrDisplayName: "Batumi Harbor Bistro",
    businessType: "restaurant",
    industry: "hospitality",
    subIndustry: "restaurant",
    country: "Georgia",
    region: "Adjara",
    city: "Batumi",
    website: null,
    publicBusinessEmail: "hello@harborbistro.example",
    publicBusinessPhone: "+995 555 010101",
    socialProfiles: [],
    directoryProfiles: ["directory.example/batumi-harbor-bistro"],
    publicDescription: "Fictional seaside restaurant; booking absent in fixture profile.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_directory", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "batumi_bistro_duplicate",
    legalOrDisplayName: "Batumi Harbour Bistro",
    businessType: "restaurant",
    industry: "hospitality",
    subIndustry: "restaurant",
    country: "Georgia",
    region: "Adjara",
    city: "Batumi",
    website: null,
    publicBusinessEmail: "hello@harborbistro.example",
    publicBusinessPhone: "+995 555 010101",
    socialProfiles: [],
    directoryProfiles: ["maps.example/batumi-harbour-bistro"],
    publicDescription: "Duplicate fictional listing.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_maps", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "tbilisi_roasters",
    legalOrDisplayName: "Tbilisi Roasters",
    businessType: "cafe",
    industry: "hospitality",
    subIndustry: "coffee",
    country: "Georgia",
    region: "Tbilisi",
    city: "Tbilisi",
    website: "www.tbilisiroasters.example",
    publicBusinessEmail: "info@tbilisiroasters.example",
    publicBusinessPhone: "+995 555 020202",
    socialProfiles: ["instagram.com/tbilisiroasters"],
    directoryProfiles: ["directory.example/tbilisi-roasters"],
    publicDescription: "Fictional cafe with old website and low visible short-form frequency.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_directory", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "batumi_hotel_group",
    legalOrDisplayName: "Batumi Small Hotel Group",
    businessType: "hotel operator",
    industry: "hospitality",
    subIndustry: "hotel",
    country: "Georgia",
    region: "Adjara",
    city: "Batumi",
    website: "hotels-batumi.example",
    publicBusinessEmail: "partners@hotels-batumi.example",
    publicBusinessPhone: null,
    socialProfiles: [],
    directoryProfiles: ["directory.example/batumi-small-hotel-group"],
    publicDescription: "Fictional hotel operator with public brand partnership context.",
    dataFreshness: leadFreshnessStates.aging,
    sourceRefs: [{ sourceId: "fixture_directory", retrievedAt: "2026-07-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "kutaisi_catering",
    legalOrDisplayName: "Kutaisi Catering Studio",
    businessType: "catering",
    industry: "hospitality",
    subIndustry: "catering",
    country: "Georgia",
    region: "Imereti",
    city: "Kutaisi",
    website: "kutaisi-catering.example",
    publicBusinessEmail: null,
    publicBusinessPhone: null,
    socialProfiles: [],
    directoryProfiles: [],
    publicDescription: "Fictional listing with insufficient public evidence.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: []
  },
  {
    businessId: "batumi_builder",
    legalOrDisplayName: "Batumi Green Builders",
    businessType: "construction firm",
    industry: "real estate development",
    subIndustry: "construction",
    country: "Georgia",
    region: "Adjara",
    city: "Batumi",
    website: "greenbuilders.example",
    publicBusinessEmail: "office@greenbuilders.example",
    publicBusinessPhone: "+995 555 030303",
    socialProfiles: ["linkedin.com/company/greenbuilders-example"],
    directoryProfiles: ["registry.example/greenbuilders"],
    publicDescription: "Fictional construction organization for Property/Developer connection tests.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_registry", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "stale_restaurant",
    legalOrDisplayName: "Old Town Supper Club",
    businessType: "restaurant",
    industry: "hospitality",
    subIndustry: "restaurant",
    country: "Georgia",
    region: "Tbilisi",
    city: "Tbilisi",
    website: "oldtownsupper.example",
    publicBusinessEmail: "contact@oldtownsupper.example",
    publicBusinessPhone: null,
    socialProfiles: [],
    directoryProfiles: ["directory.example/oldtownsupper"],
    publicDescription: "Fictional stale restaurant record.",
    dataFreshness: leadFreshnessStates.stale,
    sourceRefs: [{ sourceId: "fixture_directory", retrievedAt: "2026-01-10T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "personal_data_bad_fixture",
    legalOrDisplayName: "Private Owner Lead",
    businessType: "restaurant",
    industry: "hospitality",
    city: "Batumi",
    ownerName: "Private Person",
    personalMobile: "+995 599 000000",
    publicDescription: "Policy rejection fixture.",
    sourceRefs: [{ sourceId: "unsafe_fixture", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  {
    businessId: "sensitive_data_bad_fixture",
    legalOrDisplayName: "Sensitive Data Fixture",
    businessType: "clinic",
    industry: "health",
    city: "Batumi",
    healthStatus: "sensitive",
    publicDescription: "Sensitive policy rejection fixture.",
    sourceRefs: [{ sourceId: "unsafe_fixture", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  }
];

function matchesRequest(entity, request) {
  const text = `${entity.businessType} ${entity.industry} ${entity.subIndustry} ${entity.city} ${entity.region} ${entity.country}`.toLowerCase();
  const marketOk = request.targetMarket ? text.includes(String(request.targetMarket).toLowerCase().replace(/s$/, "")) : true;
  const industryOk = request.industries.length
    ? request.industries.some((industry) => text.includes(String(industry).toLowerCase()))
    : true;
  const geographyOk = request.geography
    ? String(request.geography).toLowerCase().split(/[\/,]/).some((part) => text.includes(part.trim()))
    : true;
  return marketOk && industryOk && geographyOk;
}

export function createRestaurantDiscoveryRequest(input = {}) {
  return createLeadDiscoveryRequest({
    targetMarket: "restaurants",
    geography: "Batumi / Tbilisi",
    industries: ["hospitality"],
    businessTypes: ["restaurant", "cafe"],
    businessNeedHypothesis: "content + advertising + website improvement",
    desiredEssaProducts: [productIds.advertising, productIds.production, productIds.business],
    desiredCapabilities: ["CAMPAIGN_PLAN", "VIDEO_EDIT", "BUSINESS_ANALYZE", "WEBSITE_GENERATE"],
    maxResults: 20,
    ...input
  });
}

export function discoverBusinessesFromFixture(input = {}, dataset = fixtureBusinessEntities) {
  const request = createLeadDiscoveryRequest(input);
  const discovered = dataset.filter((entity) => matchesRequest(entity, request)).slice(0, request.maxResults);
  const normalizationResults = normalizeBusinessEntities(discovered);
  const personalDataExcludedCount = normalizationResults
    .reduce((sum, item) => sum + (item.policy.personalDataExcludedCount || 0) + (item.policy.sensitiveDataExcludedCount || 0), 0);
  const normalized = normalizationResults.map((item) => item.entity).filter(Boolean);
  const dedupeResult = dedupeBusinessEntities(normalized);
  const reviewed = dedupeResult.canonicalEntities.map((entity) => {
    const verification = verifyBusinessEntity(entity);
    const needSignals = createNeedSignals(entity);
    const essaMatches = matchEssaFit(entity, needSignals);
    const qualification = qualifyLead({ request, entity, verification, needSignals, essaMatches });
    const score = scoreLead({ qualification, verification, needSignals, entity });
    const context = buildLeadResearchContext({ request, entity, verification, needSignals, qualification });
    return {
      funnelState: leadFunnelStates.reviewed,
      business: entity,
      verification,
      needSignals,
      essaMatches,
      qualification,
      score,
      context,
      brandOpportunityCandidate: createBrandOpportunityCandidate(entity, essaMatches),
      outreachEnabled: false
    };
  });
  const audit = createLeadIntelligenceAuditArtifact({
    request,
    sourcePolicy: leadResearchPolicy,
    sourceProviders: listLeadSourceProviders(),
    entitiesDiscovered: discovered,
    normalizationResults,
    dedupeResult,
    verifications: reviewed.map((item) => item.verification),
    qualifications: reviewed.map((item) => item.qualification),
    personalDataExcludedCount,
    traceId: request.traceId
  });
  const dryRoute = routeIntelligenceRequest({
    requestId: `${request.requestId}_lead_intelligence_dry_route`,
    taskType: reviewed.length > 100 ? "classification" : "semantic_planning",
    userIntent: request.businessNeedHypothesis,
    requiredCapabilities: ["business_discovery", "lead_qualification"],
    traceId: request.traceId
  });

  return {
    request,
    discovered,
    normalizationResults,
    normalized,
    dedupeResult,
    reviewed,
    audit,
    dryRoute: {
      decisionType: dryRoute.decisionType,
      reasoningLevel: dryRoute.reasoningLevel,
      approvalRequired: dryRoute.approvalRequired,
      providerCalls: 0
    },
    externalCalls: 0,
    providerCalls: 0,
    outreachPerformed: false
  };
}

export function createLeadDiscoveryViewModel(reviewedLead = {}) {
  return {
    business: reviewedLead.business,
    verification: reviewedLead.verification,
    needSignals: reviewedLead.needSignals,
    qualification: reviewedLead.qualification,
    essaMatches: reviewedLead.essaMatches,
    sourceSummary: reviewedLead.business?.sourceRefs || [],
    freshness: reviewedLead.business?.dataFreshness || leadFreshnessStates.unknown,
    reviewStatus: reviewedLead.funnelState || leadFunnelStates.reviewed,
    outreachEnabled: false
  };
}
