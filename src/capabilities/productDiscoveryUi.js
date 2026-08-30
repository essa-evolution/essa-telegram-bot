import {
  buildNavigatorProductDiscoveryResponse
} from "../navigator/productKnowledgeBridge.js";
import {
  capabilityActivationStates
} from "./capabilityContracts.js";
import {
  createLisaProductGuideContext,
  evaluateContentFreshness
} from "./capabilityKnowledge.js";
import {
  getCapability,
} from "./capabilityRegistry.js";
import {
  getProductCapabilities,
  productIds
} from "./productCapabilityMap.js";
import {
  productEducationCards,
  productKnowledgeNodes
} from "./productKnowledge.js";
import { providerCapabilityMap } from "./providerCapabilityMap.js";

export const productDiscoveryUiContract = {
  executionEnabled: false,
  providerCalls: 0,
  externalCalls: 0,
  source: "CapabilityRegistry+ProductKnowledgeGraph+CapabilityAvailability+ProductDiscoveryResponse"
};

export const availabilityBadgeLabels = {
  [capabilityActivationStates.active]: "ДОСТУПНО",
  [capabilityActivationStates.localReady]: "РАБОТАЕТ ЛОКАЛЬНО",
  [capabilityActivationStates.providerReady]: "ГОТОВО К АКТИВАЦИИ",
  [capabilityActivationStates.readyForActivation]: "ГОТОВО К АКТИВАЦИИ",
  [capabilityActivationStates.readyForKey]: "НУЖЕН КЛЮЧ",
  [capabilityActivationStates.readyForPayment]: "НУЖНА ОПЛАТА ПРОВАЙДЕРА",
  [capabilityActivationStates.architectureOnly]: "В РАЗРАБОТКЕ",
  [capabilityActivationStates.degraded]: "ВРЕМЕННО НЕДОСТУПНО",
  [capabilityActivationStates.unavailable]: "ВРЕМЕННО НЕДОСТУПНО",
  [capabilityActivationStates.disabled]: "ВРЕМЕННО НЕДОСТУПНО",
  KNOWLEDGE_REFRESH_REQUIRED: "ОБНОВЛЕНИЕ ДАННЫХ ТРЕБУЕТСЯ"
};

export const costClassLabels = {
  FREE: "БЕСПЛАТНО / ЛОКАЛЬНО",
  LOCAL_COMPUTE: "БЕСПЛАТНО / ЛОКАЛЬНО",
  METERED: "МОЖЕТ ПОТРЕБОВАТЬ ВНЕШНИЙ СЕРВИС",
  PAID_EXTERNAL: "ТРЕБУЕТ ПЛАТНОГО ПРОВАЙДЕРА",
  UNKNOWN: "СТОИМОСТЬ БУДЕТ РАССЧИТАНА ПЕРЕД ЗАПУСКОМ"
};

export const productLabels = {
  [productIds.navigator]: "ESSA Navigator",
  [productIds.production]: "ESSA Production",
  [productIds.musicFactory]: "ESSA Music Factory",
  [productIds.publishing]: "ESSA Publishing",
  [productIds.books]: "ESSA Books",
  [productIds.mirror]: "ESSA Mirror",
  [productIds.business]: "ESSA Business",
  [productIds.advertising]: "ESSA Advertising",
  [productIds.creatorNetwork]: "ESSA Creator Network",
  [productIds.property]: "ESSA Property / Real Estate",
  [productIds.developer]: "ESSA Developer",
  [productIds.kidsLumi]: "ESSA Kids / Lumi",
  [productIds.voice]: "ESSA Voice",
  [productIds.research]: "ESSA Research",
  [productIds.workspace]: "ESSA Workspace"
};

