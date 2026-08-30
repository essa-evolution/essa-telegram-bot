import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  businessStoreKinds,
  createBusinessAuthAdapter,
  createBusinessFlowService,
  createDurableBusinessStore,
  createSupabaseBusinessRepository,
  getSupabaseBusinessConfig,
  resolveBusinessRuntime
} from "../src/business/index.js";

let failures = 0;

function check(label, fn) {
  try {
    const details = fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

async function checkAsync(label, fn) {
  try {
    const details = await fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

check("A Supabase config reports names/state without secret values", () => {
  const config = getSupabaseBusinessConfig({
    NODE_ENV: "production",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secret-value"
  });
  assert.equal(config.configured, true);
  assert.equal(config.serviceRoleConfigured, true);
  assert.equal(JSON.stringify(config).includes("secret-value"), false);
  return config;
});

check("B production mode fails closed when local JSON store is active", () => {
  const runtime = resolveBusinessRuntime(
    { NODE_ENV: "production", ESSA_BUSINESS_STORE: "supabase" },
    {
      storeKind: businessStoreKinds.durableLocalFile,
      repository: { repositoryKind: "JSON_DURABLE_LOCAL_FILE" }
    }
  );
  assert.equal(runtime.ok, false);
  assert.ok(runtime.blockers.includes("LIVE_SUPABASE_CONFIGURATION_REQUIRED"));
  assert.ok(runtime.blockers.includes("PRODUCTION_MUST_NOT_USE_LOCAL_JSON_BUSINESS_STORE"));
  assert.ok(runtime.blockers.includes("SUPABASE_BUSINESS_REPOSITORY_NOT_ACTIVE"));
});

check("C local/test mode intentionally allows durable JSON", () => {
  const runtime = resolveBusinessRuntime(
    { NODE_ENV: "development", ESSA_BUSINESS_STORE: "local" },
    {
      storeKind: businessStoreKinds.durableLocalFile,
      repository: { repositoryKind: "JSON_DURABLE_LOCAL_FILE" }
    }
  );
  assert.equal(runtime.ok, true);
  assert.equal(runtime.localBacked, true);
});

check("D Supabase repository declares every required Business table", () => {
  const repository = createSupabaseBusinessRepository({
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-value"
    },
    client: {
      from: () => ({
        select: () => ({ limit: async () => ({ error: null }) }),
        upsert: async () => ({ error: null })
      })
    }
  });
  [
    "business_organizations",
    "business_organization_memberships",
    "business_profiles",
    "business_workspaces",
    "business_intakes",
    "business_artifacts",
    "business_projects",
    "business_partner_requests",
    "business_commercial_requests",
    "business_funnel_events",
    "business_audit_events"
  ].forEach((table) => assert.ok(repository.requiredTables.includes(table), table));
});

await checkAsync("E Supabase repository verification detects missing migration tables", async () => {
  const repository = createSupabaseBusinessRepository({
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-value"
    },
    client: {
      from: (table) => ({
        select: () => ({
          limit: async () => ({ error: table === "business_profiles" ? { code: "42P01", message: "missing" } : null })
        })
      })
    }
  });
  const result = await repository.verifyConnection();
  assert.equal(result.ok, false);
  assert.equal(result.status, "MIGRATION_REQUIRED");
  assert.ok(result.missingTables.includes("business_profiles"));
});

await checkAsync("F Supabase auth returns canonical user and ignores frontend user id", async () => {
  const auth = createBusinessAuthAdapter({
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "public-test-key"
    },
    supabaseClient: {
      auth: {
        getUser: async () => ({
          data: { user: { id: "00000000-0000-4000-8000-000000000001", email: "client@example.com" } },
          error: null
        })
      }
    }
  });
  const result = await auth.authenticate({
    headers: {
      authorization: "Bearer valid",
      "x-essa-user-id": "spoofed-user"
    },
    query: {}
  });
  assert.equal(result.ok, true);
  assert.equal(result.user.userId, "00000000-0000-4000-8000-000000000001");
});

await checkAsync("G malformed or absent tokens fail closed", async () => {
  const auth = createBusinessAuthAdapter({
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_ANON_KEY: "public-test-key"
    },
    supabaseClient: {
      auth: {
        getUser: async () => ({ data: null, error: new Error("invalid") })
      }
    }
  });
  const missing = await auth.authenticate({ headers: {}, query: {} });
  const invalid = await auth.authenticate({ headers: { authorization: "Bearer bad" }, query: {} });
  assert.equal(missing.status, 401);
  assert.equal(missing.reason, "authentication_required");
  assert.equal(invalid.status, 401);
  assert.equal(invalid.reason, "invalid_or_expired_token");
});

check("H RLS migration creates tenant policies for every private Business table", () => {
  const sql = fs.readFileSync("supabase/migrations/20260827_business_v1_rls_policies.sql", "utf8");
  [
    "business_organizations",
    "business_organization_memberships",
    "business_profiles",
    "business_workspaces",
    "business_intakes",
    "business_artifacts",
    "business_projects",
    "business_partner_requests",
    "business_commercial_requests",
    "business_funnel_events",
    "business_audit_events"
  ].forEach((table) => {
    assert.ok(sql.includes(`on ${table}`), table);
  });
  assert.ok(sql.includes("auth.uid()"));
  assert.ok(sql.includes("essa_business_has_org_role"));
  assert.equal(sql.includes("create policy if not exists"), false);
});

check("I local adapter still proves restart persistence and tenant denial", () => {
  const storePath = path.resolve("artifacts/business/sprint03-local-test-store.json");
  fs.rmSync(storePath, { force: true });
  const service = createBusinessFlowService(createDurableBusinessStore({ filePath: storePath }));
  const created = service.createProfile("client_a", { name: "Sprint 03 Local" });
  assert.equal(created.ok, true);
  const reloaded = createBusinessFlowService(createDurableBusinessStore({ filePath: storePath }));
  assert.equal(reloaded.getDashboard("client_a", created.business.businessId).ok, true);
  assert.equal(reloaded.getDashboard("client_b", created.business.businessId).status, 403);
});

if (failures > 0) {
  console.error(`Business Sprint 03 tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Sprint 03 tests passed.");
