import fs from "fs";
import {
  agentToolRegistry,
  approvalDecisions,
  createApprovalDecision,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  evaluateAgentToolRequest,
  executionGateDecisions,
  executionIntentStatuses,
  executionProviderRegistry,
  prepareExecution
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

function fixture(name, overrides = {}) {
  return {
    ...JSON.parse(fs.readFileSync(`fixtures/agentToolRequests/${name}.json`, "utf8")),
    ...overrides
  };
}

function decision(name, overrides = {}) {
  return evaluateAgentToolRequest(fixture(name, overrides));
}

function readyIntentFromAllow(name, overrides = {}, intentOptions = {}) {
  return createExecutionIntentFromDecision(decision(name, overrides), {
    executionIntentId: intentOptions.executionIntentId || `phase20k_${name}_intent`,
    ...intentOptions
  });
}

function approvedIntentFromConfirmation(name, overrides = {}, intentOptions = {}) {
  const queue = createExecutionQueue();
  const intent = createExecutionIntentFromDecision(decision(name, overrides), {
    executionIntentId: intentOptions.executionIntentId || `phase20k_${name}_intent`,
    ...intentOptions
  });
  queue.enqueue(intent);
  const approval = createApprovalDecision({
    executionIntentId: intent.executionIntentId,
    decision: approvalDecisions.approve,
    decidedBy: "human:Lisa",
    scope: {
      toolId: intent.toolId,
      action: intent.action,
      projectId: intent.projectId
    },
    approvalToken: intent.approvalToken,
    maxApprovedCost: intentOptions.maxApprovedCost || null
  });
  const approved = queue.applyApproval(approval);

  return {
    queue,
    intent: approved.intent,
    approval
  };
}

const validDoc = readyIntentFromAllow("documentation_request", {
  projectId: "project_doc"
}, {
  executionIntentId: "phase20k_valid_doc_intent"
});
const validDocGate = prepareExecution(validDoc, {
  expectedProjectId: "project_doc"
});
check(
  validDocGate.decision === executionGateDecisions.ready &&
    validDocGate.executed === false &&
    validDocGate.resolvedExecutionProvider?.executable === false &&
    validDocGate.safeInput.packageName === "express",
  "A valid documentation READY_FOR_EXECUTION intent reaches GateResult READY and executed=false",
  validDocGate
);

const waitingBrowser = createExecutionIntentFromDecision(decision("browser_inspection_request", {
  projectId: "project_browser"
}), {
  executionIntentId: "phase20k_waiting_browser_intent"
});
const waitingGate = prepareExecution(waitingBrowser);
check(
  waitingGate.decision === executionGateDecisions.blocked &&
    waitingGate.reason === "intent_not_ready_for_execution",
  "B WAITING_FOR_APPROVAL is blocked",
  waitingGate
);

const expiredDoc = readyIntentFromAllow("documentation_request", {}, {
  executionIntentId: "phase20k_expired_doc_intent",
  expiresAt: "2000-01-01T00:00:00.000Z"
});
const expiredGate = prepareExecution(expiredDoc);
check(
  expiredGate.decision === executionGateDecisions.blocked &&
    expiredGate.reason === "execution_intent_expired",
  "C expired intent is blocked",
  expiredGate
);

const expiredApproval = approvedIntentFromConfirmation("browser_inspection_request", {
  projectId: "project_expired_approval"
}, {
  executionIntentId: "phase20k_expired_approval_intent",
  expiresAt: "2000-01-01T00:00:00.000Z"
});
const expiredApprovalGate = prepareExecution(expiredApproval.intent);
check(
  expiredApprovalGate.decision === executionGateDecisions.blocked &&
    ["execution_intent_expired", "intent_not_ready_for_execution"].includes(expiredApprovalGate.reason),
  "D expired approval/intent is blocked",
  expiredApprovalGate
);

const costIntentPack = approvedIntentFromConfirmation("provider_lies_permission_request", {
  projectId: "project_cost",
  estimatedCost: "$0.10"
}, {
  executionIntentId: "phase20k_cost_intent",
  maxApprovedCost: "$0.10"
});
const costGate = prepareExecution({
  ...costIntentPack.intent,
  maxApprovedCost: "$0.10"
}, {
  currentEstimatedCost: "$0.50"
});
check(
  costGate.decision === executionGateDecisions.requiresReapproval &&
    costGate.reason === "cost_ceiling_exceeded_requires_reapproval",
  "E cost increase above approved limit requires reapproval",
  costGate
);

const staleRegistryGate = prepareExecution({
  ...validDoc,
  registryVersion: "agent-tool-registry-v0"
});
check(
  staleRegistryGate.decision === executionGateDecisions.requiresReapproval &&
    staleRegistryGate.reason === "registry_version_changed",
  "F registry definition/version change requires reapproval",
  staleRegistryGate
);

const crossProjectGate = prepareExecution(validDoc, {
  expectedProjectId: "another_project"
});
check(
  crossProjectGate.decision === executionGateDecisions.blocked &&
    crossProjectGate.reason === "project_ownership_mismatch",
  "G cross-project ownership mismatch is blocked",
  crossProjectGate
);

const providerOverrideGate = prepareExecution(validDoc, {
  executionProviderOverride: "provider_from_model_request"
});
check(
  providerOverrideGate.decision === executionGateDecisions.blocked &&
    providerOverrideGate.reason === "model_or_runtime_provider_override_rejected",
  "H provider/tool override at execution time is blocked",
  providerOverrideGate
);

const duplicateGate = prepareExecution(validDoc, {
  executionHistory: [
    {
      idempotencyKey: validDoc.idempotencyKey,
      status: "SUCCESS",
      verified: true
    }
  ]
});
check(
  duplicateGate.decision === executionGateDecisions.blocked &&
    duplicateGate.reason === "duplicate_verified_execution",
  "I duplicate idempotency success is blocked",
  duplicateGate
);

const prodDbForcedReady = {
  ...createExecutionIntentFromDecision(decision("database_write_prod_request", {
    projectId: "project_prod_db"
  }), {
    executionIntentId: "phase20k_prod_db_intent"
  }),
  status: executionIntentStatuses.readyForExecution
};
const prodDbGate = prepareExecution(prodDbForcedReady);
check(
  prodDbGate.decision === executionGateDecisions.blocked &&
    ["production_access_denied", "production_write_denied"].includes(prodDbGate.reason),
  "J production DB mutation is blocked at final gateway",
  prodDbGate
);

const publishForcedReady = {
  ...createExecutionIntentFromDecision(decision("publish_request"), {
    executionIntentId: "phase20k_publish_intent"
  }),
  status: executionIntentStatuses.readyForExecution
};
const securityForcedReady = {
  ...createExecutionIntentFromDecision(decision("security_test_request"), {
    executionIntentId: "phase20k_security_intent"
  }),
  status: executionIntentStatuses.readyForExecution
};
const publishGate = prepareExecution(publishForcedReady);
const securityGate = prepareExecution(securityForcedReady);
check(
  publishGate.decision === executionGateDecisions.blocked &&
    securityGate.decision === executionGateDecisions.blocked &&
    publishGate.executed === false &&
    securityGate.executed === false,
  "K publish/deploy/security remain blocked",
  {
    publishGate,
    securityGate
  }
);

const secretIntent = {
  ...validDoc,
  executionIntentId: "phase20k_secret_intent",
  normalizedInput: {
    scope: "package_name",
    packageName: "express",
    ANTHROPIC_API_KEY: "SECRET_LIKE_TEST_VALUE"
  }
};
const secretGate = prepareExecution(secretIntent);
const secretText = JSON.stringify(secretGate).toLowerCase();
check(
  secretGate.decision === executionGateDecisions.blocked &&
    secretGate.reason === "secret_like_input_blocked" &&
    !secretText.includes("secret_like_test_value") &&
    secretText.includes("[redacted"),
  "L secret-like model input is blocked and redacted",
  secretGate
);

const changedCapabilityRegistry = agentToolRegistry.map((tool) =>
  tool.toolId === "documentation.context7.mock"
    ? {
      ...tool,
      capabilities: ["api_reference_lookup"]
    }
    : tool
);
const changedCapabilityGate = prepareExecution(validDoc, {
  registry: changedCapabilityRegistry
});
check(
  changedCapabilityGate.decision === executionGateDecisions.requiresReapproval &&
    changedCapabilityGate.reason === "tool_capability_changed",
  "Tool capability change before execution requires reapproval",
  changedCapabilityGate
);

check(
  executionProviderRegistry.every((provider) => provider.executable === false) &&
    [validDocGate, waitingGate, expiredGate, costGate, staleRegistryGate, crossProjectGate, providerOverrideGate, duplicateGate, prodDbGate, publishGate, securityGate, secretGate, changedCapabilityGate]
      .every((gate) => gate.executed === false),
  "No execution provider is executable and all gate results have executed=false",
  {
    providers: executionProviderRegistry.map((provider) => ({
      providerId: provider.providerId,
      executable: provider.executable
    }))
  }
);

if (failures > 0) {
  console.error(`Execution Gateway tests failed: ${failures}`);
  process.exit(1);
}

console.log("Execution Gateway tests passed.");
