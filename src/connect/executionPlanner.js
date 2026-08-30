import { selectToolForTask } from "./toolSelector.js";
import { getVoiceUsageForProject } from "../identity/voiceUsagePolicy.js";

const workflowStepTemplates = {
  digital_identity_profile: [
    { step: "identity_profile", title: "Identity profile", category: "documents", capability: "brief_generation" },
    { step: "visual_identity", title: "Visual identity", category: "image", capability: "visual_prompt" },
    { step: "voice_identity", title: "Voice identity", category: "voice", capability: "tts" },
    { step: "prompt_pack", title: "Prompt pack", category: "ai_model", capability: "text_generation" },
    { step: "avatar_video_brief", title: "Avatar video brief", category: "video", capability: "video_rendering" },
    { step: "lipsync_plan", title: "Lipsync plan", category: "video", capability: "video_rendering" },
    { step: "export_identity_passport", title: "Export identity passport", category: "documents", capability: "document_generation" }
  ],
  production_video: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation" },
    { step: "video", title: "Видео-рендер", category: "video", capability: "video_rendering" },
    { step: "editing", title: "Монтаж", category: "editing", capability: "video_editing" },
    { step: "publishing", title: "Публикация", category: "publishing", capability: "social_publishing" }
  ],
  production_book: [
    { step: "outline", title: "Структура книги", category: "ai_model", capability: "text_generation" },
    { step: "draft", title: "Черновик", category: "documents", capability: "document_generation" },
    { step: "export", title: "Экспорт текста", category: "documents", capability: "export_text" }
  ],
  production_cartoon: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation" },
    { step: "characters", title: "Персонажи и мир истории", category: "ai_model", capability: "text_generation" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing" }
  ],
  production_animated_story: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation" },
    { step: "characters", title: "Персонажи и мир истории", category: "ai_model", capability: "text_generation" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing" }
  ],
  production_documentary: [
    { step: "script", title: "Сценарий диктора", category: "ai_model", capability: "text_generation" },
    { step: "facts", title: "Факты и структура", category: "documents", capability: "brief_generation" },
    { step: "scene_prompts", title: "Визуальные блоки", category: "image", capability: "image_generation" },
    { step: "voice", title: "Голос за кадром", category: "voice", capability: "tts" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing" }
  ],
  production_film: [
    { step: "script", title: "Сценарий", category: "ai_model", capability: "text_generation" },
    { step: "characters", title: "Персонажи и мир истории", category: "ai_model", capability: "text_generation" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation" },
    { step: "voice", title: "Озвучка", category: "voice", capability: "tts" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering" },
    { step: "editing", title: "Монтажный план", category: "editing", capability: "video_editing" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing" }
  ],
  production_music_video: [
    { step: "script", title: "Визуальная концепция", category: "ai_model", capability: "text_generation" },
    { step: "characters", title: "Герой и образ", category: "ai_model", capability: "text_generation" },
    { step: "scene_prompts", title: "Промпты сцен", category: "image", capability: "image_generation" },
    { step: "visuals", title: "Визуалы", category: "image", capability: "image_generation" },
    { step: "video", title: "Видео", category: "video", capability: "video_rendering" },
    { step: "editing", title: "Монтаж", category: "editing", capability: "video_editing" },
    { step: "cover", title: "Обложка", category: "image", capability: "image_generation" },
    { step: "publishing", title: "Публикационный пакет", category: "publishing", capability: "social_publishing" }
  ],
  content_multiplication_package: [
    { step: "podcast_agent", title: "Podcast Agent", category: "ai_model", capability: "text_generation" },
    { step: "shorts_agent", title: "Shorts Agent", category: "ai_model", capability: "text_generation" },
    { step: "tiktok_agent", title: "TikTok Agent", category: "ai_model", capability: "text_generation" },
    { step: "reels_agent", title: "Reels Agent", category: "ai_model", capability: "text_generation" },
    { step: "visual_agent", title: "Visual Agent", category: "image", capability: "image_generation" },
    { step: "music_agent", title: "Music Agent", category: "ai_model", capability: "text_generation" },
    { step: "lisa_voice_agent", title: "Lisa Voice Agent", category: "voice", capability: "tts" },
    { step: "translation_agent", title: "Translation Agent", category: "documents", capability: "document_generation" },
    { step: "publishing_agent", title: "Publishing Agent", category: "publishing", capability: "social_publishing" },
    { step: "calendar_agent", title: "Calendar Agent", category: "documents", capability: "brief_generation" },
    { step: "qa_approval_agent", title: "QA / Approval Agent", category: "documents", capability: "brief_generation" }
  ],
  website_project: [
    { step: "brief", title: "Бриф сайта", category: "ai_model", capability: "text_generation" },
    { step: "structure", title: "Структура сайта", category: "website", capability: "site_structure" },
    { step: "build", title: "Сборка сайта", category: "website", capability: "website_build" },
    { step: "content", title: "Документы и тексты", category: "documents", capability: "document_generation" }
  ],
  marketing_campaign: [
    { step: "strategy", title: "Стратегия", category: "ai_model", capability: "text_generation" },
    { step: "creatives", title: "Креативы", category: "image", capability: "image_generation" },
    { step: "publishing", title: "Публикация", category: "publishing", capability: "social_publishing" },
    { step: "analytics", title: "Аналитика", category: "analytics", capability: "campaign_analytics" }
  ],
  property_request: [
    { step: "research", title: "Поиск и исследование", category: "search", capability: "web_search" },
    { step: "browser_check", title: "Проверка источников", category: "browser", capability: "browser_automation" },
    { step: "documents", title: "Документы", category: "documents", capability: "brief_generation" }
  ],
  legal_preparation: [
    { step: "task_analysis", title: "Анализ задачи", category: "ai_model", capability: "text_generation" },
    { step: "draft", title: "Черновик документа", category: "documents", capability: "contract_draft" },
    { step: "questions", title: "Вопросы юристу", category: "documents", capability: "brief_generation" }
  ]
};

function normalizeWorkflowId(projectOrTask = {}) {
  const explicitWorkflow = projectOrTask.workflowId || projectOrTask.workflow?.id || projectOrTask.workflow;

  if (typeof explicitWorkflow === "string" && workflowStepTemplates[explicitWorkflow]) {
    return explicitWorkflow;
  }

  if (projectOrTask.type === "digital_identity") {
    return "digital_identity_profile";
  }

  if (projectOrTask.type === "production" && projectOrTask.subtype === "video") {
    return "production_video";
  }

  if (projectOrTask.type === "production" && projectOrTask.subtype === "book") {
    return "production_book";
  }

  if (projectOrTask.type === "production" && ["cartoon", "fairytale"].includes(projectOrTask.subtype)) {
    return "production_cartoon";
  }

  if (projectOrTask.type === "production" && ["animated_story", "youtube_series", "educational_animation"].includes(projectOrTask.subtype)) {
    return "production_animated_story";
  }

  if (projectOrTask.type === "production" && projectOrTask.subtype === "documentary") {
    return "production_documentary";
  }

  if (projectOrTask.type === "production" && ["short_film", "feature_film"].includes(projectOrTask.subtype)) {
    return "production_film";
  }

  if (projectOrTask.type === "production" && projectOrTask.subtype === "music_video") {
    return "production_music_video";
  }

  if (projectOrTask.type === "production" && projectOrTask.subtype === "content_multiplication") {
    return "content_multiplication_package";
  }

  if (projectOrTask.type === "website") {
    return "website_project";
  }

  if (projectOrTask.type === "marketing") {
    return "marketing_campaign";
  }

  if (projectOrTask.type === "property") {
    return "property_request";
  }

  if (projectOrTask.type === "legal") {
    return "legal_preparation";
  }

  return explicitWorkflow || "unknown";
}

function getProjectId(projectOrTask = {}) {
  return projectOrTask.id || projectOrTask.projectId || null;
}

function buildPlanStep(template, index, options) {
  const selection = selectToolForTask({
    category: template.category,
    requiredCapability: template.capability,
    costLevel: template.costLevel,
    executionMode: template.executionMode,
    preferredProvider: template.preferredProvider
  }, options.selectorOptions || {});

  return {
    id: `${String(index + 1).padStart(2, "0")}_${template.step}`,
    title: template.title,
    category: template.category,
    capability: template.capability,
    selectedTool: selection.selected,
    executionStatus: "not_started",
    requiresApproval: true
  };
}

export function listExecutionWorkflows() {
  return Object.keys(workflowStepTemplates);
}

export function createExecutionPlan(projectOrTask = {}, options = {}) {
  const workflowId = normalizeWorkflowId(projectOrTask);
  const templates = workflowStepTemplates[workflowId] || [];
  const steps = templates.map((template, index) => buildPlanStep(template, index, options));
  const identitySnapshot = projectOrTask.identitySnapshot || null;
  const voiceUsage = getVoiceUsageForProject(identitySnapshot, projectOrTask);
  const identityMetadata = identitySnapshot
    ? {
        identityId: identitySnapshot.id || projectOrTask.identityId,
        identityName: identitySnapshot.name || projectOrTask.identityName,
        identityRequired: true,
        voiceIdentity: voiceUsage.allowed
          ? identitySnapshot.name || projectOrTask.identityName
          : voiceUsage.fallbackVoice,
        voiceUsage
      }
    : {
        voiceIdentity: voiceUsage.fallbackVoice,
        voiceUsage
      };

  return {
    projectId: getProjectId(projectOrTask),
    workflowId,
    status: "planned",
    metadata: identityMetadata,
    ...identityMetadata,
    steps,
    approvalsRequired: steps.some((step) => step.requiresApproval),
    execution: "not_started"
  };
}
