const mammoth = require("mammoth");

async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return normalizeText(result.value || "");
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

module.exports = { extractDocxText, normalizeText };
