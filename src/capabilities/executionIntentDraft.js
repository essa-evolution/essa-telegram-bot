import {
  executionGateDecisions,
  prepareExecution
} from "../agentToolLayer/executionGateway.js";
import { routeIntelligenceRequest } from "../intelligence/intelligenceRouter.js";
import {
  capabilityActivationStates,
  capabilityCostClasses,
  capabilityRiskClasses
} from "./capabilityContracts.js";
import { createCapabilityCompositionPlan } from "./capabilityComposition.js";
import { getCapability } from "./capabilityRegistry.js";
import {
  buildExecutionPreview,
  executionCostPreviewClasses,
  executionStepClassifications,
  executionPreviewStatuses
} from "./executionPreview.js";
import { buildBoundedProductKnowledgeContext, evaluateContentFreshness } from "./capabilityKnowledge.js";
import { getProviderCandidatesForCapability } from "./providerCapabilityMap.js";
import { productIds } from "./productCapabilityMap.js";
import { productKnowledgeNodes } from "./productKnowledge.js";

export const executionIntentDraftStatuses = {
  draft: "DRAFT",
  inputRequired: "INPUT_REQUIRED",
  preflightReady: "PREFLIGHT_READY",
  preflightBlocked: "PREFLIGHT_BLOCKED",
  approvalRequired: "APPROVAL_REQUIRED",
  providerActivationRequired: "PROVIDER_ACTIVATION_REQUIRED",
  paymentRequired: "PAYMENT_REQUIRED",
  staleRevalidationRequired: "STALE_REVALIDATION_REQUIRED",
  readyForFutureExecution: "READY_FOR_FUTURE_EXECUTION",
  executionDisabledPhase21K: "EXECUTION_DISABLED_PHASE_21K"
};

export const executionIntentClasses = {
  localOnly: "LOCAL_ONLY",
  localPlusIntelligence: "LOCAL_PLUS_INTELLIGENCE",
  externalProviderRequired: "EXTERNAL_PROVIDER_REQUIRED",
  paidProviderRequired: "PAID_PROVIDER_REQUIRED",
  publishRequired: "PUBLISH_REQUIRED",
  destructiveOrHighImpact: "DESTRUCTIVE_OR_HIGH_IMPACT",
  unavailable: "UNAVAILABLE",
  architectureOnly: "ARCHITECTURE_ONLY"
};

export const inputReadinessStatuses = {
  ready: "READY",
  optional: "OPTIONAL",
  missing: "MISSING",
  invalid: "INVALID",
  requiresUserInput: "REQUIRES_USER_INPUT",
  requiresApproval: "REQUIRES_APPROVAL"
};

export const approvalTypes = {
  userInputApproval: "USER_INPUT_APPROVAL",
  costApproval: "COST_APPROVAL",
  providerActivationApproval: "PROVIDER_ACTIVATION_APPROVAL",
  paymentApproval: "PAYMENT_APPROVAL",
  publishApproval: "PUBLISH_APPROVAL",
  destructiveActionApproval: "DESTRUCTIVE_ACTION_APPROVAL",
  externalAccountApproval: "EXTERNAL_ACCOUNT_APPROVAL",
  legalOrPolicyReview: "LEGAL_OR_POLICY_REVIEW",
  humanReview: "HUMAN_REVIEW"
};

export const providerActivationStatuses = {
  capabilityRequiresProvider: "CAPABILITY_REQUIRES_PROVIDER",
  providerNotSelected: "PROVIDER_NOT_SELECTED",
  providerSelectedNotActive: "PROVIDER_SELECTED_NOT_ACTIVE",
  providerActiveFuture: "PROVIDER_ACTIVE_FUTURE",
  paymentRequired: "PAYMENT_REQUIRED",
  providerHealthUnknown: "PROVIDER_HEALTH_UNKNOWN",
  localOnlyNoProviderRequired: "LOCAL_ONLY_NO_PROVIDER_REQUIRED"
};

export const phase21KHardGuards = {
  executionEnabled: false,
  toolExecutionEnabled: false,
  providerExecutionEnabled: false,
  paymentEnabled: false,
  publishEnabled: false,
  deployEnabled: false,
  executionPerformed: false,
  capabilityExecutionCount: 0,
  providerCalls: 0,
  externalCalls: 0,
  externalModelCalls: 0,
  paymentActions: 0,
  publishActions: 0,
  deployActions: 0,
  disabledReason: "EXECUTION_DISABLED_PHASE_21K"
};

export const preflightStatusLabelsRu = {
  [executionIntentDraftStatuses.draft]: "ЧЕРНОВИК",
  [executionIntentDraftStatuses.inputRequired]: "НУЖНЫ ДАННЫЕ",
  [executionIntentDraftStatuses.preflightReady]: "ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА ГОТОВА",
  [executionIntentDraftStatuses.preflightBlocked]: "ЕСТЬ БЛОКИРОВКИ",
  [executionIntentDraftStatuses.approvalRequired]: "НУЖНО ПОДТВЕРЖДЕНИЕ",
  [executionIntentDraftStatuses.providerActivationRequired]: "НУЖНО ПОДКЛЮЧИТЬ СЕРВИС",
  [executionIntentDraftStatuses.paymentRequired]: "МОЖЕТ ПОТРЕБОВАТЬСЯ ОПЛАТА",
  [executionIntentDraftStatuses.staleRevalidationRequired]: "НУЖНО ОБНОВИТЬ ДАННЫЕ",
  [executionIntentDraftStatuses.readyForFutureExecution]: "ТЕХНИЧЕСКИ ГОТОВО К БУДУЩЕМУ ЗАПУСКУ",
  [executionIntentDraftStatuses.executionDisabledPhase21K]: "ЗАПУСК ПОКА ОТКЛЮЧЕН"
};

