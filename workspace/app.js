import {
  findProject as getProjectById,
  getEmptyProjectAssets,
  loadProjects,
  normalizeProject,
  normalizeProjectWorkflowState,
  projectAssetCategories,
  saveProjects,
  updateProject as updateProjectInStorage
} from "./modules/projectStorage.js";
import {
  openProjectWorkspace
} from "./modules/projectWorkspace.js";
import {
  renderNextStepsTab,
  renderWorkflowTab
} from "./modules/workflowUi.js";
import {
  copyAsset,
  openAsset,
  renderAssetsTab
} from "./modules/assetsUi.js";
import {
  copyBlueprint,
  downloadTxt,
  prepareEditingPackage,
  preparePublishingPackage,
  renderExportTab
} from "./modules/exportUi.js";
import {
  renderBlueprintActions
} from "./modules/blueprintActions.js";
import {
  renderExecutionTab
} from "./modules/executionUi.js";
import {
  initSafeLocalExecutionWorkspace
} from "./modules/safeLocalExecutionWorkspaceUi.js";
import {
  initAutonomousWorkflowWorkspace
} from "./modules/autonomousWorkflowUi.js";
import {
  renderPropertyPassportUi
} from "./modules/propertyPassportUi.js";
import {
  renderPropertyIngestionReviewUi
} from "./modules/propertyIngestionReviewUi.js";
import {
  renderPropertyReviewQueueUi
} from "./modules/propertyReviewQueueUi.js";
import {
  renderPropertyExecutionHistoryUi,
  renderPropertyExecutionProofUi
} from "./modules/propertyExecutionProofUi.js";
import {
  renderAddPropertyUi
} from "./modules/addPropertyUi.js";
import {
  renderPropertyMandateUi
} from "./modules/propertyMandateUi.js";
import {
  renderPropertyMandateReviewUi
} from "./modules/propertyMandateReviewUi.js";
import {
  renderPropertyAuthorityActivationUi
} from "./modules/propertyAuthorityActivationUi.js";
import {
  renderPropertyCreationProofUi
} from "./modules/propertyCreationProofUi.js";
import {
  renderPropertySaleListingProofUi
} from "./modules/propertySaleListingProofUi.js";
import {
  renderPropertyPublicationReadinessUi
} from "./modules/propertyPublicationReadinessUi.js";
import {
  renderPropertyMarketplacePublicationUi
} from "./modules/propertyMarketplacePublicationUi.js";
import {
  renderPropertyBuyerLeadUi
} from "./modules/propertyBuyerLeadUi.js";
import {
  renderPropertyConversationUi
} from "./modules/propertyConversationUi.js";
import {
  renderPropertyViewingUi
} from "./modules/propertyViewingUi.js";
import { getIdentityProfile } from "../src/identity/identityRegistry.js";
import { getVoiceUsageForProject } from "../src/identity/voiceUsagePolicy.js";
import {
  buildAutonomousPipelineAssets,
  buildAutonomousPipelineDraft
} from "../src/workspace/autonomousProductionPipeline.js";
import {
  availabilityBadgeLabels,
  buildCapabilityDetailViewModel,
  buildProductDetailViewModel,
  buildProductDiscoverySearchViewModel,
  buildProductDiscoveryUiState,
  buildProductOverviewViewModel,
  buildProductEducationViewModel,
  filterCapabilityCards,
  productLabels
} from "../src/capabilities/productDiscoveryUi.js";
import {
  buildProductEducationUiViewModel
} from "../src/capabilities/productEducationUiBridge.js";
import {
  buildExecutionPreviewViewModel
} from "../src/capabilities/executionPreview.js";
import {
  buildExecutionPreflightViewModel
} from "../src/capabilities/executionIntentDraft.js";
import {
  capabilityActivationStates,
} from "../src/capabilities/capabilityContracts.js";
import {
  buildProductDiscoveryHash,
  createProductDiscoveryBackState,
  parseProductDiscoveryHash,
  productDiscoveryModes
} from "../src/capabilities/productDiscoveryNavigation.js";
import {
  productIds
} from "../src/capabilities/productCapabilityMap.js";

const ESSA_BUILD_ID = "workspace-hash-nav-01";
console.log("[ESSA_BUILD_ID]", ESSA_BUILD_ID);

const navItems = document.querySelectorAll(".nav-item");
const productionCards = document.querySelectorAll(".production-card");
const productionCardGrid = document.querySelector(".production-card-grid");
const productionIntakePanel = document.querySelector("#production-intake-panel");
const workspaceShell = document.querySelector(".workspace-shell");
const productionPanel = document.querySelector("#production-studio-panel");
const identityPanel = document.querySelector("#identity-panel");
const identityPassport = document.querySelector("#identity-passport");
const projectsPanel = document.querySelector("#projects-panel");
const historyPanel = document.querySelector("#history-panel");
const projectWorkspacePanel = document.querySelector("#project-workspace-panel");
const productDiscoveryPanel = document.querySelector("#product-discovery-panel");
const executionWorkspacePanel = document.querySelector("#safe-local-execution-panel");
const autonomousWorkflowPanel = document.querySelector("#autonomous-workflow-panel");
const businessPanel = document.querySelector("#business-panel");
const propertyPanel = document.querySelector("#property-panel");
const propertyIngestionReviewPanel = document.querySelector("#property-ingestion-review-panel");
const propertyReviewQueuePanel = document.querySelector("#property-review-queue-panel");
const propertyExecutionProofPanel = document.querySelector("#property-execution-proof-panel");
const addPropertyPanel = document.querySelector("#add-property-panel");
const propertyMandatePanel = document.querySelector("#property-mandate-panel");
const propertyMandateReviewPanel = document.querySelector("#property-mandate-review-panel");
const propertyAuthorityActivationPanel = document.querySelector("#property-authority-activation-panel");
const propertyCreationProofPanel = document.querySelector("#property-creation-proof-panel");
const propertySaleListingProofPanel = document.querySelector("#property-sale-listing-proof-panel");
const propertyPublicationReadinessPanel = document.querySelector("#property-sale-publication-readiness-panel");
const propertyMarketplacePublicationPanel = document.querySelector("#property-publication-proof-panel");
const propertyBuyerLeadPanel = document.querySelector("#property-leads-panel");
const propertyConversationPanel = document.querySelector("#property-conversations-panel");
const propertyViewingPanel = document.querySelector("#property-viewings-panel");
const projectsList = document.querySelector("#projects-list");
const historyList = document.querySelector("#history-list");
const workspaceRecentList = document.querySelector("#workspace-recent-list");
const workspaceHistorySearch = document.querySelector("#workspace-history-search");
const activeModule = document.querySelector("#active-module");
const workspaceTitle = document.querySelector("#workspace-title");
const workspaceDescription = document.querySelector("#workspace-description");
const promptForm = document.querySelector("#workspace-chat-form");
const promptInput = document.querySelector(".prompt-bar textarea");
const chatMessages = document.querySelector("#chat-messages");
const chatPanels = document.querySelectorAll(".chat-panel");
const productionActiveIdentity = document.querySelector("#production-active-identity");
const openActiveIdentityButton = document.querySelector("#open-active-identity");
const changeActiveIdentityButton = document.querySelector("#change-active-identity");

const PRODUCTION_STUDIO = "ESSA Production Studio";
const PRODUCT_DISCOVERY_MODULE = "Product Discovery";
const SAFE_LOCAL_EXECUTION_MODULE = "Execution Workspace";
const AUTONOMOUS_WORKFLOW_MODULE = "Workflow Orchestration";
const BUSINESS_MODULE = "ESSA Business";
const PROPERTY_MODULE = "ESSA Property";
const PROPERTY_INGESTION_REVIEW_MODULE = "ESSA Property Ingestion Review";
const PROPERTY_REVIEW_QUEUE_MODULE = "ESSA Property Review Queue";
const PROPERTY_EXECUTION_PROOF_MODULE = "ESSA Property Execution Proof";
const PROPERTY_EXECUTION_HISTORY_MODULE = "ESSA Property Execution History";
const ADD_PROPERTY_MODULE = "Add Property to ESSA";
const PROPERTY_MANDATE_MODULE = "ESSA Property Mandate";
const PROPERTY_MANDATE_REVIEW_MODULE = "ESSA Property Mandate Review";
const PROPERTY_AUTHORITY_ACTIVATION_MODULE = "ESSA Property Authority Activation";
const PROPERTY_CREATION_PROOF_MODULE = "ESSA Property Creation Proof";
const PROPERTY_SALE_LISTING_PROOF_MODULE = "ESSA Property Sale Listing Proof";
const PROPERTY_PUBLICATION_READINESS_MODULE = "ESSA Property Publication Readiness";
const PROPERTY_MARKETPLACE_PUBLICATION_MODULE = "ESSA Property Marketplace Publication Proof";
const PROPERTY_BUYER_LEAD_MODULE = "ESSA Property Leads";
const PROPERTY_CONVERSATION_MODULE = "ESSA Property Conversations";
const PROPERTY_VIEWING_MODULE = "ESSA Property Viewings";
const PROJECTS_MODULE = "Мои проекты";
const HISTORY_MODULE = "История ESSA";
const SPACE_BY_HASH = {
  "#home": "Главная",
  "#navigator": "Chat ESSA Navigator",
  "#product-discovery": PRODUCT_DISCOVERY_MODULE,
  "#execution": SAFE_LOCAL_EXECUTION_MODULE,
  "#workflow": AUTONOMOUS_WORKFLOW_MODULE,
  "#business": BUSINESS_MODULE,
  "#path": "Путь ESSA",
  "#property": PROPERTY_MODULE,
  "#add-property": ADD_PROPERTY_MODULE,
  "#property-mandate": PROPERTY_MANDATE_MODULE,
  "#property-mandate-review": PROPERTY_MANDATE_REVIEW_MODULE,
  "#property-authority-activation": PROPERTY_AUTHORITY_ACTIVATION_MODULE,
  "#property-creation-proof": PROPERTY_CREATION_PROOF_MODULE,
  "#property-sale-listing-proof": PROPERTY_SALE_LISTING_PROOF_MODULE,
  "#property-sale-publication-readiness": PROPERTY_PUBLICATION_READINESS_MODULE,
  "#property-publication-proof": PROPERTY_MARKETPLACE_PUBLICATION_MODULE,
  "#property-marketplace": PROPERTY_MARKETPLACE_PUBLICATION_MODULE,
  "#property-listing": PROPERTY_MARKETPLACE_PUBLICATION_MODULE,
  "#property-leads": PROPERTY_BUYER_LEAD_MODULE,
  "#property-conversations": PROPERTY_CONVERSATION_MODULE,
  "#property-viewings": PROPERTY_VIEWING_MODULE,
  "#property-ingestion-review": PROPERTY_INGESTION_REVIEW_MODULE,
  "#property-review-queue": PROPERTY_REVIEW_QUEUE_MODULE,
  "#property-execution-proof": PROPERTY_EXECUTION_PROOF_MODULE,
  "#property-execution-history": PROPERTY_EXECUTION_HISTORY_MODULE,
  "#production": PRODUCTION_STUDIO,
  "#identity": "Цифровая личность",
  "#website": "Website Studio",
  "#marketing": "Маркетинг и Реклама",
  "#agents": "AI Агенты",
  "#education": "Образование",
  "#psychology": "Психология",
  "#legal": "Юридическая помощь",
  "#economy": "Цифровая экономика",
  "#impact": "Impact Foundation",
  "#travel": "Путешествия",
  "#community": "Сообщество",
  "#history": HISTORY_MODULE,
  "#projects": PROJECTS_MODULE,
  "#creations": "ESSA Creations",
  "#profile": "Профиль",
  "#settings": "Настройки"
};
const HASH_BY_SPACE = Object.fromEntries(
  Object.entries(SPACE_BY_HASH).map(([hash, space]) => [space, hash])
);
const WORKFLOW_STORAGE_KEY = "essa_production_workflow_state";
const PRODUCTION_INTAKE_STORAGE_KEY = "essa_production_intake_state";
const ACTIVE_WORKFLOW_STATE_STORAGE_KEY = "essa_active_workflow_state";
const WEBSITE_WORKFLOW_STORAGE_KEY = "essa_website_workflow_state";
const HISTORY_STORAGE_KEY = "essa_workspace_history";
const IDENTITY_PASSPORT_PACKAGES_STORAGE_KEY = "essa_identity_passport_packages";
const ACTIVE_IDENTITY_STORAGE_KEY = "essa_active_identity_id";
const FINAL_CONTEXT_MARKER = "ESSA_PRODUCTION_WORKFLOW_FINAL_CONTEXT";
const STEP_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];
const projectAssetCategoryByAction = {
  voice_script: "voice",
  visuals: "visuals",
  editing: "video",
  editing_package: "video",
  publication_text: "publications",
  publish_package: "publications",
  publication_package: "publications"
};

const productionWorkflowSteps = [
  {
    key: "idea",
    label: "Идея",
    question: "Опишите идею ролика одной-двумя фразами.",
    completed: "Идея зафиксирована.",
    nextIntro: "Теперь создадим концепцию."
  },
  {
    key: "concept",
    label: "Концепция",
    question: "Какое ощущение должен оставить ролик: вдохновение, доверие, узнавание, желание попробовать, продажа, другое?",
    completed: "Концепция зафиксирована.",
    nextIntro: "Теперь перейдём к сценарию."
  },
  {
    key: "script",
    label: "Сценарий",
    question: "Какой главный хук должен прозвучать в первые 3 секунды?",
    completed: "Основа сценария зафиксирована.",
    nextIntro: "Теперь определим озвучивание."
  },
  {
    key: "voice",
    label: "Озвучивание",
    question: "Каким должен быть голос и темп: спокойный, уверенный, эмоциональный, быстрый, мягкий, другой?",
    completed: "Озвучивание зафиксировано.",
    nextIntro: "Теперь выберем визуальный стиль."
  },
  {
    key: "visual_style",
    label: "Визуальный стиль",
    question: "Какой визуальный стиль нужен: минимализм, кинематографично, живой репортаж, luxury, документально, другое?",
    completed: "Визуальный стиль зафиксирован.",
    nextIntro: "Теперь определим изображения и материалы."
  },
  {
    key: "images",
    label: "Изображения",
    question: "Какие изображения, кадры или материалы нужны для ролика?",
    completed: "Материалы зафиксированы.",
    nextIntro: "Теперь соберём монтажную логику."
  },
  {
    key: "assembly",
    label: "Монтаж",
    question: "Какой ритм монтажа нужен: быстрый, спокойный, эмоциональный, экспертный, с паузами, другой?",
    completed: "Монтажная логика зафиксирована.",
    nextIntro: "Теперь подготовим публикацию."
  },
  {
    key: "publication",
    label: "Подготовка публикации",
    question: "Что нужно подготовить для публикации: подпись, заголовок, CTA, хэштеги, обложку, всё вместе?",
    completed: "Публикационный пакет зафиксирован.",
    nextIntro: "Теперь сделаем финальную проверку."
  },
  {
    key: "final_review",
    label: "Финальная проверка",
    question: "Есть ли ограничения, важные слова, запреты или финальные пожелания перед сборкой проекта?",
    completed: "Финальные условия зафиксированы.",
    nextIntro: "Маршрут пройден."
  }
];

const websiteWorkflowSteps = [
  {
    key: "site_type",
    label: "Тип сайта",
    question: "Какой тип сайта нужен?",
    options: ["корпоративный сайт", "лендинг", "интернет-магазин", "портал", "другое"]
  },
  {
    key: "company_activity",
    label: "Компания",
    question: "Чем занимается компания?"
  },
  {
    key: "audience",
    label: "Аудитория",
    question: "Для кого сайт?"
  },
  {
    key: "sections",
    label: "Разделы",
    question: "Какие разделы нужны?"
  },
  {
    key: "assets",
    label: "Материалы",
    question: "Есть ли логотип, фото, тексты, портфолио?"
  },
  {
    key: "result",
    label: "Результат",
    question: "Какой результат должен дать сайт?",
    options: ["заявки", "продажи", "доверие", "презентация", "другое"]
  }
];

const modulePrompts = {
  [PRODUCTION_STUDIO]: "ESSA Production Studio routing hint: production_studio. Start a live creative production workflow.",
  [BUSINESS_MODULE]: "ESSA Business routing hint: product=ESSA_BUSINESS intent=BUSINESS_GROWTH stage=INTAKE.",
  "Цифровая личность": "ESSA Digital Identity routing hint: digital_identity. Prepare a Digital Identity Agent plan for Lisa Avatar or a personal avatar without generating media.",
  "Website Studio": "Website Studio: подготовь website_studio Task Package.",
  "Маркетинг и Реклама": "Маркетинг и Реклама: подготовь marketing_factory Task Package.",
  "ESSA Property": "ESSA Property: подготовь property Task Package.",
  "Юридическая помощь": "Юридическая помощь: подготовь legal_preparation Task Package.",
  "Путешествия": "Путешествия: подготовь travel_planner Task Package.",
  "Образование": "Образование: подготовь education_path Task Package.",
  "Путь ESSA": "Путь ESSA: подготовь essa_path Task Package.",
  "ESSA Creations": "Продукт ESSA: подготовь product_essa Task Package.",
  "ESSA Products": "Продукт ESSA: подготовь product_essa Task Package."
};

const PRODUCTION_NAVIGATOR_SPACE = "Chat ESSA Navigator";
const PRODUCTION_ACTION_ROUTES = [
  { actionKey: "video", workflowId: "production_video", navigatorCommand: "Создать ролик" },
  { actionKey: "short", workflowId: "production_video", navigatorCommand: "Создать Shorts / Reels / TikTok" },
  { actionKey: "book", workflowId: "production_book", navigatorCommand: "Написать книгу" },
  { actionKey: "chapter", workflowId: "production_book", navigatorCommand: "Создать главу" },
  { actionKey: "song", workflowId: "production_song", navigatorCommand: "Создать песню" },
  { actionKey: "podcast", workflowId: "production_video", navigatorCommand: "Создать подкаст" },
  { actionKey: "image", workflowId: "production_video", navigatorCommand: "Создать изображение" },
  { actionKey: "ad", workflowId: "production_ad", navigatorCommand: "Создать рекламу" },
  { actionKey: "product", workflowId: "product_essa", navigatorCommand: "Создать продукт ESSA" },
  { actionKey: "publication", workflowId: "production_ad", navigatorCommand: "Подготовить публикацию" },
  { actionKey: "content_multiplication", workflowId: "content_multiplication_package", navigatorCommand: "Размножить контент" },
  { actionKey: "cartoon", workflowId: "production_cartoon", navigatorCommand: "Создать мультфильм" },
  { actionKey: "short_film", workflowId: "production_film", navigatorCommand: "Создать мини-фильм" },
  { actionKey: "documentary", workflowId: "production_documentary", navigatorCommand: "Создать документальный фильм" },
  { actionKey: "music_video", workflowId: "production_music_video", navigatorCommand: "Создать музыкальный клип" },
  { actionKey: "youtube_series", workflowId: "production_animated_story", navigatorCommand: "Создать YouTube-серию" },
  { actionKey: "fairytale", workflowId: "production_cartoon", navigatorCommand: "Создать детскую сказку" },
  { actionKey: "educational_animation", workflowId: "production_animated_story", navigatorCommand: "Создать образовательную анимацию" }
];

const workspaceDescriptions = {
  "Chat ESSA Navigator": "Живой диалог с ESSA: вопросы, ответы, проекты и следующие шаги.",
  [PRODUCT_DISCOVERY_MODULE]: "Читайте Product Knowledge: продукты, возможности, доступность и обучение без запуска workflow.",
  [SAFE_LOCAL_EXECUTION_MODULE]: "Безопасное локальное выполнение для уже доказанных media capability: без внешних провайдеров, оплаты, публикации и deploy.",
  [AUTONOMOUS_WORKFLOW_MODULE]: "Один локальный goal превращается в проверенный multi-step workflow: probe, trim, resize, audio extract, lineage и rollback.",
  [PROPERTY_AUTHORITY_ACTIVATION_MODULE]: "Локальный preflight активации AuthorityGrant после private mandate review, без production/legal/provider действий.",
  [PROPERTY_CREATION_PROOF_MODULE]: "Локальное создание canonical Property после Add Property и ACTIVE_LOCAL_PROOF authority, без Listing и production write.",
  [BUSINESS_MODULE]: "Создаём Business Profile, собираем intake, показываем Diagnosis, Growth Plan и Commercial Offer Draft без оплаты и авто-исполнения.",
  [PROPERTY_SALE_LISTING_PROOF_MODULE]: "Локальное создание unpublished Sale Listing вокруг существующего Property, без публикации и сделки.",
  "Website Studio": "Собираем сайт по шагам: задача, аудитория, структура, материалы и результат.",
  "Цифровая личность": "Образ, голос, стиль, память, видео и присутствие цифровой личности.",
  [PRODUCTION_STUDIO]: "Творческая студия для роликов, книг, песен, подкастов, изображений и публикаций.",
  [PROPERTY_MODULE]: "Read-only Property Passport: факты, источники, freshness, риски и объяснение Lisa без execution.",
  [ADD_PROPERTY_MODULE]: "Guided local Add Property intake: actor, relationship, authority, evidence and review readiness without publishing.",
  [PROPERTY_MANDATE_MODULE]: "Local mandate preparation: human-readable draft plus proposed machine-readable authority scope, without legal/signature execution.",
  [PROPERTY_MANDATE_REVIEW_MODULE]: "Private local mandate review: evidence inspection, version pinning, outcome recording and inactive authority readiness.",
  [PROPERTY_INGESTION_REVIEW_MODULE]: "Internal local Property ingestion review: audits, quarantine, conflicts, lineage and disabled future actions.",
  [PROPERTY_REVIEW_QUEUE_MODULE]: "Internal local Property review workflow: handoff queue, assignments, inbox, evidence requests and audit preview with execution disabled.",
  "Маркетинг и Реклама": "Офферы, кампании, тексты, воронки и продвижение.",
  "Юридическая помощь": "Подготовка юридических текстов, вопросов, структуры и документов.",
  "Психология": "Мягкий разбор состояния, ясность, опора и следующий шаг.",
  "Образование": "Учебные маршруты, планы, материалы и развитие навыков.",
  "Путешествия": "Маршруты, переезды, планы поездок и подготовка.",
  "Мои проекты": "Сохранённые локальные проекты и рабочие материалы.",
  "История ESSA": "Последние запросы, чаты и связанные проекты.",
  "Новое пространство": "Чистый рабочий чат для нового запроса."
};

let selectedModule = "Главная";
let productDiscoveryNavigationState = parseProductDiscoveryHash("#product-discovery");
let selectedProductionAction = "";
let lastFinalBlueprintText = "";
let activeProjectId = "";
let productionIntakeState = loadProductionIntakeState();
let activeProductionView = productionIntakeState ? "intake" : "cards";
let activeProductionSubtype = productionIntakeState?.subtype || null;

function getSessionId() {
  const existing = localStorage.getItem("essa_workspace_session_id");

  if (existing) {
    return existing;
  }

  const sessionId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("essa_workspace_session_id", sessionId);
  return sessionId;
}

function loadWorkspaceHistory() {
  try {
    const items = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}

function saveWorkspaceHistory(items) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("[history] save skipped", error);
  }
}

