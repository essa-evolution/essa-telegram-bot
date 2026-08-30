import fs from "fs";
import {
  buildCodingAgentRequest,
  buildContextPackWithDocumentation,
  buildMemoryContextForCodingAgent,
  createDocumentationContext,
  createDocumentationContextAuditReport,
  documentationContextStatuses
} from "../src/agentToolLayer/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const verifiedArtifact = readJson("artifacts/agentToolLayer/context7/phase20l/documentation_artifact.json");
const failureArtifact = readJson("artifacts/agentToolLayer/context7/phase20l/documentation_artifact.phase20l1_not_found_evidence.json");
const supabaseTask = {
  requestId: "phase20m_supabase_coding_task",
  title: "Show the correct current pattern for initializing Supabase JS in this project.",
  description: "Use @supabase/supabase-js and explain createClient initialization.",
  packageName: "@supabase/supabase-js",
  version: "^2.45.4"
};
const unrelatedTask = {
  requestId: "phase20m_unrelated_lisa_task",
  title: "Prepare Lisa production subtitle guidance.",
  description: "No code dependency documentation is needed."
};

const documentationContext = createDocumentationContext({
  artifact: verifiedArtifact,
  task: supabaseTask,
  maxItems: 3,
  maxChars: 700
});
check(
  documentationContext.status === documentationContextStatuses.ready &&
    documentationContext.selectedSnippets.length > 0 &&
    documentationContext.verificationStatus === "VERIFIED",
  "A verified Supabase artifact becomes DocumentationContext",
  documentationContext
);

const rejectedFailure = createDocumentationContext({
  artifact: failureArtifact,
  task: supabaseTask
});
check(
  rejectedFailure.status === documentationContextStatuses.rejected,
  "B Phase 20L failure artifact is rejected",
  rejectedFailure
);

const unrelatedContextPack = buildContextPackWithDocumentation({
  task: unrelatedTask,
  documentationArtifacts: [verifiedArtifact]
});
check(
  unrelatedContextPack.documentationContext === null,
  "C unrelated task does not load Supabase docs",
  unrelatedContextPack
);

const supabaseRequest = buildCodingAgentRequest({
  task: supabaseTask,
  projectContext: { projectId: "essa_phase20m" },
  sourceFiles: ["package.json"],
  documentationArtifacts: [verifiedArtifact],
  allowedTools: ["filesystem.read"]
});
check(
  supabaseRequest.contextPack.documentationContext?.status === documentationContextStatuses.ready &&
    supabaseRequest.providerCallMade === false,
  "D Supabase coding task loads bounded verified docs",
  supabaseRequest
);

const exactPatchContext = createDocumentationContext({
  artifact: verifiedArtifact,
  task: {
    ...supabaseTask,
    requiresExactVersion: true
  }
});
check(
  exactPatchContext.status === documentationContextStatuses.ready &&
    exactPatchContext.refreshStatus === documentationContextStatuses.refreshRequired &&
    exactPatchContext.refreshReasons.includes("exact_version_not_covered") &&
    exactPatchContext.versionResolution?.status === "VERSION_NOT_RESOLVED",
  "E exact patch request preserves version honesty and refresh flag",
  exactPatchContext
);

const fullArtifactText = JSON.stringify(verifiedArtifact);
const contextText = JSON.stringify(supabaseRequest.contextPack.documentationContext);
check(
  contextText.length < fullArtifactText.length &&
    !contextText.includes("endpoint") &&
    !contextText.includes("mcpTools"),
  "F full provider payload is not dumped into ContextPack",
  {
    fullArtifactChars: fullArtifactText.length,
    contextChars: contextText.length
  }
);

check(
  supabaseRequest.contextPack.documentationContext.policy.providerIndependent === true &&
    supabaseRequest.contextPack.policy.modelsMayContactDocumentationProviders === false,
  "G consuming agent does not require provider-specific identity",
  supabaseRequest.contextPack.documentationContext.policy
);

const memoryPack = buildMemoryContextForCodingAgent(supabaseRequest.contextPack.documentationContext);
check(
  memoryPack.budget.usedChars <= supabaseRequest.contextPack.documentationContext.boundedChars &&
    supabaseRequest.contextPack.documentationContext.approximateTokens > 0,
  "H context size remains bounded",
  {
    documentationContextSize: supabaseRequest.contextPack.documentationContext.boundedChars,
    memoryPackBudget: memoryPack.budget
  }
);

const auditReport = createDocumentationContextAuditReport(supabaseRequest.contextPack.documentationContext);
check(
  auditReport.verificationStatus === "VERIFIED" &&
    auditReport.snippetsSelected > 0 &&
    auditReport.contextSize.boundedChars > 0,
  "Audit report exposes safe documentation context summary",
  auditReport
);

check(
  supabaseRequest.providerCallMade === false,
  "I no external/provider calls occur in bridge tests",
  { providerCallMade: supabaseRequest.providerCallMade }
);

if (failures > 0) {
  console.error(`Documentation Context Bridge tests failed: ${failures}`);
  process.exit(1);
}

console.log("Documentation Context Bridge tests passed.");
