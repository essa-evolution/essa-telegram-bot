import {
  buildPublicationReadinessViewModel
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

function parseHash(hash = window.location.hash || "#property-sale-publication-readiness") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner" };
}

function navCase(caseKey) {
  window.location.hash = `#property-sale-publication-readiness?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Publication Readiness Cases", "publication-readiness-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner ready", "owner"],
    ["Agent ready", "agent"],
    ["Expired authority", "expiredAuthority"],
    ["Private data", "privateData"],
    ["Fact conflict", "contentConflict"],
    ["Missing media", "missingMedia"],
    ["Media rights", "mediaRights"],
    ["Stale", "stale"],
    ["Unknown jurisdiction", "unknownJurisdiction"],
    ["Exclusive conflict", "exclusiveConflict"],
    ["Manager", "manager"]
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
  const node = section("Property", "publication-property");
  node.append(
    row("Property ID", viewModel.property?.propertyId),
    row("Property type", viewModel.property?.propertyType),
    row("Property status", viewModel.readiness.propertyStatus),
    row("Passport link", viewModel.projection.passportPublicLinkReadiness)
  );
  return node;
}

function renderListing(viewModel) {
  const node = section("Sale Listing", "publication-listing");
  node.append(
    row("Listing ID", viewModel.listing?.listingId),
    row("Listing type", viewModel.listing?.listingType),
    row("Listing status", viewModel.readiness.listingStatus),
    row("Visibility", viewModel.readiness.visibilityReadiness),
    row("Still unpublished", viewModel.listing?.published === false)
  );
  return node;
}

function renderAuthority(viewModel) {
  const node = section("Authority", "publication-authority");
  node.append(
    row("Actor", viewModel.intent.actorId),
    row("Authority", viewModel.intent.authorityGrantId),
    row("Authority status", viewModel.readiness.authorityStatus),
    row("Authority readiness", viewModel.readiness.authorityReadiness.readinessStatus),
    row("Authority blockers", viewModel.readiness.authorityReadiness.blockers)
  );
  return node;
}

function renderContent(viewModel) {
  const node = section("Content Readiness", "publication-content");
  node.append(
    row("Content", viewModel.readiness.contentReadiness.readinessStatus),
    row("Title", viewModel.projection.publicTitle),
    row("Description", viewModel.projection.publicDescription),
    row("Marketing/fact warnings", viewModel.readiness.contentReadiness.warnings),
    row("Blockers", viewModel.readiness.contentReadiness.blockers)
  );
  return node;
}

function renderEvidencePriceMedia(viewModel) {
  const evidence = section("Evidence", "publication-evidence");
  evidence.append(row("Evidence readiness", viewModel.readiness.evidenceReadiness.readinessStatus), row("Missing", viewModel.readiness.evidenceReadiness.missingRequirements));
  const price = section("Price", "publication-price");
  price.append(row("Asking Price", viewModel.projection.askingPrice), row("Currency", viewModel.projection.currency), row("Not valuation", true));
  const media = section("Media", "publication-media");
  media.append(row("Media readiness", viewModel.readiness.mediaReadiness.readinessStatus), row("Cover", viewModel.readiness.mediaReadiness.coverMediaRef), row("Photo count", viewModel.readiness.mediaReadiness.photoCount), row("Privacy flags", viewModel.readiness.mediaReadiness.privacyFlags));
  const rights = section("Media Rights", "publication-media-rights");
  rights.append(row("Rights", viewModel.readiness.mediaReadiness.rightsReadiness), row("Warnings", viewModel.readiness.mediaReadiness.missingMediaWarnings));
  return [evidence, price, media, rights];
}

function renderPolicy(viewModel) {
  const privacy = section("Privacy", "publication-privacy");
  privacy.append(row("Privacy readiness", viewModel.readiness.privacyReadiness.readinessStatus), row("Blockers", viewModel.readiness.privacyReadiness.blockers));
  const location = section("Public Location", "publication-location");
  location.append(row("Safe location", viewModel.projection.safeLocation), row("Exact unit exposed", Boolean(viewModel.projection.safeLocation?.address)));
  const freshness = section("Freshness", "publication-freshness");
  freshness.append(row("Freshness readiness", viewModel.readiness.freshnessReadiness.readinessStatus), row("Freshness", viewModel.projection.freshness));
  const jurisdiction = section("Jurisdiction", "publication-jurisdiction");
  jurisdiction.append(row("Jurisdiction", viewModel.jurisdictionContext.jurisdiction), row("Rule status", viewModel.jurisdictionContext.publicationRuleStatus), row("Professional review", viewModel.jurisdictionContext.professionalReviewRequired));
  return [privacy, location, freshness, jurisdiction];
}

function renderComplianceChannelPlan(viewModel) {
  const compliance = section("Compliance", "publication-compliance");
  compliance.append(row("Compliance readiness", viewModel.readiness.complianceReadiness.readinessStatus), row("Flags", viewModel.readiness.complianceReadiness.flags), row("Legal conclusion", viewModel.readiness.complianceReadiness.legalConclusion));
  const exclusivity = section("Exclusivity", "publication-exclusivity");
  exclusivity.append(row("Exclusivity readiness", viewModel.readiness.exclusivityReadiness.readinessStatus), row("Blockers", viewModel.readiness.exclusivityReadiness.blockers));
  const channel = section("Target Channel", "publication-channel");
  channel.append(row("Channel", viewModel.channel.channelId), row("Provider required", viewModel.channel.providerRequired), row("Mode", viewModel.channel.publicationMode), row("Channel readiness", viewModel.readiness.channelReadiness.readinessStatus));
  const plan = section("Publication Plan", "publication-plan");
  plan.append(row("Plan", viewModel.plan.publicationPlanId), row("Plan status", viewModel.plan.planStatus), row("Required approvals", viewModel.plan.requiredApprovals), row("Stale after change", viewModel.stalePlan.planStatus));
  return [compliance, exclusivity, channel, plan];
}

function renderProjection(viewModel) {
  const node = section("Public Projection", "publication-projection");
  node.append(
    row("Projection type", viewModel.projection.modelType),
    row("Safe title", viewModel.projection.publicTitle),
    row("Safe media", viewModel.projection.safeMediaRefs),
    row("Seller representation", viewModel.projection.sellerRepresentationTypeSafeSummary),
    row("Contact Seller", viewModel.projection.contactSellerEnabled),
    row("Publish enabled", viewModel.projection.publishEnabled)
  );
  return node;
}

function renderPublicView(viewModel) {
  const node = section("View As Public", "publication-view-public");
  node.append(
    row("Mode", viewModel.viewAsPublic.mode),
    row("Property type", viewModel.viewAsPublic.projection.propertyType),
    row("Location", viewModel.viewAsPublic.projection.safeLocation),
    row("Asking Price", `${viewModel.viewAsPublic.projection.askingPrice} ${viewModel.viewAsPublic.projection.currency}`),
    row("Freshness", viewModel.viewAsPublic.projection.freshness),
    row("Internal fields visible", viewModel.viewAsPublic.internalFieldsVisible),
    row("Search indexed", viewModel.viewAsPublic.searchIndexed)
  );
  return node;
}

function renderReviewAndEffects(viewModel) {
  const review = section("Review Readiness", "publication-review");
  const proofButton = el("button", "add-property-primary-action", "GO TO LOCAL PUBLICATION PROOF");
  proofButton.type = "button";
  proofButton.dataset.executionEnabled = "false";
  proofButton.addEventListener("click", () => {
    window.location.hash = `#property-publication-proof?case=${viewModel.caseKey === "agent" ? "agent" : "owner"}`;
  });
  review.append(row("Review type", viewModel.reviewPayload.reviewType), row("Duplicate review queue", viewModel.reviewPayload.duplicateReviewQueueCreated), row("Publishes automatically", viewModel.reviewPayload.publishesAutomatically));
  review.append(proofButton);
  const guide = section("Blockers / Warnings / Lisa / Navigator", "publication-guide");
  guide.append(row("Readiness", viewModel.readiness.readinessStatus), row("Blockers", viewModel.readiness.blockers), row("Warnings", viewModel.readiness.warnings), row("Missing", viewModel.readiness.missingRequirements), row("Lisa", viewModel.lisaGuide.answer), row("Navigator route", viewModel.navigatorRouting.hash));
  const sideEffects = section("Side Effects", "publication-side-effects");
  sideEffects.append(
    row("publicationReadinessEvaluations", viewModel.publicationReadinessEvaluations),
    row("publicationPlansCreated", viewModel.publicationPlansCreated),
    row("publishActions", viewModel.publishActions),
    row("publicDiscoveryInsertions", viewModel.publicDiscoveryInsertions),
    row("listingMutations", viewModel.listingMutations),
    row("canonicalPropertyMutations", viewModel.canonicalPropertyMutations),
    row("ownershipMutations", viewModel.ownershipMutations),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return [review, guide, sideEffects];
}

