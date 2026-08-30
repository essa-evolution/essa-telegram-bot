import { createCapabilityCompositionPlan } from "./capabilityComposition.js";
import { getCapability, listCapabilities } from "./capabilityRegistry.js";
import { productIds, productCapabilityMap } from "./productCapabilityMap.js";
import { productKnowledgeNodes } from "./productKnowledge.js";

const resolutionRules = [
  {
    match: ["облож", "cover", "книг"],
    productId: productIds.publishing,
    primaryCapabilityId: "BOOK_COVER"
  },
  {
    match: ["сайт", "website", "лендинг", "restaurant", "рестора"],
    productId: productIds.developer,
    primaryCapabilityId: "WEBSITE_GENERATE"
  },
  {
    match: ["обреж", "trim"],
    productId: productIds.production,
    primaryCapabilityId: "VIDEO_TRIM"
  },
  {
    match: ["перепой", "вокал", "моим голосом", "song"],
    productId: productIds.musicFactory,
    primaryCapabilityId: "VOCAL_REPLACE"
  },
  {
    match: ["бизнес", "business"],
    productId: productIds.business,
    primaryCapabilityId: "BUSINESS_ANALYZE"
  },
  {
    match: ["property", "real estate", "недвиж", "квартир", "апартамент", "батум", "batumi"],
    productId: productIds.property,
    primaryCapabilityId: "PROPERTY_ANALYZE"
  },
  {
    match: ["production", "ролик", "reels"],
    productId: productIds.production,
    primaryCapabilityId: "VIDEO_EDIT"
  }
];

function matches(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function resolveUserNeedToCapability({ userNeed = "", productContext = {}, constraints = {} } = {}) {
  const text = String(userNeed).toLowerCase();
  const rule = resolutionRules.find((item) => matches(text, item.match));
  const productId = productContext.productId || rule?.productId || productIds.navigator;
  const primaryCapabilityId = rule?.primaryCapabilityId || productCapabilityMap[productId]?.[0] || "QUESTION_GENERATION";
  const capability = getCapability(primaryCapabilityId);

  return {
    userNeed,
    productId,
    primaryCapabilityId,
    capability,
    compositionPlan: createCapabilityCompositionPlan({
      goal: userNeed,
      primaryCapabilityId,
      constraints
    }),
    providerRequiredFromUser: false
  };
}

export function searchCapabilities({ query = "", productId = null, availabilityState = null, maxResults = 5 } = {}) {
  const normalized = String(query).toLowerCase();
  const capabilityIdsForProduct = productId ? new Set(productCapabilityMap[productId] || []) : null;
  const nodesByCapability = new Map(productKnowledgeNodes.map((node) => [node.capabilityId, node]));

  return listCapabilities({ activationState: availabilityState })
    .filter((capability) => !capabilityIdsForProduct || capabilityIdsForProduct.has(capability.capabilityId))
    .map((capability) => {
      const node = nodesByCapability.get(capability.capabilityId);
      const haystack = [
        capability.capabilityId,
        capability.description,
        capability.category,
        ...(capability.domainTags || []),
        node?.userNeed || "",
        node?.plainLanguageDescription || "",
        ...(node?.exampleRequests || [])
      ].join(" ").toLowerCase();
      const terms = normalized.split(/\s+/).filter(Boolean);
      const hits = terms.filter((term) => haystack.includes(term)).length;
      return {
        capabilityId: capability.capabilityId,
        productIds: node ? [node.productId] : [],
        availabilityState: capability.activationState,
        plainLanguageDescription: node?.plainLanguageDescription || capability.description,
        score: terms.length ? hits / terms.length : 0.1
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
