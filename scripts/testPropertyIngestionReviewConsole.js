import assert from "node:assert/strict";
import {
  buildBoundedPropertyIngestionReviewContext,
  buildPropertyIngestionReviewViewModel,
  createLisaPropertyIngestionReviewExplanation,
  propertyIngestionMatchOutcomes,
  propertyIngestionReviewStateLabels,
  propertyIngestionValidationStatuses
} from "../src/property/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) console.log(JSON.stringify(details, null, 2));
}

const viewModel = buildPropertyIngestionReviewViewModel();
const accepted = viewModel.queue.find((item) => item.sourceRecordId === "owner_sub_batumi_0707");
const acceptedWithGaps = viewModel.queue.find((item) => item.sourceRecordId === "manual_gap_record_city_missing");
const exact = viewModel.queue.find((item) => item.sourceRecordId === "agency_listing_tower_b_0501");
const duplicate = viewModel.queue.find((item) => item.sourceRecordId === "duplicate_partner_tower_b_0501");
const conflict = viewModel.queue.find((item) => item.sourceRecordId === "agency_listing_tower_b_0501_price_130000");
const quarantine = viewModel.queue.find((item) => item.sourceRecordId === "invalid_negative_area");

check(
  viewModel.modelType === "PropertyIngestionReviewViewModel" &&
    viewModel.accessBoundary === "INTERNAL / ADMIN / LOCAL PROOF" &&
    viewModel.queue.length >= 10,
  "A review view model is internal and queue-backed",
  viewModel.summary
);

check(
  propertyIngestionReviewStateLabels.ACCEPTED &&
    propertyIngestionReviewStateLabels.ACCEPTED_WITH_GAPS &&
    propertyIngestionReviewStateLabels.QUARANTINED &&
    propertyIngestionReviewStateLabels.REJECTED &&
    propertyIngestionReviewStateLabels.EXACT_MATCH &&
    propertyIngestionReviewStateLabels.PROBABLE_MATCH_REVIEW_REQUIRED &&
    propertyIngestionReviewStateLabels.NO_MATCH_NEW_PROPERTY_CANDIDATE &&
    propertyIngestionReviewStateLabels.CONFLICT_REVIEW_REQUIRED,
  "B all required review queue states have explanations",
  propertyIngestionReviewStateLabels
);

check(
  accepted.validationStatus === propertyIngestionValidationStatuses.accepted &&
    accepted.matchOutcome === propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate &&
    accepted.canonicalPropertyId &&
    accepted.listingSnapshotId,
  "C accepted owner submission item exposes canonical IDs and listing snapshot",
  accepted
);

check(
  acceptedWithGaps.validationStatus === propertyIngestionValidationStatuses.acceptedWithGaps &&
    acceptedWithGaps.gaps.includes("city_missing") &&
    acceptedWithGaps.normalizationDetail.rows.some((row) => row.normalizedValue === "UNKNOWN"),
  "D accepted-with-gaps item keeps missing fields visible",
  acceptedWithGaps
);

check(
  quarantine.validationStatus === propertyIngestionValidationStatuses.quarantined &&
    quarantine.validationDetail.errors.includes("area_impossible_negative") &&
    viewModel.quarantine.some((item) => item.sourceRecordId === quarantine.sourceRecordId),
  "E quarantined item exposes reasons and quarantine surface row",
  quarantine.validationDetail
);

check(
  exact.matchOutcome === propertyIngestionMatchOutcomes.exactMatch &&
    exact.identityResolutionDetail.deterministicRuleUsed &&
    exact.identityResolutionDetail.manualReviewRequired === false,
  "F exact match shows deterministic rule and matched Property",
  exact.identityResolutionDetail
);

const syntheticRejected = buildPropertyIngestionReviewViewModel({
  batch: {
    audits: [{
      modelType: "PropertyIngestionAudit",
      ingestionId: "ingest_rejected_demo",
      sourceRecordId: "rejected_demo",
      validationResult: { status: propertyIngestionValidationStatuses.rejected, errors: ["rejected_demo"], warnings: [], gaps: [] },
      normalizationResult: null,
      duplicateResolution: null,
      canonicalPropertyId: null,
      listingSnapshotId: null,
      warnings: [],
      conflicts: [],
      gaps: [],
      timestamp: "2026-08-20T00:00:00.000Z"
    }],
    store: { facts: [], listingSnapshots: [] }
  },
  sourceRecords: [{ sourceRecordId: "rejected_demo", sourceName: "local_rejected_fixture", sourceType: "LOCAL_FIXTURE", observedAt: "2026-08-20T00:00:00.000Z", fetchedAt: "2026-08-20T00:00:00.000Z", rawPayload: {} }]
});
check(
  syntheticRejected.queue[0].validationStatus === propertyIngestionValidationStatuses.rejected &&
    syntheticRejected.queue[0].auditTimeline.some((step) => step.status === "STOPPED"),
  "G rejected item can be represented without entering canonical read path",
  syntheticRejected.queue[0]
);

