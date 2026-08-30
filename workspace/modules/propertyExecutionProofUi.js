import {
  buildPropertyExecutionProofFixtures,
  createLisaPropertyExecutionExplanation,
  createLocalPropertyExecutionStore,
  createPropertyExecutionIntent,
  createPropertyExecutionPreview,
  executePropertyExecutionIntentThroughGateway,
  createPropertyExecutionHistoryViewModel,
  preflightPropertyExecutionIntent,
  propertyExecutionActionTypes,
  rollbackPropertyExecutionLocalProof
} from "../../src/property/index.js";

let localState = null;

function el(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function valueText(value) {
  if (value == null || value === "") return "MISSING";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function row(label, value) {
  const node = el("div", "property-ingestion-row");
  node.append(el("span", "", label), el("strong", "", valueText(value)));
  return node;
}

function section(title, className = "") {
  const node = el("section", `property-ingestion-section property-execution-proof-section ${className}`.trim());
  node.append(el("h3", "", title));
  return node;
}

function createState() {
  const fixtures = buildPropertyExecutionProofFixtures();
  const created = createPropertyExecutionIntent({ item: fixtures.item });
  const store = createLocalPropertyExecutionStore({ item: fixtures.item });
  return {
    item: fixtures.item,
    intent: created.intent,
    store,
    preview: createPropertyExecutionPreview(created.intent),
    preflight: null,
    executionResult: null,
    idempotencyResult: null,
    rollbackResult: null,
    failureResult: null,
    mismatchResult: fixtures.mismatch,
    aiApproval: fixtures.aiApproval,
    lastAction: "Intent draft prepared locally."
  };
}

function state() {
  if (!localState) localState = createState();
  return localState;
}

function renderActions(panel) {
  const node = section("Local Proof Actions", "property-execution-actions");
  const actions = el("div", "property-readonly-actions");
  const specs = [
    ["Create Intent", () => {
      localState = createState();
      state().lastAction = "PROPERTY_EXECUTION_INTENT_CREATED";
      renderPropertyExecutionProofUi(panel);
    }],
    ["Run Preflight", () => {
      const current = state();
      current.preflight = preflightPropertyExecutionIntent(current.intent, { store: current.store });
      current.lastAction = current.preflight.status || current.preflight.preflightStatus;
      renderPropertyExecutionProofUi(panel);
    }],
    ["Approve + Execute via Gateway", () => {
      const current = state();
      current.executionResult = executePropertyExecutionIntentThroughGateway({ intent: current.intent, store: current.store });
      current.preflight = current.executionResult.preflight || current.preflight;
      current.lastAction = current.executionResult.status;
      renderPropertyExecutionProofUi(panel);
    }],
    ["Run Again Idempotency", () => {
      const current = state();
      current.idempotencyResult = executePropertyExecutionIntentThroughGateway({ intent: current.intent, store: current.store });
      current.lastAction = current.idempotencyResult.status;
      renderPropertyExecutionProofUi(panel);
    }],
    ["Rollback Local Association", () => {
      const current = state();
      const recordId = current.executionResult?.executionRecord?.executionRecordId;
      current.rollbackResult = rollbackPropertyExecutionLocalProof({ executionRecordId: recordId, store: current.store });
      current.lastAction = current.rollbackResult.status;
      renderPropertyExecutionProofUi(panel);
    }],
    ["Show Failure Safety", () => {
      const current = state();
      const failureStore = createLocalPropertyExecutionStore({ item: current.item });
      current.failureResult = executePropertyExecutionIntentThroughGateway({ intent: current.intent, store: failureStore, failAfterCommit: true });
      current.lastAction = current.failureResult.status;
      renderPropertyExecutionProofUi(panel);
    }],
    ["Show State Mismatch Block", () => {
      const current = state();
      current.lastAction = current.mismatchResult.status;
      renderPropertyExecutionProofUi(panel);
    }]
  ];
  specs.forEach(([label, onClick]) => {
    const button = el("button", "property-readonly-action", label);
    button.type = "button";
    button.dataset.executionGatewayRequired = "true";
    button.addEventListener("click", onClick);
    actions.append(button);
  });
  node.append(actions);
  return node;
}

export function renderPropertyExecutionProofUi(panel) {
  if (!panel) return null;
  const current = state();
  const counters = current.store.counters();
  panel.hidden = false;
  panel.dataset.currentMode = "property-execution-proof";
  panel.dataset.accessBoundary = "INTERNAL / ADMIN / LOCAL CONTROLLED EXECUTION PROOF";
  panel.dataset.providerCalls = "0";
  panel.dataset.externalCalls = "0";
  panel.dataset.productionDbMutations = "0";
  panel.dataset.localApprovedAssociationMutations = String(counters.localApprovedAssociationMutations);
  panel.innerHTML = "";
  const lisa = createLisaPropertyExecutionExplanation({
    intent: current.intent,
    preflight: current.preflight,
    executionResult: current.executionResult,
    rollbackResult: current.rollbackResult,
    approval: current.executionResult?.approval
  });
  const header = section("ESSA Property Controlled Execution Proof", "property-execution-header");
  header.append(
    row("banner", "LOCAL CONTROLLED EXECUTION PROOF"),
    row("safety", "NO PRODUCTION WRITE / NO PROVIDER EXECUTION / NO DATABASE EXECUTION"),
    row("onlyAllowedAction", propertyExecutionActionTypes.applyConfirmedExactMatch),
    row("route", "#property-execution-proof"),
    row("Navigator routing", "approved review case -> Property execution intent flow"),
    row("lastAction", current.lastAction)
  );
  const intent = section("Property Execution Intent", "property-execution-intent");
  intent.append(
    row("modelType", current.intent.modelType),
    row("executionIntentId", current.intent.executionIntentId),
    row("actionType", current.intent.actionType),
    row("ingestionId", current.intent.ingestionId),
    row("sourceRecordId", current.intent.sourceRecordId),
    row("reviewerDecisionId", current.intent.reviewerDecisionId),
    row("reviewCasePackageId", current.intent.reviewCasePackageId),
    row("canonicalPropertyId", current.intent.canonicalPropertyId),
    row("idempotencyKey", current.intent.idempotencyKey),
    row("approvalStatus", current.executionResult?.approval ? "APPROVED_BY_LOCAL_HUMAN" : current.intent.approvalStatus),
    row("executionStatus", current.rollbackResult?.status || current.idempotencyResult?.status || current.executionResult?.status || current.intent.executionStatus)
  );
  const preview = section("Execution Preview", "property-execution-preview");
  preview.append(row("Action", current.preview.action), row("Will Change", current.preview.willChange), row("Will NOT Change", current.preview.willNotChange), row("Rollback", current.preview.rollback));
  const gateway = section("Preflight / Approval / Gateway", "property-execution-gateway");
  gateway.append(row("preflight", current.preflight || "NOT_RUN"), row("approvalBoundary", "Explicit local human approval only; Lisa/Navigator/provider/model cannot approve."), row("aiProviderApprovalAttempt", current.aiApproval), row("gatewayResult", current.executionResult?.gateway || "NOT_RUN"), row("approvalTokenScoped", Boolean(current.executionResult?.approval?.approvalToken)));
  const commit = section("Local Atomic Commit", "property-execution-commit");
  commit.append(row("beforeAfterDiff", current.executionResult?.beforeAfterDiff || "NOT_COMMITTED"), row("verification", current.executionResult?.executionRecord?.verification || "NOT_VERIFIED"), row("idempotency", current.idempotencyResult || "NOT_RUN"), row("stateMismatchProtection", current.mismatchResult.status), row("failureSafety", current.failureResult || "NOT_RUN"), row("rollback", current.rollbackResult || "NOT_RUN"));
  const audit = section("Execution Audit", "property-execution-audit");
  audit.append(row("auditTimeline", current.store.auditEvents()), row("decisionPackageLinkage", { decisionId: current.intent.reviewerDecisionId, executionIntentId: current.intent.executionIntentId, executionRecordId: current.executionResult?.executionRecord?.executionRecordId || null, packageId: current.intent.reviewCasePackageId }));
  const safety = section("Immutability / Side Effects", "property-execution-safety");
  safety.append(row("localApprovedAssociationMutations", counters.localApprovedAssociationMutations), row("unrelatedCanonicalPropertyMutations", counters.unrelatedCanonicalPropertyMutations), row("ownershipMutations", counters.ownershipMutations), row("listingHistoryDeletions", counters.listingHistoryDeletions), row("quarantineMutations", counters.quarantineMutations), row("providerCalls", counters.providerCalls), row("externalCalls", counters.externalCalls), row("productionDbMutations", counters.productionDbMutations), row("publishActions", counters.publishActions), row("paymentBookingCommercialTransaction", `${counters.paymentActions}/${counters.bookingActions}/${counters.commercialTransactionActions}`));
  const lisaSection = section("Lisa Internal Execution Explanation", "property-execution-lisa");
  lisaSection.append(row("lisaMayApprove", lisa.mayApproveExecution), row("explanation", lisa.explanation));
  panel.append(header, intent, preview, gateway, commit, audit, safety, lisaSection, renderActions(panel));
  return panel;
}

function renderHistoryFilters(viewModel, panel) {
  const node = section("Execution Filters", "property-execution-history-filters");
  const form = el("form", "property-ingestion-filter-form");
  const statuses = ["", ...new Set(viewModel.allItems.map((item) => item.executionStatus))];
  function select(name, values, current) {
    const wrapper = el("label");
    wrapper.append(el("span", "", name));
    const control = document.createElement("select");
    control.name = name;
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value || "ANY";
      option.selected = value === current;
      control.append(option);
    });
    wrapper.append(control);
    return wrapper;
  }
  form.append(
    select("executionStatus", statuses, viewModel.filters.executionStatus || ""),
    select("actionType", ["", propertyExecutionActionTypes.applyConfirmedExactMatch], viewModel.filters.actionType || "")
  );
  ["hasRollback", "failedOnly", "blockedOnly", "verifiedOnly"].forEach((name) => {
    const label = el("label", "property-ingestion-check");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = viewModel.filters[name] === true;
    label.append(input, el("span", "", name));
    form.append(label);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const params = new URLSearchParams();
    ["executionStatus", "actionType"].forEach((name) => {
      const value = data.get(name);
      if (value) params.set(name, value);
    });
    ["hasRollback", "failedOnly", "blockedOnly", "verifiedOnly"].forEach((name) => {
      if (data.get(name) === "on") params.set(name, "1");
    });
    window.location.hash = params.toString() ? `#property-execution-history?${params}` : "#property-execution-history";
    renderPropertyExecutionHistoryUi(panel);
  });
  const button = el("button", "property-readonly-action", "Apply Filters");
  button.type = "submit";
  form.append(button);
  node.append(form);
  return node;
}

