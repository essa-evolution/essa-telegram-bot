import fs from "fs";
import {
  agentToolDecisions,
  agentToolRequestContract,
  agentToolDecisionContract,
  evaluateAgentToolRequest,
  evaluateProductionAgentToolRequests
} from "../src/agentToolLayer/index.js";

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

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(`fixtures/agentToolRequests/${name}.json`, "utf8"));
}

function runFixture(name) {
  return evaluateAgentToolRequest(loadFixture(name));
}

function traceText(result) {
  return JSON.stringify(result.trace).toLowerCase();
}

check(
  agentToolRequestContract.requestId === null &&
    agentToolRequestContract.toolId === null &&
    agentToolRequestContract.permissionLevel === null &&
    agentToolDecisionContract.decision === agentToolDecisions.block,
  "AgentToolRequest and AgentToolDecision contracts are exported",
  {
    requestFields: Object.keys(agentToolRequestContract),
    decisionFields: Object.keys(agentToolDecisionContract)
  }
);

const doc = runFixture("documentation_request");
check(
  doc.decision.decision === agentToolDecisions.allow &&
    doc.decision.registryStatus === "REGISTERED_NON_EXECUTABLE" &&
    doc.executed === false,
  "A documentation request is allowed for future execution without executing Context7",
  {
    decision: doc.decision,
    approvalRequest: doc.approvalRequest,
    executed: doc.executed
  }
);

const browser = runFixture("browser_inspection_request");
check(
  browser.decision.decision === agentToolDecisions.requireConfirmation &&
    browser.approvalRequest?.tool?.providerId === "playwright_mcp_future" &&
    browser.executed === false,
  "B browser inspection request requires confirmation and does not execute",
  {
    decision: browser.decision,
    approvalRequest: browser.approvalRequest
  }
);

const dbRead = runFixture("database_read_dev_request");
check(
  dbRead.decision.decision === agentToolDecisions.allow &&
    dbRead.decision.environmentCheck.environment === "development" &&
    dbRead.executed === false,
  "C development database read is allowed by policy but not executed",
  {
    decision: dbRead.decision
  }
);

const dbWrite = runFixture("database_write_dev_request");
check(
  dbWrite.decision.decision === agentToolDecisions.requireConfirmation &&
    dbWrite.decision.permissionCheck.providerPermissionIgnored === true &&
    dbWrite.approvalRequest?.reversible === true,
  "D development database write requires confirmation and registry overrides provider permission claim",
  {
    providerClaim: dbWrite.request.permissionLevel,
    registryPermissions: dbWrite.decision.permissionCheck.registryPermissionLevel,
    decision: dbWrite.decision,
    approvalRequest: dbWrite.approvalRequest
  }
);

const dbProd = runFixture("database_write_prod_request");
check(
  dbProd.decision.decision === agentToolDecisions.block &&
    dbProd.decision.environmentCheck.reasons.includes("production_access_denied") &&
    dbProd.decision.environmentCheck.reasons.includes("production_database_write_denied"),
  "E production database write is blocked by default",
  {
    decision: dbProd.decision
  }
);

const publish = runFixture("publish_request");
check(
  publish.decision.decision === agentToolDecisions.block &&
    publish.decision.permissionCheck.reasons.includes("publish_deploy_cannot_auto_run"),
  "F publish cannot auto-run",
  {
    decision: publish.decision
  }
);

const deploy = runFixture("deploy_request");
check(
  deploy.decision.decision === agentToolDecisions.block &&
    deploy.decision.permissionCheck.reasons.includes("publish_deploy_cannot_auto_run"),
  "G deploy cannot auto-run",
  {
    decision: deploy.decision
  }
);

const security = runFixture("security_test_request");
check(
  security.decision.decision === agentToolDecisions.block &&
    security.decision.permissionCheck.reasons.includes("security_sensitive_blocked_without_sandbox"),
  "H security tooling cannot auto-run",
  {
    decision: security.decision
  }
);

const unknown = runFixture("unknown_tool_request");
check(
  unknown.decision.decision === agentToolDecisions.block &&
    unknown.decision.reason === "unknown_tool",
  "I unknown tool is blocked",
  {
    decision: unknown.decision
  }
);

