import {
  createExecutionIntentFromDecision,
  executionIntentStatuses
} from "../agentToolLayer/executionQueue.js";
import { executionGateDecisions, prepareExecution } from "../agentToolLayer/executionGateway.js";
import {
  agentToolCostPolicy,
  agentToolDecisions,
  agentToolSideEffectClasses
} from "../agentToolLayer/toolRequestBridge.js";
import { toolEnvironments, toolPermissionClasses } from "../agentToolLayer/contracts.js";
import {
  appendPropertyConversationMessageThroughGateway,
  buildPropertyConversationContinuationViewModel,
  buildPropertyConversationRouteChangeViewModel,
  createPropertyConversationFingerprint,
  createPropertyConversationMessageIntent,
  createPropertyConversationRouteChangeHistoryItem,
  propertyConversationMessageTypes,
  propertyConversationParticipantRoles,
  propertyConversationStatuses
} from "./propertyConversation.js";
import { propertyAuthorityStatuses } from "./propertyActorAuthorityContracts.js";

const now = "2026-08-22T00:00:00.000Z";
const defaultDate = "2026-08-23";
const defaultTimezone = "Asia/Tbilisi";

export const propertyViewingExecutionActionTypes = {
  confirmViewingLocalProof: "CONFIRM_PROPERTY_VIEWING_LOCAL_PROOF"
};

export const propertyViewingRequestTypes = {
  inPersonViewing: "IN_PERSON_VIEWING",
  videoViewingFuture: "VIDEO_VIEWING_FUTURE",
  developerShowroomVisit: "DEVELOPER_SHOWROOM_VISIT",
  projectSiteVisit: "PROJECT_SITE_VISIT",
  otherStructuredViewing: "OTHER_STRUCTURED_VIEWING"
};

export const propertyViewingStatuses = {
  draft: "DRAFT",
  requestedLocal: "REQUESTED_LOCAL",
  waitingForSellerAvailability: "WAITING_FOR_SELLER_AVAILABILITY",
  slotsProposed: "SLOTS_PROPOSED",
  waitingForBuyerSelection: "WAITING_FOR_BUYER_SELECTION",
  slotSelected: "SLOT_SELECTED",
  readyForConfirmation: "READY_FOR_CONFIRMATION",
  confirmedLocalProof: "CONFIRMED_LOCAL_PROOF",
  rescheduleRequested: "RESCHEDULE_REQUESTED",
  cancelledLocal: "CANCELLED_LOCAL",
  expiredLocal: "EXPIRED_LOCAL",
  blocked: "BLOCKED",
  closedLocal: "CLOSED_LOCAL"
};

export const propertyViewingSlotStatuses = {
  proposed: "PROPOSED",
  availableLocalProof: "AVAILABLE_LOCAL_PROOF",
  selected: "SELECTED",
  expired: "EXPIRED",
  withdrawn: "WITHDRAWN",
  conflicted: "CONFLICTED",
  confirmedLocalProof: "CONFIRMED_LOCAL_PROOF"
};

export const propertyViewingLocationDisclosureStatuses = {
  publicLocationOnly: "PUBLIC_LOCATION_ONLY",
  approximateLocation: "APPROXIMATE_LOCATION",
  exactLocationReviewRequired: "EXACT_LOCATION_REVIEW_REQUIRED",
  exactLocationReadyLocalProof: "EXACT_LOCATION_READY_LOCAL_PROOF",
  meetingPointOnly: "MEETING_POINT_ONLY",
  blockedPrivacy: "BLOCKED_PRIVACY"
};

export const propertyViewingConfirmationPreflightStatuses = {
  readyForLocalConfirmation: "READY_FOR_LOCAL_CONFIRMATION",
  blockedViewingRequest: "BLOCKED_VIEWING_REQUEST",
  blockedSlot: "BLOCKED_SLOT",
  blockedSlotExpired: "BLOCKED_SLOT_EXPIRED",
  blockedSlotConflict: "BLOCKED_SLOT_CONFLICT",
  blockedSellerAuthority: "BLOCKED_SELLER_AUTHORITY",
  blockedBuyerConsent: "BLOCKED_BUYER_CONSENT",
  blockedListingState: "BLOCKED_LISTING_STATE",
  blockedPublicationState: "BLOCKED_PUBLICATION_STATE",
  blockedConversationState: "BLOCKED_CONVERSATION_STATE",
  blockedLocationPrivacy: "BLOCKED_LOCATION_PRIVACY",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  reviewRequired: "REVIEW_REQUIRED"
};

export const propertyViewingAuditEvents = {
  requestIntentCreated: "PROPERTY_VIEWING_REQUEST_INTENT_CREATED",
  requestCreatedLocal: "PROPERTY_VIEWING_REQUEST_CREATED_LOCAL",
  buyerAvailabilityRecorded: "VIEWING_BUYER_AVAILABILITY_RECORDED",
  sellerAvailabilityRecorded: "VIEWING_SELLER_AVAILABILITY_RECORDED",
  slotsProposed: "VIEWING_SLOTS_PROPOSED",
  slotSelected: "VIEWING_SLOT_SELECTED",
  confirmationIntentCreated: "VIEWING_CONFIRMATION_INTENT_CREATED",
  confirmationPreflightPassed: "VIEWING_CONFIRMATION_PREFLIGHT_PASSED",
  confirmationStarted: "VIEWING_CONFIRMATION_STARTED",
  confirmedLocalProof: "PROPERTY_VIEWING_CONFIRMED_LOCAL_PROOF",
  rescheduleRequested: "VIEWING_RESCHEDULE_REQUESTED",
  cancelledLocal: "VIEWING_CANCELLED_LOCAL",
  confirmationFailed: "VIEWING_CONFIRMATION_FAILED",
  stateMismatchBlocked: "VIEWING_STATE_MISMATCH_BLOCKED"
};

