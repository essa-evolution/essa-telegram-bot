import assert from "assert";
import fs from "fs";
import {
  addPropertyEligibilityStatuses,
  addPropertyWorkflowStages,
  buildAddPropertyWorkflowStageProgress,
  buildAuthorityWithStatus,
  buildMembershipWithStatus,
  buildPropertyActorAuthorityFixtureSet,
  buildPropertyActorRelationshipSummary,
  createActorCapabilityGrant,
  createActorIdentity,
  createAddPropertyIntent,
  createAddPropertyReviewPipelineBridge,
  createAuthorityEvidence,
  createAuthorityGrant,
  createBusinessEntityOrganizationBridge,
  createLisaAddPropertyAuthorityExplanation,
  createNavigatorAddPropertyRoutingReadiness,
  createOrganization,
  createOrganizationMembership,
  createPropertyRelationship,
  createPublicSafeAuthorityReadModel,
  propertyActorCapabilities,
  propertyActorIdentityStatuses,
  propertyAuthorityActions,
  propertyAuthorityEvidenceTypes,
  propertyAuthoritySideEffectCounters,
  propertyAuthorityStatuses,
  propertyAuthorityTypes,
  propertyCapabilityGrantStatuses,
  propertyMembershipStatuses,
  propertyOrganizationStatuses,
  propertyOrganizationTypes,
  propertyRelationshipStatuses,
  propertyRelationshipTypes,
  resolveActorAuthorityForAction,
  validateActorIdentity,
  validateAddPropertyIntentContract,
  validateAddPropertyIntentEligibility,
  validateAuthorityEvidence,
  validateAuthorityGrant,
  validateOrganization,
  validateOrganizationMembership,
  validatePropertyRelationship
} from "../src/property/index.js";

function pass(label, value = undefined) {
  console.log(`PASS ${label}`);
  if (value !== undefined) console.log(JSON.stringify(value, null, 2));
}

function runEligibility(fixture, intent, overrides = {}) {
  return validateAddPropertyIntentEligibility({
    intent,
    actors: fixture.actors,
    organizations: fixture.organizations,
    memberships: fixture.memberships,
    capabilityGrants: fixture.capabilityGrants,
    relationships: fixture.relationships,
    authorityGrants: fixture.authorityGrants,
    authorityEvidence: fixture.authorityEvidence,
    jurisdictionContexts: fixture.jurisdictionContexts,
    timestamp: fixture.now,
    ...overrides
  });
}

function without(items, key, value) {
  return items.filter((item) => item[key] !== value);
}

const fixture = buildPropertyActorAuthorityFixtureSet();
const ownerIntent = fixture.intents.ownerSale;
const developerIntent = fixture.intents.developerInScope;
const agentIntent = fixture.intents.agentWithMandate;
const managerIntent = fixture.intents.managerOperational;
const aliceAuthority = fixture.authorityGrants.find((item) => item.authorityGrantId === ownerIntent.authorityGrantId);
const danaMembership = fixture.memberships.find((item) => item.actorId === developerIntent.actorId);

const actor = createActorIdentity({ actorId: "actor_test", displayName: "Test Actor", identityStatus: propertyActorIdentityStatuses.verifiedLocalProof });
assert.ok(validateActorIdentity(actor).ok);
pass("1 Actor contract validity", actor);

const org = createOrganization({
  organizationId: "org_test",
  organizationType: propertyOrganizationTypes.realEstateAgency,
  displayName: "Test Agency",
  organizationStatus: propertyOrganizationStatuses.activeLocalProof
});
assert.ok(validateOrganization(org).ok);
pass("2 Organization contract validity", org);

const bridge = createBusinessEntityOrganizationBridge({
  businessEntityId: fixture.publicBusinessEntities[0].businessId,
  organizationId: fixture.organizations[0].organizationId,
  evidenceRefs: [{ refType: "AuthorityEvidence", refId: "evidence_org_registration_developer" }],
  sourceRefs: fixture.publicBusinessEntities[0].sourceRefs
});
assert.equal(bridge.auditMetadata.copiesBusinessEntityPayload, false);
pass("3 BusinessEntity bridge avoids payload copy", bridge);

