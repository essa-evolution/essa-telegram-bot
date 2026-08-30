export function selectFallbackCandidates({ registry = [], selectedProviderId = null, requiredCapabilities = [] } = {}) {
  return registry
    .filter((provider) => provider.providerId !== selectedProviderId)
    .filter((provider) =>
      requiredCapabilities.length === 0 ||
      requiredCapabilities.every((capability) =>
        provider.capabilities.includes(capability) ||
        provider.models.some((model) => model.defaultUse?.includes(capability))
      )
    )
    .map((provider) => ({
      providerId: provider.providerId,
      models: provider.models.map((model) => model.modelId),
      preservesPolicy: provider.selectionPolicy?.selectableForUserTasks === false ? false : true,
      executable: provider.executable,
      health: provider.health,
      researchOnly: provider.selectionPolicy?.selectableForUserTasks === false,
      blockedReason: provider.selectionPolicy?.selectableForUserTasks === false
        ? provider.selectionPolicy.reason || "provider_research_only"
        : null
    }));
}
