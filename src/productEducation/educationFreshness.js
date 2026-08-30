import { getCapability } from "../capabilities/capabilityRegistry.js";
import { productKnowledgeNodes } from "../capabilities/productKnowledge.js";
import {
  educationFreshnessStatuses,
  educationRefreshIntentContract
} from "./educationContracts.js";

export function getProductKnowledgeNode(productId, capabilityId) {
  return productKnowledgeNodes.find((node) =>
    node.productId === productId && node.capabilityId === capabilityId
  ) || null;
}

export function buildSourceVersions({ productId, capabilityId, capability, productNode } = {}) {
  const sourceCapability = capability || getCapability(capabilityId);
  const sourceNode = productNode || getProductKnowledgeNode(productId, capabilityId);
  return {
    capabilityId,
    capabilityVersion: sourceCapability?.version || null,
    productId,
    productVersion: sourceNode?.version || null,
    knowledgeVersion: sourceNode?.version || null,
    availabilityState: sourceNode?.availabilityState || sourceCapability?.activationState || "UNAVAILABLE",
    educationStrategyVersion: "1.0.0",
    generatedAtFuture: null
  };
}

export function evaluateEducationFreshness({ artifact = {}, currentCapability, currentProductNode } = {}) {
  const capability = currentCapability || getCapability(artifact.capabilityId);
  const productNode = currentProductNode || getProductKnowledgeNode(artifact.productId, artifact.capabilityId);

  if (!capability || !productNode) {
    return { freshnessStatus: educationFreshnessStatuses.refreshRequired, reason: "source_missing" };
  }

  if (artifact.sourceVersions?.capabilityVersion !== capability.version) {
    return { freshnessStatus: educationFreshnessStatuses.staleCapabilityVersion, reason: "capability_version_changed" };
  }

  if (artifact.sourceVersions?.productVersion !== productNode.version) {
    return { freshnessStatus: educationFreshnessStatuses.staleProductVersion, reason: "product_version_changed" };
  }

  if (artifact.availabilityState && artifact.availabilityState !== productNode.availabilityState) {
    return { freshnessStatus: educationFreshnessStatuses.staleAvailability, reason: "availability_changed" };
  }

  return { freshnessStatus: educationFreshnessStatuses.current };
}

export function createEducationRefreshIntent({ changedProductKnowledge = {}, strategies = [], angles = [], briefs = [] } = {}) {
  return {
    ...educationRefreshIntentContract,
    refreshIntentId: `refresh_${changedProductKnowledge.productId || "product"}_${changedProductKnowledge.capabilityId || "capability"}`,
    affectedStrategies: strategies.map((strategy) => strategy.strategyId).filter(Boolean),
    affectedAngles: angles.map((angle) => angle.angleId).filter(Boolean),
    affectedChannelBriefs: briefs.map((brief) => brief.briefId).filter(Boolean),
    reason: changedProductKnowledge.reason || "ProductKnowledgeChanged",
    executionEnabled: false
  };
}
