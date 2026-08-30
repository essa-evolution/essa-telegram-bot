import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

const WEBSITE_INTAKE_REPLY = `Отлично. Я помогу собрать сайт — от идеи до готового проекта.

Чтобы не придумывать за вас, уточню несколько вещей:

1. Какой тип сайта нужен: корпоративный сайт, лендинг, интернет-магазин, портал?
2. Чем занимается компания?
3. Для кого сайт?
4. Какие разделы нужны?
5. Есть ли логотип, фото, тексты, портфолио?
6. Какой результат должен дать сайт: заявки, продажи, доверие, презентация?`;

const WEBSITE_GENERIC_PATTERNS = [
  "сделай сайт",
  "создай сайт",
  "сайт строительной компании",
  "нужен сайт компании",
  "создай лендинг",
  "сделай лендинг"
];

function normalizeWebsiteText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function wantsImmediateWebsiteBlueprint(text) {
  const normalized = normalizeWebsiteText(text);

  return normalized.includes("сделай сразу") ||
    normalized.includes("сразу blueprint") ||
    normalized.includes("сразу блюпринт") ||
    normalized.includes("сразу пакет");
}

function isWebsiteWorkflowContinuation(text) {
  const normalized = normalizeWebsiteText(text);

  return normalized.includes("website workflow") ||
    normalized.includes("project workspace") ||
    normalized.includes("начать маршрут") ||
    normalized.includes("собрать blueprint") ||
    normalized.includes("core workflow");
}

function hasDetailedWebsiteContext(text) {
  const normalized = normalizeWebsiteText(text);

  if (wantsImmediateWebsiteBlueprint(normalized) || isWebsiteWorkflowContinuation(normalized)) {
    return true;
  }

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

  return markerCount >= 2 || words.length >= 18;
}

export function shouldShowWebsiteIntake(userText) {
  const normalized = normalizeWebsiteText(userText);

  if (!normalized) {
    return false;
  }

  if (hasDetailedWebsiteContext(normalized)) {
    return false;
  }

  return WEBSITE_GENERIC_PATTERNS.some((pattern) => normalized.includes(pattern)) ||
    normalized.includes("сайт") ||
    normalized.includes("лендинг");
}

export function canBuildWebsiteBlueprint(userText) {
  return !shouldShowWebsiteIntake(userText);
}

export function buildWebsiteStudioIntakeReply(userText) {
  return shouldShowWebsiteIntake(userText) ? WEBSITE_INTAKE_REPLY : "";
}

export const websiteTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Website Studio Task Package",
  purpose: "Prepare a website or landing page package: structure, pages, sections, copy direction, assets and next steps.",
  safety: `Website Studio is an intake-first live studio.
- If the request has too little detail, ask intake questions instead of creating a full Blueprint or Task Package.
- Create a Website Blueprint only when the user gave enough website details, explicitly wrote "сделай сразу", or this is a continuation of a website workflow.
- Do not invent company facts, target audience, sections, assets, offers or style. Ask or mark them as "нужно уточнить".`,
  structure: [
    "Task Title",
    "Goal",
    "Website Type",
    "Audience",
    "Pages / Sections",
    "Hero Message",
    "Content Blocks",
    "Visual Direction",
    "Assets Needed",
    "Technical Notes",
    "Approval Block",
    "Next Step"
  ]
});
