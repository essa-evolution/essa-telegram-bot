import {
  buildBuyerLeadScenario,
  commitPropertyLeadLocalProof,
  propertyLeadSideEffectCounters,
  sellerContactReadinessStatuses
} from "./propertyBuyerLead.js";
import { marketplacePublicationStatuses } from "./propertyMarketplacePublication.js";
import { propertyAuthorityStatuses } from "./propertyActorAuthorityContracts.js";

const now = "2026-08-22T00:00:00.000Z";

export const sellerLeadReviewStatuses = {
  notStarted: "NOT_STARTED",
  inReview: "IN_REVIEW",
  waitingForBuyerInfoFuture: "WAITING_FOR_BUYER_INFO_FUTURE",
  readyForResponseReview: "READY_FOR_RESPONSE_REVIEW",
  readyForFutureConversation: "READY_FOR_FUTURE_CONVERSATION",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedListingState: "BLOCKED_LISTING_STATE",
  blockedPublicationState: "BLOCKED_PUBLICATION_STATE",
  blockedBuyerConsent: "BLOCKED_BUYER_CONSENT",
  blockedPrivacy: "BLOCKED_PRIVACY",
  blockedPolicy: "BLOCKED_POLICY",
  declinedLocal: "DECLINED_LOCAL",
  closedLocal: "CLOSED_LOCAL",
  cancelled: "CANCELLED"
};

export const sellerResponseTypes = {
  acknowledgeInterest: "ACKNOWLEDGE_INTEREST",
  answerGeneralQuestion: "ANSWER_GENERAL_QUESTION",
  requestMoreBuyerInformation: "REQUEST_MORE_BUYER_INFORMATION",
  providePublicPropertyInformation: "PROVIDE_PUBLIC_PROPERTY_INFORMATION",
  inviteToFutureConversation: "INVITE_TO_FUTURE_CONVERSATION",
  requestViewingDiscussionFuture: "REQUEST_VIEWING_DISCUSSION_FUTURE",
  financeDiscussionFuture: "FINANCE_DISCUSSION_FUTURE",
  documentDiscussionFuture: "DOCUMENT_DISCUSSION_FUTURE",
  declineInquiry: "DECLINE_INQUIRY",
  otherStructuredResponse: "OTHER_STRUCTURED_RESPONSE"
};

export const sellerResponseReadinessStatuses = {
  draft: "DRAFT",
  readyForLocalReview: "READY_FOR_LOCAL_REVIEW",
  readyForFutureConversation: "READY_FOR_FUTURE_CONVERSATION",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedBuyerConsent: "BLOCKED_BUYER_CONSENT",
  blockedListingState: "BLOCKED_LISTING_STATE",
  blockedPrivacy: "BLOCKED_PRIVACY",
  blockedMessage: "BLOCKED_MESSAGE",
  blockedContactMode: "BLOCKED_CONTACT_MODE",
  blockedPolicy: "BLOCKED_POLICY",
  declined: "DECLINED",
  cancelled: "CANCELLED"
};

export const sellerResponseApprovalTypes = {
  approvedForFutureEssaConversation: "APPROVED_FOR_FUTURE_ESSA_CONVERSATION",
  revisionRequired: "REVISION_REQUIRED",
  declined: "DECLINED",
  cancelled: "CANCELLED"
};

export const conversationHandoffStatuses = {
  draft: "DRAFT",
  readyForFutureConversation: "READY_FOR_FUTURE_CONVERSATION",
  blocked: "BLOCKED",
  stale: "STALE",
  cancelled: "CANCELLED",
  notDispatched: "NOT_DISPATCHED"
};

