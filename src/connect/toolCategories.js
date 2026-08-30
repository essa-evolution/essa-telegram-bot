export const toolCategories = [
  "ai_model",
  "voice",
  "image",
  "video",
  "editing",
  "music",
  "browser",
  "search",
  "automation",
  "website",
  "documents",
  "publishing",
  "storage",
  "analytics"
];

export const toolStatuses = [
  "research",
  "candidate",
  "ready",
  "active",
  "deprecated"
];

export const toolVisibility = [
  "internal_only",
  "user_visible"
];

export const costLevels = [
  "free",
  "cheap",
  "medium",
  "premium",
  "enterprise"
];

export const executionModes = [
  "local",
  "cloud",
  "browser",
  "hybrid",
  "manual",
  "placeholder"
];

export function isToolCategory(category) {
  return toolCategories.includes(category);
}
