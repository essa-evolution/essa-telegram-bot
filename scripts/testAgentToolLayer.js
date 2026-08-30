import {
  agentToolRegistry,
  authorizeAgentToolRequest,
  buildContextPackage,
  createAgentOperationTrace,
  createAutonomousExecutionPolicy,
  createBrowserVerificationProviderStub,
  createDatabaseToolProviderStub,
  createDocumentationProviderStub,
  createSecurityTestingProviderStub,
  evaluateCompletion,
  listAgentTools,
  runAutonomousExecutionLoop,
  selectAiProviderForTask,
  toolCategories,
  toolEnvironments,
  validateAgentToolRegistry
} from "../src/agentToolLayer/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) {
    failures += 1;
  }

  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function codes(result) {
  return result.errors?.map((error) => error.code) ||
    result.validation?.errors?.map((error) => error.code) ||
    [];
}

const validation = validateAgentToolRegistry();
const invalid = validation.filter((item) => !item.valid);
check(
  invalid.length === 0 &&
    toolCategories.every((category) => listAgentTools({ category }).length >= 1),
  "Tool Registry covers required categories and validates",
  {
    toolCount: agentToolRegistry.length,
    categories: toolCategories
  }
);

const docProvider = createDocumentationProviderStub();
const browserProvider = createBrowserVerificationProviderStub();
const dbProvider = createDatabaseToolProviderStub();
const securityProvider = createSecurityTestingProviderStub();
check(
  docProvider.executable === false &&
    browserProvider.executable === false &&
    dbProvider.executable === false &&
    dbProvider.defaults.productionDenyByDefault === true &&
    securityProvider.executable === false,
  "Documentation/browser/database/security provider boundaries are stub-only",
  {
    doc: docProvider.providerId,
    browser: browserProvider.providerId,
    databaseDefaults: dbProvider.defaults,
    security: securityProvider.providerId
  }
);

const modelToolExpansion = authorizeAgentToolRequest({
  toolId: "browser.playwright.mock",
  requestedByModel: true,
  allowedTools: [],
  operation: "read",
  readScope: "local_dev_server"
});
check(
  modelToolExpansion.ok === false &&
    codes(modelToolExpansion).includes("tool_not_allowed") &&
    codes(modelToolExpansion).includes("model_requested_tool_without_allowance"),
  "Model cannot expand allowedTools",
  { errorCodes: codes(modelToolExpansion) }
);

const scopeViolation = authorizeAgentToolRequest({
  toolId: "filesystem.local.mock",
  requestedByModel: false,
  allowedTools: ["filesystem.local.mock"],
  operation: "write",
  writeScope: "C:/Users/Lisa/Documents/private"
});
check(
  scopeViolation.ok === false &&
    codes(scopeViolation).includes("write_scope_violation"),
  "Tool cannot leave declared write scope",
  { errorCodes: codes(scopeViolation) }
);

const dbWrite = authorizeAgentToolRequest({
  toolId: "database.supabase.mock",
  allowedTools: ["database.supabase.mock"],
  operation: "write",
  writeScope: "development_only_with_explicit_approval"
});
check(
  dbWrite.ok === false &&
    codes(dbWrite).includes("database_write_requires_approval"),
  "Database write blocks without approval",
  { errorCodes: codes(dbWrite) }
);

const prodDb = authorizeAgentToolRequest({
  toolId: "database.supabase.mock",
  allowedTools: ["database.supabase.mock"],
  operation: "read",
  readScope: "scoped_project",
  environment: toolEnvironments.production
});
check(
  prodDb.ok === false &&
    codes(prodDb).includes("production_access_denied"),
  "Production access is deny-by-default",
  { errorCodes: codes(prodDb) }
);

