import {
  createProductionAgentResult,
  getControlledProductionTool,
  productionAgentPermissionLevels
} from "./contracts.js";
import {
  getProductionAgentProvider,
  productionAgentProviderRegistry
} from "./providerRegistry.js";

function nowIso() {
  return new Date().toISOString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasSecretLikeValue(value) {
  return /anthropic_api_key|openai_api_key|elevenlabs_api_key|api[_-]?key|bearer\s+[a-z0-9._-]+|sk[-_][a-z0-9_-]{12,}/i.test(
    JSON.stringify(value || {})
  );
}

function validationError(code, message, details = {}) {
  return { code, message, details };
}

export function validateProductionAgentRequest(request = {}) {
  const errors = [];

  for (const key of ["taskId", "goalId", "projectId", "workflowId", "taskType", "traceId"]) {
    if (!request[key]) {
      errors.push(validationError("missing_required_request_field", `${key} is required`, { key }));
    }
  }

  if (!Array.isArray(request.allowedTools) || request.allowedTools.length === 0) {
    errors.push(validationError("missing_allowed_tools", "allowedTools must be a non-empty array"));
  }

  for (const toolId of safeArray(request.allowedTools)) {
    if (!getControlledProductionTool(toolId)) {
      errors.push(validationError("unknown_allowed_tool", "allowedTools contains an unknown controlled tool", { toolId }));
    }
  }

  if (!request.approvalPolicy) {
    errors.push(validationError("missing_approval_policy", "approvalPolicy is required"));
  }

  if (hasSecretLikeValue(request)) {
    errors.push(validationError("secret_like_value_detected", "Request must not contain provider secrets"));
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateProductionAgentResult(result = {}, request = {}) {
  const errors = [];
  const blockedTools = [];
  const requestedTools = safeArray(result.toolRequests).map((toolRequest) => toolRequest.toolId).filter(Boolean);
  const allowedTools = new Set(safeArray(request.allowedTools));
  const sourcePaths = new Set(
    safeArray(request.sourceArtifacts)
      .map((artifact) => artifact.path)
      .filter(Boolean)
  );

  if (!result.providerId) {
    errors.push(validationError("missing_provider_id", "providerId is required"));
  }

  if (!Array.isArray(result.toolRequests)) {
    errors.push(validationError("invalid_tool_requests", "toolRequests must be an array"));
  }

  if (!Array.isArray(result.artifacts)) {
    errors.push(validationError("invalid_artifacts", "artifacts must be an array"));
  }

  if (!Array.isArray(result.unresolved)) {
    errors.push(validationError("invalid_unresolved", "unresolved must be an array"));
  }

  if (!Array.isArray(result.errors)) {
    errors.push(validationError("invalid_errors", "errors must be an array"));
  }

  if (!Array.isArray(result.trace)) {
    errors.push(validationError("invalid_trace", "trace must be an array"));
  }

  for (const toolRequest of safeArray(result.toolRequests)) {
    const toolId = toolRequest.toolId;
    const tool = getControlledProductionTool(toolId);

    if (!tool || !allowedTools.has(toolId)) {
      blockedTools.push({
        toolId,
        reason: "tool_not_allowed"
      });
      continue;
    }

    if ((tool.external || tool.paid) && toolRequest.approvalGranted !== true) {
      blockedTools.push({
        toolId,
        reason: tool.paid ? "paid_external_tool_requires_approval" : "external_tool_requires_approval"
      });
    }

    if (tool.permissionLevel === productionAgentPermissionLevels.publish && toolRequest.approvalGranted !== true) {
      blockedTools.push({
        toolId,
        reason: "publish_requires_human_approval"
      });
    }

    if (tool.permissionLevel === productionAgentPermissionLevels.destructive) {
      blockedTools.push({
        toolId,
        reason: "destructive_action_blocked"
      });
    }

    const outputPath = toolRequest.outputPath || toolRequest.input?.outputPath;
    if (outputPath && sourcePaths.has(outputPath)) {
      blockedTools.push({
        toolId,
        reason: "source_overwrite_attempt"
      });
    }
  }

  const resultText = JSON.stringify(result || {}).toLowerCase();
  if (
    resultText.includes("charactercoremutation") ||
    resultText.includes("mutate_character_core") ||
    resultText.includes("rewrite_lisa_character_core") ||
    resultText.includes("new source of truth")
  ) {
    errors.push(validationError(
      "identity_source_of_truth_mutation_attempt",
      "Provider result must not redefine Lisa Character Core or become source of truth"
    ));
  }

  if (
    resultText.includes("mutate_production_profile") ||
    resultText.includes("rewrite_lisa_production_profile")
  ) {
    errors.push(validationError(
      "production_profile_mutation_attempt",
      "Provider result must not mutate LisaProductionProfile"
    ));
  }

  if (hasSecretLikeValue(result)) {
    errors.push(validationError("secret_like_value_detected", "Result must not contain provider secrets"));
  }

  const hasVerifiedArtifact = safeArray(result.artifacts).some((artifact) =>
    artifact.type === "VerificationReport" &&
      (artifact.verified === true || artifact.passed === true)
  );

  const claimsCompleted =
    result.completion === true ||
    result.status === "completed" ||
    result.completionState === "completed" ||
    result.plan?.completionState === "completed";

  if (claimsCompleted && !hasVerifiedArtifact) {
    errors.push(validationError(
      "fake_success_without_verified_artifact",
      "Completion requires a verified final artifact"
    ));
  }

  for (const blockedTool of blockedTools) {
    errors.push(validationError("blocked_tool_request", "Tool request blocked by ESSA safety policy", blockedTool));
  }

  return {
    ok: errors.length === 0,
    blockedTools,
    requestedTools,
    errors
  };
}

function normalizeTrace({ providerId, request, resultValidation, result }) {
  return {
    providerId,
    requestId: request.taskId,
    taskId: request.taskId,
    goalId: request.goalId,
    projectId: request.projectId,
    allowedTools: [...safeArray(request.allowedTools)],
    requestedTools: [...resultValidation.requestedTools],
    blockedTools: [...resultValidation.blockedTools],
    validationStatus: resultValidation.ok ? "accepted" : "rejected",
    approvalRequired: true,
    artifactRefs: safeArray(result.artifacts).map((artifact) => ({
      artifactId: artifact.artifactId || null,
      type: artifact.type || null
    })),
    timestamp: nowIso()
  };
}

export async function runProductionAgent({
  providerId,
  request,
  providerRegistry = productionAgentProviderRegistry,
  validationPolicy = {},
  allowMockProvider = false,
  mockInvoke = null,
  allowFixtureProvider = false,
  fixtureResult = null
} = {}) {
  const provider = getProductionAgentProvider(providerId, providerRegistry);

  if (!provider) {
    return {
      ok: false,
      providerId,
      validation: {
        status: "rejected",
        errors: [validationError("provider_not_found", "ProductionAgent provider was not found", { providerId })]
      },
      trace: []
    };
  }

  const requestValidation = validateProductionAgentRequest(request);
  if (!requestValidation.ok) {
    return {
      ok: false,
      providerId,
      validation: {
        status: "rejected",
        errors: requestValidation.errors
      },
      trace: []
    };
  }

  const canRunMock = allowMockProvider &&
    provider.providerId === "mock_production_agent" &&
    typeof mockInvoke === "function";
  const canRunFixture = allowFixtureProvider &&
    fixtureResult &&
    typeof fixtureResult === "object";
  const canRunReal = provider.executable === true && typeof provider.invoke === "function";

  if (!canRunMock && !canRunFixture && !canRunReal) {
    return {
      ok: false,
      providerId,
      validation: {
        status: "rejected",
        errors: [
          validationError("provider_not_executable", "Provider is not executable in this mode", {
            providerId,
            executable: provider.executable
          })
        ]
      },
      trace: []
    };
  }

  const rawResult = canRunMock
    ? await mockInvoke(request, { validationPolicy })
    : canRunFixture
      ? fixtureResult
      : await provider.invoke(request, { validationPolicy });
  const normalizedResult = createProductionAgentResult({
    providerId,
    ...rawResult,
    approvalRequired: rawResult?.approvalRequired !== false
  });
  const resultValidation = validateProductionAgentResult(normalizedResult, request);
  const trace = normalizeTrace({ providerId, request, resultValidation, result: normalizedResult });
  const accepted = resultValidation.ok;

  return {
    ...normalizedResult,
    ok: accepted && normalizedResult.ok === true,
    status: accepted && normalizedResult.ok === true ? "accepted" : "rejected",
    validation: {
      status: accepted ? "accepted" : "rejected",
      errors: resultValidation.errors,
      blockedTools: resultValidation.blockedTools
    },
    trace: [
      ...safeArray(normalizedResult.trace),
      trace
    ]
  };
}
