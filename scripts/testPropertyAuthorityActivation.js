import assert from "node:assert/strict";
import {
  authorityActivationApprovalStatuses,
  authorityActivationExecutionStatuses,
  authorityActivationPreflightStatuses,
  blockedAuthorityActivationActions,
  buildActivatedAuthorityResolverProof,
  buildAuthorityActivationFixtures,
  buildPropertyAuthorityActivationViewModel,
  commitPropertyAuthorityActivationLocalProof,
  createApprovalForIntent,
  createAuthorityActivationApproval,
  createLisaAuthorityActivationGuide,
  createLocalPropertyAuthorityActivationStore,
  createNavigatorAuthorityActivationRouting,
  createPropertyAuthorityActivationIntent,
  jurisdictionReadinessStates,
  legalReviewReadinessStates,
  propertyAuthorityActivationActionTypes,
  rollbackPropertyAuthorityActivationLocalProof,
  signatureReadinessStates,
  validatePropertyAuthorityActivationPreflight
} from "../src/property/index.js";

const fixtures = buildAuthorityActivationFixtures();
const agent = fixtures.intents.agentIntent;

function freshStore(intent = agent) {
  return createLocalPropertyAuthorityActivationStore([intent.source.proposedAuthorityGrant]);
}

function approved(intent = agent) {
  return createApprovalForIntent(intent);
}

function activate(intent = agent) {
  const store = freshStore(intent);
  return { store, result: commitPropertyAuthorityActivationLocalProof({ intent, approval: approved(intent), store }) };
}

const ready = validatePropertyAuthorityActivationPreflight(agent, freshStore());
assert.equal(agent.modelType, "PropertyAuthorityActivationIntent", "1 intent contract exists");
assert.equal(agent.actionType, propertyAuthorityActivationActionTypes.activateReviewedAuthorityGrantLocalProof, "2 only allowed action is local proof activation");
assert.equal(blockedAuthorityActivationActions.includes("ACTIVATE_PRODUCTION_AUTHORITY"), true, "3 production activation is denied");
assert.equal(blockedAuthorityActivationActions.includes("SIGN_MANDATE"), true, "4 signing is denied");
assert.equal(blockedAuthorityActivationActions.includes("NOTARIZE_MANDATE"), true, "5 notarization is denied");
assert.equal(blockedAuthorityActivationActions.includes("REGISTER_MANDATE"), true, "6 registration is denied");
assert.equal(blockedAuthorityActivationActions.includes("PUBLISH_LISTING"), true, "7 publishing is denied");
assert.equal(blockedAuthorityActivationActions.includes("CREATE_PROPERTY"), true, "8 property creation is denied");
assert.equal(blockedAuthorityActivationActions.includes("TRANSFER_OWNERSHIP"), true, "9 ownership transfer is denied");
assert.equal(blockedAuthorityActivationActions.includes("START_PAYMENT"), true, "10 payment is denied");
assert.equal(blockedAuthorityActivationActions.includes("BOOK_PROPERTY"), true, "11 booking is denied");
assert.equal(blockedAuthorityActivationActions.includes("START_TRANSACTION"), true, "12 commercial transaction is denied");
assert.equal(ready.status, authorityActivationPreflightStatuses.readyForApproval, "13 reviewed local proof is ready for approval");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.unsignedAgent, freshStore(fixtures.intents.unsignedAgent)).status, authorityActivationPreflightStatuses.blockedSignature, "14 unsigned activation is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.versionMismatch, freshStore(fixtures.intents.versionMismatch)).status, authorityActivationPreflightStatuses.blockedVersionMismatch, "15 V1/V2 mismatch is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.unknownJurisdiction, freshStore(fixtures.intents.unknownJurisdiction)).status, authorityActivationPreflightStatuses.blockedJurisdiction, "16 unknown jurisdiction is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.legalBlocked, freshStore(fixtures.intents.legalBlocked)).status, authorityActivationPreflightStatuses.blockedLegalReview, "17 legal review required is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.managerSaleBlocked, freshStore(fixtures.intents.managerSaleBlocked)).status, authorityActivationPreflightStatuses.blockedEscalation, "18 manager sale escalation is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.expired, freshStore(fixtures.intents.expired)).status, authorityActivationPreflightStatuses.blockedExpired, "19 expired mandate is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.revoked, freshStore(fixtures.intents.revoked)).status, authorityActivationPreflightStatuses.blockedRevoked, "20 revoked mandate is blocked");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.managerActivation, freshStore(fixtures.intents.managerActivation)).status, authorityActivationPreflightStatuses.readyForApproval, "21 manager operational activation is ready");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.developerActivation, freshStore(fixtures.intents.developerActivation)).status, authorityActivationPreflightStatuses.readyForApproval, "22 developer Project X activation is ready");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.tempActivation, freshStore(fixtures.intents.tempActivation)).status, authorityActivationPreflightStatuses.readyForApproval, "23 temporary cleaning activation is ready");
assert.equal(validatePropertyAuthorityActivationPreflight(fixtures.intents.developerZBlocked, freshStore(fixtures.intents.developerZBlocked)).status, authorityActivationPreflightStatuses.blockedScope, "23b developer Project Z is blocked");

