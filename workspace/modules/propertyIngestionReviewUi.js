import {
  buildPropertyIngestionReviewViewModel,
  createLisaPropertyIngestionReviewExplanation,
  propertyIngestionMatchOutcomes,
  propertyIngestionValidationStatuses,
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  propertyReviewerRoles
} from "../../src/property/index.js";

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

function routeHash(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "" && value !== false) query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `#property-ingestion-review?${qs}` : "#property-ingestion-review";
}

export function parsePropertyIngestionReviewHash(inputHash = window.location.hash || "#property-ingestion-review") {
  const query = inputHash.includes("?") ? inputHash.slice(inputHash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  return {
    selectedIngestionId: params.get("item") || null,
    filters: {
      sourceType: params.get("sourceType") || "",
      validationStatus: params.get("validationStatus") || "",
      matchOutcome: params.get("matchOutcome") || "",
      hasConflict: params.get("hasConflict") === "1",
      hasGaps: params.get("hasGaps") === "1",
      quarantined: params.get("quarantined") === "1",
      canonicalPropertyId: params.get("canonicalPropertyId") || "",
      decisionStatus: params.get("decisionStatus") || "",
      decisionType: params.get("decisionType") || "",
      reviewerRole: params.get("reviewerRole") || "",
      hasDecision: params.get("hasDecision") === "1",
      superseded: params.get("superseded") === "1",
      needsMoreEvidence: params.get("needsMoreEvidence") === "1"
    }
  };
}

function badge(label, tone = "muted") {
  return el("span", `property-badge tone-${tone}`, label || "MISSING");
}

function section(title, className = "") {
  const node = el("section", `property-ingestion-section ${className}`.trim());
  node.append(el("h3", "", title));
  return node;
}

function row(label, value) {
  const node = el("div", "property-ingestion-row");
  node.append(el("span", "", label), el("strong", "", valueText(value)));
  return node;
}

function renderSummary(viewModel) {
  const node = section("Review Queue States", "property-ingestion-summary");
  const grid = el("div", "property-ingestion-metrics");
  Object.entries(viewModel.summary).forEach(([key, value]) => grid.append(row(key, value)));
  node.append(grid);
  return node;
}

function renderFilters(viewModel, panel) {
  const node = section("Filters", "property-ingestion-filters");
  const form = el("form", "property-ingestion-filter-form");
  const sourceTypes = [...new Set(viewModel.queue.map((item) => item.sourceType))];
  const validationStatuses = ["", ...Object.values(propertyIngestionValidationStatuses)];
  const matchOutcomes = ["", ...Object.values(propertyIngestionMatchOutcomes)];
  const decisionStatuses = ["", ...Object.values(propertyReviewerDecisionStatuses)];
  const decisionTypes = ["", ...Object.values(propertyReviewerDecisionTypes)];
  const reviewerRoles = ["", ...Object.values(propertyReviewerRoles)];
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
    select("sourceType", ["", ...sourceTypes], viewModel.filters.sourceType || ""),
    select("validationStatus", validationStatuses, viewModel.filters.validationStatus || ""),
    select("matchOutcome", matchOutcomes, viewModel.filters.matchOutcome || ""),
    select("decisionStatus", decisionStatuses, viewModel.filters.decisionStatus || ""),
    select("decisionType", decisionTypes, viewModel.filters.decisionType || ""),
    select("reviewerRole", reviewerRoles, viewModel.filters.reviewerRole || "")
  );
  ["hasConflict", "hasGaps", "quarantined", "hasDecision", "superseded", "needsMoreEvidence"].forEach((name) => {
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
    const next = {
      sourceType: data.get("sourceType") || "",
      validationStatus: data.get("validationStatus") || "",
      matchOutcome: data.get("matchOutcome") || "",
      decisionStatus: data.get("decisionStatus") || "",
      decisionType: data.get("decisionType") || "",
      reviewerRole: data.get("reviewerRole") || "",
      hasConflict: data.get("hasConflict") === "on" ? "1" : "",
      hasGaps: data.get("hasGaps") === "on" ? "1" : "",
      quarantined: data.get("quarantined") === "on" ? "1" : "",
      hasDecision: data.get("hasDecision") === "on" ? "1" : "",
      superseded: data.get("superseded") === "on" ? "1" : "",
      needsMoreEvidence: data.get("needsMoreEvidence") === "on" ? "1" : ""
    };
    window.location.hash = routeHash(next);
    renderPropertyIngestionReviewUi(panel);
  });
  node.append(form);
  return node;
}