export const executionClassLabelsRu = {
  [executionIntentClasses.localOnly]: "Можно выполнить средствами ESSA в локальном контуре.",
  [executionIntentClasses.localPlusIntelligence]: "Часть работы локальная, часть требует интеллектуального анализа.",
  [executionIntentClasses.externalProviderRequired]: "Для части задачи потребуется внешний сервис.",
  [executionIntentClasses.paidProviderRequired]: "Для части задачи потребуется внешний платный сервис.",
  [executionIntentClasses.publishRequired]: "Результат затрагивает публикацию и требует отдельного подтверждения.",
  [executionIntentClasses.destructiveOrHighImpact]: "Высокое влияние: нужны права, проверка и явное подтверждение.",
  [executionIntentClasses.unavailable]: "Возможность пока недоступна.",
  [executionIntentClasses.architectureOnly]: "Возможность описана в архитектуре, но запуск еще недоступен."
};

export const costPreviewLabelsRu = {
  [executionCostPreviewClasses.freeLocal]: "БЕЗ ВНЕШНЕЙ ОПЛАТЫ",
  [executionCostPreviewClasses.localCompute]: "ЛОКАЛЬНАЯ ОБРАБОТКА",
  [executionCostPreviewClasses.externalProviderRequired]: "ПОТРЕБУЕТСЯ ВНЕШНИЙ СЕРВИС",
  [executionCostPreviewClasses.paidProviderRequired]: "ВОЗМОЖНА ОПЛАТА ПРОВАЙДЕРА",
  [executionCostPreviewClasses.priceRevalidationRequired]: "СТОИМОСТЬ НУЖНО ПРОВЕРИТЬ ПЕРЕД ЗАПУСКОМ",
  [executionCostPreviewClasses.unknown]: "СТОИМОСТЬ ПОКА НЕИЗВЕСТНА"
};

export const rollbackStates = {
  ready: "ROLLBACK_READY",
  limited: "LIMITED_ROLLBACK",
  none: "NO_ROLLBACK",
  notApplicable: "NOT_APPLICABLE"
};

const preflightCapabilityLabels = {
  ARCHITECTURE_DESIGN: "Архитектура",
  UI_GENERATE: "Интерфейс",
  CODE_GENERATE: "Код",
  BROWSER_OBSERVE: "Проверка в браузере",
  UI_VERIFY: "Проверка интерфейса",
  IMAGE_GENERATE: "Создание изображения",
  IMAGE_EDIT: "Редактирование изображения",
  IMAGE_COMPOSE: "Сборка обложки",
  TEXT_EDIT: "Текст",
  IMAGE_UPSCALE: "Улучшение изображения",
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
  AUDIO_MIX: "Сведение",
  MUSIC_EXPORT: "Экспорт музыки",
  BOOK_COVER: "Обложка книги",
  WEBSITE_GENERATE: "Сайт",
  VOCAL_REPLACE: "Замена вокала",
  BUSINESS_DISCOVERY: "Поиск компаний",
  BUSINESS_DATA_NORMALIZE: "Нормализация данных",
  BUSINESS_DEDUPLICATE: "Дедупликация",
  BUSINESS_ENTITY_VERIFY: "Проверка компании",
  BUSINESS_NEED_ANALYZE: "Анализ потребности",
  ESSA_FIT_MATCH: "ESSA fit",
  LEAD_QUALIFY: "Квалификация",
  LEAD_SCORE: "Оценка"
};

