import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import { productIds } from "../capabilities/productCapabilityMap.js";
import {
  organicGrowthPlanContract,
  productEducationCalendarItemContract,
  productJourneyEducationPlanContract
} from "./educationContracts.js";

export function createProductJourneyEducationPlan({ journeyId, userScenario, productIds: products, capabilitySequence } = {}) {
  return {
    ...productJourneyEducationPlanContract,
    journeyId,
    userScenario,
    productIds: [...products],
    capabilitySequence: [...capabilitySequence],
    educationSteps: capabilitySequence.map((capabilityId, index) => ({
      order: index + 1,
      capabilityId,
      educationGoal: "explain_next_step_truthfully"
    })),
    executionEnabled: false
  };
}

export function createBookPublishingJourneyPlan() {
  return createProductJourneyEducationPlan({
    journeyId: "journey_i_wrote_a_book",
    userScenario: "I wrote a book.",
    productIds: [productIds.publishing],
    capabilitySequence: [
      "BOOK_STRUCTURE",
      "TEXT_EDIT",
      "BOOK_COVER",
      "DOCUMENT_FORMAT",
      "EBOOK_BUILD",
      "AUDIOBOOK_BUILD",
      "PUBLISHING_PACKAGE"
    ]
  });
}

export function createRestaurantOwnerCrossProductJourneyPlan() {
  return createProductJourneyEducationPlan({
    journeyId: "journey_restaurant_owner_growth",
    userScenario: "Restaurant owner wants business growth and customer acquisition.",
    productIds: [
      productIds.business,
      productIds.developer,
      productIds.production,
      productIds.advertising,
      productIds.creatorNetwork
    ],
    capabilitySequence: [
      "BUSINESS_ANALYZE",
      "WEBSITE_GENERATE",
      "VIDEO_EDIT",
      "CAMPAIGN_PLAN",
      "CREATOR_MATCH"
    ]
  });
}

export function createCreatorBriefCandidate(channelBrief) {
  return {
    candidateType: "CreatorBriefCandidate",
    productId: channelBrief.productId,
    capabilityId: channelBrief.capabilityId,
    channel: channelBrief.channel,
    angleId: channelBrief.angleId,
    allowedClaims: [...channelBrief.allowedClaims],
    prohibitedClaims: [...channelBrief.prohibitedClaims],
    availabilityState: channelBrief.availabilityState,
    sourceVersions: channelBrief.sourceVersions,
    demoEligibility: channelBrief.demoConcept,
    CTAType: channelBrief.CTAType,
    dispatchEnabled: false
  };
}

export function createCampaignEducationBriefCandidate(strategy) {
  return {
    candidateType: "CampaignEducationBriefCandidate",
    productId: strategy.productId,
    capabilityId: strategy.capabilityId,
    keyMessage: strategy.keyMessage,
    allowedClaims: [...(strategy.availabilityTruth?.allowedClaims || [])],
    prohibitedClaims: [...(strategy.availabilityTruth?.prohibitedClaims || [])],
    availabilityState: strategy.availabilityTruth?.availabilityState,
    sourceVersions: strategy.sourceVersions,
    adLaunchEnabled: false
  };
}

export function createOrganicGrowthPlan({ strategy, angles = [], channels = [] } = {}) {
  return {
    ...organicGrowthPlanContract,
    growthPlanId: `growth_${strategy.productId}_${strategy.capabilityId}`,
    productId: strategy.productId,
    capabilityId: strategy.capabilityId,
    audience: angles[0]?.audience || "GENERAL_USER",
    contentThemes: angles.map((angle) => angle.hookConcept),
    educationSequence: angles.map((angle) => angle.angleType),
    channelMix: [...channels],
    demoOpportunities: angles.filter((angle) => angle.angleType === "DEMO").map((angle) => angle.angleId),
    crossProductJourneyOpportunities: ["journey_i_wrote_a_book", "journey_restaurant_owner_growth"],
    freshnessStatus: strategy.freshnessStatus,
    executionEnabled: false
  };
}

export function createProductEducationCalendarItem({ angle, channel, priority = "normal" } = {}) {
  return {
    ...productEducationCalendarItemContract,
    itemId: `calendar_${channel}_${angle.angleId}`.replaceAll(/\s+/g, "_").toLowerCase(),
    productId: angle.productId,
    capabilityId: angle.capabilityId,
    angleId: angle.angleId,
    channel,
    format: "future_structured_brief",
    priority,
    freshness: angle.freshnessStatus,
    availability: angle.availabilityState,
    plannedState: "PLANNED_NOT_SCHEDULED"
  };
}

export function buildContentFatigueSignature({ angleType, capabilityId, channel, audience } = {}) {
  return [angleType, capabilityId, channel, audience].filter(Boolean).join("::").toLowerCase();
}

export function buildBoundedProductEducationContext({
  strategy,
  angle,
  demoPlan,
  channelBrief,
  maxItems = 7,
  maxChars = 1800
} = {}) {
  return buildContextPackage({
    intent: "bounded_product_education_context",
    maxItems,
    maxChars,
    memoryItems: [
      { id: "product", text: strategy?.productId, relevance: 1, source: "ProductEducationStrategy" },
      { id: "capability", text: strategy?.capabilityId, relevance: 1, source: "ProductEducationStrategy" },
      { id: "strategy", text: JSON.stringify(strategy), relevance: 1, source: "ProductEducationStrategy" },
      { id: "angle", text: JSON.stringify(angle), relevance: 0.9, source: "ProductContentAngle" },
      { id: "claims", text: JSON.stringify(strategy?.availabilityTruth), relevance: 0.9, source: "EducationPolicy" },
      { id: "demo", text: JSON.stringify(demoPlan), relevance: 0.8, source: "CapabilityDemoPlan" },
      { id: "channel", text: JSON.stringify(channelBrief), relevance: 0.8, source: "ChannelEducationBrief" },
      { id: "lisa", text: "Lisa Character Core reference only; no mutation.", relevance: 0.7, source: "LisaProductGuide" }
    ].filter((item) => item.text)
  });
}
