import { productIds } from "../capabilities/productCapabilityMap.js";
import {
  businessDataClasses,
  businessCurrencies,
  businessHealthStates,
  businessOfferStatuses,
  businessPaymentModels,
  businessPricingStatuses,
  businessProjectStatuses,
  clone,
  createId,
  nowIso,
  restrictedBusinessMetricKeys,
  safeArray
} from "./businessContracts.js";

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value != null && String(value).trim() !== "";
}

function fact(label, value, source = "CLIENT_PROVIDED", dataClass = businessDataClasses.clientPrivateData) {
  return {
    label,
    value: hasValue(value) ? value : "NOT_PROVIDED",
    source,
    dataClass
  };
}

function dimension(state, evidence, reasoning) {
  return { state, evidence, reasoning };
}

function inferDimensions(profile = {}, intake = {}) {
  const website = intake.website || profile.website;
  const description = intake.description || profile.description;
  const goals = safeArray(intake.goals).length ? intake.goals : profile.goals;
  const challenges = safeArray(intake.challenges).length ? intake.challenges : profile.challenges;
  const products = safeArray(intake.productsServices).length ? intake.productsServices : profile.productsServices;
  const channels = safeArray(intake.existingChannels);
  const metrics = intake.optionalMetrics || {};

  return {
    positioning: description && products.length
      ? dimension(businessHealthStates.healthy, ["description", "productsServices"], "Business has at least a basic description and offer surface.")
      : dimension(businessHealthStates.needsAttention, ["missing_description_or_products"], "Positioning needs a clearer description and product/service list."),
    offer: products.length
      ? dimension(businessHealthStates.healthy, ["productsServices"], "Products/services were provided.")
      : dimension(businessHealthStates.unknown, ["productsServices_not_provided"], "Offer cannot be assessed without product/service context."),
    digitalPresence: website
      ? dimension(businessHealthStates.healthy, ["website"], "Website was provided; quality still needs verification.")
      : dimension(businessHealthStates.needsAttention, ["website_not_provided"], "No website was provided, so digital presence needs review."),
    content: channels.length || safeArray(intake.socials).length || safeArray(profile.socialLinks).length
      ? dimension(businessHealthStates.unknown, ["channels_or_socials_provided"], "Presence exists but content quality/frequency is not verified.")
      : dimension(businessHealthStates.needsAttention, ["channels_not_provided"], "No content channels were provided."),
    acquisition: challenges.join(" ").toLowerCase().includes("acquisition") || goals.join(" ").toLowerCase().includes("customer")
      ? dimension(businessHealthStates.needsAttention, ["client_goal_or_challenge"], "Client explicitly points to acquisition/customer flow.")
      : dimension(businessHealthStates.unknown, ["acquisition_metrics_not_provided"], "Acquisition cannot be assessed without channel and lead data."),
    conversionPath: website
      ? dimension(businessHealthStates.unknown, ["website_provided"], "Conversion path needs website/form/booking verification.")
      : dimension(businessHealthStates.unknown, ["conversion_path_not_verified"], "No conversion path evidence was provided."),
    retention: hasValue(metrics.customers)
      ? dimension(businessHealthStates.unknown, ["customers_metric_provided"], "Customer count alone is not enough to assess retention.")
      : dimension(businessHealthStates.unknown, ["retention_data_not_provided"], "Retention data was not provided."),
    automationReadiness: website || channels.length
      ? dimension(businessHealthStates.needsAttention, ["manual_flow_likely"], "Automation opportunities may exist after mapping current process.")
      : dimension(businessHealthStates.unknown, ["process_not_mapped"], "Automation readiness cannot be assessed without process details."),
    measurementReadiness: Object.keys(metrics).length
      ? dimension(businessHealthStates.healthy, ["optional_metrics_provided"], "Some private metrics were provided voluntarily.")
      : dimension(businessHealthStates.needsAttention, ["metrics_not_provided"], "Revenue, leads, conversion and traffic were not provided.")
  };
}

function unknownMetrics(optionalMetrics = {}) {
  return restrictedBusinessMetricKeys
    .filter((key) => optionalMetrics[key] == null || optionalMetrics[key] === "")
    .map((key) => ({ metric: key, value: "UNKNOWN", reason: "NOT_PROVIDED" }));
}

