export const toolCategories = [
  "documentation",
  "browser",
  "database",
  "security",
  "design",
  "research",
  "filesystem",
  "code",
  "media",
  "deployment",
  "property"
];

export const toolPermissionClasses = {
  readOnly: "READ_ONLY",
  localMutation: "LOCAL_MUTATION",
  externalMutation: "EXTERNAL_MUTATION",
  costIncurring: "COST_INCURRING",
  publish: "PUBLISH",
  deploy: "DEPLOY",
  securitySensitive: "SECURITY_SENSITIVE"
};

export const toolCostClasses = {
  none: "NONE",
  local: "LOCAL",
  metered: "METERED",
  paidExternal: "PAID_EXTERNAL"
};

export const toolEnvironments = {
  local: "local",
  development: "development",
  staging: "staging",
  production: "production"
};

export const autonomousExecutionStates = {
  plan: "PLAN",
  execute: "EXECUTE",
  observe: "OBSERVE",
  verify: "VERIFY",
  repair: "REPAIR",
  reverify: "REVERIFY",
  readyForApproval: "READY_FOR_APPROVAL",
  blocked: "BLOCKED"
};

export const agentToolContract = {
  toolId: null,
  providerId: null,
  category: null,
  capabilities: [],
  permissions: [],
  readScope: [],
  writeScope: [],
  externalSideEffects: false,
  costClass: toolCostClasses.none,
  requiresSecrets: false,
  environment: toolEnvironments.development,
  productionAccess: "deny_by_default",
  approvalRequired: true,
  rollback: {
    supported: false,
    strategy: null
  },
  executable: false,
  audit: {
    owner: "ESSA",
    sourceOfTruth: "ESSA Core",
    traceRequired: true,
    providerMayMutatePolicy: false
  },
  adapter: {
    kind: "stub",
    status: "non_executable"
  }
};

export const aiProviderRoutingContract = {
  providerId: null,
  modelId: null,
  capabilities: [],
  qualityTier: "standard",
  latencyClass: "standard",
  costClass: toolCostClasses.metered,
  contextWindowTokens: null,
  available: false,
  remainingQuota: null,
  fallbackPriority: 100,
  policyOwnership: "ESSA"
};

export function createAgentToolContract(input = {}) {
  return {
    ...agentToolContract,
    ...input,
    capabilities: [...(input.capabilities || agentToolContract.capabilities)],
    permissions: [...(input.permissions || agentToolContract.permissions)],
    readScope: [...(input.readScope || agentToolContract.readScope)],
    writeScope: [...(input.writeScope || agentToolContract.writeScope)],
    rollback: {
      ...agentToolContract.rollback,
      ...(input.rollback || {})
    },
    audit: {
      ...agentToolContract.audit,
      ...(input.audit || {})
    },
    adapter: {
      ...agentToolContract.adapter,
      ...(input.adapter || {})
    }
  };
}

export function createAiProviderRoutingContract(input = {}) {
  return {
    ...aiProviderRoutingContract,
    ...input,
    capabilities: [...(input.capabilities || [])],
    policyOwnership: "ESSA"
  };
}

export function requiresExplicitApproval(permissionClass) {
  return [
    toolPermissionClasses.externalMutation,
    toolPermissionClasses.costIncurring,
    toolPermissionClasses.publish,
    toolPermissionClasses.deploy,
    toolPermissionClasses.securitySensitive
  ].includes(permissionClass);
}
