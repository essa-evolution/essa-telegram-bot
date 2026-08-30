import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { createSupabaseBusinessRepository, getSupabaseBusinessConfig } from "../src/business/index.js";

dotenv.config();

const config = getSupabaseBusinessConfig(process.env);
const repository = createSupabaseBusinessRepository();
async function withTimeout(promise, timeoutMs) {
  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => resolve({
      ok: false,
      status: "LIVE_SUPABASE_CONNECTIVITY_TIMEOUT",
      missingTables: [],
      requiredTables: repository.requiredTables,
      tableChecks: []
    }), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeout);
  return result;
}

const result = await withTimeout(repository.verifyConnection(), Number(process.env.ESSA_BUSINESS_SUPABASE_CHECK_TIMEOUT_MS || 15000));

const report = {
  artifactType: "BusinessSupabaseReadinessCheck",
  checkedAt: new Date().toISOString(),
  config: {
    configured: config.configured,
    urlConfigured: config.urlConfigured,
    serviceRoleConfigured: config.serviceRoleConfigured,
    anonKeyConfigured: config.anonKeyConfigured,
    selectedStoreMode: config.selectedStoreMode,
    missing: config.missing
  },
  connection: {
    ok: result.ok,
    status: result.status,
    missingTables: result.missingTables || [],
    requiredTables: result.requiredTables || repository.requiredTables,
    tableChecks: (result.tableChecks || []).map((item) => ({
      table: item.table,
      exists: item.exists,
      errorCode: item.errorCode
    }))
  },
  secretValuesPrinted: false,
  mutationsPerformed: 0
};

console.log(JSON.stringify(report, null, 2));

const artifactDir = "artifacts/business/phase-sprint03";
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "BusinessSupabaseReadinessCheck.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

if (!report.connection.ok) process.exit(1);
