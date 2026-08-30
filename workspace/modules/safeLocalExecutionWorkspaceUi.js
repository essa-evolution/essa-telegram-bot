const SESSION_ID = "phase21p_workspace";

const capabilityLabels = {
  MEDIA_PROBE: "Показать параметры файла",
  VIDEO_TRIM: "Обрезать видео",
  VIDEO_RESIZE: "Создать версию 320 x 180",
  AUDIO_EXTRACT: "Извлечь аудио"
};

const deferredCapabilities = [
  { capabilityId: "VIDEO_TRANSCODE", label: "Транскодировать видео" },
  { capabilityId: "IMAGE_RESIZE", label: "Изменить размер изображения" },
  { capabilityId: "IMAGE_CONVERT", label: "Конвертировать изображение" }
];

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

function formatNumber(value, suffix = "") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2)}${suffix}`;
}

function stateLabel(state) {
  const labels = {
    PENDING: "Ожидает данных",
    AUTHORIZED: "Разрешено локально",
    RUNNING: "ESSA выполняет задачу локально...",
    SUCCEEDED: "Готово",
    FAILED: "Ошибка выполнения",
    VERIFICATION_FAILED: "Проверка не прошла",
    ROLLED_BACK: "Созданная версия удалена",
    BLOCKED: "Заблокировано",
    CANCELLED: "Отменено"
  };
  return labels[state] || state || "Ожидает данных";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.reason || json.error || `request_failed_${response.status}`);
  }
  return json;
}

function inputsFor(capabilityId, root) {
  if (capabilityId === "VIDEO_TRIM") {
    return {
      startSeconds: Number(root.querySelector("[data-input='startSeconds']")?.value),
      endSeconds: Number(root.querySelector("[data-input='endSeconds']")?.value)
    };
  }
  if (capabilityId === "VIDEO_RESIZE") return { targetProfile: "VIDEO_RESIZE_320x180" };
  if (capabilityId === "AUDIO_EXTRACT") return { targetProfile: "AUDIO_WAV_STANDARD" };
  return {};
}

function currentCapability() {
  const match = window.location.hash.match(/^#execution\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "VIDEO_TRIM";
}

function setCapability(capabilityId) {
  window.location.hash = `#execution/${encodeURIComponent(capabilityId)}`;
}

let refreshTimer = null;
let refreshGeneration = 0;

async function refreshView(root, capabilityId) {
  const generation = ++refreshGeneration;
  const params = new URLSearchParams({
    sessionId: SESSION_ID,
    capabilityId
  });
  Object.entries(inputsFor(capabilityId, root)).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const payload = await api(`/api/safe-local/workspace?${params.toString()}`);
  if (generation !== refreshGeneration) return;
  renderSafeLocalExecutionWorkspace(root, payload.viewModel, payload.history);
}

function scheduleRefresh(root, capabilityId) {
  clearTimeout(refreshTimer);
  refreshGeneration += 1;
  if (capabilityId === "VIDEO_TRIM") {
    const start = Number(root.querySelector("[data-input='startSeconds']")?.value);
    const end = Number(root.querySelector("[data-input='endSeconds']")?.value);
    if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
      const execute = root.querySelector("[data-action='EXECUTE_LOCAL']");
      const status = root.querySelector(".safe-local-status");
      if (execute) {
        execute.disabled = true;
        execute.dataset.enabled = "false";
      }
      if (status) {
        status.dataset.state = "blocked";
        status.textContent = "Проверьте время начала и окончания.";
      }
      return;
    }
  }
  const scheduledGeneration = refreshGeneration;
  refreshTimer = setTimeout(() => {
    if (scheduledGeneration !== refreshGeneration) return;
    refreshView(root, capabilityId).catch((error) => {
      const card = el("section", "safe-local-card result-card", "");
      card.append(el("h3", "", "Не удалось обновить готовность"), el("p", "safe-local-error", error.message));
      root.append(card);
    });
  }, 180);
}

function renderCapabilityTabs(root, activeCapability) {
  const tabs = el("div", "safe-local-tabs", "");
  Object.entries(capabilityLabels).forEach(([capabilityId, label]) => {
    const tab = button(label, "safe-local-tab");
    tab.dataset.capabilityId = capabilityId;
    tab.setAttribute("aria-pressed", String(capabilityId === activeCapability));
    tab.classList.toggle("active", capabilityId === activeCapability);
    tab.addEventListener("click", () => setCapability(capabilityId));
    tabs.append(tab);
  });
  root.append(tabs);
}

