import {
  applyPropertyReviewWorkflowTransition,
  buildPropertyReviewerInbox,
  buildPropertyReviewWorkflowViewModel,
  buildPropertyReviewWorkflowSnapshotFixtures,
  createLisaPropertyReviewWorkflowExplanation,
  createLisaPropertyReviewWorkflowSnapshotExplanation,
  createLocalPropertyReviewWorkflowSnapshotAdapter,
  createPropertyEvidenceRequest,
  createWorkflowSnapshot,
  diffPropertyReviewWorkflowSnapshots,
  localPropertyReviewerIdentities,
  propertyEvidenceRequestStatuses,
  propertyEvidenceRequestTypes,
  propertyProfessionalReviewRequirements,
  propertyReviewAssignmentStatuses,
  propertyReviewAuditEvents,
  propertyReviewHandoffTargetRoles,
  propertyReviewPriorities,
  propertyReviewStatuses,
  restorePropertyReviewWorkflowSnapshot,
  rollbackPropertyReviewWorkflowSnapshot,
  verifyWorkflowSnapshotIntegrity
} from "../../src/property/index.js";

const workflowOverrides = {};
const reviewWorkflowOnlyBanner = "REVIEW WORKFLOW ONLY - PROPERTY EXECUTION DISABLED";
const snapshotAdapter = createLocalPropertyReviewWorkflowSnapshotAdapter();
let latestSnapshotAction = "No snapshot action yet.";
let latestSnapshotDiff = null;
let latestRestoreResult = null;
let latestRollbackResult = null;

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
  const node = el("section", `property-ingestion-section property-review-workflow-section ${className}`.trim());
  node.append(el("h3", "", title));
  return node;
}

function badge(label, tone = "muted") {
  return el("span", `property-badge tone-${tone}`, label || "MISSING");
}

function routeHash(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "" && value !== false) query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `#property-review-queue?${qs}` : "#property-review-queue";
}

