import assert from "assert";
import {
  addPropertyFlowTypes,
  addPropertyReadinessStatuses,
  buildAddPropertyHash,
  buildGuidedAddPropertyViewModel,
  createGuidedAddPropertyProductKnowledgeUpdate,
  createPropertyCandidate,
  explainUnsureAddPropertyPath,
  parseAddPropertyHash
} from "../src/property/index.js";

function pass(label) {
  console.log(`PASS ${label}`);
}

function vm(flow, scenario = "") {
  return buildGuidedAddPropertyViewModel({ flow, scenario, step: "review_readiness" });
}

function assertZeroSideEffects(viewModel) {
  assert.equal(viewModel.canonicalPropertyMutation, 0);
  assert.equal(viewModel.listingMutation, 0);
  assert.equal(viewModel.ownershipMutation, 0);
  assert.equal(viewModel.quarantineMutation, 0);
  assert.equal(viewModel.publishActions, 0);
  assert.equal(viewModel.providerCalls, 0);
  assert.equal(viewModel.externalCalls, 0);
  assert.equal(viewModel.productionDbMutations, 0);
  assert.equal(viewModel.paymentActions, 0);
  assert.equal(viewModel.bookingActions, 0);
  assert.equal(viewModel.commercialTransactionActions, 0);
}

const entry = buildGuidedAddPropertyViewModel(parseAddPropertyHash("#add-property"));
assert.equal(entry.mode, "entry");
assert(entry.actorChoices.some((choice) => choice.flow === addPropertyFlowTypes.owner));
pass("1 route");

const parsed = parseAddPropertyHash("#add-property?flow=agent&scenario=missing-mandate&step=evidence");
assert.equal(parsed.flow, addPropertyFlowTypes.agent);
assert.equal(parsed.scenario, "missing-mandate");
assert.equal(buildAddPropertyHash(parsed), "#add-property?flow=agent&scenario=missing-mandate&step=evidence");
pass("2 flow branch parsing");

const owner = vm(addPropertyFlowTypes.owner);
assert.equal(owner.readinessStatus, addPropertyReadinessStatuses.readyForLocalReview);
assert.equal(owner.intent.propertyCandidateRef, "candidate_23b_owner_apartment_sell");
assert.equal(owner.execution.readyForLocalReviewDoesNotPublish, true);
pass("3 owner flow");

const ownerMissing = vm(addPropertyFlowTypes.owner, "missing-evidence");
assert.equal(ownerMissing.readinessStatus, addPropertyReadinessStatuses.evidenceRequired);
assert(ownerMissing.missingRequirements.evidenceMissing.includes("authority_evidence_missing"));
pass("4 owner missing evidence");

const developerMissingMembership = buildGuidedAddPropertyViewModel({
  flow: addPropertyFlowTypes.developer,
  scenario: "missing-membership",
  step: "organization"
});
assert(developerMissingMembership.progress.some((step) => step.step === "organization"));
pass("5 developer membership required");

const developer = vm(addPropertyFlowTypes.developer);
assert.equal(developer.readinessStatus, addPropertyReadinessStatuses.readyForLocalReview);
assert.equal(developer.intent.projectId, "project_green_tower");
pass("6 developer scope");

const developerOut = vm(addPropertyFlowTypes.developer, "out-of-scope");
assert.equal(developerOut.readinessStatus, addPropertyReadinessStatuses.blockedScope);
assert(developerOut.currentPath.missing.includes("project_scope_mismatch"));
pass("7 developer out-of-scope");

const agentEntry = vm(addPropertyFlowTypes.agent);
assert(agentEntry.questionEngine.selectedQuestions.some((question) => question.includes("agency")));
pass("8 agency org required");

assert(agentEntry.progress.some((step) => step.step === "organization"));
pass("9 agent membership required");

const agentNoMandate = vm(addPropertyFlowTypes.agent, "missing-mandate");
assert.equal(agentNoMandate.readinessStatus, addPropertyReadinessStatuses.authorityRequired);
assert.equal(agentNoMandate.futureMandate.enabled, false);
pass("10 agent mandate required");

const agent = vm(addPropertyFlowTypes.agent);
assert.equal(agent.readinessStatus, addPropertyReadinessStatuses.readyForLocalReview);
assert.equal(agent.reviewHandoff.readyForExistingReviewWorkflow, true);
pass("11 agent success-to-review");

const manager = vm(addPropertyFlowTypes.manager);
assert.equal(manager.readinessStatus, addPropertyReadinessStatuses.readyForLocalReview);
pass("12 manager authority");

assert.equal(manager.intent.intendedAction, "REQUEST_CLEANING");
assert(manager.eligibility.authorityGrant.scope.allowedActions.includes("REQUEST_MAINTENANCE"));
pass("13 manager operational actions");

const managerSale = vm(addPropertyFlowTypes.manager, "sale");
assert.equal(managerSale.readinessStatus, addPropertyReadinessStatuses.blockedScope);
pass("14 manager sale blocked");

const representative = vm(addPropertyFlowTypes.authorizedRepresentative);
assert.equal(representative.readinessStatus, addPropertyReadinessStatuses.readyForLocalReview);
assert.equal(representative.intent.propertyId, "prop_phase23b_represented_property");
pass("15 authorized representative");

const service = vm(addPropertyFlowTypes.serviceProvider);
assert.equal(service.readinessStatus, addPropertyReadinessStatuses.notActiveYet);
assert.equal(service.currentPath.relationship, "SERVICE_PROVIDER_PARTNER_FLOW_FUTURE");
pass("16 service provider separation");

