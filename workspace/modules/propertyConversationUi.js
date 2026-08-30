import {
  buildPropertyConversationContinuationViewModel,
  buildPropertyConversationRouteChangeViewModel,
  buildPropertyConversationViewModel
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

function parseHash(hash = window.location.hash || "#property-conversations") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner", mode: params.get("mode") || "continuation" };
}

function navCase(caseKey) {
  window.location.hash = `#property-conversations?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Conversation Cases", "property-conversation-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner", "owner"],
    ["Agent", "agent"],
    ["Buyer viewing", "buyerViewing"],
    ["Phone leak", "phoneLeak"],
    ["WhatsApp leak", "whatsappLeak"],
    ["Payment", "payment"],
    ["Offer text", "offerText"],
    ["Documents", "documentRequest"],
    ["Exact address", "exactAddress"],
    ["Authority expired", "authorityExpired"],
    ["Consent revoked", "consentRevoked"],
    ["Unpublished", "unpublished"],
    ["Close / rollback", "closeRollback"],
    ["Rollback guard", "rollbackDependency"]
    , ["Buyer safe", "buyerSafe"],
    ["Seller safe", "sellerSafe"],
    ["Reply", "reply"],
    ["Supersession", "supersession"],
    ["Idempotent", "idempotent"],
    ["Rate", "rate"],
    ["Seller email", "sellerEmailWhatsapp"],
    ["Telegram", "telegramBlocked"],
    ["External link", "externalLink"],
    ["Crypto", "crypto"],
    ["Counter text", "counterOfferText"],
    ["Resume", "resumeConsentRestored"],
    ["Route owner", "ownerFallback"],
    ["Route agent B", "agentB"],
    ["Multi-route", "multipleAgents"],
    ["No route", "noValidRoute"],
    ["Manager block", "managerBlocked"],
    ["Cleaner block", "cleanerBlocked"]
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

function isRouteChangeCase(caseKey) {
  return [
    "ownerFallback",
    "ownerTakeover",
    "agentB",
    "multipleAgents",
    "noValidRoute",
    "managerBlocked",
    "cleanerBlocked",
    "consentRevokedRoute",
    "listingUnpublishedRoute",
    "developerRepresentative",
    "revokedAuthority",
    "exclusiveMandateAgentB",
    "idempotentRoute",
    "stateMismatch"
  ].includes(caseKey);
}

function renderAppendIntent(viewModel) {
  const node = section("Message Append Intent", "conversation-message-intent");
  if (!viewModel.messageIntent) {
    node.append(row("Intent", "NOT_APPLICABLE_FOR_ROUTE_CHANGE"));
    return node;
  }
  node.append(
    row("Action", viewModel.messageIntent.actionType),
    row("Intent", viewModel.messageIntent.messageIntentId),
    row("Conversation", viewModel.messageIntent.conversationId),
    row("Sender", `${viewModel.messageIntent.senderRole} / ${viewModel.messageIntent.senderActorRef?.actorId}`),
    row("Message type", viewModel.messageIntent.messageType),
    row("Raw draft retained local", viewModel.messageIntent.rawBody),
    row("Safe body", viewModel.messageIntent.safeBody),
    row("Reply to", viewModel.messageIntent.replyToMessageId || "NONE"),
    row("Supersedes", viewModel.messageIntent.supersedesMessageId || "NONE"),
    row("Fingerprint", viewModel.messageIntent.fingerprint)
  );
  return node;
}

function renderAppendResult(viewModel) {
  const node = section("Controlled Message Append", "conversation-message-append");
  if (!viewModel.appendResult) {
    node.append(row("Append", "NOT_APPLICABLE_FOR_ROUTE_CHANGE"));
    return node;
  }
  node.append(
    row("Preflight", viewModel.appendResult.preflight?.status || viewModel.appendResult.status),
    row("Policy", viewModel.appendResult.preflight?.policyStatus || viewModel.appendResult.status),
    row("Gateway", viewModel.appendResult.gateway?.decision || "NOT_READY"),
    row("Append status", viewModel.appendResult.status),
    row("Offer-like", viewModel.appendResult.preflight?.offerLike || false),
    row("Blocked reason", viewModel.appendResult.preflight?.blockers || []),
    row("Idempotent", viewModel.idempotent?.status || "NONE"),
    row("Supersession", viewModel.supersession?.status || "NONE")
  );
  return node;
}

function renderRouteReadiness(viewModel) {
  const node = section("Seller Route Review", "conversation-route-readiness");
  const readiness = viewModel.readiness || {};
  node.append(
    row("Banner", "REPRESENTATIVE AUTHORITY CHANGED"),
    row("Readiness", readiness.readinessStatus || readiness.status),
    row("Reason", readiness.routeChangeReason),
    row("Current seller", readiness.currentSellerParticipantId),
    row("Candidates", (readiness.candidateRoutes || []).map((candidate) => `${candidate.safeLabel}:${candidate.eligible}`)),
    row("Buyer consent", readiness.buyerConsentStatus),
    row("Listing", readiness.listingStatus),
    row("Publication", readiness.publicationStatus),
    row("Blockers", readiness.blockers || [])
  );
  return node;
}

function renderParticipantChange(viewModel) {
  const node = section("Participant Change", "conversation-participant-change");
  node.append(
    row("Action", viewModel.participantChangeIntent?.actionType || "NOT_PREPARED"),
    row("Intent", viewModel.participantChangeIntent?.participantChangeIntentId || "NONE"),
    row("Selected route", viewModel.selectedCandidate?.safeLabel || "NONE"),
    row("Preflight", viewModel.participantChange?.preflight?.status || viewModel.participantChange?.status || "NONE"),
    row("Gateway", viewModel.participantChange?.gateway?.decision || "NOT_READY"),
    row("Change status", viewModel.participantChange?.status || "NONE"),
    row("Old seller append", viewModel.oldSellerAppend?.status || "NONE"),
    row("New seller append", viewModel.newSellerAppend?.status || "NONE"),
    row("Resume", viewModel.conversation?.routeChangeStatus || "NONE")
  );
  return node;
}

function renderRouteHistory(viewModel) {
  const node = section("Route Change History", "conversation-route-history");
  const item = viewModel.routeHistoryItem || {};
  node.append(
    row("Route change", item.routeChangeId),
    row("Outgoing", item.outgoingSafeRole),
    row("Incoming", item.incomingSafeRole),
    row("Status", item.status),
    row("Attribution preserved", item.attributionPreserved),
    row("Audit refs", item.auditRefs || [])
  );
  return node;
}

function renderSummary(viewModel) {
  const node = section("Conversation Summary", "conversation-summary");
  node.append(
    row("Summary", viewModel.summary.conversationId),
    row("Status", viewModel.summary.status),
    row("Message count", viewModel.summary.messageCount),
    row("Last preview", viewModel.summary.lastMessagePreviewSafe),
    row("Unread buyer/seller", `${viewModel.summary.buyerUnread}/${viewModel.summary.sellerUnread}`),
    row("Authority", viewModel.summary.authorityStatus),
    row("Consent", viewModel.summary.consentStatus),
    row("Listing", viewModel.summary.listingStatus),
    row("Next steps", viewModel.summary.nextStepReadiness)
  );
  return node;
}

function renderContinuationFuture(viewModel) {
  const node = section("Continuation Future Handoffs", "conversation-future-handoffs");
  node.append(
    row("Formal offer", viewModel.futureHandoffs.formalOffer),
    row("Viewing", viewModel.futureHandoffs.viewing),
    row("Document access", viewModel.futureHandoffs.documentAccess),
    row("Financing", viewModel.futureHandoffs.financing),
    row("Attachment intent", viewModel.attachmentIntent.status),
    row("Resume readiness", viewModel.resumeReadiness?.status || "NONE")
  );
  return node;
}

function renderIntent(viewModel) {
  const node = section("Conversation Creation Intent", "conversation-creation-intent");
  node.append(
    row("Action", viewModel.intent.actionType),
    row("Intent", viewModel.intent.conversationCreationIntentId),
    row("Handoff", viewModel.intent.handoffId),
    row("Lead", viewModel.intent.leadId),
    row("Publication", viewModel.intent.publicationId),
    row("Listing", viewModel.intent.listingId),
    row("Property", viewModel.intent.propertyId),
    row("Preflight", viewModel.execution.preflight?.status || viewModel.execution.status),
    row("Gateway", viewModel.execution.gateway?.decision || "NOT_READY"),
    row("Execution", viewModel.execution.status)
  );
  return node;
}

function renderPolicy(viewModel) {
  const policy = viewModel.intent.conversationPolicy;
  const node = section("Conversation Policy", "conversation-policy");
  node.append(
    row("External contact", policy.externalContactPolicy),
    row("Private documents", policy.privateDocumentPolicy),
    row("Payment", policy.paymentPolicy),
    row("Offer", policy.offerPolicy),
    row("Viewing", policy.viewingPolicy),
    row("Moderation", policy.moderationMode)
  );
  return node;
}

function renderConversation(viewModel) {
  const node = section("Conversation Detail", "property-conversation-detail");
  node.append(
    row("Conversation", viewModel.conversation?.conversationId || "NOT_CREATED"),
    row("Status", viewModel.conversation?.conversationStatus || viewModel.execution.status),
    row("Local proof only", viewModel.conversation?.localProofOnly ?? true),
    row("Attribution", viewModel.conversation?.attributionRef || viewModel.intent.attributionRef),
    row("Authority", viewModel.historyItem.authorityStatus),
    row("Consent", viewModel.historyItem.consentStatus),
    row("Publication", viewModel.historyItem.publicationStatus),
    row("Buyer inbox", viewModel.buyerInbox.length),
    row("Seller inbox", viewModel.sellerInbox.length)
  );
  return node;
}

function renderParticipants(viewModel) {
  const node = section("Participants", "property-conversation-participants");
  if (!viewModel.participants.length) node.append(row("Participants", "NONE"));
  viewModel.participants.forEach((participant) => {
    node.append(
      row(participant.participantRole, `${participant.privacyProfile.safeLabel} / ${participant.participationStatus} / contact visible: ${participant.privacyProfile.contactDetailsVisible}`)
    );
  });
  return node;
}

function renderMessages(viewModel) {
  const node = section("Message Thread", "property-conversation-messages");
  if (!viewModel.messages.length) node.append(row("Messages", "NONE"));
  viewModel.messages.forEach((message) => {
    node.append(row(`${message.sequenceNumber}. ${message.senderRole}`, `${message.messageType}: ${message.safeBody} [${message.deliveryStatus}]`));
  });
  node.append(
    row("Scenario message", viewModel.scenarioMessageResult?.status || "NONE"),
    row("Buyer safe message", viewModel.deliveredBuyer?.status || "NONE"),
    row("Seller safe reply", viewModel.deliveredSeller?.status || "NONE")
  );
  return node;
}

function renderReadAudit(viewModel) {
  const node = section("Read State / Audit / History", "property-conversation-audit");
  node.append(
    row("Read states", viewModel.readStates.map((item) => `${item.actorId}:${item.readStatus}:${item.unreadCount}`)),
    row("Read result", viewModel.read?.status || "NONE"),
    row("Message count", viewModel.historyItem.messageCount),
    row("Audit refs", viewModel.historyItem.auditRefs),
    row("Route change", viewModel.routeChange?.status || "NONE"),
    row("Pause", viewModel.pause?.status || "NONE"),
    row("Close", viewModel.close?.status || "NONE"),
    row("Rollback", viewModel.rollback?.status || viewModel.dependencyRollback?.status || "NONE")
  );
  return node;
}

function renderGuideFuture(viewModel) {
  const node = section("Lisa / Navigator / Future Actions", "property-conversation-guide");
  node.append(
    row("Lisa", viewModel.lisaGuide.answer),
    row("Navigator", viewModel.navigatorRouting.hash),
    row("REQUEST VIEWING", "#property-viewings?case=owner"),
    row("MAKE FORMAL OFFER", "NOT ACTIVE YET"),
    row("REQUEST DOCUMENT ACCESS", "NOT ACTIVE YET"),
    row("START FINANCING PATH", "FUTURE"),
    row("OPEN DEAL ROOM", "NOT ACTIVE YET")
  );
  return node;
}

function renderCounters(viewModel) {
  const node = section("Side Effects", "property-conversation-side-effects");
  node.append(
    row("localConversationMessageIntents", viewModel.localConversationMessageIntents || 0),
    row("localConversationMessagesAppended", viewModel.localConversationMessagesAppended || 0),
    row("messageSupersessionsLocal", viewModel.messageSupersessionsLocal || 0),
    row("routeChangeReadinessEvaluations", viewModel.routeChangeReadinessEvaluations || 0),
    row("participantChangeIntentsLocal", viewModel.participantChangeIntentsLocal || 0),
    row("sellerParticipantChangesLocal", viewModel.sellerParticipantChangesLocal || 0),
    row("newLead/newConversation", `${viewModel.newLeadsCreated || 0}/${viewModel.newConversationsCreated || 0}`),
    row("message reassignment/history deletion", `${viewModel.messagesReassigned || 0}/${viewModel.messageHistoryDeletions || 0}`),
    row("attribution/contact", `${viewModel.attributionMutations || 0}/${viewModel.contactReveals || 0}`),
    row("localPropertyConversationsCreated", viewModel.localPropertyConversationsCreated),
    row("localConversationMessagesCreated", viewModel.localConversationMessagesCreated),
    row("localMessagesDeliveredInsideEssa", viewModel.localMessagesDeliveredInsideEssa),
    row("duplicateMessagesCreated", viewModel.duplicateMessagesCreated),
    row("externalMessages/contact", `${viewModel.externalMessagesSent}/${viewModel.emailActions}/${viewModel.smsActions}/${viewModel.telegramActions}/${viewModel.whatsappActions}`),
    row("phone/email reveals", `${viewModel.phoneReveals}/${viewModel.emailReveals}`),
    row("privateDocumentShares", viewModel.privateDocumentShares),
    row("formal/counter offer", `${viewModel.formalOffersCreated || 0}/${viewModel.counterOffersCreated || 0}`),
    row("offer/viewing/reservation/dealRoom", `${viewModel.offerEntitiesCreated}/${viewModel.viewingBookings}/${viewModel.reservationActions}/${viewModel.dealRoomActions}`),
    row("Property/Listing/Publication/Ownership mutations", `${viewModel.canonicalPropertyMutations}/${viewModel.listingMutations}/${viewModel.publicationMutations}/${viewModel.ownershipMutations}`),
    row("provider/external/productionDb", `${viewModel.providerCalls}/${viewModel.externalCalls}/${viewModel.productionDbMutations}`),
    row("payment/booking/transaction", `${viewModel.paymentActions}/${viewModel.bookingActions}/${viewModel.commercialTransactionActions}`)
  );
  return node;
}

export function renderPropertyConversationUi(panel, inputHash = window.location.hash || "#property-conversations") {
  if (!panel) return;
  const parsed = parseHash(inputHash);
  const baseViewModel = buildPropertyConversationViewModel(parsed);
  const extraViewModel = isRouteChangeCase(parsed.case)
    ? buildPropertyConversationRouteChangeViewModel(parsed)
    : buildPropertyConversationContinuationViewModel(parsed);
  const viewModel = { ...baseViewModel, ...extraViewModel };
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-conversations";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.executionStatus = viewModel.execution.status;
  panel.dataset.gatewayDecision = viewModel.execution.gateway?.decision || "";
  panel.dataset.conversationStatus = viewModel.conversation?.conversationStatus || viewModel.execution.status;
  panel.dataset.messagePolicyStatus = viewModel.scenarioMessageResult?.status || "";
  panel.dataset.appendStatus = viewModel.appendResult?.status || "";
  panel.dataset.appendPreflightStatus = viewModel.appendResult?.preflight?.status || "";
  panel.dataset.localConversationMessageIntents = String(viewModel.localConversationMessageIntents || 0);
  panel.dataset.localConversationMessagesAppended = String(viewModel.localConversationMessagesAppended || 0);
  panel.dataset.messageSupersessionsLocal = String(viewModel.messageSupersessionsLocal || 0);
  panel.dataset.routeChangeReadinessEvaluations = String(viewModel.routeChangeReadinessEvaluations || 0);
  panel.dataset.participantChangeIntentsLocal = String(viewModel.participantChangeIntentsLocal || 0);
  panel.dataset.sellerParticipantChangesLocal = String(viewModel.sellerParticipantChangesLocal || 0);
  panel.dataset.newLeadsCreated = String(viewModel.newLeadsCreated || 0);
  panel.dataset.newConversationsCreated = String(viewModel.newConversationsCreated || 0);
  panel.dataset.messagesReassigned = String(viewModel.messagesReassigned || 0);
  panel.dataset.messageHistoryDeletions = String(viewModel.messageHistoryDeletions || 0);
  panel.dataset.attributionMutations = String(viewModel.attributionMutations || 0);
  panel.dataset.contactReveals = String(viewModel.contactReveals || 0);
  panel.dataset.localPropertyConversationsCreated = String(viewModel.localPropertyConversationsCreated);
  panel.dataset.localConversationMessagesCreated = String(viewModel.localConversationMessagesCreated);
  panel.dataset.localMessagesDeliveredInsideEssa = String(viewModel.localMessagesDeliveredInsideEssa);
  panel.dataset.duplicateMessagesCreated = String(viewModel.duplicateMessagesCreated);
  panel.dataset.externalMessagesSent = String(viewModel.externalMessagesSent);
  panel.dataset.emailActions = String(viewModel.emailActions);
  panel.dataset.smsActions = String(viewModel.smsActions);
  panel.dataset.telegramActions = String(viewModel.telegramActions);
  panel.dataset.whatsappActions = String(viewModel.whatsappActions);
  panel.dataset.phoneReveals = String(viewModel.phoneReveals);
  panel.dataset.emailReveals = String(viewModel.emailReveals);
  panel.dataset.privateDocumentShares = String(viewModel.privateDocumentShares);
  panel.dataset.offerEntitiesCreated = String(viewModel.offerEntitiesCreated);
  panel.dataset.formalOffersCreated = String(viewModel.formalOffersCreated || 0);
  panel.dataset.counterOffersCreated = String(viewModel.counterOffersCreated || 0);
  panel.dataset.viewingBookings = String(viewModel.viewingBookings);
  panel.dataset.reservationActions = String(viewModel.reservationActions);
  panel.dataset.dealRoomActions = String(viewModel.dealRoomActions);
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

  const shell = el("div", "add-property-shell property-conversation-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "PROPERTY INTERNAL CONVERSATION / LOCAL PROOF"),
    el("h2", "", "PROPERTY CONVERSATIONS"),
    el("p", "", viewModel.banner)
  );
  const controls = section("Continuation Controls", "conversation-continuation-controls");
  controls.append(
    row("Message type control", viewModel.messageIntent?.messageType || "SELLER_ROUTE_REVIEW"),
    row("Message input", viewModel.messageIntent?.rawBody || "SELECT AUTHORIZED REPLACEMENT"),
    row("Action", isRouteChangeCase(viewModel.caseKey) ? "PREPARE PARTICIPANT CHANGE" : "SEND INSIDE ESSA"),
    row("Blocked explanation", viewModel.appendResult?.preflight?.blockers || viewModel.participantChange?.preflight?.blockers || "NONE")
  );
  const sections = [
    hero,
    renderTabs(viewModel),
    controls,
    renderIntent(viewModel),
    isRouteChangeCase(viewModel.caseKey) ? renderRouteReadiness(viewModel) : renderAppendIntent(viewModel),
    isRouteChangeCase(viewModel.caseKey) ? renderParticipantChange(viewModel) : renderAppendResult(viewModel),
    renderPolicy(viewModel),
    renderConversation(viewModel),
    renderParticipants(viewModel),
    renderMessages(viewModel),
    renderReadAudit(viewModel),
    renderSummary(viewModel),
    isRouteChangeCase(viewModel.caseKey) ? renderRouteHistory(viewModel) : null,
    renderContinuationFuture(viewModel),
    renderGuideFuture(viewModel),
    renderCounters(viewModel)
  ].filter(Boolean);
  shell.append(...sections);
  panel.append(shell);
}
