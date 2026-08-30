import fs from "fs";
import path from "path";
import {
  approvalDecisions,
  createApprovalDecision,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  createPlaywrightBrowserVerificationProvider,
  createRepairProposalsForFindings,
  createViewportComparisonArtifact,
  createViewportResult,
  createMultiViewportObservationContext,
  detectViewportFindings,
  evaluateAgentToolRequest,
  prepareExecution,
  saveMultiViewportAuditArtifacts,
  workspaceAuditViewports
} from "../src/agentToolLayer/index.js";

const TARGET_URL = process.env.PHASE20_TARGET_URL || "http://localhost:3000/workspace/#navigator";
const phaseId = process.env.PHASE_ID || "20R";
const phaseSlug = phaseId.toLowerCase();
const artifactDir = process.env.ARTIFACT_DIR || `artifacts/agentToolLayer/browser/phase${phaseSlug}`;
const screenshotSuffix = process.env.SCREENSHOT_SUFFIX || "";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createBrowserRequest(viewport) {
  return {
    requestId: `phase${phaseSlug}_${viewport.id}_browser_readonly_request`,
    taskId: `phase${phaseSlug}_task`,
    projectId: `phase${phaseSlug}_project`,
    requestedByProvider: "essa_local_agent",
    requestedByAgent: "browser_vision",
    toolId: "browser.playwright.mock",
    capability: "browser_observe",
    action: "inspect_local_page",
    input: {
      scope: "local_dev_server",
      url: TARGET_URL,
      operation: "browser_observe",
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      screenshotName: screenshotSuffix
        ? viewport.screenshotName.replace(/\.png$/i, `${screenshotSuffix}.png`)
        : viewport.screenshotName
    },
    intendedOutcome: `Read-only Workspace Navigator observation at ${viewport.label} ${viewport.width}x${viewport.height}.`,
    permissionLevel: "READ_ONLY",
    environment: "LOCAL",
    estimatedCost: "LOCAL_COMPUTE",
    sideEffectClass: "LOCAL_ONLY",
    traceId: `phase${phaseSlug}_${viewport.id}_browser_trace`
  };
}

function prepareReadOnlyExecution(viewport) {
  const decision = evaluateAgentToolRequest(createBrowserRequest(viewport), {
    phase: phaseId,
    viewport: viewport.id
  });
  const intent = createExecutionIntentFromDecision(decision, {
    executionIntentId: `phase${phaseSlug}_${viewport.id}_browser_intent`
  });
  const queue = createExecutionQueue();
  const enqueued = queue.enqueue(intent);

  if (!enqueued.ok) {
    throw new Error(`ExecutionIntent enqueue failed for ${viewport.id}: ${enqueued.reason}`);
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
      throw new Error(`ExecutionIntent approval failed for ${viewport.id}: ${approved.reason}`);
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

  return { decision, intent: readyIntent, approval, gateResult };
}

const provider = createPlaywrightBrowserVerificationProvider({ artifactDir });
const observations = [];
const viewportResults = [];
let findings = [];

for (const viewport of workspaceAuditViewports) {
  const prepared = prepareReadOnlyExecution(viewport);
  if (prepared.gateResult.decision !== "READY") {
    throw new Error(`ExecutionGateway blocked ${viewport.id}: ${prepared.gateResult.reason}`);
  }

  const observation = await provider.observe({
    executionIntent: prepared.intent,
    gateResult: prepared.gateResult
  });

  if (!observation.ok) {
    throw new Error(`Browser observation failed for ${viewport.id}: ${observation.reason || observation.status}`);
  }

  const artifact = {
    ...observation.artifact,
    viewportDescriptor: viewport,
    phase: phaseId,
    executionGate: {
      decision: prepared.gateResult.decision,
      resolvedExecutionProvider: prepared.gateResult.resolvedExecutionProvider
    }
  };
  const result = createViewportResult({
    artifact,
    viewport,
    verification: observation.verification
  });
  const viewportFindings = detectViewportFindings(artifact, viewport);

  observations.push(artifact);
  viewportResults.push(result);
  findings = findings.concat(viewportFindings);
}

const repairProposals = createRepairProposalsForFindings(findings);
const comparison = createViewportComparisonArtifact({
  target: TARGET_URL,
  results: viewportResults,
  findings,
  repairProposals
});
const context = createMultiViewportObservationContext(comparison);
const savedPaths = saveMultiViewportAuditArtifacts({
  comparison,
  context,
  artifacts: observations,
  outputDir: artifactDir
});

const runReport = {
  phase: phaseId,
  target: TARGET_URL,
  providerId: provider.providerId,
  externalCalls: {
    playwrightLocalhostObservations: workspaceAuditViewports.length,
    providerApiCalls: 0,
    modelCalls: 0,
    databaseCalls: 0,
    deploys: 0
  },
  viewports: workspaceAuditViewports.map((viewport) => ({
    id: viewport.id,
    label: viewport.label,
    width: viewport.width,
    height: viewport.height,
    screenshotPath: path.join(
      artifactDir,
      screenshotSuffix
        ? viewport.screenshotName.replace(/\.png$/i, `${screenshotSuffix}.png`)
        : viewport.screenshotName
    )
  })),
  overallStatus: comparison.overallStatus,
  responsiveClassification: comparison.responsiveClassification,
  findingCount: findings.length,
  repairProposalCount: repairProposals.length,
  interactionCount: comparison.interactionCount,
  mutationCount: comparison.mutationCount,
  paths: savedPaths
};

writeJson(path.join(artifactDir, `phase${phaseSlug}_run_report.json`), runReport);
console.log(JSON.stringify(runReport, null, 2));
