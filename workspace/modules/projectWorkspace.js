import { findProject } from "./projectStorage.js";

export const projectWorkspaceTabs = [
  { key: "blueprint", label: "Blueprint" },
  { key: "workflow", label: "Workflow" },
  { key: "execution", label: "Execution" },
  { key: "assets", label: "Активы" },
  { key: "export", label: "Экспорт" },
  { key: "next", label: "Следующие шаги" }
];

function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Project Workspace option is required: ${key}`);
  }

  return value;
}

export function openProjectWorkspace(projectId, options = {}) {
  const project = findProject(projectId);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось открыть Project Workspace: проект не найден в localStorage.", "error");
    return;
  }

  renderProjectWorkspace(project, options.activeTab || "blueprint", options);
}

export function switchProjectTab(projectId, tabId, options = {}) {
  openProjectWorkspace(projectId, {
    ...options,
    activeTab: tabId
  });
}

export function renderProjectTabs(tabs, activeTabKey, onSelect) {
  tabs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tabKey === activeTabKey);
  });
  onSelect(activeTabKey);
}

export function renderProjectWorkspace(project, activeTab = "blueprint", options = {}) {
  const panel = getRequiredOption(options, "projectWorkspacePanel");
  const projectsPanel = getRequiredOption(options, "projectsPanel");
  const setActive = getRequiredOption(options, "setActive");
  const projectsModule = getRequiredOption(options, "projectsModule");
  const renderProjectsList = getRequiredOption(options, "renderProjectsList");
  const renderTabContent = getRequiredOption(options, "renderTabContent");
  const setActiveProjectId = getRequiredOption(options, "setActiveProjectId");

  setActiveProjectId(project.id);
  setActive(projectsModule);
  projectsPanel.hidden = true;
  panel.hidden = false;
  panel.innerHTML = "";

  const shell = document.createElement("article");
  shell.className = "project-workspace";

  const header = document.createElement("div");
  header.className = "project-workspace-header";

  const titleBlock = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = project.title;

  const meta = document.createElement("p");
  meta.textContent = `${project.type} / ${project.subtype} • ${project.status} • создан ${new Date(project.createdAt).toLocaleString("ru-RU")}`;

  titleBlock.append(title, meta);

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.textContent = "Назад к проектам";
  backButton.addEventListener("click", () => {
    setActiveProjectId("");
    setActive(projectsModule);
    panel.hidden = true;
    projectsPanel.hidden = false;
    renderProjectsList();
  });

  header.append(titleBlock, backButton);

  const tabs = document.createElement("div");
  tabs.className = "project-workspace-tabs";

  const content = document.createElement("div");
  content.className = "project-workspace-content";

  const renderTab = (tabKey) => {
    renderProjectTabs(tabs, tabKey, () => renderTabContent(content, project.id, tabKey));
  };

  projectWorkspaceTabs.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.tabKey = tab.key;
    button.textContent = tab.label;
    button.addEventListener("click", () => renderTab(tab.key));
    tabs.append(button);
  });

  shell.append(header, tabs, content);
  panel.append(shell);
  renderTab(activeTab);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
