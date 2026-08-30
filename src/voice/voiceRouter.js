import { transcribeAudio } from "./speechToText/whisperProvider.js";
import { generateSpeech as generateElevenLabsSpeech } from "./textToSpeech/elevenLabsProvider.js";
import { generateSpeech as generateLocalSpeech } from "./textToSpeech/localTtsPlaceholder.js";
import { generateSpeech as generatePiperSpeech } from "./textToSpeech/piperProvider.js";
import { getCachedSpeech, setCachedSpeech } from "./voiceCache.js";
import { getVoiceConfig } from "./voiceConfig.js";
import { prepareVoiceSynthesisRequest } from "./voiceBindings.js";
import { recordVoiceProviderError } from "./voiceHealth.js";
import { logVoiceUsage } from "./voiceUsageLogger.js";

export async function transcribeVoice(audioBuffer) {
  const { sttProvider } = getVoiceConfig();
  const startedAt = Date.now();

  if (sttProvider === "whisper") {
    const result = await transcribeAudio(audioBuffer);
    logVoiceUsage({
      provider: sttProvider,
      operation: "stt",
      textLength: result.length,
      success: Boolean(result),
      durationMs: Date.now() - startedAt
    });

    if (!result) {
      recordVoiceProviderError("stt", new Error("empty_transcription"));
    }

    return result;
  }

  const error = new Error(`Unsupported STT provider: ${sttProvider}`);
  console.warn(error.message);
  recordVoiceProviderError("stt", error);
  logVoiceUsage({
    provider: sttProvider,
    operation: "stt",
    success: false,
    durationMs: Date.now() - startedAt,
    fallbackUsed: true
  });
  return "";
}

export async function generateVoice(text, options = {}) {
  const { defaultTtsProvider } = getVoiceConfig();
  const provider = options.provider || defaultTtsProvider;
  const startedAt = Date.now();
  const textLength = String(text || "").length;
  const cachedSpeech = getCachedSpeech(provider, text);

  if (cachedSpeech) {
    logVoiceUsage({
      provider,
      operation: "tts",
      textLength,
      success: true,
      durationMs: Date.now() - startedAt,
      fallbackUsed: false
    });
    return cachedSpeech;
  }

  let audio = null;

  if (provider === "elevenlabs") {
    audio = await generateElevenLabsSpeech(text, options);
  } else if (provider === "piper") {
    audio = await generatePiperSpeech(text, options);
  } else if (provider === "local") {
    const result = await generateLocalSpeech(text);
    console.warn(result.status);
    audio = result.audio;
  } else if (provider === "xtts" || provider === "coqui") {
    console.warn(`${provider}_tts_not_implemented`);
    audio = null;
  } else {
    console.warn(`Unsupported TTS provider: ${provider}`);
    audio = null;
  }

  if (audio) {
    setCachedSpeech(provider, text, audio);
  } else {
    recordVoiceProviderError("tts", new Error(`${provider}_tts_failed_or_not_configured`));
  }

  logVoiceUsage({
    provider,
    operation: "tts",
    textLength,
    success: Boolean(audio),
    durationMs: Date.now() - startedAt,
    fallbackUsed: !audio
  });

  return audio;
}

export function prepareProductionVoiceRequest(input = {}) {
  return prepareVoiceSynthesisRequest(input);
}
