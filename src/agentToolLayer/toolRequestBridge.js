import {
  toolCostClasses,
  toolEnvironments,
  toolPermissionClasses
} from "./contracts.js";
import { getAgentTool } from "./registry.js";
import { hasSecretLikeValue, redactForTrace } from "./policy.js";

export const agentToolDecisions = {
  allow: "ALLOW",
  requireConfirmation: "REQUIRE_CONFIRMATION",
  block: "BLOCK"
};

export const agentToolCostPolicy = {
  free: "FREE",
  localCompute: "LOCAL_COMPUTE",
  lowCostExternal: "LOW_COST_EXTERNAL",
  paidExternal: "PAID_EXTERNAL",
  unknownCost: "UNKNOWN_COST"
};

export const agentToolSideEffectClasses = {
  none: "NONE",
  localOnly: "LOCAL_ONLY",
  externalRead: "EXTERNAL_READ",
  externalWrite: "EXTERNAL_WRITE",
  publish: "PUBLISH",
  deploy: "DEPLOY",
  securitySensitive: "SECURITY_SENSITIVE"
};

export const agentToolRequestContract = {
  requestId: null,
  taskId: null,
  goalId: null,
  projectId: null,
  workflowId: null,
  requestedByProvider: null,
  requestedByAgent: null,
  toolId: null,
  capability: null,
  action: null,
  input: {},
  intendedOutcome: null,
  permissionLevel: null,
  environment: toolEnvironments.development,
  estimatedCost: agentToolCostPolicy.unknownCost,
  sideEffectClass: agentToolSideEffectClasses.none,
  sourceArtifactRefs: [],
  targetArtifactRefs: [],
  reason: null,
  confidence: null,
  traceId: null
};

export const agentToolDecisionContract = {
  requestId: null,
  toolId: null,
  decision: agentToolDecisions.block,
  reason: null,
  registryStatus: null,
  permissionCheck: null,
  scopeCheck: null,
  costCheck: null,
  environmentCheck: null,
  approvalRequired: true,
  normalizedInput: {},
  blockedFields: [],
  traceId: null
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = "agent_tool_request") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEnvironment(value) {
  const text = String(value || toolEnvironments.development).toLowerCase();
  if (text === "local") return toolEnvironments.local;
  if (text === "development" || text === "dev") return toolEnvironments.development;
  if (text === "staging") return toolEnvironments.staging;
  if (text === "production" || text === "prod") return toolEnvironments.production;
  return toolEnvironments.development;
}

function normalizeOperation(action = "", input = {}) {
  const text = `${action || ""} ${input.operation || ""} ${input.queryType || ""}`.toLowerCase();
  if (text.includes("write") || text.includes("insert") || text.includes("update") || text.includes("delete") || text.includes("deploy") || text.includes("publish") || text.includes("migration")) {
    return "write";
  }
  return "read";
}

function scopeAllowed(scopeList = [], requestedScope = "") {
  if (!requestedScope) return true;
  return safeArray(scopeList).some((scope) =>
    requestedScope === scope || requestedScope.startsWith(`${scope}/`)
  );
}

function mapRegistryCost(costClass) {
  if (costClass === toolCostClasses.none) return agentToolCostPolicy.free;
  if (costClass === toolCostClasses.local) return agentToolCostPolicy.localCompute;
  if (costClass === toolCostClasses.metered) return agentToolCostPolicy.lowCostExternal;
  if (costClass === toolCostClasses.paidExternal) return agentToolCostPolicy.paidExternal;
  return agentToolCostPolicy.unknownCost;
}

