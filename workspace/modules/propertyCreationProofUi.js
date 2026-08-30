import {
  buildPropertyCreationViewModel
} from "../../src/property/index.js";

function el(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function row(label, value) {
  const node = el("div", "add-property-row");
  node.append(el("span", "", label), el("strong", "", Array.isArray(value) ? value.join(", ") : String(value ?? "Missing")));
  return node;
}

function section(title, testId = "") {
  const node = el("section", "add-property-section");
  if (testId) node.dataset.testid = testId;
  node.append(el("h3", "", title));
  return node;
}

function parseHash(hash = window.location.hash || "#property-creation-proof") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "owner" };
}

function navCase(caseKey) {
  window.location.hash = `#property-creation-proof?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Creation Cases", "property-creation-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner", "owner"],
    ["Existing match", "existingMatch"],
    ["Probable duplicate", "probableDuplicate"],
    ["Agent", "agent"],
    ["Manager", "manager"],
    ["Cleaner", "cleaner"],
    ["Developer X", "developer"],
    ["Developer Z", "developerZ"],
    ["No evidence", "noEvidence"],
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

function renderActor(viewModel) {
  const node = section("Actor / Relationship / Active Local Authority", "creation-actor");
  const source = viewModel.source;
  node.append(
    row("Actor", source.actor?.displayName || source.actor?.actorId || viewModel.intent.actorId),
    row("Relationship", source.relationship?.relationshipId || viewModel.intent.relationshipId),
    row("Relationship status", source.relationship?.relationshipStatus),
    row("Authority", source.authorityGrant?.authorityGrantId || viewModel.intent.authorityGrantId),
    row("Authority status", source.authorityGrant?.status),
    row("Authority actions", source.authorityGrant?.allowedActions || [])
  );
  return node;
}

function renderIntent(viewModel) {
  const node = section("Add Property Intent / Property Candidate", "creation-intent");
  const candidate = viewModel.intent.source.propertyCandidate;
  node.append(
    row("AddPropertyIntent", viewModel.intent.addPropertyIntentId),
    row("Candidate", viewModel.intent.propertyCandidateRef),
    row("Property type", viewModel.intent.propertyType),
    row("Location", [candidate.country, candidate.region, candidate.city, candidate.address || candidate.locationDescription].filter(Boolean).join(", ")),
    row("Hierarchy", JSON.stringify(viewModel.intent.hierarchyInput)),
    row("Evidence refs", viewModel.intent.evidenceRefs.map((item) => item.refId || item.evidenceRef || item))
  );
  return node;
}

function renderPreflight(viewModel) {
  const node = section("Duplicate / Preflight / Approval / Gateway", "creation-preflight");
  node.append(
    row("Identity check", viewModel.beforeState.existingCanonicalMatchResult),
    row("Existing Property", viewModel.beforeState.existingPropertyId || "NONE"),
    row("Preflight", viewModel.preflight.status),
    row("Approval", viewModel.approval.approvalStatus),
    row("Gateway", viewModel.gateway.status),
    row("Gateway allowed", viewModel.gateway.allowed)
  );
  return node;
}

function renderPlan(viewModel) {
  const node = section("Creation Plan / Before State", "creation-plan");
  node.append(
    row("Creates", viewModel.creationPlan.creates),
    row("Does not create", viewModel.creationPlan.doesNotCreate),
    row("Candidate fingerprint", viewModel.beforeState.candidateFingerprint),
    row("Repository count before", viewModel.beforeState.repositoryPropertyCount),
    row("Lifecycle count before", viewModel.beforeState.lifecycleCount)
  );
  return node;
}

function renderResult(viewModel) {
  const node = section("Created Property / Property ID / Passport / Verification", "creation-result");
  node.append(
    row("Execution", viewModel.result?.status || "NOT_RUN_BLOCKED"),
    row("Property ID", viewModel.result?.resultingPropertyId || "NOT_CREATED"),
    row("Property status", viewModel.result?.property?.currentStatus || "NONE"),
    row("Passport", viewModel.result?.passport?.ok ? "PASSPORT_GENERATED" : "NO_PASSPORT"),
    row("Listing count", viewModel.result?.passport?.passport?.publicView?.listingCount ?? 0),
    row("Verification", viewModel.result?.post?.status || "NOT_AVAILABLE"),
    row("Failed checks", viewModel.result?.post?.failedChecks || [])
  );
  return node;
}

function renderAudit(viewModel) {
  const node = section("Audit / Rollback / Side Effects", "creation-side-effects");
  node.append(
    row("History", viewModel.historyItem?.status || "NO_HISTORY"),
    row("Audit refs", viewModel.historyItem?.auditRefs || []),
    row("Idempotent repeat", viewModel.repeat?.status || "NOT_AVAILABLE"),
    row("Rollback", viewModel.rollback?.status || "NOT_AVAILABLE"),
    row("Rollback dependency guard", viewModel.rollbackDependencyGuard.status),
    row("localCanonicalPropertyCreations", viewModel.localCanonicalPropertyCreations),
    row("duplicatePropertyCreations", viewModel.duplicatePropertyCreations),
    row("unrelatedCanonicalPropertyMutations", viewModel.unrelatedCanonicalPropertyMutations),
    row("listingCreations", viewModel.listingCreations),
    row("listingMutations", viewModel.listingMutations),
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
  const node = section("Add Property / Lisa / Navigator", "creation-guide");
  node.append(
    row("Add Property status", viewModel.addPropertyIntegration.status),
    row("Add Property ID", viewModel.addPropertyIntegration.propertyId || "NONE"),
    row("Future actions", viewModel.addPropertyIntegration.nextFutureActions),
    row("Lisa", viewModel.lisaGuide.answer),
    row("Lisa may approve / execute", `${viewModel.lisaGuide.mayApprove} / ${viewModel.lisaGuide.mayExecute}`),
    row("Navigator route", viewModel.navigatorRouting.hash),
    row("Navigator may approve / execute", `${viewModel.navigatorRouting.navigatorCanApprove} / ${viewModel.navigatorRouting.navigatorCanExecute}`)
  );
  const button = el("button", viewModel.result?.ok ? "property-readonly-action" : "property-readonly-action disabled", viewModel.result?.ok ? "SELL PROPERTY" : "SELL PROPERTY - PROPERTY NOT CREATED");
  button.type = "button";
  button.disabled = !viewModel.result?.ok;
  button.dataset.executionEnabled = "false";
  button.addEventListener("click", () => {
    window.location.hash = "#property-sale-listing-proof?case=owner";
  });
  node.append(button);
  return node;
}

export function renderPropertyCreationProofUi(panel, inputHash = window.location.hash || "#property-creation-proof") {
  if (!panel) return;
  const viewModel = buildPropertyCreationViewModel(parseHash(inputHash));
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-creation-proof";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.preflightStatus = viewModel.preflight.status;
  panel.dataset.gatewayAllowed = String(viewModel.gateway.allowed);
  panel.dataset.localCanonicalPropertyCreations = String(viewModel.localCanonicalPropertyCreations);
  panel.dataset.duplicatePropertyCreations = String(viewModel.duplicatePropertyCreations);
  panel.dataset.listingCreations = String(viewModel.listingCreations);
  panel.dataset.listingMutations = String(viewModel.listingMutations);
  panel.dataset.ownershipMutations = String(viewModel.ownershipMutations);
  panel.dataset.publishActions = String(viewModel.publishActions);
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);

  const shell = el("div", "add-property-shell property-creation-proof-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "LOCAL CONTROLLED CANONICAL PROPERTY CREATION"),
    el("h2", "", "PROPERTY CREATION PROOF"),
    el("p", "", viewModel.banner)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderActor(viewModel),
    renderIntent(viewModel),
    renderPreflight(viewModel),
    renderPlan(viewModel),
    renderResult(viewModel),
    renderAudit(viewModel),
    renderGuide(viewModel)
  );
  panel.append(shell);
}