const membership = createOrganizationMembership({
  membershipId: "membership_test",
  actorId: actor.actorId,
  organizationId: org.organizationId,
  membershipStatus: propertyMembershipStatuses.activeLocalProof
});
assert.ok(validateOrganizationMembership(membership).ok);
pass("4 Membership contract", membership);

assert.ok(Object.values(propertyMembershipStatuses).includes("REVOKED"));
assert.ok(Object.values(propertyMembershipStatuses).includes("SUSPENDED"));
pass("5 Membership lifecycle includes blocking states", propertyMembershipStatuses);

const capabilityGrant = createActorCapabilityGrant({
  capabilityGrantId: "grant_test",
  actorId: actor.actorId,
  capability: propertyActorCapabilities.submitPropertyData,
  status: propertyCapabilityGrantStatuses.activeLocalProof
});
assert.equal(capabilityGrant.auditMetadata.capabilityIsNotPropertyAuthority, true);
pass("6 Capability grant is separate from authority", capabilityGrant);

const relationship = createPropertyRelationship({
  relationshipId: "rel_test_owner",
  actorId: actor.actorId,
  propertyId: "prop_test",
  relationshipType: propertyRelationshipTypes.owner,
  relationshipStatus: propertyRelationshipStatuses.activeLocalProof
});
assert.ok(validatePropertyRelationship(relationship).ok);
pass("7 PropertyRelationship contract", relationship);

const miaOwnerA = runEligibility(fixture, fixture.intents.miaOwnerA);
const miaAgentB = runEligibility(fixture, fixture.intents.miaAgentB);
const miaBuyerC = runEligibility(fixture, fixture.intents.miaBuyerC);
assert.ok(miaOwnerA.ok);
assert.ok(miaAgentB.ok);
assert.equal(miaBuyerC.status, addPropertyEligibilityStatuses.blockedRelationship);
pass("8 multi-property relationship isolation", { ownerA: miaOwnerA.status, agentB: miaAgentB.status, buyerC: miaBuyerC.status });

const authority = createAuthorityGrant({
  authorityGrantId: "auth_test",
  actorId: actor.actorId,
  relationshipId: relationship.relationshipId,
  propertyId: "prop_test",
  authorityType: propertyAuthorityTypes.ownerSelfAuthority,
  allowedActions: [propertyAuthorityActions.addProperty],
  status: propertyAuthorityStatuses.activeLocalProof,
  evidenceRefs: [{ refType: "AuthorityEvidence", refId: "evidence_test" }]
});
assert.ok(validateAuthorityGrant(authority).ok);
pass("9 AuthorityGrant contract", authority);

assert.ok(Object.values(propertyAuthorityStatuses).includes("EXPIRED"));
assert.ok(Object.values(propertyAuthorityStatuses).includes("JURISDICTION_BLOCKED"));
pass("10 Authority lifecycle includes blocked states", propertyAuthorityStatuses);

const outOfScope = runEligibility(fixture, fixture.intents.developerOutOfScope);
assert.equal(outOfScope.status, addPropertyEligibilityStatuses.blockedScope);
pass("11 Authority scope blocks project/building mismatch", outOfScope.blockedReasons);

const deniedSale = runEligibility(fixture, fixture.intents.managerSaleAttempt);
assert.equal(deniedSale.status, addPropertyEligibilityStatuses.blockedScope);
assert.ok(deniedSale.blockedReasons.some((reason) => reason.includes("denied") || reason.includes("not_allowed") || reason.includes("relationship_action")));
pass("12 denied actions block sale attempt", deniedSale.blockedReasons);