const productPurposeFallback = {
  [productIds.navigator]: "Помогает понять, куда идти в ESSA, и подобрать подходящий продукт или возможность.",
  [productIds.production]: "Помогает превращать идеи и материалы в ролики, монтажные планы и production workflow.",
  [productIds.musicFactory]: "Помогает разбирать музыку, вокал и будущие музыкальные workflows с учетом прав и разрешений.",
  [productIds.publishing]: "Помогает авторам готовить книгу, обложку и publishing package как проверяемый путь.",
  [productIds.books]: "Помогает структурировать книгу, подготовить текст, обложку и будущие форматы.",
  [productIds.mirror]: "Помогает увидеть паттерны, состояние и ясный следующий шаг.",
  [productIds.business]: "Помогает разбирать бизнес, рост, аудит, продажу и маркетинговый план.",
  [productIds.advertising]: "Помогает готовить креативные брифы, кампании и рекламную логику.",
  [productIds.creatorNetwork]: "Помогает будущим брифам для создателей и подбору creator workflow.",
  [productIds.property]: "Помогает разбирать недвижимость, презентации, инвестиционные пакеты и концепции.",
  [productIds.developer]: "Помогает готовить сайты, приложения, код, архитектуру и проверку интерфейса.",
  [productIds.kidsLumi]: "Помогает будущим детским и образовательным материалам.",
  [productIds.voice]: "Помогает с аудио, голосом, транскрибацией и будущими voice workflows.",
  [productIds.research]: "Помогает искать, сравнивать и извлекать факты из источников.",
  [productIds.workspace]: "Помогает собирать рабочие проекты, документы, сайты и локальную проверку."
};

const categoryLabels = {
  text: "Text",
  image: "Image",
  video: "Video",
  audio_voice: "Audio/Voice",
  music: "Music",
  code_product: "Code / Website / App",
  browser_computer: "Code / Website / App",
  document_publishing: "Publishing",
  business: "Business",
  advertising_creator: "Advertising",
  real_estate_development: "Real Estate",
  mirror: "Education",
  kids_education: "Education",
  research: "Research",
  custom: "Other"
};

const capabilityTitleFallbacks = {
  IMAGE_GENERATE: "Создать изображение",
  IMAGE_EDIT: "Изменить изображение",
  WEBSITE_GENERATE: "Создать сайт",
  VIDEO_EDIT: "Сделать ролик",
  VIDEO_TRIM: "Обрезать видео",
  VOCAL_REPLACE: "Заменить вокал",
  VOICE_GENERATE: "Озвучить",
  VOICE_REPLACE: "Заменить голос",
  AUDIOBOOK_BUILD: "Озвучить книгу",
  BOOK_COVER: "Сделать обложку книги",
  BUSINESS_ANALYZE: "Разобрать бизнес"
};

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function normalize(value = "") {
  return String(value || "").toLowerCase().trim();
}

function getKnowledgeNode(capabilityId, productId = null) {
  return productKnowledgeNodes.find((node) =>
    node.capabilityId === capabilityId && (!productId || node.productId === productId)
  ) || productKnowledgeNodes.find((node) => node.capabilityId === capabilityId) || null;
}

function getEducationCard(capabilityId, productId = null) {
  return productEducationCards.find((card) =>
    card.capabilityId === capabilityId && (!productId || card.productId === productId)
  ) || productEducationCards.find((card) => card.capabilityId === capabilityId) || null;
}

function getAvailabilityLabel(state, freshnessStatus = "CURRENT") {
  if (freshnessStatus !== "CURRENT") return availabilityBadgeLabels.KNOWLEDGE_REFRESH_REQUIRED;
  return availabilityBadgeLabels[state] || availabilityBadgeLabels[capabilityActivationStates.unavailable];
}

function getActivationRequirement(state) {
  if (state === capabilityActivationStates.readyForKey) return "Нужен ключ провайдера перед запуском.";
  if (state === capabilityActivationStates.readyForPayment) return "Нужна платная активация провайдера перед запуском.";
  if (state === capabilityActivationStates.readyForActivation || state === capabilityActivationStates.providerReady) {
    return "Готово к подключению через будущий безопасный запуск.";
  }
  if (state === capabilityActivationStates.architectureOnly) return "Архитектура описана, выполнение еще не активно.";
  if ([capabilityActivationStates.unavailable, capabilityActivationStates.disabled].includes(state)) {
    return "Возможность временно недоступна.";
  }
  return "Дополнительная активация не требуется для объяснения.";
}

