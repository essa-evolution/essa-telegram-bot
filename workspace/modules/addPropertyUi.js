import {
  addPropertyFlowTypes,
  addPropertyReadinessStatuses,
  buildAddPropertyHash,
  buildPropertyCreationViewModel,
  buildGuidedAddPropertyViewModel,
  parseAddPropertyHash
} from "../../src/property/index.js";

function el(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function valueText(value) {
  if (value == null || value === "") return "Missing";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function row(label, value, testId = "") {
  const node = el("div", "add-property-row");
  if (testId) node.dataset.testid = testId;
  node.append(el("span", "", label), el("strong", "", valueText(value)));
  return node;
}

function badge(value) {
  const tone = value === addPropertyReadinessStatuses.readyForLocalReview
    ? "ready"
    : value === addPropertyReadinessStatuses.blockedScope || value === addPropertyReadinessStatuses.blocked
      ? "blocked"
      : value === addPropertyReadinessStatuses.notActiveYet
        ? "future"
        : "review";
  return el("span", `add-property-badge tone-${tone}`, value);
}

function navigate(params) {
  window.location.hash = buildAddPropertyHash(params);
}

function renderEntry(viewModel) {
  const shell = el("div", "add-property-shell");
  const hero = el("section", "add-property-hero");
  hero.append(
    el("p", "add-property-kicker", "LOCAL / GUIDED PROOF"),
    el("h2", "", viewModel.title),
    el("p", "", viewModel.entryMessage)
  );

  const grid = el("div", "add-property-choice-grid");
  viewModel.actorChoices.forEach((choice) => {
    const button = el("button", "add-property-choice", choice.label);
    button.type = "button";
    button.dataset.flow = choice.flow;
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => navigate({ flow: choice.flow, step: "about_you" }));
    grid.append(button);
  });

  const principle = el("section", "add-property-section");
  principle.append(
    el("h3", "", "Guided trust workflow"),
    el("p", "", "ACTOR -> ORGANIZATION -> RELATIONSHIP -> AUTHORITY -> PROPERTY / CANDIDATE -> INTENT -> EVIDENCE -> ELIGIBILITY -> REVIEW READINESS"),
    row("Listings created", "0", "listing-mutation"),
    row("Canonical Property mutations", "0", "canonical-property-mutation")
  );

  shell.append(hero, grid, principle);
  return shell;
}

function renderProgress(viewModel) {
  const section = el("section", "add-property-section add-property-progress");
  section.append(el("h3", "", "Progress"));
  const list = el("ol", "");
  viewModel.progress.forEach((step) => {
    const item = el("li", step.current ? "current" : "", step.label);
    item.dataset.step = step.step;
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderScenarioTabs(viewModel) {
  const section = el("section", "add-property-section add-property-tabs");
  section.append(el("h3", "", "Branch"));
  const options = [
    ["Owner", addPropertyFlowTypes.owner, ""],
    ["Owner no evidence", addPropertyFlowTypes.owner, "missing-evidence"],
    ["Developer", addPropertyFlowTypes.developer, ""],
    ["Developer out of scope", addPropertyFlowTypes.developer, "out-of-scope"],
    ["Agent", addPropertyFlowTypes.agent, ""],
    ["Agent no mandate", addPropertyFlowTypes.agent, "missing-mandate"],
    ["Manager", addPropertyFlowTypes.manager, ""],
    ["Manager sale", addPropertyFlowTypes.manager, "sale"],
    ["Representative", addPropertyFlowTypes.authorizedRepresentative, ""],
    ["Service provider", addPropertyFlowTypes.serviceProvider, ""],
    ["Not sure", addPropertyFlowTypes.unsure, ""]
  ];
  const controls = el("div", "add-property-tab-list");
  options.forEach(([label, flow, scenario]) => {
    const button = el("button", flow === viewModel.flow && scenario === viewModel.route.scenario ? "active" : "", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", () => navigate({ flow, scenario, step: "review_readiness" }));
    controls.append(button);
  });
  section.append(controls);
  return section;
}

function renderCurrentPath(viewModel) {
  const section = el("section", "add-property-section add-property-readiness");
  section.dataset.testid = "readiness-panel";
  section.append(el("h3", "", "Your current path"), badge(viewModel.readinessStatus));
  const path = viewModel.currentPath || {};
  section.append(
    row("Actor", path.actor),
    row("Organization", path.organization),
    row("Relationship", path.relationship),
    row("Property", path.property),
    row("Project", path.project || "Not applicable"),
    row("Building", path.building || "Not applicable"),
    row("Intent", path.intent),
    row("Authority", path.authority),
    row("Missing", safeJoin(path.missing), "missing-requirements"),
    row("Next step", path.nextStep, "next-step")
  );
  return section;
}

function safeJoin(items) {
  if (!Array.isArray(items)) return valueText(items);
  return items.length ? items.join(", ") : "None";
}

function renderQuestions(viewModel) {
  const section = el("section", "add-property-section");
  section.append(el("h3", "", "Authority questions"));
  const list = el("ul", "add-property-list");
  (viewModel.questionEngine?.selectedQuestions || []).forEach((question) => {
    list.append(el("li", "", question));
  });
  section.append(list);
  return section;
}

function renderEvidence(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "privacy-safe-evidence";
  section.append(el("h3", "", "Evidence"));
  const items = viewModel.currentPath?.evidence || [];
  if (!items.length) {
    section.append(el("p", "", "NO AUTHORITY DOCUMENT / MANDATE YET"));
    return section;
  }
  items.forEach((item) => {
    section.append(row("Evidence ref", item.evidenceRef));
    section.append(row("Verification state", item.verificationState));
    section.append(row("Protected", item.protected ? "Protected; private document content is not rendered" : "No"));
  });
  return section;
}

function renderLisa(viewModel) {
  const section = el("section", "add-property-section add-property-lisa");
  section.dataset.testid = "lisa-explanation";
  section.append(el("h3", "", "Ask Lisa"));
  section.append(el("p", "", viewModel.lisaExplanation || "Lisa explains the current authority readiness without approving or verifying it."));
  const prompts = el("div", "add-property-prompt-list");
  (viewModel.lisaPrompts || [
    "Why do you need this document?",
    "What happens after review?"
  ]).forEach((prompt) => prompts.append(el("button", "", prompt)));
  prompts.querySelectorAll("button").forEach((button) => {
    button.type = "button";
    button.dataset.executionEnabled = "false";
  });
  section.append(prompts);
  return section;
}

function renderFutureMandate(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "future-mandate";
  section.append(el("h3", "", "Future mandate readiness"));
  const future = viewModel.futureMandate || {};
  section.append(
    row("Action", future.label || "CREATE / REQUEST ESSA MANDATE"),
    row("Status", future.status || "NOT_ACTIVE_YET"),
    row("Category", future.category || "Other structured authority")
  );
  const button = el("button", "property-readonly-action", future.label || "CREATE / REQUEST ESSA MANDATE");
  button.type = "button";
  button.disabled = false;
  button.dataset.executionEnabled = "false";
  button.addEventListener("click", () => {
    const flow = viewModel.flow === "manager"
      ? "owner-manager"
      : viewModel.flow === "developer"
        ? "developer-representative"
        : viewModel.flow === "service_provider"
          ? "temporary-cleaning"
          : "owner-agent";
    window.location.hash = `#property-mandate?flow=${flow}`;
  });
  section.append(button);
  return section;
}

function renderReviewPreview(viewModel) {
  const section = el("section", "add-property-section add-property-review-preview");
  section.dataset.testid = "review-preview";
  section.append(el("h3", "", viewModel.reviewPreview?.ready ? "Ready for ESSA review." : "Review readiness preview"));
  const preview = viewModel.reviewPreview || {};
  section.append(
    row("Actor claim", preview.actorClaim),
    row("Organization", preview.organization || viewModel.currentPath?.organization),
    row("Relationship", preview.relationship || viewModel.currentPath?.relationship),
    row("Intended action", preview.intendedAction || viewModel.currentPath?.intent),
    row("Jurisdiction", preview.jurisdictionStatus || "UNKNOWN"),
    row("Warnings", safeJoin(preview.warnings || ["Preview only. No auto-approval."]))
  );
  return section;
}

function renderPropertyCreationHandoff(viewModel) {
  const section = el("section", "add-property-section");
  section.dataset.testid = "property-creation-handoff";
  section.append(el("h3", "", "Canonical Property creation"));
  const caseKey = viewModel.flow === addPropertyFlowTypes.developer && viewModel.route.scenario === "out-of-scope"
    ? "developerZ"
    : viewModel.flow === addPropertyFlowTypes.developer
      ? "developer"
      : viewModel.flow === addPropertyFlowTypes.agent
        ? "agent"
        : viewModel.flow === addPropertyFlowTypes.manager
          ? "manager"
          : viewModel.flow === addPropertyFlowTypes.serviceProvider
            ? "cleaner"
            : viewModel.flow === addPropertyFlowTypes.owner && viewModel.route.scenario === "missing-evidence"
              ? "noEvidence"
              : "owner";
  const creation = buildPropertyCreationViewModel({ case: caseKey });
  const eligible = creation.preflight.ok;
  section.append(
    row("Creation readiness", eligible ? "READY_FOR_NEXT_CONTROLLED_PROPERTY_STEP" : creation.preflight.status),
    row("After success", eligible ? `PROPERTY_CREATED_LOCAL_PROOF / Property ID: ${creation.result?.resultingPropertyId}` : "NOT_CREATED"),
    row("Future actions", "CREATE LISTING - NOT ACTIVE IN 23F / MANAGE PROPERTY - FUTURE / PROMOTE - FUTURE")
  );
  const button = el("button", eligible ? "property-readonly-action" : "property-readonly-action disabled", eligible ? "PREPARE CANONICAL PROPERTY CREATION" : `CREATION BLOCKED: ${creation.preflight.status}`);
  button.type = "button";
  button.disabled = !eligible;
  button.dataset.executionEnabled = "false";
  button.addEventListener("click", () => {
    window.location.hash = `#property-creation-proof?case=${caseKey}`;
  });
  section.append(button);
  return section;
}

function renderBoundaries(viewModel) {
  const section = el("section", "add-property-section add-property-boundaries");
  section.dataset.testid = "side-effect-counters";
  section.append(el("h3", "", "Boundaries"));
  section.append(
    row("canonicalPropertyMutation", viewModel.canonicalPropertyMutation),
    row("listingMutation", viewModel.listingMutation),
    row("ownershipMutation", viewModel.ownershipMutation),
    row("quarantineMutation", viewModel.quarantineMutation),
    row("publishActions", viewModel.publishActions),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("productionDbMutations", viewModel.productionDbMutations),
    row("payment / booking / transaction", `${viewModel.paymentActions} / ${viewModel.bookingActions} / ${viewModel.commercialTransactionActions}`)
  );
  return section;
}

function renderServiceProvider(viewModel) {
  const shell = el("div", "add-property-shell");
  shell.append(renderScenarioTabs(viewModel), renderProgress(viewModel));
  const section = el("section", "add-property-section add-property-service-provider");
  section.dataset.testid = "service-provider-separation";
  section.append(
    el("h3", "", "Service Provider Partner Flow - Future"),
    el("p", "", viewModel.serviceProviderMessage),
    row("Relationship", viewModel.currentPath.relationship),
    row("Authority", viewModel.currentPath.authority),
    row("Next step", viewModel.currentPath.nextStep)
  );
  shell.append(section, renderQuestions(viewModel), renderLisa(viewModel), renderFutureMandate(viewModel), renderPropertyCreationHandoff(viewModel), renderBoundaries(viewModel));
  return shell;
}

function renderGuided(viewModel) {
  if (viewModel.flow === addPropertyFlowTypes.serviceProvider) return renderServiceProvider(viewModel);
  const shell = el("div", "add-property-shell");
  const header = el("section", "add-property-hero compact");
  header.append(
    el("p", "add-property-kicker", "LOCAL / GUIDED PROOF"),
    el("h2", "", viewModel.title),
    el("p", "", viewModel.entryMessage)
  );
  if (viewModel.flow === addPropertyFlowTypes.unsure) {
    const note = el("p", "add-property-suggested-path", "Suggested path - authority not verified.");
    note.dataset.testid = "unsure-suggestion";
    header.append(note);
  }
  shell.append(
    header,
    renderScenarioTabs(viewModel),
    renderProgress(viewModel),
    renderCurrentPath(viewModel),
    renderQuestions(viewModel),
    renderEvidence(viewModel),
    renderLisa(viewModel),
    renderFutureMandate(viewModel),
    renderReviewPreview(viewModel),
    renderPropertyCreationHandoff(viewModel),
    renderBoundaries(viewModel)
  );
  return shell;
}

export function renderAddPropertyUi(panel, inputHash = window.location.hash || "#add-property") {
  if (!panel) return;
  const route = parseAddPropertyHash(inputHash);
  const viewModel = buildGuidedAddPropertyViewModel(route);
  panel.innerHTML = "";
  panel.dataset.currentRoute = "add-property";
  panel.dataset.readinessStatus = viewModel.readinessStatus || "ENTRY";
  panel.dataset.providerCalls = String(viewModel.providerCalls || 0);
  panel.dataset.externalCalls = String(viewModel.externalCalls || 0);
  panel.dataset.productionDbMutations = String(viewModel.productionDbMutations || 0);
  panel.dataset.listingMutation = String(viewModel.listingMutation || 0);
  panel.dataset.canonicalPropertyMutation = String(viewModel.canonicalPropertyMutation || 0);
  panel.append(viewModel.mode === "entry" ? renderEntry(viewModel) : renderGuided(viewModel));
}
