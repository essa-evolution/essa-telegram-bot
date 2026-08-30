const fs = require("fs");
const path = require("path");
const { CORE_DOCS } = require("./coreDocs");
const { config } = require("./config");
const { extractDocxText } = require("./extractDocxText");
const { chunkText, estimateTokens } = require("./chunkText");
const { sha256 } = require("./hash");
const { createEmbedding } = require("./openaiClient");
const { getSupabase } = require("./supabaseClient");

async function extractDocumentText(absolutePath) {
  if (
    absolutePath.toLowerCase().endsWith(".txt") ||
    absolutePath.toLowerCase().endsWith(".md")
  ) {
    return fs.promises.readFile(absolutePath, "utf8");
  }

  return extractDocxText(absolutePath);
}

async function upsertDocument(doc, text) {
  const contentHash = sha256(text);
  const wordCount = text ? text.split(/\s+/).length : 0;

  const { data, error } = await getSupabase()
    .from("essa_documents")
    .upsert(
      {
        source_path: doc.path,
        title: doc.title,
        category: doc.category,
        content_hash: contentHash,
        word_count: wordCount,
        updated_at: new Date().toISOString()
      },
      { onConflict: "source_path" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function replaceChunks(documentRow, chunks) {
  const { error: deleteError } = await getSupabase()
    .from("essa_document_chunks")
    .delete()
    .eq("document_id", documentRow.id);

  if (deleteError) throw deleteError;

  for (let i = 0; i < chunks.length; i += 1) {
    const content = chunks[i];
    const embedding = await createEmbedding(content);

    const { error } = await getSupabase().from("essa_document_chunks").insert({
      document_id: documentRow.id,
      source_path: documentRow.source_path,
      title: documentRow.title,
      category: documentRow.category,
      chunk_index: i,
      content,
      token_estimate: estimateTokens(content),
      embedding
    });

    if (error) throw error;
  }
}

async function ingestCoreDocs() {
  for (const doc of CORE_DOCS) {
   const absolutePath = path.isAbsolute(doc.path)
  ? doc.path
  : path.join(config.essaOsKnowledgeRoot, doc.path);
    const text = await extractDocumentText(absolutePath);
    const chunks = chunkText(text);
    const documentRow = await upsertDocument(doc, text);
    await replaceChunks(documentRow, chunks);
    console.log(
      `Indexed ${doc.path}: ${chunks.length} chunk(s), ${documentRow.word_count} words`
    );
  }
}

if (require.main === module) {
  ingestCoreDocs().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { ingestCoreDocs };