export function renderPropertyPublicationReadinessUi(panel, inputHash = window.location.hash || "#property-sale-publication-readiness") {
  if (!panel) return;
  const viewModel = buildPublicationReadinessViewModel(parseHash(inputHash));
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-sale-publication-readiness";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.readinessStatus = viewModel.readiness.readinessStatus;
  panel.dataset.publicationReadinessEvaluations = String(viewModel.publicationReadinessEvaluations);
  panel.dataset.publicationPlansCreated = String(viewModel.publicationPlansCreated);
  panel.dataset.publishActions = String(viewModel.publishActions);
  panel.dataset.publicDiscoveryInsertions = String(viewModel.publicDiscoveryInsertions);
  panel.dataset.listingMutations = String(viewModel.listingMutations);
  panel.dataset.canonicalPropertyMutations = String(viewModel.canonicalPropertyMutations);
  panel.dataset.ownershipMutations = String(viewModel.ownershipMutations);
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);
  panel.dataset.marketplaceDiscoveryReady = String(viewModel.marketplaceDiscoveryReady);
  panel.dataset.actualDiscoveryInsertion = String(viewModel.actualDiscoveryInsertion);

  const shell = el("div", "add-property-shell property-publication-readiness-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "PUBLICATION READINESS ONLY"),
    el("h2", "", "SALE LISTING PUBLICATION PREFLIGHT"),
    el("p", "", viewModel.banner)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderProperty(viewModel),
    renderListing(viewModel),
    renderAuthority(viewModel),
    renderContent(viewModel),
    ...renderEvidencePriceMedia(viewModel),
    ...renderPolicy(viewModel),
    ...renderComplianceChannelPlan(viewModel),
    renderProjection(viewModel),
    renderPublicView(viewModel),
    ...renderReviewAndEffects(viewModel)
  );
  panel.append(shell);
}
