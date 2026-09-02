import {
  acquisitionDemoTypes,
  acquisitionLifecycleStates,
  createCanonicalDemoPlan,
  createDemoRecommendation,
  demoPlanStatuses
} from "./businessAcquisitionContracts.js";
import { demoTypeRegistry, getDemoTypeDefinition } from "./demoTypeRegistry.js";
import { evaluateDemoGenerationSafetyGate } from "./demoSafetyGates.js";

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function haystack(...items) {
  return items.flat().filter(Boolean).join(" ").toLowerCase();
}

function getBusinessContext(prospect = {}) {
  const text = haystack(prospect.businessType, prospect.industry, prospect.subIndustry, prospect.publicDescription);
  if (/restaurant|bistro|cafe|coffee|food/.test(text)) return /cafe|coffee/.test(text) ? "CAFE" : "RESTAURANT";
  if (/hotel|hospitality|venue|room|stay/.test(text)) return "HOTEL";
  if (/shop|retail|store|boutique|assortment|product/.test(text)) return "RETAIL";
  if (/developer|real estate development|construction|builder|property/.test(text)) {
    return /developer|development|property/.test(text) ? "DEVELOPER" : "CONSTRUCTION";
  }
  if (/service|studio|clinic|agency|consult/.test(text)) return "SERVICE";
  return "GENERAL_BUSINESS";
}

function hasSignal(signals = [], pattern) {
  return signals.some((signal) => pattern.test(haystack(signal.signalType, signal.inferredNeed, signal.observedEvidence)));
}

function hasAuditText(digitalAudit = {}, pattern) {
  return pattern.test(haystack(
    digitalAudit.observedFacts,
    digitalAudit.inferredOpportunities,
    digitalAudit.missingEvidence,
    digitalAudit.recommendedDemoTypes
  ));
}

export function deriveDemoOpportunityCodes({ prospect = {}, digitalAudit = {}, needSignals = [] } = {}) {
  const text = haystack(prospect.businessType, prospect.industry, prospect.subIndustry, prospect.publicDescription);
  const codes = [];
  if (!prospect.website || hasSignal(needSignals, /NO_WEBSITE_FOUND/i) || hasAuditText(digitalAudit, /no public website|front-door/i)) {
    codes.push("NO_WEBSITE_FOUND");
  }
  if (hasSignal(needSignals, /OUTDATED_WEB_EXPERIENCE/i) || /old website|outdated/.test(text) || hasAuditText(digitalAudit, /outdated|front-door/i)) {
    codes.push("OUTDATED_WEB_EXPERIENCE");
  }
  if (hasSignal(needSignals, /NO_VISIBLE_BOOKING_FLOW|booking/i) ||
    /booking absent|booking|hotel|venue|room|stay/.test(text) ||
    hasAuditText(digitalAudit, /booking|conversion-flow/i)) {
    codes.push("NO_VISIBLE_BOOKING_FLOW");
  }
  if (hasSignal(needSignals, /NO_SHORT_FORM_CONTENT_FOUND|short-form|content/i) || /low visible short-form|visual/.test(text) || hasAuditText(digitalAudit, /content|presentation/i)) {
    codes.push("WEAK_SOCIAL_CONTENT");
  }
  if (/restaurant|bistro|cafe|food|menu|order/.test(text)) codes.push("MENU_OR_ORDER_OPPORTUNITY", "VISUAL_BUSINESS");
  if (/hotel|venue|room|stay/.test(text)) codes.push("VISUAL_BUSINESS", "HOTEL_BOOKING_EXPECTATION");
  if (/shop|retail|store|catalog|assortment|product/.test(text)) codes.push("PRODUCT_ASSORTMENT_VISIBLE", "VISUAL_BUSINESS");
  if (/construction|builder|portfolio|project/.test(text)) codes.push("PROJECT_WORK_VISIBLE", "LEAD_CAPTURE_OPPORTUNITY");
  if (/developer|development|property|unit|investor/.test(text)) codes.push("DEVELOPMENT_PRESENTATION_OPPORTUNITY", "INVESTOR_LEAD_FLOW", "LEAD_CAPTURE_OPPORTUNITY");
  if (prospect.publicBusinessEmail || prospect.publicBusinessPhone) codes.push("CONTACT_PATH_PRESENT");
  if (/service|studio|agency|consult|construction/.test(text)) codes.push("CLEAR_SERVICE_INFORMATION");
  if (/dashboard|operations|pipeline|analytics/.test(text)) codes.push("OPERATIONS_VISIBILITY_OPPORTUNITY");
  return unique(codes);
}

function contextMatches(definition, businessContext) {
  if (!definition) return false;
  return definition.supportedBusinessContexts.includes(businessContext) ||
    definition.supportedBusinessContexts.includes("GENERAL_BUSINESS") ||
    (businessContext === "CAFE" && definition.supportedBusinessContexts.includes("RESTAURANT")) ||
    (businessContext === "CONSTRUCTION" && definition.supportedBusinessContexts.includes("DEVELOPER"));
}

