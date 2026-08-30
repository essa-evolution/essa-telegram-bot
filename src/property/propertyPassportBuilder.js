import {
  createPropertyAuditArtifact,
  createPropertyPassport,
  propertyConfidenceClasses,
  propertyFactStatuses,
  propertyFreshnessStatuses,
  propertyVerificationStatuses
} from "./propertyContracts.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueBy(items = [], keyFn = (item) => item) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isStale(value = {}) {
  return value.freshnessStatus === propertyFreshnessStatuses.stale ||
    value.freshness === propertyFreshnessStatuses.stale ||
    value.factStatus === propertyFactStatuses.stale;
}

function confidenceScore(value) {
  if (value === propertyConfidenceClasses.high) return 3;
  if (value === propertyConfidenceClasses.medium) return 2;
  if (value === propertyConfidenceClasses.low) return 1;
  return 0;
}

function confidenceFromSignals(items = []) {
  const scores = items.map((item) => confidenceScore(item.confidence)).filter((score) => score > 0);
  if (!scores.length) return propertyConfidenceClasses.unknown;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  if (average >= 2.5) return propertyConfidenceClasses.high;
  if (average >= 1.5) return propertyConfidenceClasses.medium;
  return propertyConfidenceClasses.low;
}

function buildSummary(property = {}, listings = []) {
  const active = listings.find((listing) => listing.freshnessStatus === propertyFreshnessStatuses.current) || null;
  const parts = [
    property.propertyType,
    property.city,
    property.region,
    property.country
  ].filter(Boolean);
  const price = active?.price && active?.currency ? `${active.price} ${active.currency}` : null;
  return [
    parts.join(", "),
    property.currentStatus ? `status: ${property.currentStatus}` : null,
    price ? `observed listing price: ${price}` : null
  ].filter(Boolean).join("; ");
}

function buildDocumentChecklist({ property = {}, facts = [] } = {}) {
  const hasLocation = Boolean(property.country && property.city);
  const hasArea = facts.some((fact) => fact.factType === "UNIT_AREA_SQM" && fact.factStatus === propertyFactStatuses.fact);
  const hasOwnership = facts.some((fact) => fact.factType === "OWNERSHIP_STATUS" && fact.factStatus === propertyFactStatuses.fact);
  return [
    { documentType: "location_evidence", status: hasLocation ? "PRESENT_IN_FIXTURE" : "MISSING" },
    { documentType: "area_evidence", status: hasArea ? "PRESENT_IN_FIXTURE" : "MISSING" },
    { documentType: "ownership_evidence", status: hasOwnership ? "MISSING_PROFESSIONAL_VERIFICATION_REQUIRED" : "MISSING" },
    { documentType: "legal_review", status: "NOT_ACTIVE_PHASE_22A" },
    { documentType: "kyc_kyb", status: "NOT_ACTIVE_PHASE_22A" }
  ];
}

function deriveGaps({ property = {}, facts = [], listings = [] } = {}) {
  const gaps = [];
  if (!property.address) gaps.push("address_missing");
  if (!property.geo || property.geo.precision === "not_in_fixture") gaps.push("geo_not_verified");
  if (!property.projectId) gaps.push("project_missing");
  if (!property.buildingId) gaps.push("building_missing");
  if (!property.unitId) gaps.push("unit_missing");
  if (!facts.some((fact) => fact.factType === "OWNERSHIP_STATUS" && fact.factStatus === propertyFactStatuses.fact)) {
    gaps.push("ownership_not_verified");
  }
  if (!listings.some((listing) => listing.freshnessStatus === propertyFreshnessStatuses.current)) {
    gaps.push("current_listing_missing");
  }
  return gaps;
}

function deriveWarnings({ facts = [], listings = [] } = {}) {
  const warnings = [];
  if (facts.some((fact) => fact.factStatus === propertyFactStatuses.inferred)) warnings.push("inferred_facts_present");
  if (facts.some((fact) => fact.factStatus === propertyFactStatuses.unverified)) warnings.push("unverified_facts_present");
  if (facts.some(isStale) || listings.some(isStale)) warnings.push("stale_data_present");
  if (listings.length > 1) warnings.push("multiple_listing_snapshots_do_not_change_property_identity");
  return warnings;
}

function deriveRiskFlags({ gaps = [], warnings = [] } = {}) {
  const riskFlags = [];
  if (gaps.includes("ownership_not_verified")) riskFlags.push("OWNERSHIP_NOT_VERIFIED");
  if (gaps.includes("geo_not_verified")) riskFlags.push("LOCATION_PRECISION_NOT_VERIFIED");
  if (warnings.includes("stale_data_present")) riskFlags.push("STALE_LISTING_DATA");
  if (warnings.includes("unverified_facts_present")) riskFlags.push("UNVERIFIED_FACTS_PRESENT");
  return riskFlags;
}

function verificationFrom({ gaps = [], warnings = [] } = {}) {
  if (warnings.includes("stale_data_present")) return propertyVerificationStatuses.staleReviewRequired;
  if (gaps.includes("ownership_not_verified")) return propertyVerificationStatuses.professionalReviewRequired;
  if (gaps.length) return propertyVerificationStatuses.insufficientEvidence;
  return propertyVerificationStatuses.partiallyVerified;
}

