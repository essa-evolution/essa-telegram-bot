import { agentToolDecisions } from "./toolRequestBridge.js";
import { getAgentTool } from "./registry.js";
import { redactForTrace } from "./policy.js";

export const executionIntentStatuses = {
  queued: "QUEUED",
  waitingForApproval: "WAITING_FOR_APPROVAL",
  approved: "APPROVED",
  blocked: "BLOCKED",
  cancelled: "CANCELLED",
  rejected: "REJECTED",
  expired: "EXPIRED",
  readyForExecution: "READY_FOR_EXECUTION",
  executedFuture: "EXECUTED_FUTURE"
};

export const approvalDecisions = {
  approve: "APPROVE",
  reject: "REJECT"
};

export const executionIntentContract = {
  executionIntentId: null,
  requestId: null,
  taskId: null,
  goalId: null,
  projectId: null,
  workflowId: null,
  toolId: null,
  capability: null,
  action: null,
  normalizedInput: {},
  decision: null,
  status: executionIntentStatuses.queued,
  environment: null,
  permissionLevel: null,
  costClass: null,
  estimatedCost: null,
  maxApprovedCost: null,
  costApprovalRequired: false,
  approvalRequired: false,
  approvalStatus: "NOT_REQUIRED",
  reversible: false,
  rollbackPlan: null,
  sourceArtifactRefs: [],
  targetArtifactRefs: [],
  requestedByProvider: null,
  requestedByAgent: null,
  createdAt: null,
  expiresAt: null,
  traceId: null,
  idempotencyKey: null,
  sourceRequestId: null,
  approvalToken: null,
  audit: []
};

export const approvalDecisionContract = {
  approvalId: null,
  executionIntentId: null,
  decision: null,
  decidedBy: null,
  decidedAt: null,
  scope: null,
  notes: null,
  approvalToken: null,
  maxApprovedCost: null
};

const allowedTransitions = {
  [executionIntentStatuses.queued]: new Set([
    executionIntentStatuses.readyForExecution,
    executionIntentStatuses.cancelled,
    executionIntentStatuses.expired
  ]),
  [executionIntentStatuses.waitingForApproval]: new Set([
    executionIntentStatuses.approved,
    executionIntentStatuses.rejected,
    executionIntentStatuses.cancelled,
    executionIntentStatuses.expired
  ]),
  [executionIntentStatuses.approved]: new Set([
    executionIntentStatuses.readyForExecution,
    executionIntentStatuses.expired
  ]),
  [executionIntentStatuses.readyForExecution]: new Set([
    executionIntentStatuses.cancelled,
    executionIntentStatuses.expired
  ]),
  [executionIntentStatuses.blocked]: new Set([]),
  [executionIntentStatuses.cancelled]: new Set([]),
  [executionIntentStatuses.rejected]: new Set([]),
  [executionIntentStatuses.expired]: new Set([])
};

function nowIso() {
  return new Date().toISOString();
}

function addMinutesIso(minutes = 30) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseCost(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.amount === "number") return value.amount;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function createApprovalToken(intent) {
  return `approval_${intent.executionIntentId}_${intent.toolId}_${intent.action}`;
}

function createIdempotencyKey(request, decision) {
  return [
    request.requestId,
    request.projectId || "no_project",
    request.toolId,
    request.action,
    JSON.stringify(decision.normalizedInput || {})
  ].join("::");
}

function statusForDecision(decision) {
  if (decision.decision === agentToolDecisions.allow) return executionIntentStatuses.readyForExecution;
  if (decision.decision === agentToolDecisions.requireConfirmation) return executionIntentStatuses.waitingForApproval;
  return executionIntentStatuses.blocked;
}

function approvalStatusFor(status) {
  if (status === executionIntentStatuses.waitingForApproval) return "PENDING";
  if (status === executionIntentStatuses.approved || status === executionIntentStatuses.readyForExecution) return "APPROVED_OR_NOT_REQUIRED";
  if (status === executionIntentStatuses.rejected) return "REJECTED";
  if (status === executionIntentStatuses.blocked) return "BLOCKED";
  return "NOT_REQUIRED";
}

