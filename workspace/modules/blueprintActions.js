function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Blueprint actions option is required: ${key}`);
  }

  return value;
}

function getProjectById(projectId, options) {
  const loadProjects = getRequiredOption(options, "loadProjects");
  return loadProjects().find((item) => item.id === projectId) || null;
}

function hasPendingBlueprintUpdates(project) {
  return [...(project.changeRequests || []), ...(project.additions || [])]
    .some((item) => !item.processed);
}

function appendBlueprintNotes(wrapper, title, items) {
  if (!items?.length) {
    return;
  }

  const notes = document.createElement("div");
  notes.className = "core-blueprint-notes";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const list = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    const processed = item.processed ? " · обработано" : "";
    li.textContent = `${item.text} (${new Date(item.createdAt).toLocaleString("ru-RU")}${processed})`;
    list.append(li);
  });

  notes.append(heading, list);
  wrapper.append(notes);
}

function updateStoredProject(projectId, updater, options) {
  const updateProject = getRequiredOption(options, "updateProject");
  const nextProject = updateProject(projectId, updater);

  if (!nextProject) {
    options.showChatMessage?.("navigator", "Не получилось обновить проект: он не найден в localStorage.", "error");
    return null;
  }

  options.renderProjectsList?.();
  return nextProject;
}

function formatBlueprintUpdateSection(title, items) {
  const pendingItems = (items || []).filter((item) => !item.processed);

  if (!pendingItems.length) {
    return "";
  }

  const content = pendingItems
    .map((item, index) => `${index + 1}. ${item.text}`)
    .join("\n");

  return `\n\n## ${title}\n\n${content}`;
}

function stripBlueprintUpdateSections(blueprintText) {
  return String(blueprintText || "")
    .replace(/\n\n## Изменения и уточнения[\s\S]*?(?=\n\n## Дополнения|\n\n## Что делаем дальше\?|$)/g, "")
    .replace(/\n\n## Дополнения[\s\S]*?(?=\n\n## Что делаем дальше\?|$)/g, "")
    .trim();
}

function markBlueprintItemsProcessed(items, processedAt) {
  return (items || []).map((item) => item.processed
    ? item
    : {
      ...item,
      processed: true,
      processedAt
    });
}

export function approveBlueprint(projectId, options = {}) {
  const approvedAt = new Date().toISOString();
  const project = updateStoredProject(projectId, () => ({
    status: "approved",
    approvedAt
  }), options);

  if (project) {
    options.showChatMessage?.("navigator", `✅ Blueprint утверждён: ${project.title}`);
    options.openProjectWorkspace?.(projectId, "blueprint");
  }
}

export function requestBlueprintChange(projectId, options = {}) {
  const text = window.prompt("Что нужно изменить?");

  if (!text) {
    return;
  }

  const project = updateStoredProject(projectId, (currentProject, createdAt) => ({
    changeRequests: [
      ...(currentProject.changeRequests || []),
      {
        id: `change_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt,
        processed: false,
        processedAt: null
      }
    ]
  }), options);

  if (project) {
    options.showChatMessage?.("navigator", "✏️ Запрос изменения сохранён.");
    options.openProjectWorkspace?.(projectId, "blueprint");
  }
}

export function requestBlueprintAddition(projectId, options = {}) {
  const text = window.prompt("Что нужно добавить?");

  if (!text) {
    return;
  }

  const project = updateStoredProject(projectId, (currentProject, createdAt) => ({
    additions: [
      ...(currentProject.additions || []),
      {
        id: `addition_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt,
        processed: false,
        processedAt: null
      }
    ]
  }), options);

  if (project) {
    options.showChatMessage?.("navigator", "➕ Дополнение сохранено.");
    options.openProjectWorkspace?.(projectId, "blueprint");
  }
}

export function rebuildBlueprint(projectId, options = {}) {
  const project = getProjectById(projectId, options);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось пересобрать Blueprint: проект не найден.", "error");
    return;
  }

  if (!hasPendingBlueprintUpdates(project)) {
    options.showChatMessage?.("navigator", "Нет новых изменений или дополнений для пересборки Blueprint.");
    return;
  }

  const changeSection = formatBlueprintUpdateSection("Изменения и уточнения", project.changeRequests);
  const additionsSection = formatBlueprintUpdateSection("Дополнения", project.additions);
  const baseBlueprint = stripBlueprintUpdateSections(project.finalBlueprintText || "# ESSA Blueprint");
  const finalBlockMarker = "\n\n## Что делаем дальше?";
  const finalBlockIndex = baseBlueprint.indexOf(finalBlockMarker);
  const updateSections = `${changeSection}${additionsSection}`;
  const nextBlueprint = finalBlockIndex >= 0
    ? `${baseBlueprint.slice(0, finalBlockIndex)}${updateSections}${baseBlueprint.slice(finalBlockIndex)}`
    : `${baseBlueprint}${updateSections}`;
  const processedAt = new Date().toISOString();

  const updatedProject = updateStoredProject(projectId, (currentProject) => ({
    finalBlueprintText: nextBlueprint,
    status: "blueprint_updated",
    generatedSections: {
      ...(currentProject.generatedSections || {}),
      blueprint_update: `${changeSection}${additionsSection}`.trim()
    },
    changeRequests: markBlueprintItemsProcessed(currentProject.changeRequests, processedAt),
    additions: markBlueprintItemsProcessed(currentProject.additions, processedAt)
  }), options);

  if (updatedProject) {
    options.showChatMessage?.("navigator", "🔄 Blueprint пересобран и сохранён.");
    options.openProjectWorkspace?.(projectId, "blueprint");
  }
}

export function renderBlueprintActions(project, options = {}) {
  const content = getRequiredOption(options, "content");
  const wrapper = document.createElement("div");
  wrapper.className = "core-blueprint-actions";

  const title = document.createElement("h3");
  title.textContent = "Что делаем дальше?";

  const actions = document.createElement("div");
  actions.className = "message-actions";

  [
    ["✅ Утвердить Blueprint", () => approveBlueprint(project.id, options)],
    ["✏️ Изменить Blueprint", () => requestBlueprintChange(project.id, options)],
    ["➕ Дополнить Blueprint", () => requestBlueprintAddition(project.id, options)],
    ["📦 Создать активы", () => {
      options.showChatMessage?.("navigator", "Создайте или добавьте активы проекта: тексты, визуалы, озвучку, публикации.");
      options.openProjectWorkspace?.(project.id, "assets");
    }],
    ["📤 Экспортировать", () => options.openProjectWorkspace?.(project.id, "export")],
    ["▶️ Продолжить проект", () => options.openProjectWorkspace?.(project.id, "next")]
  ].forEach(([label, handler]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = false;
    button.addEventListener("click", handler);
    actions.append(button);
  });

  if (hasPendingBlueprintUpdates(project)) {
    const rebuildButton = document.createElement("button");
    rebuildButton.type = "button";
    rebuildButton.textContent = "🔄 Пересобрать Blueprint";
    rebuildButton.disabled = false;
    rebuildButton.addEventListener("click", () => rebuildBlueprint(project.id, options));
    actions.append(rebuildButton);
  }

  wrapper.append(title, actions);

  if (project.approvedAt) {
    const approved = document.createElement("p");
    approved.className = "core-blueprint-status";
    approved.textContent = `Утверждён: ${new Date(project.approvedAt).toLocaleString("ru-RU")}`;
    wrapper.append(approved);
  }

  appendBlueprintNotes(wrapper, "Запросы изменений", project.changeRequests);
  appendBlueprintNotes(wrapper, "Дополнения", project.additions);
  content.append(wrapper);
}