export function parsePropertyReviewQueueHash(inputHash = window.location.hash || "#property-review-queue") {
  const query = inputHash.includes("?") ? inputHash.slice(inputHash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return {
    selectedQueueItemId: params.get("item") || null,
    filters: {
      reviewerRole: params.get("reviewerRole") || "",
      reviewerId: params.get("reviewerId") || "",
      assignmentStatus: params.get("assignmentStatus") || "",
      reviewStatus: params.get("reviewStatus") || "",
      requestedReviewType: params.get("requestedReviewType") || "",
      priority: params.get("priority") || "",
      packageReadiness: params.get("packageReadiness") || "",
      professionalReviewRequirement: params.get("professionalReviewRequirement") || "",
      canonicalPropertyId: params.get("canonicalPropertyId") || "",
      hasConflict: params.get("hasConflict") === "1",
      hasGaps: params.get("hasGaps") === "1"
    }
  };
}

function getViewModel(route = parsePropertyReviewQueueHash()) {
  return buildPropertyReviewWorkflowViewModel({
    selectedQueueItemId: route.selectedQueueItemId,
    filters: route.filters,
    overrides: workflowOverrides
  });
}

function saveOverride(item) {
  workflowOverrides[item.ingestionId] = {
    ...(workflowOverrides[item.ingestionId] || {}),
    assignedReviewerId: item.assignedReviewerId,
    assignmentStatus: item.assignmentStatus,
    reviewStatus: item.reviewStatus,
    assignedAt: item.assignedAt,
    reviewStartedAt: item.reviewStartedAt,
    reviewCompletedAt: item.reviewCompletedAt,
    lastUpdatedAt: item.lastUpdatedAt,
    evidenceRequests: item.evidenceRequests,
    assignments: item.assignments,
    auditPreview: item.auditPreview,
    priority: item.priority,
    targetRole: item.targetRole
  };
}

function saveSnapshot(snapshot) {
  const existing = snapshotAdapter.get(snapshot.snapshotId);
  if (!existing) snapshotAdapter.save(snapshot);
}

function transitionSelected(viewModel, panel, next) {
  if (!viewModel.selected) return;
  const result = applyPropertyReviewWorkflowTransition(viewModel.selected, next);
  if (result.ok) saveOverride(result.item);
  renderPropertyReviewQueueUi(panel);
}

function renderBanner(viewModel) {
  const node = el("section", "property-ingestion-section property-review-workflow-banner");
  const mandateButton = el("button", "property-readonly-action", "OPEN MANDATE AUTHORITY REVIEW");
  mandateButton.type = "button";
  mandateButton.dataset.executionEnabled = "false";
  mandateButton.addEventListener("click", () => {
    window.location.hash = "#property-mandate-review";
  });
  node.append(
    el("h3", "", viewModel.workflowBanner || reviewWorkflowOnlyBanner),
    el("p", "", "Local review workflow actions change only browser/in-memory proof state. They do not merge Property, write repository state, publish listings, restore quarantine, contact providers, send email, book, pay or transact."),
    mandateButton
  );
  return node;
}

function renderSummary(viewModel) {
  const node = section("Review Queue");
  const grid = el("div", "property-ingestion-metrics");
  Object.entries(viewModel.summary).forEach(([key, value]) => grid.append(row(key, value)));
  node.append(grid);
  return node;
}

function renderFilters(viewModel, panel) {
  const node = section("Review Queue Filters", "property-review-workflow-filters");
  const form = el("form", "property-ingestion-filter-form");
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
    select("reviewerRole", ["", ...Object.values(propertyReviewHandoffTargetRoles)], viewModel.filters.reviewerRole || ""),
    select("reviewerId", ["", ...Object.values(localPropertyReviewerIdentities)], viewModel.filters.reviewerId || ""),
    select("assignmentStatus", ["", ...Object.values(propertyReviewAssignmentStatuses)], viewModel.filters.assignmentStatus || ""),
    select("reviewStatus", ["", ...Object.values(propertyReviewStatuses)], viewModel.filters.reviewStatus || ""),
    select("requestedReviewType", ["", ...Object.values(propertyProfessionalReviewRequirements)], viewModel.filters.requestedReviewType || ""),
    select("priority", ["", ...Object.values(propertyReviewPriorities)], viewModel.filters.priority || ""),
    select("packageReadiness", ["", ...new Set(viewModel.queue.map((item) => item.packageReadiness))], viewModel.filters.packageReadiness || ""),
    select("professionalReviewRequirement", ["", ...Object.values(propertyProfessionalReviewRequirements)], viewModel.filters.professionalReviewRequirement || "")
  );
  ["hasConflict", "hasGaps"].forEach((name) => {
    const label = el("label", "property-ingestion-check");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = viewModel.filters[name] === true;
    label.append(input, el("span", "", name));
    form.append(label);
  });
  const button = el("button", "property-readonly-action", "Apply filters");
  button.type = "submit";
  button.dataset.executionEnabled = "false";
  form.append(button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    window.location.hash = routeHash({
      reviewerRole: data.get("reviewerRole") || "",
      reviewerId: data.get("reviewerId") || "",
      assignmentStatus: data.get("assignmentStatus") || "",
      reviewStatus: data.get("reviewStatus") || "",
      requestedReviewType: data.get("requestedReviewType") || "",
      priority: data.get("priority") || "",
      packageReadiness: data.get("packageReadiness") || "",
      professionalReviewRequirement: data.get("professionalReviewRequirement") || "",
      hasConflict: data.get("hasConflict") === "on" ? "1" : "",
      hasGaps: data.get("hasGaps") === "on" ? "1" : ""
    });
    renderPropertyReviewQueueUi(panel);
  });
  node.append(form);
  return node;
}

function renderQueueCards(viewModel, panel) {
  const node = section("Handoff Queue", "property-review-workflow-queue");
  const list = el("div", "property-ingestion-list");
  viewModel.filteredQueue.forEach((item) => {
    const active = item.queueItemId === viewModel.selected?.queueItemId;
    const button = el("button", active ? "active" : "", `${item.packageId} / ${item.priority} / ${item.assignmentStatus} / ${item.reviewStatus}`);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.dataset.queueItemId = item.queueItemId;
    button.addEventListener("click", () => {
      window.location.hash = routeHash({ ...viewModel.filters, item: item.queueItemId });
      renderPropertyReviewQueueUi(panel);
    });
    list.append(button);
  });
  if (!viewModel.filteredQueue.length) list.append(el("p", "", "No local review workflow cases match the selected filters."));
  node.append(list);
  return node;
}

