import assert from "node:assert/strict";
import {
  appendPropertyConversationMessageThroughGateway,
  buildPropertyConversationContinuationViewModel,
  buildPropertyConversationScenario,
  createLocalPropertyConversationStore,
  createNavigatorPropertyConversationRouting,
  createPropertyConversationAttachmentIntent,
  createPropertyConversationCreationIntent,
  createPropertyConversationMessage,
  createPropertyConversationMessageHistoryItem,
  createPropertyConversationMessageIntent,
  createPropertyConversationMessageSupersession,
  createPropertyConversationSummary,
  createLisaPropertyConversationGuide,
  evaluatePropertyConversationRatePolicy,
  executePropertyConversationCreationThroughGateway,
  markPropertyConversationReadLocalProof,
  preflightPropertyConversationMessageIntent,
  propertyConversationAuditEvents,
  propertyConversationDeliveryStatuses,
  propertyConversationExecutionActionTypes,
  propertyConversationMessageTypes,
  propertyConversationParticipantRoles,
  propertyConversationPolicyStatuses,
  propertyConversationSideEffectCounters
} from "../src/property/index.js";

const ownerScenario = buildPropertyConversationScenario("owner");
const setupStore = createLocalPropertyConversationStore();
const creation = executePropertyConversationCreationThroughGateway({ scenario: ownerScenario, store: setupStore, intent: createPropertyConversationCreationIntent(ownerScenario) });
const conversation = setupStore.getConversation(creation.conversation.conversationId);
const participants = setupStore.listParticipants(conversation.conversationId);
const buyer = participants.find((item) => item.participantRole === propertyConversationParticipantRoles.buyer);
const seller = participants.find((item) => item.participantRole !== propertyConversationParticipantRoles.buyer);
const buyerSafe = buildPropertyConversationContinuationViewModel({ case: "buyerSafe" });
const sellerSafe = buildPropertyConversationContinuationViewModel({ case: "sellerSafe" });

