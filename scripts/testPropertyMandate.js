import assert from "assert";
import {
  buildMandateFixtures,
  buildPropertyMandateDraft,
  buildPropertyMandateFlowViewModel,
  createLisaMandateGuideExplanation,
  createMandateJurisdictionRequirement,
  createMandateSupersession,
  createNavigatorMandateRouting,
  createPropertyMandateRequest,
  createPropertyMandateRevocationIntent,
  diffPropertyMandateDrafts,
  mandateActionTemplates,
  mapMandateDraftToProposedAuthorityGrant,
  propertyMandateEligibilityStatuses,
  propertyMandateExclusivityStates,
  propertyMandateRequestStatuses,
  propertyMandateSignatureStatuses,
  propertyMandateTypes,
  proposedAuthorityGrantStatuses,
  validatePropertyMandateRequest
} from "../src/property/index.js";

function pass(label) {
  console.log(`PASS ${label}`);
}

function assertZero(value) {
  assert.equal(value.canonicalPropertyMutation, 0);
  assert.equal(value.listingMutation, 0);
  assert.equal(value.ownershipMutation, 0);
  assert.equal(value.publishActions, 0);
  assert.equal(value.providerCalls, 0);
  assert.equal(value.externalCalls, 0);
  assert.equal(value.productionDbMutations, 0);
  assert.equal(value.paymentActions, 0);
  assert.equal(value.bookingActions, 0);
  assert.equal(value.commercialTransactionActions, 0);
}

const { fixtures, requests } = buildMandateFixtures();

assert.equal(requests.ownerAgentRequest.modelType, "PropertyMandateRequest");
assert.equal(requests.ownerAgentRequest.mandateRequestId, "mandate_owner_agent_sale_v1");
pass("1 mandate request contract");

assert(Object.values(propertyMandateTypes).includes("OWNER_TO_AGENT_LISTING_MANDATE"));
assert(Object.values(propertyMandateTypes).includes("TEMPORARY_SERVICE_ACCESS_AUTHORIZATION"));
pass("2 mandate types");

assert.notEqual(requests.ownerAgentRequest.grantorActorId, requests.ownerAgentRequest.granteeActorId);
assert.equal(requests.ownerAgentRequest.grantorActorId, "actor_owner_alice");
assert.equal(requests.ownerAgentRequest.granteeActorId, "actor_agent_bob");
pass("3 grantor/grantee separation");

assert(Object.values(propertyMandateRequestStatuses).includes("READY_FOR_REVIEW"));
assert(!Object.values(propertyMandateRequestStatuses).includes("SIGNED"));
pass("4 mandate lifecycle");

assert(requests.ownerAgentRequest.requestedActions.includes("CREATE_SALE_LISTING"));
assert(requests.ownerAgentRequest.deniedActions.includes("TRANSFER_OWNERSHIP"));
pass("5 owner-agent scope");

assert.equal(requests.ownerAgentRequest.exclusivity, propertyMandateExclusivityStates.nonExclusive);
pass("6 exclusive/non-exclusive metadata");

assert(requests.ownerManager.requestedActions.includes("REQUEST_CLEANING"));
assert(requests.ownerManager.deniedActions.includes("START_SALE_WORKFLOW"));
pass("7 manager scope");

assert.equal(requests.developerRepresentative.projectId, "project_green_tower");
assert(requests.developerRepresentative.requestedActions.includes("SUBMIT_UNIT_INVENTORY"));
pass("8 developer scope");

assert.equal(requests.tempCleaning.requestedMandateType, propertyMandateTypes.temporaryServiceAccessAuthorization);
assert.equal(requests.tempCleaning.serviceAccess.serviceType, "CLEANING");
pass("9 temporary access");

assert(requests.tempCleaning.deniedActions.includes("CREATE_SALE_LISTING"));
assert(requests.ownerManager.deniedActions.includes("TRANSFER_OWNERSHIP"));
pass("10 denied action preservation");

assert(requests.ownerAgentRequest.evidenceRefs.length > 0);
assert.equal(requests.ownerAgentNoEvidence.evidenceRefs.length, 0);
pass("11 evidence requirements");

assert.equal(validatePropertyMandateRequest(requests.ownerAgentRequest, fixtures).status, propertyMandateEligibilityStatuses.readyForLocalDraft);
pass("12 eligibility resolver");

const invalidDates = createPropertyMandateRequest({
  ...requests.ownerAgentRequest,
  mandateRequestId: "mandate_invalid_dates",
  validFrom: "2026-09-01T00:00:00.000Z",
  validUntil: "2026-08-01T00:00:00.000Z"
});
assert.equal(validatePropertyMandateRequest(invalidDates, fixtures).status, propertyMandateEligibilityStatuses.invalidDateRange);
pass("13 invalid dates");

