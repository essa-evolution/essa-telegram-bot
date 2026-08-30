import { capabilityActivationStates, capabilityRiskClasses } from "./capabilityContracts.js";

export function capabilityCanBeAdvertisedAsActive(capability) {
  return capability?.activationState === capabilityActivationStates.active ||
    capability?.activationState === capabilityActivationStates.localReady ||
    capability?.activationState === capabilityActivationStates.providerReady;
}

export function createAdvertisingTruthCheck(capability) {
  const active = capabilityCanBeAdvertisedAsActive(capability);
  return {
    capabilityId: capability?.capabilityId || null,
    availabilityState: capability?.activationState || capabilityActivationStates.unavailable,
    maySayAvailableNow: active,
    requiredWording: active ? "available_currently" : "planned_or_preparing_only"
  };
}

export function deriveApprovalPoints(capabilities = []) {
  return capabilities
    .filter((capability) =>
      [
        capabilityRiskClasses.publish,
        capabilityRiskClasses.externalMutation,
        capabilityRiskClasses.destructive,
        capabilityRiskClasses.high
      ].includes(capability.riskClass) ||
      capability.approvalRequirements.length > 0
    )
    .map((capability) => ({
      capabilityId: capability.capabilityId,
      riskClass: capability.riskClass,
      approvalRequirements: capability.approvalRequirements,
      preservesExecutionGateway: true
    }));
}

