import { createProviderAdapter } from "./contracts.js";
import { createOpenAiBenchmarkAdapter } from "./openAiAdapter.js";
import { glm53FlashResearchSourcePath, glm53FlashResearchStatus } from "../../intelligence/glm53FlashResearchProfile.js";

export const providerAdapters = [
  createOpenAiBenchmarkAdapter(),
  createProviderAdapter({
    providerId: "z-ai",
    displayName: "Z.ai GLM-5.3-Flash",
    envKeys: [],
    candidateModels: [glm53FlashResearchStatus.canonicalModelId],
    capabilities: ["reasoning", "text_generation", "coding", "tool_calling", "structured_output", "long_context", "image_input", "video_input"],
    disabled: true,
    disabledReason: "Phase 21K-OX keeps GLM-5.3-Flash as WATCH/RESEARCH ONLY. Ox Alpha is only a historical stealth alias. No external calls are allowed.",
    researchOnly: true,
    sourceOfTruth: glm53FlashResearchSourcePath
  }),
  createProviderAdapter({
    providerId: "anthropic",
    displayName: "Anthropic / Claude",
    envKeys: ["ANTHROPIC_API_KEY"],
    candidateModels: ["manual-select-claude-text-reasoning-model"],
    capabilities: ["reasoning", "text_generation", "long_context", "tool_calling"]
  }),
  createProviderAdapter({
    providerId: "google_gemini",
    displayName: "Google Gemini",
    envKeys: ["GOOGLE_API_KEY"],
    candidateModels: ["manual-select-gemini-text-reasoning-model"],
    capabilities: ["reasoning", "text_generation", "structured_output", "multimodal", "long_context"]
  }),
  createProviderAdapter({
    providerId: "kimi_moonshot",
    displayName: "Kimi / Moonshot",
    envKeys: ["MOONSHOT_API_KEY"],
    candidateModels: ["manual-select-kimi-text-reasoning-model"],
    capabilities: ["reasoning", "text_generation", "long_context", "structured_output", "tool_calling"]
  })
];

export function getBenchmarkProviderAdapters() {
  return providerAdapters;
}
