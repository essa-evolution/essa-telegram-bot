import {
  createFirstLisaVideoProductionAgentRequest,
  invokeMockProductionAgent,
  runProductionAgent
} from "../src/productionAgent/index.js";
import {
  canExecuteProductionAgentProvider,
  getProductionAgentProvider
} from "../src/productionAgent/providerRegistry.js";
import {
  canUseVoiceProviderInProduction,
  getVoiceProviderRegistration
} from "../src/voice/index.js";

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

async function runMock(kind = "safe") {
  const request = createFirstLisaVideoProductionAgentRequest({
    taskId: `phase20d_${kind}_task`,
    traceId: `phase20d_${kind}_trace`
  });

  return runProductionAgent({
    providerId: "mock_production_agent",
    request,
    allowMockProvider: true,
    mockInvoke: (mockRequest) => invokeMockProductionAgent(mockRequest, { kind })
  });
}

const safeResult = await runMock("safe");
const safeTrace = safeResult.trace.at(-1);

check(
  safeResult.ok === true &&
    safeResult.status === "accepted" &&
    safeResult.validation.status === "accepted" &&
    safeTrace.blockedTools.length === 0 &&
    safeResult.approvalRequired === true &&
    safeResult.plan.summary.includes("Keep Lisa") &&
    safeResult.plan.subtitleChunks.some((chunk) => chunk.text.includes("предназначение")),
  "Test A 11-second Lisa fixture safe mock result is accepted",
  {
    status: safeResult.status,
    subtitleChunks: safeResult.plan.subtitleChunks,
    blockedTools: safeTrace.blockedTools,
    approvalRequired: safeResult.approvalRequired
  }
);

const invalidToolResult = await runMock("invalid_tool");
check(
  invalidToolResult.ok === false &&
    invalidToolResult.validation.status === "rejected" &&
    invalidToolResult.validation.blockedTools.some((tool) =>
      tool.toolId === "publish_instagram" &&
        tool.reason === "tool_not_allowed"
    ),
  "Test B invalid publish_instagram tool is rejected/blocked",
  invalidToolResult.validation
);

const paidToolResult = await runMock("paid_tool");
check(
  paidToolResult.ok === false &&
    paidToolResult.validation.status === "rejected" &&
    paidToolResult.validation.blockedTools.some((tool) =>
      tool.toolId === "image_request" &&
        tool.reason === "tool_not_allowed"
    ),
  "Test C external paid generation request is blocked without approval/allowed tool",
  paidToolResult.validation
);

const identityMutationResult = await runMock("identity_mutation");
check(
  identityMutationResult.ok === false &&
    identityMutationResult.validation.errors.some((error) =>
      error.code === "identity_source_of_truth_mutation_attempt"
    ),
  "Test D provider cannot redefine Lisa Character Core",
  identityMutationResult.validation
);

const fakeSuccessResult = await runMock("fake_success");
check(
  fakeSuccessResult.ok === false &&
    fakeSuccessResult.status === "rejected" &&
    fakeSuccessResult.validation.errors.some((error) =>
      error.code === "fake_success_without_verified_artifact"
    ),
  "Test E fake completion without verified final artifact is rejected",
  fakeSuccessResult.validation
);

const sourceOverwriteResult = await runMock("source_overwrite");
check(
  sourceOverwriteResult.ok === false &&
    sourceOverwriteResult.validation.blockedTools.some((tool) =>
      tool.toolId === "ffmpeg_render" &&
        tool.reason === "source_overwrite_attempt"
    ),
  "Source overwrite attempt is blocked",
  sourceOverwriteResult.validation
);

const claude = getProductionAgentProvider("claude_agent_sdk");
const mock = getProductionAgentProvider("mock_production_agent");
const elevenLabs = getVoiceProviderRegistration("elevenlabs");
const omniVoice = getVoiceProviderRegistration("omnivoice");

check(
  claude.status === "candidate" &&
    claude.executable === false &&
    canExecuteProductionAgentProvider("claude_agent_sdk") === false &&
    mock.status === "test" &&
    mock.executable === false &&
    elevenLabs.role === "primary" &&
    omniVoice.status === "experimental" &&
    canUseVoiceProviderInProduction("omnivoice") === false,
  "Existing provider states remain non-mutated",
  {
    claude: {
      status: claude.status,
      executable: claude.executable
    },
    mock: {
      status: mock.status,
      executable: mock.executable
    },
    elevenLabs: {
      role: elevenLabs.role
    },
    omniVoice: {
      status: omniVoice.status,
      productionUsable: canUseVoiceProviderInProduction("omnivoice")
    }
  }
);

check(
  safeTrace.providerId === "mock_production_agent" &&
    safeTrace.taskId === "phase20d_safe_task" &&
    safeTrace.allowedTools.includes("semantic_edit") &&
    safeTrace.requestedTools.includes("verify_render") &&
    safeTrace.validationStatus === "accepted" &&
    !JSON.stringify(safeTrace).toLowerCase().includes("api_key"),
  "Trace/provenance is normalized and contains no secrets",
  safeTrace
);

if (failures > 0) {
  console.error(`ProductionAgent mock runner tests failed: ${failures}`);
  process.exit(1);
}

console.log("ProductionAgent mock runner tests passed.");
