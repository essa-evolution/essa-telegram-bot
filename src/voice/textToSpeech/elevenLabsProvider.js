import axios from "axios";
import { getVoiceConfig } from "../voiceConfig.js";

export async function generateSpeech(text, options = {}) {
  try {
    const { env } = getVoiceConfig();
    const providerVoiceId =
      options.providerVoiceId ||
      options.voiceId ||
      env.elevenLabsLisaVoiceId ||
      env.elevenLabsVoiceId;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${providerVoiceId}`,
      {
        text,
        model_id: options.model || "eleven_multilingual_v2"
      },
      {
        headers: {
          "xi-api-key": env.elevenLabsApiKey,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "ElevenLabs error:",
      error.response?.data?.toString?.() || error.message || error
    );
    return null;
  }
}
