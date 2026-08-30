import {
  createProductionAgentProvider,
  productionAgentStatuses
} from "./contracts.js";

export const productionAgentProviderRegistry = [
  createProductionAgentProvider({
    providerId: "claude_agent_sdk",
    status: productionAgentStatuses.candidate,
    executable: false,
    capabilities: [
      "semantic_editing",
      "production_planning",
      "structured_reasoning",
      "tool_orchestration",
      "coding_assistance"
    ],
    supports: {
      controlledTools: true,
      mcpFuture: true,
      persistentSessionFuture: true,
      unrestrictedShell: false,
      providerSecrets: false
    },
    invoke: null,
    health: "not_configured",
    metadata: {
      role: "optional_production_agent_provider",
      requiresInstall: true,
      requiresApiKey: true,
      providerCallsAllowed: false,
      notes: "Registered as a non-executable candidate only. ESSA owns policy, identity, credentials, artifacts and approvals."
    }
  }),
  createProductionAgentProvider({
    providerId: "mock_production_agent",
    status: "test",
    executable: false,
    capabilities: [
      "semantic_editing",
      "production_planning",
      "structured_reasoning",
      "tool_orchestration"
    ],
    supports: {
      controlledTools: true,
      localOnly: true,
      unrestrictedShell: false,
      providerSecrets: false
    },
    invoke: null,
    health: "test_only",
    metadata: {
      role: "local_contract_validation_provider",
      providerCallsAllowed: false,
      executableOnlyWithLocalMockMode: true,
      notes: "Dedicated local mock provider. The runner injects the mock invoke function only when allowMockProvider is true."
    }
  })
];

export function createProductionAgentProviderRegistry(extraProviders = []) {
  return [
    ...productionAgentProviderRegistry,
    ...extraProviders.map(createProductionAgentProvider)
  ];
}

export function getProductionAgentProvider(providerId, registry = productionAgentProviderRegistry) {
  const provider = registry.find((item) => item.providerId === providerId);

  return provider
    ? {
        ...provider,
        capabilities: [...(provider.capabilities || [])],
        supports: { ...(provider.supports || {}) },
        metadata: { ...(provider.metadata || {}) }
      }
    : null;
}

export function listProductionAgentProviders(registry = productionAgentProviderRegistry) {
  return registry.map((provider) => getProductionAgentProvider(provider.providerId, registry));
}

export function canExecuteProductionAgentProvider(providerId, registry = productionAgentProviderRegistry) {
  const provider = getProductionAgentProvider(providerId, registry);

  return Boolean(provider && provider.executable === true && typeof provider.invoke === "function");
}
