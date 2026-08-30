const SESSION_DEFAULTS = {
  topic: "почему человек теряет себя в отношениях",
  hostIdentityId: "lisa",
  language: "ru",
  masterFormat: "master_podcast",
  shortFormTargets: ["TikTok", "Instagram Reels", "YouTube Shorts"]
};

const stepStatusLabels = {
  PLANNED: "Запланировано",
  BLOCKED: "Граница выполнения",
  INPUT_REQUIRED: "Нужен ввод",
  PREFLIGHT_BLOCKED: "Preflight blocked"
};

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, className = "") {
  const node = el("button", className, label);
  node.type = "button";
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.reason || json.error || `request_failed_${response.status}`);
  return json;
}

function readForm(root) {
  const targets = Array.from(root.querySelectorAll("[data-production-target]:checked")).map((item) => item.value);
  return {
    topic: root.querySelector("[data-production-input='topic']")?.value || SESSION_DEFAULTS.topic,
    hostIdentityId: root.querySelector("[data-production-input='hostIdentityId']")?.value || SESSION_DEFAULTS.hostIdentityId,
    language: root.querySelector("[data-production-input='language']")?.value || SESSION_DEFAULTS.language,
    masterFormat: root.querySelector("[data-production-input='masterFormat']")?.value || SESSION_DEFAULTS.masterFormat,
    shortFormTargets: targets.length ? targets : SESSION_DEFAULTS.shortFormTargets
  };
}

function renderHero(root, viewModel) {
  const hero = el("section", "production-workflow-hero", "");
  hero.append(
    el("span", "workflow-kicker", viewModel.recipeId),
    el("h2", "", "Podcast to Shorts"),
    el("p", "", viewModel.goal)
  );
  const badges = el("div", "workflow-badges", "");
  ["ExecutionWorkflow", "ContentVariant", "Lisa canonical identity", "provider calls: 0"].forEach((item) => {
    badges.append(el("span", "", item));
  });
  hero.append(badges);
  root.append(hero);
}

function renderForm(root, viewModel) {
  const card = el("section", "workflow-panel-card production-workflow-form", "");
  card.append(el("h3", "", "Производственная цель"));
  const grid = el("div", "workflow-input-grid", "");

  const topic = el("label", "workflow-field", "");
  const topicInput = el("input", "");
  topicInput.value = viewModel.formDefaults.topic;
  topicInput.dataset.productionInput = "topic";
  topic.append(el("span", "", "Тема"), topicInput);

  const host = el("label", "workflow-field", "");
  const hostInput = el("input", "");
  hostInput.value = viewModel.formDefaults.hostIdentityId;
  hostInput.dataset.productionInput = "hostIdentityId";
  host.append(el("span", "", "Ведущая"), hostInput);

  const language = el("label", "workflow-field", "");
  const languageInput = el("input", "");
  languageInput.value = viewModel.formDefaults.language;
  languageInput.dataset.productionInput = "language";
  language.append(el("span", "", "Язык"), languageInput);

  const format = el("label", "workflow-field", "");
  const formatInput = el("input", "");
  formatInput.value = viewModel.formDefaults.masterFormat;
  formatInput.dataset.productionInput = "masterFormat";
  format.append(el("span", "", "Master format"), formatInput);

  grid.append(topic, host, language, format);

  const targets = el("div", "production-targets", "");
  SESSION_DEFAULTS.shortFormTargets.forEach((target) => {
    const label = el("label", "production-target", "");
    const checkbox = el("input", "");
    checkbox.type = "checkbox";
    checkbox.value = target;
    checkbox.checked = viewModel.formDefaults.shortFormTargets.includes(target);
    checkbox.dataset.productionTarget = "true";
    label.append(checkbox, el("span", "", target));
    targets.append(label);
  });

  const prepare = button(viewModel.ctaLabel, "workflow-primary");
  prepare.dataset.action = "PREPARE_PRODUCTION_WORKFLOW";
  prepare.addEventListener("click", () => refresh(root));

  card.append(grid, el("h3", "", "Short-form targets"), targets, prepare);
  root.append(card);
}