function scoreDefinition(definition, { businessContext, opportunityCodes, digitalAudit, prospect }) {
  const matchedTriggers = definition.triggerCodes.filter((code) => opportunityCodes.includes(code));
  const recommendedBonus = (digitalAudit.recommendedDemoTypes || []).includes(definition.demoType) ? 6 : 0;
  const contextBonus = contextMatches(definition, businessContext) ? 16 : -20;
  const evidenceBonus = matchedTriggers.length * 12;
  const priorityBonus = Math.floor(definition.priority / 10);
  const sourceBonus = (prospect.sourceRefs || []).length > 0 ? 3 : 0;
  return {
    matchedTriggers,
    score: contextBonus + evidenceBonus + priorityBonus + recommendedBonus + sourceBonus
  };
}

function targetProblemFor(demoType, businessContext) {
  const map = {
    [acquisitionDemoTypes.bookingFlowPreview]: "Public path to booking or inquiry is not clearly demonstrated.",
    [acquisitionDemoTypes.menuOrderPreview]: "Menu, order or reservation value is easier to show as a small flow than as a full site.",
    [acquisitionDemoTypes.storefrontPreview]: "Product assortment can be communicated with a lightweight storefront preview.",
    [acquisitionDemoTypes.catalogPreviewV2]: "Product or offer range needs a structured browsing preview.",
    [acquisitionDemoTypes.projectPortfolioPreview]: "Project work and credibility need a visual portfolio pattern.",
    [acquisitionDemoTypes.developerProjectPreview]: "Development presentation and lead capture need a focused project preview.",
    [acquisitionDemoTypes.contentCreativePreview]: "Visual business can understand value through a content creative concept.",
    [acquisitionDemoTypes.businessDashboardPreview]: "Business visibility can be shown through a dashboard schema preview.",
    [acquisitionDemoTypes.serviceLandingPreview]: "Service value and contact path can be shown in a focused landing preview.",
    [acquisitionDemoTypes.homepageConcept]: "The public digital front door can be clarified with a homepage concept."
  };
  return map[demoType] || `Smallest useful demo for ${businessContext}.`;
}

function expectedValueFor(demoType) {
  const map = {
    [acquisitionDemoTypes.bookingFlowPreview]: "Make the booking journey tangible before any production build.",
    [acquisitionDemoTypes.menuOrderPreview]: "Show how a guest could explore and start an order without claiming live ordering.",
    [acquisitionDemoTypes.storefrontPreview]: "Show a compact commerce path without creating a real store.",
    [acquisitionDemoTypes.catalogPreviewV2]: "Show how offers could be organized for inquiry.",
    [acquisitionDemoTypes.projectPortfolioPreview]: "Show credibility and lead capture around visible project work.",
    [acquisitionDemoTypes.developerProjectPreview]: "Show investor/buyer presentation flow without selling inventory.",
    [acquisitionDemoTypes.contentCreativePreview]: "Show creative direction without generating or posting media.",
    [acquisitionDemoTypes.businessDashboardPreview]: "Show operational visibility without inventing metrics.",
    [acquisitionDemoTypes.serviceLandingPreview]: "Show a clear service request path.",
    [acquisitionDemoTypes.homepageConcept]: "Show brand clarity and contact path as a concept."
  };
  return map[demoType] || "Show a bounded preview of ESSA value.";
}

function sourceSnapshotRefs(prospect = {}) {
  return (prospect.sourceRefs || []).map((source) => source.sourceId || source.sourceRef).filter(Boolean);
}

function buildRecommendation(definition, scoring, context) {
  const { prospect, digitalAudit, businessContext } = context;
  return createDemoRecommendation({
    prospectId: prospect.prospectId,
    opportunityAssessmentId: digitalAudit.auditId,
    demoType: definition.demoType,
    businessContext,
    targetProblem: targetProblemFor(definition.demoType, businessContext),
    expectedValue: expectedValueFor(definition.demoType),
    evidenceRefs: scoring.matchedTriggers,
    sourceSnapshotRefs: sourceSnapshotRefs(prospect),
    reasoningCodes: unique([
      `CONTEXT_${businessContext}`,
      ...scoring.matchedTriggers,
      scoring.matchedTriggers.length ? "EVIDENCE_MATCHED" : null
    ]),
    score: scoring.score,
    priority: definition.priority,
    requiredCapabilities: definition.requiredCapabilities,
    optionalCapabilities: definition.optionalCapabilities,
    restrictions: [
      "DEMO_PLAN_ONLY",
      "NO_PROVIDER_GENERATION_PHASE_B",
      "NO_PRODUCTION_ASSET",
      "NO_OFFICIAL_WEBSITE_CLAIM",
      "NO_OUTREACH_OR_CRM_MUTATION"
    ],
    assumptions: [
      ...(digitalAudit.missingEvidence || []).includes("owner_authority_not_verified") ? ["Owner authority is not verified."] : [],
      "Visual direction must be replaced with client-approved materials before any production work."
    ],
    missingInputs: unique([
      ...(digitalAudit.missingEvidence || []),
      "client_approved_brand_assets",
      "commercial_acceptance"
    ]),
    riskClass: definition.riskClass,
    estimatedCostClass: definition.estimatedCostClass,
    approvalRequirements: definition.approvalRequirements,
    providerRequirements: definition.providerRequirements
  });
}

