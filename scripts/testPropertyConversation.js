import assert from "node:assert/strict";
import {
  buildPropertyConversationScenario,
  buildPropertyConversationViewModel,
  closePropertyConversationLocal,
  createExplicitLocalPropertyConversationApproval,
  createLocalPropertyConversationStore,
  createNavigatorPropertyConversationRouting,
  createPropertyConversation,
  createPropertyConversationCreationIntent,
  createPropertyConversationHistoryItem,
  createPropertyConversationMessage,
  createPropertyConversationParticipant,
  createPropertyConversationPolicy,
  createPropertyConversationFingerprint,
  createPropertyConversationPolicy as policyFactory,
  createLisaPropertyConversationGuide,
  deliverPropertyConversationMessageLocal,
  evaluatePropertyConversationRouteChangeReadiness,
  executePropertyConversationCreationThroughGateway,
  markPropertyConversationReadLocalProof,
  pausePropertyConversationLocal,
  preflightPropertyConversationCreationIntent,
  propertyConversationAuditEvents,
  propertyConversationDeliveryStatuses,
  propertyConversationExecutionActionTypes,
  propertyConversationMessageTypes,
  propertyConversationParticipantRoles,
  propertyConversationPolicyStatuses,
  propertyConversationSideEffectCounters,
  propertyConversationStatuses,
  rollbackPropertyConversationLocalProof,
  validatePropertyConversationMessage
} from "../src/property/index.js";

const ownerScenario = buildPropertyConversationScenario("owner");
const owner = buildPropertyConversationViewModel({ case: "owner" });
const conversation = owner.conversation;
const participants = owner.participants;

