import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import { createLisaProductGuideContext } from "../capabilities/capabilityKnowledge.js";
import { buildPropertyPassport } from "./propertyPassportBuilder.js";
import { buildPropertyPassportViewModel } from "./propertyPassportViewModel.js";
import {
  buildBoundedPropertyDiscoveryContext,
  createLisaPropertyDiscoveryExplanation,
  discoverProperties,
  parsePropertyDiscoveryQuery
} from "./propertyDiscovery.js";
import { propertyReadService } from "./propertyReadService.js";

function normalize(value = "") {
  return String(value || "").toLowerCase();
}

export function isPropertyDiscoveryQuery(userText = "") {
  const text = normalize(userText);
  return [
    "property",
    "real estate",
    "недвиж",
    "квартир",
    "апартамент",
    "батум",
    "batumi",
    "property passport",
    "паспорт недвижимости"
  ].some((marker) => text.includes(marker));
}

export const propertyReadOnlyIntentTypes = {
  overview: "PROPERTY_OVERVIEW",
  knownData: "PROPERTY_KNOWN_DATA",
  verifiedData: "PROPERTY_VERIFIED_DATA",
  risks: "PROPERTY_RISKS",
  staleReason: "PROPERTY_STALE_REASON",
  sources: "PROPERTY_SOURCES",
  passportMeaning: "PROPERTY_PASSPORT_MEANING",
  limitations: "PROPERTY_LIMITATIONS",
  futureCapability: "NOT_ACTIVE_FUTURE_CAPABILITY"
};

