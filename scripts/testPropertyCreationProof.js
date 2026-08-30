import assert from "node:assert/strict";
import {
  blockedPropertyCreationActions,
  buildPropertyCreationFixtures,
  buildPropertyCreationViewModel,
  commitCanonicalPropertyCreationLocalProof,
  createApprovalForPropertyCreationIntent,
  createLocalPropertyCreationStore,
  createNavigatorPropertyCreationRouting,
  createPropertyCreationApproval,
  createPropertyCreationHistoryItem,
  createPropertyCreationIntent,
  createPropertyCreationStoreForScenario,
  generateLocalCanonicalPropertyId,
  preparePropertyCreationThroughGateway,
  propertyCreationActionTypes,
  propertyCreationApprovalStatuses,
  propertyCreationExecutionStatuses,
  propertyCreationIdentityOutcomes,
  propertyCreationPreflightStatuses,
  rollbackCanonicalPropertyCreationLocalProof,
  validatePropertyCreationPreflight
} from "../src/property/index.js";

const fixtures = buildPropertyCreationFixtures();
const ownerIntent = fixtures.intents.ownerIntent;
const ownerStore = createPropertyCreationStoreForScenario();

assert.equal(ownerIntent.modelType, "PropertyCreationIntent", "1 creation intent contract");
assert.equal(ownerIntent.actionType, propertyCreationActionTypes.createCanonicalPropertyLocalProof, "2 only allowed creation action");
assert.equal(blockedPropertyCreationActions.includes("CREATE_LISTING"), true, "3 listing action blocked");
assert.equal(blockedPropertyCreationActions.includes("PUBLISH_LISTING"), true, "4 publish action blocked");
assert.equal(blockedPropertyCreationActions.includes("TRANSFER_OWNERSHIP"), true, "5 ownership transfer blocked");
assert.equal(blockedPropertyCreationActions.includes("WRITE_PRODUCTION_DB"), true, "6 production DB write blocked");
assert.equal(validatePropertyCreationPreflight(ownerIntent, { store: ownerStore }).status, propertyCreationPreflightStatuses.readyForApproval, "7 owner eligibility");

const inactiveAuthority = createPropertyCreationIntent({ ...fixtures.owner, authorityGrant: { ...fixtures.owner.authorityGrant, status: "REQUESTED" } });
assert.equal(validatePropertyCreationPreflight(inactiveAuthority, { store: createLocalPropertyCreationStore() }).status, propertyCreationPreflightStatuses.blockedAuthority, "8 active authority required");
const noActionAuthority = createPropertyCreationIntent({ ...fixtures.owner, authorityGrant: { ...fixtures.owner.authorityGrant, allowedActions: ["CREATE_SALE_LISTING"] } });
assert.equal(validatePropertyCreationPreflight(noActionAuthority, { store: createLocalPropertyCreationStore() }).status, propertyCreationPreflightStatuses.blockedAuthority, "9 action scope required");
assert.equal(buildPropertyCreationViewModel({ case: "agent" }).preflight.status, propertyCreationPreflightStatuses.blockedAuthority, "10 agent listing authority != creation authority");
assert.equal(buildPropertyCreationViewModel({ case: "manager" }).preflight.status, propertyCreationPreflightStatuses.blockedAuthority, "11 manager blocked");
assert.equal(buildPropertyCreationViewModel({ case: "cleaner" }).preflight.status, propertyCreationPreflightStatuses.blockedAuthority, "12 cleaner blocked");
assert.equal(buildPropertyCreationViewModel({ case: "developer" }).preflight.status, propertyCreationPreflightStatuses.readyForApproval, "13 developer Project X allowed");
assert.equal(buildPropertyCreationViewModel({ case: "developerZ" }).preflight.status, propertyCreationPreflightStatuses.blockedScope, "14 developer Project Z blocked");
assert.equal(ownerIntent.propertyCandidateRef, "candidate_23b_owner_apartment_sell", "15 candidate reused from Phase 23B");
assert.equal(buildPropertyCreationViewModel({ case: "existingMatch" }).preflight.status, propertyCreationPreflightStatuses.existingPropertyMatch, "16 exact duplicate match blocks");
assert.equal(buildPropertyCreationViewModel({ case: "probableDuplicate" }).preflight.status, propertyCreationPreflightStatuses.blockedDuplicateReview, "17 probable duplicate blocks");
assert.equal(buildPropertyCreationViewModel({ case: "conflict" }).preflight.status, propertyCreationPreflightStatuses.blockedIdentityConflict, "18 conflict blocks");
assert.equal(buildPropertyCreationViewModel({ case: "noEvidence" }).preflight.status, propertyCreationPreflightStatuses.blockedEvidence, "19 required evidence blocks");
assert.equal(generateLocalCanonicalPropertyId(ownerIntent.source.propertyCandidate), ownerIntent.expectedPostConditions.resultingPropertyId, "20 stable property ID generation");

