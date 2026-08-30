import {
  createBuilding,
  createDeveloper,
  createFloor,
  createLandParcel,
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

export const propertyFixtureTimestamp = "2026-08-20T00:00:00.000Z";

export const fixtureSourceRefs = {
  developerRegistry: createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "local_developer_registry_fixture",
    sourceId: "fixture_developer_batumi_green_builders",
    sourceUrl: null,
    observedAt: propertyFixtureTimestamp,
    fetchedAt: propertyFixtureTimestamp,
    effectiveAt: propertyFixtureTimestamp,
    confidence: propertyConfidenceClasses.high,
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.verified
  }),
  currentListing: createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "local_listing_fixture_a",
    sourceId: "fixture_listing_batumi_unit_current",
    sourceUrl: null,
    observedAt: propertyFixtureTimestamp,
    fetchedAt: propertyFixtureTimestamp,
    effectiveAt: propertyFixtureTimestamp,
    confidence: propertyConfidenceClasses.medium,
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.partiallyVerified
  }),
  duplicateListing: createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "local_listing_fixture_variant",
    sourceId: "fixture_listing_batumi_unit_duplicate_variant",
    sourceUrl: null,
    observedAt: propertyFixtureTimestamp,
    fetchedAt: propertyFixtureTimestamp,
    effectiveAt: propertyFixtureTimestamp,
    confidence: propertyConfidenceClasses.medium,
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.partiallyVerified
  }),
  staleListing: createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "local_listing_fixture_stale",
    sourceId: "fixture_listing_batumi_unit_stale",
    sourceUrl: null,
    observedAt: "2026-01-10T00:00:00.000Z",
    fetchedAt: "2026-01-10T00:00:00.000Z",
    effectiveAt: "2026-01-10T00:00:00.000Z",
    confidence: propertyConfidenceClasses.low,
    freshnessStatus: propertyFreshnessStatuses.stale,
    verificationStatus: propertyVerificationStatuses.staleReviewRequired
  }),
  incompleteEvidence: createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "local_incomplete_property_fixture",
    sourceId: "fixture_property_incomplete_evidence",
    sourceUrl: null,
    observedAt: propertyFixtureTimestamp,
    fetchedAt: propertyFixtureTimestamp,
    effectiveAt: propertyFixtureTimestamp,
    confidence: propertyConfidenceClasses.low,
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.insufficientEvidence
  })
};

export const fixtureDeveloper = createDeveloper({
  developerId: "developer_batumi_green_builders",
  displayName: "Batumi Green Builders",
  country: "Georgia",
  region: "Adjara",
  city: "Batumi",
  businessBridgeId: "batumi_builder",
  sourceRefs: [fixtureSourceRefs.developerRegistry],
  verificationStatus: propertyVerificationStatuses.partiallyVerified
});

export const fixtureProject = createProject({
  projectId: "project_batumi_sea_view",
  developerId: fixtureDeveloper.developerId,
  name: "Batumi Sea View Residence",
  country: "Georgia",
  region: "Adjara",
  city: "Batumi",
  address: "Local fixture address, Batumi",
  currentStatus: "UNDER_CONSTRUCTION",
  sourceRefs: [fixtureSourceRefs.developerRegistry]
});

export const fixtureBuilding = createBuilding({
  buildingId: "building_batumi_sea_view_a",
  projectId: fixtureProject.projectId,
  name: "Tower A",
  address: fixtureProject.address,
  floorCount: 18,
  currentStatus: "UNDER_CONSTRUCTION",
  sourceRefs: [fixtureSourceRefs.developerRegistry]
});

export const fixtureFloor = createFloor({
  floorId: "floor_batumi_sea_view_a_12",
  buildingId: fixtureBuilding.buildingId,
  floorNumber: 12,
  sourceRefs: [fixtureSourceRefs.currentListing]
});

export const fixtureUnit = createUnit({
  unitId: "unit_batumi_sea_view_a_1204",
  buildingId: fixtureBuilding.buildingId,
  floorId: fixtureFloor.floorId,
  unitNumber: "1204",
  propertyId: "prop_ge_batumi_sea_view_a_1204",
  bedrooms: 1,
  bathrooms: 1,
  areaSqm: 54.2,
  sourceRefs: [fixtureSourceRefs.currentListing]
});

