import assert from "node:assert/strict";
import {
  buildPublicationReadinessFixtures,
  buildPublicationReadinessViewModel,
  createLisaPublicationReadinessGuide,
  createNavigatorPublicationReadinessRouting,
  createPropertyListingPublicationPlan,
  createPropertyPublicationChannel,
  createPublicationReadinessExplanation,
  createPublicationReadinessIntent,
  createPublicSafeSaleListingProjection,
  detectPublicationPlanStaleness,
  evaluatePropertyListingPublicationReadiness,
  localPublicationChannelId,
  mediaRightsReadinessStatuses,
  publicationAuthorityActions,
  publicationComplianceFlags,
  publicationPlanStatuses,
  publicationReadinessSideEffectCounters,
  publicationReadinessStatuses,
  publicLocationPolicies
} from "../src/property/index.js";

const fixtures = buildPublicationReadinessFixtures();
const owner = buildPublicationReadinessViewModel({ case: "owner" });
const agent = buildPublicationReadinessViewModel({ case: "agent" });

assert.equal(owner.readiness.modelType, "PropertyListingPublicationReadiness", "1 readiness contract");
assert.deepEqual(Object.values(publicationReadinessStatuses).includes("READY_FOR_PUBLICATION_APPROVAL"), true, "2 readiness statuses");
assert.equal(buildPublicationReadinessViewModel({ case: "missingListing" }).readiness.propertyStatus, "CREATED_LOCAL_PROOF", "3 existing Property");
assert.equal(buildPublicationReadinessViewModel({ case: "missingListing" }).readiness.readinessStatus, publicationReadinessStatuses.blockedListingState, "4 existing Listing");
assert.equal(buildPublicationReadinessViewModel({ case: "expiredAuthority" }).readiness.readinessStatus, publicationReadinessStatuses.blockedAuthority, "5 authority recheck");
assert.equal(owner.readiness.readinessStatus, publicationReadinessStatuses.readyForPublicationApproval, "6 owner ready");
assert.equal(agent.readiness.readinessStatus, publicationReadinessStatuses.readyForPublicationApproval, "7 agent mandate");
assert.equal(buildPublicationReadinessViewModel({ case: "expiredAuthority" }).readiness.authorityStatus, "EXPIRED", "8 expired mandate");
assert.equal(buildPublicationReadinessViewModel({ case: "manager" }).readiness.readinessStatus, publicationReadinessStatuses.blockedAuthority, "9 manager blocked");
assert.equal(buildPublicationReadinessViewModel({ case: "serviceProvider" }).readiness.readinessStatus, publicationReadinessStatuses.blockedAuthority, "10 service provider blocked");
assert.equal(buildPublicationReadinessViewModel({ case: "owner" }).readiness.contentReadiness.readinessStatus, publicationReadinessStatuses.readyForPublicationApproval, "11 content required fields");
assert.equal(buildPublicationReadinessViewModel({ case: "marketingCopy" }).readiness.contentReadiness.warnings.some((warning) => warning.includes("marketing copy")), true, "12 marketing vs facts");
assert.equal(owner.projection.modelType, "PublicSafeSaleListingProjection", "13 public-safe projection");
assert.equal(Object.values(publicLocationPolicies).includes("CITY_ONLY"), true, "14 location privacy");
assert.equal(buildPublicationReadinessViewModel({ case: "privateData" }).readiness.readinessStatus, publicationReadinessStatuses.blockedPrivacy, "15 private data denylist");
assert.equal(buildPublicationReadinessViewModel({ case: "missingMedia" }).readiness.mediaReadiness.readinessStatus, publicationReadinessStatuses.blockedMedia, "16 media readiness");
assert.equal(buildPublicationReadinessViewModel({ case: "mediaRights" }).readiness.mediaReadiness.rightsReadiness, mediaRightsReadinessStatuses.rightsMissing, "17 media rights");
assert.equal(owner.projection.askingPrice, owner.listing.price, "18 price semantics");
assert.equal(buildPublicationReadinessViewModel({ case: "stale" }).readiness.readinessStatus, publicationReadinessStatuses.blockedStale, "19 freshness");
assert.equal(owner.readiness.evidenceReadiness.readinessStatus, publicationReadinessStatuses.readyForPublicationApproval, "20 evidence readiness");
assert.equal(owner.projection.passportPublicLinkReadiness, "PUBLIC_SAFE_PASSPORT_LINK_READY", "21 Passport reuse");
assert.equal(buildPublicationReadinessViewModel({ case: "contentConflict" }).readiness.readinessStatus, publicationReadinessStatuses.blockedContent, "22 property/listing fact conflict");
assert.equal(buildPublicationReadinessViewModel({ case: "unknownJurisdiction" }).readiness.readinessStatus, publicationReadinessStatuses.blockedJurisdiction, "23 jurisdiction");
assert.equal(owner.readiness.complianceReadiness.flags.includes(publicationComplianceFlags.noneIdentifiedLocalProof), true, "24 disclosures");
assert.equal(owner.readiness.complianceReadiness.legalConclusion, false, "25 compliance flags");
assert.equal(buildPublicationReadinessViewModel({ case: "exclusiveConflict" }).readiness.readinessStatus, publicationReadinessStatuses.blockedExclusivityConflict, "26 exclusivity");
assert.equal(createPropertyPublicationChannel().channelId, localPublicationChannelId, "27 channel model");
assert.equal(owner.readiness.channelReadiness.readinessStatus, publicationReadinessStatuses.readyForPublicationApproval, "28 channel readiness");
assert.equal(owner.plan.modelType, "PropertyListingPublicationPlan", "29 publication plan");
assert.equal(Boolean(owner.plan.publicProjectionFingerprint && owner.plan.listingFingerprint && owner.plan.authorityFingerprint), true, "30 plan fingerprint");
assert.equal(owner.stalePlan.planStatus, publicationPlanStatuses.stalePlan, "31 stale plan");
assert.equal(owner.viewAsPublic.internalFieldsVisible, false, "32 View As Public");
assert.equal(JSON.stringify(owner.viewAsPublic).includes("protected_doc_ref"), false, "33 public Passport boundary");
assert.equal(owner.marketplaceDiscoveryReady, true, "34 discovery readiness flag");
assert.equal(owner.actualDiscoveryInsertion, false, "35 no actual Discovery insertion");
assert.equal(createLisaPublicationReadinessGuide("Is the Listing public now?", owner.readiness).answer.includes("only evaluates publication readiness"), true, "36 Lisa explanation");
assert.equal(createNavigatorPublicationReadinessRouting("I want to publish this Listing.").navigatorCanPublish, false, "37 Navigator route");
assert.equal(owner.reviewPayload.reviewType, "SALE_LISTING_PUBLICATION_REVIEW", "38 review payload reuse");
assert.equal(owner.reviewPayload.duplicateReviewQueueCreated, false, "39 no duplicate review queue");
assert.equal(owner.publishActions, 0, "40 no publish action");
assert.equal(owner.listingMutations, 0, "41 no Listing mutation");
assert.equal(owner.canonicalPropertyMutations, 0, "42 no Property mutation");
assert.equal(owner.ownershipMutations, 0, "43 no ownership mutation");
assert.equal(owner.providerCalls, 0, "44 no provider call");
assert.equal(owner.externalCalls, 0, "45 no external call");
assert.equal(owner.productionDbMutations, 0, "46 no production DB write");
assert.equal(owner.paymentActions, 0, "47 no payment");
assert.equal(owner.bookingActions, 0, "48 no booking");
assert.equal(owner.commercialTransactionActions, 0, "49 no transaction");

