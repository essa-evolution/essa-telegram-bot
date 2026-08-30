import {
  buildMarketplacePublicationViewModel
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

function parseHash(hash = window.location.hash || "#property-publication-proof") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner" };
}

function navCase(caseKey) {
  window.location.hash = `#property-publication-proof?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Publication Proof Cases", "marketplace-publication-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner", "owner"],
    ["Agent", "agent"],
    ["Expired authority", "expiredAuthority"],
    ["Manager", "manager"],
    ["Blocked readiness", "blockedReadiness"],
    ["Stale plan", "stalePlan"],
    ["Media changed", "mediaChanged"],
    ["Privacy changed", "privacyChanged"],
    ["Jurisdiction", "jurisdictionChanged"],
    ["Exclusivity", "exclusivityChanged"],
    ["Failure", "failure"]
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

function renderExecution(viewModel) {
  const node = section("Publication Execution", "marketplace-publication-execution");
  node.append(
    row("Action", viewModel.intent.actionType),
    row("Preflight", viewModel.preflight.status),
    row("Approval", viewModel.approval.approvalStatus),
    row("Gateway", viewModel.gateway.status),
    row("Gateway allowed", viewModel.gateway.allowed),
    row("Execution", viewModel.result?.status || "NOT_RUN_BLOCKED")
  );
  return node;
}

function renderPlan(viewModel) {
  const node = section("Plan / Fingerprints", "marketplace-publication-plan");
  node.append(
    row("Plan", viewModel.plan.publicationPlanId),
    row("Plan status", viewModel.plan.planStatus),
    row("Listing fingerprint", viewModel.intent.listingFingerprint),
    row("Projection fingerprint", viewModel.intent.publicProjectionFingerprint),
    row("Authority fingerprint", viewModel.intent.authorityFingerprint),
    row("Media fingerprint", viewModel.intent.mediaFingerprint),
    row("Privacy fingerprint", viewModel.intent.privacyPolicyFingerprint)
  );
  return node;
}

function renderRecord(viewModel) {
  const node = section("Publication Record", "marketplace-publication-record");
  node.append(
    row("Publication ID", viewModel.result?.publicationId || "NOT_CREATED"),
    row("Status", viewModel.result?.publicationRecord?.publicationStatus || "NONE"),
    row("Channel", viewModel.result?.publicationRecord?.channelId || viewModel.intent.targetChannelId),
    row("Discovery status", viewModel.result?.publicationRecord?.discoveryStatus || "NONE"),
    row("Seller contact enabled", viewModel.result?.publicationRecord?.sellerContactEnabled ?? false),
    row("Transaction started", viewModel.result?.publicationRecord?.transactionStarted ?? false)
  );
  return node;
}

function renderMarketplace(viewModel) {
  const node = section("Marketplace Route", "property-marketplace");
  const entry = viewModel.marketplace.entries[0];
  node.append(
    row("Route", "#property-marketplace"),
    row("Search count", viewModel.marketplace.count),
    row("Query", viewModel.marketplace.query),
    row("Filters", viewModel.marketplace.filters),
    row("Unpublished included", viewModel.marketplace.unpublishedListingsIncluded),
    row("Blocked included", viewModel.marketplace.blockedListingsIncluded)
  );
  if (entry) {
    node.append(
      row("Card cover", entry.coverMediaSafeRef),
      row("Card title", entry.publicTitle),
      row("Card type", entry.propertyType),
      row("Card location", entry.safeLocation),
      row("Asking Price", `${entry.askingPrice} ${entry.currency}`),
      row("Freshness", entry.freshness),
      row("View Property", entry.publicDetailRoute),
      row("Property Passport", entry.passportPublicLinkReadiness)
    );
  }
  return node;
}

function renderDetail(viewModel) {
  const node = section("Public Listing Detail", "property-listing-detail");
  const detail = viewModel.detail || viewModel.projection;
  node.append(
    row("Route", viewModel.publicListingRoute),
    row("Title", detail.publicTitle),
    row("Photos", detail.safeMediaRefs),
    row("Property type", detail.propertyType),
    row("Location", detail.safeLocation),
    row("Asking Price", `${detail.askingPrice} ${detail.currency}`),
    row("Description", detail.publicDescription),
    row("Verification badge", detail.publicVerificationBadges),
    row("Passport link", detail.passportPublicLinkReadiness),
    row("Representation", detail.sellerRepresentationTypeSafeSummary)
  );
  return node;
}

function renderRollback(viewModel) {
  const node = section("Unpublish / Rollback", "marketplace-publication-rollback");
  node.append(
    row("Idempotent repeat", viewModel.repeat?.status || "NOT_AVAILABLE"),
    row("Unpublish", viewModel.unpublish?.status || "NOT_AVAILABLE"),
    row("Search after unpublish", viewModel.searchAfterUnpublish.count),
    row("Rollback dependency guard", viewModel.rollbackGuard.status),
    row("Listing preserved", viewModel.unpublish?.listingPreserved ?? true),
    row("Property preserved", viewModel.unpublish?.propertyPreserved ?? true)
  );
  return node;
}

function renderGuide(viewModel) {
  const node = section("Lisa / Navigator / Contact Boundary", "marketplace-publication-guide");
  const interestButton = el("button", "add-property-primary-action", "I'M INTERESTED / ASK ABOUT THIS PROPERTY");
  interestButton.type = "button";
  interestButton.dataset.executionEnabled = "false";
  interestButton.addEventListener("click", () => {
    window.location.hash = `#property-leads?case=${viewModel.caseKey === "agent" ? "agent" : "owner"}`;
  });
  node.append(
    row("Lisa", viewModel.lisaGuide.answer),
    row("Navigator route", viewModel.navigatorRouting.hash),
    row("Navigator may publish", viewModel.navigatorRouting.navigatorCanPublish),
    row("Future contact action", viewModel.contactSellerFutureAction),
    interestButton
  );
  return node;
}