export const propertyViewingSideEffectCounters = {
  localViewingRequestsCreated: 0,
  localViewingSlotsProposed: 0,
  localViewingsConfirmed: 0,
  localViewingRescheduleRequests: 0,
  localViewingsCancelled: 0,
  duplicateViewingsCreated: 0,
  propertyReservationsCreated: 0,
  formalOffersCreated: 0,
  counterOffersCreated: 0,
  dealRoomActions: 0,
  externalCalendarEventsCreated: 0,
  externalNotificationsSent: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
  canonicalPropertyMutations: 0,
  listingMutations: 0,
  publicationMutations: 0,
  ownershipMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function audit(eventType, input = {}) {
  return {
    eventType,
    viewingRequestId: input.viewingRequestId || null,
    viewingId: input.viewingId || null,
    conversationId: input.conversationId || null,
    leadId: input.leadId || null,
    listingId: input.listingId || null,
    propertyId: input.propertyId || null,
    timestamp: now,
    appendOnly: true,
    ...propertyViewingSideEffectCounters
  };
}

export function createLocalPropertyViewingStore(input = {}) {
  const requests = new Map((input.requests || []).map((item) => [item.viewingRequestId, clone(item)]));
  const windows = new Map((input.availabilityWindows || []).map((item) => [item.availabilityWindowId, clone(item)]));
  const slots = new Map((input.slots || []).map((item) => [item.viewingSlotId, clone(item)]));
  const selections = new Map((input.selections || []).map((item) => [item.selectionId, clone(item)]));
  const viewings = new Map((input.viewings || []).map((item) => [item.viewingId, clone(item)]));
  const reschedules = new Map((input.reschedules || []).map((item) => [item.rescheduleRequestId, clone(item)]));
  const cancellations = new Map((input.cancellations || []).map((item) => [item.cancellationId, clone(item)]));
  const executionRecords = new Map();
  const idempotency = new Set(input.idempotencyKeys || []);
  const auditEvents = [];
  return {
    snapshot() {
      return {
        requests: [...requests.values()].map(clone),
        availabilityWindows: [...windows.values()].map(clone),
        slots: [...slots.values()].map(clone),
        selections: [...selections.values()].map(clone),
        viewings: [...viewings.values()].map(clone),
        reschedules: [...reschedules.values()].map(clone),
        cancellations: [...cancellations.values()].map(clone),
        executionRecords: [...executionRecords.values()].map(clone),
        idempotencyKeys: [...idempotency],
        auditEvents: auditEvents.map(clone)
      };
    },
    addRequest(request) { requests.set(request.viewingRequestId, clone(request)); },
    getRequest(id) { return clone(requests.get(id) || null); },
    updateRequest(id, updates) {
      const current = requests.get(id);
      if (!current) return null;
      requests.set(id, clone({ ...current, ...updates, updatedAt: now }));
      return clone(requests.get(id));
    },
    addWindow(window) { windows.set(window.availabilityWindowId, clone(window)); },
    listWindows(requestId) { return [...windows.values()].filter((item) => item.viewingRequestId === requestId).map(clone); },
    addSlot(slot) { slots.set(slot.viewingSlotId, clone(slot)); },
    getSlot(id) { return clone(slots.get(id) || null); },
    updateSlot(id, updates) {
      const current = slots.get(id);
      if (!current) return null;
      slots.set(id, clone({ ...current, ...updates, updatedAt: now }));
      return clone(slots.get(id));
    },
    listSlots(requestId) { return [...slots.values()].filter((item) => item.viewingRequestId === requestId).map(clone); },
    addSelection(selection) { selections.set(selection.selectionId, clone(selection)); },
    getSelection(id) { return clone(selections.get(id) || null); },
    addViewing(viewing) { viewings.set(viewing.viewingId, clone(viewing)); },
    getViewing(id) { return clone(viewings.get(id) || null); },
    findViewingByRequest(requestId) { return clone([...viewings.values()].find((item) => item.viewingRequestId === requestId) || null); },
    listViewings() { return [...viewings.values()].map(clone); },
    addReschedule(item) { reschedules.set(item.rescheduleRequestId, clone(item)); },
    listReschedules(viewingId) { return [...reschedules.values()].filter((item) => item.viewingId === viewingId).map(clone); },
    addCancellation(item) { cancellations.set(item.cancellationId, clone(item)); },
    listCancellations(viewingId) { return [...cancellations.values()].filter((item) => item.viewingId === viewingId).map(clone); },
    hasIdempotencyKey(key) { return idempotency.has(key); },
    addIdempotencyKey(key) { idempotency.add(key); },
    saveExecutionRecord(record) {
      executionRecords.set(record.executionRecordId, clone(record));
      return clone(record);
    },
    addAudit(event) { auditEvents.push(clone(event)); },
    auditEvents() { return auditEvents.map(clone); },
    counters() {
      return {
        ...propertyViewingSideEffectCounters,
        localViewingRequestsCreated: requests.size,
        localViewingSlotsProposed: slots.size,
        localViewingsConfirmed: [...viewings.values()].filter((item) => item.viewingStatus === propertyViewingStatuses.confirmedLocalProof).length,
        localViewingRescheduleRequests: reschedules.size,
        localViewingsCancelled: cancellations.size
      };
    }
  };
}

export function createPropertyViewingRequestIntent(input = {}) {
  const conversation = input.conversation || {};
  const fingerprint = createPropertyConversationFingerprint({
    conversationId: conversation.conversationId,
    sourceMessageId: input.sourceMessageId,
    requestedViewingMode: input.requestedViewingMode || propertyViewingRequestTypes.inPersonViewing,
    requestedAvailability: input.requestedAvailability
  });
  return {
    modelType: "PropertyViewingRequestIntent",
    viewingRequestIntentId: `viewing_request_intent_${conversation.conversationId || "blocked"}_${fingerprint.slice(-8)}`,
    conversationId: conversation.conversationId || null,
    sourceMessageId: input.sourceMessageId || null,
    leadId: conversation.leadId || null,
    propertyId: conversation.propertyId || null,
    listingId: conversation.listingId || null,
    publicationId: conversation.publicationId || null,
    buyerActorRef: clone(input.buyerActorRef || {}),
    requestedViewingMode: input.requestedViewingMode || propertyViewingRequestTypes.inPersonViewing,
    requestedAvailability: clone(input.requestedAvailability || []),
    requestedBy: input.requestedBy || input.buyerActorRef?.actorId || "local_buyer",
    createdAt: now,
    fingerprint,
    validationStatus: "DRAFT",
    idempotencyKey: input.idempotencyKey || `viewing-request:${conversation.conversationId}:${fingerprint}`,
    auditMetadata: { audit: [propertyViewingAuditEvents.requestIntentCreated], localProofOnly: true },
    ...propertyViewingSideEffectCounters
  };
}

export function createPropertyViewingRequest(input = {}) {
  const intent = input.intent || {};
  const seller = input.sellerParticipant || {};
  const blockers = [];
  if (!intent.conversationId) blockers.push("conversation_required");
  if (!intent.leadId) blockers.push("lead_required");
  if (!intent.listingId) blockers.push("listing_required");
  if (!intent.propertyId) blockers.push("property_required");
  if (!intent.buyerActorRef?.actorId) blockers.push("buyer_required");
  const requestStatus = blockers.length ? propertyViewingStatuses.blocked : propertyViewingStatuses.requestedLocal;
  return {
    modelType: "PropertyViewingRequest",
    viewingRequestId: `viewing_request_${intent.conversationId || "blocked"}_${intent.fingerprint?.slice(-8) || "local"}`,
    conversationId: intent.conversationId,
    leadId: intent.leadId,
    publicationId: intent.publicationId,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    buyerActorRef: clone(intent.buyerActorRef),
    sellerActorRef: clone(seller.actorRef || input.sellerActorRef || {}),
    sellerOrganizationRef: clone(seller.organizationRef || null),
    sellerAuthorityRef: seller.authorityRef || input.sellerAuthorityRef || null,
    requestType: input.requestType || propertyViewingRequestTypes.inPersonViewing,
    viewingMode: input.viewingMode || propertyViewingRequestTypes.inPersonViewing,
    buyerAvailability: clone(input.buyerAvailability || []),
    preferredDateRange: input.preferredDateRange || { startDate: defaultDate, endDate: defaultDate, timezone: defaultTimezone },
    preferredTimeWindows: clone(input.preferredTimeWindows || []),
    attendeeCount: input.attendeeCount || 1,
    attendeeNotes: input.attendeeNotes || "",
    locationDisclosurePolicy: input.locationDisclosurePolicy || propertyViewingLocationDisclosureStatuses.publicLocationOnly,
    consentRef: input.consentRef || "buyer_viewing_consent_local",
    requestStatus,
    readinessStatus: blockers.length ? "BLOCKED" : "WAITING_FOR_AVAILABILITY",
    blockers,
    warnings: [],
    createdAt: now,
    updatedAt: now,
    auditMetadata: { audit: [propertyViewingAuditEvents.requestCreatedLocal], localProofOnly: true },
    ...propertyViewingSideEffectCounters
  };
}

export function createPropertyViewingAvailabilityWindow(input = {}) {
  return {
    modelType: "PropertyViewingAvailabilityWindow",
    availabilityWindowId: input.availabilityWindowId || `viewing_window_${input.viewingRequestId}_${input.actorRef?.actorId || input.source}_${input.startTime}`,
    viewingRequestId: input.viewingRequestId,
    actorRef: clone(input.actorRef || {}),
    date: input.date || defaultDate,
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone || defaultTimezone,
    source: input.source || "LOCAL_PARTICIPANT_INPUT",
    status: input.status || "AVAILABLE_LOCAL_PROOF",
    createdAt: now,
    ...propertyViewingSideEffectCounters
  };
}

function timeToMinutes(value = "00:00") {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function generatePropertyViewingSlots(input = {}) {
  const { request, buyerWindows = [], sellerWindows = [], store } = input;
  const slots = [];
  if (!buyerWindows.length || !sellerWindows.length) {
    return { ok: false, status: propertyViewingStatuses.waitingForSellerAvailability, slots, noInventedSlots: true, ...propertyViewingSideEffectCounters };
  }
  buyerWindows.forEach((buyerWindow) => {
    sellerWindows.forEach((sellerWindow) => {
      if (buyerWindow.date !== sellerWindow.date || buyerWindow.timezone !== sellerWindow.timezone) return;
      const start = Math.max(timeToMinutes(buyerWindow.startTime), timeToMinutes(sellerWindow.startTime));
      const end = Math.min(timeToMinutes(buyerWindow.endTime), timeToMinutes(sellerWindow.endTime));
      if (end - start < 30) return;
      const slotStart = start;
      const slotEnd = Math.min(start + 60, end);
      const fingerprint = createPropertyConversationFingerprint({ requestId: request.viewingRequestId, date: buyerWindow.date, start: slotStart, end: slotEnd, timezone: buyerWindow.timezone });
      slots.push({
        modelType: "PropertyViewingSlot",
        viewingSlotId: `viewing_slot_${request.viewingRequestId}_${fingerprint.slice(-8)}`,
        viewingRequestId: request.viewingRequestId,
        propertyId: request.propertyId,
        date: buyerWindow.date,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        timezone: buyerWindow.timezone,
        proposedBy: sellerWindow.actorRef?.actorId || "local_seller",
        slotStatus: propertyViewingSlotStatuses.availableLocalProof,
        availabilityRefs: [buyerWindow.availabilityWindowId, sellerWindow.availabilityWindowId],
        createdAt: now,
        fingerprint,
        ...propertyViewingSideEffectCounters
      });
    });
  });
  slots.forEach((slot) => store?.addSlot(slot));
  if (slots.length) store?.addAudit(audit(propertyViewingAuditEvents.slotsProposed, { viewingRequestId: request.viewingRequestId, conversationId: request.conversationId, leadId: request.leadId, listingId: request.listingId, propertyId: request.propertyId }));
  return { ok: slots.length > 0, status: slots.length ? propertyViewingStatuses.slotsProposed : propertyViewingStatuses.waitingForSellerAvailability, slots, noInventedSlots: true, localViewingSlotsProposed: slots.length, ...Object.fromEntries(Object.entries(propertyViewingSideEffectCounters).filter(([key]) => key !== "localViewingSlotsProposed")) };
}

export function createPropertyViewingSlotSelection(input = {}) {
  const slot = input.slot || {};
  const selection = {
    modelType: "PropertyViewingSlotSelection",
    selectionId: `viewing_selection_${slot.viewingSlotId || "blocked"}`,
    viewingRequestId: slot.viewingRequestId,
    viewingSlotId: slot.viewingSlotId,
    buyerActorRef: clone(input.buyerActorRef || {}),
    selectedAt: now,
    status: "SLOT_SELECTED",
    fingerprint: createPropertyConversationFingerprint({ slotId: slot.viewingSlotId, buyer: input.buyerActorRef }),
    auditMetadata: { audit: [propertyViewingAuditEvents.slotSelected], localProofOnly: true },
    ...propertyViewingSideEffectCounters
  };
  input.store?.addSelection(selection);
  input.store?.updateSlot(slot.viewingSlotId, { slotStatus: propertyViewingSlotStatuses.selected });
  input.store?.updateRequest(slot.viewingRequestId, { requestStatus: propertyViewingStatuses.slotSelected, readinessStatus: propertyViewingStatuses.readyForConfirmation });
  input.store?.addAudit(audit(propertyViewingAuditEvents.slotSelected, { viewingRequestId: slot.viewingRequestId }));
  return selection;
}

export function createPropertyViewingConfirmationIntent(input = {}) {
  const request = input.request || {};
  const slot = input.slot || {};
  const fingerprint = createPropertyConversationFingerprint({
    viewingRequestId: request.viewingRequestId,
    selectedSlotId: slot.viewingSlotId,
    slotFingerprint: slot.fingerprint,
    sellerAuthorityRef: request.sellerAuthorityRef,
    locationDisclosureStatus: input.locationDisclosureStatus
  });
  return {
    modelType: "PropertyViewingConfirmationIntent",
    confirmationIntentId: `viewing_confirmation_${request.viewingRequestId || "blocked"}_${fingerprint.slice(-8)}`,
    actionType: propertyViewingExecutionActionTypes.confirmViewingLocalProof,
    viewingRequestId: request.viewingRequestId,
    selectedSlotId: slot.viewingSlotId,
    propertyId: request.propertyId,
    listingId: request.listingId,
    conversationId: request.conversationId,
    buyerActorRef: clone(request.buyerActorRef),
    sellerActorRef: clone(request.sellerActorRef),
    sellerAuthorityRef: request.sellerAuthorityRef,
    consentSnapshot: input.consentSnapshot || request.consentRef,
    locationDisclosureStatus: input.locationDisclosureStatus || propertyViewingLocationDisclosureStatuses.exactLocationReadyLocalProof,
    slotFingerprint: slot.fingerprint,
    listingSnapshot: clone(input.listingSnapshot || { listingId: request.listingId }),
    authoritySnapshot: clone(input.authoritySnapshot || { sellerAuthorityRef: request.sellerAuthorityRef }),
    requestedBy: input.requestedBy || request.sellerActorRef?.actorId || "local_authorized_seller",
    createdAt: now,
    preflightStatus: "DRAFT",
    approvalStatus: "SELLER_ACTION_INTENT_LOCAL",
    executionStatus: "DRAFT",
    idempotencyKey: input.idempotencyKey || `viewing-confirm:${request.viewingRequestId}:${slot.viewingSlotId}:${fingerprint}`,
    expectedPostConditions: {
      viewingCreated: true,
      requestStatus: propertyViewingStatuses.confirmedLocalProof,
      slotStatus: propertyViewingSlotStatuses.confirmedLocalProof,
      reservationCreated: false,
      offerCreated: false,
      dealRoomCreated: false,
      providerCalls: 0
    },
    auditMetadata: { audit: [propertyViewingAuditEvents.confirmationIntentCreated], localProofOnly: true },
    ...propertyViewingSideEffectCounters
  };
}

function sellerAuthorityAllowsViewing(authority = {}) {
  if (authority.status !== propertyAuthorityStatuses.activeLocalProof) return false;
  if (authority.actorKind === "CLEANER") return false;
  if (authority.actorKind === "MANAGER") return (authority.allowedActions || []).includes("COORDINATE_VIEWING");
  return (authority.allowedActions || ["COORDINATE_VIEWING"]).includes("COORDINATE_VIEWING") ||
    (authority.allowedActions || []).includes("MANAGE_PROPERTY_VIEWINGS");
}

export function preflightPropertyViewingConfirmation(input = {}) {
  const { intent = {}, request = {}, slot = {}, conversation = {}, authority = {}, consent = {}, publicationRecord = {}, store = createLocalPropertyViewingStore(), existingViewings = [], policy = {} } = input;
  const blockers = [];
  let status = propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation;
  if (!request.viewingRequestId || request.requestStatus === propertyViewingStatuses.blocked) {
    status = propertyViewingConfirmationPreflightStatuses.blockedViewingRequest;
    blockers.push("valid_viewing_request_required");
  }
  if (!slot.viewingSlotId || slot.slotStatus === propertyViewingSlotStatuses.expired) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedSlotExpired : status;
    blockers.push("valid_selected_slot_required");
  }
  if (![propertyViewingSlotStatuses.selected, propertyViewingSlotStatuses.availableLocalProof].includes(slot.slotStatus)) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedSlot : status;
    blockers.push("slot_must_be_selected");
  }
  if (!sellerAuthorityAllowsViewing(authority)) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedSellerAuthority : status;
    blockers.push("seller_viewing_authority_required");
  }
  if (consent.revokedAt) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedBuyerConsent : status;
    blockers.push("buyer_viewing_consent_required");
  }
  if (publicationRecord.listingStatus === "ROLLED_BACK_LOCAL_PROOF") {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedListingState : status;
    blockers.push("listing_not_compatible");
  }
  if (publicationRecord.publicationStatus === "UNPUBLISHED_LOCAL_PROOF") {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedPublicationState : status;
    blockers.push("publication_not_compatible");
  }
  if (!conversation.conversationId || conversation.conversationStatus !== propertyConversationStatuses.activeLocalProof) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedConversationState : status;
    blockers.push("active_conversation_required");
  }
  if (intent.locationDisclosureStatus === propertyViewingLocationDisclosureStatuses.blockedPrivacy) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedLocationPrivacy : status;
    blockers.push("location_privacy_blocked");
  }
  if (request.conversationId !== intent.conversationId || request.propertyId !== intent.propertyId || request.listingId !== intent.listingId || slot.fingerprint !== intent.slotFingerprint) {
    status = propertyViewingConfirmationPreflightStatuses.blockedStateMismatch;
    blockers.push("confirmation_state_mismatch");
  }
  const overlapConflict = existingViewings.some((viewing) => viewing.propertyId === request.propertyId &&
    viewing.viewingStatus === propertyViewingStatuses.confirmedLocalProof &&
    viewing.confirmedSlot?.date === slot.date &&
    Math.max(timeToMinutes(viewing.confirmedSlot.startTime), timeToMinutes(slot.startTime)) < Math.min(timeToMinutes(viewing.confirmedSlot.endTime), timeToMinutes(slot.endTime)));
  if (overlapConflict && policy.allowOverlappingViewings !== true) {
    status = status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation ? propertyViewingConfirmationPreflightStatuses.blockedSlotConflict : status;
    blockers.push("overlapping_confirmed_viewing");
  }
  if (store.hasIdempotencyKey(intent.idempotencyKey)) {
    status = propertyViewingConfirmationPreflightStatuses.blockedIdempotency;
    blockers.push("viewing_already_confirmed");
  }
  return {
    modelType: "PropertyViewingConfirmationPreflight",
    ok: status === propertyViewingConfirmationPreflightStatuses.readyForLocalConfirmation,
    status,
    preflightStatus: status,
    blockers: [...new Set(blockers)],
    createdAt: now,
    ...propertyViewingSideEffectCounters
  };
}