function loadIdentityPassportPackages() {
  try {
    const items = JSON.parse(localStorage.getItem(IDENTITY_PASSPORT_PACKAGES_STORAGE_KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}

function saveIdentityPassportPackages(items) {
  localStorage.setItem(IDENTITY_PASSPORT_PACKAGES_STORAGE_KEY, JSON.stringify(items));
}

function getActiveIdentityId() {
  try {
    return localStorage.getItem(ACTIVE_IDENTITY_STORAGE_KEY) || "lisa";
  } catch (error) {
    console.warn("[identity] active identity fallback", error);
    return "lisa";
  }
}

function setActiveIdentity(identityId = "lisa") {
  try {
    localStorage.setItem(ACTIVE_IDENTITY_STORAGE_KEY, identityId);
  } catch (error) {
    console.warn("[identity] active identity save skipped", error);
  }

  renderProductionActiveIdentity();
}

function getActiveIdentity() {
  const activeIdentityId = getActiveIdentityId();
  const activeIdentity = getIdentityProfile(activeIdentityId);

  return activeIdentity || getIdentityProfile("lisa");
}

function buildIdentitySnapshot(identity = getActiveIdentity()) {
  const promptPack = buildIdentityPromptPack(identity);

  return {
    id: identity.id,
    name: identity.name,
    type: identity.type,
    source: "Identity Passport Package",
    roles: identity.roles || [],
    capabilities: identity.capabilities || [],
    identityState: identity.identityState || null,
    visualIdentity: identity.visualIdentity || {},
    voiceIdentity: identity.voiceIdentity || {},
    voiceUsagePolicy: identity.voiceUsagePolicy || {},
    personality: identity.personality || {},
    promptPack,
    negativePrompt: identity.visualIdentity?.negativePrompt || ""
  };
}

function getActiveIdentityProjectFields() {
  const identitySnapshot = buildIdentitySnapshot();

  return {
    identityId: identitySnapshot.id,
    identityName: identitySnapshot.name,
    identitySnapshot
  };
}

function getProductionIdentityContextPrompt() {
  const identitySnapshot = buildIdentitySnapshot();

  return `Active Digital Identity:
- id: ${identitySnapshot.id}
- name: ${identitySnapshot.name}
- type: ${identitySnapshot.type}
- source: ${identitySnapshot.source}
- roles: ${identitySnapshot.roles.join(", ") || "none"}
- capabilities: ${identitySnapshot.capabilities.join(", ") || "none"}
- tone: ${identitySnapshot.personality?.tone || "not set"}
- visual identity: ${identitySnapshot.visualIdentity?.summary || "not set"}
- voice identity source: ${identitySnapshot.voiceIdentity?.source || "not set"}
- negative prompt: ${identitySnapshot.negativePrompt || "not set"}`;
}

function isProductionCorePlan(corePlan = {}) {
  return corePlan.intent === "production" ||
    corePlan.intent === "production_studio" ||
    corePlan.projectDraft?.type === "production";
}

function getContentMultiplicationOutputs() {
  return {
    podcast: 1,
    shorts: 15,
    tiktok: 10,
    reels: "selected",
    visuals: "selected",
    languages: "selected",
    translations: "selected",
    publications: "selected",
    schedule: "planned"
  };
}

const productionContentMultiplicationIntakeSteps = [
  {
    key: "source",
    label: "Источник",
    question: "Что является источником: текст, глава, песня, голос, видео или идея?"
  },
  {
    key: "theme",
    label: "Главная тема",
    question: "Какая главная тема?"
  },
  {
    key: "formats",
    label: "Форматы",
    question: "Какие форматы нужны: подкаст, shorts, reels, TikTok, визуалы, переводы?"
  },
  {
    key: "languages",
    label: "Языки",
    question: "Какие языки нужны?"
  },
  {
    key: "publishing",
    label: "Публикация",
    question: "Где публиковать?"
  },
  {
    key: "lisa_voice",
    label: "Озвучка Lisa",
    question: "Нужна ли озвучка Lisa?"
  },
  {
    key: "output_count",
    label: "Количество",
    question: "Сколько материалов создать?"
  }
];

function isContentMultiplicationProject(project = {}) {
  return project.subtype === "content_multiplication" ||
    project.workflowId === "content_multiplication_package";
}

function loadProductionIntakeState() {
  try {
    const state = JSON.parse(sessionStorage.getItem(PRODUCTION_INTAKE_STORAGE_KEY) || "null");

    return state?.subtype === "content_multiplication" ? state : null;
  } catch (error) {
    console.warn("[production-intake] load skipped", error);
    return null;
  }
}

function saveProductionIntakeState(state) {
  try {
    if (state) {
      sessionStorage.setItem(PRODUCTION_INTAKE_STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(PRODUCTION_INTAKE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("[production-intake] save skipped", error);
  }
}

function loadActiveWorkflowState() {
  try {
    const state = JSON.parse(sessionStorage.getItem(ACTIVE_WORKFLOW_STATE_STORAGE_KEY) || "null");
    return state && typeof state === "object" ? state : null;
  } catch (error) {
    console.warn("[workflow-state] load skipped", error);
    return null;
  }
}

function saveActiveWorkflowState(state) {
  try {
    if (state && !state.completed) {
      sessionStorage.setItem(ACTIVE_WORKFLOW_STATE_STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(ACTIVE_WORKFLOW_STATE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("[workflow-state] save skipped", error);
  }
}

function clearActiveWorkflowState() {
  saveActiveWorkflowState(null);
}

function isWorkflowExitMessage(message = "") {
  const text = String(message).toLowerCase().trim();

  return [
    "стоп",
    "отмена",
    "выйти",
    "завершить",
    "новая задача",
    "сменить задачу"
  ].some((marker) => text.includes(marker));
}

function isContentMultiplicationAction(action = "", card = null) {
  const text = `${action} ${card?.textContent || ""}`.toLowerCase();

  return text.includes("размножить контент") ||
    text.includes("content multiplication") ||
    text.includes("media package") ||
    text.includes("медиапакет");
}

function getProductionActionRoute(card) {
  const explicitActionKey = card?.dataset?.productionRoute;
  const explicitWorkflowId = card?.dataset?.productionWorkflow;

  if (explicitActionKey) {
    return {
      actionKey: explicitActionKey,
      workflowId: explicitWorkflowId || "",
      navigatorCommand: card?.dataset?.productionCommand || card?.dataset?.productionAction || card?.textContent?.trim() || explicitActionKey
    };
  }

  const cardIndex = Array.from(productionCards).indexOf(card);
  return PRODUCTION_ACTION_ROUTES[cardIndex] || {
    actionKey: "video",
    workflowId: "production_video",
    navigatorCommand: card?.dataset?.productionAction || card?.textContent?.trim() || "Создать ролик"
  };
}

function buildProductionNavigatorPrompt(route, action) {
  return [
    "Workspace routing hint: production_studio.",
    "Studio cards are an intention surface; agents and workflows are internal Navigator mechanics.",
    `Selected card: ${route.navigatorCommand || action}.`,
    `Production action key: ${route.actionKey}.`,
    `Target workflow: ${route.workflowId}.`,
    "Open the existing Navigator workflow for this action and begin the live intake dialogue now.",
    "Do not ask the user to choose AI Agents. Do not duplicate a separate Production Studio flow."
  ].join("\n");
}

function openProductionNavigatorRoute(route, action) {
  activeProductionView = "cards";
  activeProductionSubtype = route.actionKey;
  const goalId = `goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = new Date().toISOString();
  saveActiveWorkflowState({
    module: "production_studio",
    action: route.actionKey,
    workflow: route.workflowId,
    conversationMode: "intake",
    currentQuestionIndex: 0,
    answers: {},
    goalId,
    goal: route.actionKey === "chapter" && route.workflowId === "production_book"
      ? {
        id: goalId,
        type: "create_artifact",
        action: "create",
        subject: "chapter",
        name: "create chapter",
        workflowId: "production_book",
        source: "production_studio",
        desiredOutcome: "finished chapter draft saved as project artifact",
        completionCriteria: [
          "requirements_collected",
          "chapter_structure_created",
          "draft_created",
          "artifact_saved",
          "result_verified"
        ]
      }
      : null,
    goalState: route.actionKey === "chapter" && route.workflowId === "production_book"
      ? {
        goalId,
        type: "create_artifact",
        subject: "chapter",
        desiredOutcome: "finished chapter draft saved as project artifact",
        status: "in_progress",
        currentPhase: "intake",
        progress: {
          requirements_collected: false,
          chapter_structure_created: false,
          draft_created: false,
          artifact_saved: false,
          result_verified: false
        },
        decisions: [],
        unresolvedQuestions: [],
        rejectedOptions: [],
        linkedProjectId: null,
        createdAt,
        updatedAt: createdAt
      }
      : null,
    initialRequest: route.navigatorCommand || action,
    createdAt
  });
  selectedModule = PRODUCTION_STUDIO;
  window.location.hash = HASH_BY_SPACE[PRODUCTION_NAVIGATOR_SPACE] || "#navigator";
  setActive(PRODUCTION_NAVIGATOR_SPACE);
  sendWorkspaceMessage(route.navigatorCommand || action, buildProductionNavigatorPrompt(route, action), {
    skipWorkflowState: true
  });
}

function saveWorkspaceResponseProject(data, historyEntryId = "") {
  const projectPayload = data?.project;

  if (!projectPayload?.id) {
    return null;
  }

  const projects = loadProjects();
  const existingProjectIndex = projects.findIndex((item) => item.id === projectPayload.id);
  const existingProject = existingProjectIndex >= 0 ? projects[existingProjectIndex] : null;

  if (existingProject) {
    const mergedArtifacts = [
      ...(Array.isArray(existingProject.artifacts) ? existingProject.artifacts : []),
      ...(Array.isArray(projectPayload.artifacts) ? projectPayload.artifacts : []),
      ...(Array.isArray(data.artifacts) ? data.artifacts : [])
    ].reduce((items, artifact) => {
      if (!artifact?.id) {
        return items;
      }

      const index = items.findIndex((item) => item.id === artifact.id);

      if (index >= 0) {
        items[index] = {
          ...items[index],
          ...artifact
        };
      } else {
        items.push(artifact);
      }

      return items;
    }, []);
    const updatedProject = normalizeProject({
      ...existingProject,
      ...projectPayload,
      workflowState: data.workflow_state || projectPayload.workflowState || existingProject.workflowState,
      goalState: data.goalState || projectPayload.goalState || existingProject.goalState,
      artifacts: mergedArtifacts,
      assets: {
        ...(existingProject.assets || {}),
        ...(projectPayload.assets || {}),
        documents: mergedArtifacts
      },
      history: [
        ...(Array.isArray(existingProject.history) ? existingProject.history : []),
        ...(Array.isArray(projectPayload.history) ? projectPayload.history : [])
      ].slice(-40),
      updatedAt: new Date().toISOString()
    });

    projects[existingProjectIndex] = updatedProject;
    saveProjects(projects);
    updateHistoryEntry(historyEntryId, {
      linkedProjectId: updatedProject.id,
      status: "project_updated"
    });
    renderProjects();
    renderWorkspaceRecent();
    return updatedProject;
  }

  const project = normalizeProject({
    ...projectPayload,
    workflowState: data.workflow_state || projectPayload.workflowState,
    goalState: data.goalState || projectPayload.goalState,
    artifacts: Array.isArray(data.artifacts) && data.artifacts.length
      ? data.artifacts
      : projectPayload.artifacts || [],
    updatedAt: new Date().toISOString()
  });

  projects.unshift(project);
  saveProjects(projects);
  updateHistoryEntry(historyEntryId, {
    linkedProjectId: project.id,
    status: "project_created"
  });
  addWorkspaceOpenHistory({
    userText: `Chapter project created: ${project.title}`,
    intent: "production",
    agent: "Production Agent",
    workflowId: "production_book",
    linkedProjectId: project.id,
    status: "chapter_project_created"
  });
  renderProjects();
  renderWorkspaceRecent();
  return project;
}

function isContinuationReferenceMessage(message = "") {
  const text = String(message || "").toLowerCase();

  return [
    "продолжим",
    "продолжи",
    "вернёмся к главе",
    "вернемся к главе",
    "сделай как раньше",
    "используй тот же стиль"
  ].some((marker) => text.includes(marker));
}

function findRelevantChapterProject(message = "", activeWorkflowState = null) {
  const projects = loadProjects();
  const linkedProjectId = activeWorkflowState?.linkedProjectId || activeWorkflowState?.goalState?.linkedProjectId;

  if (linkedProjectId) {
    return projects.find((project) => project.id === linkedProjectId) || null;
  }

  if (!isContinuationReferenceMessage(message)) {
    return null;
  }

  return projects.find((project) =>
    project.workflowId === "production_book" &&
    project.subtype === "chapter" &&
    project.status !== "completed"
  ) || null;
}

function buildWorkspaceRequestContext(message = "", activeWorkflowState = null) {
  const activeProject = findRelevantChapterProject(message, activeWorkflowState);
  const identitySnapshot = selectedModule === PRODUCTION_STUDIO
    ? buildIdentitySnapshot()
    : null;

  return {
    activeProjectId: activeProject?.id || activeWorkflowState?.linkedProjectId || "",
    activeProject: activeProject || null,
    identitySnapshot,
    permissions: {
      internalSave: true
    }
  };
}

function setProductionCardsVisible(isVisible) {
  if (productionCardGrid) {
    productionCardGrid.hidden = !isVisible;
  }
  if (productionIntakePanel) {
    productionIntakePanel.hidden = isVisible;
  }
}

function createProductionIntakeState() {
  return {
    subtype: "content_multiplication",
    title: "Размножить контент",
    currentStepIndex: 0,
    answers: {},
    completed: false,
    createdAt: new Date().toISOString()
  };
}

function startProductionIntake(action = "Размножить контент") {
  activeProductionView = "intake";
  activeProductionSubtype = "content_multiplication";
  selectedProductionAction = action;
  productionIntakeState = createProductionIntakeState();
  saveProductionIntakeState(productionIntakeState);
  clearWorkflowState();
  setActive(PRODUCTION_STUDIO);
  renderProductionIntake();
}

function resetProductionIntake() {
  activeProductionView = "cards";
  activeProductionSubtype = null;
  productionIntakeState = null;
  saveProductionIntakeState(null);
  setProductionCardsVisible(true);
  productionCards.forEach((item) => item.classList.remove("active"));
}

function getProductionIntakeAnswers(state = productionIntakeState) {
  return productionContentMultiplicationIntakeSteps.reduce((answers, step) => {
    answers[step.key] = state?.answers?.[step.key] || "";
    return answers;
  }, {});
}

function buildContentMultiplicationBlueprintText(project) {
  const answers = getProductionIntakeAnswers(productionIntakeState);

  return [
    "Content Multiplication Project",
    "",
    `Title: ${project.title}`,
    `Identity: ${project.identityName || "not set"}`,
    "",
    "Intake answers:",
    ...productionContentMultiplicationIntakeSteps.map((step) => `- ${step.label}: ${answers[step.key] || "not set"}`),
    "",
    "Planned outputs:",
    "- podcast: 1",
    "- shorts: 15",
    "- TikTok: 10",
    "- reels: selected",
    "- visuals: selected",
    "- translations: selected",
    "- publications: selected",
    "- schedule: planned",
    "",
    "Status: draft. External tools were not started."
  ].join("\n");
}

function createContentMultiplicationProjectFromIntake() {
  if (!productionIntakeState?.completed) {
    return null;
  }

  const projects = loadProjects();
  const identityFields = getActiveIdentityProjectFields();
  const answers = getProductionIntakeAnswers(productionIntakeState);
  const title = answers.theme
    ? `Content Multiplication: ${answers.theme}`
    : "Content Multiplication Project";
  const project = normalizeProject({
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title,
    type: "production",
    subtype: "content_multiplication",
    workflowId: "content_multiplication_package",
    agent: "Production Agent",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    initialRequest: productionIntakeState.title || "Размножить контент",
    workflowAnswers: answers,
    workflowState: {
      currentStepIndex: productionContentMultiplicationIntakeSteps.length,
      steps: productionContentMultiplicationIntakeSteps,
      answers,
      completed: true,
      started: true
    },
    plannedOutputs: getContentMultiplicationOutputs(),
    assets: getEmptyProjectAssets(),
    nextActions: getFinalActionLabels(),
    ...identityFields
  });

  project.finalBlueprintText = buildContentMultiplicationBlueprintText(project);
  projects.unshift(project);
  saveProjects(projects);
  addWorkspaceOpenHistory({
    userText: "Content Multiplication Project создан",
    intent: "production",
    agent: "Production Agent",
    workflowId: project.workflowId,
    linkedProjectId: project.id,
    status: "project_created"
  });
  addWorkspaceOpenHistory({
    userText: `Production project created with ${project.identityName} identity`,
    intent: "production",
    agent: "Production Agent",
    workflowId: project.workflowId,
    linkedProjectId: project.id,
    status: "project_created_with_identity"
  });
  resetProductionIntake();
  renderProjects();
  renderWorkspaceRecent();
  appendMessage("navigator", `Content Multiplication Project создан: ${project.title}`);
  openProjectWorkspace(project.id, getProjectWorkspaceOptions("workflow"));
  return project;
}

function renderProductionIntake() {
  if (!productionIntakePanel) {
    return;
  }

  if (activeProductionView !== "intake" || activeProductionSubtype !== "content_multiplication") {
    setProductionCardsVisible(true);
    productionIntakePanel.innerHTML = "";
    return;
  }

  if (!productionIntakeState) {
    productionIntakeState = createProductionIntakeState();
    saveProductionIntakeState(productionIntakeState);
  }

  setProductionCardsVisible(false);
  productionIntakePanel.innerHTML = "";

  const step = productionContentMultiplicationIntakeSteps[productionIntakeState.currentStepIndex];
  const progress = document.createElement("div");
  progress.className = "production-intake-progress";
  progress.textContent = productionIntakeState.completed
    ? "7/7"
    : `${productionIntakeState.currentStepIndex + 1}/${productionContentMultiplicationIntakeSteps.length}`;

  const title = document.createElement("h3");
  title.textContent = productionIntakeState.title || "Размножить контент";

  const intro = document.createElement("p");
  intro.textContent = "Одна идея → подкаст, shorts, reels, визуалы, переводы и публикации.";

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "production-intake-back";
  backButton.textContent = "← Назад к Production Studio";
  backButton.addEventListener("click", () => {
    resetProductionIntake();
    renderProductionIntake();
  });

  productionIntakePanel.append(backButton, progress, title, intro);

  if (productionIntakeState.completed || !step) {
    const ready = document.createElement("div");
    ready.className = "production-intake-question";

    const heading = document.createElement("strong");
    heading.textContent = "Информации достаточно. Можно создать Content Multiplication Project.";

    const summary = document.createElement("div");
    summary.className = "production-intake-summary";
    productionContentMultiplicationIntakeSteps.forEach((item) => {
      const row = document.createElement("p");
      const label = document.createElement("strong");
      label.textContent = `${item.label}: `;
      row.append(label, productionIntakeState.answers[item.key] || "не указано");
      summary.append(row);
    });

    const actions = document.createElement("div");
    actions.className = "production-intake-actions";

    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.textContent = "Создать проект";
    createButton.addEventListener("click", () => createContentMultiplicationProjectFromIntake());

    actions.append(createButton);
    ready.append(heading, summary, actions);
    productionIntakePanel.append(ready);
    return;
  }

  const form = document.createElement("form");
  form.className = "production-intake-question";

  const label = document.createElement("label");
  label.textContent = step.question;
  label.setAttribute("for", `production-intake-${step.key}`);

  const textarea = document.createElement("textarea");
  textarea.id = `production-intake-${step.key}`;
  textarea.rows = 4;
  textarea.value = productionIntakeState.answers[step.key] || "";
  textarea.placeholder = "Ответьте здесь...";

  const actions = document.createElement("div");
  actions.className = "production-intake-actions";

  const nextButton = document.createElement("button");
  nextButton.type = "submit";
  nextButton.textContent = productionIntakeState.currentStepIndex === productionContentMultiplicationIntakeSteps.length - 1
    ? "Завершить intake"
    : "Следующий вопрос";

  actions.append(nextButton);
  form.append(label, textarea, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    productionIntakeState.answers[step.key] = textarea.value.trim();
    productionIntakeState.currentStepIndex += 1;

    if (productionIntakeState.currentStepIndex >= productionContentMultiplicationIntakeSteps.length) {
      productionIntakeState.completed = true;
    }

    saveProductionIntakeState(productionIntakeState);
    renderProductionIntake();
  });

  productionIntakePanel.append(form);
  textarea.focus();
}

function renderProductionView() {
  if (activeProductionView === "intake") {
    renderProductionIntake();
    return;
  }

  setProductionCardsVisible(true);
  if (productionIntakePanel) {
    productionIntakePanel.innerHTML = "";
  }
}

function withIdentityExecutionMetadata(executionPlan, identitySnapshot = null) {
  if (!executionPlan || !identitySnapshot) {
    return executionPlan;
  }

  const voiceUsage = getVoiceUsageForProject(identitySnapshot, {
    identityId: identitySnapshot.id,
    identitySnapshot
  });

  return {
    ...executionPlan,
    metadata: {
      ...(executionPlan.metadata || {}),
      identityId: identitySnapshot.id,
      identityName: identitySnapshot.name,
      identityRequired: true,
      voiceIdentity: voiceUsage.allowed ? identitySnapshot.name : voiceUsage.fallbackVoice,
      voiceUsage
    },
    identityId: identitySnapshot.id,
    identityName: identitySnapshot.name,
    identityRequired: true,
    voiceIdentity: voiceUsage.allowed ? identitySnapshot.name : voiceUsage.fallbackVoice,
    voiceUsage
  };
}

function renderProductionActiveIdentity() {
  if (!productionActiveIdentity) {
    return;
  }

  const identity = getActiveIdentity();
  const label = identity.identityState?.label ? ` • ${identity.identityState.label}` : "";
  const title = productionActiveIdentity.querySelector("strong");
  const description = productionActiveIdentity.querySelector("p");

  if (title) {
    title.textContent = `🟢 ${identity.name}`;
  }

  if (description) {
    description.textContent = `Цифровая личность ESSA${label}`;
  }
}

function addWorkspaceOpenHistory({ userText, intent, agent, workflowId, linkedProjectId = "", status }) {
  const history = loadWorkspaceHistory();
  const latest = history[0];
  const now = Date.now();
  const latestAt = latest?.createdAt ? new Date(latest.createdAt).getTime() : 0;

  if (latest?.userText === userText && now - latestAt < 30000) {
    return;
  }

  history.unshift({
    id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    userText,
    intent,
    agent,
    workflowId,
    linkedProjectId,
    status
  });
  saveWorkspaceHistory(history.slice(0, 80));
  renderHistory();
  renderWorkspaceRecent();
}

function createHistoryEntry(userText) {
  const entry = {
    id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    userText,
    intent: "pending",
    agent: "",
    workflowId: "",
    linkedProjectId: "",
    status: "sent"
  };
  const history = loadWorkspaceHistory();

  history.unshift(entry);
  saveWorkspaceHistory(history.slice(0, 80));
  renderHistory();
  renderWorkspaceRecent();
  return entry;
}

function updateHistoryEntry(entryId, updates) {
  if (!entryId) {
    return;
  }

  const history = loadWorkspaceHistory();
  const index = history.findIndex((item) => item.id === entryId);

  if (index === -1) {
    return;
  }

  history[index] = {
    ...history[index],
    ...updates
  };
  saveWorkspaceHistory(history);
  renderHistory();
  renderWorkspaceRecent();
}

function deleteHistoryEntry(entryId) {
  saveWorkspaceHistory(loadWorkspaceHistory().filter((item) => item.id !== entryId));
  renderHistory();
  renderWorkspaceRecent();
}

function getCorePlanHistoryFields(corePlan) {
  return {
    intent: corePlan?.intent || "unknown",
    agent: corePlan?.agent || "",
    workflowId: corePlan?.workflowId || corePlan?.workflow?.id || "",
    status: corePlan?.intent === "unknown" ? "unknown" : "routed"
  };
}

function getCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function formatBoolean(value) {
  return value ? "да" : "нет";
}

function createPassportCard(title, rows) {
  const card = document.createElement("article");
  card.className = "identity-passport-card";

  const heading = document.createElement("h4");
  heading.textContent = title;
  card.append(heading);

  rows.forEach(([label, value]) => {
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    row.append(strong, String(value || "—"));
    card.append(row);
  });

  return card;
}

function getApprovedReferences(profile) {
  const references = [
    ...(profile.visualIdentity?.referenceImages || []),
    ...(profile.assets?.referenceImages || [])
  ];
  const uniqueById = new Map();

  references
    .filter((reference) => reference?.status === "approved_reference")
    .forEach((reference) => {
      uniqueById.set(reference.id || reference.sourcePath || reference.title, reference);
    });

  return [...uniqueById.values()];
}

function buildIdentityPromptPack(profile) {
  const visualIdentity = profile.visualIdentity || {};
  const personality = profile.personality || {};

  return {
    title: "Lisa Molis Identity Prompt Pack",
    basePrompt: visualIdentity.summary || "",
    consistencyPrompt: "Keep Lisa Molis as the same living digital identity across all visual, voice and video outputs. Preserve facial structure, natural presence, warm grounded tone and ESSA identity.",
    personalityPrompt: `${personality.tone || ""}. ${personality.communicationStyle || ""}`.trim(),
    negativePrompt: visualIdentity.negativePrompt || ""
  };
}

function buildIdentityPassportPackage(profile) {
  const createdAt = new Date().toISOString();
  const approvedReferences = getApprovedReferences(profile);
  const promptPack = buildIdentityPromptPack(profile);

  return {
    id: `identity_passport_package_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    identityId: profile.id,
    createdAt,
    status: "ready",
    name: profile.name,
    type: profile.type,
    identityState: profile.identityState,
    roles: profile.roles || [],
    capabilities: profile.capabilities || [],
    visualIdentity: profile.visualIdentity,
    voiceIdentity: profile.voiceIdentity,
    personality: profile.personality,
    approvedReferences,
    promptPack,
    negativePrompt: profile.visualIdentity?.negativePrompt || "",
    safety: profile.safety,
    sources: {
      visualIdentity: profile.visualIdentity?.source || "",
      voiceIdentity: profile.voiceIdentity?.source || "",
      personality: profile.personality?.source || ""
    },
    usage: {
      allowedFor: [
        "production_video",
        "avatar_video",
        "talking_avatar",
        "singing_avatar",
        "music_video",
        "visual_prompts",
        "voice_script"
      ],
      requiresApproval: true
    }
  };
}

function saveIdentityPassportPackage(identityPackage) {
  const packages = loadIdentityPassportPackages()
    .filter((item) => item.identityId !== identityPackage.identityId);

  packages.unshift(identityPackage);
  saveIdentityPassportPackages(packages.slice(0, 20));
}

function getLatestIdentityPassportPackage(identityId = "lisa") {
  return loadIdentityPassportPackages().find((item) => item.identityId === identityId) || null;
}

function formatListForTxt(items = []) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "-";
}

function formatObjectForTxt(value) {
  return JSON.stringify(value || {}, null, 2);
}

function formatIdentityPackageTxt(identityPackage) {
  return `Lisa Molis

Identity State
${formatObjectForTxt(identityPackage.identityState)}

Roles
${formatListForTxt(identityPackage.roles)}

Capabilities
${formatListForTxt(identityPackage.capabilities)}

Visual Identity
${formatObjectForTxt(identityPackage.visualIdentity)}

Voice Identity
${formatObjectForTxt(identityPackage.voiceIdentity)}

Personality
${formatObjectForTxt(identityPackage.personality)}

Prompt Pack
${formatObjectForTxt(identityPackage.promptPack)}

Negative Prompt
${identityPackage.negativePrompt || "-"}

Safety
${formatObjectForTxt(identityPackage.safety)}

Sources
${formatObjectForTxt(identityPackage.sources)}

Usage Rules
${formatObjectForTxt(identityPackage.usage)}
`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function downloadIdentityPackageTxt(identityPackage) {
  const blob = new Blob([formatIdentityPackageTxt(identityPackage)], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lisa-identity-passport-package.txt";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function addIdentityPackageHistory(identityPackage) {
  addWorkspaceOpenHistory({
    userText: "Lisa Identity Passport Package создан",
    intent: "digital_identity",
    agent: "Digital Identity Agent",
    workflowId: identityPackage.id,
    status: "package_ready"
  });
}

function renderIdentityPackageBlock(identityPackage) {
  if (!identityPackage) {
    return null;
  }

  const block = document.createElement("section");
  block.className = "identity-package-block";

  const header = document.createElement("div");
  header.className = "identity-package-header";
  const title = document.createElement("h4");
  title.textContent = "Identity Passport Package готов";
  const meta = document.createElement("p");
  meta.textContent = `${identityPackage.name} • ${identityPackage.status} • ${new Date(identityPackage.createdAt).toLocaleString("ru-RU")}`;
  header.append(title, meta);

  const preview = document.createElement("pre");
  preview.className = "identity-package-preview";
  preview.hidden = true;
  preview.textContent = JSON.stringify(identityPackage, null, 2);

  const actions = document.createElement("div");
  actions.className = "identity-package-actions";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "Открыть package";
  openButton.addEventListener("click", () => {
    preview.hidden = !preview.hidden;
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Скопировать package";
  copyButton.addEventListener("click", async () => {
    await copyTextToClipboard(JSON.stringify(identityPackage, null, 2));
    appendMessage("navigator", "Identity Passport Package скопирован. Внешние инструменты не запускались.");
  });

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = "Скачать TXT";
  downloadButton.addEventListener("click", () => {
    downloadIdentityPackageTxt(identityPackage);
    appendMessage("navigator", "TXT export подготовлен локально. Внешние инструменты не запускались.");
  });

  const productionButton = document.createElement("button");
  productionButton.type = "button";
  productionButton.textContent = "Использовать в Production Studio";
  productionButton.addEventListener("click", () => {
    appendMessage("navigator", "Связка будет подключена на следующем этапе. Внешние инструменты не запускались.");
  });

  const avatarButton = document.createElement("button");
  avatarButton.type = "button";
  avatarButton.textContent = "Использовать для Avatar Video";
  avatarButton.addEventListener("click", () => {
    appendMessage("navigator", "Связка будет подключена на следующем этапе. Внешние инструменты не запускались.");
  });

  actions.append(openButton, copyButton, downloadButton, productionButton, avatarButton);
  block.append(header, actions, preview);
  return block;
}

function renderLisaIdentityPassport() {
  if (!identityPassport) {
    return;
  }

  const profile = getActiveIdentity();
  const identityState = profile.identityState || {};
  const capabilities = Array.isArray(profile.capabilities) ? profile.capabilities : [];
  const visualIdentity = profile.visualIdentity || {};
  const voiceIdentity = profile.voiceIdentity || {};
  const personality = profile.personality || {};
  const assets = profile.assets || {};
  const safety = profile.safety || {};
  const primaryReference = visualIdentity.referenceImages?.[0] || assets.referenceImages?.[0] || null;

  identityPassport.innerHTML = "";

  const hero = document.createElement("div");
  hero.className = "identity-lisa-hero";

  const portrait = document.createElement("div");
  portrait.className = "identity-lisa-portrait";
  const portraitInitials = document.createElement("span");
  portraitInitials.textContent = "Lisa";
  const portraitNote = document.createElement("small");
  portraitNote.textContent = primaryReference?.status === "approved_reference"
    ? "approved visual reference"
    : "visual reference placeholder";
  portrait.append(portraitInitials, portraitNote);

  const headingBlock = document.createElement("div");
  headingBlock.className = "identity-lisa-hero-copy";
  const heading = document.createElement("h3");
  heading.textContent = profile.name;
  const subtitle = document.createElement("strong");
  subtitle.textContent = "Цифровая личность ESSA";
  const meta = document.createElement("p");
  meta.textContent = "Присутствие • Голос • Стиль • Видео • Память";
  const stateLine = document.createElement("p");
  stateLine.className = "identity-lisa-state-line";
  stateLine.textContent = `Состояние: ${identityState.label || profile.status}`;
  headingBlock.append(heading, subtitle, meta, stateLine);

  const roles = document.createElement("div");
  roles.className = "identity-passport-roles";
  (profile.roles || []).forEach((role) => {
    const item = document.createElement("span");
    item.textContent = role;
    roles.append(item);
  });

  headingBlock.append(roles);
  hero.append(portrait, headingBlock);

  const stateBlock = document.createElement("section");
  stateBlock.className = "identity-state-block";
  const stateTitle = document.createElement("h4");
  stateTitle.textContent = `✨ Состояние личности: ${identityState.label || "Развивается"}`;
  const stateDescription = document.createElement("p");
  stateDescription.textContent = identityState.description || "Лиса собирает образ, голос, стиль, память и присутствие внутри ESSA.";
  const stateUpdated = document.createElement("span");
  stateUpdated.textContent = identityState.lastUpdated ? `Обновлено: ${identityState.lastUpdated}` : "Обновление будет зафиксировано позже";
  stateBlock.append(stateTitle, stateDescription, stateUpdated);

  const capabilitiesBlock = document.createElement("section");
  capabilitiesBlock.className = "identity-capabilities";
  const capabilitiesTitle = document.createElement("h4");
  capabilitiesTitle.textContent = "Способности";
  const capabilitiesGrid = document.createElement("div");
  capabilitiesGrid.className = "identity-capability-grid";
  capabilities.forEach((capability) => {
    const item = document.createElement("span");
    item.textContent = capability;
    capabilitiesGrid.append(item);
  });
  capabilitiesBlock.append(capabilitiesTitle, capabilitiesGrid);

  const grid = document.createElement("div");
  grid.className = "identity-passport-grid";
  grid.append(
    createPassportCard("Внешность", [
      ["Summary", visualIdentity.summary],
      ["Source", visualIdentity.source],
      ["Reference images", getCount(visualIdentity.referenceImages)],
      ["Primary reference", primaryReference?.title || "metadata placeholder"],
      ["Reference status", primaryReference?.status || "planning"]
    ]),
    createPassportCard("Голос", [
      ["Source", voiceIdentity.source],
      ["Voice samples", getCount(voiceIdentity.voiceSamples)],
      ["Singing samples", getCount(voiceIdentity.singingSamples)],
      ["Provider mode", voiceIdentity.providerMode]
    ]),
    createPassportCard("Характер", [
      ["Tone", personality.tone],
      ["Communication style", personality.communicationStyle],
      ["Source", personality.source]
    ]),
    createPassportCard("Видео / Аватар", [
      ["Avatar videos", getCount(assets.avatarVideos)],
      ["Lipsync briefs", getCount(assets.lipsyncBriefs)],
      ["Status", "planning"]
    ]),
    createPassportCard("Промпты", [
      ["Prompt packs", getCount(assets.promptPacks)],
      ["Negative prompt", visualIdentity.negativePrompt]
    ]),
    createPassportCard("Assets", [
      ["Reference images", getCount(assets.referenceImages)],
      ["Voice samples", getCount(assets.voiceSamples)],
      ["Singing samples", getCount(assets.singingSamples)],
      ["Avatar videos", getCount(assets.avatarVideos)]
    ]),
    createPassportCard("Безопасность", [
      ["Consent required", formatBoolean(safety.consentRequired)],
      ["Personal avatar allowed", formatBoolean(safety.personalAvatarAllowed)],
      ["Notes", safety.notes]
    ]),
    createPassportCard("Sources", [
      ["Visual", visualIdentity.source],
      ["Voice", voiceIdentity.source],
      ["Personality", personality.source]
    ])
  );

  const actions = document.createElement("div");
  actions.className = "identity-passport-actions";

  const buildPackageButton = document.createElement("button");
  buildPackageButton.type = "button";
  buildPackageButton.textContent = "Собрать Identity Passport Package";
  buildPackageButton.addEventListener("click", () => {
    const identityPackage = buildIdentityPassportPackage(profile);
    saveIdentityPassportPackage(identityPackage);
    addIdentityPackageHistory(identityPackage);
    renderLisaIdentityPassport();
    appendMessage("navigator", "Identity Passport Package готов. Внешние инструменты не запускались.");
  });
  actions.append(buildPackageButton);

  [
    "Открыть паспорт Лисы",
    "Добавить reference image",
    "Добавить voice sample",
    "Собрать prompt pack",
    "Создать brief говорящего аватара",
    "Подготовить singing avatar brief",
    "Экспортировать Identity Passport"
  ].forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      appendMessage("navigator", "Функция будет подключена на следующем этапе. Внешние инструменты не запускались.");
    });
    actions.append(button);
  });

  const packageBlock = renderIdentityPackageBlock(getLatestIdentityPassportPackage(profile.id));
  identityPassport.append(hero, stateBlock, capabilitiesBlock, grid, actions);

  if (packageBlock) {
    identityPassport.append(packageBlock);
  }
}

function productDiscoveryElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function renderProductDiscoveryPills(items = [], className = "product-discovery-pill") {
  const list = productDiscoveryElement("div", "product-discovery-pill-list");
  items.filter(Boolean).slice(0, 8).forEach((item) => {
    list.append(productDiscoveryElement("span", className, item));
  });
  return list;
}

function renderProductDiscoveryList(items = [], className = "product-education-step-list") {
  const list = productDiscoveryElement("ol", className);
  items.filter(Boolean).forEach((item) => {
    list.append(productDiscoveryElement("li", "", item));
  });
  return list;
}

function renderAvailabilityBadge(state, freshnessStatus = "CURRENT") {
  const label = freshnessStatus !== "CURRENT"
    ? availabilityBadgeLabels.KNOWLEDGE_REFRESH_REQUIRED
    : availabilityBadgeLabels[state] || availabilityBadgeLabels.UNAVAILABLE;
  const badge = productDiscoveryElement("span", `availability-badge state-${String(state || "unknown").toLowerCase()}`, label);
  badge.dataset.availabilityState = state || "UNKNOWN";
  badge.dataset.freshnessStatus = freshnessStatus || "CURRENT";
  return badge;
}

function renderReadOnlyAction(action, onClick) {
  const button = productDiscoveryElement("button", "product-discovery-action", action.label);
  button.type = "button";
  button.dataset.executionEnabled = "false";
  button.addEventListener("click", () => {
    if (typeof onClick === "function") {
      onClick(action);
    }
  });
  return button;
}

function navigateProductDiscovery(nextState) {
  productDiscoveryNavigationState = {
    ...nextState,
    previousState: nextState.previousState || productDiscoveryNavigationState
  };
  window.location.hash = buildProductDiscoveryHash(productDiscoveryNavigationState);
}

function openPropertyFromProductDiscovery(section = "overview", fixture = "normal") {
  const params = new URLSearchParams();
  if (fixture !== "normal") params.set("fixture", fixture);
  if (section !== "overview") params.set("section", section);
  window.location.hash = params.toString() ? `#property?${params.toString()}` : "#property";
  applyHashRoute();
}

function renderProductDiscoveryBreadcrumb(state = productDiscoveryNavigationState) {
  const nav = productDiscoveryElement("nav", "product-discovery-breadcrumb");
  nav.setAttribute("aria-label", "Product Discovery navigation");

  const overview = renderReadOnlyAction({ label: "ESSA", action: "overview" }, () => {
    navigateProductDiscovery({ mode: productDiscoveryModes.overview, previousState: null });
  });
  nav.append(overview);

  if (state.searchQuery) {
    nav.append(productDiscoveryElement("span", "", "→"));
    nav.append(renderReadOnlyAction({ label: `Поиск: ${state.searchQuery}`, action: "search" }, () => {
      navigateProductDiscovery({
        mode: productDiscoveryModes.searchResults,
        searchQuery: state.searchQuery,
        filters: state.filters,
        previousState: null
      });
    }));
  }

  if (state.selectedProductId) {
    nav.append(productDiscoveryElement("span", "", "→"));
    nav.append(renderReadOnlyAction({ label: productLabels[state.selectedProductId] || state.selectedProductId, action: "product" }, () => {
      navigateProductDiscovery({
        mode: productDiscoveryModes.productDetail,
        selectedProductId: state.selectedProductId,
        searchQuery: state.searchQuery,
        filters: state.filters
      });
    }));
  }

  if (state.selectedCapabilityId) {
    nav.append(productDiscoveryElement("span", "", "→"));
    nav.append(renderReadOnlyAction({ label: state.selectedCapabilityId, action: "capability" }, () => {
      navigateProductDiscovery({
        mode: productDiscoveryModes.capabilityDetail,
        selectedCapabilityId: state.selectedCapabilityId,
        searchQuery: state.searchQuery,
        filters: state.filters
      });
    }));
  }

  if ([productDiscoveryModes.educationDetail, productDiscoveryModes.demoPreview, productDiscoveryModes.executionPreview, productDiscoveryModes.executionPreflight].includes(state.mode)) {
    nav.append(productDiscoveryElement("span", "", "→"));
    nav.append(productDiscoveryElement("strong", "", state.mode === productDiscoveryModes.educationDetail
      ? "Education"
      : state.mode === productDiscoveryModes.demoPreview
      ? "Demo"
      : state.mode === productDiscoveryModes.executionPreflight
      ? "Preflight"
      : "Execution Preview"));
  }

  const back = renderReadOnlyAction({ label: "Назад", action: "back" }, () => {
    navigateProductDiscovery(createProductDiscoveryBackState(productDiscoveryNavigationState));
  });
  back.classList.add("product-discovery-back");
  nav.prepend(back);
  return nav;
}

function renderCapabilityCard(card, options = {}) {
  const article = productDiscoveryElement("article", "capability-card");
  article.dataset.capabilityId = card.capabilityId;
  article.dataset.productId = card.productId || "";
  article.dataset.availabilityState = card.availabilityState;
  article.dataset.freshnessStatus = card.freshnessStatus;
  article.dataset.executionEnabled = "false";

  const header = productDiscoveryElement("div", "capability-card-header");
  const title = productDiscoveryElement("h4", "", card.title);
  const meta = productDiscoveryElement("p", "capability-card-meta", `${card.category} · ${card.costLabel}`);
  const titleWrap = productDiscoveryElement("div");
  titleWrap.append(title, meta);
  header.append(titleWrap, renderAvailabilityBadge(card.availabilityState, card.freshnessStatus));

  const description = productDiscoveryElement("p", "capability-card-description", card.plainLanguageDescription);
  const outcome = productDiscoveryElement("p", "capability-card-outcome", card.userOutcome);
  const examples = renderProductDiscoveryPills(card.exampleRequests, "product-discovery-example");
  const actions = productDiscoveryElement("div", "product-discovery-actions");

  card.uiActions.forEach((action) => {
    actions.append(renderReadOnlyAction(action, () => {
      if (action.action === "education") {
        navigateProductDiscovery({
          mode: productDiscoveryModes.educationDetail,
          selectedProductId: card.productId,
          selectedCapabilityId: card.capabilityId,
          searchQuery: productDiscoveryNavigationState.searchQuery,
          filters: productDiscoveryNavigationState.filters
        });
        return;
      }
      if (action.action === "show_example") {
        navigateProductDiscovery({
          mode: productDiscoveryModes.capabilityDetail,
          selectedProductId: card.productId,
          selectedCapabilityId: card.capabilityId,
          searchQuery: productDiscoveryNavigationState.searchQuery,
          filters: productDiscoveryNavigationState.filters
        });
        return;
      }
      if (action.action === "try_future") {
        navigateProductDiscovery({
          mode: productDiscoveryModes.executionPreview,
          selectedProductId: card.productId,
          selectedCapabilityId: card.capabilityId,
          searchQuery: productDiscoveryNavigationState.searchQuery,
          filters: productDiscoveryNavigationState.filters
        });
        return;
      }
      navigateProductDiscovery({
        mode: productDiscoveryModes.capabilityDetail,
        selectedProductId: card.productId,
        selectedCapabilityId: card.capabilityId,
        searchQuery: productDiscoveryNavigationState.searchQuery,
        filters: productDiscoveryNavigationState.filters
      });
    }));
  });

  article.append(header, description, outcome, examples);

  if (card.freshnessStatus !== "CURRENT") {
    article.append(productDiscoveryElement("p", "stale-warning", "Информация об этой возможности требует обновления."));
  }

  if (card.limitations.length) {
    const limitations = productDiscoveryElement("p", "capability-card-limitations", `Ограничения: ${card.limitations.join(" ")}`);
    article.append(limitations);
  }

  if (options.debugMode) {
    const debug = productDiscoveryElement("details", "product-discovery-debug");
    const summary = productDiscoveryElement("summary", "", "debug");
    const pre = productDiscoveryElement("pre", "", JSON.stringify({
      capabilityId: card.capabilityId,
      productId: card.productId,
      sourceVersion: card.sourceVersion,
      availabilityState: card.availabilityState,
      freshnessStatus: card.freshnessStatus,
      executionPerformed: false,
      providerCalls: 0
    }, null, 2));
    debug.append(summary, pre);
    article.append(debug);
  }

  article.append(actions);
  return article;
}

function renderProductCard(card) {
  const article = productDiscoveryElement("article", "product-card");
  article.dataset.productId = card.productId;
  article.dataset.executionEnabled = "false";

  const header = productDiscoveryElement("div", "product-card-header");
  const title = productDiscoveryElement("h3", "", card.name);
  const summary = productDiscoveryElement("p", "product-card-summary", card.availabilityLabel);
  const text = productDiscoveryElement("p", "product-card-purpose", card.purpose);
  const capabilities = productDiscoveryElement("div", "product-card-capabilities");

  header.append(title);
  card.representativeCapabilities.forEach((capability) => {
    capabilities.append(renderAvailabilityBadge(capability.availabilityState, capability.freshnessStatus));
  });

  const outcomes = renderProductDiscoveryPills(card.whatCanDo, "product-discovery-outcome");
  const example = productDiscoveryElement("p", "product-card-example", `Пример: ${card.exampleUserRequest}`);
  const actions = productDiscoveryElement("div", "product-discovery-actions");

  card.uiActions.forEach((action) => {
    actions.append(renderReadOnlyAction(action, () => {
      if (action.action === "education") {
        const capabilityId = card.representativeCapabilities.find((capability) => capability.educationEligible)?.capabilityId ||
          card.representativeCapabilities[0]?.capabilityId;
        navigateProductDiscovery({
          mode: productDiscoveryModes.educationDetail,
          selectedProductId: card.productId,
          selectedCapabilityId: capabilityId,
          searchQuery: productDiscoveryNavigationState.searchQuery,
          filters: productDiscoveryNavigationState.filters
        });
        return;
      }
      navigateProductDiscovery({
        mode: productDiscoveryModes.productDetail,
        selectedProductId: card.productId,
        searchQuery: productDiscoveryNavigationState.searchQuery,
        filters: productDiscoveryNavigationState.filters
      });
    }));
  });

  if (card.productId === productIds.property) {
    actions.append(renderReadOnlyAction({ label: "ОТКРЫТЬ PROPERTY PASSPORT", action: "open_property_surface" }, () => {
      openPropertyFromProductDiscovery("overview", "normal");
    }));
  }

  article.append(header, summary, text, capabilities, outcomes, example, actions);
  return article;
}

function renderProductDiscoveryShell() {
  if (!productDiscoveryPanel) return;

  productDiscoveryNavigationState = parseProductDiscoveryHash(window.location.hash || "#product-discovery", productDiscoveryNavigationState);
  productDiscoveryPanel.innerHTML = "";
  const state = buildProductDiscoveryUiState({ maxProducts: 8 });
  const header = productDiscoveryElement("div", "module-section-header product-discovery-header");
  const title = productDiscoveryElement("span", "", "ESSA Product Discovery");
  const subtitle = productDiscoveryElement("p", "", "Продукты, возможности, доступность и обучение Lisa из проверенного Product Knowledge. Execution отключён.");
  header.append(title, subtitle);

  const controls = productDiscoveryElement("section", "product-discovery-controls");
  const form = productDiscoveryElement("form", "product-discovery-search");
  const input = productDiscoveryElement("input");
  input.type = "search";
  input.name = "need";
  input.placeholder = "Что вы хотите сделать?";
  input.value = productDiscoveryNavigationState.searchQuery || state.defaultQuery;
  input.setAttribute("aria-label", "Что вы хотите сделать?");
  const submit = productDiscoveryElement("button", "", "Найти");
  submit.type = "submit";
  form.append(input, submit);

  const filters = productDiscoveryElement("div", "product-discovery-filters");
  const availability = productDiscoveryElement("select");
  availability.setAttribute("aria-label", "Фильтр по доступности");
  [
    ["", "Все статусы"],
    [capabilityActivationStates.localReady, "Работает локально"],
    [capabilityActivationStates.readyForPayment, "Нужна оплата"],
    [capabilityActivationStates.architectureOnly, "В разработке"]
  ].forEach(([value, label]) => {
    const option = productDiscoveryElement("option", "", label);
    option.value = value;
    availability.append(option);
  });
  const debugToggleLabel = productDiscoveryElement("label", "product-discovery-debug-toggle");
  const debugToggle = productDiscoveryElement("input");
  debugToggle.type = "checkbox";
  debugToggle.checked = Boolean(productDiscoveryNavigationState.debugEnabled);
  debugToggleLabel.append(debugToggle, document.createTextNode("Debug"));
  filters.append(availability, debugToggleLabel);
  availability.value = productDiscoveryNavigationState.filters?.availabilityState || "";

  controls.append(form, renderProductDiscoveryPills(state.exampleQueries, "product-discovery-example-query"), filters);

  const content = productDiscoveryElement("section", "product-discovery-content");
  const education = productDiscoveryElement("section", "lisa-education-panel");
  education.id = "lisa-education-panel";

  productDiscoveryPanel.append(header, controls, content, education);

  function renderOverview() {
    const overview = buildProductOverviewViewModel({ maxProducts: 8 });
    content.innerHTML = "";
    const meta = productDiscoveryElement("div", "product-discovery-meta");
    meta.textContent = `Overview: ${overview.products.length} продуктов · каталог ${overview.debug.totalCapabilityCount} возможностей · executionPerformed=false · providerCalls=0`;
    const grid = productDiscoveryElement("div", "product-card-grid");
    overview.products.forEach((product) => grid.append(renderProductCard(product)));
    content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), meta, grid);
  }

  function renderSearch(query) {
    const result = buildProductDiscoverySearchViewModel(query, { maxResults: 5 });
    const cards = availability.value
      ? filterCapabilityCards(result.capabilityCards, { availabilityState: availability.value })
      : result.capabilityCards;
    content.innerHTML = "";
    const meta = productDiscoveryElement("div", "product-discovery-meta");
    meta.textContent = `${result.response.uiMetadata?.cardType || "search"} · результатов ${cards.length} · bounded ${result.boundedContextMetadata?.selectedCount || 0}/${result.boundedContextMetadata?.candidateCount || 0} · executionPerformed=false · providerCalls=0`;
    const products = productDiscoveryElement("div", "product-card-grid compact");
    result.matchedProducts.forEach((product) => products.append(renderProductCard(product)));
    const grid = productDiscoveryElement("div", "capability-card-grid");
    cards.forEach((card) => grid.append(renderCapabilityCard(card, { debugMode: debugToggle.checked })));

    if (result.response.freshnessStatus !== "CURRENT") {
      content.append(productDiscoveryElement("p", "stale-warning", "Информация об этой возможности требует обновления."));
    }

    content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), meta);
    if (result.matchedProducts.length) content.append(products);
    content.append(grid);
  }

  function renderNotFound() {
    content.innerHTML = "";
    const block = productDiscoveryElement("section", "capability-detail product-discovery-not-found");
    block.append(
      productDiscoveryElement("h3", "", "Ничего не найдено"),
      productDiscoveryElement("p", "", "Такого продукта или возможности нет в текущем Product Knowledge. ESSA не будет придумывать недостающую возможность."),
      renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState),
      renderReadOnlyAction({ label: "К Product Discovery", action: "overview" }, () => {
        navigateProductDiscovery({ mode: productDiscoveryModes.overview, previousState: null });
      })
    );
    content.append(block);
  }

  function renderByState() {
    const routeState = productDiscoveryNavigationState;
    input.value = routeState.searchQuery || state.defaultQuery;
    availability.value = routeState.filters?.availabilityState || "";
    debugToggle.checked = Boolean(routeState.debugEnabled);

    if (routeState.mode === productDiscoveryModes.overview) {
      renderOverview();
      renderLisaEducation("BOOK_COVER");
      return;
    }
    if (routeState.mode === productDiscoveryModes.searchResults) {
      renderSearch(routeState.searchQuery || input.value || state.defaultQuery);
      return;
    }
    if (routeState.mode === productDiscoveryModes.productDetail) {
      renderProductDetail(routeState.selectedProductId);
      return;
    }
    if (routeState.mode === productDiscoveryModes.capabilityDetail) {
      renderCapabilityDetail(routeState.selectedCapabilityId, routeState.selectedProductId);
      return;
    }
    if (routeState.mode === productDiscoveryModes.educationDetail) {
      renderEducationDetail(routeState.selectedCapabilityId, routeState.selectedProductId);
      return;
    }
    if (routeState.mode === productDiscoveryModes.demoPreview) {
      renderDemoPreview(routeState.selectedCapabilityId, routeState.selectedProductId);
      return;
    }
    if (routeState.mode === productDiscoveryModes.executionPreview) {
      renderExecutionPreview(routeState.selectedCapabilityId, routeState.selectedProductId);
      return;
    }
    if (routeState.mode === productDiscoveryModes.executionPreflight) {
      renderExecutionPreflight(routeState.selectedCapabilityId, routeState.selectedProductId);
      return;
    }
    renderNotFound();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim() || "Что умеет ESSA?";
    if (query.toLowerCase().includes("что умеет")) {
      navigateProductDiscovery({ mode: productDiscoveryModes.overview, previousState: null });
      return;
    }
    navigateProductDiscovery({
      mode: productDiscoveryModes.searchResults,
      searchQuery: query,
      filters: { availabilityState: availability.value || "" },
      debugEnabled: debugToggle.checked,
      previousState: productDiscoveryNavigationState
    });
  });

  availability.addEventListener("change", () => {
    const query = input.value.trim() || "Что умеет ESSA?";
    navigateProductDiscovery({
      mode: query.toLowerCase().includes("что умеет") ? productDiscoveryModes.overview : productDiscoveryModes.searchResults,
      searchQuery: query.toLowerCase().includes("что умеет") ? "" : query,
      filters: { availabilityState: availability.value || "" },
      debugEnabled: debugToggle.checked,
      previousState: productDiscoveryNavigationState
    });
  });
  debugToggle.addEventListener("change", () => {
    const query = input.value.trim() || "Что умеет ESSA?";
    navigateProductDiscovery({
      mode: query.toLowerCase().includes("что умеет") ? productDiscoveryModes.overview : productDiscoveryModes.searchResults,
      searchQuery: query.toLowerCase().includes("что умеет") ? "" : query,
      filters: { availabilityState: availability.value || "" },
      debugEnabled: debugToggle.checked,
      previousState: productDiscoveryNavigationState
    });
  });

  productDiscoveryPanel.querySelectorAll(".product-discovery-example-query").forEach((pill) => {
    pill.addEventListener("click", () => {
      input.value = pill.textContent;
      navigateProductDiscovery({
        mode: productDiscoveryModes.searchResults,
        searchQuery: pill.textContent,
        filters: { availabilityState: availability.value || "" },
        debugEnabled: debugToggle.checked,
        previousState: productDiscoveryNavigationState
      });
    });
  });

  renderByState();
}

function renderProductDetail(productId) {
  if (!productDiscoveryPanel) return;
  const content = productDiscoveryPanel.querySelector(".product-discovery-content");
  if (!content) return;
  const detail = buildProductDetailViewModel(productId);
  if (!detail?.product || (!productLabels[productId] && detail.capabilities.length === 0)) {
    renderProductDiscoveryNotFound(`Product not found: ${productId}`);
    return;
  }
  content.innerHTML = "";

  const header = productDiscoveryElement("div", "product-detail-header");
  const title = productDiscoveryElement("h3", "", detail.product.name);
  const purpose = productDiscoveryElement("p", "", detail.product.purpose);
  const summary = productDiscoveryElement("p", "product-discovery-meta", detail.product.availabilityLabel);
  header.append(title, purpose, summary);

  const distribution = renderProductDiscoveryPills([
    `${detail.availabilitySummary.localReadyCount} локально`,
    `${detail.availabilitySummary.readyForActivationCount} к активации`,
    `${detail.availabilitySummary.paymentRequiredCount} нужна оплата`,
    `${detail.availabilitySummary.architectureOnlyCount} в разработке`,
    `${detail.availabilitySummary.staleCount} требует обновления`
  ], "product-discovery-outcome");

  const journeys = productDiscoveryElement("div", "product-detail-journeys");
  journeys.append(productDiscoveryElement("h4", "", "Примеры запросов"));
  journeys.append(renderProductDiscoveryPills(detail.exampleUserJourneys, "product-discovery-example"));
  if (productId === productIds.property) {
    const propertyEntry = productDiscoveryElement("section", "capability-detail-block product-property-handoff");
    propertyEntry.append(
      productDiscoveryElement("h4", "", "Open ESSA Property"),
      productDiscoveryElement("p", "", "Откройте read-only Property Passport demo: факты, freshness, источники, риски и Lisa explanation. Marketplace/live execution отключены."),
      renderReadOnlyAction({ label: "Открыть Property Passport", action: "open_property_surface" }, () => {
        openPropertyFromProductDiscovery("overview", "normal");
      }),
      renderReadOnlyAction({ label: "ADD PROPERTY TO ESSA", action: "open_add_property_guided_intake" }, () => {
        window.location.hash = "#add-property";
      })
    );
    journeys.append(propertyEntry);
  }

  const grid = productDiscoveryElement("div", "capability-card-grid");
  detail.capabilities.forEach((card) => grid.append(renderCapabilityCard(card)));

  content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), header, distribution, journeys, grid);
}

