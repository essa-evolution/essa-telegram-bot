import assert from "node:assert/strict";
import {
  buildBoundedPropertyContext,
  createLisaPropertyPassportExplanation,
  localPropertyRepository,
  propertyReadService,
  propertyRepositoryContract
} from "../src/property/index.js";
import {
  buildLisaComparisonAnswer,
  buildPropertyComparisonViewModel
} from "../workspace/modules/propertyPassportUi.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const canonicalId = "prop_ge_batumi_sea_view_a_1204";
const incompleteId = "prop_ge_batumi_incomplete_evidence";

check(
  propertyRepositoryContract.readOnly === true &&
    propertyRepositoryContract.operations.includes("getPropertyById") &&
    propertyRepositoryContract.operations.includes("getPropertyEvidence") &&
    propertyRepositoryContract.prohibitedOperations.includes("deleteProperty"),
  "A repository contract is explicit and read-only",
  propertyRepositoryContract
);

const found = localPropertyRepository.getPropertyById(canonicalId);
const missing = localPropertyRepository.getPropertyById("prop_missing");
check(
  found.ok === true &&
    found.property.propertyId === canonicalId &&
    missing.status === "NOT_FOUND",
  "B local repository adapter supports getPropertyById and NOT_FOUND",
  { foundStatus: found.status, missing }
);

const listed = propertyReadService.listProperties({ city: "Batumi", propertyType: "APARTMENT_UNIT" });
const filtered = propertyReadService.listProperties({ projectId: "project_batumi_sea_view" });
check(
  listed.summaries.length >= 2 &&
    filtered.summaries.some((summary) => summary.propertyId === canonicalId),
  "C listProperties supports safe read-only filters",
  { listed: listed.summaries, filtered: filtered.summaries }
);

check(
  listed.summaries.every((summary) =>
    summary.modelType === "PropertySummary" &&
      Object.hasOwn(summary, "observedPrice") &&
      Object.hasOwn(summary, "freshness") &&
      Object.hasOwn(summary, "verificationStatus") &&
      Array.isArray(summary.primaryRiskFlags)
  ),
  "D PropertySummary collection model is compact and read-safe",
  listed.summaries
);

const incompletePassport = propertyReadService.getPropertyPassport("incomplete");
check(
  incompletePassport.ok &&
    incompletePassport.propertyId === incompleteId &&
    incompletePassport.viewModel.marketSection.observedPrice === null &&
    incompletePassport.audit.gaps.includes("current_listing_missing"),
  "E incomplete evidence exists and remains incomplete",
  {
    propertyId: incompletePassport.propertyId,
    market: incompletePassport.viewModel.marketSection,
    gaps: incompletePassport.audit.gaps
  }
);

const stalePassport = propertyReadService.getPropertyPassport("stale");
check(
  stalePassport.ok &&
    stalePassport.propertyId === canonicalId &&
    stalePassport.viewModel.freshnessSection.freshness === "STALE" &&
    stalePassport.viewModel.marketSection.observedPrice === null,
  "F stale listing does not remove Property and does not invent active price",
  {
    propertyId: stalePassport.propertyId,
    freshness: stalePassport.viewModel.freshnessSection,
    market: stalePassport.viewModel.marketSection
  }
);

const repositoryEvidence = propertyReadService.getPropertyEvidence(canonicalId);
check(
  repositoryEvidence.ok &&
    repositoryEvidence.listingSnapshots.length >= 3 &&
    repositoryEvidence.sourceRefs.every((source) => source.sourceId && source.observedAt && source.freshnessStatus && source.verificationStatus),
  "G source/freshness metadata survives repository read",
  repositoryEvidence.sourceRefs
);

const lifecycle = propertyReadService.getLifecycleEvents(canonicalId);
check(
  lifecycle.length >= 3 &&
    lifecycle.every((event) => event.appendOnly === true) &&
    lifecycle.map((event) => event.observedAt).join("|") === [...lifecycle].map((event) => event.observedAt).sort().join("|"),
  "H lifecycle events read chronologically and append-oriented",
  lifecycle
);

const passportInput = propertyReadService.buildPassportInput("normal");
const passportViaRepository = propertyReadService.getPropertyPassport("normal");
check(
  passportInput.ok &&
    passportViaRepository.ok &&
    passportViaRepository.viewModel.propertyId === canonicalId &&
    passportViaRepository.input.facts.length >= 1,
  "I Passport is built through repository/read service evidence",
  { inputKeys: Object.keys(passportInput), propertyId: passportViaRepository.viewModel.propertyId }
);

const comparison = buildPropertyComparisonViewModel({ itemIds: ["normal", "stale", "incomplete"] });
check(
  comparison.compared.length === 3 &&
    comparison.selectedPropertyIds.includes(canonicalId) &&
    buildLisaComparisonAnswer("Где больше неизвестных данных?", comparison).includes("Missing / not available"),
  "J Comparison resolves demo aliases through repository-backed Property IDs",
  { selectedPropertyIds: comparison.selectedPropertyIds, deltas: comparison.deltas }
);

const navigatorContext = buildBoundedPropertyContext({
  query: "Покажи этот объект",
  propertyId: "normal"
});
const lisa = createLisaPropertyPassportExplanation(navigatorContext);
check(
  navigatorContext.status === "READ_ONLY_AVAILABLE" &&
    navigatorContext.boundedContextMetadata.selectedCount >= 1 &&
    lisa.roleId === "LISA_ESSA_PRODUCT_GUIDE" &&
    lisa.humanExplanation.includes("Live search"),
  "K Navigator and Lisa receive bounded repository-backed Property context",
  { navigator: navigatorContext.boundedContextMetadata, lisa }
);

const apiList = propertyReadService.listDemoProperties();
const apiPassport = propertyReadService.publicPropertyResponse("normal");
const apiNotFound = propertyReadService.publicPropertyResponse("prop_unknown");
check(
  apiList.summaries.length === 3 &&
    apiPassport.ok &&
    apiPassport.passport.sourceRefs.every((source) => source.sourceId && source.observedAt) &&
    !Object.hasOwn(apiPassport.passport, "protectedViewMetadata") &&
    apiNotFound.status === "NOT_FOUND",
  "L read API response model is public-safe and returns NOT_FOUND",
  { apiList: apiList.summaries, apiNotFound }
);

check(
  typeof localPropertyRepository.createProperty === "undefined" &&
    typeof localPropertyRepository.updateProperty === "undefined" &&
    typeof localPropertyRepository.deleteProperty === "undefined",
  "M repository exposes no mutation paths"
);

check(
  [found, listed, incompletePassport, stalePassport, repositoryEvidence, passportViaRepository, comparison, navigatorContext, apiList, apiPassport].every((item) =>
    item.providerCalls === 0 &&
      item.externalCalls === 0 &&
      item.dbMutations === 0 &&
      item.payments === 0
  ),
  "N provider/external/db/payment counts remain zero"
);

assert.equal(failures, 0);
console.log("Property repository read service tests passed.");