function getSourceVersion(capability, node, education) {
  return {
    capabilityVersion: capability?.version || null,
    productVersion: node?.version || education?.sourceVersion || "1.0.0",
    knowledgeVersion: node?.version || "1.0.0",
    educationVersion: education?.sourceVersion || null
  };
}

function getFreshnessStatus(capability, options = {}) {
  const sourceVersionOverride = options.sourceVersionOverrideByCapability?.[capability.capabilityId] ||
    options.sourceVersionOverride;
  const result = evaluateContentFreshness({
    contentArtifact: {
      capabilityId: capability.capabilityId,
      capabilityVersion: sourceVersionOverride || capability.version,
      availabilityState: options.availabilityStateOverrideByCapability?.[capability.capabilityId] ||
        options.availabilityStateOverride ||
        capability.activationState
    },
    currentCapability: capability
  });
  return result.freshnessStatus;
}

export function createCapabilityCardViewModel({
  capabilityId,
  productId,
  registry,
  availabilityOverride,
  sourceVersionOverride,
  sourceVersionOverrideByCapability,
  availabilityStateOverrideByCapability
} = {}) {
  const capability = getCapability(capabilityId, registry);
  if (!capability) return null;

  const node = getKnowledgeNode(capability.capabilityId, productId);
  const education = getEducationCard(capability.capabilityId, productId);
  const availabilityState = availabilityOverride ||
    availabilityStateOverrideByCapability?.[capability.capabilityId] ||
    node?.availabilityState ||
    capability.activationState;
  const effectiveCapability = { ...capability, activationState: availabilityState };
  const freshnessStatus = getFreshnessStatus(effectiveCapability, {
    sourceVersionOverride,
    sourceVersionOverrideByCapability,
    availabilityStateOverrideByCapability
  });
  const sourceVersion = getSourceVersion(capability, node, education);
  const title = node?.userNeed || capabilityTitleFallbacks[capability.capabilityId] || capability.description || capability.canonicalName;
  const categoryLabel = categoryLabels[capability.category] || "Other";

  return {
    capabilityId: capability.capabilityId,
    productId: productId || node?.productId || null,
    title,
    plainLanguageDescription: node?.plainLanguageDescription || capability.description,
    userOutcome: node?.userOutcome || education?.expectedOutcome || capability.outputTypes.join(", "),
    availabilityState,
    availabilityLabel: getAvailabilityLabel(availabilityState, freshnessStatus),
    activationRequirement: getActivationRequirement(availabilityState),
    exampleRequests: node?.exampleRequests?.length
      ? [...node.exampleRequests]
      : education?.examplePrompt
      ? [education.examplePrompt]
      : [`Расскажи подробнее про ${title}.`],
    relatedCapabilities: unique([...(node?.relatedCapabilities || []), ...capability.requiredSubCapabilities]),
    limitations: unique([
      ...(node?.limitations || []),
      ...(education?.limitations || []),
      ...(availabilityState === capabilityActivationStates.architectureOnly ? ["Пока это объяснение и подготовка, не запуск workflow."] : [])
    ]),
    freshnessStatus,
    educationEligible: capability.educationEligible && (node?.educationEligible ?? true),
    contentEligible: capability.contentEligible && (node?.contentEligible ?? true),
    sourceVersion,
    category: categoryLabel,
    costClass: capability.costClass,
    costLabel: costClassLabels[capability.costClass] || costClassLabels.UNKNOWN,
    uiActions: [
      { action: "learn_more", label: "УЗНАТЬ ПОДРОБНЕЕ", executionEnabled: false },
      { action: "show_example", label: "ПОКАЗАТЬ ПРИМЕР", executionEnabled: false },
      { action: "education", label: "ОБУЧЕНИЕ", executionEnabled: false },
      { action: "prepare_preflight", label: "ПОДГОТОВИТЬ К ЗАПУСКУ", executionEnabled: false },
      { action: "try_future", label: "ПОПРОБОВАТЬ", executionEnabled: false }
    ],
    debug: {
      supportedProviders: [...capability.supportedProviders],
      providerIndependentLabel: title,
      executionPerformed: false,
      providerCalls: 0
    }
  };
}