function renderCapabilityDetail(capabilityId, productId = null) {
  if (!productDiscoveryPanel) return;
  const content = productDiscoveryPanel.querySelector(".product-discovery-content");
  if (!content) return;
  const detail = buildCapabilityDetailViewModel(capabilityId, productId);
  if (!detail) {
    renderProductDiscoveryNotFound(`Capability not found: ${capabilityId}`);
    return;
  }
  const educationUi = buildProductEducationUiViewModel({
    capabilityId,
    productId: productId || detail?.card?.productId,
    maxContentAngles: 5
  });

  content.innerHTML = "";
  const article = productDiscoveryElement("article", "capability-detail");
  const title = productDiscoveryElement("h3", "", detail.card.title);
  const badge = renderAvailabilityBadge(detail.card.availabilityState, detail.card.freshnessStatus);
  const fields = [
    ["Что это?", detail.explanation.whatItIs],
    ["Для кого?", detail.explanation.forWhom],
    ["Какую проблему решает?", educationUi.userProblem],
    ["Что я получу?", educationUi.expectedOutcome || detail.explanation.whatCanDo],
    ["Как это работает?", educationUi.educationStrategy.demonstrationAngle || detail.explanation.howItWorks],
    ["Пример запроса", detail.explanation.example],
    ["Что может показать Лиса?", educationUi.lisaGuide.canExplain.join(" · ")],
    ["Что доступно сейчас?", educationUi.availabilityExplanation],
    ["Что пока недоступно?", detail.card.activationRequirement],
    ["Нужна ли будущая активация/оплата?", educationUi.ctaPolicy.CTAType]
  ];
  const grid = productDiscoveryElement("div", "capability-detail-grid");
  fields.forEach(([label, value]) => {
    const block = productDiscoveryElement("section", "capability-detail-block");
    block.append(productDiscoveryElement("h4", "", label), productDiscoveryElement("p", "", value || "—"));
    grid.append(block);
  });

  const usage = productDiscoveryElement("section", "capability-detail-block product-education-usage");
  usage.append(
    productDiscoveryElement("h4", "", "Как этим пользоваться"),
    productDiscoveryElement("p", "", educationUi.examplePrompts[0] || "Опишите, что хотите получить."),
    renderProductDiscoveryList(educationUi.usageSteps)
  );

  const angles = productDiscoveryElement("section", "capability-detail-block product-content-angles");
  const angleList = renderProductDiscoveryPills(educationUi.contentAngles.map((angle) => angle.hookConcept), "product-discovery-example");
  angles.append(
    productDiscoveryElement("h4", "", "Идеи объяснения"),
    angleList
  );
  if (educationUi.contentAnglesCanExpand) {
    const more = renderReadOnlyAction({ label: "Показать ещё", action: "expand_angles" }, () => {
      angleList.replaceWith(renderProductDiscoveryPills(
        buildProductEducationUiViewModel({
          capabilityId,
          productId: productId || detail.card.productId,
          maxContentAngles: 10
        }).contentAngles.map((angle) => angle.hookConcept),
        "product-discovery-example"
      ));
      more.disabled = true;
      more.textContent = "Показано больше";
    });
    angles.append(
      productDiscoveryElement("p", "capability-card-meta", "Показаны 3-5 основных углов. Остальные доступны как локальная metadata, без генерации постов."),
      more
    );
  }

  const demo = productDiscoveryElement("section", "capability-detail-block product-demo-preview");
  demo.append(
    productDiscoveryElement("h4", "", "Как это будет выглядеть"),
    productDiscoveryElement("p", "", educationUi.demoPlan.demoStatus === "PLANNED_DEMO_NOT_EXECUTABLE"
      ? "Демо пока в подготовке."
      : "Демо доступно только как проверенный локальный сценарий; в Phase 21H запуск отключён."),
    renderProductDiscoveryPills([
      `Сценарий: ${educationUi.demoPlan.userScenario || educationUi.userProblem}`,
      `Вход: ${educationUi.demoPlan.inputArtifactType}`,
      `Результат: ${educationUi.demoPlan.expectedOutputArtifactType}`,
      `Статус: ${educationUi.demoPlan.demoStatus}`
    ], "product-discovery-outcome"),
    renderProductDiscoveryList(educationUi.demoPlan.stepSequence.slice(0, 6), "product-education-step-list compact")
  );

  const journey = productDiscoveryElement("section", "capability-detail-block product-journey-preview");
  journey.append(
    productDiscoveryElement("h4", "", "Пример пути"),
    productDiscoveryElement("p", "", educationUi.exampleJourney?.userScenario || "Связанный путь появится для подходящих продуктов."),
    renderProductDiscoveryPills(educationUi.exampleJourney?.capabilitySequence || [], "product-discovery-outcome")
  );

  const growth = productDiscoveryElement("section", "capability-detail-block product-education-growth");
  growth.append(
    productDiscoveryElement("h4", "", "Product Education & Growth preview"),
    renderProductDiscoveryPills(educationUi.channelEducationPreview.map((item) => `${item.channel}: ${item.CTAType}`), "product-discovery-outcome"),
    productDiscoveryElement("p", "", "Это только metadata для будущих Reels, TikTok, Shorts, YouTube, Telegram, ESSA in-app, Website, Email, Creator Network и Advertising. Публикация и dispatch отключены.")
  );

  const safety = productDiscoveryElement("section", "capability-detail-block product-claim-safety");
  safety.append(
    productDiscoveryElement("h4", "", "Claim / freshness / context"),
    productDiscoveryElement("p", "", `Claim probe: ${educationUi.claimPolicy.falseCurrentClaimProbe.status} · Freshness: ${educationUi.freshnessStatus} · Bounded context: ${educationUi.contextEconomy.selectedItems} items / ${educationUi.contextEconomy.chars} chars`)
  );

  const routeActions = productDiscoveryElement("div", "product-discovery-actions");
  routeActions.append(
    renderReadOnlyAction({ label: "Открыть Lisa Education", action: "education_route" }, () => {
      navigateProductDiscovery({
        mode: productDiscoveryModes.educationDetail,
        selectedProductId: productId || detail.card.productId,
        selectedCapabilityId: capabilityId,
        searchQuery: productDiscoveryNavigationState.searchQuery,
        filters: productDiscoveryNavigationState.filters
      });
    }),
    renderReadOnlyAction({ label: "Открыть Demo Preview", action: "demo_route" }, () => {
      navigateProductDiscovery({
        mode: productDiscoveryModes.demoPreview,
        selectedProductId: productId || detail.card.productId,
        selectedCapabilityId: capabilityId,
        searchQuery: productDiscoveryNavigationState.searchQuery,
        filters: productDiscoveryNavigationState.filters
      });
    }),
    renderReadOnlyAction({ label: "Подготовить план", action: "execution_preview_route" }, () => {
      navigateProductDiscovery({
        mode: productDiscoveryModes.executionPreview,
        selectedProductId: productId || detail.card.productId,
        selectedCapabilityId: capabilityId,
        searchQuery: productDiscoveryNavigationState.searchQuery,
        filters: productDiscoveryNavigationState.filters
      });
    })
  );
  if ((productId || detail.card.productId) === productIds.property || capabilityId?.startsWith("PROPERTY_")) {
    routeActions.append(
      renderReadOnlyAction({ label: "Открыть Property Passport", action: "open_property_surface" }, () => {
        openPropertyFromProductDiscovery("passport", "normal");
      })
    );
  }

  article.append(title, badge, routeActions, grid, usage, angles, demo, journey, growth, safety, renderCapabilityCard(detail.card, { debugMode: true }));
  content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), article);
  renderLisaEducation(capabilityId, productId || detail.card.productId);
}

