import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import {
  capabilityActivationStates,
} from "../capabilities/capabilityContracts.js";
import {
  createAdvertisingTruthCheck
} from "../capabilities/capabilityPolicy.js";
import {
  createCapabilityCompositionPlan,
} from "../capabilities/capabilityComposition.js";
import {
  createLisaProductGuideContext,
  evaluateContentFreshness,
} from "../capabilities/capabilityKnowledge.js";
import {
  getCapability,
} from "../capabilities/capabilityRegistry.js";
import {
  getProductCapabilities,
  productIds,
} from "../capabilities/productCapabilityMap.js";
import {
  productKnowledgeNodes,
} from "../capabilities/productKnowledge.js";
import {
  providerCapabilityMap,
} from "../capabilities/providerCapabilityMap.js";
import {
  resolveUserNeedToCapability,
  searchCapabilities
} from "../capabilities/capabilityResolver.js";

function createId(prefix = "product_discovery") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(value = "") {
  return String(value || "").toLowerCase().trim();
}

export const productDiscoveryIntentTypes = {
  generalCapabilityDiscovery: "GENERAL_CAPABILITY_DISCOVERY",
  productDiscovery: "PRODUCT_DISCOVERY",
  capabilityDiscovery: "CAPABILITY_DISCOVERY",
  userNeedDiscovery: "USER_NEED_DISCOVERY",
  availabilityDiscovery: "AVAILABILITY_DISCOVERY",
  howToDiscovery: "HOW_TO_DISCOVERY",
  productEducation: "PRODUCT_EDUCATION",
  futureCapabilityDiscovery: "FUTURE_CAPABILITY_DISCOVERY"
};

export const productDiscoveryIntentContract = {
  intentId: null,
  intentType: productDiscoveryIntentTypes.userNeedDiscovery,
  query: "",
  normalizedNeed: "",
  requestedProduct: null,
  requestedCapability: null,
  requestedOutcome: null,
  availabilityQuestion: false,
  comparisonQuestion: false,
  educationQuestion: false,
  executionIntent: false,
  language: "ru",
  maxResults: 5,
  contextBudget: { maxItems: 5, maxChars: 1600 },
  createdAt: null
};

export const productDiscoveryResponseContract = {
  query: "",
  resolvedNeed: null,
  matchedProducts: [],
  matchedCapabilities: [],
  availabilitySummary: [],
  plainLanguageSummary: [],
  exampleRequests: [],
  limitations: [],
  activationRequirements: [],
  relatedCapabilities: [],
  suggestedNextActions: [],
  sourceVersions: [],
  freshnessStatus: "CURRENT",
  boundedContextMetadata: null,
  uiMetadata: null,
  audit: null,
  executionPerformed: false,
  providerCalls: 0
};

export const productDiscoveryAuditContract = {
  query: "",
  intentClassification: null,
  matchedProducts: [],
  matchedCapabilities: [],
  availability: [],
  knowledgeSources: [],
  sourceVersions: [],
  excludedResults: [],
  contextBudget: null,
  freshness: null,
  executionRequested: false,
  executionPerformed: false,
  providerCalls: 0,
  timestamp: null
};

export const availabilityLanguage = {
  ACTIVE: {
    costClass: "UNKNOWN_COST",
    ru: "available_now",
    maySayAvailableNow: true
  },
  LOCAL_READY: {
    costClass: "LOCAL_COMPUTE",
    ru: "local_ready",
    maySayAvailableNow: true
  },
  PROVIDER_READY: {
    costClass: "EXTERNAL_FREE_OR_QUOTA",
    ru: "provider_ready",
    maySayAvailableNow: true
  },
  READY_FOR_KEY: {
    costClass: "PAID_PROVIDER_REQUIRED",
    ru: "needs_provider_key",
    maySayAvailableNow: false
  },
  READY_FOR_PAYMENT: {
    costClass: "PAID_PROVIDER_REQUIRED",
    ru: "needs_paid_provider_activation",
    maySayAvailableNow: false
  },
  ARCHITECTURE_ONLY: {
    costClass: "UNKNOWN_COST",
    ru: "planned_or_architecture_only",
    maySayAvailableNow: false
  },
  DEGRADED: {
    costClass: "UNKNOWN_COST",
    ru: "partially_available",
    maySayAvailableNow: false
  },
  UNAVAILABLE: {
    costClass: "UNKNOWN_COST",
    ru: "unavailable",
    maySayAvailableNow: false
  },
  DISABLED: {
    costClass: "UNKNOWN_COST",
    ru: "disabled",
    maySayAvailableNow: false
  }
};

