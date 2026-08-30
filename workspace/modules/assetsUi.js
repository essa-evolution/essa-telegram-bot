function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Assets UI option is required: ${key}`);
  }

  return value;
}

function getProjectById(projectId, options) {
  return options.loadProjects().find((item) => item.id === projectId) || null;
}

function updateAssetProject(projectId, updater, options) {
  const updateProject = getRequiredOption(options, "updateProject");
  const renderProjectsList = options.renderProjectsList || (() => {});
  const project = updateProject(projectId, updater);

  if (project) {
    renderProjectsList();
  }

  return project;
}

export function addAsset(projectId, categoryKey, options = {}) {
  const category = options.projectAssetCategories?.find((item) => item.key === categoryKey);
  const title = window.prompt(`Название актива: ${category?.label || categoryKey}`);

  if (!title) {
    return null;
  }

  const description = window.prompt("Описание актива:", "") || "";
  const content = window.prompt("Содержимое / заметка:", "");

  if (!content) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const savedAsset = {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    type: categoryKey,
    description,
    content,
    createdAt,
    updatedAt: createdAt
  };

  const project = updateAssetProject(projectId, (currentProject) => ({
    assets: {
      ...(currentProject.assets || {}),
      [categoryKey]: [
        ...(currentProject.assets?.[categoryKey] || []),
        savedAsset
      ]
    }
  }), options);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось сохранить актив: проект не найден в localStorage.", "error");
    return null;
  }

  options.showChatMessage?.("navigator", `Актив сохранён: ${savedAsset.title}`);
  return savedAsset;
}

export function openAsset(projectId, categoryKey, assetId, options = {}) {
  const project = getProjectById(projectId, options);
  const category = options.projectAssetCategories?.find((item) => item.key === categoryKey);
  const asset = project?.assets?.[categoryKey]?.find((item) => item.id === assetId);

  if (!project || !category || !asset) {
    options.showChatMessage?.("navigator", "Не получилось открыть актив: он не найден в localStorage.", "error");
    return;
  }

  options.showChatMessage?.(
    "navigator",
    `Актив: ${asset.title}
Категория: ${category.label}
Создан: ${new Date(asset.createdAt).toLocaleString("ru-RU")}
Обновлён: ${new Date(asset.updatedAt).toLocaleString("ru-RU")}

Описание:
${asset.description || "Без описания"}