assert.equal(createPropertyConversationCreationIntent(ownerScenario).modelType, "PropertyConversationCreationIntent", "1 conversation creation intent");
assert.equal(preflightPropertyConversationCreationIntent({ ...ownerScenario, intent: createPropertyConversationCreationIntent({ ...ownerScenario, handoff: { readinessStatus: "BLOCKED" } }), handoff: { readinessStatus: "BLOCKED" } }).ok, false, "2 handoff required");
assert.equal(preflightPropertyConversationCreationIntent({ ...ownerScenario, intent: createPropertyConversationCreationIntent(ownerScenario), lead: {} }).ok, false, "3 Lead required");
assert.equal(Boolean(owner.intent.listingId && owner.intent.propertyId && owner.intent.publicationId), true, "4 Listing/Property linkage");
assert.equal(participants.length, 2, "5 participants");
assert.equal(Object.values(propertyConversationParticipantRoles).includes("REVIEWER"), false, "6 participant roles");
assert.equal(owner.execution.preflight.ok, true, "7 seller authority");
assert.equal(buildPropertyConversationViewModel({ case: "consentRevoked" }).execution.ok, false, "8 buyer consent");
assert.equal(buildPropertyConversationViewModel({ case: "unpublished" }).execution.ok, false, "9 listing/publication recheck");
assert.equal(createPropertyConversationPolicy().externalContactPolicy, "BLOCKED", "10 conversation policy");
assert.equal(owner.messages[0].modelType, "PropertyConversationMessage", "11 message contract");
assert.equal(Object.values(propertyConversationMessageTypes).includes("OFFER_SUBMISSION"), false, "12 message types");
assert.equal(owner.scenarioMessageResult.status, propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, "13 message policy pass");
assert.equal(buildPropertyConversationViewModel({ case: "phoneLeak" }).scenarioMessageResult.status, propertyConversationPolicyStatuses.blockedContactPolicy, "14 phone block");
assert.equal(validatePropertyConversationMessage({ conversation, participants, message: createPropertyConversationMessage({ conversationId: conversation.conversationId, senderActorRef: owner.scenario.handoff.buyerActorRef, senderRole: propertyConversationParticipantRoles.buyer, body: "email me at buyer@example.com" }), consent: owner.scenario.consent, publicationRecord: owner.scenario.publicationRecord, authorityGrant: owner.scenario.authorityGrant, store: createLocalPropertyConversationStore() }).policyStatus, propertyConversationPolicyStatuses.blockedContactPolicy, "15 email block");
assert.equal(buildPropertyConversationViewModel({ case: "whatsappLeak" }).scenarioMessageResult.status, propertyConversationPolicyStatuses.blockedContactPolicy, "16 WhatsApp block");
assert.equal(validatePropertyConversationMessage({ conversation, participants, message: createPropertyConversationMessage({ conversationId: conversation.conversationId, senderActorRef: owner.scenario.handoff.buyerActorRef, senderRole: propertyConversationParticipantRoles.buyer, body: "telegram @seller" }), consent: owner.scenario.consent, publicationRecord: owner.scenario.publicationRecord, authorityGrant: owner.scenario.authorityGrant, store: createLocalPropertyConversationStore() }).policyStatus, propertyConversationPolicyStatuses.blockedContactPolicy, "17 Telegram block");
assert.equal(buildPropertyConversationViewModel({ case: "payment" }).scenarioMessageResult.status, propertyConversationPolicyStatuses.blockedPaymentPolicy, "18 payment block");
assert.equal(validatePropertyConversationMessage({ conversation, participants, message: createPropertyConversationMessage({ conversationId: conversation.conversationId, senderActorRef: owner.scenario.handoff.sellerActorRef, senderRole: propertyConversationParticipantRoles.owner, body: "bank account GE00" }), consent: owner.scenario.consent, publicationRecord: owner.scenario.publicationRecord, authorityGrant: owner.scenario.authorityGrant, store: createLocalPropertyConversationStore() }).policyStatus, propertyConversationPolicyStatuses.blockedPaymentPolicy, "19 bank details block");
assert.equal(buildPropertyConversationViewModel({ case: "documentRequest" }).scenarioMessageResult.status, propertyConversationPolicyStatuses.blockedDocumentPolicy, "20 private documents block");
assert.equal(owner.messages[0].senderRole, propertyConversationParticipantRoles.buyer, "21 buyer initial context");
assert.equal(owner.execution.ok, true, "22 approved seller response fingerprint");
assert.equal(owner.execution.approval.decidedBy, "local_human_property_admin", "23 human approval");
assert.equal(createExplicitLocalPropertyConversationApproval({}, { decidedBy: "AI" }).status, "APPROVAL_BLOCKED", "24 AI cannot approve");
assert.equal(createExplicitLocalPropertyConversationApproval({}, { decidedBy: "LISA" }).status, "APPROVAL_BLOCKED", "25 Lisa cannot approve");
assert.equal(createExplicitLocalPropertyConversationApproval({}, { decidedBy: "NAVIGATOR" }).status, "APPROVAL_BLOCKED", "26 Navigator cannot approve");
assert.equal(owner.execution.gateway.decision, "READY", "27 Gateway enforcement");
assert.equal(owner.localPropertyConversationsCreated, 1, "28 atomic conversation creation");
assert.equal(owner.messages.every((message) => message.conversationId === conversation.conversationId), true, "29 no orphan messages");
assert.equal(owner.messages[1].deliveryStatus, propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, "30 local delivery");
assert.equal(owner.read.status, propertyConversationDeliveryStatuses.readLocalProof, "31 read state");
assert.equal(executePropertyConversationCreationThroughGateway({ scenario: ownerScenario, store: (() => { const store = createLocalPropertyConversationStore(); executePropertyConversationCreationThroughGateway({ scenario: ownerScenario, store }); return store; })() }).status, "ALREADY_CREATED_IDEMPOTENT", "32 idempotent message/conversation");
assert.deepEqual(owner.messages.map((message) => message.sequenceNumber).slice(0, 2), [1, 2], "33 ordering");
assert.equal(owner.historyItem.auditRefs.includes(propertyConversationAuditEvents.sellerResponseDelivered), true, "34 append-only history");
assert.equal(JSON.stringify(owner).includes("editMessageDestructive"), false, "35 no destructive edit");
assert.equal(JSON.stringify(owner).includes("deleteMessage"), false, "36 no destructive delete");
assert.equal(owner.conversation.attributionRef, "ESSA_PROPERTY_MARKETPLACE", "37 attribution preserved");
assert.equal(buildPropertyConversationViewModel({ case: "authorityExpired" }).pause.status, propertyConversationStatuses.pausedLocal, "38 authority expiry pause");
assert.equal(buildPropertyConversationViewModel({ case: "consentRevoked" }).execution.ok, false, "39 consent revocation pause/block");
assert.equal(buildPropertyConversationViewModel({ case: "unpublished" }).execution.ok, false, "40 unpublish pause/block");
assert.equal(buildPropertyConversationViewModel({ case: "closeRollback" }).close.status, propertyConversationStatuses.closedLocal, "41 safe close");
assert.equal(buildPropertyConversationViewModel({ case: "closeRollback" }).rollback.status, propertyConversationStatuses.rolledBackLocalProof, "42 rollback");
assert.equal(buildPropertyConversationViewModel({ case: "rollbackDependency" }).dependencyRollback.status, "ROLLBACK_BLOCKED_BY_DEPENDENCY", "43 dependency guard");
assert.equal(buildPropertyConversationViewModel({ case: "offerText" }).offerEntitiesCreated, 0, "44 offer-like text does not create Offer");
assert.equal(buildPropertyConversationViewModel({ case: "buyerViewing" }).viewingBookings, 0, "45 viewing discussion does not schedule");
assert.equal(buildPropertyConversationViewModel({ case: "documentRequest" }).privateDocumentShares, 0, "46 document question does not reveal docs");
assert.equal(owner.externalMessagesSent + owner.emailActions + owner.smsActions + owner.telegramActions + owner.whatsappActions, 0, "47 no external contact");
assert.equal(owner.providerCalls, 0, "48 no provider call");
assert.equal(owner.productionDbMutations, 0, "49 no production DB mutation");
assert.deepEqual({ paymentActions: owner.paymentActions, bookingActions: owner.bookingActions, commercialTransactionActions: owner.commercialTransactionActions }, { paymentActions: 0, bookingActions: 0, commercialTransactionActions: 0 }, "50 no payment/booking/transaction");