const productOverview = [
  { productId: productIds.production, label: "ESSA Production", examples: ["ролик", "монтаж", "Reels"] },
  { productId: productIds.musicFactory, label: "ESSA Music Factory", examples: ["музыка", "вокал", "микс"] },
  { productId: productIds.publishing, label: "ESSA Publishing / Books", examples: ["книга", "обложка", "публикация"] },
  { productId: productIds.business, label: "ESSA Business", examples: ["анализ бизнеса", "рост", "маркетинг"] },
  { productId: productIds.advertising, label: "ESSA Advertising", examples: ["креатив", "кампания"] },
  { productId: productIds.creatorNetwork, label: "ESSA Creator Network", examples: ["бриф", "creator match"] },
  { productId: productIds.property, label: "ESSA Property", examples: ["недвижимость", "презентация"] },
  { productId: productIds.developer, label: "ESSA Developer", examples: ["сайт", "приложение", "код"] },
  { productId: productIds.mirror, label: "ESSA Mirror", examples: ["рефлексия", "паттерны"] },
  { productId: productIds.kidsLumi, label: "ESSA Kids / Lumi", examples: ["урок", "история"] },
  { productId: productIds.voice, label: "ESSA Voice", examples: ["голос", "аудио"] },
  { productId: productIds.research, label: "ESSA Research", examples: ["документы", "источники"] },
  { productId: productIds.workspace, label: "ESSA Workspace", examples: ["проект", "помощь", "workflow"] }
];

const synonyms = [
  { terms: ["обложка", "обложка книги", "cover", "book cover"], capabilityId: "BOOK_COVER", productId: productIds.publishing },
  { terms: ["книга", "для книги", "автор"], capabilityId: "BOOK_STRUCTURE", productId: productIds.publishing },
  { terms: ["сайт", "сайт для бизнеса", "website", "лендинг", "landing"], capabilityId: "WEBSITE_GENERATE", productId: productIds.developer },
  { terms: ["ролик", "reels", "shorts", "видео"], capabilityId: "VIDEO_EDIT", productId: productIds.production },
  { terms: ["обрезать видео", "обрежь видео", "trim"], capabilityId: "VIDEO_TRIM", productId: productIds.production },
  { terms: ["перепеть моим голосом", "перепеть песню своим голосом", "заменить вокал", "мой голос в песне", "вокал своим голосом"], capabilityId: "VOCAL_REPLACE", productId: productIds.musicFactory },
  { terms: ["бизнес", "business"], capabilityId: "BUSINESS_ANALYZE", productId: productIds.business },
  { terms: ["аудиокнига", "озвучить книгу"], capabilityId: "AUDIOBOOK_BUILD", productId: productIds.publishing },
  { terms: ["заменить голос", "voice replace"], capabilityId: "VOICE_REPLACE", productId: productIds.voice },
  { terms: ["property", "real estate", "недвижимость", "квартира", "квартиру", "апартаменты", "батум", "batumi", "property passport", "паспорт недвижимости"], capabilityId: "PROPERTY_ANALYZE", productId: productIds.property }
];

function detectProductDiscovery(userText = "") {
  const text = normalize(userText);
  return [
    "что умеет",
    "что ты умеешь",
    "что у вас есть",
    "что у тебя есть",
    "можно ли",
    "что уже работает",
    "пока ещё не подключено",
    "пока еще не подключено",
    "после подключения",
    "как пользоваться",
    "что essa может",
    "мне нужен сайт",
    "сделай мне сайт",
    "я хочу сделать ролик",
    "хочу сделать ролик",
    "мне нужна обложка",
    "заменить голос",
    "заменить вокал",
    "аудиокниг",
    "обработать видео",
    "property",
    "real estate",
    "недвижимость",
    "квартира",
    "батум",
    "property passport",
    "паспорт недвижимости"
  ].some((marker) => text.includes(marker));
}

