import {
  createBuilding,
  createFloor,
  createProject,
  createProperty,
  createPropertyFact,
  createPropertyId,
  createPropertyLifecycleEvent,
  createPropertyListingSnapshot,
  createPropertySourceRef,
  createUnit,
  propertyConfidenceClasses,
  propertyFactStatuses,
  propertyFreshnessStatuses,
  propertyLifecycleEventTypes,
  propertyVerificationStatuses
} from "./propertyContracts.js";
import {
  clonePropertyIngestionValue,
  createNormalizedPropertyCandidate,
  createPropertyIngestionAudit,
  propertyIngestionListingStatuses,
  propertyIngestionMatchOutcomes,
  propertyIngestionValidationStatuses
} from "./propertyIngestionContracts.js";
import {
  propertyIngestionFixtureBatch,
  propertyIngestionFixtureTimestamp
} from "./propertyIngestionFixtures.js";

const knownPropertyTypes = new Set(["APARTMENT_UNIT", "HOUSE", "VILLA", "LAND", "UNKNOWN"]);
const knownCurrencies = new Set(["USD", "GEL", "EUR"]);

function safeText(value = "") {
  return String(value || "").trim();
}

function slug(value = "") {
  return safeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}

function numericOrNull(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function freshnessFor(record = {}) {
  if (!record.observedAt) return propertyFreshnessStatuses.unknown;
  if (record.listing?.listingStatus === propertyIngestionListingStatuses.sourceRemoved) return propertyFreshnessStatuses.current;
  return record.observedAt < "2026-04-01T00:00:00.000Z"
    ? propertyFreshnessStatuses.stale
    : propertyFreshnessStatuses.current;
}

export function validatePropertySourceRecord(record = {}) {
  const gaps = [];
  const warnings = [];
  const errors = [];
  if (!safeText(record.sourceName)) errors.push("source_identity_missing");
  if (!safeText(record.sourceRecordId)) errors.push("source_record_id_missing");
  if (!record.observedAt) errors.push("observed_at_missing");
  if (!record.location || typeof record.location !== "object") errors.push("location_malformed");
  if (record.location && !safeText(record.location.city)) gaps.push("city_missing");
  if (record.location && !safeText(record.location.country)) gaps.push("country_missing");
  if (!knownPropertyTypes.has(record.declaredPropertyType || "UNKNOWN")) warnings.push("property_type_unknown");
  const price = numericOrNull(record.price);
  if (record.price != null && price == null) errors.push("price_not_numeric");
  if (price != null && price < 0) errors.push("price_impossible_negative");
  if (record.currency && !knownCurrencies.has(record.currency)) errors.push("currency_unrecognized");
  const area = numericOrNull(record.rawPayload?.areaSqm);
  if (area != null && area < 0) errors.push("area_impossible_negative");

  const status = errors.length
    ? propertyIngestionValidationStatuses.quarantined
    : gaps.length || warnings.length
      ? propertyIngestionValidationStatuses.acceptedWithGaps
      : propertyIngestionValidationStatuses.accepted;
  return {
    status,
    errors,
    warnings,
    gaps,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function normalizePropertySourceRecord(record = {}) {
  const validation = validatePropertySourceRecord(record);
  if (validation.status === propertyIngestionValidationStatuses.quarantined || validation.status === propertyIngestionValidationStatuses.rejected) {
    return {
      ok: false,
      status: validation.status,
      validation,
      candidate: null,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }
  const projectName = safeText(record.rawPayload?.project);
  const buildingName = safeText(record.rawPayload?.building);
  const unitNumber = safeText(record.rawPayload?.unit);
  const price = numericOrNull(record.price);
  const sourceRef = createPropertySourceRef({
    sourceType: record.sourceType,
    sourceName: record.sourceName,
    sourceId: record.sourceRecordId,
    sourceUrl: record.sourceUrl || null,
    observedAt: record.observedAt,
    fetchedAt: record.fetchedAt || record.observedAt,
    effectiveAt: record.observedAt,
    confidence: record.sourceConfidence || propertyConfidenceClasses.unknown,
    freshnessStatus: freshnessFor(record),
    verificationStatus: propertyVerificationStatuses.partiallyVerified
  });
  const candidate = createNormalizedPropertyCandidate({
    candidateId: `candidate_${slug(record.sourceRecordId)}`,
    sourceRecordId: record.sourceRecordId,
    normalizedLocation: {
      country: safeText(record.location?.country) || "UNKNOWN",
      region: safeText(record.location?.region),
      city: safeText(record.location?.city) || "UNKNOWN",
      address: safeText(record.location?.address)
    },
    propertyType: knownPropertyTypes.has(record.declaredPropertyType) ? record.declaredPropertyType : "UNKNOWN",
    hierarchyHints: {
      projectName,
      buildingName,
      unitNumber,
      areaSqm: numericOrNull(record.rawPayload?.areaSqm),
      bedrooms: numericOrNull(record.rawPayload?.bedrooms)
    },
    listingObservation: {
      listingType: record.listing?.listingType || "SALE",
      listingStatus: record.listing?.listingStatus || "UNKNOWN",
      availability: record.listing?.availability || "UNKNOWN",
      stableListingKey: record.listing?.stableListingKey || record.rawPayload?.agencyListingId || record.sourceRecordId,
      price,
      currency: record.currency || null,
      observedAt: record.observedAt,
      staleAfter: "2026-09-19T00:00:00.000Z",
      freshnessStatus: freshnessFor(record)
    },
    normalizedFacts: [
      {
        factType: "LOCATION",
        value: {
          country: safeText(record.location?.country) || "UNKNOWN",
          region: safeText(record.location?.region),
          city: safeText(record.location?.city) || "UNKNOWN"
        },
        sourceRef
      },
      numericOrNull(record.rawPayload?.areaSqm) != null
        ? { factType: "UNIT_AREA_SQM", value: numericOrNull(record.rawPayload.areaSqm), sourceRef }
        : null,
      numericOrNull(record.rawPayload?.bedrooms) != null
        ? { factType: "BEDROOMS", value: numericOrNull(record.rawPayload.bedrooms), sourceRef }
        : null
    ].filter(Boolean),
    sourceRefs: [sourceRef],
    evidenceGaps: validation.gaps,
    normalizationWarnings: validation.warnings,
    duplicateMatchHints: [
      projectName && buildingName && unitNumber ? `hierarchy:${slug(projectName)}:${slug(buildingName)}:${slug(unitNumber)}` : null,
      record.rawPayload?.canonicalPropertyId ? `canonical:${record.rawPayload.canonicalPropertyId}` : null,
      record.rawPayload?.externalPropertyRef ? `external:${record.rawPayload.externalPropertyRef}` : null
    ].filter(Boolean),
    confidence: record.sourceConfidence || propertyConfidenceClasses.unknown,
    freshnessStatus: freshnessFor(record)
  });
  return {
    ok: true,
    status: validation.status,
    validation,
    candidate,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

function propertyIdFromCandidate(candidate = {}) {
  const canonical = candidate.duplicateMatchHints.find((hint) => hint.startsWith("canonical:"));
  if (canonical) return canonical.replace("canonical:", "");
  const { country, city } = candidate.normalizedLocation;
  const { projectName, buildingName, unitNumber } = candidate.hierarchyHints;
  if (projectName && buildingName && unitNumber) {
    return `prop_${slug(country)}_${slug(city)}_${slug(projectName)}_${slug(buildingName)}_${slug(unitNumber)}`;
  }
  return `prop_${slug(country)}_${slug(city)}_${slug(candidate.sourceRecordId)}`;
}

function hierarchyKey(candidate = {}) {
  const { projectName, buildingName, unitNumber } = candidate.hierarchyHints;
  if (!projectName || !buildingName || !unitNumber) return null;
  return `${slug(projectName)}:${slug(buildingName)}:${slug(unitNumber)}`;
}

export function resolveCanonicalPropertyCandidate(candidate = {}, store = createLocalPropertyIngestionStore()) {
  const candidatePropertyId = propertyIdFromCandidate(candidate);
  const key = hierarchyKey(candidate);
  const existingById = store.properties.find((property) => property.propertyId === candidatePropertyId);
  const existingByHierarchy = key ? store.identityMap.get(key) : null;
  if (existingById) {
    return { outcome: propertyIngestionMatchOutcomes.exactMatch, propertyId: existingById.propertyId, reason: "canonical_property_id" };
  }
  if (existingByHierarchy) {
    return { outcome: propertyIngestionMatchOutcomes.exactMatch, propertyId: existingByHierarchy, reason: "project_building_unit" };
  }
  if (!key && candidate.normalizedLocation.city !== "UNKNOWN" && candidate.normalizedLocation.address) {
    return { outcome: propertyIngestionMatchOutcomes.probableMatchReviewRequired, propertyId: candidatePropertyId, reason: "address_without_unit_review_required" };
  }
  return { outcome: propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate, propertyId: candidatePropertyId, reason: "new_deterministic_candidate" };
}

export function createLocalPropertyIngestionStore() {
  return {
    propertyIds: [],
    developers: [],
    projects: [],
    buildings: [],
    floors: [],
    units: [],
    landParcels: [],
    properties: [],
    sourceRefs: [],
    facts: [],
    listingSnapshots: [],
    lifecycleEvents: [],
    audits: [],
    quarantine: [],
    identityMap: new Map(),
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

function upsertHierarchy(candidate, store, sourceRef, propertyId) {
  const { projectName, buildingName, unitNumber, areaSqm, bedrooms } = candidate.hierarchyHints;
  if (!projectName || !buildingName || !unitNumber) return { projectId: null, buildingId: null, floorId: null, unitId: null };
  const projectId = `project_${slug(projectName)}`;
  const buildingId = `building_${slug(projectName)}_${slug(buildingName)}`;
  const floorId = `floor_${slug(projectName)}_${slug(buildingName)}_unknown`;
  const unitId = `unit_${slug(projectName)}_${slug(buildingName)}_${slug(unitNumber)}`;
  if (!store.projects.some((item) => item.projectId === projectId)) {
    store.projects.push(createProject({
      projectId,
      developerId: null,
      name: projectName,
      country: candidate.normalizedLocation.country,
      region: candidate.normalizedLocation.region,
      city: candidate.normalizedLocation.city,
      address: candidate.normalizedLocation.address,
      currentStatus: "LOCAL_INGESTED",
      sourceRefs: [sourceRef]
    }));
  }
  if (!store.buildings.some((item) => item.buildingId === buildingId)) {
    store.buildings.push(createBuilding({
      buildingId,
      projectId,
      name: buildingName,
      address: candidate.normalizedLocation.address,
      floorCount: null,
      currentStatus: "LOCAL_INGESTED",
      sourceRefs: [sourceRef]
    }));
  }
  if (!store.floors.some((item) => item.floorId === floorId)) {
    store.floors.push(createFloor({ floorId, buildingId, floorNumber: null, sourceRefs: [sourceRef] }));
  }
  if (!store.units.some((item) => item.unitId === unitId)) {
    store.units.push(createUnit({ unitId, buildingId, floorId, unitNumber, propertyId, areaSqm, bedrooms, sourceRefs: [sourceRef] }));
  }
  return { projectId, buildingId, floorId, unitId };
}

function appendUniqueSource(store, sourceRef) {
  if (!store.sourceRefs.some((source) => source.sourceId === sourceRef.sourceId)) store.sourceRefs.push(sourceRef);
}

function createListingSnapshot(candidate, propertyId, sourceRef) {
  const observation = candidate.listingObservation;
  return createPropertyListingSnapshot({
    listingId: `listing_${slug(observation.stableListingKey)}_${slug(candidate.sourceRecordId)}`,
    propertyId,
    sourceRef,
    listingType: observation.listingType,
    price: observation.price,
    currency: observation.currency,
    availability: observation.availability,
    listingStatus: observation.listingStatus,
    observedAt: observation.observedAt,
    staleAfter: observation.staleAfter,
    freshnessStatus: observation.freshnessStatus
  });
}

function appendCanonicalObjects(candidate, resolution, store) {
  const sourceRef = candidate.sourceRefs[0];
  appendUniqueSource(store, sourceRef);
  const hierarchy = upsertHierarchy(candidate, store, sourceRef, resolution.propertyId);
  let property = store.properties.find((item) => item.propertyId === resolution.propertyId);
  if (!property) {
    property = createProperty({
      propertyId: resolution.propertyId,
      propertyType: candidate.propertyType,
      country: candidate.normalizedLocation.country,
      region: candidate.normalizedLocation.region,
      city: candidate.normalizedLocation.city,
      address: candidate.normalizedLocation.address,
      geo: { lat: null, lng: null, precision: "not_in_ingestion_fixture" },
      projectId: hierarchy.projectId,
      buildingId: hierarchy.buildingId,
      unitId: hierarchy.unitId,
      currentStatus: candidate.listingObservation.listingType === "RENT" ? "LISTED_FOR_RENT" : "LISTED_FOR_SALE",
      sourceRefs: [sourceRef],
      facts: [],
      createdAt: candidate.listingObservation.observedAt,
      updatedAt: candidate.listingObservation.observedAt,
      freshness: candidate.freshnessStatus,
      confidence: candidate.confidence
    });
    store.properties.push(property);
    store.propertyIds.push(createPropertyId({
      propertyId: property.propertyId,
      externalSourceRefs: [sourceRef],
      sourceEntityIds: [candidate.sourceRecordId],
      canonicalIdentityReady: resolution.outcome === propertyIngestionMatchOutcomes.exactMatch || resolution.outcome === propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate,
      deterministicDuplicateMatchingReady: true
    }));
    const key = hierarchyKey(candidate);
    if (key) store.identityMap.set(key, property.propertyId);
    store.lifecycleEvents.push(createPropertyLifecycleEvent({
      eventId: `evt_ingested_property_created_${slug(property.propertyId)}`,
      propertyId: property.propertyId,
      eventType: propertyLifecycleEventTypes.propertyCreated,
      sourceRef,
      payload: { ingestion: true },
      observedAt: candidate.listingObservation.observedAt,
      createdAt: candidate.listingObservation.observedAt
    }));
  } else {
    property.sourceRefs = [...property.sourceRefs, sourceRef];
    property.updatedAt = candidate.listingObservation.observedAt;
  }
  const facts = candidate.normalizedFacts.map((fact) => createPropertyFact({
    factType: fact.factType,
    value: fact.value,
    sourceRef: fact.sourceRef,
    confidence: candidate.confidence,
    observedAt: candidate.listingObservation.observedAt,
    freshnessStatus: candidate.freshnessStatus,
    factStatus: propertyFactStatuses.unverified
  }));
  store.facts.push(...facts);
  property.facts = [...property.facts, ...facts];
  const listing = createListingSnapshot(candidate, property.propertyId, sourceRef);
  store.listingSnapshots.push(listing);
  store.lifecycleEvents.push(createPropertyLifecycleEvent({
    eventId: `evt_ingested_listing_${slug(listing.listingId)}`,
    propertyId: property.propertyId,
    eventType: listing.listingStatus === propertyIngestionListingStatuses.sourceRemoved
      ? propertyLifecycleEventTypes.statusChanged
      : propertyLifecycleEventTypes.listingObserved,
    sourceRef,
    payload: { listingId: listing.listingId, price: listing.price, currency: listing.currency, listingStatus: listing.listingStatus },
    observedAt: listing.observedAt,
    createdAt: listing.observedAt
  }));
  return { property, listing, facts };
}

function detectConflicts(candidate, store, propertyId) {
  const conflicts = [];
  const price = candidate.listingObservation.price;
  const currency = candidate.listingObservation.currency;
  if (price == null) return conflicts;
  const existing = store.listingSnapshots.filter((listing) => listing.propertyId === propertyId && listing.price != null);
  const conflicting = existing.filter((listing) => listing.currency === currency && listing.price !== price);
  if (conflicting.length) {
    conflicts.push(`conflicting_price_observation:${conflicting.map((listing) => listing.price).join(",")}->${price}_${currency}`);
  }
  return conflicts;
}

export function ingestPropertySourceRecord(record = {}, store = createLocalPropertyIngestionStore()) {
  const validation = validatePropertySourceRecord(record);
  const ingestionId = `ingest_${slug(record.sourceRecordId || Date.now())}`;
  if (validation.status === propertyIngestionValidationStatuses.quarantined || validation.status === propertyIngestionValidationStatuses.rejected) {
    const audit = createPropertyIngestionAudit({
      ingestionId,
      sourceRecordId: record.sourceRecordId || null,
      validationResult: validation,
      normalizationResult: null,
      duplicateResolution: null,
      canonicalPropertyId: null,
      listingSnapshotId: null,
      warnings: validation.warnings,
      gaps: validation.gaps,
      timestamp: record.observedAt || propertyIngestionFixtureTimestamp
    });
    store.quarantine.push({ record: clonePropertyIngestionValue(record), audit });
    store.audits.push(audit);
    return { ok: false, status: validation.status, audit, quarantine: true, store };
  }
  const normalized = normalizePropertySourceRecord(record);
  const resolution = resolveCanonicalPropertyCandidate(normalized.candidate, store);
  const conflicts = detectConflicts(normalized.candidate, store, resolution.propertyId);
  const finalResolution = conflicts.length
    ? { ...resolution, outcome: propertyIngestionMatchOutcomes.conflictReviewRequired, conflicts }
    : resolution;
  const canonical = appendCanonicalObjects(normalized.candidate, finalResolution, store);
  const audit = createPropertyIngestionAudit({
    ingestionId,
    sourceRecordId: record.sourceRecordId,
    validationResult: validation,
    normalizationResult: normalized.candidate,
    duplicateResolution: finalResolution,
    canonicalPropertyId: canonical.property.propertyId,
    listingSnapshotId: canonical.listing.listingId,
    warnings: [...validation.warnings, ...normalized.candidate.normalizationWarnings],
    conflicts,
    gaps: [...validation.gaps, ...normalized.candidate.evidenceGaps],
    timestamp: record.observedAt || propertyIngestionFixtureTimestamp
  });
  store.audits.push(audit);
  return {
    ok: true,
    status: validation.status,
    candidate: normalized.candidate,
    resolution: finalResolution,
    canonicalPropertyId: canonical.property.propertyId,
    listingSnapshotId: canonical.listing.listingId,
    conflicts,
    audit,
    store,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function runLocalPropertyIngestionFixtureBatch(records = propertyIngestionFixtureBatch) {
  const store = createLocalPropertyIngestionStore();
  const results = records.map((record) => ingestPropertySourceRecord(record, store));
  return {
    ok: true,
    status: "LOCAL_INGESTION_FIXTURE_BATCH_COMPLETE",
    results,
    store,
    fixtures: {
      propertyIds: clonePropertyIngestionValue(store.propertyIds),
      developers: clonePropertyIngestionValue(store.developers),
      projects: clonePropertyIngestionValue(store.projects),
      buildings: clonePropertyIngestionValue(store.buildings),
      floors: clonePropertyIngestionValue(store.floors),
      units: clonePropertyIngestionValue(store.units),
      landParcels: clonePropertyIngestionValue(store.landParcels),
      properties: clonePropertyIngestionValue(store.properties),
      sourceRefs: clonePropertyIngestionValue(store.sourceRefs),
      facts: clonePropertyIngestionValue(store.facts),
      listingSnapshots: clonePropertyIngestionValue(store.listingSnapshots),
      lifecycleEvents: clonePropertyIngestionValue(store.lifecycleEvents),
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    },
    audits: clonePropertyIngestionValue(store.audits),
    quarantine: clonePropertyIngestionValue(store.quarantine),
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}
