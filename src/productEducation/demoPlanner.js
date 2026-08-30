import { getCapability } from "../capabilities/capabilityRegistry.js";
import { createCapabilityCompositionPlan } from "../capabilities/capabilityComposition.js";
import { capabilityActivationStates } from "../capabilities/capabilityContracts.js";
import { createCapabilityDemoPlan, demoStatuses } from "./educationContracts.js";
import { buildSourceVersions, getProductKnowledgeNode } from "./educationFreshness.js";

export function getDemoStatus(availabilityState) {
  if (availabilityState === capabilityActivationStates.localReady) return demoStatuses.localReady;
  if (availabilityState === capabilityActivationStates.active) return demoStatuses.activeReady;
  if (availabilityState === capabilityActivationStates.readyForPayment) return demoStatuses.providerActivationRequired;
  return demoStatuses.plannedNotExecutable;
}

export function planCapabilityDemo({ productId, capabilityId, userScenario } = {}) {
  const capability = getCapability(capabilityId);
  const productNode = getProductKnowledgeNode(productId, capabilityId);
  const availabilityState = productNode?.availabilityState || capability?.activationState || capabilityActivationStates.architectureOnly;
  const compositionPlan = createCapabilityCompositionPlan({
    goal: userScenario || productNode?.userNeed || capability?.description || "",
    primaryCapabilityId: capabilityId
  });

  return createCapabilityDemoPlan({
    demoId: `demo_${productId}_${capabilityId}`,
    productId,
    capabilityId,
    userScenario: userScenario || productNode?.userNeed || "",
    inputArtifactType: capability?.inputTypes?.[0] || "user_brief",
    expectedOutputArtifactType: capability?.outputTypes?.[0] || "education_artifact",
    stepSequence: compositionPlan.dependencyOrder,
    requiredCapabilities: compositionPlan.requiredCapabilities,
    requiredProvidersFuture: compositionPlan.providerCandidates,
    verificationPlan: compositionPlan.verificationPlan,
    costClass: compositionPlan.estimatedCostClass,
    approvalPoints: compositionPlan.approvalPoints,
    availabilityState,
    demoStatus: getDemoStatus(availabilityState),
    sourceVersion: buildSourceVersions({ productId, capabilityId, capability, productNode }),
    executionEnabled: false
  });
}
