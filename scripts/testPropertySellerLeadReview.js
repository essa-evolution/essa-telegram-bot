import assert from "node:assert/strict";
import {
  buildSellerLeadReviewViewModel,
  conversationHandoffStatuses,
  createLisaSellerLeadGuide,
  createNavigatorSellerLeadRouting,
  createPropertyConversationHandoff,
  createPropertySellerLeadReview,
  createPropertySellerLeadReviewHistoryItem,
  createPropertySellerResponseApproval,
  createPropertySellerResponseIntent,
  createPropertySellerResponsePublicSafeProjection,
  createSellerResponseFingerprint,
  evaluatePropertySellerResponseReadiness,
  evaluateSellerResponseMessageSafety,
  isSellerResponseApprovalStale,
  reresolveSellerRoute,
  recheckSellerRecipientAuthority,
  sellerLeadReviewAuditEvents,
  sellerLeadReviewSideEffectCounters,
  sellerLeadReviewStatuses,
  sellerResponseApprovalTypes,
  sellerResponseReadinessStatuses,
  sellerResponseTypes
} from "../src/property/index.js";

const owner = buildSellerLeadReviewViewModel({ case: "owner" });
const agent = buildSellerLeadReviewViewModel({ case: "agent" });

assert.equal(owner.review.modelType, "PropertySellerLeadReview", "1 seller lead review contract");
assert.equal(Object.values(sellerLeadReviewStatuses).includes("MESSAGE_SENT"), false, "2 review statuses exclude message sent");
assert.equal(owner.leadResult.lead.modelType, "PropertyLead", "3 Lead reuse");
assert.equal(owner.review.recipientRepresentationType, "OWNER", "4 owner route");
assert.equal(agent.review.recipientRepresentationType, "AUTHORIZED_AGENT", "5 agent route");
assert.equal(recheckSellerRecipientAuthority({ authorityGrant: owner.authorityGrant, route: owner.review.routeReresolution.currentRoute }).authorityStatus, "ACTIVE_LOCAL_PROOF", "6 authority recheck");
assert.equal(buildSellerLeadReviewViewModel({ case: "expiredAgent" }).review.routeReresolution.status, "RERESOLVED_TO_OWNER_LOCAL", "7 route re-resolution");
assert.equal(buildSellerLeadReviewViewModel({ case: "revokedConsent" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedBuyerConsent, "8 buyer consent recheck");
assert.equal(owner.responseIntent.modelType, "PropertySellerResponseIntent", "9 response intent");
assert.equal(Object.values(sellerResponseTypes).includes("ACCEPT_OFFER"), false, "10 response types exclude offer");
assert.equal(evaluateSellerResponseMessageSafety({ rawMessage: "Thank you inside ESSA." }).messageSafetyStatus, "PASS", "11 message privacy pass");
assert.equal(buildSellerLeadReviewViewModel({ case: "phoneLeak" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedPrivacy, "12 phone leakage");
assert.equal(buildSellerLeadReviewViewModel({ case: "emailLeak" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedPrivacy, "13 email leakage");
assert.equal(buildSellerLeadReviewViewModel({ case: "whatsapp" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedContactMode, "14 WhatsApp blocked");
assert.equal(evaluatePropertySellerResponseReadiness({ review: owner.review, responseIntent: { ...owner.responseIntent, contactMode: "EMAIL" } }).readinessStatus, sellerResponseReadinessStatuses.blockedContactMode, "15 external contact mode blocked");
assert.equal(buildSellerLeadReviewViewModel({ case: "payment" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedPolicy, "16 payment instruction blocked");
assert.equal(buildSellerLeadReviewViewModel({ case: "documentResponse" }).projection.responseType, sellerResponseTypes.providePublicPropertyInformation, "17 public Property info allowed");
assert.equal(JSON.stringify(buildSellerLeadReviewViewModel({ case: "documentResponse" })).includes("ownership document attached"), false, "18 private docs blocked");
assert.equal(buildSellerLeadReviewViewModel({ case: "stale" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedListingState, "19 listing state recheck");
assert.equal(buildSellerLeadReviewViewModel({ case: "unpublished" }).readiness.readinessStatus, sellerResponseReadinessStatuses.blockedListingState, "20 publication state recheck");
assert.equal(owner.readiness.modelType, "PropertySellerResponseReadiness", "21 response readiness");
assert.equal(owner.approval.decision, sellerResponseApprovalTypes.approvedForFutureEssaConversation, "22 local approval");
assert.equal(owner.approval.approvedProjectionFingerprint.startsWith("seller_response_fp_"), true, "23 approval fingerprint");
assert.equal(buildSellerLeadReviewViewModel({ case: "changedAfterApproval" }).staleApproval.approvalStatus, "STALE_REVISION_REQUIRED", "24 stale approval");
assert.equal(owner.handoff.modelType, "PropertyConversationHandoff", "25 conversation handoff");
assert.equal(owner.handoff.dispatchStatus, "NOT_ACTIVE", "26 handoff not dispatched");
assert.equal(owner.handoff.attributionRef, "ESSA_PROPERTY_MARKETPLACE", "27 attribution preserved");
assert.equal(buildSellerLeadReviewViewModel({ case: "decline" }).readiness.readinessStatus, sellerResponseReadinessStatuses.declined, "28 decline local");
assert.equal(buildSellerLeadReviewViewModel({ case: "moreInfo" }).responseIntent.responseType, sellerResponseTypes.requestMoreBuyerInformation, "29 more-info intent");
assert.equal(buildSellerLeadReviewViewModel({ case: "viewingResponse" }).viewingBookings, 0, "30 viewing intent no scheduling");
assert.equal(buildSellerLeadReviewViewModel({ case: "financeResponse" }).providerCalls, 0, "31 finance intent no provider");
assert.equal(buildSellerLeadReviewViewModel({ case: "documentResponse" }).buyerPhoneReveals, 0, "32 document intent no private docs");
assert.equal(createPropertySellerResponseIntent({ review: owner.review, responseMessage: owner.responseIntent.responseMessage }).responseIntentId, createPropertySellerResponseIntent({ review: owner.review, responseMessage: owner.responseIntent.responseMessage }).responseIntentId, "33 duplicate response idempotency");
assert.equal(JSON.stringify(owner).includes("buyer@example.com"), false, "34 seller inbox privacy");
assert.equal(owner.buyerPhoneReveals, 0, "35 buyer contact hidden");
assert.equal(owner.sellerPhoneReveals, 0, "36 seller contact hidden");
assert.equal(createLisaSellerLeadGuide("Can I see phone?").mayRevealContact, false, "37 Lisa explanation");
assert.equal(createNavigatorSellerLeadRouting("Show me new leads.").hash.includes("#property-leads"), true, "38 Navigator routes");
assert.equal(owner.messagesSent, 0, "39 no message sent");
assert.equal(owner.sellerNotificationsSent + owner.buyerNotificationsSent, 0, "40 no notification");
assert.equal(owner.emailActions, 0, "41 no email");
assert.equal(owner.smsActions, 0, "42 no SMS");
assert.equal(owner.telegramActions, 0, "43 no Telegram");
assert.equal(owner.whatsappActions, 0, "44 no WhatsApp");
assert.equal(owner.offerActions, 0, "45 no offer");
assert.equal(owner.reservationActions, 0, "46 no reservation");
assert.equal(owner.dealRoomActions, 0, "47 no DealRoom");
assert.equal(owner.paymentActions, 0, "48 no payment");
assert.equal(owner.commercialTransactionActions, 0, "49 no transaction");
assert.deepEqual({
  providerCalls: owner.providerCalls,
  externalCalls: owner.externalCalls,
  productionDbMutations: owner.productionDbMutations
}, {
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0
}, "50 regressions");

assert.equal(createPropertySellerLeadReview({ ...owner, lead: owner.leadResult.lead }).modelType, "PropertySellerLeadReview");
assert.equal(reresolveSellerRoute({ originalRoute: owner.review.routeReresolution.currentRoute, authorityRecheck: { authorityStatus: "ACTIVE_LOCAL_PROOF" } }).status, "ORIGINAL_ROUTE_VALID");
assert.equal(createPropertySellerResponsePublicSafeProjection({ responseIntent: owner.responseIntent }).excludes.includes("bank/payment info"), true);
assert.equal(createPropertySellerResponseApproval({ review: owner.review, responseIntent: owner.responseIntent, readiness: owner.readiness, projection: owner.projection }).approvalStatus, "APPROVED_LOCAL_NOT_SENT");
assert.equal(isSellerResponseApprovalStale({ approval: owner.approval, currentPayload: { changed: true } }).approvalStatus, "STALE_REVISION_REQUIRED");
assert.equal(createPropertyConversationHandoff({ review: owner.review, responseIntent: owner.responseIntent, readiness: owner.readiness, approval: owner.approval, lead: owner.leadResult.lead, attribution: owner.leadResult.attribution }).readinessStatus, conversationHandoffStatuses.readyForFutureConversation);
assert.equal(createPropertySellerLeadReviewHistoryItem({ review: owner.review, responseIntent: owner.responseIntent, readiness: owner.readiness, approval: owner.approval, handoff: owner.handoff }).auditRefs.includes(sellerLeadReviewAuditEvents.handoffCreatedLocal), true);
assert.equal(createSellerResponseFingerprint({ a: 1 }), createSellerResponseFingerprint({ a: 1 }));
assert.equal(sellerLeadReviewSideEffectCounters.messagesSent, 0);

console.log("Phase 23K Property Seller Lead Review tests passed: 50/50");
