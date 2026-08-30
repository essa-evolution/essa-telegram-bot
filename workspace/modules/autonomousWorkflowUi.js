const SESSION_ID = "phase21q_workflow";

const statusLabels = {
  PLANNED: "Запланировано",
  READY: "Готово",
  RUNNING: "Выполняется",
  SUCCEEDED: "Готово",
  PARTIALLY_SUCCEEDED: "Частично готово",
  FAILED: "Ошибка выполнения",
  VERIFICATION_FAILED: "Проверка не прошла",
  ROLLED_BACK: "Созданные версии удалены",
  PARTIALLY_ROLLED_BACK: "Частичный rollback",
  PREFLIGHT_BLOCKED: "Заблокировано preflight"
};

const capabilityLabels = {
  MEDIA_PROBE: "Media probe",
  VIDEO_TRIM: "Video trim",
  VIDEO_RESIZE: "Video resize",
  AUDIO_EXTRACT: "Audio extract"
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

function inputsFor(root) {
  return {
    trimStart: Number(root.querySelector("[data-workflow-input='trimStart']")?.value ?? 2),
    trimEnd: Number(root.querySelector("[data-workflow-input='trimEnd']")?.value ?? 5)
  };
}

function renderHero(root, viewModel) {
  const hero = el("section", "autonomous-workflow-hero", "");
  hero.append(
    el("span", "workflow-kicker", viewModel.recipeId),
    el("h2", "", "Autonomous Workflow Orchestration"),
    el("p", "", viewModel.goal)
  );
  const badges = el("div", "workflow-badges", "");
  [
    viewModel.workflowClass,
    viewModel.executionPolicy.policy,
    "без провайдеров",
    "без публикации"
  ].forEach((item) => badges.append(el("span", "", item)));
  hero.append(badges);
  root.append(hero);
}

function renderSourceAndInputs(root, viewModel) {
  const grid = el("section", "workflow-two-column", "");
  const source = el("article", "workflow-panel-card", "");
  source.append(el("h3", "", "Источник"));
  const sourceRows = el("ul", "workflow-list", "");
  [
    `Файл: ${viewModel.sourceAsset.displayName || "synthetic fixture"}`,
    viewModel.sourceAsset.selected ? "Исходник закреплён и не будет изменён." : "Источник пока не выбран.",
    viewModel.sourceAsset.sourcePathInRoute ? "Путь открыт в route." : "Путь не раскрывается в route."
  ].forEach((row) => sourceRows.append(el("li", "", row)));
  const fixture = button("Обновить synthetic fixture", "workflow-secondary");
  fixture.dataset.action = "SELECT_SYNTHETIC_ASSET";
  fixture.addEventListener("click", async () => {
    const payload = await api("/api/workflow/local-media-repurpose/fixture", {
      method: "POST",
      body: JSON.stringify({ sessionId: SESSION_ID, inputs: inputsFor(root) })
    });
    renderAutonomousWorkflowWorkspace(root, payload.viewModel, payload.history);
  });
  source.append(sourceRows, fixture);

  const inputs = el("article", "workflow-panel-card", "");
  inputs.append(el("h3", "", "Параметры"));
  const fields = el("div", "workflow-input-grid", "");
  [
    ["trimStart", "Начало", viewModel.requiredInputs.trimStart ?? 2],
    ["trimEnd", "Окончание", viewModel.requiredInputs.trimEnd ?? 5]
  ].forEach(([key, label, value]) => {
    const wrap = el("label", "workflow-field", "");
    const input = el("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.1";
    input.value = value;
    input.dataset.workflowInput = key;
    input.addEventListener("change", () => refresh(root));
    wrap.append(el("span", "", label), input);
    fields.append(wrap);
  });
  inputs.append(fields);
  grid.append(source, inputs);
  root.append(grid);
}

function renderDag(root, viewModel) {
  const card = el("section", "workflow-panel-card workflow-dag-card", "");
  card.append(el("h3", "", "DAG"));
  const lanes = el("div", "workflow-dag", "");
  viewModel.steps.forEach((step, index) => {
    const item = el("article", "workflow-step-node", "");
    item.dataset.status = step.status;
    item.append(
      el("span", "workflow-step-index", String(index + 1)),
      el("strong", "", capabilityLabels[step.capabilityId] || step.capabilityId),
      el("small", "", statusLabels[step.status] || step.status)
    );
    if (step.dependsOn.length) item.append(el("em", "", `после ${step.dependsOn.join(", ")}`));
    lanes.append(item);
  });
  card.append(lanes);
  root.append(card);
}

function renderReadiness(root, viewModel) {
  const card = el("section", "workflow-panel-card workflow-readiness-card", "");
  const action = viewModel.userActions.find((item) => item.action === "EXECUTE_WORKFLOW");
  const status = el("p", "workflow-status", action.enabled ? "Готово к локальному workflow" : (action.disabledReason || statusLabels[viewModel.status]));
  status.dataset.state = action.enabled ? "ready" : viewModel.status.toLowerCase();
  const facts = el("ul", "workflow-list", "");
  [
    `Preflight: ${viewModel.readiness.workflowReady ? "готов" : "blocked"}`,
    `Шаги: ${viewModel.steps.length}`,
    `Bindings: ${viewModel.readiness.bindingIssues.length ? "есть ошибки" : "resolved"}`,
    "Выполняются только MEDIA_PROBE, VIDEO_TRIM, VIDEO_RESIZE и AUDIO_EXTRACT.",
    "Внешние модели, оплата, deploy и publish не вызываются."
  ].forEach((row) => facts.append(el("li", "", row)));
  const run = button(action.label, "workflow-primary");
  run.dataset.action = "EXECUTE_WORKFLOW";
  run.disabled = !action.enabled;
  run.addEventListener("click", async () => {
    const running = {
      ...viewModel,
      status: "RUNNING",
      steps: viewModel.steps.map((step, index) => ({
        ...step,
        status: index === 0 ? "RUNNING" : "WAITING_FOR_DEPENDENCY"
      }))
    };
    renderAutonomousWorkflowWorkspace(root, running, []);
    const payload = await api("/api/workflow/local-media-repurpose/execute", {
      method: "POST",
      body: JSON.stringify({
        sessionId: SESSION_ID,
        inputs: inputsFor(root),
        expectedWorkflowVersion: viewModel.workflowVersion
      })
    });
    renderAutonomousWorkflowWorkspace(root, payload.viewModel, payload.history);
  });
  const fail = button("Проверить отказ resize", "workflow-secondary");
  fail.dataset.action = "SIMULATE_RESIZE_FAILURE";
  fail.addEventListener("click", async () => {
    const payload = await api("/api/workflow/local-media-repurpose/execute", {
      method: "POST",
      body: JSON.stringify({
        sessionId: `${SESSION_ID}_failure_${Date.now()}`,
        inputs: inputsFor(root),
        simulateStepFailure: "VIDEO_RESIZE"
      })
    });
    renderFailurePreview(root, payload.viewModel);
  });
  const actions = el("div", "workflow-actions", "");
  actions.append(run, fail);
  card.append(el("h3", "", "Готовность"), status, facts, actions);
  root.append(card);
}

function renderOutputs(root, viewModel) {
  const card = el("section", "workflow-panel-card workflow-output-card", "");
  card.dataset.workflowState = viewModel.status;
  card.append(el("h3", "", statusLabels[viewModel.status] || viewModel.status));
  if (viewModel.verification?.verified) {
    card.append(el("p", "workflow-good", "Workflow verified: все шаги завершены, lineage собран, исходник сохранён."));
  }
  if (["FAILED", "VERIFICATION_FAILED", "PARTIALLY_SUCCEEDED"].includes(viewModel.status)) {
    card.append(el("p", "workflow-error", "Непроверенные downstream-результаты не выдаются как успех."));
  }
  const outputs = el("div", "workflow-output-grid", "");
  (viewModel.finalOutputs || []).forEach((output) => {
    const item = el("article", "workflow-output-item", "");
    item.append(
      el("strong", "", output.outputName),
      el("span", "", output.outputRole),
      el("small", "", output.artifact?.localPathRef ? output.artifact.localPathRef.split(/[\\/]/).pop() : "observation")
    );
    outputs.append(item);
  });
  card.append(outputs);
  if (viewModel.rollback?.available) {
    const rollback = button(viewModel.rollback.label || "Rollback", "workflow-secondary");
    rollback.dataset.action = "ROLLBACK_WORKFLOW";
    rollback.addEventListener("click", async () => {
      const payload = await api("/api/workflow/local-media-repurpose/rollback", {
        method: "POST",
        body: JSON.stringify({ sessionId: SESSION_ID })
      });
      renderAutonomousWorkflowWorkspace(root, payload.viewModel, payload.history);
    });
    card.append(rollback);
  }
  root.append(card);
}

function renderLineage(root, viewModel) {
  const card = el("section", "workflow-panel-card workflow-lineage-card", "");
  card.append(el("h3", "", "Lineage"));
  const list = el("ul", "workflow-list", "");
  (viewModel.lineage?.edges || []).forEach((edge) => list.append(el("li", "", `${edge.from} -> ${edge.to}`)));
  if (!viewModel.lineage?.edges?.length) list.append(el("li", "", "Lineage появится после выполнения."));
  card.append(list);
  root.append(card);
}

function renderFailurePreview(root, viewModel) {
  const existing = root.querySelector(".workflow-failure-card");
  existing?.remove();
  const card = el("section", "workflow-panel-card workflow-failure-card", "");
  card.append(el("h3", "", "Failure UX"));
  card.append(el("p", "workflow-error", `Сценарий отказа: ${statusLabels[viewModel.status] || viewModel.status}`));
  const list = el("ul", "workflow-list", "");
  viewModel.steps.forEach((step) => list.append(el("li", "", `${capabilityLabels[step.capabilityId]}: ${statusLabels[step.status] || step.status}`)));
  card.append(list);
  root.append(card);
}

export function renderAutonomousWorkflowWorkspace(root, viewModel, history = []) {
  root.innerHTML = "";
  root.classList.add("autonomous-workflow-panel");
  renderHero(root, viewModel);
  renderSourceAndInputs(root, viewModel);
  renderDag(root, viewModel);
  renderReadiness(root, viewModel);
  renderOutputs(root, viewModel);
  renderLineage(root, viewModel);
  if (history.length) {
    const card = el("section", "workflow-panel-card workflow-history-card", "");
    card.append(el("h3", "", "История"));
    const list = el("ul", "workflow-list", "");
    history.forEach((item) => list.append(el("li", "", `${item.recipeId}: ${statusLabels[item.status] || item.status}`)));
    card.append(list);
    root.append(card);
  }
}

export async function refresh(root) {
  const params = new URLSearchParams({ sessionId: SESSION_ID });
  Object.entries(inputsFor(root)).forEach(([key, value]) => {
    if (Number.isFinite(value)) params.set(key, value);
  });
  const payload = await api(`/api/workflow/local-media-repurpose?${params.toString()}`);
  renderAutonomousWorkflowWorkspace(root, payload.viewModel, payload.history);
}

export function initAutonomousWorkflowWorkspace(root) {
  if (!root) return;
  refresh(root).catch((error) => {
    root.innerHTML = "";
    const card = el("section", "workflow-panel-card workflow-failure-card", "");
    card.append(el("h3", "", "Workflow недоступен"), el("p", "workflow-error", error.message));
    root.append(card);
  });
}