const evidence = createAuthorityEvidence({
  authorityEvidenceId: "evidence_test",
  evidenceType: propertyAuthorityEvidenceTypes.ownershipDocument,
  actorId: actor.actorId,
  propertyId: "prop_test",
  documentRef: "protected_doc_ref_test",
  evidenceRef: "review_ref_test",
  sourceRefs: [{ sourceId: "source_test" }]
});
assert.ok(validateAuthorityEvidence(evidence).ok);
pass("13 AuthorityEvidence contract", evidence);

assert.ok(fixture.authorityEvidence.every((item) => item.sourceRefs.length > 0 && (item.documentRef || item.evidenceRef)));
pass("14 evidence lineage preserved", fixture.authorityEvidence.map((item) => item.authorityEvidenceId));

const evidenceAlone = runEligibility(fixture, ownerIntent, { authorityGrants: [], relationships: [], authorityEvidence: fixture.authorityEvidence });
assert.equal(evidenceAlone.status, addPropertyEligibilityStatuses.blockedRelationship);
pass("15 evidence alone does not activate authority", evidenceAlone.status);

assert.ok(validateAddPropertyIntentContract(ownerIntent).ok);
assert.equal(ownerIntent.auditMetadata.createsListing, false);
pass("16 AddPropertyIntent contract does not create listing", ownerIntent);

const ownerSuccess = runEligibility(fixture, ownerIntent);
assert.ok(ownerSuccess.ok);
assert.equal(ownerSuccess.status, addPropertyEligibilityStatuses.readyForLocalReview);
assert.equal(ownerSuccess.executionEligible, false);
pass("17 AddProperty eligibility success reaches local review only", ownerSuccess.status);

assert.equal(runEligibility(fixture, { ...ownerIntent, actorId: "actor_missing" }).status, addPropertyEligibilityStatuses.blockedActor);
pass("18 missing Actor blocked");

assert.equal(runEligibility(fixture, developerIntent, { organizations: [] }).status, addPropertyEligibilityStatuses.blockedOrganization);
pass("19 missing Organization blocked");

assert.equal(runEligibility(fixture, developerIntent, { memberships: [] }).status, addPropertyEligibilityStatuses.blockedMembership);
pass("20 missing Membership blocked");

assert.equal(runEligibility(fixture, developerIntent, { memberships: [buildMembershipWithStatus(danaMembership, propertyMembershipStatuses.expired)] }).status, addPropertyEligibilityStatuses.blockedExpired);
pass("21 expired Membership blocked");

assert.equal(runEligibility(fixture, developerIntent, { memberships: [buildMembershipWithStatus(danaMembership, propertyMembershipStatuses.revoked)] }).status, addPropertyEligibilityStatuses.blockedRevoked);
pass("22 revoked Membership blocked");

assert.equal(runEligibility(fixture, ownerIntent, { capabilityGrants: [] }).status, addPropertyEligibilityStatuses.blockedCapability);
pass("23 missing Capability blocked");

assert.equal(runEligibility(fixture, ownerIntent, { relationships: [] }).status, addPropertyEligibilityStatuses.blockedRelationship);
pass("24 missing Relationship blocked");

assert.equal(runEligibility(fixture, ownerIntent, { authorityGrants: [] }).status, addPropertyEligibilityStatuses.blockedAuthority);
pass("25 missing Authority blocked");

assert.equal(runEligibility(fixture, ownerIntent, { authorityEvidence: [] }).status, addPropertyEligibilityStatuses.blockedEvidence);
pass("26 missing Evidence blocked");

assert.equal(runEligibility(fixture, ownerIntent, { authorityGrants: [buildAuthorityWithStatus(aliceAuthority, propertyAuthorityStatuses.expired)] }).status, addPropertyEligibilityStatuses.blockedExpired);
pass("27 expired Authority blocked");

assert.equal(runEligibility(fixture, ownerIntent, { authorityGrants: [buildAuthorityWithStatus(aliceAuthority, propertyAuthorityStatuses.revoked)] }).status, addPropertyEligibilityStatuses.blockedRevoked);
pass("28 revoked Authority blocked");