function renderCounters(viewModel) {
  const node = section("Side Effects", "marketplace-publication-side-effects");
  node.append(
    row("localMarketplacePublications", viewModel.localMarketplacePublications),
    row("localMarketplaceDiscoveryInsertions", viewModel.localMarketplaceDiscoveryInsertions),
    row("duplicatePublicationRecords", viewModel.duplicatePublicationRecords),
    row("duplicateDiscoveryEntries", viewModel.duplicateDiscoveryEntries),
    row("externalPublicationActions", viewModel.externalPublicationActions),
    row("productionMarketplaceWrites", viewModel.productionMarketplaceWrites),
    row("canonicalPropertyMutations", viewModel.canonicalPropertyMutations),
    row("ownershipMutations", viewModel.ownershipMutations),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("sellerContactActions", viewModel.sellerContactActions),
    row("offerActions", viewModel.offerActions),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return node;
}

export function renderPropertyMarketplacePublicationUi(panel, inputHash = window.location.hash || "#property-publication-proof") {
  if (!panel) return;
  const viewModel = buildMarketplacePublicationViewModel(parseHash(inputHash));
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-publication-proof";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.preflightStatus = viewModel.preflight.status;
  panel.dataset.executionStatus = viewModel.result?.status || "NOT_RUN_BLOCKED";
  panel.dataset.localMarketplacePublications = String(viewModel.localMarketplacePublications);
  panel.dataset.localMarketplaceDiscoveryInsertions = String(viewModel.localMarketplaceDiscoveryInsertions);
  panel.dataset.duplicatePublicationRecords = String(viewModel.duplicatePublicationRecords);
  panel.dataset.duplicateDiscoveryEntries = String(viewModel.duplicateDiscoveryEntries);
  panel.dataset.externalPublicationActions = String(viewModel.externalPublicationActions);
  panel.dataset.productionMarketplaceWrites = String(viewModel.productionMarketplaceWrites);
  panel.dataset.canonicalPropertyMutations = String(viewModel.canonicalPropertyMutations);
  panel.dataset.ownershipMutations = String(viewModel.ownershipMutations);
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);
  panel.dataset.sellerContactActions = String(viewModel.sellerContactActions);
  panel.dataset.offerActions = String(viewModel.offerActions);

  const shell = el("div", "add-property-shell property-marketplace-publication-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "LOCAL MARKETPLACE PUBLICATION PROOF"),
    el("h2", "", "ESSA PROPERTY MARKETPLACE"),
    el("p", "", viewModel.banner)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderExecution(viewModel),
    renderPlan(viewModel),
    renderRecord(viewModel),
    renderMarketplace(viewModel),
    renderDetail(viewModel),
    renderRollback(viewModel),
    renderGuide(viewModel),
    renderCounters(viewModel)
  );
  panel.append(shell);
}
