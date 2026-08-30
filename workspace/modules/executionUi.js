import { executeLocalStep } from "./localExecutor.js";
import { getVoiceUsageForProject } from "../../src/identity/voiceUsagePolicy.js";

const executionTemplates = {
  digital_identity_profile: [
    { step: "identity_profile", title: "Identity profile", category: "documents", capability: "brief_generation", tool: "ESSA Avatar Studio" },
    { step: "visual_identity", title: "Visual identity", category: "image", capability: "visual_prompt", tool: "ESSA Avatar Studio" },
    { step: "voice_identity", title: "Voice identity", category: "voice", capability: "tts", tool: "ESSA Avatar Studio" },
    { step: "prompt_pack", title: "Prompt pack", category: "ai_model", capability: "text_generation", tool: "ESSA Avatar Studio" },
    { step: "avatar_video_brief", title: "Avatar video brief", category: "video", capability: "video_rendering", tool: "ESSA Avatar Studio" },
    { step: "lipsync_plan", title: "Lipsync plan", category: "video", capability: "video_rendering", tool: "ESSA Avatar Studio" },
    { step: "export_identity_passport", title: "Export identity passport", category: "documents", capability: "document_generation", tool: "ESSA Avatar Studio" }
  ],
  production_video: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation", tool: "ESSA Intelligence" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts", tool: "ESSA Voice" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation", tool: "ESSA Visual" },
    { step: "video", title: "Видео-рендер", category: "video", capability: "video_rendering", tool: "ESSA Video" },
    { step: "editing", title: "Монтаж", category: "editing", capability: "video_editing", tool: "ESSA Editing" },
    { step: "publishing", title: "Публикация", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" }
  ],
  production_book: [
    { step: "outline", title: "Структура книги", category: "ai_model", capability: "text_generation", tool: "ESSA Intelligence" },
    { step: "draft", title: "Черновик", category: "documents", capability: "document_generation", tool: "ESSA Documents" },
    { step: "export", title: "Экспорт текста", category: "documents", capability: "export_text", tool: "ESSA Documents" }
  ],
  production_cartoon: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "characters", title: "Персонажи и мир истории", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts", tool: "ESSA Animation" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering", tool: "ESSA Film Flow" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing", tool: "ESSA Film Flow" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" }
  ],
  production_animated_story: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "characters", title: "Персонажи и мир истории", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts", tool: "ESSA Animation" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering", tool: "ESSA Film Flow" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing", tool: "ESSA Film Flow" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" }
  ],
  production_documentary: [
    { step: "script", title: "Сценарий диктора", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "facts", title: "Факты и структура", category: "documents", capability: "brief_generation", tool: "ESSA Story Studio" },
    { step: "scene_prompts", title: "Визуальные блоки", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "voice", title: "Голос за кадром", category: "voice", capability: "tts", tool: "ESSA Animation" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering", tool: "ESSA Film Flow" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing", tool: "ESSA Film Flow" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" }
  ],
  production_film: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "characters", title: "Персонажи и мир истории", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts", tool: "ESSA Animation" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering", tool: "ESSA Film Flow" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing", tool: "ESSA Film Flow" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" }
  ],
  production_music_video: [
    { step: "script", title: "Визуальная концепция", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "characters", title: "Герой и образ", category: "ai_model", capability: "text_generation", tool: "ESSA Story Studio" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering", tool: "ESSA Film Flow" },
    { step: "editing", title: "Монтаж", category: "editing", capability: "video_editing", tool: "ESSA Film Flow" },
    { step: "cover", title: "Обложка", category: "image", capability: "image_generation", tool: "ESSA Visual Engine" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" }
  ],
  content_multiplication_package: [
    { step: "podcast_agent", title: "Podcast Agent", category: "ai_model", capability: "text_generation", tool: "Podcast Agent" },
    { step: "shorts_agent", title: "Shorts Agent", category: "ai_model", capability: "text_generation", tool: "Shorts Agent" },
    { step: "tiktok_agent", title: "TikTok Agent", category: "ai_model", capability: "text_generation", tool: "TikTok Agent" },
    { step: "reels_agent", title: "Reels Agent", category: "ai_model", capability: "text_generation", tool: "Reels Agent" },
    { step: "visual_agent", title: "Visual Agent", category: "image", capability: "image_generation", tool: "Visual Agent" },
    { step: "music_agent", title: "Music Agent", category: "ai_model", capability: "text_generation", tool: "Music Agent" },
    { step: "lisa_voice_agent", title: "Lisa Voice Agent", category: "voice", capability: "tts", tool: "Lisa Voice Agent" },
    { step: "translation_agent", title: "Translation Agent", category: "documents", capability: "document_generation", tool: "Translation Agent" },
    { step: "publishing_agent", title: "Publishing Agent", category: "publishing", capability: "social_publishing", tool: "Publishing Agent" },
    { step: "calendar_agent", title: "Calendar Agent", category: "documents", capability: "brief_generation", tool: "Calendar Agent" },
    { step: "qa_approval_agent", title: "QA / Approval Agent", category: "documents", capability: "brief_generation", tool: "QA / Approval Agent" }
  ],
  website_project: [
    { step: "brief", title: "Бриф сайта", category: "ai_model", capability: "text_generation", tool: "ESSA Intelligence" },
    { step: "structure", title: "Структура сайта", category: "website", capability: "site_structure", tool: "ESSA Website" },
    { step: "build", title: "Сборка сайта", category: "website", capability: "website_build", tool: "ESSA Website" },
    { step: "content", title: "Документы и тексты", category: "documents", capability: "document_generation", tool: "ESSA Documents" }
  ],
  marketing_campaign: [
    { step: "strategy", title: "Стратегия", category: "ai_model", capability: "text_generation", tool: "ESSA Intelligence" },
    { step: "creatives", title: "Креативы", category: "image", capability: "image_generation", tool: "ESSA Visual" },
    { step: "publishing", title: "Публикация", category: "publishing", capability: "social_publishing", tool: "ESSA Publishing" },
    { step: "analytics", title: "Аналитика", category: "analytics", capability: "campaign_analytics", tool: "ESSA Analytics" }
  ],
  property_request: [
    { step: "research", title: "Поиск и исследование", category: "search", capability: "web_search", tool: "ESSA Research" },
    { step: "browser_check", title: "Проверка источников", category: "browser", capability: "browser_automation", tool: "ESSA Browser" },
    { step: "documents", title: "Документы", category: "documents", capability: "brief_generation", tool: "ESSA Documents" }
  ],
  legal_preparation: [
    { step: "task_analysis", title: "Анализ задачи", category: "ai_model", capability: "text_generation", tool: "ESSA Intelligence" },
    { step: "draft", title: "Черновик документа", category: "documents", capability: "contract_draft", tool: "ESSA Documents" },
    { step: "questions", title: "Вопросы юристу", category: "documents", capability: "brief_generation", tool: "ESSA Documents" }
  ]
};

function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Execution UI option is required: ${key}`);
  }

  return value;
}

function resolveWorkflowId(project) {
  if (project.workflowId && executionTemplates[project.workflowId]) {
    return project.workflowId;
  }

  if (project.type === "digital_identity") {
    return "digital_identity_profile";
  }

  if (project.type === "production" && project.subtype === "video") {
    return "production_video";
  }

  if (project.type === "production" && project.subtype === "book") {
    return "production_book";
  }

  if (project.type === "production" && ["cartoon", "fairytale"].includes(project.subtype)) {
    return "production_cartoon";
  }

  if (project.type === "production" && ["animated_story", "youtube_series", "educational_animation"].includes(project.subtype)) {
    return "production_animated_story";
  }

  if (project.type === "production" && project.subtype === "documentary") {
    return "production_documentary";
  }

  if (project.type === "production" && ["short_film", "feature_film"].includes(project.subtype)) {
    return "production_film";
  }

  if (project.type === "production" && project.subtype === "music_video") {
    return "production_music_video";
  }

  if (project.type === "production" && project.subtype === "content_multiplication") {
    return "content_multiplication_package";
  }

  if (project.type === "website") {
    return "website_project";
  }

  if (project.type === "marketing") {
    return "marketing_campaign";
  }

  if (project.type === "property") {
    return "property_request";
  }

  if (project.type === "legal") {
    return "legal_preparation";
  }

  return project.workflowId || "unknown";
}

function createWorkspaceExecutionPlan(project) {
  const workflowId = resolveWorkflowId(project);
  const templates = executionTemplates[workflowId] || [];
  const voiceUsage = getVoiceUsageForProject(project.identitySnapshot, project);
  const identityMetadata = project.identitySnapshot
    ? {
        identityId: project.identitySnapshot.id || project.identityId,
        identityName: project.identitySnapshot.name || project.identityName,
        identityRequired: true,
        voiceIdentity: voiceUsage.allowed
          ? project.identitySnapshot.name || project.identityName
          : voiceUsage.fallbackVoice,
        voiceUsage
      }
    : {
        voiceIdentity: voiceUsage.fallbackVoice,
        voiceUsage
      };

  return {
    id: `execution_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: project.id,
    workflowId,
    status: "planned",
    metadata: identityMetadata,
    ...identityMetadata,
    steps: templates.map((template, index) => ({
      id: `${String(index + 1).padStart(2, "0")}_${template.step}`,
      title: template.title,
      category: template.category,
      capability: template.capability,
      selectedTool: {
        id: template.tool.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
        name: template.tool,
        visibility: "internal_only"
      },
      executionStatus: "not_started",
      approvalStatus: "pending",
      approvedAt: null,
      changeNote: "",
      requiresApproval: true
    })),
    approvalsRequired: templates.length > 0,
    execution: "not_started"
  };
}