function renderAssetCard(root, viewModel) {
  const card = el("section", "safe-local-card source-card", "");
  const title = el("h3", "", "Источник");
  const source = viewModel.sourceAsset;
  const rows = [
    `Файл: ${source.displayName || "не выбран"}`,
    `Длительность: ${formatNumber(source.duration, " c")}`,
    `Размер: ${source.dimensions ? `${source.dimensions.width} x ${source.dimensions.height}` : "—"}`,
    `Аудио: ${source.hasAudio ? "есть" : "—"}`,
    `Вес: ${source.size ? `${Math.round(source.size / 1024)} KB` : "—"}`,
    source.preservedMessage
  ];
  const list = el("ul", "safe-local-list", "");
  rows.forEach((row) => list.append(el("li", "", row)));
  const select = button("Выбрать синтетический файл", "safe-local-primary");
  select.dataset.action = "SELECT_ASSET";
  select.addEventListener("click", async () => {
    const payload = await api("/api/safe-local/fixture", {
      method: "POST",
      body: JSON.stringify({ sessionId: SESSION_ID, capabilityId: viewModel.capabilityId, inputs: inputsFor(viewModel.capabilityId, root) })
    });
    renderSafeLocalExecutionWorkspace(root, payload.viewModel, payload.history);
  });
  card.append(title, list, select);
  root.append(card);
}

function renderInputs(root, viewModel) {
  const card = el("section", "safe-local-card input-card", "");
  card.append(el("h3", "", "Действие"));
  card.append(el("p", "", viewModel.description));
  if (viewModel.capabilityId === "VIDEO_TRIM") {
    const grid = el("div", "safe-local-input-grid", "");
    [
      ["startSeconds", "Начало", viewModel.inputState.values.startSeconds ?? 2],
      ["endSeconds", "Окончание", viewModel.inputState.values.endSeconds ?? 5]
    ].forEach(([key, label, value]) => {
      const wrap = el("label", "safe-local-field", "");
      const input = el("input");
      input.type = "number";
      input.min = "0";
      input.step = "0.1";
      input.value = value;
      input.dataset.input = key;
      input.addEventListener("input", () => scheduleRefresh(root, viewModel.capabilityId));
      wrap.append(el("span", "", label), input);
      grid.append(wrap);
    });
    card.append(grid);
  }
  if (viewModel.capabilityId === "VIDEO_RESIZE") {
    card.append(el("p", "safe-local-profile", "Профиль результата: VIDEO_RESIZE_320x180"));
  }
  if (viewModel.capabilityId === "AUDIO_EXTRACT") {
    card.append(el("p", "safe-local-profile", "Профиль результата: AUDIO_WAV_STANDARD"));
  }
  if (viewModel.missingInputs.length) {
    const missing = el("ul", "safe-local-list warning", "");
    viewModel.missingInputs.forEach((item) => missing.append(el("li", "", item.label)));
    card.append(missing);
  }
  root.append(card);
}

function renderReadiness(root, viewModel) {
  const card = el("section", "safe-local-card readiness-card", "");
  const cta = viewModel.userActions.find((action) => action.action === "EXECUTE_LOCAL");
  card.append(el("h3", "", "Готовность"));
  const status = el("p", "safe-local-status", cta.enabled ? "Готово к локальному выполнению" : (cta.disabledReason || "Ожидает данных"));
  status.dataset.state = cta.enabled ? "ready" : "blocked";
  const facts = el("ul", "safe-local-list", "");
  [
    `Preflight: ${viewModel.preflightState.ready ? "готов" : "не готов"}`,
    `Approval: ${viewModel.approvalState.required ? "требуется" : "не требуется"}`,
    `LocalExecutionEligibility: ${viewModel.eligibility.eligible ? "eligible" : "blocked"}`,
    "Внешний AI-провайдер не используется.",
    "Оплата, публикация и deploy не выполняются."
  ].forEach((row) => facts.append(el("li", "", row)));
  const run = button(cta.label, "safe-local-primary execute");
  run.disabled = !cta.enabled;
  run.dataset.action = "EXECUTE_LOCAL";
  run.dataset.enabled = String(cta.enabled);
  run.addEventListener("click", async () => {
    clearTimeout(refreshTimer);
    const currentInputs = inputsFor(viewModel.capabilityId, root);
    const running = { ...viewModel, executionState: "RUNNING" };
    renderSafeLocalExecutionWorkspace(root, running, []);
    const payload = await api("/api/safe-local/execute", {
      method: "POST",
      body: JSON.stringify({ sessionId: SESSION_ID, capabilityId: viewModel.capabilityId, inputs: currentInputs })
    });
    renderSafeLocalExecutionWorkspace(root, payload.viewModel, payload.history);
  });
  card.append(status, facts, run);
  root.append(card);
}

