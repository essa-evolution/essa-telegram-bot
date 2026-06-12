import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function printStatus(label, value) {
  console.log(`${label}: ${value}`);
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

async function tableExists(supabase, tableName) {
  const { error } = await supabase.from(tableName).select("*", {
    count: "exact",
    head: true
  });

  if (!error) return true;

  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find/i.test(error.message || "")
  ) {
    return false;
  }

  throw error;
}

async function countRows(supabase, tableName) {
  const { count, error } = await supabase.from(tableName).select("*", {
    count: "exact",
    head: true
  });

  if (error) throw error;
  return count || 0;
}

async function countChunksWithEmbeddings(supabase) {
  const { count, error } = await supabase
    .from("essa_document_chunks")
    .select("*", { count: "exact", head: true })
    .not("embedding", "is", null);

  if (error) throw error;
  return count || 0;
}

async function runTestSearch(supabase) {
  const { data: sampleChunk, error: sampleError } = await supabase
    .from("essa_document_chunks")
    .select("embedding")
    .not("embedding", "is", null)
    .limit(1)
    .maybeSingle();

  if (sampleError) throw sampleError;

  if (!sampleChunk?.embedding) {
    return {
      query: "Lisa Identity",
      skipped: true,
      reason: "No stored embedding available for a read-only RPC test"
    };
  }

  const { data, error } = await supabase.rpc("match_essa_document_chunks", {
    query_embedding: sampleChunk.embedding,
    match_count: 8,
    similarity_threshold: 0
  });

  if (error) throw error;

  const rows = data || [];
  return {
    query: "Lisa Identity",
    skipped: false,
    matchCount: rows.length,
    topSource: rows[0]?.source_path || "none",
    topTitle: rows[0]?.title || "none",
    topSimilarity:
      rows[0]?.similarity === undefined
        ? "none"
        : Number(rows[0].similarity).toFixed(3)
  };
}

async function main() {
  requireEnv("SUPABASE_URL", supabaseUrl);
  requireEnv("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const documentsExists = await tableExists(supabase, "essa_documents");
  const chunksExists = await tableExists(supabase, "essa_document_chunks");
  const logsExists = await tableExists(supabase, "essa_knowledge_usage_logs");

  printStatus("essa_documents exists", documentsExists);
  printStatus("essa_document_chunks exists", chunksExists);
  printStatus("essa_knowledge_usage_logs exists", logsExists);

  printStatus(
    "essa_documents rows",
    documentsExists ? await countRows(supabase, "essa_documents") : "skipped"
  );
  printStatus(
    "essa_document_chunks rows",
    chunksExists ? await countRows(supabase, "essa_document_chunks") : "skipped"
  );
  printStatus(
    "essa_document_chunks rows with embedding",
    chunksExists ? await countChunksWithEmbeddings(supabase) : "skipped"
  );
  printStatus(
    "essa_knowledge_usage_logs rows",
    logsExists ? await countRows(supabase, "essa_knowledge_usage_logs") : "skipped"
  );

  if (!chunksExists) {
    printStatus("test search", "skipped: essa_document_chunks does not exist");
    return;
  }

  const testSearch = await runTestSearch(supabase);
  if (testSearch.skipped) {
    printStatus("test search query", testSearch.query);
    printStatus("test search", `skipped: ${testSearch.reason}`);
    return;
  }

  printStatus("test search query", testSearch.query);
  printStatus("test search matches", testSearch.matchCount);
  printStatus("test search top source", testSearch.topSource);
  printStatus("test search top title", testSearch.topTitle);
  printStatus("test search top similarity", testSearch.topSimilarity);
}

main().catch((error) => {
  console.error("Knowledge DB diagnostics failed:", error.message || error);
  process.exit(1);
});