assert.equal(service.currentPath.authority, "No Property ownership/listing/management authority granted");
pass("17 cleaning company cannot become Property authority");

const suggestion = explainUnsureAddPropertyPath({
  propertyIsMine: false,
  actingForCompany: true,
  ownerAuthorized: true,
  activity: "manage bookings and cleaning"
});
assert.equal(suggestion.suggestedFlow, addPropertyFlowTypes.manager);
pass("18 unsure flow suggestion");

assert.equal(suggestion.verifiedAuthority, false);
assert.equal(suggestion.message, "Suggested path - authority not verified.");
pass("19 suggestion != verification");

assert.equal(agent.propertyCandidate.existingPropertyResolution, "EXISTING_PROPERTY_LOCAL_LOOKUP");
pass("20 existing Property lookup path");

assert.equal(owner.propertyCandidate.existingPropertyResolution, "NEW_CANDIDATE_LOCAL_ONLY");
assert.equal(owner.propertyCandidate.canonicalPropertyCreated, false);
pass("21 new candidate path");

assert.equal(owner.propertyCandidate.country, "Georgia");
assert.equal(owner.propertyCandidate.city, "Batumi");
assert.equal(owner.propertyCandidate.bedrooms, 2);
pass("22 property candidate fields");

const missingCandidate = createPropertyCandidate({ propertyCandidateRef: "candidate_missing_test" });
assert(missingCandidate.missingFields.includes("country"));
assert.equal(missingCandidate.city, null);
pass("23 missing fields not invented");

assert(owner.intendedActions.includes("CREATE_SALE_LISTING"));
assert(owner.intendedActions.includes("MANAGE_PROPERTY"));
pass("24 intended action mapping");

assert(owner.questionEngine.selectedQuestions.some((question) => question.includes("ownership evidence")));
assert(agentNoMandate.questionEngine.selectedQuestions.some((question) => question.includes("mandate")));
pass("25 authority question selection");

assert.equal(ownerMissing.missingRequirements.authorityReviewRequired, true);
assert.equal(ownerMissing.missingRequirements.authorityActiveLocalProof, false);
pass("26 missing requirements");

assert.equal(owner.readinessStatus, "READY_FOR_LOCAL_REVIEW");
assert.equal(managerSale.readinessStatus, "BLOCKED_SCOPE");
pass("27 readiness status");

assert(owner.currentPath.evidence.every((item) => item.privateDocumentContentRendered === false));
assert(!JSON.stringify(owner.currentPath.evidence).includes("protected_doc_ref"));
pass("28 evidence protected rendering");

assert.equal(owner.reviewHandoff.modelType, "AddPropertyReviewPipelineBridge");
assert.equal(owner.reviewHandoff.readyForExistingReviewWorkflow, true);
pass("29 review pipeline handoff");

assert.equal(owner.reviewHandoff.duplicateReviewQueueCreated, false);
assert.equal(owner.reviewHandoff.dispatchPerformed, false);
pass("30 no duplicate review queue");

assert.equal(agentNoMandate.futureMandate.status, "NOT_ACTIVE_YET");
assert.equal(agentNoMandate.futureMandate.enabled, false);
pass("31 future mandate action disabled");

assert(representative.jurisdictionMessage.includes("legal sufficiency must be reviewed"));
assert.equal(representative.execution.executionEligible, false);
pass("32 jurisdiction unknown warning");

assert(owner.lisaExplanation.includes("cannot approve"));
assert(!owner.lisaExplanation.includes("legally authorized"));
pass("33 Lisa truthful explanation");

assert.equal(agent.navigatorRouting.navigatorCanBypassAuthority, false);
assert(agent.navigatorRouting.blockedNow.includes("publish_listing"));
pass("34 Navigator routing");

const miaB = buildGuidedAddPropertyViewModel({ flow: addPropertyFlowTypes.agent, scenario: "mia-agent-b", step: "review_readiness" });
assert.equal(miaB.flow, addPropertyFlowTypes.agent);
assert.equal(developerOut.currentPath.property, "candidate_green_tower_inventory");
assert(!developerOut.currentPath.missing.includes("prop_mia_a"));
pass("35 multi-property authority isolation");

assert.equal(owner.publicSafeBoundary.privateAuthorityEvidenceExposed, false);
assert.equal(owner.publicSafeBoundary.publicPassportEvidenceLeakage, false);
pass("36 no public evidence leakage");

assert.equal(owner.listingMutation, 0);
assert.equal(owner.currentPath.nextStep, "Ready for ESSA review.");
pass("37 no Listing creation");

assert.equal(owner.canonicalPropertyMutation, 0);
assert.equal(owner.propertyCandidate.canonicalPropertyCreated, false);
pass("38 no canonical Property mutation");

assert.equal(owner.providerCalls, 0);
assert.equal(service.providerCalls, 0);
pass("39 no provider calls");

assert.equal(owner.externalCalls, 0);
assert.equal(agent.externalCalls, 0);
pass("40 no external calls");

assert.equal(owner.productionDbMutations, 0);
assert.equal(manager.productionDbMutations, 0);
pass("41 no production DB mutation");

assert.equal(owner.paymentActions + owner.bookingActions + owner.commercialTransactionActions, 0);
assertZeroSideEffects(owner);
assertZeroSideEffects(agentNoMandate);
assertZeroSideEffects(service);
pass("42 no payment/booking/transaction");

const knowledge = createGuidedAddPropertyProductKnowledgeUpdate();
assert(knowledge.availableLocally.includes("guided Add Property intake"));
assert(knowledge.notActive.includes("real ownership verification"));
pass("43 Product Knowledge update");

console.log("Add Property guided flow tests passed.");