function renderInbox(viewModel) {
  const node = section("My Review Inbox", "property-review-workflow-inbox");
  const inbox = buildPropertyReviewerInbox({
    workflowViewModel: viewModel,
    filters: {
      reviewerId: viewModel.filters.reviewerId || localPropertyReviewerIdentities.propertyReviewer
    }
  });
  if (!inbox.boundedCaseSummaries.length) {
    node.append(el("p", "", "No bounded inbox cases for the selected local reviewer."));
    return node;
  }
  inbox.boundedCaseSummaries.forEach((summary) => {
    const card = el("article", "property-ingestion-conflict-card");
    card.append(
      row("Package ID/version", `${summary.packageId} / ${summary.packageVersion}`),
      row("Property ID", summary.propertyId),
      row("Source", summary.source),
      row("Review type", summary.reviewType),
      row("Package status", summary.packageStatus),
      row("Priority", summary.priority),
      row("Assignment", summary.assignment),
      row("Review status", summary.reviewStatus),
      row("Conflict indicator", summary.hasConflict ? "YES" : "NO"),
      row("Missing evidence indicator", summary.hasGaps ? "YES" : "NO"),
      row("Professional review requirement", summary.professionalReviewRequirement),
      row("Current reviewer decision", summary.currentReviewerDecision),
      row("Execution", summary.execution)
    );
    node.append(card);
  });
  return node;
}

