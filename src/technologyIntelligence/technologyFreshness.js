import { createTechnologyScanSchedule } from "./technologyContracts.js";

export function createDefaultTechnologyScanSchedule(input = {}) {
  return createTechnologyScanSchedule({
    scanId: "technology_intelligence_manual_schedule",
    sourceGroups: ["OFFICIAL_PROVIDER_RELEASES", "OFFICIAL_CHANGELOGS", "GITHUB_RELEASES", "OPENROUTER_MODELS", "HUGGINGFACE_MODELS"],
    cadence: "scheduling_ready_only",
    priorityDomains: ["ai_models", "coding_agents", "media_tools", "voice_tools", "security", "infrastructure"],
    enabled: false,
    ...input
  });
}

export function classifyFreshness({ lastObservedAt = null, now = "2026-08-27T00:00:00.000Z" } = {}) {
  if (!lastObservedAt) return "UNKNOWN";
  const ageMs = new Date(now).getTime() - new Date(lastObservedAt).getTime();
  if (ageMs < 0) return "FUTURE_DATED_REVALIDATION_REQUIRED";
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return "CURRENT";
  if (ageMs <= 30 * 24 * 60 * 60 * 1000) return "RECENT";
  return "STALE_REVALIDATION_REQUIRED";
}

