import { buildPropertyViewingViewModel } from "../../src/property/index.js";

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

function parseHash(hash = window.location.hash || "#property-viewings") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner" };
}

function navCase(caseKey) {
  window.location.hash = `#property-viewings?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Viewing Cases", "property-viewing-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner", "owner"],
    ["Agent", "agent"],
    ["Expired agent", "expiredAgent"],
    ["Manager blocked", "managerNoAuthority"],
    ["Manager viewing", "managerViewingAuthority"],
    ["Cleaner", "cleaner"],
    ["Consent revoked", "buyerConsentRevoked"],
    ["Unpublished", "listingUnpublished"],
    ["Paused", "conversationPaused"],
    ["Location", "locationPrivacy"],
    ["Conflict", "overlapConflict"],
    ["Reschedule", "rescheduleCancel"],
    ["Owner takeover", "ownerTakeover"]
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

function renderRequest(viewModel) {
  const node = section("Viewing Request", "property-viewing-request");
  node.append(
    row("Intent", viewModel.requestIntent.viewingRequestIntentId),
    row("Request", viewModel.request.viewingRequestId),
    row("Type", viewModel.request.requestType),
    row("Mode", viewModel.request.viewingMode),
    row("Status", viewModel.request.requestStatus),
    row("Readiness", viewModel.request.readinessStatus),
    row("Conversation", viewModel.conversation.conversationId),
    row("Lead", viewModel.leadId),
    row("Listing", viewModel.listingId),
    row("Property", viewModel.propertyId)
  );
  return node;
}

function renderAvailability(viewModel) {
  const node = section("Availability", "property-viewing-availability");
  node.append(
    row("Buyer", viewModel.buyerAvailability.map((item) => `${item.date} ${item.startTime}-${item.endTime} ${item.timezone}`)),
    row("Seller", viewModel.sellerAvailability.map((item) => `${item.date} ${item.startTime}-${item.endTime} ${item.timezone}`)),
    row("Timezone", viewModel.timezone),
    row("No invented slots", viewModel.slotResult.noInventedSlots)
  );
  return node;
}

function renderSlots(viewModel) {
  const node = section("Slots", "property-viewing-slots");
  if (!viewModel.slots.length) node.append(row("Slots", "WAITING_FOR_SELLER_AVAILABILITY"));
  viewModel.slots.forEach((slot) => node.append(row(slot.viewingSlotId, `${slot.date} ${slot.startTime}-${slot.endTime} ${slot.timezone} [${slot.slotStatus}]`)));
  node.append(row("Selection", viewModel.selectedSlot?.status || "NONE"));
  return node;
}

function renderConfirmation(viewModel) {
  const node = section("Confirmation", "property-viewing-confirmation");
  node.append(
    row("Action", viewModel.confirmationIntent?.actionType || "NOT_READY"),
    row("Intent", viewModel.confirmationIntent?.confirmationIntentId || "NONE"),
    row("Preflight", viewModel.confirmation.preflight?.status || viewModel.confirmation.status),
    row("Gateway", viewModel.confirmation.gateway?.decision || "NOT_READY"),
    row("Status", viewModel.confirmation.status),
    row("Viewing", viewModel.viewing?.viewingId || "NONE"),
    row("Idempotent", viewModel.idempotent?.status || "NONE")
  );
  return node;
}

function renderPrivacy(viewModel) {
  const node = section("Location Privacy", "property-viewing-location");
  node.append(
    row("Before confirmation", viewModel.locationDisclosure.beforeConfirmation),
    row("After confirmation", viewModel.locationDisclosure.afterConfirmation),
    row("Exact address before confirmation", viewModel.exactAddressVisibleBeforeConfirmation),
    row("Access codes shared", viewModel.locationDisclosure.accessCodesShared)
  );
  return node;
}

function renderHistory(viewModel) {
  const node = section("Viewing History / Audit", "property-viewing-history");
  node.append(
    row("Viewing", viewModel.historyItem.viewingId),
    row("Status", viewModel.historyItem.viewingStatus),
    row("Reschedule", viewModel.reschedule?.status || "NONE"),
    row("Cancellation", viewModel.cancellation?.status || "NONE"),
    row("Lead history", viewModel.leadHistory),
    row("Attribution", viewModel.attributionChain),
    row("Audit refs", viewModel.historyItem.auditRefs)
  );
  return node;
}

function renderGuide(viewModel) {
  const node = section("Lisa / Navigator", "property-viewing-guide");
  node.append(
    row("Lisa", viewModel.lisaGuide.answer),
    row("Lisa can confirm", viewModel.lisaGuide.mayConfirmViewing),
    row("Navigator", viewModel.navigatorRouting.hash),
    row("Reservation active", viewModel.navigatorRouting.reservationActive),
    row("Make formal offer", "NOT ACTIVE YET"),
    row("Pay deposit", "NOT ACTIVE YET"),
    row("Open Deal Room", "NOT ACTIVE YET")
  );
  return node;
}

function renderCounters(viewModel) {
  const node = section("Side Effects", "property-viewing-side-effects");
  node.append(
    row("localViewingRequestsCreated", viewModel.localViewingRequestsCreated),
    row("localViewingSlotsProposed", viewModel.localViewingSlotsProposed),
    row("localViewingsConfirmed", viewModel.localViewingsConfirmed),
    row("localViewingRescheduleRequests", viewModel.localViewingRescheduleRequests),
    row("localViewingsCancelled", viewModel.localViewingsCancelled),
    row("duplicateViewingsCreated", viewModel.duplicateViewingsCreated),
    row("reservation/offer/dealRoom", `${viewModel.propertyReservationsCreated}/${viewModel.formalOffersCreated}/${viewModel.dealRoomActions}`),
    row("external calendar/notifications", `${viewModel.externalCalendarEventsCreated}/${viewModel.externalNotificationsSent}`),
    row("email/sms/telegram/whatsapp", `${viewModel.emailActions}/${viewModel.smsActions}/${viewModel.telegramActions}/${viewModel.whatsappActions}`),
    row("Property/Listing/Publication/Ownership mutations", `${viewModel.canonicalPropertyMutations}/${viewModel.listingMutations}/${viewModel.publicationMutations}/${viewModel.ownershipMutations}`),
    row("provider/external/productionDb", `${viewModel.providerCalls}/${viewModel.externalCalls}/${viewModel.productionDbMutations}`),
    row("payment/booking/transaction", `${viewModel.paymentActions}/${viewModel.bookingActions}/${viewModel.commercialTransactionActions}`)
  );
  return node;
}

export function renderPropertyViewingUi(panel, inputHash = window.location.hash || "#property-viewings") {
  if (!panel) return;
  const viewModel = buildPropertyViewingViewModel(parseHash(inputHash));
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-viewings";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.confirmationStatus = viewModel.confirmation.status;
  panel.dataset.confirmationPreflightStatus = viewModel.confirmation.preflight?.status || "";
  panel.dataset.localViewingRequestsCreated = String(viewModel.localViewingRequestsCreated);
  panel.dataset.localViewingSlotsProposed = String(viewModel.localViewingSlotsProposed);
  panel.dataset.localViewingsConfirmed = String(viewModel.localViewingsConfirmed);
  panel.dataset.localViewingRescheduleRequests = String(viewModel.localViewingRescheduleRequests);
  panel.dataset.localViewingsCancelled = String(viewModel.localViewingsCancelled);
  panel.dataset.duplicateViewingsCreated = String(viewModel.duplicateViewingsCreated);
  panel.dataset.propertyReservationsCreated = String(viewModel.propertyReservationsCreated);
  panel.dataset.formalOffersCreated = String(viewModel.formalOffersCreated);
  panel.dataset.counterOffersCreated = String(viewModel.counterOffersCreated);
  panel.dataset.dealRoomActions = String(viewModel.dealRoomActions);
  panel.dataset.externalCalendarEventsCreated = String(viewModel.externalCalendarEventsCreated);
  panel.dataset.externalNotificationsSent = String(viewModel.externalNotificationsSent);
  panel.dataset.emailActions = String(viewModel.emailActions);
  panel.dataset.smsActions = String(viewModel.smsActions);
  panel.dataset.telegramActions = String(viewModel.telegramActions);
  panel.dataset.whatsappActions = String(viewModel.whatsappActions);
  panel.dataset.canonicalPropertyMutations = String(viewModel.canonicalPropertyMutations);
  panel.dataset.listingMutations = String(viewModel.listingMutations);
  panel.dataset.publicationMutations = String(viewModel.publicationMutations);
  panel.dataset.ownershipMutations = String(viewModel.ownershipMutations);
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);
  panel.dataset.paymentActions = String(viewModel.paymentActions);
  panel.dataset.bookingActions = String(viewModel.bookingActions);
  panel.dataset.commercialTransactionActions = String(viewModel.commercialTransactionActions);

  const shell = el("div", "add-property-shell property-viewing-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "PROPERTY VIEWING / LOCAL PROOF"),
    el("h2", "", "PROPERTY VIEWINGS"),
    el("p", "", viewModel.banner)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderRequest(viewModel),
    renderAvailability(viewModel),
    renderSlots(viewModel),
    renderConfirmation(viewModel),
    renderPrivacy(viewModel),
    renderHistory(viewModel),
    renderGuide(viewModel),
    renderCounters(viewModel)
  );
  panel.append(shell);
}
