import { getVoiceCacheStats } from "./voiceCache.js";
import { getVoiceConfig } from "./voiceConfig.js";
import { resolveVoiceBinding } from "./voiceBindings.js";
import { listVoiceProviderRegistrations } from "./providerRegistry.js";

const providerErrors = {
  stt: null,
  tts: null
};

export function recordVoiceProviderError(operation, error) {
  providerErrors[operation] = {
    message: error?.message || String(error || "unknown_error"),
    at: new Date().toISOString()
  };
}

function getTtsProviderStatus(provider, env) {
  if (provider === "elevenlabs") {
    return env.elevenLabsApiKey && (env.elevenLabsLisaVoiceId || env.elevenLabsVoiceId)
      ? "available"
      : "not_configured";
  }

  if (provider === "omnivoice") {
    return "EXPERIMENTAL_NOT_CONFIGURED";
  }

  if (provider === "piper") {
    if (!env.piperBinPath || !env.piperVoiceModelPath) {
      return "not_configured";
    }

    if (providerErrors.tts) {
      return "error";
    }

    return "available";
  }

  if (provider === "local" || provider === "xtts" || provider === "coqui") {
    return "placeholder";
  }

  return "unsupported";
}

function getTtsConfigured(provider, env) {
  if (provider === "elevenlabs") {
    return Boolean(env.elevenLabsApiKey && (env.elevenLabsLisaVoiceId || env.elevenLabsVoiceId));
  }

  if (provider === "omnivoice") {
    return false;
  }

  if (provider === "piper") {
    return Boolean(env.piperBinPath && env.piperVoiceModelPath);
  }

  return false;
}

export function getVoiceHealth() {
  const config = getVoiceConfig();
  const sttConfigured = Boolean(config.env.openAiApiKey);
  const ttsConfigured = getTtsConfigured(config.defaultTtsProvider, config.env);
  const lisaBinding = resolveVoiceBinding("lisa");
  const providers = listVoiceProviderRegistrations().map((provider) => ({
    providerId: provider.providerId,
    status: provider.providerId === "omnivoice" ? "EXPERIMENTAL_NOT_CONFIGURED" : getTtsProviderStatus(provider.providerId, config.env),
    role: provider.role,
    executable: provider.providerId === "elevenlabs"
      ? getTtsConfigured(provider.providerId, config.env)
      : false,
    productionApproved: provider.productionApproved,
    commercialLicenseApproved: provider.commercialLicenseApproved,
    requiresSeparateService: provider.requiresSeparateService,
    licenseGuard: provider.licenseGuard
  }));

  return {
    sttProvider: config.sttProvider,
    ttsProvider: config.defaultTtsProvider,
    ttsProviders: providers,
    sttConfigured,
    ttsConfigured,
    sttStatus: sttConfigured ? "available" : "not_configured",
    ttsStatus: getTtsProviderStatus(config.defaultTtsProvider, config.env),
    lisaVoiceBinding: {
      identityId: "lisa",
      binding: lisaBinding.binding ? "PRESENT" : "MISSING",
      provider: lisaBinding.provider || null,
      apiKey: lisaBinding.safeConfig?.apiKey || "MISSING",
      providerVoiceId: lisaBinding.safeConfig?.providerVoiceId || "MISSING",
      preferredVoiceIdEnv: lisaBinding.safeConfig?.preferredVoiceIdEnv || null,
      legacyVoiceIdEnv: lisaBinding.safeConfig?.legacyVoiceIdEnv || null,
      artifactBridge: "READY",
      executable: lisaBinding.executable,
      status: lisaBinding.safeStatus
    },
    cacheSize: getVoiceCacheStats().ttsEntries,
    lastError: {
      stt: providerErrors.stt,
      tts: providerErrors.tts
    }
  };
}
