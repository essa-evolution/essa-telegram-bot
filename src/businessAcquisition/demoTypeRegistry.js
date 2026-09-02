import {
  capabilityCostClasses,
  capabilityRiskClasses
} from "../capabilities/capabilityContracts.js";
import { createCapabilityCompositionPlan } from "../capabilities/capabilityComposition.js";
import { getCapability } from "../capabilities/capabilityRegistry.js";
import { getProviderCandidatesForCapability } from "../capabilities/providerCapabilityMap.js";
import { acquisitionDemoTypes, createDemoArtifactPlan } from "./businessAcquisitionContracts.js";

const websiteCapabilities = ["WEBSITE_GENERATE", "ARCHITECTURE_DESIGN", "UI_GENERATE", "CODE_GENERATE"];
const verificationCapabilities = ["BROWSER_OBSERVE", "UI_VERIFY"];

function capabilityPlan(primaryCapabilityId, optionalCapabilities = []) {
  const composition = createCapabilityCompositionPlan({
    goal: `Business acquisition demo plan for ${primaryCapabilityId}`,
    primaryCapabilityId
  });
  const requiredCapabilities = [...new Set([
    ...composition.requiredCapabilities,
    ...verificationCapabilities.filter((id) => websiteCapabilities.includes(primaryCapabilityId) || primaryCapabilityId === "WEBSITE_GENERATE")
  ])];
  const allCapabilities = [...new Set([...requiredCapabilities, ...optionalCapabilities])];
  const providerRequirements = allCapabilities.flatMap((capabilityId) =>
    getProviderCandidatesForCapability(capabilityId).map((candidate) => ({
      capabilityId,
      providerId: candidate.providerId,
      supportStatus: candidate.supportStatus,
      executableNow: candidate.executableNow
    }))
  );
  const capabilityContracts = allCapabilities.map((id) => getCapability(id)).filter(Boolean);
  return {
    requiredCapabilities,
    optionalCapabilities,
    providerRequirements,
    estimatedCostClass: capabilityContracts.some((item) => item.costClass === capabilityCostClasses.paidExternal)
      ? capabilityCostClasses.paidExternal
      : capabilityContracts.some((item) => item.costClass === capabilityCostClasses.metered)
      ? capabilityCostClasses.metered
      : capabilityCostClasses.localCompute,
    riskClass: capabilityContracts.some((item) => item.riskClass === capabilityRiskClasses.publish)
      ? capabilityRiskClasses.publish
      : capabilityContracts.some((item) => item.riskClass === capabilityRiskClasses.high)
      ? capabilityRiskClasses.high
      : capabilityRiskClasses.medium,
    approvalRequirements: [
      "human_review_before_generation",
      "commercial_activation_before_production_handoff",
      ...composition.approvalPoints.map((point) => point.capabilityId || point.reason).filter(Boolean)
    ]
  };
}

function websiteArtifactPlan(demoType, title, sections, proposedCta, extra = {}) {
  return createDemoArtifactPlan({
    artifactType: "PAGE_WIREFRAME_SPEC",
    title,
    purpose: extra.purpose || "Show the smallest useful public demo concept.",
    contentStructure: sections,
    proposedCta,
    visualDirection: extra.visualDirection || "Use public brand cues only; no official identity claim.",
    requiredImages: extra.requiredImages || ["publicly provided or later client-approved images"],
    structuredGenerationBrief: {
      demoType,
      output: "preview_spec_only",
      forbid: ["official_website_claim", "fabricated_prices", "fabricated_reviews", "production_domain"]
    },
    previewMetadata: {
      previewLabel: "DEMO / CONCEPT",
      generationEnabled: false
    }
  });
}

