import { routeIntelligenceRequest } from "../intelligence/intelligenceRouter.js";
import {
  capabilityActivationStates,
  capabilityCostClasses,
  capabilityRiskClasses
} from "./capabilityContracts.js";
import { createCapabilityCompositionPlan } from "./capabilityComposition.js";
import { getCapability } from "./capabilityRegistry.js";
import { resolveUserNeedToCapability } from "./capabilityResolver.js";
import { productIds } from "./productCapabilityMap.js";
import { productKnowledgeNodes } from "./productKnowledge.js";
import { getProviderCandidatesForCapability } from "./providerCapabilityMap.js";
import { productLabels } from "./productDiscoveryUi.js";

export const executionPreviewStatuses = {
  previewOnly: "PREVIEW_ONLY",
  readyForApproval: "READY_FOR_APPROVAL",
  blockedMissingInput: "BLOCKED_MISSING_INPUT",
  blockedCapabilityUnavailable: "BLOCKED_CAPABILITY_UNAVAILABLE",
  blockedProviderNotActive: "BLOCKED_PROVIDER_NOT_ACTIVE"
};

export const executionStepClassifications = {
  localReady: "LOCAL_READY",
  localNotReady: "LOCAL_NOT_READY",
  intelligenceRequired: "INTELLIGENCE_REQUIRED",
  providerRequired: "PROVIDER_REQUIRED",
  paymentRequired: "PAYMENT_REQUIRED",
  approvalRequired: "APPROVAL_REQUIRED",
  blocked: "BLOCKED"
};

export const executionCostPreviewClasses = {
  freeLocal: "FREE_LOCAL",
  localCompute: "LOCAL_COMPUTE",
  externalProviderRequired: "EXTERNAL_PROVIDER_REQUIRED",
  paidProviderRequired: "PAID_PROVIDER_REQUIRED",
  priceRevalidationRequired: "PRICE_REVALIDATION_REQUIRED",
  unknown: "UNKNOWN"
};

export const executionInputTypes = {
  text: "TEXT",
  file: "FILE",
  video: "VIDEO",
  audio: "AUDIO",
  image: "IMAGE",
  url: "URL",
  voiceReference: "VOICE_REFERENCE",
  projectContext: "PROJECT_CONTEXT",
  approval: "APPROVAL"
};