function renderQueue(viewModel, panel) {
  const node = section("Review Queue", "property-ingestion-queue");
  const list = el("div", "property-ingestion-list");
  viewModel.filteredQueue.forEach((item) => {
    const active = item.ingestionId === viewModel.selected?.ingestionId;
    const button = el("button", active ? "active" : "", `${item.sourceRecordId} / ${item.validationStatus} / ${item.matchOutcome}`);
    button.type = "button";
    button.dataset.executionEnabled = "false";
    button.dataset.ingestionId = item.ingestionId;
    button.addEventListener("click", () => {
      window.location.hash = routeHash({ ...viewModel.filters, item: item.ingestionId });
      renderPropertyIngestionReviewUi(panel);
    });
    list.append(button);
  });
  if (!viewModel.filteredQueue.length) list.append(el("p", "", "No local ingestion review items match the selected filters."));
  node.append(list);
  return node;
}

function renderSourceDetail(item) {
  const node = section("Source Record Detail");
  const grid = el("div", "property-ingestion-metrics");
  const detail = item.sourceDetail || {};
  grid.append(
    row("sourceType", detail.sourceType),
    row("sourceName", detail.sourceName),
    row("sourceRecordId", detail.sourceRecordId),
    row("sourceUrl", detail.sourceUrl),
    row("observedAt", detail.observedAt),
    row("fetchedAt", detail.fetchedAt),
    row("declaredPropertyType", detail.declaredData?.propertyType),
    row("location", detail.declaredData?.location),
    row("listingType", detail.declaredData?.listingType),
    row("price", detail.declaredData?.price),
    row("currency", detail.declaredData?.currency),
    row("safeRawPreview", detail.declaredData?.rawPreview)
  );
  node.append(grid);
  return node;
}

function renderValidationDetail(item) {
  const node = section("Validation Detail");
  const detail = item.validationDetail || {};
  node.append(
    badge(detail.status, detail.status === "QUARANTINED" ? "danger" : "success"),
    row("passedChecks", detail.passedChecks?.join(", ") || "MISSING"),
    row("warnings", detail.warnings?.join(", ") || "MISSING"),
    row("gaps", detail.gaps?.join(", ") || "MISSING"),
    row("errors", detail.errors?.join(", ") || "MISSING"),
    row("blockedStage", detail.blockedStage || "MISSING")
  );
  return node;
}

function renderNormalizationDetail(item) {
  const node = section("Normalization Detail");
  const table = el("div", "property-ingestion-table");
  item.normalizationDetail?.rows?.forEach((entry) => {
    const record = el("article", "property-ingestion-normalization-row");
    record.append(row("field", entry.field), row("raw", entry.rawValue), row("normalized", entry.normalizedValue), row("invented", entry.invented ? "YES" : "NO"));
    table.append(record);
  });
  node.append(table);
  return node;
}

function renderIdentityResolution(item) {
  const node = section("Identity Resolution Detail");
  const detail = item.identityResolutionDetail || {};
  node.append(
    badge(detail.matchOutcome, detail.manualReviewRequired ? "warning" : "info"),
    row("candidateIdentityHints", detail.candidateIdentityHints?.join(", ") || "MISSING"),
    row("matchedPropertyId", detail.matchedPropertyId),
    row("deterministicRuleUsed", detail.deterministicRuleUsed),
    row("confidence", detail.confidence),
    row("manualReviewRequired", detail.manualReviewRequired ? "YES" : "NO")
  );
  return node;
}

function renderConflictReview(item) {
  const node = section("Conflict Review");
  if (!item.conflictDetail?.hasConflict) {
    node.append(el("p", "", "No conflict for the selected ingestion item."));
    return node;
  }
  node.append(row("conflicts", item.conflictDetail.conflicts.join(", ")));
  const observations = el("div", "property-ingestion-conflicts");
  item.conflictDetail.observations.forEach((observation) => {
    const card = el("article", "property-ingestion-conflict-card");
    card.append(
      row("source", observation.source),
      row("observedAt", observation.observedAt),
      row("freshness", observation.freshness),
      row("listingSnapshot", observation.listingSnapshotId),
      row("price", `${valueText(observation.price)} ${valueText(observation.currency)}`),
      row("state", observation.conflictState)
    );
    observations.append(card);
  });
  node.append(observations, el("p", "", "No price is selected as correct automatically."));
  return node;
}

