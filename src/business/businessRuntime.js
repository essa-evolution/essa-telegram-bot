import { businessStoreKinds } from "./businessContracts.js";
import { getSupabaseBusinessConfig } from "./supabaseBusinessRepository.js";

export function resolveBusinessRuntime(env = process.env, metadata = {}) {
  const supabaseConfig = getSupabaseBusinessConfig(env);
  const requestedMode = env.ESSA_BUSINESS_STORE || (env.NODE_ENV === "production" ? "supabase" : "local");
  const productionLike = env.NODE_ENV === "production" || requestedMode === "supabase";
  const activeStoreKind = metadata.storeKind || businessStoreKinds.serverBackedMemory;
  const supabaseBacked = activeStoreKind === businessStoreKinds.durableDatabase ||
    metadata.repository?.repositoryKind === "SUPABASE_BUSINESS_REPOSITORY";
  const localBacked = activeStoreKind === businessStoreKinds.durableLocalFile ||
    metadata.repository?.repositoryKind === "JSON_DURABLE_LOCAL_FILE";
  const blockers = [];

  if (productionLike && !supabaseConfig.configured) {
    blockers.push("LIVE_SUPABASE_CONFIGURATION_REQUIRED");
  }
  if (productionLike && localBacked) {
    blockers.push("PRODUCTION_MUST_NOT_USE_LOCAL_JSON_BUSINESS_STORE");
  }
  if (productionLike && !supabaseBacked) {
    blockers.push("SUPABASE_BUSINESS_REPOSITORY_NOT_ACTIVE");
  }

  return {
    ok: blockers.length === 0,
    requestedMode,
    productionLike,
    activeStoreKind,
    supabaseBacked,
    localBacked,
    supabaseConfig: {
      configured: supabaseConfig.configured,
      urlConfigured: supabaseConfig.urlConfigured,
      serviceRoleConfigured: supabaseConfig.serviceRoleConfigured,
      anonKeyConfigured: supabaseConfig.anonKeyConfigured,
      missing: supabaseConfig.missing
    },
    blockers
  };
}