function renderResult(root, viewModel) {
  const card = el("section", "safe-local-card result-card", "");
  card.dataset.executionState = viewModel.executionState;
  card.append(el("h3", "", stateLabel(viewModel.executionState)));
  if (viewModel.result) card.append(el("p", "safe-local-result-summary", viewModel.result.userSummary));
  if (viewModel.sourcePreserved === true) card.append(el("p", "safe-local-good", "Исходник сохранён."));
  if (viewModel.verification.verified) card.append(el("p", "safe-local-good", viewModel.verification.label));
  if (["FAILED", "VERIFICATION_FAILED", "BLOCKED"].includes(viewModel.executionState)) {
    card.append(el("p", "safe-local-error", viewModel.verification.label || viewModel.eligibility.labels.join(" ")));
  }

  viewModel.derivedArtifacts.forEach((artifact) => {
    const item = el("article", "safe-local-artifact-card", "");
    item.append(
      el("h4", "", artifact.displayName),
      el("p", "", `${artifact.artifactType} · ${artifact.verificationState}`),
      el("p", "", artifact.sourceRelationship),
      el("p", "", artifact.createdAt ? new Date(artifact.createdAt).toLocaleString("ru-RU") : "—")
    );
    const open = el("a", "safe-local-link", "Открыть файл");
    open.href = artifact.access.href;
    open.target = "_blank";
    open.rel = "noreferrer";
    item.append(open);
    card.append(item);
  });

  viewModel.observations.forEach((observation) => {
    const item = el("article", "safe-local-observation-card", "");
    item.append(el("h4", "", "Параметры медиа"));
    const list = el("ul", "safe-local-list", "");
    [
      `Длительность: ${formatNumber(observation.duration, " c")}`,
      `Контейнер: ${observation.container || "—"}`,
      `Видео: ${observation.video?.present ? `${observation.video.codecName || "video"} ${observation.dimensions?.width || "?"} x ${observation.dimensions?.height || "?"}` : "нет"}`,
      `Аудио: ${observation.audio?.present ? `${observation.audio.codecName || "audio"} ${observation.audio.channels || "?"} ch` : "нет"}`,
      `Frame rate: ${observation.frameRate || "—"}`,
      `Вес: ${observation.fileSize ? `${Math.round(observation.fileSize / 1024)} KB` : "—"}`
    ].forEach((row) => list.append(el("li", "", row)));
    item.append(list);
    card.append(item);
  });

  const rollbackAction = viewModel.userActions.find((action) => action.action === "ROLLBACK_DERIVED");
  if (rollbackAction?.enabled && viewModel.result) {
    const rollback = button("Удалить созданную версию", "safe-local-secondary");
    rollback.dataset.action = "ROLLBACK_DERIVED";
    rollback.addEventListener("click", async () => {
      const payload = await api("/api/safe-local/rollback", {
        method: "POST",
        body: JSON.stringify({ sessionId: SESSION_ID, executionId: viewModel.result.executionId, inputs: inputsFor(viewModel.capabilityId, root) })
      });
      renderSafeLocalExecutionWorkspace(root, payload.viewModel, payload.history);
    });
    rollback.disabled = !viewModel.result.executionId;
    card.append(el("p", "", viewModel.rollback.label), rollback);
  }

  const debug = el("details", "safe-local-debug", "");
  debug.append(el("summary", "", "advanced / debug"), el("pre", "", JSON.stringify({
    capabilityId: viewModel.capabilityId,
    executionState: viewModel.executionState,
    eligibility: viewModel.eligibility,
    verification: viewModel.verification,
    sourcePathInRoute: viewModel.inputState.sourcePathInRoute,
    counters: viewModel.externalActionCounters
  }, null, 2)));
  card.append(debug);
  root.append(card);
}

function renderDeferred(root) {
  const card = el("section", "safe-local-card deferred-card", "");
  card.append(el("h3", "", "Недоступно для локального выполнения"));
  deferredCapabilities.forEach((item) => {
    const row = button(item.label, "safe-local-tab disabled");
    row.disabled = true;
    row.dataset.capabilityId = item.capabilityId;
    card.append(row);
  });
  root.append(card);
}

function renderHistory(root, history = []) {
  const card = el("section", "safe-local-card history-card", "");
  card.append(el("h3", "", "История этой сессии"));
  if (!history.length) {
    card.append(el("p", "", "Пока нет выполненных локальных задач."));
  } else {
    history.forEach((item) => {
      card.append(el("p", "", `${capabilityLabels[item.capabilityId] || item.capabilityId}: ${item.status}`));
    });
  }
  root.append(card);
}

export function renderSafeLocalExecutionWorkspace(root, viewModel, history = []) {
  clearTimeout(refreshTimer);
  refreshGeneration += 1;
  root.innerHTML = "";
  root.dataset.route = window.location.hash;
  root.oninput = (event) => {
    if (event.target?.dataset?.input) scheduleRefresh(root, viewModel.capabilityId);
  };
  const header = el("div", "module-section-header safe-local-header", "");
  header.append(el("span", "", "Execution Workspace"), el("p", "", "Без внешних провайдеров, оплаты, публикации и deploy. ESSA выбирает локальный инструмент внутри runtime."));
  root.append(header);
  renderCapabilityTabs(root, viewModel.capabilityId);
  renderAssetCard(root, viewModel);
  renderInputs(root, viewModel);
  renderReadiness(root, viewModel);
  renderResult(root, viewModel);
  renderDeferred(root);
  renderHistory(root, history);
}

export async function initSafeLocalExecutionWorkspace(root) {
  const capabilityId = currentCapability();
  try {
    const payload = await api(`/api/safe-local/workspace?sessionId=${encodeURIComponent(SESSION_ID)}&capabilityId=${encodeURIComponent(capabilityId)}`);
    renderSafeLocalExecutionWorkspace(root, payload.viewModel, payload.history);
  } catch (error) {
    root.innerHTML = "";
    const card = el("section", "safe-local-card result-card", "");
    card.append(el("h3", "", "Execution Workspace недоступен"), el("p", "safe-local-error", error.message));
    root.append(card);
  }
}