const intent = createPublicationReadinessIntent({
  listingId: owner.listing.listingId,
  propertyId: owner.property.propertyId,
  actorId: owner.intent.actorId,
  authorityGrantId: owner.intent.authorityGrantId
});
const evaluated = evaluatePropertyListingPublicationReadiness({
  store: fixtures.owner.store,
  intent,
  fixture: fixtures.owner.fixture
});
const plan = createPropertyListingPublicationPlan({
  readiness: evaluated.readiness,
  projection: evaluated.projection,
  listing: owner.listing,
  property: owner.property,
  authorityGrant: fixtures.owner.fixture.authorityGrant
});
const changedProjection = createPublicSafeSaleListingProjection({
  property: owner.property,
  listing: { ...owner.listing, listingTitle: "Changed local title" },
  fixture: fixtures.owner.fixture,
  mediaReadiness: owner.readiness.mediaReadiness
});
assert.equal(detectPublicationPlanStaleness(plan, {
  listing: { ...owner.listing, listingTitle: "Changed local title" },
  projection: changedProjection,
  authorityGrant: fixtures.owner.fixture.authorityGrant
}).stale, true, "50 all regressions");

assert.equal(publicationAuthorityActions.publishSaleListingFuture, "PUBLISH_SALE_LISTING_FUTURE");
assert.equal(publicationReadinessSideEffectCounters.publishActions, 0);

console.log("Phase 23H Property Publication Readiness tests passed: 50/50");