function renderEducationDetail(capabilityId, productId = null) {
  if (!productDiscoveryPanel) return;
  const content = productDiscoveryPanel.querySelector(".product-discovery-content");
  if (!content) return;
  const detail = buildCapabilityDetailViewModel(capabilityId, productId);
  if (!detail) {
    renderProductDiscoveryNotFound(`Education not found: ${capabilityId}`);
    return;
  }
  const educationUi = buildProductEducationUiViewModel({
    capabilityId,
    productId: productId || detail.card.productId,
    maxContentAngles: 8
  });
  content.innerHTML = "";
  const article = productDiscoveryElement("article", "capability-detail education-route-detail");
  article.append(
    productDiscoveryElement("h3", "", `Lisa Education: ${educationUi.title}`),
    renderAvailabilityBadge(educationUi.availability, educationUi.freshnessStatus),
    productDiscoveryElement("p", "", educationUi.plainLanguageDescription),
    productDiscoveryElement("section", "capability-detail-block product-education-usage")
  );
  const usage = article.querySelector(".product-education-usage");
  usage.append(
    productDiscoveryElement("h4", "", "Как Лиса объясняет это"),
    renderProductDiscoveryList(educationUi.usageSteps),
    renderProductDiscoveryPills(educationUi.contentAngles.map((angle) => angle.hookConcept), "product-discovery-example")
  );
  content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), article);
  renderLisaEducation(capabilityId, productId || detail.card.productId);
}

function renderDemoPreview(capabilityId, productId = null) {
  if (!productDiscoveryPanel) return;
  const content = productDiscoveryPanel.querySelector(".product-discovery-content");
  if (!content) return;
  const detail = buildCapabilityDetailViewModel(capabilityId, productId);
  if (!detail) {
    renderProductDiscoveryNotFound(`Demo not found: ${capabilityId}`);
    return;
  }
  const educationUi = buildProductEducationUiViewModel({
    capabilityId,
    productId: productId || detail.card.productId,
    maxContentAngles: 5
  });
  content.innerHTML = "";
  const article = productDiscoveryElement("article", "capability-detail demo-route-detail");
  article.append(
    productDiscoveryElement("h3", "", `Demo Preview: ${educationUi.title}`),
    renderAvailabilityBadge(educationUi.availability, educationUi.freshnessStatus),
    productDiscoveryElement("p", "", educationUi.demoPlan.demoStatus === "PLANNED_DEMO_NOT_EXECUTABLE"
      ? "Демо пока в подготовке. Кнопки запуска нет."
      : "Демо описано как read-only план; запуск отключён в Phase 21I."),
    renderProductDiscoveryPills([
      `Сценарий: ${educationUi.demoPlan.userScenario || educationUi.userProblem}`,
      `Вход: ${educationUi.demoPlan.inputArtifactType}`,
      `Результат: ${educationUi.demoPlan.expectedOutputArtifactType}`,
      `Статус: ${educationUi.demoPlan.demoStatus}`,
      `demoExecutionEnabled=${educationUi.demoPlan.executionEnabled}`
    ], "product-discovery-outcome"),
    renderProductDiscoveryList(educationUi.demoPlan.stepSequence, "product-education-step-list")
  );
  content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), article);
  renderLisaEducation(capabilityId, productId || detail.card.productId);
}

function renderExecutionPreview(capabilityId, productId = null) {
  if (!productDiscoveryPanel) return;
  const content = productDiscoveryPanel.querySelector(".product-discovery-content");
  if (!content) return;
  const detail = buildCapabilityDetailViewModel(capabilityId, productId);
  if (!detail) {
    renderProductDiscoveryNotFound(`Execution preview not found: ${capabilityId}`);
    return;
  }
  const preview = buildExecutionPreviewViewModel({
    userNeed: detail.card.exampleRequests[0] || detail.card.title,
    productId: productId || detail.card.productId,
    primaryCapabilityId: capabilityId,
    sourceDiscoveryContext: {
      route: window.location.hash,
      searchQuery: productDiscoveryNavigationState.searchQuery,
      selectedProductId: productDiscoveryNavigationState.selectedProductId
    }
  });

  content.innerHTML = "";
  const article = productDiscoveryElement("article", "capability-detail execution-preview-detail");
  article.dataset.executionEnabled = String(preview.executionEnabled);
  article.dataset.providerExecutionEnabled = String(preview.providerExecutionEnabled);
  article.dataset.toolExecutionEnabled = String(preview.toolExecutionEnabled);
  article.dataset.paymentEnabled = String(preview.paymentEnabled);
  article.dataset.publishEnabled = String(preview.publishEnabled);
  article.dataset.deployEnabled = String(preview.deployEnabled);

  const title = productDiscoveryElement("h3", "", `Execution Preview: ${preview.primaryCapability.label}`);
  const status = renderAvailabilityBadge(preview.primaryCapability.availabilityState);
  const meta = productDiscoveryElement(
    "p",
    "product-discovery-meta",
    `${preview.product.label} · ${preview.executionStatus} · executionEnabled=false · providerCalls=0`
  );

  function section(titleText, body) {
    const block = productDiscoveryElement("section", "capability-detail-block execution-preview-block");
    block.append(productDiscoveryElement("h4", "", titleText));
    if (Array.isArray(body)) {
      block.append(renderProductDiscoveryList(body.length ? body : ["—"], "product-education-step-list compact"));
    } else {
      block.append(productDiscoveryElement("p", "", body || "—"));
    }
    return block;
  }

  const inputItems = preview.inputRequirements.map((requirement) =>
    `${requirement.required ? "Нужно" : "Опционально"}: ${requirement.label} · ${requirement.currentStatus}`
  );
  const localItems = preview.localSteps.map((step) => `${step.label}: ${step.userFacingRequirement}`);
  const providerItems = preview.providerDependentSteps.map((step) => `${step.label}: ${step.userFacingRequirement}`);
  const approvalItems = [
    ...preview.approvalPlan.approvalPoints,
    preview.approvalPlan.costApprovalRequired ? "Подтвердить возможную стоимость/провайдера" : null,
    preview.approvalPlan.userInputRequired ? "Предоставить недостающие входные данные" : null
  ].filter(Boolean);

  const disabled = productDiscoveryElement("button", "product-discovery-action execution-preview-disabled", "Запуск отключён в Phase 21J");
  disabled.type = "button";
  disabled.disabled = true;
  disabled.dataset.executionEnabled = "false";
  disabled.dataset.disabledReason = preview.disabledMessage;
  disabled.title = preview.disabledMessage;

  const safeLocalCapabilityIds = ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"];
  const safeLocalButton = productDiscoveryElement("button", "product-discovery-action safe-local-handoff", "Открыть Execution Workspace");
  safeLocalButton.type = "button";
  safeLocalButton.dataset.executionEnabled = "safe_local_workspace";
  safeLocalButton.hidden = !safeLocalCapabilityIds.includes(capabilityId);
  safeLocalButton.addEventListener("click", () => {
    window.location.hash = `#execution/${encodeURIComponent(capabilityId)}`;
    applyHashRoute();
  });

  const preflightButton = productDiscoveryElement("button", "product-discovery-action execution-preview-preflight", "Подготовить к запуску");
  preflightButton.type = "button";
  preflightButton.dataset.executionEnabled = "false";
  preflightButton.addEventListener("click", () => {
    navigateProductDiscovery({
      mode: productDiscoveryModes.executionPreflight,
      selectedProductId: productId || detail.card.productId,
      selectedCapabilityId: capabilityId,
      searchQuery: productDiscoveryNavigationState.searchQuery,
      filters: productDiscoveryNavigationState.filters,
      debugEnabled: productDiscoveryNavigationState.debugEnabled,
      previousState: productDiscoveryNavigationState
    });
  });

  const debug = productDiscoveryElement("details", "product-discovery-debug execution-preview-debug");
  const summary = productDiscoveryElement("summary", "", "debug");
  const pre = productDiscoveryElement("pre", "", JSON.stringify({
    requestId: preview.requestId,
    primaryCapability: preview.primaryCapability.capabilityId,
    requiredCapabilities: preview.requiredCapabilities,
    optionalCapabilities: preview.optionalCapabilities,
    intelligence: preview.intelligenceSteps[0]?.debugDecision,
    guards: {
      executionEnabled: preview.executionEnabled,
      providerExecutionEnabled: preview.providerExecutionEnabled,
      toolExecutionEnabled: preview.toolExecutionEnabled,
      paymentEnabled: preview.paymentEnabled,
      publishEnabled: preview.publishEnabled,
      deployEnabled: preview.deployEnabled
    },
    futureGatewayResult: preview.futureExecutionIntent.gatewayResultIfExecutedNow,
    providerCalls: preview.providerCalls,
    externalModelCalls: preview.externalModelCalls
  }, null, 2));
  debug.append(summary, pre);

  article.append(
    title,
    status,
    meta,
    section("Что вы хотите получить", preview.userFacingSections.desiredOutcome),
    section("Что понадобится", inputItems),
    section("Что ESSA сделает", preview.userFacingSections.whatEssaWillDo),
    section("Что можно сделать локально", localItems),
    section("Что потребует внешнего сервиса", providerItems.length ? providerItems : ["В этом preview внешний сервис не активирован."]),
    section("Что нужно от вас", approvalItems.length ? approvalItems : ["Подтвердить будущий запуск перед выполнением."]),
    section("Что получится", preview.expectedArtifacts),
    section("Как ESSA проверит результат", preview.verificationPlan),
    section("Потребуется ли оплата/активация", [
      `Стоимость: ${preview.estimatedCostClass}`,
      `Точная цена: ${preview.exactPriceStatus}`,
      ...preview.activationRequirements
    ]),
    section("Что нужно подтвердить", preview.safetyNotes),
    safeLocalButton,
    preflightButton,
    disabled,
    debug
  );

  content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), article);
  renderLisaEducation(capabilityId, productId || detail.card.productId);
}