function permissionSummary(tool, operation) {
  if (!tool) {
    return {
      ok: false,
      registryPermissionLevel: null,
      providerPermissionIgnored: true,
      reasons: ["tool_not_registered"]
    };
  }

  const permissions = safeArray(tool.permissions);
  const reasons = [];
  let approvalRequired = false;

  if (permissions.includes(toolPermissionClasses.publish) || permissions.includes(toolPermissionClasses.deploy)) {
    reasons.push("publish_deploy_cannot_auto_run");
    approvalRequired = true;
  }

  if (permissions.includes(toolPermissionClasses.securitySensitive)) {
    reasons.push("security_sensitive_blocked_without_sandbox");
    approvalRequired = true;
  }

  if (operation === "write") {
    if (
      permissions.includes(toolPermissionClasses.externalMutation) ||
      permissions.includes(toolPermissionClasses.localMutation)
    ) {
      approvalRequired = true;
    } else {
      reasons.push("write_not_supported_by_registry_permissions");
    }
  }

  return {
    ok: !reasons.includes("write_not_supported_by_registry_permissions"),
    registryPermissionLevel: permissions,
    providerPermissionIgnored: true,
    approvalRequired,
    reasons
  };
}

function scopeSummary(tool, request, operation) {
  if (!tool) return { ok: false, reasons: ["tool_not_registered"], requestedScope: null };
  const requestedReadScope = request.input?.readScope || request.input?.scope || request.input?.packageName || null;
  const requestedWriteScope = request.input?.writeScope || request.input?.targetPath || request.input?.target || null;

  if (operation === "write") {
    const ok = scopeAllowed(tool.writeScope, requestedWriteScope);
    return {
      ok,
      requestedScope: requestedWriteScope,
      registryScope: tool.writeScope,
      reasons: ok ? [] : ["write_scope_violation"]
    };
  }

  const ok = scopeAllowed(tool.readScope, requestedReadScope);
  return {
    ok,
    requestedScope: requestedReadScope,
    registryScope: tool.readScope,
    reasons: ok ? [] : ["read_scope_violation"]
  };
}

function costSummary(tool, request, operation) {
  if (!tool) return { ok: false, approvalRequired: true, costClass: agentToolCostPolicy.unknownCost, reasons: ["tool_not_registered"] };
  const registryCost = mapRegistryCost(tool.costClass);
  const requestedCost = request.estimatedCost || agentToolCostPolicy.unknownCost;
  const external = tool.externalSideEffects === true || operation === "write";
  const reasons = [];
  let approvalRequired = false;

  if (registryCost === agentToolCostPolicy.paidExternal) {
    approvalRequired = true;
  }

  if (registryCost === agentToolCostPolicy.lowCostExternal) {
    approvalRequired = operation === "write";
  }

  if (requestedCost === agentToolCostPolicy.unknownCost && external) {
    approvalRequired = true;
    reasons.push("unknown_external_cost_requires_confirmation");
  }

  if (registryCost === agentToolCostPolicy.paidExternal) {
    reasons.push("paid_external_cost_requires_confirmation");
  }

  return {
    ok: true,
    registryCost,
    requestedCost,
    approvalRequired,
    reasons
  };
}

function environmentSummary(tool, request, operation) {
  if (!tool) return { ok: false, reasons: ["tool_not_registered"] };
  const environment = normalizeEnvironment(request.environment);
  const reasons = [];

  if (environment === toolEnvironments.production && tool.productionAccess === "deny_by_default") {
    reasons.push("production_access_denied");
  }

  if (tool.category === "database" && operation === "write" && environment === toolEnvironments.production) {
    reasons.push("production_database_write_denied");
  }

  return {
    ok: reasons.length === 0,
    environment,
    registryDefaultEnvironment: tool.environment,
    reasons
  };
}

function blockedFieldsFromSecret(value) {
  return hasSecretLikeValue(value)
    ? ["input", "reason", "metadata"]
    : [];
}

export function createAgentToolRequest(input = {}) {
  const normalized = {
    ...agentToolRequestContract,
    ...input,
    requestId: input.requestId || createId(),
    environment: normalizeEnvironment(input.environment),
    input: redactForTrace(input.input || {}),
    sourceArtifactRefs: [...(input.sourceArtifactRefs || [])],
    targetArtifactRefs: [...(input.targetArtifactRefs || [])],
    traceId: input.traceId || createId("agent_tool_trace")
  };

  return redactForTrace(normalized);
}