export function createBusinessDiagnosis({ business, intake }) {
  const createdAt = nowIso();
  const optionalMetrics = intake.optionalMetrics || {};
  const goals = safeArray(intake.goals).length ? intake.goals : safeArray(business.goals);
  const challenges = safeArray(intake.challenges).length ? intake.challenges : safeArray(business.challenges);
  const website = intake.website || business.website;
  const dimensions = inferDimensions(business, intake);
  const risks = [];
  const opportunities = [];

  if (!website) risks.push("Digital presence cannot be verified because no website was provided.");
  if (!Object.keys(optionalMetrics).length) risks.push("Commercial metrics are not provided; revenue, traffic and conversion remain unknown.");
  if (challenges.length) opportunities.push("Convert stated challenges into prioritized acquisition and conversion work.");
  if (website) opportunities.push("Review website conversion path before proposing website or landing-page execution.");
  if (goals.length) opportunities.push("Use client goals to select ESSA Production, Website, Advertising and Lead Intelligence next steps.");

  return {
    modelType: "BusinessDiagnosis",
    diagnosisId: createId("business_diagnosis"),
    businessId: business.businessId,
    organizationId: business.organizationId,
    intakeId: intake.intakeId,
    facts: [
      fact("Business name", intake.businessName || business.name),
      fact("Industry", intake.industry || business.industry),
      fact("Website", website, "CLIENT_PROVIDED", businessDataClasses.publicBusinessData),
      fact("Description", intake.description || business.description),
      fact("Products/services", safeArray(intake.productsServices).length ? intake.productsServices : business.productsServices),
      fact("Goals", goals),
      fact("Challenges", challenges)
    ],
    observations: [
      website ? "Website was provided but not externally crawled in Sprint 01." : "No website was provided.",
      goals.length ? "Client provided at least one growth goal." : "No explicit growth goal was provided.",
      challenges.length ? "Client provided at least one challenge." : "No explicit challenge was provided."
    ],
    inferences: [
      goals.join(" ").toLowerCase().includes("sales") || challenges.join(" ").toLowerCase().includes("acquisition")
        ? "Growth work should prioritize acquisition and conversion before broad automation."
        : "ESSA needs more context before prioritizing acquisition, conversion or retention."
    ],
    unknowns: [
      ...unknownMetrics(optionalMetrics),
      { metric: "traffic", value: "UNKNOWN", reason: "NOT_PROVIDED" },
      { metric: "profitability", value: "UNKNOWN", reason: "NOT_PROVIDED" },
      { metric: "customerAcquisitionCost", value: "UNKNOWN", reason: "NOT_PROVIDED" },
      { metric: "competitorPerformance", value: "UNKNOWN", reason: "NOT_VERIFIED" }
    ],
    risks,
    opportunities,
    dimensions,
    sourceRefs: clone(intake.sourceRefs || []),
    dataPolicy: {
      privateMetricsStayPrivate: true,
      publicLeadIntelligenceExportAllowed: false
    },
    createdAt
  };
}

function capability(capabilityId, productId, reason) {
  return { capabilityId, productId, reason, executionEnabled: false };
}

export function createBusinessGrowthPlan({ business, diagnosis }) {
  const createdAt = nowIso();
  const needsWebsite = diagnosis.risks.some((item) => item.toLowerCase().includes("website"));
  const acquisitionNeed = diagnosis.inferences.some((item) => item.toLowerCase().includes("acquisition")) ||
    diagnosis.facts.some((item) => String(item.value).toLowerCase().includes("customer"));
  const actions = [
    {
      priority: "NOW",
      action: "Clarify offer, target audience and primary acquisition channel.",
      evidence: ["Business intake", "Diagnosis dimensions"]
    },
    needsWebsite
      ? {
          priority: "NOW",
          action: "Collect website/landing-page requirements before any build.",
          evidence: ["Digital presence gap"]
        }
      : {
          priority: "NEXT",
          action: "Review current website conversion path before changing it.",
          evidence: ["Website provided but not verified"]
        },
    {
      priority: acquisitionNeed ? "NOW" : "NEXT",
      action: "Prepare a campaign/content plan after offer and conversion path are reviewed.",
      evidence: ["Acquisition goal or missing acquisition data"]
    },
    {
      priority: "LATER",
      action: "Map automation opportunities after manual process and measurement are known.",
      evidence: ["Automation readiness is not fully known"]
    }
  ];

  return {
    modelType: "BusinessGrowthPlan",
    growthPlanId: createId("business_growth_plan"),
    businessId: business.businessId,
    organizationId: business.organizationId,
    diagnosisId: diagnosis.diagnosisId,
    title: "ESSA Business Growth Plan",
    currentSituation: diagnosis.facts,
    primaryProblems: diagnosis.risks,
    priorityOpportunities: diagnosis.opportunities,
    recommendedActions: actions,
    suggestedEssaCapabilities: [
      capability("BUSINESS_ANALYZE", productIds.business, "Business diagnosis and growth planning."),
      capability("WEBSITE_GENERATE", productIds.developer, "Website or landing-page path may help after approval."),
      capability("VIDEO_EDIT", productIds.production, "Production may support content execution after approval."),
      capability("CAMPAIGN_PLAN", productIds.advertising, "Advertising planning may support acquisition after approval."),
      capability("BUSINESS_DISCOVERY", productIds.business, "Lead Intelligence can support future discovery review."),
      capability("AUTOMATION_BUILD", productIds.workspace, "Automation is a later candidate after process mapping.")
    ],
    noAutoExecution: true,
    approvalBoundary: "PLAN_REQUIRES_USER_APPROVAL_BEFORE_EXECUTION_INTENT",
    evidenceReasoning: actions.map((item) => ({
      priority: item.priority,
      action: item.action,
      evidence: item.evidence
    })),
    createdAt
  };
}

