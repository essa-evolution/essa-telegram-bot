import fs from "fs";
import {
  clearDocumentationCache,
  createContext7ExecutionProvider,
  createDocumentationContextPackage,
  context7ResultStatuses,
  createExecutionIntentFromDecision,
  evaluateAgentToolRequest,
  executionGateDecisions,
  prepareExecution,
  resolveContext7LibraryResult,
  validateDocumentationArtifact,
  verifyDocumentationResult
} from "../src/agentToolLayer/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function fixture(name, overrides = {}) {
  return {
    ...JSON.parse(fs.readFileSync(`fixtures/agentToolRequests/${name}.json`, "utf8")),
    ...overrides
  };
}

const docRequest = fixture("documentation_request", {
  taskId: "phase20l_test_task",
  projectId: "phase20l_test_project",
  input: {
    scope: "package_name",
    packageName: "@supabase/supabase-js",
    version: "^2.45.4",
    query: "What is the current official pattern for creating a Supabase JS client for the installed major version?"
  }
});
const docDecision = evaluateAgentToolRequest(docRequest);
const docIntent = createExecutionIntentFromDecision(docDecision, {
  executionIntentId: "phase20l_doc_intent"
});
const gateReady = prepareExecution(docIntent, {
  expectedProjectId: "phase20l_test_project"
});

check(
  docDecision.decision.decision === "ALLOW" &&
    gateReady.decision === executionGateDecisions.ready &&
    gateReady.executed === false,
  "B documentation request passes policy and gateway as read-only",
  {
    decision: docDecision.decision,
    gate: gateReady
  }
);

const context7Query = docRequest.input.query;
const exactResolution = resolveContext7LibraryResult({
  requestedLibraryName: "@supabase/supabase-js",
  requestedPackageVersion: "^2.45.4",
  query: context7Query,
  resolveResult: {
    candidates: [
      {
        libraryId: "/supabase/supabase-js",
        title: "Supabase JavaScript Client",
        description: "Official Supabase JavaScript client documentation.",
        versions: ["v2", "v1"],
        trustScore: 9,
        snippetCount: 120
      },
      {
        libraryId: "/community/supabase-examples",
        title: "Supabase examples",
        description: "Community examples.",
        trustScore: 5,
        snippetCount: 10
      }
    ]
  }
});
check(
  exactResolution.status === "RESOLVED" &&
    exactResolution.selectedLibraryId === "/supabase/supabase-js" &&
    exactResolution.versionResolution.status === "compatible_major",
  "A exact Supabase candidate resolves before docs query",
  exactResolution
);

const ambiguousResolution = resolveContext7LibraryResult({
  requestedLibraryName: "@supabase/supabase-js",
  requestedPackageVersion: "^2.45.4",
  query: context7Query,
  resolveResult: {
    candidates: [
      {
        libraryId: "/supabase/supabase-js",
        title: "Supabase JS",
        description: "Supabase JavaScript docs",
        trustScore: 9,
        snippetCount: 50
      },
      {
        libraryId: "/supabase/supabase-js-client",
        title: "Supabase JS Client",
        description: "Supabase JavaScript docs",
        trustScore: 9,
        snippetCount: 50
      }
    ]
  }
});
check(
  ambiguousResolution.status === context7ResultStatuses.ambiguousLibraryResolution,
  "B multiple close Supabase-like candidates stop as ambiguous",
  ambiguousResolution
);

const noCandidateResolution = resolveContext7LibraryResult({
  requestedLibraryName: "@supabase/supabase-js",
  requestedPackageVersion: "^2.45.4",
  query: context7Query,
  resolveResult: { candidates: [] }
});
check(
  noCandidateResolution.status === context7ResultStatuses.libraryNotFound,
  "C no candidate returns LIBRARY_NOT_FOUND",
  noCandidateResolution
);

