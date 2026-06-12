function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function chunkText(text, options = {}) {
  const maxChars = options.maxChars || 1800;
  const overlapChars = options.overlapChars || 250;
  const clean = text.replace(/\s+/g, " ").trim();

  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    const boundary = clean.lastIndexOf(". ", end);

    if (boundary > start + Math.floor(maxChars * 0.6)) {
      end = boundary + 1;
    }

    chunks.push(clean.slice(start, end).trim());

    if (end >= clean.length) break;
    start = Math.max(0, end - overlapChars);
  }

  return chunks;
}

module.exports = { chunkText, estimateTokens };
