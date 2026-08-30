import assert from "node:assert/strict";
import {
  buildPropertyViewingViewModel,
  confirmPropertyViewingThroughGateway,
  createLocalPropertyViewingStore,
  createPropertyViewingAvailabilityWindow,
  createPropertyViewingCancellation,
  createPropertyViewingConfirmationIntent,
  createPropertyViewingHistoryItem,
  createPropertyViewingRequest,
  createPropertyViewingRequestIntent,
  createPropertyViewingRescheduleRequest,
  createPropertyViewingSlotSelection,
  generatePropertyViewingSlots,
  preflightPropertyViewingConfirmation,
  propertyViewingConfirmationPreflightStatuses,
  propertyViewingExecutionActionTypes,
  propertyViewingLocationDisclosureStatuses,
  propertyViewingRequestTypes,
  propertyViewingSideEffectCounters,
  propertyViewingStatuses
} from "../src/property/index.js";

const owner = buildPropertyViewingViewModel({ case: "owner" });
const agent = buildPropertyViewingViewModel({ case: "agent" });
const expiredAgent = buildPropertyViewingViewModel({ case: "expiredAgent" });
const managerNoAuthority = buildPropertyViewingViewModel({ case: "managerNoAuthority" });
const managerViewingAuthority = buildPropertyViewingViewModel({ case: "managerViewingAuthority" });
const cleaner = buildPropertyViewingViewModel({ case: "cleaner" });
const buyerConsentRevoked = buildPropertyViewingViewModel({ case: "buyerConsentRevoked" });
const listingUnpublished = buildPropertyViewingViewModel({ case: "listingUnpublished" });
const conversationPaused = buildPropertyViewingViewModel({ case: "conversationPaused" });
const locationPrivacy = buildPropertyViewingViewModel({ case: "locationPrivacy" });
const noSellerAvailability = buildPropertyViewingViewModel({ case: "noSellerAvailability" });
const overlapConflict = buildPropertyViewingViewModel({ case: "overlapConflict" });
const rescheduleCancel = buildPropertyViewingViewModel({ case: "rescheduleCancel" });
const idempotent = buildPropertyViewingViewModel({ case: "idempotent" });
const stateMismatch = buildPropertyViewingViewModel({ case: "stateMismatch" });
const ownerTakeover = buildPropertyViewingViewModel({ case: "ownerTakeover" });

