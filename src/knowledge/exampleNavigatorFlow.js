const { openai } = require("./openaiClient");
const { searchEssaKnowledge } = require("./searchEssaKnowledge");
const { buildNavigatorMessages } = require("./promptInjection");

async function answerWithEssaKnowledge({
  userMessage,
  systemPrompt,
  memoryContext,
  model = "gpt-4o-mini"
}) {
  const knowledgeChunks = await searchEssaKnowledge(userMessage, {
    matchCount: 8
  });

  const messages = buildNavigatorMessages({
    systemPrompt,
    memoryContext,
    knowledgeChunks,
    userMessage
  });

  const response = await openai.chat.completions.create({
    model,
    messages
  });

  return {
    answer: response.choices[0].message.content,
    usedDocuments: [...new Set(knowledgeChunks.map((chunk) => chunk.source_path))],
    usedChunkIds: knowledgeChunks.map((chunk) => chunk.id)
  };
}

module.exports = { answerWithEssaKnowledge };
