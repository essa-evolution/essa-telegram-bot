import assert from "node:assert/strict";
import {
  appendPropertyConversationMessageThroughGateway,
  buildPropertyConversationRouteChangeViewModel,
  changePropertyConversationSellerParticipantThroughGateway,
  createLocalPropertyConversationStore,
  createNavigatorPropertyConversationRouting,
  createPropertyConversationParticipantChangeIntent,
  createPropertyConversationRouteChangeHistoryItem,
  createLisaPropertyConversationGuide,
  evaluatePropertyConversationRouteChangeReadiness,
  preflightPropertyConversationParticipantChange,
  propertyConversationExecutionActionTypes,
  propertyConversationParticipantChangePreflightStatuses,
  propertyConversationRouteChangeReasons,
  propertyConversationRouteChangeReadinessStatuses,
  propertyConversationSideEffectCounters
} from "../src/property/index.js";

const owner = buildPropertyConversationRouteChangeViewModel({ case: "ownerFallback" });
const agentB = buildPropertyConversationRouteChangeViewModel({ case: "agentB" });
const multiple = buildPropertyConversationRouteChangeViewModel({ case: "multipleAgents" });
const noRoute = buildPropertyConversationRouteChangeViewModel({ case: "noValidRoute" });
const manager = buildPropertyConversationRouteChangeViewModel({ case: "managerBlocked" });
const cleaner = buildPropertyConversationRouteChangeViewModel({ case: "cleanerBlocked" });
const consent = buildPropertyConversationRouteChangeViewModel({ case: "consentRevoked" });
const unpublished = buildPropertyConversationRouteChangeViewModel({ case: "listingUnpublished" });
const idempotent = buildPropertyConversationRouteChangeViewModel({ case: "idempotent" });
const mismatch = buildPropertyConversationRouteChangeViewModel({ case: "stateMismatch" });
const revoked = buildPropertyConversationRouteChangeViewModel({ case: "revokedAuthority" });
const developer = buildPropertyConversationRouteChangeViewModel({ case: "developerRepresentative" });

