const stepAssetCategoryByKey = {
  identity_profile: "documents",
  visual_identity: "visuals",
  voice_identity: "voice",
  prompt_pack: "texts",
  avatar_video_brief: "video",
  lipsync_plan: "video",
  export_identity_passport: "documents",
  content_map: "documents",
  podcast_plan: "texts",
  shorts_scripts: "texts",
  tiktok_scripts: "texts",
  reels_scripts: "texts",
  visual_prompts: "visuals",
  music_brief: "music",
  voice_script: "voice",
  translation_pack: "documents",
  publication_pack: "publications",
  schedule_plan: "documents",
  result_package: "documents",
  pipeline_plan: "documents",
  agent_task_map: "documents",
  voice_usage_report: "documents",
  publication_schedule_draft: "documents",
  qa_checklist: "documents",
  result_package_plan: "documents",
  podcast_agent: "texts",
  shorts_agent: "texts",
  tiktok_agent: "texts",
  reels_agent: "texts",
  visual_agent: "visuals",
  music_agent: "music",
  lisa_voice_agent: "voice",
  translation_agent: "documents",
  publishing_agent: "publications",
  calendar_agent: "documents",
  qa_approval_agent: "documents",
  script: "texts",
  characters: "texts",
  story_world: "texts",
  scene_prompts: "visuals",
  prompts: "visuals",
  facts: "documents",
  cover: "visuals",
  outline: "texts",
  strategy: "texts",
  task_analysis: "texts",
  voice: "voice",
  visuals: "visuals",
  video: "video",
  editing: "video",
  publishing: "publications",
  research: "documents",
  browser_check: "documents",
  documents: "documents",
  draft: "documents",
  questions: "documents",
  brief: "documents",
  structure: "documents",
  build: "documents",
  content: "documents",
  export: "documents",
  creatives: "visuals",
  analytics: "documents"
};

const stepAssetCategoryByCategory = {
  ai_model: "texts",
  voice: "voice",
  image: "visuals",
  video: "video",
  editing: "video",
  publishing: "publications",
  documents: "documents",
  search: "documents",
  browser: "documents",
  website: "documents",
  analytics: "documents"
};

function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Local executor option is required: ${key}`);
  }

  return value;
}

function getAssetCategory(step) {
  const stepKey = String(step.id || "").replace(/^\d+_/, "");

  return stepAssetCategoryByKey[stepKey] ||
    stepAssetCategoryByKey[step.step] ||
    stepAssetCategoryByCategory[step.category] ||
    "texts";
}

function buildArtifactContent(project, step) {
  const blueprint = project.finalBlueprintText || "Blueprint пока не сохранён.";
  const initialRequest = project.initialRequest || project.title || "ESSA project";

  return `Локальный артефакт ESSA

Проект: ${project.title}
Исходный запрос: ${initialRequest}
Шаг: ${step.title}
Категория: ${step.category}
Capability: ${step.capability}
Исполнитель: local_text_executor

Содержимое:
Подготовлен текстовый рабочий артефакт для шага «${step.title}».

Основа:
${blueprint}

Важно:
Внешние инструменты не запускались. Артефакт создан локально в браузере и сохранён в активы проекта.`;
}

function createAsset(project, step, createdAt) {
  const category = getAssetCategory(step);

  return {
    category,
    asset: {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: `Local ${step.title}`,
      type: category,
      description: `Создано local_text_executor для execution step: ${step.id}`,
      content: buildArtifactContent(project, step),
      createdAt,
      updatedAt: createdAt
    }
  };
}

function isRunCompleted(steps) {
  return steps.length > 0 && steps.every((step) => step.executionStatus === "completed");
}

export function executeLocalStep(projectId, stepId, options = {}) {
  const loadProjects = getRequiredOption(options, "loadProjects");
  const updateProject = getRequiredOption(options, "updateProject");
  const project = loadProjects().find((item) => item.id === projectId);

  if (!project) {
    options.showChatMessage?.("navigator", "Не получилось выполнить шаг: проект не найден.", "error");
    return null;
  }

  if (project.status !== "ready_to_execute") {
    options.showChatMessage?.("navigator", "Локальное выполнение доступно только для проекта со статусом ready_to_execute.", "error");
    return null;
  }

  const runDraft = project.executionRunDraft;

  if (!runDraft) {
    options.showChatMessage?.("navigator", "Сначала подготовьте черновик запуска.", "error");
    return null;
  }

  const step = runDraft.steps?.find((item) => item.id === stepId);

  if (!step) {
    options.showChatMessage?.("navigator", "Не получилось выполнить шаг: step не найден в executionRunDraft.", "error");
    return null;
  }

  if (step.approvalStatus !== "approved") {
    options.showChatMessage?.("navigator", "Шаг должен быть подтверждён человеком перед локальным выполнением.", "error");
    return null;
  }

  const completedAt = new Date().toISOString();
  const { category, asset } = createAsset(project, step, completedAt);
  const createdAsset = {
    category,
    assetId: asset.id,
    title: asset.title
  };
  const updatedProject = updateProject(projectId, (currentProject) => {
    const currentRunDraft = currentProject.executionRunDraft || runDraft;
    const runSteps = (currentRunDraft.steps || []).map((item) => item.id === stepId
      ? {
        ...item,
        executionStatus: "completed",
        completedAt,
        executor: "local_text_executor",
        createdAsset
      }
      : item);
    const completed = isRunCompleted(runSteps);
    const executionPlanSteps = (currentProject.executionPlan?.steps || []).map((item) => item.id === stepId
      ? {
        ...item,
        executionStatus: "completed",
        completedAt,
        executor: "local_text_executor",
        createdAsset
      }
      : item);

    return {
      status: completed ? "execution_completed_local" : currentProject.status,
      executionRunDraft: {
        ...currentRunDraft,
        status: completed ? "completed" : currentRunDraft.status,
        steps: runSteps
      },
      executionPlan: currentProject.executionPlan
        ? {
          ...currentProject.executionPlan,
          status: completed ? "completed" : currentProject.executionPlan.status,
          steps: executionPlanSteps
        }
        : currentProject.executionPlan,
      assets: {
        ...(currentProject.assets || {}),
        [category]: [
          ...(currentProject.assets?.[category] || []),
          asset
        ]
      }
    };
  });

  options.renderProjectsList?.();

  if (updatedProject) {
    options.showChatMessage?.("navigator", "Локальный артефакт создан. Внешние инструменты не запускались.");
  }

  return updatedProject;
}