assert.equal(runEligibility(fixture, ownerIntent, { authorityGrants: [buildAuthorityWithStatus(aliceAuthority, propertyAuthorityStatuses.suspended)] }).status, addPropertyEligibilityStatuses.blockedAuthority);
pass("29 suspended Authority blocked");

assert.equal(runEligibility(fixture, { ...ownerIntent, propertyId: "prop_other" }).status, addPropertyEligibilityStatuses.blockedScope);
pass("30 Property scope mismatch blocked");

assert.equal(outOfScope.status, addPropertyEligibilityStatuses.blockedScope);
pass("31 Project scope mismatch blocked");

const wrongAction = runEligibility(fixture, { ...ownerIntent, intendedAction: propertyAuthorityActions.requestCleaning });
assert.equal(wrongAction.status, addPropertyEligibilityStatuses.blockedScope);
pass("32 action scope mismatch blocked", wrongAction.blockedReasons);

assert.equal(runEligibility(fixture, ownerIntent, { authorityGrants: [buildAuthorityWithStatus(aliceAuthority, propertyAuthorityStatuses.jurisdictionBlocked)] }).status, addPropertyEligibilityStatuses.blockedJurisdiction);
pass("33 jurisdiction blocked");

assert.ok(ownerSuccess.ok);
pass("34 Owner fixture success-to-review");

const ownerNoEvidenceAuthority = createAuthorityGrant({
  ...aliceAuthority,
  authorityGrantId: "auth_alice_owner_no_evidence",
  relationshipId: fixture.intents.ownerClaimNoEvidence.relationshipClaimId,
  propertyId: null,
  propertyCandidateRef: fixture.intents.ownerClaimNoEvidence.propertyCandidateRef,
  status: propertyAuthorityStatuses.pendingEvidence,
  evidenceRefs: []
});
const ownerClaimWithoutEvidence = runEligibility(fixture, {
  ...fixture.intents.ownerClaimNoEvidence,
  authorityGrantId: ownerNoEvidenceAuthority.authorityGrantId
}, {
  relationships: [
    ...fixture.relationships.filter((item) => item.relationshipId !== fixture.intents.ownerClaimNoEvidence.relationshipClaimId),
    { ...fixture.relationships.find((item) => item.relationshipId === fixture.intents.ownerClaimNoEvidence.relationshipClaimId), relationshipStatus: propertyRelationshipStatuses.activeLocalProof }
  ],
  authorityGrants: [...fixture.authorityGrants, ownerNoEvidenceAuthority]
});
assert.ok([
  addPropertyEligibilityStatuses.blockedEvidence,
  addPropertyEligibilityStatuses.blockedAuthority
].includes(ownerClaimWithoutEvidence.status));
assert.ok(ownerClaimWithoutEvidence.blockedReasons.includes("authority_evidence_missing") || ownerClaimWithoutEvidence.blockedReasons.includes("authority_not_active"));
pass("35 owner claim without evidence blocked", ownerClaimWithoutEvidence.blockedReasons);

assert.ok(runEligibility(fixture, developerIntent).ok);
pass("36 Developer representative in scope");

assert.equal(outOfScope.status, addPropertyEligibilityStatuses.blockedScope);
pass("37 Developer representative out of scope");

assert.ok(runEligibility(fixture, agentIntent).ok);
pass("38 Agency Agent with mandate");

const agentWithoutMandate = runEligibility(fixture, fixture.intents.agentWithoutMandate);
assert.equal(agentWithoutMandate.status, addPropertyEligibilityStatuses.blockedAuthority);
pass("39 Agent without mandate blocked", agentWithoutMandate.blockedReasons);

assert.ok(runEligibility(fixture, managerIntent).ok);
pass("40 Property Manager operational authority");

assert.equal(deniedSale.status, addPropertyEligibilityStatuses.blockedScope);
pass("41 Property Manager sale attempt blocked");

