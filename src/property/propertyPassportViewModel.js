import {
  fixtureBatumiUnitProperty,
  fixtureLifecycleEvents,
  fixtureListingSnapshots,
  fixturePropertyFacts,
  fixtureProject,
  fixtureBuilding,
  fixtureUnit
} from "./propertyFixtures.js";
import { buildPropertyPassport } from "./propertyPassportBuilder.js";
import {
  propertyFactStatuses,
  propertyFreshnessStatuses
} from "./propertyContracts.js";

export const propertyBadgeLabels = {
  VERIFIED: { label: "Verified", tone: "success", description: "Confirmed by the available local fixture evidence." },
  UNVERIFIED: { label: "Unverified", tone: "warning", description: "Not confirmed by ESSA in this phase." },
  INFERRED: { label: "Inferred", tone: "info", description: "A cautious interpretation, not a verified fact." },
  STALE: { label: "Stale", tone: "danger", description: "The source may be outdated and needs review." },
  CURRENT: { label: "Current", tone: "success", description: "The fixture source is current for this local preview." },
  MISSING: { label: "Missing", tone: "muted", description: "This information is not available in the local fixture." }
};

export const propertyRiskExplanations = {
  OWNERSHIP_NOT_VERIFIED: "Право собственности пока не подтверждено ESSA.",
  STALE_LISTING_DATA: "Данные объявления могут быть устаревшими.",
  LOCATION_PRECISION_NOT_VERIFIED: "Точная локация объекта пока не подтверждена.",
  UNVERIFIED_FACTS_PRESENT: "В паспорте есть данные, которые ESSA пока не проверила."
};