export function createApprovalRequest(decision, tool, request) {
  if (decision.decision !== agentToolDecisions.requireConfirmation) return null;

  return redactForTrace({
    action: request.action,
    tool: {
      toolId: tool.toolId,
      providerId: tool.providerId,
      category: tool.category,
      executable: tool.executable
    },
    reason: decision.reason,
    whatWillChange: request.intendedOutcome || "No execution in Phase 20I; future execution would be separately approved.",
    externalSystem: tool.externalSideEffects ? tool.providerId : null,
    estimatedCost: decision.costCheck,
    reversible: tool.rollback?.supported === true,
    risks: [
      ...safeArray(decision.permissionCheck?.reasons),
      ...safeArray(decision.scopeCheck?.reasons),
      ...safeArray(decision.costCheck?.reasons),
      ...safeArray(decision.environmentCheck?.reasons)
    ],
    requestedBy: {
      provider: request.requestedByProvider,
      agent: request.requestedByAgent
    },
    approveToken: `APPROVE_${request.requestId}`
  });
}

export function evaluateAgentToolRequest(input = {}, { registry = null, phase = "20I" } = {}) {
  const request = createAgentToolRequest(input);
  const tool = getAgentTool(request.toolId, registry || undefined);
  const operation = normalizeOperation(request.action, request.input);
  const blockedFields = blockedFieldsFromSecret(input);

  if (!tool) {
    const decision = {
      ...agentToolDecisionContract,
      requestId: request.requestId,
      toolId: request.toolId,
      decision: agentToolDecisions.block,
      reason: "unknown_tool",
      registryStatus: "NOT_REGISTERED",
      permissionCheck: { ok: false, reasons: ["tool_not_registered"] },
      scopeCheck: { ok: false, reasons: ["tool_not_registered"] },
      costCheck: { ok: false, reasons: ["tool_not_registered"] },
      environmentCheck: { ok: false, reasons: ["tool_not_registered"] },
      approvalRequired: false,
      normalizedInput: request.input,
      blockedFields,
      traceId: request.traceId
    };

    return {
      request,
      decision: redactForTrace(decision),
      approvalRequest: null,
      trace: createDecisionTrace(request, null, decision, phase),
      executed: false
    };
  }

  const permissionCheck = permissionSummary(tool, operation);
  const scopeCheck = scopeSummary(tool, request, operation);
  const costCheck = costSummary(tool, request, operation);
  const environmentCheck = environmentSummary(tool, request, operation);
  const secretBlocked = blockedFields.length > 0;
  const hardBlockReasons = [
    ...safeArray(permissionCheck.reasons).filter((reason) =>
      ["publish_deploy_cannot_auto_run", "security_sensitive_blocked_without_sandbox", "write_not_supported_by_registry_permissions"].includes(reason)
    ),
    ...safeArray(scopeCheck.reasons),
    ...safeArray(environmentCheck.reasons),
    ...(secretBlocked ? ["secret_like_value_detected"] : [])
  ];
  const confirmationReasons = [
    ...(permissionCheck.approvalRequired ? ["registry_permission_requires_confirmation"] : []),
    ...(costCheck.approvalRequired ? ["cost_requires_confirmation"] : []),
    ...(tool.approvalRequired && operation === "write" ? ["registry_write_approval_required"] : []),
    ...(tool.approvalRequired && operation === "read" && tool.category !== "database" ? ["registry_read_confirmation_required"] : [])
  ];

  let decisionValue = agentToolDecisions.allow;
  if (hardBlockReasons.length) {
    decisionValue = agentToolDecisions.block;
  } else if (confirmationReasons.length) {
    decisionValue = agentToolDecisions.requireConfirmation;
  }

  const reason = hardBlockReasons[0] ||
    confirmationReasons[0] ||
    (tool.executable ? "approved_for_execution_layer" : "ready_for_future_execution_non_executable");
  const decision = {
    ...agentToolDecisionContract,
    requestId: request.requestId,
    toolId: request.toolId,
    decision: decisionValue,
    reason,
    registryStatus: tool.executable ? "EXECUTABLE_REGISTERED" : "REGISTERED_NON_EXECUTABLE",
    permissionCheck,
    scopeCheck,
    costCheck,
    environmentCheck,
    approvalRequired: decisionValue === agentToolDecisions.requireConfirmation,
    normalizedInput: request.input,
    blockedFields,
    traceId: request.traceId
  };

  return {
    request,
    decision: redactForTrace(decision),
    approvalRequest: createApprovalRequest(decision, tool, request),
    trace: createDecisionTrace(request, tool, decision, phase),
    executed: false
  };
}