export function createCommercialOfferDraft({ business, diagnosis, growthPlan }) {
  const createdAt = nowIso();

  return {
    modelType: "CommercialOfferDraft",
    offerId: createId("business_offer"),
    businessId: business.businessId,
    organizationId: business.organizationId,
    diagnosisId: diagnosis.diagnosisId,
    growthPlanId: growthPlan.growthPlanId,
    proposedScope: growthPlan.recommendedActions.filter((item) => item.priority === "NOW").map((item) => item.action),
    scope: growthPlan.recommendedActions.filter((item) => item.priority === "NOW").map((item) => item.action),
    recommendedCapabilities: growthPlan.suggestedEssaCapabilities.map((item) => item.capabilityId),
    deliverables: [
      "Business diagnosis review",
      "Growth plan refinement",
      "Execution-ready scope proposal",
      "Approval-gated next-step project"
    ],
    estimatedPhases: ["Diagnosis", "Plan", "Offer approval", "Execution intent preparation"],
    assumptions: [
      "Pricing is not configured in Sprint 02.",
      "No payment provider is active.",
      "Execution requires separate user approval."
    ],
    exclusions: [
      "No ad spend",
      "No automated outreach",
      "No fake analytics",
      "No payment collection"
    ],
    currency: businessCurrencies.usd,
    amount: null,
    priceStatus: businessPricingStatuses.notPriced,
    pricingStatus: businessPricingStatuses.notPriced,
    paymentModel: businessPaymentModels.oneTime,
    paymentSchedule: {
      model: businessPaymentModels.oneTime,
      due: "BEFORE_PROJECT_ACTIVATION",
      installments: []
    },
    billing: {
      recurringAmount: null,
      billingInterval: null,
      startDate: null,
      status: "CONFIG_REQUIRED",
      providerSubscriptionReference: null
    },
    performanceTerms: {
      status: "FUTURE_CONFIG_REQUIRED",
      sourceOfTruthRevenueDataRequired: true,
      contractualTermsRequired: true,
      attributionMethodRequired: true,
      legalReviewRequired: true
    },
    approvalStatus: businessOfferStatuses.awaitingApproval,
    paymentStatus: businessPricingStatuses.paymentNotConfigured,
    createdAt,
    updatedAt: createdAt
  };
}

export function createBusinessProjectWorkspace({ business, diagnosis, growthPlan, offer }) {
  const createdAt = nowIso();

  return {
    modelType: "BusinessProjectWorkspace",
    projectId: createId("business_project"),
    businessId: business.businessId,
    organizationId: business.organizationId,
    title: `${business.name || "Business"} Growth Project`,
    status: businessProjectStatuses.offerReady,
    goal: safeArray(business.goals)[0] || "Develop existing business",
    linkedDiagnosisId: diagnosis.diagnosisId,
    linkedGrowthPlanId: growthPlan.growthPlanId,
    linkedOfferId: offer.offerId,
    tasks: [
      { taskId: createId("task"), title: "Review diagnosis", status: "OPEN", requiredRole: "OWNER_OR_ADMIN" },
      { taskId: createId("task"), title: "Review growth plan", status: "OPEN", requiredRole: "OWNER_OR_ADMIN" },
      { taskId: createId("task"), title: "Approve, decline or request changes to offer", status: "OPEN", requiredRole: "OWNER_OR_ADMIN" }
    ],
    approvals: [
      {
        approvalId: createId("business_approval"),
        offerId: offer.offerId,
        status: offer.approvalStatus,
        paymentRequired: true,
        paymentConfigured: false
      }
    ],
    assetsMetadata: [],
    activityEvents: [
      { eventType: "PROJECT_CREATED", createdAt }
    ],
    createdAt,
    updatedAt: createdAt
  };
}
