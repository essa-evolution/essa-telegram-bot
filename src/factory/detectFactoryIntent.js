const CONTENT_TRIGGERS = [
  "ролик",
  "видео",
  "shorts",
  "short",
  "reels",
  "рилс",
  "контент",
  "пост",
  "публикация",
  "сценарий для видео",
  "тикток",
  "tiktok",
  "youtube shorts",
  "instagram reels"
];

const PROJECT_TRIGGERS = [
  "проект дома",
  "дом с нуля",
  "архитектура дома",
  "проектный пакет",
  "построить дом",
  "дизайн дома",
  "план дома",
  "строительный проект",
  "техническое задание",
  "тз для архитектора",
  "пакет для архитектора"
];

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text, triggers) {
  return triggers.some((trigger) => text.includes(trigger));
}

export function detectFactoryIntent(userText) {
  const text = normalizeText(userText);

  if (!text) {
    return "none";
  }

  if (includesAny(text, PROJECT_TRIGGERS)) {
    return "project_factory";
  }

  if (includesAny(text, CONTENT_TRIGGERS)) {
    return "content_factory";
  }

  return "none";
}

export const factoryIntentTriggers = {
  content: CONTENT_TRIGGERS,
  project: PROJECT_TRIGGERS
};