export function createDecisionTrace(request, tool, decision, phase = "20I") {
  return redactForTrace({
    traceId: request.traceId,
    phase,
    timestamp: nowIso(),
    request,
    provider: request.requestedByProvider,
    tool: tool
      ? {
        toolId: tool.toolId,
        providerId: tool.providerId,
        category: tool.category,
        permissions: tool.permissions,
        readScope: tool.readScope,
        writeScope: tool.writeScope,
        externalSideEffects: tool.externalSideEffects,
        costClass: tool.costClass,
        executable: tool.executable,
        approvalRequired: tool.approvalRequired
      }
      : null,
    policyResult: {
      decision: decision.decision,
      reason: decision.reason,
      approvalRequired: decision.approvalRequired
    },
    scopeResult: decision.scopeCheck,
    costResult: decision.costCheck,
    environment: decision.environmentCheck,
    approvalState: decision.approvalRequired ? "REQUIRES_HUMAN_CONFIRMATION" : "NOT_REQUIRED_FOR_DECISION",
    executed: false
  });
}

export function convertProductionAgentToolRequest(toolRequest = {}, context = {}) {
  return createAgentToolRequest({
    requestId: toolRequest.requestId,
    taskId: context.taskId,
    goalId: context.goalId,
    projectId: context.projectId,
    workflowId: context.workflowId,
    requestedByProvider: context.providerId || context.requestedByProvider || null,
    requestedByAgent: context.requestedByAgent || "production_agent",
    toolId: toolRequest.toolId,
    capability: toolRequest.capability || toolRequest.input?.capability || null,
    action: toolRequest.action || toolRequest.input?.operation || toolRequest.toolId,
    input: toolRequest.input || {},
    intendedOutcome: toolRequest.intendedOutcome || toolRequest.input?.intendedOutcome || null,
    permissionLevel: toolRequest.permissionLevel || toolRequest.permission || null,
    environment: toolRequest.environment || toolRequest.input?.environment || context.environment || toolEnvironments.development,
    estimatedCost: toolRequest.estimatedCost || toolRequest.input?.estimatedCost || agentToolCostPolicy.unknownCost,
    sideEffectClass: toolRequest.sideEffectClass || agentToolSideEffectClasses.none,
    sourceArtifactRefs: toolRequest.sourceArtifactRefs || [],
    targetArtifactRefs: toolRequest.targetArtifactRefs || [],
    reason: toolRequest.reason || null,
    confidence: toolRequest.confidence ?? null,
    traceId: toolRequest.traceId || context.traceId || null
  });
}

export function evaluateProductionAgentToolRequests(productionAgentResult = {}, context = {}) {
  const toolRequests = safeArray(productionAgentResult.toolRequests);

  return {
    providerId: productionAgentResult.providerId || context.providerId || null,
    requestCount: toolRequests.length,
    decisions: toolRequests.map((toolRequest) =>
      evaluateAgentToolRequest(convertProductionAgentToolRequest(toolRequest, {
        ...context,
        providerId: productionAgentResult.providerId || context.providerId || null
      }))
    ),
    executed: false
  };
}
