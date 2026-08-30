import assert from "node:assert/strict";
import {
  buildBoundedPropertyDiscoveryQueryContext,
  createLocalPropertyRepository,
  createPropertyReadService,
  discoverProperties,
  ingestPropertySourceRecord,
  normalizePropertySourceRecord,
  propertyIngestionFixtureBatch,
  propertyIngestionMatchOutcomes,
  propertyIngestionSourceFixtures,
  propertyIngestionValidationStatuses,
  propertySourceRecordContract,
  propertySourceTypes,
  runLocalPropertyIngestionFixtureBatch,
  validatePropertySourceRecord
} from "../src/property/index.js";
import {
  buildPropertyComparisonViewModel
} from "../workspace/modules/propertyPassportUi.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) console.log(JSON.stringify(details, null, 2));
}

check(
  propertySourceRecordContract.modelType === "PropertySourceRecord" &&
    propertySourceRecordContract.readOnlyImport === true &&
    propertySourceTypes.ownerSubmission === "OWNER_SUBMISSION",
  "A source record contract is explicit and provider-independent",
  propertySourceRecordContract
);

const ownerValidation = validatePropertySourceRecord(propertyIngestionSourceFixtures.ownerSubmission);
const invalidValidation = validatePropertySourceRecord(propertyIngestionSourceFixtures.invalidNegativeArea);
check(
  ownerValidation.status === propertyIngestionValidationStatuses.accepted &&
    invalidValidation.status === propertyIngestionValidationStatuses.quarantined &&
    invalidValidation.errors.includes("source_identity_missing") &&
    invalidValidation.errors.includes("price_impossible_negative"),
  "B validation accepts good local records and quarantines impossible values",
  { ownerValidation, invalidValidation }
);

const normalized = normalizePropertySourceRecord(propertyIngestionSourceFixtures.developerUnit);
check(
  normalized.ok &&
    normalized.candidate.modelType === "NormalizedPropertyCandidate" &&
    normalized.candidate.normalizedLocation.city === "Batumi" &&
    normalized.candidate.hierarchyHints.unitNumber === "0501" &&
    normalized.candidate.listingObservation.price === 125000,
  "C normalization creates candidate without turning raw payload into canonical Property",
  normalized.candidate
);

const batch = runLocalPropertyIngestionFixtureBatch(propertyIngestionFixtureBatch);
const ownerResult = batch.results.find((result) => result.audit.sourceRecordId === "owner_sub_batumi_0707");
const developerResult = batch.results.find((result) => result.audit.sourceRecordId === "developer_unit_tower_b_0501");
const agencyResult = batch.results.find((result) => result.audit.sourceRecordId === "agency_listing_tower_b_0501");
const duplicateResult = batch.results.find((result) => result.audit.sourceRecordId === "duplicate_partner_tower_b_0501");
const conflictResult = batch.results.find((result) => result.audit.sourceRecordId === "agency_listing_tower_b_0501_price_130000");
const invalidResult = batch.results.find((result) => result.audit.sourceRecordId === "invalid_negative_area");

check(
  ownerResult.ok &&
    ownerResult.resolution.outcome === propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate &&
    batch.store.properties.some((property) => property.propertyId === ownerResult.canonicalPropertyId),
  "D owner submission creates a new canonical Property in local ingestion store",
  ownerResult
);

check(
  developerResult.ok &&
    developerResult.canonicalPropertyId &&
    batch.store.projects.length >= 1 &&
    batch.store.units.some((unit) => unit.propertyId === developerResult.canonicalPropertyId),
  "E developer feed creates canonical project/building/unit context",
  { developerResult, projects: batch.store.projects, units: batch.store.units }
);

check(
  agencyResult.ok &&
    agencyResult.canonicalPropertyId === developerResult.canonicalPropertyId &&
    agencyResult.resolution.outcome === propertyIngestionMatchOutcomes.exactMatch,
  "F agency listing of same unit resolves to same Property ID",
  agencyResult
);

const uniquePropertyIds = new Set(batch.store.properties.map((property) => property.propertyId));
check(
  duplicateResult.ok &&
    duplicateResult.canonicalPropertyId === developerResult.canonicalPropertyId &&
    uniquePropertyIds.size === batch.store.properties.length,
  "G duplicate source does not create duplicate Property",
  { duplicateResult, propertyIds: [...uniquePropertyIds] }
);