const badAction = createPropertyAuthorityActivationIntent({ ...agent.source, actionType: "PUBLISH_LISTING", signatureReadiness: signatureReadinessStates.satisfiedLocalProof, jurisdictionReadiness: jurisdictionReadinessStates.localDemoReady, legalReviewReadiness: legalReviewReadinessStates.noneRequiredLocalProof });
assert.equal(validatePropertyAuthorityActivationPreflight(badAction, freshStore(badAction)).status, authorityActivationPreflightStatuses.blockedStateMismatch, "24 non-local activation action is blocked");
const noApproval = createAuthorityActivationApproval(agent, { decidedBy: "lisa:guide" });
assert.equal(noApproval.approvalStatus, authorityActivationApprovalStatuses.blocked, "25 Lisa guide cannot approve");
assert.equal(createAuthorityActivationApproval(agent, { decidedBy: "navigator:route" }).approvalStatus, authorityActivationApprovalStatuses.blocked, "26 Navigator cannot approve");
assert.equal(createAuthorityActivationApproval(agent, { decidedBy: "provider:signature_service" }).approvalStatus, authorityActivationApprovalStatuses.blocked, "27 provider cannot approve");
assert.equal(createAuthorityActivationApproval(agent, { decidedBy: "ai:auto" }).approvalStatus, authorityActivationApprovalStatuses.blocked, "28 AI cannot approve");
assert.equal(approved().approvalStatus, authorityActivationApprovalStatuses.approved, "29 explicit local human approval can approve exact scope");
assert.equal(createAuthorityActivationApproval(agent, { decidedBy: "human:local_property_admin_fixture", scope: { activationIntentId: agent.activationIntentId } }).approvalStatus, authorityActivationApprovalStatuses.blocked, "30 changed approval scope invalidates token");

const { store, result } = activate();
assert.equal(result.ok, true, "31 activation commits");
assert.equal(result.status, authorityActivationExecutionStatuses.verified, "32 activation verifies");
assert.equal(result.afterAuthority.status, "ACTIVE_LOCAL_PROOF", "33 grant becomes ACTIVE_LOCAL_PROOF");
assert.equal(result.afterAuthority.localProofOnly, true, "34 grant is local proof only");
assert.equal(result.afterAuthority.noProductionLegalAuthority, true, "35 grant is not production legal authority");
assert.equal(result.localAuthorityActivationMutations, 1, "36 exactly one local activation mutation occurs");
assert.equal(result.canonicalPropertyMutation, 0, "37 canonical property is unchanged");
assert.equal(result.listingMutation, 0, "38 listing is unchanged");
assert.equal(result.ownershipMutation, 0, "39 ownership is unchanged");
assert.equal(result.providerCalls, 0, "40 provider calls are zero");
assert.equal(result.externalCalls, 0, "41 external calls are zero");
assert.equal(result.productionDbMutations, 0, "42 production DB mutations are zero");
assert.equal(result.paymentActions + result.bookingActions + result.commercialTransactionActions, 0, "43 payment/booking/transaction actions are zero");
assert.equal(commitPropertyAuthorityActivationLocalProof({ intent: agent, approval: approved(), store }).status, authorityActivationExecutionStatuses.alreadyActiveIdempotent, "44 repeat is idempotent");
assert.equal(rollbackPropertyAuthorityActivationLocalProof({ activationRecord: result.activationRecord, store }).status, authorityActivationExecutionStatuses.rolledBack, "45 rollback restores previous local state");
assert.equal(buildActivatedAuthorityResolverProof(result).ok, true, "46 active local proof can feed Add Property resolver");
assert.equal(buildPropertyAuthorityActivationViewModel({ case: "agent" }).addPropertyIntegration.status, "AUTHORITY_ACTIVE_LOCAL_PROOF", "47 Add Property sees active local proof");
assert.equal(buildPropertyAuthorityActivationViewModel({ case: "legal" }).preflight.status, authorityActivationPreflightStatuses.blockedLegalReview, "48 UI view model preserves blockers");
assert.equal(createLisaAuthorityActivationGuide("production legal?", { preflight: ready }).mayApprove, false, "49 Lisa explains but cannot approve");
assert.equal(createNavigatorAuthorityActivationRouting("activate").navigatorCanExecute, false, "50 Navigator routes but cannot execute");

console.log("Phase 23E Property Authority Activation tests passed: 50/50");