function renderQuarantine(viewModel) {
  const node = section("Quarantine Surface", "property-ingestion-quarantine");
  viewModel.quarantine.forEach((item) => {
    const card = el("article", "property-ingestion-quarantine-card");
    card.append(
      row("reason", item.reason),
      row("source", item.source),
      row("recordId", item.sourceRecordId),
      row("blockedStage", item.blockedStage),
      row("futureReview", item.retryOrReviewFuture)
    );
    node.append(card);
  });
  if (!viewModel.quarantine.length) node.append(el("p", "", "No quarantined records in current local fixture batch."));
  return node;
}

function renderLineage(item) {
  const node = section("Source Lineage");
  if (!item.sourceLineage?.length) {
    node.append(el("p", "", "No canonical lineage because this record did not reach canonical read fixtures."));
    return node;
  }
  item.sourceLineage.forEach((entry) => {
    const card = el("article", "property-ingestion-lineage-row");
    card.append(row("trace", entry.trace), row("sourceRecordId", entry.sourceRecordId), row("artifact", `${entry.artifactType} / ${entry.artifactId}`), row("canonicalPropertyId", entry.canonicalPropertyId), row("observedAt", entry.observedAt));
    node.append(card);
  });
  return node;
}

function renderTimeline(item) {
  const node = section("Audit Timeline");
  item.auditTimeline?.forEach((step) => {
    const card = el("article", "property-ingestion-timeline-step");
    card.append(badge(step.status, step.status === "COMPLETE" ? "success" : "muted"), row("stage", step.stage), row("timestamp", step.timestamp));
    node.append(card);
  });
  return node;
}

function renderAvailableDecisions(item) {
  const node = section("Available Decision Options", "property-reviewer-decision-options");
  if (!item.availableDecisionTypes?.length) {
    node.append(el("p", "", "No reviewer decision options are available for this local review state."));
    return node;
  }
  const list = el("div", "property-readonly-actions");
  item.availableDecisionTypes.forEach((decisionType) => {
    const option = el("button", "property-reviewer-option", decisionType);
    option.type = "button";
    option.disabled = true;
    option.dataset.executionEnabled = "false";
    list.append(option);
  });
  node.append(list, el("p", "", "Options are compatibility hints only. Selecting one does not merge, write, publish, restore or contact a provider."));
  return node;
}

function renderDecisionDraft(item) {
  const node = section("Decision Draft", "property-reviewer-decision-draft");
  const draft = item.decisionDraft || {};
  const validation = item.decisionDraftValidation || {};
  node.append(
    row("decisionId", draft.decisionId),
    row("decisionType", draft.decisionType),
    row("reasonCode", draft.reasonCode),
    row("rationale", draft.rationale),
    row("reviewer", `${draft.reviewerRole || "MISSING"} / ${draft.reviewerId || "MISSING"}`),
    row("warningsAcknowledged", draft.warningsAcknowledged?.join(", ") || "MISSING"),
    row("evidenceRefs", draft.evidenceRefs?.map((ref) => `${ref.refType}:${ref.refId}`).join(", ") || "MISSING"),
    row("validation", validation.ok ? "VALID_DECISION_CONTRACT" : validation.errors?.join(", ")),
    row("executionStatus", draft.executionStatus)
  );
  return node;
}

function renderDecisionStatus(item) {
  const node = section("Decision Status", "property-reviewer-decision-status");
  const current = item.currentDecision;
  if (!current) {
    node.append(badge("NO REVIEWER DECISION YET", "muted"), row("executionStatus", item.decisionDraft?.executionStatus || "NOT_EXECUTED"));
    return node;
  }
  node.append(
    badge(current.decisionStatus, current.decisionStatus === "APPROVED_AS_DECISION" ? "success" : "info"),
    row("decisionType", current.decisionType),
    row("reasonCode", current.reasonCode),
    row("reviewer", `${current.reviewerRole} / ${current.reviewerId}`),
    row("supersedesDecisionId", current.supersedesDecisionId || "MISSING"),
    row("executionStatus", current.executionStatus),
    el("p", "", "DECISION RECORDED - NO PROPERTY MUTATION PERFORMED")
  );
  return node;
}