const cleaningOrg = fixture.organizations.find((item) => item.organizationType === propertyOrganizationTypes.serviceProvider);
assert.ok(cleaningOrg);
assert.ok(!fixture.relationships.some((item) => item.organizationId === cleaningOrg.organizationId));
pass("42 Cleaning Company service-provider separation", cleaningOrg);

const cleaningSale = runEligibility(fixture, fixture.intents.cleaningCompanySaleAttempt);
const cleaningSaleWithPlatformCapability = runEligibility(fixture, fixture.intents.cleaningCompanySaleAttempt, {
  capabilityGrants: [
    ...fixture.capabilityGrants,
    createActorCapabilityGrant({
      capabilityGrantId: "grant_chris_synthetic_sale_capability",
      actorId: fixture.intents.cleaningCompanySaleAttempt.actorId,
      organizationId: fixture.intents.cleaningCompanySaleAttempt.organizationId,
      capability: propertyActorCapabilities.submitAgencyListing,
      status: propertyCapabilityGrantStatuses.activeLocalProof
    })
  ]
});
assert.equal(cleaningSaleWithPlatformCapability.status, addPropertyEligibilityStatuses.blockedRelationship);
pass("43 Cleaning Company cannot list Property", cleaningSaleWithPlatformCapability.status);

const reviewerAttempt = runEligibility(fixture, fixture.intents.reviewerRoleAttempt);
assert.equal(reviewerAttempt.status, addPropertyEligibilityStatuses.blockedCapability);
pass("44 Reviewer role cannot create Property authority", reviewerAttempt.status);

const fakeExecutionApproval = { approvalToken: "approved_by_gateway_but_not_authority" };
assert.equal(runEligibility(fixture, agentWithoutMandate.intent, { executionApproval: fakeExecutionApproval }).status, addPropertyEligibilityStatuses.blockedAuthority);
pass("45 Execution approval cannot substitute authority");

assert.equal(runEligibility(fixture, fixture.sourceOnlyIntents.agencyFeedOnly).status, addPropertyEligibilityStatuses.blockedRelationship);
pass("46 AGENCY_FEED cannot substitute authority");

assert.equal(runEligibility(fixture, fixture.sourceOnlyIntents.ownerSubmissionOnly).status, addPropertyEligibilityStatuses.blockedRelationship);
pass("47 OWNER_SUBMISSION cannot substitute authority");

assert.equal(runEligibility(fixture, fixture.sourceOnlyIntents.developerFeedOnly).status, addPropertyEligibilityStatuses.blockedRelationship);
pass("48 DEVELOPER_FEED cannot substitute authority");

const publicSafe = createPublicSafeAuthorityReadModel({
  organization: fixture.organizations[0],
  relationship: fixture.relationships[0],
  authority: aliceAuthority,
  evidence: fixture.authorityEvidence
});
const publicSafeText = JSON.stringify(publicSafe);
assert.equal(publicSafe.privateEvidenceDocumentsExposed, false);
assert.ok(!publicSafeText.includes("protected_doc_ref"));
assert.ok(!publicSafeText.includes("secret"));
pass("49 public-safe read model privacy", publicSafe);

const explanation = resolveActorAuthorityForAction({
  intent: ownerIntent,
  actor: ownerSuccess.actor,
  relationship: ownerSuccess.relationship,
  capabilityGrant: ownerSuccess.capabilityGrant,
  authorityGrants: [ownerSuccess.authorityGrant],
  authorityEvidence: fixture.authorityEvidence,
  jurisdictionContexts: fixture.jurisdictionContexts,
  timestamp: fixture.now
});
assert.equal(explanation.modelType, "AuthorityExplanation");
assert.equal(explanation.authorizedLocalProof, true);
pass("50 AuthorityExplanation", explanation);

