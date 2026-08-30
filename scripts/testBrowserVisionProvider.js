import fs from "fs";
import path from "path";
import {
  agentToolDecisions,
  approvalDecisions,
  auditPlaywrightAvailability,
  browserObservationStatuses,
  createApprovalDecision,
  createBrowserAuditReport,
  createBrowserObservationArtifact,
  createBrowserObservationContext,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  createFutureBrowserRepairContract,
  createPlaywrightBrowserVerificationProvider,
  evaluateAgentToolRequest,
  verifyBrowserObservationArtifact
} from "../src/agentToolLayer/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function browserRequest(overrides = {}) {
  return {
    requestId: overrides.requestId || "phase20n_browser_request",
    taskId: "phase20n_task",
    projectId: "phase20n_project",
    requestedByProvider: "essa_local_agent",
    requestedByAgent: "browser_vision",
    toolId: "browser.playwright.mock",
    capability: overrides.capability || "browser_observe",
    action: overrides.action || "inspect_local_page",
    input: {
      scope: "local_dev_server",
      url: "http://localhost:3000/workspace/#navigator",
      operation: "browser_observe",
      ...(overrides.input || {})
    },
    intendedOutcome: "Observe local Workspace Navigator without mutation.",
    permissionLevel: "READ_ONLY",
    environment: "LOCAL",
    estimatedCost: "LOCAL_COMPUTE",
    sideEffectClass: "LOCAL_ONLY",
    traceId: "phase20n_browser_trace"
  };
}

const allowedDecision = evaluateAgentToolRequest(browserRequest());
check(
  allowedDecision.decision.decision === agentToolDecisions.requireConfirmation &&
    allowedDecision.decision.scopeCheck.ok === true &&
    allowedDecision.executed === false,
  "A allowed localhost observation is accepted by policy for approval",
  allowedDecision.decision
);

const externalDecision = evaluateAgentToolRequest(browserRequest({
  requestId: "phase20n_external_url",
  input: { url: "https://example.com/workspace/#navigator" }
}));
const provider = createPlaywrightBrowserVerificationProvider();
const externalProviderResult = await provider.observe({
  executionIntent: { normalizedInput: externalDecision.decision.normalizedInput },
  gateResult: { decision: "READY", safeInput: externalDecision.decision.normalizedInput }
});
check(
  externalProviderResult.ok === false &&
    externalProviderResult.reason === "external_url_blocked",
  "B external URL is blocked by browser provider allowlist",
  externalProviderResult
);

for (const [label, action, expectedReason] of [
  ["C click request is blocked", "click button", "forbidden_click_request"],
  ["D type/form request is blocked", "type into form submit", "forbidden_type_request"],
  ["E secret/storage/cookie request is blocked", "inspect localStorage cookie", "forbidden_localstorage_request"]
]) {
  const decision = evaluateAgentToolRequest(browserRequest({
    requestId: `phase20n_${expectedReason}`,
    input: { operation: action }
  }));
  const result = await provider.observe({
    executionIntent: { normalizedInput: decision.decision.normalizedInput },
    gateResult: { decision: "READY", safeInput: decision.decision.normalizedInput }
  });
  check(
    result.ok === false &&
      result.status === browserObservationStatuses.blocked &&
      result.reason === expectedReason,
    label,
    result
  );
}

const artifactDir = "artifacts/agentToolLayer/browser/phase20n";
fs.mkdirSync(artifactDir, { recursive: true });
const screenshotPath = path.join(artifactDir, "mock_readonly_observation.png");
fs.writeFileSync(screenshotPath, "mock screenshot placeholder", "utf8");
const observation = createBrowserObservationArtifact({
  target: "http://localhost:3000/workspace/#navigator",
  finalUrl: "http://localhost:3000/workspace/#navigator",
  title: "ESSA Workspace",
  viewport: { width: 1365, height: 768 },
  domStatus: "loaded",
  visibleSections: ["Workspace root", "Navigator surface", "Main panel"],
  visibleNavigation: ["Navigator"],
  visibleTextSummary: ["ESSA Workspace Navigator is visible with a main panel and navigation."],
  screenshotRef: screenshotPath,
  interactionCount: 0,
  mutationCount: 0,
  providerProvenance: { providerId: "playwright_browser_verification", providerSelfVerified: false },
  projectId: "phase20n_project",
  taskId: "phase20n_task",
  traceId: "phase20n_browser_trace"
});
const verification = verifyBrowserObservationArtifact(observation);
observation.verificationStatus = verification.status;
const context = createBrowserObservationContext({ artifact: observation });
check(
  context.boundedChars < JSON.stringify(observation).length &&
    context.policy.fullDomExcludedFromModelContext === true,
  "F browser artifact is bounded before ContextPack",
  {
    artifactChars: JSON.stringify(observation).length,
    contextChars: JSON.stringify(context).length,
    boundedChars: context.boundedChars
  }
);

check(
  observation.providerProvenance.providerSelfVerified === false &&
    [browserObservationStatuses.pass, browserObservationStatuses.passWithWarnings].includes(verification.status),
  "G provider cannot claim verification itself",
  { verification, provenance: observation.providerProvenance }
);

check(observation.interactionCount === 0, "H interactionCount remains 0", observation);
check(observation.mutationCount === 0, "I mutationCount remains 0", observation);

const blankObservation = createBrowserObservationArtifact({
  target: "http://localhost:3000/workspace/#navigator",
  finalUrl: "http://localhost:3000/workspace/#navigator",
  domStatus: "loaded",
  visibleTextSummary: [],
  screenshotRef: screenshotPath,
  interactionCount: 0,
  mutationCount: 0
});
const blankVerification = verifyBrowserObservationArtifact(blankObservation);
check(
  blankVerification.status === browserObservationStatuses.fail,
  "J failed/blank page does not become PASS",
  blankVerification
);

const repairContract = createFutureBrowserRepairContract();
const auditReport = createBrowserAuditReport(context);
check(
  provider.providerId === "playwright_browser_verification" &&
    provider.executable === false &&
    repairContract.executable === false &&
    context.policy.providerIndependent === true,
  "K provider remains replaceable/model-independent",
  { providerId: provider.providerId, repairContract, auditReport }
);

const queue = createExecutionQueue();
const intent = createExecutionIntentFromDecision(allowedDecision, {
  executionIntentId: "phase20n_browser_intent"
});
queue.enqueue(intent);
const approval = createApprovalDecision({
  executionIntentId: intent.executionIntentId,
  decision: approvalDecisions.approve,
  decidedBy: "human:Lisa",
  scope: {
    toolId: intent.toolId,
    projectId: intent.projectId,
    action: intent.action
  },
  approvalToken: intent.approvalToken
});
const approved = queue.applyApproval(approval);
check(
  approved.ok === true &&
    approved.intent.status === "READY_FOR_EXECUTION",
  "Approved read-only browser request can reach ExecutionIntent READY without execution",
  approved.intent
);

const availability = await auditPlaywrightAvailability();
check(
  typeof availability.playwrightAvailable === "boolean" &&
    typeof availability.browserRuntimeExists === "boolean" &&
    availability.installationRequired === (!availability.playwrightAvailable || !availability.browserRuntimeExists),
  "Local audit reports Playwright installation state consistently",
  availability
);

if (failures > 0) {
  console.error(`Browser Vision Provider tests failed: ${failures}`);
  process.exit(1);
}

console.log("Browser Vision Provider tests passed.");