assert.equal(createPropertyConversation({ intent: owner.intent }).modelType, "PropertyConversation");
assert.equal(createPropertyConversationParticipant({ conversationId: "c1", actorRef: { actorId: "a1" } }).permissions.canRevealContact, false);
assert.equal(createPropertyConversationFingerprint({ a: 1 }), createPropertyConversationFingerprint({ a: 1 }));
assert.equal(policyFactory().offerPolicy, "NO_FORMAL_OFFER_ENTITY");
assert.equal(closePropertyConversationLocal({ conversation, store: (() => { const store = createLocalPropertyConversationStore({ conversations: [conversation] }); return store; })() }).status, propertyConversationStatuses.closedLocal);
assert.equal(evaluatePropertyConversationRouteChangeReadiness({ conversation }).automaticParticipantSubstitution, false);
assert.equal(markPropertyConversationReadLocalProof({ conversationId: conversation.conversationId, actorId: "actor_buyer_demo", store: createLocalPropertyConversationStore() }).status, propertyConversationDeliveryStatuses.readLocalProof);
assert.equal(pausePropertyConversationLocal({ conversation, store: createLocalPropertyConversationStore({ conversations: [conversation] }) }).status, propertyConversationStatuses.pausedLocal);
assert.equal(rollbackPropertyConversationLocalProof({ executionRecordId: "missing", store: createLocalPropertyConversationStore() }).status, "ROLLBACK_RECORD_NOT_FOUND");
assert.equal(createPropertyConversationHistoryItem({ conversation, store: createLocalPropertyConversationStore({ conversations: [conversation] }) }).modelType, "PropertyConversationHistoryItem");
assert.equal(createLisaPropertyConversationGuide("Can I make an offer?").mayCreateOffer, false);
assert.equal(createNavigatorPropertyConversationRouting("I want to pay deposit").paymentActive, false);
assert.equal(propertyConversationExecutionActionTypes.createInternalConversationLocalProof, "CREATE_PROPERTY_INTERNAL_CONVERSATION_LOCAL_PROOF");
assert.equal(propertyConversationSideEffectCounters.externalCalls, 0);

console.log("Phase 23L Property Conversation tests passed: 50/50");
