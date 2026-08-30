import {
  buildClaudeSandboxRequest,
  canExecuteProductionAgentProvider,
  CLAUDE_ONE_CALL_APPROVAL_VALUE,
  createDefaultClaudeOneCallOptions,
  createFirstLisaVideoProductionAgentRequest,
  DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD,
  DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS,
  DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS,
  extractClaudeMessageJsonText,
  getProductionAgentProvider,
  runClaudeOneCallSandbox,
  sanitizeClaudeOneCallResult,
  validateClaudeAnthropicMessageResponse,
  validateClaudeOneCallGates
} from "../src/productionAgent/index.js";

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
  return result.validation?.errors?.map((error) => error.code) ||
    result.errors?.map((error) => error.code) ||
    [];
}

const request = createFirstLisaVideoProductionAgentRequest({
  taskId: "phase20g_one_call_test_task",
  traceId: "phase20g_one_call_test_trace"
});
const base = createDefaultClaudeOneCallOptions({
  request,
  dryRun: false,
  execute: true,
  explicitRuntimeApproval: true,
  runtimeApprovalValue: CLAUDE_ONE_CALL_APPROVAL_VALUE,
  apiKeyPresent: true,
  maxCostUsd: DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD
});

let fetchCalled = false;
const dryRun = await runClaudeOneCallSandbox({
  request,
  dryRun: true,
  execute: false,
  fetchImpl: async () => {
    fetchCalled = true;
    throw new Error("fetch must not run in dry run");
  }
});

check(
  dryRun.ok === true &&
    dryRun.status === "dry_run" &&
    dryRun.networkCalled === false &&
    fetchCalled === false &&
    dryRun.payloadSummary.endpoint.endsWith("/v1/messages") &&
    dryRun.payloadSummary.model === "claude-sonnet-5" &&
    dryRun.payloadSummary.maxTokens === DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS &&
    dryRun.payloadSummary.allowedTools.length === 0 &&
    dryRun.payloadSummary.media === false &&
    dryRun.payloadSummary.publish === false &&
    dryRun.payloadSummary.maxCostUsd <= 0.10,
  "Test A dry run succeeds without network and generates payload summary",
  {
    status: dryRun.status,
    networkCalled: dryRun.networkCalled,
    summaryPath: dryRun.summaryPath,
    payloadSummary: dryRun.payloadSummary
  }
);

check(
  validateClaudeOneCallGates({
    ...base,
    explicitRuntimeApproval: false
  }).errors.some((error) => error.code === "missing_runtime_approval"),
  "Test B missing approval blocks"
);

check(
  validateClaudeOneCallGates({
    ...base,
    apiKeyPresent: false
  }).errors.some((error) => error.code === "missing_anthropic_api_key"),
  "Test C missing key blocks future live mode"
);

check(
  validateClaudeOneCallGates({
    ...base,
    sandboxRequest: {
      ...base.sandboxRequest,
      allowedTools: ["semantic_edit"]
    }
  }).errors.some((error) => error.code === "tools_not_allowed"),
  "Test D tools non-empty blocks"
);

check(
  validateClaudeOneCallGates({
    ...base,
    maxTurns: 2
  }).errors.some((error) => error.code === "invalid_max_turns"),
  "Test E maxTurns > 1 blocks"
);

check(
  validateClaudeOneCallGates({
    ...base,
    publish: true
  }).errors.some((error) => error.code === "publish_not_allowed"),
  "Test F publish=true blocks"
);

check(
  validateClaudeOneCallGates({
    ...base,
    media: true
  }).errors.some((error) => error.code === "media_not_allowed"),
  "Test G media=true blocks"
);

check(
  validateClaudeOneCallGates({
    ...base,
    maxCostUsd: 0.11
  }).errors.some((error) => error.code === "max_cost_too_high"),
  "Test H maxCostUsd > 0.10 blocks"
);

check(
  validateClaudeOneCallGates({
    ...base,
    sandboxRequest: {
      ...base.sandboxRequest,
      contextPack: {
        ...base.sandboxRequest.contextPack,
        sourceFixtureId: "wrong_fixture"
      }
    }
  }).errors.some((error) => error.code === "wrong_source_fixture"),
  "Test I wrong fixture blocks"
);