export const fixtureLandParcel = createLandParcel({
  landParcelId: "parcel_batumi_sea_view",
  projectId: fixtureProject.projectId,
  cadastralId: null,
  country: "Georgia",
  region: "Adjara",
  city: "Batumi",
  areaSqm: null,
  sourceRefs: [fixtureSourceRefs.developerRegistry]
});

export const fixturePropertyId = createPropertyId({
  propertyId: fixtureUnit.propertyId,
  externalSourceRefs: [fixtureSourceRefs.currentListing, fixtureSourceRefs.duplicateListing],
  sourceEntityIds: ["fixture_listing_batumi_unit_current", "fixture_listing_batumi_unit_duplicate_variant"],
  canonicalIdentityReady: true,
  deterministicDuplicateMatchingReady: true
});

export const fixturePropertyFacts = [
  createPropertyFact({
    factType: "LOCATION",
    value: { country: "Georgia", region: "Adjara", city: "Batumi" },
    sourceRef: fixtureSourceRefs.currentListing,
    confidence: propertyConfidenceClasses.high,
    observedAt: propertyFixtureTimestamp,
    freshnessStatus: propertyFreshnessStatuses.current,
    factStatus: propertyFactStatuses.fact
  }),
  createPropertyFact({
    factType: "UNIT_AREA_SQM",
    value: 54.2,
    sourceRef: fixtureSourceRefs.currentListing,
    confidence: propertyConfidenceClasses.medium,
    observedAt: propertyFixtureTimestamp,
    freshnessStatus: propertyFreshnessStatuses.current,
    factStatus: propertyFactStatuses.fact
  }),
  createPropertyFact({
    factType: "SEA_VIEW",
    value: true,
    sourceRef: fixtureSourceRefs.duplicateListing,
    confidence: propertyConfidenceClasses.low,
    observedAt: propertyFixtureTimestamp,
    freshnessStatus: propertyFreshnessStatuses.current,
    factStatus: propertyFactStatuses.inferred
  }),
  createPropertyFact({
    factType: "OWNERSHIP_STATUS",
    value: "not_verified_in_phase_22a_fixture",
    sourceRef: fixtureSourceRefs.currentListing,
    confidence: propertyConfidenceClasses.unknown,
    observedAt: propertyFixtureTimestamp,
    freshnessStatus: propertyFreshnessStatuses.current,
    factStatus: propertyFactStatuses.unverified
  })
];

export const fixtureBatumiUnitProperty = createProperty({
  propertyId: fixtureUnit.propertyId,
  propertyType: "APARTMENT_UNIT",
  country: "Georgia",
  region: "Adjara",
  city: "Batumi",
  address: fixtureProject.address,
  geo: { lat: null, lng: null, precision: "not_in_fixture" },
  projectId: fixtureProject.projectId,
  buildingId: fixtureBuilding.buildingId,
  unitId: fixtureUnit.unitId,
  currentStatus: "LISTED_FOR_SALE",
  sourceRefs: [fixtureSourceRefs.currentListing, fixtureSourceRefs.duplicateListing],
  facts: fixturePropertyFacts,
  createdAt: propertyFixtureTimestamp,
  updatedAt: propertyFixtureTimestamp,
  freshness: propertyFreshnessStatuses.current,
  confidence: propertyConfidenceClasses.medium
});

export const fixtureIncompleteProperty = createProperty({
  propertyId: "prop_ge_batumi_incomplete_evidence",
  propertyType: "APARTMENT_UNIT",
  country: "Georgia",
  region: "Adjara",
  city: "Batumi",
  address: "",
  geo: null,
  projectId: null,
  buildingId: null,
  unitId: null,
  currentStatus: "UNKNOWN",
  sourceRefs: [fixtureSourceRefs.incompleteEvidence],
  facts: [
    createPropertyFact({
      factType: "CITY",
      value: "Batumi",
      sourceRef: fixtureSourceRefs.incompleteEvidence,
      confidence: propertyConfidenceClasses.low,
      observedAt: propertyFixtureTimestamp,
      freshnessStatus: propertyFreshnessStatuses.current,
      factStatus: propertyFactStatuses.unverified
    })
  ],
  createdAt: propertyFixtureTimestamp,
  updatedAt: propertyFixtureTimestamp,
  freshness: propertyFreshnessStatuses.current,
  confidence: propertyConfidenceClasses.low
});