function rollbackPlanFor(tool, request) {
  if (!tool) return null;
  if (tool.rollback?.supported !== true) {
    return {
      supported: false,
      strategy: tool.rollback?.strategy || "not_fully_reversible",
      limitation: "Rollback not guaranteed; future execution must surface this before approval."
    };
  }

  if (tool.category === "database") {
    return {
      supported: true,
      strategy: tool.rollback.strategy,
      futureReferenceRequired: "transaction_id_or_migration_reference"
    };
  }

  if (tool.category === "deployment") {
    return {
      supported: true,
      strategy: tool.rollback.strategy,
      futureReferenceRequired: "previous_deployment_version"
    };
  }

  return {
    supported: true,
    strategy: tool.rollback.strategy,
    futureReferenceRequired: request.targetArtifactRefs?.length ? "artifact_version_reference" : "pre_change_snapshot"
  };
}

export function createExecutionIntentFromDecision(result = {}, options = {}) {
  const request = result.request || {};
  const decision = result.decision || {};
  const tool = getAgentTool(request.toolId);
  const status = statusForDecision(decision);
  const createdAt = options.createdAt || nowIso();
  const intent = {
    ...executionIntentContract,
    executionIntentId: options.executionIntentId || createId("execution_intent"),
    requestId: request.requestId || decision.requestId || null,
    taskId: request.taskId || null,
    goalId: request.goalId || null,
    projectId: request.projectId || null,
    workflowId: request.workflowId || null,
    toolId: request.toolId || decision.toolId || null,
    capability: request.capability || null,
    action: request.action || null,
    normalizedInput: decision.normalizedInput || request.input || {},
    decision: decision.decision || null,
    status,
    environment: decision.environmentCheck?.environment || request.environment || null,
    permissionLevel: decision.permissionCheck?.registryPermissionLevel || request.permissionLevel || null,
    costClass: decision.costCheck?.registryCost || null,
    estimatedCost: request.estimatedCost || decision.costCheck?.requestedCost || null,
    maxApprovedCost: options.maxApprovedCost ?? null,
    costApprovalRequired: Boolean(decision.costCheck?.approvalRequired),
    approvalRequired: status === executionIntentStatuses.waitingForApproval,
    approvalStatus: approvalStatusFor(status),
    reversible: tool?.rollback?.supported === true,
    rollbackPlan: rollbackPlanFor(tool, request),
    sourceArtifactRefs: [...safeArray(request.sourceArtifactRefs)],
    targetArtifactRefs: [...safeArray(request.targetArtifactRefs)],
    requestedByProvider: request.requestedByProvider || null,
    requestedByAgent: request.requestedByAgent || null,
    createdAt,
    expiresAt: options.expiresAt || addMinutesIso(options.ttlMinutes ?? 30),
    traceId: request.traceId || decision.traceId || null,
    idempotencyKey: options.idempotencyKey || createIdempotencyKey(request, decision),
    sourceRequestId: request.requestId || null,
    approvalToken: null,
    audit: [
      {
        event: "execution_intent_created",
        decision: decision.decision,
        status,
        traceId: request.traceId || decision.traceId || null,
        at: createdAt
      }
    ]
  };

  intent.approvalToken = status === executionIntentStatuses.waitingForApproval
    ? createApprovalToken(intent)
    : null;

  return redactForTrace(intent);
}

export function createApprovalDecision(input = {}) {
  return redactForTrace({
    ...approvalDecisionContract,
    ...input,
    approvalId: input.approvalId || createId("approval"),
    decidedAt: input.decidedAt || nowIso()
  });
}

export function createApprovalSummary(intent = {}) {
  return redactForTrace({
    executionIntentId: intent.executionIntentId,
    whatEssaWantsToDo: intent.action,
    why: intent.audit?.[0]?.decision || intent.decision,
    tool: intent.toolId,
    project: intent.projectId,
    whatWillChange: intent.normalizedInput,
    externalSystem: intent.costClass === "PAID_EXTERNAL" || intent.costClass === "LOW_COST_EXTERNAL"
      ? intent.toolId
      : null,
    estimatedCost: intent.estimatedCost,
    maxApprovedCost: intent.maxApprovedCost,
    reversible: intent.reversible,
    risks: intent.rollbackPlan?.supported === false ? [intent.rollbackPlan.limitation] : [],
    expiry: intent.expiresAt,
    requestedBy: {
      provider: intent.requestedByProvider,
      agent: intent.requestedByAgent
    },
    approvalToken: intent.approvalToken
  });
}

