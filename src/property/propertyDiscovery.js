import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import { createLisaProductGuideContext } from "../capabilities/capabilityKnowledge.js";
import { propertyReadService } from "./propertyReadService.js";

export const propertyDiscoveryStatuses = {
  found: "FOUND",
  noMatches: "NO_MATCHES_IN_CURRENT_PROPERTY_DATA"
};

export const propertyDiscoveryUnknown = "NOT_SPECIFIED";

export const propertyDiscoveryQueryContract = {
  modelType: "PropertyDiscoveryQuery",
  readOnly: true,
  fields: [
    "country",
    "city",
    "propertyType",
    "currentStatus",
    "minPrice",
    "maxPrice",
    "currency",
    "projectId",
    "buildingId",
    "bedrooms",
    "areaMin",
    "areaMax",
    "listingType",
    "intent"
  ],
  prohibited: [
    "external_search",
    "scraping",
    "maps",
    "fx_conversion",
    "ranking",
    "recommendation",
    "booking",
    "payment",
    "transaction",
    "ownership_verification",
    "legal_verification"
  ]
};

export const propertyDiscoveryGuideSteps = [
  { id: "where", title: "Where?", prompt: "City or country. You can skip this." },
  { id: "type", title: "Property type?", prompt: "Apartment, house or another type. You can skip this." },
  { id: "budget", title: "Budget?", prompt: "Optional min/max observed price and currency." },
  { id: "intent", title: "Buy / rent intent?", prompt: "Sale is supported only where current local data says sale." },
  { id: "matches", title: "Show local matches", prompt: "Only current repository records are shown." },
  { id: "explain", title: "Freshness / verification", prompt: "Lisa explains known, stale, missing and review-required data." },
  { id: "actions", title: "Open Passport / Compare", prompt: "Read-only actions only." }
];

function normalize(value = "") {
  return String(value || "").toLowerCase().trim();
}