assert.equal(owner.requestIntent.modelType, "PropertyViewingRequestIntent", "1 viewing request intent");
assert.equal(owner.request.modelType, "PropertyViewingRequest", "2 viewing request contract");
assert.equal(Object.values(propertyViewingStatuses).includes("CONFIRMED_LOCAL_PROOF"), true, "3 status model");
assert.equal(createPropertyViewingRequest({ intent: createPropertyViewingRequestIntent({ conversation: {} }) }).blockers.includes("conversation_required"), true, "4 existing conversation required");
assert.equal(owner.request.leadId, owner.conversation.leadId, "5 Lead linkage");
assert.equal(owner.request.listingId, owner.conversation.listingId, "6 Listing linkage");
assert.equal(owner.request.propertyId, owner.conversation.propertyId, "7 Property linkage");
assert.equal(owner.buyer.participantRole, "BUYER", "8 buyer participant");
assert.equal(owner.confirmation.preflight.status, propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation, "9 seller authority");
assert.equal(owner.confirmation.status, "CONFIRMED_VIEWING_LOCAL_PROOF", "10 owner scenario");
assert.equal(agent.confirmation.status, "CONFIRMED_VIEWING_LOCAL_PROOF", "11 agent scenario");
assert.equal(expiredAgent.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedSellerAuthority, "12 expired agent");
assert.equal(managerNoAuthority.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedSellerAuthority, "13 manager no authority");
assert.equal(managerViewingAuthority.confirmation.status, "CONFIRMED_VIEWING_LOCAL_PROOF", "14 manager explicit authority");
assert.equal(cleaner.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedSellerAuthority, "15 cleaner blocked");
assert.equal(buyerConsentRevoked.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedBuyerConsent, "16 buyer consent");
assert.equal(buildPropertyViewingViewModel({ case: "listingRolledBack" }).confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedListingState, "17 Listing state");
assert.equal(listingUnpublished.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedPublicationState, "18 publication state");
assert.equal(conversationPaused.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedConversationState, "19 conversation state");
assert.equal(locationPrivacy.locationDisclosure.beforeConfirmation, propertyViewingLocationDisclosureStatuses.publicLocationOnly, "20 location disclosure");
assert.equal(locationPrivacy.exactAddressVisibleBeforeConfirmation, false, "21 exact-address boundary");
assert.equal(owner.buyerAvailability[0].modelType, "PropertyViewingAvailabilityWindow", "22 buyer availability");
assert.equal(owner.sellerAvailability[0].modelType, "PropertyViewingAvailabilityWindow", "23 seller availability");
assert.equal(owner.timezone, "Asia/Tbilisi", "24 timezone");
assert.equal(owner.slots.length > 0 && owner.slots[0].startTime === "15:00", true, "25 slot generation");
assert.equal(noSellerAvailability.slotResult.status, propertyViewingStatuses.waitingForSellerAvailability, "26 no invented slots");
assert.equal(owner.selectedSlot.status, "SLOT_SELECTED", "27 slot selection");
assert.equal(owner.request.readinessStatus === propertyViewingStatuses.confirmedLocalProof || owner.confirmationIntent.approvalStatus === "SELLER_ACTION_INTENT_LOCAL", true, "28 seller confirmation required");
assert.equal(owner.confirmationIntent.modelType, "PropertyViewingConfirmationIntent", "29 confirmation intent");
assert.equal(propertyViewingExecutionActionTypes.confirmViewingLocalProof, "CONFIRM_PROPERTY_VIEWING_LOCAL_PROOF", "30 only allowed controlled action");
assert.equal(owner.confirmation.preflight.modelType, "PropertyViewingConfirmationPreflight", "31 preflight");
assert.equal(owner.confirmationIntent.approvalStatus, "SELLER_ACTION_INTENT_LOCAL", "32 human control");
assert.equal(owner.lisaGuide.mayConfirmViewing, false, "33 Lisa cannot confirm");
assert.equal(owner.navigatorRouting.mayConfirmViewing, false, "34 Navigator cannot confirm");
assert.equal(owner.confirmation.gateway.decision, "READY", "35 ExecutionGateway");
assert.equal(owner.localViewingsConfirmed, 1, "36 atomic confirmation");
assert.equal(owner.viewing.viewingId.startsWith("property_viewing_"), true, "37 Viewing ID");
assert.equal(idempotent.idempotent.status, "ALREADY_CONFIRMED_IDEMPOTENT", "38 idempotency");
assert.equal(overlapConflict.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedSlotConflict, "39 overlap conflict");
assert.equal(stateMismatch.confirmation.status, propertyViewingConfirmationPreflightStatuses.blockedStateMismatch, "40 state mismatch");
assert.equal(ownerTakeover.routeChangeRepreflight.modelType, "PropertyConversationRouteChangeHistoryItem", "41 route-change re-preflight");
assert.equal(rescheduleCancel.reschedule.status, "REQUESTED_LOCAL", "42 reschedule");
assert.equal(rescheduleCancel.reschedule.auditMetadata.noSilentOverwrite, true, "43 no silent overwrite");
assert.equal(rescheduleCancel.cancellation.status, propertyViewingStatuses.cancelledLocal, "44 cancellation");
assert.equal(owner.historyItem.modelType, "PropertyViewingHistoryItem", "45 history");
assert.equal(owner.viewing.attributionRef, owner.conversation.attributionRef, "46 attribution");
assert.equal(owner.propertyReservationsCreated, 0, "47 no reservation");
assert.equal(owner.formalOffersCreated, 0, "48 no Offer");
assert.deepEqual({ dealRoomActions: owner.dealRoomActions, paymentActions: owner.paymentActions, providerCalls: owner.providerCalls, productionDbMutations: owner.productionDbMutations }, { dealRoomActions: 0, paymentActions: 0, providerCalls: 0, productionDbMutations: 0 }, "49 no DealRoom/payment/provider/DB");
assert.equal(owner.localViewingRequestsCreated >= 1 && owner.localViewingsConfirmed === 1, true, "50 regressions");

assert.equal(propertyViewingRequestTypes.inPersonViewing, "IN_PERSON_VIEWING");
assert.equal(typeof createLocalPropertyViewingStore, "function");
assert.equal(typeof createPropertyViewingAvailabilityWindow, "function");
assert.equal(typeof generatePropertyViewingSlots, "function");
assert.equal(typeof createPropertyViewingSlotSelection, "function");
assert.equal(typeof createPropertyViewingConfirmationIntent, "function");
assert.equal(typeof preflightPropertyViewingConfirmation, "function");
assert.equal(typeof confirmPropertyViewingThroughGateway, "function");
assert.equal(typeof createPropertyViewingRescheduleRequest, "function");
assert.equal(typeof createPropertyViewingCancellation, "function");
assert.equal(typeof createPropertyViewingHistoryItem, "function");
assert.equal(propertyViewingSideEffectCounters.externalCalendarEventsCreated, 0);

console.log("Phase 23O Property Viewing Workflow tests passed: 50/50");