function normalizeExecutionStep(step, index = 0) {
  return {
    ...step,
    id: step.id || `step_${index + 1}`,
    executionStatus: step.executionStatus || "not_started",
    requiresApproval: step.requiresApproval !== false,
    approvalStatus: step.approvalStatus || "pending",
    approvedAt: step.approvedAt || null,
    changeNote: step.changeNote || ""
  };
}

function getPlanStatus(steps) {
  if (!steps.length) {
    return "planned";
  }

  if (steps.every((step) => step.approvalStatus === "approved")) {
    return "ready_to_execute";
  }

  if (steps.some((step) => step.approvalStatus === "delayed" || step.approvalStatus === "needs_change")) {
    return "pending_changes";
  }

  return "planned";
}

function normalizeExecutionPlan(plan) {
  if (!plan) {
    return null;
  }

  const steps = (Array.isArray(plan.steps) ? plan.steps : []).map(normalizeExecutionStep);

  return {
    ...plan,
    id: plan.id || `execution_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: getPlanStatus(steps),
    steps,
    approvalsRequired: plan.approvalsRequired !== false,
    execution: plan.execution || "not_started"
  };
}

function getStatusLabel(status) {
  const labels = {
    not_started: "не запущено",
    planned: "запланировано",
    approved: "подтверждено",
    ready_to_execute: "готов к исполнению",
    pending_changes: "нужны изменения",
    completed: "завершено",
    running: "в работе",
    completed: "завершено",
    failed: "ошибка"
  };

  return labels[status] || status;
}

function getApprovalStatusLabel(status) {
  const labels = {
    pending: "ожидает подтверждения",
    approved: "подтверждён",
    delayed: "отложен",
    needs_change: "нужно изменить исполнителя"
  };

  return labels[status] || status;
}

function refreshExecutionTab(project, options) {
  const content = getRequiredOption(options, "content");
  content.innerHTML = "";
  renderExecutionTab(project, options);
}

function updateExecutionStep(projectId, stepId, updater, options) {
  const updateProject = getRequiredOption(options, "updateProject");
  const updatedProject = updateProject(projectId, (currentProject) => {
    const currentPlan = normalizeExecutionPlan(currentProject.executionPlan);

    if (!currentPlan) {
      return {};
    }

    const steps = currentPlan.steps.map((step, index) => {
      const normalizedStep = normalizeExecutionStep(step, index);

      return normalizedStep.id === stepId
        ? normalizeExecutionStep(updater(normalizedStep), index)
        : normalizedStep;
    });
    const status = getPlanStatus(steps);
    const projectStatus = status === "ready_to_execute"
      ? "ready_to_execute"
      : currentProject.status === "ready_to_execute"
        ? "draft"
        : currentProject.status;

    return {
      status: projectStatus,
      executionPlan: {
        ...currentPlan,
        status,
        steps
      }
    };
  });

  options.renderProjectsList?.();

  if (updatedProject) {
    refreshExecutionTab(updatedProject, options);
  }

  return updatedProject;
}

function approveExecutionStep(projectId, stepId, options) {
  const approvedAt = new Date().toISOString();
  const project = updateExecutionStep(projectId, stepId, (step) => ({
    ...step,
    approvalStatus: "approved",
    approvedAt,
    changeNote: "",
    executionStatus: "not_started"
  }), options);

  if (project) {
    options.showChatMessage?.("navigator", "Шаг подтверждён. Инструменты пока не запускаются.");
  }
}

function prepareExecutionRunDraft(project, plan, options) {
  const updateProject = getRequiredOption(options, "updateProject");
  const createdAt = new Date().toISOString();
  const executionRunDraft = {
    id: `execution_run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    status: "draft",
    sourcePlanId: plan.id || `${project.id}_${plan.workflowId}`,
    steps: plan.steps.map((step) => ({
      id: step.id,
      title: step.title,
      category: step.category,
      capability: step.capability,
      selectedTool: step.selectedTool,
      executionStatus: "not_started",
      approvalStatus: step.approvalStatus
    }))
  };
  const updatedProject = updateProject(project.id, () => ({
    executionRunDraft
  }));

  options.renderProjectsList?.();

  if (updatedProject) {
    options.showChatMessage?.("navigator", "Черновик запуска создан. Исполнение пока отключено.");
    refreshExecutionTab(updatedProject, options);
  }
}