function unspecifiedQuery() {
  return {
    modelType: "PropertyDiscoveryQuery",
    country: propertyDiscoveryUnknown,
    city: propertyDiscoveryUnknown,
    propertyType: propertyDiscoveryUnknown,
    currentStatus: propertyDiscoveryUnknown,
    minPrice: null,
    maxPrice: null,
    currency: propertyDiscoveryUnknown,
    projectId: propertyDiscoveryUnknown,
    buildingId: propertyDiscoveryUnknown,
    bedrooms: propertyDiscoveryUnknown,
    areaMin: null,
    areaMax: null,
    listingType: propertyDiscoveryUnknown,
    intent: "PROPERTY_DISCOVERY",
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

function numberFrom(text = "") {
  const compact = String(text).replace(/\s+/g, "");
  const match = compact.match(/(\d{1,9})/);
  return match ? Number(match[1]) : null;
}

function parsePrice(text = "") {
  const lower = normalize(text);
  const value = numberFrom(lower);
  const currency = /\busd\b|\$|доллар|dollar/.test(lower)
    ? "USD"
    : /\bgel\b|лари/.test(lower)
      ? "GEL"
      : propertyDiscoveryUnknown;
  if (value == null) return { minPrice: null, maxPrice: null, currency };
  if (/до|under|below|max|less than|не больше/.test(lower)) return { minPrice: null, maxPrice: value, currency };
  if (/от|from|min|above|more than|не меньше/.test(lower)) return { minPrice: value, maxPrice: null, currency };
  return { minPrice: null, maxPrice: value, currency };
}

export function parsePropertyDiscoveryQuery(userText = "") {
  const text = normalize(userText);
  const query = unspecifiedQuery();
  query.rawText = String(userText || "");

  if (/батум|batumi/.test(text)) query.city = "Batumi";
  if (/тбилис|tbilisi/.test(text)) query.city = "Tbilisi";
  if (/груз|georgia/.test(text)) query.country = "Georgia";
  if (/квартир|апартамент|apartment|flat|unit/.test(text)) query.propertyType = "APARTMENT_UNIT";
  if (/вилл|villa/.test(text)) query.propertyType = "VILLA";
  if (/прода|sale|buy|купить|покуп/.test(text)) {
    query.currentStatus = "LISTED_FOR_SALE";
    query.listingType = "SALE";
  }
  if (/аренд|rent/.test(text)) query.listingType = "RENT";

  const price = parsePrice(text);
  query.minPrice = price.minPrice;
  query.maxPrice = price.maxPrice;
  if (price.currency !== propertyDiscoveryUnknown) query.currency = price.currency;

  return query;
}

function specified(value) {
  return value !== propertyDiscoveryUnknown && value != null && value !== "";
}

function repositoryFiltersFromQuery(query = {}) {
  const filters = {};
  ["country", "city", "propertyType", "currentStatus", "projectId", "buildingId"].forEach((key) => {
    if (specified(query[key])) filters[key] = query[key];
  });
  return filters;
}

function matchesTextFilter(summary = {}, query = {}) {
  if (specified(query.country) && summary.country !== query.country) return false;
  if (specified(query.city) && summary.city !== query.city) return false;
  if (specified(query.propertyType) && summary.propertyType !== query.propertyType) return false;
  if (specified(query.currentStatus) && summary.currentStatus !== query.currentStatus) return false;
  return true;
}

function priceFilterStatus(summary = {}, query = {}) {
  const hasPriceFilter = query.minPrice != null || query.maxPrice != null;
  if (!hasPriceFilter) return { include: true, comparable: true, warning: null };
  if (summary.observedPrice == null) {
    return {
      include: false,
      comparable: false,
      warning: `${summary.label || summary.propertyId} has missing observed price and was not treated as zero.`
    };
  }
  if (specified(query.currency) && summary.currency && summary.currency !== query.currency) {
    return {
      include: true,
      comparable: false,
      warning: `${summary.label || summary.propertyId} is ${summary.currency}; requested ${query.currency}. FX conversion is not active, so price is not directly comparable.`
    };
  }
  if (query.minPrice != null && summary.observedPrice < query.minPrice) return { include: false, comparable: true, warning: null };
  if (query.maxPrice != null && summary.observedPrice > query.maxPrice) return { include: false, comparable: true, warning: null };
  return { include: true, comparable: true, warning: null };
}

function resultState(summary = {}, priceStatus = {}) {
  const states = [];
  if (summary.observedPrice != null || summary.country !== "Missing" || summary.city !== "Missing") states.push("KNOWN");
  if (summary.freshness === "STALE") states.push("STALE");
  if (summary.observedPrice == null || summary.evidenceCompleteness === "INCOMPLETE_LOCAL_EVIDENCE") states.push("MISSING");
  if (String(summary.verificationStatus || "").includes("REVIEW")) states.push("NEEDS_PROFESSIONAL_REVIEW");
  if (priceStatus.comparable === false) states.push("PRICE_NOT_DIRECTLY_COMPARABLE");
  return [...new Set(states)];
}

function buildFreshnessSummary(results = []) {
  return {
    current: results.filter((result) => result.summary.freshness === "CURRENT").length,
    stale: results.filter((result) => result.summary.freshness === "STALE").length,
    missing: results.filter((result) => result.summary.freshness === "MISSING").length
  };
}

function buildMissingEvidenceSummary(results = []) {
  return {
    incomplete: results.filter((result) => result.summary.evidenceCompleteness === "INCOMPLETE_LOCAL_EVIDENCE").length,
    missingPrice: results.filter((result) => result.summary.observedPrice == null).length,
    needsProfessionalReview: results.filter((result) => result.states.includes("NEEDS_PROFESSIONAL_REVIEW")).length
  };
}

export function discoverProperties(input = "", options = {}) {
  const query = typeof input === "string" ? parsePropertyDiscoveryQuery(input) : { ...unspecifiedQuery(), ...input };
  const repositoryFilters = repositoryFiltersFromQuery(query);
  const readService = options.readService || propertyReadService;
  const source = options.demo === false
    ? readService.listProperties(repositoryFilters)
    : readService.listDemoProperties();
  const warnings = [
    "Discovery uses current local ESSA Property repository data only.",
    "Live Property Search, maps, portals, booking, payment, transaction and legal/ownership verification are not active."
  ];
  const limitations = [
    "Results are not all properties in the market.",
    "No ranking, recommendation, Property Score or investment advice is performed.",
    "Missing evidence is displayed, not silently repaired."
  ];
  if (query.listingType === "RENT") {
    warnings.push("Rent intent was understood, but current canonical local data does not activate rent search.");
  }

  const results = source.summaries
    .filter((summary) => matchesTextFilter(summary, query))
    .map((summary) => ({ summary, priceStatus: priceFilterStatus(summary, query) }))
    .filter(({ priceStatus }) => priceStatus.include)
    .map(({ summary, priceStatus }) => {
      if (priceStatus.warning) warnings.push(priceStatus.warning);
      return {
        modelType: "PropertyDiscoveryResultItem",
        propertyId: summary.propertyId,
        alias: summary.alias,
        summary,
        states: resultState(summary, priceStatus),
        priceComparable: priceStatus.comparable,
        availableReadOnlyActions: ["view_passport", "compare", "ask_lisa"],
        executionEnabled: false
      };
    });

  if ((query.minPrice != null || query.maxPrice != null) && !results.some((result) => result.summary.observedPrice == null)) {
    const excludedMissing = source.summaries
      .filter((summary) => matchesTextFilter(summary, query))
      .filter((summary) => summary.observedPrice == null).length;
    if (excludedMissing) warnings.push(`${excludedMissing} local result(s) had missing observed price and were excluded from price filtering.`);
  }

  const status = results.length ? propertyDiscoveryStatuses.found : propertyDiscoveryStatuses.noMatches;
  if (!results.length) {
    warnings.push("NO_MATCHES_IN_CURRENT_PROPERTY_DATA");
    limitations.push("Live Property Search is not active, so ESSA will not create fake properties.");
  }

  const result = {
    modelType: "PropertyDiscoveryResult",
    ok: true,
    status,
    query,
    repositoryFilters,
    matchedCount: results.length,
    results,
    warnings: [...new Set(warnings)],
    limitations,
    freshnessSummary: buildFreshnessSummary(results),
    missingEvidenceSummary: buildMissingEvidenceSummary(results),
    deterministicSort: "LOCAL_REPOSITORY_ORDER",
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
  return result;
}

export function buildBoundedPropertyDiscoveryContext(discovery = discoverProperties("")) {
  const memoryItems = [
    {
      id: "property_discovery_query",
      text: JSON.stringify(discovery.query),
      relevance: 1,
      source: "PropertyDiscoveryQuery"
    },
    {
      id: "property_discovery_results",
      text: JSON.stringify(discovery.results.map((result) => ({
        propertyId: result.propertyId,
        alias: result.alias,
        summary: result.summary,
        states: result.states
      }))),
      relevance: 1,
      source: "PropertyReadService"
    },
    {
      id: "property_discovery_limits",
      text: JSON.stringify({ warnings: discovery.warnings, limitations: discovery.limitations }),
      relevance: 0.95,
      source: "PropertyDiscoveryPolicy"
    }
  ];
  const boundedContext = buildContextPackage({
    intent: "property_discovery_readonly",
    maxItems: 4,
    maxChars: 1800,
    memoryItems
  });
  return {
    intent: "PROPERTY_DISCOVERY",
    status: discovery.status,
    discovery,
    boundedContext,
    boundedContextMetadata: {
      selectedCount: boundedContext.selected.length,
      omittedCount: boundedContext.omittedCount,
      usedChars: boundedContext.budget.usedChars,
      maxChars: boundedContext.budget.maxChars
    },
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function createLisaPropertyDiscoveryExplanation(discovery = discoverProperties("")) {
  const lisaGuide = createLisaProductGuideContext();
  const specifiedFilters = Object.entries(discovery.query)
    .filter(([key, value]) => !["modelType", "rawText", "providerCalls", "externalCalls", "dbMutations", "payments"].includes(key) && specified(value))
    .map(([key, value]) => `${key}=${value}`);
  const unspecifiedFilters = ["country", "city", "propertyType", "currentStatus", "minPrice", "maxPrice", "currency", "projectId", "buildingId", "bedrooms", "areaMin", "areaMax"]
    .filter((key) => !specified(discovery.query[key]));
  const staleCount = discovery.freshnessSummary.stale;
  const incompleteCount = discovery.missingEvidenceSummary.incomplete;
  const missingPriceCount = discovery.missingEvidenceSummary.missingPrice;
  const base = discovery.matchedCount
    ? `I found ${discovery.matchedCount} local ESSA Property record(s) matching the current query.`
    : "In the current local ESSA Property data, there are no matching objects.";
  const humanExplanation = [
    base,
    specifiedFilters.length ? `Understood filters: ${specifiedFilters.join(", ")}.` : "No concrete filters were invented.",
    unspecifiedFilters.length ? `Not specified: ${unspecifiedFilters.join(", ")}.` : "All supported query fields were specified.",
    `${staleCount} result(s) include stale evidence; ${incompleteCount} result(s) need more evidence; ${missingPriceCount} result(s) have missing observed price.`,
    discovery.status === propertyDiscoveryStatuses.noMatches
      ? "Live Property Search is not active, so I will not create fake properties."
      : "These are local repository results, not all real-world properties in the market."
  ].join(" ");

  return {
    roleId: lisaGuide.role.roleId,
    usesCharacterCore: true,
    mayMutateCharacterCore: false,
    query: discovery.query,
    matchedCount: discovery.matchedCount,
    humanExplanation,
    warnings: discovery.warnings,
    limitations: discovery.limitations,
    truthfulLimitations: [
      "Live property search is not active.",
      "Live listing portals/providers are not active.",
      "Maps and FX conversion are not active.",
      "Booking, payment and transaction are not active.",
      "Ownership/legal verification and KYC/KYB are not active."
    ],
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function buildPropertyDiscoveryGuideStep(stepIndex = 0, discovery = discoverProperties("")) {
  const safeIndex = Math.max(0, Math.min(propertyDiscoveryGuideSteps.length - 1, stepIndex));
  const step = propertyDiscoveryGuideSteps[safeIndex];
  const answers = {
    where: `Location understood: city=${discovery.query.city}, country=${discovery.query.country}. You can skip unknown fields.`,
    type: `Property type understood: ${discovery.query.propertyType}. ESSA did not invent room count, area or district.`,
    budget: `Budget understood: min=${discovery.query.minPrice ?? propertyDiscoveryUnknown}, max=${discovery.query.maxPrice ?? propertyDiscoveryUnknown}, currency=${discovery.query.currency}. Missing prices are not treated as zero and FX conversion is not active.`,
    intent: `Intent understood: listingType=${discovery.query.listingType}, currentStatus=${discovery.query.currentStatus}. Sale is only shown where local data supports it.`,
    matches: discovery.matchedCount
      ? `${discovery.matchedCount} local repository result(s) are available in deterministic repository order.`
      : "NO_MATCHES_IN_CURRENT_PROPERTY_DATA. Live Property Search is not active.",
    explain: createLisaPropertyDiscoveryExplanation(discovery).humanExplanation,
    actions: "You can open Passport, compare local results, or ask Lisa. Buy, book, pay, contact seller and transaction actions remain disabled."
  };
  return {
    ...step,
    index: safeIndex,
    total: propertyDiscoveryGuideSteps.length,
    answer: answers[step.id],
    canBack: safeIndex > 0,
    canNext: safeIndex < propertyDiscoveryGuideSteps.length - 1,
    executionEnabled: false
  };
}
