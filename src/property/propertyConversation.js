import {
  approvalDecisions,
  createApprovalDecision,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  executionIntentStatuses
} from "../agentToolLayer/executionQueue.js";
import {
  executionGateDecisions,
  prepareExecution
} from "../agentToolLayer/executionGateway.js";
import {
  agentToolCostPolicy,
  agentToolDecisions,
  agentToolSideEffectClasses
} from "../agentToolLayer/toolRequestBridge.js";
import {
  toolEnvironments,
  toolPermissionClasses
} from "../agentToolLayer/contracts.js";
import {
  buildSellerLeadReviewViewModel,
  conversationHandoffStatuses,
  createSellerResponseFingerprint
} from "./propertySellerLeadReview.js";
import { marketplacePublicationStatuses } from "./propertyMarketplacePublication.js";
import { propertyAuthorityStatuses } from "./propertyActorAuthorityContracts.js";

const now = "2026-08-22T00:00:00.000Z";

export const propertyConversationExecutionActionTypes = {
  createInternalConversationLocalProof: "CREATE_PROPERTY_INTERNAL_CONVERSATION_LOCAL_PROOF",
  appendInternalMessageLocalProof: "APPEND_PROPERTY_INTERNAL_MESSAGE_LOCAL_PROOF",
  changeSellerParticipantLocalProof: "CHANGE_PROPERTY_CONVERSATION_SELLER_PARTICIPANT_LOCAL_PROOF"
};

export const propertyConversationStatuses = {
  pendingLocal: "PENDING_LOCAL",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  pausedLocal: "PAUSED_LOCAL",
  blocked: "BLOCKED",
  closedLocal: "CLOSED_LOCAL",
  rolledBackLocalProof: "ROLLED_BACK_LOCAL_PROOF"
};

export const propertyConversationParticipantRoles = {
  buyer: "BUYER",
  owner: "OWNER",
  authorizedAgent: "AUTHORIZED_AGENT",
  agencyRepresentative: "AGENCY_REPRESENTATIVE",
  developerRepresentative: "DEVELOPER_REPRESENTATIVE"
};

export const propertyConversationMessageTypes = {
  generalMessage: "GENERAL_MESSAGE",
  propertyQuestion: "PROPERTY_QUESTION",
  propertyInformation: "PROPERTY_INFORMATION",
  viewingDiscussion: "VIEWING_DISCUSSION",
  financeQuestion: "FINANCE_QUESTION",
  documentQuestion: "DOCUMENT_QUESTION",
  systemNotice: "SYSTEM_NOTICE",
  lisaExplanationReference: "LISA_EXPLANATION_REFERENCE",
  nextStepDiscussion: "NEXT_STEP_DISCUSSION"
};

export const propertyConversationDeliveryStatuses = {
  draft: "DRAFT",
  validated: "VALIDATED",
  readyForAppend: "READY_FOR_APPEND",
  createdLocal: "CREATED_LOCAL",
  deliveredInsideEssaLocalProof: "DELIVERED_INSIDE_ESSA_LOCAL_PROOF",
  readLocalProof: "READ_LOCAL_PROOF",
  blocked: "BLOCKED",
  superseded: "SUPERSEDED",
  withdrawnLocal: "WITHDRAWN_LOCAL",
  failed: "FAILED",
  alreadyDeliveredIdempotent: "ALREADY_DELIVERED_IDEMPOTENT"
};

export const propertyConversationPolicyStatuses = {
  pass: "PASS",
  readyForLocalAppend: "READY_FOR_LOCAL_APPEND",
  blockedConversationState: "BLOCKED_CONVERSATION_STATE",
  blockedParticipant: "BLOCKED_PARTICIPANT",
  blockedContactPolicy: "BLOCKED_CONTACT_POLICY",
  blockedPaymentPolicy: "BLOCKED_PAYMENT_POLICY",
  blockedDocumentPolicy: "BLOCKED_DOCUMENT_POLICY",
  blockedOfferPolicy: "BLOCKED_OFFER_POLICY",
  offerFlowRecommendedFuture: "OFFER_FLOW_RECOMMENDED_FUTURE",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedConsent: "BLOCKED_CONSENT",
  blockedListing: "BLOCKED_LISTING",
  blockedPublication: "BLOCKED_PUBLICATION_STATE",
  blockedMessageType: "BLOCKED_MESSAGE_TYPE",
  blockedDuplicate: "BLOCKED_DUPLICATE",
  blockedMalformed: "BLOCKED_MALFORMED",
  blockedRatePolicy: "BLOCKED_RATE_POLICY",
  reviewRequired: "REVIEW_REQUIRED"
};

export const propertyConversationAuditEvents = {
  intentCreated: "PROPERTY_CONVERSATION_CREATION_INTENT_CREATED",
  preflightPassed: "PROPERTY_CONVERSATION_PREFLIGHT_PASSED",
  approvalGranted: "PROPERTY_CONVERSATION_APPROVAL_GRANTED",
  createdLocalProof: "PROPERTY_CONVERSATION_CREATED_LOCAL_PROOF",
  participantsLinked: "PROPERTY_CONVERSATION_PARTICIPANTS_LINKED",
  buyerInquiryLinked: "BUYER_INQUIRY_CONTEXT_LINKED",
  sellerResponseDelivered: "SELLER_RESPONSE_MESSAGE_DELIVERED_LOCAL_PROOF",
  messageCreated: "PROPERTY_MESSAGE_CREATED_LOCAL_PROOF",
  messageIntentCreated: "PROPERTY_MESSAGE_INTENT_CREATED",
  messagePreflightPassed: "PROPERTY_MESSAGE_PREFLIGHT_PASSED",
  messagePolicyChecked: "PROPERTY_MESSAGE_POLICY_CHECKED",
  messageAppendStarted: "PROPERTY_MESSAGE_APPEND_STARTED",
  messageDeliveredLocalProof: "PROPERTY_MESSAGE_DELIVERED_LOCAL_PROOF",
  messageBlocked: "PROPERTY_MESSAGE_BLOCKED_POLICY",
  messageBlockedContact: "PROPERTY_MESSAGE_BLOCKED_CONTACT",
  messageBlockedPayment: "PROPERTY_MESSAGE_BLOCKED_PAYMENT",
  messageBlockedDocument: "PROPERTY_MESSAGE_BLOCKED_DOCUMENT",
  offerLikeDetected: "PROPERTY_MESSAGE_OFFER_LIKE_DETECTED",
  messageSupersessionCreated: "PROPERTY_MESSAGE_SUPERSESSION_CREATED",
  messageRead: "PROPERTY_MESSAGE_READ_LOCAL_PROOF",
  pausedLocal: "PROPERTY_CONVERSATION_PAUSED_LOCAL",
  pausedAuthority: "PROPERTY_CONVERSATION_PAUSED_AUTHORITY",
  pausedConsent: "PROPERTY_CONVERSATION_PAUSED_CONSENT",
  pausedListing: "PROPERTY_CONVERSATION_PAUSED_LISTING",
  resumeReviewRequired: "PROPERTY_CONVERSATION_RESUME_REVIEW_REQUIRED",
  closedLocal: "PROPERTY_CONVERSATION_CLOSED_LOCAL",
  rollbackRequested: "PROPERTY_CONVERSATION_ROLLBACK_REQUESTED",
  rolledBack: "PROPERTY_CONVERSATION_ROLLED_BACK",
  routeReviewStarted: "PROPERTY_CONVERSATION_ROUTE_REVIEW_STARTED",
  sellerParticipantAuthorityInvalidated: "SELLER_PARTICIPANT_AUTHORITY_INVALIDATED",
  sellerRouteCandidatesResolved: "SELLER_ROUTE_CANDIDATES_RESOLVED",
  ownerFallbackIdentified: "OWNER_FALLBACK_IDENTIFIED",
  multipleRouteReviewRequired: "MULTIPLE_ROUTE_REVIEW_REQUIRED",
  participantChangeIntentCreated: "PARTICIPANT_CHANGE_INTENT_CREATED",
  participantChangePreflightPassed: "PARTICIPANT_CHANGE_PREFLIGHT_PASSED",
  participantChangeStarted: "PARTICIPANT_CHANGE_STARTED",
  outgoingParticipantDeactivatedLocal: "OUTGOING_PARTICIPANT_DEACTIVATED_LOCAL",
  incomingParticipantAddedLocal: "INCOMING_PARTICIPANT_ADDED_LOCAL",
  routeChangedLocalProof: "PROPERTY_CONVERSATION_ROUTE_CHANGED_LOCAL_PROOF",
  routeResumeReady: "PROPERTY_CONVERSATION_RESUME_READY",
  routeChangeBlocked: "PROPERTY_CONVERSATION_ROUTE_CHANGE_BLOCKED"
};