function classifyIntent(query = "") {
  const text = normalize(query);
  const broad = ["что умеет essa", "что ты умеешь", "что умеет", "что у тебя есть"].some((marker) => text.includes(marker));
  const availability = ["можно ли", "сейчас", "уже работает", "не подключено", "после подключения"].some((marker) => text.includes(marker));
  const education = ["как пользоваться", "как сделать", "научи"].some((marker) => text.includes(marker));
  const execution = /(^|\s)(сделай|создай|построй|подготовь)(\s|$)/i.test(query) && !broad;

  if (broad && !text.includes("для ")) return productDiscoveryIntentTypes.generalCapabilityDiscovery;
  if (availability) return productDiscoveryIntentTypes.availabilityDiscovery;
  if (education) return productDiscoveryIntentTypes.productEducation;
  if (text.includes("после подключения")) return productDiscoveryIntentTypes.futureCapabilityDiscovery;
  if (text.includes("для ") || text.includes("есть для")) return productDiscoveryIntentTypes.productDiscovery;
  if (execution) return productDiscoveryIntentTypes.userNeedDiscovery;
  return productDiscoveryIntentTypes.capabilityDiscovery;
}

function resolveSynonym(query = "") {
  const text = normalize(query);
  return synonyms.find((entry) => entry.terms.some((term) => text.includes(term))) || null;
}

export function createProductDiscoveryIntent(input = {}) {
  const query = String(input.query || input.userText || "");
  const synonym = resolveSynonym(query);
  const intentType = input.intentType || classifyIntent(query);

  return {
    ...productDiscoveryIntentContract,
    ...input,
    intentId: input.intentId || createId(),
    intentType,
    query,
    normalizedNeed: input.normalizedNeed || normalize(query),
    requestedProduct: input.requestedProduct || synonym?.productId || null,
    requestedCapability: input.requestedCapability || synonym?.capabilityId || null,
    requestedOutcome: input.requestedOutcome || null,
    availabilityQuestion: input.availabilityQuestion ?? intentType === productDiscoveryIntentTypes.availabilityDiscovery,
    comparisonQuestion: input.comparisonQuestion ?? normalize(query).includes("или"),
    educationQuestion: input.educationQuestion ?? intentType === productDiscoveryIntentTypes.productEducation,
    executionIntent: input.executionIntent ?? /(^|\s)(сделай|создай|построй|подготовь)(\s|$)/i.test(query),
    language: input.language || "ru",
    maxResults: input.maxResults || 5,
    contextBudget: {
      ...(productDiscoveryIntentContract.contextBudget),
      ...(input.contextBudget || {})
    },
    createdAt: input.createdAt || new Date().toISOString()
  };
}

function nodeForCapability(capabilityId) {
  return productKnowledgeNodes.find((node) => node.capabilityId === capabilityId) || null;
}

function buildProductOverviewResponse(intent) {
  const selected = productOverview.slice(0, intent.maxResults || 8);
  return {
    matchedProducts: selected.map((product) => ({
      productId: product.productId,
      label: product.label,
      examples: [...product.examples]
    })),
    matchedCapabilities: [],
    plainLanguageSummary: selected.map((product) => `${product.label}: ${product.examples.join(", ")}`),
    relatedCapabilities: [],
    exampleRequests: selected.flatMap((product) => product.examples.slice(0, 1)),
    limitations: ["Broad product overview only; ask about a product to drill down."],
    selectedKnowledgeItems: selected.map((product) => ({
      id: product.productId,
      text: JSON.stringify(product),
      relevance: 1,
      source: "ProductOverview"
    })),
    excludedCount: Math.max(0, productOverview.length - selected.length)
  };
}

