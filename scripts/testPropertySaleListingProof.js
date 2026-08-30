import assert from "node:assert/strict";
import {
  blockedSaleListingActions,
  buildSaleListingFixtures,
  buildSaleListingViewModel,
  commitSaleListingCreationLocalProof,
  createApprovalForSaleListingCreationIntent,
  createLocalPropertyListingCreationStore,
  createNavigatorSaleListingRouting,
  createPropertyListingCreationHistoryItem,
  createPropertySaleListingIntent,
  createSaleListingApproval,
  createSaleListingCreationIntent,
  createSaleListingStoreForScenario,
  generateLocalSaleListingId,
  prepareSaleListingCreationThroughGateway,
  rollbackSaleListingCreationLocalProof,
  saleListingApprovalStatuses,
  saleListingCreationActionTypes,
  saleListingExecutionStatuses,
  saleListingPreflightStatuses,
  validateSaleListingCreationPreflight
} from "../src/property/index.js";

const fixtures = buildSaleListingFixtures();
const owner = fixtures.owner;
const ownerIntent = fixtures.intents.owner;

assert.equal(owner.saleListingIntent.modelType, "PropertySaleListingIntent", "1 sale listing intent");
assert.equal(ownerIntent.modelType, "SaleListingCreationIntent", "2 creation intent");
assert.equal(ownerIntent.actionType, saleListingCreationActionTypes.createSaleListingLocalProof, "3 only allowed execution action");
assert.equal(blockedSaleListingActions.includes("PUBLISH_LISTING"), true, "4 publish blocked");
assert.equal(buildSaleListingViewModel({ case: "missingProperty" }).preflight.status, saleListingPreflightStatuses.blockedPropertyNotFound, "5 existing Property required");
assert.equal(buildSaleListingViewModel({ case: "owner" }).preflight.status, saleListingPreflightStatuses.readyForApproval, "6 owner authority");
assert.equal(buildSaleListingViewModel({ case: "agent" }).preflight.status, saleListingPreflightStatuses.readyForApproval, "7 agent mandate");
assert.equal(buildSaleListingViewModel({ case: "agentNoMandate" }).preflight.status, saleListingPreflightStatuses.blockedAuthority, "8 agent missing mandate");
assert.equal(buildSaleListingViewModel({ case: "manager" }).preflight.status, saleListingPreflightStatuses.blockedAuthority, "9 manager blocked");
assert.equal(buildSaleListingViewModel({ case: "cleaner" }).preflight.status, saleListingPreflightStatuses.blockedAuthority, "10 cleaning blocked");
assert.equal(buildSaleListingViewModel({ case: "buyer" }).preflight.status, saleListingPreflightStatuses.blockedAuthority, "11 buyer blocked");
assert.equal(validateSaleListingCreationPreflight(createSaleListingCreationIntent({ ...owner, saleListingIntent: createPropertySaleListingIntent({ ...owner, requestedPrice: -1 }) }), { store: createSaleListingStoreForScenario() }).status, saleListingPreflightStatuses.blockedPrice, "12 price validation");
assert.equal(validateSaleListingCreationPreflight(createSaleListingCreationIntent({ ...owner, saleListingIntent: createPropertySaleListingIntent({ ...owner, currency: "BTC" }) }), { store: createSaleListingStoreForScenario() }).status, saleListingPreflightStatuses.blockedPrice, "13 currency");
assert.equal(buildSaleListingViewModel({ case: "priceBlocked" }).preflight.status, saleListingPreflightStatuses.blockedPriceScope, "14 price scope");
assert.equal(generateLocalSaleListingId(owner.saleListingIntent).startsWith(`listing_local_sale_${owner.property.propertyId}_`), true, "15 Listing ID");