export const demoTypeRegistry = [
  {
    demoType: acquisitionDemoTypes.homepageConcept,
    canonicalName: "Homepage concept",
    supportedBusinessContexts: ["GENERAL_BUSINESS", "RESTAURANT", "HOTEL", "RETAIL", "SERVICE", "CONSTRUCTION"],
    triggerCodes: ["NO_WEBSITE_FOUND", "OUTDATED_WEB_EXPERIENCE"],
    priority: 45,
    ...capabilityPlan("WEBSITE_GENERATE", ["TEXT_EDIT", "IMAGE_GENERATE"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.homepageConcept, "Homepage concept spec", ["hero", "offer summary", "trust markers", "contact CTA"], "Request a consultation")
    ]
  },
  {
    demoType: acquisitionDemoTypes.serviceLandingPreview,
    canonicalName: "Service landing preview",
    supportedBusinessContexts: ["SERVICE", "GENERAL_BUSINESS", "CONSTRUCTION"],
    triggerCodes: ["NO_WEBSITE_FOUND", "CLEAR_SERVICE_INFORMATION", "CONTACT_PATH_PRESENT"],
    priority: 60,
    ...capabilityPlan("WEBSITE_GENERATE", ["TEXT_EDIT"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.serviceLandingPreview, "Service landing spec", ["service promise", "service list", "proof placeholders", "request form"], "Request a quote")
    ]
  },
  {
    demoType: acquisitionDemoTypes.catalogPreviewV2,
    canonicalName: "Catalog preview",
    supportedBusinessContexts: ["RETAIL", "RESTAURANT", "LOCAL_SHOP"],
    triggerCodes: ["PRODUCT_ASSORTMENT_VISIBLE", "OUTDATED_WEB_EXPERIENCE"],
    priority: 70,
    ...capabilityPlan("WEBSITE_GENERATE", ["IMAGE_GENERATE", "TEXT_EDIT"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.catalogPreviewV2, "Catalog preview spec", ["category grid", "featured items", "item detail pattern", "contact/order CTA"], "Ask about availability")
    ]
  },
  {
    demoType: acquisitionDemoTypes.storefrontPreview,
    canonicalName: "Storefront preview",
    supportedBusinessContexts: ["RETAIL", "LOCAL_SHOP"],
    triggerCodes: ["PRODUCT_ASSORTMENT_VISIBLE", "NO_WEBSITE_FOUND"],
    priority: 72,
    ...capabilityPlan("WEBSITE_GENERATE", ["TEXT_EDIT"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.storefrontPreview, "Storefront preview spec", ["store intro", "categories", "popular products", "WhatsApp/order CTA"], "Order by message")
    ]
  },
  {
    demoType: acquisitionDemoTypes.bookingFlowPreview,
    canonicalName: "Booking flow preview",
    supportedBusinessContexts: ["HOTEL", "HOSPITALITY", "RESTAURANT"],
    triggerCodes: ["NO_VISIBLE_BOOKING_FLOW", "HOTEL_BOOKING_EXPECTATION"],
    priority: 90,
    ...capabilityPlan("WEBSITE_GENERATE", ["UI_GENERATE"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.bookingFlowPreview, "Booking flow preview spec", ["availability step", "guest details", "confirmation screen", "follow-up CTA"], "Check availability")
    ]
  },
  {
    demoType: acquisitionDemoTypes.menuOrderPreview,
    canonicalName: "Menu/order preview",
    supportedBusinessContexts: ["RESTAURANT", "CAFE"],
    triggerCodes: ["MENU_OR_ORDER_OPPORTUNITY", "NO_WEBSITE_FOUND", "NO_VISIBLE_BOOKING_FLOW"],
    priority: 88,
    ...capabilityPlan("WEBSITE_GENERATE", ["TEXT_EDIT"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.menuOrderPreview, "Menu/order preview spec", ["menu sections", "dish card pattern", "pickup/order CTA", "contact footer"], "Start an order")
    ]
  },
  {
    demoType: acquisitionDemoTypes.projectPortfolioPreview,
    canonicalName: "Project portfolio preview",
    supportedBusinessContexts: ["CONSTRUCTION", "DEVELOPER"],
    triggerCodes: ["PROJECT_WORK_VISIBLE", "LEAD_CAPTURE_OPPORTUNITY"],
    priority: 82,
    ...capabilityPlan("WEBSITE_GENERATE", ["IMAGE_GENERATE", "TEXT_EDIT"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.projectPortfolioPreview, "Project portfolio spec", ["project cards", "service capabilities", "case placeholders", "quote CTA"], "Request a project estimate")
    ]
  },
  {
    demoType: acquisitionDemoTypes.developerProjectPreview,
    canonicalName: "Developer project preview",
    supportedBusinessContexts: ["DEVELOPER", "CONSTRUCTION"],
    triggerCodes: ["DEVELOPMENT_PRESENTATION_OPPORTUNITY", "INVESTOR_LEAD_FLOW"],
    priority: 84,
    ...capabilityPlan("WEBSITE_GENERATE", ["PROPERTY_PRESENTATION", "INVESTMENT_PACKAGE"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.developerProjectPreview, "Developer project preview spec", ["project overview", "unit/catalog pattern", "location/value section", "investor lead CTA"], "Request project details")
    ]
  },
  {
    demoType: acquisitionDemoTypes.leadCapturePreview,
    canonicalName: "Lead capture preview",
    supportedBusinessContexts: ["SERVICE", "CONSTRUCTION", "DEVELOPER", "GENERAL_BUSINESS"],
    triggerCodes: ["CONTACT_PATH_PRESENT", "LEAD_CAPTURE_OPPORTUNITY"],
    priority: 58,
    ...capabilityPlan("WEBSITE_GENERATE", ["MARKETING_PLAN"]),
    artifactTemplates: [
      websiteArtifactPlan(acquisitionDemoTypes.leadCapturePreview, "Lead capture preview spec", ["offer summary", "qualification questions", "contact form", "follow-up promise"], "Send request")
    ]
  },
  {
    demoType: acquisitionDemoTypes.contentCreativePreview,
    canonicalName: "Content creative preview",
    supportedBusinessContexts: ["RESTAURANT", "CAFE", "HOTEL", "RETAIL", "LOCAL_SHOP"],
    triggerCodes: ["WEAK_SOCIAL_CONTENT", "VISUAL_BUSINESS"],
    priority: 68,
    ...capabilityPlan("CREATIVE_BRIEF", ["CONTENT_PLAN", "AD_CREATIVE_GENERATE"]),
    artifactTemplates: [
      createDemoArtifactPlan({
        artifactType: "CONTENT_CREATIVE_BRIEF",
        title: "Short-form creative preview brief",
        purpose: "Show a public-content concept without creating or publishing media.",
        contentStructure: ["hook options", "shot list", "caption angle", "CTA"],
        proposedCta: "View the concept",
        visualDirection: "Use only public category cues and later client-approved media.",
        requiredImages: ["client-approved visual references before generation"],
        structuredGenerationBrief: {
          output: "creative_brief_only",
          forbid: ["generated_media", "posting", "fake_testimonials", "identity_impersonation"]
        },
        previewMetadata: { previewLabel: "DEMO / CONCEPT", generationEnabled: false }
      })
    ]
  },
  {
    demoType: acquisitionDemoTypes.businessDashboardPreview,
    canonicalName: "Business dashboard preview",
    supportedBusinessContexts: ["GENERAL_BUSINESS", "SERVICE", "RETAIL", "CONSTRUCTION"],
    triggerCodes: ["OPERATIONS_VISIBILITY_OPPORTUNITY"],
    priority: 35,
    ...capabilityPlan("BUSINESS_ANALYZE", ["BUSINESS_GROWTH_PLAN"]),
    artifactTemplates: [
      createDemoArtifactPlan({
        artifactType: "DASHBOARD_SCHEMA_PREVIEW",
        title: "Business dashboard preview schema",
        purpose: "Show operational visibility concept from user-approved business metrics later.",
        contentStructure: ["lead summary", "sales pipeline placeholders", "content economics placeholders", "next actions"],
        proposedCta: "Review dashboard setup",
        structuredGenerationBrief: {
          output: "schema_preview_only",
          forbid: ["fake_revenue", "fake_customer_data", "live_tracking"]
        },
        previewMetadata: { previewLabel: "DEMO / CONCEPT", generationEnabled: false }
      })
    ]
  }
];

export function getDemoTypeDefinition(demoType) {
  return demoTypeRegistry.find((item) => item.demoType === demoType) || null;
}

export function listDemoTypes() {
  return demoTypeRegistry.map((item) => ({
    demoType: item.demoType,
    canonicalName: item.canonicalName,
    supportedBusinessContexts: [...item.supportedBusinessContexts],
    triggerCodes: [...item.triggerCodes],
    requiredCapabilities: [...item.requiredCapabilities],
    optionalCapabilities: [...item.optionalCapabilities],
    riskClass: item.riskClass,
    estimatedCostClass: item.estimatedCostClass,
    executionEnabled: false
  }));
}
