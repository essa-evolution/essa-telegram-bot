import {
  buildPropertyAuthorityActivationViewModel,
  buildPropertyMandateReviewViewModel
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

function parseReviewHash(hash = window.location.hash || "#property-mandate-review") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { case: params.get("case") || "ready" };
}

function navCase(caseKey) {
  window.location.hash = `#property-mandate-review?case=${caseKey}`;
}

function section(title, testId = "") {
  const node = el("section", "add-property-section");
  if (testId) node.dataset.testid = testId;
  node.append(el("h3", "", title));
  return node;
}

function renderTabs(viewModel) {
  const node = section("Private mandate review cases");
  const tabs = el("div", "add-property-tab-list");
  [
    ["Ready", "ready"],
    ["Missing evidence", "missingEvidence"],
    ["Owner-manager", "ownerManager"],
    ["Manager sale blocked", "escalation"],
    ["Developer", "developer"],
    ["Developer out of scope", "developerOutOfScope"],
    ["Temp cleaning", "tempCleaning"],
    ["V1/V2 diff", "v1"],
    ["Jurisdiction", "jurisdictionUnknown"],
    ["Legal review", "legalReview"],
    ["Signature ready", "signatureReady"],
    ["Expired", "expired"],
    ["Revoked", "revoked"],
    ["Conflict", "conflict"]
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

function renderSummary(viewModel) {
  const pkg = viewModel.package;
  const node = section("Case Summary", "mandate-review-case");
  node.append(
    row("Package", pkg.mandateReviewPackageId),
    row("Status", pkg.packageStatus),
    row("Mandate type", pkg.mandateType),
    row("Grantor", pkg.grantorActorId || pkg.grantorOrganizationId),
    row("Grantee", pkg.granteeActorId || pkg.granteeOrganizationId),
    row("Property / Project", pkg.propertyId || pkg.propertyCandidateRef || pkg.projectId),
    row("Review type", viewModel.queueAdapter.reviewType)
  );
  return node;
}

function renderScope(viewModel) {
  const pkg = viewModel.package;
  const node = section("Scope Review", "mandate-review-scope");
  node.append(
    row("Allowed Actions", pkg.allowedActions),
    row("Denied Actions", pkg.deniedActions),
    row("Authority Scope", JSON.stringify(pkg.authorityScope)),
    row("Grantor Authority", pkg.scopeWarnings.length ? "INSUFFICIENT_OR_SCOPE_WARNING" : "LOCAL_REVIEWABLE"),
    row("Delegation Warnings", pkg.delegationWarnings.map((item) => item.code || item)),
    row("Conflict Flags", pkg.conflictFlags.map((item) => item.code || item))
  );
  return node;
}

function renderEvidence(viewModel) {
  const pkg = viewModel.package;
  const node = section("Evidence / Missing Evidence", "mandate-review-evidence");
  node.append(
    row("Evidence refs", pkg.evidenceSummary.map((item) => item.evidenceRef)),
    row("Missing Evidence", pkg.missingEvidence),
    row("Evidence Request", viewModel.evidenceRequest.requestType),
    row("Private raw content exposed", pkg.evidenceSummary.some((item) => item.rawDocumentContentExposed))
  );
  return node;
}

function renderVersion(viewModel) {
  const pkg = viewModel.package;
  const diff = viewModel.versionDiff;
  const node = section("Draft Version / Version Diff", "mandate-review-version");
  node.append(
    row("Draft ID", pkg.mandateDraftId),
    row("Draft version", pkg.draftVersion),
    row("Fingerprint", pkg.draftFingerprint),
    row("Actions added", diff.actionsAdded),
    row("Actions removed", diff.actionsRemoved),
    row("Scope changed", diff.scopeChanged),
    row("Validity changed", diff.validityChanged),
    row("Re-review required if changed", true)
  );
  return node;
}

function renderReadiness(viewModel) {
  const pkg = viewModel.package;
  const node = section("Jurisdiction / Legal / Signature", "mandate-review-readiness");
  node.append(
    row("Jurisdiction", pkg.jurisdictionContext),
    row("Signature Readiness", viewModel.outcome.signatureReadiness),
    row("Legal Review", pkg.legalReviewStatus),
    row("Legal Handoff", viewModel.legalHandoff.status),
    row("Authority Activation", viewModel.outcome.authorityActivationStatus)
  );
  return node;
}

function renderOutcome(viewModel) {
  const outcome = viewModel.outcome;
  const node = section("Review Outcome", "mandate-review-outcome");
  node.append(
    row("Outcome", outcome.outcomeType),
    row("Reason Codes", outcome.reasonCodes),
    row("Pinned Draft", `${outcome.mandateDraftId} / ${outcome.draftVersion}`),
    row("Pinned Fingerprint", outcome.draftFingerprint),
    row("Proposed AuthorityGrant", outcome.proposedAuthorityGrantStatus),
    row("Warnings", outcome.warningsAcknowledged)
  );
  const actions = el("div", "add-property-tab-list");
  [
    "Start Review",
    "Request More Evidence",
    "Request Draft Revision",
    "Mark Scope Reduction Required",
    "Mark Jurisdiction Review Required",
    "Mark Legal Review Required",
    "Record READY_FOR_FUTURE_SIGNATURE",
    "Reject Local Review",
    "Cancel Review"
  ].forEach((label) => {
    const button = el("button", "", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    actions.append(button);
  });
  node.append(actions);
  return node;
}

function renderTimeline(viewModel) {
  const node = section("Audit Timeline", "mandate-review-audit");
  const events = [
    ...viewModel.package.auditMetadata.audit,
    ...viewModel.assignment.auditMetadata.audit,
    ...viewModel.evidenceRequest.auditMetadata.audit,
    ...viewModel.outcome.auditMetadata.audit
  ].map((item) => item.eventType);
  node.append(row("Events", events));
  return node;
}

function renderGuides(viewModel) {
  const node = section("Lisa / Navigator / Add Property");
  const activationCaseByReviewCase = {
    ready: "agent",
    signatureReady: "agent",
    ownerManager: "manager",
    escalation: "escalation",
    developer: "developer",
    tempCleaning: "tempCleaning",
    developerOutOfScope: "developerZ",
    jurisdictionUnknown: "jurisdiction",
    legalReview: "legal",
    expired: "expired",
    revoked: "revoked"
  };
  const activationView = buildPropertyAuthorityActivationViewModel({
    case: activationCaseByReviewCase[viewModel.caseKey] || "agent"
  });
  const handoff = el("div", "add-property-tab-list");
  const button = el(
    "button",
    activationView.preflight.ok ? "" : "disabled",
    activationView.preflight.ok ? "PREPARE LOCAL AUTHORITY ACTIVATION PROOF" : `ACTIVATION BLOCKED: ${activationView.preflight.status}`
  );
  button.type = "button";
  button.dataset.executionEnabled = "false";
  button.disabled = !activationView.preflight.ok;
  button.addEventListener("click", () => {
    window.location.hash = `#property-authority-activation?case=${activationView.caseKey}`;
  });
  handoff.append(button);
  node.append(
    row("Lisa", viewModel.lisaGuide.answer),
    row("Navigator route", viewModel.navigatorRouting.hash),
    row("Add Property status", viewModel.addPropertyReturn.status),
    row("Authority", viewModel.addPropertyReturn.authorityStatus),
    row("Snapshot compatible", viewModel.workflowSnapshotCompatible),
    row("Activation preflight", activationView.preflight.status)
  );
  node.append(handoff);
  return node;
}

function renderBoundaries(viewModel) {
  const node = section("Boundaries", "mandate-review-boundaries");
  node.append(
    row("canonicalPropertyMutation", viewModel.canonicalPropertyMutation),
    row("listingMutation", viewModel.listingMutation),
    row("ownershipMutation", viewModel.ownershipMutation),
    row("authorityActivationActions", viewModel.authorityActivationActions),
    row("publishActions", viewModel.publishActions),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return node;
}

export function renderPropertyMandateReviewUi(panel, inputHash = window.location.hash || "#property-mandate-review") {
  if (!panel) return;
  const route = parseReviewHash(inputHash);
  const viewModel = buildPropertyMandateReviewViewModel(route);
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-mandate-review";
  panel.dataset.packageStatus = viewModel.package.packageStatus;
  panel.dataset.outcomeType = viewModel.outcome.outcomeType;
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);
  panel.dataset.listingMutation = String(viewModel.listingMutation);
  panel.dataset.canonicalPropertyMutation = String(viewModel.canonicalPropertyMutation);
  panel.dataset.authorityActivationActions = String(viewModel.authorityActivationActions);

  const shell = el("div", "add-property-shell property-mandate-review-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "INTERNAL / PRIVATE / LOCAL REVIEW PROOF"),
    el("h2", "", "PROPERTY MANDATE REVIEW"),
    el("p", "", "Review mandate preparation and record bounded outcome. Review does not sign, prove legal validity, publish, or activate AuthorityGrant.")
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderSummary(viewModel),
    renderScope(viewModel),
    renderEvidence(viewModel),
    renderVersion(viewModel),
    renderReadiness(viewModel),
    renderOutcome(viewModel),
    renderTimeline(viewModel),
    renderGuides(viewModel),
    renderBoundaries(viewModel)
  );
  panel.append(shell);
}
