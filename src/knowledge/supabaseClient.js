const { createClient } = require("@supabase/supabase-js");
const { config } = require("./config");

let supabase;

function getSupabase() {
  if (!config.supabaseUrl) {
    throw new Error("Missing required environment variable: SUPABASE_URL");
  }

  if (!config.supabaseServiceRoleKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY"
    );
  }

  if (!supabase) {
    supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }

  return supabase;
}

module.exports = { getSupabase };