const store = createSaleListingStoreForScenario();
const approval = createApprovalForSaleListingCreationIntent(ownerIntent);
const result = commitSaleListingCreationLocalProof({ intent: ownerIntent, approval, store });
assert.equal(result.ok, true, "16 atomic commit");
assert.notEqual(result.listingId, owner.property.propertyId, "17 Listing != Property");
assert.equal(result.passport.input.property.price, undefined, "18 requested price != Property value");
assert.equal(JSON.stringify(result.passport.input.property.facts).includes(owner.saleListingIntent.listingTitle), false, "19 title/description != Property facts");
assert.equal(result.listing.sourceRef.sourceName, "phase_23g_local_sale_listing", "20 provenance");
assert.equal(result.listing.authorityGrantId, ownerIntent.authorityGrantId, "21 authority linkage");
assert.equal(result.listing.mandateRef || "Owner self authority", "Owner self authority", "22 mandate linkage for owner self");
assert.equal(buildSaleListingViewModel({ case: "exclusiveConflict" }).preflight.status, saleListingPreflightStatuses.blockedExclusiveAuthorityConflict, "23 exclusive conflict");
assert.equal(buildSaleListingViewModel({ case: "nonExclusive" }).preflight.status, saleListingPreflightStatuses.readyForApproval, "24 non-exclusive behavior");
assert.equal(result.post.checks.lifecycleCreated, true, "25 listing lifecycle");
assert.equal(result.passport.passport.publicView.listingCount, 1, "26 Passport integration");
assert.equal(result.listing.visibilityReadiness, "LOCAL_UNPUBLISHED", "27 no automatic public Discovery");
assert.equal(validateSaleListingCreationPreflight(ownerIntent, { store: createSaleListingStoreForScenario() }).approvalRequired, true, "28 preflight");
assert.equal(approval.approvalStatus, saleListingApprovalStatuses.approved, "29 human approval");
assert.equal(createSaleListingApproval(ownerIntent, { decidedBy: "ai:auto" }).approvalStatus, saleListingApprovalStatuses.blocked, "30 AI cannot approve");
assert.equal(createSaleListingApproval(ownerIntent, { decidedBy: "lisa:guide" }).approvalStatus, saleListingApprovalStatuses.blocked, "31 Lisa cannot approve");
assert.equal(createSaleListingApproval(ownerIntent, { decidedBy: "navigator:route" }).approvalStatus, saleListingApprovalStatuses.blocked, "32 Navigator cannot approve");
assert.equal(prepareSaleListingCreationThroughGateway(ownerIntent, approval, validateSaleListingCreationPreflight(ownerIntent, { store: createSaleListingStoreForScenario() })).allowed, true, "33 Gateway enforcement");
assert.equal(prepareSaleListingCreationThroughGateway(ownerIntent, createSaleListingApproval(ownerIntent, {}), validateSaleListingCreationPreflight(ownerIntent, { store: createSaleListingStoreForScenario() })).allowed, false, "34 unapproved gateway blocks");
assert.equal(prepareSaleListingCreationThroughGateway(ownerIntent, approval).directStoreMutationAllowed, false, "35 UI store bypass forbidden");
assert.equal(result.executionRecord.beforeState.modelType, "SaleListingCreationBeforeState", "36 before snapshot");
assert.equal(result.post.status, "POST_CONDITIONS_VERIFIED", "37 postcondition verification");
assert.equal(commitSaleListingCreationLocalProof({ intent: ownerIntent, approval, store }).status, saleListingExecutionStatuses.alreadyCreatedIdempotent, "38 idempotency");
const changedSaleIntent = createPropertySaleListingIntent({ ...owner, requestedPrice: 126000 });
const changedIntent = { ...createSaleListingCreationIntent({ ...owner, saleListingIntent: changedSaleIntent }), contentFingerprint: ownerIntent.contentFingerprint };
assert.equal(validateSaleListingCreationPreflight(changedIntent, { store: createSaleListingStoreForScenario() }).status, saleListingPreflightStatuses.blockedStateMismatch, "39 state mismatch");
const failure = commitSaleListingCreationLocalProof({ intent: ownerIntent, approval, store: createSaleListingStoreForScenario(), simulateFailureAt: "after_listing_id" });
assert.equal(failure.status, saleListingExecutionStatuses.failed, "40 synthetic failure");
assert.equal(failure.noOrphanListing && failure.noOrphanLink && failure.noPartialLifecycle, true, "41 failure safety");
const rollbackStore = createSaleListingStoreForScenario();
const rollbackResult = commitSaleListingCreationLocalProof({ intent: ownerIntent, approval, store: rollbackStore });
assert.equal(rollbackSaleListingCreationLocalProof({ executionRecord: rollbackResult.executionRecord, store: rollbackStore }).status, saleListingExecutionStatuses.rolledBack, "42 rollback");
assert.equal(rollbackStore.getProperty(ownerIntent.propertyId).propertyId, ownerIntent.propertyId, "43 rollback never deletes Property");
const dependencyStore = createSaleListingStoreForScenario();
const dependencyResult = commitSaleListingCreationLocalProof({ intent: ownerIntent, approval, store: dependencyStore });
dependencyStore.setDownstreamDependencies(dependencyResult.listingId, ["TRANSACTION_DEPENDENCY_SYNTHETIC"]);
assert.equal(rollbackSaleListingCreationLocalProof({ executionRecord: dependencyResult.executionRecord, store: dependencyStore }).status, saleListingExecutionStatuses.rollbackBlocked, "44 rollback dependency guard");
assert.equal(createPropertyListingCreationHistoryItem(result.executionRecord).listingId, result.listingId, "45 listing history");
assert.equal(createNavigatorSaleListingRouting("sell").navigatorCanPublish, false, "46 Navigator cannot publish");
assert.equal(result.canonicalPropertyCreations, 0, "47 no canonical Property creation");
assert.equal(result.ownershipMutations, 0, "48 no ownership mutation");
assert.equal(result.publishActions, 0, "49 no publication");
assert.deepEqual({
  providerCalls: result.providerCalls,
  externalCalls: result.externalCalls,
  productionDbMutations: result.productionDbMutations,
  paymentActions: result.paymentActions,
  bookingActions: result.bookingActions,
  commercialTransactionActions: result.commercialTransactionActions
}, {
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
}, "50 no provider/external/db/payment/booking/transaction");

console.log("Phase 23G Property Sale Listing Proof tests passed: 50/50");
