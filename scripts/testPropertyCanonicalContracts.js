import assert from "node:assert/strict";
import {
  buildBoundedPropertyContext,
  buildPropertyPassport,
  createLisaPropertyPassportExplanation,
  fixtureBatumiUnitProperty,
  fixtureIncompleteProperty,
  fixtureLifecycleEvents,
  fixtureListingSnapshots,
  fixturePropertyFacts,
  normalizeListingSnapshotsToPropertyIds,
  propertyFactStatuses,
  propertyFixtures,
  propertyFreshnessStatuses,
  validateLifecycleAppendOnly,
  validatePropertyContract
} from "../src/property/index.js";
import {
  buildNavigatorProductDiscoveryResponse
} from "../src/navigator/productKnowledgeBridge.js";
import { buildContextPack } from "../src/navigator/contextEngine.js";
import {
  buildBoundedProductKnowledgeContext,
  createProductContentIntentFromEducation,
  productIds,
  productKnowledgeNodes
} from "../src/capabilities/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const validation = validatePropertyContract(fixtureBatumiUnitProperty);
check(
  validation.valid === true &&
    validation.listingFieldsOnProperty.length === 0,
  "A Property contract is valid and has no listing-specific fields",
  validation
);

check(
  fixtureListingSnapshots.every((listing) => listing.propertyId === fixtureBatumiUnitProperty.propertyId) &&
    !Object.prototype.hasOwnProperty.call(fixtureBatumiUnitProperty, "price") &&
    !Object.prototype.hasOwnProperty.call(fixtureBatumiUnitProperty, "listingId"),
  "B Property != Listing",
  {
    propertyId: fixtureBatumiUnitProperty.propertyId,
    listingIds: fixtureListingSnapshots.map((listing) => listing.listingId)
  }
);

const normalizedListings = normalizeListingSnapshotsToPropertyIds(fixtureListingSnapshots.slice(0, 2));
check(
  normalizedListings.propertyIds.length === 1 &&
    normalizedListings.propertyIds[0] === fixtureBatumiUnitProperty.propertyId &&
    normalizedListings.byPropertyId[fixtureBatumiUnitProperty.propertyId].length === 2,
  "C duplicate listing snapshots resolve to one canonical Property",
  normalizedListings
);

const staleListing = fixtureListingSnapshots.find((listing) => listing.freshnessStatus === propertyFreshnessStatuses.stale);
check(
  staleListing?.listingStatus === "STALE_REVIEW_REQUIRED" &&
    staleListing.propertyId === fixtureBatumiUnitProperty.propertyId,
  "D stale listing remains a snapshot and does not change property identity",
  staleListing
);

const incompleteValidation = validatePropertyContract(fixtureIncompleteProperty);
const incompletePassport = buildPropertyPassport({
  property: fixtureIncompleteProperty,
  facts: fixtureIncompleteProperty.facts,
  sourceRefs: fixtureIncompleteProperty.sourceRefs,
  listingSnapshots: [],
  lifecycleEvents: [],
  generatedAt: "2026-08-20T00:00:00.000Z"
});
check(
  incompleteValidation.valid === true &&
    fixtureIncompleteProperty.confidence === "LOW" &&
    incompletePassport.audit.gaps.includes("address_missing") &&
    incompletePassport.audit.gaps.includes("current_listing_missing"),
  "E incomplete evidence Property is represented locally",
  { incompleteValidation, property: fixtureIncompleteProperty, audit: incompletePassport.audit }
);

const { passport, audit } = buildPropertyPassport({
  property: fixtureBatumiUnitProperty,
  facts: fixturePropertyFacts,
  sourceRefs: fixtureBatumiUnitProperty.sourceRefs,
  listingSnapshots: fixtureListingSnapshots,
  lifecycleEvents: fixtureLifecycleEvents,
  generatedAt: "2026-08-20T00:00:00.000Z"
});
check(
  passport.propertyId === fixtureBatumiUnitProperty.propertyId &&
    passport.publicView.listingCount === fixtureListingSnapshots.length &&
    passport.protectedViewMetadata.providerCalls === 0 &&
    audit.providerCalls === 0,
  "F Property Passport generation is read-only and local",
  { passport, audit }
);

check(
  passport.verifiedFacts.every((fact) => fact.factStatus === propertyFactStatuses.fact) &&
    passport.inferredFacts.every((fact) => fact.factStatus === propertyFactStatuses.inferred) &&
    passport.unverifiedFacts.some((fact) => fact.factStatus === propertyFactStatuses.unverified),
  "G fact vs inferred vs unverified separation",
  {
    verified: passport.verifiedFacts.map((fact) => fact.factType),
    inferred: passport.inferredFacts.map((fact) => fact.factType),
    unverified: passport.unverifiedFacts.map((fact) => fact.factType)
  }
);

