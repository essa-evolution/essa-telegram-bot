import { createClient } from "@supabase/supabase-js";

function bearerToken(req) {
  const header = String(req.headers?.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function businessAuthEnvironment(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
  const localDevelopmentAuthAllowed = env.ESSA_BUSINESS_LOCAL_AUTH === "1" ||
    env.ESSA_BUSINESS_ALLOW_LOCAL_TEST_AUTH === "true" ||
    (env.NODE_ENV !== "production" && env.ESSA_BUSINESS_LOCAL_AUTH !== "0");

  return {
    supabaseConfigured,
    localDevelopmentAuthAllowed,
    requiredEnvironment: [
      "SUPABASE_URL or VITE_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY for server verification, or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY",
      "Supabase Auth enabled with project JWT settings",
      "Business V1 database migration applied"
    ],
    blockers: supabaseConfigured
      ? []
      : ["Supabase Auth/JWT verification is not configured in this environment."]
  };
}

export function createBusinessAuthAdapter(options = {}) {
  const env = options.env || process.env;
  const status = businessAuthEnvironment(env);
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  const supabase = options.supabaseClient || (status.supabaseConfigured
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null);

  async function authenticate(req) {
    if (supabase) {
      const token = bearerToken(req);
      if (!token) {
        return { ok: false, status: 401, reason: "authentication_required", auth: describe() };
      }
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.id) {
        return { ok: false, status: 401, reason: "invalid_or_expired_token", auth: describe() };
      }
      return {
        ok: true,
        user: {
          userId: data.user.id,
          email: data.user.email || null,
          authProvider: "SUPABASE_AUTH"
        },
        auth: describe()
      };
    }

    if (status.localDevelopmentAuthAllowed) {
      const userId = String(req.headers?.["x-essa-user-id"] || req.query?.userId || "").slice(0, 120);
      if (!userId) {
        return { ok: false, status: 401, reason: "local_development_user_required", auth: describe() };
      }
      return {
        ok: true,
        user: {
          userId,
          authProvider: "LOCAL_DEVELOPMENT_HEADER"
        },
        auth: describe()
      };
    }

    return {
      ok: false,
      status: 401,
      reason: "supabase_auth_configuration_required",
      auth: describe()
    };
  }

  function describe() {
    return {
      strategy: supabase ? "SUPABASE_AUTH_JWT" : "LOCAL_DEVELOPMENT_AUTH_BOUNDARY",
      productionAuthReady: Boolean(supabase),
      localDevelopmentAuthAllowed: status.localDevelopmentAuthAllowed && !supabase,
      blockers: status.blockers,
      requiredEnvironment: status.requiredEnvironment
    };
  }

  return { authenticate, describe };
}

export const defaultBusinessAuthAdapter = createBusinessAuthAdapter();
