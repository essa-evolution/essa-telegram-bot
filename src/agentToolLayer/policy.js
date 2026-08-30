import {
  requiresExplicitApproval,
  toolEnvironments,
  toolPermissionClasses
} from "./contracts.js";
import { getAgentTool } from "./registry.js";

function nowIso() {
  return new Date().toISOString();
}

function error(code, message, details = {}) {
  return { code, message, details };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function hasSecretLikeValue(value) {
  return /anthropic_api_key|openai_api_key|elevenlabs_api_key|supabase_service_role|api[_-]?key|bearer\s+[a-z0-9._-]+|sk[-_][a-z0-9_-]{8,}/i.test(
    JSON.stringify(value || {})
  );
}

export function redactForTrace(value) {
  const text = JSON.stringify(value || {});
  return JSON.parse(
    text
      .replace(/sk[-_][a-z0-9_-]{8,}/gi, "[REDACTED_SECRET]")
      .replace(/bearer\s+[a-z0-9._-]+/gi, "Bearer [REDACTED_SECRET]")
      .replace(/("(?:[^"]*api[_-]?key|supabase_service_role|token|secret)"\s*:\s*)"[^"]*"/gi, "$1\"[REDACTED]\"")
  );
}

export function createAgentOperationTrace({
  initiatedBy = "user",
  intent = null,
  modelProvider = null,
  modelId = null,
  toolId = null,
  permissions = [],
  cost = null,
  result = null,
  verification = null,
  changes = [],
  approval = null,
  rollbackReference = null
} = {}) {
  return redactForTrace({
    traceId: `agent_tool_trace_${Date.now()}`,
    initiatedBy,
    intent,
    modelProvider,
    modelId,
    toolId,
    permissions,
    cost,
    result,
    verification,
    changes,
    approval,
    rollbackReference,
    createdAt: nowIso()
  });
}

function scopeAllowed(scopeList = [], requestedScope = "") {
  if (!requestedScope) return true;
  return safeArray(scopeList).some((scope) =>
    requestedScope === scope || requestedScope.startsWith(`${scope}/`)
  );
}

export function authorizeAgentToolRequest({
  toolId,
  requestedByModel = false,
  allowedTools = [],
  operation = "read",
  readScope = null,
  writeScope = null,
  environment = toolEnvironments.development,
  approval = null,
  registry = null
} = {}) {
  const errors = [];
  const tool = getAgentTool(toolId, registry || undefined);

  if (!tool) {
    errors.push(error("tool_not_registered", "Tool is not registered", { toolId }));
    return { ok: false, tool: null, errors };
  }

  if (!safeArray(allowedTools).includes(toolId)) {
    errors.push(error("tool_not_allowed", "Model or planner cannot expand allowedTools", { toolId }));
  }

  if (requestedByModel && safeArray(allowedTools).length === 0) {
    errors.push(error("model_requested_tool_without_allowance", "Model cannot grant itself tool access", { toolId }));
  }

  if (operation === "read" && !scopeAllowed(tool.readScope, readScope)) {
    errors.push(error("read_scope_violation", "Tool read request is outside declared scope", { readScope }));
  }

  if (operation === "write" && !scopeAllowed(tool.writeScope, writeScope)) {
    errors.push(error("write_scope_violation", "Tool write request is outside declared scope", { writeScope }));
  }

  if (environment === toolEnvironments.production && tool.productionAccess === "deny_by_default") {
    errors.push(error("production_access_denied", "Production access is deny-by-default"));
  }

  if (
    operation === "write" &&
    tool.category === "database" &&
    approval?.granted !== true
  ) {
    errors.push(error("database_write_requires_approval", "Database writes require explicit approval"));
  }

  for (const permission of tool.permissions) {
    if (requiresExplicitApproval(permission) && approval?.granted !== true) {
      errors.push(error("explicit_approval_required", "Permission class requires explicit approval", { permission }));
    }
  }

  if (
    tool.permissions.includes(toolPermissionClasses.publish) ||
    tool.permissions.includes(toolPermissionClasses.deploy)
  ) {
    errors.push(error("publish_deploy_blocked", "Publish/deploy are blocked in this architecture phase"));
  }

  return {
    ok: errors.length === 0,
    tool,
    errors
  };
}