const missingGrantor = createPropertyMandateRequest({ ...requests.ownerAgentRequest, mandateRequestId: "missing_grantor", grantorActorId: "missing_actor" });
assert.equal(validatePropertyMandateRequest(missingGrantor, fixtures).status, propertyMandateEligibilityStatuses.grantorRequired);
pass("14 missing grantor");

const missingGrantee = createPropertyMandateRequest({ ...requests.ownerAgentRequest, mandateRequestId: "missing_grantee", granteeActorId: "missing_actor" });
assert.equal(validatePropertyMandateRequest(missingGrantee, fixtures).status, propertyMandateEligibilityStatuses.granteeRequired);
pass("15 missing grantee");

const missingProperty = createPropertyMandateRequest({ ...requests.ownerAgentRequest, mandateRequestId: "missing_property", propertyId: null, propertyCandidateRef: null, projectId: null });
assert.equal(validatePropertyMandateRequest(missingProperty, fixtures).status, propertyMandateEligibilityStatuses.propertyRequired);
pass("16 missing Property");

const noGrantorAuthority = createPropertyMandateRequest({
  ...requests.ownerAgentRequest,
  mandateRequestId: "buyer_grantor",
  grantorActorId: "actor_multi_mia",
  propertyId: "prop_mia_c"
});
assert.equal(validatePropertyMandateRequest(noGrantorAuthority, fixtures).status, propertyMandateEligibilityStatuses.blockedAuthorityEscalation);
pass("17 grantor authority required");

assert.equal(validatePropertyMandateRequest(requests.escalation, fixtures).status, propertyMandateEligibilityStatuses.blockedAuthorityEscalation);
pass("18 no authority escalation");

const circular = createPropertyMandateRequest({
  ...requests.ownerAgentRequest,
  mandateRequestId: "circular_bad",
  grantorActorId: "actor_agent_bob",
  granteeActorId: "actor_agent_bob"
});
assert.equal(validatePropertyMandateRequest(circular, fixtures).status, propertyMandateEligibilityStatuses.blockedCircularAuthority);
pass("19 no circular authority bootstrap");

const ownerDraft = buildPropertyMandateDraft(requests.ownerAgentRequest, { fixtures });
const proposed = mapMandateDraftToProposedAuthorityGrant(ownerDraft);
assert.equal(proposed.proposedAuthorityStatus, proposedAuthorityGrantStatuses.reviewRequired);
pass("20 proposed AuthorityGrant mapping");

assert.equal(proposed.activeAuthorityCreated, false);
assert.equal(proposed.status, "REQUESTED");
pass("21 draft != active authority");

const jurisdiction = createMandateJurisdictionRequirement({ jurisdiction: "UNKNOWN", mandateType: propertyMandateTypes.ownerToAgentListingMandate });
assert.equal(jurisdiction.professionalReviewRequired, true);
assert.equal(jurisdiction.signatureRequirement, propertyMandateSignatureStatuses.unknownJurisdiction);
pass("22 jurisdiction warning");

assert.equal(requests.ownerAgentRequest.signatureStatus, propertyMandateSignatureStatuses.signatureRequiredFuture);
pass("23 signature readiness");

const revocation = createPropertyMandateRevocationIntent({ mandateRequestId: requests.ownerAgentRequest.mandateRequestId, requestedBy: "actor_owner_alice" });
assert.equal(revocation.modelType, "PropertyMandateRevocationIntent");
assert.equal(revocation.auditMetadata.productionAuthorityRevoked, false);
pass("24 revocation intent");

const supersession = createMandateSupersession(ownerDraft, {
  ...requests.ownerAgentRequest,
  mandateRequestId: "mandate_owner_agent_sale_v2",
  requestedActions: [...requests.ownerAgentRequest.requestedActions, "UPDATE_PRICE"]
});
assert.equal(supersession.historyPreserved, true);
assert.equal(supersession.nextDraft.request.supersedesMandateRequestId, requests.ownerAgentRequest.mandateRequestId);
pass("25 supersession");

assert.equal(supersession.nextDraft.document.draftVersion, "2.0.0");
assert.equal(supersession.nextDraft.request.previousVersionRef, ownerDraft.document.integrityMetadata.fingerprint);
pass("26 versioning");