function parseHistoryHash() {
  const query = window.location.hash.includes("?") ? window.location.hash.slice(window.location.hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return {
    filters: {
      executionStatus: params.get("executionStatus") || "",
      actionType: params.get("actionType") || "",
      hasRollback: params.get("hasRollback") === "1",
      failedOnly: params.get("failedOnly") === "1",
      blockedOnly: params.get("blockedOnly") === "1",
      verifiedOnly: params.get("verifiedOnly") === "1"
    }
  };
}

export function renderPropertyExecutionHistoryUi(panel) {
  if (!panel) return null;
  const route = parseHistoryHash();
  const viewModel = createPropertyExecutionHistoryViewModel(route);
  const detail = viewModel.detail;
  const counters = detail.sections.sideEffects;
  panel.hidden = false;
  panel.dataset.currentMode = "property-execution-history";
  panel.dataset.accessBoundary = viewModel.accessBoundary;
  panel.dataset.providerCalls = "0";
  panel.dataset.externalCalls = "0";
  panel.dataset.productionDbMutations = "0";
  panel.dataset.newExecutionActionTypes = String(viewModel.newExecutionActionTypes);
  panel.innerHTML = "";

  const header = section("ESSA Property Execution History", "property-execution-history-header");
  header.append(
    row("banner", "INTERNAL EXECUTION HISTORY / APPROVAL INSPECTION / AUDIT CONSOLE"),
    row("route", "#property-execution-history"),
    row("Navigator routing", viewModel.navigatorRoute),
    row("newExecutionActionTypes", viewModel.newExecutionActionTypes),
    row("onlyAllowedAction", propertyExecutionActionTypes.applyConfirmedExactMatch),
    row("Property Passport Link", viewModel.propertyPassportLink)
  );

  const list = section("Execution History List", "property-execution-history-list");
  viewModel.items.forEach((item) => {
    list.append(row(item.label, {
      executionRecordId: item.executionRecordId,
      executionStatus: item.executionStatus,
      preflightStatus: item.preflightStatus,
      approvalStatus: item.approvalStatus,
      reviewerDecisionId: item.reviewerDecisionId,
      canonicalPropertyId: item.canonicalPropertyId,
      auditEventCount: item.auditEventCount
    }));
  });

  const intent = section("Intent", "property-execution-detail-intent");
  intent.append(row("requested", detail.sections.intent), row("eligibility", detail.sections.eligibility));

  const controls = section("Reviewer Decision / Execution Approval", "property-execution-detail-controls");
  controls.append(
    row("REVIEWER DECISION", detail.sections.reviewerDecision),
    row("EXECUTION APPROVAL", detail.sections.approval),
    row("WHY WAS THIS APPROVED?", {
      eligibility: detail.sections.eligibility,
      evidence: detail.sections.casePackage.integrity,
      reviewerDecision: detail.sections.reviewerDecision,
      packageStatus: detail.sections.casePackage.caseStatus,
      preflightChecks: detail.sections.preflight.checks,
      approvalScope: detail.sections.approval.approvalDecisionResult
    })
  );

  const packageAndGate = section("Case Package / Preflight / Gateway", "property-execution-detail-gateway");
  packageAndGate.append(row("Case Package", detail.sections.casePackage), row("Preflight", detail.sections.preflight), row("Gateway", detail.sections.gateway));

  const diff = section("Before / After Diff", "property-execution-detail-diff");
  diff.append(row("Before State", detail.sections.beforeState), row("Change Scope", detail.sections.changeScope), row("After State", detail.sections.afterState), row("UNCHANGED", detail.sections.changeScope.unchanged));

  const verification = section("Verification / Rollback / Idempotency", "property-execution-detail-verification");
  verification.append(row("Verification", detail.sections.verification), row("Rollback", detail.sections.rollback), row("Idempotency Key", viewModel.selected.idempotencyKey));

  const audit = section("Execution Timeline", "property-execution-detail-audit");
  audit.append(row("Timeline", detail.sections.audit), row("Integrity", detail.integrity));

  const sideEffects = section("Side Effects", "property-execution-detail-side-effects");
  sideEffects.append(
    row("providerCalls", counters.providerCalls),
    row("externalCalls", counters.externalCalls),
    row("productionDbMutations", counters.productionDbMutations),
    row("ownershipMutations", counters.ownershipMutations),
    row("listingHistoryDeletions", counters.listingHistoryDeletions),
    row("quarantineMutations", counters.quarantineMutations),
    row("publishActions", counters.publishActions),
    row("paymentBookingCommercialTransaction", `${counters.paymentActions}/${counters.bookingActions}/${counters.commercialTransactionActions}`)
  );

  const lisa = section("Lisa Internal Execution Guide", "property-execution-history-lisa");
  lisa.append(row("source", detail.lisaGuide.source), row("lisaMayApprove", detail.lisaGuide.mayApproveExecution), row("explanation", detail.lisaGuide.explanation));

  panel.append(header, renderHistoryFilters(viewModel, panel), list, intent, controls, packageAndGate, diff, verification, audit, sideEffects, lisa);
  return viewModel;
}
