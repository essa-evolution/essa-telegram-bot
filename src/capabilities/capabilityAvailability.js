import { getCapability } from "./capabilityRegistry.js";
import { getProviderCandidatesForCapability } from "./providerCapabilityMap.js";

export function getCapabilityAvailability(capabilityId, registry) {
  const capability = getCapability(capabilityId, registry);
  const providerCandidates = getProviderCandidatesForCapability(capabilityId);

  return {
    capabilityId,
    availabilityState: capability?.activationState || "UNAVAILABLE",
    localPossible: capability?.localPossible || false,
    deterministicPossible: capability?.deterministicPossible || false,
    providerCandidates,
    executableNow: providerCandidates.some((candidate) => candidate.executableNow) ||
      ["LOCAL_READY", "ACTIVE"].includes(capability?.activationState)
  };
}

