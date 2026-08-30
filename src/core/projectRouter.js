import { getProjectType } from "./projectTypes.js";

function createEmptyAssets() {
  return {
    texts: [],
    voice: [],
    visuals: [],
    video: [],
    music: [],
    documents: [],
    publications: []
  };
}

function inferProductionSubtype(userText = "", workflow) {
  const text = String(userText || "").toLowerCase();

  if (
    text.includes("размножить контент") ||
    text.includes("сделать медиапакет") ||
    text.includes("медиапакет из главы") ||
    text.includes("из главы сделать контент") ||
    text.includes("из главы сделать подкаст") ||
    text.includes("из текста сделать ролики") ||
    text.includes("из текста сделать подкаст и shorts") ||
    text.includes("нарезать на shorts") ||
    text.includes("нарезать на reels") ||
    text.includes("нарезать на tiktok") ||
    text.includes("content multiplication") ||
    text.includes("media package")
  ) return "content_multiplication";

  if (workflow?.id === "content_multiplication_package") {
    return "content_multiplication";
  }

  if (text.includes("образовательная анимация")) return "educational_animation";
  if (text.includes("анимационная история")) return "animated_story";
  if (text.includes("мультфильм")) return "cartoon";
  if (text.includes("мини-фильм")) return "short_film";
  if (text.includes("документальный фильм")) return "documentary";
  if (text.includes("художественный фильм")) return "feature_film";
  if (text.includes("музыкальный клип") || text.includes("клип на песню")) return "music_video";
  if (text.includes("youtube-серия") || text.includes("youtube серия") || text.includes("youtube-канал") || text.includes("youtube канал")) return "youtube_series";
  if (text.includes("детская сказка") || text.includes("сказочный канал")) return "fairytale";

  if (workflow?.id?.startsWith("production_")) {
    return workflow.id.replace("production_", "");
  }

  return null;
}

function inferDigitalIdentitySubtype(userText = "") {
  const text = String(userText || "").toLowerCase();

  if (text.includes("lisa avatar") || text.includes("аватар лисы")) return "lisa_avatar";
  if (text.includes("talking avatar") || text.includes("говорящий аватар")) return "talking_avatar";
  if (text.includes("speaking avatar")) return "speaking_avatar";
  if (text.includes("singing avatar") || text.includes("поющий аватар")) return "singing_avatar";
  if (text.includes("аватар") || text.includes("avatar")) return "personal_avatar";

  return "lisa_avatar";
}

function inferSubtype(intent, workflow, userText = "") {
  if (intent === "production") {
    return inferProductionSubtype(userText, workflow) || "video";
  }

  if (intent === "digital_identity") {
    return inferDigitalIdentitySubtype(userText);
  }

  if (workflow?.id?.startsWith("production_")) {
    return workflow.id.replace("production_", "");
  }

  const projectType = getProjectType(intent);
  return projectType.subtypes[0] || "general";
}

function createProjectTitle(userText, workflow) {
  const cleanText = String(userText || "").trim();

  if (cleanText) {
    return cleanText.slice(0, 80);
  }

  return workflow?.title || "ESSA Project";
}

export function createProjectDraft({ userText = "", intent = "unknown", agent = "Navigator Agent", workflow = null } = {}) {
  const now = new Date().toISOString();

  return {
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: createProjectTitle(userText, workflow),
    type: getProjectType(intent).type,
    subtype: inferSubtype(intent, workflow, userText),
    agent,
    workflowId: workflow?.id || null,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    assets: createEmptyAssets(),
    workflowAnswers: {},
    finalBlueprintText: "",
    generatedSections: {},
    nextActions: []
  };
}
