import {
  createPropertySourceRecord,
  propertySourceTypes
} from "./propertyIngestionContracts.js";
import {
  propertyConfidenceClasses
} from "./propertyContracts.js";

export const propertyIngestionFixtureTimestamp = "2026-08-20T00:00:00.000Z";

function localRecord(input = {}) {
  return createPropertySourceRecord({
    sourceType: propertySourceTypes.localFixture,
    sourceName: input.sourceName === undefined ? "local_property_ingestion_fixture" : input.sourceName,
    observedAt: input.observedAt || propertyIngestionFixtureTimestamp,
    fetchedAt: input.fetchedAt || input.observedAt || propertyIngestionFixtureTimestamp,
    sourceConfidence: input.sourceConfidence || propertyConfidenceClasses.medium,
    providerMetadata: { adapter: "LOCAL_FIXTURE_ONLY", ...(input.providerMetadata || {}) },
    ...input
  });
}

export const propertyIngestionSourceFixtures = {
  ownerSubmission: localRecord({
    sourceType: propertySourceTypes.ownerSubmission,
    sourceName: "local_owner_submission_fixture",
    sourceRecordId: "owner_sub_batumi_0707",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Owner fixture address, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE" },
    price: 99000,
    currency: "USD",
    rawPayload: { ownerText: "Apartment in Batumi, unit 707, local fixture only.", project: "Owner Local Residence", building: "Owner Tower", unit: "0707" }
  }),
  developerUnit: localRecord({
    sourceType: propertySourceTypes.developerFeed,
    sourceName: "local_developer_feed_fixture",
    sourceRecordId: "developer_unit_tower_b_0501",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE" },
    price: 125000,
    currency: "USD",
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501", areaSqm: 61.4, bedrooms: 2 }
  }),
  agencySameUnit: localRecord({
    sourceType: propertySourceTypes.agencyFeed,
    sourceName: "local_agency_listing_fixture",
    sourceRecordId: "agency_listing_tower_b_0501",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE" },
    price: 125000,
    currency: "USD",
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501", agencyListingId: "AG-B-0501" }
  }),
  duplicateSameUnit: localRecord({
    sourceType: propertySourceTypes.partnerFeed,
    sourceName: "local_duplicate_partner_fixture",
    sourceRecordId: "duplicate_partner_tower_b_0501",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE" },
    price: 125000,
    currency: "USD",
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501" }
  }),
  conflictingPrice: localRecord({
    sourceType: propertySourceTypes.agencyFeed,
    sourceName: "local_conflicting_price_fixture",
    sourceRecordId: "agency_listing_tower_b_0501_price_130000",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE" },
    price: 130000,
    currency: "USD",
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501", agencyListingId: "AG-B-0501-CONFLICT" }
  }),
  invalidNegativeArea: localRecord({
    sourceType: propertySourceTypes.ownerSubmission,
    sourceName: "",
    sourceRecordId: "invalid_negative_area",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "", address: "" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE" },
    price: -100,
    currency: "USD",
    rawPayload: { areaSqm: -42, unit: "bad" }
  }),
  acceptedWithGaps: localRecord({
    sourceType: propertySourceTypes.manualAdminEntry,
    sourceName: "local_manual_gap_fixture",
    sourceRecordId: "manual_gap_record_city_missing",
    declaredPropertyType: "UNKNOWN",
    location: { country: "Georgia", region: "Adjara", city: "", address: "Manual fixture address with missing city" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "UNKNOWN" },
    price: null,
    currency: null,
    rawPayload: { reviewNote: "Safe local record with missing city and price for accepted-with-gaps review." }
  }),
  reobservedPrice123: localRecord({
    sourceType: propertySourceTypes.agencyFeed,
    sourceName: "local_reobserved_agency_fixture",
    sourceRecordId: "agency_listing_tower_b_0501_reobs_123000",
    observedAt: "2026-08-21T00:00:00.000Z",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE", stableListingKey: "AG-B-0501" },
    price: 123000,
    currency: "USD",
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501" }
  }),
  reobservedPrice120: localRecord({
    sourceType: propertySourceTypes.agencyFeed,
    sourceName: "local_reobserved_agency_fixture",
    sourceRecordId: "agency_listing_tower_b_0501_reobs_120000",
    observedAt: "2026-08-22T00:00:00.000Z",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "ACTIVE", availability: "AVAILABLE", stableListingKey: "AG-B-0501" },
    price: 120000,
    currency: "USD",
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501" }
  }),
  sourceRemoved: localRecord({
    sourceType: propertySourceTypes.agencyFeed,
    sourceName: "local_reobserved_agency_fixture",
    sourceRecordId: "agency_listing_tower_b_0501_removed",
    observedAt: "2026-08-23T00:00:00.000Z",
    declaredPropertyType: "APARTMENT_UNIT",
    location: { country: "Georgia", region: "Adjara", city: "Batumi", address: "Developer Tower B, Batumi" },
    listing: { listingType: "SALE", listingStatus: "SOURCE_REMOVED", availability: "SOURCE_REMOVED", stableListingKey: "AG-B-0501" },
    price: null,
    currency: null,
    rawPayload: { project: "Batumi Ingested Residence", building: "Tower B", unit: "0501", sourceVisible: false }
  })
};

export const propertyIngestionFixtureBatch = [
  propertyIngestionSourceFixtures.ownerSubmission,
  propertyIngestionSourceFixtures.developerUnit,
  propertyIngestionSourceFixtures.agencySameUnit,
  propertyIngestionSourceFixtures.duplicateSameUnit,
  propertyIngestionSourceFixtures.conflictingPrice,
  propertyIngestionSourceFixtures.invalidNegativeArea,
  propertyIngestionSourceFixtures.acceptedWithGaps,
  propertyIngestionSourceFixtures.reobservedPrice123,
  propertyIngestionSourceFixtures.reobservedPrice120,
  propertyIngestionSourceFixtures.sourceRemoved
];