export const propertyConversationSideEffectCounters = {
  localPropertyConversationsCreated: 0,
  localConversationMessagesCreated: 0,
  localConversationMessageIntents: 0,
  localConversationMessagesAppended: 0,
  localMessagesDeliveredInsideEssa: 0,
  messageSupersessionsLocal: 0,
  duplicateMessagesCreated: 0,
  externalMessagesSent: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
  phoneReveals: 0,
  emailReveals: 0,
  privateDocumentShares: 0,
  offerEntitiesCreated: 0,
  formalOffersCreated: 0,
  counterOffersCreated: 0,
  routeChangeReadinessEvaluations: 0,
  participantChangeIntentsLocal: 0,
  sellerParticipantChangesLocal: 0,
  newLeadsCreated: 0,
  newConversationsCreated: 0,
  messagesReassigned: 0,
  messageHistoryDeletions: 0,
  attributionMutations: 0,
  contactReveals: 0,
  viewingBookings: 0,
  reservationActions: 0,
  dealRoomActions: 0,
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

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function createPropertyConversationFingerprint(value = {}) {
  let hash = 2166136261;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `property_conversation_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function audit(eventType, input = {}) {
  return {
    eventType,
    conversationId: input.conversationId || null,
    messageId: input.messageId || null,
    conversationCreationIntentId: input.conversationCreationIntentId || null,
    leadId: input.leadId || null,
    listingId: input.listingId || null,
    propertyId: input.propertyId || null,
    timestamp: now,
    appendOnly: true,
    ...propertyConversationSideEffectCounters
  };
}

function sanitizeMessageBody(body = "") {
  return String(body)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[contact_email_blocked]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[contact_phone_blocked]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[external_link_blocked]")
    .slice(0, 1200)
    .trim();
}

export function createLocalPropertyConversationStore(input = {}) {
  const conversations = new Map((input.conversations || []).map((item) => [item.conversationId, clone(item)]));
  const participants = new Map((input.participants || []).map((item) => [item.participantId, clone(item)]));
  const messages = new Map((input.messages || []).map((item) => [item.messageId, clone(item)]));
  const readStates = new Map((input.readStates || []).map((item) => [item.readStateId, clone(item)]));
  const executionRecords = new Map((input.executionRecords || []).map((item) => [item.executionRecordId, clone(item)]));
  const idempotency = new Set(input.idempotencyKeys || []);
  const auditEvents = [];
  return {
    snapshot() {
      return {
        conversations: [...conversations.values()].map(clone),
        participants: [...participants.values()].map(clone),
        messages: [...messages.values()].map(clone),
        readStates: [...readStates.values()].map(clone),
        executionRecords: [...executionRecords.values()].map(clone),
        idempotencyKeys: [...idempotency],
        auditEvents: auditEvents.map(clone)
      };
    },
    restore(snapshot = {}) {
      conversations.clear();
      participants.clear();
      messages.clear();
      readStates.clear();
      executionRecords.clear();
      idempotency.clear();
      (snapshot.conversations || []).forEach((item) => conversations.set(item.conversationId, clone(item)));
      (snapshot.participants || []).forEach((item) => participants.set(item.participantId, clone(item)));
      (snapshot.messages || []).forEach((item) => messages.set(item.messageId, clone(item)));
      (snapshot.readStates || []).forEach((item) => readStates.set(item.readStateId, clone(item)));
      (snapshot.executionRecords || []).forEach((item) => executionRecords.set(item.executionRecordId, clone(item)));
      (snapshot.idempotencyKeys || []).forEach((key) => idempotency.add(key));
    },
    hasIdempotencyKey(key) {
      return idempotency.has(key);
    },
    addIdempotencyKey(key) {
      idempotency.add(key);
    },
    addConversation(conversation) {
      conversations.set(conversation.conversationId, clone(conversation));
    },
    getConversation(conversationId) {
      return clone(conversations.get(conversationId) || null);
    },
    listConversations() {
      return [...conversations.values()].map(clone);
    },
    updateConversation(conversationId, updates) {
      const current = conversations.get(conversationId);
      if (!current) return null;
      conversations.set(conversationId, clone({ ...current, ...updates, updatedAt: now }));
      return clone(conversations.get(conversationId));
    },
    addParticipant(participant) {
      participants.set(participant.participantId, clone(participant));
    },
    getParticipant(participantId) {
      return clone(participants.get(participantId) || null);
    },
    updateParticipant(participantId, updates) {
      const current = participants.get(participantId);
      if (!current) return null;
      participants.set(participantId, clone({ ...current, ...updates, updatedAt: now }));
      return clone(participants.get(participantId));
    },
    listParticipants(conversationId) {
      return [...participants.values()].filter((item) => item.conversationId === conversationId).map(clone);
    },
    addMessage(message) {
      messages.set(message.messageId, clone(message));
    },
    updateMessage(messageId, updates) {
      const current = messages.get(messageId);
      if (!current) return null;
      messages.set(messageId, clone({ ...current, ...updates, updatedAt: now }));
      return clone(messages.get(messageId));
    },
    getMessage(messageId) {
      return clone(messages.get(messageId) || null);
    },
    findMessageByFingerprint(conversationId, fingerprint) {
      return clone([...messages.values()].find((item) => item.conversationId === conversationId && item.fingerprint === fingerprint) || null);
    },
    listMessages(conversationId) {
      return [...messages.values()].filter((item) => item.conversationId === conversationId).sort((a, b) => a.sequenceNumber - b.sequenceNumber || String(a.messageId).localeCompare(String(b.messageId))).map(clone);
    },
    nextSequence(conversationId) {
      return this.listMessages(conversationId).length + 1;
    },
    setReadState(readState) {
      readStates.set(readState.readStateId, clone(readState));
    },
    listReadStates(conversationId) {
      return [...readStates.values()].filter((item) => item.conversationId === conversationId).map(clone);
    },
    saveExecutionRecord(record) {
      executionRecords.set(record.executionRecordId, clone(record));
      return clone(record);
    },
    getExecutionRecord(executionRecordId) {
      return clone(executionRecords.get(executionRecordId) || null);
    },
    listExecutionRecords() {
      return [...executionRecords.values()].map(clone);
    },
    addAudit(event) {
      auditEvents.push(clone(event));
    },
    auditEvents() {
      return auditEvents.map(clone);
    },
    counters() {
      const localPropertyConversationsCreated = [...conversations.values()].filter((item) => item.conversationStatus === propertyConversationStatuses.activeLocalProof).length;
      const delivered = [...messages.values()].filter((item) => item.deliveryStatus === propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof || item.deliveryStatus === propertyConversationDeliveryStatuses.readLocalProof).length;
      return {
        ...propertyConversationSideEffectCounters,
        localPropertyConversationsCreated,
        localConversationMessagesCreated: messages.size,
        localConversationMessagesAppended: Math.max(0, messages.size - 2),
        localMessagesDeliveredInsideEssa: delivered
      };
    }
  };
}

export function createPropertyConversationPolicy(input = {}) {
  return {
    modelType: "PropertyConversationPolicy",
    policyId: input.policyId || `conversation_policy_${input.conversationId || "intent"}`,
    conversationId: input.conversationId || null,
    allowedMessageTypes: Object.values(propertyConversationMessageTypes),
    forbiddenContentTypes: ["DIRECT_CONTACT", "PAYMENT", "BANK_DETAILS", "PRIVATE_DOCUMENT", "FORMAL_OFFER", "RESERVATION", "CONTRACT_SIGNATURE", "OWNERSHIP_TRANSFER"],
    externalContactPolicy: "BLOCKED",
    privateDocumentPolicy: "BLOCKED",
    paymentPolicy: "BLOCKED",
    offerPolicy: "NO_FORMAL_OFFER_ENTITY",
    viewingPolicy: "DISCUSSION_ONLY_NO_BOOKING",
    moderationMode: "LOCAL_DETERMINISTIC_POLICY_ONLY",
    retentionModeLocalProof: "APPEND_ONLY_LOCAL_PROOF",
    consentRequirement: "BUYER_CONSENT_ACTIVE_REQUIRED",
    authorityRequirement: "CURRENT_SELLER_SIDE_AUTHORITY_REQUIRED",
    createdAt: now,
    auditMetadata: { localProofOnly: true },
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversationCreationIntent(input = {}) {
  const handoff = input.handoff || {};
  const lead = input.lead || input.leadResult?.lead || {};
  const approval = input.approval || {};
  const policy = createPropertyConversationPolicy();
  return {
    modelType: "PropertyConversationCreationIntent",
    conversationCreationIntentId: `conversation_creation_${handoff.handoffId || "blocked"}`,
    actionType: propertyConversationExecutionActionTypes.createInternalConversationLocalProof,
    handoffId: handoff.handoffId || null,
    leadId: handoff.leadId || lead.leadId || null,
    publicationId: lead.publicationId || null,
    listingId: handoff.listingId || lead.listingId || null,
    propertyId: handoff.propertyId || lead.propertyId || null,
    buyerActorRef: clone(handoff.buyerActorRef || lead.buyerActorRef || null),
    sellerActorRef: clone(handoff.sellerActorRef || null),
    sellerOrganizationId: input.review?.recipientOrganizationId || null,
    sellerAuthorityRef: clone(input.review?.recipientAuthorityRef || null),
    buyerConsentRef: lead.consentRef || input.consent?.consentId || null,
    initialResponseIntentId: handoff.responseIntentId || input.responseIntent?.responseIntentId || null,
    initialResponseApprovalId: handoff.sellerApprovalId || approval.approvalId || null,
    conversationPolicyRef: policy.policyId,
    attributionRef: handoff.attributionRef || input.attribution?.marketplaceSource || "ESSA_PROPERTY_MARKETPLACE",
    requestedBy: input.requestedBy || "local_human_property_admin",
    createdAt: now,
    preflightStatus: "DRAFT",
    approvalStatus: "PENDING_EXPLICIT_LOCAL_HUMAN_APPROVAL",
    executionStatus: "DRAFT",
    idempotencyKey: `property-conversation:${handoff.handoffId}:${approval.approvedProjectionFingerprint || "no_approval"}`,
    expectedPostConditions: {
      conversationStatus: propertyConversationStatuses.activeLocalProof,
      buyerInquiryContextLinked: true,
      approvedSellerResponseDeliveredInsideEssa: true,
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    },
    rollbackPlan: {
      strategy: "local_before_state_snapshot",
      preservesAudit: true,
      willNotMutate: ["Lead", "Listing", "Property", "Publication", "Ownership", "Payments", "Bookings", "External systems"]
    },
    conversationPolicy: policy,
    auditMetadata: { audit: [audit(propertyConversationAuditEvents.intentCreated, { conversationCreationIntentId: `conversation_creation_${handoff.handoffId || "blocked"}`, leadId: handoff.leadId || lead.leadId, listingId: handoff.listingId || lead.listingId, propertyId: handoff.propertyId || lead.propertyId })], localProofOnly: true },
    ...propertyConversationSideEffectCounters
  };
}

export function preflightPropertyConversationCreationIntent(input = {}) {
  const { intent = {}, handoff = {}, approval = {}, consent = {}, publicationRecord = {}, review = {}, responseIntent = {}, projection = {}, store = createLocalPropertyConversationStore() } = input;
  const lead = input.lead || input.leadResult?.lead || {};
  const blockers = [];
  if (!handoff.handoffId || handoff.readinessStatus !== conversationHandoffStatuses.readyForFutureConversation) blockers.push("valid_approved_handoff_required");
  if (handoff.dispatchStatus !== "NOT_ACTIVE") blockers.push("handoff_dispatch_state_not_eligible");
  if (!lead.leadId) blockers.push("lead_required");
  if (!lead.listingId || !lead.propertyId || !lead.publicationId) blockers.push("listing_property_publication_linkage_required");
  if (!approval.approvalId || approval.approvalStatus !== "APPROVED_LOCAL_NOT_SENT") blockers.push("seller_response_approval_required");
  if (consent.consentStatus !== "CONSENT_RECORDED_LOCAL_PROOF" || consent.revokedAt) blockers.push("buyer_consent_required");
  if (publicationRecord.publicationStatus !== marketplacePublicationStatuses.publishedLocalProof) blockers.push("publication_active_required");
  if (publicationRecord.freshness === "STALE") blockers.push("listing_freshness_required");
  if (review.authorityStatus === "BLOCKED_AUTHORITY") blockers.push("seller_authority_required");
  const expectedFingerprint = createSellerResponseFingerprint({
    leadId: lead.leadId,
    responseText: responseIntent.responseMessage,
    projection,
    sellerRoute: review.routeReresolution?.currentRoute,
    buyerConsentState: consent.revokedAt ? "CONSENT_REVOKED" : consent.consentStatus,
    listingState: publicationRecord.publicationStatus
  });
  if (approval.approvedProjectionFingerprint !== expectedFingerprint) blockers.push("initial_response_fingerprint_mismatch");
  if (store.hasIdempotencyKey(intent.idempotencyKey)) blockers.push("duplicate_conversation_creation_intent");
  return {
    modelType: "PropertyConversationCreationPreflight",
    ok: blockers.length === 0,
    status: blockers.length ? "BLOCKED" : "READY_FOR_APPROVAL",
    preflightStatus: blockers.length ? "BLOCKED" : "READY_FOR_APPROVAL",
    blockers,
    expectedInitialResponseFingerprint: expectedFingerprint,
    createdAt: now,
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversationParticipant(input = {}) {
  const role = input.participantRole || propertyConversationParticipantRoles.buyer;
  return {
    modelType: "PropertyConversationParticipant",
    participantId: `${input.conversationId}_${role.toLowerCase()}_${input.actorRef?.actorId || "actor"}`,
    conversationId: input.conversationId,
    actorRef: clone(input.actorRef),
    participantRole: role,
    organizationRef: input.organizationRef || null,
    authorityRef: input.authorityRef || null,
    consentRef: input.consentRef || null,
    participationStatus: "ACTIVE_LOCAL_PROOF",
    joinedAt: now,
    leftAt: null,
    permissions: {
      canSendInternalMessage: true,
      canRevealContact: false,
      canAttachPrivateDocument: false,
      canCreateOffer: false,
      canScheduleViewing: false,
      canRequestPayment: false
    },
    privacyProfile: {
      safeLabel: input.safeLabel || role.replaceAll("_", " "),
      contactDetailsVisible: false
    },
    auditMetadata: { localProofOnly: true },
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversation(input = {}) {
  const intent = input.intent || {};
  return {
    modelType: "PropertyConversation",
    conversationId: input.conversationId || `property_conversation_${intent.leadId || "blocked"}_${createPropertyConversationFingerprint(intent.idempotencyKey).slice(-8)}`,
    leadId: intent.leadId,
    publicationId: intent.publicationId,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    participants: [],
    sellerRepresentationType: input.review?.recipientRepresentationType || "OWNER",
    attributionRef: intent.attributionRef,
    conversationStatus: propertyConversationStatuses.activeLocalProof,
    consentSnapshot: intent.buyerConsentRef,
    authoritySnapshot: clone(input.review?.recipientAuthorityRef || input.review?.authorityStatus || null),
    listingSnapshot: { listingId: intent.listingId, publicationId: intent.publicationId, publicationStatus: input.publicationRecord?.publicationStatus || "UNKNOWN" },
    policySnapshot: clone(intent.conversationPolicy),
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    unreadState: { buyerUnread: 1, sellerUnread: 0 },
    auditMetadata: { audit: [propertyConversationAuditEvents.createdLocalProof], localProofOnly: true },
    localProofOnly: true,
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversationMessage(input = {}) {
  const safeBody = sanitizeMessageBody(input.body || "");
  const fingerprint = createPropertyConversationFingerprint({ conversationId: input.conversationId, sender: input.senderActorRef, messageType: input.messageType, safeBody });
  return {
    modelType: "PropertyConversationMessage",
    messageId: input.messageId || `property_message_${input.conversationId}_${fingerprint.slice(-8)}`,
    conversationId: input.conversationId,
    senderActorRef: clone(input.senderActorRef),
    senderRole: input.senderRole,
    messageType: input.messageType || propertyConversationMessageTypes.generalMessage,
    body: input.body || "",
    safeBody,
    attachmentRefsFuture: [],
    replyToMessageId: input.replyToMessageId || null,
    sequenceNumber: input.sequenceNumber || 1,
    createdAt: now,
    deliveryStatus: input.deliveryStatus || propertyConversationDeliveryStatuses.createdLocal,
    readStatus: input.readStatus || "UNREAD",
    privacyStatus: "CONTACT_PROTECTED",
    policyStatus: "PENDING_POLICY_CHECK",
    fingerprint,
    auditMetadata: { localProofOnly: true },
    ...propertyConversationSideEffectCounters
  };
}

export function validatePropertyConversationMessage(input = {}) {
  const { conversation = {}, participants = [], message = {}, consent = {}, publicationRecord = {}, authorityGrant = {}, store = createLocalPropertyConversationStore() } = input;
  const raw = String(message.body || "");
  const blockers = [];
  const senderActive = participants.some((participant) => participant.actorRef?.actorId === message.senderActorRef?.actorId && participant.participationStatus === "ACTIVE_LOCAL_PROOF");
  if (!senderActive) blockers.push(propertyConversationPolicyStatuses.blockedAuthority);
  if (conversation.conversationStatus !== propertyConversationStatuses.activeLocalProof) blockers.push(propertyConversationPolicyStatuses.blockedStateMismatch);
  if (message.senderRole !== propertyConversationParticipantRoles.buyer && authorityGrant.status !== propertyAuthorityStatuses.activeLocalProof) blockers.push(propertyConversationPolicyStatuses.blockedAuthority);
  if (consent.consentStatus !== "CONSENT_RECORDED_LOCAL_PROOF" || consent.revokedAt) blockers.push(propertyConversationPolicyStatuses.blockedConsent);
  if (publicationRecord.publicationStatus !== marketplacePublicationStatuses.publishedLocalProof || publicationRecord.freshness === "STALE") blockers.push(propertyConversationPolicyStatuses.blockedListing);
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d|https?:\/\/|www\.|whatsapp|telegram|t\.me|sms|call me|write me outside essa|outside essa|external chat/i.test(raw)) blockers.push(propertyConversationPolicyStatuses.blockedContactPolicy);
  if (/bank account|iban|swift|card number|deposit|payment|crypto|wallet|usdt/i.test(raw)) blockers.push(propertyConversationPolicyStatuses.blockedPaymentPolicy);
  if (/ownership document|mandate|passport|identity document|private cadastral|kyc|kyb|reviewer notes/i.test(raw)) blockers.push(propertyConversationPolicyStatuses.blockedDocumentPolicy);
  if (message.messageType === "OFFER_SUBMISSION" || /formal offer|i offer|counter offer|reserve this|reservation|contract signature|ownership transfer/i.test(raw)) blockers.push(propertyConversationPolicyStatuses.blockedOfferPolicy);
  if (!raw.trim() || raw.length > 1200) blockers.push(propertyConversationPolicyStatuses.blockedMalformed);
  if (store.findMessageByFingerprint(message.conversationId, message.fingerprint)) blockers.push(propertyConversationPolicyStatuses.blockedDuplicate);
  const priority = [
    propertyConversationPolicyStatuses.blockedContactPolicy,
    propertyConversationPolicyStatuses.blockedPaymentPolicy,
    propertyConversationPolicyStatuses.blockedDocumentPolicy,
    propertyConversationPolicyStatuses.blockedOfferPolicy,
    propertyConversationPolicyStatuses.blockedConsent,
    propertyConversationPolicyStatuses.blockedListing,
    propertyConversationPolicyStatuses.blockedAuthority,
    propertyConversationPolicyStatuses.blockedDuplicate,
    propertyConversationPolicyStatuses.blockedMalformed,
    propertyConversationPolicyStatuses.blockedStateMismatch
  ];
  const policyStatus = priority.find((status) => blockers.includes(status)) || propertyConversationPolicyStatuses.pass;
  return {
    modelType: "PropertyConversationMessagePolicyCheck",
    ok: blockers.length === 0,
    policyStatus,
    blockers,
    messageFingerprint: message.fingerprint,
    ...propertyConversationSideEffectCounters
  };
}

export function deliverPropertyConversationMessageLocal(input = {}) {
  const { conversation, participants, message, consent, publicationRecord, authorityGrant, store } = input;
  const check = validatePropertyConversationMessage({ conversation, participants, message, consent, publicationRecord, authorityGrant, store });
  if (!check.ok) {
    store.addAudit(audit(propertyConversationAuditEvents.messageBlocked, { conversationId: conversation.conversationId, messageId: message.messageId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
    return { ok: false, status: check.policyStatus, check, duplicateMessagesCreated: 0, ...propertyConversationSideEffectCounters };
  }
  const delivered = { ...message, deliveryStatus: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, policyStatus: propertyConversationPolicyStatuses.pass };
  store.addMessage(delivered);
  store.addAudit(audit(propertyConversationAuditEvents.messageCreated, delivered));
  return { ok: true, status: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof, message: delivered, localConversationMessagesCreated: 1, localMessagesDeliveredInsideEssa: 1, ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !["localConversationMessagesCreated", "localMessagesDeliveredInsideEssa"].includes(key))) };
}

function createAgentToolIntent(intent = {}) {
  return createExecutionIntentFromDecision({
    request: {
      requestId: `req_${intent.conversationCreationIntentId}`,
      taskId: "phase_23l",
      projectId: "essa_property_local",
      toolId: "property.local.execution",
      capability: "property_canonical_resolution_association",
      action: propertyConversationExecutionActionTypes.createInternalConversationLocalProof,
      input: {
        operation: "create_property_internal_conversation_local_proof",
        writeScope: "local_property_conversation_store",
        conversationCreationIntentId: intent.conversationCreationIntentId,
        handoffId: intent.handoffId,
        leadId: intent.leadId,
        listingId: intent.listingId,
        propertyId: intent.propertyId
      },
      environment: toolEnvironments.local,
      permissionLevel: toolPermissionClasses.localMutation,
      estimatedCost: agentToolCostPolicy.localCompute,
      sideEffectClass: agentToolSideEffectClasses.localOnly,
      requestedByAgent: "ESSA_PROPERTY_CONVERSATION_PROOF",
      requestedByProvider: null,
      sourceArtifactRefs: [intent.handoffId, intent.leadId, intent.initialResponseApprovalId],
      targetArtifactRefs: [intent.listingId, intent.propertyId],
      traceId: `trace_${intent.conversationCreationIntentId}`
    },
    decision: {
      requestId: `req_${intent.conversationCreationIntentId}`,
      toolId: "property.local.execution",
      decision: agentToolDecisions.requireConfirmation,
      reason: "local_property_conversation_creation_requires_explicit_human_approval",
      normalizedInput: {
        operation: "create_property_internal_conversation_local_proof",
        writeScope: "local_property_conversation_store",
        conversationCreationIntentId: intent.conversationCreationIntentId
      },
      approvalRequired: true,
      traceId: `trace_${intent.conversationCreationIntentId}`
    }
  }, {
    executionIntentId: `agent_${intent.conversationCreationIntentId}`,
    idempotencyKey: intent.idempotencyKey,
    createdAt: intent.createdAt,
    ttlMinutes: 30,
    maxApprovedCost: 0
  });
}

export function createExplicitLocalPropertyConversationApproval(agentIntent = {}, input = {}) {
  if (["AI", "PROVIDER", "MODEL", "NAVIGATOR", "LISA"].includes(input.decidedBy)) {
    return { ok: false, status: "APPROVAL_BLOCKED", reason: "ai_provider_lisa_or_navigator_cannot_approve_conversation_creation" };
  }
  return createApprovalDecision({
    executionIntentId: agentIntent.executionIntentId,
    decision: approvalDecisions.approve,
    decidedBy: input.decidedBy || "local_human_property_admin",
    scope: {
      toolId: "property.local.execution",
      action: propertyConversationExecutionActionTypes.createInternalConversationLocalProof,
      projectId: "essa_property_local",
      handoffId: input.handoffId || agentIntent.normalizedInput?.handoffId
    },
    notes: "Explicit local human approval proof for Phase 23L internal conversation only.",
    approvalToken: input.approvalToken || agentIntent.approvalToken,
    maxApprovedCost: 0
  });
}

function executeAtomicConversationCreation(input = {}) {
  const { intent, scenario, store, beforeSnapshot, failAfterCommit = false } = input;
  if (failAfterCommit) return { ok: false, status: "FAILED", reason: "synthetic_failure_before_apply" };
  const conversation = createPropertyConversation({ intent, review: scenario.review, publicationRecord: scenario.publicationRecord });
  const buyer = createPropertyConversationParticipant({
    conversationId: conversation.conversationId,
    actorRef: intent.buyerActorRef,
    participantRole: propertyConversationParticipantRoles.buyer,
    consentRef: intent.buyerConsentRef,
    safeLabel: "Interested Buyer"
  });
  const sellerRole = scenario.review.recipientRepresentationType === "AUTHORIZED_AGENT"
    ? propertyConversationParticipantRoles.authorizedAgent
    : propertyConversationParticipantRoles.owner;
  const seller = createPropertyConversationParticipant({
    conversationId: conversation.conversationId,
    actorRef: intent.sellerActorRef,
    participantRole: sellerRole,
    organizationRef: intent.sellerOrganizationId,
    authorityRef: intent.sellerAuthorityRef,
    safeLabel: sellerRole.replaceAll("_", " ")
  });
  const participantList = [buyer, seller];
  const buyerContext = createPropertyConversationMessage({
    conversationId: conversation.conversationId,
    senderActorRef: intent.buyerActorRef,
    senderRole: propertyConversationParticipantRoles.buyer,
    messageType: propertyConversationMessageTypes.propertyQuestion,
    body: scenario.leadResult.lead?.messageSummary || "Buyer inquiry context linked.",
    sequenceNumber: 1,
    deliveryStatus: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof
  });
  const sellerResponse = createPropertyConversationMessage({
    conversationId: conversation.conversationId,
    senderActorRef: intent.sellerActorRef,
    senderRole: sellerRole,
    messageType: propertyConversationMessageTypes.propertyInformation,
    body: scenario.responseIntent.responseMessage,
    sequenceNumber: 2,
    deliveryStatus: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof
  });
  const sellerFingerprint = createSellerResponseFingerprint({
    leadId: scenario.leadResult.lead.leadId,
    responseText: scenario.responseIntent.responseMessage,
    projection: scenario.projection,
    sellerRoute: scenario.review.routeReresolution?.currentRoute,
    buyerConsentState: scenario.consent.consentStatus,
    listingState: scenario.publicationRecord.publicationStatus
  });
  if (sellerFingerprint !== scenario.approval.approvedProjectionFingerprint) return { ok: false, status: propertyConversationPolicyStatuses.blockedStateMismatch, reason: "approved_response_fingerprint_mismatch" };
  store.addConversation({ ...conversation, participants: participantList.map((participant) => participant.participantId) });
  participantList.forEach((participant) => store.addParticipant(participant));
  store.addMessage(buyerContext);
  store.addMessage(sellerResponse);
  store.setReadState({ readStateId: `${conversation.conversationId}_buyer`, conversationId: conversation.conversationId, actorId: intent.buyerActorRef?.actorId, readStatus: "UNREAD", unreadCount: 1, updatedAt: now });
  store.setReadState({ readStateId: `${conversation.conversationId}_seller`, conversationId: conversation.conversationId, actorId: intent.sellerActorRef?.actorId, readStatus: "READ_LOCAL_PROOF", unreadCount: 0, updatedAt: now });
  store.addIdempotencyKey(intent.idempotencyKey);
  [
    propertyConversationAuditEvents.createdLocalProof,
    propertyConversationAuditEvents.participantsLinked,
    propertyConversationAuditEvents.buyerInquiryLinked,
    propertyConversationAuditEvents.sellerResponseDelivered
  ].forEach((eventType) => store.addAudit(audit(eventType, { conversationId: conversation.conversationId, conversationCreationIntentId: intent.conversationCreationIntentId, leadId: intent.leadId, listingId: intent.listingId, propertyId: intent.propertyId })));
  return { ok: true, status: propertyConversationStatuses.activeLocalProof, conversation: store.getConversation(conversation.conversationId), participants: store.listParticipants(conversation.conversationId), messages: store.listMessages(conversation.conversationId), beforeSnapshot };
}

export function executePropertyConversationCreationThroughGateway(input = {}) {
  const { scenario, store = createLocalPropertyConversationStore(), approvalActor = "local_human_property_admin", failAfterCommit = false } = input;
  const intent = input.intent || createPropertyConversationCreationIntent(scenario);
  const preflight = preflightPropertyConversationCreationIntent({ ...scenario, intent, store });
  if (store.hasIdempotencyKey(intent.idempotencyKey)) {
    const existing = store.listConversations().find((item) => item.leadId === intent.leadId);
    return { ok: true, status: "ALREADY_CREATED_IDEMPOTENT", conversation: existing, ...store.counters(), duplicateMessagesCreated: 0 };
  }
  if (!preflight.ok) return { ok: false, status: preflight.status, preflight, ...propertyConversationSideEffectCounters };
  const agentIntent = createAgentToolIntent(intent);
  const queue = createExecutionQueue();
  const enqueued = queue.enqueue(agentIntent);
  const approval = createExplicitLocalPropertyConversationApproval(enqueued.intent, { decidedBy: approvalActor, handoffId: intent.handoffId });
  if (!approval.decision) return { ok: false, status: "APPROVAL_BLOCKED", approval, ...propertyConversationSideEffectCounters };
  const approved = queue.applyApproval(approval);
  if (!approved.ok) return { ok: false, status: "APPROVAL_BLOCKED", approvalResult: approved, ...propertyConversationSideEffectCounters };
  const readyIntent = { ...approved.intent, status: executionIntentStatuses.readyForExecution };
  const gateway = prepareExecution(readyIntent, {
    queue,
    approvalDecision: approval,
    expectedProjectId: "essa_property_local",
    expectedTaskId: "phase_23l",
    executionHistory: []
  });
  if (gateway.decision !== executionGateDecisions.ready) return { ok: false, status: "GATEWAY_BLOCKED", gateway, ...propertyConversationSideEffectCounters };
  const beforeSnapshot = store.snapshot();
  store.addAudit(audit(propertyConversationAuditEvents.preflightPassed, { conversationCreationIntentId: intent.conversationCreationIntentId, leadId: intent.leadId, listingId: intent.listingId, propertyId: intent.propertyId }));
  store.addAudit(audit(propertyConversationAuditEvents.approvalGranted, { conversationCreationIntentId: intent.conversationCreationIntentId, leadId: intent.leadId, listingId: intent.listingId, propertyId: intent.propertyId }));
  const commit = executeAtomicConversationCreation({ intent, scenario, store, beforeSnapshot, failAfterCommit });
  const executionRecordId = `property_conversation_exec_${intent.conversationCreationIntentId}`;
  if (!commit.ok) {
    store.restore(beforeSnapshot);
    const failedRecord = store.saveExecutionRecord({ executionRecordId, executionIntentId: intent.conversationCreationIntentId, idempotencyKey: intent.idempotencyKey, executionStatus: "FAILED", failureReason: commit.reason, gateway, approval, beforeSnapshot });
    return { ok: false, status: "FAILED", executionRecord: failedRecord, gateway, approval, ...propertyConversationSideEffectCounters };
  }
  const record = store.saveExecutionRecord({
    executionRecordId,
    executionIntentId: intent.conversationCreationIntentId,
    agentExecutionIntentId: readyIntent.executionIntentId,
    idempotencyKey: intent.idempotencyKey,
    actionType: intent.actionType,
    executionStatus: "VERIFIED_LOCAL_PROOF",
    gateway,
    approval,
    beforeSnapshot,
    conversationId: commit.conversation.conversationId,
    audit: store.auditEvents(),
    ...store.counters()
  });
  return { ok: true, status: propertyConversationStatuses.activeLocalProof, intent: { ...intent, preflightStatus: preflight.status, approvalStatus: "APPROVED_BY_LOCAL_HUMAN", executionStatus: "VERIFIED_LOCAL_PROOF" }, preflight, gateway, approval, executionRecord: record, ...commit, ...store.counters(), duplicateMessagesCreated: 0 };
}

export function markPropertyConversationReadLocalProof(input = {}) {
  const { conversationId, actorId, store } = input;
  const readState = { readStateId: `${conversationId}_${actorId}`, conversationId, actorId, readStatus: "READ_LOCAL_PROOF", unreadCount: 0, updatedAt: now };
  store.setReadState(readState);
  store.addAudit(audit(propertyConversationAuditEvents.messageRead, { conversationId }));
  return { ok: true, status: propertyConversationDeliveryStatuses.readLocalProof, readState, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()))) };
}

export function evaluatePropertyConversationRouteChangeReadiness(input = {}) {
  const conversation = input.conversation || {};
  const participants = input.participants || [];
  const reason = input.reason || propertyConversationRouteChangeReasons.authorityExpired;
  const currentSeller = input.currentSellerParticipant || participants.find((item) => item.participantRole !== propertyConversationParticipantRoles.buyer);
  const candidates = (input.candidateRoutes || []).filter((candidate) => candidate.eligible);
  const blockers = [];
  const warnings = [];
  const buyerConsentStatus = input.consent?.revokedAt ? "REVOKED" : input.consent?.consentStatus || "ACTIVE_LOCAL_PROOF";
  const listingStatus = input.listingStatus || input.publicationRecord?.listingStatus || "ACTIVE_LOCAL_PROOF";
  const publicationStatus = input.publicationRecord?.publicationStatus || "PUBLISHED_LOCAL_PROOF";
  if (buyerConsentStatus === "REVOKED") blockers.push("buyer_consent_revoked");
  if (listingStatus === "UNPUBLISHED_LOCAL_PROOF" || listingStatus === "BLOCKED") blockers.push("listing_not_compatible");
  if (publicationStatus === "UNPUBLISHED_LOCAL_PROOF" || publicationStatus === "BLOCKED") blockers.push("publication_not_compatible");
  if (!candidates.length) blockers.push("no_authorized_route");
  const ownerCandidate = candidates.find((candidate) => candidate.participantRole === propertyConversationParticipantRoles.owner);
  const readinessStatus = blockers.includes("buyer_consent_revoked") ? propertyConversationRouteChangeReadinessStatuses.blockedBuyerConsent
    : blockers.includes("listing_not_compatible") ? propertyConversationRouteChangeReadinessStatuses.blockedListingState
      : blockers.includes("publication_not_compatible") ? propertyConversationRouteChangeReadinessStatuses.blockedPublicationState
        : candidates.length > 1 ? propertyConversationRouteChangeReadinessStatuses.multipleReplacementsReviewRequired
          : ownerCandidate ? propertyConversationRouteChangeReadinessStatuses.ownerFallbackAvailable
            : candidates.length === 1 ? propertyConversationRouteChangeReadinessStatuses.replacementFound
              : propertyConversationRouteChangeReadinessStatuses.blockedNoAuthorizedRoute;
  input.store?.addAudit(audit(propertyConversationAuditEvents.routeReviewStarted, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  input.store?.addAudit(audit(propertyConversationAuditEvents.sellerParticipantAuthorityInvalidated, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  input.store?.addAudit(audit(propertyConversationAuditEvents.sellerRouteCandidatesResolved, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  if (ownerCandidate) input.store?.addAudit(audit(propertyConversationAuditEvents.ownerFallbackIdentified, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  if (readinessStatus === propertyConversationRouteChangeReadinessStatuses.multipleReplacementsReviewRequired) input.store?.addAudit(audit(propertyConversationAuditEvents.multipleRouteReviewRequired, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  return {
    modelType: "PropertyConversationRouteChangeReadiness",
    routeChangeReadinessId: `route_readiness_${conversation.conversationId || "blocked"}_${reason}`,
    conversationId: input.conversation?.conversationId || null,
    leadId: conversation.leadId || null,
    listingId: conversation.listingId || null,
    propertyId: conversation.propertyId || null,
    currentSellerParticipantId: currentSeller?.participantId || null,
    currentSellerActorRef: clone(currentSeller?.actorRef || null),
    currentAuthorityRef: currentSeller?.authorityRef || input.currentAuthorityRef || null,
    currentAuthorityStatus: input.currentAuthorityStatus || propertyAuthorityStatuses.expired,
    routeChangeReason: reason,
    candidateRoutes: clone(input.candidateRoutes || []),
    buyerConsentStatus,
    listingStatus,
    publicationStatus,
    readinessStatus,
    status: readinessStatus,
    blockers,
    warnings,
    createdAt: now,
    automaticParticipantSubstitution: false,
    historyPreserved: true,
    auditMetadata: { audit: [propertyConversationAuditEvents.routeReviewStarted, propertyConversationAuditEvents.sellerRouteCandidatesResolved], localProofOnly: true },
    routeChangeReadinessEvaluations: 1,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => key !== "routeChangeReadinessEvaluations"))
  };
}

export const propertyConversationRouteChangeReasons = {
  authorityExpired: "AUTHORITY_EXPIRED",
  authorityRevoked: "AUTHORITY_REVOKED",
  authoritySuperseded: "AUTHORITY_SUPERSEDED",
  actorRemovedFromOrganization: "ACTOR_REMOVED_FROM_ORGANIZATION",
  agencyMandateEnded: "AGENCY_MANDATE_ENDED",
  listingRepresentativeChanged: "LISTING_REPRESENTATIVE_CHANGED",
  ownerTakeover: "OWNER_TAKEOVER",
  developerRepresentativeChanged: "DEVELOPER_REPRESENTATIVE_CHANGED",
  manualRouteReview: "MANUAL_ROUTE_REVIEW",
  otherStructuredRouteReason: "OTHER_STRUCTURED_ROUTE_REASON"
};

export const propertyConversationRouteChangeReadinessStatuses = {
  notRequired: "NOT_REQUIRED",
  routeReviewRequired: "ROUTE_REVIEW_REQUIRED",
  replacementFound: "REPLACEMENT_FOUND",
  multipleReplacementsReviewRequired: "MULTIPLE_REPLACEMENTS_REVIEW_REQUIRED",
  ownerFallbackAvailable: "OWNER_FALLBACK_AVAILABLE",
  blockedNoAuthorizedRoute: "BLOCKED_NO_AUTHORIZED_ROUTE",
  blockedBuyerConsent: "BLOCKED_BUYER_CONSENT",
  blockedListingState: "BLOCKED_LISTING_STATE",
  blockedPublicationState: "BLOCKED_PUBLICATION_STATE",
  readyForParticipantChange: "READY_FOR_PARTICIPANT_CHANGE",
  cancelled: "CANCELLED"
};

export const propertyConversationParticipantChangePreflightStatuses = {
  readyForLocalParticipantChange: "READY_FOR_LOCAL_PARTICIPANT_CHANGE",
  blockedConversationState: "BLOCKED_CONVERSATION_STATE",
  blockedOutgoingState: "BLOCKED_OUTGOING_STATE",
  blockedIncomingAuthority: "BLOCKED_INCOMING_AUTHORITY",
  blockedScope: "BLOCKED_SCOPE",
  blockedBuyerConsent: "BLOCKED_BUYER_CONSENT",
  blockedListingState: "BLOCKED_LISTING_STATE",
  blockedPublicationState: "BLOCKED_PUBLICATION_STATE",
  blockedMultipleRoutes: "BLOCKED_MULTIPLE_ROUTES",
  blockedNoRoute: "BLOCKED_NO_ROUTE",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  reviewRequired: "REVIEW_REQUIRED"
};

function createSellerRouteCandidate(input = {}) {
  const authorityStatus = input.authorityStatus || propertyAuthorityStatuses.activeLocalProof;
  const participantRole = input.participantRole || propertyConversationParticipantRoles.owner;
  const eligibleRole = [
    propertyConversationParticipantRoles.owner,
    propertyConversationParticipantRoles.authorizedAgent,
    propertyConversationParticipantRoles.agencyRepresentative,
    propertyConversationParticipantRoles.developerRepresentative
  ].includes(participantRole);
  const eligible = eligibleRole &&
    authorityStatus === propertyAuthorityStatuses.activeLocalProof &&
    input.scopeMatches !== false &&
    input.organizationMembershipValid !== false;
  return {
    routeCandidateId: input.routeCandidateId || `route_candidate_${input.actorRef?.actorId || participantRole.toLowerCase()}`,
    actorRef: clone(input.actorRef || { actorId: `actor_${participantRole.toLowerCase()}` }),
    organizationRef: clone(input.organizationRef || null),
    participantRole,
    authorityRef: input.authorityRef || `authority_${input.actorRef?.actorId || participantRole.toLowerCase()}`,
    authorityStatus,
    scope: input.scope || { propertyScoped: true, sellerContactAllowed: true },
    organizationMembershipStatus: input.organizationMembershipValid === false ? "INVALID" : "ACTIVE_LOCAL_PROOF",
    safeLabel: input.safeLabel || participantRole.replaceAll("_", " "),
    eligible,
    blockers: eligible ? [] : ["incoming_authority_not_valid"],
    localExclusivityRespected: input.localExclusivityRespected !== false
  };
}

function validateIncomingSellerRoute(candidate = {}, conversation = {}) {
  if (!candidate.eligible) return { ok: false, status: propertyConversationParticipantChangePreflightStatuses.blockedIncomingAuthority, reason: "candidate_not_eligible" };
  if (candidate.scope?.propertyId && candidate.scope.propertyId !== conversation.propertyId) return { ok: false, status: propertyConversationParticipantChangePreflightStatuses.blockedScope, reason: "property_scope_mismatch" };
  if (candidate.localExclusivityRespected === false) return { ok: false, status: propertyConversationParticipantChangePreflightStatuses.blockedScope, reason: "exclusive_mandate_scope_mismatch" };
  return { ok: true, status: "PASS" };
}

export function createPropertyConversationParticipantChangeIntent(input = {}) {
  const readiness = input.readiness || {};
  const conversation = input.conversation || {};
  const outgoing = input.outgoingParticipant || {};
  const incoming = input.incomingCandidate || {};
  const fingerprint = createPropertyConversationFingerprint({
    conversationId: conversation.conversationId,
    outgoingParticipantId: outgoing.participantId,
    incomingActorRef: incoming.actorRef,
    incomingAuthorityRef: incoming.authorityRef,
    reason: readiness.routeChangeReason || input.routeChangeReason
  });
  return {
    modelType: "PropertyConversationParticipantChangeIntent",
    participantChangeIntentId: `participant_change_${conversation.conversationId || "blocked"}_${fingerprint.slice(-8)}`,
    actionType: propertyConversationExecutionActionTypes.changeSellerParticipantLocalProof,
    conversationId: conversation.conversationId || null,
    leadId: conversation.leadId || null,
    listingId: conversation.listingId || null,
    propertyId: conversation.propertyId || null,
    outgoingParticipantId: outgoing.participantId || null,
    outgoingActorRef: clone(outgoing.actorRef || null),
    outgoingAuthorityRef: outgoing.authorityRef || null,
    incomingActorRef: clone(incoming.actorRef || null),
    incomingOrganizationRef: clone(incoming.organizationRef || null),
    incomingAuthorityRef: incoming.authorityRef || null,
    incomingParticipantRole: incoming.participantRole || propertyConversationParticipantRoles.owner,
    incomingSafeLabel: incoming.safeLabel || "Authorized Seller - Local Proof",
    routeChangeReason: readiness.routeChangeReason || input.routeChangeReason || propertyConversationRouteChangeReasons.authorityExpired,
    buyerConsentSnapshot: readiness.buyerConsentStatus || "ACTIVE_LOCAL_PROOF",
    listingSnapshot: readiness.listingStatus || "ACTIVE_LOCAL_PROOF",
    publicationSnapshot: readiness.publicationStatus || "PUBLISHED_LOCAL_PROOF",
    attributionRef: conversation.attributionRef,
    expectedConversationState: input.expectedConversationState || propertyConversationStatuses.pausedLocal,
    requestedBy: input.requestedBy || "local_human_seller_side_control",
    createdAt: now,
    preflightStatus: "DRAFT",
    executionStatus: "DRAFT",
    idempotencyKey: input.idempotencyKey || `participant-change:${conversation.conversationId}:${outgoing.participantId}:${incoming.actorRef?.actorId}:${fingerprint}`,
    expectedPostConditions: {
      sameConversationId: conversation.conversationId,
      sameLeadId: conversation.leadId,
      sameListingId: conversation.listingId,
      samePropertyId: conversation.propertyId,
      attributionPreserved: true,
      outgoingParticipantPreserved: true,
      incomingParticipantAppended: true,
      messagesReassigned: 0,
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    },
    auditMetadata: { audit: [propertyConversationAuditEvents.participantChangeIntentCreated], localProofOnly: true, lisaCannotExecute: true, navigatorCannotExecute: true },
    participantChangeIntentsLocal: 1,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => key !== "participantChangeIntentsLocal"))
  };
}

export function preflightPropertyConversationParticipantChange(input = {}) {
  const { intent = {}, conversation = {}, participants = [], readiness = {}, incomingCandidate = {}, consent = {}, publicationRecord = {}, store = createLocalPropertyConversationStore() } = input;
  const blockers = [];
  let status = propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange;
  if (!conversation.conversationId || conversation.conversationStatus !== intent.expectedConversationState) {
    status = propertyConversationParticipantChangePreflightStatuses.blockedConversationState;
    blockers.push("conversation_paused_state_required");
  }
  if (conversation.leadId !== intent.leadId || conversation.listingId !== intent.listingId || conversation.propertyId !== intent.propertyId) {
    status = propertyConversationParticipantChangePreflightStatuses.blockedStateMismatch;
    blockers.push("conversation_linkage_mismatch");
  }
  const outgoing = participants.find((item) => item.participantId === intent.outgoingParticipantId);
  if (!outgoing || outgoing.participationStatus === "ACTIVE_LOCAL_PROOF") {
    status = status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange ? propertyConversationParticipantChangePreflightStatuses.blockedOutgoingState : status;
    blockers.push("outgoing_route_must_be_inactive_or_authority_ended");
  }
  if (readiness.readinessStatus === propertyConversationRouteChangeReadinessStatuses.multipleReplacementsReviewRequired && !incomingCandidate.routeCandidateId) {
    status = status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange ? propertyConversationParticipantChangePreflightStatuses.blockedMultipleRoutes : status;
    blockers.push("explicit_route_choice_required");
  }
  if (readiness.readinessStatus === propertyConversationRouteChangeReadinessStatuses.blockedNoAuthorizedRoute) {
    status = status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange ? propertyConversationParticipantChangePreflightStatuses.blockedNoRoute : status;
    blockers.push("no_authorized_route");
  }
  if (consent.revokedAt || readiness.buyerConsentStatus === "REVOKED") {
    status = status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange ? propertyConversationParticipantChangePreflightStatuses.blockedBuyerConsent : status;
    blockers.push("buyer_consent_revoked");
  }
  if (publicationRecord.listingStatus === "BLOCKED" || readiness.listingStatus === "UNPUBLISHED_LOCAL_PROOF") {
    status = status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange ? propertyConversationParticipantChangePreflightStatuses.blockedListingState : status;
    blockers.push("listing_not_compatible");
  }
  if (publicationRecord.publicationStatus === "UNPUBLISHED_LOCAL_PROOF" || readiness.publicationStatus === "UNPUBLISHED_LOCAL_PROOF") {
    status = status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange ? propertyConversationParticipantChangePreflightStatuses.blockedPublicationState : status;
    blockers.push("publication_not_compatible");
  }
  const incomingValidation = validateIncomingSellerRoute(incomingCandidate, conversation);
  if (!incomingValidation.ok) {
    status = incomingCandidate.actorRef ? incomingValidation.status : status;
    blockers.push(incomingValidation.reason);
  }
  if (store.hasIdempotencyKey(intent.idempotencyKey)) {
    status = propertyConversationParticipantChangePreflightStatuses.blockedIdempotency;
    blockers.push("participant_change_already_applied");
  }
  return {
    modelType: "PropertyConversationParticipantChangePreflight",
    ok: status === propertyConversationParticipantChangePreflightStatuses.readyForLocalParticipantChange,
    status,
    preflightStatus: status,
    blockers: [...new Set(blockers)],
    incomingAuthorityValidation: incomingValidation,
    createdAt: now,
    ...propertyConversationSideEffectCounters
  };
}

function createParticipantChangeAgentToolIntent(intent = {}) {
  return createExecutionIntentFromDecision({
    request: {
      requestId: `req_${intent.participantChangeIntentId}`,
      taskId: "phase_23n",
      projectId: "essa_property_local",
      toolId: "property.local.execution",
      capability: "property_canonical_resolution_association",
      action: propertyConversationExecutionActionTypes.changeSellerParticipantLocalProof,
      input: {
        operation: "change_property_conversation_seller_participant_local_proof",
        writeScope: "local_property_conversation_store",
        participantChangeIntentId: intent.participantChangeIntentId,
        conversationId: intent.conversationId,
        leadId: intent.leadId,
        listingId: intent.listingId,
        propertyId: intent.propertyId
      },
      environment: toolEnvironments.local,
      permissionLevel: toolPermissionClasses.localMutation,
      estimatedCost: agentToolCostPolicy.localCompute,
      sideEffectClass: agentToolSideEffectClasses.localOnly,
      requestedByAgent: "ESSA_PROPERTY_CONVERSATION_ROUTE_CHANGE",
      requestedByProvider: null,
      sourceArtifactRefs: [intent.conversationId, intent.leadId],
      targetArtifactRefs: [intent.participantChangeIntentId],
      traceId: `trace_${intent.participantChangeIntentId}`
    },
    decision: {
      requestId: `req_${intent.participantChangeIntentId}`,
      toolId: "property.local.execution",
      decision: agentToolDecisions.allow,
      reason: "explicit_local_human_seller_side_route_change",
      normalizedInput: {
        operation: "change_property_conversation_seller_participant_local_proof",
        writeScope: "local_property_conversation_store",
        participantChangeIntentId: intent.participantChangeIntentId,
        conversationId: intent.conversationId
      },
      approvalRequired: false,
      traceId: `trace_${intent.participantChangeIntentId}`
    }
  }, {
    executionIntentId: `agent_${intent.participantChangeIntentId}`,
    idempotencyKey: intent.idempotencyKey,
    createdAt: intent.createdAt,
    ttlMinutes: 10,
    maxApprovedCost: 0
  });
}

function executeAtomicParticipantChange(input = {}) {
  const { intent, conversation, outgoingParticipant, incomingCandidate, store } = input;
  const beforeSnapshot = store.snapshot();
  const updatedOutgoing = store.updateParticipant(outgoingParticipant.participantId, {
    participationStatus: "INACTIVE_ROUTE_LOCAL",
    leftAt: now,
    leftReason: intent.routeChangeReason,
    permissions: { ...outgoingParticipant.permissions, canSendInternalMessage: false }
  });
  const incoming = createPropertyConversationParticipant({
    conversationId: conversation.conversationId,
    actorRef: incomingCandidate.actorRef,
    participantRole: incomingCandidate.participantRole,
    organizationRef: incomingCandidate.organizationRef,
    authorityRef: incomingCandidate.authorityRef,
    safeLabel: incomingCandidate.safeLabel
  });
  store.addParticipant(incoming);
  const updatedConversation = store.updateConversation(conversation.conversationId, {
    conversationStatus: propertyConversationStatuses.activeLocalProof,
    routeChangeStatus: "RESUME_READY_LOCAL",
    activeSellerParticipantId: incoming.participantId,
    activeSellerActorRef: incoming.actorRef,
    authoritySnapshot: incoming.authorityRef,
    participants: store.listParticipants(conversation.conversationId).map((participant) => participant.participantId),
    attributionRef: conversation.attributionRef
  });
  store.addIdempotencyKey(intent.idempotencyKey);
  [
    propertyConversationAuditEvents.participantChangeStarted,
    propertyConversationAuditEvents.outgoingParticipantDeactivatedLocal,
    propertyConversationAuditEvents.incomingParticipantAddedLocal,
    propertyConversationAuditEvents.routeChangedLocalProof,
    propertyConversationAuditEvents.routeResumeReady
  ].forEach((eventType) => store.addAudit(audit(eventType, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId })));
  return { ok: true, beforeSnapshot, outgoingParticipant: updatedOutgoing, incomingParticipant: incoming, conversation: updatedConversation };
}

export function changePropertyConversationSellerParticipantThroughGateway(input = {}) {
  const { intent, conversation, participants = [], readiness = {}, incomingCandidate = {}, consent = {}, publicationRecord = {}, store = createLocalPropertyConversationStore() } = input;
  if (store.hasIdempotencyKey(intent.idempotencyKey)) {
    const existing = store.listParticipants(intent.conversationId).find((participant) => participant.actorRef?.actorId === intent.incomingActorRef?.actorId);
    return { ok: true, status: "ALREADY_CHANGED_IDEMPOTENT", incomingParticipant: existing, duplicateParticipantsCreated: 0, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()))) };
  }
  const preflight = preflightPropertyConversationParticipantChange({ intent, conversation, participants, readiness, incomingCandidate, consent, publicationRecord, store });
  if (!preflight.ok) {
    store.addAudit(audit(propertyConversationAuditEvents.routeChangeBlocked, { conversationId: conversation?.conversationId, leadId: intent.leadId, listingId: intent.listingId, propertyId: intent.propertyId }));
    return { ok: false, status: preflight.status, preflight, participantChangeIntentsLocal: 1, ...propertyConversationSideEffectCounters };
  }
  const agentIntent = { ...createParticipantChangeAgentToolIntent(intent), status: executionIntentStatuses.readyForExecution };
  const gateway = prepareExecution(agentIntent, {
    expectedProjectId: "essa_property_local",
    expectedTaskId: "phase_23n",
    executionHistory: []
  });
  if (gateway.decision !== executionGateDecisions.ready) return { ok: false, status: "GATEWAY_BLOCKED", gateway, ...propertyConversationSideEffectCounters };
  store.addAudit(audit(propertyConversationAuditEvents.participantChangePreflightPassed, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  const outgoingParticipant = participants.find((participant) => participant.participantId === intent.outgoingParticipantId);
  const commit = executeAtomicParticipantChange({ intent, conversation, outgoingParticipant, incomingCandidate, store });
  const record = store.saveExecutionRecord({
    executionRecordId: `property_participant_change_exec_${intent.participantChangeIntentId}`,
    executionIntentId: intent.participantChangeIntentId,
    agentExecutionIntentId: agentIntent.executionIntentId,
    idempotencyKey: intent.idempotencyKey,
    actionType: intent.actionType,
    executionStatus: "VERIFIED_LOCAL_PROOF",
    gateway,
    conversationId: conversation.conversationId,
    beforeSnapshot: commit.beforeSnapshot,
    audit: store.auditEvents(),
    sellerParticipantChangesLocal: 1,
    ...store.counters()
  });
  return {
    ok: true,
    status: "ROUTE_CHANGED_LOCAL_PROOF",
    intent: { ...intent, preflightStatus: preflight.status, executionStatus: "VERIFIED_LOCAL_PROOF" },
    preflight,
    gateway,
    executionRecord: record,
    ...commit,
    participantChangeIntentsLocal: 1,
    sellerParticipantChangesLocal: 1,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !["participantChangeIntentsLocal", "sellerParticipantChangesLocal"].includes(key)))
  };
}

export function pausePropertyConversationLocal(input = {}) {
  const { conversation, store, reason = "REVIEW_REQUIRED" } = input;
  const updated = store.updateConversation(conversation.conversationId, { conversationStatus: propertyConversationStatuses.pausedLocal, pauseReason: reason });
  store.addAudit(audit(propertyConversationAuditEvents.pausedLocal, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  return { ok: true, status: propertyConversationStatuses.pausedLocal, conversation: updated, reason, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()))) };
}

export function closePropertyConversationLocal(input = {}) {
  const { conversation, store, actor = "local_participant" } = input;
  const updated = store.updateConversation(conversation.conversationId, { conversationStatus: propertyConversationStatuses.closedLocal, closedBy: actor });
  store.addAudit(audit(propertyConversationAuditEvents.closedLocal, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  return { ok: true, status: propertyConversationStatuses.closedLocal, conversation: updated, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()))) };
}

export function rollbackPropertyConversationLocalProof(input = {}) {
  const { executionRecordId, store, dependencies = {} } = input;
  const record = store.getExecutionRecord(executionRecordId);
  if (!record) return { ok: false, status: "ROLLBACK_RECORD_NOT_FOUND", ...propertyConversationSideEffectCounters };
  const blocked = ["viewing", "offer", "dealRoom"].filter((key) => dependencies[key]);
  store.addAudit(audit(propertyConversationAuditEvents.rollbackRequested, { conversationId: record.conversationId }));
  if (blocked.length) return { ok: false, status: "ROLLBACK_BLOCKED_BY_DEPENDENCY", blockedDependencies: blocked, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()))) };
  store.restore(record.beforeSnapshot);
  store.addAudit(audit(propertyConversationAuditEvents.rolledBack, { conversationId: record.conversationId }));
  return { ok: true, status: propertyConversationStatuses.rolledBackLocalProof, auditPreserved: true, leadUnchanged: true, listingUnchanged: true, propertyUnchanged: true, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()))) };
}

export function createPropertyConversationHistoryItem(input = {}) {
  const { conversation = {}, store = createLocalPropertyConversationStore(), scenario = {} } = input;
  const messages = conversation.conversationId ? store.listMessages(conversation.conversationId) : [];
  return {
    modelType: "PropertyConversationHistoryItem",
    conversationId: conversation.conversationId || null,
    leadId: conversation.leadId || null,
    listingId: conversation.listingId || null,
    propertyId: conversation.propertyId || null,
    participantSummary: conversation.conversationId ? store.listParticipants(conversation.conversationId).map((item) => item.participantRole) : [],
    status: conversation.conversationStatus || null,
    messageCount: messages.length,
    lastMessageAt: messages.at(-1)?.createdAt || null,
    authorityStatus: scenario.review?.authorityStatus || "ACTIVE_LOCAL_PROOF",
    consentStatus: scenario.consent?.revokedAt ? "CONSENT_REVOKED" : scenario.consent?.consentStatus || "UNKNOWN",
    publicationStatus: scenario.publicationRecord?.publicationStatus || "UNKNOWN",
    createdAt: now,
    auditRefs: store.auditEvents().map((event) => event.eventType),
    sideEffectCounters: clone(propertyConversationSideEffectCounters),
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversationMessageIntent(input = {}) {
  const conversation = input.conversation || {};
  const senderActorRef = clone(input.senderActorRef || {});
  const messageType = input.messageType || propertyConversationMessageTypes.generalMessage;
  const rawBody = String(input.rawBody || "");
  const safeBody = sanitizeMessageBody(rawBody);
  const fingerprint = createPropertyConversationFingerprint({
    conversationId: conversation.conversationId,
    senderActorRef,
    senderRole: input.senderRole,
    messageType,
    safeBody,
    replyToMessageId: input.replyToMessageId || null,
    supersedesMessageId: input.supersedesMessageId || null
  });
  return {
    modelType: "PropertyConversationMessageIntent",
    messageIntentId: `message_intent_${conversation.conversationId || "blocked"}_${fingerprint.slice(-8)}`,
    actionType: propertyConversationExecutionActionTypes.appendInternalMessageLocalProof,
    conversationId: conversation.conversationId || null,
    leadId: conversation.leadId || null,
    listingId: conversation.listingId || null,
    propertyId: conversation.propertyId || null,
    senderActorRef,
    senderRole: input.senderRole,
    messageType,
    rawBody,
    safeBody,
    replyToMessageId: input.replyToMessageId || null,
    supersedesMessageId: input.supersedesMessageId || null,
    policySnapshotRef: conversation.policySnapshot?.policyId || "conversation_policy_snapshot",
    authoritySnapshotRef: input.senderRole === propertyConversationParticipantRoles.buyer ? null : conversation.authoritySnapshot,
    consentSnapshotRef: conversation.consentSnapshot || null,
    listingSnapshotRef: conversation.listingId || null,
    publicationSnapshotRef: conversation.publicationId || null,
    fingerprint,
    requestedBy: input.requestedBy || senderActorRef.actorId || "local_participant",
    createdAt: now,
    validationStatus: "DRAFT",
    preflightStatus: "DRAFT",
    approvalStatus: "USER_ACTION_INTENT_LOCAL",
    executionStatus: "DRAFT",
    idempotencyKey: input.idempotencyKey || `property-message:${conversation.conversationId}:${senderActorRef.actorId}:${fingerprint}`,
    expectedPostConditions: {
      messageAppended: true,
      deliveredInsideEssaLocalProof: true,
      conversationLastMessageUpdated: true,
      unreadStateUpdated: true,
      providerCalls: 0,
      externalCalls: 0,
      productionDbMutations: 0
    },
    auditMetadata: { audit: [audit(propertyConversationAuditEvents.messageIntentCreated, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId })], localProofOnly: true },
    localConversationMessageIntents: 1,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => key !== "localConversationMessageIntents"))
  };
}

export function evaluatePropertyConversationRatePolicy(input = {}) {
  const attempts = input.recentAttempts || [];
  const identical = attempts.filter((attempt) => attempt.fingerprint === input.intent?.fingerprint).length;
  const burst = attempts.length;
  const status = identical > 2 || burst > 8
    ? propertyConversationPolicyStatuses.blockedRatePolicy
    : burst > 5
      ? "RATE_REVIEW_REQUIRED"
      : "PASS";
  return { modelType: "PropertyConversationRatePolicy", status, identicalAttempts: identical, burstAttempts: burst, ...propertyConversationSideEffectCounters };
}

function mapValidationToPreflight(status) {
  const map = {
    [propertyConversationPolicyStatuses.pass]: propertyConversationPolicyStatuses.readyForLocalAppend,
    [propertyConversationPolicyStatuses.offerFlowRecommendedFuture]: propertyConversationPolicyStatuses.readyForLocalAppend,
    [propertyConversationPolicyStatuses.blockedContactPolicy]: "BLOCKED_CONTACT_POLICY",
    [propertyConversationPolicyStatuses.blockedPaymentPolicy]: "BLOCKED_PAYMENT_POLICY",
    [propertyConversationPolicyStatuses.blockedDocumentPolicy]: "BLOCKED_DOCUMENT_POLICY",
    [propertyConversationPolicyStatuses.blockedOfferPolicy]: "BLOCKED_OFFER_POLICY",
    [propertyConversationPolicyStatuses.blockedConversationState]: "BLOCKED_CONVERSATION_STATE",
    [propertyConversationPolicyStatuses.blockedParticipant]: "BLOCKED_PARTICIPANT",
    [propertyConversationPolicyStatuses.blockedAuthority]: "BLOCKED_AUTHORITY",
    [propertyConversationPolicyStatuses.blockedConsent]: "BLOCKED_BUYER_CONSENT",
    [propertyConversationPolicyStatuses.blockedListing]: "BLOCKED_LISTING_STATE",
    [propertyConversationPolicyStatuses.blockedPublication]: "BLOCKED_PUBLICATION_STATE",
    [propertyConversationPolicyStatuses.blockedMessageType]: "BLOCKED_MESSAGE_TYPE",
    [propertyConversationPolicyStatuses.blockedMalformed]: "BLOCKED_MALFORMED",
    [propertyConversationPolicyStatuses.blockedDuplicate]: "BLOCKED_DUPLICATE",
    [propertyConversationPolicyStatuses.blockedRatePolicy]: "BLOCKED_RATE_POLICY",
    [propertyConversationPolicyStatuses.blockedStateMismatch]: "BLOCKED_STATE_MISMATCH"
  };
  return map[status] || "REVIEW_REQUIRED";
}

export function preflightPropertyConversationMessageIntent(input = {}) {
  const { intent = {}, conversation = {}, participants = [], consent = {}, publicationRecord = {}, authorityGrant = {}, store = createLocalPropertyConversationStore(), recentAttempts = [] } = input;
  let policyStatus = propertyConversationPolicyStatuses.pass;
  const blockers = [];
  if (!conversation.conversationId) {
    policyStatus = propertyConversationPolicyStatuses.blockedStateMismatch;
    blockers.push("conversation_required");
  } else if (conversation.conversationStatus !== propertyConversationStatuses.activeLocalProof) {
    policyStatus = propertyConversationPolicyStatuses.blockedConversationState;
    blockers.push("conversation_not_active");
  }
  const participant = participants.find((item) => item.actorRef?.actorId === intent.senderActorRef?.actorId && item.participantRole === intent.senderRole);
  if (!participant || participant.participationStatus !== "ACTIVE_LOCAL_PROOF" || participant.leftAt) {
    policyStatus = policyStatus === propertyConversationPolicyStatuses.pass ? propertyConversationPolicyStatuses.blockedParticipant : policyStatus;
    blockers.push("active_participant_required");
  }
  if (conversation.leadId !== intent.leadId || conversation.listingId !== intent.listingId || conversation.propertyId !== intent.propertyId) {
    policyStatus = policyStatus === propertyConversationPolicyStatuses.pass ? propertyConversationPolicyStatuses.blockedStateMismatch : policyStatus;
    blockers.push("conversation_linkage_mismatch");
  }
  if (!Object.values(propertyConversationMessageTypes).includes(intent.messageType)) {
    policyStatus = policyStatus === propertyConversationPolicyStatuses.pass ? propertyConversationPolicyStatuses.blockedMessageType : policyStatus;
    blockers.push("message_type_not_allowed");
  }
  if (intent.replyToMessageId && !store.getMessage(intent.replyToMessageId)) {
    policyStatus = policyStatus === propertyConversationPolicyStatuses.pass ? propertyConversationPolicyStatuses.blockedStateMismatch : policyStatus;
    blockers.push("reply_target_missing");
  }
  const draftMessage = createPropertyConversationMessage({
    conversationId: intent.conversationId,
    senderActorRef: intent.senderActorRef,
    senderRole: intent.senderRole,
    messageType: intent.messageType,
    body: intent.rawBody,
    replyToMessageId: intent.replyToMessageId,
    sequenceNumber: store.nextSequence(intent.conversationId)
  });
  const validation = validatePropertyConversationMessage({ conversation, participants, message: draftMessage, consent, publicationRecord, authorityGrant, store });
  const rate = evaluatePropertyConversationRatePolicy({ intent, recentAttempts });
  if (!validation.ok && policyStatus === propertyConversationPolicyStatuses.pass) policyStatus = validation.policyStatus;
  if (rate.status === propertyConversationPolicyStatuses.blockedRatePolicy && policyStatus === propertyConversationPolicyStatuses.pass) policyStatus = propertyConversationPolicyStatuses.blockedRatePolicy;
  blockers.push(...validation.blockers, ...(rate.status === propertyConversationPolicyStatuses.blockedRatePolicy ? ["rate_policy_blocked"] : []));
  const offerLike = /i could pay|i offer|would consider|counteroffer|counter offer|\b\d{5,}\s*(usd|gel|eur)\b/i.test(intent.rawBody || "");
  if (offerLike && policyStatus === propertyConversationPolicyStatuses.pass) policyStatus = propertyConversationPolicyStatuses.offerFlowRecommendedFuture;
  const preflightStatus = mapValidationToPreflight(policyStatus);
  return {
    modelType: "PropertyConversationMessagePreflight",
    ok: preflightStatus === propertyConversationPolicyStatuses.readyForLocalAppend,
    status: preflightStatus,
    preflightStatus,
    validationStatus: policyStatus === propertyConversationPolicyStatuses.pass || policyStatus === propertyConversationPolicyStatuses.offerFlowRecommendedFuture ? "VALIDATED" : "BLOCKED",
    policyStatus,
    offerLike,
    rateStatus: rate.status,
    blockers: [...new Set(blockers)],
    createdAt: now,
    ...propertyConversationSideEffectCounters
  };
}

function createAppendAgentToolIntent(intent = {}) {
  return createExecutionIntentFromDecision({
    request: {
      requestId: `req_${intent.messageIntentId}`,
      taskId: "phase_23m",
      projectId: "essa_property_local",
      toolId: "property.local.execution",
      capability: "property_canonical_resolution_association",
      action: propertyConversationExecutionActionTypes.appendInternalMessageLocalProof,
      input: {
        operation: "append_property_internal_message_local_proof",
        writeScope: "local_property_conversation_store",
        messageIntentId: intent.messageIntentId,
        conversationId: intent.conversationId,
        leadId: intent.leadId,
        listingId: intent.listingId,
        propertyId: intent.propertyId
      },
      environment: toolEnvironments.local,
      permissionLevel: toolPermissionClasses.localMutation,
      estimatedCost: agentToolCostPolicy.localCompute,
      sideEffectClass: agentToolSideEffectClasses.localOnly,
      requestedByAgent: "ESSA_PROPERTY_CONVERSATION_CONTINUATION",
      requestedByProvider: null,
      sourceArtifactRefs: [intent.conversationId, intent.leadId],
      targetArtifactRefs: [intent.messageIntentId],
      traceId: `trace_${intent.messageIntentId}`
    },
    decision: {
      requestId: `req_${intent.messageIntentId}`,
      toolId: "property.local.execution",
      decision: agentToolDecisions.allow,
      reason: "participant_user_action_local_message_append",
      normalizedInput: {
        operation: "append_property_internal_message_local_proof",
        writeScope: "local_property_conversation_store",
        messageIntentId: intent.messageIntentId,
        conversationId: intent.conversationId
      },
      approvalRequired: false,
      traceId: `trace_${intent.messageIntentId}`
    }
  }, {
    executionIntentId: `agent_${intent.messageIntentId}`,
    idempotencyKey: intent.idempotencyKey,
    createdAt: intent.createdAt,
    ttlMinutes: 10,
    maxApprovedCost: 0
  });
}

function executeAtomicMessageAppend(input = {}) {
  const { intent, conversation, participants, store } = input;
  const beforeSnapshot = store.snapshot();
  const message = createPropertyConversationMessage({
    conversationId: conversation.conversationId,
    senderActorRef: intent.senderActorRef,
    senderRole: intent.senderRole,
    messageType: intent.messageType,
    body: intent.rawBody,
    replyToMessageId: intent.replyToMessageId,
    sequenceNumber: store.nextSequence(conversation.conversationId),
    deliveryStatus: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof
  });
  store.addMessage({ ...message, policyStatus: input.preflight.policyStatus, offerLike: input.preflight.offerLike, executionIntentId: intent.messageIntentId });
  const updated = store.updateConversation(conversation.conversationId, {
    lastMessageAt: now,
    unreadState: {
      buyerUnread: intent.senderRole === propertyConversationParticipantRoles.buyer ? conversation.unreadState?.buyerUnread || 0 : (conversation.unreadState?.buyerUnread || 0) + 1,
      sellerUnread: intent.senderRole === propertyConversationParticipantRoles.buyer ? (conversation.unreadState?.sellerUnread || 0) + 1 : conversation.unreadState?.sellerUnread || 0
    }
  });
  store.addIdempotencyKey(intent.idempotencyKey);
  [
    propertyConversationAuditEvents.messageAppendStarted,
    propertyConversationAuditEvents.messageDeliveredLocalProof,
    input.preflight.offerLike ? propertyConversationAuditEvents.offerLikeDetected : null
  ].filter(Boolean).forEach((eventType) => store.addAudit(audit(eventType, { conversationId: conversation.conversationId, messageId: message.messageId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId })));
  return { ok: true, message: store.getMessage(message.messageId), conversation: updated, participants, beforeSnapshot };
}

export function appendPropertyConversationMessageThroughGateway(input = {}) {
  const { intent, conversation, participants = [], consent = {}, publicationRecord = {}, authorityGrant = {}, store = createLocalPropertyConversationStore(), recentAttempts = [] } = input;
  if (store.hasIdempotencyKey(intent.idempotencyKey)) {
    const existing = store.findMessageByFingerprint(intent.conversationId, intent.fingerprint);
    return { ok: true, status: propertyConversationDeliveryStatuses.alreadyDeliveredIdempotent, message: existing, duplicateMessagesCreated: 0, ...store.counters(), ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()) && key !== "duplicateMessagesCreated")) };
  }
  const preflight = preflightPropertyConversationMessageIntent({ intent, conversation, participants, consent, publicationRecord, authorityGrant, store, recentAttempts });
  store.addAudit(audit(propertyConversationAuditEvents.messagePolicyChecked, { conversationId: conversation?.conversationId, leadId: intent.leadId, listingId: intent.listingId, propertyId: intent.propertyId }));
  if (!preflight.ok) {
    const eventType = preflight.status === "BLOCKED_CONTACT_POLICY" ? propertyConversationAuditEvents.messageBlockedContact
      : preflight.status === "BLOCKED_PAYMENT_POLICY" ? propertyConversationAuditEvents.messageBlockedPayment
        : preflight.status === "BLOCKED_DOCUMENT_POLICY" ? propertyConversationAuditEvents.messageBlockedDocument
          : propertyConversationAuditEvents.messageBlocked;
    store.addAudit(audit(eventType, { conversationId: conversation?.conversationId, leadId: intent.leadId, listingId: intent.listingId, propertyId: intent.propertyId }));
    if (["BLOCKED_AUTHORITY", "BLOCKED_BUYER_CONSENT", "BLOCKED_LISTING_STATE", "BLOCKED_PUBLICATION_STATE"].includes(preflight.status) && conversation?.conversationId) {
      const reason = preflight.status === "BLOCKED_AUTHORITY" ? "AUTHORITY_EXPIRED_ROUTE_REVIEW_REQUIRED"
        : preflight.status === "BLOCKED_BUYER_CONSENT" ? "BUYER_CONSENT_REVOKED"
          : "LISTING_OR_PUBLICATION_REVIEW_REQUIRED";
      pausePropertyConversationLocal({ conversation, store, reason });
      store.addAudit(audit(preflight.status === "BLOCKED_AUTHORITY" ? propertyConversationAuditEvents.pausedAuthority : preflight.status === "BLOCKED_BUYER_CONSENT" ? propertyConversationAuditEvents.pausedConsent : propertyConversationAuditEvents.pausedListing, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
    }
    return { ok: false, status: preflight.status, preflight, localConversationMessageIntents: intent.localConversationMessageIntents || 1, ...propertyConversationSideEffectCounters };
  }
  const agentIntent = { ...createAppendAgentToolIntent(intent), status: executionIntentStatuses.readyForExecution };
  const gateway = prepareExecution(agentIntent, {
    expectedProjectId: "essa_property_local",
    expectedTaskId: "phase_23m",
    executionHistory: []
  });
  if (gateway.decision !== executionGateDecisions.ready) return { ok: false, status: "GATEWAY_BLOCKED", gateway, ...propertyConversationSideEffectCounters };
  store.addAudit(audit(propertyConversationAuditEvents.messagePreflightPassed, { conversationId: conversation.conversationId, leadId: conversation.leadId, listingId: conversation.listingId, propertyId: conversation.propertyId }));
  const commit = executeAtomicMessageAppend({ intent, conversation, participants, store, preflight });
  const record = store.saveExecutionRecord({
    executionRecordId: `property_message_exec_${intent.messageIntentId}`,
    executionIntentId: intent.messageIntentId,
    agentExecutionIntentId: agentIntent.executionIntentId,
    idempotencyKey: intent.idempotencyKey,
    actionType: intent.actionType,
    executionStatus: "VERIFIED_LOCAL_PROOF",
    gateway,
    messageId: commit.message.messageId,
    conversationId: conversation.conversationId,
    beforeSnapshot: commit.beforeSnapshot,
    audit: store.auditEvents(),
    ...store.counters()
  });
  return {
    ok: true,
    status: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof,
    intent: { ...intent, validationStatus: preflight.validationStatus, preflightStatus: preflight.status, executionStatus: propertyConversationDeliveryStatuses.deliveredInsideEssaLocalProof },
    preflight,
    gateway,
    executionRecord: record,
    message: commit.message,
    conversation: commit.conversation,
    localConversationMessageIntents: 1,
    localConversationMessagesAppended: 1,
    localMessagesDeliveredInsideEssa: 1,
    duplicateMessagesCreated: 0,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !["localConversationMessageIntents", "localConversationMessagesAppended", "localMessagesDeliveredInsideEssa", "duplicateMessagesCreated"].includes(key)))
  };
}

export function createPropertyConversationMessageSupersession(input = {}) {
  const supersession = {
    modelType: "PropertyConversationMessageSupersession",
    supersessionId: `supersession_${input.originalMessageId}_${input.replacementMessageId}`,
    conversationId: input.conversationId,
    originalMessageId: input.originalMessageId,
    replacementMessageId: input.replacementMessageId,
    requestedBy: input.requestedBy || "local_participant",
    reasonCode: input.reasonCode || "CLARIFICATION",
    createdAt: now,
    status: "SUPERSEDED_LOCAL_PROOF",
    auditMetadata: { audit: [propertyConversationAuditEvents.messageSupersessionCreated], originalImmutable: true },
    messageSupersessionsLocal: 1,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => key !== "messageSupersessionsLocal"))
  };
  input.store?.updateMessage(input.originalMessageId, { deliveryStatus: propertyConversationDeliveryStatuses.superseded, supersededBy: input.replacementMessageId });
  input.store?.addAudit(audit(propertyConversationAuditEvents.messageSupersessionCreated, { conversationId: input.conversationId, messageId: input.replacementMessageId }));
  return supersession;
}

export function createPropertyConversationAttachmentIntent(input = {}) {
  return {
    modelType: "PropertyConversationAttachmentIntent",
    conversationId: input.conversationId || null,
    status: "FUTURE_CONTROLLED_ATTACHMENT",
    activeSharing: false,
    privateDocumentShares: 0,
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversationMessageHistoryItem(input = {}) {
  const message = input.message || {};
  return {
    modelType: "PropertyConversationMessageHistoryItem",
    messageId: message.messageId,
    conversationId: message.conversationId,
    sequence: message.sequenceNumber,
    senderSafeRole: message.senderRole,
    messageType: message.messageType,
    safeBody: message.safeBody,
    deliveryStatus: message.deliveryStatus,
    readStatus: message.readStatus,
    supersessionState: message.supersededBy ? "SUPERSEDED" : "CURRENT",
    createdAt: message.createdAt,
    policyFlags: { offerLike: Boolean(message.offerLike), policyStatus: message.policyStatus },
    auditRefs: input.auditRefs || [propertyConversationAuditEvents.messageDeliveredLocalProof],
    ...propertyConversationSideEffectCounters
  };
}

export function createPropertyConversationSummary(input = {}) {
  const { conversation = {}, participants = [], messages = [], readStates = [], scenario = {} } = input;
  const last = messages.at(-1) || {};
  return {
    modelType: "PropertyConversationSummary",
    conversationId: conversation.conversationId,
    propertyId: conversation.propertyId,
    listingId: conversation.listingId,
    safePropertyLabel: "Batumi apartment local proof",
    participantSafeLabels: participants.map((item) => item.privacyProfile?.safeLabel || item.participantRole),
    status: conversation.conversationStatus,
    messageCount: messages.length,
    lastMessagePreviewSafe: last.safeBody || "No messages",
    lastMessageAt: last.createdAt || conversation.lastMessageAt,
    buyerUnread: readStates.find((item) => String(item.actorId).includes("buyer"))?.unreadCount || 0,
    sellerUnread: readStates.find((item) => !String(item.actorId).includes("buyer"))?.unreadCount || 0,
    authorityStatus: scenario.authorityGrant?.status || "ACTIVE_LOCAL_PROOF",
    consentStatus: scenario.consent?.revokedAt ? "CONSENT_REVOKED" : scenario.consent?.consentStatus || "UNKNOWN",
    listingStatus: scenario.publicationRecord?.publicationStatus || "UNKNOWN",
    nextStepReadiness: {
      formalOffer: "NOT_ACTIVE_YET",
      viewing: "NOT_ACTIVE_YET",
      documentAccess: "NOT_ACTIVE_YET",
      finance: "FUTURE"
    },
    ...propertyConversationSideEffectCounters
  };
}

export function createLisaPropertyConversationGuide(question = "") {
  const text = String(question).toLowerCase();
  let answer = "This is an ESSA-internal property conversation linked to the Lead, Listing and Property. Contact details, offers, payments and documents remain protected.";
  if (text.includes("phone")) answer = "Phone numbers and outside messengers are blocked. Keep communication inside ESSA.";
  if (text.includes("offer")) answer = "Formal Offer flow is not active yet. Conversation text does not create an Offer entity.";
  if (text.includes("view")) answer = "Viewing can be discussed, but no viewing is scheduled in Phase 23L.";
  if (text.includes("document")) answer = "Document access is future controlled data-room work. Protected documents are not shared in this thread.";
  return { modelType: "LisaPropertyConversationGuide", answer, maySendWithoutApproval: false, mayRevealContact: false, mayCreateOffer: false, mayScheduleViewing: false, mayShareProtectedDocs: false, mayStartPayment: false, ...propertyConversationSideEffectCounters };
}

export function createNavigatorPropertyConversationRouting(input = "") {
  const text = String(input).toLowerCase();
  const hash = text.includes("offer")
    ? "#property-conversations?case=offerText"
    : text.includes("pay") || text.includes("deposit")
      ? "#property-conversations?case=payment"
      : text.includes("view")
        ? "#property-conversations?case=buyerViewing"
        : "#property-conversations?case=owner";
  return { modelType: "NavigatorPropertyConversationRouting", input, hash, routeOnly: true, formalOfferFlowActive: false, paymentActive: false, providerCalls: 0, ...propertyConversationSideEffectCounters };
}

export function buildPropertyConversationScenario(caseKey = "owner") {
  const reviewCase = caseKey === "agent" || caseKey === "authorityExpired" ? "agent"
    : caseKey === "consentRevoked" ? "owner"
      : caseKey === "unpublished" ? "owner"
        : "owner";
  const scenario = buildSellerLeadReviewViewModel({ case: reviewCase });
  if (caseKey === "consentRevoked") scenario.consent.revokedAt = now;
  if (caseKey === "unpublished") scenario.publicationRecord.publicationStatus = "UNPUBLISHED_LOCAL_PROOF";
  if (caseKey === "authorityExpired") scenario.authorityGrant.status = propertyAuthorityStatuses.expired;
  return scenario;
}

export function buildPropertyConversationViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "owner";
  const scenario = buildPropertyConversationScenario(caseKey);
  const store = createLocalPropertyConversationStore();
  const intent = createPropertyConversationCreationIntent(scenario);
  const execution = executePropertyConversationCreationThroughGateway({ scenario, store, intent });
  const conversation = execution.conversation || null;
  const participants = conversation ? store.listParticipants(conversation.conversationId) : [];
  const buyerSafeMessage = conversation ? createPropertyConversationMessage({
    conversationId: conversation.conversationId,
    senderActorRef: scenario.handoff.buyerActorRef,
    senderRole: propertyConversationParticipantRoles.buyer,
    messageType: propertyConversationMessageTypes.viewingDiscussion,
    body: "Can I see the apartment tomorrow?",
    sequenceNumber: store.nextSequence(conversation.conversationId)
  }) : null;
  const sellerSafeMessage = conversation ? createPropertyConversationMessage({
    conversationId: conversation.conversationId,
    senderActorRef: scenario.handoff.sellerActorRef,
    senderRole: participants.find((item) => item.participantRole !== propertyConversationParticipantRoles.buyer)?.participantRole || propertyConversationParticipantRoles.owner,
    messageType: propertyConversationMessageTypes.viewingDiscussion,
    body: "Yes, we can discuss available times here.",
    sequenceNumber: conversation ? store.nextSequence(conversation.conversationId) + 1 : 1
  }) : null;
  const scenarioMessageBody = caseKey === "phoneLeak" ? "My number is +995 555 123 456."
    : caseKey === "whatsappLeak" ? "Write me on WhatsApp please."
      : caseKey === "payment" ? "Send deposit to this bank account."
        : caseKey === "offerText" ? "I offer 120000 USD as discussion text."
          : caseKey === "documentRequest" ? "Can I see ownership documents?"
            : caseKey === "exactAddress" ? "Can you share the exact address?"
              : "Can we keep discussing this apartment here in ESSA?";
  const scenarioMessage = conversation ? createPropertyConversationMessage({
    conversationId: conversation.conversationId,
    senderActorRef: scenario.handoff.buyerActorRef,
    senderRole: propertyConversationParticipantRoles.buyer,
    messageType: caseKey === "documentRequest" ? propertyConversationMessageTypes.documentQuestion : propertyConversationMessageTypes.viewingDiscussion,
    body: scenarioMessageBody,
    sequenceNumber: store.nextSequence(conversation.conversationId)
  }) : null;
  const deliveredBuyer = buyerSafeMessage ? deliverPropertyConversationMessageLocal({ conversation, participants, message: buyerSafeMessage, consent: scenario.consent, publicationRecord: scenario.publicationRecord, authorityGrant: scenario.authorityGrant, store }) : null;
  const deliveredSeller = sellerSafeMessage ? deliverPropertyConversationMessageLocal({ conversation, participants, message: sellerSafeMessage, consent: scenario.consent, publicationRecord: scenario.publicationRecord, authorityGrant: scenario.authorityGrant, store }) : null;
  const scenarioMessageResult = scenarioMessage ? deliverPropertyConversationMessageLocal({ conversation, participants, message: scenarioMessage, consent: scenario.consent, publicationRecord: scenario.publicationRecord, authorityGrant: scenario.authorityGrant, store }) : null;
  const read = conversation ? markPropertyConversationReadLocalProof({ conversationId: conversation.conversationId, actorId: scenario.handoff.buyerActorRef?.actorId, store }) : null;
  const pause = conversation && caseKey === "authorityExpired" ? pausePropertyConversationLocal({ conversation, store, reason: "AUTHORITY_EXPIRED_ROUTE_REVIEW_REQUIRED" })
    : conversation && caseKey === "consentRevoked" ? pausePropertyConversationLocal({ conversation, store, reason: "BUYER_CONSENT_REVOKED" })
      : conversation && caseKey === "unpublished" ? pausePropertyConversationLocal({ conversation, store, reason: "LISTING_UNPUBLISHED_REVIEW_REQUIRED" })
        : null;
  const close = conversation && caseKey === "closeRollback" ? closePropertyConversationLocal({ conversation, store, actor: "local_participant" }) : null;
  const rollback = conversation && caseKey === "closeRollback" ? rollbackPropertyConversationLocalProof({ executionRecordId: execution.executionRecord.executionRecordId, store }) : null;
  const dependencyRollback = conversation && caseKey === "rollbackDependency" ? rollbackPropertyConversationLocalProof({ executionRecordId: execution.executionRecord.executionRecordId, store, dependencies: { viewing: true } }) : null;
  const routeChange = conversation && caseKey === "authorityExpired" ? evaluatePropertyConversationRouteChangeReadiness({ conversation, reason: "AUTHORITY_EXPIRED" }) : null;
  const currentConversation = conversation ? store.getConversation(conversation.conversationId) || conversation : null;
  return {
    modelType: "PropertyConversationViewModel",
    route: "#property-conversations",
    caseKey,
    banner: "KEEP COMMUNICATION INSIDE ESSA. CONTACT DETAILS ARE PROTECTED. OFFERS / PAYMENTS / CONTRACTS ARE NOT ACTIVE IN THIS CONVERSATION PHASE.",
    scenario,
    intent,
    execution,
    conversation: currentConversation,
    participants: currentConversation ? store.listParticipants(currentConversation.conversationId) : [],
    messages: currentConversation ? store.listMessages(currentConversation.conversationId) : [],
    readStates: currentConversation ? store.listReadStates(currentConversation.conversationId) : [],
    deliveredBuyer,
    deliveredSeller,
    scenarioMessageResult,
    read,
    pause,
    close,
    rollback,
    dependencyRollback,
    routeChange,
    historyItem: createPropertyConversationHistoryItem({ conversation: currentConversation || {}, store, scenario }),
    lisaGuide: createLisaPropertyConversationGuide("Can I make an offer or share phone?"),
    navigatorRouting: createNavigatorPropertyConversationRouting("Open my conversation."),
    buyerInbox: currentConversation ? [currentConversation] : [],
    sellerInbox: currentConversation ? [currentConversation] : [],
    ...store.counters(),
    duplicateMessagesCreated: 0,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in store.counters()) && key !== "duplicateMessagesCreated"))
  };
}

export function buildPropertyConversationContinuationViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "buyerSafe";
  const baseCase = caseKey === "agentAuthorityExpired" ? "agent" : "owner";
  const scenario = buildPropertyConversationScenario(baseCase);
  const store = createLocalPropertyConversationStore();
  const creationIntent = createPropertyConversationCreationIntent(scenario);
  const creation = executePropertyConversationCreationThroughGateway({ scenario, store, intent: creationIntent });
  const conversation = creation.conversation;
  const participants = conversation ? store.listParticipants(conversation.conversationId) : [];
  const buyer = participants.find((item) => item.participantRole === propertyConversationParticipantRoles.buyer);
  const seller = participants.find((item) => item.participantRole !== propertyConversationParticipantRoles.buyer);
  if (caseKey === "agentAuthorityExpired") scenario.authorityGrant.status = propertyAuthorityStatuses.expired;
  if (caseKey === "consentRevoked" || caseKey === "consentRevokedRoute") scenario.consent.revokedAt = now;
  if (caseKey === "listingUnpublished" || caseKey === "listingUnpublishedRoute") scenario.publicationRecord.publicationStatus = "UNPUBLISHED_LOCAL_PROOF";
  if (caseKey === "resumeConsentRestored") {
    scenario.consent.revokedAt = null;
    store.updateConversation(conversation.conversationId, { conversationStatus: propertyConversationStatuses.pausedLocal, pauseReason: "BUYER_CONSENT_REVOKED" });
  }
  const sender = caseKey === "sellerSafe" || caseKey === "sellerEmailWhatsapp" || caseKey === "payment" || caseKey === "counterOfferText" || caseKey === "agentAuthorityExpired"
    ? seller
    : buyer;
  const body = caseKey === "sellerSafe" ? "Yes, it is still available."
    : caseKey === "sellerEmailWhatsapp" ? "Email me at seller@example.com or WhatsApp me."
      : caseKey === "phoneBlocked" ? "My phone is +995 555 123 456."
        : caseKey === "telegramBlocked" ? "Message me on Telegram @seller."
          : caseKey === "externalLink" ? "Use https://outside.example/chat."
            : caseKey === "payment" ? "Send deposit to this bank account."
              : caseKey === "crypto" ? "Send USDT to this crypto wallet."
                : caseKey === "privateDocs" ? "Please send ownership document and passport."
                  : caseKey === "offerText" ? "I could pay 120000 USD."
                    : caseKey === "counterOfferText" ? "I would consider 123000 USD."
                      : caseKey === "reply" ? "Replying to the seller response."
                        : caseKey === "supersession" ? "Clarification: I mean tomorrow afternoon."
                          : caseKey === "rate" ? "Repeated message."
                            : "Is the apartment still available?";
  const messageType = caseKey === "finance" ? propertyConversationMessageTypes.financeQuestion
    : caseKey === "privateDocs" ? propertyConversationMessageTypes.documentQuestion
      : caseKey === "sellerSafe" || caseKey === "counterOfferText" ? propertyConversationMessageTypes.propertyInformation
        : propertyConversationMessageTypes.propertyQuestion;
  const replyToMessageId = caseKey === "reply" ? store.listMessages(conversation.conversationId)[1]?.messageId : null;
  const supersedesMessageId = caseKey === "supersession" ? store.listMessages(conversation.conversationId)[0]?.messageId : null;
  const messageIntent = createPropertyConversationMessageIntent({
    conversation,
    senderActorRef: sender?.actorRef,
    senderRole: sender?.participantRole,
    messageType,
    rawBody: body,
    replyToMessageId,
    supersedesMessageId
  });
  const recentAttempts = caseKey === "rate"
    ? Array.from({ length: 9 }, () => ({ fingerprint: messageIntent.fingerprint }))
    : [];
  const appendResult = appendPropertyConversationMessageThroughGateway({
    intent: messageIntent,
    conversation: store.getConversation(conversation.conversationId),
    participants,
    consent: scenario.consent,
    publicationRecord: scenario.publicationRecord,
    authorityGrant: scenario.authorityGrant,
    store,
    recentAttempts
  });
  const idempotent = caseKey === "idempotent"
    ? appendPropertyConversationMessageThroughGateway({
      intent: messageIntent,
      conversation: store.getConversation(conversation.conversationId),
      participants,
      consent: scenario.consent,
      publicationRecord: scenario.publicationRecord,
      authorityGrant: scenario.authorityGrant,
      store
    })
    : null;
  const replacementIntent = caseKey === "supersession" && appendResult.ok
    ? createPropertyConversationMessageIntent({
      conversation: store.getConversation(conversation.conversationId),
      senderActorRef: sender?.actorRef,
      senderRole: sender?.participantRole,
      messageType,
      rawBody: "Correction: I mean tomorrow evening.",
      supersedesMessageId: appendResult.message.messageId
    })
    : null;
  const replacement = replacementIntent
    ? appendPropertyConversationMessageThroughGateway({
      intent: replacementIntent,
      conversation: store.getConversation(conversation.conversationId),
      participants,
      consent: scenario.consent,
      publicationRecord: scenario.publicationRecord,
      authorityGrant: scenario.authorityGrant,
      store
    })
    : null;
  const supersession = replacement?.ok
    ? createPropertyConversationMessageSupersession({
      conversationId: conversation.conversationId,
      originalMessageId: appendResult.message.messageId,
      replacementMessageId: replacement.message.messageId,
      requestedBy: sender?.actorRef?.actorId,
      reasonCode: "CLARIFICATION",
      store
    })
    : null;
  const read = markPropertyConversationReadLocalProof({ conversationId: conversation.conversationId, actorId: seller?.actorRef?.actorId || "seller", store });
  const currentConversation = store.getConversation(conversation.conversationId);
  const messages = store.listMessages(conversation.conversationId);
  const readStates = store.listReadStates(conversation.conversationId);
  const summary = createPropertyConversationSummary({ conversation: currentConversation, participants: store.listParticipants(conversation.conversationId), messages, readStates, scenario });
  const historyItems = messages.map((message) => createPropertyConversationMessageHistoryItem({ message, auditRefs: store.auditEvents().map((event) => event.eventType) }));
  const resumeReadiness = caseKey === "resumeConsentRestored"
    ? { status: "RESUME_REVIEW_REQUIRED", audit: [propertyConversationAuditEvents.resumeReviewRequired], autoResume: false }
    : null;
  const futureHandoffs = {
    formalOffer: appendResult.preflight?.offerLike ? "START FORMAL OFFER - NOT ACTIVE YET" : "FORMAL OFFER FLOW FUTURE",
    viewing: messages.some((message) => message.messageType === propertyConversationMessageTypes.viewingDiscussion) ? "REQUEST VIEWING - NOT ACTIVE YET" : "VIEWING FUTURE",
    documentAccess: caseKey === "privateDocs" ? "REQUEST CONTROLLED DOCUMENT ACCESS - NOT ACTIVE YET" : "DOCUMENT ACCESS FUTURE",
    financing: caseKey === "finance" ? "EXPLORE FINANCING - FUTURE" : "FINANCING FUTURE"
  };
  const counters = store.counters();
  return {
    modelType: "PropertyConversationContinuationViewModel",
    route: "#property-conversations",
    caseKey,
    banner: "SEND INSIDE ESSA ONLY. CONTACT DETAILS, PAYMENTS, OFFERS, VIEWING BOOKINGS AND PRIVATE DOCUMENT SHARING ARE NOT ACTIVE.",
    scenario,
    creation,
    conversation: currentConversation,
    participants: store.listParticipants(conversation.conversationId),
    messages,
    readStates,
    messageIntent,
    appendResult,
    idempotent,
    replacement,
    supersession,
    read,
    summary,
    historyItems,
    resumeReadiness,
    futureHandoffs,
    lisaGuide: createLisaPropertyConversationGuide("Help rewrite safely without phone."),
    navigatorRouting: createNavigatorPropertyConversationRouting("Send this message."),
    attachmentIntent: createPropertyConversationAttachmentIntent({ conversationId: conversation.conversationId }),
    ...counters,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in counters) && !["localConversationMessageIntents", "messageSupersessionsLocal", "duplicateMessagesCreated", "formalOffersCreated", "counterOffersCreated"].includes(key))),
    localConversationMessageIntents: 1 + (replacementIntent ? 1 : 0),
    messageSupersessionsLocal: supersession ? 1 : 0,
    duplicateMessagesCreated: 0,
    formalOffersCreated: 0,
    counterOffersCreated: 0
  };
}

export function createPropertyConversationRouteChangeHistoryItem(input = {}) {
  const change = input.change || {};
  const conversation = input.conversation || change.conversation || {};
  return {
    modelType: "PropertyConversationRouteChangeHistoryItem",
    routeChangeId: change.executionRecord?.executionRecordId || change.intent?.participantChangeIntentId || "route_change_not_executed",
    conversationId: conversation.conversationId,
    leadId: conversation.leadId,
    outgoingSafeRole: change.outgoingParticipant?.privacyProfile?.safeLabel || change.intent?.outgoingActorRef?.safeLabel || "Previous seller route",
    incomingSafeRole: change.incomingParticipant?.privacyProfile?.safeLabel || change.intent?.incomingSafeLabel || "Replacement route",
    reason: change.intent?.routeChangeReason || input.reason || propertyConversationRouteChangeReasons.authorityExpired,
    status: change.status || "NOT_EXECUTED",
    changedAt: now,
    authorityStateSummary: "Incoming seller route required independent ACTIVE_LOCAL_PROOF authority.",
    attributionPreserved: conversation.attributionRef === input.originalAttributionRef || input.originalAttributionRef == null,
    auditRefs: input.auditRefs || [],
    sideEffectCounters: clone(propertyConversationSideEffectCounters),
    ...propertyConversationSideEffectCounters
  };
}

function buildPropertyConversationRouteChangeSetup(caseKey = "ownerFallback") {
  const scenario = buildPropertyConversationScenario("agent");
  const store = createLocalPropertyConversationStore();
  const creation = executePropertyConversationCreationThroughGateway({ scenario, store, intent: createPropertyConversationCreationIntent(scenario) });
  const conversation = store.getConversation(creation.conversation.conversationId);
  const participants = store.listParticipants(conversation.conversationId);
  const buyer = participants.find((participant) => participant.participantRole === propertyConversationParticipantRoles.buyer);
  const outgoing = participants.find((participant) => participant.participantRole !== propertyConversationParticipantRoles.buyer);
  const invalidReason = caseKey === "revokedAuthority" ? propertyConversationRouteChangeReasons.authorityRevoked : propertyConversationRouteChangeReasons.authorityExpired;
  const invalidatedOutgoing = store.updateParticipant(outgoing.participantId, {
    participationStatus: "LEFT_AUTHORITY_ENDED",
    leftAt: now,
    leftReason: invalidReason,
    permissions: { ...outgoing.permissions, canSendInternalMessage: false }
  });
  pausePropertyConversationLocal({ conversation, store, reason: `${invalidReason}_ROUTE_REVIEW_REQUIRED` });
  if (caseKey === "consentRevoked" || caseKey === "consentRevokedRoute") scenario.consent.revokedAt = now;
  if (caseKey === "listingUnpublished" || caseKey === "listingUnpublishedRoute") scenario.publicationRecord.publicationStatus = "UNPUBLISHED_LOCAL_PROOF";
  const owner = createSellerRouteCandidate({
    actorRef: { actorId: "actor_owner_alice", actorType: "PERSON" },
    participantRole: propertyConversationParticipantRoles.owner,
    authorityRef: "auth_owner_alice_sale_contact",
    safeLabel: "Owner"
  });
  const agentB = createSellerRouteCandidate({
    actorRef: { actorId: "actor_agent_b", actorType: "PERSON" },
    organizationRef: { organizationId: "org_agency_b" },
    participantRole: propertyConversationParticipantRoles.authorizedAgent,
    authorityRef: "auth_agent_b_property_scoped",
    safeLabel: "Authorized Agent B - Local Proof"
  });
  const agentC = createSellerRouteCandidate({
    actorRef: { actorId: "actor_agent_c", actorType: "PERSON" },
    organizationRef: { organizationId: "org_agency_c" },
    participantRole: propertyConversationParticipantRoles.authorizedAgent,
    authorityRef: "auth_agent_c_property_scoped",
    safeLabel: "Authorized Agent C - Local Proof"
  });
  const developer = createSellerRouteCandidate({
    actorRef: { actorId: "actor_developer_rep", actorType: "PERSON" },
    organizationRef: { organizationId: "org_developer" },
    participantRole: propertyConversationParticipantRoles.developerRepresentative,
    authorityRef: "auth_developer_rep_property_scoped",
    safeLabel: "Developer Representative - Local Proof"
  });
  const manager = createSellerRouteCandidate({
    actorRef: { actorId: "actor_manager_ops", actorType: "PERSON" },
    participantRole: "PROPERTY_MANAGER",
    authorityRef: "auth_manager_operations_only",
    safeLabel: "Manager",
    authorityStatus: propertyAuthorityStatuses.activeLocalProof
  });
  const cleaner = createSellerRouteCandidate({
    actorRef: { actorId: "actor_cleaner", actorType: "PERSON" },
    participantRole: "SERVICE_PROVIDER",
    authorityRef: "auth_cleaner_service_only",
    safeLabel: "Cleaner",
    authorityStatus: propertyAuthorityStatuses.activeLocalProof
  });
  const expiredAgent = createSellerRouteCandidate({
    actorRef: { actorId: "actor_expired_agent", actorType: "PERSON" },
    participantRole: propertyConversationParticipantRoles.authorizedAgent,
    authorityRef: "auth_expired_agent",
    authorityStatus: propertyAuthorityStatuses.expired,
    safeLabel: "Expired Agent"
  });
  const routeCandidates = caseKey === "agentB" ? [agentB]
    : caseKey === "multipleAgents" ? [agentB, agentC]
      : caseKey === "noValidRoute" ? [expiredAgent]
        : caseKey === "managerBlocked" ? [manager]
          : caseKey === "cleanerBlocked" ? [cleaner]
            : caseKey === "developerRepresentative" ? [developer]
              : caseKey === "exclusiveMandateAgentB" ? [{ ...agentB, localExclusivityRespected: true }]
                : [owner];
  const selectedCandidate = caseKey === "agentB" || caseKey === "exclusiveMandateAgentB" ? agentB
    : caseKey === "managerBlocked" ? manager
      : caseKey === "cleanerBlocked" ? cleaner
        : caseKey === "developerRepresentative" ? developer
          : owner;
  return {
    scenario,
    store,
    creation,
    conversation: store.getConversation(conversation.conversationId),
    buyer,
    outgoing: invalidatedOutgoing,
    routeCandidates,
    selectedCandidate,
    invalidReason
  };
}

export function buildPropertyConversationRouteChangeViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "ownerFallback";
  const setup = buildPropertyConversationRouteChangeSetup(caseKey);
  const { scenario, store, buyer, outgoing, routeCandidates, selectedCandidate, invalidReason } = setup;
  const pausedConversation = store.getConversation(setup.conversation.conversationId);
  const readiness = evaluatePropertyConversationRouteChangeReadiness({
    conversation: pausedConversation,
    participants: store.listParticipants(pausedConversation.conversationId),
    currentSellerParticipant: outgoing,
    currentAuthorityStatus: invalidReason === propertyConversationRouteChangeReasons.authorityRevoked ? propertyAuthorityStatuses.revoked : propertyAuthorityStatuses.expired,
    reason: invalidReason,
    candidateRoutes: routeCandidates,
    consent: scenario.consent,
    publicationRecord: scenario.publicationRecord,
    store
  });
  const shouldPrepareIntent = ![
    propertyConversationRouteChangeReadinessStatuses.multipleReplacementsReviewRequired,
    propertyConversationRouteChangeReadinessStatuses.blockedNoAuthorizedRoute,
    propertyConversationRouteChangeReadinessStatuses.blockedBuyerConsent,
    propertyConversationRouteChangeReadinessStatuses.blockedPublicationState,
    propertyConversationRouteChangeReadinessStatuses.blockedListingState
  ].includes(readiness.readinessStatus) || ["managerBlocked", "cleanerBlocked", "stateMismatch"].includes(caseKey);
  const participantChangeIntent = shouldPrepareIntent
    ? createPropertyConversationParticipantChangeIntent({
      conversation: pausedConversation,
      readiness,
      outgoingParticipant: outgoing,
      incomingCandidate: selectedCandidate,
      requestedBy: "local_human_seller_side_control",
      expectedConversationState: propertyConversationStatuses.pausedLocal
    })
    : null;
  if (participantChangeIntent && caseKey === "stateMismatch") participantChangeIntent.listingId = "changed_listing_elsewhere";
  const participantChange = participantChangeIntent
    ? changePropertyConversationSellerParticipantThroughGateway({
      intent: participantChangeIntent,
      conversation: pausedConversation,
      participants: store.listParticipants(pausedConversation.conversationId),
      readiness,
      incomingCandidate: selectedCandidate,
      consent: scenario.consent,
      publicationRecord: scenario.publicationRecord,
      store
    })
    : { ok: false, status: readiness.readinessStatus };
  const idempotent = caseKey === "idempotent" && participantChangeIntent
    ? changePropertyConversationSellerParticipantThroughGateway({
      intent: participantChangeIntent,
      conversation: pausedConversation,
      participants: store.listParticipants(pausedConversation.conversationId),
      readiness,
      incomingCandidate: selectedCandidate,
      consent: scenario.consent,
      publicationRecord: scenario.publicationRecord,
      store
    })
    : null;
  const afterChangeConversation = store.getConversation(pausedConversation.conversationId);
  const afterChangeParticipants = store.listParticipants(pausedConversation.conversationId);
  const oldSellerIntent = createPropertyConversationMessageIntent({
    conversation: afterChangeConversation,
    senderActorRef: outgoing.actorRef,
    senderRole: outgoing.participantRole,
    messageType: propertyConversationMessageTypes.propertyInformation,
    rawBody: "Old agent tries to continue."
  });
  const oldSellerAppend = participantChange.ok
    ? appendPropertyConversationMessageThroughGateway({
      intent: oldSellerIntent,
      conversation: afterChangeConversation,
      participants: afterChangeParticipants,
      consent: scenario.consent,
      publicationRecord: scenario.publicationRecord,
      authorityGrant: { ...scenario.authorityGrant, status: propertyAuthorityStatuses.expired },
      store
    })
    : null;
  const incomingParticipant = participantChange.incomingParticipant;
  const newSellerIntent = incomingParticipant
    ? createPropertyConversationMessageIntent({
      conversation: store.getConversation(pausedConversation.conversationId),
      senderActorRef: incomingParticipant.actorRef,
      senderRole: incomingParticipant.participantRole,
      messageType: propertyConversationMessageTypes.propertyInformation,
      rawBody: "The authorized seller route changed inside ESSA. We can continue here."
    })
    : null;
  const newSellerAppend = newSellerIntent
    ? appendPropertyConversationMessageThroughGateway({
      intent: newSellerIntent,
      conversation: store.getConversation(pausedConversation.conversationId),
      participants: store.listParticipants(pausedConversation.conversationId),
      consent: scenario.consent,
      publicationRecord: scenario.publicationRecord,
      authorityGrant: { ...scenario.authorityGrant, status: propertyAuthorityStatuses.activeLocalProof },
      store
    })
    : null;
  const finalConversation = store.getConversation(pausedConversation.conversationId);
  const messages = store.listMessages(pausedConversation.conversationId);
  const participants = store.listParticipants(pausedConversation.conversationId);
  const routeHistoryItem = createPropertyConversationRouteChangeHistoryItem({
    change: participantChange,
    conversation: finalConversation,
    originalAttributionRef: pausedConversation.attributionRef,
    reason: invalidReason,
    auditRefs: store.auditEvents().map((event) => event.eventType)
  });
  const counters = store.counters();
  return {
    modelType: "PropertyConversationRouteChangeViewModel",
    route: "#property-conversations",
    caseKey,
    banner: "REPRESENTATIVE AUTHORITY CHANGED. Conversation history, Lead, Listing, Property and attribution stay preserved.",
    scenario,
    creation: setup.creation,
    conversation: finalConversation,
    originalConversationId: pausedConversation.conversationId,
    originalLeadId: pausedConversation.leadId,
    originalListingId: pausedConversation.listingId,
    originalPropertyId: pausedConversation.propertyId,
    originalAttributionRef: pausedConversation.attributionRef,
    buyer,
    outgoingParticipant: outgoing,
    selectedCandidate,
    readiness,
    participantChangeIntent,
    participantChange,
    idempotent,
    oldSellerAppend,
    newSellerAppend,
    participants,
    messages,
    readStates: store.listReadStates(pausedConversation.conversationId),
    routeHistoryItem,
    summary: createPropertyConversationSummary({ conversation: finalConversation, participants, messages, readStates: store.listReadStates(pausedConversation.conversationId), scenario }),
    historyItems: messages.map((message) => createPropertyConversationMessageHistoryItem({ message, auditRefs: store.auditEvents().map((event) => event.eventType) })),
    lisaGuide: {
      ...createLisaPropertyConversationGuide("Why did the agent change?"),
      answer: "The seller-side authority changed. The same Lead and conversation remain; old messages stay authored by the old representative, and the Owner or another authorized seller can continue only after controlled route review.",
      mayExecuteRouteChange: false
    },
    navigatorRouting: {
      ...createNavigatorPropertyConversationRouting("The agent is no longer authorized."),
      hash: "#property-conversations?case=ownerFallback",
      routeOnly: true,
      mayExecuteRouteChange: false
    },
    futureHandoffs: {
      viewing: "REQUEST VIEWING - NOT ACTIVE YET",
      formalOffer: "MAKE FORMAL OFFER - NOT ACTIVE YET",
      dealRoom: "OPEN DEAL ROOM - NOT ACTIVE YET"
    },
    attachmentIntent: createPropertyConversationAttachmentIntent({ conversationId: pausedConversation.conversationId }),
    ...counters,
    routeChangeReadinessEvaluations: 1,
    participantChangeIntentsLocal: participantChangeIntent ? 1 : 0,
    sellerParticipantChangesLocal: participantChange.ok ? 1 : 0,
    newLeadsCreated: 0,
    newConversationsCreated: 0,
    messagesReassigned: 0,
    messageHistoryDeletions: 0,
    attributionMutations: 0,
    contactReveals: 0,
    ...Object.fromEntries(Object.entries(propertyConversationSideEffectCounters).filter(([key]) => !(key in counters) && ![
      "routeChangeReadinessEvaluations",
      "participantChangeIntentsLocal",
      "sellerParticipantChangesLocal",
      "newLeadsCreated",
      "newConversationsCreated",
      "messagesReassigned",
      "messageHistoryDeletions",
      "attributionMutations",
      "contactReveals"
    ].includes(key)))
  };
}