function createBlockedDemoPlan({ prospect, digitalAudit, score, reason, safetyGate }) {
  return createCanonicalDemoPlan({
    prospectId: prospect?.prospectId,
    opportunityAssessmentId: digitalAudit?.auditId,
    selectedRecommendation: null,
    rejectedAlternatives: [],
    demoType: null,
    businessContext: getBusinessContext(prospect),
    targetProblem: reason,
    expectedValue: "No demo is selected until evidence and safety gates pass.",
    evidenceRefs: [],
    sourceSnapshotRefs: sourceSnapshotRefs(prospect),
    generationStatus: reason,
    missingInputs: digitalAudit?.missingEvidence || [],
    restrictions: ["NO_DEMO_SELECTED", "EXECUTION_DISABLED_PHASE_B"],
    reasoningCodes: [reason, `SCORE_${score?.totalClass || "UNKNOWN"}`],
    artifactPlan: [],
    safetyGate
  });
}

export function createContextAwareDemoPlan({
  prospect = {},
  digitalAudit = {},
  score = {},
  needSignals = [],
  minimumOpportunityScore = 9
} = {}) {
  const opportunityCodes = deriveDemoOpportunityCodes({ prospect, digitalAudit, needSignals });
  const businessContext = getBusinessContext(prospect);
  const candidateContext = { prospect, digitalAudit, businessContext };
  const candidateRecommendations = demoTypeRegistry
    .map((definition) => {
      const scoring = scoreDefinition(definition, { businessContext, opportunityCodes, digitalAudit, prospect });
      return buildRecommendation(definition, scoring, candidateContext);
    })
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score || b.priority - a.priority || String(a.demoType).localeCompare(String(b.demoType)));

  const selected = candidateRecommendations[0] || null;
  const safetyGate = evaluateDemoGenerationSafetyGate({
    prospect,
    digitalAudit,
    score,
    selectedRecommendation: selected,
    minimumOpportunityScore
  });

  if (!selected || !safetyGate.demoPlanAllowed) {
    return {
      demoPlan: createBlockedDemoPlan({
        prospect,
        digitalAudit,
        score,
        reason: safetyGate.status || demoPlanStatuses.blockedSafetyGate,
        safetyGate
      }),
      recommendations: candidateRecommendations,
      opportunityCodes,
      providerCalls: 0,
      externalCalls: 0
    };
  }

  const definition = getDemoTypeDefinition(selected.demoType);
  const rejectedAlternatives = candidateRecommendations.slice(1).map((recommendation) => ({
    ...recommendation,
    rejected: true,
    rejectionReasons: [
      recommendation.score === selected.score ? "TIE_LOST_BY_PRIORITY_OR_STABLE_ORDER" : "LOWER_CONTEXT_EVIDENCE_SCORE"
    ]
  }));

  const artifactPlan = (definition?.artifactTemplates || []).map((item) => ({
    ...item,
    structuredGenerationBrief: {
      ...item.structuredGenerationBrief,
      prospectId: prospect.prospectId,
      evidenceRefs: selected.evidenceRefs,
      assumptions: selected.assumptions
    }
  }));

  const demoPlan = createCanonicalDemoPlan({
    prospectId: prospect.prospectId,
    opportunityAssessmentId: digitalAudit.auditId,
    selectedRecommendation: selected,
    rejectedAlternatives,
    demoType: selected.demoType,
    businessContext,
    artifactPlan,
    generationSteps: [
      "review_public_evidence",
      "prepare_preview_spec",
      "hold_for_human_generation_approval",
      "future_generated_preview_requires_separate_boundary"
    ],
    contentInputs: {
      observedFacts: digitalAudit.observedFacts || [],
      inferredOpportunities: digitalAudit.inferredOpportunities || [],
      prohibitedInterpretations: digitalAudit.prohibitedInterpretations || []
    },
    brandInputs: {
      legalOrDisplayName: prospect.legalOrDisplayName,
      website: prospect.website,
      socialProfiles: prospect.socialProfiles || [],
      publicDescription: prospect.publicDescription
    },
    generationStatus: demoPlanStatuses.executionDisabled,
    safetyGate
  });

  return {
    demoPlan,
    recommendations: [selected, ...rejectedAlternatives],
    opportunityCodes,
    providerCalls: 0,
    externalCalls: 0
  };
}

export { getBusinessContext };