export const fixtureListingSnapshots = [
  createPropertyListingSnapshot({
    listingId: "listing_batumi_unit_current",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    sourceRef: fixtureSourceRefs.currentListing,
    listingType: "SALE",
    price: 125000,
    currency: "USD",
    availability: "AVAILABLE",
    listingStatus: "ACTIVE",
    observedAt: propertyFixtureTimestamp,
    staleAfter: "2026-09-19T00:00:00.000Z",
    freshnessStatus: propertyFreshnessStatuses.current
  }),
  createPropertyListingSnapshot({
    listingId: "listing_batumi_unit_duplicate_variant",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    sourceRef: fixtureSourceRefs.duplicateListing,
    listingType: "SALE",
    price: 126500,
    currency: "USD",
    availability: "AVAILABLE",
    listingStatus: "ACTIVE",
    observedAt: propertyFixtureTimestamp,
    staleAfter: "2026-09-19T00:00:00.000Z",
    freshnessStatus: propertyFreshnessStatuses.current
  }),
  createPropertyListingSnapshot({
    listingId: "listing_batumi_unit_stale",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    sourceRef: fixtureSourceRefs.staleListing,
    listingType: "SALE",
    price: 119000,
    currency: "USD",
    availability: "UNKNOWN",
    listingStatus: "STALE_REVIEW_REQUIRED",
    observedAt: "2026-01-10T00:00:00.000Z",
    staleAfter: "2026-02-09T00:00:00.000Z",
    freshnessStatus: propertyFreshnessStatuses.stale
  })
];

export const fixtureLifecycleEvents = [
  createPropertyLifecycleEvent({
    eventId: "evt_property_created_batumi_unit",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    eventType: propertyLifecycleEventTypes.propertyCreated,
    sourceRef: fixtureSourceRefs.currentListing,
    payload: { propertyType: fixtureBatumiUnitProperty.propertyType },
    observedAt: propertyFixtureTimestamp,
    createdAt: propertyFixtureTimestamp
  }),
  createPropertyLifecycleEvent({
    eventId: "evt_listing_observed_current",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    eventType: propertyLifecycleEventTypes.listingObserved,
    sourceRef: fixtureSourceRefs.currentListing,
    payload: { listingId: "listing_batumi_unit_current" },
    observedAt: propertyFixtureTimestamp,
    createdAt: propertyFixtureTimestamp
  }),
  createPropertyLifecycleEvent({
    eventId: "evt_listed_for_sale_current",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    eventType: propertyLifecycleEventTypes.listedForSale,
    sourceRef: fixtureSourceRefs.currentListing,
    payload: { listingId: "listing_batumi_unit_current", price: 125000, currency: "USD" },
    observedAt: propertyFixtureTimestamp,
    createdAt: propertyFixtureTimestamp
  }),
  createPropertyLifecycleEvent({
    eventId: "evt_price_changed_duplicate_variant",
    propertyId: fixtureBatumiUnitProperty.propertyId,
    eventType: propertyLifecycleEventTypes.priceChanged,
    sourceRef: fixtureSourceRefs.duplicateListing,
    payload: { listingId: "listing_batumi_unit_duplicate_variant", price: 126500, currency: "USD" },
    observedAt: propertyFixtureTimestamp,
    createdAt: propertyFixtureTimestamp
  })
];

export const propertyFixtures = {
  propertyIds: [fixturePropertyId],
  developers: [fixtureDeveloper],
  projects: [fixtureProject],
  buildings: [fixtureBuilding],
  floors: [fixtureFloor],
  units: [fixtureUnit],
  landParcels: [fixtureLandParcel],
  properties: [fixtureBatumiUnitProperty, fixtureIncompleteProperty],
  sourceRefs: Object.values(fixtureSourceRefs),
  facts: fixturePropertyFacts,
  listingSnapshots: fixtureListingSnapshots,
  lifecycleEvents: fixtureLifecycleEvents,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0
};