const fakeSecret = "SECRET_LIKE_TEST_VALUE_SHOULD_NOT_APPEAR";
const blocked = await runClaudeOneCallSandbox({
  request,
  dryRun: false,
  execute: true,
  explicitRuntimeApproval: false,
  runtimeApprovalValue: "",
  apiKeyPresent: true,
  fetchImpl: async () => {
    fetchCalled = true;
    return null;
  }
});
const safeBlocked = sanitizeClaudeOneCallResult(blocked);

check(
  !JSON.stringify(safeBlocked).includes(fakeSecret) &&
    !JSON.stringify(safeBlocked).toLowerCase().includes("anthropic_api_key"),
  "Test J secret never appears in logs/report",
  {
    status: safeBlocked.status,
    errorCodes: codes(safeBlocked)
  }
);

const validClaudeJson = JSON.stringify({
  providerId: "claude_agent_sdk",
  semanticSummary: "Lisa turns the question of purpose into a self-authored assignment.",
  proposedEditDecisions: [
    { decisionId: "opening", description: "Open on the direct purpose question." }
  ],
  subtitlePlan: [
    { startSec: 0, endSec: 3, text: "Ты всё ищешь предназначение?" }
  ],
  visualRequests: [],
  unresolvedItems: [],
  toolRequests: [],
  artifacts: [],
  approvalRequired: true,
  completionState: "needs_approval",
  traceMetadata: { providerCallMade: false }
});
const mockMessage = {
  id: "msg_mock",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-5",
  stop_reason: "end_turn",
  usage: {
    input_tokens: 2500,
    output_tokens: 500
  },
  content: [
    {
      type: "text",
      text: validClaudeJson
    }
  ]
};
const parsedMock = await validateClaudeAnthropicMessageResponse({
  message: mockMessage,
  request
});

check(
  parsedMock.ok === true &&
    parsedMock.providerId === "claude_agent_sdk" &&
    parsedMock.validation.status === "accepted" &&
    parsedMock.cost.totalUsd > 0 &&
    parsedMock.retryCount === 0,
  "Test K mock/future Anthropic response parses correctly",
  {
    stopReason: parsedMock.stopReason,
    usage: parsedMock.usage,
    cost: parsedMock.cost
  }
);

const toolUse = extractClaudeMessageJsonText({
  stop_reason: "tool_use",
  usage: { input_tokens: 1, output_tokens: 1 },
  content: [
    {
      type: "tool_use",
      name: "forbidden",
      input: {}
    }
  ]
});

check(
  toolUse.ok === false &&
    toolUse.errors.some((error) => error.code === "tool_use_block_rejected"),
  "Test L tool_use response is rejected",
  { errorCodes: toolUse.errors.map((error) => error.code) }
);

check(
  dryRun.payloadSummary.retryCount === 0 &&
    blocked.retryCount === 0 &&
    parsedMock.retryCount === 0,
  "Test M no retry behavior",
  {
    dryRunRetryCount: dryRun.payloadSummary.retryCount,
    blockedRetryCount: blocked.retryCount,
    mockRetryCount: parsedMock.retryCount
  }
);

const claude = getProductionAgentProvider("claude_agent_sdk");
check(
  claude.status === "candidate" &&
    claude.executable === false &&
    canExecuteProductionAgentProvider("claude_agent_sdk") === false,
  "Test N claude_agent_sdk remains executable=false",
  {
    status: claude.status,
    executable: claude.executable,
    canExecute: canExecuteProductionAgentProvider("claude_agent_sdk")
  }
);

const approvalSandbox = buildClaudeSandboxRequest({ request });
check(
  approvalSandbox.allowedTools.length === 0 &&
    DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS === 45000,
  "Phase 20G envelope remains one-turn, no-tools, 45s timeout",
  {
    allowedTools: approvalSandbox.allowedTools,
    timeoutMs: DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS
  }
);

if (failures > 0) {
  console.error(`Claude one-call sandbox tests failed: ${failures}`);
  process.exit(1);
}

console.log("Claude one-call sandbox tests passed.");
