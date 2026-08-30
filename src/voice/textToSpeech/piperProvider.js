import { getVoiceConfig } from "../voiceConfig.js";

export async function generateSpeech(text, options = {}) {
  const { env } = getVoiceConfig();
  const piperBinPath = options.piperBinPath || env.piperBinPath;
  const piperVoiceModelPath = options.piperVoiceModelPath || env.piperVoiceModelPath;

  if (!piperBinPath || !piperVoiceModelPath) {
    console.warn("piper_not_configured");
    return null;
  }

  console.warn("piper_provider_placeholder_no_runtime_execution");
  return null;
}