const unclearVersionResolution = resolveContext7LibraryResult({
  requestedLibraryName: "@supabase/supabase-js",
  requestedPackageVersion: "^2.45.4",
  query: context7Query,
  resolveResult: {
    candidates: [
      {
        libraryId: "/supabase/supabase-js",
        title: "Supabase JavaScript Client",
        description: "Official Supabase JavaScript client documentation.",
        trustScore: 9,
        snippetCount: 120
      }
    ]
  }
});
check(
  unclearVersionResolution.status === "RESOLVED" &&
    unclearVersionResolution.versionResolution.status === context7ResultStatuses.versionNotResolved,
  "D candidate can resolve while version compatibility remains honest",
  unclearVersionResolution
);

let transportCalls = 0;
const provider = createContext7ExecutionProvider({
  transport: async ({ library, requestedVersion, query }) => {
    transportCalls += 1;
    return {
      ok: true,
      status: 200,
      resolvedLibraryId: "/supabase/supabase-js",
      resolvedVersion: "2.x",
      resolution: exactResolution,
      body: {
        result: {
          content: [
            {
              type: "text",
              text: [
                "Supabase JavaScript client v2 uses createClient from @supabase/supabase-js.",
                "Import createClient, then pass the project URL and anon key or a securely resolved key.",
                "This documentation result is read-only and does not perform database operations."
              ].join("\n")
            }
          ]
        }
      },
      meta: { library, requestedVersion, query }
    };
  }
});

const nonReady = await provider.executeDocumentationLookup({
  executionIntent: {
    ...docIntent,
    status: "WAITING_FOR_APPROVAL"
  },
  gateResult: {
    decision: executionGateDecisions.blocked
  },
  allowExternalRead: true
});
check(
  nonReady.ok === false &&
    nonReady.providerCallMade === false &&
    transportCalls === 0,
  "A non-READY ExecutionIntent cannot call Context7",
  nonReady
);

const noApproval = await provider.executeDocumentationLookup({
  executionIntent: docIntent,
  gateResult: gateReady,
  allowExternalRead: false
});
check(
  noApproval.ok === false &&
    noApproval.providerCallMade === false,
  "Provider requires explicit external read approval flag",
  noApproval
);

const result = await provider.executeDocumentationLookup({
  executionIntent: docIntent,
  gateResult: gateReady,
  allowExternalRead: true
});
const validation = validateDocumentationArtifact(result.artifact);
const verification = verifyDocumentationResult({
  artifact: result.artifact,
  expectedLibrary: "@supabase/supabase-js",
  beforeSnapshot: { fileMutationCount: 0, databaseMutationCount: 0 },
  afterSnapshot: { fileMutationCount: 0, databaseMutationCount: 0 }
});
check(
  result.ok === true &&
    result.status === context7ResultStatuses.validDocumentationResult &&
    result.providerCallMade === true &&
    validation.ok === true &&
    verification.ok === true,
  "F DocumentationArtifact validates and verification passes",
  {
    status: result.status,
    validation,
    verification
  }
);

const cached = await provider.executeDocumentationLookup({
  executionIntent: docIntent,
  gateResult: gateReady,
  allowExternalRead: true
});
check(
  cached.ok === true &&
    cached.status === "CACHE_HIT" &&
    cached.providerCallMade === false &&
    transportCalls === 1,
  "Idempotency/cache prevents uncontrolled duplicate external calls",
  {
    status: cached.status,
    transportCalls
  }
);

const contextPackage = createDocumentationContextPackage({
  artifact: result.artifact,
  maxItems: 2,
  maxChars: 180
});
check(
  contextPackage.selected.length <= 2 &&
    contextPackage.budget.usedChars <= 180 &&
    contextPackage.policy.neverSendFullMemoryAutomatically === true,
  "G ContextBudget selects bounded relevant documentation content",
  contextPackage
);