function createViewingConfirmationAgentToolIntent(intent = {}) {
  return createExecutionIntentFromDecision({
    request: {
      requestId: `req_${intent.confirmationIntentId}`,
      taskId: "phase_23o",
      projectId: "essa_property_local",
      toolId: "property.local.execution",
      capability: "property_canonical_resolution_association",
      action: propertyViewingExecutionActionTypes.confirmViewingLocalProof,
      input: {
        operation: "confirm_property_viewing_local_proof",
        writeScope: "local_property_viewing_store",
        confirmationIntentId: intent.confirmationIntentId,
        viewingRequestId: intent.viewingRequestId,
        conversationId: intent.conversationId,
        listingId: intent.listingId,
        propertyId: intent.propertyId
      },
      environment: toolEnvironments.local,
      permissionLevel: toolPermissionClasses.localMutation,
      estimatedCost: agentToolCostPolicy.localCompute,
      sideEffectClass: agentToolSideEffectClasses.localOnly,
      requestedByAgent: "ESSA_PROPERTY_VIEWING_LOCAL",
      requestedByProvider: null,
      sourceArtifactRefs: [intent.conversationId, intent.viewingRequestId],
      targetArtifactRefs: [intent.confirmationIntentId],
      traceId: `trace_${intent.confirmationIntentId}`
    },
    decision: {
      requestId: `req_${intent.confirmationIntentId}`,
      toolId: "property.local.execution",
      decision: agentToolDecisions.allow,
      reason: "explicit_authorized_seller_local_viewing_confirmation",
      normalizedInput: { operation: "confirm_property_viewing_local_proof", confirmationIntentId: intent.confirmationIntentId },
      approvalRequired: false,
      traceId: `trace_${intent.confirmationIntentId}`
    }
  }, {
    executionIntentId: `agent_${intent.confirmationIntentId}`,
    idempotencyKey: intent.idempotencyKey,
    createdAt: intent.createdAt,
    ttlMinutes: 10,
    maxApprovedCost: 0
  });
}

