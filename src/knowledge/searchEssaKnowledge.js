const { config } = require("./config");
const { PRIORITY_IDENTITY_DOCS } = require("./coreDocs");
const { createEmbedding } = require("./openaiClient");
const { getSupabase } = require("./supabaseClient");

async function searchEssaKnowledge(userMessage, options = {}) {
  const matchCount = options.matchCount || config.defaultMatchCount;
  const threshold =
    options.similarityThreshold || config.defaultSimilarityThreshold;
  const embedding = await createEmbedding(userMessage);

  const { data, error } = await getSupabase().rpc("match_essa_document_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    similarity_threshold: threshold
  });

  if (error) throw error;

  const chunks = await includePriorityIdentityChunks(userMessage, data || []);
  await logKnowledgeUsage(userMessage, chunks);
  return chunks;
}

function isIdentityAuthorshipQuery(message) {
  const normalized = String(message || "").toLowerCase();

  const identityMarkers = [
    "lisa molis",
    "лиза молис",
    "кто такая lisa",
    "кто такая лиза",
    "кто создал essa",
    "кто создал essа",
    "кто создал эсса",
    "кто создал lisa agent",
    "кто создал living cards",
    "кто написал книгу",
    "кто автор книги",
    "кто автор музыки",
    "кто автор",
    "кто является автором",
    "автор системы",
    "автором системы",
    "создатель essa",
    "создатель essа",
    "создатель эсса",
    "creator of essa",
    "creator of lisa agent",
    "creator of living cards",
    "who created essa",
    "who created lisa agent",
    "who created living cards",
    "who is lisa molis",
    "author of the book",
    "author of the music",
    "author of the system"
  ];

  return identityMarkers.some((marker) => normalized.includes(marker));
}

async function includePriorityIdentityChunks(userMessage, chunks) {
  if (
    !isIdentityAuthorshipQuery(userMessage) ||
    PRIORITY_IDENTITY_DOCS.length === 0
  ) {
    return chunks;
  }

  const priorityPaths = PRIORITY_IDENTITY_DOCS.map((doc) => doc.path);
  const { data, error } = await getSupabase()
    .from("essa_document_chunks")
    .select(
      "id, document_id, source_path, title, category, chunk_index, content, token_estimate"
    )
    .in("source_path", priorityPaths)
    .order("source_path", { ascending: true })
    .order("chunk_index", { ascending: true });

  if (error) throw error;

  const seenChunkIds = new Set(chunks.map((chunk) => chunk.id));
  const priorityChunks = (data || [])
    .filter((chunk) => !seenChunkIds.has(chunk.id))
    .map((chunk) => ({
      ...chunk,
      similarity: 1,
      retrieval_reason: "priority_identity_source_of_truth"
    }));

  return [...priorityChunks, ...chunks];
}

async function logKnowledgeUsage(query, chunks) {
  const { error } = await getSupabase().from("essa_knowledge_usage_logs").insert({
    query,
    matched_chunk_ids: chunks.map((chunk) => chunk.id),
    matched_sources: [...new Set(chunks.map((chunk) => chunk.source_path))],
    match_count: chunks.length
  });

  if (error) {
    console.warn("ESSA knowledge usage log failed:", error.message);
  }
}

module.exports = { searchEssaKnowledge, isIdentityAuthorshipQuery };