const targetListings = batch.store.listingSnapshots.filter((listing) => listing.propertyId === developerResult.canonicalPropertyId);
check(
  conflictResult.ok &&
    conflictResult.resolution.outcome === propertyIngestionMatchOutcomes.conflictReviewRequired &&
    targetListings.some((listing) => listing.price === 125000) &&
    targetListings.some((listing) => listing.price === 130000),
  "H conflicting price creates multiple observations without silent overwrite",
  { conflictResult, targetListings }
);

check(
  invalidResult.status === propertyIngestionValidationStatuses.quarantined &&
    batch.quarantine.length === 1 &&
    !batch.store.properties.some((property) => property.propertyId.includes("invalid")),
  "I invalid source record is quarantined and excluded from canonical read fixtures",
  { invalidResult, quarantine: batch.quarantine }
);

check(
  targetListings.some((listing) => listing.price === 123000) &&
    targetListings.some((listing) => listing.price === 120000) &&
    targetListings.some((listing) => listing.listingStatus === "SOURCE_REMOVED") &&
    batch.store.properties.some((property) => property.propertyId === developerResult.canonicalPropertyId),
  "J reobserved listing preserves price history and source removal while Property remains",
  targetListings
);

check(
  batch.store.facts.every((fact) => fact.sourceRef?.sourceId && fact.observedAt) &&
    batch.store.audits.every((audit) => audit.modelType === "PropertyIngestionAudit" && audit.validationResult),
  "K fact/source lineage and ingestion audit are present for accepted records",
  { facts: batch.store.facts.slice(0, 4), audits: batch.store.audits.slice(0, 3) }
);

const repository = createLocalPropertyRepository(batch.fixtures);
const readService = createPropertyReadService(repository);
const readEvidence = readService.getPropertyEvidence(developerResult.canonicalPropertyId);
const passport = readService.getPropertyPassport(developerResult.canonicalPropertyId);
check(
  readEvidence.ok &&
    readEvidence.listingSnapshots.length >= 5 &&
    passport.ok &&
    passport.passport.sourceRefs.length >= 3,
  "L local ingestion fixtures integrate with Repository and Passport read path",
  { listings: readEvidence.listingSnapshots, sourceCount: passport.passport.sourceRefs.length }
);

const discovery = discoverProperties("Квартира в Батуми", { demo: false, readService });
check(
  discovery.results.some((result) => result.propertyId === developerResult.canonicalPropertyId) &&
    discovery.results.some((result) => result.propertyId === ownerResult.canonicalPropertyId),
  "M Phase 22G Discovery reads ingested local Properties through read service",
  discovery.results.map((result) => result.summary)
);

const comparison = buildPropertyComparisonViewModel({ itemIds: ["normal", "stale"] });
check(
  comparison.compared.length === 2 &&
    comparison.providerCalls === 0,
  "N existing Comparison remains available without separate ingestion comparison logic",
  comparison.selectedPropertyIds
);

const navigator = buildBoundedPropertyDiscoveryQueryContext({ query: "Покажи квартиры в Батуми" });
check(
  navigator.intent === "PROPERTY_DISCOVERY" &&
    navigator.blockedLiveActions.includes("live_search") &&
    !JSON.stringify(navigator).includes("rawPayload"),
  "O Navigator/Lisa bounded context does not expose raw source payload",
  navigator.boundedContextMetadata
);

check(
  [batch, repository.listProperties(), readEvidence, passport, discovery, comparison, navigator].every((item) =>
    item.providerCalls === 0 &&
      item.externalCalls === 0 &&
      item.dbMutations === 0 &&
      item.payments === 0
  ),
  "P provider/external/db/payment counts remain zero"
);

check(
  batch.bookingActions === 0 &&
    batch.transactionActions === 0 &&
    discovery.bookingActions === 0 &&
    discovery.transactionActions === 0,
  "Q booking/payment/transaction actions remain zero"
);

assert.equal(failures, 0);
console.log("Property ingestion pipeline tests passed.");