function renderLocalActions(viewModel, panel) {
  const node = section("Local Workflow Actions", "property-review-workflow-actions");
  const actions = el("div", "property-readonly-actions");
  const buttons = [
    ["Assign to local reviewer", () => transitionSelected(viewModel, panel, {
      assignmentStatus: propertyReviewAssignmentStatuses.assigned,
      assignedReviewerId: localPropertyReviewerIdentities.propertyReviewer,
      eventType: propertyReviewAuditEvents.reviewAssigned
    })],
    ["Accept review", () => transitionSelected(viewModel, panel, {
      assignmentStatus: propertyReviewAssignmentStatuses.acceptedByReviewer,
      eventType: propertyReviewAuditEvents.reviewAccepted
    })],
    ["Start review", () => transitionSelected(viewModel, panel, {
      reviewStatus: propertyReviewStatuses.inReview,
      eventType: propertyReviewAuditEvents.reviewStarted
    })],
    ["Return to queue", () => transitionSelected(viewModel, panel, {
      assignmentStatus: propertyReviewAssignmentStatuses.returnedToQueue,
      assignedReviewerId: null,
      eventType: propertyReviewAuditEvents.reviewReturned
    })],
    ["Record evidence request", () => {
      const selected = viewModel.selected;
      if (!selected) return;
      const request = createPropertyEvidenceRequest({
        requestId: `evidence_req_${selected.queueItemId}_${(selected.evidenceRequests || []).length + 1}`,
        packageId: selected.packageId,
        requestedBy: selected.assignedReviewerId || localPropertyReviewerIdentities.propertyReviewer,
        evidenceType: propertyEvidenceRequestTypes.ownershipDocument,
        reasonCode: "LOCAL_MORE_EVIDENCE_REQUEST",
        requestedAt: "2026-08-21T00:45:00.000Z",
        status: propertyEvidenceRequestStatuses.waiting
      });
      const result = applyPropertyReviewWorkflowTransition({
        ...selected,
        evidenceRequests: [...(selected.evidenceRequests || []), request]
      }, {
        reviewStatus: propertyReviewStatuses.waitingForEvidence,
        eventType: propertyReviewAuditEvents.moreEvidenceRequested
      });
      if (result.ok) saveOverride(result.item);
      renderPropertyReviewQueueUi(panel);
    }],
    ["Link existing reviewer decision", () => transitionSelected(viewModel, panel, {
      reviewStatus: propertyReviewStatuses.decisionRecorded,
      linkDecision: true,
      eventType: propertyReviewAuditEvents.decisionLinked
    })],
    ["Mark review complete", () => transitionSelected(viewModel, panel, {
      assignmentStatus: propertyReviewAssignmentStatuses.closed,
      reviewStatus: propertyReviewStatuses.reviewComplete,
      eventType: propertyReviewAuditEvents.reviewCompleted
    })]
  ];
  buttons.forEach(([label, onClick]) => {
    const button = el("button", "property-readonly-action", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", onClick);
    actions.append(button);
  });
  node.append(actions, el("p", "", "These actions are local workflow state only. They never execute merge/write/publish/quarantine/provider/payment/booking/transaction behavior."));
  return node;
}

function renderCaseDetail(item) {
  const node = section("Case Detail", "property-review-workflow-detail");
  node.append(
    badge(item.priority, item.priority === "URGENT_REVIEW" ? "danger" : item.priority === "HIGH" ? "warning" : "info"),
    row("queueItemId", item.queueItemId),
    row("handoffId", item.handoffId),
    row("packageId", item.packageId),
    row("packageVersion", item.packageVersion),
    row("ingestionId", item.ingestionId),
    row("canonicalPropertyId", item.canonicalPropertyId),
    row("targetRole", item.targetRole),
    row("assignedReviewerId", item.assignedReviewerId),
    row("assignmentStatus", item.assignmentStatus),
    row("reviewStatus", item.reviewStatus),
    row("requestedReviewType", item.requestedReviewType),
    row("packageReadiness", item.packageReadiness),
    row("professionalReviewRequirements", item.professionalReviewRequirements),
    row("conflictFlags", item.conflictFlags),
    row("gapFlags", item.gapFlags),
    row("executionStatus", item.executionStatus)
  );
  return node;
}

function renderPackagePreview(item) {
  const node = section("Package Preview", "property-review-workflow-package");
  const pkg = item.package || {};
  node.append(
    row("modelType", pkg.modelType),
    row("packageId", pkg.packageId),
    row("caseStatus", pkg.caseStatus),
    row("summary", pkg.summary),
    row("sourceSummary", pkg.sourceSummary),
    row("evidenceSummary", pkg.evidenceSummary),
    row("reviewerDecisionSummary", pkg.reviewerDecisionSummary),
    row("limitations", pkg.limitations),
    row("executionReadiness", pkg.executionReadiness)
  );
  return node;
}

function renderDecisionHistory(item) {
  const node = section("Decision History", "property-review-workflow-decisions");
  if (!item.decisionHistory?.length) {
    node.append(el("p", "", "NO REVIEWER DECISION RECORDED."));
    return node;
  }
  item.decisionHistory.forEach((decision) => {
    const card = el("article", "property-ingestion-timeline-step");
    card.append(
      row("decisionId", decision.decisionId),
      row("decisionType", decision.decisionType),
      row("decisionStatus", decision.decisionStatus),
      row("supersedesDecisionId", decision.supersedesDecisionId),
      row("executionStatus", decision.executionStatus)
    );
    node.append(card);
  });
  return node;
}

function renderEvidenceRequests(item) {
  const node = section("Evidence Requests", "property-review-workflow-evidence");
  if (!item.evidenceRequests?.length) {
    node.append(el("p", "", "No external evidence request has been sent. Local structured requests may be recorded here."));
    return node;
  }
  item.evidenceRequests.forEach((request) => {
    const card = el("article", "property-ingestion-timeline-step");
    card.append(
      row("requestId", request.requestId),
      row("packageId", request.packageId),
      row("requestedBy", request.requestedBy),
      row("evidenceType", request.evidenceType),
      row("reasonCode", request.reasonCode),
      row("status", request.status),
      row("externalMessageSent", request.externalMessageSent ? "YES" : "NO")
    );
    node.append(card);
  });
  return node;
}

function renderAuditTimeline(item) {
  const node = section("Audit Timeline", "property-review-workflow-audit");
  item.auditPreview?.forEach((event) => {
    const card = el("article", "property-ingestion-timeline-step");
    card.append(
      badge(event.eventType, "info"),
      row("auditEventId", event.auditEventId),
      row("assignment", `${event.previousAssignmentStatus || "MISSING"} -> ${event.nextAssignmentStatus || "MISSING"}`),
      row("review", `${event.previousReviewStatus || "MISSING"} -> ${event.nextReviewStatus || "MISSING"}`),
      row("appendOnly", event.appendOnly ? "YES" : "NO"),
      row("executionStatus", event.executionStatus)
    );
    node.append(card);
  });
  return node;
}

function renderLisa(viewModel) {
  const node = section("Lisa Internal Review Guide", "property-review-workflow-lisa");
  const lisa = createLisaPropertyReviewWorkflowExplanation(viewModel);
  node.append(el("p", "property-lisa-answer", lisa.explanation));
  return node;
}

function renderNavigatorRouting() {
  const node = section("Navigator Internal Routing", "property-review-workflow-routing");
  node.append(
    row("Russian request", "Покажи кейсы на проверку"),
    row("Route", "#property-review-queue"),
    row("Snapshot request", "Покажи снимки review workflow"),
    row("Execution history request", "Покажи историю исполнения Property"),
    row("Boundary", "INTERNAL / ADMIN / LOCAL PROOF"),
    row("Public access", "NOT ENABLED")
  );
  return node;
}

function renderExecutionHistoryLink(selected = {}) {
  const node = section("Execution History Handoff", "property-review-execution-history-link");
  const link = el("button", "property-readonly-action", "VIEW EXECUTION HISTORY");
  link.type = "button";
  link.dataset.executionEnabled = "false";
  link.addEventListener("click", () => {
    window.location.hash = "#property-execution-history";
  });
  node.append(
    row("chain", "Review Queue -> Case Package -> Reviewer Decision -> Execution Intent -> Execution Record"),
    row("selectedReviewerDecisionId", selected.currentDecision?.decisionId || "NO_EXECUTION_LINK"),
    row("internalRoute", "#property-execution-history"),
    link
  );
  return node;
}

function renderWorkflowSnapshots(viewModel, panel) {
  const node = section("WORKFLOW SNAPSHOTS", "property-review-workflow-snapshots");
  const history = snapshotAdapter.list();
  const latest = history.at(-1) || null;
  const fixtureSet = buildPropertyReviewWorkflowSnapshotFixtures();
  const integrity = latest ? verifyWorkflowSnapshotIntegrity(latest) : null;
  const actions = el("div", "property-readonly-actions");
  const actionSpecs = [
    ["Create Snapshot", () => {
      const snapshot = createWorkflowSnapshot({
        workflowViewModel: viewModel,
        previousSnapshot: snapshotAdapter.list().at(-1) || null,
        reasonForSnapshot: "UI_LOCAL_CREATE_SNAPSHOT"
      });
      saveSnapshot(snapshot);
      latestSnapshotAction = `Created ${snapshot.snapshotId}`;
      renderPropertyReviewQueueUi(panel);
    }],
    ["Verify Snapshot", () => {
      const target = snapshotAdapter.list().at(-1) || fixtureSet.v1;
      latestSnapshotAction = verifyWorkflowSnapshotIntegrity(target).status;
      renderPropertyReviewQueueUi(panel);
    }],
    ["Compare Snapshots", () => {
      saveSnapshot(fixtureSet.v2);
      saveSnapshot(fixtureSet.v4);
      latestSnapshotDiff = diffPropertyReviewWorkflowSnapshots(fixtureSet.v2, fixtureSet.v4);
      latestSnapshotAction = `Compared ${fixtureSet.v2.snapshotId} -> ${fixtureSet.v4.snapshotId}`;
      renderPropertyReviewQueueUi(panel);
    }],
    ["Restore Local Review State", () => {
      saveSnapshot(fixtureSet.v2);
      latestRestoreResult = restorePropertyReviewWorkflowSnapshot(fixtureSet.v2);
      latestSnapshotAction = latestRestoreResult.status;
      renderPropertyReviewQueueUi(panel);
    }],
    ["Roll Back Local Review State", () => {
      saveSnapshot(fixtureSet.v2);
      saveSnapshot(fixtureSet.v4);
      latestRollbackResult = rollbackPropertyReviewWorkflowSnapshot({ fromSnapshot: fixtureSet.v4, toSnapshot: fixtureSet.v2 });
      latestSnapshotAction = latestRollbackResult.status;
      renderPropertyReviewQueueUi(panel);
    }],
    ["Show Tampered Block", () => {
      const tampered = { ...fixtureSet.v1, reasonForSnapshot: "tampered_without_refingerprint" };
      latestRestoreResult = restorePropertyReviewWorkflowSnapshot(tampered);
      latestSnapshotAction = latestRestoreResult.status;
      renderPropertyReviewQueueUi(panel);
    }]
  ];
  actionSpecs.forEach(([label, onClick]) => {
    const button = el("button", "property-readonly-action", label);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.addEventListener("click", onClick);
    actions.append(button);
  });
  const lisa = createLisaPropertyReviewWorkflowSnapshotExplanation({
    snapshot: latest || fixtureSet.v4,
    diff: latestSnapshotDiff || fixtureSet.diffV2V4,
    restoreResult: latestRestoreResult || fixtureSet.restoreV2,
    rollbackResult: latestRollbackResult || fixtureSet.rollbackV4ToV2
  });
  node.append(
    row("banner", "REVIEW WORKFLOW SNAPSHOT / RESTORE ONLY"),
    row("safety", "NO PROPERTY EXECUTION / NO CANONICAL PROPERTY MUTATION / NO LISTING PUBLICATION"),
    row("currentWorkflowState", `${viewModel.summary.total} queue item(s), ${viewModel.summary.waitingForEvidence} waiting for evidence`),
    row("latestSnapshot", latest?.snapshotId || "NONE"),
    row("snapshotHistory", history.map((snapshot) => `${snapshot.snapshotId}:${snapshot.snapshotVersion}`).join(", ") || "EMPTY"),
    row("version", latest?.snapshotVersion || "MISSING"),
    row("createdAt", latest?.createdAt || "MISSING"),
    row("integrityStatus", integrity?.status || "NOT_VERIFIED"),
    row("diff", latestSnapshotDiff || fixtureSet.diffV2V4),
    row("restoreReadiness", latestRestoreResult?.status || fixtureSet.restoreV2.status),
    row("rollbackReadiness", latestRollbackResult?.status || fixtureSet.rollbackV4ToV2.status),
    row("rollbackAudit", latestRollbackResult?.rollbackAudit || fixtureSet.rollbackV4ToV2.rollbackAudit),
    row("tamperedSnapshot", "RESTORE_BLOCKED_INTEGRITY"),
    row("unsupportedSchema", "RESTORE_BLOCKED_SCHEMA"),
    row("brokenReference", "RESTORE_BLOCKED_REFERENCE"),
    row("canonicalPropertyMutation", 0),
    row("listingMutation", 0),
    row("quarantineMutation", 0),
    row("lastSnapshotAction", latestSnapshotAction),
    row("lisaSnapshotExplanation", lisa.explanation),
    actions
  );
  return node;
}

function renderDisabledExecution(viewModel) {
  const node = section("Property Execution Disabled", "property-review-workflow-disabled");
  node.append(
    row("canonicalPropertyMutation", 0),
    row("providerCalls", viewModel.providerCalls),
    row("externalCalls", viewModel.externalCalls),
    row("dbMutations", viewModel.dbMutations),
    row("mergeActions", viewModel.mergeActions),
    row("publishActions", viewModel.publishActions),
    row("quarantineMutations", viewModel.quarantineMutations),
    row("paymentActions", viewModel.payments),
    row("bookingActions", viewModel.bookingActions),
    row("transactionActions", viewModel.transactionActions)
  );
  return node;
}

export function renderPropertyReviewQueueUi(panel) {
  if (!panel) return null;
  const route = parsePropertyReviewQueueHash();
  const viewModel = getViewModel(route);
  const selected = viewModel.selected;
  panel.hidden = false;
  panel.innerHTML = "";
  panel.dataset.currentMode = "property-review-queue";
  panel.dataset.accessBoundary = viewModel.accessBoundary;
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.dbMutations = String(viewModel.dbMutations);
  panel.dataset.paymentActions = String(viewModel.payments);
  panel.dataset.bookingActions = String(viewModel.bookingActions);
  panel.dataset.transactionActions = String(viewModel.transactionActions);
  panel.dataset.mergeActions = String(viewModel.mergeActions);
  panel.dataset.publishActions = String(viewModel.publishActions);
  panel.dataset.quarantineMutations = String(viewModel.quarantineMutations);
  panel.dataset.executionEnabled = "false";

  const header = el("div", "module-section-header property-ingestion-header");
  header.append(el("span", "", "ESSA Property Reviewer Handoff Queue"), el("p", "", "INTERNAL / ADMIN / LOCAL PROOF. Review Workflow != Property Execution."));
  panel.append(header, renderBanner(viewModel), renderSummary(viewModel), renderFilters(viewModel, panel), renderQueueCards(viewModel, panel), renderInbox(viewModel));
  if (selected) {
    panel.append(
      renderWorkflowSnapshots(viewModel, panel),
      renderLocalActions(viewModel, panel),
      renderExecutionHistoryLink(selected),
      renderCaseDetail(selected),
      renderPackagePreview(selected),
      renderDecisionHistory(selected),
      renderEvidenceRequests(selected),
      renderAuditTimeline(selected),
      renderLisa(viewModel),
      renderNavigatorRouting(),
      renderDisabledExecution(viewModel)
    );
  }
  return viewModel;
}
