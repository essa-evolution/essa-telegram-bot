import {
  buildSaleListingViewModel
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

function parseHash(hash = window.location.hash || "#property-sale-listing-proof") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner" };
}

function navCase(caseKey) {
  window.location.hash = `#property-sale-listing-proof?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Sale Listing Cases", "sale-listing-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner", "owner"],
    ["Agent", "agent"],
    ["Agent no mandate", "agentNoMandate"],
    ["Manager", "manager"],
    ["Cleaner", "cleaner"],
    ["Price scope", "priceBlocked"],
    ["Exclusive conflict", "exclusiveConflict"],
    ["Non-exclusive", "nonExclusive"],
    ["State mismatch", "stateMismatch"],
    ["Missing Property", "missingProperty"],
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

function renderProperty(viewModel) {
  const node = section("Property / Passport Summary", "sale-listing-property");
  const property = viewModel.source.property || viewModel.intent.source.property;
  node.append(
    row("Property ID", viewModel.intent.propertyId),
    row("Property type", property.propertyType),
    row("Property status", property.currentStatus),
    row("Canonical Property creations", viewModel.canonicalPropertyCreations),
    row("Passport listing count", viewModel.result?.passport?.passport?.publicView?.listingCount ?? 0)
  );
  return node;
}

function renderAuthority(viewModel) {
  const node = section("Seller / Representative / Authority / Mandate", "sale-listing-authority");
  const source = viewModel.source;
  node.append(
    row("Actor", source.actor?.displayName || source.actor?.actorId),
    row("Organization", source.saleListingIntent?.organizationId || source.authorityGrant?.organizationId || "Personal"),
    row("Relationship", source.relationship?.relationshipId),
    row("Authority", source.authorityGrant?.authorityGrantId),
    row("Allowed Actions", source.authorityGrant?.allowedActions || []),
    row("Mandate", source.saleListingIntent?.mandateRef || "Owner self authority"),
    row("Exclusive status", source.saleListingIntent?.mandateExclusivity)
  );
  return node;
}

function renderIntent(viewModel) {
  const node = section("Sale Listing Intent / Price / Content / Media", "sale-listing-intent");
  const sale = viewModel.intent.source.saleListingIntent;
  node.append(
    row("SaleListingIntent", sale.saleListingIntentId),
    row("Listing type", sale.listingType),
    row("Requested price", sale.requestedPrice),
    row("Currency", sale.currency),
    row("Negotiability", sale.negotiability),
    row("Title", sale.listingTitle),
    row("Description", sale.listingDescription),
    row("Media readiness", sale.mediaRefs.length ? "LOCAL_MEDIA_REFS_READY" : "MEDIA_WARNING_ONLY"),
    row("Visibility", sale.visibilityReadiness)
  );
  return node;
}

function renderPreflight(viewModel) {
  const node = section("Scope / Preflight / Approval / Gateway", "sale-listing-preflight");
  node.append(
    row("Preflight", viewModel.preflight.status),
    row("Reasons", viewModel.preflight.reasons || []),
    row("Approval", viewModel.approval.approvalStatus),
    row("Gateway", viewModel.gateway.status),
    row("Gateway allowed", viewModel.gateway.allowed),
    row("Before active sale listings", viewModel.beforeState.activeSaleListingState)
  );
  return node;
}

function renderResult(viewModel) {
  const node = section("Created Listing / Passport Listing View / Verification", "sale-listing-result");
  node.append(
    row("Execution", viewModel.result?.status || "NOT_RUN_BLOCKED"),
    row("Listing ID", viewModel.result?.listingId || "NOT_CREATED"),
    row("Listing status", viewModel.result?.listing?.listingStatus || "NONE"),
    row("Passport shows Listing", viewModel.propertyPassportListingView?.listingCount ?? 0),
    row("Verification", viewModel.result?.post?.status || "NOT_AVAILABLE"),
    row("Idempotent repeat", viewModel.repeat?.status || "NOT_AVAILABLE")
  );
  return node;
}

function renderAudit(viewModel) {
  const node = section("Audit / Rollback / Side Effects", "sale-listing-side-effects");
  node.append(
    row("History", viewModel.historyItem?.status || "NO_HISTORY"),
    row("Audit refs", viewModel.historyItem?.auditRefs || []),
    row("Rollback", viewModel.rollback?.status || "NOT_AVAILABLE"),
    row("Rollback dependency guard", viewModel.rollbackDependencyGuard.status),
    row("localSaleListingCreations", viewModel.localSaleListingCreations),
    row("canonicalPropertyCreations", viewModel.canonicalPropertyCreations),
    row("duplicateListings", viewModel.duplicateListings),
    row("unrelatedPropertyMutations", viewModel.unrelatedPropertyMutations),
    row("ownershipMutations", viewModel.ownershipMutations),
    row("publishActions", viewModel.publishActions),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return node;
}

function renderGuide(viewModel) {
  const node = section("Sell Property / Lisa / Navigator", "sale-listing-guide");
  const publicationButton = el("button", "add-property-primary-action", "PREPARE FOR PUBLICATION");
  publicationButton.type = "button";
  publicationButton.dataset.executionEnabled = "false";
  publicationButton.addEventListener("click", () => {
    window.location.hash = `#property-sale-publication-readiness?case=${viewModel.caseKey === "agent" ? "agent" : "owner"}`;
  });
  node.append(
    row("Sell Property status", viewModel.sellPropertyIntegration.status),
    row("Public discovery", viewModel.sellPropertyIntegration.publicDiscovery),
    row("Lisa", viewModel.lisaGuide.answer),
    row("Lisa may approve / execute", `${viewModel.lisaGuide.mayApprove} / ${viewModel.lisaGuide.mayExecute}`),
    row("Navigator route", viewModel.navigatorRouting.hash),
    row("Navigator may approve / execute / publish", `${viewModel.navigatorRouting.navigatorCanApprove} / ${viewModel.navigatorRouting.navigatorCanExecute} / ${viewModel.navigatorRouting.navigatorCanPublish}`),
    publicationButton
  );
  return node;
}

export function renderPropertySaleListingProofUi(panel, inputHash = window.location.hash || "#property-sale-listing-proof") {
  if (!panel) return;
  const viewModel = buildSaleListingViewModel(parseHash(inputHash));
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-sale-listing-proof";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.preflightStatus = viewModel.preflight.status;
  panel.dataset.gatewayAllowed = String(viewModel.gateway.allowed);
  panel.dataset.localSaleListingCreations = String(viewModel.localSaleListingCreations);
  panel.dataset.canonicalPropertyCreations = String(viewModel.canonicalPropertyCreations);
  panel.dataset.duplicateListings = String(viewModel.duplicateListings);
  panel.dataset.unrelatedPropertyMutations = String(viewModel.unrelatedPropertyMutations);
  panel.dataset.ownershipMutations = String(viewModel.ownershipMutations);
  panel.dataset.publishActions = String(viewModel.publishActions);
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);

  const shell = el("div", "add-property-shell property-sale-listing-proof-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "LOCAL CONTROLLED SALE LISTING CREATION"),
    el("h2", "", "SALE LISTING CREATION PROOF"),
    el("p", "", viewModel.banner)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderProperty(viewModel),
    renderAuthority(viewModel),
    renderIntent(viewModel),
    renderPreflight(viewModel),
    renderResult(viewModel),
    renderAudit(viewModel),
    renderGuide(viewModel)
  );
  panel.append(shell);
}
