import {
  buildClaudeSandboxRequest,
  canExecuteProductionAgentProvider,
  claudeSandboxExecutionGate,
  claudeSandboxFutureEnvNames,
  claudeSandboxOutputSchema,
  createClaudeSandboxPromptPackage,
  createFirstLisaVideoProductionAgentRequest,
  getProductionAgentProvider,
  parseClaudeSandboxResponse,
  runClaudeSandboxRawResponseFixture,
  validateClaudeSandboxResponse
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

function errorCodes(result) {
  return result.validation?.errors?.map((error) => error.code) || result.errors?.map((error) => error.code) || [];
}

const fixtureRoot = "fixtures/productionAgent/claudeSandboxRaw";
const request = createFirstLisaVideoProductionAgentRequest({
  taskId: "phase20f_claude_sandbox_task",
  traceId: "phase20f_claude_sandbox_trace"
});

const sandboxRequest = buildClaudeSandboxRequest({ request });
const promptPackage = createClaudeSandboxPromptPackage({ request });

check(
  sandboxRequest.providerId === "claude_agent_sdk" &&
    sandboxRequest.taskId === request.taskId &&
    sandboxRequest.allowedTools.length === 0 &&
    sandboxRequest.permissions.tools === false &&
    sandboxRequest.permissions.publish === false &&
    sandboxRequest.executionGate.realClaudeCallAllowed === false &&
    !JSON.stringify(sandboxRequest).toLowerCase().includes("api_key"),
  "Claude sandbox request package is static, tool-free and secret-free",
  {
    providerId: sandboxRequest.providerId,
    allowedTools: sandboxRequest.allowedTools,
    permissions: sandboxRequest.permissions,
    gate: sandboxRequest.executionGate
  }
);

check(
  promptPackage.systemPolicy.instructions.includes("Return JSON only.") &&
    promptPackage.systemPolicy.instructions.includes("Do not call tools.") &&
    promptPackage.responseFormat.type === "json_object" &&
    promptPackage.responseFormat.schema === claudeSandboxOutputSchema,
  "Claude sandbox prompt/policy package is local JSON-only policy",
  {
    responseFormat: promptPackage.responseFormat.type,
    requiredFields: promptPackage.responseFormat.schema.required
  }
);

const valid = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/valid_lisa_11s_response.json`,
  request
});

check(
  valid.ok === true &&
    valid.providerId === "claude_agent_sdk" &&
    valid.providerCallMade === false &&
    valid.rawResponseMode === true &&
    valid.validation.status === "accepted" &&
    valid.approvalReport.providerCandidate === "claude_agent_sdk" &&
    valid.approvalReport.semanticSummary.includes("Lisa reframes purpose") &&
    valid.approvalReport.subtitlePlan.length === 3 &&
    valid.approvalReport.blockedActions.length === 0 &&
    valid.approvalReport.approvalRequired === true,
  "Valid raw Claude-like JSON is parsed, validated and converted to approval-ready report",
  {
    status: valid.status,
    validation: valid.validation.status,
    providerCallMade: valid.providerCallMade,
    blockedActions: valid.approvalReport.blockedActions
  }
);

const markdown = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_markdown_response.txt`,
  request
});

check(
  markdown.ok === false && errorCodes(markdown).includes("markdown_wrapped_response"),
  "Invalid A markdown instead of JSON is rejected",
  { status: markdown.validation.status, errorCodes: errorCodes(markdown) }
);

const prose = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_extra_prose.txt`,
  request
});

check(
  prose.ok === false && errorCodes(prose).includes("non_json_response"),
  "Invalid B extra prose around JSON is rejected",
  { status: prose.validation.status, errorCodes: errorCodes(prose) }
);

const toolRequests = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_tool_requests.json`,
  request
});

check(
  toolRequests.ok === false && errorCodes(toolRequests).includes("sandbox_tool_requests_not_allowed"),
  "Invalid C toolRequests not empty is rejected before execution",
  { status: toolRequests.validation.status, errorCodes: errorCodes(toolRequests) }
);

const completed = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_completed.json`,
  request
});

check(
  completed.ok === false && errorCodes(completed).includes("sandbox_completion_not_allowed"),
  "Invalid D completionState=completed is rejected",
  { status: completed.validation.status, errorCodes: errorCodes(completed) }
);

const identity = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_identity_mutation.json`,
  request
});

check(
  identity.ok === false && errorCodes(identity).includes("identity_source_of_truth_mutation_attempt"),
  "Invalid E identity mutation is rejected",
  { status: identity.validation.status, errorCodes: errorCodes(identity) }
);

const secretLike = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_secret_like.json`,
  request
});

check(
  secretLike.ok === false && errorCodes(secretLike).includes("secret_like_value_detected"),
  "Invalid F secret-like field is rejected without printing the value",
  { status: secretLike.validation.status, errorCodes: errorCodes(secretLike) }
);

const unknownField = await runClaudeSandboxRawResponseFixture({
  fixturePath: `${fixtureRoot}/invalid_unknown_field.json`,
  request
});

check(
  unknownField.ok === false && errorCodes(unknownField).includes("unknown_sandbox_response_field"),
  "Invalid G unknown schema field is rejected",
  { status: unknownField.validation.status, errorCodes: errorCodes(unknownField) }
);

const parsed = parseClaudeSandboxResponse(JSON.stringify({
  providerId: "wrong_provider",
  semanticSummary: "Provider normalization must not allow wrong authority.",
  proposedEditDecisions: [],
  subtitlePlan: [],
  visualRequests: [],
  unresolvedItems: [],
  toolRequests: [],
  artifacts: [],
  approvalRequired: true,
  completionState: "needs_approval",
  traceMetadata: {}
}));
const invalidProvider = validateClaudeSandboxResponse(parsed.value);

check(
  parsed.ok === true &&
    invalidProvider.ok === false &&
    invalidProvider.errors.some((error) => error.code === "invalid_provider_id"),
  "ProviderId normalization policy rejects wrong provider authority",
  { errorCodes: invalidProvider.errors.map((error) => error.code) }
);

const claude = getProductionAgentProvider("claude_agent_sdk");

check(
  claude.status === "candidate" &&
    claude.executable === false &&
    canExecuteProductionAgentProvider("claude_agent_sdk") === false,
  "Provider remains candidate/executable=false",
  {
    status: claude.status,
    executable: claude.executable,
    canExecute: canExecuteProductionAgentProvider("claude_agent_sdk")
  }
);

check(
  claudeSandboxExecutionGate.realClaudeCallAllowed === false &&
    claudeSandboxExecutionGate.firstSandboxMaxTurns === 1 &&
    claudeSandboxExecutionGate.toolsDisabled === true &&
    claudeSandboxExecutionGate.publishAllowed === false &&
    claudeSandboxFutureEnvNames.includes("ANTHROPIC_API_KEY") &&
    claudeSandboxFutureEnvNames.includes("CLAUDE_AGENT_MAX_COST_USD"),
  "Future config names and cost/permission gate are documented but inactive",
  {
    envNames: claudeSandboxFutureEnvNames,
    gate: claudeSandboxExecutionGate
  }
);

if (failures > 0) {
  console.error(`Claude sandbox adapter tests failed: ${failures}`);
  process.exit(1);
}

console.log("Claude sandbox adapter tests passed.");
