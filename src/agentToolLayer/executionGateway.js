import {
  toolEnvironments,
  toolPermissionClasses
} from "./contracts.js";
import { getAgentTool } from "./registry.js";
import { hasSecretLikeValue, redactForTrace } from "./policy.js";
import { executionIntentStatuses } from "./executionQueue.js";

export const agentToolPolicyVersion = "agent-tool-policy-v1";
export const agentToolRegistryVersion = "agent-tool-registry-v1";

export const executionGateDecisions = {
  ready: "READY",
  blocked: "BLOCKED",
  requiresReapproval: "REQUIRES_REAPPROVAL"
};

export const executionGateResultContract = {
  executionIntentId: null,
  toolId: null,
  decision: executionGateDecisions.blocked,
  reason: null,
  policyVersion: agentToolPolicyVersion,
  registryVersion: agentToolRegistryVersion,
  approvalValid: false,
  scopeValid: false,
  environmentValid: false,
  costValid: false,
  idempotencyValid: false,
  resolvedExecutionProvider: null,
  safeInput: {},
  traceId: null,
  executed: false
};

export const executionProviderContract = {
  providerId: null,
  toolIds: [],
  capabilities: [],
  status: "non_executable",
  health: "not_configured",
  executable: false,
  execute: null
};

export const executionProviderRegistry = [
  {
    ...executionProviderContract,
    providerId: "future_context7_execution_provider",
    toolIds: ["documentation.context7.mock"],
    capabilities: ["versioned_library_docs", "api_reference_lookup"],
    health: "stub_only"
  },
  {
    ...executionProviderContract,
    providerId: "future_playwright_execution_provider",
    toolIds: ["browser.playwright.mock"],
    capabilities: ["open", "inspect", "interact", "screenshot", "verification"],
    health: "stub_only"
  },
  {
    ...executionProviderContract,
    providerId: "future_supabase_execution_provider",
    toolIds: ["database.supabase.mock"],
    capabilities: ["query", "schema_inspect", "write_with_approval"],
    health: "stub_only"
  },
  {
    ...executionProviderContract,
    providerId: "future_security_execution_provider",
    toolIds: ["security.testing.mock"],
    capabilities: ["static_policy_review"],
    health: "stub_only"
  },
  {
    ...executionProviderContract,
    providerId: "future_deployment_execution_provider",
    toolIds: ["deployment.provider.mock"],
    capabilities: ["deploy", "publish"],
    health: "stub_only"
  },
  {
    ...executionProviderContract,
    providerId: "essa_property_local_execution_proof",
    toolIds: ["property.local.execution"],
    capabilities: ["property_canonical_resolution_association"],
    status: "local_gateway_checked_proof",
    health: "local_only",
    executable: false
  },
  {
    ...executionProviderContract,
    providerId: "essa_business_acquisition_dry_run",
    toolIds: ["business_acquisition.delivery.dry_run"],
    capabilities: ["EMAIL_DELIVERY", "WHATSAPP_DELIVERY", "TELEGRAM_DELIVERY", "BUSINESS_DM_DELIVERY"],
    status: "dry_run_only",
    health: "local_only",
    executable: false
  }
];

