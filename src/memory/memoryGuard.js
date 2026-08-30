let unavailable = false;
const loggedReasons = new Set();

function envFlag(value) {
  return String(value || "").trim().toLowerCase();
}

export function getMemoryStatus(env = process.env) {
  const enabledFlag = envFlag(env.ESSA_MEMORY_ENABLED);
  const verboseFlag = envFlag(env.ESSA_MEMORY_VERBOSE);
  const shouldLogVerbose = verboseFlag !== "false";

  if (enabledFlag === "false") {
    return {
      enabled: false,
      reason: "disabled_by_env",
      shouldLogVerbose
    };
  }

  if (!env.DATABASE_URL) {
    return {
      enabled: false,
      reason: "no_database_url",
      shouldLogVerbose
    };
  }

  if (unavailable) {
    return {
      enabled: false,
      reason: "unavailable",
      shouldLogVerbose
    };
  }

  return {
    enabled: true,
    reason: "ok",
    shouldLogVerbose
  };
}

export function logMemoryDisabledOnce(status = getMemoryStatus(), logger = console) {
  if (status.enabled || loggedReasons.has(status.reason)) {
    return;
  }

  loggedReasons.add(status.reason);
  logger.warn(`[memory] disabled: ${status.reason}`);
}

export function markMemoryUnavailable(error, label = "memory", env = process.env, logger = console) {
  unavailable = true;
  const status = getMemoryStatus(env);

  if (status.shouldLogVerbose) {
    logger.warn(`[memory] disabled: unavailable (${label}: ${error?.message || error || "unknown error"})`);
    return;
  }

  logMemoryDisabledOnce(status, logger);
}

export function resetMemoryGuardForTests() {
  unavailable = false;
  loggedReasons.clear();
}