assert.equal(owner.readiness.modelType, "PropertyConversationRouteChangeReadiness", "1 route readiness contract");
assert.deepEqual(Object.values(propertyConversationRouteChangeReasons).includes("AUTHORITY_EXPIRED"), true, "2 route reasons");
assert.equal(owner.readiness.currentAuthorityStatus, "EXPIRED", "3 expired authority trigger");
assert.equal(revoked.readiness.routeChangeReason, propertyConversationRouteChangeReasons.authorityRevoked, "4 revoked authority trigger");
assert.equal(owner.readiness.status, propertyConversationRouteChangeReadinessStatuses.ownerFallbackAvailable, "5 owner fallback");
assert.equal(agentB.readiness.status, propertyConversationRouteChangeReadinessStatuses.replacementFound, "6 authorized agent candidate");
assert.equal(developer.readiness.candidateRoutes.some((candidate) => candidate.participantRole === "DEVELOPER_REPRESENTATIVE" && candidate.eligible), true, "7 developer representative candidate");
assert.equal(manager.participantChange.status, propertyConversationParticipantChangePreflightStatuses.blockedIncomingAuthority, "8 manager excluded");
assert.equal(cleaner.participantChange.status, propertyConversationParticipantChangePreflightStatuses.blockedIncomingAuthority, "9 cleaner excluded");
assert.equal(multiple.readiness.status, propertyConversationRouteChangeReadinessStatuses.multipleReplacementsReviewRequired, "10 multiple candidates");
assert.equal(noRoute.readiness.status, propertyConversationRouteChangeReadinessStatuses.blockedNoAuthorizedRoute, "11 no candidate");
assert.equal(consent.readiness.status, propertyConversationRouteChangeReadinessStatuses.blockedBuyerConsent, "12 buyer consent recheck");
assert.equal(unpublished.participantChange.status, propertyConversationParticipantChangePreflightStatuses.blockedPublicationState, "13 listing recheck");
assert.equal(unpublished.readiness.publicationStatus, "UNPUBLISHED_LOCAL_PROOF", "14 publication recheck");
assert.equal(owner.participantChangeIntent.modelType, "PropertyConversationParticipantChangeIntent", "15 participant change intent");
assert.equal(propertyConversationExecutionActionTypes.changeSellerParticipantLocalProof, "CHANGE_PROPERTY_CONVERSATION_SELLER_PARTICIPANT_LOCAL_PROOF", "16 only allowed action");
assert.equal(owner.participantChange.preflight.status, propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange, "17 preflight");
assert.equal(owner.participantChange.preflight.incomingAuthorityValidation.ok, true, "18 incoming authority");
assert.equal(mismatch.participantChange.status, propertyConversationParticipantChangePreflightStatuses.blockedStateMismatch, "19 scope validation/state mismatch");
assert.equal(agentB.selectedCandidate.organizationMembershipStatus, "ACTIVE_LOCAL_PROOF", "20 organization membership");
assert.equal(owner.participantChangeIntent.requestedBy, "local_human_seller_side_control", "21 human control");
assert.equal(owner.lisaGuide.mayExecuteRouteChange, false, "22 Lisa cannot execute");
assert.equal(owner.navigatorRouting.mayExecuteRouteChange, false, "23 Navigator cannot execute");
assert.equal(owner.participantChange.gateway.decision, "READY", "24 Gateway enforcement");
assert.equal(owner.sellerParticipantChangesLocal, 1, "25 atomic change");
assert.equal(owner.participants.some((participant) => participant.participantId === owner.outgoingParticipant.participantId && participant.participationStatus === "INACTIVE_ROUTE_LOCAL"), true, "26 outgoing participant preserved");
assert.equal(owner.participants.some((participant) => participant.actorRef?.actorId === owner.selectedCandidate.actorRef.actorId && participant.participationStatus === "ACTIVE_LOCAL_PROOF"), true, "27 incoming participant appended");
assert.equal(owner.participants.filter((participant) => participant.participantRole === "BUYER").length, 1, "28 buyer preserved");
assert.equal(owner.messages.length >= 3, true, "29 messages preserved");
assert.equal(owner.messages[0].senderActorRef.actorId !== owner.selectedCandidate.actorRef.actorId, true, "30 authorship preserved");
assert.equal(owner.conversation.attributionRef, owner.originalAttributionRef, "31 attribution preserved");
assert.equal(owner.conversation.conversationId, owner.originalConversationId, "32 conversationId preserved");
assert.equal(owner.conversation.leadId, owner.originalLeadId, "33 Lead preserved");
assert.deepEqual({ listingId: owner.conversation.listingId, propertyId: owner.conversation.propertyId }, { listingId: owner.originalListingId, propertyId: owner.originalPropertyId }, "34 Listing/Property preserved");
assert.equal(idempotent.idempotent.status, "ALREADY_CHANGED_IDEMPOTENT", "35 idempotency");
assert.equal(mismatch.participantChange.status, propertyConversationParticipantChangePreflightStatuses.blockedStateMismatch, "36 state mismatch");
assert.equal(owner.conversation.routeChangeStatus, "RESUME_READY_LOCAL", "37 resume readiness");
assert.equal(owner.oldSellerAppend.status, "BLOCKED_PARTICIPANT", "38 old seller append blocked");
assert.equal(owner.newSellerAppend.status, "DELIVERED_INSIDE_ESSA_LOCAL_PROOF", "39 new seller Phase 23M append succeeds");
assert.deepEqual(owner.historyItems.map((item) => item.sequence).slice(0, 3), [1, 2, 3], "40 message sequence preserved");
assert.equal(owner.messages.some((message) => message.messageType === "SYSTEM_NOTICE"), false, "41 safe system notice deferred");
assert.equal(owner.contactReveals, 0, "42 privacy");
assert.equal(owner.routeHistoryItem.modelType, "PropertyConversationRouteChangeHistoryItem", "43 route-change history");
assert.equal(owner.newLeadsCreated, 0, "44 no new Lead");
assert.equal(owner.newConversationsCreated, 0, "45 no new conversation");
assert.equal(owner.viewingBookings, 0, "46 no Viewing");
assert.equal(owner.formalOffersCreated, 0, "47 no Offer");
assert.deepEqual({ providerCalls: owner.providerCalls, externalCalls: owner.externalCalls }, { providerCalls: 0, externalCalls: 0 }, "48 no provider/external");
assert.equal(owner.productionDbMutations, 0, "49 no production DB");
assert.deepEqual({ paymentActions: owner.paymentActions, bookingActions: owner.bookingActions, commercialTransactionActions: owner.commercialTransactionActions }, { paymentActions: 0, bookingActions: 0, commercialTransactionActions: 0 }, "50 no payment/booking/transaction");

assert.equal(typeof evaluatePropertyConversationRouteChangeReadiness, "function");
assert.equal(typeof createPropertyConversationParticipantChangeIntent, "function");
assert.equal(typeof preflightPropertyConversationParticipantChange, "function");
assert.equal(typeof changePropertyConversationSellerParticipantThroughGateway, "function");
assert.equal(typeof appendPropertyConversationMessageThroughGateway, "function");
assert.equal(typeof createPropertyConversationRouteChangeHistoryItem, "function");
assert.equal(createLisaPropertyConversationGuide("agent").maySendWithoutApproval, false);
assert.equal(createNavigatorPropertyConversationRouting("agent no longer authorized").routeOnly, true);
assert.equal(createLocalPropertyConversationStore().counters().newLeadsCreated, 0);
assert.equal(propertyConversationSideEffectCounters.attributionMutations, 0);

console.log("Phase 23N Property Conversation Route Change tests passed: 50/50");