function nowIso() {
  return new Date().toISOString();
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

function result(input = {}) {
  return redactForTrace({
    ...executionGateResultContract,
    ...input,
    policyVersion: input.policyVersion || agentToolPolicyVersion,
    registryVersion: input.registryVersion || agentToolRegistryVersion,
    executed: false,
    trace: {
      event: "execution_gateway_preflight",
      decision: input.decision || executionGateDecisions.blocked,
      reason: input.reason || null,
      traceId: input.traceId || null,
      at: nowIso()
    }
  });
}

function scopeAllowed(scopeList = [], requestedScope = "") {
  if (!requestedScope) return true;
  return safeArray(scopeList).some((scope) =>
    requestedScope === scope || requestedScope.startsWith(`${scope}/`)
  );
}

function operationFromIntent(intent = {}) {
  const text = `${intent.action || ""} ${intent.normalizedInput?.operation || ""} ${intent.normalizedInput?.queryType || ""}`.toLowerCase();
  return text.includes("write") ||
    text.includes("insert") ||
    text.includes("update") ||
    text.includes("delete") ||
    text.includes("deploy") ||
    text.includes("publish")
    ? "write"
    : "read";
}

function extractApprovalDecision(intent = {}) {
  const transition = safeArray(intent.audit)
    .find((entry) => entry.event === "state_transition" && entry.metadata?.approvalDecision);

  return transition?.metadata?.approvalDecision || null;
}

function validateApproval(intent = {}, runtimeContext = {}) {
  if (!intent.approvalRequired) {
    return { ok: true, approvalDecision: null };
  }

  const approvalDecision = runtimeContext.approvalDecision || extractApprovalDecision(intent);
  if (!approvalDecision) {
    return { ok: false, reason: "missing_approval_decision" };
  }

  if (approvalDecision.approvalToken !== intent.approvalToken) {
    return { ok: false, reason: "approval_token_mismatch" };
  }

  if (approvalDecision.executionIntentId !== intent.executionIntentId) {
    return { ok: false, reason: "approval_intent_mismatch" };
  }

  const scope = approvalDecision.scope || {};
  if (scope.toolId && scope.toolId !== intent.toolId) return { ok: false, reason: "approval_tool_mismatch" };
  if (scope.action && scope.action !== intent.action) return { ok: false, reason: "approval_action_mismatch" };
  if (scope.projectId && scope.projectId !== intent.projectId) return { ok: false, reason: "approval_project_mismatch" };

  return { ok: true, approvalDecision };
}

function validateScope(intent = {}, tool = null) {
  if (!tool) return { ok: false, reason: "tool_not_found" };
  const operation = operationFromIntent(intent);
  const requestedReadScope = intent.normalizedInput?.readScope ||
    intent.normalizedInput?.scope ||
    intent.normalizedInput?.packageName ||
    null;
  const requestedWriteScope = intent.normalizedInput?.writeScope ||
    intent.normalizedInput?.targetPath ||
    intent.normalizedInput?.target ||
    null;

  if (operation === "write") {
    return scopeAllowed(tool.writeScope, requestedWriteScope)
      ? { ok: true, operation, requestedScope: requestedWriteScope }
      : { ok: false, reason: "write_scope_violation", operation, requestedScope: requestedWriteScope };
  }

  return scopeAllowed(tool.readScope, requestedReadScope)
    ? { ok: true, operation, requestedScope: requestedReadScope }
    : { ok: false, reason: "read_scope_violation", operation, requestedScope: requestedReadScope };
}

function validateEnvironment(intent = {}, tool = null) {
  if (!tool) return { ok: false, reason: "tool_not_found" };
  const environment = String(intent.environment || toolEnvironments.development).toLowerCase();
  const operation = operationFromIntent(intent);

  if (environment === toolEnvironments.production && tool.productionAccess === "deny_by_default") {
    return { ok: false, reason: "production_access_denied", environment };
  }

  if (environment === toolEnvironments.production && operation === "write") {
    return { ok: false, reason: "production_write_denied", environment };
  }

  if (
    tool.permissions?.includes(toolPermissionClasses.publish) ||
    tool.permissions?.includes(toolPermissionClasses.deploy) ||
    tool.permissions?.includes(toolPermissionClasses.securitySensitive)
  ) {
    return { ok: false, reason: "sensitive_tool_blocked_in_phase_20k", environment };
  }

  return { ok: true, environment };
}

function validateCost(intent = {}, runtimeContext = {}) {
  const currentEstimate = parseCost(runtimeContext.currentEstimatedCost ?? intent.estimatedCost);
  const approved = parseCost(runtimeContext.maxApprovedCost ?? intent.maxApprovedCost);

  if (currentEstimate != null && approved != null && currentEstimate > approved) {
    return {
      ok: false,
      reason: "cost_ceiling_exceeded_requires_reapproval",
      currentEstimate,
      approved
    };
  }

  return {
    ok: true,
    currentEstimate,
    approved
  };
}

function resolveExecutionProvider(toolId, providers = executionProviderRegistry) {
  const provider = providers.find((item) => safeArray(item.toolIds).includes(toolId));
  if (!provider) return null;

  return {
    providerId: provider.providerId,
    toolIds: [...provider.toolIds],
    capabilities: [...provider.capabilities],
    status: provider.status,
    health: provider.health,
    executable: provider.executable === true
  };
}

function idempotencyValid(intent = {}, runtimeContext = {}) {
  const history = safeArray(runtimeContext.executionHistory);
  const duplicate = history.find((entry) =>
    entry.idempotencyKey === intent.idempotencyKey &&
      entry.verified === true &&
      entry.status === "SUCCESS"
  );

  return duplicate
    ? { ok: false, reason: "duplicate_verified_execution", duplicate }
    : { ok: true };
}

export function prepareExecution(intent = null, runtimeContext = {}) {
  const queueIntent = runtimeContext.queue?.get?.(intent?.executionIntentId);
  const effectiveIntent = queueIntent || intent;
  const currentPolicyVersion = runtimeContext.policyVersion || agentToolPolicyVersion;
  const currentRegistryVersion = runtimeContext.registryVersion || agentToolRegistryVersion;

  if (!effectiveIntent) {
    return result({ decision: executionGateDecisions.blocked, reason: "execution_intent_not_found" });
  }

  if (runtimeContext.queue && !queueIntent) {
    return result({
      executionIntentId: intent.executionIntentId,
      toolId: intent.toolId,
      traceId: intent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "execution_intent_not_found"
    });
  }

  if (effectiveIntent.status !== executionIntentStatuses.readyForExecution) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "intent_not_ready_for_execution"
    });
  }

  if (new Date(effectiveIntent.expiresAt).getTime() <= Date.now()) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "execution_intent_expired"
    });
  }

  if (
    effectiveIntent.policyVersion &&
    effectiveIntent.policyVersion !== currentPolicyVersion
  ) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.requiresReapproval,
      reason: "policy_version_changed",
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  if (
    effectiveIntent.registryVersion &&
    effectiveIntent.registryVersion !== currentRegistryVersion
  ) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.requiresReapproval,
      reason: "registry_version_changed",
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  const tool = getAgentTool(effectiveIntent.toolId, runtimeContext.registry || undefined);
  if (!tool) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "tool_not_found",
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  if (effectiveIntent.capability && !safeArray(tool.capabilities).includes(effectiveIntent.capability)) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.requiresReapproval,
      reason: "tool_capability_changed",
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  const approval = validateApproval(effectiveIntent, runtimeContext);
  if (!approval.ok) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: approval.reason,
      approvalValid: false,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  const scope = validateScope(effectiveIntent, tool);
  if (!scope.ok) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: scope.reason,
      approvalValid: true,
      scopeValid: false,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  const environment = validateEnvironment(effectiveIntent, tool);
  if (!environment.ok) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: environment.reason,
      approvalValid: true,
      scopeValid: true,
      environmentValid: false,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  if (
    runtimeContext.expectedProjectId &&
    effectiveIntent.projectId &&
    runtimeContext.expectedProjectId !== effectiveIntent.projectId
  ) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "project_ownership_mismatch",
      approvalValid: true,
      scopeValid: true,
      environmentValid: true,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  if (
    runtimeContext.expectedTaskId &&
    effectiveIntent.taskId &&
    runtimeContext.expectedTaskId !== effectiveIntent.taskId
  ) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "task_ownership_mismatch",
      approvalValid: true,
      scopeValid: true,
      environmentValid: true,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  const cost = validateCost(effectiveIntent, runtimeContext);
  if (!cost.ok) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.requiresReapproval,
      reason: cost.reason,
      approvalValid: true,
      scopeValid: true,
      environmentValid: true,
      costValid: false,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  const idempotency = idempotencyValid(effectiveIntent, runtimeContext);
  if (!idempotency.ok) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: idempotency.reason,
      approvalValid: true,
      scopeValid: true,
      environmentValid: true,
      costValid: true,
      idempotencyValid: false,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion
    });
  }

  if (hasSecretLikeValue(effectiveIntent.normalizedInput)) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "secret_like_input_blocked",
      approvalValid: true,
      scopeValid: true,
      environmentValid: true,
      costValid: true,
      idempotencyValid: true,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion,
      safeInput: redactForTrace(effectiveIntent.normalizedInput || {})
    });
  }

  if (
    runtimeContext.executionProviderOverride &&
    runtimeContext.executionProviderOverride !== tool.providerId
  ) {
    return result({
      executionIntentId: effectiveIntent.executionIntentId,
      toolId: effectiveIntent.toolId,
      traceId: effectiveIntent.traceId,
      decision: executionGateDecisions.blocked,
      reason: "model_or_runtime_provider_override_rejected",
      approvalValid: true,
      scopeValid: true,
      environmentValid: true,
      costValid: true,
      idempotencyValid: true,
      policyVersion: currentPolicyVersion,
      registryVersion: currentRegistryVersion,
      safeInput: redactForTrace(effectiveIntent.normalizedInput || {})
    });
  }

  const resolvedExecutionProvider = resolveExecutionProvider(effectiveIntent.toolId, runtimeContext.executionProviders);

  return result({
    executionIntentId: effectiveIntent.executionIntentId,
    toolId: effectiveIntent.toolId,
    traceId: effectiveIntent.traceId,
    decision: executionGateDecisions.ready,
    reason: "not_executed_phase_stub",
    policyVersion: currentPolicyVersion,
    registryVersion: currentRegistryVersion,
    approvalValid: true,
    scopeValid: true,
    environmentValid: true,
    costValid: true,
    idempotencyValid: true,
    resolvedExecutionProvider,
    safeInput: redactForTrace(effectiveIntent.normalizedInput || {})
  });
}
