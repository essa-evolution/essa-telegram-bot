const OpenAI = require("openai");
const { config } = require("./config");

let openai;

function getOpenAI() {
  if (!config.openaiApiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  if (!openai) {
    openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  return openai;
}

async function createEmbedding(input) {
  const response = await getOpenAI().embeddings.create({
    model: config.embeddingModel,
    input
  });

  return response.data[0].embedding;
}

module.exports = { getOpenAI, createEmbedding };