check(
  passport.sourceRefs.length >= 3 &&
    audit.sourceRefs.length === passport.sourceRefs.length &&
    passport.protectedViewMetadata.sourceRefCount === passport.sourceRefs.length,
  "H source lineage is preserved",
  {
    sourceRefCount: passport.sourceRefs.length,
    sourceIds: passport.sourceRefs.map((source) => source.sourceId)
  }
);

check(
  validateLifecycleAppendOnly(fixtureLifecycleEvents) === true &&
    fixtureLifecycleEvents.every((event) => event.appendOnly === true),
  "I lifecycle events are append-oriented",
  fixtureLifecycleEvents.map((event) => ({ eventId: event.eventId, eventType: event.eventType, appendOnly: event.appendOnly }))
);

const propertyContext = buildBoundedPropertyContext({
  query: "Покажи Property Passport preview"
});
check(
  propertyContext.passport.propertyId === fixtureBatumiUnitProperty.propertyId &&
    propertyContext.boundedContextMetadata.selectedCount <= 4 &&
    propertyContext.allowedActions.includes("preview") &&
    propertyContext.liveActionsEnabled === false,
  "J Navigator bounded Property context returns read-only preview",
  propertyContext.boundedContextMetadata
);

const lisaExplanation = createLisaPropertyPassportExplanation(propertyContext);
check(
  lisaExplanation.roleId === "LISA_ESSA_PRODUCT_GUIDE" &&
    lisaExplanation.mayMutateCharacterCore === false &&
    lisaExplanation.truthfulLimitations.some((item) => item.includes("Live property search is not active")) &&
    lisaExplanation.providerCalls === 0,
  "K LISA truthful explanation preserves limitations",
  lisaExplanation
);

const navigatorDiscovery = buildNavigatorProductDiscoveryResponse({
  query: "Что сейчас умеет ESSA Property?"
});
check(
  navigatorDiscovery.matchedProducts[0]?.productId === productIds.property &&
    navigatorDiscovery.matchedCapabilities[0]?.capabilityId === "PROPERTY_ANALYZE" &&
    navigatorDiscovery.executionPerformed === false,
  "L Navigator Product Knowledge resolves ESSA Property truthfully",
  {
    products: navigatorDiscovery.matchedProducts,
    capabilities: navigatorDiscovery.matchedCapabilities,
    limitations: navigatorDiscovery.limitations
  }
);

const contextPack = await buildContextPack({
  userText: "Объясни Property Passport для квартиры в Батуми"
});
check(
  contextPack.propertyContext?.passport?.propertyId === fixtureBatumiUnitProperty.propertyId &&
    contextPack.contextSources.includes("property_passport") &&
    contextPack.propertyContext.providerCalls === 0,
  "M Navigator context carries bounded Property Passport context",
  {
    contextSources: contextPack.contextSources,
    propertyContext: contextPack.propertyContext?.boundedContextMetadata
  }
);

const productKnowledge = productKnowledgeNodes.find((node) => node.nodeId === "property_local_passport_preview");
const boundedProductKnowledge = buildBoundedProductKnowledgeContext({
  query: "Property Passport",
  maxItems: 3,
  maxChars: 1400
});
const contentIntent = createProductContentIntentFromEducation("education_property_passport_preview", {
  channel: "ESSA in-app"
});
check(
  productKnowledge?.productId === productIds.property &&
    productKnowledge.limitations.some((item) => item.includes("Live property search is not active")) &&
    boundedProductKnowledge.selected.length <= 3 &&
    contentIntent?.capabilityId === "PROPERTY_ANALYZE" &&
    contentIntent.requiresFreshnessCheck === true,
  "N Product Knowledge and education node for ESSA Property are factual and non-executing",
  {
    productKnowledge,
    boundedCount: boundedProductKnowledge.selected.length,
    contentIntent
  }
);

check(
  propertyFixtures.providerCalls === 0 &&
    propertyFixtures.externalCalls === 0 &&
    propertyFixtures.dbMutations === 0 &&
    propertyFixtures.payments === 0 &&
    passport.protectedViewMetadata.dbMutations === 0 &&
    passport.protectedViewMetadata.payments === 0,
  "O Phase 22A local fixtures/passport have zero side effects",
  {
    fixtures: {
      providerCalls: propertyFixtures.providerCalls,
      externalCalls: propertyFixtures.externalCalls,
      dbMutations: propertyFixtures.dbMutations,
      payments: propertyFixtures.payments
    },
    passport: passport.protectedViewMetadata
  }
);

assert.equal(failures, 0);
console.log("Property canonical contracts tests passed.");