const malformedProvider = createContext7ExecutionProvider({
  transport: async () => ({
    ok: true,
    body: { result: { content: [] } }
  })
});
clearDocumentationCache();
const malformed = await malformedProvider.executeDocumentationLookup({
  executionIntent: docIntent,
  gateResult: gateReady,
  allowExternalRead: true
});
check(
  malformed.ok === false &&
    malformed.status === "MALFORMED_PROVIDER_RESPONSE" &&
    malformed.providerCallMade === true,
  "H malformed response fails safely",
  malformed
);

const toolErrorProvider = createContext7ExecutionProvider({
  transport: async () => ({
    ok: true,
    body: {
      result: {
        isError: true,
        content: [
          {
            type: "text",
            text: "Input validation error: Invalid arguments for tool query-docs"
          }
        ]
      }
    }
  })
});
clearDocumentationCache();
const toolError = await toolErrorProvider.executeDocumentationLookup({
  executionIntent: docIntent,
  gateResult: gateReady,
  allowExternalRead: true
});
check(
  toolError.ok === false &&
    toolError.status === context7ResultStatuses.providerErrorContent &&
    toolError.providerCallMade === true,
  "H2 provider tool error content is not accepted as documentation",
  toolError
);

const notFoundArtifactValidation = validateDocumentationArtifact({
  ...result.artifact,
  content: 'Library "/@supabase/supabase-js" not found. Please check the library ID or your access permissions.'
});
check(
  notFoundArtifactValidation.ok === false &&
    notFoundArtifactValidation.errors.includes("provider_error_content"),
  "H3 provider library-not-found content is not accepted as documentation",
  notFoundArtifactValidation
);

const blockedContextPackage = createDocumentationContextPackage({
  artifact: {
    ...result.artifact,
    content: 'Library "/@supabase/supabase-js" not found. Please check the library ID or your access permissions.'
  },
  maxItems: 2,
  maxChars: 180
});
check(
  blockedContextPackage.blocked === true &&
    blockedContextPackage.selected.length === 0 &&
    blockedContextPackage.reason === "documentation_artifact_not_verified",
  "Failed provider content is isolated from ContextBudget",
  blockedContextPackage
);

const mutationAttempt = evaluateAgentToolRequest({
  ...docRequest,
  requestId: "phase20l_doc_mutation_attempt",
  action: "write_file",
  input: {
    writeScope: "workspace",
    targetPath: "package.json"
  }
});
check(
  mutationAttempt.decision.decision === "BLOCK" &&
    mutationAttempt.executed === false,
  "C provider/tool cannot mutate filesystem through documentation request",
  mutationAttempt.decision
);

const scopeExpansion = evaluateAgentToolRequest({
  ...docRequest,
  requestId: "phase20l_doc_scope_expansion",
  input: {
    scope: "workspace",
    packageName: "@supabase/supabase-js"
  }
});
check(
  scopeExpansion.decision.decision === "BLOCK",
  "D provider cannot expand documentation scope",
  scopeExpansion.decision
);

const secretAttempt = evaluateAgentToolRequest({
  ...docRequest,
  requestId: "phase20l_doc_secret_attempt",
  input: {
    scope: "package_name",
    packageName: "@supabase/supabase-js",
    CONTEXT7_API_KEY: "SECRET_LIKE_TEST_VALUE"
  }
});
const secretText = JSON.stringify(secretAttempt).toLowerCase();
check(
  secretAttempt.decision.decision === "BLOCK" &&
    !secretText.includes("secret_like_test_value") &&
    secretText.includes("[redacted"),
  "E secret never appears in trace",
  secretAttempt.decision
);

check(
  transportCalls === 1 &&
    result.artifact.readOnly === true &&
    result.artifact.provenance.providerCallMade === true,
  "I no unrelated tool executes in provider tests",
  {
    transportCalls,
    providerCallMade: result.artifact.provenance.providerCallMade,
    readOnly: result.artifact.readOnly
  }
);

if (failures > 0) {
  console.error(`Context7 documentation provider tests failed: ${failures}`);
  process.exit(1);
}

console.log("Context7 documentation provider tests passed.");
