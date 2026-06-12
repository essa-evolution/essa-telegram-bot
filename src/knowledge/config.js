require("dotenv").config();
const path = require("path");

const config = {
  essaOsKnowledgeRoot:
    process.env.ESA_OS_KNOWLEDGE_ROOT || path.resolve(__dirname, "../.."),
  openaiApiKey: process.env.OPENAI_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  defaultMatchCount: Number(process.env.ESSA_KNOWLEDGE_MATCH_COUNT || 8),
  defaultSimilarityThreshold: Number(
    process.env.ESSA_KNOWLEDGE_SIMILARITY_THRESHOLD || 0.2
  )
};

module.exports = { config };
