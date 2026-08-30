import { getCapability } from "../src/navigator/capabilityRegistry.js";
import {
  canUseVoiceProviderInProduction,
  generateVoice,
  getVoiceHealth,
  getVoiceProviderRegistration,
  listVoiceProviderRegistrations
} from "../src/voice/index.js";
import { getVoiceConfig } from "../src/voice/voiceConfig.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) {
    failures += 1;
  }

  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const originalEnv = {
  VOICE_TTS_PROVIDER: process.env.VOICE_TTS_PROVIDER,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_LISA_VOICE_ID: process.env.ELEVENLABS_LISA_VOICE_ID,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID
};

function restoreEnv(key, value) {
  if (typeof value === "undefined") {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

delete process.env.VOICE_TTS_PROVIDER;
delete process.env.ELEVENLABS_API_KEY;
delete process.env.ELEVENLABS_LISA_VOICE_ID;
delete process.env.ELEVENLABS_VOICE_ID;

const providers = listVoiceProviderRegistrations();
const elevenLabs = getVoiceProviderRegistration("elevenlabs");
const omniVoice = getVoiceProviderRegistration("omnivoice");

check(
  elevenLabs?.providerId === "elevenlabs" &&
    elevenLabs.role === "primary" &&
    elevenLabs.status === "primary" &&
    elevenLabs.productionApproved === true,
  "ElevenLabs remains the primary Lisa production provider",
  elevenLabs
);

check(
  omniVoice?.providerId === "omnivoice" &&
    omniVoice.status === "experimental" &&
    omniVoice.role === "secondary" &&
    omniVoice.supportsVoiceCloning === true &&
    omniVoice.multilingual === true &&
    omniVoice.selfHosted === true &&
    omniVoice.productionApproved === false &&
    omniVoice.commercialLicenseApproved === false &&
    omniVoice.requiresSeparateService === true &&
    omniVoice.executable === false,
  "OmniVoice is registered as experimental secondary non-executable provider",
  omniVoice
);

check(
  typeof omniVoice?.licenseGuard === "string" &&
    omniVoice.licenseGuard.includes("NOT approved") &&
    canUseVoiceProviderInProduction("omnivoice") === false,
  "OmniVoice license guard prevents Production use",
  {
    licenseGuard: omniVoice?.licenseGuard,
    productionUsable: canUseVoiceProviderInProduction("omnivoice")
  }
);

const config = getVoiceConfig();
check(
  config.defaultTtsProvider === "elevenlabs" &&
    config.providers.tts.includes("elevenlabs") &&
    config.providers.tts.includes("omnivoice"),
  "Voice config remains provider-independent with ElevenLabs default",
  {
    defaultTtsProvider: config.defaultTtsProvider,
    ttsProviders: config.providers.tts
  }
);

const health = getVoiceHealth();
const omniHealth = health.ttsProviders.find((provider) => provider.providerId === "omnivoice");
check(
  omniHealth?.status === "EXPERIMENTAL_NOT_CONFIGURED" &&
    omniHealth.executable === false &&
    omniHealth.productionApproved === false &&
    omniHealth.commercialLicenseApproved === false,
  "Voice health reports OmniVoice as EXPERIMENTAL_NOT_CONFIGURED",
  omniHealth
);

const ttsCapability = getCapability("voice_tts");
check(
  ttsCapability.preferredProvider === "elevenlabs" &&
    ttsCapability.providers.includes("elevenlabs") &&
    ttsCapability.providers.includes("omnivoice") &&
    ttsCapability.metadata.primaryProvider === "elevenlabs" &&
    ttsCapability.metadata.secondaryProviders.some((provider) =>
      provider.providerId === "omnivoice" &&
        provider.executable === false &&
        provider.productionApproved === false
    ),
  "Navigator capability registry exposes OmniVoice only as secondary metadata",
  {
    providers: ttsCapability.providers,
    preferredProvider: ttsCapability.preferredProvider,
    secondaryProviders: ttsCapability.metadata.secondaryProviders
  }
);

const omniAudio = await generateVoice("Phase 19I OmniVoice registration test.", {
  provider: "omnivoice"
});

check(
  omniAudio === null,
  "Router has no OmniVoice execution bridge and returns null without provider call",
  {
    result: omniAudio,
    registeredProviders: providers.map((provider) => provider.providerId)
  }
);

restoreEnv("VOICE_TTS_PROVIDER", originalEnv.VOICE_TTS_PROVIDER);
restoreEnv("ELEVENLABS_API_KEY", originalEnv.ELEVENLABS_API_KEY);
restoreEnv("ELEVENLABS_LISA_VOICE_ID", originalEnv.ELEVENLABS_LISA_VOICE_ID);
restoreEnv("ELEVENLABS_VOICE_ID", originalEnv.ELEVENLABS_VOICE_ID);

if (failures > 0) {
  console.error(`OmniVoice provider registration tests failed: ${failures}`);
  process.exit(1);
}

console.log("OmniVoice provider registration tests passed.");
