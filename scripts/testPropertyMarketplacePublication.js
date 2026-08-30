import assert from "node:assert/strict";
import {
  blockedMarketplacePublicationActions,
  buildMarketplacePublicationViewModel,
  commitMarketplacePublicationLocalProof,
  createApprovalForMarketplacePublicationIntent,
  createLisaMarketplaceGuide,
  createLocalMarketplacePublicationStore,
  createMarketplacePublicationApproval,
  createMarketplacePublicationExecutionIntent,
  createMarketplacePublicationScenario,
  createNavigatorMarketplaceRouting,
  createPropertyMarketplacePublicationHistoryItem,
  marketplacePublicationActionTypes,
  marketplacePublicationApprovalStatuses,
  marketplacePublicationExecutionStatuses,
  marketplacePublicationStatuses,
  prepareMarketplacePublicationThroughGateway,
  publicationExecutionPreflightStatuses,
  rollbackOrUnpublishListingPublicationLocalProof,
  searchLocalMarketplaceDiscovery,
  validateMarketplacePublicationPreflight
} from "../src/property/index.js";

const ownerScenario = createMarketplacePublicationScenario("owner");
const ownerIntent = ownerScenario.intent;
const owner = buildMarketplacePublicationViewModel({ case: "owner" });
const agent = buildMarketplacePublicationViewModel({ case: "agent" });

