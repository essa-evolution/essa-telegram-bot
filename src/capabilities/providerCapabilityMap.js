import { providerCapabilitySupport } from "./capabilityContracts.js";

export const providerCapabilityMap = {
  LOCAL_FFMPEG: {
    providerId: "LOCAL_FFMPEG",
    capabilities: {
      VIDEO_TRIM: providerCapabilitySupport.verified,
      VIDEO_EDIT: providerCapabilitySupport.declaredNotVerified,
      VIDEO_EXPORT: providerCapabilitySupport.declaredNotVerified,
      FRAME_EXTRACT: providerCapabilitySupport.verified,
      AUDIO_MIX: providerCapabilitySupport.declaredNotVerified
    },
    executableNow: true
  },
  LOCAL_FFPROBE: {
    providerId: "LOCAL_FFPROBE",
    capabilities: {
      VIDEO_ANALYZE: providerCapabilitySupport.verified,
      AUDIO_ANALYZE: providerCapabilitySupport.verified
    },
    executableNow: true
  },
  LOCAL_WHISPER_CPP: {
    providerId: "LOCAL_WHISPER_CPP",
    capabilities: {
      AUDIO_TRANSCRIBE: providerCapabilitySupport.verified,
      VIDEO_TRANSCRIBE: providerCapabilitySupport.verified
    },
    executableNow: true
  },
  CONTEXT7: {
    providerId: "CONTEXT7",
    capabilities: {
      DOCUMENTATION_LOOKUP: providerCapabilitySupport.verified
    },
    executableNow: false
  },
  PLAYWRIGHT: {
    providerId: "PLAYWRIGHT",
    capabilities: {
      BROWSER_OBSERVE: providerCapabilitySupport.verified,
      BROWSER_CAPTURE: providerCapabilitySupport.verified,
      BROWSER_VERIFY: providerCapabilitySupport.verified,
      UI_VERIFY: providerCapabilitySupport.verified
    },
    executableNow: false
  },
  LOCAL_COMMUNICATION_DRY_RUN: {
    providerId: "LOCAL_COMMUNICATION_DRY_RUN",
    capabilities: {
      EMAIL_DELIVERY: providerCapabilitySupport.verified,
      WHATSAPP_DELIVERY: providerCapabilitySupport.verified,
      TELEGRAM_DELIVERY: providerCapabilitySupport.verified,
      BUSINESS_DM_DELIVERY: providerCapabilitySupport.verified
    },
    executableNow: false,
    dryRunOnly: true,
    note: "Provider-neutral local dry-run boundary only. No live communication provider is configured."
  },
  OPENAI: {
    providerId: "OPENAI",
    capabilities: {},
    capabilityStatus: providerCapabilitySupport.unknown,
    executableNow: false,
    note: "Future capabilities require verified live model metadata."
  },
  ANTHROPIC: {
    providerId: "ANTHROPIC",
    capabilities: {},
    capabilityStatus: providerCapabilitySupport.unknown,
    executableNow: false,
    note: "Future capabilities require verified live model metadata."
  },
  ZAI_GLM_5_3_FLASH: {
    providerId: "ZAI_GLM_5_3_FLASH",
    canonicalModelId: "z-ai/glm-5.3-flash",
    historicalAliases: ["Ox Alpha", "stealth/ox-alpha"],
    capabilities: {
      TEXT_REASON: providerCapabilitySupport.declaredNotVerified,
      CODE_REASON: providerCapabilitySupport.declaredNotVerified,
      IMAGE_UNDERSTAND: providerCapabilitySupport.declaredNotVerified,
      VIDEO_UNDERSTAND: providerCapabilitySupport.declaredNotVerified,
      TOOL_CALL: providerCapabilitySupport.declaredNotVerified,
      STRUCTURED_OUTPUT: providerCapabilitySupport.declaredNotVerified,
      VIDEO_EDIT: providerCapabilitySupport.unknown,
      VIDEO_EXPORT: providerCapabilitySupport.unknown
    },
    capabilityStatus: providerCapabilitySupport.declaredNotVerified,
    executableNow: false,
    researchOnly: true,
    sourceOfTruth: "artifacts/research/OxAlphaResearchArtifact.json",
    note: "WATCH/RESEARCH ONLY. Model-native media understanding must remain separate from agent harness and external renderer capabilities."
  },
  ELEVENLABS: {
    providerId: "ELEVENLABS",
    capabilities: {
      VOICE_GENERATE: providerCapabilitySupport.declaredNotVerified,
      VOICE_CLONE: providerCapabilitySupport.unknown
    },
    executableNow: false
  },
  OMNIVOICE: {
    providerId: "OMNIVOICE",
    capabilities: {
      VOICE_GENERATE: providerCapabilitySupport.declaredNotVerified
    },
    executableNow: false,
    experimental: true
  }
};

export function getProviderCandidatesForCapability(capabilityId, providers = providerCapabilityMap) {
  return Object.values(providers)
    .filter((provider) => provider.capabilities?.[capabilityId])
    .map((provider) => ({
      providerId: provider.providerId,
      supportStatus: provider.capabilities[capabilityId],
      executableNow: provider.executableNow === true,
      experimental: provider.experimental === true
    }));
}