const providerLie = runFixture("provider_lies_permission_request");
check(
  providerLie.decision.decision === agentToolDecisions.requireConfirmation &&
    providerLie.request.permissionLevel === "READ_ONLY" &&
    providerLie.decision.costCheck.registryCost === "LOW_COST_EXTERNAL" &&
    providerLie.decision.costCheck.reasons.includes("unknown_external_cost_requires_confirmation"),
  "J registry wins when provider lies about permission/cost",
  {
    providerClaim: providerLie.request.permissionLevel,
    decision: providerLie.decision,
    approvalRequest: providerLie.approvalRequest
  }
);

const docMutation = evaluateAgentToolRequest({
  ...loadFixture("documentation_request"),
  requestId: "phase20i_doc_mutation",
  action: "write_file",
  input: {
    writeScope: "workspace",
    targetPath: "workspace/app.js"
  }
});
check(
  docMutation.decision.decision === agentToolDecisions.block &&
    docMutation.decision.scopeCheck.reasons.includes("write_scope_violation"),
  "Documentation tool cannot mutate filesystem scope",
  {
    decision: docMutation.decision
  }
);

const browserPublish = evaluateAgentToolRequest({
  ...loadFixture("browser_inspection_request"),
  requestId: "phase20i_browser_publish",
  action: "publish",
  input: {
    writeScope: "production_deployment",
    platform: "Instagram"
  }
});
check(
  browserPublish.decision.decision === agentToolDecisions.block &&
    browserPublish.decision.scopeCheck.reasons.includes("write_scope_violation"),
  "Browser inspect tool cannot publish outside its scope",
  {
    decision: browserPublish.decision
  }
);

const secret = runFixture("secret_like_request");
check(
  secret.decision.decision === agentToolDecisions.block &&
    secret.decision.blockedFields.includes("input") &&
    !traceText(secret).includes("secret_like_test_value") &&
    traceText(secret).includes("[redacted"),
  "Secret-like values are blocked and redacted from trace",
  {
    decision: secret.decision,
    trace: secret.trace
  }
);

const bridge = evaluateProductionAgentToolRequests({
  providerId: "future_gemini_agent",
  toolRequests: [
    {
      toolId: "documentation.context7.mock",
      action: "lookup_docs",
      input: {
        scope: "package_name",
        packageName: "express"
      },
      permissionLevel: "READ_ONLY",
      estimatedCost: "FREE"
    },
    {
      toolId: "database.supabase.mock",
      action: "write_rows",
      input: {
        operation: "insert",
        writeScope: "development_only_with_explicit_approval"
      },
      permissionLevel: "READ_ONLY",
      estimatedCost: "LOW_COST_EXTERNAL"
    }
  ]
}, {
  taskId: "phase20i_bridge_task",
  goalId: "phase20i_goal",
  projectId: "phase20i_project",
  workflowId: "phase20i_workflow",
  requestedByAgent: "production_agent",
  environment: "DEVELOPMENT",
  traceId: "phase20i_bridge_trace"
});
check(
  bridge.providerId === "future_gemini_agent" &&
    bridge.requestCount === 2 &&
    bridge.decisions[0].decision.decision === agentToolDecisions.allow &&
    bridge.decisions[1].decision.decision === agentToolDecisions.requireConfirmation &&
    bridge.executed === false &&
    bridge.decisions.every((item) => item.request.requestedByProvider === "future_gemini_agent"),
  "ProductionAgent bridge is provider-independent and non-executing",
  {
    providerId: bridge.providerId,
    decisions: bridge.decisions.map((item) => item.decision),
    executed: bridge.executed
  }
);

check(
  [
    doc,
    browser,
    dbRead,
    dbWrite,
    dbProd,
    publish,
    deploy,
    security,
    unknown,
    providerLie,
    secret,
    ...bridge.decisions
  ].every((item) => item.executed === false),
  "No actual tool execution occurs for any decision package"
);

if (failures > 0) {
  console.error(`Agent Tool Request Bridge tests failed: ${failures}`);
  process.exit(1);
}

console.log("Agent Tool Request Bridge tests passed.");