Содержимое:
${asset.content}`
  );
}

export function editAsset(projectId, categoryKey, assetId, options = {}) {
  const project = getProjectById(projectId, options);
  const asset = project?.assets?.[categoryKey]?.find((item) => item.id === assetId);

  if (!asset) {
    options.showChatMessage?.("navigator", "Не получилось редактировать актив: он не найден в localStorage.", "error");
    return null;
  }

  const title = window.prompt("Название актива:", asset.title);

  if (!title) {
    return null;
  }

  const description = window.prompt("Описание актива:", asset.description || "") || "";
  const content = window.prompt("Содержимое / заметка:", asset.content);

  if (!content) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  const updatedAsset = {
    ...asset,
    title,
    description,
    content,
    updatedAt
  };

  const updatedProject = updateAssetProject(projectId, (currentProject) => ({
    assets: {
      ...(currentProject.assets || {}),
      [categoryKey]: (currentProject.assets?.[categoryKey] || []).map((item) =>
        item.id === assetId ? updatedAsset : item
      )
    }
  }), options);

  if (updatedProject) {
    options.showChatMessage?.("navigator", `Актив обновлён: ${updatedAsset.title}`);
  }

  return updatedAsset;
}

export function duplicateAsset(projectId, categoryKey, assetId, options = {}) {
  const project = getProjectById(projectId, options);
  const asset = project?.assets?.[categoryKey]?.find((item) => item.id === assetId);

  if (!asset) {
    options.showChatMessage?.("navigator", "Не получилось дублировать актив: он не найден в localStorage.", "error");
    return null;
  }

  const createdAt = new Date().toISOString();
  const copy = {
    ...asset,
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: `${asset.title} copy`,
    createdAt,
    updatedAt: createdAt
  };

  const updatedProject = updateAssetProject(projectId, (currentProject) => ({
    assets: {
      ...(currentProject.assets || {}),
      [categoryKey]: [
        ...(currentProject.assets?.[categoryKey] || []),
        copy
      ]
    }
  }), options);

  if (updatedProject) {
    options.showChatMessage?.("navigator", `Актив продублирован: ${copy.title}`);
  }

  return copy;
}

export function deleteAsset(projectId, categoryKey, assetId, options = {}) {
  const project = getProjectById(projectId, options);
  const asset = project?.assets?.[categoryKey]?.find((item) => item.id === assetId);

  if (!asset) {
    options.showChatMessage?.("navigator", "Не получилось удалить актив: он не найден в localStorage.", "error");
    return;
  }

  const confirmed = window.confirm(`Удалить актив «${asset.title}»?`);

  if (!confirmed) {
    return;
  }

  const updatedProject = updateAssetProject(projectId, (currentProject) => ({
    assets: {
      ...(currentProject.assets || {}),
      [categoryKey]: (currentProject.assets?.[categoryKey] || []).filter((item) => item.id !== assetId)
    }
  }), options);

  if (updatedProject) {
    options.showChatMessage?.("navigator", `Актив удалён: ${asset.title}`);
  }
}

export async function copyAsset(projectId, categoryKey, assetId, options = {}) {
  const project = getProjectById(projectId, options);
  const asset = project?.assets?.[categoryKey]?.find((item) => item.id === assetId);

  if (!asset) {
    options.showChatMessage?.("navigator", "Не получилось скопировать актив: он не найден в localStorage.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(asset.content);
    options.showChatMessage?.("navigator", `Содержимое актива скопировано: ${asset.title}`);
  } catch (error) {
    options.showChatMessage?.("navigator", "Не получилось скопировать актив через clipboard. Откройте актив и скопируйте текст вручную.", "error");
  }
}

export function openAssetsCategory(projectId, categoryKey, options = {}) {
  const project = getProjectById(projectId, options);
  const category = options.projectAssetCategories?.find((item) => item.key === categoryKey);
  const items = project?.assets?.[categoryKey] || [];

  if (!project || !category) {
    options.showChatMessage?.("navigator", "Не получилось открыть активы: проект или категория не найдены.", "error");
    return;
  }

  const content = items.length
    ? items
      .map((asset, index) => `${index + 1}. ${asset.title}\n${asset.description || "Без описания"}\n\n${asset.content}`)
      .join("\n\n━━━━━━━━━━━━━━━━━━\n\n")
    : "В этой категории пока нет активов.";

  options.showChatMessage?.("navigator", `Активы проекта: ${category.label}\n\n${content}`);
}

export function renderAssetsTab(project, options = {}) {
  const container = getRequiredOption(options, "content");
  const categories = getRequiredOption(options, "projectAssetCategories");
  const wrapper = document.createElement("div");
  wrapper.className = "project-assets";

  const title = document.createElement("h4");
  title.textContent = "Активы проекта";

  const grid = document.createElement("div");
  grid.className = "project-assets-grid";

  const renderGrid = () => {
    grid.innerHTML = "";

    categories.forEach((category) => {
      const freshProject = getProjectById(project.id, options);
      const items = freshProject?.assets?.[category.key] || [];
      const row = document.createElement("div");
      row.className = "project-asset-row";

      const header = document.createElement("div");
      header.className = "project-asset-row-header";

      const name = document.createElement("strong");
      name.textContent = category.label;

      const count = document.createElement("span");
      count.textContent = `${items.length} элементов`;

      const actions = document.createElement("div");
      actions.className = "project-asset-actions";

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.textContent = "Добавить";
      addButton.addEventListener("click", () => {
        addAsset(project.id, category.key, options);
        renderGrid();
      });

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.textContent = "Открыть";
      openButton.addEventListener("click", () => openAssetsCategory(project.id, category.key, options));

      actions.append(addButton, openButton);
      header.append(name, count, actions);
      row.append(header);

      if (items.length) {
        const assetList = document.createElement("div");
        assetList.className = "project-asset-list";

        items.forEach((asset) => {
          const item = document.createElement("div");
          item.className = "project-asset-item";

          const meta = document.createElement("div");
          meta.className = "project-asset-meta";

          const itemTitle = document.createElement("strong");
          itemTitle.textContent = asset.title;

          const itemDates = document.createElement("span");
          itemDates.textContent = `создан ${new Date(asset.createdAt).toLocaleString("ru-RU")} • обновлён ${new Date(asset.updatedAt).toLocaleString("ru-RU")}`;

          const itemActions = document.createElement("div");
          itemActions.className = "project-asset-actions project-asset-item-actions";

          [
            ["Открыть", () => openAsset(project.id, category.key, asset.id, options)],
            ["Редактировать", () => {
              editAsset(project.id, category.key, asset.id, options);
              renderGrid();
            }],
            ["Дублировать", () => {
              duplicateAsset(project.id, category.key, asset.id, options);
              renderGrid();
            }],
            ["Удалить", () => {
              deleteAsset(project.id, category.key, asset.id, options);
              renderGrid();
            }],
            ["Скопировать", () => copyAsset(project.id, category.key, asset.id, options)]
          ].forEach(([label, handler]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.addEventListener("click", handler);
            itemActions.append(button);
          });

          meta.append(itemTitle, itemDates);
          item.append(meta, itemActions);
          assetList.append(item);
        });

        row.append(assetList);
      }

      grid.append(row);
    });
  };

  renderGrid();

  wrapper.append(title, grid);
  container.append(wrapper);
}
