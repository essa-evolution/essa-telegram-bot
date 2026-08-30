import assert from "assert";
import {
  buildPropertyMandateReviewFixtures,
  buildPropertyMandateReviewViewModel,
  createLisaMandateReviewGuide,
  createMandateEvidenceRequest,
  createMandateLegalReviewHandoff,
  createMandateReviewQueueAdapter,
  createMandateReviewerAssignment,
  createNavigatorMandateReviewRouting,
  createPropertyMandateReviewOutcome,
  createPropertyMandateReviewPackage,
  inspectMandateEvidence,
  propertyMandateReviewOutcomeTypes,
  propertyMandateReviewPackageStatuses,
  propertyMandateReviewReasonCodes,
  propertyMandateReviewerRoles,
  propertyMandateReviewAuditEvents,
  supersedeMandateReviewOutcome,
  validateReviewOutcomeVersionPin
} from "../src/property/index.js";

function pass(label) {
  console.log(`PASS ${label}`);
}

function zero(model) {
  assert.equal(model.canonicalPropertyMutation, 0);
  assert.equal(model.listingMutation, 0);
  assert.equal(model.ownershipMutation, 0);
  assert.equal(model.publishActions, 0);
  assert.equal(model.providerCalls, 0);
  assert.equal(model.externalCalls, 0);
  assert.equal(model.productionDbMutations, 0);
  assert.equal(model.paymentActions, 0);
  assert.equal(model.bookingActions, 0);
  assert.equal(model.commercialTransactionActions, 0);
  assert.equal(model.authorityActivationActions, 0);
}

const fixtures = buildPropertyMandateReviewFixtures();
const ready = fixtures.packages.ready;

assert.equal(ready.modelType, "PropertyMandateReviewPackage");
assert.equal(ready.mandateDraftId.includes(ready.draftVersion), true);
pass("1 review package contract");

assert(Object.values(propertyMandateReviewPackageStatuses).includes("READY_FOR_REVIEW"));
assert(!Object.values(propertyMandateReviewPackageStatuses).includes("ACTIVE_AUTHORITY"));
pass("2 package lifecycle");

const assignment = createMandateReviewerAssignment(ready);
assert.equal(assignment.reviewerRole, propertyMandateReviewerRoles.propertyReviewer);
assert.equal(assignment.mandateReviewPackageId, ready.mandateReviewPackageId);
pass("3 reviewer assignment linkage");

const outcome = createPropertyMandateReviewOutcome(ready);
assert.equal(outcome.modelType, "PropertyMandateReviewOutcome");
assert.equal(outcome.mandateDraftId, ready.mandateDraftId);
pass("4 review outcome contract");

assert(Object.values(propertyMandateReviewOutcomeTypes).includes("READY_FOR_FUTURE_SIGNATURE"));
assert(!Object.values(propertyMandateReviewOutcomeTypes).includes("APPROVED_LEGAL_AUTHORITY"));
pass("5 outcome types");

assert(Object.values(propertyMandateReviewReasonCodes).includes("MANDATE_VERSION_MISMATCH"));
assert(Object.values(propertyMandateReviewReasonCodes).includes("AUTHORITY_ESCALATION_ATTEMPT"));
pass("6 reason codes");

const evidence = inspectMandateEvidence(fixtures.v1Draft);
assert(evidence.every((item) => item.rawDocumentContentExposed === false));
assert(!JSON.stringify(evidence).includes("protected_doc_ref"));
pass("7 evidence inspection privacy");

const evidenceRequest = createMandateEvidenceRequest(fixtures.packages.missingEvidence);
assert.equal(evidenceRequest.externalSendPerformed, false);
assert(evidenceRequest.reasonCodes.includes("OWNERSHIP_EVIDENCE_MISSING"));
pass("8 evidence request");

assert.equal(outcome.draftVersion, ready.draftVersion);
assert.equal(outcome.draftFingerprint, ready.draftFingerprint);
pass("9 draft version pinning");

assert(outcome.draftFingerprint.startsWith("mandate_fp_"));
pass("10 fingerprint pinning");

const mismatch = validateReviewOutcomeVersionPin(outcome, fixtures.v2Draft);
assert.equal(mismatch.status, "MANDATE_VERSION_MISMATCH");
pass("11 V1 outcome invalid for V2");

assert.equal(mismatch.reReviewRequired, true);
assert(mismatch.reasonCodes.includes("RE_REVIEW_REQUIRED"));
pass("12 re-review required");

assert.equal(fixtures.packages.conflict.packageStatus, "BLOCKED_BY_CONFLICT");
assert(fixtures.packages.conflict.conflictFlags.some((item) => item.code === "DENIED_ACTION_CONFLICT"));
pass("13 scope conflict detection");

assert.equal(fixtures.packages.escalation.packageStatus, "BLOCKED_BY_SCOPE");
assert(createPropertyMandateReviewOutcome(fixtures.packages.escalation).outcomeType === "SCOPE_REDUCTION_REQUIRED" ||
  createPropertyMandateReviewOutcome(fixtures.packages.escalation).outcomeType === "GRANTOR_AUTHORITY_INSUFFICIENT");
pass("14 authority escalation recheck");

const delegationVm = buildPropertyMandateReviewViewModel({ case: "escalation" });
assert(delegationVm.package.scopeWarnings.length > 0);
pass("15 delegation validation");

