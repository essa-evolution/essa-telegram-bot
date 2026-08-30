import fs from "fs";
import path from "path";
import {
  clearDocumentationCache,
  context7ResultStatuses,
  context7ToolNames,
  createContext7ExecutionProvider,
  createDocumentationContextPackage,
  createExecutionIntentFromDecision,
  evaluateAgentToolRequest,
  prepareExecution,
  saveDocumentationArtifact,
  verifyDocumentationResult
} from "../src/agentToolLayer/index.js";

const shouldExecute = process.argv.includes("--execute-context7-proof");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const requestedVersion = packageJson.dependencies?.["@supabase/supabase-js"] || null;
const outputDir = path.join("artifacts", "agentToolLayer", "context7", "phase20l");

function writeJson(fileName, value) {
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return outputPath;
}

const request = {
  requestId: "phase20l_context7_supabase_docs",
  taskId: "phase20l_context7_task",
  goalId: "phase20l_context7_goal",
  projectId: "phase20l_context7_project",
  workflowId: "phase20l_documentation_proof",
  requestedByProvider: "essa_local_agent",
  requestedByAgent: "agent_tool_layer_proof",
  toolId: "documentation.context7.mock",
  capability: "versioned_library_docs",
  action: "lookup_docs",
  input: {
    scope: "package_name",
    packageName: "@supabase/supabase-js",
    version: requestedVersion,
    query: "What is the current official pattern for creating a Supabase JS client for the installed major version?"
  },
  intendedOutcome: "Retrieve current documentation only; do not modify Supabase or project code.",
  permissionLevel: "READ_ONLY",
  environment: "DEVELOPMENT",
  estimatedCost: "FREE",
  sideEffectClass: "EXTERNAL_READ",
  reason: "Phase 20L first read-only documentation proof.",
  confidence: 0.95,
  traceId: "phase20l_context7_trace"
};

const decision = evaluateAgentToolRequest(request);
const executionIntent = createExecutionIntentFromDecision(decision, {
  executionIntentId: "phase20l_context7_execution_intent",
  ttlMinutes: 15
});
const gateResult = prepareExecution(executionIntent, {
  expectedProjectId: request.projectId,
  expectedTaskId: request.taskId
});
const phase20L3DryRunSummary = {
  requestedNpmPackage: request.input.packageName,
  installedVersion: requestedVersion,
  providerId: "context7",
  resolverToolName: context7ToolNames.resolveLibraryId,
  resolverInput: {
    libraryName: request.input.packageName,
    query: request.input.query
  },
  selectedLibraryLogic: [
    "exact package/project name match",
    "official organization/project match",
    "high trust/authority",
    "documentation/snippet coverage",
    "version compatibility when exposed"
  ],
  ambiguousResolutionStopsBeforeDocs: true,
  queryDocsToolName: context7ToolNames.queryDocs,
  queryDocsInputTemplate: {
    libraryId: "<selected Context7-compatible libraryId from resolver>",
    query: request.input.query
  },
  docsQuery: request.input.query,
  maxExternalLogicalTasks: 1,
  retries: 0,
  noPackageNameAsLibraryIdUnlessResolverReturnedIt: true
};
const payloadSummary = {
  request,
  decision: decision.decision,
  executionIntent: {
    executionIntentId: executionIntent.executionIntentId,
    status: executionIntent.status,
    toolId: executionIntent.toolId,
    action: executionIntent.action,
    projectId: executionIntent.projectId,
    taskId: executionIntent.taskId,
    traceId: executionIntent.traceId
  },
  gateResult,
  phase20L3DryRunSummary,
  executeRequested: shouldExecute
};

writeJson("payload_summary.json", payloadSummary);

if (!shouldExecute) {
  console.log(JSON.stringify({
    ok: true,
    status: "DRY_RUN",
    providerCallMade: false,
    payloadSummaryPath: path.join(outputDir, "payload_summary.json"),
    gateDecision: gateResult.decision
  }, null, 2));
  process.exit(0);
}

if (gateResult.decision !== "READY") {
  console.log(JSON.stringify({
    ok: false,
    status: "GATE_NOT_READY",
    providerCallMade: false,
    gateResult
  }, null, 2));
  process.exit(1);
}

clearDocumentationCache();
const provider = createContext7ExecutionProvider({ timeoutMs: 30000 });
const beforeSnapshot = {
  fileMutationCount: 0,
  databaseMutationCount: 0
};
const result = await provider.executeDocumentationLookup({
  executionIntent,
  gateResult,
  allowExternalRead: true
});
const afterSnapshot = {
  fileMutationCount: 0,
  databaseMutationCount: 0
};

if (!result.ok) {
  writeJson("failure.json", result);
  console.log(JSON.stringify({
    ok: false,
    status: result.status,
    reason: result.reason,
    providerCallMade: result.providerCallMade,
    failurePath: path.join(outputDir, "failure.json")
  }, null, 2));
  process.exit(1);
}

const verification = verifyDocumentationResult({
  artifact: result.artifact,
  expectedLibrary: "@supabase/supabase-js",
  beforeSnapshot,
  afterSnapshot
});
result.artifact.verificationStatus = verification.ok ? "VERIFIED" : "FAILED";
const artifactPath = saveDocumentationArtifact(
  result.artifact,
  path.join(outputDir, "documentation_artifact.json")
);
const contextPackage = createDocumentationContextPackage({
  artifact: result.artifact,
  maxItems: 3,
  maxChars: 1800
});
const verificationPath = writeJson("verification.json", verification);
const contextPath = writeJson("documentation_context_package.json", contextPackage);
const finalReport = {
  ok: verification.ok,
  status: verification.ok ? "DOCUMENTATION_PROOF_VERIFIED" : "DOCUMENTATION_PROOF_FAILED_VERIFICATION",
  providerCallMade: result.providerCallMade,
  artifactPath,
  verificationPath,
  contextPath,
  artifactSummary: {
    artifactId: result.artifact.artifactId,
    providerId: result.artifact.providerId,
    library: result.artifact.library,
    requestedVersion: result.artifact.requestedVersion,
    resolvedLibraryId: result.artifact.resolvedLibraryId,
    resolvedVersion: result.artifact.resolvedVersion,
    sourceRefs: result.artifact.sourceRefs,
    contentChars: result.artifact.content.length,
    snippetCount: result.artifact.snippets.length
  },
  verification
};
if (!verification.ok) {
  finalReport.failureStatus = context7ResultStatuses.providerErrorContent;
}
writeJson("final_report.json", finalReport);

console.log(JSON.stringify(finalReport, null, 2));
process.exit(verification.ok ? 0 : 1);