export function confirmPropertyViewingThroughGateway(input = {}) {
  const { intent, request, slot, conversation, authority, consent = {}, publicationRecord = {}, store = createLocalPropertyViewingStore(), existingViewings = [], policy = {} } = input;
  if (store.hasIdempotencyKey(intent.idempotencyKey)) {
    return { ok: true, status: "ALREADY_CONFIRMED_IDEMPOTENT", viewing: store.findViewingByRequest(intent.viewingRequestId), duplicateViewingsCreated: 0, ...store.counters(), ...Object.fromEntries(Object.entries(propertyViewingSideEffectCounters).filter(([key]) => !(key in store.counters()) && key !== "duplicateViewingsCreated")) };
  }
  const preflight = preflightPropertyViewingConfirmation({ intent, request, slot, conversation, authority, consent, publicationRecord, store, existingViewings, policy });
  if (!preflight.ok) {
    store.addAudit(audit(preflight.status === propertyViewingConfirmationPreflightStatuses.blockedStateMismatch ? propertyViewingAuditEvents.stateMismatchBlocked : propertyViewingAuditEvents.confirmationFailed, { viewingRequestId: request?.viewingRequestId, conversationId: intent?.conversationId, listingId: intent?.listingId, propertyId: intent?.propertyId }));
    return { ok: false, status: preflight.status, preflight, ...propertyViewingSideEffectCounters };
  }
  const agentIntent = { ...createViewingConfirmationAgentToolIntent(intent), status: executionIntentStatuses.readyForExecution };
  const gateway = prepareExecution(agentIntent, {
    expectedProjectId: "essa_property_local",
    expectedTaskId: "phase_23o",
    executionHistory: []
  });
  if (gateway.decision !== executionGateDecisions.ready) return { ok: false, status: "GATEWAY_BLOCKED", gateway, ...propertyViewingSideEffectCounters };
  const beforeSnapshot = store.snapshot();
  store.addAudit(audit(propertyViewingAuditEvents.confirmationPreflightPassed, { viewingRequestId: request.viewingRequestId, conversationId: request.conversationId, leadId: request.leadId, listingId: request.listingId, propertyId: request.propertyId }));
  store.addAudit(audit(propertyViewingAuditEvents.confirmationStarted, { viewingRequestId: request.viewingRequestId, conversationId: request.conversationId, leadId: request.leadId, listingId: request.listingId, propertyId: request.propertyId }));
  const viewingId = `property_viewing_${request.viewingRequestId}_${slot.fingerprint.slice(-8)}`;
  const viewing = {
    modelType: "PropertyViewing",
    viewingId,
    viewingRequestId: request.viewingRequestId,
    conversationId: request.conversationId,
    leadId: request.leadId,
    publicationId: request.publicationId,
    listingId: request.listingId,
    propertyId: request.propertyId,
    buyerActorRef: clone(request.buyerActorRef),
    sellerActorRef: clone(request.sellerActorRef),
    sellerAuthorityRef: request.sellerAuthorityRef,
    viewingMode: request.viewingMode,
    confirmedSlot: clone({ ...slot, slotStatus: propertyViewingSlotStatuses.confirmedLocalProof }),
    timezone: slot.timezone,
    locationDisclosureStatus: intent.locationDisclosureStatus,
    viewingStatus: propertyViewingStatuses.confirmedLocalProof,
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
    attributionRef: conversation.attributionRef || "ESSA_PROPERTY_MARKETPLACE",
    auditMetadata: { audit: [propertyViewingAuditEvents.confirmedLocalProof], localProofOnly: true },
    localProofOnly: true,
    ...propertyViewingSideEffectCounters
  };
  store.addViewing(viewing);
  store.updateSlot(slot.viewingSlotId, { slotStatus: propertyViewingSlotStatuses.confirmedLocalProof });
  store.updateRequest(request.viewingRequestId, { requestStatus: propertyViewingStatuses.confirmedLocalProof, readinessStatus: propertyViewingStatuses.confirmedLocalProof });
  store.addIdempotencyKey(intent.idempotencyKey);
  store.addAudit(audit(propertyViewingAuditEvents.confirmedLocalProof, { viewingRequestId: request.viewingRequestId, viewingId, conversationId: request.conversationId, leadId: request.leadId, listingId: request.listingId, propertyId: request.propertyId }));
  const record = store.saveExecutionRecord({
    executionRecordId: `property_viewing_exec_${intent.confirmationIntentId}`,
    executionIntentId: intent.confirmationIntentId,
    agentExecutionIntentId: agentIntent.executionIntentId,
    actionType: intent.actionType,
    idempotencyKey: intent.idempotencyKey,
    executionStatus: "VERIFIED_LOCAL_PROOF",
    gateway,
    viewingId,
    beforeSnapshot,
    audit: store.auditEvents(),
    ...store.counters()
  });
  return { ok: true, status: "CONFIRMED_VIEWING_LOCAL_PROOF", intent: { ...intent, preflightStatus: preflight.status, executionStatus: "VERIFIED_LOCAL_PROOF" }, preflight, gateway, executionRecord: record, viewing, ...store.counters(), duplicateViewingsCreated: 0, ...Object.fromEntries(Object.entries(propertyViewingSideEffectCounters).filter(([key]) => !(key in store.counters()) && key !== "duplicateViewingsCreated")) };
}

