import {
  createFirstLisaVideoProductionAgentRequest,
  runProductionAgentFixture
} from "../src/productionAgent/index.js";
import {
  canExecuteProductionAgentProvider,
  getProductionAgentProvider
} from "../src/productionAgent/providerRegistry.js";

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

const fixtureRoot = "fixtures/productionAgent";
const request = createFirstLisaVideoProductionAgentRequest({
  taskId: "phase20e_fixture_task",
  traceId: "phase20e_fixture_trace"
});

const valid = await runProductionAgentFixture({
  fixturePath: `${fixtureRoot}/claude_lisa_11s_valid.json`,
  request
});

check(
  valid.ok === true &&
    valid.providerId === "claude_agent_sdk" &&
    valid.providerCallMade === false &&
    valid.fixtureMode === true &&
    valid.validation.status === "accepted" &&
    valid.approvalReport.providerCandidate === "claude_agent_sdk" &&
    valid.approvalReport.semanticSummary.includes("Keep Lisa") &&
    valid.approvalReport.subtitlePlan.some((chunk) => chunk.text.includes("предназначение")) &&
    valid.approvalReport.blockedActions.length === 0 &&
    valid.approvalReport.approvalRequired === true &&
    valid.approvalReport.sourceOfTruth.identity === "ESSA",
  "Valid Claude-like fixture is accepted and converted to approval-ready report",
  {
    status: valid.status,
    providerId: valid.providerId,
    providerCallMade: valid.providerCallMade,
    validation: valid.validation.status,
    approvalReport: {
      providerCandidate: valid.approvalReport.providerCandidate,
      semanticSummary: valid.approvalReport.semanticSummary,
      blockedActions: valid.approvalReport.blockedActions,
      approvalRequired: valid.approvalReport.approvalRequired,
      traceId: valid.approvalReport.traceId
    }
  }
);

const publish = await runProductionAgentFixture({
  fixturePath: `${fixtureRoot}/claude_lisa_11s_publish_without_approval.json`,
  request
});

check(
  publish.ok === false &&
    publish.validation.status === "rejected" &&
    publish.validation.blockedTools.some((tool) =>
      tool.toolId === "publish_instagram" &&
        tool.reason === "tool_not_allowed"
    ),
  "Invalid fixture A publish_without_approval is blocked",
  publish.validation
);

const identity = await runProductionAgentFixture({
  fixturePath: `${fixtureRoot}/claude_lisa_11s_identity_mutation.json`,
  request
});

check(
  identity.ok === false &&
    identity.validation.errors.some((error) =>
      error.code === "identity_source_of_truth_mutation_attempt"
    ),
  "Invalid fixture B identity mutation is rejected",
  identity.validation
);

const fakeSuccess = await runProductionAgentFixture({
  fixturePath: `${fixtureRoot}/claude_lisa_11s_fake_success_without_verified_artifact.json`,
  request
});

check(
  fakeSuccess.ok === false &&
    fakeSuccess.validation.errors.some((error) =>
      error.code === "fake_success_without_verified_artifact"
    ),
  "Invalid fixture C fake success without verified artifact is rejected",
  fakeSuccess.validation
);

const unknownTool = await runProductionAgentFixture({
  fixturePath: `${fixtureRoot}/claude_lisa_11s_unknown_tool.json`,
  request
});

check(
  unknownTool.ok === false &&
    unknownTool.validation.blockedTools.some((tool) =>
      tool.toolId === "unrestricted_shell" &&
        tool.reason === "tool_not_allowed"
    ),
  "Invalid fixture D unknown/unrestricted tool is blocked",
  unknownTool.validation
);

const secretLike = await runProductionAgentFixture({
  fixturePath: `${fixtureRoot}/claude_lisa_11s_secret_like_value.json`,
  request
});

check(
  secretLike.ok === false &&
    secretLike.validation.errors.some((error) =>
      error.code === "secret_like_value_detected"
    ),
  "Invalid fixture E secret-like value is rejected",
  {
    status: secretLike.validation.status,
    errorCodes: secretLike.validation.errors.map((error) => error.code)
  }
);

const claude = getProductionAgentProvider("claude_agent_sdk");

check(
  claude.status === "candidate" &&
    claude.executable === false &&
    canExecuteProductionAgentProvider("claude_agent_sdk") === false,
  "claude_agent_sdk remains candidate/executable=false after fixture harness",
  {
    status: claude.status,
    executable: claude.executable,
    canExecute: canExecuteProductionAgentProvider("claude_agent_sdk")
  }
);

const trace = valid.trace.at(-1);
check(
  trace.providerId === "claude_agent_sdk" &&
    trace.taskId === "phase20e_fixture_task" &&
    trace.validationStatus === "accepted" &&
    trace.artifactRefs.some((artifact) => artifact.type === "VerificationReport") &&
    !JSON.stringify(valid.approvalReport).toLowerCase().includes("api_key"),
  "Approval report trace/provenance is normalized and secret-free",
  {
    trace,
    sourceOfTruth: valid.approvalReport.sourceOfTruth
  }
);

if (failures > 0) {
  console.error(`ProductionAgent fixture harness tests failed: ${failures}`);
  process.exit(1);
}

console.log("ProductionAgent fixture harness tests passed.");
