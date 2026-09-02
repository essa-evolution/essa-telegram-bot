import { acquisitionDemoTypes, createDigitalOpportunityAudit } from "./businessAcquisitionContracts.js";

function hasSignal(signals = [], pattern) {
  return signals.some((signal) => pattern.test(`${signal.signalType} ${signal.inferredNeed} ${signal.observedEvidence}`));
}

function observedFromProspect(prospect = {}) {
  const facts = [
    prospect.legalOrDisplayName ? `Public business name observed: ${prospect.legalOrDisplayName}.` : null,
    prospect.city || prospect.country ? `Public location observed: ${[prospect.city, prospect.region, prospect.country].filter(Boolean).join(", ")}.` : null,
    prospect.website ? `Public website/domain observed: ${prospect.website}.` : "No public website/domain was present in the checked source record.",
    prospect.publicBusinessEmail ? "Public business email was present in the checked source record." : null,
    prospect.publicBusinessPhone ? "Public business phone was present in the checked source record." : null,
    prospect.socialProfiles?.length ? "Public social profile link was present in the checked source record." : "No public social profile was present in the checked source record."
  ];
  return facts.filter(Boolean);
}

function opportunitiesFromSignals(signals = [], essaMatches = []) {
  const opportunities = [];
  if (hasSignal(signals, /NO_WEBSITE_FOUND|OUTDATED_WEB_EXPERIENCE|website/i)) {
    opportunities.push("Potential digital front-door improvement.");
  }
  if (hasSignal(signals, /NO_VISIBLE_BOOKING_FLOW|booking|conversion/i)) {
    opportunities.push("Potential booking, inquiry or conversion-flow improvement.");
  }
  if (hasSignal(signals, /NO_SHORT_FORM_CONTENT_FOUND|content|short-form/i)) {
    opportunities.push("Potential content or public presentation improvement.");
  }
  if (essaMatches.some((match) => match.capabilityId === "CAMPAIGN_PLAN")) {
    opportunities.push("Potential campaign planning opportunity after offer and channel review.");
  }
  if (essaMatches.some((match) => match.capabilityId === "BUSINESS_ANALYZE")) {
    opportunities.push("Potential ESSA Business audit/growth planning opportunity.");
  }
  return [...new Set(opportunities)];
}

function demoTypesForContext(prospect = {}, signals = []) {
  const text = `${prospect.businessType} ${prospect.industry} ${prospect.subIndustry}`.toLowerCase();
  const demos = [];
  if (/restaurant|cafe|bistro|food/.test(text)) demos.push(acquisitionDemoTypes.restaurantMenuOrder);
  if (/hotel|hospitality|venue/.test(text)) demos.push(acquisitionDemoTypes.hotelBookingExperience);
  if (/developer|construction|real estate|property/.test(text)) demos.push(acquisitionDemoTypes.developerPresentation);
  if (hasSignal(signals, /NO_WEBSITE_FOUND|OUTDATED_WEB_EXPERIENCE|website/i)) demos.push(acquisitionDemoTypes.homepageRedesign);
  if (hasSignal(signals, /catalog|order|menu/i)) demos.push(acquisitionDemoTypes.catalogPreview);
  if (!demos.length) demos.push(acquisitionDemoTypes.serviceLandingPage);
  return [...new Set(demos)];
}

export function createProspectDigitalOpportunityAudit({ prospect, needSignals = [], essaMatches = [] } = {}) {
  const inferredOpportunities = opportunitiesFromSignals(needSignals, essaMatches);
  return createDigitalOpportunityAudit({
    prospectId: prospect?.prospectId,
    observedFacts: observedFromProspect(prospect),
    inferredOpportunities,
    prohibitedInterpretations: [
      "Do not classify the business as good or bad.",
      "Do not claim lost revenue, poor ownership, or business failure without verified evidence.",
      "Do not claim ESSA represents or operates the business before acceptance and activation."
    ],
    missingEvidence: [
      !prospect?.website ? "live_website_quality_not_verified" : null,
      "traffic_not_verified",
      "conversion_not_verified",
      "revenue_not_verified",
      "owner_authority_not_verified"
    ].filter(Boolean),
    recommendedDemoTypes: demoTypesForContext(prospect, needSignals),
    sourceRefs: prospect?.sourceRefs || []
  });
}
