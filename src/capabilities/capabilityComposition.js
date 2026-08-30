import {
  capabilityCompositionPlanContract,
  capabilityCostClasses
} from "./capabilityContracts.js";
import { getCapability } from "./capabilityRegistry.js";
import { getProviderCandidatesForCapability } from "./providerCapabilityMap.js";
import { deriveApprovalPoints } from "./capabilityPolicy.js";

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function maxCostClass(capabilities) {
  if (capabilities.some((item) => item.costClass === capabilityCostClasses.paidExternal)) return capabilityCostClasses.paidExternal;
  if (capabilities.some((item) => item.costClass === capabilityCostClasses.metered)) return capabilityCostClasses.metered;
  if (capabilities.some((item) => item.costClass === capabilityCostClasses.localCompute)) return capabilityCostClasses.localCompute;
  if (capabilities.every((item) => item.costClass === capabilityCostClasses.free)) return capabilityCostClasses.free;
  return capabilityCostClasses.unknown;
}

export function createCapabilityCompositionPlan({
  goal = "",
  primaryCapabilityId,
  constraints = {},
  registry
} = {}) {
  const primary = getCapability(primaryCapabilityId, registry);
  if (!primary) {
    return {
      ...capabilityCompositionPlanContract,
      goal,
      primaryCapability: null,
      verificationPlan: ["capability_not_found"],
      approvalPoints: [{ reason: "human_review_unknown_capability" }]
    };
  }

  const requiredIds = unique([primary.capabilityId, ...primary.requiredSubCapabilities]);
  const optionalIds = unique(primary.optionalSubCapabilities);
  const required = requiredIds.map((id) => getCapability(id, registry)).filter(Boolean);
  const optional = optionalIds.map((id) => getCapability(id, registry)).filter(Boolean);
  const all = [...required, ...optional];

  return {
    ...capabilityCompositionPlanContract,
    goal,
    primaryCapability: primary.capabilityId,
    requiredCapabilities: requiredIds,
    optionalCapabilities: optionalIds,
    dependencyOrder: requiredIds,
    localCandidates: all
      .filter((capability) => capability.localPossible || capability.deterministicPossible)
      .map((capability) => capability.capabilityId),
    providerCandidates: unique(
      all.flatMap((capability) =>
        getProviderCandidatesForCapability(capability.capabilityId)
          .map((candidate) => `${candidate.providerId}:${candidate.supportStatus}`)
      )
    ),
    verificationPlan: unique(all.flatMap((capability) => capability.verificationRequirements)),
    estimatedCostClass: maxCostClass(all),
    approvalPoints: deriveApprovalPoints(all),
    constraints: { ...constraints },
    executable: false
  };
}