export function createPropertyViewingRescheduleRequest(input = {}) {
  const item = {
    modelType: "PropertyViewingRescheduleRequest",
    rescheduleRequestId: `viewing_reschedule_${input.viewingId || "blocked"}`,
    viewingId: input.viewingId,
    requestedBy: input.requestedBy || "local_buyer",
    reasonCode: input.reasonCode || "BUYER_REQUESTED_NEW_TIME",
    newAvailability: clone(input.newAvailability || []),
    status: "REQUESTED_LOCAL",
    createdAt: now,
    auditMetadata: { audit: [propertyViewingAuditEvents.rescheduleRequested], noSilentOverwrite: true },
    localViewingRescheduleRequests: 1,
    ...Object.fromEntries(Object.entries(propertyViewingSideEffectCounters).filter(([key]) => key !== "localViewingRescheduleRequests"))
  };
  input.store?.addReschedule(item);
  input.store?.addAudit(audit(propertyViewingAuditEvents.rescheduleRequested, { viewingId: input.viewingId }));
  return item;
}

export function createPropertyViewingCancellation(input = {}) {
  const item = {
    modelType: "PropertyViewingCancellation",
    cancellationId: `viewing_cancel_${input.viewingId || "blocked"}`,
    viewingId: input.viewingId,
    requestedBy: input.requestedBy || "local_buyer",
    reasonCode: input.reasonCode || "LOCAL_CANCEL_REQUEST",
    cancelledAt: now,
    status: propertyViewingStatuses.cancelledLocal,
    auditMetadata: { audit: [propertyViewingAuditEvents.cancelledLocal], listingUnchanged: true, leadOpen: true, conversationOpen: true },
    localViewingsCancelled: 1,
    ...Object.fromEntries(Object.entries(propertyViewingSideEffectCounters).filter(([key]) => key !== "localViewingsCancelled"))
  };
  input.store?.addCancellation(item);
  input.store?.addAudit(audit(propertyViewingAuditEvents.cancelledLocal, { viewingId: input.viewingId }));
  return item;
}