export function createProductAvailabilitySummary(productId, options = {}) {
  const cards = getProductCapabilities(productId)
    .map((capabilityId) => createCapabilityCardViewModel({ capabilityId, productId, ...options }))
    .filter(Boolean);
  const count = (state) => cards.filter((card) => card.availabilityState === state).length;

  return {
    productId,
    totalCapabilities: cards.length,
    activeCount: count(capabilityActivationStates.active),
    localReadyCount: count(capabilityActivationStates.localReady),
    readyForActivationCount: count(capabilityActivationStates.providerReady) +
      count(capabilityActivationStates.readyForActivation) +
      count(capabilityActivationStates.readyForKey),
    paymentRequiredCount: count(capabilityActivationStates.readyForPayment),
    architectureOnlyCount: count(capabilityActivationStates.architectureOnly),
    unavailableCount: count(capabilityActivationStates.unavailable) + count(capabilityActivationStates.disabled),
    staleCount: cards.filter((card) => card.freshnessStatus !== "CURRENT").length
  };
}

function summarizeAvailability(summary) {
  const parts = [];
  if (summary.activeCount) parts.push(`${summary.activeCount} доступно`);
  if (summary.localReadyCount) parts.push(`${summary.localReadyCount} локально`);
  if (summary.readyForActivationCount) parts.push(`${summary.readyForActivationCount} к активации`);
  if (summary.paymentRequiredCount) parts.push(`${summary.paymentRequiredCount} нужна оплата`);
  if (summary.architectureOnlyCount) parts.push(`${summary.architectureOnlyCount} в разработке`);
  if (summary.unavailableCount) parts.push(`${summary.unavailableCount} недоступно`);
  if (summary.staleCount) parts.push(`${summary.staleCount} требует обновления`);
  return parts.join(" · ") || "Нет зарегистрированных возможностей";
}

export function createProductCardViewModel(productId, options = {}) {
  const capabilityIds = getProductCapabilities(productId);
  const cards = capabilityIds
    .slice(0, options.maxRepresentativeCapabilities || 4)
    .map((capabilityId) => createCapabilityCardViewModel({ capabilityId, productId, ...options }))
    .filter(Boolean);
  const summary = createProductAvailabilitySummary(productId, options);
  const knowledgeNode = productKnowledgeNodes.find((node) => node.productId === productId);

  return {
    productId,
    name: productLabels[productId] || productId,
    purpose: knowledgeNode?.plainLanguageDescription || productPurposeFallback[productId] || "Зарегистрированный продукт ESSA.",
    availabilitySummary: summary,
    availabilityLabel: summarizeAvailability(summary),
    representativeCapabilities: cards,
    whatCanDo: cards.map((card) => card.userOutcome).slice(0, 3),
    exampleUserRequest: cards.flatMap((card) => card.exampleRequests).find(Boolean) || "Что можно сделать здесь?",
    futureDetailsEnabled: true,
    uiActions: [
      { action: "details", label: "Подробнее", executionEnabled: false },
      { action: "education", label: "Обучение", executionEnabled: false }
    ],
    sourceVersion: {
      productVersion: knowledgeNode?.version || "1.0.0",
      knowledgeVersion: knowledgeNode?.version || "1.0.0"
    }
  };
}