function renderDecisionHistory(item) {
  const node = section("Decision History", "property-reviewer-decision-history");
  if (!item.decisionHistory?.length) {
    node.append(el("p", "", "NO REVIEWER DECISION YET."));
    return node;
  }
  item.decisionHistory.forEach((decision) => {
    const card = el("article", "property-reviewer-decision-card");
    card.append(
      row("decisionId", decision.decisionId),
      row("decisionType", decision.decisionType),
      row("decisionStatus", decision.decisionStatus),
      row("executionStatus", decision.executionStatus),
      row("reviewer", `${decision.reviewerRole} / ${decision.reviewerId}`),
      row("rationale", decision.rationale),
      row("evidence", decision.evidenceRefs?.map((ref) => `${ref.refType}:${ref.refId}`).join(", ") || "MISSING"),
      row("validation", decision.validation?.ok ? "VALID" : decision.validation?.errors?.join(", ")),
      row("createdAt", decision.createdAt)
    );
    node.append(card);
  });
  return node;
}

function renderDecisionAudit(item) {
  const node = section("Decision Audit", "property-reviewer-decision-audit");
  if (!item.decisionAuditTrail?.length) {
    node.append(el("p", "", "No append-only reviewer decision audit records yet."));
    return node;
  }
  item.decisionAuditTrail.forEach((record) => {
    const card = el("article", "property-ingestion-timeline-step");
    card.append(
      badge(record.eventType, "info"),
      row("auditRecordId", record.auditRecordId),
      row("decisionId", record.decisionId),
      row("appendOnly", record.appendOnly ? "YES" : "NO"),
      row("executionStatus", record.executionStatus)
    );
    node.append(card);
  });
  return node;
}

function renderCasePackageOverview(item) {
  const node = section("Review Case Package", "property-review-case-package");
  const pkg = item.reviewCasePackage || {};
  node.append(
    row("packageId", pkg.packageId),
    row("packageVersion", pkg.packageVersion),
    row("caseStatus", pkg.caseStatus),
    row("executionStatus", pkg.executionStatus),
    row("executionReadiness", pkg.executionReadiness),
    row("integrity", pkg.integrity?.fingerprint),
    el("p", "", pkg.summary || "Package summary is not available.")
  );
  const build = el("button", "property-readonly-action", "BUILD REVIEW CASE PACKAGE");
  build.type = "button";
  build.disabled = true;
  build.dataset.executionEnabled = "false";
  node.append(build, el("p", "", "This local package preview changes no Property state and dispatches nothing."));
  return node;
}

function renderCasePackageEvidence(item) {
  const node = section("Package Preview", "property-review-case-preview");
  const pkg = item.reviewCasePackage || {};
  [
    ["Case Overview", pkg.summary],
    ["Source", pkg.sourceSummary],
    ["Validation", pkg.validationSummary],
    ["Normalization", pkg.normalizationSummary],
    ["Identity Resolution", pkg.identityResolutionSummary],
    ["Property Evidence", pkg.evidenceSummary?.sourceLineage],
    ["Listing Evidence", pkg.evidenceSummary?.listingSnapshots],
    ["Conflicts", pkg.conflictSummary],
    ["Gaps", pkg.gapSummary],
    ["Reviewer Decision", pkg.reviewerDecisionSummary],
    ["Decision History", pkg.auditSummary?.decisionHistory],
    ["Audit Trail", pkg.auditSummary?.decisionAuditTrail],
    ["Professional Review", pkg.professionalReviewRequirements],
    ["Limitations", pkg.limitations],
    ["Integrity", pkg.integrity]
  ].forEach(([label, value]) => node.append(row(label, value)));
  return node;
}

