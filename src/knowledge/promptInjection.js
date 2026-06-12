function buildKnowledgeContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return "ESA_OS KNOWLEDGE CONTEXT: No relevant chunks were retrieved.";
  }

  const rendered = chunks.map((chunk, index) => {
    return [
      `[${index + 1}] ${chunk.title}`,
      `source: ${chunk.source_path}`,
      `category: ${chunk.category}`,
      `similarity: ${Number(chunk.similarity || 0).toFixed(3)}`,
      chunk.content
    ].join("\n");
  });

  return [
    "ESA_OS KNOWLEDGE CONTEXT:",
    "Use these retrieved ESA_OS chunks when they are relevant.",
    "Do not claim a document says something unless it is present in the chunks.",
    rendered.join("\n\n---\n\n")
  ].join("\n");
}

function buildNavigatorMessages({ systemPrompt, memoryContext, knowledgeChunks, userMessage }) {
  const knowledgeContext = buildKnowledgeContext(knowledgeChunks);

  return [
    {
      role: "system",
      content: [systemPrompt, memoryContext, knowledgeContext]
        .filter(Boolean)
        .join("\n\n")
    },
    { role: "user", content: userMessage }
  ];
}

module.exports = { buildKnowledgeContext, buildNavigatorMessages };