export function createPropertyViewingHistoryItem(input = {}) {
  const viewing = input.viewing || {};
  return {
    modelType: "PropertyViewingHistoryItem",
    viewingId: viewing.viewingId,
    propertyId: viewing.propertyId,
    listingId: viewing.listingId,
    leadId: viewing.leadId,
    conversationId: viewing.conversationId,
    buyerSafeRef: viewing.buyerActorRef?.actorId ? "Buyer - Local Proof" : "Buyer",
    sellerRepresentationSafeRef: viewing.sellerActorRef?.actorId ? "Authorized Seller - Local Proof" : "Seller",
    viewingStatus: viewing.viewingStatus,
    confirmedSlot: clone(viewing.confirmedSlot || null),
    rescheduleStatus: input.reschedule?.status || "NONE",
    cancellationStatus: input.cancellation?.status || "NONE",
    createdAt: viewing.createdAt,
    updatedAt: viewing.updatedAt,
    auditRefs: input.auditRefs || [],
    sideEffectCounters: clone(propertyViewingSideEffectCounters),
    ...propertyViewingSideEffectCounters
  };
}

function buildViewingContext(caseKey = "owner") {
  const routeVm = caseKey === "ownerTakeover" ? buildPropertyConversationRouteChangeViewModel({ case: "ownerFallback" }) : null;
  const conversationVm = routeVm || buildPropertyConversationContinuationViewModel({ case: caseKey === "agent" || caseKey === "expiredAgent" ? "sellerSafe" : "buyerSafe" });
  const conversation = conversationVm.conversation;
  const participants = conversationVm.participants || [];
  const buyer = participants.find((participant) => participant.participantRole === propertyConversationParticipantRoles.buyer);
  const seller = participants.find((participant) => participant.participantRole !== propertyConversationParticipantRoles.buyer && participant.participationStatus === "ACTIVE_LOCAL_PROOF") ||
    participants.find((participant) => participant.participantRole !== propertyConversationParticipantRoles.buyer);
  return { conversationVm, conversation, participants, buyer, seller, routeVm };
}