function renderCasePackageExport(item) {
  const node = section("Local Package Export / Handoff", "property-review-case-export");
  const pkg = item.reviewCasePackage || {};
  const handoff = item.reviewCaseHandoff || {};
  node.append(
    row("jsonExportReady", item.reviewCaseExports?.json ? "YES" : "NO"),
    row("humanReadableExportReady", item.reviewCaseExports?.markdown ? "YES" : "NO"),
    row("handoffId", handoff.handoffId),
    row("targetRole", handoff.targetRole),
    row("handoffStatus", handoff.status),
    row("dispatchPerformed", handoff.dispatchPerformed ? "YES" : "NO"),
    row("versionV2", item.versionedReviewCasePackage?.packageVersion),
    row("previousPackage", item.versionedReviewCasePackage?.previousPackage),
    row("reasonForNewVersion", item.versionedReviewCasePackage?.reasonForNewVersion),
    row("provenance", pkg.provenance),
    row("lisaPackageExplanation", item.reviewCaseLisaExplanation?.explanation)
  );
  return node;
}

function renderInternalLisa(viewModel) {
  const node = section("Internal Lisa / Navigator Explanation", "property-ingestion-lisa");
  const lisa = createLisaPropertyIngestionReviewExplanation(viewModel);
  node.append(el("strong", "", "LISA_ESSA_PRODUCT_GUIDE / INTERNAL REVIEW CONTEXT"), el("p", "property-lisa-answer", lisa.explanation));
  return node;
}

function renderDisabledActions(viewModel) {
  const node = section("EXECUTION LAYER - NOT ACTIVE", "property-ingestion-disabled-actions");
  const actions = el("div", "property-readonly-actions");
  viewModel.disabledActions.forEach((action) => {
    const button = el("button", "property-future-action", `${action} / NOT ACTIVE YET`);
    button.type = "button";
    button.disabled = true;
    button.dataset.executionEnabled = "false";
    actions.append(button);
  });
  node.append(el("p", "", "Phase 22J records review decisions only."), actions);
  return node;
}

export function renderPropertyIngestionReviewUi(panel) {
  if (!panel) return null;
  const route = parsePropertyIngestionReviewHash();
  const viewModel = buildPropertyIngestionReviewViewModel(route);
  const selected = viewModel.selected;
  panel.hidden = false;
  panel.innerHTML = "";
  panel.dataset.currentMode = "ingestion-review";
  panel.dataset.accessBoundary = viewModel.accessBoundary;
  panel.dataset.providerCalls = String(viewModel.providerCalls);
  panel.dataset.externalCalls = String(viewModel.externalCalls);
  panel.dataset.dbMutations = String(viewModel.dbMutations);
  panel.dataset.paymentActions = String(viewModel.payments);
  panel.dataset.bookingActions = String(viewModel.bookingActions);
  panel.dataset.transactionActions = String(viewModel.transactionActions);
  panel.dataset.executionEnabled = "false";
  panel.dataset.mergeActions = String(viewModel.decisionSummary?.mergeActions || 0);
  panel.dataset.publishActions = String(viewModel.decisionSummary?.publishActions || 0);
  panel.dataset.quarantineMutations = String(viewModel.decisionSummary?.quarantineMutations || 0);
  panel.dataset.packageExecutionReadiness = viewModel.packageSummary?.executionReadiness || "EXECUTION_NOT_ENABLED";

  const header = el("div", "module-section-header property-ingestion-header");
  header.append(el("span", "", "ESSA Property Ingestion Review"), el("p", "", "INTERNAL / ADMIN / LOCAL PROOF. Read-only ingestion audit surface; no merge, publish, restore or write actions are active."));

  panel.append(header, renderSummary(viewModel), renderFilters(viewModel, panel), renderQueue(viewModel, panel));
  if (selected) {
    panel.append(
      renderSourceDetail(selected),
      renderValidationDetail(selected),
      renderNormalizationDetail(selected),
      renderIdentityResolution(selected),
      renderConflictReview(selected),
      renderQuarantine(viewModel),
      renderLineage(selected),
      renderTimeline(selected),
      renderAvailableDecisions(selected),
      renderDecisionDraft(selected),
      renderDecisionStatus(selected),
      renderDecisionHistory(selected),
      renderDecisionAudit(selected),
      renderCasePackageOverview(selected),
      renderCasePackageEvidence(selected),
      renderCasePackageExport(selected),
      renderInternalLisa(viewModel),
      renderDisabledActions(viewModel)
    );
  }
  return viewModel;
}