export function buildProductOverviewViewModel(options = {}) {
  const response = buildNavigatorProductDiscoveryResponse({
    query: "Что умеет ESSA?",
    maxResults: options.maxProducts || 8,
    contextBudget: options.contextBudget || { maxItems: 8, maxChars: 1800 }
  });
  const productOrder = response.matchedProducts.map((product) => product.productId);

  return {
    ...productDiscoveryUiContract,
    viewType: "product_overview",
    response,
    products: productOrder.map((productId) => createProductCardViewModel(productId, options)).filter(Boolean),
    boundedContextMetadata: response.boundedContextMetadata,
    debug: {
      totalCapabilityCount: response.boundedContextMetadata?.totalCapabilityCount || 0,
      renderedProductCount: productOrder.length,
      executionPerformed: response.executionPerformed,
      providerCalls: response.providerCalls
    }
  };
}

export function buildProductDetailViewModel(productId, options = {}) {
  const capabilities = getProductCapabilities(productId)
    .map((capabilityId) => createCapabilityCardViewModel({ capabilityId, productId, ...options }))
    .filter(Boolean);

  return {
    ...productDiscoveryUiContract,
    viewType: "product_detail",
    product: createProductCardViewModel(productId, options),
    capabilities,
    availabilitySummary: createProductAvailabilitySummary(productId, options),
    availableNow: capabilities.filter((card) =>
      [capabilityActivationStates.active, capabilityActivationStates.localReady].includes(card.availabilityState)
    ),
    needsActivation: capabilities.filter((card) =>
      [
        capabilityActivationStates.providerReady,
        capabilityActivationStates.readyForActivation,
        capabilityActivationStates.readyForKey,
        capabilityActivationStates.readyForPayment
      ].includes(card.availabilityState)
    ),
    planned: capabilities.filter((card) => card.availabilityState === capabilityActivationStates.architectureOnly),
    exampleUserJourneys: unique(capabilities.flatMap((card) => card.exampleRequests)).slice(0, 5),
    relatedProducts: unique(capabilities.flatMap((card) =>
      productKnowledgeNodes
        .filter((node) => card.relatedCapabilities.includes(node.capabilityId))
        .map((node) => node.productId)
    )).filter((id) => id !== productId)
  };
}

export function buildCapabilityDetailViewModel(capabilityId, productId = null, options = {}) {
  const card = createCapabilityCardViewModel({ capabilityId, productId, ...options });
  if (!card) return null;
  const educationCard = getEducationCard(capabilityId, productId);

  return {
    ...productDiscoveryUiContract,
    viewType: "capability_detail",
    card,
    explanation: {
      whatItIs: card.plainLanguageDescription,
      forWhom: educationCard?.audience || "general_user",
      whatCanDo: card.userOutcome,
      howItWorks: educationCard?.howItWorksPlainLanguage || "ESSA сначала сопоставляет запрос с возможностью, затем показывает безопасный путь.",
      example: card.exampleRequests[0] || educationCard?.examplePrompt || "",
      expectedOutcome: educationCard?.expectedOutcome || card.userOutcome,
      unavailableNow: card.availabilityState === capabilityActivationStates.architectureOnly ||
        card.freshnessStatus !== "CURRENT"
    }
  };
}

export function buildProductEducationViewModel(capabilityId = "BOOK_COVER", options = {}) {
  const detail = buildCapabilityDetailViewModel(capabilityId, options.productId, options);
  const education = getEducationCard(capabilityId, options.productId);
  const lisaGuide = createLisaProductGuideContext();

  return {
    ...productDiscoveryUiContract,
    viewType: "lisa_product_education",
    lisaGuideRole: lisaGuide.role?.roleId || "LISA_ESSA_PRODUCT_GUIDE",
    lisaCanMutateProductKnowledge: false,
    capabilityId,
    productId: detail?.card?.productId || education?.productId || null,
    title: detail?.card?.title || education?.problem || capabilityId,
    problem: education?.problem || detail?.explanation?.whatItIs || "",
    whatUserCanDo: education?.whatUserCanDo || detail?.card?.userOutcome || "",
    plainLanguageSteps: education?.stepSequence || [],
    examplePrompt: education?.examplePrompt || detail?.card?.exampleRequests?.[0] || "",
    expectedOutcome: education?.expectedOutcome || detail?.card?.userOutcome || "",
    availability: detail?.card?.availabilityLabel || availabilityBadgeLabels[capabilityActivationStates.unavailable],
    unavailableNow: detail?.explanation?.unavailableNow ?? true,
    contentAngles: education?.contentAngles || [],
    supportedFormats: education?.supportedFormats || [],
    growthChannels: ["Reels", "TikTok", "YouTube Shorts", "YouTube", "Telegram", "ESSA in-app", "website", "email/newsletter"],
    sourceVersion: detail?.card?.sourceVersion || null
  };
}