export function classifyPropertyReadOnlyIntent(userText = "") {
  const text = normalize(userText);
  if (["купить", "оплат", "заброни", "подпис", "проверить собственника live", "live owner"].some((marker) => text.includes(marker))) {
    return propertyReadOnlyIntentTypes.futureCapability;
  }
  if (["какие данные провер", "что провер", "verified"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.verifiedData;
  if (["риск", "risk"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.risks;
  if (["stale", "устар", "помечен stale"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.staleReason;
  if (["откуда", "source", "источник"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.sources;
  if (["что значит property passport", "паспорт недвижимости", "property passport"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.passportMeaning;
  if (["что essa пока не умеет", "не умеет", "not active"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.limitations;
  if (["что известно", "known"].some((marker) => text.includes(marker))) return propertyReadOnlyIntentTypes.knownData;
  return propertyReadOnlyIntentTypes.overview;
}

export function buildBoundedPropertyContext({
  query = "",
  propertyId = "normal",
  property = null,
  facts = null,
  listingSnapshots = null,
  lifecycleEvents = null,
  maxItems = 4,
  maxChars = 1600
} = {}) {
  if (!property) {
    const readContext = propertyReadService.buildBoundedPropertyReadContext({
      query,
      propertyId,
      maxItems,
      maxChars
    });
    return {
      ...readContext,
      readOnlyIntent: classifyPropertyReadOnlyIntent(query),
      allowedActions: ["preview", "explain", "inspect", "future_preflight_placeholder"],
      blockedLiveActions: classifyPropertyReadOnlyIntent(query) === propertyReadOnlyIntentTypes.futureCapability
        ? ["buy", "pay", "book", "sign", "live_owner_verification"]
        : [],
      status: classifyPropertyReadOnlyIntent(query) === propertyReadOnlyIntentTypes.futureCapability
        ? "NOT_ACTIVE"
        : readContext.status
    };
  }
  const { passport, audit } = buildPropertyPassport({
    property,
    facts: facts || property?.facts || [],
    sourceRefs: property?.sourceRefs || [],
    listingSnapshots: listingSnapshots || [],
    lifecycleEvents: lifecycleEvents || [],
    generatedAt: "2026-08-20T00:00:00.000Z"
  });
  const viewModel = buildPropertyPassportViewModel({
    property,
    facts: facts || property?.facts || [],
    listingSnapshots: listingSnapshots || [],
    lifecycleEvents: lifecycleEvents || [],
    generatedAt: "2026-08-20T00:00:00.000Z"
  });
  const readOnlyIntent = classifyPropertyReadOnlyIntent(query);
  const memoryItems = [
    {
      id: `${property.propertyId}_passport_public_view`,
      text: JSON.stringify(passport?.publicView || {}),
      relevance: 1,
      source: "PropertyPassport"
    },
    {
      id: `${property.propertyId}_passport_freshness`,
      text: JSON.stringify({
        freshness: passport?.freshness,
        verificationStatus: passport?.verificationStatus,
        riskFlags: passport?.riskFlags,
        gaps: audit.gaps,
        warnings: audit.warnings
      }),
      relevance: 1,
      source: "PropertyPassportAudit"
    },
    {
      id: `${property.propertyId}_verified_facts`,
      text: JSON.stringify(passport?.verifiedFacts || []),
      relevance: 0.9,
      source: "PropertyFact"
    },
    {
      id: `${property.propertyId}_unavailable_features`,
      text: JSON.stringify(passport?.publicView?.unavailableCurrentFeatures || []),
      relevance: 0.8,
      source: "PropertyPolicy"
    },
    {
      id: `${property.propertyId}_view_model_summary`,
      text: JSON.stringify({
        identity: viewModel.identitySection,
        market: viewModel.marketSection,
        freshness: viewModel.freshnessSection,
        risks: viewModel.risksSection.rows,
        lisa: viewModel.lisaExplanationSection.text
      }),
      relevance: 0.95,
      source: "PropertyPassportViewModel"
    }
  ];
  const context = buildContextPackage({
    intent: "property_passport_readonly_preview",
    maxItems,
    maxChars,
    memoryItems
  });

  return {
    query,
    intent: "PROPERTY_PASSPORT_PREVIEW",
    propertyId: property.propertyId,
    readOnlyIntent,
    passport,
    audit,
    viewModel,
    boundedContext: context,
    boundedContextMetadata: {
      selectedCount: context.selected.length,
      omittedCount: context.omittedCount,
      usedChars: context.budget.usedChars,
      maxChars: context.budget.maxChars
    },
    allowedActions: ["preview", "explain", "inspect", "future_preflight_placeholder"],
    blockedLiveActions: readOnlyIntent === propertyReadOnlyIntentTypes.futureCapability
      ? ["buy", "pay", "book", "sign", "live_owner_verification"]
      : [],
    status: readOnlyIntent === propertyReadOnlyIntentTypes.futureCapability ? "NOT_ACTIVE" : "READ_ONLY_AVAILABLE",
    liveActionsEnabled: false,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function buildBoundedPropertyDiscoveryQueryContext({
  query = "",
  maxItems = 4,
  maxChars = 1800
} = {}) {
  const discovery = discoverProperties(query);
  const context = buildBoundedPropertyDiscoveryContext(discovery);
  return {
    ...context,
    boundedContextMetadata: {
      ...context.boundedContextMetadata,
      maxItems,
      maxChars
    },
    readOnlyIntent: "PROPERTY_DISCOVERY",
    parsedQuery: parsePropertyDiscoveryQuery(query),
    allowedActions: ["view_passport", "compare", "ask_lisa", "guide_discovery"],
    blockedLiveActions: ["live_search", "maps", "contact_seller", "buy", "rent_execution", "book", "pay", "transaction", "legal_verification", "ownership_verification"],
    liveActionsEnabled: false,
    status: discovery.status
  };
}

export function createLisaPropertyPassportExplanation(propertyContext = buildBoundedPropertyContext()) {
  const lisaGuide = createLisaProductGuideContext();
  const passport = propertyContext.passport || {};
  const audit = propertyContext.audit || {};
  const viewModel = propertyContext.viewModel || buildPropertyPassportViewModel();
  return {
    roleId: lisaGuide.role.roleId,
    usesCharacterCore: true,
    mayMutateCharacterCore: false,
    propertyId: passport.propertyId || null,
    summary: passport.currentSummary || "Property Passport preview is not available.",
    freshnessExplanation: `Freshness is ${passport.freshness || "UNKNOWN"} based on local fixture source timestamps.`,
    verifiedExplanation: `${passport.verifiedFacts?.length || 0} verified facts, ${passport.unverifiedFacts?.length || 0} unverified facts, ${passport.inferredFacts?.length || 0} inferred facts.`,
    humanExplanation: viewModel.lisaExplanationSection.text,
    riskExplanations: viewModel.risksSection.rows.map((row) => row.explanation),
    gaps: [...(audit.gaps || [])],
    warnings: [...(audit.warnings || [])],
    truthfulLimitations: [
      "Live property search is not active.",
      "Booking is not active.",
      "Transaction and payment are not active.",
      "Ownership and legal verification are not active.",
      "KYC/KYB and signatures are not active.",
      "Property Stay is not active."
    ],
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export { createLisaPropertyDiscoveryExplanation };