function renderPlan(root, viewModel) {
  const card = el("section", "workflow-panel-card production-workflow-plan", "");
  card.append(el("h3", "", "Execution-grade workflow"));
  const dag = el("div", "workflow-dag", "");
  viewModel.steps.forEach((step, index) => {
    const node = el("article", "workflow-step-node", "");
    node.dataset.status = step.status;
    node.append(
      el("span", "workflow-step-index", String(index + 1)),
      el("strong", "", step.label),
      el("small", "", stepStatusLabels[step.status] || step.status)
    );
    if (step.providerBoundary) node.append(el("em", "", "нужны права и отдельное подтверждение"));
    dag.append(node);
  });
  card.append(dag);
  root.append(card);
}

function renderFrontier(root, viewModel) {
  const grid = el("section", "workflow-two-column", "");
  const frontier = el("article", "workflow-panel-card", "");
  frontier.append(el("h3", "", "Execution Frontier"));
  const status = el("p", "workflow-status", viewModel.executionFrontier.state);
  status.dataset.state = "preflight_blocked";
  const facts = el("ul", "workflow-list", "");
  [
    `next: ${viewModel.executionFrontier.nextAllowedAction}`,
    `current step: ${viewModel.executionFrontier.currentStepId}`,
    `resume: ${viewModel.executionFrontier.resumeToken}`,
    "voice/avatar rendering stays blocked until scoped human approval"
  ].forEach((item) => facts.append(el("li", "", item)));
  frontier.append(status, facts);

  const intelligence = el("article", "workflow-panel-card", "");
  intelligence.append(el("h3", "", "Content Intelligence"));
  const ci = viewModel.contentIntelligenceHandoff;
  const ciList = el("ul", "workflow-list", "");
  [
    `master: ${ci.masterContentAssetId}`,
    `variants: ${ci.variantCount}`,
    `experiment: ${ci.experimentStartState}`,
    "publish disabled"
  ].forEach((item) => ciList.append(el("li", "", item)));
  intelligence.append(ciList);

  grid.append(frontier, intelligence);
  root.append(grid);
}

function renderBoundaries(root, viewModel) {
  const card = el("section", "workflow-panel-card production-workflow-boundaries", "");
  card.append(el("h3", "", "Границы"));
  const list = el("ul", "workflow-list", "");
  [
    `Readiness: ${viewModel.readiness.futureExecutionReady ? "future-ready" : "blocked"}`,
    `Blockers: ${viewModel.readiness.blockers.join(", ")}`,
    `Lisa: ${viewModel.lisa.productionProfileId}`,
    `Provider labels: ${viewModel.providerLabels.normalUx.join(", ")}`,
    "No publish, no payment, no provider execution"
  ].forEach((item) => list.append(el("li", "", item)));
  card.append(list);
  root.append(card);
}

export function renderProductionWorkflow(root, viewModel) {
  root.innerHTML = "";
  root.classList.add("production-workflow-panel");
  root.dataset.route = viewModel.route;
  renderHero(root, viewModel);
  renderForm(root, viewModel);
  renderPlan(root, viewModel);
  renderFrontier(root, viewModel);
  renderBoundaries(root, viewModel);
}

export async function refresh(root) {
  const inputs = root.querySelector("[data-production-input='topic']") ? readForm(root) : SESSION_DEFAULTS;
  const params = new URLSearchParams({
    topic: inputs.topic,
    hostIdentityId: inputs.hostIdentityId,
    language: inputs.language,
    masterFormat: inputs.masterFormat,
    shortFormTargets: inputs.shortFormTargets.join(",")
  });
  const payload = await api(`/api/production/workflow/podcast-to-shorts-foundation?${params.toString()}`);
  renderProductionWorkflow(root, payload.viewModel);
}

export function initProductionWorkflowWorkspace(root) {
  if (!root) return;
  refresh(root).catch((error) => {
    root.innerHTML = "";
    const card = el("section", "workflow-panel-card workflow-failure-card", "");
    card.append(el("h3", "", "Production workflow недоступен"), el("p", "workflow-error", error.message));
    root.append(card);
  });
}
