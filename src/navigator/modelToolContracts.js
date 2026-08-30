import { selectToolForTask } from "../connect/toolSelector.js";
import { canExecute, getCapability } from "./capabilityRegistry.js";

export function createModelProviderContract({
  id,
  status = "NOT_CONNECTED",
  capabilities = [],
  health = "unknown",
  costProfile = { mode: "unknown" },
  limits = {},
  metadata = {}
} = {}) {
  return {
    id,
    status,
    capabilities,
    health,
    costProfile,
    limits,
    metadata
  };
}

export function createToolProviderContract({
  id,
  category,
  status = "NOT_CONNECTED",
  actions = [],
  health = "unknown",
  permissions = [],
  costProfile = { mode: "unknown" },
  limits = {}
} = {}) {
  return {
    id,
    category,
    status,
    actions,
    health,
    permissions,
    costProfile,
    limits
  };
}

export function selectModel({
  taskType = "unknown",
  requiredCapabilities = [],
  qualityPreference = "balanced",
  costPreference = "included",
  latencyPreference = "normal",
  privacyPreference = "internal"
} = {}) {
  return {
    selected: null,
    candidates: [],
    routerStatus: "CONTRACT_ONLY",
    reason: "Model Router contract is prepared, but concrete providers are not selected in Phase 9.",
    request: {
      taskType,
      requiredCapabilities,
      qualityPreference,
      costPreference,
      latencyPreference,
      privacyPreference
    }
  };
}

export function selectTool({
  action = "",
  capability = "",
  permissions = {},
  health = "healthy",
  costPolicy = "included"
} = {}) {
  const capabilityDefinition = getCapability(capability);
  const capabilityCheck = canExecute(capability, action, { permissions });

  if (!capabilityCheck.executable) {
    return {
      selected: null,
      candidates: [],
      capability: capabilityDefinition,
      capabilityCheck,
      execution: "blocked",
      reason: capabilityCheck.blockingReason
    };
  }

  const selection = selectToolForTask({
    category: capabilityDefinition?.category,
    requiredCapability: capabilityDefinition?.providers?.includes("essa_documents")
      ? "document_generation"
      : capabilityDefinition?.supportedActions?.includes(action)
        ? undefined
        : capability,
    costLevel: costPolicy === "included" ? "cheap" : undefined,
    executionMode: "placeholder"
  }, {
    statuses: ["candidate", "ready"]
  });

  return {
    ...selection,
    capability: capabilityDefinition,
    capabilityCheck,
    requestedHealth: health,
    execution: selection.selected ? "selected" : "no_tool_candidate"
  };
}