export const executionPreviewHardGuards = {
  executionEnabled: false,
  providerExecutionEnabled: false,
  toolExecutionEnabled: false,
  publishEnabled: false,
  deployEnabled: false,
  paymentEnabled: false,
  disabledReason: "EXECUTION_NOT_ENABLED_PHASE_21J"
};

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}`;
}

function getKnowledgeNode(capabilityId, productId = null) {
  return productKnowledgeNodes.find((node) =>
    node.capabilityId === capabilityId && (!productId || node.productId === productId)
  ) || productKnowledgeNodes.find((node) => node.capabilityId === capabilityId) || null;
}

function createInputRequirement(input = {}) {
  return {
    requirementId: input.requirementId,
    type: input.type || executionInputTypes.text,
    label: input.label || input.requirementId,
    required: input.required !== false,
    currentStatus: input.currentStatus || "MISSING",
    acceptedFormats: [...(input.acceptedFormats || [])],
    privacyClass: input.privacyClass || "STANDARD",
    validationRule: input.validationRule || "provided_by_user_before_execution",
    description: input.description || ""
  };
}

const inputRequirementTemplates = {
  BOOK_COVER: [
    createInputRequirement({ requirementId: "book_title", type: executionInputTypes.text, label: "Название книги", description: "Название, которое должно появиться на обложке." }),
    createInputRequirement({ requirementId: "author", type: executionInputTypes.text, label: "Автор", description: "Имя автора или псевдоним." }),
    createInputRequirement({ requirementId: "genre_theme", type: executionInputTypes.text, label: "Жанр / тема", description: "Жанр, настроение и аудитория книги." }),
    createInputRequirement({ requirementId: "desired_style", type: executionInputTypes.text, label: "Желаемый стиль", description: "Например: минимализм, кино-постер, премиальная нон-фикшн обложка." }),
    createInputRequirement({ requirementId: "optional_reference", type: executionInputTypes.image, label: "Референс", required: false, acceptedFormats: ["jpg", "png", "webp"], privacyClass: "USER_ASSET", description: "Опциональный визуальный ориентир." })
  ],
  WEBSITE_GENERATE: [
    createInputRequirement({ requirementId: "business_description", type: executionInputTypes.text, label: "Описание бизнеса", description: "Что это за компания, кому она помогает и что нужно продать/объяснить." }),
    createInputRequirement({ requirementId: "site_goal", type: executionInputTypes.text, label: "Цель сайта", description: "Заявки, бронирования, портфолио, продажи или объяснение продукта." }),
    createInputRequirement({ requirementId: "pages", type: executionInputTypes.text, label: "Страницы / структура", description: "Какие разделы нужны." }),
    createInputRequirement({ requirementId: "brand_assets", type: executionInputTypes.file, label: "Бренд-материалы", required: false, acceptedFormats: ["txt", "md", "jpg", "png", "svg"], privacyClass: "PROJECT_CONTEXT" })
  ],
  VIDEO_EDIT: [
    createInputRequirement({ requirementId: "source_video", type: executionInputTypes.video, label: "Исходное видео", acceptedFormats: ["mp4", "mov", "webm"], privacyClass: "USER_MEDIA", description: "Файл или локальный проектный материал для будущего ролика." }),
    createInputRequirement({ requirementId: "video_goal", type: executionInputTypes.text, label: "Цель ролика", description: "Что зритель должен понять или сделать." }),
    createInputRequirement({ requirementId: "target_format", type: executionInputTypes.text, label: "Формат", description: "Reels, Shorts, TikTok, YouTube, горизонтальное видео." })
  ],
  VIDEO_TRIM: [
    createInputRequirement({ requirementId: "source_video", type: executionInputTypes.video, label: "Исходное видео", acceptedFormats: ["mp4", "mov", "webm"], privacyClass: "USER_MEDIA" }),
    createInputRequirement({ requirementId: "time_range", type: executionInputTypes.text, label: "Таймкоды", validationRule: "start_end_time_required", description: "Например: 00:03-00:15." })
  ],
  MEDIA_PROBE: [
    createInputRequirement({ requirementId: "source_media", type: executionInputTypes.video, label: "Медиафайл", acceptedFormats: ["mp4", "mov", "webm", "mkv", "wav", "mp3", "m4a"], privacyClass: "USER_MEDIA" })
  ],
  VIDEO_RESIZE: [
    createInputRequirement({ requirementId: "source_video", type: executionInputTypes.video, label: "Исходное видео", acceptedFormats: ["mp4", "mov", "webm", "mkv"], privacyClass: "USER_MEDIA" }),
    createInputRequirement({ requirementId: "target_profile", type: executionInputTypes.text, label: "Размер", validationRule: "safe_local_video_resize_profile_required", description: "Например: VIDEO_RESIZE_320x180." })
  ],
  AUDIO_EXTRACT: [
    createInputRequirement({ requirementId: "source_media", type: executionInputTypes.video, label: "Медиафайл", acceptedFormats: ["mp4", "mov", "webm", "mkv"], privacyClass: "USER_MEDIA" }),
    createInputRequirement({ requirementId: "target_profile", type: executionInputTypes.text, label: "Аудиоформат", validationRule: "safe_local_audio_profile_required", description: "Например: AUDIO_WAV_STANDARD." })
  ],
  VOCAL_REPLACE: [
    createInputRequirement({ requirementId: "source_song", type: executionInputTypes.audio, label: "Исходная песня", acceptedFormats: ["wav", "mp3", "flac"], privacyClass: "USER_MEDIA" }),
    createInputRequirement({ requirementId: "voice_reference", type: executionInputTypes.voiceReference, label: "Голос / утвержденная voice identity", acceptedFormats: ["wav", "mp3", "voice_identity"], privacyClass: "SENSITIVE_BIOMETRIC" }),
    createInputRequirement({ requirementId: "rights_consent", type: executionInputTypes.approval, label: "Права и согласие", privacyClass: "LEGAL_APPROVAL", validationRule: "explicit_rights_and_voice_consent_required" })
  ],
  BUSINESS_DISCOVERY: [
    createInputRequirement({ requirementId: "target_market", type: executionInputTypes.text, label: "Целевой рынок", description: "Например: рестораны, отели, девелоперы or локальные сервисы." }),
    createInputRequirement({ requirementId: "geography", type: executionInputTypes.text, label: "География", description: "Город, регион or страна для public business discovery." }),
    createInputRequirement({ requirementId: "industries", type: executionInputTypes.text, label: "Индустрии", description: "Business categories to include." }),
    createInputRequirement({ requirementId: "public_sources", type: executionInputTypes.text, label: "Разрешенные источники", description: "Allowed public source classes; live providers require future activation." }),
    createInputRequirement({ requirementId: "data_policy", type: executionInputTypes.approval, label: "Политика данных", privacyClass: "PUBLIC_BUSINESS_DATA", validationRule: "public_business_data_only" }),
    createInputRequirement({ requirementId: "qualification_policy", type: executionInputTypes.text, label: "Критерии качества", required: false, description: "Optional scoring/qualification preferences for the review queue." })
  ]
};

const expectedArtifactTemplates = {
  BOOK_COVER: ["ImageArtifact", "CoverArtifact", "CoverBrief"],
  WEBSITE_GENERATE: ["SiteProject", "BuildArtifact", "VerificationReport"],
  VIDEO_EDIT: ["TranscriptArtifact", "EditPlan", "RenderArtifact", "VerificationReport"],
  MEDIA_PROBE: ["MediaProbeResult"],
  VIDEO_TRIM: ["TrimmedVideoArtifact", "MediaVerificationReport"],
  VIDEO_RESIZE: ["ResizedVideoArtifact", "MediaVerificationReport"],
  AUDIO_EXTRACT: ["ExtractedAudioArtifact", "MediaVerificationReport"],
  VOCAL_REPLACE: ["StemArtifacts", "VoiceArtifact", "MixArtifact", "MasterArtifact"],
  BUSINESS_DISCOVERY: ["BusinessEntitySet", "DeduplicationReport", "LeadQualificationReport", "LeadIntelligenceAuditArtifact", "ReviewQueue"]
};

const verificationTemplates = {
  BOOK_COVER: ["format/dimensions check", "cover brief validation", "human visual approval"],
  WEBSITE_GENERATE: ["browser observation", "UI verifier", "responsive screenshot check"],
  VIDEO_EDIT: ["ffprobe media validation", "representative frame review", "media verifier"],
  MEDIA_PROBE: ["ffprobe structured observation", "source fingerprint check"],
  VIDEO_TRIM: ["ffprobe duration check", "output file validation", "human spot check"],
  VIDEO_RESIZE: ["ffprobe dimensions check", "output file validation", "source fingerprint check"],
  AUDIO_EXTRACT: ["ffprobe audio stream check", "output file validation", "source fingerprint check"],
  VOCAL_REPLACE: ["rights/consent check", "voice identity binding check", "audio artifact verifier"],
  BUSINESS_DISCOVERY: ["public business data policy check", "source attribution check", "deduplication report", "freshness review", "human approval before any future outreach"]
};

const rollbackTemplates = {
  BOOK_COVER: ["discard generated draft artifacts", "restore previous approved cover brief"],
  WEBSITE_GENERATE: ["keep previous site version", "discard preview build artifacts before publish"],
  VIDEO_EDIT: ["preserve original media", "discard render artifact before approval"],
  MEDIA_PROBE: ["read-only observation; rollback not applicable"],
  VIDEO_TRIM: ["preserve original media", "discard trimmed copy"],
  VIDEO_RESIZE: ["preserve original media", "discard resized copy"],
  AUDIO_EXTRACT: ["preserve original media", "discard extracted audio"],
  VOCAL_REPLACE: ["preserve original audio", "discard derived stems/mix until approval"],
  BUSINESS_DISCOVERY: ["discard local lead set", "preserve no-send audit", "do not mutate CRM or outreach channels"]
};

const plainCapabilityLabels = {
  ARCHITECTURE_DESIGN: "Архитектура",
  UI_GENERATE: "Дизайн интерфейса",
  CODE_GENERATE: "Код",
  BROWSER_OBSERVE: "Проверка в браузере",
  UI_VERIFY: "Проверка интерфейса",
  IMAGE_GENERATE: "Изображение",
  IMAGE_EDIT: "Редактирование изображения",
  IMAGE_COMPOSE: "Сборка изображения",
  TEXT_EDIT: "Текст",
  IMAGE_UPSCALE: "Улучшение изображения",
  VIDEO_ANALYZE: "Анализ видео",
  VIDEO_TRANSCRIBE: "Транскрибация",
  SEMANTIC_ANALYZE: "Смысловой анализ",
  VIDEO_CAPTION: "Субтитры",
  VIDEO_EDIT: "Монтаж",
  MEDIA_PROBE: "Проверка медиа",
  VIDEO_TRIM: "Обрезка видео",
  VIDEO_RESIZE: "Изменение размера видео",
  AUDIO_EXTRACT: "Извлечение аудио",
  VIDEO_EXPORT: "Экспорт видео",
  MUSIC_ANALYZE: "Анализ музыки",
  STEM_SEPARATE: "Разделение дорожек",
  VOICE_REPLACE: "Замена голоса",
  AUDIO_MIX: "Сведение аудио",
  MUSIC_EXPORT: "Экспорт музыки",
  BOOK_COVER: "Обложка книги",
  WEBSITE_GENERATE: "Сайт",
  VOCAL_REPLACE: "Замена вокала",
  BUSINESS_DISCOVERY: "Поиск компаний",
  BUSINESS_DATA_NORMALIZE: "Нормализация business data",
  BUSINESS_DEDUPLICATE: "Дедупликация",
  BUSINESS_ENTITY_VERIFY: "Проверка компании",
  BUSINESS_NEED_ANALYZE: "Сигналы потребности",
  ESSA_FIT_MATCH: "Совпадение с ESSA",
  LEAD_QUALIFY: "Квалификация лида",
  LEAD_SCORE: "Оценка лида",
  OUTREACH_PREPARE: "Подготовка brief",
  OUTREACH_SEND: "Отправка outreach"
};

function applyProvidedInputs(requirements, providedInputs = {}) {
  return requirements.map((requirement) => ({
    ...requirement,
    currentStatus: requirement.required === false
      ? (providedInputs[requirement.requirementId] ? "PROVIDED" : "OPTIONAL")
      : (providedInputs[requirement.requirementId] ? "PROVIDED" : "MISSING")
  }));
}

function mapCostClass(costClass, activationState) {
  if (activationState === capabilityActivationStates.readyForPayment) return executionCostPreviewClasses.paidProviderRequired;
  if (costClass === capabilityCostClasses.free) return executionCostPreviewClasses.freeLocal;
  if (costClass === capabilityCostClasses.localCompute) return executionCostPreviewClasses.localCompute;
  if (costClass === capabilityCostClasses.paidExternal) return executionCostPreviewClasses.paidProviderRequired;
  if (costClass === capabilityCostClasses.metered) return executionCostPreviewClasses.externalProviderRequired;
  return executionCostPreviewClasses.unknown;
}

function classifyCapabilityStep(capabilityId, options = {}) {
  const capability = getCapability(capabilityId);
  const activationState = options.availabilityOverrides?.[capabilityId] || capability?.activationState || capabilityActivationStates.unavailable;
  const providerCandidates = getProviderCandidatesForCapability(capabilityId);
  const approvalRequired = capability?.approvalRequirements?.length > 0 || [
    capabilityRiskClasses.high,
    capabilityRiskClasses.publish,
    capabilityRiskClasses.destructive,
    capabilityRiskClasses.externalMutation
  ].includes(capability?.riskClass);

  let classification = executionStepClassifications.blocked;
  if (approvalRequired) classification = executionStepClassifications.approvalRequired;
  else if (activationState === capabilityActivationStates.readyForPayment || capability?.costClass === capabilityCostClasses.paidExternal) {
    classification = executionStepClassifications.paymentRequired;
  } else if (capability?.localPossible || capability?.deterministicPossible || providerCandidates.some((candidate) => candidate.executableNow)) {
    classification = providerCandidates.some((candidate) => candidate.executableNow) || capability?.localPossible
      ? executionStepClassifications.localReady
      : executionStepClassifications.localNotReady;
  } else if (capability?.externalProviderPossible || providerCandidates.length) {
    classification = executionStepClassifications.providerRequired;
  } else if (["text", "image", "code_product", "business", "document_publishing", "music", "video"].includes(capability?.category)) {
    classification = executionStepClassifications.intelligenceRequired;
  }

  if (activationState === capabilityActivationStates.architectureOnly && classification === executionStepClassifications.localReady) {
    classification = executionStepClassifications.localNotReady;
  }

  return {
    capabilityId,
    label: plainCapabilityLabels[capabilityId] || capability?.description || capabilityId,
    activationState,
    classification,
    costClass: mapCostClass(capability?.costClass, activationState),
    providerCandidates: providerCandidates.map((candidate) => ({
      supportStatus: candidate.supportStatus,
      executableNow: candidate.executableNow,
      experimental: candidate.experimental
    })),
    userFacingRequirement: classification === executionStepClassifications.localReady
      ? "Локальная обработка"
      : classification === executionStepClassifications.intelligenceRequired
      ? "Потребуется интеллектуальный анализ"
      : classification === executionStepClassifications.paymentRequired
      ? "Требуется платная активация"
      : classification === executionStepClassifications.providerRequired
      ? "Требуется внешний сервис"
      : classification === executionStepClassifications.approvalRequired
      ? "Требуется подтверждение"
      : "Пока недоступно"
  };
}

function createApprovalPlan({ compositionPlan, inputRequirements, stepClassifications, capability }) {
  const approvalPoints = unique([
    ...(compositionPlan.approvalPoints || []).map((point) => point.capabilityId || point.reason),
    ...stepClassifications
      .filter((step) => step.classification === executionStepClassifications.approvalRequired)
      .map((step) => step.capabilityId),
    ...(capability?.approvalRequirements || [])
  ]);
  return {
    required: true,
    approvalPoints,
    costApprovalRequired: stepClassifications.some((step) => [
      executionStepClassifications.paymentRequired,
      executionStepClassifications.providerRequired
    ].includes(step.classification)),
    providerActivationApprovalRequired: stepClassifications.some((step) => [
      executionStepClassifications.providerRequired,
      executionStepClassifications.paymentRequired
    ].includes(step.classification)),
    publishApprovalRequired: approvalPoints.some((point) => String(point).toLowerCase().includes("publish")),
    destructiveApprovalRequired: capability?.riskClass === capabilityRiskClasses.destructive,
    userInputRequired: inputRequirements.some((requirement) => requirement.required && requirement.currentStatus === "MISSING"),
    autoApproved: false
  };
}

function createExecutionStatus({ inputRequirements, availabilityState, stepClassifications, options = {} }) {
  if (inputRequirements.some((requirement) => requirement.required && requirement.currentStatus === "MISSING")) {
    return executionPreviewStatuses.blockedMissingInput;
  }
  if (options.freshnessStatus && options.freshnessStatus !== "CURRENT") return executionPreviewStatuses.blockedCapabilityUnavailable;
  if (availabilityState === capabilityActivationStates.architectureOnly) return executionPreviewStatuses.blockedCapabilityUnavailable;
  if (stepClassifications.some((step) => step.classification === executionStepClassifications.paymentRequired)) {
    return executionPreviewStatuses.blockedProviderNotActive;
  }
  if (stepClassifications.some((step) => step.classification === executionStepClassifications.providerRequired)) {
    return executionPreviewStatuses.blockedProviderNotActive;
  }
  return executionPreviewStatuses.readyForApproval;
}

function createIntelligenceStep(capability, compositionPlan, request) {
  const needsIntelligence = compositionPlan.requiredCapabilities.some((capabilityId) => {
    const item = getCapability(capabilityId);
    return item && !item.deterministicPossible && !item.localPossible;
  });
  if (!needsIntelligence) {
    const decision = routeIntelligenceRequest({
      requestId: `${request.requestId}_local_check`,
      taskType: capability?.capabilityId === "VIDEO_TRIM" ? "video_trim" : "schema_validation",
      userIntent: request.userNeed,
      requiredCapabilities: ["schema_validation"],
      traceId: request.traceId
    });
    return {
      required: false,
      userFacingLabel: "Интеллектуальный анализ не обязателен",
      debugDecision: decision,
      providerCalls: 0
    };
  }

  const taskType = capability?.category === "code_product"
    ? "architecture"
    : capability?.category === "music"
    ? "semantic_planning"
    : "production_intent";
  const decision = routeIntelligenceRequest({
    requestId: `${request.requestId}_intelligence_preview`,
    domain: capability?.domainTags?.[0] || capability?.category,
    taskType,
    userIntent: request.userNeed,
    desiredOutcome: request.requestedOutcome,
    requiredCapabilities: compositionPlan.requiredCapabilities,
    qualityRequirement: request.qualityPreference,
    privacyRequirement: request.privacyPreference,
    maxCostUsd: request.maxCostPreference === "FREE_ONLY" ? 0 : null,
    traceId: request.traceId
  });
  return {
    required: true,
    userFacingLabel: "Потребуется интеллектуальный анализ",
    debugDecision: {
      decisionType: decision.decisionType,
      reasoningLevel: decision.reasoningLevel,
      selectedProvider: decision.selectedProvider,
      selectedModel: decision.selectedModel,
      approvalRequired: decision.approvalRequired,
      estimatedCost: decision.estimatedCost
    },
    providerCalls: 0
  };
}

export function createCapabilityExecutionRequest(input = {}) {
  const resolved = input.primaryCapabilityId
    ? {
        userNeed: input.userNeed || "",
        productId: input.productId || getKnowledgeNode(input.primaryCapabilityId)?.productId || productIds.navigator,
        primaryCapabilityId: input.primaryCapabilityId
      }
    : resolveUserNeedToCapability({ userNeed: input.userNeed || "", productContext: { productId: input.productId } });

  return {
    requestId: input.requestId || createId("cap_exec_req"),
    userNeed: input.userNeed || getKnowledgeNode(resolved.primaryCapabilityId, resolved.productId)?.exampleRequests?.[0] || "",
    productId: resolved.productId,
    primaryCapabilityId: resolved.primaryCapabilityId,
    requestedOutcome: input.requestedOutcome || getKnowledgeNode(resolved.primaryCapabilityId, resolved.productId)?.userOutcome || "",
    inputRequirements: [...(input.inputRequirements || [])],
    projectId: input.projectId || null,
    taskId: input.taskId || null,
    workflowId: input.workflowId || null,
    sourceDiscoveryContext: { ...(input.sourceDiscoveryContext || {}) },
    executionRequested: true,
    maxCostPreference: input.maxCostPreference || "STANDARD",
    privacyPreference: input.privacyPreference || "standard",
    qualityPreference: input.qualityPreference || "standard",
    createdAt: input.createdAt || new Date().toISOString(),
    traceId: input.traceId || createId("trace_21j"),
    providerSecrets: null
  };
}

export function buildExecutionPreview(input = {}, options = {}) {
  const request = createCapabilityExecutionRequest(input);
  const capability = getCapability(request.primaryCapabilityId);
  const node = getKnowledgeNode(request.primaryCapabilityId, request.productId);
  const compositionPlan = createCapabilityCompositionPlan({
    goal: request.userNeed,
    primaryCapabilityId: request.primaryCapabilityId,
    constraints: {
      maxCostPreference: request.maxCostPreference,
      privacyPreference: request.privacyPreference,
      qualityPreference: request.qualityPreference
    }
  });
  const availabilityState = options.availabilityOverride ||
    options.availabilityOverrides?.[request.primaryCapabilityId] ||
    node?.availabilityState ||
    capability?.activationState ||
    capabilityActivationStates.unavailable;
  const allCapabilities = unique([
    ...compositionPlan.requiredCapabilities,
    ...compositionPlan.optionalCapabilities
  ]);
  const stepClassifications = allCapabilities.map((capabilityId) =>
    classifyCapabilityStep(capabilityId, {
      availabilityOverrides: {
        ...(options.availabilityOverrides || {}),
        [request.primaryCapabilityId]: availabilityState
      }
    })
  );
  const inputRequirements = applyProvidedInputs(
    options.inputRequirements || inputRequirementTemplates[request.primaryCapabilityId] || [
      createInputRequirement({ requirementId: "project_context", type: executionInputTypes.projectContext, label: "Контекст проекта" })
    ],
    options.providedInputs || {}
  );
  const intelligence = createIntelligenceStep(capability, compositionPlan, request);
  const approvalPlan = createApprovalPlan({ compositionPlan, inputRequirements, stepClassifications, capability });
  const executionStatus = createExecutionStatus({
    inputRequirements,
    availabilityState,
    stepClassifications,
    options
  });
  const costPreview = mapCostClass(compositionPlan.estimatedCostClass, availabilityState);
  const providerDependentSteps = stepClassifications.filter((step) => [
    executionStepClassifications.providerRequired,
    executionStepClassifications.paymentRequired,
    executionStepClassifications.approvalRequired
  ].includes(step.classification));

  return {
    requestId: request.requestId,
    request,
    product: {
      productId: request.productId,
      label: productLabels[request.productId] || request.productId
    },
    primaryCapability: {
      capabilityId: request.primaryCapabilityId,
      label: plainCapabilityLabels[request.primaryCapabilityId] || capability?.description || request.primaryCapabilityId,
      availabilityState,
      description: node?.plainLanguageDescription || capability?.description || ""
    },
    requiredCapabilities: [...compositionPlan.requiredCapabilities],
    optionalCapabilities: [...compositionPlan.optionalCapabilities],
    dependencyOrder: [...compositionPlan.dependencyOrder],
    localSteps: stepClassifications.filter((step) => [
      executionStepClassifications.localReady,
      executionStepClassifications.localNotReady
    ].includes(step.classification)),
    intelligenceSteps: [intelligence],
    providerDependentSteps,
    stepClassifications,
    inputRequirements,
    currentAvailability: {
      state: availabilityState,
      honestLabel: availabilityState === capabilityActivationStates.architectureOnly
        ? "Архитектура описана, выполнение еще не активно."
        : availabilityState === capabilityActivationStates.localReady
        ? "Локальная обработка может быть подготовлена после подтверждения."
        : availabilityState === capabilityActivationStates.readyForPayment
        ? "Перед запуском потребуется платная активация провайдера."
        : "Перед запуском потребуется проверка доступности."
    },
    activationRequirements: unique([
      ...(availabilityState === capabilityActivationStates.architectureOnly ? ["architecture-only capability"] : []),
      ...(availabilityState === capabilityActivationStates.readyForPayment ? ["provider payment required"] : []),
      ...(providerDependentSteps.length ? ["provider stack not active for execution"] : []),
      ...(stepClassifications.some((step) => step.classification === executionStepClassifications.localReady) ? ["local path available"] : [])
    ]),
    estimatedCostClass: costPreview,
    exactPriceStatus: costPreview === executionCostPreviewClasses.freeLocal || costPreview === executionCostPreviewClasses.localCompute
      ? "NOT_REQUIRED_FOR_LOCAL_PREVIEW"
      : "REVALIDATION_REQUIRED",
    approvalPoints: approvalPlan.approvalPoints,
    approvalPlan,
    safetyNotes: unique([
      "Execution Preview only; no capability is executed in Phase 21J.",
      "Provider activation, payment, deploy and publish remain disabled.",
      ...(request.primaryCapabilityId === "VOCAL_REPLACE" ? ["Voice/rights consent is mandatory before any future execution."] : []),
      ...(request.primaryCapabilityId === "BOOK_COVER" ? ["Image generation provider is not active in this preview."] : [])
    ]),
    expectedArtifacts: [...(expectedArtifactTemplates[request.primaryCapabilityId] || ["PlannedArtifact", "VerificationReport"])],
    verificationPlan: [...(verificationTemplates[request.primaryCapabilityId] || compositionPlan.verificationPlan)],
    rollbackPlan: [...(rollbackTemplates[request.primaryCapabilityId] || ["preserve original inputs", "discard generated artifacts before approval"])],
    executionStatus,
    handoffStatus: "WAITING_FOR_USER_APPROVAL",
    sourceOfTruth: [
      "ProductKnowledge",
      "CapabilityRegistry",
      "CapabilityCompositionPlan",
      "IntelligenceFabricDryRoute",
      "ProviderCapabilityMap",
      "AgentToolPolicyMetadata"
    ],
    ...executionPreviewHardGuards,
    providerCalls: 0,
    externalModelCalls: 0,
    capabilityExecutionCount: 0,
    futureExecutionIntent: {
      status: "PREVIEW_ONLY",
      executionEnabled: false,
      gatewayResultIfExecutedNow: executionPreviewHardGuards.disabledReason
    }
  };
}

export function buildExecutionPreviewViewModel(input = {}, options = {}) {
  const preview = buildExecutionPreview(input, options);
  return {
    ...preview,
    userFacingSections: {
      desiredOutcome: preview.request.requestedOutcome || preview.primaryCapability.description,
      whatIsNeeded: preview.inputRequirements.map((requirement) => ({
        label: requirement.label,
        status: requirement.currentStatus,
        required: requirement.required,
        description: requirement.description
      })),
      whatEssaWillDo: preview.dependencyOrder.map((capabilityId) =>
        preview.stepClassifications.find((step) => step.capabilityId === capabilityId)?.label || capabilityId
      ),
      localWork: preview.localSteps.map((step) => step.label),
      externalWork: preview.providerDependentSteps.map((step) => step.label),
      userConfirmations: preview.approvalPlan.approvalPoints,
      outputs: preview.expectedArtifacts,
      verification: preview.verificationPlan,
      activation: preview.activationRequirements,
      disabledMessage: executionPreviewHardGuards.disabledReason
    }
  };
}

export function attemptExecutionFromPreview() {
  return {
    ok: false,
    status: executionPreviewHardGuards.disabledReason,
    ...executionPreviewHardGuards,
    providerCalls: 0,
    externalModelCalls: 0,
    capabilityExecutionCount: 0
  };
}