export function createExecutionQueue(initialItems = []) {
  const items = new Map();
  const idempotency = new Map();

  function clone(item) {
    return redactForTrace(JSON.parse(JSON.stringify(item)));
  }

  function store(intent) {
    items.set(intent.executionIntentId, intent);
    idempotency.set(intent.idempotencyKey, intent.executionIntentId);
    return clone(intent);
  }

  for (const item of initialItems) {
    store(item);
  }

  return {
    enqueue(intent) {
      if (intent.status === executionIntentStatuses.blocked) {
        return {
          ok: false,
          duplicate: false,
          reason: "blocked_intent_not_enqueued",
          intent: clone(intent)
        };
      }

      if (idempotency.has(intent.idempotencyKey)) {
        const existing = items.get(idempotency.get(intent.idempotencyKey));
        return {
          ok: true,
          duplicate: true,
          intent: clone(existing)
        };
      }

      return {
        ok: true,
        duplicate: false,
        intent: store(intent)
      };
    },

    get(id) {
      const item = items.get(id);
      return item ? clone(item) : null;
    },

    list(filters = {}) {
      return [...items.values()]
        .filter((item) => {
          if (filters.taskId && item.taskId !== filters.taskId) return false;
          if (filters.projectId && item.projectId !== filters.projectId) return false;
          if (filters.goalId && item.goalId !== filters.goalId) return false;
          if (filters.status && item.status !== filters.status) return false;
          return true;
        })
        .map(clone);
    },

    listWaitingApprovals() {
      return this.list({ status: executionIntentStatuses.waitingForApproval });
    },

    transition(id, nextStatus, metadata = {}) {
      const item = items.get(id);
      if (!item) {
        return { ok: false, reason: "intent_not_found" };
      }

      if (!allowedTransitions[item.status]?.has(nextStatus)) {
        return {
          ok: false,
          reason: "transition_not_allowed",
          currentStatus: item.status,
          nextStatus
        };
      }

      const next = {
        ...item,
        status: nextStatus,
        approvalStatus: approvalStatusFor(nextStatus),
        audit: [
          ...safeArray(item.audit),
          redactForTrace({
            event: "state_transition",
            from: item.status,
            to: nextStatus,
            metadata,
            at: nowIso()
          })
        ]
      };
      items.set(id, next);
      return { ok: true, intent: clone(next) };
    },

    cancel(id, reason = "cancelled") {
      const item = items.get(id);
      if (!item) return { ok: false, reason: "intent_not_found" };
      return this.transition(id, executionIntentStatuses.cancelled, { reason });
    },

    expire(id, at = nowIso()) {
      const item = items.get(id);
      if (!item) return { ok: false, reason: "intent_not_found" };
      return this.transition(id, executionIntentStatuses.expired, { at });
    },

    applyApproval(approvalDecision) {
      const item = items.get(approvalDecision.executionIntentId);
      if (!item) return { ok: false, reason: "intent_not_found" };

      if (item.status !== executionIntentStatuses.waitingForApproval) {
        return { ok: false, reason: "intent_not_waiting_for_approval", status: item.status };
      }

      if (approvalDecision.decidedBy === "provider" || approvalDecision.decidedBy === item.requestedByProvider) {
        return { ok: false, reason: "provider_cannot_approve_execution" };
      }

      if (approvalDecision.approvalToken !== item.approvalToken) {
        return { ok: false, reason: "invalid_approval_token" };
      }

      if (new Date(item.expiresAt).getTime() <= Date.now()) {
        const expired = this.transition(item.executionIntentId, executionIntentStatuses.expired, { reason: "approval_expired" });
        return { ok: false, reason: "approval_expired", intent: expired.intent };
      }

      const requestedCost = parseCost(item.estimatedCost);
      const approvedCost = parseCost(approvalDecision.maxApprovedCost);
      if (
        requestedCost != null &&
        approvedCost != null &&
        requestedCost > approvedCost
      ) {
        return { ok: false, reason: "cost_ceiling_exceeded_requires_new_approval" };
      }

      if (approvalDecision.decision === approvalDecisions.reject) {
        return this.transition(item.executionIntentId, executionIntentStatuses.rejected, {
          approvalDecision
        });
      }

      if (approvalDecision.decision !== approvalDecisions.approve) {
        return { ok: false, reason: "invalid_approval_decision" };
      }

      const approved = this.transition(item.executionIntentId, executionIntentStatuses.approved, {
        approvalDecision
      });
      if (!approved.ok) return approved;

      return this.transition(item.executionIntentId, executionIntentStatuses.readyForExecution, {
        approvalDecisionId: approvalDecision.approvalId
      });
    }
  };
}
