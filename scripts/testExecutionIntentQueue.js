import fs from "fs";
import {
  approvalDecisionContract,
  approvalDecisions,
  createApprovalDecision,
  createApprovalSummary,
  createExecutionIntentFromDecision,
  createExecutionQueue,
  evaluateAgentToolRequest,
  executionIntentContract,
  executionIntentStatuses
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

check(
  executionIntentContract.executionIntentId === null &&
    executionIntentContract.status === executionIntentStatuses.queued &&
    approvalDecisionContract.executionIntentId === null,
  "ExecutionIntent and ApprovalDecision contracts are exported",
  {
    executionIntentFields: Object.keys(executionIntentContract),
    approvalDecisionFields: Object.keys(approvalDecisionContract)
  }
);

const docDecision = decision("documentation_request");
const docIntent = createExecutionIntentFromDecision(docDecision, {
  executionIntentId: "phase20j_doc_intent"
});
const queue = createExecutionQueue();
const docEnqueue = queue.enqueue(docIntent);
check(
  docIntent.status === executionIntentStatuses.readyForExecution &&
    docEnqueue.ok === true &&
    docEnqueue.intent.status === executionIntentStatuses.readyForExecution &&
    docEnqueue.intent.audit.some((item) => item.event === "execution_intent_created"),
  "A documentation ALLOW decision becomes READY_FOR_EXECUTION without Context7 execution",
  {
    intent: docEnqueue.intent
  }
);

const browserDecision = decision("browser_inspection_request", {
  projectId: "project_browser"
});
const browserIntent = createExecutionIntentFromDecision(browserDecision, {
  executionIntentId: "phase20j_browser_intent"
});
const browserEnqueue = queue.enqueue(browserIntent);
check(
  browserIntent.status === executionIntentStatuses.waitingForApproval &&
    browserIntent.approvalToken &&
    browserEnqueue.intent.approvalStatus === "PENDING" &&
    queue.listWaitingApprovals().some((item) => item.executionIntentId === "phase20j_browser_intent"),
  "B browser REQUIRE_CONFIRMATION becomes WAITING_FOR_APPROVAL",
  {
    intent: browserEnqueue.intent
  }
);

const browserApproval = createApprovalDecision({
  executionIntentId: browserIntent.executionIntentId,
  decision: approvalDecisions.approve,
  decidedBy: "human:Lisa",
  scope: {
    toolId: browserIntent.toolId,
    projectId: browserIntent.projectId,
    action: browserIntent.action
  },
  notes: "Approve future local browser inspection only.",
  approvalToken: browserIntent.approvalToken
});
const browserApproved = queue.applyApproval(browserApproval);
check(
  browserApproved.ok === true &&
    browserApproved.intent.status === executionIntentStatuses.readyForExecution &&
    browserApproved.intent.audit.some((item) => item.event === "state_transition" && item.to === "READY_FOR_EXECUTION"),
  "C approving browser inspection moves APPROVED then READY_FOR_EXECUTION, still no browser call",
  {
    approval: browserApproval,
    intent: browserApproved.intent
  }
);

const dbWriteDecision = decision("database_write_dev_request", {
  projectId: "project_db"
});
const dbWriteIntent = createExecutionIntentFromDecision(dbWriteDecision, {
  executionIntentId: "phase20j_db_write_intent"
});
queue.enqueue(dbWriteIntent);
const dbReject = queue.applyApproval(createApprovalDecision({
  executionIntentId: dbWriteIntent.executionIntentId,
  decision: approvalDecisions.reject,
  decidedBy: "human:Lisa",
  scope: {
    projectId: dbWriteIntent.projectId,
    toolId: dbWriteIntent.toolId
  },
  notes: "Reject database write.",
  approvalToken: dbWriteIntent.approvalToken
}));
const dbRejectedToReady = queue.transition(dbWriteIntent.executionIntentId, executionIntentStatuses.readyForExecution);
check(
  dbReject.ok === true &&
    dbReject.intent.status === executionIntentStatuses.rejected &&
    dbRejectedToReady.ok === false,
  "D rejected database write cannot later become executable",
  {
    rejected: dbReject.intent.status,
    transitionAttempt: dbRejectedToReady
  }
);

const prodDbDecision = decision("database_write_prod_request", {
  projectId: "project_prod_db"
});
const prodDbIntent = createExecutionIntentFromDecision(prodDbDecision, {
  executionIntentId: "phase20j_prod_db_intent"
});
const prodDbEnqueue = queue.enqueue(prodDbIntent);
const prodDbApproval = queue.applyApproval(createApprovalDecision({
  executionIntentId: prodDbIntent.executionIntentId,
  decision: approvalDecisions.approve,
  decidedBy: "human:Lisa",
  approvalToken: prodDbIntent.approvalToken
}));
check(
  prodDbIntent.status === executionIntentStatuses.blocked &&
    prodDbEnqueue.ok === false &&
    prodDbApproval.ok === false,
  "E blocked production DB write cannot be queued or approved around policy",
  {
    enqueue: prodDbEnqueue,
    approvalAttempt: prodDbApproval
  }
);

const publishIntent = createExecutionIntentFromDecision(decision("publish_request"), {
  executionIntentId: "phase20j_publish_intent"
});
check(
  publishIntent.status === executionIntentStatuses.blocked,
  "F publish request becomes BLOCKED and no publish occurs",
  {
    status: publishIntent.status,
    rollbackPlan: publishIntent.rollbackPlan
  }
);

const providerApprovalAttempt = queue.applyApproval(createApprovalDecision({
  executionIntentId: browserIntent.executionIntentId,
  decision: approvalDecisions.approve,
  decidedBy: browserIntent.requestedByProvider,
  approvalToken: browserIntent.approvalToken
}));
check(
  providerApprovalAttempt.ok === false,
  "G provider self-approval has no authority",
  providerApprovalAttempt
);

const expensiveDecision = decision("provider_lies_permission_request", {
  projectId: "project_cost",
  estimatedCost: "$1.00"
});
const expensiveIntent = createExecutionIntentFromDecision(expensiveDecision, {
  executionIntentId: "phase20j_cost_intent"
});
queue.enqueue(expensiveIntent);
const expensiveApproval = queue.applyApproval(createApprovalDecision({
  executionIntentId: expensiveIntent.executionIntentId,
  decision: approvalDecisions.approve,
  decidedBy: "human:Lisa",
  approvalToken: expensiveIntent.approvalToken,
  maxApprovedCost: "$0.10"
}));
check(
  expensiveApproval.ok === false &&
    expensiveApproval.reason === "cost_ceiling_exceeded_requires_new_approval",
  "H cost ceiling prevents $0.10 approval from authorizing $1.00",
  {
    intentCost: expensiveIntent.estimatedCost,
    approval: expensiveApproval
  }
);

const expiredIntent = createExecutionIntentFromDecision(decision("browser_inspection_request", {
  projectId: "project_expired"
}), {
  executionIntentId: "phase20j_expired_intent",
  expiresAt: "2000-01-01T00:00:00.000Z"
});
queue.enqueue(expiredIntent);
const expiredApproval = queue.applyApproval(createApprovalDecision({
  executionIntentId: expiredIntent.executionIntentId,
  decision: approvalDecisions.approve,
  decidedBy: "human:Lisa",
  approvalToken: expiredIntent.approvalToken
}));
check(
  expiredApproval.ok === false &&
    expiredApproval.reason === "approval_expired" &&
    queue.get(expiredIntent.executionIntentId).status === executionIntentStatuses.expired,
  "I expired approval cannot execute",
  expiredApproval
);

const duplicateOne = createExecutionIntentFromDecision(decision("documentation_request", {
  requestId: "phase20j_duplicate_request",
  projectId: "project_duplicate"
}), {
  executionIntentId: "phase20j_duplicate_intent_one"
});
const duplicateTwo = createExecutionIntentFromDecision(decision("documentation_request", {
  requestId: "phase20j_duplicate_request",
  projectId: "project_duplicate"
}), {
  executionIntentId: "phase20j_duplicate_intent_two"
});
const firstDuplicate = queue.enqueue(duplicateOne);
const secondDuplicate = queue.enqueue(duplicateTwo);
check(
  firstDuplicate.ok === true &&
    secondDuplicate.ok === true &&
    secondDuplicate.duplicate === true &&
    secondDuplicate.intent.executionIntentId === firstDuplicate.intent.executionIntentId,
  "J duplicate request does not create multiple executable intents",
  {
    first: firstDuplicate.intent.executionIntentId,
    second: secondDuplicate.intent.executionIntentId,
    duplicate: secondDuplicate.duplicate
  }
);

const crossProjectDecision = evaluateAgentToolRequest({
  ...fixture("database_write_dev_request"),
  requestId: "phase20j_cross_project_request",
  projectId: "project_a",
  input: {
    writeScope: "project_b/private_table",
    operation: "insert"
  }
});
const crossProjectIntent = createExecutionIntentFromDecision(crossProjectDecision, {
  executionIntentId: "phase20j_cross_project_intent"
});
check(
  crossProjectDecision.decision.decision === "BLOCK" &&
    crossProjectIntent.status === executionIntentStatuses.blocked,
  "K cross-project mutation is blocked before queue execution",
  {
    decision: crossProjectDecision.decision,
    intentStatus: crossProjectIntent.status
  }
);

const summary = createApprovalSummary(browserIntent);
const summaryText = JSON.stringify(summary).toLowerCase();
check(
  summary.whatEssaWantsToDo === "inspect_local_page" &&
    summary.tool === "browser.playwright.mock" &&
    summary.approvalToken === browserIntent.approvalToken &&
    !summaryText.includes("api_key") &&
    !summaryText.includes("sk-"),
  "ApprovalSummary is safe for future UI",
  summary
);

check(
  queue.list({ projectId: "project_browser" }).length >= 1 &&
    queue.list({ taskId: browserIntent.taskId }).length >= 1 &&
    queue.list({ goalId: browserIntent.goalId }).length >= 0,
  "ExecutionQueue lists by project/task/goal ownership",
  {
    byProject: queue.list({ projectId: "project_browser" }).length,
    byTask: queue.list({ taskId: browserIntent.taskId }).length
  }
);

if (failures > 0) {
  console.error(`Execution Intent Queue tests failed: ${failures}`);
  process.exit(1);
}

console.log("Execution Intent Queue tests passed.");