const deploy = authorizeAgentToolRequest({
  toolId: "deployment.provider.mock",
  allowedTools: ["deployment.provider.mock"],
  operation: "write",
  writeScope: "production_deployment",
  approval: { granted: true }
});
check(
  deploy.ok === false &&
    codes(deploy).includes("publish_deploy_blocked"),
  "Publish/deploy are blocked in Phase 20H",
  { errorCodes: codes(deploy) }
);

const loop = await runAutonomousExecutionLoop({
  plan: { intent: "test_repair_limit", toolRequests: [] },
  policy: createAutonomousExecutionPolicy({ maxAttempts: 1, maxTurns: 3 }),
  providerResult: { providerId: "claude_agent_sdk", status: "completed" },
  executor: async () => ({ ok: true, observation: "still failing" }),
  verifier: async () => ({ passed: false, reason: "not actually verified" }),
  repairer: async (plan) => ({ ok: true, repairedPlan: plan })
});
check(
  loop.ok === false &&
    loop.state === "BLOCKED" &&
    loop.attempts === 1 &&
    loop.completion?.reason === "provider_completion_claim_is_not_evidence",
  "Repair loop has a limit and provider completion claim is not proof",
  {
    state: loop.state,
    attempts: loop.attempts,
    completion: loop.completion
  }
);

const verifiedLoop = await runAutonomousExecutionLoop({
  plan: { intent: "verified_task", toolRequests: [] },
  policy: createAutonomousExecutionPolicy({ maxAttempts: 1, maxTurns: 2 }),
  providerResult: { providerId: "openai_future", status: "completed" },
  executor: async () => ({ ok: true }),
  verifier: async () => ({ passed: true, evidence: "mock deterministic check" })
});
check(
  verifiedLoop.ok === true &&
    verifiedLoop.state === "READY_FOR_APPROVAL" &&
    verifiedLoop.trace.some((item) => item.approval?.required === true),
  "Successful loop ends at READY_FOR_APPROVAL, not publish",
  { state: verifiedLoop.state }
);

const fallback = selectAiProviderForTask({
  requiredCapabilities: ["structured_reasoning", "json_output"]
});
check(
  fallback.policy.sourceOfTruth === "ESSA Core" &&
    fallback.policy.identityPolicyMutableByProvider === false &&
    fallback.candidates.every((provider) => provider.policyOwnership === "ESSA"),
  "Provider fallback does not change ESSA policy",
  {
    selected: fallback.selected?.providerId || null,
    policy: fallback.policy
  }
);

const contextPackage = buildContextPackage({
  intent: "small_task",
  maxItems: 2,
  maxChars: 50,
  memoryItems: [
    { id: "a", text: "high relevance memory", relevance: 0.9 },
    { id: "b", text: "medium relevance memory", relevance: 0.5 },
    { id: "c", text: "low relevance memory that should be omitted", relevance: 0.1 }
  ]
});
check(
  contextPackage.selected.length <= 2 &&
    contextPackage.omittedCount >= 1 &&
    contextPackage.policy.neverSendFullMemoryAutomatically === true,
  "Context Budget Layer selects relevant memory and omits the rest",
  contextPackage
);

const trace = createAgentOperationTrace({
  initiatedBy: "test",
  intent: "secret_redaction",
  toolId: "documentation.context7.mock",
  result: {
    ANTHROPIC_API_KEY: "SECRET_LIKE_TEST_VALUE",
    nested: { token: "Bearer abcdefghijklmnop" }
  }
});
const traceText = JSON.stringify(trace).toLowerCase();
check(
  !traceText.includes("secret_like_test_value") &&
    !traceText.includes("abcdefghijklmnop") &&
    traceText.includes("[redacted"),
  "Secret-like values do not enter trace/log",
  trace
);

const executableTools = listAgentTools({ executable: true });
check(
  executableTools.length === 0,
  "No external executable tool calls exist in Phase 20H tests",
  { executableTools }
);

if (failures > 0) {
  console.error(`Agent Tool Layer tests failed: ${failures}`);
  process.exit(1);
}

console.log("Agent Tool Layer tests passed.");