const diff = diffPropertyMandateDrafts(ownerDraft, supersession.nextDraft);
assert(diff.actionsAdded.includes("UPDATE_PRICE"));
assert.equal(diff.hiddenChanges, false);
pass("27 diff");

assert(ownerDraft.document.integrityMetadata.fingerprint.startsWith("mandate_fp_"));
assert.notEqual(ownerDraft.document.integrityMetadata.fingerprint, supersession.nextDraft.document.integrityMetadata.fingerprint);
pass("28 integrity fingerprint");

assert(!JSON.stringify(ownerDraft.document.evidenceSummary).includes("protected_doc_ref"));
assert.equal(buildPropertyMandateFlowViewModel({ flow: "owner-agent" }).publicSafeBoundary.publicPassportLeakage, false);
pass("29 private data protection");

const vm = buildPropertyMandateFlowViewModel({ flow: "owner-agent" });
assert.equal(vm.returnToAddProperty.status, "MANDATE_DRAFT_CREATED");
assert.equal(vm.returnToAddProperty.authorityStatus, "AUTHORITY_NOT_ACTIVE");
pass("30 Add Property integration");

assert.equal(vm.reviewPayload.modelType, "PropertyMandateReviewPayload");
assert.equal(vm.reviewPayload.duplicateReviewQueueCreated, false);
pass("31 review bridge");

assert.equal(validatePropertyMandateRequest(requests.ownerAgentRequest, fixtures).status, "READY_FOR_LOCAL_DRAFT");
pass("32 owner-agent success");

assert.equal(validatePropertyMandateRequest(requests.ownerAgentNoEvidence, fixtures).status, "EVIDENCE_REQUIRED");
pass("33 owner-agent no evidence");

assert.equal(validatePropertyMandateRequest(requests.ownerManager, fixtures).status, "READY_FOR_LOCAL_DRAFT");
pass("34 owner-manager success");

assert(requests.ownerManager.deniedActions.includes("START_SALE_WORKFLOW"));
pass("35 manager sale denied");

assert.equal(validatePropertyMandateRequest(requests.developerRepresentative, fixtures).status, "READY_FOR_LOCAL_DRAFT");
pass("36 developer representative success");

assert.equal(validatePropertyMandateRequest(requests.developerOutOfScope, fixtures).status, "INVALID_SCOPE");
pass("37 developer out-of-scope");

assert.equal(validatePropertyMandateRequest(requests.tempCleaning, fixtures).status, "READY_FOR_LOCAL_DRAFT");
pass("38 cleaning temporary access success");

assert(requests.tempCleaning.deniedActions.includes("MANAGE_PROPERTY"));
assert(requests.tempCleaning.deniedActions.includes("CREATE_LONG_TERM_RENT_LISTING"));
assert(requests.tempCleaning.deniedActions.includes("CREATE_SALE_LISTING"));
pass("39 cleaning cannot sell/rent/manage");

assert.equal(validatePropertyMandateRequest(requests.expired, fixtures).status, "EXPIRED");
pass("40 expired mandate blocked");

assert.equal(validatePropertyMandateRequest(requests.revoked, fixtures).status, "BLOCKED_REVOKED");
pass("41 revoked mandate blocked");

const lisa = createLisaMandateGuideExplanation("Is this document legally valid?", ownerDraft);
assert.equal(lisa.mayActivateAuthority, false);
assert(lisa.answer.includes("Legal sufficiency is not verified"));
pass("42 Lisa cannot activate");

const nav = createNavigatorMandateRouting("I need cleaners to enter tomorrow");
assert.equal(nav.navigatorCanApprove, false);
assert.equal(nav.route, "temporary-cleaning");
pass("43 Navigator cannot approve");

assert.equal(ownerDraft.listingMutation, 0);
pass("44 no Listing creation");

assert.equal(ownerDraft.canonicalPropertyMutation, 0);
pass("45 no canonical Property mutation");

assert.equal(ownerDraft.providerCalls, 0);
pass("46 no provider call");

assert.equal(ownerDraft.externalCalls, 0);
pass("47 no external call");

assert.equal(ownerDraft.productionDbMutations, 0);
pass("48 no production DB mutation");

assert.equal(ownerDraft.paymentActions, 0);
pass("49 no payment");

assert.equal(ownerDraft.bookingActions + ownerDraft.commercialTransactionActions, 0);
assertZero(ownerDraft);
assertZero(vm);
pass("50 no booking/transaction");

assert(mandateActionTemplates[propertyMandateTypes.ownerToAgentListingMandate].deniedActions.includes("SIGN_FINAL_SALE_CONTRACT"));

console.log("Property mandate tests passed.");