check(
  duplicate.matchOutcome === propertyIngestionMatchOutcomes.exactMatch &&
    duplicate.canonicalPropertyId === exact.canonicalPropertyId,
  "H duplicate source shows one canonical Property",
  { duplicate: duplicate.canonicalPropertyId, exact: exact.canonicalPropertyId }
);

check(
  conflict.matchOutcome === propertyIngestionMatchOutcomes.conflictReviewRequired &&
    conflict.conflictDetail.hasConflict &&
    conflict.conflictDetail.observations.some((row) => row.price === 125000) &&
    conflict.conflictDetail.observations.some((row) => row.price === 130000),
  "I conflict review shows side-by-side source observations",
  conflict.conflictDetail
);

check(
  exact.sourceLineage.some((row) => row.trace.includes("SourceRecord -> SourceRef")) &&
    exact.sourceLineage.some((row) => row.artifactType === "ListingSnapshot"),
  "J source lineage rendering connects source to facts/listings/passport",
  exact.sourceLineage
);

check(
  exact.auditTimeline.map((step) => step.stage).includes("Repository Read Ready") &&
    exact.auditTimeline.every((step) => step.status === "COMPLETE"),
  "K audit timeline shows full accepted sequence",
  exact.auditTimeline
);

const conflictFilter = buildPropertyIngestionReviewViewModel({ filters: { hasConflict: true } });
const quarantineFilter = buildPropertyIngestionReviewViewModel({ filters: { quarantined: true } });
check(
  conflictFilter.filteredQueue.every((item) => item.conflictDetail.hasConflict) &&
    quarantineFilter.filteredQueue.every((item) => item.validationStatus === propertyIngestionValidationStatuses.quarantined),
  "L filters support conflict and quarantine queue states",
  { conflictCount: conflictFilter.filteredQueue.length, quarantineCount: quarantineFilter.filteredQueue.length }
);

check(
  !JSON.stringify(viewModel).includes("ownerText") &&
    !JSON.stringify(viewModel).includes("reviewNote") &&
    !JSON.stringify(viewModel).includes("rawPayload"),
  "M review model does not leak unsafe raw payload fields",
  accepted.sourceDetail.declaredData.rawPreview
);

check(
  viewModel.disabledActions.includes("approve_merge") &&
    viewModel.disabledActions.includes("restore_from_quarantine") &&
    Object.values(accepted.mutationActions).every((status) => status === "NOT_ACTIVE_YET"),
  "N mutation controls are disabled/future-only",
  viewModel.disabledActions
);

const bounded = buildBoundedPropertyIngestionReviewContext(buildPropertyIngestionReviewViewModel({ selectedIngestionId: conflict.ingestionId }));
const lisa = createLisaPropertyIngestionReviewExplanation(buildPropertyIngestionReviewViewModel({ selectedIngestionId: conflict.ingestionId }));
check(
  bounded.intent === "PROPERTY_INGESTION_INTERNAL_REVIEW" &&
    lisa.explanation.includes("No approve, merge, restore") &&
    !JSON.stringify(bounded).includes("rawPayload"),
  "O internal Lisa/Navigator explanation is bounded and read-only",
  { bounded: bounded.boundedContextMetadata, lisa }
);

check(
  [viewModel, bounded, lisa].every((item) =>
    item.providerCalls === 0 &&
      item.externalCalls === 0 &&
      item.dbMutations === 0 &&
      item.payments === 0
  ),
  "P provider/external/db/payment counts remain zero"
);

check(
  viewModel.bookingActions === 0 &&
    viewModel.transactionActions === 0,
  "Q booking/payment/transaction actions remain zero"
);

assert.equal(failures, 0);
console.log("Property ingestion review console tests passed.");
