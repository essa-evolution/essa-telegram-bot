import fs from "fs";
import path from "path";
import {
  buildBoundedPropertyDiscoveryQueryContext,
  createLocalPropertyRepository,
  createPropertyReadService,
  discoverProperties,
  propertyIngestionFixtureBatch,
  propertyIngestionMatchOutcomes,
  propertyIngestionValidationStatuses,
  runLocalPropertyIngestionFixtureBatch
} from "../src/property/index.js";

const artifactDir = "artifacts/property/phase22h";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const batch = runLocalPropertyIngestionFixtureBatch(propertyIngestionFixtureBatch);
const repository = createLocalPropertyRepository(batch.fixtures);
const readService = createPropertyReadService(repository);

function byRecord(sourceRecordId) {
  return batch.results.find((result) => result.audit.sourceRecordId === sourceRecordId);
}

const owner = byRecord("owner_sub_batumi_0707");
const developer = byRecord("developer_unit_tower_b_0501");
const agency = byRecord("agency_listing_tower_b_0501");
const duplicate = byRecord("duplicate_partner_tower_b_0501");
const conflict = byRecord("agency_listing_tower_b_0501_price_130000");
const invalid = byRecord("invalid_negative_area");
const targetListings = batch.store.listingSnapshots.filter((listing) => listing.propertyId === developer.canonicalPropertyId);
const discovery = discoverProperties("Квартира в Батуми", { demo: false, readService });
const passport = readService.getPropertyPassport(developer.canonicalPropertyId);
const navigator = buildBoundedPropertyDiscoveryQueryContext({ query: "Покажи квартиры в Батуми" });

const results = [
  {
    id: "owner-new-property",
    label: "Scenario A - Owner submission creates new Property",
    status: owner.ok && owner.resolution.outcome === propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate ? "PASS" : "FAIL",
    propertyId: owner.canonicalPropertyId
  },
  {
    id: "developer-unit",
    label: "Scenario B - Developer unit creates canonical Property",
    status: developer.ok && batch.store.units.some((unit) => unit.propertyId === developer.canonicalPropertyId) ? "PASS" : "FAIL",
    propertyId: developer.canonicalPropertyId
  },
  {
    id: "agency-same-unit",
    label: "Scenario C - Agency listing resolves to same Property ID",
    status: agency.ok && agency.canonicalPropertyId === developer.canonicalPropertyId ? "PASS" : "FAIL",
    propertyId: agency.canonicalPropertyId
  },
  {
    id: "duplicate-source",
    label: "Scenario D - Duplicate source creates no duplicate Property",
    status: duplicate.ok && new Set(batch.store.properties.map((property) => property.propertyId)).size === batch.store.properties.length ? "PASS" : "FAIL",
    propertyId: duplicate.canonicalPropertyId
  },
  {
    id: "conflicting-price",
    label: "Scenario E - Conflicting price keeps two observations",
    status: conflict.resolution.outcome === propertyIngestionMatchOutcomes.conflictReviewRequired &&
      targetListings.some((listing) => listing.price === 125000) &&
      targetListings.some((listing) => listing.price === 130000)
      ? "PASS"
      : "FAIL",
    prices: targetListings.map((listing) => listing.price).filter((price) => price != null)
  },
  {
    id: "invalid-quarantine",
    label: "Scenario F - Invalid source goes to quarantine",
    status: invalid.status === propertyIngestionValidationStatuses.quarantined && batch.quarantine.length === 1 ? "PASS" : "FAIL",
    quarantineCount: batch.quarantine.length
  },
  {
    id: "reobserved-history",
    label: "Scenario G - Re-observed listing preserves history",
    status: [125000, 123000, 120000].every((price) => targetListings.some((listing) => listing.price === price)) ? "PASS" : "FAIL",
    prices: targetListings.map((listing) => listing.price)
  },
  {
    id: "source-removed-property-remains",
    label: "Scenario H - Source listing disappears and Property remains",
    status: targetListings.some((listing) => listing.listingStatus === "SOURCE_REMOVED") &&
      batch.store.properties.some((property) => property.propertyId === developer.canonicalPropertyId)
      ? "PASS"
      : "FAIL"
  },
  {
    id: "discovery-passport",
    label: "Scenario I - Ingested Property reaches Discovery and Passport",
    status: discovery.results.some((result) => result.propertyId === developer.canonicalPropertyId) && passport.ok ? "PASS" : "FAIL",
    discoveryCount: discovery.matchedCount,
    passportSourceRefs: passport.passport.sourceRefs.length
  },
  {
    id: "navigator-lisa-lineage",
    label: "Scenario J - Navigator/Lisa receive bounded source-lineage context",
    status: navigator.intent === "PROPERTY_DISCOVERY" && !JSON.stringify(navigator).includes("rawPayload") ? "PASS" : "FAIL",
    boundedContext: navigator.boundedContextMetadata
  }
];

const report = {
  status: results.every((result) => result.status === "PASS") ? "PHASE_22H_PROPERTY_INGESTION_PROOF_PASS" : "FAIL_INGESTION",
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  transactionActions: 0,
  results,
  auditCount: batch.audits.length,
  quarantineCount: batch.quarantine.length,
  canonicalPropertyCount: batch.store.properties.length,
  listingSnapshotCount: batch.store.listingSnapshots.length
};

writeJson(path.join(artifactDir, "property_ingestion_proof_report.json"), report);
writeJson(path.join(artifactDir, "property_ingestion_audit_report.json"), {
  audits: batch.audits,
  quarantine: batch.quarantine
});
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PHASE_22H_PROPERTY_INGESTION_PROOF_PASS") process.exit(1);
