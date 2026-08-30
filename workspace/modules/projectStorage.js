export const PROJECTS_STORAGE_KEY = "essa_projects";

export const projectAssetCategories = [
  { key: "texts", label: "Тексты" },
  { key: "voice", label: "Озвучка" },
  { key: "visuals", label: "Визуалы" },
  { key: "video", label: "Видео" },
  { key: "music", label: "Музыка" },
  { key: "documents", label: "Документы" },
  { key: "publications", label: "Публикации" }
];

export function getEmptyProjectAssets() {
  return projectAssetCategories.reduce((assets, category) => {
    assets[category.key] = [];
    return assets;
  }, {});
}

export function normalizeProjectWorkflowState(workflowState) {
  if (!workflowState) {
    return null;
  }

  const steps = Array.isArray(workflowState.steps) ? workflowState.steps : [];

  return {
    ...workflowState,
    currentStepIndex: Number.isInteger(workflowState.currentStepIndex) ? workflowState.currentStepIndex : 0,
    steps,
    answers: workflowState.answers || {},
    completed: Boolean(workflowState.completed),
    started: Boolean(workflowState.started)
  };
}

export function normalizeProjectAsset(asset, categoryKey, index = 0) {
  const safeAsset = asset || {};
  const createdAt = safeAsset.createdAt || safeAsset.updatedAt || new Date().toISOString();

  return {
    id: safeAsset.id || `asset_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    title: safeAsset.title || "Без названия",
    type: safeAsset.type || categoryKey,
    description: safeAsset.description || "",
    content: safeAsset.content || "",
    createdAt,
    updatedAt: safeAsset.updatedAt || createdAt
  };
}

export function normalizeProjectExecutionPlan(executionPlan) {
  if (!executionPlan) {
    return null;
  }

  const safePlan = executionPlan || {};
  const steps = Array.isArray(safePlan.steps) ? safePlan.steps : [];
  const normalizedSteps = steps.map((step, index) => ({
    ...step,
    id: step.id || `step_${index + 1}`,
    executionStatus: step.executionStatus || "not_started",
    requiresApproval: step.requiresApproval !== false,
    approvalStatus: step.approvalStatus || "pending",
    approvedAt: step.approvedAt || null,
    changeNote: step.changeNote || ""
  }));
  const status = normalizedSteps.length && normalizedSteps.every((step) => step.executionStatus === "completed")
    ? "completed"
    : normalizedSteps.length && normalizedSteps.every((step) => step.approvalStatus === "approved")
      ? "ready_to_execute"
      : normalizedSteps.some((step) => step.approvalStatus === "delayed" || step.approvalStatus === "needs_change")
        ? "pending_changes"
        : safePlan.status || "planned";

  return {
    ...safePlan,
    id: safePlan.id || `execution_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status,
    steps: normalizedSteps,
    approvalsRequired: safePlan.approvalsRequired !== false,
    execution: safePlan.execution || "not_started"
  };
}

export function normalizeProjectExecutionRunDraft(executionRunDraft) {
  if (!executionRunDraft) {
    return null;
  }

  const safeDraft = executionRunDraft || {};

  return {
    ...safeDraft,
    id: safeDraft.id || `execution_run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: safeDraft.createdAt || new Date().toISOString(),
    status: safeDraft.status || "draft",
    sourcePlanId: safeDraft.sourcePlanId || "",
    steps: Array.isArray(safeDraft.steps)
      ? safeDraft.steps.map((step) => ({
        ...step,
        executionStatus: step.executionStatus || "not_started",
        completedAt: step.completedAt || null,
        executor: step.executor || "",
        createdAsset: step.createdAsset || null
      }))
      : []
  };
}

export function normalizeProjectResultPackage(resultPackage) {
  if (!resultPackage) {
    return null;
  }

  const safePackage = resultPackage || {};

  return {
    ...safePackage,
    id: safePackage.id || `result_package_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: safePackage.createdAt || new Date().toISOString(),
    status: safePackage.status || "ready",
    completedSteps: Array.isArray(safePackage.completedSteps) ? safePackage.completedSteps : [],
    createdAssets: Array.isArray(safePackage.createdAssets) ? safePackage.createdAssets : [],
    exportOptions: Array.isArray(safePackage.exportOptions) ? safePackage.exportOptions : [],
    nextRecommendations: Array.isArray(safePackage.nextRecommendations) ? safePackage.nextRecommendations : []
  };
}

export function normalizeProject(project) {
  const safeProject = project || {};
  const existingAssets = safeProject.assets || {};
  const assets = getEmptyProjectAssets();
  const createdAt = safeProject.createdAt || new Date().toISOString();
  const workflowState = normalizeProjectWorkflowState(safeProject.workflowState);

  projectAssetCategories.forEach((category) => {
    const categoryAssets = Array.isArray(existingAssets[category.key])
      ? existingAssets[category.key]
      : [];
    assets[category.key] = categoryAssets.map((asset, index) => normalizeProjectAsset(asset, category.key, index));
  });

  return {
    ...safeProject,
    id: safeProject.id || `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: safeProject.title || "ESSA Project",
    type: safeProject.type || "unknown",
    subtype: safeProject.subtype || "general",
    status: safeProject.status || "draft",
    createdAt,
    updatedAt: safeProject.updatedAt || safeProject.lastUpdatedAt || createdAt,
    lastUpdatedAt: safeProject.lastUpdatedAt || safeProject.updatedAt || "",
    workflowAnswers: safeProject.workflowAnswers || {},
    finalBlueprintText: safeProject.finalBlueprintText || "",
    generatedSections: safeProject.generatedSections || {},
    nextActions: safeProject.nextActions || [],
    changeRequests: Array.isArray(safeProject.changeRequests) ? safeProject.changeRequests : [],
    additions: Array.isArray(safeProject.additions) ? safeProject.additions : [],
    approvedAt: safeProject.approvedAt || null,
    initialRequest: safeProject.initialRequest || "",
    corePlan: safeProject.corePlan || null,
    workflowId: safeProject.workflowId || safeProject.corePlan?.workflowId || null,
    workflowState,
    executionPlan: normalizeProjectExecutionPlan(safeProject.executionPlan),
    executionRunDraft: normalizeProjectExecutionRunDraft(safeProject.executionRunDraft),
    resultPackage: normalizeProjectResultPackage(safeProject.resultPackage),
    assets
  };
}

export function loadProjects(storage = window.localStorage) {
  try {
    const projects = JSON.parse(storage.getItem(PROJECTS_STORAGE_KEY) || "[]");
    return Array.isArray(projects) ? projects.map(normalizeProject) : [];
  } catch (error) {
    return [];
  }
}

export function saveProjects(projects, storage = window.localStorage) {
  storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects.map(normalizeProject)));
}

export function findProject(projectId, storage = window.localStorage) {
  return loadProjects(storage).find((item) => item.id === projectId) || null;
}

export function updateProject(projectId, updater, storage = window.localStorage) {
  const projects = loadProjects(storage);
  const index = projects.findIndex((item) => item.id === projectId);

  if (index === -1) {
    return null;
  }

  const currentProject = normalizeProject(projects[index]);
  const updatedAt = new Date().toISOString();
  const nextProject = normalizeProject({
    ...currentProject,
    ...updater(currentProject, updatedAt),
    updatedAt,
    lastUpdatedAt: updatedAt
  });

  projects[index] = nextProject;
  saveProjects(projects, storage);
  return nextProject;
}