export const executionIntentDraftContract = {
  intentId: null,
  requestId: null,
  traceId: null,
  userNeed: "",
  productId: null,
  primaryCapabilityId: null,
  requiredCapabilityIds: [],
  optionalCapabilityIds: [],
  desiredOutcome: "",
  inputSnapshot: [],
  missingInputs: [],
  capabilityComposition: null,
  dependencyOrder: [],
  executionClass: executionIntentClasses.unavailable,
  localSteps: [],
  intelligenceSteps: [],
  providerSteps: [],
  availabilitySnapshot: {},
  activationRequirements: [],
  costClass: executionCostPreviewClasses.unknown,
  costApprovalRequired: false,
  approvals: [],
  safetyClassification: "LOW",
  policyChecks: [],
  expectedArtifacts: [],
  verificationPlan: [],
  rollbackPlan: [],
  sourceVersions: [],
  freshnessStatus: "CURRENT",
  executionRequested: true,
  executionEnabled: false,
  status: executionIntentDraftStatuses.draft,
  createdAt: null
};

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}`;
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function hasSecretLikeValue(value) {
  const text = JSON.stringify(value || {}).toLowerCase();
  return /(api[_-]?key|secret|token|password|sk-[a-z0-9_-]+)/i.test(text);
}

function normalizeCostClass(costClass) {
  if (Object.values(executionCostPreviewClasses).includes(costClass)) return costClass;
  if (costClass === capabilityCostClasses.free) return executionCostPreviewClasses.freeLocal;
  if (costClass === capabilityCostClasses.localCompute) return executionCostPreviewClasses.localCompute;
  if (costClass === capabilityCostClasses.paidExternal) return executionCostPreviewClasses.paidProviderRequired;
  if (costClass === capabilityCostClasses.metered) return executionCostPreviewClasses.externalProviderRequired;
  return executionCostPreviewClasses.unknown;
}

function summarizeInputReadiness(requirement = {}) {
  if (requirement.currentStatus === "PROVIDED") return inputReadinessStatuses.ready;
  if (requirement.currentStatus === "OPTIONAL" || requirement.required === false) return inputReadinessStatuses.optional;
  if (requirement.type === "APPROVAL") return inputReadinessStatuses.requiresApproval;
  if (requirement.currentStatus === "INVALID") return inputReadinessStatuses.invalid;
  return requirement.required ? inputReadinessStatuses.requiresUserInput : inputReadinessStatuses.missing;
}

function getSourceVersions(capabilityIds = [], productId = null, freshnessOptions = {}) {
  return capabilityIds.map((capabilityId) => {
    const capability = getCapability(capabilityId);
    const node = productKnowledgeNodes.find((item) =>
      item.capabilityId === capabilityId && (!productId || item.productId === productId)
    ) || productKnowledgeNodes.find((item) => item.capabilityId === capabilityId);
    const capabilityVersion = freshnessOptions.sourceVersionOverrideByCapability?.[capabilityId] ||
      freshnessOptions.sourceVersionOverride ||
      capability?.version ||
      null;
    return {
      capabilityId,
      capabilityVersion,
      currentCapabilityVersion: capability?.version || null,
      productId: node?.productId || productId,
      productVersion: node?.version || "1.0.0",
      knowledgeVersion: node?.version || "1.0.0",
      availabilityState: node?.availabilityState || capability?.activationState || capabilityActivationStates.unavailable
    };
  });
}

function getFreshness(capabilityId, options = {}) {
  const capability = getCapability(capabilityId);
  if (!capability) return "STALE_REVALIDATION_REQUIRED";
  const result = evaluateContentFreshness({
    contentArtifact: {
      capabilityId,
      capabilityVersion: options.sourceVersionOverrideByCapability?.[capabilityId] ||
        options.sourceVersionOverride ||
        capability.version,
      availabilityState: options.availabilityStateOverrideByCapability?.[capabilityId] ||
        options.availabilityStateOverride ||
        capability.activationState
    },
    currentCapability: capability
  });
  return result.freshnessStatus === "CURRENT" ? "CURRENT" : "STALE_REVALIDATION_REQUIRED";
}

function classifyExecution({ capability, preview, compositionPlan }) {
  if (!capability) return executionIntentClasses.unavailable;
  if (capability.activationState === capabilityActivationStates.disabled || capability.activationState === capabilityActivationStates.unavailable) {
    return executionIntentClasses.unavailable;
  }
  if (capability.riskClass === capabilityRiskClasses.publish) return executionIntentClasses.publishRequired;
  if ([capabilityRiskClasses.destructive, capabilityRiskClasses.externalMutation, capabilityRiskClasses.high].includes(capability.riskClass)) {
    return executionIntentClasses.destructiveOrHighImpact;
  }
  if (preview.stepClassifications.some((step) => step.costClass === executionCostPreviewClasses.paidProviderRequired)) {
    return executionIntentClasses.paidProviderRequired;
  }
  if (preview.providerDependentSteps.length || capability.externalProviderPossible) {
    return executionIntentClasses.externalProviderRequired;
  }
  if (capability.activationState === capabilityActivationStates.architectureOnly) return executionIntentClasses.architectureOnly;
  if (compositionPlan.localCandidates.length && preview.intelligenceSteps.some((step) => step.required)) {
    return executionIntentClasses.localPlusIntelligence;
  }
  if (compositionPlan.localCandidates.length) return executionIntentClasses.localOnly;
  return executionIntentClasses.architectureOnly;
}

function deriveProviderActivation(preview, capability) {
  if (!capability?.externalProviderPossible && preview.providerDependentSteps.length === 0) {
    return [providerActivationStatuses.localOnlyNoProviderRequired];
  }
  const statuses = [providerActivationStatuses.capabilityRequiresProvider];
  if (!preview.providerDependentSteps.length) statuses.push(providerActivationStatuses.providerNotSelected);
  if (preview.providerDependentSteps.some((step) => step.providerCandidates.length === 0)) {
    statuses.push(providerActivationStatuses.providerNotSelected);
  }
  if (preview.providerDependentSteps.some((step) => step.providerCandidates.some((candidate) => !candidate.executableNow))) {
    statuses.push(providerActivationStatuses.providerSelectedNotActive);
  }
  if (preview.providerDependentSteps.some((step) => step.costClass === executionCostPreviewClasses.paidProviderRequired)) {
    statuses.push(providerActivationStatuses.paymentRequired);
  }
  statuses.push(providerActivationStatuses.providerHealthUnknown);
  return unique(statuses);
}

function deriveApprovals({ preview, capability, executionClass, providerActivation }) {
  const approvals = [];
  if (preview.inputRequirements.some((item) => item.required && item.currentStatus === "MISSING")) {
    approvals.push(approvalTypes.userInputApproval);
  }
  if (preview.approvalPlan.costApprovalRequired) approvals.push(approvalTypes.costApproval);
  if (preview.approvalPlan.providerActivationApprovalRequired || providerActivation.includes(providerActivationStatuses.capabilityRequiresProvider)) {
    approvals.push(approvalTypes.providerActivationApproval);
  }
  if (preview.estimatedCostClass === executionCostPreviewClasses.paidProviderRequired) approvals.push(approvalTypes.paymentApproval);
  if (executionClass === executionIntentClasses.publishRequired || capability?.riskClass === capabilityRiskClasses.publish) {
    approvals.push(approvalTypes.publishApproval);
  }
  if (executionClass === executionIntentClasses.destructiveOrHighImpact) approvals.push(approvalTypes.destructiveActionApproval);
  if (capability?.externalProviderPossible) approvals.push(approvalTypes.externalAccountApproval);
  if (capability?.approvalRequirements?.some((item) => /legal|policy|rights|voice|source/i.test(item))) {
    approvals.push(approvalTypes.legalOrPolicyReview);
  }
  if (preview.approvalPlan.required || capability?.approvalRequirements?.length) approvals.push(approvalTypes.humanReview);
  return unique(approvals).map((type) => ({ type, required: true, autoApproved: false }));
}

function statusForDraft({ missingInputs, freshnessStatus, executionClass, providerActivation, approvals, capability }) {
  if (freshnessStatus !== "CURRENT") return executionIntentDraftStatuses.staleRevalidationRequired;
  if (missingInputs.length) return executionIntentDraftStatuses.inputRequired;
  if (executionClass === executionIntentClasses.unavailable || capability?.activationState === capabilityActivationStates.disabled) {
    return executionIntentDraftStatuses.preflightBlocked;
  }
  if (executionClass === executionIntentClasses.paidProviderRequired || providerActivation.includes(providerActivationStatuses.paymentRequired)) {
    return executionIntentDraftStatuses.paymentRequired;
  }
  if (providerActivation.includes(providerActivationStatuses.capabilityRequiresProvider)) {
    return executionIntentDraftStatuses.providerActivationRequired;
  }
  if (approvals.length) return executionIntentDraftStatuses.approvalRequired;
  return executionIntentDraftStatuses.readyForFutureExecution;
}

function createPolicyChecks({ preview, inputSnapshot, capability, freshnessStatus }) {
  return [
    { code: "execution_disabled_phase_21k", passed: false },
    { code: "provider_calls_zero", passed: true },
    { code: "external_model_calls_zero", passed: true },
    { code: "payment_publish_deploy_zero", passed: true },
    { code: "inputs_checked", passed: inputSnapshot.every((item) => item.readiness !== inputReadinessStatuses.invalid) },
    { code: "secrets_not_in_input_snapshot", passed: !hasSecretLikeValue(inputSnapshot) },
    { code: "freshness_current", passed: freshnessStatus === "CURRENT" },
    { code: "execution_preview_source_preserved", passed: preview.executionEnabled === false },
    { code: "capability_source_found", passed: Boolean(capability) }
  ];
}

function futureToolRequirements(capabilityId) {
  const map = {
    WEBSITE_GENERATE: ["architecture", "code_generation", "filesystem_changes", "browser_verification"],
    VIDEO_EDIT: ["ffmpeg", "ffprobe", "local_transcription_optional", "render", "media_verification"],
    MEDIA_PROBE: ["ffprobe", "media_observation"],
    VIDEO_TRIM: ["ffmpeg", "ffprobe", "media_verification"],
    VIDEO_RESIZE: ["ffmpeg", "ffprobe", "dimension_verification"],
    AUDIO_EXTRACT: ["ffmpeg", "ffprobe", "audio_stream_verification"],
    VOCAL_REPLACE: ["rights_check", "voice_binding", "audio_processing", "audio_verification"],
    BOOK_COVER: ["design_brief", "image_provider_future", "format_check", "human_visual_review"],
    BUSINESS_DISCOVERY: ["lead_source_adapter_future", "normalizer", "deduper", "business_verifier", "review_queue"]
  };
  return map[capabilityId] || ["future_tool_requirements_not_selected"];
}

export function createExecutionIntentDraft(input = {}, options = {}) {
  const preview = input.executionPreview || buildExecutionPreview(input, options);
  const request = preview.request;
  const capability = getCapability(request.primaryCapabilityId);
  const compositionPlan = createCapabilityCompositionPlan({
    goal: request.userNeed,
    primaryCapabilityId: request.primaryCapabilityId,
    constraints: {
      maxCostPreference: request.maxCostPreference,
      privacyPreference: request.privacyPreference,
      qualityPreference: request.qualityPreference
    }
  });
  const inputSnapshot = preview.inputRequirements.map((requirement) => ({
    ...requirement,
    readiness: summarizeInputReadiness(requirement)
  }));
  const missingInputs = inputSnapshot.filter((item) => [
    inputReadinessStatuses.missing,
    inputReadinessStatuses.requiresUserInput,
    inputReadinessStatuses.requiresApproval,
    inputReadinessStatuses.invalid
  ].includes(item.readiness));
  const allCapabilityIds = unique([...preview.requiredCapabilities, ...preview.optionalCapabilities]);
  const sourceVersions = getSourceVersions(allCapabilityIds, request.productId, options);
  const freshnessStatus = options.freshnessStatusOverride || getFreshness(request.primaryCapabilityId, options);
  const executionClass = classifyExecution({ capability, preview, compositionPlan });
  const providerActivation = deriveProviderActivation(preview, capability);
  const approvals = deriveApprovals({ preview, capability, executionClass, providerActivation });
  const status = statusForDraft({
    missingInputs,
    freshnessStatus,
    executionClass,
    providerActivation,
    approvals,
    capability
  });
  const intelligenceDryRoute = routeIntelligenceRequest({
    requestId: `${request.requestId}_phase21k_dry_route`,
    taskType: preview.intelligenceSteps.some((step) => step.required) ? "semantic_planning" : "schema_validation",
    userIntent: request.userNeed,
    requiredCapabilities: preview.requiredCapabilities,
    maxCostUsd: request.maxCostPreference === "FREE_ONLY" ? 0 : null,
    traceId: request.traceId
  });

  const draft = {
    ...executionIntentDraftContract,
    intentId: input.intentId || createId("execution_intent_draft"),
    requestId: request.requestId,
    traceId: request.traceId,
    userNeed: request.userNeed,
    productId: request.productId,
    primaryCapabilityId: request.primaryCapabilityId,
    requiredCapabilityIds: [...preview.requiredCapabilities],
    optionalCapabilityIds: [...preview.optionalCapabilities],
    desiredOutcome: request.requestedOutcome,
    inputSnapshot,
    missingInputs,
    capabilityComposition: compositionPlan,
    dependencyOrder: [...preview.dependencyOrder],
    executionClass,
    localSteps: [...preview.localSteps],
    intelligenceSteps: preview.intelligenceSteps.map((step) => ({
      required: step.required,
      userFacingLabel: step.userFacingLabel,
      reasoningLevel: step.debugDecision?.reasoningLevel || intelligenceDryRoute.reasoningLevel || "NONE",
      providerCalls: 0
    })),
    providerSteps: [...preview.providerDependentSteps],
    availabilitySnapshot: { ...preview.currentAvailability },
    activationRequirements: unique([
      ...preview.activationRequirements,
      ...providerActivation,
      ...(request.primaryCapabilityId === "BUSINESS_DISCOVERY" ? ["LIVE_SOURCE_ACTIVATION_REQUIRED", "OUTREACH_REMAINS_DISABLED"] : [])
    ]),
    costClass: options.costClassOverride || preview.estimatedCostClass,
    costApprovalRequired: preview.approvalPlan.costApprovalRequired ||
      preview.estimatedCostClass === executionCostPreviewClasses.paidProviderRequired,
    approvals,
    safetyClassification: executionClass === executionIntentClasses.destructiveOrHighImpact ||
      executionClass === executionIntentClasses.publishRequired ||
      [capabilityRiskClasses.destructive, capabilityRiskClasses.externalMutation, capabilityRiskClasses.publish, capabilityRiskClasses.high].includes(capability?.riskClass)
      ? "HIGH_IMPACT"
      : capability?.riskClass || "LOW",
    expectedArtifacts: [...preview.expectedArtifacts],
    verificationPlan: [...preview.verificationPlan],
    rollbackPlan: [...preview.rollbackPlan],
    sourceVersions,
    freshnessStatus,
    executionRequested: request.executionRequested !== false,
    executionEnabled: false,
    status,
    createdAt: options.createdAt || new Date().toISOString(),
    contextEconomy: buildBoundedProductKnowledgeContext({
      query: request.userNeed || request.primaryCapabilityId,
      maxItems: options.contextBudget?.maxItems || 6,
      maxChars: options.contextBudget?.maxChars || 1800
    }),
    futureToolRequirements: futureToolRequirements(request.primaryCapabilityId),
    providerActivation,
    ...phase21KHardGuards
  };

  draft.policyChecks = createPolicyChecks({ preview, inputSnapshot, capability, freshnessStatus });
  return draft;
}

function createPreviewGatewayIntent(draft) {
  return {
    executionIntentId: draft.intentId,
    requestId: draft.requestId,
    traceId: draft.traceId,
    toolId: "documentation.context7.mock",
    capability: "api_reference_lookup",
    action: "phase21k_preflight_only",
    normalizedInput: {
      scope: "phase21k_preflight",
      capabilityId: draft.primaryCapabilityId,
      productId: draft.productId
    },
    status: "BLOCKED",
    environment: "development",
    approvalRequired: true,
    costClass: normalizeCostClass(draft.costClass),
    estimatedCost: null,
    maxApprovedCost: null,
    createdAt: draft.createdAt,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    idempotencyKey: `${draft.intentId}::phase21k_preflight`,
    policyVersion: "agent-tool-policy-v1",
    registryVersion: "agent-tool-registry-v1",
    audit: []
  };
}

export function preflightExecutionIntentDraft(draftInput = {}, options = {}) {
  const draft = draftInput.primaryCapabilityId || draftInput.executionPreview
    ? createExecutionIntentDraft(draftInput, options)
    : draftInput;
  const blockers = [];
  const warnings = [];

  if (draft.missingInputs.length) blockers.push("REQUIRED_INPUTS_MISSING");
  if (draft.freshnessStatus !== "CURRENT") blockers.push("STALE_REVALIDATION_REQUIRED");
  if (draft.primaryCapabilityId === "BUSINESS_DISCOVERY") blockers.push("LIVE_SOURCE_ACTIVATION_REQUIRED");
  if (draft.executionClass === executionIntentClasses.architectureOnly) blockers.push("CAPABILITY_ARCHITECTURE_ONLY");
  if (draft.executionClass === executionIntentClasses.unavailable) blockers.push("CAPABILITY_UNAVAILABLE");
  if (draft.providerActivation.includes(providerActivationStatuses.capabilityRequiresProvider)) {
    blockers.push("PROVIDER_ACTIVATION_REQUIRED");
  }
  if (draft.costClass === executionCostPreviewClasses.paidProviderRequired) blockers.push("PAYMENT_REQUIRED");
  if (draft.costClass === executionCostPreviewClasses.priceRevalidationRequired) blockers.push("PRICE_REVALIDATION_REQUIRED");
  if (draft.safetyClassification === "HIGH_IMPACT") blockers.push("HIGH_IMPACT_APPROVAL_REQUIRED");
  if (!draft.verificationPlan.length) warnings.push("VERIFICATION_PLAN_NOT_READY");
  if (!draft.rollbackPlan.length) warnings.push("ROLLBACK_PLAN_NOT_READY");

  const gatewayResult = prepareExecution(createPreviewGatewayIntent(draft));
  const status = blockers.length
    ? executionIntentDraftStatuses.preflightBlocked
    : draft.approvals.length
    ? executionIntentDraftStatuses.approvalRequired
    : executionIntentDraftStatuses.executionDisabledPhase21K;

  return {
    decisionId: options.decisionId || createId("execution_preflight_decision"),
    intentId: draft.intentId,
    status,
    allowedInPrinciple: blockers.length === 0,
    executableNow: false,
    blockers: unique(["EXECUTION_DISABLED_PHASE_21K", ...blockers]),
    warnings: unique(warnings),
    requiredApprovals: draft.approvals,
    requiredInputs: draft.missingInputs,
    requiredActivations: draft.activationRequirements,
    costClass: draft.costClass,
    safeLocalExecutionReadiness: getCapability(draft.primaryCapabilityId)?.metadata?.safeLocalExecutionAvailable === true && blockers.length === 0
      ? "READY_FOR_SAFE_LOCAL_EXECUTION"
      : null,
    verificationReady: draft.verificationPlan.length > 0,
    rollbackReady: draft.rollbackPlan.length > 0 && !/not reversible|not_fully_reversible/i.test(JSON.stringify(draft.rollbackPlan)),
    nextSafeAction: blockers.length
      ? "collect_missing_input_or_activation_approval_for_future_phase"
      : "hold_for_explicit_future_execution_phase",
    gatewayMode: "PREFLIGHT_ONLY",
    gatewayResult: {
      decision: gatewayResult.decision,
      reason: gatewayResult.reason,
      executed: gatewayResult.executed
    },
    ...phase21KHardGuards
  };
}

export function createExecutionIntentAuditArtifact(draftInput = {}, decisionInput = null) {
  const draft = draftInput.primaryCapabilityId || draftInput.executionPreview
    ? createExecutionIntentDraft(draftInput)
    : draftInput;
  const preflightDecision = decisionInput || preflightExecutionIntentDraft(draft);
  return {
    artifactType: "ExecutionIntentAuditArtifact",
    intentId: draft.intentId,
    traceId: draft.traceId,
    sourceRequest: {
      requestId: draft.requestId,
      userNeed: draft.userNeed,
      productId: draft.productId
    },
    capabilitySelection: {
      primaryCapabilityId: draft.primaryCapabilityId,
      requiredCapabilityIds: [...draft.requiredCapabilityIds],
      optionalCapabilityIds: [...draft.optionalCapabilityIds]
    },
    composition: draft.capabilityComposition,
    availability: draft.availabilitySnapshot,
    inputs: draft.inputSnapshot,
    missingInputs: draft.missingInputs,
    costClass: draft.costClass,
    providerRequirements: draft.providerActivation,
    approvalRequirements: draft.approvals,
    policyChecks: draft.policyChecks,
    blockers: preflightDecision.blockers,
    warnings: preflightDecision.warnings,
    preflightDecision,
    sourceVersions: draft.sourceVersions,
    freshness: draft.freshnessStatus,
    contextEconomy: {
      availableItems: draft.contextEconomy?.selected?.length + (draft.contextEconomy?.omittedCount || 0),
      selectedItems: draft.contextEconomy?.selected?.length || 0,
      chars: draft.contextEconomy?.budget?.usedChars || 0,
      estimatedTokens: Math.ceil((draft.contextEconomy?.budget?.usedChars || 0) / 4),
      excludedCategories: ["full_capability_catalog", "provider_secret_metadata", "raw_user_private_context"]
    },
    ...phase21KHardGuards,
    externalCalls: 0,
    timestamp: new Date().toISOString()
  };
}

function statusGroup(status) {
  if ([
    executionIntentDraftStatuses.inputRequired,
    executionIntentDraftStatuses.providerActivationRequired,
    executionIntentDraftStatuses.paymentRequired,
    executionIntentDraftStatuses.staleRevalidationRequired
  ].includes(status)) return "WARNING";
  if (status === executionIntentDraftStatuses.preflightBlocked) return "BLOCKER";
  if (status === executionIntentDraftStatuses.readyForFutureExecution) return "INFO";
  return "INFO";
}

function requirementLabel(readiness) {
  const labels = {
    [inputReadinessStatuses.ready]: "Готово",
    [inputReadinessStatuses.optional]: "Опционально",
    [inputReadinessStatuses.missing]: "Не хватает",
    [inputReadinessStatuses.invalid]: "Неверный формат",
    [inputReadinessStatuses.requiresUserInput]: "Нужно от вас",
    [inputReadinessStatuses.requiresApproval]: "Нужно подтверждение"
  };
  return labels[readiness] || readiness;
}

function activationLabel(status) {
  const labels = {
    [providerActivationStatuses.capabilityRequiresProvider]: "Для этой части задачи потребуется подключить внешний сервис.",
    [providerActivationStatuses.providerNotSelected]: "Сервис еще не выбран.",
    [providerActivationStatuses.providerSelectedNotActive]: "Сервис еще не активирован.",
    [providerActivationStatuses.providerActiveFuture]: "Сервис может быть активирован в будущем.",
    [providerActivationStatuses.paymentRequired]: "Перед запуском может потребоваться оплата.",
    [providerActivationStatuses.providerHealthUnknown]: "Перед запуском нужно проверить состояние сервиса.",
    [providerActivationStatuses.localOnlyNoProviderRequired]: "Внешний сервис для этой части не нужен."
  };
  if (status === "LIVE_SOURCE_ACTIVATION_REQUIRED") return "Нужно отдельно активировать live-источники.";
  if (status === "OUTREACH_REMAINS_DISABLED") return "Outreach, отправка сообщений и CRM-мутации отключены.";
  if (status === "architecture-only capability") return "Возможность пока только архитектурная.";
  return labels[status] || status;
}

function approvalUiType(type) {
  const map = {
    [approvalTypes.userInputApproval]: "USER_INPUT",
    [approvalTypes.costApproval]: "COST",
    [approvalTypes.providerActivationApproval]: "PROVIDER_ACTIVATION",
    [approvalTypes.paymentApproval]: "PAYMENT",
    [approvalTypes.publishApproval]: "PUBLISH",
    [approvalTypes.destructiveActionApproval]: "DESTRUCTIVE_OR_HIGH_IMPACT",
    [approvalTypes.externalAccountApproval]: "EXTERNAL_ACCOUNT",
    [approvalTypes.legalOrPolicyReview]: "LEGAL_POLICY_REVIEW",
    [approvalTypes.humanReview]: "HUMAN_REVIEW"
  };
  return map[type] || type;
}

function blockerLabel(code) {
  const labels = {
    EXECUTION_DISABLED_PHASE_21K: "Запуск отключен текущей фазой.",
    REQUIRED_INPUTS_MISSING: "Не хватает обязательных данных.",
    STALE_REVALIDATION_REQUIRED: "Данные нужно обновить перед запуском.",
    LIVE_SOURCE_ACTIVATION_REQUIRED: "Live-источники не активированы.",
    CAPABILITY_ARCHITECTURE_ONLY: "Возможность пока architecture-only.",
    CAPABILITY_UNAVAILABLE: "Возможность недоступна.",
    PROVIDER_ACTIVATION_REQUIRED: "Нужно подключить внешний сервис.",
    PAYMENT_REQUIRED: "Может потребоваться оплата.",
    PRICE_REVALIDATION_REQUIRED: "Стоимость нужно проверить перед запуском.",
    HIGH_IMPACT_APPROVAL_REQUIRED: "Нужна проверка высоко-влияющего действия."
  };
  return labels[code] || code;
}

function stepGroup(step = {}) {
  const classification = step.classification;
  if ([
    executionStepClassifications.localReady,
    executionStepClassifications.localNotReady
  ].includes(classification)) return "localSteps";
  if (classification === executionStepClassifications.intelligenceRequired) return "intelligenceSteps";
  if ([
    executionStepClassifications.providerRequired,
    executionStepClassifications.paymentRequired
  ].includes(classification)) return "providerSteps";
  return "blockedSteps";
}

function rollbackStateFor(draft = {}, preflight = {}) {
  if (!draft.rollbackPlan?.length) return rollbackStates.notApplicable;
  if (preflight.rollbackReady) return rollbackStates.ready;
  if (draft.safetyClassification === "HIGH_IMPACT") return rollbackStates.limited;
  return rollbackStates.none;
}

function createReadinessSummary(draft, preflight) {
  const ready = draft.inputSnapshot.filter((item) => item.readiness === inputReadinessStatuses.ready).length +
    draft.localSteps.length;
  const needFromUser = draft.inputSnapshot.filter((item) => [
    inputReadinessStatuses.requiresUserInput,
    inputReadinessStatuses.missing,
    inputReadinessStatuses.invalid
  ].includes(item.readiness)).length;
  const activation = draft.activationRequirements.filter((item) =>
    item !== providerActivationStatuses.localOnlyNoProviderRequired
  ).length;
  return {
    ready,
    neededFromUser: needFromUser,
    requiresActivation: activation,
    requiresApproval: draft.approvals.length,
    blockers: preflight.blockers.length,
    warnings: preflight.warnings.length
  };
}

function createLisaPreflightExplanation(draft, preflight) {
  const missing = draft.missingInputs.map((item) => item.label).filter(Boolean).slice(0, 3);
  const external = draft.providerActivation.some((item) => item !== providerActivationStatuses.localOnlyNoProviderRequired);
  const parts = [
    `Я вижу задачу: ${draft.userNeed || draft.primaryCapabilityId}.`,
    missing.length
      ? `Перед запуском нужно получить: ${missing.join(", ")}.`
      : "Основные входные данные для проверки выглядят собранными.",
    external
      ? "Для части работы потребуется внешний сервис или его проверка перед будущим запуском."
      : "Эта задача не требует внешнего сервиса по текущей карте возможностей.",
    preflight.blockers.includes("EXECUTION_DISABLED_PHASE_21K")
      ? "Сейчас это только preflight: запуск отключен, ничего не выполняется."
      : "Запуск все равно останется отдельным явным шагом."
  ];
  return parts.join(" ");
}

export function buildExecutionPreflightViewModel(input = {}, options = {}) {
  const draft = createExecutionIntentDraft(input, options);
  const preflight = preflightExecutionIntentDraft(draft, options);
  const status = draft.status === executionIntentDraftStatuses.readyForFutureExecution
    ? executionIntentDraftStatuses.readyForFutureExecution
    : preflight.status === executionIntentDraftStatuses.preflightBlocked
    ? executionIntentDraftStatuses.preflightBlocked
    : draft.status;
  const stepBuckets = {
    localSteps: [],
    intelligenceSteps: [],
    providerSteps: [],
    blockedSteps: []
  };
  draft.dependencyOrder.forEach((capabilityId, index) => {
    const classified = [
      ...draft.localSteps,
      ...draft.intelligenceSteps,
      ...draft.providerSteps
    ].find((step) => step.capabilityId === capabilityId || step.userFacingLabel === capabilityId) || {
      capabilityId,
      label: capabilityId,
      classification: "UNKNOWN",
      userFacingRequirement: "Проверяется на preflight"
    };
    const item = {
      order: index + 1,
      capabilityId,
      label: preflightCapabilityLabels[capabilityId] || classified.label || classified.userFacingLabel || capabilityId,
      classification: classified.classification || "INTELLIGENCE_REQUIRED",
      description: classified.userFacingRequirement || classified.userFacingLabel || "Проверяется на preflight"
    };
    stepBuckets[stepGroup(classified)].push(item);
  });
  const requiredInputs = draft.inputSnapshot.filter((item) => item.required !== false);
  const optionalInputs = draft.inputSnapshot.filter((item) => item.required === false);
  const readiness = createReadinessSummary(draft, preflight);
  const audit = createExecutionIntentAuditArtifact(draft, preflight);

  return {
    viewType: "ExecutionPreflightUiViewModel",
    intentId: draft.intentId,
    traceId: draft.traceId,
    product: {
      productId: draft.productId,
      label: productIds ? Object.entries(productIds).find(([, id]) => id === draft.productId)?.[0] || draft.productId : draft.productId
    },
    primaryCapability: {
      capabilityId: draft.primaryCapabilityId,
      label: preflightCapabilityLabels[draft.primaryCapabilityId] || draft.primaryCapabilityId
    },
    userNeed: draft.userNeed,
    expectedOutcome: draft.desiredOutcome,
    status,
    statusLabel: preflightStatusLabelsRu[status] || status,
    statusSeverity: statusGroup(status),
    executionClass: draft.executionClass,
    executionClassLabel: executionClassLabelsRu[draft.executionClass] || draft.executionClass,
    readiness,
    requiredInputs: requiredInputs.map((item) => ({
      ...item,
      statusLabel: requirementLabel(item.readiness),
      whyNeeded: item.description || item.validationRule || "Нужно для будущего запуска.",
      acceptedFormatLabel: item.acceptedFormats?.length ? item.acceptedFormats.join(", ") : "Текст или структурированный ввод"
    })),
    optionalInputs: optionalInputs.map((item) => ({
      ...item,
      statusLabel: requirementLabel(item.readiness),
      whyNeeded: item.description || "Может улучшить результат.",
      acceptedFormatLabel: item.acceptedFormats?.length ? item.acceptedFormats.join(", ") : "По желанию"
    })),
    missingInputs: draft.missingInputs.map((item) => ({
      ...item,
      statusLabel: requirementLabel(item.readiness),
      whyNeeded: item.description || item.validationRule || "Нужно до запуска."
    })),
    localSteps: stepBuckets.localSteps,
    intelligenceSteps: stepBuckets.intelligenceSteps,
    providerSteps: stepBuckets.providerSteps,
    blockedSteps: stepBuckets.blockedSteps,
    capabilityDependencies: draft.dependencyOrder.map((capabilityId, index) => ({
      order: index + 1,
      capabilityId,
      label: preflightCapabilityLabels[capabilityId] || capabilityId
    })),
    availability: draft.availabilitySnapshot,
    activationRequirements: draft.activationRequirements.map((statusCode) => ({
      status: statusCode,
      label: activationLabel(statusCode)
    })),
    costPreview: {
      costClass: draft.costClass,
      label: costPreviewLabelsRu[draft.costClass] || draft.costClass,
      exactPriceKnown: false
    },
    approvals: draft.approvals.map((approval) => ({
      ...approval,
      type: approvalUiType(approval.type),
      reason: activationLabel(approval.type) || "Требуется перед будущим запуском.",
      status: "REQUIRES_APPROVAL",
      autoApproved: false
    })),
    blockers: preflight.blockers.map((code) => ({ code, severity: "BLOCKER", label: blockerLabel(code) })),
    warnings: preflight.warnings.map((code) => ({ code, severity: "WARNING", label: blockerLabel(code) })),
    expectedArtifacts: draft.expectedArtifacts.map((artifact) => ({ artifactType: artifact, label: artifact })),
    verificationPlan: draft.verificationPlan.map((item, index) => ({ order: index + 1, label: item })),
    rollbackPlan: {
      state: rollbackStateFor(draft, preflight),
      steps: draft.rollbackPlan.map((item, index) => ({ order: index + 1, label: item }))
    },
    sourceVersions: draft.sourceVersions,
    freshness: draft.freshnessStatus,
    auditSummary: {
      artifactType: "ExecutionPreflightUiAuditArtifact",
      route: options.route || null,
      intentId: draft.intentId,
      traceId: draft.traceId,
      capability: draft.primaryCapabilityId,
      status,
      readiness,
      contextEconomy: audit.contextEconomy,
      preflightDecision: preflight.gatewayResult.reason,
      executionFlags: {
        executionEnabled: false,
        toolExecutionEnabled: false,
        providerExecutionEnabled: false,
        paymentEnabled: false,
        publishEnabled: false,
        deployEnabled: false
      },
      providerCalls: 0,
      externalCalls: 0,
      mutationCount: 0,
      timestamp: audit.timestamp
    },
    lisaExplanation: createLisaPreflightExplanation(draft, preflight),
    actionLabel: "Подготовить к запуску",
    launchLabelVisible: false,
    sections: {
      userGoal: draft.userNeed,
      neededInputs: draft.inputSnapshot,
      readyItems: draft.inputSnapshot.filter((item) => item.readiness === inputReadinessStatuses.ready),
      missingItems: draft.missingInputs,
      essaWillUse: draft.dependencyOrder,
      externalServices: draft.providerActivation,
      payment: draft.costClass,
      confirmations: draft.approvals,
      expectedResult: draft.expectedArtifacts,
      verification: draft.verificationPlan,
      rollback: draft.rollbackPlan,
      blockers: preflight.blockers,
      nextSafeAction: preflight.nextSafeAction
    },
    draft,
    preflight,
    auditArtifact: {
      artifactType: "ExecutionPreflightUiAuditArtifact",
      route: options.route || null,
      intent: draft.intentId,
      capability: draft.primaryCapabilityId,
      status,
      readiness,
      inputs: draft.inputSnapshot,
      missingInputs: draft.missingInputs,
      steps: {
        local: stepBuckets.localSteps,
        intelligence: stepBuckets.intelligenceSteps,
        provider: stepBuckets.providerSteps,
        blocked: stepBuckets.blockedSteps
      },
      activation: draft.activationRequirements,
      cost: draft.costClass,
      approvals: draft.approvals,
      blockers: preflight.blockers,
      warnings: preflight.warnings,
      artifacts: draft.expectedArtifacts,
      verification: draft.verificationPlan,
      rollback: draft.rollbackPlan,
      freshness: draft.freshnessStatus,
      sourceVersions: draft.sourceVersions,
      contextEconomy: audit.contextEconomy,
      browserProof: null,
      executionFlags: phase21KHardGuards,
      providerCalls: 0,
      externalCalls: 0,
      mutationCount: 0,
      timestamp: audit.timestamp
    },
    ...phase21KHardGuards
  };
}