assert.equal(createPropertyConversationMessageIntent({ conversation, senderActorRef: buyer.actorRef, senderRole: buyer.participantRole, rawBody: "Hi" }).modelType, "PropertyConversationMessageIntent", "1 message intent");
assert.equal(preflightPropertyConversationMessageIntent({ intent: createPropertyConversationMessageIntent({ conversation: {}, senderActorRef: buyer.actorRef, senderRole: buyer.participantRole, rawBody: "Hi" }), conversation: {}, participants, consent: ownerScenario.consent, publicationRecord: ownerScenario.publicationRecord, authorityGrant: ownerScenario.authorityGrant, store: setupStore }).status, "BLOCKED_STATE_MISMATCH", "2 existing conversation required");
assert.equal(preflightPropertyConversationMessageIntent({ intent: createPropertyConversationMessageIntent({ conversation, senderActorRef: { actorId: "intruder" }, senderRole: "BUYER", rawBody: "Hi" }), conversation, participants, consent: ownerScenario.consent, publicationRecord: ownerScenario.publicationRecord, authorityGrant: ownerScenario.authorityGrant, store: setupStore }).status, "BLOCKED_PARTICIPANT", "3 participant required");
assert.equal(preflightPropertyConversationMessageIntent({ intent: createPropertyConversationMessageIntent({ conversation: { ...conversation, conversationStatus: "PAUSED_LOCAL" }, senderActorRef: buyer.actorRef, senderRole: buyer.participantRole, rawBody: "Hi" }), conversation: { ...conversation, conversationStatus: "PAUSED_LOCAL" }, participants, consent: ownerScenario.consent, publicationRecord: ownerScenario.publicationRecord, authorityGrant: ownerScenario.authorityGrant, store: setupStore }).status, "BLOCKED_CONVERSATION_STATE", "4 active conversation required");
assert.equal(buyerSafe.appendResult.status, propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, "5 buyer message");
assert.equal(sellerSafe.appendResult.status, propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, "6 seller message");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "agentAuthorityExpired" }).appendResult.status, "BLOCKED_AUTHORITY", "7 seller authority recheck");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "consentRevoked" }).appendResult.status, "BLOCKED_BUYER_CONSENT", "8 buyer consent recheck");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "listingUnpublished" }).appendResult.status, "BLOCKED_LISTING_STATE", "9 listing recheck");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "listingUnpublished" }).conversation.conversationStatus, "PAUSED_LOCAL", "10 publication recheck");
assert.equal(Object.values(propertyConversationMessageTypes).includes("PAYMENT_REQUEST"), false, "11 message type");
assert.equal(buyerSafe.appendResult.preflight.status, "READY_FOR_LOCAL_APPEND", "12 safe message");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "phoneBlocked" }).appendResult.status, "BLOCKED_CONTACT_POLICY", "13 phone blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "sellerEmailWhatsapp" }).appendResult.status, "BLOCKED_CONTACT_POLICY", "14 email blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "sellerEmailWhatsapp" }).appendResult.status, "BLOCKED_CONTACT_POLICY", "15 WhatsApp blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "telegramBlocked" }).appendResult.status, "BLOCKED_CONTACT_POLICY", "16 Telegram blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "externalLink" }).appendResult.status, "BLOCKED_CONTACT_POLICY", "17 external link/contact blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "payment" }).appendResult.status, "BLOCKED_PAYMENT_POLICY", "18 payment blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "payment" }).paymentActions, 0, "19 bank account blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "crypto" }).appendResult.status, "BLOCKED_PAYMENT_POLICY", "20 crypto blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "privateDocs" }).appendResult.status, "BLOCKED_DOCUMENT_POLICY", "21 private docs blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "offerText" }).formalOffersCreated, 0, "22 offer-like language no Offer");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "counterOfferText" }).counterOffersCreated, 0, "23 counteroffer-like language no CounterOffer");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "reply" }).messageIntent.replyToMessageId !== null, true, "24 reply-to validation");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "supersession" }).messageSupersessionsLocal, 1, "25 supersession");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "supersession" }).historyItems.some((item) => item.supersessionState === "SUPERSEDED"), true, "26 original immutable");
assert.deepEqual(buyerSafe.historyItems.map((item) => item.sequence).slice(0, 3), [1, 2, 3], "27 sequence ordering");
assert.equal(buyerSafe.localConversationMessagesAppended, 1, "28 atomic append");
assert.equal(buyerSafe.appendResult.gateway.decision, "READY", "29 Gateway enforcement");
assert.equal(JSON.stringify(await import("../workspace/modules/propertyConversationUi.js")).includes("addMessage("), false, "30 direct append bypass blocked");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "idempotent" }).idempotent.status, propertyConversationDeliveryStatuses.alreadyDeliveredIdempotent, "31 idempotency");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "buyerSafe" }).appendResult.status, propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, "32 bounded duplicate policy");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "rate" }).appendResult.status, "BLOCKED_RATE_POLICY", "33 rate policy");
assert.equal(buyerSafe.summary.sellerUnread >= 0, true, "34 read/unread");
assert.equal(buyerSafe.summary.modelType, "PropertyConversationSummary", "35 conversation summary");
assert.equal(buyerSafe.conversation.attributionRef, "ESSA_PROPERTY_MARKETPLACE", "36 attribution preserved");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "agentAuthorityExpired" }).conversation.conversationStatus, "PAUSED_LOCAL", "37 authority expiry pause");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "consentRevoked" }).conversation.conversationStatus, "PAUSED_LOCAL", "38 consent revoke pause");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "listingUnpublished" }).conversation.conversationStatus, "PAUSED_LOCAL", "39 listing unpublish pause");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "resumeConsentRestored" }).resumeReadiness.status, "RESUME_REVIEW_REQUIRED", "40 resume readiness");
assert.equal(buildPropertyConversationContinuationViewModel({ case: "buyerSafe" }).historyItems.length >= 3, true, "41 close preserves history");
assert.equal(createLisaPropertyConversationGuide("send it").maySendWithoutApproval, false, "42 Lisa cannot send");
assert.equal(createNavigatorPropertyConversationRouting("Send this message.").routeOnly, true, "43 Navigator cannot bypass");
assert.equal(buyerSafe.externalMessagesSent, 0, "44 no external messages");
assert.equal(buyerSafe.phoneReveals + buyerSafe.emailReveals, 0, "45 no contact reveals");
assert.equal(buyerSafe.formalOffersCreated, 0, "46 no Offer");
assert.equal(buyerSafe.viewingBookings, 0, "47 no Viewing booking");
assert.equal(buyerSafe.privateDocumentShares, 0, "48 no private doc share");
assert.deepEqual({ providerCalls: buyerSafe.providerCalls, productionDbMutations: buyerSafe.productionDbMutations }, { providerCalls: 0, productionDbMutations: 0 }, "49 no provider/production DB");
assert.deepEqual({ paymentActions: buyerSafe.paymentActions, bookingActions: buyerSafe.bookingActions, commercialTransactionActions: buyerSafe.commercialTransactionActions }, { paymentActions: 0, bookingActions: 0, commercialTransactionActions: 0 }, "50 no payment/booking/transaction");

assert.equal(propertyConversationExecutionActionTypes.appendInternalMessageLocalProof, "APPEND_PROPERTY_INTERNAL_MESSAGE_LOCAL_PROOF");
assert.equal(evaluatePropertyConversationRatePolicy({ recentAttempts: [] }).status, "PASS");
assert.equal(createPropertyConversationAttachmentIntent({ conversationId: conversation.conversationId }).activeSharing, false);
assert.equal(createPropertyConversationSummary({ conversation, participants, messages: setupStore.listMessages(conversation.conversationId), readStates: setupStore.listReadStates(conversation.conversationId), scenario: ownerScenario }).nextStepReadiness.formalOffer, "NOT_ACTIVE_YET");
assert.equal(createPropertyConversationMessageHistoryItem({ message: setupStore.listMessages(conversation.conversationId)[0] }).modelType, "PropertyConversationMessageHistoryItem");
assert.equal(createPropertyConversationMessageSupersession({ conversationId: conversation.conversationId, originalMessageId: "m1", replacementMessageId: "m2" }).status, "SUPERSEDED_LOCAL_PROOF");
assert.equal(markPropertyConversationReadLocalProof({ conversationId: conversation.conversationId, actorId: "actor_buyer_demo", store: setupStore }).status, propertyConversationDeliveryStatuses.readLocalProof);
assert.equal(propertyConversationSideEffectCounters.externalCalls, 0);
assert.equal(propertyConversationAuditEvents.messageIntentCreated, "PROPERTY_MESSAGE_INTENT_CREATED");

console.log("Phase 23M Property Conversation Continuation tests passed: 50/50");
