import crypto from "crypto";

const ttsCache = new Map();

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

export function getTtsCacheKey(provider, text) {
  return `${provider}:${hashText(text)}`;
}

export function getCachedSpeech(provider, text) {
  return ttsCache.get(getTtsCacheKey(provider, text)) || null;
}

export function setCachedSpeech(provider, text, audioBuffer) {
  if (!audioBuffer) {
    return;
  }

  ttsCache.set(getTtsCacheKey(provider, text), audioBuffer);
}

export function getVoiceCacheStats() {
  return {
    ttsEntries: ttsCache.size
  };
}
