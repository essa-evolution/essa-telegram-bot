import {
  buildPropertyMandateFlowViewModel
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

function parseMandateHash(hash = window.location.hash || "#property-mandate") {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return { flow: params.get("flow") || "owner-agent" };
}

function navigate(flow) {
  window.location.hash = `#property-mandate?flow=${flow}`;
}

function renderTabs(viewModel) {
  const section = el("section", "add-property-section add-property-tabs");
  section.append(el("h3", "", "Mandate draft scenarios"));
  const tabs = el("div", "add-property-tab-list");
  [
    ["Owner -> Agent", "owner-agent"],
    ["Missing evidence", "owner-agent-missing-evidence"],
    ["Owner -> Manager", "owner-manager"],
    ["Developer -> Representative", "developer-representative"],
    ["Developer out of scope", "developer-out-of-scope"],
    ["Temporary cleaning", "temporary-cleaning"],
    ["No escalation", "authority-escalation"],
    ["Expired", "expired"],
    ["Revoked", "revoked"]
  ].forEach(([label, flow]) => {
    const button = el("button", viewModel.flow === flow ? "active" : "", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => navigate(flow));
    tabs.append(button);
  });
  section.append(tabs);
  return section;
}

function renderSteps(viewModel) {
  const section = el("section", "add-property-section add-property-progress");
  section.append(el("h3", "", "Guided steps"));
  const list = el("ol");
  viewModel.steps.forEach((step) => list.append(el("li", "", step)));
  section.append(list);
  return section;
}

function renderRequest(viewModel) {
  const request = viewModel.request;
  const section = el("section", "add-property-section");
  section.dataset.testid = "mandate-request";
  section.append(el("h3", "", "Mandate request"));
  section.append(
    row("Status", viewModel.draft.eligibility.status),
    row("Mandate type", request.requestedMandateType),
    row("Grantor", request.grantorActorId || request.grantorOrganizationId),
    row("Grantee", request.granteeActorId || request.granteeOrganizationId),
    row("Property / Project", request.propertyId || request.propertyCandidateRef || request.projectId),
    row("Exclusivity", request.exclusivity),
    row("Signature", request.signatureStatus),
    row("Legal review", request.legalReviewStatus)
  );
  return section;
}

function renderScope(viewModel) {
  const request = viewModel.request;
  const section = el("section", "add-property-section");
  section.dataset.testid = "machine-readable-scope";
  section.append(el("h3", "", "Machine-readable scope"));
  section.append(
    row("Allowed", request.requestedActions),
    row("Denied", request.deniedActions),
    row("Validity", `${request.validFrom} -> ${request.validUntil}`),
    row("Jurisdiction", request.jurisdiction),
    row("Delegation", request.requestedScope.delegationAllowed ? "Allowed" : "Not granted")
  );
  return section;
}

function renderDraft(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "mandate-draft";
  section.append(el("h3", "", "Human-readable draft"));
  section.append(
    row("Title", viewModel.draft.document.title),
    row("Purpose", viewModel.draft.document.authorityPurpose),
    row("Disclaimer", viewModel.draft.document.disclaimer),
    row("Fingerprint", viewModel.draft.document.integrityMetadata.fingerprint)
  );
  const pre = el("pre", "identity-package-preview", viewModel.draft.markdown);
  section.append(pre);
  return section;
}

function renderProposedAuthority(viewModel) {
  const proposed = viewModel.draft.proposedAuthorityGrant;
  const section = el("section", "add-property-section");
  section.dataset.testid = "proposed-authority";
  section.append(el("h3", "", "Draft -> proposed AuthorityGrant"));
  section.append(
    row("Proposed status", proposed.proposedAuthorityStatus),
    row("Authority status", proposed.status),
    row("Active authority created", proposed.activeAuthorityCreated),
    row("Allowed", proposed.allowedActions),
    row("Denied", proposed.deniedActions)
  );
  return section;
}

function renderLisa(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "lisa-mandate-guide";
  section.append(el("h3", "", "Lisa mandate guide"));
  section.append(
    row("Can activate", viewModel.lisaExplanation.mayActivateAuthority),
    row("Can sign", viewModel.lisaExplanation.maySign),
    row("Answer", viewModel.lisaExplanation.answer)
  );
  return section;
}

function renderReturn(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "return-add-property";
  section.append(el("h3", "", "Return to Add Property"));
  section.append(
    row("Status", viewModel.returnToAddProperty.status),
    row("Authority", viewModel.returnToAddProperty.authorityStatus),
    row("Required next", viewModel.returnToAddProperty.requiredNext)
  );
  const button = el("button", "property-readonly-action", "Return to Add Property");
  button.type = "button";
  button.dataset.executionEnabled = "false";
  button.addEventListener("click", () => {
    window.location.hash = viewModel.returnToAddProperty.hash;
  });
  section.append(button);
  return section;
}

function renderBoundaries(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "mandate-side-effects";
  section.append(el("h3", "", "Boundaries"));
  section.append(
    row("canonicalPropertyMutation", viewModel.canonicalPropertyMutation),
    row("listingMutation", viewModel.listingMutation),
    row("ownershipMutation", viewModel.ownershipMutation),
    row("publishActions", viewModel.publishActions),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return section;
}

export function renderPropertyMandateUi(panel, inputHash = window.location.hash || "#property-mandate") {
  if (!panel) return;
  const route = parseMandateHash(inputHash);
  const viewModel = buildPropertyMandateFlowViewModel(route);
  panel.innerHTML = "";
  panel.dataset.currentRoute = "property-mandate";
  panel.dataset.eligibilityStatus = viewModel.draft.eligibility.status;
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations);
  panel.dataset.listingMutation = String(viewModel.listingMutation);
  panel.dataset.canonicalPropertyMutation = String(viewModel.canonicalPropertyMutation);

  const shell = el("div", "add-property-shell property-mandate-shell");
  const hero = el("section", "add-property-hero compact");
  hero.append(
    el("p", "add-property-kicker", "LOCAL / NON-LEGAL-EFFECT DRAFT"),
    el("h2", "", "PROPERTY MANDATE PREPARATION"),
    el("p", "", "Draft mandate scope, evidence and review readiness. Draft does not sign, verify legal sufficiency, publish or activate authority.")
  );
  shell.append(
    hero,
    renderTabs(viewModel),
    renderSteps(viewModel),
    renderRequest(viewModel),
    renderScope(viewModel),
    renderDraft(viewModel),
    renderProposedAuthority(viewModel),
    renderLisa(viewModel),
    renderReturn(viewModel),
    renderBoundaries(viewModel)
  );
  panel.append(shell);
}