function buildSpecificDiscovery(intent, options = {}) {
  const synonym = resolveSynonym(intent.query);
  const resolved = resolveUserNeedToCapability({
    userNeed: intent.query,
    productContext: { productId: intent.requestedProduct || synonym?.productId || null }
  });
  const primaryCapabilityId = intent.requestedCapability || synonym?.capabilityId || resolved.primaryCapabilityId;
  const productId = intent.requestedProduct || synonym?.productId || resolved.productId;
  const productCapabilities = getProductCapabilities(productId);
  const capabilityIds = [
    primaryCapabilityId,
    ...productCapabilities.filter((id) => id !== primaryCapabilityId)
  ].slice(0, intent.maxResults || 5);
  const capabilities = capabilityIds.map((id) => getCapability(id, options.registry)).filter(Boolean);
  const nodes = capabilities.map((capability) => nodeForCapability(capability.capabilityId)).filter(Boolean);
  const compositionPlan = createCapabilityCompositionPlan({
    goal: intent.query,
    primaryCapabilityId,
    registry: options.registry
  });

  return {
    resolved,
    compositionPlan,
    matchedProducts: [{
      productId,
      capabilityCount: productCapabilities.length
    }],
    matchedCapabilities: capabilities.map((capability) => ({
      capabilityId: capability.capabilityId,
      category: capability.category,
      version: capability.version,
      availabilityState: capability.activationState,
      costClass: capability.costClass,
      riskClass: capability.riskClass
    })),
    plainLanguageSummary: nodes.length
      ? nodes.map((node) => node.plainLanguageDescription)
      : capabilities.map((capability) => capability.description),
    relatedCapabilities: [...new Set([
      ...compositionPlan.requiredCapabilities,
      ...compositionPlan.optionalCapabilities
    ])],
    exampleRequests: nodes.flatMap((node) => node.exampleRequests),
    limitations: nodes.flatMap((node) => node.limitations),
    selectedKnowledgeItems: [
      ...nodes.map((node) => ({
        id: node.nodeId,
        text: JSON.stringify(node),
        relevance: 1,
        source: "ProductKnowledge"
      })),
      ...capabilities.map((capability) => ({
        id: capability.capabilityId,
        text: JSON.stringify({
          capabilityId: capability.capabilityId,
          description: capability.description,
          availabilityState: capability.activationState,
          version: capability.version
        }),
        relevance: 0.8,
        source: "CapabilityRegistry"
      }))
    ],
    excludedCount: Math.max(0, productCapabilities.length - capabilityIds.length)
  };
}

function summarizeAvailability(capabilities = []) {
  return capabilities.map((capability) => {
    const state = capability.availabilityState || capability.activationState || capabilityActivationStates.unavailable;
    const language = availabilityLanguage[state] || availabilityLanguage.UNAVAILABLE;
    return {
      capabilityId: capability.capabilityId,
      availabilityState: state,
      languageKey: language.ru,
      maySayAvailableNow: language.maySayAvailableNow,
      costClass: language.costClass,
      truthCheck: createAdvertisingTruthCheck(getCapability(capability.capabilityId) || capability)
    };
  });
}

function buildBoundedContext(intent, selectedKnowledgeItems = [], excludedCount = 0) {
  const context = buildContextPackage({
    intent: "navigator_product_discovery",
    maxItems: intent.contextBudget.maxItems,
    maxChars: intent.contextBudget.maxChars,
    memoryItems: selectedKnowledgeItems
  });
  return {
    context,
    metadata: {
      totalCapabilityCount: searchCapabilities({ query: "", maxResults: 200 }).length || 100,
      candidateCount: selectedKnowledgeItems.length + excludedCount,
      selectedCount: context.selected.length,
      excludedCount,
      contextChars: context.budget.usedChars,
      estimatedTokens: Math.ceil(context.budget.usedChars / 4),
      budgetStatus: context.budget.usedChars <= context.budget.maxChars ? "WITHIN_BUDGET" : "OVER_BUDGET"
    }
  };
}

function freshnessForResponse(items = [], options = {}) {
  if (options.forceStale === true) return "KNOWLEDGE_REFRESH_REQUIRED";
  const stale = items.find((item) => {
    if (item.source !== "CapabilityRegistry") return false;
    try {
      const parsed = JSON.parse(item.text);
      const result = evaluateContentFreshness({
        contentArtifact: {
          capabilityId: parsed.capabilityId,
          capabilityVersion: options.sourceVersionOverride || parsed.version,
          availabilityState: options.availabilityStateOverride || parsed.availabilityState
        },
        currentCapability: getCapability(parsed.capabilityId, options.registry)
      });
      return result.freshnessStatus !== "CURRENT";
    } catch {
      return false;
    }
  });
  return stale ? "KNOWLEDGE_REFRESH_REQUIRED" : "CURRENT";
}

