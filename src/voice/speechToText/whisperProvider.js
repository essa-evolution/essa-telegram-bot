import axios from "axios";
import FormData from "form-data";
import { getVoiceConfig } from "../voiceConfig.js";

export async function transcribeAudio(audioBuffer) {
  try {
    const { env } = getVoiceConfig();
    const formData = new FormData();

    formData.append("file", audioBuffer, {
      filename: "voice.ogg",
      contentType: "audio/ogg"
    });

    formData.append("model", "whisper-1");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          ...formData.getHeaders()
        }
      }
    );

    return response.data.text;
  } catch (error) {
    console.error("Ошибка распознавания:", error.message);
    return "";
  }
}
