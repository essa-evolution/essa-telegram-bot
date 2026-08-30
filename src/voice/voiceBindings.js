import { getVoiceConfig, voiceEnvKeys } from "./voiceConfig.js";

export const voiceProviderBindingContract = {
  identityId: null,
  voiceIdentityId: null,
  provider: null,
  providerVoiceIdEnv: null,
  legacyProviderVoiceIdEnv: null,
  model: null,
  status: "unconfigured",
  capabilities: [],
  metadata: {}
};

export const voiceRequestContract = {
  identityId: null,
  text: "",
  language: null,
  purpose: null,
  deliveryIntent: {},
  outputFormat: "mp3",
  projectId: null,
  goalId: null,
  traceId: null
};

export const lisaVoiceBinding = {
  ...voiceProviderBindingContract,
  identityId: "lisa",
  voiceIdentityId: "lisa_voice",
  provider: "elevenlabs",
  providerVoiceIdEnv: voiceEnvKeys.elevenLabsLisaVoiceId,
  legacyProviderVoiceIdEnv: voiceEnvKeys.elevenLabsVoiceId,
  model: "eleven_multilingual_v2",
  status: "configured_by_environment",
  capabilities: ["tts", "multilingual_voice", "production_voiceover"],
  metadata: {
    stableIdentity: true,
    dynamicDeliverySupportedAsIntent: true,
    note: "Provider-specific expressive controls must be mapped by the provider adapter later."
  }
};

export function createVoiceRequest(input = {}) {
  return {
    ...voiceRequestContract,
    identityId: input.identityId || "lisa",
    text: String(input.text || ""),
    language: input.language || "ru",
    purpose: input.purpose || "production_voiceover",
    deliveryIntent: input.deliveryIntent || {},
    outputFormat: input.outputFormat || "mp3",
    projectId: input.projectId || null,
    goalId: input.goalId || null,
    traceId: input.traceId || null
  };
}

export function getVoiceBinding(identityId = "lisa") {
  if (identityId === lisaVoiceBinding.identityId) {
    return { ...lisaVoiceBinding, metadata: { ...lisaVoiceBinding.metadata } };
  }

  return null;
}

export function resolveVoiceBinding(identityId = "lisa") {
  const binding = getVoiceBinding(identityId);
  const config = getVoiceConfig();

  if (!binding) {
    return {
      binding: null,
      provider: null,
      providerModel: null,
      providerVoiceId: null,
      safeStatus: "NOT_FOUND",
      configured: false,
      executable: false,
      missing: ["voice_binding"]
    };
  }

  const providerVoiceId =
    config.env.elevenLabsLisaVoiceId ||
    config.env.elevenLabsVoiceId ||
    null;
  const apiKey = config.env.elevenLabsApiKey || null;
  const missing = [];

  if (!apiKey) missing.push(voiceEnvKeys.elevenLabsApiKey);
  if (!providerVoiceId) missing.push(binding.providerVoiceIdEnv);

  return {
    binding,
    provider: binding.provider,
    providerModel: binding.model,
    providerVoiceId,
    safeStatus: missing.length ? "NOT_CONFIGURED" : "READY_FOR_PROVIDER_CALL",
    configured: missing.length === 0,
    executable: missing.length === 0,
    missing,
    safeConfig: {
      apiKey: apiKey ? "PRESENT" : "MISSING",
      providerVoiceId: providerVoiceId ? "PRESENT" : "MISSING",
      preferredVoiceIdEnv: binding.providerVoiceIdEnv,
      legacyVoiceIdEnv: binding.legacyProviderVoiceIdEnv
    }
  };
}

export function prepareVoiceSynthesisRequest(input = {}) {
  const voiceRequest = createVoiceRequest(input);
  const resolution = resolveVoiceBinding(voiceRequest.identityId);

  return {
    voiceRequest,
    binding: resolution.binding,
    provider: resolution.provider,
    providerModel: resolution.providerModel,
    safeStatus: resolution.safeStatus,
    executable: resolution.executable,
    missing: resolution.missing,
    providerCallRequired: true,
    providerCallMade: false
  };
}
