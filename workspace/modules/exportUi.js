import { projectAssetCategories } from "./projectStorage.js";

const exportActions = [
  { key: "copy_blueprint", label: "📋 Скопировать Blueprint" },
  { key: "download_txt", label: "📄 Скачать TXT" },
  { key: "editing_package", label: "🎬 Подготовить пакет для монтажа" },
  { key: "publication_package", label: "📤 Подготовить пакет публикации" }
];

function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Export UI option is required: ${key}`);
  }

  return value;
}

function getProjectById(projectId, options) {
  const loadProjects = getRequiredOption(options, "loadProjects");
  return loadProjects().find((item) => item.id === projectId) || null;
}

function formatProjectSnapshot(project) {
  const updates = (project.updates || [])
    .map((update) => `\n\n${update.title}\n${update.content}`)
    .join("");

  return `${project.finalBlueprintText}${updates}`;
}

function formatProjectAssetsForExport(project) {
  return projectAssetCategories
    .map((category) => {
      const items = project.assets?.[category.key] || [];

      if (!items.length) {
        return "";
      }

      const formattedItems = items
        .map((asset, index) => `${index + 1}. ${asset.title}\nТип: ${asset.type}\nОписание: ${asset.description || "нет"}\nСодержимое:\n${asset.content}`)
        .join("\n\n");

      return `${category.label}\n${formattedItems}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatProjectExportText(project) {
  const generatedSections = Object.entries(project.generatedSections || {})
    .map(([key, value]) => `\n\n[${key}]\n${value}`)
    .join("");
  const assets = formatProjectAssetsForExport(project);
  const nextActions = (project.nextActions || [])
    .map((action) => `- ${action}`)
    .join("\n");

  return `ESSA Production Project

Название: ${project.title}
Тип: ${project.type} / ${project.subtype}
Статус: ${project.status}
Дата создания: ${new Date(project.createdAt).toLocaleString("ru-RU")}
Последнее обновление: ${project.lastUpdatedAt ? new Date(project.lastUpdatedAt).toLocaleString("ru-RU") : "нет"}

BLUEPRINT
${project.finalBlueprintText}

GENERATED SECTIONS
${generatedSections || "Пока нет."}

PROJECT ASSETS
${assets || "Пока нет."}

NEXT ACTIONS
${nextActions || "Пока нет."}`;
}

function makeSafeFileName(value) {
  return String(value || "essa-production-project")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "essa-production-project";
}

function getAnswer(project, key, fallback = "Нужно уточнить") {
  return String(project.workflowAnswers?.[key] || project.workflowState?.answers?.[key] || "").trim() || fallback;
}

function buildEditingPackage(project) {
  const idea = getAnswer(project, "idea", project.title);
  const concept = getAnswer(project, "concept", "ясное, живое впечатление");
  const script = getAnswer(project, "script", "показать главную мысль проекта в первые секунды");
  const voice = getAnswer(project, "voice", "спокойная уверенная подача");
  const visualStyle = getAnswer(project, "visual_style", "чистый визуальный стиль");
  const images = getAnswer(project, "images", "кадры и визуалы по теме проекта");

  return {
    title: "🎬 Монтажный пакет",
    content: `Сценарий:
${script}

Озвучка:
${voice}

Сцены:
1. Хук: ${script}
2. Раскрытие идеи: ${idea}
3. Смысловой акцент: ${concept}
4. Финальный CTA.

Визуальные промпты:
- ${images}
- Атмосфера: ${visualStyle}
- Детали: свет, движение, крупные планы, чистые переходы.

Тайминг:
- 0-3 сек: хук.
- 3-10 сек: идея.
- 10-20 сек: раскрытие.
- 20-30 сек: CTA.

Музыка / атмосфера:
${concept}. Музыка должна поддерживать смысл, не спорить с голосом.

Субтитры:
Короткие фразы, 1 смысл на экран, ключевые слова выделять.

CTA:
Сохранить, перейти, написать, попробовать — выбрать под площадку.`
  };
}

