import {
  buildPropertyAuthorityActivationViewModel
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

function parseActivationHash(hash = window.location.hash || "#property-authority-activation") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "agent" };
}

function navCase(caseKey) {
  window.location.hash = `#property-authority-activation?case=${caseKey}`;
}

function renderTabs(viewModel) {
  const node = section("Activation Cases", "authority-activation-cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Agent local", "agent"],
    ["Unsigned", "unsigned"],
    ["V1/V2 mismatch", "versionMismatch"],
    ["Manager", "manager"],
    ["Manager sale", "escalation"],
    ["Developer X", "developer"],
    ["Developer Z", "developerZ"],
    ["Temp cleaning", "tempCleaning"],
    ["Unknown jurisdiction", "jurisdiction"],
    ["Legal review", "legal"],
    ["Expired", "expired"],
    ["Revoked", "revoked"]
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

function renderCandidate(viewModel) {
  const intent = viewModel.intent;
  const node = section("Authority Candidate", "authority-candidate");
  node.append(
    row("Activation Intent", intent.activationIntentId),
    row("Action", intent.actionType),
    row("AuthorityGrant", intent.authorityGrantId),
    row("Grantor", intent.grantorActorId),
    row("Grantee", intent.granteeActorId),
    row("Property / Project", intent.propertyId || intent.propertyCandidateRef || intent.projectId),
    row("Authority type", intent.authorityType)
  );
  return node;
}

function renderMandate(viewModel) {
  const intent = viewModel.intent;
  const node = section("Mandate Version / Review Outcome", "authority-mandate-version");
  node.append(
    row("Draft", intent.mandateDraftId),
    row("Version", intent.mandateDraftVersion),
    row("Fingerprint", intent.mandateDraftFingerprint),
    row("Review Package", intent.mandateReviewPackageId),
    row("Review Outcome", intent.mandateReviewOutcomeId),
    row("Preflight", viewModel.preflight.status)
  );
  return node;
}

function renderReadiness(viewModel) {
  const intent = viewModel.intent;
  const node = section("Signature / Jurisdiction / Legal Readiness", "authority-readiness");
  node.append(
    row("Signature Readiness", intent.signatureReadiness),
    row("Jurisdiction Readiness", intent.jurisdictionReadiness),
    row("Legal Review Readiness", intent.legalReviewReadiness),
    row("Jurisdiction", intent.jurisdiction),
    row("Blockers", viewModel.preflight.reasons)
  );
  return node;
}

function renderScope(viewModel) {
  const intent = viewModel.intent;
  const node = section("Scope / Allowed / Denied Actions", "authority-scope");
  node.append(
    row("Scope", JSON.stringify(intent.authorityScope)),
    row("Allowed Actions", intent.allowedActions),
    row("Denied Actions", intent.deniedActions),
    row("Valid From", intent.validFrom),
    row("Valid Until", intent.validUntil)
  );
  return node;
}

function renderPreflight(viewModel) {
  const node = section("Preflight / Gateway / Approval", "authority-preflight");
  node.append(
    row("Preflight OK", viewModel.preflight.ok),
    row("Gateway", viewModel.gateway.status),
    row("Gateway allowed", viewModel.gateway.allowed),
    row("Approval", viewModel.approval.approvalStatus),
    row("Exact approval scope", viewModel.approval.exactScope),
    row("Lisa / Navigator / Provider can approve", `${viewModel.approval.lisaCanApprove} / ${viewModel.approval.navigatorCanApprove} / ${viewModel.approval.providerCanApprove}`)
  );
  return node;
}

function renderStates(viewModel) {
  const node = section("Before / After / Verification", "authority-before-after");
  node.append(
    row("Preview before", viewModel.preview.beforeState),
    row("Preview after", viewModel.preview.afterState),
    row("Execution result", viewModel.result?.status || "NOT_RUN_BLOCKED"),
    row("After authority", viewModel.result?.afterAuthority?.status || "NONE"),
    row("Verification", viewModel.result?.post?.status || "NOT_AVAILABLE"),
    row("Idempotent repeat", viewModel.repeat?.status || "NOT_AVAILABLE"),
    row("Add Property sees", viewModel.addPropertyIntegration.status)
  );
  return node;
}

function renderBoundaries(viewModel) {
  const node = section("Rollback / Audit / Side Effects", "authority-side-effects");
  node.append(
    row("Rollback", viewModel.rollback?.status || "NOT_AVAILABLE"),
    row("History", viewModel.historyItem?.status || "NO_HISTORY"),
    row("Audit Events", viewModel.historyItem?.auditEvents || []),
    row("localAuthorityActivationMutations", viewModel.localAuthorityActivationMutations),
    row("unrelatedAuthorityMutations", viewModel.unrelatedAuthorityMutations),
    row("canonicalPropertyMutation", viewModel.canonicalPropertyMutation),
    row("listingMutation", viewModel.listingMutation),
    row("ownershipMutation", viewModel.ownershipMutation),
    row("publishActions", viewModel.publishActions),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return node;
}

function renderGuide(viewModel) {
  const node = section("Lisa / Navigator Boundary", "authority-guide");
  node.append(
    row("Lisa explanation", viewModel.lisaGuide.answer),
    row("Lisa may approve / execute", `${viewModel.lisaGuide.mayApprove} / ${viewModel.lisaGuide.mayExecute}`),
    row("Navigator route", viewModel.navigatorRouting.hash),
    row("Navigator may approve / execute", `${viewModel.navigatorRouting.navigatorCanApprove} / ${viewModel.navigatorRouting.navigatorCanExecute}`),
    row("Public leakage", JSON.stringify(viewModel.publicSafeBoundary))
  );
  return node;
}

export function renderPropertyAuthorityActivationUi(panel, inputHash = window.location.hash || "#property-authority-activation") {
  if (!panel) return;
  const route = parseActivationHash(inputHash);
  const viewModel = buildPropertyAuthorityActivationViewModel(route);
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-authority-activation";
  panel.dataset.caseKey = viewModel.caseKey;
  panel.dataset.preflightStatus = viewModel.preflight.status;
  panel.dataset.gatewayAllowed = String(viewModel.gateway.allowed);
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);
  panel.dataset.listingMutation = String(viewModel.listingMutation);
  panel.dataset.canonicalPropertyMutation = String(viewModel.canonicalPropertyMutation);
  panel.dataset.localAuthorityActivationMutations = String(viewModel.localAuthorityActivationMutations);

  const shell = el("div", "add-property-shell property-authority-activation-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "INTERNAL / LOCAL PROOF / EXPLICIT HUMAN APPROVAL REQUIRED"),
    el("h2", "", "PROPERTY AUTHORITY ACTIVATION PREFLIGHT"),
    el("p", "", viewModel.banner)
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderCandidate(viewModel),
    renderMandate(viewModel),
    renderReadiness(viewModel),
    renderScope(viewModel),
    renderPreflight(viewModel),
    renderStates(viewModel),
    renderBoundaries(viewModel),
    renderGuide(viewModel)
  );
  panel.append(shell);
}