export function buildPropertyViewingViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "owner";
  const store = createLocalPropertyViewingStore();
  const context = buildViewingContext(caseKey);
  const { conversation, buyer, seller } = context;
  const sourceMessage = (context.conversationVm.messages || []).find((message) => /see|viewing|available/i.test(message.safeBody || "")) || (context.conversationVm.messages || [])[0];
  const requestIntent = createPropertyViewingRequestIntent({
    conversation,
    sourceMessageId: sourceMessage?.messageId,
    buyerActorRef: buyer?.actorRef,
    requestedAvailability: [{ date: defaultDate, startTime: "14:00", endTime: "17:00", timezone: defaultTimezone }]
  });
  const request = createPropertyViewingRequest({
    intent: requestIntent,
    sellerParticipant: seller,
    buyerAvailability: requestIntent.requestedAvailability,
    preferredTimeWindows: requestIntent.requestedAvailability,
    locationDisclosurePolicy: caseKey === "locationPrivacy" ? propertyViewingLocationDisclosureStatuses.publicLocationOnly : propertyViewingLocationDisclosureStatuses.exactLocationReviewRequired
  });
  store.addRequest(request);
  store.addAudit(audit(propertyViewingAuditEvents.requestIntentCreated, { viewingRequestId: request.viewingRequestId, conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  store.addAudit(audit(propertyViewingAuditEvents.requestCreatedLocal, { viewingRequestId: request.viewingRequestId, conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  const buyerWindow = createPropertyViewingAvailabilityWindow({
    viewingRequestId: request.viewingRequestId,
    actorRef: buyer?.actorRef,
    date: defaultDate,
    startTime: "14:00",
    endTime: "17:00",
    timezone: defaultTimezone,
    source: "BUYER_LOCAL_INPUT"
  });
  const sellerWindow = createPropertyViewingAvailabilityWindow({
    viewingRequestId: request.viewingRequestId,
    actorRef: seller?.actorRef,
    date: defaultDate,
    startTime: "15:00",
    endTime: "18:00",
    timezone: defaultTimezone,
    source: "SELLER_LOCAL_INPUT"
  });
  store.addWindow(buyerWindow);
  store.addAudit(audit(propertyViewingAuditEvents.buyerAvailabilityRecorded, { viewingRequestId: request.viewingRequestId, conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  if (caseKey !== "noSellerAvailability") {
    store.addWindow(sellerWindow);
    store.addAudit(audit(propertyViewingAuditEvents.sellerAvailabilityRecorded, { viewingRequestId: request.viewingRequestId, conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  }
  const slotResult = generatePropertyViewingSlots({
    request,
    buyerWindows: [buyerWindow],
    sellerWindows: caseKey === "noSellerAvailability" ? [] : [sellerWindow],
    store
  });
  const selectedSlot = slotResult.slots[0] ? createPropertyViewingSlotSelection({ slot: slotResult.slots[0], buyerActorRef: buyer?.actorRef, store }) : null;
  const authority = {
    status: caseKey === "expiredAgent" ? propertyAuthorityStatuses.expired : propertyAuthorityStatuses.activeLocalProof,
    actorKind: caseKey === "managerNoAuthority" || caseKey === "managerViewingAuthority" ? "MANAGER" : caseKey === "cleaner" ? "CLEANER" : "SELLER",
    allowedActions: caseKey === "managerNoAuthority" ? ["UPDATE_AVAILABILITY"] : ["COORDINATE_VIEWING"]
  };
  const publicationRecord = {
    publicationStatus: caseKey === "listingUnpublished" ? "UNPUBLISHED_LOCAL_PROOF" : "PUBLISHED_LOCAL_PROOF",
    listingStatus: caseKey === "listingRolledBack" ? "ROLLED_BACK_LOCAL_PROOF" : "ACTIVE_LOCAL_PROOF"
  };
  const consent = { revokedAt: caseKey === "buyerConsentRevoked" ? now : null };
  const confirmationIntent = selectedSlot ? createPropertyViewingConfirmationIntent({
    request: store.getRequest(request.viewingRequestId),
    slot: store.getSlot(selectedSlot.viewingSlotId),
    locationDisclosureStatus: caseKey === "locationPrivacy" ? propertyViewingLocationDisclosureStatuses.exactLocationReadyLocalProof : propertyViewingLocationDisclosureStatuses.exactLocationReadyLocalProof
  }) : null;
  if (confirmationIntent && caseKey === "stateMismatch") confirmationIntent.slotFingerprint = "changed_slot_fingerprint";
  const existingConflict = caseKey === "overlapConflict" && slotResult.slots[0] ? [{
    propertyId: request.propertyId,
    viewingStatus: propertyViewingStatuses.confirmedLocalProof,
    confirmedSlot: { date: slotResult.slots[0].date, startTime: "15:15", endTime: "16:00" }
  }] : [];
  const confirmation = confirmationIntent ? confirmPropertyViewingThroughGateway({
    intent: confirmationIntent,
    request: store.getRequest(request.viewingRequestId),
    slot: store.getSlot(selectedSlot.viewingSlotId),
    conversation: caseKey === "conversationPaused" ? { ...conversation, conversationStatus: propertyConversationStatuses.pausedLocal } : conversation,
    authority,
    consent,
    publicationRecord,
    store,
    existingViewings: existingConflict
  }) : { ok: false, status: propertyViewingStatuses.waitingForSellerAvailability };
  const idempotent = caseKey === "idempotent" && confirmationIntent ? confirmPropertyViewingThroughGateway({
    intent: confirmationIntent,
    request: store.getRequest(request.viewingRequestId),
    slot: store.getSlot(selectedSlot.viewingSlotId),
    conversation,
    authority,
    consent,
    publicationRecord,
    store
  }) : null;
  const viewing = confirmation.viewing || null;
  const reschedule = viewing && caseKey === "rescheduleCancel" ? createPropertyViewingRescheduleRequest({ viewingId: viewing.viewingId, requestedBy: buyer?.actorRef?.actorId, store }) : null;
  const cancellation = viewing && caseKey === "rescheduleCancel" ? createPropertyViewingCancellation({ viewingId: viewing.viewingId, requestedBy: buyer?.actorRef?.actorId, store }) : null;
  const systemNoticeIntent = viewing ? createPropertyConversationMessageIntent({
    conversation,
    senderActorRef: { actorId: "essa_property_system" },
    senderRole: propertyConversationParticipantRoles.buyer,
    messageType: propertyConversationMessageTypes.systemNotice,
    rawBody: "Viewing confirmed inside ESSA local proof."
  }) : null;
  const conversationNotice = viewing ? { status: "SYSTEM_NOTICE_READY_LOCAL", intent: systemNoticeIntent } : null;
  const historyItem = createPropertyViewingHistoryItem({ viewing, reschedule, cancellation, auditRefs: store.auditEvents().map((event) => event.eventType) });
  const counters = store.counters();
  return {
    modelType: "PropertyViewingViewModel",
    route: "#property-viewings",
    caseKey,
    banner: "VIEWING LOCAL PROOF ONLY. NO RESERVATION, OFFER, DEAL ROOM, PAYMENT, EXTERNAL CALENDAR OR NOTIFICATION.",
    conversation,
    leadId: conversation.leadId,
    publicationId: conversation.publicationId,
    listingId: conversation.listingId,
    propertyId: conversation.propertyId,
    buyer,
    seller,
    sourceMessage,
    requestIntent,
    request: store.getRequest(request.viewingRequestId),
    buyerAvailability: [buyerWindow],
    sellerAvailability: caseKey === "noSellerAvailability" ? [] : [sellerWindow],
    slotResult,
    slots: store.listSlots(request.viewingRequestId),
    selectedSlot,
    confirmationIntent,
    confirmation,
    idempotent,
    viewing,
    reschedule,
    cancellation,
    historyItem,
    conversationNotice,
    routeChangeRepreflight: caseKey === "ownerTakeover" ? createPropertyConversationRouteChangeHistoryItem({ change: context.routeVm.participantChange, conversation, originalAttributionRef: conversation.attributionRef }) : null,
    lisaGuide: {
      roleId: "LISA_ESSA_PROPERTY_VIEWING_GUIDE",
      answer: "A viewing can be requested and confirmed inside ESSA, but it does not reserve the property, create an offer, open a Deal Room or move money.",
      mayConfirmViewing: false,
      mayRevealExactAddressBeforeConfirmation: false
    },
    navigatorRouting: {
      input: "I want to see the apartment.",
      hash: "#property-viewings?case=owner",
      routeOnly: true,
      mayConfirmViewing: false,
      reservationActive: false
    },
    locationDisclosure: {
      modelType: "PropertyViewingLocationDisclosure",
      beforeConfirmation: propertyViewingLocationDisclosureStatuses.publicLocationOnly,
      afterConfirmation: viewing ? viewing.locationDisclosureStatus : propertyViewingLocationDisclosureStatuses.exactLocationReviewRequired,
      accessCodesShared: false
    },
    exactAddressVisibleBeforeConfirmation: false,
    timezone: defaultTimezone,
    leadHistory: viewing ? ["VIEWING_REQUESTED_LOCAL", "VIEWING_CONFIRMED_LOCAL_PROOF"] : ["VIEWING_REQUESTED_LOCAL"],
    attributionChain: ["ESSA Marketplace", conversation.publicationId, conversation.listingId, conversation.propertyId, conversation.leadId, conversation.conversationId, viewing?.viewingId].filter(Boolean),
    ...counters,
    duplicateViewingsCreated: 0,
    propertyReservationsCreated: 0,
    formalOffersCreated: 0,
    counterOffersCreated: 0,
    dealRoomActions: 0,
    ...Object.fromEntries(Object.entries(propertyViewingSideEffectCounters).filter(([key]) => !(key in counters) && !["duplicateViewingsCreated", "propertyReservationsCreated", "formalOffersCreated", "counterOffersCreated", "dealRoomActions"].includes(key)))
  };
}