const progression = buildAddPropertyWorkflowStageProgress(ownerSuccess);
assert.ok(progression.stages.some((stage) => stage.stage === "ROUTE_TO_REVIEW" && stage.status === "COMPLETE_LOCAL_CONTRACT_PROOF"));
assert.equal(progression.executionStageReached, false);
assert.deepEqual(addPropertyWorkflowStages.slice(0, 10), [
  "IDENTIFY_ACTOR",
  "RESOLVE_ORGANIZATION",
  "RESOLVE_MEMBERSHIP",
  "CLAIM_PROPERTY_RELATIONSHIP",
  "COLLECT_AUTHORITY_EVIDENCE",
  "VALIDATE_AUTHORITY",
  "IDENTIFY_EXISTING_PROPERTY_OR_CANDIDATE",
  "CREATE_ADD_PROPERTY_INTENT",
  "VALIDATE_INTENT",
  "ROUTE_TO_REVIEW"
]);
pass("51 Add Property workflow stage progression", progression.terminalStage);

const bridgePayload = createAddPropertyReviewPipelineBridge(ownerSuccess);
assert.equal(bridgePayload.duplicateReviewQueueCreated, false);
assert.equal(bridgePayload.dispatchPerformed, false);
assert.ok(bridgePayload.readyForExistingReviewWorkflow);
pass("52 review pipeline bridge", bridgePayload.payload.limitations);

const navigator = createNavigatorAddPropertyRoutingReadiness();
assert.equal(navigator.navigatorCanBypassAuthority, false);
assert.ok(navigator.blockedNow.includes("activate_authority"));
pass("53 Navigator cannot bypass authority", navigator);

const lisa = createLisaAddPropertyAuthorityExplanation(ownerSuccess);
assert.equal(lisa.mayApproveExecution, false);
assert.equal(lisa.mayActivateAuthority, false);
pass("54 Lisa cannot approve authority", lisa);

assert.equal(ownerSuccess.canonicalPropertyMutation, 0);
pass("55 no canonical Property mutation");

assert.equal(ownerSuccess.listingMutation, 0);
pass("56 no listing mutation");

assert.equal(ownerSuccess.providerCalls, 0);
pass("57 no provider calls");

assert.equal(ownerSuccess.externalCalls, 0);
pass("58 no external calls");

assert.equal(ownerSuccess.productionDbMutations, 0);
pass("59 no production DB mutation");

assert.equal(ownerSuccess.paymentActions, 0);
assert.equal(ownerSuccess.bookingActions, 0);
assert.equal(ownerSuccess.commercialTransactionActions, 0);
pass("60 no payment/booking/transaction", {
  paymentActions: ownerSuccess.paymentActions,
  bookingActions: ownerSuccess.bookingActions,
  commercialTransactionActions: ownerSuccess.commercialTransactionActions
});

const summary = buildPropertyActorRelationshipSummary({
  intent: ownerIntent,
  relationship: ownerSuccess.relationship,
  organization: ownerSuccess.organization,
  authorityExplanation: ownerSuccess.authorityExplanation
});
assert.equal(summary.modelType, "PropertyActorRelationshipSummary");
assert.ok(!JSON.stringify(summary).includes("protected_doc_ref"));
pass("61 PropertyActorRelationshipSummary is safe bounded read model", summary);

const source = fs.readFileSync("src/property/propertyActorAuthority.js", "utf8");
assert.ok(!source.includes("fetch("));
assert.ok(!source.includes("axios."));
assert.ok(!source.includes("createClient("));
assert.ok(!source.includes("supabase."));
assert.ok(!source.includes("publishListing"));
assert.ok(!source.includes("createPayment"));
assert.ok(!source.includes("bookProperty"));
pass("62 authority module has no provider/db/publish/payment dispatch path");

Object.entries(propertyAuthoritySideEffectCounters).forEach(([key, value]) => {
  assert.equal(value, 0, `${key} should be zero`);
});
pass("63 canonical side-effect counters are zero", propertyAuthoritySideEffectCounters);

console.log("Property actor authority tests passed.");
