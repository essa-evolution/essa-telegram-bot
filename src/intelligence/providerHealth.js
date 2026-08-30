import { providerHealthStatuses } from "./intelligenceContracts.js";

export const selectableProviderHealthStatuses = new Set([
  providerHealthStatuses.available,
  providerHealthStatuses.experimental
]);

export function providerIsResearchOnly(provider) {
  return provider?.selectionPolicy?.selectableForUserTasks === false ||
    provider?.models?.every((model) => model.selectionPolicy?.selectableForUserTasks === false) === true;
}

export function providerIsSelectable(provider, { allowArchitectureOnly = true } = {}) {
  if (!provider) return false;
  if (providerIsResearchOnly(provider)) return false;
  if (provider.health === providerHealthStatuses.notConfigured && allowArchitectureOnly && provider.executable === false) {
    return true;
  }
  return selectableProviderHealthStatuses.has(provider.health);
}

export function createProviderHealthSnapshot(provider) {
  return {
    providerId: provider.providerId,
    health: provider.health,
    status: provider.status,
    executable: provider.executable,
    liveHealthCheckMade: false,
    researchOnly: providerIsResearchOnly(provider),
    selectableForUserTasks: !providerIsResearchOnly(provider) && providerIsSelectable(provider),
    requiresRevalidation: provider.selectionPolicy?.selectableForUserTasks === false ||
      provider.costMetadata?.priceRevalidationRequired === true ||
      provider.privacyMetadata?.routeDependentConflicts === true
  };
}