function renderExecutionPreflight(capabilityId, productId = null) {
  if (!productDiscoveryPanel) return;
  const content = productDiscoveryPanel.querySelector(".product-discovery-content");
  if (!content) return;
  const detail = buildCapabilityDetailViewModel(capabilityId, productId);
  if (!detail) {
    renderProductDiscoveryNotFound(`Execution preflight not found: ${capabilityId}`);
    return;
  }
  const selectedProductId = productId || detail.card.productId;
  const fixtureInputs = {
    WEBSITE_GENERATE: {
      business_description: "Restaurant in Batumi",
      site_goal: "Bookings",
      pages: "Home, menu, booking"
    },
    VIDEO_EDIT: {
      source_video: "local-demo.mp4",
      video_goal: "Promo",
      target_format: "Reels"
    },
    VIDEO_TRIM: {
      source_video: "local-demo.mp4",
      time_range: "00:01-00:03"
    },
    MEDIA_PROBE: {
      source_media: "local-demo.mp4"
    },
    VIDEO_RESIZE: {
      source_video: "local-demo.mp4",
      target_profile: "VIDEO_RESIZE_320x180"
    },
    AUDIO_EXTRACT: {
      source_media: "local-demo.mp4",
      target_profile: "AUDIO_WAV_STANDARD"
    },
    BUSINESS_DISCOVERY: {
      target_market: "restaurants",
      geography: "Batumi",
      industries: "hospitality",
      public_sources: "local fixture only",
      data_policy: "PUBLIC_BUSINESS_DATA_ONLY"
    }
  };
  const options = {
    providedInputs: fixtureInputs[capabilityId] || {},
    route: window.location.hash,
    contextBudget: { maxItems: 6, maxChars: 1800 }
  };
  if (window.location.hash.includes("stale=1")) {
    options.sourceVersionOverride = "0.0.1";
  }
  const view = buildExecutionPreflightViewModel({
    userNeed: detail.card.exampleRequests[0] || detail.card.title,
    productId: selectedProductId,
    primaryCapabilityId: capabilityId,
    sourceDiscoveryContext: {
      route: window.location.hash,
      searchQuery: productDiscoveryNavigationState.searchQuery,
      selectedProductId
    }
  }, options);

  content.innerHTML = "";
  const article = productDiscoveryElement("article", "capability-detail execution-preflight-detail");
  article.dataset.executionEnabled = String(view.executionEnabled);
  article.dataset.toolExecutionEnabled = String(view.toolExecutionEnabled);
  article.dataset.providerExecutionEnabled = String(view.providerExecutionEnabled);
  article.dataset.paymentEnabled = String(view.paymentEnabled);
  article.dataset.publishEnabled = String(view.publishEnabled);
  article.dataset.deployEnabled = String(view.deployEnabled);
  article.dataset.providerCalls = String(view.providerCalls);
  article.dataset.externalModelCalls = String(view.externalModelCalls);

  const title = productDiscoveryElement("h3", "", `Preflight: ${view.primaryCapability.label}`);
  const status = productDiscoveryElement("span", `preflight-status ${view.statusSeverity.toLowerCase()}`, view.statusLabel);
  const meta = productDiscoveryElement("p", "product-discovery-meta", `${view.primaryCapability.capabilityId} · ${view.executionClassLabel} · executionEnabled=false · providerCalls=0`);

  function section(titleText, body, className = "") {
    const block = productDiscoveryElement("section", `capability-detail-block execution-preflight-block ${className}`.trim());
    block.append(productDiscoveryElement("h4", "", titleText));
    if (Array.isArray(body)) {
      block.append(renderProductDiscoveryList(body.length ? body : ["—"], "product-education-step-list compact"));
    } else {
      block.append(productDiscoveryElement("p", "", body || "—"));
    }
    return block;
  }

  const summary = productDiscoveryElement("section", "preflight-readiness-summary");
  [
    ["ГОТОВО", view.readiness.ready],
    ["НУЖНО ОТ ВАС", view.readiness.neededFromUser],
    ["ТРЕБУЕТ ПОДКЛЮЧЕНИЯ", view.readiness.requiresActivation],
    ["ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ", view.readiness.requiresApproval],
    ["БЛОКИРОВКИ", view.readiness.blockers]
  ].forEach(([label, value]) => {
    const item = productDiscoveryElement("div", "preflight-readiness-item");
    item.append(productDiscoveryElement("strong", "", String(value)), productDiscoveryElement("span", "", label));
    summary.append(item);
  });

  const inputItems = [...view.requiredInputs, ...view.optionalInputs].map((item) =>
    `${item.statusLabel}: ${item.label} · ${item.type} · ${item.whyNeeded} · Формат: ${item.acceptedFormatLabel} · Privacy: ${item.privacyClass}`
  );
  const missingItems = view.missingInputs.map((item) => `${item.label}: ${item.statusLabel}`);
  const dependencyItems = view.capabilityDependencies.map((item) => `${item.order}. ${item.label}`);
  const localItems = view.localSteps.map((item) => `${item.order}. ${item.label}: ${item.description}`);
  const intelligenceItems = view.intelligenceSteps.map((item) => `${item.order}. ${item.label}: ${item.description}`);
  const providerItems = view.providerSteps.map((item) => `${item.order}. ${item.label}: ${item.description}`);
  const blockedItems = view.blockedSteps.map((item) => `${item.order}. ${item.label}: ${item.description}`);
  const approvalItems = view.approvals.map((item) => `${item.type}: ${item.status} · autoApproved=${item.autoApproved}`);
  const blockerItems = view.blockers.map((item) => `${item.severity}: ${item.label}`);
  const warningItems = view.warnings.map((item) => `${item.severity}: ${item.label}`);

  const debug = productDiscoveryElement("details", "product-discovery-debug execution-preflight-debug");
  debug.setAttribute("aria-expanded", "false");
  debug.addEventListener("toggle", () => {
    debug.setAttribute("aria-expanded", String(debug.open));
  });
  debug.append(
    productDiscoveryElement("summary", "", "advanced / debug"),
    productDiscoveryElement("pre", "", JSON.stringify({
      intentId: view.intentId,
      traceId: view.traceId,
      productId: view.product.productId,
      capabilityId: view.primaryCapability.capabilityId,
      sourceVersions: view.sourceVersions,
      freshness: view.freshness,
      auditSummary: view.auditSummary,
      preflight: view.preflight,
      providerSteps: view.providerSteps,
      flags: {
        executionEnabled: view.executionEnabled,
        toolExecutionEnabled: view.toolExecutionEnabled,
        providerExecutionEnabled: view.providerExecutionEnabled,
        paymentEnabled: view.paymentEnabled,
        publishEnabled: view.publishEnabled,
        deployEnabled: view.deployEnabled
      }
    }, null, 2))
  );

  const disabled = productDiscoveryElement("button", "product-discovery-action execution-preview-disabled", "Запуск отключён: preflight only");
  disabled.type = "button";
  disabled.disabled = true;
  disabled.dataset.executionEnabled = "false";

  article.append(
    title,
    status,
    meta,
    summary,
    section("Что произойдет", view.expectedOutcome || view.userNeed),
    section("Что нужно от вас", missingItems.length ? missingItems : ["Обязательные недостающие данные не обнаружены."]),
    section("Входные данные", inputItems),
    section("Порядок работы", dependencyItems),
    section("Работает внутри ESSA / локально", localItems),
    section("Потребуется интеллектуальный анализ", intelligenceItems),
    section("Потребуется внешний сервис", providerItems),
    section("Не готово / заблокировано", blockedItems),
    section("Подключение сервисов", view.activationRequirements.map((item) => item.label)),
    section("Стоимость", [`${view.costPreview.label} · exactPriceKnown=${view.costPreview.exactPriceKnown}`]),
    section("Что нужно подтвердить", approvalItems.length ? approvalItems : ["Перед реальным запуском понадобится явное подтверждение."]),
    section("Что мешает запуску", blockerItems, "preflight-blockers"),
    section("Предупреждения", warningItems, "preflight-warnings"),
    section("Что получится", view.expectedArtifacts.map((item) => item.label)),
    section("Как ESSA проверит результат", view.verificationPlan.map((item) => `${item.order}. ${item.label}`)),
    section("Можно ли отменить", [`${view.rollbackPlan.state}`, ...view.rollbackPlan.steps.map((item) => `${item.order}. ${item.label}`)]),
    section("Lisa объясняет", view.lisaExplanation),
    disabled,
    debug
  );

  content.append(renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState), article);
  renderLisaEducation(capabilityId, selectedProductId);
}

function renderProductDiscoveryNotFound(message = "Not found") {
  const content = productDiscoveryPanel?.querySelector(".product-discovery-content");
  if (!content) return;
  content.innerHTML = "";
  const block = productDiscoveryElement("section", "capability-detail product-discovery-not-found");
  block.append(
    productDiscoveryElement("h3", "", "Ничего не найдено"),
    productDiscoveryElement("p", "", `${message}. ESSA не будет придумывать недостающую возможность.`),
    renderProductDiscoveryBreadcrumb(productDiscoveryNavigationState),
    renderReadOnlyAction({ label: "К Product Discovery", action: "overview" }, () => {
      navigateProductDiscovery({ mode: productDiscoveryModes.overview, previousState: null });
    })
  );
  content.append(block);
}

function renderLisaEducation(capabilityId = "BOOK_COVER", productId = null) {
  const target = productDiscoveryPanel?.querySelector("#lisa-education-panel");
  if (!target) return;
  const education = buildProductEducationViewModel(capabilityId, { productId });
  const educationUi = buildProductEducationUiViewModel({
    capabilityId,
    productId: productId || education.productId,
    maxContentAngles: 5
  });

  target.innerHTML = "";
  const header = productDiscoveryElement("div", "lisa-education-header");
  header.append(
    productDiscoveryElement("span", "", "Lisa Product Guide"),
    productDiscoveryElement("p", "", "Структурное объяснение из ProductEducationStrategy + ProductEducationCard. Без TTS, LLM, видео и публикации.")
  );

  const grid = productDiscoveryElement("div", "lisa-education-grid");
  [
    ["Что это?", educationUi.plainLanguageDescription || education.problem],
    ["Зачем это человеку?", educationUi.userProblem],
    ["Простой пример", educationUi.examplePrompts[0] || education.examplePrompt],
    ["Как работает будущий workflow?", educationUi.usageSteps.join(" → ")],
    ["Текущая доступность", `${educationUi.availabilityLabel}: ${educationUi.availabilityExplanation}`],
    ["Ограничения", educationUi.limitations.join(" ") || "Запуск отключён в Phase 21H."]
  ].forEach(([label, value]) => {
    const card = productDiscoveryElement("section", "lisa-education-card");
    card.append(productDiscoveryElement("h4", "", label), productDiscoveryElement("p", "", value || "—"));
    grid.append(card);
  });

  const growth = productDiscoveryElement("div", "product-education-growth");
  growth.append(
    productDiscoveryElement("h4", "", "Product Education & Growth"),
    renderProductDiscoveryPills(educationUi.channelEducationPreview.map((item) => item.channel), "product-discovery-outcome"),
    renderProductDiscoveryPills(educationUi.contentAngles.map((angle) => angle.hookConcept), "product-discovery-example")
  );

  target.append(header, renderAvailabilityBadge(
    educationUi.availability,
    educationUi.freshnessStatus
  ), grid, growth);
}

