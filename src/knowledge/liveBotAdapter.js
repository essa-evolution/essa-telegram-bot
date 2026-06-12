const { searchEssaKnowledge } = require("./searchEssaKnowledge");
const { buildNavigatorMessages } = require("./promptInjection");

async function buildMessagesForNavigatorResponse({
  userId,
  userMessage,
  systemPrompt,
  loadMemory,
  matchCount = 8
}) {
  if (typeof loadMemory !== "function") {
    throw new Error("buildMessagesForNavigatorResponse requires loadMemory(userId)");
  }

  const memoryContext = await loadMemory(userId);
  const knowledgeChunks = await searchEssaKnowledge(userMessage, { matchCount });

  const messages = buildNavigatorMessages({
    systemPrompt,
    memoryContext,
    knowledgeChunks,
    userMessage
  });

  return {
    messages,
    memoryContext,
    knowledgeChunks,
    usedDocuments: [...new Set(knowledgeChunks.map((chunk) => chunk.source_path))],
    usedChunkIds: knowledgeChunks.map((chunk) => chunk.id)
  };
}

module.exports = { buildMessagesForNavigatorResponse };