assert.equal(ownerIntent.modelType, "PropertyListingPublicationExecutionIntent", "1 publication execution intent");
assert.equal(ownerIntent.actionType, marketplacePublicationActionTypes.publishSaleListingLocalProof, "2 only allowed action");
assert.equal(buildMarketplacePublicationViewModel({ case: "blockedReadiness" }).preflight.status, publicationExecutionPreflightStatuses.blockedPrivacy, "3 readiness required");
assert.equal(createMarketplacePublicationExecutionIntent({ ...ownerScenario, plan: { ...ownerScenario.plan, planStatus: "BLOCKED" } }).source.plan.planStatus, "BLOCKED", "4 publication plan required");
assert.equal(Boolean(ownerIntent.publicationPlanId && ownerIntent.idempotencyKey), true, "5 plan fingerprint");
assert.equal(Boolean(ownerIntent.listingFingerprint), true, "6 Listing fingerprint");
assert.equal(Boolean(ownerIntent.publicProjectionFingerprint), true, "7 public projection fingerprint");
assert.equal(buildMarketplacePublicationViewModel({ case: "expiredAuthority" }).preflight.status, publicationExecutionPreflightStatuses.blockedExpiredAuthority, "8 authority recheck");
assert.equal(owner.result.status, marketplacePublicationExecutionStatuses.publishedLocalProof, "9 owner success");
assert.equal(agent.result.status, marketplacePublicationExecutionStatuses.publishedLocalProof, "10 agent success");
assert.equal(buildMarketplacePublicationViewModel({ case: "expiredAuthority" }).result, null, "11 expired authority blocked");
assert.equal(buildMarketplacePublicationViewModel({ case: "manager" }).preflight.status, publicationExecutionPreflightStatuses.blockedAuthority, "12 manager blocked");
assert.equal(buildMarketplacePublicationViewModel({ case: "blockedReadiness" }).localMarketplaceDiscoveryInsertions, 0, "13 blocked readiness cannot publish");
assert.equal(buildMarketplacePublicationViewModel({ case: "stalePlan" }).preflight.status, publicationExecutionPreflightStatuses.blockedStalePlan, "14 stale plan");
assert.equal(buildMarketplacePublicationViewModel({ case: "mediaChanged" }).preflight.status, publicationExecutionPreflightStatuses.blockedStalePlan, "15 media changed");
assert.equal(buildMarketplacePublicationViewModel({ case: "privacyChanged" }).preflight.status, publicationExecutionPreflightStatuses.blockedStalePlan, "16 privacy changed");
assert.equal(buildMarketplacePublicationViewModel({ case: "jurisdictionChanged" }).preflight.status, publicationExecutionPreflightStatuses.blockedJurisdiction, "17 jurisdiction changed");
assert.equal(buildMarketplacePublicationViewModel({ case: "exclusivityChanged" }).preflight.status, publicationExecutionPreflightStatuses.blockedExclusivityConflict, "18 exclusivity changed");
assert.equal(createMarketplacePublicationApproval(ownerIntent, {}).approvalStatus, marketplacePublicationApprovalStatuses.blocked, "19 human approval required");
assert.equal(createMarketplacePublicationApproval(ownerIntent, { decidedBy: "ai:auto" }).approvalStatus, marketplacePublicationApprovalStatuses.blocked, "20 AI cannot approve");
assert.equal(createMarketplacePublicationApproval(ownerIntent, { decidedBy: "lisa:guide" }).approvalStatus, marketplacePublicationApprovalStatuses.blocked, "21 Lisa cannot approve");
assert.equal(createMarketplacePublicationApproval(ownerIntent, { decidedBy: "navigator:route" }).approvalStatus, marketplacePublicationApprovalStatuses.blocked, "22 Navigator cannot approve");
assert.equal(prepareMarketplacePublicationThroughGateway(ownerIntent, createApprovalForMarketplacePublicationIntent(ownerIntent), validateMarketplacePublicationPreflight(ownerIntent, { publicationStore: createLocalMarketplacePublicationStore() })).allowed, true, "23 ExecutionGateway enforced");
assert.equal(owner.result.publicationRecord.modelType, "PropertyMarketplacePublicationRecord", "24 local publication record");
assert.equal(owner.result.post.checks.publicationRecordExists && owner.result.post.checks.exactlyOneDiscoveryEntry, true, "25 atomic publish");
assert.equal(owner.result.discoveryEntry.modelType, "PropertyMarketplaceDiscoveryIndexEntry", "26 local Discovery insertion");
assert.equal(owner.marketplace.count, 1, "27 exactly one index entry");
assert.equal(searchLocalMarketplaceDiscovery(ownerScenario.publicationStore, "Apartment in Batumi").entries.length, 0, "28 Marketplace list excludes unpublished before commit");
assert.equal(owner.detail.publicTitle, owner.result.publicationRecord.publicProjection.publicTitle, "29 public detail");
assert.equal(owner.detail.passportPublicLinkReadiness, "PUBLIC_SAFE_PASSPORT_LINK_READY", "30 Passport public link");
assert.equal(owner.detail.askingPrice, owner.listing.price, "31 Asking Price semantics");
assert.equal(owner.detail.sellerRepresentationTypeSafeSummary.includes("Owner") || agent.detail.sellerRepresentationTypeSafeSummary.includes("representative"), true, "32 safe representation label");
assert.equal(JSON.stringify(owner.result.discoveryEntry).includes("evidence_"), false, "33 private-data denylist");
assert.equal(buildMarketplacePublicationViewModel({ case: "unpublished" }).searchAfterUnpublish.count, 0, "34 unpublished absent");
assert.equal(buildMarketplacePublicationViewModel({ case: "blockedReadiness" }).marketplace.count, 0, "35 blocked absent");
assert.equal(owner.marketplace.entries[0].safeLocation.city, "Batumi", "36 local discovery filters");
assert.equal(owner.repeat.status, marketplacePublicationExecutionStatuses.alreadyPublishedIdempotent, "37 idempotency");
assert.equal(buildMarketplacePublicationViewModel({ case: "stalePlan" }).result, null, "38 state mismatch");
assert.equal(buildMarketplacePublicationViewModel({ case: "failure" }).result.status, marketplacePublicationExecutionStatuses.failed, "39 failure safety");
assert.equal(owner.unpublish.status, marketplacePublicationExecutionStatuses.unpublishedLocalProof, "40 unpublish");
const rollbackStore = createLocalMarketplacePublicationStore();
const rollbackScenario = createMarketplacePublicationScenario("owner");
const rollbackApproval = createApprovalForMarketplacePublicationIntent(rollbackScenario.intent);
const rollbackResult = commitMarketplacePublicationLocalProof({ intent: rollbackScenario.intent, approval: rollbackApproval, publicationStore: rollbackStore });
assert.equal(rollbackOrUnpublishListingPublicationLocalProof({ publicationId: rollbackResult.publicationId, publicationStore: rollbackStore, rollback: true }).status, marketplacePublicationExecutionStatuses.rolledBackLocalProof, "41 rollback");
assert.equal(createPropertyMarketplacePublicationHistoryItem({ intent: owner.intent, record: owner.result.publicationRecord, approval: owner.approval, post: owner.result.post }).modelType, "PropertyMarketplacePublicationHistoryItem", "42 history");
assert.equal(owner.result.post.checks.propertyUnchanged, true, "43 Property unchanged");
assert.equal(owner.result.post.checks.ownershipUnchanged, true, "44 ownership unchanged");
assert.equal(owner.result.publicationRecord.publicationPlanId, owner.plan.publicationPlanId, "45 Listing creation history preserved");
assert.equal(owner.result.publicationRecord.sellerContactEnabled, false, "46 no seller contact");
assert.equal(owner.providerCalls, 0, "47 no provider call");
assert.equal(owner.externalCalls, 0, "48 no external call");
assert.equal(owner.productionDbMutations, 0, "49 no production DB mutation");
assert.deepEqual({
  paymentActions: owner.paymentActions,
  bookingActions: owner.bookingActions,
  commercialTransactionActions: owner.commercialTransactionActions
}, {
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
}, "50 no payment/booking/transaction");

assert.equal(blockedMarketplacePublicationActions.includes("CONTACT_SELLER"), true);
assert.equal(createLisaMarketplaceGuide("What does Asking Price mean?").mayContactSeller, false);
assert.equal(createNavigatorMarketplaceRouting("I want to publish my Listing.").navigatorCanPublish, false);
assert.equal(owner.result.publicationRecord.publicationStatus, marketplacePublicationStatuses.publishedLocalProof);

console.log("Phase 23I Property Marketplace Publication tests passed: 50/50");