export const unavailablePropertyFeatureExplanations = {
  live_property_search: "Live property search is not active.",
  live_listing_imports: "Live listing imports are not active.",
  booking: "Booking is not active.",
  transaction: "Transaction execution is not active.",
  payment: "Payments are not active.",
  ownership_verification: "Ownership verification is not active.",
  legal_verification: "Legal verification is not active.",
  kyc_kyb: "KYC/KYB is not active.",
  signatures: "Signatures are not active.",
  live_provider_integrations: "Live provider integrations are not active.",
  property_stay: "Property Stay is not active."
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sourceLabel(sourceRef = null) {
  if (!sourceRef) return "No source";
  return [sourceRef.sourceName, sourceRef.sourceId].filter(Boolean).join(" / ") || "Local source";
}

function badgeForFact(fact = {}) {
  if (fact.freshnessStatus === propertyFreshnessStatuses.stale || fact.factStatus === propertyFactStatuses.stale) {
    return propertyBadgeLabels.STALE;
  }
  if (fact.factStatus === propertyFactStatuses.fact) return propertyBadgeLabels.VERIFIED;
  if (fact.factStatus === propertyFactStatuses.inferred) return propertyBadgeLabels.INFERRED;
  if (fact.factStatus === propertyFactStatuses.unverified) return propertyBadgeLabels.UNVERIFIED;
  return propertyBadgeLabels.MISSING;
}

function badgeForFreshness(status = null) {
  if (status === propertyFreshnessStatuses.current) return propertyBadgeLabels.CURRENT;
  if (status === propertyFreshnessStatuses.stale) return propertyBadgeLabels.STALE;
  return propertyBadgeLabels.MISSING;
}

function formatValue(value) {
  if (value == null || value === "") return "Missing";
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${entryValue == null ? "Missing" : entryValue}`)
      .join(", ");
  }
  return String(value);
}

function factRow(fact = {}) {
  return {
    label: fact.factType || "UNKNOWN_FACT",
    value: formatValue(fact.value),
    badge: badgeForFact(fact),
    source: sourceLabel(fact.sourceRef),
    observedAt: fact.observedAt || null,
    freshnessStatus: fact.freshnessStatus || "UNKNOWN",
    confidence: fact.confidence || "UNKNOWN",
    verificationStatus: fact.sourceRef?.verificationStatus || "UNVERIFIED"
  };
}

function buildMarketSection(listingSnapshots = []) {
  const current = safeArray(listingSnapshots)
    .filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.current)
    .sort((a, b) => String(b.observedAt || "").localeCompare(String(a.observedAt || "")))[0] || null;
  return {
    title: "Market / Listing",
    observedPrice: current?.price ?? null,
    currency: current?.currency || null,
    listingStatus: current?.listingStatus || "MISSING",
    availability: current?.availability || "MISSING",
    listingId: current?.listingId || null,
    badge: current ? badgeForFreshness(current.freshnessStatus) : propertyBadgeLabels.MISSING,
    source: current ? sourceLabel(current.sourceRef) : "No current listing source",
    observedAt: current?.observedAt || null,
    staleAfter: current?.staleAfter || null,
    staleListingCount: safeArray(listingSnapshots).filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.stale).length,
    duplicateSnapshotCount: Math.max(0, safeArray(listingSnapshots).length - 1)
  };
}

function buildSourcesSection(sourceRefs = []) {
  return {
    title: "Sources",
    rows: safeArray(sourceRefs).map((source) => ({
      source: sourceLabel(source),
      sourceType: source.sourceType || "UNKNOWN",
      observedAt: source.observedAt || null,
      fetchedAt: source.fetchedAt || null,
      effectiveAt: source.effectiveAt || null,
      freshnessStatus: source.freshnessStatus || "UNKNOWN",
      freshnessBadge: badgeForFreshness(source.freshnessStatus),
      confidence: source.confidence || "UNKNOWN",
      verificationStatus: source.verificationStatus || "UNVERIFIED"
    }))
  };
}

function buildRiskRows(riskFlags = []) {
  return safeArray(riskFlags).map((flag) => ({
    flag,
    explanation: propertyRiskExplanations[flag] || "This risk requires human review before any real-world action.",
    legalConclusion: false
  }));
}

function buildLisaSection({ passport = {}, audit = {} } = {}) {
  const verified = passport.verifiedFacts?.map((fact) => fact.factType).join(", ") || "none";
  const inferred = passport.inferredFacts?.map((fact) => fact.factType).join(", ") || "none";
  const unverified = passport.unverifiedFacts?.map((fact) => fact.factType).join(", ") || "none";
  return {
    title: "Lisa Explanation",
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    mayMutateCharacterCore: false,
    text: [
      `По этому объекту подтверждены: ${verified}.`,
      `Неподтвержденные данные: ${unverified}.`,
      `Inference: ${inferred}.`,
      `Freshness: ${passport.freshness || "UNKNOWN"}.`,
      audit.warnings?.includes("stale_data_present") ? "Часть listing data может быть устаревшей." : null,
      audit.gaps?.includes("ownership_not_verified") ? "Право собственности ESSA пока не проверяла." : null,
      "Live search, booking, transaction, payment, ownership/legal verification, KYC/KYB and Property Stay are not active."
    ].filter(Boolean).join(" ")
  };
}

export function buildPropertyPassportViewModel({
  property = fixtureBatumiUnitProperty,
  facts = fixturePropertyFacts,
  listingSnapshots = fixtureListingSnapshots,
  lifecycleEvents = fixtureLifecycleEvents,
  project = fixtureProject,
  building = fixtureBuilding,
  unit = fixtureUnit,
  generatedAt = "2026-08-20T00:00:00.000Z"
} = {}) {
  const { passport, audit } = buildPropertyPassport({
    property,
    facts,
    sourceRefs: property?.sourceRefs || [],
    listingSnapshots,
    lifecycleEvents,
    generatedAt
  });

  const unavailableFeatures = [
    "live_property_search",
    "live_listing_imports",
    ...(passport.publicView?.unavailableCurrentFeatures || []),
    "signatures"
  ];

  return {
    viewModelType: "PropertyPassportViewModel",
    propertyId: property.propertyId,
    generatedAt,
    identitySection: {
      title: "Property",
      propertyId: property.propertyId,
      propertyType: property.propertyType,
      currentStatus: property.currentStatus,
      confidence: passport.confidence,
      verificationStatus: passport.verificationStatus
    },
    locationSection: {
      title: "Location",
      country: property.country || "Missing",
      region: property.region || "Missing",
      city: property.city || "Missing",
      address: property.address || "Missing",
      geo: property.geo?.precision === "not_in_fixture" ? "Not verified in fixture" : property.geo || "Missing"
    },
    hierarchySection: {
      title: "Project / Building / Unit",
      project: project?.name || property.projectId || "Missing",
      projectId: property.projectId || "Missing",
      building: building?.name || property.buildingId || "Missing",
      buildingId: property.buildingId || "Missing",
      unit: unit?.unitNumber || property.unitId || "Missing",
      unitId: property.unitId || "Missing"
    },
    marketSection: buildMarketSection(listingSnapshots),
    verificationSection: {
      title: "Verification",
      verifiedFacts: passport.verifiedFacts.map(factRow),
      inferredFacts: passport.inferredFacts.map(factRow),
      unverifiedFacts: passport.unverifiedFacts.map(factRow),
      verificationStatus: passport.verificationStatus,
      confidence: passport.confidence
    },
    sourcesSection: buildSourcesSection(passport.sourceRefs),
    risksSection: {
      title: "Risks",
      rows: buildRiskRows(passport.riskFlags)
    },
    documentsSection: {
      title: "Documents",
      rows: passport.documentChecklist.map((item) => ({
        documentType: item.documentType,
        status: item.status,
        badge: item.status?.includes("PRESENT") ? propertyBadgeLabels.VERIFIED : propertyBadgeLabels.MISSING
      }))
    },
    freshnessSection: {
      title: "Freshness",
      freshness: passport.freshness,
      badge: badgeForFreshness(passport.freshness),
      staleReason: audit.warnings.includes("stale_data_present")
        ? "At least one listing/source in the local fixture is stale."
        : null
    },
    lisaExplanationSection: buildLisaSection({ passport, audit }),
    limitationsSection: {
      title: "Current Limitations",
      unavailableFeatures: [...new Set(unavailableFeatures)].map((feature) => ({
        feature,
        status: "NOT_ACTIVE",
        explanation: unavailablePropertyFeatureExplanations[feature] || "Not active in Phase 22B."
      }))
    },
    sourcePassport: passport,
    audit,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

export function renderPropertyPassportSurface(viewModel = buildPropertyPassportViewModel()) {
  const market = viewModel.marketSection;
  return [
    `${viewModel.identitySection.propertyType} ${viewModel.propertyId}`,
    `${viewModel.locationSection.city}, ${viewModel.locationSection.country}`,
    `Status: ${viewModel.identitySection.currentStatus}`,
    `Observed price: ${market.observedPrice ?? "Missing"} ${market.currency || ""}`.trim(),
    `Freshness: ${viewModel.freshnessSection.freshness}`,
    `Verification: ${viewModel.identitySection.verificationStatus}`,
    `Risks: ${viewModel.risksSection.rows.map((row) => row.explanation).join(" ")}`,
    `Lisa: ${viewModel.lisaExplanationSection.text}`
  ].join("\n");
}
