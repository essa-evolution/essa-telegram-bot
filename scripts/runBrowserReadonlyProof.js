import fs from "fs";
import path from "path";
import {
  approvalDecisions,
  createApprovalDecision,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  createPlaywrightBrowserVerificationProvider,
  evaluateAgentToolRequest,
  prepareExecution
} from "../src/agentToolLayer/index.js";

const TARGET_URL = "http://localhost:3000/workspace/#navigator";
const artifactDir = "artifacts/agentToolLayer/browser/phase20n";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createBrowserRequest() {
  return {
    requestId: "phase20o_browser_readonly_request",
    taskId: "phase20o_task",
    projectId: "phase20o_project",
    requestedByProvider: "essa_local_agent",
    requestedByAgent: "browser_vision",
    toolId: "browser.playwright.mock",
    capability: "browser_observe",
    action: "inspect_local_page",
    input: {
      scope: "local_dev_server",
      url: TARGET_URL,
      operation: "browser_observe"
    },
    intendedOutcome: "Observe local Workspace Navigator without mutation.",
    permissionLevel: "READ_ONLY",
    environment: "LOCAL",
    estimatedCost: "LOCAL_COMPUTE",
    sideEffectClass: "LOCAL_ONLY",
    traceId: "phase20o_browser_trace"
  };
}

const decision = evaluateAgentToolRequest(createBrowserRequest(), { phase: "20O" });
const intent = createExecutionIntentFromDecision(decision, {
  executionIntentId: "phase20o_browser_intent"
});
const queue = createExecutionQueue();
const enqueued = queue.enqueue(intent);

if (!enqueued.ok) {
  throw new Error(`ExecutionIntent enqueue failed: ${enqueued.reason}`);
}

let readyIntent = enqueued.intent;
let approval = null;
if (readyIntent.approvalRequired) {
  approval = createApprovalDecision({
    executionIntentId: readyIntent.executionIntentId,
    decision: approvalDecisions.approve,
    decidedBy: "human:Lisa",
    scope: {
      toolId: readyIntent.toolId,
      projectId: readyIntent.projectId,
      action: readyIntent.action
    },
    approvalToken: readyIntent.approvalToken,
    maxApprovedCost: "LOCAL_COMPUTE"
  });
  const approved = queue.applyApproval(approval);
  if (!approved.ok) {
    throw new Error(`ExecutionIntent approval failed: ${approved.reason}`);
  }
  readyIntent = approved.intent;
}

const gateResult = prepareExecution(readyIntent, {
  queue,
  approvalDecision: approval,
  expectedProjectId: readyIntent.projectId,
  expectedTaskId: readyIntent.taskId,
  currentEstimatedCost: "LOCAL_COMPUTE",
  maxApprovedCost: "LOCAL_COMPUTE"
});

const provider = createPlaywrightBrowserVerificationProvider({ artifactDir });
const observation = await provider.observe({
  executionIntent: readyIntent,
  gateResult
});

const proofReport = {
  target: TARGET_URL,
  requestDecision: decision.decision,
  executionIntent: {
    executionIntentId: readyIntent.executionIntentId,
    status: readyIntent.status,
    approvalRequired: readyIntent.approvalRequired,
    approvalStatus: readyIntent.approvalStatus,
    traceId: readyIntent.traceId
  },
  gateResult,
  provider: {
    providerId: provider.providerId,
    readOnly: provider.readOnly,
    localOnly: provider.localOnly,
    networkPolicy: provider.networkPolicy
  },
  observationStatus: observation.status,
  verification: observation.verification || null,
  paths: observation.paths || {},
  providerCallMade: observation.providerCallMade === true,
  interactionCount: observation.artifact?.interactionCount ?? null,
  mutationCount: observation.artifact?.mutationCount ?? null
};

writeJson(path.join(artifactDir, "phase20o_proof_report.json"), proofReport);
console.log(JSON.stringify(proofReport, null, 2));

if (!observation.ok) {
  process.exit(1);
}