assert.equal(ready.packageStatus, "READY_FOR_REVIEW");
assert(ready.allowedActions.includes("CREATE_SALE_LISTING"));
pass("16 owner-agent review");

assert.equal(fixtures.packages.missingEvidence.packageStatus, "WAITING_FOR_EVIDENCE");
pass("17 owner-agent missing evidence");

assert.equal(fixtures.packages.ownerManager.packageStatus, "READY_FOR_REVIEW");
pass("18 owner-manager review");

assert(fixtures.packages.ownerManager.deniedActions.includes("START_SALE_WORKFLOW"));
pass("19 manager sale blocked");

assert.equal(fixtures.packages.developer.packageStatus, "READY_FOR_REVIEW");
pass("20 developer Project X");

assert.equal(fixtures.packages.developerOutOfScope.packageStatus, "BLOCKED_BY_SCOPE");
pass("21 developer Project Z blocked");

assert.equal(fixtures.packages.tempCleaning.packageStatus, "READY_FOR_REVIEW");
assert(fixtures.packages.tempCleaning.deniedActions.includes("SALE"));
pass("22 temporary cleaning access");

assert.equal(fixtures.packages.jurisdictionUnknown.packageStatus, "BLOCKED_BY_JURISDICTION");
pass("23 jurisdiction unknown");

const legalHandoff = createMandateLegalReviewHandoff(ready);
assert.equal(legalHandoff.status, "READY_FOR_FUTURE_HANDOFF");
assert.equal(legalHandoff.dispatched, false);
pass("24 legal review required");

const signatureOutcome = createPropertyMandateReviewOutcome(fixtures.packages.signatureReady, { outcomeType: propertyMandateReviewOutcomeTypes.readyForFutureSignature });
assert.equal(signatureOutcome.signatureReadiness, "NOT_ACTIVE");
assert.equal(signatureOutcome.authorityActivationStatus, "NOT_ACTIVE");
pass("25 signature readiness");

assert.equal(signatureOutcome.proposedAuthorityGrantStatus, "REVIEWED_READY_FOR_FUTURE_SIGNATURE");
assert.equal(signatureOutcome.authorityActivationActions, 0);
pass("26 proposed grant stays inactive");

assert.equal(fixtures.packages.revoked.packageStatus, "CANCELLED");
pass("27 revoked mandate blocked");

assert.equal(fixtures.packages.expired.packageStatus, "CANCELLED");
pass("28 expired mandate blocked");

const superseded = supersedeMandateReviewOutcome(outcome, createPropertyMandateReviewOutcome(ready, { outcomeId: "new_outcome" }));
assert.equal(superseded.previousOutcome.outcomeStatus, "SUPERSEDED");
assert.equal(superseded.historyPreserved, true);
pass("29 superseded review outcome");

assert(ready.auditMetadata.audit.every((event) => event.appendOnly));
assert(Object.values(propertyMandateReviewAuditEvents).includes("MANDATE_REVIEW_OUTCOME_RECORDED"));
pass("30 audit append-only");

assert.equal(fixtures.queueAdapter.existingQueueReused, true);
pass("31 review queue reuse");

assert.equal(fixtures.queueAdapter.duplicateReviewQueueCreated, false);
pass("32 no duplicate queue");

const lisa = createLisaMandateReviewGuide("Is authority active now?");
assert.equal(lisa.mayActivateAuthority, false);
assert(lisa.answer.includes("Authority is not active"));
pass("33 Lisa cannot activate");

const nav = createNavigatorMandateReviewRouting("Покажи мандаты на проверку.");
assert.equal(nav.navigatorCanApprove, false);
pass("34 Navigator cannot approve");

const vm = buildPropertyMandateReviewViewModel({ case: "ready" });
assert.equal(vm.addPropertyReturn.status, "MANDATE_REVIEWED");
assert.equal(vm.addPropertyReturn.authorityStatus, "AUTHORITY_NOT_ACTIVE");
pass("35 Add Property integration");

assert.equal(vm.outcome.authorityActivationStatus, "NOT_ACTIVE");
pass("36 authority remains inactive after review");

assert.equal(vm.listingMutation, 0);
pass("37 no Listing creation");

assert.equal(vm.canonicalPropertyMutation, 0);
pass("38 no canonical Property mutation");

assert.equal(vm.ownershipMutation, 0);
pass("39 no ownership mutation");

assert.equal(vm.publishActions, 0);
pass("40 no publish");

assert.equal(vm.providerCalls, 0);
pass("41 no provider call");

assert.equal(vm.externalCalls, 0);
pass("42 no external call");

assert.equal(vm.productionDbMutations, 0);
pass("43 no production DB mutation");

assert.equal(vm.paymentActions, 0);
pass("44 no payment");

assert.equal(vm.bookingActions, 0);
pass("45 no booking");

assert.equal(vm.commercialTransactionActions, 0);
pass("46 no transaction");

assert.equal(vm.publicSafeBoundary.publicPassportLeakage, false);
assert.equal(vm.publicSafeBoundary.publicDiscoveryLeakage, false);
pass("47 private evidence not public");

assert.equal(vm.publicSafeBoundary.urlContainsPrivateData, false);
pass("48 URL privacy");

assert.equal(vm.workflowSnapshotCompatible, true);
pass("49 workflow snapshot compatibility");

zero(vm);
zero(outcome);
zero(legalHandoff);
pass("50 all prior regressions side-effect invariant");

console.log("Property mandate review tests passed.");
