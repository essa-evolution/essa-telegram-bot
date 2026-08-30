import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import { getCapability } from "./capabilityRegistry.js";
import { productEducationCards, productKnowledgeNodes, explainKnowledgeNode } from "./productKnowledge.js";

export const contentFreshnessStatuses = {
  current: "CURRENT",
  stale: "STALE_CONTENT",
  refreshRequired: "REFRESH_REQUIRED"
};

export const lisaProductGuideRole = {
  roleId: "LISA_ESSA_PRODUCT_GUIDE",
  usesCharacterCore: true,
  mayMutateCharacterCore: false,
  voice: "simple_direct_human_language",
  documentationToneRequired: false
};

export const lisaCharacterCoreReference = {
  id: "lisa_character_core",
  title: "Lisa Character Core",
  category: "lisa_character_core",
  status: "source_of_truth",
  priority: "critical",
  path: "02_AGENTS/07_LISA/00_CORE/LISA_CHARACTER_CORE.md",
  stableCore: true,
  dynamicExpressionRequired: true,
  providerIndependent: true
};

export function evaluateContentFreshness({
  contentArtifact = {},
  currentCapability = getCapability(contentArtifact.capabilityId)
} = {}) {
  if (!currentCapability) {
    return { freshnessStatus: contentFreshnessStatuses.refreshRequired, reason: "capability_missing" };
  }

  if (contentArtifact.capabilityVersion !== currentCapability.version) {
    return {
      freshnessStatus: contentFreshnessStatuses.stale,
      reason: "capability_version_changed",
      capabilityVersion: contentArtifact.capabilityVersion,
      currentCapabilityVersion: currentCapability.version
    };
  }

  if (contentArtifact.availabilityState !== currentCapability.activationState) {
    return {
      freshnessStatus: contentFreshnessStatuses.stale,
      reason: "availability_state_changed",
      availabilityState: contentArtifact.availabilityState,
      currentAvailabilityState: currentCapability.activationState
    };
  }

  return { freshnessStatus: contentFreshnessStatuses.current };
}

export function buildBoundedProductKnowledgeContext({ query = "", maxItems = 3, maxChars = 1200 } = {}) {
  const normalized = String(query).toLowerCase();
  const items = productKnowledgeNodes.map((node) => {
    const capability = getCapability(node.capabilityId);
    const haystack = [
      node.userNeed,
      node.userOutcome,
      node.plainLanguageDescription,
      node.productId,
      node.capabilityId,
      ...node.exampleRequests,
      ...node.relatedCapabilities
    ].join(" ").toLowerCase();
    const relevance = haystack.includes(normalized) ? 1 : keywordRelevance(normalized, haystack);
    const explanation = explainKnowledgeNode(node, capability);
    return {
      id: node.nodeId,
      text: JSON.stringify(explanation),
      relevance,
      source: "ProductKnowledge"
    };
  });

  return buildContextPackage({
    intent: "essa_product_self_description",
    maxItems,
    maxChars,
    memoryItems: items.filter((item) => item.relevance > 0)
  });
}

function keywordRelevance(query, haystack) {
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0.1;
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}

export function createLisaProductGuideContext() {
  return {
    role: lisaProductGuideRole,
    characterCore: { ...lisaCharacterCoreReference },
    mayMutateCharacterCore: false
  };
}

export function getProductEducationForCapability(capabilityId) {
  return productEducationCards.filter((card) => card.capabilityId === capabilityId);
}
