export function buildContextPackage({
  memoryItems = [],
  intent = null,
  maxItems = 5,
  maxChars = 4000
} = {}) {
  const relevant = memoryItems
    .filter((item) => item && item.include !== false)
    .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  const selected = [];
  let chars = 0;

  for (const item of relevant) {
    const text = String(item.text || "");
    if (selected.length >= maxItems || chars + text.length > maxChars) break;
    selected.push({
      id: item.id,
      text,
      relevance: item.relevance || 0,
      source: item.source || "ESSA memory"
    });
    chars += text.length;
  }

  return {
    intent,
    selected,
    omittedCount: Math.max(0, memoryItems.length - selected.length),
    budget: {
      maxItems,
      maxChars,
      usedChars: chars
    },
    policy: {
      neverSendFullMemoryAutomatically: true,
      sourceOfTruth: "ESSA Core",
      providerMayExpandContext: false
    }
  };
}