function businessElement(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function businessUserId() {
  try {
    return window.localStorage.getItem("essa_business_user_id") || "demo_client_a";
  } catch {
    return "demo_client_a";
  }
}

function setBusinessUserId(userId) {
  try {
    window.localStorage.setItem("essa_business_user_id", userId || "demo_client_a");
  } catch {
    // Ignore storage failures; API auth will still fail closed.
  }
}

function setBusinessAccessToken(token) {
  try {
    if (token) window.localStorage.setItem("essa_business_access_token", token);
    else window.localStorage.removeItem("essa_business_access_token");
  } catch {
    // Ignore storage failures; API auth will still fail closed.
  }
}

function businessHeaders() {
  let token = "";
  try {
    token = window.localStorage.getItem("essa_business_access_token") || "";
  } catch {
    token = "";
  }
  return {
    "Content-Type": "application/json",
    "x-essa-user-id": businessUserId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function businessApi(pathname, options = {}) {
  const response = await fetch(pathname, {
    ...options,
    headers: {
      ...businessHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.reason || data.errors?.join(", ") || data.error || "Business API failed");
  }
  return data;
}

async function renderExistingBusinesses(parent) {
  const listWrap = businessElement("section", "business-card");
  listWrap.append(businessElement("h3", "", "MY BUSINESS"));
  try {
    const data = await businessApi("/api/business");
    if (!data.businesses?.length) {
      listWrap.append(businessElement("p", "", "У вас пока нет сохранённого Business Profile."));
    } else {
      const list = businessElement("ul", "business-list");
      data.businesses.forEach((item) => {
        const button = businessElement("button", "", `${item.business.name} · ${item.nextAction || item.currentStage || "OPEN"}`);
        button.type = "button";
        button.addEventListener("click", async () => {
          const dashboard = await businessApi(`/api/business/${item.business.businessId}/dashboard`);
          renderBusinessDashboard(parent, dashboard.dashboard);
        });
        const row = businessElement("li");
        row.append(button);
        list.append(row);
      });
      listWrap.append(list);
    }
  } catch (error) {
    const message = error.message.includes("authentication") || error.message.includes("token")
      ? "Session is missing or expired. Sign in again before opening Business data."
      : error.message;
    listWrap.append(businessElement("p", "business-error", message));
  }
  parent.append(listWrap);
}

function businessField(form, name) {
  return form.elements[name]?.value?.trim() || "";
}

function businessList(value) {
  return String(value || "").split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function appendBusinessCard(parent, title, content) {
  const card = businessElement("section", "business-card");
  card.append(businessElement("h3", "", title));
  if (Array.isArray(content)) {
    const list = businessElement("ul", "business-list");
    content.forEach((item) => list.append(businessElement("li", "", typeof item === "string" ? item : JSON.stringify(item))));
    card.append(list);
  } else {
    card.append(businessElement("p", "", content || "Not provided"));
  }
  parent.append(card);
  return card;
}

function renderBusinessDashboard(parent, dashboard = {}) {
  const output = businessElement("div", "business-result");
  const diagnosis = dashboard.latestDiagnosis || {};
  const growthPlan = dashboard.growthPlan || {};
  const offer = dashboard.proposal || {};
  const paymentIntent = dashboard.paymentIntent || {};
  const onboarding = dashboard.onboarding || {};
  const project = dashboard.project || {};

  appendBusinessCard(output, "MY BUSINESS", [
    dashboard.business?.name || "Business",
    `Goal: ${dashboard.currentGoal || "BUSINESS_GROWTH"}`,
    `Stage: ${dashboard.currentStage || "INTAKE"}`,
    `Commercial: ${dashboard.commercialState || "NOT_STARTED"}`,
    `Next action: ${dashboard.nextAction || "COMPLETE_BUSINESS_INTAKE"}`,
    dashboard.storageBoundary?.durablePersistenceReady ? "Storage: durable Business V1 store" : "Storage: configuration review required"
  ]);
  if (diagnosis.diagnosisId) appendBusinessCard(output, "Diagnosis", [
    ...(diagnosis.observations || []),
    ...(diagnosis.risks || []).map((item) => `Risk: ${item}`),
    ...(diagnosis.unknowns || []).slice(0, 6).map((item) => `${item.metric}: ${item.value}`)
  ]);
  if (growthPlan.growthPlanId) appendBusinessCard(output, "Growth Plan", (growthPlan.recommendedActions || []).map((item) => `${item.priority}: ${item.action}`));
  if (offer.offerId) appendBusinessCard(output, "Offer", [
    `Pricing: ${offer.pricingStatus}`,
    `Amount: ${offer.amount == null ? "Not priced" : `${offer.amount} ${offer.currency}`}`,
    `Payment model: ${offer.paymentModel || "Not selected"}`,
    `Payment: ${offer.paymentStatus}`,
    `Approval: ${offer.approvalStatus}`,
    dashboard.paymentUi?.message || "Automated checkout is not configured yet.",
    "No execution starts automatically"
  ]);
  if (paymentIntent.paymentIntentId) appendBusinessCard(output, "Payment", [
    `Status: ${paymentIntent.status}`,
    `Amount: ${paymentIntent.amount} ${paymentIntent.currency}`,
    `Provider: ${paymentIntent.provider}`,
    paymentIntent.metadata?.checkoutConfigured ? "Checkout: configured" : "Checkout: not configured",
    "Payment confirmation must be provider-verified or manually verified by ESSA."
  ]);
  if (onboarding.onboardingId) appendBusinessCard(output, "Onboarding", [
    `Status: ${onboarding.status}`,
    `Primary contact: ${onboarding.primaryContact}`,
    `Next action: ${onboarding.nextAction}`,
    "Do not submit passwords in generic Business intake."
  ]);
  if (dashboard.commercialRequest) appendBusinessCard(output, "Commercial Request", [
    `Status: ${dashboard.commercialRequest.status}`,
    dashboard.commercialRequest.paymentBoundary?.message
  ]);
  if (dashboard.partnerRequest) appendBusinessCard(output, "Business Partner Request", [
    `Status: ${dashboard.partnerRequest.status}`,
    `Scope: ${dashboard.partnerRequest.desiredScope || dashboard.partnerRequest.requestedScope}`
  ]);
  if (project.projectId) appendBusinessCard(output, "Project", [
    project.title,
    `Project ID: ${project.projectId}`,
    `Business ID: ${project.businessId}`,
    `Commercial: ${project.commercialStatus || "NOT_STARTED"}`,
    `Onboarding: ${project.onboardingStatus || "NOT_STARTED"}`,
    `Tasks: ${(project.tasks || []).length}`
  ]);
  if (offer.offerId && offer.approvalStatus === "APPROVED" && !paymentIntent.paymentIntentId) {
    const actions = businessElement("div", "business-actions");
    const requestPayment = businessElement("button", "", "Request payment instructions");
    requestPayment.type = "button";
    requestPayment.disabled = offer.amount == null || offer.pricingStatus === "NOT_PRICED";
    requestPayment.addEventListener("click", async () => {
      const result = await businessApi(`/api/business/${dashboard.business.businessId}/offers/${offer.offerId}/payment-request`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: `payment_request:${offer.offerId}` })
      });
      requestPayment.textContent = result.paymentIntent.status;
      const refreshed = await businessApi(`/api/business/${dashboard.business.businessId}/dashboard`);
      renderBusinessDashboard(parent, refreshed.dashboard);
    });
    actions.append(requestPayment);
    output.append(actions);
  }
  parent.append(output);
}

function renderBusinessResult(parent, flow) {
  const output = businessElement("div", "business-result");
  const diagnosis = flow.diagnosis || {};
  const growthPlan = flow.growthPlan || {};
  const offer = flow.offer || {};
  const project = flow.project || {};

  appendBusinessCard(output, "MY BUSINESS", [
    flow.business?.name || "Business",
    `Stage: ${project.status || "OFFER_READY"}`,
    `Next action: ${offer.approvalStatus || "AWAITING_APPROVAL"}`,
    "Storage: durable Business V1 store, not browser business record storage"
  ]);
  appendBusinessCard(output, "Diagnosis", [
    ...(diagnosis.observations || []),
    ...(diagnosis.risks || []).map((item) => `Risk: ${item}`),
    ...(diagnosis.unknowns || []).slice(0, 6).map((item) => `${item.metric}: ${item.value}`)
  ]);
  appendBusinessCard(output, "Growth Plan", (growthPlan.recommendedActions || []).map((item) => `${item.priority}: ${item.action}`));
  appendBusinessCard(output, "Commercial Offer Draft", [
    `Pricing: ${offer.pricingStatus}`,
    `Amount: ${offer.amount == null ? "Not priced" : `${offer.amount} ${offer.currency}`}`,
    `Payment model: ${offer.paymentModel || "Not selected"}`,
    `Payment: ${offer.paymentStatus}`,
    `Approval: ${offer.approvalStatus}`,
    "Payment provider: not configured",
    "Execution: requires later explicit approval",
    ...((offer.deliverables || []).map((item) => `Deliverable: ${item}`))
  ]);
  appendBusinessCard(output, "Project Workspace", [
    project.title,
    `Project ID: ${project.projectId}`,
    `Business ID: ${project.businessId}`,
    `Tasks: ${(project.tasks || []).length}`
  ]);

  const actions = businessElement("div", "business-actions");
  const approve = businessElement("button", "", "Approve offer");
  const changes = businessElement("button", "", "Request changes");
  const decline = businessElement("button", "", "Decline");
  [approve, changes, decline].forEach((button) => {
    button.type = "button";
    button.disabled = !offer.offerId;
    actions.append(button);
  });
  approve.addEventListener("click", async () => {
    const result = await businessApi(`/api/business/${flow.business.businessId}/offers/${offer.offerId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approve" })
    });
    const dashboard = await businessApi(`/api/business/${flow.business.businessId}/dashboard`);
    approve.textContent = `Approved: ${result.offer.paymentStatus}`;
    appendBusinessCard(output, "Approval Boundary", [
      `Offer: ${result.offer.approvalStatus}`,
      `Project: ${dashboard.dashboard.project?.status || "PAYMENT_REQUIRED"}`,
      "No payment was collected",
      "Payment request requires server-side confirmed pricing",
      "No execution was started"
    ]);
    changes.disabled = true;
    decline.disabled = true;
    const requestStart = businessElement("button", "", "REQUEST ESSA TO START");
    requestStart.type = "button";
    requestStart.addEventListener("click", async () => {
      const request = await businessApi(`/api/business/${flow.business.businessId}/commercial-request`, {
        method: "POST",
        body: JSON.stringify({
          offerId: offer.offerId,
          contactPreference: "EMAIL_OR_TELEGRAM"
        })
      });
      requestStart.textContent = request.commercialRequest.status;
      appendBusinessCard(output, "Commercial Request", [
        request.commercialRequest.paymentBoundary.message,
        `Status: ${request.commercialRequest.status}`
      ]);
    });
    actions.append(requestStart);
  });
  changes.addEventListener("click", async () => {
    const result = await businessApi(`/api/business/${flow.business.businessId}/offers/${offer.offerId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "request_changes", notes: "Client requested changes from Business UI." })
    });
    changes.textContent = result.offer.approvalStatus;
  });
  decline.addEventListener("click", async () => {
    const result = await businessApi(`/api/business/${flow.business.businessId}/offers/${offer.offerId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "decline" })
    });
    decline.textContent = result.offer.approvalStatus;
  });
  output.append(actions);
  parent.append(output);
}

function renderBusinessPanel() {
  if (!businessPanel) return;
  businessPanel.innerHTML = "";
  const shell = businessElement("article", "business-shell");
  const header = businessElement("div", "module-section-header business-header");
  header.append(
    businessElement("h2", "", "ESSA BUSINESS"),
    businessElement("p", "", "Покажите ESSA ваш бизнес. Мы поможем понять, где находятся точки роста и что делать дальше.")
  );

  const intentGrid = businessElement("div", "business-intent-grid");
  [
    ["develop", "РАЗВИТЬ МОЙ БИЗНЕС", "active"],
    ["partner", "ПЕРЕДАТЬ РАЗВИТИЕ БИЗНЕСА ESSA", "active"],
    ["launch", "Создать бизнес · COMING SOON", "future"],
    ["sales", "Увеличить продажи", "future"],
    ["ads", "Запустить рекламу", "future"],
    ["content", "Создать контент", "future"],
    ["site", "Создать сайт / лендинг", "future"],
    ["automation", "Автоматизировать бизнес", "future"],
    ["clients", "Найти клиентов", "future"],
    ["sale", "Подготовить бизнес к продаже", "future"],
    ["investor", "Найти инвестора", "future"]
  ].forEach(([key, label, state]) => {
    const button = businessElement("button", `business-intent ${state}`, label);
    button.type = "button";
    button.dataset.intent = key;
    if (state !== "active") button.disabled = true;
    intentGrid.append(button);
  });

  const partner = businessElement("section", "business-partner-cta");
  partner.append(
    businessElement("h3", "", "ПЕРЕДАТЬ РАЗВИТИЕ БИЗНЕСА ESSA"),
    businessElement("p", "", "ESSA может принять заявку на старт работы. Оплата, onboarding и recurring execution пока требуют ручной настройки.")
  );
  const partnerButton = businessElement("button", "", "Зафиксировать интерес");
  partnerButton.type = "button";
  partnerButton.addEventListener("click", () => {
    partnerButton.textContent = "Сначала создайте Business Profile ниже";
  });
  partner.append(partnerButton);

  const form = businessElement("form", "business-intake-form");
  form.innerHTML = `
    <h3>Расскажите ESSA о вашем бизнесе.</h3>
    <label>Название бизнеса<input name="name" required placeholder="Demo Restaurant" /></label>
    <label>Индустрия<input name="industry" placeholder="Hospitality" /></label>
    <label>Город / страна<input name="location" placeholder="Tbilisi, Georgia" /></label>
    <label>Website<input name="website" placeholder="example.com" /></label>
    <label>Social links<textarea name="socials" placeholder="instagram.com/example"></textarea></label>
    <label>Описание<textarea name="description" placeholder="Что делает бизнес?"></textarea></label>
    <label>Products / Services<textarea name="productsServices" placeholder="Coffee, brunch, events"></textarea></label>
    <label>Target audience<textarea name="targetAudience" placeholder="Local customers, tourists"></textarea></label>
    <label>Current situation<textarea name="currentSituation" placeholder="Что происходит сейчас?"></textarea></label>
    <label>Goals<textarea name="goals" placeholder="increase customer flow"></textarea></label>
    <label>Challenges<textarea name="challenges" placeholder="weak acquisition"></textarea></label>
    <label>Optional private metrics<textarea name="optionalMetrics" placeholder="leads=20"></textarea></label>
    <button type="submit">Create Diagnosis + Growth Plan</button>
  `;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    button.textContent = "Создаю Business workspace...";
    try {
      const name = businessField(form, "name");
      const profile = await businessApi("/api/business/profiles", {
        method: "POST",
        body: JSON.stringify({
          name,
          industry: businessField(form, "industry"),
          city: businessField(form, "location"),
          website: businessField(form, "website"),
          description: businessField(form, "description"),
          productsServices: businessList(businessField(form, "productsServices")),
          targetAudience: businessField(form, "targetAudience"),
          currentSituation: businessField(form, "currentSituation"),
          goals: businessList(businessField(form, "goals")),
          challenges: businessList(businessField(form, "challenges"))
        })
      });
      const flow = await businessApi(`/api/business/${profile.business.businessId}/intake/growth`, {
        method: "POST",
        body: JSON.stringify({
          businessName: name,
          industry: businessField(form, "industry"),
          location: businessField(form, "location"),
          website: businessField(form, "website"),
          socials: businessList(businessField(form, "socials")),
          description: businessField(form, "description"),
          productsServices: businessList(businessField(form, "productsServices")),
          targetAudience: businessField(form, "targetAudience"),
          currentSituation: businessField(form, "currentSituation"),
          goals: businessList(businessField(form, "goals")),
          challenges: businessList(businessField(form, "challenges")),
          optionalMetrics: {}
        })
      });
      renderBusinessResult(shell, flow);
      partnerButton.textContent = "Request ESSA Business Partner";
      partnerButton.onclick = async () => {
        const result = await businessApi(`/api/business/${profile.business.businessId}/partner-request`, {
          method: "POST",
          body: JSON.stringify({
            goals: businessList(businessField(form, "goals")),
            preferredInvolvementLevel: "EXTERNAL_GROWTH_DEPARTMENT_INTEREST"
          })
        });
        partnerButton.textContent = result.partnerRequest.status;
      };
      button.textContent = "Created";
    } catch (error) {
      shell.append(businessElement("p", "business-error", error.message));
      button.disabled = false;
      button.textContent = "Create Diagnosis + Growth Plan";
    }
  });

  const authStatus = businessElement("section", "business-card");
  authStatus.append(businessElement("h3", "", "Access"));
  const authForm = businessElement("form", "business-auth-form");
  authForm.innerHTML = `
    <label>Local dev user ID<input name="businessUserId" value="${businessUserId()}" /></label>
    <label>Supabase access token<input name="businessAccessToken" type="password" placeholder="Paste session token when Supabase Auth is active" /></label>
    <div class="business-actions">
      <button type="submit">Sign in</button>
      <button type="button" data-auth-action="sign-out">Sign out</button>
    </div>
  `;
  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setBusinessUserId(businessField(authForm, "businessUserId"));
    setBusinessAccessToken(businessField(authForm, "businessAccessToken"));
    renderBusinessPanel();
  });
  authForm.querySelector("[data-auth-action='sign-out']")?.addEventListener("click", () => {
    setBusinessAccessToken("");
    renderBusinessPanel();
  });
  authStatus.append(authForm);
  businessApi("/api/business/auth/status")
    .then((status) => {
      authStatus.append(businessElement("p", "", status.auth.productionAuthReady ? "Supabase Auth is active." : "Local development identity is active until Supabase Auth is configured."));
      authStatus.append(businessElement("p", "", status.storage?.durablePersistenceReady ? "Business data is persisted across process restart." : "Durable persistence requires configuration."));
      if (!status.runtime?.ok) {
        authStatus.append(businessElement("p", "business-error", `Business runtime blocked: ${(status.runtime.blockers || []).join(", ")}`));
      }
    })
    .catch((error) => authStatus.append(businessElement("p", "business-error", error.message)));

  shell.append(header, intentGrid, authStatus, partner);
  renderExistingBusinesses(shell);
  shell.append(form);
  businessPanel.append(shell);
}

function scrollActiveNavigationItem() {
  const activeItem = document.querySelector(".nav-item.active");
  if (!activeItem || !activeItem.parentElement) {
    return;
  }

  const navList = activeItem.parentElement;
  if (navList.scrollWidth <= navList.clientWidth) {
    return;
  }

  const navStyles = window.getComputedStyle(navList);
  const inset = Number.parseFloat(navStyles.scrollPaddingLeft || navStyles.paddingLeft || "0") || 0;
  const rawTarget = activeItem.offsetLeft - inset;
  const maxScrollLeft = navList.scrollWidth - navList.clientWidth;
  navList.scrollLeft = Math.max(0, Math.min(rawTarget, maxScrollLeft));
}

function setActive(label) {
  try {
    selectedModule = label;
    const isWorkspaceMode = label !== "Главная";

    document.body?.classList?.toggle("workspace-mode", isWorkspaceMode);
    workspaceShell?.classList?.toggle("workspace-mode", isWorkspaceMode);
    if (activeModule) {
      activeModule.textContent = label;
    }
    if (workspaceTitle) {
      workspaceTitle.textContent = label;
    }
    if (workspaceDescription) {
      workspaceDescription.textContent = workspaceDescriptions[label] || "Рабочее пространство ESSA для диалога, проекта и следующих действий.";
    }
    if (promptInput) {
      promptInput.placeholder = `Что вы хотите создать, исследовать или изменить в разделе «${label}»?`;
    }
    if (productionPanel) {
      productionPanel.hidden = label !== PRODUCTION_STUDIO;
    }
    if (identityPanel) {
      identityPanel.hidden = label !== "Цифровая личность";
    }
    if (projectsPanel) {
      projectsPanel.hidden = label !== PROJECTS_MODULE;
    }
    if (historyPanel) {
      historyPanel.hidden = label !== HISTORY_MODULE;
    }
    if (projectWorkspacePanel) {
      projectWorkspacePanel.hidden = true;
    }
    if (productDiscoveryPanel) {
      productDiscoveryPanel.hidden = label !== PRODUCT_DISCOVERY_MODULE;
    }
    if (executionWorkspacePanel) {
      executionWorkspacePanel.hidden = label !== SAFE_LOCAL_EXECUTION_MODULE;
    }
    if (autonomousWorkflowPanel) {
      autonomousWorkflowPanel.hidden = label !== AUTONOMOUS_WORKFLOW_MODULE;
    }
    if (businessPanel) {
      businessPanel.hidden = label !== BUSINESS_MODULE;
    }
    if (propertyPanel) {
      propertyPanel.hidden = label !== PROPERTY_MODULE;
    }
    if (addPropertyPanel) {
      addPropertyPanel.hidden = label !== ADD_PROPERTY_MODULE;
    }
    if (propertyMandatePanel) {
      propertyMandatePanel.hidden = label !== PROPERTY_MANDATE_MODULE;
    }
    if (propertyMandateReviewPanel) {
      propertyMandateReviewPanel.hidden = label !== PROPERTY_MANDATE_REVIEW_MODULE;
    }
    if (propertyAuthorityActivationPanel) {
      propertyAuthorityActivationPanel.hidden = label !== PROPERTY_AUTHORITY_ACTIVATION_MODULE;
    }
    if (propertyCreationProofPanel) {
      propertyCreationProofPanel.hidden = label !== PROPERTY_CREATION_PROOF_MODULE;
    }
    if (propertySaleListingProofPanel) {
      propertySaleListingProofPanel.hidden = label !== PROPERTY_SALE_LISTING_PROOF_MODULE;
    }
    if (propertyPublicationReadinessPanel) {
      propertyPublicationReadinessPanel.hidden = label !== PROPERTY_PUBLICATION_READINESS_MODULE;
    }
    if (propertyMarketplacePublicationPanel) {
      propertyMarketplacePublicationPanel.hidden = label !== PROPERTY_MARKETPLACE_PUBLICATION_MODULE;
    }
    if (propertyBuyerLeadPanel) {
      propertyBuyerLeadPanel.hidden = label !== PROPERTY_BUYER_LEAD_MODULE;
    }
    if (propertyConversationPanel) {
      propertyConversationPanel.hidden = label !== PROPERTY_CONVERSATION_MODULE;
    }
    if (propertyViewingPanel) {
      propertyViewingPanel.hidden = label !== PROPERTY_VIEWING_MODULE;
    }
    if (propertyIngestionReviewPanel) {
      propertyIngestionReviewPanel.hidden = label !== PROPERTY_INGESTION_REVIEW_MODULE;
    }
    if (propertyReviewQueuePanel) {
      propertyReviewQueuePanel.hidden = label !== PROPERTY_REVIEW_QUEUE_MODULE;
    }
    if (propertyExecutionProofPanel) {
      propertyExecutionProofPanel.hidden = label !== PROPERTY_EXECUTION_PROOF_MODULE && label !== PROPERTY_EXECUTION_HISTORY_MODULE;
    }
      chatPanels.forEach((panel) => {
      panel.hidden = label === PRODUCT_DISCOVERY_MODULE ||
        label === SAFE_LOCAL_EXECUTION_MODULE ||
        label === AUTONOMOUS_WORKFLOW_MODULE ||
        label === BUSINESS_MODULE ||
        label === PROPERTY_MODULE ||
        label === ADD_PROPERTY_MODULE ||
        label === PROPERTY_MANDATE_MODULE ||
        label === PROPERTY_MANDATE_REVIEW_MODULE ||
        label === PROPERTY_AUTHORITY_ACTIVATION_MODULE ||
        label === PROPERTY_CREATION_PROOF_MODULE ||
        label === PROPERTY_SALE_LISTING_PROOF_MODULE ||
        label === PROPERTY_CONVERSATION_MODULE ||
        label === PROPERTY_VIEWING_MODULE ||
        label === PROPERTY_INGESTION_REVIEW_MODULE ||
        label === PROPERTY_REVIEW_QUEUE_MODULE ||
        label === PROPERTY_EXECUTION_PROOF_MODULE ||
        label === PROPERTY_EXECUTION_HISTORY_MODULE;
    });
    navItems.forEach((item) => {
      item.classList.toggle("active", (item.dataset.space || item.textContent.trim()) === label);
    });
    scrollActiveNavigationItem();

    if (label === PROJECTS_MODULE) {
      try {
        renderProjects();
      } catch (error) {
        console.warn("[setActive] renderProjects failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === HISTORY_MODULE) {
      try {
        renderHistory();
      } catch (error) {
        console.warn("[setActive] renderHistory failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PRODUCTION_STUDIO) {
      try {
        renderProductionActiveIdentity();
        renderProductionView();
      } catch (error) {
        console.warn("[setActive] renderProductionView failed", error);
      }
    }

    if (label === PRODUCT_DISCOVERY_MODULE) {
      try {
        renderProductDiscoveryShell();
      } catch (error) {
        console.warn("[setActive] renderProductDiscoveryShell failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === SAFE_LOCAL_EXECUTION_MODULE) {
      try {
        initSafeLocalExecutionWorkspace(executionWorkspacePanel);
      } catch (error) {
        console.warn("[setActive] initSafeLocalExecutionWorkspace failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === AUTONOMOUS_WORKFLOW_MODULE) {
      try {
        initAutonomousWorkflowWorkspace(autonomousWorkflowPanel);
      } catch (error) {
        console.warn("[setActive] initAutonomousWorkflowWorkspace failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === BUSINESS_MODULE) {
      try {
        renderBusinessPanel();
      } catch (error) {
        console.warn("[setActive] renderBusinessPanel failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_MODULE) {
      try {
        renderPropertyPassportUi(propertyPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyPassportUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === ADD_PROPERTY_MODULE) {
      try {
        renderAddPropertyUi(addPropertyPanel);
      } catch (error) {
        console.warn("[setActive] renderAddPropertyUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_MANDATE_MODULE) {
      try {
        renderPropertyMandateUi(propertyMandatePanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyMandateUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_MANDATE_REVIEW_MODULE) {
      try {
        renderPropertyMandateReviewUi(propertyMandateReviewPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyMandateReviewUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_AUTHORITY_ACTIVATION_MODULE) {
      try {
        renderPropertyAuthorityActivationUi(propertyAuthorityActivationPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyAuthorityActivationUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_CREATION_PROOF_MODULE) {
      try {
        renderPropertyCreationProofUi(propertyCreationProofPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyCreationProofUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_SALE_LISTING_PROOF_MODULE) {
      try {
        renderPropertySaleListingProofUi(propertySaleListingProofPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertySaleListingProofUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_PUBLICATION_READINESS_MODULE) {
      try {
        renderPropertyPublicationReadinessUi(propertyPublicationReadinessPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyPublicationReadinessUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_MARKETPLACE_PUBLICATION_MODULE) {
      try {
        renderPropertyMarketplacePublicationUi(propertyMarketplacePublicationPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyMarketplacePublicationUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_BUYER_LEAD_MODULE) {
      try {
        renderPropertyBuyerLeadUi(propertyBuyerLeadPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyBuyerLeadUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_CONVERSATION_MODULE) {
      try {
        renderPropertyConversationUi(propertyConversationPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyConversationUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_VIEWING_MODULE) {
      try {
        renderPropertyViewingUi(propertyViewingPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyViewingUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_INGESTION_REVIEW_MODULE) {
      try {
        renderPropertyIngestionReviewUi(propertyIngestionReviewPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyIngestionReviewUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_REVIEW_QUEUE_MODULE) {
      try {
        renderPropertyReviewQueueUi(propertyReviewQueuePanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyReviewQueueUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_EXECUTION_PROOF_MODULE) {
      try {
        renderPropertyExecutionProofUi(propertyExecutionProofPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyExecutionProofUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === PROPERTY_EXECUTION_HISTORY_MODULE) {
      try {
        renderPropertyExecutionHistoryUi(propertyExecutionProofPanel);
      } catch (error) {
        console.warn("[setActive] renderPropertyExecutionHistoryUi failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    if (label === "Цифровая личность") {
      try {
        renderLisaIdentityPassport();
      } catch (error) {
        console.warn("[setActive] renderLisaIdentityPassport failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }

      try {
        addWorkspaceOpenHistory({
          userText: "Открыто пространство: Цифровая личность",
          intent: "digital_identity",
          agent: "Digital Identity Agent",
          workflowId: "digital_identity_profile",
          status: "space_opened"
        });
      } catch (error) {
        console.warn("[setActive] addWorkspaceOpenHistory failed", error);
        updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
      }
    }

    try {
      renderWorkspaceRecent();
    } catch (error) {
      console.warn("[setActive] renderWorkspaceRecent failed", error);
      updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
    }

    scrollChatToBottom("auto");
  } catch (error) {
    console.warn("[setActive] failed", error);
    updateWorkspaceDebugIndicator(`setActive failed: ${error.message}`);
  }
}

function getDebugSpaces() {
  return [...document.querySelectorAll("[data-space]")].map((el) => ({
    text: el.textContent.trim(),
    space: el.dataset.space,
    hash: el.dataset.hash,
    tag: el.tagName,
    classes: el.className
  }));
}

function updateWorkspaceDebugIndicator(lastClick = "") {
  let indicator = document.querySelector("#workspace-debug-indicator");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "workspace-debug-indicator";
    indicator.setAttribute("aria-live", "polite");
    document.body.append(indicator);
  }

  indicator.textContent = [
    "JS loaded: yes",
    `build: ${ESSA_BUILD_ID}`,
    `data-space count: ${document.querySelectorAll("[data-space]").length}`,
    `last route: ${lastClick || "—"}`
  ].join(" | ");
}

window.ESSA_DEBUG = {
  setActive,
  getSpaces: getDebugSpaces,
  clickSpace: (space) => {
    const hash = HASH_BY_SPACE[space];

    if (hash) {
      window.location.hash = hash;
      applyHashRoute();
      return;
    }

    setActive(space);
  },
  applyHashRoute
};

console.log("[ESSA_DEBUG_READY]", window.ESSA_DEBUG.getSpaces());

function applyHashRoute() {
  const hash = window.location.hash || "#home";
  const label = hash.startsWith("#product-discovery")
    ? PRODUCT_DISCOVERY_MODULE
    : hash.startsWith("#execution")
      ? SAFE_LOCAL_EXECUTION_MODULE
    : hash.startsWith("#workflow")
      ? AUTONOMOUS_WORKFLOW_MODULE
    : hash.startsWith("#business")
      ? BUSINESS_MODULE
    : hash.startsWith("#add-property")
      ? ADD_PROPERTY_MODULE
    : hash.startsWith("#property-authority-activation")
      ? PROPERTY_AUTHORITY_ACTIVATION_MODULE
    : hash.startsWith("#property-creation-proof")
      ? PROPERTY_CREATION_PROOF_MODULE
    : hash.startsWith("#property-sale-publication-readiness")
      ? PROPERTY_PUBLICATION_READINESS_MODULE
    : hash.startsWith("#property-publication-proof") || hash.startsWith("#property-marketplace") || hash.startsWith("#property-listing")
      ? PROPERTY_MARKETPLACE_PUBLICATION_MODULE
    : hash.startsWith("#property-leads")
      ? PROPERTY_BUYER_LEAD_MODULE
    : hash.startsWith("#property-conversations")
      ? PROPERTY_CONVERSATION_MODULE
    : hash.startsWith("#property-viewings")
      ? PROPERTY_VIEWING_MODULE
    : hash.startsWith("#property-sale-listing-proof")
      ? PROPERTY_SALE_LISTING_PROOF_MODULE
    : hash.startsWith("#property-mandate")
      ? hash.startsWith("#property-mandate-review")
        ? PROPERTY_MANDATE_REVIEW_MODULE
        : PROPERTY_MANDATE_MODULE
    : hash.startsWith("#property-execution-history")
      ? PROPERTY_EXECUTION_HISTORY_MODULE
    : hash.startsWith("#property-execution-proof")
      ? PROPERTY_EXECUTION_PROOF_MODULE
    : hash.startsWith("#property-review-queue")
      ? PROPERTY_REVIEW_QUEUE_MODULE
    : hash.startsWith("#property-ingestion-review")
      ? PROPERTY_INGESTION_REVIEW_MODULE
      : hash.startsWith("#property")
        ? PROPERTY_MODULE
    : SPACE_BY_HASH[hash] || "Главная";

  console.log("[hash-route]", hash, label);
  updateWorkspaceDebugIndicator(`route: ${hash} -> ${label}`);
  setActive(label);
}

function extractBlueprintTitle(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const projectIndex = lines.findIndex((line) => line.includes("🎬 Проект"));
  const title = projectIndex >= 0 ? lines[projectIndex + 1] : "";

  return title || "Production проект";
}

function getFinalActionLabels() {
  return [
    "🟢 Утвердить проект",
    "✏️ Изменить",
    "➕ Дополнить",
    "🎙 Создать озвучку",
    "🖼 Подготовить визуалы",
    "🎥 Перейти к монтажу",
    "📤 Подготовить публикацию",
    "❌ Завершить"
  ];
}

const projectNextActions = [
  { key: "voice_script", label: "🎙 Создать озвучку" },
  { key: "visuals", label: "🖼 Подготовить визуалы" },
  { key: "editing", label: "🎥 Перейти к монтажу" },
  { key: "publication_text", label: "📝 Подготовить текст публикации" },
  { key: "publish_package", label: "📤 Подготовить публикацию" },
  { key: "edit_blueprint", label: "✏️ Изменить Blueprint" },
  { key: "extend_project", label: "➕ Дополнить проект" }
];

function buildProjectFromBlueprint(blueprintText) {
  const state = loadWorkflowState();
  const identityFields = getActiveIdentityProjectFields();
  const isContentMultiplication = state?.projectType === "content_multiplication";

  return {
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: extractBlueprintTitle(blueprintText),
    type: "production",
    subtype: state?.projectType || "video",
    workflowId: isContentMultiplication ? "content_multiplication_package" : "production_video",
    createdAt: new Date().toISOString(),
    status: "draft",
    workflowAnswers: state?.answers || {},
    finalBlueprintText: blueprintText,
    nextActions: getFinalActionLabels(),
    updates: [],
    generatedSections: {},
    assets: getEmptyProjectAssets(),
    plannedOutputs: isContentMultiplication ? getContentMultiplicationOutputs() : null,
    ...identityFields
  };
}

function saveCurrentProductionProject(blueprintText) {
  const projects = loadProjects();
  const project = buildProjectFromBlueprint(blueprintText);

  projects.unshift(project);
  saveProjects(projects);
  addWorkspaceOpenHistory({
    userText: `Production project created with ${project.identityName} identity`,
    intent: "production",
    agent: "Production Agent",
    workflowId: project.workflowId || "production_video",
    linkedProjectId: project.id,
    status: "project_created_with_identity"
  });
  renderProjects();
  renderWorkspaceRecent();
  appendMessage("navigator", `💾 Проект сохранён в «Мои проекты»: ${project.title}`);
}

function createProjectFromCorePlan(corePlan, options = {}) {
  if (!corePlan?.projectDraft || corePlan.intent === "unknown") {
    appendMessage("navigator", "Не получилось создать проект: Core Plan не содержит projectDraft.", "error");
    return null;
  }

  const projects = loadProjects();
  const initialRequest = corePlan.projectDraft.title || "ESSA project draft";
  const workflowSteps = Array.isArray(corePlan.workflow?.steps) ? corePlan.workflow.steps : [];
  const workflowAnswers = options.workflowAnswers || {};
  const workflowCompleted = Object.keys(workflowAnswers).length > 0;
  const identityFields = isProductionCorePlan(corePlan) ? getActiveIdentityProjectFields() : {};
  const identitySnapshot = identityFields.identitySnapshot || null;
  const subtype = corePlan.projectDraft.subtype || "";
  const workflowId = corePlan.workflowId || corePlan.workflow?.id || corePlan.projectDraft.workflowId || null;
  const isContentMultiplication = subtype === "content_multiplication" || workflowId === "content_multiplication_package";
  const sourceExecutionPlan = identitySnapshot
    ? withIdentityExecutionMetadata(corePlan.projectDraft.executionPlan, identitySnapshot)
    : corePlan.projectDraft.executionPlan;
  const draft = normalizeProject({
    ...corePlan.projectDraft,
    ...identityFields,
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: "draft",
    initialRequest,
    corePlan,
    executionPlan: sourceExecutionPlan,
    workflowId,
    plannedOutputs: isContentMultiplication ? getContentMultiplicationOutputs() : corePlan.projectDraft.plannedOutputs,
    workflowState: {
      currentStepIndex: workflowCompleted ? workflowSteps.length : 0,
      steps: workflowSteps,
      answers: workflowAnswers,
      completed: workflowCompleted,
      started: workflowCompleted
    },
    finalBlueprintText: corePlan.projectDraft.finalBlueprintText ||
      `Initial request:\n${initialRequest}`,
    nextActions: corePlan.projectDraft.nextActions?.length
      ? corePlan.projectDraft.nextActions
      : getFinalActionLabels(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  projects.unshift(draft);
  saveProjects(projects);
  renderProjects();
  renderWorkspaceRecent();
  updateHistoryEntry(options.historyId, {
    linkedProjectId: draft.id,
    status: "project_created"
  });
  if (draft.identitySnapshot) {
    addWorkspaceOpenHistory({
      userText: `Production project created with ${draft.identityName} identity`,
      intent: "production",
      agent: "Production Agent",
      workflowId: draft.workflowId || "production_video",
      linkedProjectId: draft.id,
      status: "project_created_with_identity"
    });
  }
  appendMessage("navigator", `➕ Draft-проект создан: ${draft.title}`);
  openProjectWorkspace(draft.id, getProjectWorkspaceOptions("workflow"));
  return draft;
}

function openProject(projectId) {
  const project = loadProjects().find((item) => item.id === projectId);

  if (!project) {
    appendMessage("navigator", "Не получилось открыть проект: он не найден в localStorage.", "error");
    return;
  }

  openProjectWorkspace(project.id, getProjectWorkspaceOptions("blueprint"));
}

function continueProject(projectId) {
  const project = loadProjects().find((item) => item.id === projectId);

  if (!project) {
    appendMessage("navigator", "Не получилось продолжить проект: он не найден в localStorage.", "error");
    return;
  }

  activeProjectId = project.id;
  openProjectWorkspace(project.id, getProjectWorkspaceOptions("next"));
}

function deleteProject(projectId) {
  const projects = loadProjects().filter((item) => item.id !== projectId);
  saveProjects(projects);
  renderProjects();
  renderHistory();
  renderWorkspaceRecent();
}

function renderProjects() {
  const projects = loadProjects();
  projectsList.innerHTML = "";

  if (!projects.length) {
    const empty = document.createElement("div");
    empty.className = "projects-empty";
    empty.textContent = "Пока сохранённых проектов нет. Завершите Production workflow и нажмите «Сохранить в Мои проекты».";
    projectsList.append(empty);
    return;
  }

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const title = document.createElement("h3");
    title.textContent = project.title;

    const meta = document.createElement("p");
    const updatedAt = project.lastUpdatedAt
      ? ` • обновлён ${new Date(project.lastUpdatedAt).toLocaleString("ru-RU")}`
      : "";
    meta.textContent = `${project.type} / ${project.subtype} • ${new Date(project.createdAt).toLocaleString("ru-RU")} • ${project.status}${updatedAt}`;

    const actions = document.createElement("div");
    actions.className = "project-card-actions";

    [
      ["Открыть", () => openProject(project.id)],
      ["Продолжить", () => continueProject(project.id)],
      ["📋 Скопировать Blueprint", () => copyBlueprint(project.id, getExportUiOptions())],
      ["📄 Скачать TXT", () => downloadTxt(project.id, getExportUiOptions())],
      ["🎬 Пакет монтажа", () => prepareEditingPackage(project.id, getExportUiOptions())],
      ["📤 Пакет публикации", () => preparePublishingPackage(project.id, getExportUiOptions())],
      ["Удалить", () => deleteProject(project.id)]
    ].forEach(([label, handler]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", handler);
      actions.append(button);
    });

    card.append(title, meta, actions);
    projectsList.append(card);
  });
}

function formatHistoryDate(value) {
  try {
    return new Date(value).toLocaleString("ru-RU");
  } catch (error) {
    return value || "";
  }
}

function renderHistoryItem(entry) {
  const card = document.createElement("article");
  card.className = "history-card";

  const title = document.createElement("h3");
  title.textContent = entry.userText || "Запрос ESSA";

  const meta = document.createElement("p");
  const direction = entry.intent ? ` • ${entry.intent}` : "";
  const agent = entry.agent ? ` • ${entry.agent}` : "";
  const workflow = entry.workflowId ? ` • ${entry.workflowId}` : "";
  meta.textContent = `${formatHistoryDate(entry.createdAt)}${direction}${agent}${workflow} • ${entry.status || "sent"}`;

  const actions = document.createElement("div");
  actions.className = "project-card-actions";

  if (entry.linkedProjectId) {
    [
      ["Открыть", () => openProject(entry.linkedProjectId)],
      ["Продолжить", () => continueProject(entry.linkedProjectId)]
    ].forEach(([label, handler]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", handler);
      actions.append(button);
    });
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Удалить";
  deleteButton.addEventListener("click", () => deleteHistoryEntry(entry.id));
  actions.append(deleteButton);

  card.append(title, meta, actions);
  return card;
}

function renderProjectHistoryItem(project) {
  const card = document.createElement("article");
  card.className = "history-card project-history-card";

  const title = document.createElement("h3");
  title.textContent = project.title;

  const meta = document.createElement("p");
  meta.textContent = `${formatHistoryDate(project.createdAt)} • ${project.type} / ${project.subtype} • ${project.status}`;

  const actions = document.createElement("div");
  actions.className = "project-card-actions";

  [
    ["Открыть", () => openProject(project.id)],
    ["Продолжить", () => continueProject(project.id)],
    ["Удалить", () => deleteProject(project.id)]
  ].forEach(([label, handler]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    actions.append(button);
  });

  card.append(title, meta, actions);
  return card;
}

function renderHistory() {
  if (!historyList) {
    return;
  }

  const history = loadWorkspaceHistory();
  const projects = loadProjects();
  const linkedProjectIds = new Set(history.map((item) => item.linkedProjectId).filter(Boolean));
  const unlinkedProjects = projects.filter((project) => !linkedProjectIds.has(project.id));

  historyList.innerHTML = "";

  if (!history.length && !unlinkedProjects.length) {
    const empty = document.createElement("div");
    empty.className = "projects-empty";
    empty.textContent = "История пока пустая. Напишите запрос в Workspace или создайте проект.";
    historyList.append(empty);
    return;
  }

  history.forEach((entry) => {
    historyList.append(renderHistoryItem(entry));
  });

  unlinkedProjects.forEach((project) => {
    historyList.append(renderProjectHistoryItem(project));
  });
}

function getRecentSearchText() {
  return String(workspaceHistorySearch?.value || "").toLowerCase().trim();
}

function getWorkspaceJournalInfo(item) {
  const source = `${item.space || item.intent || item.meta || ""}`.toLowerCase();

  if (source.includes("website")) {
    return { icon: "🌐", space: "Website Studio" };
  }

  if (source.includes("production")) {
    return { icon: "🎬", space: "Production Studio" };
  }

  if (source.includes("property")) {
    return { icon: "🏠", space: "ESSA Property" };
  }

  if (source.includes("legal")) {
    return { icon: "⚖", space: "Юридическая помощь" };
  }

  if (source.includes("marketing")) {
    return { icon: "📣", space: "Маркетинг" };
  }

  if (source.includes("education")) {
    return { icon: "🎓", space: "Образование" };
  }

  if (source.includes("travel")) {
    return { icon: "✈", space: "Путешествия" };
  }

  return { icon: "💬", space: "Chat ESSA" };
}

function makeRecentItem({ title, meta, date, status, icon, space, onOpen, onContinue, onDelete }) {
  const item = document.createElement("article");
  item.className = "workspace-recent-item";

  const spaceLine = document.createElement("div");
  spaceLine.className = "workspace-recent-space";

  const iconNode = document.createElement("span");
  iconNode.textContent = icon;

  const spaceName = document.createElement("strong");
  spaceName.textContent = space;

  spaceLine.append(iconNode, spaceName);

  const heading = document.createElement("strong");
  heading.className = "workspace-recent-title";
  heading.textContent = title;

  const details = document.createElement("span");
  details.textContent = `${date}${status ? ` • ${status}` : ""}`;

  const actions = document.createElement("div");
  actions.className = "workspace-recent-actions";

  [
    ["Открыть", onOpen],
    ["Продолжить", onContinue],
    ["Удалить", onDelete]
  ].forEach(([label, handler]) => {
    if (!handler) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    actions.append(button);
  });

  item.append(spaceLine, heading, details);

  if (actions.children.length) {
    item.append(actions);
  }

  return item;
}

function renderWorkspaceRecent() {
  if (!workspaceRecentList) {
    return;
  }

  const query = getRecentSearchText();
  const history = loadWorkspaceHistory();
  const projects = loadProjects();
  const linkedProjectIds = new Set(history.map((item) => item.linkedProjectId).filter(Boolean));
  const recentItems = [
    ...history.map((entry) => ({
      kind: "chat",
      id: entry.id,
      title: entry.userText || "Чат ESSA",
      meta: `${formatHistoryDate(entry.createdAt)} • ${entry.intent || "chat"} • ${entry.status || "sent"}`,
      date: formatHistoryDate(entry.createdAt),
      status: entry.status || "sent",
      intent: entry.intent || "chat",
      linkedProjectId: entry.linkedProjectId
    })),
    ...projects
      .filter((project) => !linkedProjectIds.has(project.id))
      .map((project) => ({
        kind: "project",
        id: project.id,
        title: project.title,
        meta: `${formatHistoryDate(project.createdAt)} • ${project.type} / ${project.subtype} • ${project.status}`,
        date: formatHistoryDate(project.createdAt),
        status: project.status,
        intent: project.type,
        linkedProjectId: project.id
      }))
  ].filter((item) => {
    const haystack = `${item.title} ${item.meta}`.toLowerCase();
    return !query || haystack.includes(query);
  }).slice(0, 30);

  workspaceRecentList.innerHTML = "";

  if (!recentItems.length) {
    const empty = document.createElement("div");
    empty.className = "workspace-recent-empty";
    empty.textContent = "Пока нет проектов или чатов.";
    workspaceRecentList.append(empty);
    return;
  }

  recentItems.forEach((item) => {
    const journal = getWorkspaceJournalInfo(item);

    workspaceRecentList.append(makeRecentItem({
      title: item.title,
      meta: item.meta,
      date: item.date,
      status: item.status,
      icon: journal.icon,
      space: journal.space,
      onOpen: item.linkedProjectId ? () => openProject(item.linkedProjectId) : null,
      onContinue: item.linkedProjectId ? () => continueProject(item.linkedProjectId) : null,
      onDelete: item.kind === "project" ? () => deleteProject(item.id) : () => deleteHistoryEntry(item.id)
    }));
  });
}

function getProjectWorkspaceOptions(activeTab = "blueprint") {
  return {
    activeTab,
    projectWorkspacePanel,
    projectsPanel,
    projectsModule: PROJECTS_MODULE,
    setActive,
    setActiveProjectId: (projectId) => {
      activeProjectId = projectId;
    },
    renderProjectsList: renderProjects,
    renderTabContent: renderProjectWorkspaceTab,
    showChatMessage: appendMessage
  };
}

function renderProjectIdentitySummary(project) {
  const identity = project.identitySnapshot;

  if (!identity) {
    return null;
  }

  const summary = document.createElement("section");
  summary.className = "project-identity-summary";

  const title = document.createElement("span");
  title.textContent = "Цифровая личность проекта";

  const name = document.createElement("strong");
  name.textContent = identity.name || project.identityName || "Digital Identity";

  const details = document.createElement("p");
  const roles = Array.isArray(identity.roles) && identity.roles.length
    ? `Роли: ${identity.roles.join(", ")}`
    : "Роли: не указаны";
  const state = identity.identityState?.label ? `Состояние: ${identity.identityState.label}` : "Состояние: не указано";
  const capabilities = Array.isArray(identity.capabilities) && identity.capabilities.length
    ? `Способности: ${identity.capabilities.slice(0, 6).join(", ")}`
    : "Способности: не указаны";
  details.textContent = `${roles} • ${state} • ${capabilities} • source: ${identity.source || "Identity Passport Package"}`;

  summary.append(title, name, details);
  return summary;
}

function prepareAutonomousPipeline(projectId) {
  const project = getProjectById(projectId);

  if (!project || !isContentMultiplicationProject(project)) {
    appendMessage("navigator", "Autonomous pipeline доступен только для Content Multiplication проектов.", "error");
    return;
  }

  const voiceUsage = getVoiceUsageForProject(project.identitySnapshot, project);
  const draft = buildAutonomousPipelineDraft(project, voiceUsage);
  const pipelineAssets = buildAutonomousPipelineAssets(project, draft);
  const updatedProject = updateProjectInStorage(project.id, (currentProject) => ({
    autonomousPipelineDraft: draft,
    assets: {
      ...(currentProject.assets || {}),
      documents: [
        ...(currentProject.assets?.documents || []),
        ...(pipelineAssets.documents || [])
      ],
      texts: [
        ...(currentProject.assets?.texts || []),
        ...(pipelineAssets.texts || [])
      ]
    }
  }));

  if (updatedProject) {
    renderProjects();
    renderWorkspaceRecent();
    appendMessage("navigator", "Autonomous Production Pipeline draft создан. Внешние tools не запускались, автопубликации нет.");
    openProjectWorkspace(updatedProject.id, getProjectWorkspaceOptions("execution"));
  }
}

function renderAutonomousPipelineDraft(project) {
  const draft = project.autonomousPipelineDraft;

  if (!draft) {
    return null;
  }

  const block = document.createElement("div");
  block.className = "project-identity-summary";

  const title = document.createElement("span");
  title.textContent = "Autonomous Production Pipeline";

  const heading = document.createElement("strong");
  heading.textContent = `Draft ready • ${draft.mode}`;

  const details = document.createElement("p");
  const runningSteps = (draft.steps || []).filter((step) => step.executionStatus === "running").length;
  details.textContent = `status: ${draft.status} • steps: ${(draft.steps || []).length} • running: ${runningSteps} • voice: ${draft.voiceUsage?.usage || "not set"}`;

  block.append(title, heading, details);
  return block;
}

function renderContentMultiplicationSummary(project) {
  if (!isContentMultiplicationProject(project)) {
    return null;
  }

  const outputs = project.plannedOutputs || getContentMultiplicationOutputs();
  const voiceUsage = getVoiceUsageForProject(project.identitySnapshot, project);
  const summary = document.createElement("section");
  summary.className = "project-identity-summary";

  const title = document.createElement("span");
  title.textContent = "Content Multiplication Plan";

  const heading = document.createElement("strong");
  heading.textContent = "Planned outputs";

  const details = document.createElement("p");
  details.textContent = [
    `podcast: ${outputs.podcast ?? 1}`,
    `shorts: ${outputs.shorts ?? 15}`,
    `tiktok: ${outputs.tiktok ?? 10}`,
    `reels: ${outputs.reels || "selected"}`,
    `visuals: ${outputs.visuals || "selected"}`,
    `translations: ${outputs.translations || outputs.languages || "selected"}`,
    `publications: ${outputs.publications || "selected"}`,
    `schedule: ${outputs.schedule || "planned"}`,
    `voiceIdentity: ${voiceUsage.allowed ? voiceUsage.voiceIdentity : "Not allowed for this project"}`,
    voiceUsage.allowed ? `usage: ${voiceUsage.usage}` : `fallback: ${voiceUsage.fallbackVoice}`
  ].filter(Boolean).join(" • ");

  const actions = document.createElement("div");
  actions.className = "message-actions";

  const pipelineButton = document.createElement("button");
  pipelineButton.type = "button";
  pipelineButton.textContent = "Подготовить автономный пайплайн";
  pipelineButton.addEventListener("click", () => prepareAutonomousPipeline(project.id));
  actions.append(pipelineButton);

  const draftBlock = renderAutonomousPipelineDraft(project);

  summary.append(title, heading, details, actions);

  if (draftBlock) {
    summary.append(draftBlock);
  }

  return summary;
}

function renderProjectWorkspaceTab(content, projectId, tabKey) {
  const project = getProjectById(projectId);
  content.innerHTML = "";

  if (!project) {
    content.textContent = "Проект не найден.";
    return;
  }

  if (tabKey === "blueprint") {
    const identitySummary = renderProjectIdentitySummary(project);
    if (identitySummary) {
      content.append(identitySummary);
    }

    const blueprint = document.createElement("pre");
    blueprint.className = "project-workspace-text";
    blueprint.textContent = project.finalBlueprintText || "Blueprint пока не сохранён.";
    content.append(blueprint);

    if (project.status === "blueprint_ready" || project.status === "approved") {
      renderBlueprintActions(project, getBlueprintActionOptions(content));
    }

    return;
  }

  if (tabKey === "workflow") {
    const identitySummary = renderProjectIdentitySummary(project);
    if (identitySummary) {
      content.append(identitySummary);
    }

    renderWorkflowTab(project, getWorkflowUiOptions(content));
    return;
  }

  if (tabKey === "execution") {
    const contentSummary = renderContentMultiplicationSummary(project);
    if (contentSummary) {
      content.append(contentSummary);
    }

    renderExecutionTab(project, getExecutionUiOptions(content));
    return;
  }

  if (tabKey === "assets") {
    renderAssetsTab(project, getAssetsUiOptions(content));
    return;
  }

  if (tabKey === "export") {
    const contentSummary = renderContentMultiplicationSummary(project);
    if (contentSummary) {
      content.append(contentSummary);
    }

    renderExportTab(project, getExportUiOptions(content));
    return;
  }

  if (tabKey === "next") {
    renderNextStepsTab(project, getWorkflowUiOptions(content));
  }
}

function getWorkflowUiOptions(content) {
  return {
    content,
    loadProjects,
    saveProjects,
    updateProject: updateProjectInStorage,
    normalizeWorkflowState: normalizeProjectWorkflowState,
    openProjectWorkspace: (projectId, tabKey) => openProjectWorkspace(projectId, getProjectWorkspaceOptions(tabKey)),
    showChatMessage: appendMessage,
    renderProjectsList: renderProjects,
    renderNextActions: appendProjectContinuationActions,
    productionWorkflowSteps
  };
}

function getAssetsUiOptions(content) {
  return {
    content,
    loadProjects,
    updateProject: updateProjectInStorage,
    showChatMessage: appendMessage,
    renderProjectsList: renderProjects,
    projectAssetCategories
  };
}

function getExportUiOptions(content = document.createElement("div")) {
  return {
    content,
    loadProjects,
    updateProject: updateProjectInStorage,
    showChatMessage: appendMessage,
    saveProjectSectionAsAsset,
    renderProjectsList: renderProjects
  };
}

function getBlueprintActionOptions(content) {
  return {
    content,
    loadProjects,
    updateProject: updateProjectInStorage,
    openProjectWorkspace: (projectId, tabKey = "blueprint") => openProjectWorkspace(projectId, getProjectWorkspaceOptions(tabKey)),
    showChatMessage: appendMessage,
    renderProjectsList: renderProjects
  };
}

function getExecutionUiOptions(content) {
  return {
    content,
    loadProjects,
    updateProject: updateProjectInStorage,
    showChatMessage: appendMessage,
    renderProjectsList: renderProjects,
    openAsset: (projectId, category, assetId) => openAsset(projectId, category, assetId, getAssetsUiOptions(content)),
    copyAsset: (projectId, category, assetId) => copyAsset(projectId, category, assetId, getAssetsUiOptions(content)),
    openProjectWorkspace: (projectId, tabKey = "assets") => openProjectWorkspace(projectId, getProjectWorkspaceOptions(tabKey))
  };
}

function getAnswer(project, key, fallback = "Нужно уточнить") {
  return String(project.workflowAnswers?.[key] || "").trim() || fallback;
}

function generateProjectSection(project, actionKey) {
  const idea = getAnswer(project, "idea", project.title);
  const concept = getAnswer(project, "concept", "ясное, живое впечатление");
  const script = getAnswer(project, "script", "показать главную мысль проекта в первые секунды");
  const voice = getAnswer(project, "voice", "спокойная уверенная подача");
  const visualStyle = getAnswer(project, "visual_style", "чистый визуальный стиль");
  const images = getAnswer(project, "images", "кадры и визуалы по теме проекта");
  const assembly = getAnswer(project, "assembly", "ритмичный монтаж с акцентом на смысл");
  const publication = getAnswer(project, "publication", "заголовок, подпись, CTA и хэштеги");

  const sections = {
    voice_script: {
      title: "🎙 Озвучка",
      content: `Готовый voice script:

${script}

${idea}

Это не просто ролик. Это короткое приглашение увидеть идею, почувствовать её и сделать следующий шаг.

Подача: ${voice}
Ощущение: ${concept}`
    },
    visuals: {
      title: "🖼 Визуалы",
      content: `Список сцен / visual prompts:

1. Первый кадр: сильный визуальный хук по теме «${idea}».
2. Основной образ: ${images}.
3. Атмосфера: ${visualStyle}.
4. Детали: крупные планы, свет, движение, живые переходы.
5. Финальный кадр: спокойное завершение с ощущением «${concept}».

Пока это текстовые visual prompts. Генерация изображений не запускается.`
    },
    editing: {
      title: "🎥 Монтаж",
      content: `Editing plan:

1. 0-3 сек: хук — ${script}.
2. 3-10 сек: раскрыть идею через 2-3 коротких смысловых кадра.
3. 10-20 сек: усилить ощущение — ${concept}.
4. 20-30 сек: собрать вывод и мягкий CTA.

Ритм: ${assembly}.
Визуальная опора: ${visualStyle}.`
    },
    publication_text: {
      title: "📝 Текст публикации",
      content: `Заголовок:
${project.title}

Caption:
${publication}

Этот ролик — о ${idea}

CTA:
Если откликается, сохраните и вернитесь к этому, когда будете готовы сделать следующий шаг.

Хэштеги:
#ESSA #ESSAEvolution #путьксебе #осознанность #production`
    },
    publish_package: {
      title: "📤 Пакет публикации",
      content: `Publish package:

Формат: короткий production-ролик.
Описание: ${publication}
Визуалы: ${images}
Озвучка: ${voice}
Монтаж: ${assembly}

Перед публикацией проверить:
- длительность;
- читаемость текста;
- качество звука;
- обложку;
- CTA;
- соответствие площадке.`
    },
    edit_blueprint: {
      title: "✏️ Изменение Blueprint",
      content: "Что именно изменить в Blueprint: цель, сценарий, визуальный стиль, озвучку, монтаж, публикацию или весь проект целиком?"
    },
    extend_project: {
      title: "➕ Дополнение проекта",
      content: "Что добавить к проекту: новую сцену, альтернативный сценарий, другой стиль, серию роликов, рекламную версию или материалы для публикации?"
    }
  };

  return sections[actionKey] || {
    title: "Следующий шаг",
    content: "Это действие пока не настроено."
  };
}

function saveProjectUpdate(projectId, action) {
  const projects = loadProjects();
  const index = projects.findIndex((item) => item.id === projectId);

  if (index === -1) {
    appendMessage("navigator", "Не получилось обновить проект: он не найден в localStorage.", "error");
    return;
  }

  const project = projects[index];
  const section = generateProjectSection(project, action.key);
  const update = {
    id: `update_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: action.key,
    title: section.title,
    content: section.content,
    createdAt: new Date().toISOString()
  };

  project.updates = [...(project.updates || []), update];
  project.generatedSections = {
    ...(project.generatedSections || {}),
    [action.key]: section.content
  };
  saveProjectSectionAsAsset(project, action.key, section, update.createdAt);
  project.lastUpdatedAt = update.createdAt;
  projects[index] = project;
  saveProjects(projects);
  renderProjects();

  appendMessage("navigator", `${section.title}\n${section.content}`);
}

function saveProjectSectionAsAsset(project, actionKey, section, createdAt) {
  const categoryKey = projectAssetCategoryByAction[actionKey];

  if (!categoryKey) {
    return;
  }

  project.assets = normalizeProject(project).assets;
  project.assets[categoryKey].push({
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: section.title,
    type: categoryKey,
    description: `Создано действием: ${actionKey}`,
    content: section.content,
    createdAt,
    updatedAt: createdAt
  });
}

function loadWorkflowState() {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function saveWorkflowState(state) {
  sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(state));
}

function clearWorkflowState() {
  sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
}

function loadWebsiteWorkflowState() {
  try {
    return JSON.parse(sessionStorage.getItem(WEBSITE_WORKFLOW_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function saveWebsiteWorkflowState(state) {
  sessionStorage.setItem(WEBSITE_WORKFLOW_STORAGE_KEY, JSON.stringify(state));
}

function clearWebsiteWorkflowState() {
  sessionStorage.removeItem(WEBSITE_WORKFLOW_STORAGE_KEY);
}

function normalizeWorkspaceText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function isWebsiteCorePlan(corePlan) {
  return corePlan?.intent === "website" || corePlan?.workflowId === "website_project" || corePlan?.workflow?.id === "website_project";
}

function wantsImmediateWebsiteProject(text) {
  const normalized = normalizeWorkspaceText(text);

  return normalized.includes("сделай сразу") ||
    normalized.includes("сразу blueprint") ||
    normalized.includes("сразу блюпринт") ||
    normalized.includes("сразу пакет");
}

function hasDetailedWebsiteRequest(text) {
  const normalized = normalizeWorkspaceText(text);
  const detailMarkers = [
    "разделы:",
    "страницы:",
    "аудитория:",
    "цель:",
    "логотип",
    "портфолио",
    "интернет-магазин",
    "каталог",
    "crm",
    "оплата",
    "брендбук",
    "тексты готовы",
    "фото готовы"
  ];
  const markerCount = detailMarkers.filter((marker) => normalized.includes(marker)).length;
  const words = normalized.split(" ").filter(Boolean);

  return wantsImmediateWebsiteProject(normalized) || markerCount >= 2 || words.length >= 18;
}

function shouldStartWebsiteWorkflow(message, corePlan) {
  const normalized = normalizeWorkspaceText(message);

  if (!isWebsiteCorePlan(corePlan) || hasDetailedWebsiteRequest(normalized)) {
    return false;
  }

  return normalized.includes("сайт") || normalized.includes("лендинг");
}

function isWebsiteWorkflowActive() {
  const state = loadWebsiteWorkflowState();

  return Boolean(state?.active && !state.completed);
}

function formatWebsiteQuestion(step) {
  const options = Array.isArray(step.options) && step.options.length
    ? `\n\n${step.options.map((option) => `- ${option}`).join("\n")}`
    : "";

  return `${step.question}${options}`;
}

function startWebsiteWorkflow(message, corePlan, historyId) {
  const state = {
    active: true,
    completed: false,
    currentStepIndex: 0,
    answers: {},
    corePlan,
    historyId,
    initialRequest: message,
    createdAt: new Date().toISOString()
  };

  saveWebsiteWorkflowState(state);
  updateHistoryEntry(historyId, {
    ...getCorePlanHistoryFields(corePlan),
    status: "website_intake"
  });
  appendMessage("navigator", formatWebsiteQuestion(websiteWorkflowSteps[0]), "", {
    corePlan,
    websiteIntakeStatus: "active"
  });
}

function getWebsiteWorkflowAnswers(state) {
  return websiteWorkflowSteps.reduce((answers, step) => {
    answers[step.key] = state.answers?.[step.key] || "";
    return answers;
  }, {});
}

function buildWebsiteCompletionMessage() {
  return "Информации достаточно. Я могу создать проект сайта.";
}

async function advanceWebsiteWorkflow(answer) {
  const state = loadWebsiteWorkflowState();

  if (!state?.active || state.completed) {
    return false;
  }

  const step = websiteWorkflowSteps[state.currentStepIndex];

  if (!step) {
    clearWebsiteWorkflowState();
    return false;
  }

  state.answers[step.key] = answer;
  state.currentStepIndex += 1;

  if (state.currentStepIndex >= websiteWorkflowSteps.length) {
    state.active = false;
    state.completed = true;
    saveWebsiteWorkflowState(state);
    updateHistoryEntry(state.historyId, {
      status: "website_intake_completed"
    });
    appendMessage("navigator", buildWebsiteCompletionMessage(), "", {
      corePlan: state.corePlan,
      websiteIntakeStatus: "completed",
      websiteAnswers: getWebsiteWorkflowAnswers(state),
      historyId: state.historyId
    });
    return true;
  }

  saveWebsiteWorkflowState(state);
  appendMessage("navigator", formatWebsiteQuestion(websiteWorkflowSteps[state.currentStepIndex]), "", {
    corePlan: state.corePlan,
    websiteIntakeStatus: "active"
  });
  return true;
}

function isStartToFinish(message) {
  const text = message.toLowerCase();

  return text.includes("старт → финиш") ||
    text.includes("старт -> финиш") ||
    text.includes("старт - финиш") ||
    text.includes("старт финиш");
}

function isProductionWorkflowActive() {
  const state = loadWorkflowState();

  return Boolean(state?.active && selectedModule === PRODUCTION_STUDIO);
}

function formatWorkflowRoute(state) {
  return productionWorkflowSteps
    .map((step, index) => {
      const number = STEP_NUMBERS[index] || `${index + 1}.`;

      if (index < state.currentStepIndex) {
        return `✅ ${number} ${step.label}`;
      }

      if (index === state.currentStepIndex) {
        return `🟡 ${number} ${step.label}`;
      }

      return `🔒 ${number} ${step.label}`;
    })
    .join("\n");
}

function buildWorkflowStartMessage(state) {
  const currentStep = productionWorkflowSteps[state.currentStepIndex];

  return `🎬 Маршрут проекта создан.

${formatWorkflowRoute(state)}

Начнём с первого шага.

**${currentStep.question}**`;
}

function buildWorkflowAdvanceMessage(state, completedStep) {
  const currentStep = productionWorkflowSteps[state.currentStepIndex];

  if (!currentStep) {
    return `✅ Маршрут проекта завершён.

${formatWorkflowRoute({
  ...state,
  currentStepIndex: productionWorkflowSteps.length
})}

Отлично. Все основные шаги пройдены. Следующий этап — собрать финальный рабочий пакет проекта. Пока это заглушка: генерация полного финального проекта будет подключена отдельным шагом.`;
  }

  return `${formatWorkflowRoute(state)}

Отлично. ${completedStep.completed}

${completedStep.nextIntro}

**${currentStep.question}**`;
}

function buildFinalWorkflowContext(state) {
  return {
    type: "production_workflow_final_context",
    projectType: state.projectType,
    action: state.action,
    answers: state.answers,
    steps: productionWorkflowSteps.map((step) => ({
      key: step.key,
      label: step.label,
      answer: state.answers[step.key] || ""
    })),
    completedAt: new Date().toISOString()
  };
}

async function requestFinalProductionBlueprint(state) {
  const context = buildFinalWorkflowContext(state);
  const message = `${FINAL_CONTEXT_MARKER}\n${JSON.stringify(context, null, 2)}`;

  setLoading(true);
  console.log("[workspace-routing] intent=production_studio source=workflow_final_context hint=final_blueprint");

  try {
    const response = await fetch("/api/workspace-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        sessionId: getSessionId(),
        modulePrompt: "ESSA Production Studio routing hint: production_studio. Build final Production Blueprint from structured workflow context."
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Workspace chat failed");
    }

    appendMessage("navigator", data.reply || "");
  } catch (error) {
    appendMessage(
      "navigator",
      "Не получилось собрать финальный Production Blueprint. Ответы сохранены в текущей сессии, можно попробовать ещё раз.",
      "error"
    );
  } finally {
    setLoading(false);
    promptInput.focus();
  }
}

function startProductionWorkflow() {
  const state = {
    active: true,
    projectType: "video",
    action: selectedProductionAction || "Создать ролик",
    currentStepIndex: 0,
    answers: {},
    createdAt: new Date().toISOString()
  };

  saveWorkflowState(state);
  appendMessage("navigator", buildWorkflowStartMessage(state));
}

async function advanceProductionWorkflow(answer) {
  const state = loadWorkflowState();

  if (!state?.active) {
    return false;
  }

  const completedStep = productionWorkflowSteps[state.currentStepIndex];

  if (!completedStep) {
    clearWorkflowState();
    appendMessage("navigator", "Маршрут уже завершён. Можно начать новый проект в ESSA Production Studio.");
    return true;
  }

  state.answers[completedStep.key] = answer;
  state.currentStepIndex += 1;

  if (state.currentStepIndex >= productionWorkflowSteps.length) {
    state.active = false;
    state.completed = true;
  }

  saveWorkflowState(state);

  if (state.completed) {
    appendMessage(
      "navigator",
      `${formatWorkflowRoute({
        ...state,
        currentStepIndex: productionWorkflowSteps.length
      })}

Отлично. ${completedStep.completed}

Все шаги пройдены. Собираю финальный Production Blueprint из ваших ответов.`
    );
    await requestFinalProductionBlueprint(state);
    return true;
  }

  appendMessage("navigator", buildWorkflowAdvanceMessage(state, completedStep));
  return true;
}

function appendActionButtons(article) {
  const actions = document.createElement("div");
  actions.className = "message-actions";

  [
    "🟢 Утвердить проект",
    "✏️ Изменить",
    "➕ Дополнить",
    "🎙 Создать озвучку",
    "🖼 Подготовить визуалы",
    "🎥 Перейти к монтажу",
    "📤 Подготовить публикацию",
    "❌ Завершить"
  ].forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = true;
    actions.append(button);
  });

  article.append(actions);
}

function appendSaveProjectButton(article, blueprintText) {
  const actions = document.createElement("div");
  actions.className = "message-actions";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "💾 Сохранить в Мои проекты";
  button.disabled = false;
  button.className = "save-project-button";
  button.addEventListener("click", () => {
    saveCurrentProductionProject(blueprintText);
    button.disabled = true;
    button.textContent = "✅ Сохранено в Мои проекты";
  });

  actions.append(button);
  article.append(actions);
}

function appendProjectContinuationActions(article, project) {
  const wrapper = document.createElement("div");
  wrapper.className = "project-next-actions";

  const title = document.createElement("h4");
  title.textContent = "Следующие шаги";

  const actions = document.createElement("div");
  actions.className = "message-actions";

  projectNextActions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.disabled = false;
    button.addEventListener("click", () => saveProjectUpdate(project.id, action));
    actions.append(button);
  });

  wrapper.append(title, actions);
  article.append(wrapper);
}

function formatCoreIntentLabel(intent) {
  const labels = {
    production: "Production",
    website: "Website",
    property: "Property",
    marketing: "Marketing",
    legal: "Legal",
    travel: "Travel",
    education: "Education",
    psychology: "Psychology",
    product_essa: "ESSA Products",
    digital_identity: "Digital Identity"
  };

  return labels[intent] || intent;
}

function appendCorePlanBlock(article, corePlan, options = {}) {
  if (!corePlan || corePlan.intent === "unknown") {
    return;
  }

  const block = document.createElement("div");
  block.className = "core-plan-block";

  const title = document.createElement("strong");
  title.textContent = "ESSA определила:";

  const direction = document.createElement("p");
  direction.textContent = `🎬 Направление: ${formatCoreIntentLabel(corePlan.intent)}`;

  const agent = document.createElement("p");
  agent.textContent = `🧭 Агент: ${corePlan.agent || "Navigator Agent"}`;

  const workflow = document.createElement("p");
  workflow.textContent = `🧩 Маршрут: ${corePlan.workflowId || corePlan.workflow?.id || "не выбран"}`;

  const createButton = document.createElement("button");
  createButton.type = "button";
  const isWebsiteIntakePending = isWebsiteCorePlan(corePlan) && options.websiteIntakeStatus === "active";

  if (isWebsiteIntakePending) {
    createButton.textContent = "Сначала ответьте на вопросы";
    createButton.disabled = true;
  } else {
    createButton.textContent = "➕ Создать проект";
    createButton.addEventListener("click", () => {
      const project = createProjectFromCorePlan(corePlan, {
        historyId: options.historyId,
        workflowAnswers: options.websiteAnswers
      });

      if (project) {
        createButton.disabled = true;
        createButton.textContent = "✅ Проект создан";
      }
    });
  }

  block.append(title, direction, agent, workflow, createButton);
  article.append(block);
}

function scrollChatToBottom(behavior = "smooth") {
  if (!chatMessages) {
    return;
  }

  requestAnimationFrame(() => {
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior
    });
  });
}

function resizeComposer() {
  if (!promptInput) {
    return;
  }

  promptInput.style.height = "auto";
  const maxHeight = Number.parseInt(getComputedStyle(promptInput).maxHeight, 10) || 180;
  const nextHeight = Math.min(promptInput.scrollHeight, maxHeight);
  promptInput.style.height = `${nextHeight}px`;
  promptInput.style.overflowY = promptInput.scrollHeight > maxHeight ? "auto" : "hidden";
}

function appendMessage(role, text, variant = "", options = {}) {
  const article = document.createElement("article");
  article.className = `chat-message ${role} ${variant}`.trim();

  const label = document.createElement("span");
  label.textContent = role === "user" ? "Вы" : "ESSA Navigator";

  const content = document.createElement("p");
  content.textContent = text;

  article.append(label);

  if (role === "navigator") {
    appendCorePlanBlock(article, options.corePlan, options);
  }

  article.append(content);

  if (role === "navigator" && text.includes("Что делаем дальше?")) {
    appendActionButtons(article);
  }

  if (
    !options.skipProjectActions &&
    role === "navigator" &&
    text.includes("🎬 Проект") &&
    text.includes("🟢 Утвердить проект")
  ) {
    lastFinalBlueprintText = text;
    appendSaveProjectButton(article, text);
  }

  if (options.projectContinuation) {
    appendProjectContinuationActions(article, options.projectContinuation);
    renderExportTab(options.projectContinuation, getExportUiOptions(article));
    renderAssetsTab(options.projectContinuation, getAssetsUiOptions(article));
  }

  if (options.projectExport) {
    renderExportTab(options.projectExport, getExportUiOptions(article));
    renderAssetsTab(options.projectExport, getAssetsUiOptions(article));
  }

  chatMessages.append(article);
  scrollChatToBottom("smooth");
}

function setLoading(isLoading) {
  const button = promptForm.querySelector("button");
  button.disabled = isLoading;
  button.textContent = isLoading ? "Думаю..." : "Начать";
}

async function sendWorkspaceMessage(message, modulePrompt = modulePrompts[selectedModule] || "", options = {}) {
  appendMessage("user", message);
  const historyEntry = createHistoryEntry(message);
  const activeWorkflowState = options.skipWorkflowState || isWorkflowExitMessage(message)
    ? null
    : loadActiveWorkflowState();

  if (isWorkflowExitMessage(message)) {
    clearActiveWorkflowState();
  }

  const effectiveModulePrompt = selectedModule === PRODUCTION_STUDIO
    ? `${modulePrompt || modulePrompts[PRODUCTION_STUDIO] || ""}\n\n${getProductionIdentityContextPrompt()}`
    : modulePrompt;

  if (selectedModule === PRODUCTION_STUDIO && isStartToFinish(message)) {
    updateHistoryEntry(historyEntry.id, {
      intent: "production",
      agent: "Production Agent",
      workflowId: "production_video",
      status: "production_workflow"
    });
    startProductionWorkflow();
    promptInput.focus();
    return;
  }

  if (selectedModule !== PRODUCTION_STUDIO && isWebsiteWorkflowActive() && await advanceWebsiteWorkflow(message)) {
    updateHistoryEntry(historyEntry.id, {
      intent: "website",
      agent: "Website Agent",
      workflowId: "website_project",
      status: "website_intake_answer"
    });
    promptInput.focus();
    return;
  }

  if (isProductionWorkflowActive() && await advanceProductionWorkflow(message)) {
    updateHistoryEntry(historyEntry.id, {
      intent: "production",
      agent: "Production Agent",
      workflowId: "production_video",
      status: "production_workflow_answer"
    });
    promptInput.focus();
    return;
  }

  setLoading(true);
  console.log(`[workspace-routing] intent=pending source=browser hint=${effectiveModulePrompt || "none"}`);

  try {
    const response = await fetch("/api/workspace-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        sessionId: getSessionId(),
        modulePrompt: effectiveModulePrompt,
        workflowState: activeWorkflowState,
        requestContext: buildWorkspaceRequestContext(message, activeWorkflowState)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Workspace chat failed");
    }

    updateHistoryEntry(historyEntry.id, getCorePlanHistoryFields(data.core_plan));
    const savedResponseProject = saveWorkspaceResponseProject(data, historyEntry.id);

    if (savedResponseProject && data.workflow_state) {
      data.workflow_state = {
        ...data.workflow_state,
        linkedProjectId: savedResponseProject.id,
        artifactSaved: true,
        goalState: {
          ...(data.workflow_state.goalState || data.goalState || {}),
          linkedProjectId: savedResponseProject.id,
          progress: {
            ...(data.workflow_state.goalState?.progress || data.goalState?.progress || {}),
            artifact_saved: true
          }
        }
      };
    }

    if (data.workflow_state || !options.skipWorkflowState) {
      saveActiveWorkflowState(data.workflow_state || null);
    }

    if (shouldStartWebsiteWorkflow(message, data.core_plan)) {
      startWebsiteWorkflow(message, data.core_plan, historyEntry.id);
      return;
    }

    appendMessage("navigator", data.reply || "", "", {
      corePlan: data.core_plan,
      historyId: historyEntry.id
    });
  } catch (error) {
    updateHistoryEntry(historyEntry.id, {
      status: "error"
    });
    appendMessage(
      "navigator",
      "Не получилось получить ответ от Workspace API. Проверьте, что backend запущен, и попробуйте ещё раз.",
      "error"
    );
  } finally {
    setLoading(false);
    promptInput.focus();
  }
}

document.addEventListener("click", (event) => {
  const hit = event.target.closest("[data-space]");

  console.log("[document-click-capture]", {
    target: event.target.tagName,
    text: event.target.textContent?.trim(),
    hasSpaceHit: Boolean(hit),
    space: hit?.dataset?.space
  });

  updateWorkspaceDebugIndicator(hit?.dataset?.space || event.target.textContent?.trim() || event.target.tagName);
}, true);

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-space]");

  if (!target) {
    return;
  }

  if (target.dataset.action) {
    return;
  }

  const hash = target.dataset.hash || HASH_BY_SPACE[target.dataset.space];

  if (!hash) {
    console.warn("[space-click] missing hash", target.dataset.space);
    updateWorkspaceDebugIndicator(`missing hash: ${target.dataset.space || "unknown"}`);
    return;
  }

  console.log("[space-click]", hash, target.dataset.space);

  event.preventDefault();
  window.location.hash = hash;
  applyHashRoute();
  promptInput?.focus();
});

productionCardGrid?.addEventListener("click", (event) => {
  const card = event.target.closest(".production-card");

  if (!card || !productionCardGrid.contains(card)) {
    return;
  }

  const action = card.dataset.productionAction;
  const route = getProductionActionRoute(card);
  selectedProductionAction = action;
  clearWorkflowState();
  productionCards.forEach((item) => item.classList.remove("active"));
  card.classList.add("active");

  if (isContentMultiplicationAction(action, card)) {
    startProductionIntake(action);
    return;
  }

  openProductionNavigatorRoute(route, action);
});

promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = promptInput.value.trim();

  if (!message) {
    return;
  }

  promptInput.value = "";
  resizeComposer();
  sendWorkspaceMessage(message);
});

promptInput?.addEventListener("input", resizeComposer);

promptInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }

  event.preventDefault();
  promptForm.requestSubmit();
});

workspaceHistorySearch?.addEventListener("input", renderWorkspaceRecent);

openActiveIdentityButton?.addEventListener("click", () => {
  window.location.hash = "#identity";
  applyHashRoute();
});

changeActiveIdentityButton?.addEventListener("click", () => {
  appendMessage("navigator", "Выбор других цифровых личностей будет подключён позже.");
});

window.addEventListener("hashchange", applyHashRoute);
applyHashRoute();
setActiveIdentity(getActiveIdentityId());
updateWorkspaceDebugIndicator();
renderWorkspaceRecent();
resizeComposer();
scrollChatToBottom("auto");
