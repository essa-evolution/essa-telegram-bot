import {
  buildBuyerLeadViewModel,
  buildSellerLeadReviewViewModel
} from "../../src/property/index.js";

function el(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function valueText(value) {
  if (value == null || value === "") return "Missing";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function row(label, value) {
  const node = el("div", "add-property-row");
  node.append(el("span", "", label), el("strong", "", valueText(value)));
  return node;
}

function section(title, testId = "") {
  const node = el("section", "add-property-section");
  if (testId) node.dataset.testid = testId;
  node.append(el("h3", "", title));
  return node;
}

function parseHash(hash = window.location.hash || "#property-leads") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner", reviewCase: params.get("reviewCase") || params.get("case") || "owner" };
}

function navCase(caseKey) {
  window.location.hash = `#property-leads?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Buyer Lead Cases", "buyer-lead-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner", "owner"],
    ["Agent", "agent"],
    ["Expired agent", "expiredAgent"],
    ["Duplicate", "duplicate"],
    ["Spam", "spam"],
    ["Missing consent", "missingConsent"],
    ["Private contact", "privateContact"],
    ["Unpublished", "unpublished"],
    ["Viewing", "viewing"],
    ["Finance", "finance"],
    ["Documents", "documents"],
    ["Location", "location"]
  ].forEach(([label, key]) => {
    const button = el("button", viewModel.caseKey === key ? "active" : "", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => navCase(key));
    tabs.append(button);
  });
  node.append(tabs);
  return node;
}

function renderSellerReviewTabs(viewModel) {
  const node = section("Seller Review Cases", "seller-review-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner review", "owner"],
    ["Agent review", "agent"],
    ["Expired agent", "expiredAgent"],
    ["Consent revoked", "revokedConsent"],
    ["Phone leak", "phoneLeak"],
    ["Email leak", "emailLeak"],
    ["WhatsApp", "whatsapp"],
    ["Payment", "payment"],
    ["Unpublished", "unpublished"],
    ["Changed response", "changedAfterApproval"],
    ["More info", "moreInfo"],
    ["Viewing", "viewingResponse"],
    ["Finance", "financeResponse"],
    ["Documents", "documentResponse"],
    ["Decline", "decline"]
  ].forEach(([label, key]) => {
    const button = el("button", viewModel.caseKey === key ? "active" : "", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => navCase(key));
    tabs.append(button);
  });
  node.append(tabs);
  return node;
}

function renderIntent(viewModel) {
  const node = section("Buyer Interest Intent", "buyer-interest-intent");
  node.append(
    row("Interest", viewModel.intent.interestIntentId),
    row("Intent type", viewModel.intent.intentType),
    row("Publication", viewModel.intent.publicationId),
    row("Listing", viewModel.intent.listingId),
    row("Property", viewModel.intent.propertyId),
    row("Message", viewModel.intent.buyerMessage),
    row("Preferred future contact", viewModel.intent.preferredContactModeFuture)
  );
  return node;
}

function renderConsentPreview(viewModel) {
  const consent = section("Privacy / Consent Preview", "buyer-consent-preview");
  consent.append(
    row("Consent", viewModel.consent.consentStatus),
    row("Inside ESSA only", viewModel.consent.contactInsideEssaOnly),
    row("Share phone future", viewModel.consent.sharePhoneFuture),
    row("Share email future", viewModel.consent.shareEmailFuture),
    row("Buyer will share", viewModel.preview.buyerWillShare),
    row("Buyer will NOT share", viewModel.preview.buyerWillNotShare)
  );
  return consent;
}

function renderReadiness(viewModel) {
  const node = section("Contact Readiness", "seller-contact-readiness");
  node.append(
    row("Readiness", viewModel.readiness.readinessStatus),
    row("Routing", viewModel.readiness.routingStatus),
    row("Seller label", viewModel.readiness.sellerRepresentationType),
    row("Buyer consent", viewModel.readiness.buyerConsentStatus),
    row("Anti-spam", viewModel.readiness.antiSpamReadiness),
    row("Duplicate", viewModel.readiness.duplicateLeadStatus),
    row("Publication status", viewModel.readiness.publicationStatus),
    row("Blockers", viewModel.readiness.blockers),
    row("Warnings", viewModel.readiness.warnings)
  );
  return node;
}

function renderRequirements(viewModel) {
  const node = section("Structured Requirements", "buyer-requirements");
  node.append(
    row("Budget min", viewModel.intent.structuredRequirements.budgetMin),
    row("Budget max", viewModel.intent.structuredRequirements.budgetMax),
    row("Currency", viewModel.intent.structuredRequirements.currency),
    row("Financing needed", viewModel.intent.structuredRequirements.financingNeeded),
    row("Viewing future", viewModel.intent.structuredRequirements.preferredViewingWindowFuture),
    row("Buyer type", viewModel.intent.structuredRequirements.buyerType)
  );
  return node;
}

function renderLead(viewModel) {
  const node = section("Local Lead", "property-lead");
  node.append(
    row("Status", viewModel.result.status),
    row("Lead ID", viewModel.result.lead?.leadId || "NOT_CREATED"),
    row("Lead source", viewModel.result.lead?.leadSource || "NONE"),
    row("Contact execution", viewModel.result.lead?.contactExecutionStatus || "NOT_ACTIVE"),
    row("CRM readiness", viewModel.result.lead?.crmReadiness || "NONE"),
    row("Attribution", viewModel.result.attribution?.marketplaceSource || "NONE")
  );
  return node;
}

function renderInbox(viewModel) {
  const node = section("Seller Inbox Readiness", "seller-inbox-readiness");
  const item = viewModel.inboxItems[0];
  node.append(
    row("Inbox items", viewModel.inboxItems.length),
    row("Safe buyer label", item?.safeBuyerLabel || "NONE"),
    row("Interest type", item?.interestType || "NONE"),
    row("Message preview", item?.messagePreview || "NONE"),
    row("Budget summary", item?.budgetSummary || "NONE"),
    row("Financing flag", item?.financingNeeded ?? false),
    row("Contact execution", item?.contactExecutionStatus || "NOT_ACTIVE")
  );
  return node;
}

function renderGuideCounters(viewModel) {
  const guide = section("Lisa / Navigator", "buyer-lead-guide");
  guide.append(
    row("Lisa", viewModel.lisaGuide.answer),
    row("Navigator route", viewModel.navigatorRouting.hash),
    row("Offer active", viewModel.navigatorRouting.offerFlowActive),
    row("Contact execution active", viewModel.navigatorRouting.contactExecutionActive)
  );
  const filters = section("Seller Inbox Filters", "seller-inbox-filters");
  filters.append(
    row("New leads", viewModel.sellerInboxFilters.newLeads),
    row("Listing", viewModel.sellerInboxFilters.listing),
    row("Property", viewModel.sellerInboxFilters.property),
    row("Interest type", viewModel.sellerInboxFilters.interestType),
    row("Financing needed", viewModel.sellerInboxFilters.financingNeeded)
  );
  const counters = section("Side Effects", "buyer-lead-side-effects");
  counters.append(
    row("localBuyerInterestIntents", viewModel.localBuyerInterestIntents),
    row("localPropertyLeadsCreated", viewModel.localPropertyLeadsCreated),
    row("sellerInboxItemsCreatedLocal", viewModel.sellerInboxItemsCreatedLocal),
    row("duplicateLeadsCreated", viewModel.duplicateLeadsCreated),
    row("sellerContactActions", viewModel.sellerContactActions),
    row("private contact reveals", `${viewModel.sellerPhoneReveals}/${viewModel.sellerEmailReveals}/${viewModel.buyerPhoneReveals}/${viewModel.buyerEmailReveals}`),
    row("offer/reservation/dealRoom", `${viewModel.offerActions}/${viewModel.reservationActions}/${viewModel.dealRoomActions}`),
    row("Property/Listing/Publication mutations", `${viewModel.canonicalPropertyMutations}/${viewModel.listingMutations}/${viewModel.publicationMutations}`),
    row("provider/external/productionDb", `${viewModel.providerCalls}/${viewModel.externalCalls}/${viewModel.productionDbMutations}`),
    row("payment/booking/transaction", `${viewModel.paymentActions}/${viewModel.bookingActions}/${viewModel.commercialTransactionActions}`)
  );
  return [guide, filters, counters];
}

function renderSellerReview(reviewModel) {
  const node = section("Seller Lead Review", "seller-lead-review");
  node.append(
    row("Review ID", reviewModel.review.sellerLeadReviewId),
    row("Review status", reviewModel.review.reviewStatus),
    row("Lead status", reviewModel.review.leadStatus),
    row("Recipient actor", reviewModel.review.recipientActorId),
    row("Representation", reviewModel.review.recipientRepresentationType),
    row("Authority", reviewModel.review.authorityStatus),
    row("Route re-resolution", reviewModel.review.routeReresolution.status),
    row("Buyer consent", reviewModel.review.buyerConsentStatus),
    row("Publication", reviewModel.review.publicationStatus),
    row("Listing freshness", reviewModel.review.listingFreshness),
    row("Blockers", reviewModel.review.blockers),
    row("Warnings", reviewModel.review.warnings)
  );
  return node;
}

function renderSellerResponse(reviewModel) {
  const node = section("Seller Response Intent", "seller-response-intent");
  node.append(
    row("Response ID", reviewModel.responseIntent.responseIntentId),
    row("Response type", reviewModel.responseIntent.responseType),
    row("Contact mode", reviewModel.responseIntent.contactMode),
    row("Message", reviewModel.responseIntent.responseMessage),
    row("Requested buyer information", reviewModel.responseIntent.requestedBuyerInformation),
    row("Proposed next step", reviewModel.responseIntent.proposedNextStep)
  );
  return node;
}

function renderSellerProjection(reviewModel) {
  const node = section("Public-Safe Response Projection", "seller-response-projection");
  node.append(
    row("Projection response", reviewModel.projection.responseMessage),
    row("Seller safe label", reviewModel.projection.sellerSafeLabel),
    row("Contact mode", reviewModel.projection.contactMode),
    row("Excludes", reviewModel.projection.excludes)
  );
  return node;
}

function renderSellerResponseReadiness(reviewModel) {
  const node = section("Response Readiness", "seller-response-readiness");
  node.append(
    row("Readiness", reviewModel.readiness.readinessStatus),
    row("Authority", reviewModel.readiness.authorityStatus),
    row("Buyer consent", reviewModel.readiness.buyerConsentStatus),
    row("Privacy", reviewModel.readiness.privacyStatus),
    row("Message safety", reviewModel.readiness.messageSafetyStatus),
    row("Policy", reviewModel.readiness.policyStatus),
    row("Blockers", reviewModel.readiness.blockers),
    row("Warnings", reviewModel.readiness.warnings)
  );
  return node;
}

function renderSellerApprovalHandoff(reviewModel) {
  const approval = section("Local Approval", "seller-response-approval");
  approval.append(
    row("Decision", reviewModel.approval.decision),
    row("Approval status", reviewModel.approval.approvalStatus),
    row("Fingerprint", reviewModel.approval.approvedProjectionFingerprint),
    row("Freshness", reviewModel.staleApproval.approvalStatus)
  );
  const handoff = section("Future Conversation Handoff", "seller-conversation-handoff");
  handoff.append(
    row("Handoff", reviewModel.handoff.handoffId),
    row("Readiness", reviewModel.handoff.readinessStatus),
    row("Conversation mode", reviewModel.handoff.conversationMode),
    row("Dispatch", reviewModel.handoff.dispatchStatus),
    row("Attribution", reviewModel.handoff.attributionRef)
  );
  const history = section("Seller Review History", "seller-review-history");
  history.append(
    row("History lead", reviewModel.historyItem.leadId),
    row("Response status", reviewModel.historyItem.responseStatus),
    row("Approval status", reviewModel.historyItem.approvalStatus),
    row("Handoff status", reviewModel.historyItem.conversationHandoffStatus),
    row("Audit refs", reviewModel.historyItem.auditRefs)
  );
  return [approval, handoff, history];
}

function renderSellerGuideCounters(reviewModel) {
  const guide = section("Lisa / Navigator Seller Guide", "seller-lead-guide");
  guide.append(
    row("Lisa", reviewModel.lisaGuide.answer),
    row("Navigator route", reviewModel.navigatorRouting.hash),
    row("Message dispatch active", reviewModel.navigatorRouting.messageDispatchActive),
    row("Contact reveal active", reviewModel.navigatorRouting.contactRevealActive)
  );
  const counters = section("Seller Review Side Effects", "seller-review-side-effects");
  counters.append(
    row("sellerLeadReviewsLocal", reviewModel.sellerLeadReviewsLocal),
    row("sellerResponseIntentsLocal", reviewModel.sellerResponseIntentsLocal),
    row("sellerResponseApprovalsLocal", reviewModel.sellerResponseApprovalsLocal),
    row("conversationHandoffsLocal", reviewModel.conversationHandoffsLocal),
    row("messages / notifications", `${reviewModel.messagesSent}/${reviewModel.sellerNotificationsSent}/${reviewModel.buyerNotificationsSent}`),
    row("private contact reveals", `${reviewModel.sellerPhoneReveals}/${reviewModel.sellerEmailReveals}/${reviewModel.buyerPhoneReveals}/${reviewModel.buyerEmailReveals}`),
    row("external contact actions", `${reviewModel.emailActions}/${reviewModel.smsActions}/${reviewModel.telegramActions}/${reviewModel.whatsappActions}`),
    row("offer/reservation/viewing/dealRoom", `${reviewModel.offerActions}/${reviewModel.reservationActions}/${reviewModel.viewingBookings}/${reviewModel.dealRoomActions}`),
    row("Property/Listing/Publication mutations", `${reviewModel.canonicalPropertyMutations}/${reviewModel.listingMutations}/${reviewModel.publicationMutations}`),
    row("provider/external/productionDb", `${reviewModel.providerCalls}/${reviewModel.externalCalls}/${reviewModel.productionDbMutations}`),
    row("payment/transaction", `${reviewModel.paymentActions}/${reviewModel.commercialTransactionActions}`)
  );
  return [guide, counters];
}

export function renderPropertyBuyerLeadUi(panel, inputHash = window.location.hash || "#property-leads") {
  if (!panel) return;
  const parsed = parseHash(inputHash);
  const viewModel = buildBuyerLeadViewModel(parsed);
  const reviewModel = buildSellerLeadReviewViewModel({ case: parsed.reviewCase });
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-leads";
  panel.dataset.caseKey = reviewModel.caseKey;
  panel.dataset.readinessStatus = viewModel.readiness.readinessStatus;
  panel.dataset.leadStatus = viewModel.result.status;
  panel.dataset.sellerReviewStatus = reviewModel.review.reviewStatus;
  panel.dataset.sellerResponseReadinessStatus = reviewModel.readiness.readinessStatus;
  panel.dataset.sellerApprovalStatus = reviewModel.approval.approvalStatus;
  panel.dataset.conversationHandoffStatus = reviewModel.handoff.readinessStatus;
  panel.dataset.dispatchStatus = reviewModel.handoff.dispatchStatus;
  panel.dataset.sellerLeadReviewsLocal = String(reviewModel.sellerLeadReviewsLocal);
  panel.dataset.sellerResponseIntentsLocal = String(reviewModel.sellerResponseIntentsLocal);
  panel.dataset.sellerResponseApprovalsLocal = String(reviewModel.sellerResponseApprovalsLocal);
  panel.dataset.conversationHandoffsLocal = String(reviewModel.conversationHandoffsLocal);
  panel.dataset.messagesSent = String(reviewModel.messagesSent);
  panel.dataset.sellerNotificationsSent = String(reviewModel.sellerNotificationsSent);
  panel.dataset.buyerNotificationsSent = String(reviewModel.buyerNotificationsSent);
  panel.dataset.localBuyerInterestIntents = String(viewModel.localBuyerInterestIntents);
  panel.dataset.localPropertyLeadsCreated = String(viewModel.localPropertyLeadsCreated);
  panel.dataset.sellerInboxItemsCreatedLocal = String(viewModel.sellerInboxItemsCreatedLocal);
  panel.dataset.duplicateLeadsCreated = String(viewModel.duplicateLeadsCreated);
  panel.dataset.sellerContactActions = String(viewModel.sellerContactActions);
  panel.dataset.sellerPhoneReveals = String(reviewModel.sellerPhoneReveals);
  panel.dataset.sellerEmailReveals = String(reviewModel.sellerEmailReveals);
  panel.dataset.buyerPhoneReveals = String(reviewModel.buyerPhoneReveals);
  panel.dataset.buyerEmailReveals = String(reviewModel.buyerEmailReveals);
  panel.dataset.emailActions = String(reviewModel.emailActions);
  panel.dataset.smsActions = String(reviewModel.smsActions);
  panel.dataset.telegramActions = String(reviewModel.telegramActions);
  panel.dataset.whatsappActions = String(reviewModel.whatsappActions);
  panel.dataset.offerActions = String(reviewModel.offerActions);
  panel.dataset.reservationActions = String(reviewModel.reservationActions);
  panel.dataset.viewingBookings = String(reviewModel.viewingBookings);
  panel.dataset.dealRoomActions = String(reviewModel.dealRoomActions);
  panel.dataset.canonicalPropertyMutations = String(reviewModel.canonicalPropertyMutations);
  panel.dataset.listingMutations = String(reviewModel.listingMutations);
  panel.dataset.publicationMutations = String(reviewModel.publicationMutations);
  panel.dataset.ownershipMutations = String(viewModel.ownershipMutations);
  panel.dataset.providerCalls = String(reviewModel.providerCalls);
  panel.dataset.externalCalls = String(reviewModel.externalCalls);
  panel.dataset.productionDbMutations = String(reviewModel.productionDbMutations);
  panel.dataset.paymentActions = String(reviewModel.paymentActions);
  panel.dataset.commercialTransactionActions = String(reviewModel.commercialTransactionActions);

  const shell = el("div", "add-property-shell property-buyer-lead-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "BUYER INTEREST / SELLER REVIEW / RESPONSE READINESS"),
    el("h2", "", "PROPERTY LEADS"),
    el("p", "", `${viewModel.banner} ${reviewModel.banner}`)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderSellerReviewTabs(reviewModel),
    renderIntent(viewModel),
    renderConsentPreview(viewModel),
    renderReadiness(viewModel),
    renderRequirements(viewModel),
    renderLead(viewModel),
    renderInbox(viewModel),
    ...renderGuideCounters(viewModel),
    renderSellerReview(reviewModel),
    renderSellerResponse(reviewModel),
    renderSellerProjection(reviewModel),
    renderSellerResponseReadiness(reviewModel),
    ...renderSellerApprovalHandoff(reviewModel),
    ...renderSellerGuideCounters(reviewModel)
  );
  panel.append(shell);
}