function buildPublishingPackage(project) {
  const publication = getAnswer(project, "publication", "заголовок, подпись, CTA и хэштеги");

  return {
    title: "📤 Пакет публикации",
    content: `Title:
${project.title}

Caption:
${publication}

Hashtags:
#ESSA #ESSAEvolution #путьксебе #production #осознанность

Platform notes:
- Telegram: добавить живое вступление и ссылку / следующий шаг.
- Reels / Shorts / TikTok: первые 2 секунды должны держать внимание.
- YouTube: добавить описание и закреплённый комментарий.

Checklist before posting:
- Проверить обложку.
- Проверить звук.
- Проверить субтитры.
- Проверить CTA.
- Проверить формат площадки.
- Проверить, что текст не перегружен.`
  };
}

function saveExportPackage(projectId, actionKey, section, options) {
  const updateProject = getRequiredOption(options, "updateProject");
  const saveProjectSectionAsAsset = options.saveProjectSectionAsAsset || (() => {});
  const createdAt = new Date().toISOString();
  const update = {
    id: `update_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: actionKey,
    title: section.title,
    content: section.content,
    createdAt
  };

  const project = updateProject(projectId, (currentProject) => {
    const nextProject = {
      ...currentProject,
      updates: [...(currentProject.updates || []), update],
      generatedSections: {
        ...(currentProject.generatedSections || {}),
        [actionKey]: section.content
      }
    };

    saveProjectSectionAsAsset(nextProject, actionKey, section, createdAt);
    return nextProject;
  });

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось обновить проект: он не найден в localStorage.", "error");
    return null;
  }

  options.renderProjectsList?.();
  options.showChatMessage?.("navigator", `${section.title}\n${section.content}`);
  return project;
}

export function renderExportTab(project, options = {}) {
  const container = getRequiredOption(options, "content");
  const wrapper = document.createElement("div");
  wrapper.className = "project-next-actions project-export-actions";

  const title = document.createElement("h4");
  title.textContent = "Экспорт";

  const actions = document.createElement("div");
  actions.className = "message-actions";

  exportActions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.disabled = false;

    if (action.key === "copy_blueprint") {
      button.addEventListener("click", () => copyBlueprint(project.id, options));
    } else if (action.key === "download_txt") {
      button.addEventListener("click", () => downloadTxt(project.id, options));
    } else if (action.key === "editing_package") {
      button.addEventListener("click", () => prepareEditingPackage(project.id, options));
    } else if (action.key === "publication_package") {
      button.addEventListener("click", () => preparePublishingPackage(project.id, options));
    }

    actions.append(button);
  });

  wrapper.append(title, actions);
  container.append(wrapper);
}

export async function copyBlueprint(projectId, options = {}) {
  const project = getProjectById(projectId, options);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось скопировать проект: он не найден в localStorage.", "error");
    return;
  }

  const text = formatProjectSnapshot(project);

  try {
    await navigator.clipboard.writeText(text);
    options.showChatMessage?.("navigator", "📋 Blueprint скопирован в clipboard.");
  } catch (error) {
    options.showChatMessage?.("navigator", "Не получилось скопировать через clipboard. Откройте проект и скопируйте текст вручную.", "error");
  }
}

export function downloadTxt(projectId, options = {}) {
  const project = getProjectById(projectId, options);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось скачать проект: он не найден в localStorage.", "error");
    return;
  }

  const blob = new Blob([formatProjectExportText(project)], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${makeSafeFileName(project.title)}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  options.showChatMessage?.("navigator", "📄 TXT-файл подготовлен и скачивается.");
}

export function prepareEditingPackage(projectId, options = {}) {
  const project = getProjectById(projectId, options);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось подготовить монтажный пакет: проект не найден в localStorage.", "error");
    return null;
  }

  return saveExportPackage(projectId, "editing_package", buildEditingPackage(project), options);
}

export function preparePublishingPackage(projectId, options = {}) {
  const project = getProjectById(projectId, options);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось подготовить пакет публикации: проект не найден в localStorage.", "error");
    return null;
  }

  return saveExportPackage(projectId, "publication_package", buildPublishingPackage(project), options);
}
