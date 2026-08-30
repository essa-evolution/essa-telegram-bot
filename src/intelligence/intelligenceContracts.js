export const decisionTypes = {
  localTool: "LOCAL_TOOL",
  localModel: "LOCAL_MODEL",
  externalModel: "EXTERNAL_MODEL",
  humanRequired: "HUMAN_REQUIRED",
  blocked: "BLOCKED"
};

export const providerHealthStatuses = {
  available: "AVAILABLE",
  degraded: "DEGRADED",
  rateLimited: "RATE_LIMITED",
  outOfCredits: "OUT_OF_CREDITS",
  authFailed: "AUTH_FAILED",
  unavailable: "UNAVAILABLE",
  notConfigured: "NOT_CONFIGURED",
  experimental: "EXPERIMENTAL"
};

export const activationStates = {
  architectureOnly: "ARCHITECTURE_ONLY",
  notConfigured: "NOT_CONFIGURED",
  readyForKey: "READY_FOR_KEY",
  readyForPayment: "READY_FOR_PAYMENT",
  readyForActivation: "READY_FOR_ACTIVATION",
  active: "ACTIVE",
  degraded: "DEGRADED",
  disabled: "DISABLED"
};

export const reasoningLevels = {
  none: "NONE",
  luna: "LUNA",
  terra: "TERRA",
  solStandard: "SOL_STANDARD",
  solHigh: "SOL_HIGH",
  solMax: "SOL_MAX",
  claude: "CLAUDE"
};

export const intelligenceRequestContract = {
  requestId: null,
  taskId: null,
  goalId: null,
  projectId: null,
  workflowId: null,
  domain: null,
  taskType: null,
  taskComplexity: "normal",
  userIntent: "",
  desiredOutcome: "",
  contextPack: null,
  contextBudget: null,
  requiredCapabilities: [],
  qualityRequirement: "standard",
  latencyPreference: "standard",
  privacyRequirement: "standard",
  maxCostUsd: null,
  budgetMode: "STANDARD",
  toolPolicy: null,
  approvalPolicy: null,
  escalationAllowed: true,
  fallbackAllowed: true,
  providerPolicy: {},
  traceId: null
};

export const intelligenceDecisionContract = {
  requestId: null,
  decisionType: decisionTypes.blocked,
  selectedProvider: null,
  selectedModel: null,
  selectedLocalTool: null,
  reasoningLevel: reasoningLevels.none,
  estimatedInputTokens: 0,
  estimatedOutputTokens: 0,
  estimatedCost: null,
  selectionReason: "",
  fallbackCandidates: [],
  escalationPath: [],
  approvalRequired: true,
  policyChecks: [],
  contextBudgetDecision: null,
  traceId: null
};

export function createIntelligenceRequest(input = {}) {
  return {
    ...intelligenceRequestContract,
    ...input,
    requiredCapabilities: [...(input.requiredCapabilities || [])],
    providerPolicy: { ...(input.providerPolicy || {}) }
  };
}

export function createIntelligenceDecision(input = {}) {
  return {
    ...intelligenceDecisionContract,
    ...input,
    fallbackCandidates: [...(input.fallbackCandidates || [])],
    escalationPath: [...(input.escalationPath || [])],
    policyChecks: [...(input.policyChecks || [])]
  };
}

export function createIntelligenceProvider(input = {}) {
  return {
    providerId: null,
    status: activationStates.notConfigured,
    models: [],
    capabilities: [],
    health: providerHealthStatuses.notConfigured,
    costMetadata: {},
    privacyMetadata: {},
    executable: false,
    credentialRequirements: [],
    invokeAdapter: null,
    ...input,
    models: [...(input.models || [])],
    capabilities: [...(input.capabilities || [])],
    credentialRequirements: [...(input.credentialRequirements || [])],
    privacyMetadata: { ...(input.privacyMetadata || {}) },
    costMetadata: { ...(input.costMetadata || {}) }
  };
}