function getCompletedRunSteps(project) {
  return (project.executionRunDraft?.steps || [])
    .filter((step) => step.executionStatus === "completed");
}

function getAssetByLink(project, assetLink) {
  if (!assetLink) {
    return null;
  }

  return (project.assets?.[assetLink.category] || [])
    .find((asset) => asset.id === assetLink.assetId) || null;
}

function getBlueprintSummary(project) {
  const text = String(project.finalBlueprintText || project.initialRequest || project.title || "");

  return text.length > 700 ? `${text.slice(0, 700)}...` : text;
}

function formatResultPackageText(resultPackage) {
  const completedSteps = (resultPackage.completedSteps || [])
    .map((step, index) => `${index + 1}. ${step.title}\nExecutor: ${step.executor}\nCompleted: ${step.completedAt}\nAsset: ${step.createdAsset?.category || "-"} / ${step.createdAsset?.title || "-"}`)
    .join("\n\n");
  const createdAssets = (resultPackage.createdAssets || [])
    .map((asset, index) => `${index + 1}. ${asset.category} / ${asset.title}\n${asset.summary || ""}`)
    .join("\n\n");

  return `ESSA Result Package

Project: ${resultPackage.projectTitle}
Workflow: ${resultPackage.workflowId}
Status: ${resultPackage.status}
Created: ${resultPackage.createdAt}

Blueprint Summary
${resultPackage.blueprintSummary}

Completed Steps
${completedSteps || "Пока нет."}

Created Assets
${createdAssets || "Пока нет."}

Export Options
${(resultPackage.exportOptions || []).map((item) => `- ${item}`).join("\n")}

Next Recommendations
${(resultPackage.nextRecommendations || []).map((item) => `- ${item}`).join("\n")}`;
}