export function createNavigatorProductKnowledgeBridge(options = {}) {
  return {
    classify: createProductDiscoveryIntent,
    canHandle: detectProductDiscovery,
    discover(input = {}) {
      const intent = createProductDiscoveryIntent(input);
      const broad = intent.intentType === productDiscoveryIntentTypes.generalCapabilityDiscovery;
      const discovery = broad
        ? buildProductOverviewResponse(intent)
        : buildSpecificDiscovery(intent, options);
      const bounded = buildBoundedContext(intent, discovery.selectedKnowledgeItems, discovery.excludedCount);
      const freshnessStatus = freshnessForResponse(discovery.selectedKnowledgeItems, options);
      const matchedCapabilities = discovery.matchedCapabilities || [];
      const availabilitySummary = summarizeAvailability(matchedCapabilities);
      const sourceVersions = matchedCapabilities.map((capability) => ({
        capabilityId: capability.capabilityId,
        capabilityVersion: capability.version,
        productVersion: "1.0.0",
        knowledgeVersion: "1.0.0",
        availabilityState: capability.availabilityState
      }));
      const activationRequirements = availabilitySummary
        .filter((item) => item.maySayAvailableNow === false)
        .map((item) => ({
          capabilityId: item.capabilityId,
          availabilityState: item.availabilityState,
          requirement: item.availabilityState === capabilityActivationStates.readyForPayment
            ? "provider_payment_activation_required"
            : "activation_or_provider_readiness_required"
        }));
      const audit = {
        ...productDiscoveryAuditContract,
        query: intent.query,
        intentClassification: intent.intentType,
        matchedProducts: discovery.matchedProducts || [],
        matchedCapabilities,
        availability: availabilitySummary,
        knowledgeSources: bounded.context.selected.map((item) => item.source),
        sourceVersions,
        excludedResults: { count: bounded.metadata.excludedCount },
        contextBudget: bounded.metadata,
        freshness: freshnessStatus,
        executionRequested: intent.executionIntent,
        executionPerformed: false,
        providerCalls: 0,
        timestamp: new Date().toISOString()
      };

      return {
        ...productDiscoveryResponseContract,
        query: intent.query,
        resolvedNeed: discovery.resolved || {
          userNeed: intent.query,
          productOverview: broad
        },
        matchedProducts: discovery.matchedProducts || [],
        matchedCapabilities,
        availabilitySummary,
        plainLanguageSummary: discovery.plainLanguageSummary || [],
        exampleRequests: [...new Set(discovery.exampleRequests || [])],
        limitations: [...new Set(discovery.limitations || [])],
        activationRequirements,
        relatedCapabilities: [...new Set(discovery.relatedCapabilities || [])],
        suggestedNextActions: broad
          ? ["choose_product", "ask_about_capability", "drill_down"]
          : ["learn_more", "prepare_future_execution_request", "check_availability"],
        sourceVersions,
        freshnessStatus,
        boundedContextMetadata: bounded.metadata,
        boundedContext: bounded.context,
        uiMetadata: {
          cardType: broad ? "product_overview" : "capability_discovery",
          badges: availabilitySummary.map((item) => ({
            capabilityId: item.capabilityId,
            availabilityState: item.availabilityState
          })),
          actions: ["learn_more", "try_future", "ask_details"]
        },
        audit,
        compositionPlan: discovery.compositionPlan || null,
        executionPerformed: false,
        providerCalls: 0
      };
    },
    lisaProductGuideContext() {
      return createLisaProductGuideContext();
    },
    providerReplacementProbe(capabilityId = "IMAGE_GENERATE") {
      return {
        capabilityId,
        productVocabularyStable: true,
        before: { providerId: "PROVIDER_A", capabilityId },
        after: { providerId: "PROVIDER_B", capabilityId },
        currentKnownProviders: Object.keys(providerCapabilityMap)
      };
    }
  };
}

export const navigatorProductKnowledgeBridge = createNavigatorProductKnowledgeBridge();

export function buildNavigatorProductDiscoveryResponse(input = {}, options = {}) {
  return createNavigatorProductKnowledgeBridge(options).discover(input);
}

export function isProductDiscoveryQuery(userText = "") {
  return detectProductDiscovery(userText);
}