export function buildPropertyPassport({
  property = null,
  facts = property?.facts || [],
  sourceRefs = property?.sourceRefs || [],
  listingSnapshots = [],
  lifecycleEvents = [],
  generatedAt = new Date().toISOString()
} = {}) {
  if (!property?.propertyId) {
    const audit = createPropertyAuditArtifact({
      auditId: `property_passport_audit_missing_${Date.now()}`,
      propertyId: null,
      operation: "BUILD_PROPERTY_PASSPORT",
      warnings: ["property_missing"],
      gaps: ["propertyId_missing"],
      confidence: propertyConfidenceClasses.unknown,
      createdAt: generatedAt
    });
    return { passport: null, audit };
  }

  const scopedFacts = safeArray(facts).filter((fact) => fact.sourceRef || fact.factType);
  const scopedListings = safeArray(listingSnapshots).filter((listing) => listing.propertyId === property.propertyId);
  const scopedEvents = safeArray(lifecycleEvents).filter((event) => event.propertyId === property.propertyId);
  const lineage = uniqueBy([
    ...safeArray(sourceRefs),
    ...safeArray(property.sourceRefs),
    ...scopedFacts.map((fact) => fact.sourceRef).filter(Boolean),
    ...scopedListings.map((listing) => listing.sourceRef).filter(Boolean),
    ...scopedEvents.map((event) => event.sourceRef).filter(Boolean)
  ], (source) => source.sourceId || `${source.sourceName}:${source.observedAt}`);

  const verifiedFacts = scopedFacts.filter((fact) => fact.factStatus === propertyFactStatuses.fact && !isStale(fact));
  const inferredFacts = scopedFacts.filter((fact) => fact.factStatus === propertyFactStatuses.inferred);
  const unverifiedFacts = scopedFacts.filter((fact) =>
    [propertyFactStatuses.unverified, propertyFactStatuses.stale].includes(fact.factStatus) || isStale(fact)
  );
  const gaps = deriveGaps({ property, facts: scopedFacts, listings: scopedListings });
  const warnings = deriveWarnings({ facts: scopedFacts, listings: scopedListings });
  const riskFlags = deriveRiskFlags({ gaps, warnings });
  const confidence = confidenceFromSignals([...scopedFacts, ...lineage, property]);
  const freshness = scopedListings.some(isStale) || scopedFacts.some(isStale)
    ? propertyFreshnessStatuses.stale
    : property.freshness || propertyFreshnessStatuses.unknown;
  const verificationStatus = verificationFrom({ gaps, warnings });

  const passport = createPropertyPassport({
    propertyId: property.propertyId,
    currentSummary: buildSummary(property, scopedListings),
    verifiedFacts,
    unverifiedFacts,
    inferredFacts,
    sourceRefs: lineage,
    freshness,
    confidence,
    riskFlags,
    documentChecklist: buildDocumentChecklist({ property, facts: scopedFacts }),
    verificationStatus,
    publicView: {
      propertyId: property.propertyId,
      propertyType: property.propertyType,
      country: property.country,
      region: property.region,
      city: property.city,
      currentStatus: property.currentStatus,
      listingCount: scopedListings.length,
      currentListingCount: scopedListings.filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.current).length,
      staleListingCount: scopedListings.filter(isStale).length,
      unavailableCurrentFeatures: [
        "live_property_search",
        "booking",
        "transaction",
        "payment",
        "ownership_verification",
        "legal_verification",
        "kyc_kyb",
        "live_provider_integrations",
        "property_stay"
      ]
    },
    protectedViewMetadata: {
      sourceRefCount: lineage.length,
      factCount: scopedFacts.length,
      lifecycleEventCount: scopedEvents.length,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    },
    generatedAt
  });

  const audit = createPropertyAuditArtifact({
    auditId: `property_passport_audit_${property.propertyId}`,
    propertyId: property.propertyId,
    operation: "BUILD_PROPERTY_PASSPORT",
    inputs: {
      factCount: scopedFacts.length,
      listingSnapshotCount: scopedListings.length,
      lifecycleEventCount: scopedEvents.length
    },
    outputs: {
      passportGenerated: true,
      verificationStatus,
      freshness
    },
    sourceRefs: lineage,
    warnings,
    gaps,
    confidence,
    createdAt: generatedAt
  });

  return { passport, audit };
}

export function normalizeListingSnapshotsToPropertyIds(listingSnapshots = []) {
  return safeArray(listingSnapshots).reduce((result, listing) => {
    if (!listing.propertyId) return result;
    if (!result.propertyIds.includes(listing.propertyId)) result.propertyIds.push(listing.propertyId);
    result.byPropertyId[listing.propertyId] = [
      ...(result.byPropertyId[listing.propertyId] || []),
      listing
    ];
    return result;
  }, {
    propertyIds: [],
    byPropertyId: {},
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  });
}
