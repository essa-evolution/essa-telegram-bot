import dotenv from "dotenv";

dotenv.config();

export const voiceProviderNames = {
  defaultTts: "elevenlabs",
  stt: "whisper",
  futureTts: ["omnivoice", "piper", "xtts", "coqui", "local"]
};

export const voiceEnvKeys = {
  openAiApiKey: "OPENAI_API_KEY",
  elevenLabsApiKey: "ELEVENLABS_API_KEY",
  elevenLabsLisaVoiceId: "ELEVENLABS_LISA_VOICE_ID",
  elevenLabsVoiceId: "ELEVENLABS_VOICE_ID",
  ttsProvider: "VOICE_TTS_PROVIDER",
  piperBinPath: "PIPER_BIN_PATH",
  piperVoiceModelPath: "PIPER_VOICE_MODEL_PATH"
};

export function getVoiceConfig() {
  const configuredTtsProvider =
    process.env[voiceEnvKeys.ttsProvider] || voiceProviderNames.defaultTts;

  return {
    sttProvider: voiceProviderNames.stt,
    defaultTtsProvider: configuredTtsProvider,
    providers: {
      stt: ["whisper"],
      tts: ["elevenlabs", ...voiceProviderNames.futureTts]
    },
    env: {
      openAiApiKey: process.env[voiceEnvKeys.openAiApiKey],
      elevenLabsApiKey: process.env[voiceEnvKeys.elevenLabsApiKey],
      elevenLabsLisaVoiceId: process.env[voiceEnvKeys.elevenLabsLisaVoiceId],
      elevenLabsVoiceId: process.env[voiceEnvKeys.elevenLabsVoiceId],
      ttsProvider: process.env[voiceEnvKeys.ttsProvider],
      piperBinPath: process.env[voiceEnvKeys.piperBinPath],
      piperVoiceModelPath: process.env[voiceEnvKeys.piperVoiceModelPath]
    }
  };
}
