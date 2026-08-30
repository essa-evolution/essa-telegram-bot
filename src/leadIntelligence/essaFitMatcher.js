import { productIds } from "../capabilities/productCapabilityMap.js";
import {
  businessNeedSignalTypes,
  leadConfidenceClasses
} from "./leadContracts.js";

export function createNeedSignals(entity = {}) {
  const signals = [];
  const sourceRef = entity.sourceRefs?.[0]?.sourceId || "local_fixture";

  if (!entity.website) {
    signals.push({
      signalId: `${entity.businessId}_no_website`,
      businessId: entity.businessId,
      signalType: businessNeedSignalTypes.noWebsiteFound,
      observedEvidence: "No website field present in checked public fixture sources.",
      sourceRef,
      confidenceClass: leadConfidenceClasses.medium,
      inferredNeed: "possible website or landing page need",
      allowedInterpretation: "No current website was found in the checked sources.",
      prohibitedInterpretation: "Do not claim the business definitely has no website."
    });
  }

  if (entity.website && entity.publicDescription?.includes("old website")) {
    signals.push({
      signalId: `${entity.businessId}_outdated_web`,
      businessId: entity.businessId,
      signalType: businessNeedSignalTypes.outdatedWebExperience,
      observedEvidence: "Fixture description marks the public web experience as outdated.",
      sourceRef,
      confidenceClass: leadConfidenceClasses.medium,
      inferredNeed: "possible website improvement",
      allowedInterpretation: "Public information suggests the web experience may be outdated.",
      prohibitedInterpretation: "Do not claim the business is failing."
    });
  }

  if (entity.socialProfiles?.length === 0) {
    signals.push({
      signalId: `${entity.businessId}_no_short_form`,
      businessId: entity.businessId,
      signalType: businessNeedSignalTypes.noShortFormContentFound,
      observedEvidence: "No public short-form/social profile was present in checked fixture sources.",
      sourceRef,
      confidenceClass: leadConfidenceClasses.low,
      inferredNeed: "possible short-form content opportunity",
      allowedInterpretation: "Possible fit for ESSA Production if the business wants content.",
      prohibitedInterpretation: "Do not claim they are bad at marketing."
    });
  }

  if (entity.publicDescription?.includes("booking absent")) {
    signals.push({
      signalId: `${entity.businessId}_booking_absent`,
      businessId: entity.businessId,
      signalType: businessNeedSignalTypes.noVisibleBookingFlow,
      observedEvidence: "Fixture source notes no visible public booking flow.",
      sourceRef,
      confidenceClass: leadConfidenceClasses.medium,
      inferredNeed: "possible conversion flow improvement",
      allowedInterpretation: "No visible booking flow was found in checked public data.",
      prohibitedInterpretation: "Do not claim lost revenue."
    });
  }

  return signals;
}

export function matchEssaFit(entity = {}, signals = []) {
  const matches = [];
  const signalTypes = new Set(signals.map((signal) => signal.signalType));
  const restaurant = /restaurant|cafe|hospitality|hotel/i.test(`${entity.industry} ${entity.businessType} ${entity.subIndustry}`);

  if (signalTypes.has(businessNeedSignalTypes.noWebsiteFound) || signalTypes.has(businessNeedSignalTypes.outdatedWebExperience)) {
    matches.push({
      productId: productIds.developer,
      capabilityId: "WEBSITE_GENERATE",
      evidenceSignalTypes: [...signalTypes].filter((type) => /WEBSITE|WEB_EXPERIENCE|BOOKING/.test(type)),
      fitType: "POSSIBLE_NEED"
    });
  }
  if (restaurant || signalTypes.has(businessNeedSignalTypes.noShortFormContentFound)) {
    matches.push({
      productId: productIds.production,
      capabilityId: "VIDEO_EDIT",
      evidenceSignalTypes: [...signalTypes],
      fitType: "POSSIBLE_NEED"
    });
  }
  if (restaurant || signalTypes.has(businessNeedSignalTypes.noVisibleBookingFlow)) {
    matches.push({
      productId: productIds.advertising,
      capabilityId: "CAMPAIGN_PLAN",
      evidenceSignalTypes: [...signalTypes],
      fitType: "POSSIBLE_NEED"
    });
  }
  if (restaurant || /brand|hotel|venue/i.test(`${entity.industry} ${entity.businessType}`)) {
    matches.push({
      productId: productIds.creatorNetwork,
      capabilityId: "CREATOR_MATCH",
      evidenceSignalTypes: [...signalTypes],
      fitType: "BRAND_OPPORTUNITY_CANDIDATE"
    });
  }
  if (signals.length) {
    matches.push({
      productId: productIds.business,
      capabilityId: "BUSINESS_ANALYZE",
      evidenceSignalTypes: [...signalTypes],
      fitType: "POSSIBLE_NEED"
    });
  }

  return matches;
}

export function createBrandOpportunityCandidate(entity = {}, matches = []) {
  const creator = matches.find((match) => match.productId === productIds.creatorNetwork);
  return creator
    ? {
        candidateType: "BrandOpportunityCandidate",
        businessId: entity.businessId,
        productId: productIds.creatorNetwork,
        capabilityId: "CREATOR_MATCH",
        dispatchEnabled: false,
        contactEnabled: false
      }
    : null;
}