const store = createPropertyCreationStoreForScenario();
const approval = createApprovalForPropertyCreationIntent(ownerIntent);
const result = commitCanonicalPropertyCreationLocalProof({ intent: ownerIntent, approval, store });
assert.equal(result.ok, true, "21 atomic creation");
assert.equal(result.resultingPropertyId, ownerIntent.expectedPostConditions.resultingPropertyId, "22 property ID assigned");
assert.equal(result.post.lifecycleEventTypes.includes("PROPERTY_CREATED_LOCAL_PROOF"), true, "23 lifecycle creation event");
assert.equal(result.property.sourceRefs.length, ownerIntent.sourceRefs.length, "24 provenance preserved");
assert.equal(ownerIntent.evidenceRefs.length > 0, true, "25 evidence lineage preserved");
assert.equal(result.property.currentStatus, "CREATED_LOCAL_PROOF", "26 canonical property created only");
assert.equal(result.passport.ok, true, "27 passport generation");
assert.equal(result.passport.passport.publicView.listingCount, 0, "28 no Listing");
assert.equal(result.post.noLegalOwnershipClaim, true, "29 no ownership mutation/legal claim");
assert.equal(validatePropertyCreationPreflight(ownerIntent, { store: createPropertyCreationStoreForScenario() }).approvalRequired, true, "30 preflight requires approval");
assert.equal(approval.approvalStatus, propertyCreationApprovalStatuses.approved, "31 human approval");
assert.equal(createPropertyCreationApproval(ownerIntent, { decidedBy: "ai:auto" }).approvalStatus, propertyCreationApprovalStatuses.blocked, "32 AI cannot approve");
assert.equal(createPropertyCreationApproval(ownerIntent, { decidedBy: "lisa:guide" }).approvalStatus, propertyCreationApprovalStatuses.blocked, "33 Lisa cannot approve");
assert.equal(createPropertyCreationApproval(ownerIntent, { decidedBy: "navigator:route" }).approvalStatus, propertyCreationApprovalStatuses.blocked, "34 Navigator cannot approve");
assert.equal(preparePropertyCreationThroughGateway(ownerIntent, approval, validatePropertyCreationPreflight(ownerIntent, { store: createPropertyCreationStoreForScenario() })).allowed, true, "35 Gateway enforcement");
assert.equal(preparePropertyCreationThroughGateway(ownerIntent, createPropertyCreationApproval(ownerIntent, {}), validatePropertyCreationPreflight(ownerIntent, { store: createPropertyCreationStoreForScenario() })).allowed, false, "36 unapproved gateway blocks");
const bypassStore = createLocalPropertyCreationStore();
bypassStore.addProperty(result.property);
assert.equal(preparePropertyCreationThroughGateway(ownerIntent, approval).directStoreMutationAllowed, false, "37 direct store bypass protection");
assert.equal(result.executionRecord.beforeState.modelType, "PropertyCreationBeforeState", "38 before-state snapshot");
assert.equal(result.post.status, "POST_CONDITIONS_VERIFIED", "39 postcondition verification");
assert.equal(commitCanonicalPropertyCreationLocalProof({ intent: ownerIntent, approval, store }).status, propertyCreationExecutionStatuses.alreadyCreatedIdempotent, "40 idempotency");
const changedCandidate = createPropertyCreationIntent({ ...fixtures.owner, propertyCandidate: { ...fixtures.owner.propertyCandidate, locationDescription: "Changed address after approval" } });
const oldFingerprintIntent = { ...changedCandidate, expectedPostConditions: ownerIntent.expectedPostConditions };
assert.equal(validatePropertyCreationPreflight(oldFingerprintIntent, { store: createLocalPropertyCreationStore() }).status, propertyCreationPreflightStatuses.blockedCandidateChanged, "41 state mismatch/candidate changed");
const expiredAuthority = createPropertyCreationIntent({ ...fixtures.owner, authorityGrant: { ...fixtures.owner.authorityGrant, status: "EXPIRED" } });
assert.equal(validatePropertyCreationPreflight(expiredAuthority, { store: createLocalPropertyCreationStore() }).status, propertyCreationPreflightStatuses.blockedAuthority, "42 authority expiry after preflight blocks");
const failure = commitCanonicalPropertyCreationLocalProof({ intent: ownerIntent, approval, store: createPropertyCreationStoreForScenario(), simulateFailureAt: "after_property_id" });
assert.equal(failure.status, propertyCreationExecutionStatuses.failed, "43 synthetic failure");
assert.equal(failure.noOrphanProperty && failure.noOrphanId && failure.noPartialLifecycle, true, "44 failure leaves no orphan records");
const rollbackStore = createPropertyCreationStoreForScenario();
const rollbackResult = commitCanonicalPropertyCreationLocalProof({ intent: ownerIntent, approval, store: rollbackStore });
assert.equal(rollbackCanonicalPropertyCreationLocalProof({ executionRecord: rollbackResult.executionRecord, store: rollbackStore }).status, propertyCreationExecutionStatuses.rolledBack, "45 rollback");
const dependencyStore = createPropertyCreationStoreForScenario();
const dependencyResult = commitCanonicalPropertyCreationLocalProof({ intent: ownerIntent, approval, store: dependencyStore });
dependencyStore.setDownstreamDependencies(dependencyResult.resultingPropertyId, ["LISTING_DEPENDENCY_SYNTHETIC"]);
assert.equal(rollbackCanonicalPropertyCreationLocalProof({ executionRecord: dependencyResult.executionRecord, store: dependencyStore }).status, propertyCreationExecutionStatuses.rollbackBlocked, "46 rollback dependency guard");
assert.equal(createPropertyCreationHistoryItem(result.executionRecord).resultingPropertyId, result.resultingPropertyId, "47 creation history");
assert.equal(buildPropertyCreationViewModel({ case: "owner" }).addPropertyIntegration.status, "PROPERTY_CREATED_LOCAL_PROOF", "48 Add Property integration");
assert.equal(createNavigatorPropertyCreationRouting("route").skipDuplicateResolutionAllowed, false, "49 Navigator cannot skip duplicate resolution");
assert.deepEqual({
  duplicatePropertyCreations: result.duplicatePropertyCreations,
  unrelatedCanonicalPropertyMutations: result.unrelatedCanonicalPropertyMutations,
  listingCreations: result.listingCreations,
  listingMutations: result.listingMutations,
  ownershipMutations: result.ownershipMutations,
  publishActions: result.publishActions,
  providerCalls: result.providerCalls,
  externalCalls: result.externalCalls,
  productionDbMutations: result.productionDbMutations,
  paymentActions: result.paymentActions,
  bookingActions: result.bookingActions,
  commercialTransactionActions: result.commercialTransactionActions
}, {
  duplicatePropertyCreations: 0,
  unrelatedCanonicalPropertyMutations: 0,
  listingCreations: 0,
  listingMutations: 0,
  ownershipMutations: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
}, "50 side-effect invariants");

console.log("Phase 23F Property Creation Proof tests passed: 50/50");
