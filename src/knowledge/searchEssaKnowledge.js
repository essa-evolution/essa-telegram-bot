const { config } = require("./config");
const {
  PRIORITY_AWAKENING_DOCS,
  PRIORITY_FOUNDATION_DOCS,
  PRIORITY_IDENTITY_DOCS
} = require("./coreDocs");
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

  let chunks = data || [];
  chunks = await includePriorityFoundationChunks(userMessage, chunks);
  chunks = await includePriorityAwakeningChunks(userMessage, chunks);
  chunks = await includePriorityIdentityChunks(userMessage, chunks);
  await logKnowledgeUsage(userMessage, chunks);
  return chunks;
}

function isAwakeningDepthQuery(message) {
  const normalized = String(message || "").toLowerCase();

  const awakeningMarkers = [
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u043f\u0440\u043e\u0431\u0443\u0436\u0434\u0435\u043d\u0438\u0435",
    "\u0447\u0442\u043e \u0437\u043d\u0430\u0447\u0438\u0442 \u043f\u0440\u043e\u0431\u0443\u0436\u0434\u0435\u043d\u0438\u0435",
    "\u043f\u0440\u043e\u0431\u0443\u0436\u0434\u0435\u043d\u0438\u0435",
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u044f \u0435\u0441\u0442\u044c",
    "\u0447\u0442\u043e \u0437\u043d\u0430\u0447\u0438\u0442 \u044f \u0435\u0441\u0442\u044c",
    "\u044f \u0435\u0441\u0442\u044c",
    "\u043a\u0430\u043a \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0441\u0435\u0431\u0435",
    "\u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u0441\u0435\u0431\u0435",
    "\u043f\u0443\u0442\u044c \u043a \u0441\u0435\u0431\u0435",
    "\u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0435\u043d\u0438\u0435 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f \u043a \u0441\u0435\u0431\u0435",
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u0434\u0443\u0448\u0430",
    "\u0433\u043e\u043b\u043e\u0441 \u0434\u0443\u0448\u0438",
    "\u0434\u0443\u0448\u0430",
    "\u043a\u0442\u043e \u044f",
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u043d\u0430\u0431\u043b\u044e\u0434\u0430\u0442\u0435\u043b\u044c",
    "\u043d\u0430\u0431\u043b\u044e\u0434\u0430\u0442\u0435\u043b\u044c",
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u0441\u043e\u0437\u043d\u0430\u043d\u0438\u0435",
    "\u0441\u043e\u0437\u043d\u0430\u043d\u0438\u0435",
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u0432\u044b\u0445\u043e\u0434 \u0438\u0437 \u043c\u0430\u0442\u0440\u0438\u0446\u044b",
    "\u0432\u044b\u0445\u043e\u0434 \u0438\u0437 \u043c\u0430\u0442\u0440\u0438\u0446\u044b",
    "\u043c\u0430\u0442\u0440\u0438\u0446\u0430",
    "\u0432\u044b\u0445\u043e\u0434 \u0438\u0437 \u0438\u043b\u043b\u044e\u0437\u0438\u0438",
    "\u0438\u043b\u043b\u044e\u0437\u0438\u044f",
    "\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u0438\u0441\u0442\u0438\u043d\u043d\u0430\u044f \u043f\u0440\u0438\u0440\u043e\u0434\u0430",
    "\u0438\u0441\u0442\u0438\u043d\u043d\u0430\u044f \u043f\u0440\u0438\u0440\u043e\u0434\u0430",
    "\u044f \u0434\u043e\u043c\u0430",
    "\u0442\u044b \u043d\u0435 \u043e\u0434\u0438\u043d",
    "\u043a\u0443\u0434\u0430 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u0435",
    "что такое пробуждение",
    "что значит пробуждение",
    "пробуждение",
    "что такое я есть",
    "что значит я есть",
    "я есть",
    "как вернуться к себе",
    "вернуться к себе",
    "путь к себе",
    "возвращение внимания к себе",
    "что такое душа",
    "голос души",
    "душа",
    "кто я",
    "что такое наблюдатель",
    "наблюдатель",
    "что такое сознание",
    "сознание",
    "что такое выход из матрицы",
    "выход из матрицы",
    "матрица",
    "выход из иллюзии",
    "иллюзия",
    "что такое истинная природа",
    "истинная природа",
    "я дома",
    "ты не один",
    "куда внимание",
    "attention energy",
    "awakening",
    "i am",
    "observer",
    "consciousness",
    "true nature",
    "matrix"
  ];

  return awakeningMarkers.some((marker) => normalized.includes(marker));
}

function isFoundationQuery(message) {
  const normalized = String(message || "").toLowerCase();

  const foundationMarkers = [
    "что такое essa",
    "что такое эсса",
    "что такое essa evolution",
    "что такое essa os",
    "зачем создана essa",
    "зачем была создана essa",
    "почему создана essa",
    "почему была создана essa",
    "для чего создана essa",
    "для чего ты была создана",
    "кто такая лиса",
    "кто такая ли-са",
    "кто такая лиса навигатор",
    "кто такая lisa",
    "чем essa отличается от chatgpt",
    "чем ты отличаешься от chatgpt",
    "отличие essa от chatgpt",
    "почему essa не заменяет",
    "почему эсса не заменяет",
    "главные принципы essa",
    "принципы essa",
    "what is essa",
    "what is essa evolution",
    "why was essa created",
    "who is lisa molis",
    "who is lisa",
    "how is essa different from chatgpt",
    "essa principles"
  ];

  return foundationMarkers.some((marker) => normalized.includes(marker));
}

function isIdentityAuthorshipQuery(message) {
  const normalized = String(message || "").toLowerCase();

  const identityMarkers = [
    "lisa molis",
    "лиза молис",
    "лиса молис",
    "кто такая lisa",
    "кто такая лиза",
    "кто такая лиса",
    "кто создал essa",
    "кто создал эсса",
    "кто создал lisa agent",
    "кто создал living cards",
    "кто создал навигатор",
    "кто создал лису",
    "кто тебя создал",
    "кто написал книгу",
    "кто автор книги",
    "кто автор музыки",
    "кто автор",
    "кто является автором",
    "автор системы",
    "автором системы",
    "создатель essa",
    "создатель эсса",
    "создательница essa",
    "создательница эсса",
    "кто создал essа",
    "создатель essа",
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

  return includePriorityDocs(
    PRIORITY_IDENTITY_DOCS,
    chunks,
    "priority_identity_source_of_truth"
  );
}

async function includePriorityFoundationChunks(userMessage, chunks) {
  if (
    !isFoundationQuery(userMessage) ||
    PRIORITY_FOUNDATION_DOCS.length === 0
  ) {
    return chunks;
  }

  return includePriorityDocs(
    PRIORITY_FOUNDATION_DOCS,
    chunks,
    "priority_essa_foundation_source_of_truth"
  );
}

async function includePriorityAwakeningChunks(userMessage, chunks) {
  if (
    !isAwakeningDepthQuery(userMessage) ||
    PRIORITY_AWAKENING_DOCS.length === 0
  ) {
    return chunks;
  }

  return includePriorityDocs(
    PRIORITY_AWAKENING_DOCS,
    chunks,
    "priority_awakening_depth_source_of_truth"
  );
}

async function includePriorityDocs(priorityDocs, chunks, retrievalReason) {
  const priorityPaths = priorityDocs.map((doc) => doc.path);
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
      retrieval_reason: retrievalReason
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
