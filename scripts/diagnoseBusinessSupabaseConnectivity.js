import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import tls from "node:tls";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const timeoutMs = Number(process.env.ESSA_BUSINESS_SUPABASE_CHECK_TIMEOUT_MS || 10000);
const artifactDir = "artifacts/business/phase-sprint03a";

function withTimeout(label, fn) {
  return Promise.race([
    fn(),
    new Promise((resolve) => setTimeout(() => resolve({
      ok: false,
      status: `${label}_TIMEOUT`
    }), timeoutMs))
  ]);
}

function envState() {
  return {
    supabaseUrlPresent: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY),
    anonKeyPresent: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    businessStoreMode: process.env.ESSA_BUSINESS_STORE || null
  };
}

function safeUrl() {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  try {
    const parsed = new URL(raw);
    return {
      ok: parsed.protocol === "https:" && Boolean(parsed.hostname),
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      formatError: null
    };
  } catch (error) {
    return {
      ok: false,
      protocol: null,
      hostname: null,
      formatError: "INVALID_URL"
    };
  }
}

async function dnsCheck(hostname) {
  return withTimeout("DNS", async () => {
    try {
      await dns.lookup(hostname);
      return { ok: true, status: "DNS_REACHABLE" };
    } catch (error) {
      return { ok: false, status: "DNS_BLOCKED_OR_UNRESOLVED", code: error.code || null };
    }
  });
}

async function tcpCheck(hostname) {
  return withTimeout("TCP_443", async () => new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port: 443 });
    socket.once("connect", () => {
      socket.destroy();
      resolve({ ok: true, status: "TCP_443_REACHABLE" });
    });
    socket.once("error", (error) => {
      socket.destroy();
      resolve({ ok: false, status: "TCP_443_BLOCKED", code: error.code || null });
    });
  }));
}

async function tlsCheck(hostname) {
  return withTimeout("TLS", async () => new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: true });
    socket.once("secureConnect", () => {
      const authorized = socket.authorized;
      socket.destroy();
      resolve({ ok: authorized, status: authorized ? "TLS_VALID" : "TLS_UNAUTHORIZED" });
    });
    socket.once("error", (error) => {
      socket.destroy();
      resolve({ ok: false, status: "TLS_BLOCKED_OR_INVALID", code: error.code || null });
    });
  }));
}

async function fetchCheck(name, url, headers = {}) {
  return withTimeout(name, async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      return {
        ok: response.status < 500,
        status: `${name}_RESPONDED`,
        httpStatus: response.status
      };
    } catch (error) {
      return {
        ok: false,
        status: error.name === "AbortError" ? `${name}_TIMEOUT` : `${name}_BLOCKED`,
        errorName: error.name || null,
        code: error.cause?.code || error.code || null
      };
    } finally {
      clearTimeout(timeout);
    }
  });
}

const env = envState();
const url = safeUrl();
const headers = {
  ...(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    ? { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY }
    : {})
};

const checks = {
  env,
  urlFormat: {
    ok: url.ok,
    protocol: url.protocol,
    hostPresent: Boolean(url.hostname),
    formatError: url.formatError
  },
  dns: url.hostname ? await dnsCheck(url.hostname) : { ok: false, status: "ENV_MISSING" },
  tcp443: url.hostname ? await tcpCheck(url.hostname) : { ok: false, status: "ENV_MISSING" },
  tls: url.hostname ? await tlsCheck(url.hostname) : { ok: false, status: "ENV_MISSING" },
  authEndpoint: url.hostname ? await fetchCheck("AUTH_ENDPOINT", `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/auth/v1/health`) : { ok: false, status: "ENV_MISSING" },
  restEndpoint: url.hostname ? await fetchCheck("REST_ENDPOINT", `${process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL}/rest/v1/`, headers) : { ok: false, status: "ENV_MISSING" }
};

function classify() {
  if (!env.supabaseUrlPresent) return "ENV_MISSING";
  if (!url.ok) return "ENV_INVALID";
  if (!checks.dns.ok) return checks.dns.status === "DNS_TIMEOUT" ? "NETWORK_SANDBOX_RESTRICTION" : "DNS_BLOCKED";
  if (!checks.tcp443.ok) return checks.tcp443.status === "TCP_443_TIMEOUT" ? "NETWORK_SANDBOX_RESTRICTION" : "HTTPS_BLOCKED";
  if (!checks.tls.ok) return checks.tls.status === "TLS_TIMEOUT" ? "NETWORK_SANDBOX_RESTRICTION" : "TLS_ISSUE";
  if (!checks.authEndpoint.ok) return checks.authEndpoint.status.includes("TIMEOUT") ? "AUTH_ENDPOINT_BLOCKED" : "AUTH_ENDPOINT_UNREACHABLE";
  if (!checks.restEndpoint.ok) return checks.restEndpoint.status.includes("TIMEOUT") ? "REST_ENDPOINT_BLOCKED" : "REST_ENDPOINT_UNREACHABLE";
  return "LIVE_SUPABASE_REACHABLE";
}

const artifact = {
  artifactType: "BusinessSupabaseConnectivityDiagnosis",
  checkedAt: new Date().toISOString(),
  failureClass: classify(),
  checks,
  secretValuesPrinted: false,
  mutationsPerformed: 0
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "BusinessSupabaseConnectivityDiagnosis.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify(artifact, null, 2));

if (artifact.failureClass !== "LIVE_SUPABASE_REACHABLE") process.exit(1);