function buildResultPackage(project) {
  const completedSteps = getCompletedRunSteps(project).map((step) => ({
    title: step.title,
    executor: step.executor || "local_text_executor",
    completedAt: step.completedAt,
    createdAsset: step.createdAsset || null
  }));
  const createdAssets = completedSteps
    .map((step) => {
      const asset = getAssetByLink(project, step.createdAsset);

      if (!asset || !step.createdAsset) {
        return null;
      }

      return {
        category: step.createdAsset.category,
        assetId: step.createdAsset.assetId,
        title: asset.title,
        summary: String(asset.content || "").slice(0, 500)
      };
    })
    .filter(Boolean);

  return {
    id: `result_package_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: "ready",
    projectId: project.id,
    projectTitle: project.title,
    workflowId: project.workflowId || project.executionPlan?.workflowId || "unknown",
    blueprintSummary: getBlueprintSummary(project),
    completedSteps,
    createdAssets,
    exportOptions: ["TXT", "Blueprint", "Editing Package", "Publishing Package", "Assets Package"],
    nextRecommendations: [
      "открыть активы",
      "скачать TXT",
      "подготовить внешний video/render provider",
      "подключить голосовой provider",
      "передать монтажёру",
      "продолжить вручную"
    ]
  };
}

function createResultPackage(project, options) {
  const updateProject = getRequiredOption(options, "updateProject");
  const resultPackage = buildResultPackage(project);
  const updatedProject = updateProject(project.id, () => ({
    resultPackage,
    status: "result_package_ready"
  }));

  options.renderProjectsList?.();

  if (updatedProject) {
    options.showChatMessage?.("navigator", "Финальный Result Package собран и сохранён.");
    refreshExecutionTab(updatedProject, options);
  }
}

async function copyResultPackage(resultPackage, options) {
  try {
    await navigator.clipboard.writeText(formatResultPackageText(resultPackage));
    options.showChatMessage?.("navigator", "Result Package скопирован.");
  } catch (error) {
    options.showChatMessage?.("navigator", "Не получилось скопировать Result Package через clipboard.", "error");
  }
}

function downloadResultPackageTxt(resultPackage, options) {
  const blob = new Blob([formatResultPackageText(resultPackage)], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(resultPackage.projectTitle || "essa-result-package").toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-")}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  options.showChatMessage?.("navigator", "TXT Result Package подготовлен и скачивается.");
}

function renderResultPackage(project, options, wrapper) {
  const resultPackage = project.resultPackage;

  if (!resultPackage) {
    if (project.status === "execution_completed_local") {
      const actions = document.createElement("div");
      actions.className = "message-actions";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Собрать Result Package";
      button.addEventListener("click", () => createResultPackage(project, options));
      actions.append(button);
      wrapper.append(actions);
    }

    return;
  }

  const block = document.createElement("div");
  block.className = "project-result-package";

  const title = document.createElement("h3");
  title.textContent = "Финальный пакет результата";

  const meta = document.createElement("p");
  meta.textContent = `${resultPackage.projectTitle} • ${resultPackage.status} • создан ${new Date(resultPackage.createdAt).toLocaleString("ru-RU")}`;

  const actions = document.createElement("div");
  actions.className = "message-actions";

  [
    ["Открыть Result Package", () => options.showChatMessage?.("navigator", formatResultPackageText(resultPackage))],
    ["Скопировать Result Package", () => copyResultPackage(resultPackage, options)],
    ["Скачать TXT", () => downloadResultPackageTxt(resultPackage, options)],
    ["Перейти в Экспорт", () => options.openProjectWorkspace?.(project.id, "export")],
    ["Перейти в Активы", () => options.openProjectWorkspace?.(project.id, "assets")]
  ].forEach(([label, handler]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    actions.append(button);
  });

  block.append(title, meta, actions);
  wrapper.append(block);
}

function renderExecutionResults(project, options, wrapper) {
  const completedSteps = getCompletedRunSteps(project);

  if (!completedSteps.length) {
    return;
  }

  const results = document.createElement("div");
  results.className = "project-execution-results";

  const title = document.createElement("h3");
  title.textContent = "Результаты исполнения";
  results.append(title);

  completedSteps.forEach((step) => {
    const item = document.createElement("div");
    item.className = "project-execution-result";

    const heading = document.createElement("h4");
    heading.textContent = step.title;

    const meta = document.createElement("p");
    meta.textContent = `Executor: ${step.executor || "local_text_executor"} • выполнен ${step.completedAt ? new Date(step.completedAt).toLocaleString("ru-RU") : "нет даты"}`;

    item.append(heading, meta);

    if (step.createdAsset) {
      const asset = document.createElement("p");
      asset.textContent = `Созданный asset: ${step.createdAsset.category} / ${step.createdAsset.title}`;

      const actions = document.createElement("div");
      actions.className = "message-actions";

      [
        ["Открыть актив", () => options.openAsset?.(project.id, step.createdAsset.category, step.createdAsset.assetId)],
        ["Скопировать", () => options.copyAsset?.(project.id, step.createdAsset.category, step.createdAsset.assetId)],
        ["Перейти в Активы", () => options.openProjectWorkspace?.(project.id, "assets")]
      ].forEach(([label, handler]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", handler);
        actions.append(button);
      });

      item.append(asset, actions);
    }

    results.append(item);
  });

  if (project.executionRunDraft?.status === "completed") {
    const final = document.createElement("div");
    final.className = "project-execution-complete";
    final.textContent = "Локальное исполнение завершено.\n\nВсе доступные артефакты созданы внутри ESSA.\n\nСледующий шаг:\n- открыть активы;\n- экспортировать проект;\n- подключить внешний исполнитель позже.";
    results.append(final);
  }

  wrapper.append(results);
  renderResultPackage(project, options, wrapper);
}

function delayExecutionStep(projectId, stepId, options) {
  const project = updateExecutionStep(projectId, stepId, (step) => ({
    ...step,
    approvalStatus: "delayed",
    approvedAt: null,
    executionStatus: "not_started"
  }), options);

  if (project) {
    options.showChatMessage?.("navigator", "Шаг отложен.");
  }
}

function requestExecutorChange(projectId, stepId, options) {
  const changeNote = window.prompt("Что нужно изменить в исполнителе?");

  if (!changeNote) {
    return;
  }

  const project = updateExecutionStep(projectId, stepId, (step) => ({
    ...step,
    approvalStatus: "needs_change",
    approvedAt: null,
    changeNote,
    executionStatus: "not_started"
  }), options);

  if (project) {
    options.showChatMessage?.("navigator", "Запрос на изменение исполнителя сохранён.");
  }
}

export function ensureExecutionPlan(project, options = {}) {
  const updateProject = getRequiredOption(options, "updateProject");

  if (project.executionPlan) {
    const normalizedPlan = normalizeExecutionPlan(project.executionPlan);
    const updatedProject = updateProject(project.id, () => ({
      executionPlan: normalizedPlan
    }));

    options.renderProjectsList?.();
    return updatedProject?.executionPlan || normalizedPlan;
  }

  const plan = normalizeExecutionPlan(createWorkspaceExecutionPlan(project));
  const updatedProject = updateProject(project.id, () => ({
    executionPlan: plan
  }));

  options.renderProjectsList?.();
  return updatedProject?.executionPlan || plan;
}

export function renderExecutionTab(project, options = {}) {
  const content = getRequiredOption(options, "content");
  const plan = ensureExecutionPlan(project, options);

  const wrapper = document.createElement("div");
  wrapper.className = "project-execution-plan";

  const title = document.createElement("h3");
  title.textContent = "План исполнения";

  const meta = document.createElement("p");
  meta.textContent = `Workflow: ${plan.workflowId} • статус: ${getStatusLabel(plan.status)} • инструменты не запускаются`;

  wrapper.append(title, meta);

  if (plan.metadata?.voiceUsage) {
    const voiceBlock = document.createElement("div");
    voiceBlock.className = "project-execution-ready";

    const voiceTitle = document.createElement("strong");
    voiceTitle.textContent = "Voice Identity";

    const voiceDetails = document.createElement("p");
    const usage = plan.metadata.voiceUsage;
    voiceDetails.textContent = usage.allowed
      ? `${usage.voiceIdentity} • Usage: ${usage.usage}`
      : `Not allowed for this project • Fallback: ${usage.fallbackVoice || "neutral_system_voice"}`;

    voiceBlock.append(voiceTitle, voiceDetails);
    wrapper.append(voiceBlock);
  }

  if (plan.status === "ready_to_execute") {
    const readyBlock = document.createElement("div");
    readyBlock.className = "project-execution-ready";

    const readyText = document.createElement("p");
    readyText.textContent = "Проект готов к исполнению. Все шаги подтверждены человеком. Инструменты пока не запускаются. Следующий этап: подключить первого безопасного исполнителя.";

    const prepareButton = document.createElement("button");
    prepareButton.type = "button";
    prepareButton.textContent = "Подготовить запуск";
    prepareButton.addEventListener("click", () => prepareExecutionRunDraft(project, plan, options));

    readyBlock.append(readyText, prepareButton);

    if (project.executionRunDraft) {
      const draft = document.createElement("p");
      draft.textContent = `Черновик запуска: ${project.executionRunDraft.status} • создан ${new Date(project.executionRunDraft.createdAt).toLocaleString("ru-RU")}`;
      readyBlock.append(draft);
    }

    wrapper.append(readyBlock);
  }

  renderExecutionResults(project, options, wrapper);

  if (!plan.steps.length) {
    const empty = document.createElement("p");
    empty.textContent = "Для этого workflow пока нет execution-шагов.";
    wrapper.append(empty);
    content.append(wrapper);
    return;
  }

  const list = document.createElement("div");
  list.className = "project-execution-steps";

  plan.steps.forEach((step) => {
    const runStep = project.executionRunDraft?.steps?.find((item) => item.id === step.id);
    const displayStep = runStep
      ? {
        ...step,
        executionStatus: runStep.executionStatus || step.executionStatus,
        completedAt: runStep.completedAt || step.completedAt,
        executor: runStep.executor || step.executor
      }
      : step;
    const item = document.createElement("div");
    item.className = "project-execution-step";

    const heading = document.createElement("h4");
    heading.textContent = `Шаг: ${displayStep.title}`;

    const executor = document.createElement("p");
    executor.textContent = `Исполнитель: ${displayStep.selectedTool?.name || "ESSA"}`;

    const details = document.createElement("p");
    details.textContent = `Категория: ${displayStep.category} • capability: ${displayStep.capability}`;

    const status = document.createElement("p");
    status.textContent = `Статус: ${getStatusLabel(displayStep.executionStatus)} • требует подтверждения: ${displayStep.requiresApproval ? "да" : "нет"}`;

    const approval = document.createElement("p");
    approval.textContent = `Approval: ${getApprovalStatusLabel(displayStep.approvalStatus)}`;

    const detailsList = [heading, executor, details, status, approval];

    if (displayStep.approvedAt) {
      const approvedAt = document.createElement("p");
      approvedAt.textContent = `Подтверждён: ${new Date(displayStep.approvedAt).toLocaleString("ru-RU")}`;
      detailsList.push(approvedAt);
    }

    if (displayStep.completedAt) {
      const completedAt = document.createElement("p");
      completedAt.textContent = `Выполнен локально: ${new Date(displayStep.completedAt).toLocaleString("ru-RU")}`;
      detailsList.push(completedAt);
    }

    if (displayStep.executor) {
      const executedBy = document.createElement("p");
      executedBy.textContent = `Executor: ${displayStep.executor}`;
      detailsList.push(executedBy);
    }

    if (displayStep.changeNote) {
      const changeNote = document.createElement("p");
      changeNote.textContent = `Запрос изменения: ${displayStep.changeNote}`;
      detailsList.push(changeNote);
    }

    const actions = document.createElement("div");
    actions.className = "message-actions";

    [
      ["Подтвердить шаг", () => approveExecutionStep(project.id, step.id, options)],
      ["Запустить позже", () => delayExecutionStep(project.id, step.id, options)],
      ["Изменить исполнителя", () => requestExecutorChange(project.id, step.id, options)]
    ].forEach(([label, handler]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", handler);
      actions.append(button);
    });

    if (project.executionRunDraft && displayStep.approvalStatus === "approved" && displayStep.executionStatus !== "completed") {
      const localButton = document.createElement("button");
      localButton.type = "button";
      localButton.textContent = "Выполнить локально";
      localButton.addEventListener("click", () => {
        const updatedProject = executeLocalStep(project.id, step.id, options);

        if (updatedProject) {
          refreshExecutionTab(updatedProject, options);
        }
      });
      actions.append(localButton);
    }

    item.append(...detailsList, actions);
    list.append(item);
  });

  wrapper.append(list);
  content.append(wrapper);
}