export function buildProductDiscoverySearchViewModel(query = "", options = {}) {
  const response = buildNavigatorProductDiscoveryResponse({
    query,
    maxResults: options.maxResults || 5,
    contextBudget: options.contextBudget || { maxItems: 5, maxChars: 1600 }
  }, options.bridgeOptions || {});
  const productIdsFromResponse = response.matchedProducts.map((product) => product.productId).filter(Boolean);
  const cards = response.matchedCapabilities
    .map((capability) => createCapabilityCardViewModel({
      capabilityId: capability.capabilityId,
      productId: productIdsFromResponse[0] || null,
      ...options
    }))
    .filter(Boolean);

  return {
    ...productDiscoveryUiContract,
    viewType: "search_results",
    query,
    response,
    matchedProducts: productIdsFromResponse.map((productId) => createProductCardViewModel(productId, options)).filter(Boolean),
    capabilityCards: cards,
    boundedContextMetadata: response.boundedContextMetadata,
    debug: {
      matchedSynonym: response.resolvedNeed?.primaryCapabilityId || response.matchedCapabilities[0]?.capabilityId || null,
      boundedResultCount: cards.length,
      executionPerformed: response.executionPerformed,
      providerCalls: response.providerCalls,
      sourceVersions: response.sourceVersions,
      freshnessStatus: response.freshnessStatus
    }
  };
}

export function filterCapabilityCards(cards = [], filters = {}) {
  const product = normalize(filters.productId);
  const availability = normalize(filters.availabilityState);
  const category = normalize(filters.category);
  const need = normalize(filters.userNeed);

  return cards.filter((card) => {
    if (product && normalize(card.productId) !== product) return false;
    if (availability && normalize(card.availabilityState) !== availability) return false;
    if (category && normalize(card.category) !== category) return false;
    if (need) {
      const haystack = normalize([
        card.title,
        card.plainLanguageDescription,
        card.userOutcome,
        ...card.exampleRequests
      ].join(" "));
      if (!haystack.includes(need)) return false;
    }
    return true;
  });
}

export function createProviderReplacementUiProbe(capabilityId = "IMAGE_GENERATE", options = {}) {
  const before = createCapabilityCardViewModel({ capabilityId, ...options });
  const providerMap = {
    ...providerCapabilityMap,
    provider_replacement_fixture: {
      providerId: "provider_replacement_fixture",
      capabilities: [capabilityId],
      availability: "DECLARED_NOT_VERIFIED"
    }
  };
  const after = createCapabilityCardViewModel({ capabilityId, ...options });

  return {
    capabilityId,
    beforeLabel: before?.title || capabilityId,
    afterLabel: after?.title || capabilityId,
    providerChangedInternally: Boolean(providerMap.provider_replacement_fixture),
    userFacingLabelStable: (before?.title || capabilityId) === (after?.title || capabilityId),
    providerCalls: 0,
    executionPerformed: false
  };
}

export function buildProductDiscoveryUiState(options = {}) {
  const overview = buildProductOverviewViewModel(options);
  const education = buildProductEducationViewModel("BOOK_COVER", {
    ...options,
    productId: productIds.publishing
  });
  return {
    ...productDiscoveryUiContract,
    overview,
    education,
    defaultQuery: "Что умеет ESSA?",
    exampleQueries: [
      "Мне нужна обложка",
      "Хочу сайт",
      "Нужно озвучить книгу",
      "Хочу перепеть песню своим голосом",
      "Хочу сделать ролик",
      "Что есть для бизнеса?"
    ],
    debugModeAvailable: true
  };
}