export const sellerLeadReviewAuditEvents = {
  reviewStarted: "SELLER_LEAD_REVIEW_STARTED",
  authorityRechecked: "SELLER_AUTHORITY_RECHECKED",
  routeReresolved: "SELLER_ROUTE_RERESOLVED",
  buyerConsentRechecked: "BUYER_CONSENT_RECHECKED",
  responseIntentCreated: "SELLER_RESPONSE_INTENT_CREATED",
  privacyChecked: "SELLER_RESPONSE_PRIVACY_CHECKED",
  responseReadyLocal: "SELLER_RESPONSE_READY_LOCAL",
  approvedFutureConversation: "SELLER_RESPONSE_APPROVED_FOR_FUTURE_CONVERSATION",
  revisionRequired: "SELLER_RESPONSE_REVISION_REQUIRED",
  declinedLocal: "SELLER_LEAD_DECLINED_LOCAL",
  handoffCreatedLocal: "CONVERSATION_HANDOFF_CREATED_LOCAL",
  handoffBlocked: "CONVERSATION_HANDOFF_BLOCKED"
};

export const sellerLeadReviewSideEffectCounters = {
  sellerLeadReviewsLocal: 0,
  sellerResponseIntentsLocal: 0,
  sellerResponseApprovalsLocal: 0,
  conversationHandoffsLocal: 0,
  messagesSent: 0,
  sellerNotificationsSent: 0,
  buyerNotificationsSent: 0,
  sellerPhoneReveals: 0,
  sellerEmailReveals: 0,
  buyerPhoneReveals: 0,
  buyerEmailReveals: 0,
  emailActions: 0,
  smsActions: 0,
  telegramActions: 0,
  whatsappActions: 0,
  offerActions: 0,
  reservationActions: 0,
  viewingBookings: 0,
  dealRoomActions: 0,
  paymentActions: 0,
  commercialTransactionActions: 0,
  canonicalPropertyMutations: 0,
  listingMutations: 0,
  publicationMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function createSellerResponseFingerprint(value = {}) {
  let hash = 2166136261;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `seller_response_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sanitizeResponseMessage(message = "") {
  return String(message)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[seller_email_hidden]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[seller_phone_hidden]")
    .replace(/https?:\/\/\S+/gi, "[external_url_removed]")
    .slice(0, 900)
    .trim();
}

export function recheckSellerRecipientAuthority(input = {}) {
  const authorityGrant = input.authorityGrant || {};
  const route = input.route || {};
  const representation = route.preferredRecipientType || "OWNER";
  const active = authorityGrant.status === propertyAuthorityStatuses.activeLocalProof && authorityGrant.expired !== true;
  const blockers = [];
  if (!active) blockers.push("Recipient authority is not active.");
  if (/MANAGER|CLEAN|SERVICE/i.test(representation)) blockers.push("Recipient is not authorized for seller-side lead response.");
  return {
    modelType: "PropertySellerRecipientAuthorityRecheck",
    recipientActorId: route.recipientActorId || input.recipientActorId || null,
    recipientOrganizationId: route.recipientOrganizationId || null,
    recipientRepresentationType: representation,
    recipientAuthorityRef: route.authorityRef || null,
    authorityStatus: blockers.length ? "BLOCKED_AUTHORITY" : "ACTIVE_LOCAL_PROOF",
    blockers,
    createdAt: now,
    ...sellerLeadReviewSideEffectCounters
  };
}

export function reresolveSellerRoute(input = {}) {
  const originalRoute = input.originalRoute || {};
  const fallbackOwnerActorId = input.fallbackOwnerActorId || "actor_owner_alice";
  if (input.authorityRecheck?.authorityStatus !== "BLOCKED_AUTHORITY") {
    return { modelType: "PropertySellerRouteReresolution", status: "ORIGINAL_ROUTE_VALID", currentRoute: clone(originalRoute), historicalRoute: clone(originalRoute), audit: [sellerLeadReviewAuditEvents.routeReresolved], ...sellerLeadReviewSideEffectCounters };
  }
  return {
    modelType: "PropertySellerRouteReresolution",
    status: fallbackOwnerActorId ? "RERESOLVED_TO_OWNER_LOCAL" : "REVIEW_REQUIRED",
    currentRoute: fallbackOwnerActorId ? { ...clone(originalRoute), preferredRecipientType: "OWNER", recipientActorId: fallbackOwnerActorId, recipientOrganizationId: null, safePublicLabel: "OWNER REPRESENTATION LOCAL PROOF", authorityStatus: "ACTIVE_LOCAL_PROOF" } : null,
    historicalRoute: clone(originalRoute),
    audit: [sellerLeadReviewAuditEvents.routeReresolved],
    ...sellerLeadReviewSideEffectCounters
  };
}

export function createPropertySellerLeadReview(input = {}) {
  const lead = input.lead || {};
  const readiness = input.readiness || {};
  const authorityRecheck = recheckSellerRecipientAuthority({ authorityGrant: input.authorityGrant, route: readiness.routing });
  const routeReresolution = reresolveSellerRoute({ originalRoute: readiness.routing, authorityRecheck, fallbackOwnerActorId: input.fallbackOwnerActorId });
  const blockers = [];
  if (!lead.leadId) blockers.push("No local Property Lead is available for seller review.");
  if (input.consent?.consentStatus !== "CONSENT_RECORDED_LOCAL_PROOF" || input.consent?.revokedAt) blockers.push("Buyer consent is missing or revoked.");
  if (input.publicationRecord?.publicationStatus !== marketplacePublicationStatuses.publishedLocalProof) blockers.push("Publication is not active published local proof.");
  if (input.publicationRecord?.freshness === "STALE") blockers.push("Listing/publication freshness is stale.");
  if (authorityRecheck.authorityStatus === "BLOCKED_AUTHORITY" && routeReresolution.status === "REVIEW_REQUIRED") blockers.push("No currently authorized seller-side route.");
  const reviewStatus = blockers.some((item) => item.includes("consent")) ? sellerLeadReviewStatuses.blockedBuyerConsent
    : blockers.some((item) => item.includes("Publication")) ? sellerLeadReviewStatuses.blockedPublicationState
    : blockers.some((item) => item.includes("freshness")) ? sellerLeadReviewStatuses.blockedListingState
    : blockers.some((item) => item.includes("authorized")) ? sellerLeadReviewStatuses.blockedAuthority
    : input.responseType === sellerResponseTypes.declineInquiry ? sellerLeadReviewStatuses.declinedLocal
    : sellerLeadReviewStatuses.readyForResponseReview;
  return {
    modelType: "PropertySellerLeadReview",
    sellerLeadReviewId: `seller_review_${lead.leadId || input.caseKey || "blocked"}`,
    leadId: lead.leadId || null,
    publicationId: lead.publicationId || input.publicationRecord?.publicationId || null,
    listingId: lead.listingId || input.publicationRecord?.listingId || null,
    propertyId: lead.propertyId || input.publicationRecord?.propertyId || null,
    recipientActorId: routeReresolution.currentRoute?.recipientActorId || readiness.targetActorId || null,
    recipientOrganizationId: routeReresolution.currentRoute?.recipientOrganizationId || readiness.targetOrganizationId || null,
    recipientRepresentationType: routeReresolution.currentRoute?.preferredRecipientType || readiness.routing?.preferredRecipientType || null,
    recipientAuthorityRef: routeReresolution.currentRoute?.authorityRef || null,
    leadStatus: lead.leadStatus || input.leadResult?.status || "BLOCKED",
    reviewStatus,
    buyerConsentStatus: input.consent?.revokedAt ? "CONSENT_REVOKED" : input.consent?.consentStatus || "UNKNOWN",
    listingStatus: blockers.some((item) => item.includes("freshness")) ? "STALE" : "CURRENT",
    publicationStatus: input.publicationRecord?.publicationStatus || "UNKNOWN",
    listingFreshness: input.publicationRecord?.freshness || "CURRENT",
    authorityStatus: authorityRecheck.authorityStatus,
    routeReresolution,
    responseIntentRef: null,
    blockers,
    warnings: routeReresolution.status === "RERESOLVED_TO_OWNER_LOCAL" ? ["Original seller route expired; local proof reresolved to current owner."] : [],
    createdAt: now,
    updatedAt: now,
    auditMetadata: { audit: [sellerLeadReviewAuditEvents.reviewStarted, sellerLeadReviewAuditEvents.authorityRechecked, sellerLeadReviewAuditEvents.buyerConsentRechecked, ...routeReresolution.audit] },
    sellerLeadReviewsLocal: 1,
    ...Object.fromEntries(Object.entries(sellerLeadReviewSideEffectCounters).filter(([key]) => key !== "sellerLeadReviewsLocal"))
  };
}

export function createPropertySellerResponseIntent(input = {}) {
  const review = input.review || {};
  const responseType = input.responseType || sellerResponseTypes.acknowledgeInterest;
  return {
    modelType: "PropertySellerResponseIntent",
    responseIntentId: `seller_response_${review.leadId || "blocked"}_${createSellerResponseFingerprint({ responseType, message: input.responseMessage }).slice(-8)}`,
    leadId: review.leadId,
    sellerActorId: review.recipientActorId,
    sellerOrganizationId: review.recipientOrganizationId,
    responseType,
    responseMessage: sanitizeResponseMessage(input.responseMessage || "Thank you for your interest. I can continue this discussion inside ESSA when conversation is active."),
    requestedBuyerInformation: clone(input.requestedBuyerInformation || []),
    proposedNextStep: input.proposedNextStep || "FUTURE_ESSA_INTERNAL_CONVERSATION",
    contactMode: input.contactMode || "ESSA_INTERNAL_CONVERSATION_FUTURE",
    privacyStatus: "PENDING_PRIVACY_CHECK",
    consentCompatibility: "PENDING",
    createdAt: now,
    updatedAt: now,
    reviewStatus: "DRAFT_LOCAL",
    auditMetadata: { audit: [sellerLeadReviewAuditEvents.responseIntentCreated] },
    sellerResponseIntentsLocal: review.leadId ? 1 : 0,
    ...Object.fromEntries(Object.entries(sellerLeadReviewSideEffectCounters).filter(([key]) => key !== "sellerResponseIntentsLocal"))
  };
}

export function createPropertySellerResponsePublicSafeProjection(input = {}) {
  const intent = input.responseIntent || {};
  return {
    modelType: "PropertySellerResponsePublicSafeProjection",
    leadId: intent.leadId,
    responseIntentId: intent.responseIntentId,
    sellerSafeLabel: input.sellerSafeLabel || "Seller-side local proof",
    responseType: intent.responseType,
    responseMessage: sanitizeResponseMessage(intent.responseMessage),
    proposedNextStep: intent.proposedNextStep,
    contactMode: "ESSA_INTERNAL_CONVERSATION_FUTURE",
    excludes: ["seller private phone", "seller email", "mandate refs", "authority evidence", "reviewer notes", "internal actor IDs", "approval tokens", "bank/payment info"],
    ...sellerLeadReviewSideEffectCounters
  };
}

export function evaluateSellerResponseMessageSafety(input = {}) {
  const raw = String(input.rawMessage ?? input.responseIntent?.responseMessage ?? "");
  const blockers = [];
  if (!raw.trim()) blockers.push("Response message is empty.");
  if (raw.length > 900) blockers.push("Response message is too long.");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw)) blockers.push("Seller email leakage is not allowed.");
  if (/\+?\d[\d\s().-]{7,}\d/.test(raw)) blockers.push("Seller phone leakage is not allowed.");
  if (/https?:\/\/|www\./i.test(raw)) blockers.push("External URL is not active for seller response.");
  if (/bank|iban|swift|wire|payment|pay me|deposit|crypto|usdt/i.test(raw)) blockers.push("Payment or bank instruction is not allowed.");
  if (/outside essa|bypass essa|whatsapp|telegram|sms|call me|email me/i.test(raw)) blockers.push("Bypass/direct-contact instruction is not allowed.");
  return {
    modelType: "PropertySellerResponseMessageSafety",
    messageSafetyStatus: blockers.length ? "BLOCKED_MESSAGE" : "PASS",
    privacyStatus: blockers.some((item) => /phone|email/i.test(item)) ? "BLOCKED_PRIVACY" : "PUBLIC_SAFE_LOCAL_PROOF",
    policyStatus: blockers.some((item) => /Payment|bank|Bypass|URL/i.test(item)) ? "BLOCKED_POLICY" : "PASS",
    blockers,
    auditMetadata: { audit: [sellerLeadReviewAuditEvents.privacyChecked] },
    ...sellerLeadReviewSideEffectCounters
  };
}

export function evaluatePropertySellerResponseReadiness(input = {}) {
  const review = input.review || {};
  const responseIntent = input.responseIntent || {};
  const messageSafety = evaluateSellerResponseMessageSafety({ rawMessage: input.rawMessage, responseIntent });
  const blockers = [...(review.blockers || []), ...messageSafety.blockers];
  if (responseIntent.contactMode !== "ESSA_INTERNAL_CONVERSATION_FUTURE") blockers.push("External contact mode is not active.");
  let readinessStatus = sellerResponseReadinessStatuses.readyForFutureConversation;
  if (review.reviewStatus === sellerLeadReviewStatuses.declinedLocal) readinessStatus = sellerResponseReadinessStatuses.declined;
  else if (blockers.some((item) => item.includes("consent"))) readinessStatus = sellerResponseReadinessStatuses.blockedBuyerConsent;
  else if (blockers.some((item) => item.includes("Publication") || item.includes("freshness"))) readinessStatus = sellerResponseReadinessStatuses.blockedListingState;
  else if (blockers.some((item) => item.includes("authorized"))) readinessStatus = sellerResponseReadinessStatuses.blockedAuthority;
  else if (blockers.some((item) => item.includes("External contact mode"))) readinessStatus = sellerResponseReadinessStatuses.blockedContactMode;
  else if (messageSafety.privacyStatus === "BLOCKED_PRIVACY") readinessStatus = sellerResponseReadinessStatuses.blockedPrivacy;
  else if (messageSafety.policyStatus === "BLOCKED_POLICY") readinessStatus = sellerResponseReadinessStatuses.blockedPolicy;
  else if (messageSafety.messageSafetyStatus === "BLOCKED_MESSAGE") readinessStatus = sellerResponseReadinessStatuses.blockedMessage;
  return {
    modelType: "PropertySellerResponseReadiness",
    responseReadinessId: `seller_response_readiness_${responseIntent.responseIntentId || "blocked"}`,
    leadId: review.leadId,
    responseIntentId: responseIntent.responseIntentId,
    sellerActorId: responseIntent.sellerActorId,
    authorityStatus: review.authorityStatus,
    listingStatus: review.listingStatus,
    publicationStatus: review.publicationStatus,
    buyerConsentStatus: review.buyerConsentStatus,
    contactMode: responseIntent.contactMode,
    privacyStatus: messageSafety.privacyStatus,
    messageSafetyStatus: messageSafety.messageSafetyStatus,
    policyStatus: messageSafety.policyStatus,
    blockers,
    warnings: review.warnings || [],
    readinessStatus,
    createdAt: now,
    auditMetadata: { audit: readinessStatus === sellerResponseReadinessStatuses.readyForFutureConversation ? [sellerLeadReviewAuditEvents.responseReadyLocal] : [sellerLeadReviewAuditEvents.revisionRequired] },
    ...sellerLeadReviewSideEffectCounters
  };
}

export function createPropertySellerResponseApproval(input = {}) {
  const readiness = input.readiness || {};
  const responseIntent = input.responseIntent || {};
  const projection = input.projection || {};
  const fingerprint = createSellerResponseFingerprint({
    leadId: readiness.leadId,
    responseText: responseIntent.responseMessage,
    projection,
    sellerRoute: input.review?.routeReresolution?.currentRoute,
    buyerConsentState: readiness.buyerConsentStatus,
    listingState: readiness.publicationStatus
  });
  const approved = readiness.readinessStatus === sellerResponseReadinessStatuses.readyForFutureConversation;
  return {
    modelType: "PropertySellerResponseApproval",
    approvalId: `seller_approval_${responseIntent.responseIntentId || "blocked"}`,
    responseIntentId: responseIntent.responseIntentId,
    leadId: readiness.leadId,
    sellerActorId: readiness.sellerActorId,
    decision: approved ? sellerResponseApprovalTypes.approvedForFutureEssaConversation : sellerResponseApprovalTypes.revisionRequired,
    approvedProjectionFingerprint: fingerprint,
    approvalStatus: approved ? "APPROVED_LOCAL_NOT_SENT" : "REVISION_REQUIRED_LOCAL",
    staleIfResponseFingerprintDiffers: true,
    createdAt: now,
    auditMetadata: { audit: [approved ? sellerLeadReviewAuditEvents.approvedFutureConversation : sellerLeadReviewAuditEvents.revisionRequired] },
    sellerResponseApprovalsLocal: approved ? 1 : 0,
    ...Object.fromEntries(Object.entries(sellerLeadReviewSideEffectCounters).filter(([key]) => key !== "sellerResponseApprovalsLocal"))
  };
}

export function isSellerResponseApprovalStale(input = {}) {
  const approval = input.approval || {};
  const currentFingerprint = createSellerResponseFingerprint(input.currentPayload || {});
  return {
    modelType: "PropertySellerResponseApprovalFreshness",
    approvalStatus: approval.approvedProjectionFingerprint === currentFingerprint ? "CURRENT" : "STALE_REVISION_REQUIRED",
    approvedProjectionFingerprint: approval.approvedProjectionFingerprint,
    currentFingerprint,
    ...sellerLeadReviewSideEffectCounters
  };
}

export function createPropertyConversationHandoff(input = {}) {
  const readiness = input.readiness || {};
  const approval = input.approval || {};
  const ready = readiness.readinessStatus === sellerResponseReadinessStatuses.readyForFutureConversation && approval.decision === sellerResponseApprovalTypes.approvedForFutureEssaConversation;
  return {
    modelType: "PropertyConversationHandoff",
    handoffId: `conversation_handoff_${readiness.responseIntentId || "blocked"}`,
    leadId: readiness.leadId,
    responseIntentId: readiness.responseIntentId,
    sellerApprovalId: approval.approvalId || null,
    listingId: input.lead?.listingId || input.review?.listingId || null,
    propertyId: input.lead?.propertyId || input.review?.propertyId || null,
    buyerActorRef: clone(input.lead?.buyerActorRef || null),
    sellerActorRef: { actorId: readiness.sellerActorId, internalOnly: true },
    conversationMode: "ESSA_INTERNAL_CONVERSATION_FUTURE",
    readinessStatus: ready ? conversationHandoffStatuses.readyForFutureConversation : conversationHandoffStatuses.blocked,
    consentSnapshot: readiness.buyerConsentStatus,
    listingSnapshot: { listingStatus: readiness.listingStatus, publicationStatus: readiness.publicationStatus },
    authoritySnapshot: readiness.authorityStatus,
    attributionRef: input.attribution?.marketplaceSource || "ESSA_PROPERTY_MARKETPLACE",
    createdAt: now,
    dispatchStatus: "NOT_ACTIVE",
    auditMetadata: { audit: [ready ? sellerLeadReviewAuditEvents.handoffCreatedLocal : sellerLeadReviewAuditEvents.handoffBlocked] },
    conversationHandoffsLocal: ready ? 1 : 0,
    ...Object.fromEntries(Object.entries(sellerLeadReviewSideEffectCounters).filter(([key]) => key !== "conversationHandoffsLocal"))
  };
}

export function createPropertySellerLeadReviewHistoryItem(input = {}) {
  return {
    modelType: "PropertySellerLeadReviewHistoryItem",
    leadId: input.review?.leadId || null,
    sellerLeadReviewId: input.review?.sellerLeadReviewId || null,
    sellerRoute: clone(input.review?.routeReresolution?.currentRoute || null),
    authorityStatus: input.readiness?.authorityStatus || input.review?.authorityStatus || null,
    buyerConsent: input.readiness?.buyerConsentStatus || input.review?.buyerConsentStatus || null,
    responseType: input.responseIntent?.responseType || null,
    responseStatus: input.readiness?.readinessStatus || null,
    approvalStatus: input.approval?.approvalStatus || null,
    conversationHandoffStatus: input.handoff?.readinessStatus || null,
    createdAt: now,
    auditRefs: [
      sellerLeadReviewAuditEvents.reviewStarted,
      sellerLeadReviewAuditEvents.responseIntentCreated,
      sellerLeadReviewAuditEvents.privacyChecked,
      input.handoff?.readinessStatus === conversationHandoffStatuses.readyForFutureConversation ? sellerLeadReviewAuditEvents.handoffCreatedLocal : sellerLeadReviewAuditEvents.handoffBlocked
    ],
    sideEffectCounters: clone(sellerLeadReviewSideEffectCounters),
    ...sellerLeadReviewSideEffectCounters
  };
}

export function createLisaSellerLeadGuide(question = "") {
  const text = String(question).toLowerCase();
  let answer = "ESSA can review a buyer lead and prepare a seller response for a future internal conversation. Nothing is sent.";
  if (text.includes("phone")) answer = "No. Buyer phone and seller phone stay hidden; direct phone sharing is blocked in Phase 23K.";
  if (text.includes("why") || text.includes("blocked")) answer = "A response is blocked when authority, buyer consent, listing state, contact mode, privacy, or policy checks fail.";
  if (text.includes("viewing")) answer = "You can prepare a future viewing discussion response, but ESSA does not schedule a viewing yet.";
  if (text.includes("documents")) answer = "Only public-safe property information can be prepared. Ownership, mandate, identity, and private cadastral documents remain protected.";
  if (text.includes("offer")) answer = "The buyer is not making an offer in this phase, and seller offer/counteroffer actions are not active.";
  return { modelType: "LisaSellerLeadGuide", answer, maySendMessage: false, mayRevealContact: false, mayScheduleViewing: false, mayStartDealRoom: false, ...sellerLeadReviewSideEffectCounters };
}

export function createNavigatorSellerLeadRouting(input = "") {
  const text = String(input).toLowerCase();
  const hash = text.includes("phone") || text.includes("whatsapp")
    ? "#property-leads?case=phoneLeak"
    : text.includes("schedule") || text.includes("viewing")
      ? "#property-leads?case=viewingResponse"
      : text.includes("reply")
        ? "#property-leads?case=owner"
        : "#property-leads?case=owner";
  return { modelType: "NavigatorSellerLeadRouting", input, hash, routeOnly: true, messageDispatchActive: false, contactRevealActive: false, ...sellerLeadReviewSideEffectCounters };
}

export function buildSellerLeadReviewScenario(caseKey = "owner") {
  const buyerCase = caseKey === "agent" || caseKey === "expiredAgent" ? "agent"
    : caseKey === "unpublished" ? "owner"
      : caseKey === "viewingResponse" ? "viewing"
        : caseKey === "financeResponse" ? "finance"
          : caseKey === "documentResponse" ? "documents"
            : "owner";
  const scenario = buildBuyerLeadScenario(buyerCase);
  if (caseKey === "expiredAgent") scenario.authorityGrant.status = propertyAuthorityStatuses.expired;
  if (caseKey === "revokedConsent") scenario.consent.revokedAt = now;
  if (caseKey === "unpublished") scenario.publicationRecord.publicationStatus = "UNPUBLISHED_LOCAL_PROOF";
  if (caseKey === "stale") scenario.publicationRecord.freshness = "STALE";
  const buyerReadiness = scenario.readiness.readinessStatus === sellerContactReadinessStatuses.readyForLocalLeadCreation
    ? scenario.readiness
    : { ...scenario.readiness, readinessStatus: sellerContactReadinessStatuses.readyForLocalLeadCreation };
  const leadResult = commitPropertyLeadLocalProof({ intent: scenario.intent, consent: scenario.consent, readiness: buyerReadiness, leadStore: scenario.leadStore });
  const responseType = caseKey === "decline" ? sellerResponseTypes.declineInquiry
    : caseKey === "moreInfo" ? sellerResponseTypes.requestMoreBuyerInformation
      : caseKey === "viewingResponse" ? sellerResponseTypes.requestViewingDiscussionFuture
        : caseKey === "financeResponse" ? sellerResponseTypes.financeDiscussionFuture
          : caseKey === "documentResponse" ? sellerResponseTypes.providePublicPropertyInformation
            : sellerResponseTypes.acknowledgeInterest;
  const rawMessage = caseKey === "phoneLeak" ? "Call me at +995 555 123 456."
    : caseKey === "emailLeak" ? "Email me at seller@example.com."
      : caseKey === "whatsapp" ? "Message me on WhatsApp."
        : caseKey === "payment" ? "Send a bank deposit before we continue."
          : caseKey === "changedAfterApproval" ? "Thank you. We can continue inside ESSA."
            : caseKey === "moreInfo" ? "Please prepare more buyer information for a future ESSA conversation."
              : caseKey === "viewingResponse" ? "We can discuss a viewing later inside ESSA."
                : caseKey === "financeResponse" ? "Finance questions can be routed later inside ESSA."
                  : caseKey === "documentResponse" ? "I can provide public property information later inside ESSA."
                    : "Thank you for your interest. I can continue this discussion inside ESSA when conversation is active.";
  const contactMode = caseKey === "whatsapp" ? "WHATSAPP" : "ESSA_INTERNAL_CONVERSATION_FUTURE";
  return { ...scenario, buyerReadiness, leadResult, responseType, rawMessage, contactMode };
}

export function buildSellerLeadReviewViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "owner";
  const scenario = buildSellerLeadReviewScenario(caseKey);
  const review = createPropertySellerLeadReview({
    ...scenario,
    lead: scenario.leadResult.lead,
    leadResult: scenario.leadResult,
    responseType: scenario.responseType,
    caseKey
  });
  const responseIntent = createPropertySellerResponseIntent({
    review,
    responseType: scenario.responseType,
    responseMessage: scenario.rawMessage,
    contactMode: scenario.contactMode,
    requestedBuyerInformation: caseKey === "moreInfo" ? ["proof of funds future", "preferred timing future"] : []
  });
  const projection = createPropertySellerResponsePublicSafeProjection({ responseIntent, sellerSafeLabel: review.recipientRepresentationType });
  const readiness = evaluatePropertySellerResponseReadiness({ review, responseIntent, rawMessage: scenario.rawMessage });
  const approval = createPropertySellerResponseApproval({ review, responseIntent, readiness, projection });
  const staleApproval = isSellerResponseApprovalStale({
    approval,
    currentPayload: {
      leadId: readiness.leadId,
      responseText: caseKey === "changedAfterApproval" ? `${responseIntent.responseMessage} Changed.` : responseIntent.responseMessage,
      projection,
      sellerRoute: review.routeReresolution?.currentRoute,
      buyerConsentState: readiness.buyerConsentStatus,
      listingState: readiness.publicationStatus
    }
  });
  const handoff = createPropertyConversationHandoff({ review, responseIntent, readiness, approval, lead: scenario.leadResult.lead, attribution: scenario.leadResult.attribution });
  const historyItem = createPropertySellerLeadReviewHistoryItem({ review, responseIntent, readiness, approval, handoff });
  return {
    modelType: "PropertySellerLeadReviewViewModel",
    route: "#property-leads",
    caseKey,
    banner: "SELLER LEAD REVIEW / RESPONSE READINESS. NO MESSAGE SENT. NO CONTACT REVEAL. NO OFFER. NO PAYMENT. NOT_DISPATCHED.",
    ...scenario,
    review,
    responseIntent,
    projection,
    readiness,
    approval,
    staleApproval,
    handoff,
    historyItem,
    lisaGuide: createLisaSellerLeadGuide("Can I reply to this buyer?"),
    navigatorRouting: createNavigatorSellerLeadRouting("Reply to this buyer."),
    sellerLeadReviewsLocal: review.sellerLeadReviewsLocal || 0,
    sellerResponseIntentsLocal: responseIntent.sellerResponseIntentsLocal || 0,
    sellerResponseApprovalsLocal: approval.sellerResponseApprovalsLocal || 0,
    conversationHandoffsLocal: handoff.conversationHandoffsLocal || 0,
    ...Object.fromEntries(Object.entries(sellerLeadReviewSideEffectCounters).filter(([key]) => !["sellerLeadReviewsLocal", "sellerResponseIntentsLocal", "sellerResponseApprovalsLocal", "conversationHandoffsLocal"].includes(key))),
    inheritedBuyerLeadCounters: clone(propertyLeadSideEffectCounters)
  };
}
