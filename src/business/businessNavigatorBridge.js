import { productIds } from "../capabilities/productCapabilityMap.js";

export const businessIntents = {
  growth: "BUSINESS_GROWTH",
  partner: "ESSA_BUSINESS_PARTNER"
};

export function detectBusinessNavigatorIntent(text = "") {
  const value = String(text || "").toLowerCase();
  if (value.includes("передать развитие") || value.includes("external growth") || value.includes("business partner")) {
    return businessIntents.partner;
  }
  if (
    value.includes("развить") ||
    value.includes("рост") ||
    value.includes("growth") ||
    value.includes("увеличить продажи") ||
    value.includes("business")
  ) {
    return businessIntents.growth;
  }
  return null;
}

export function buildBusinessNavigatorContext({
  user,
  organization,
  business,
  workspace,
  project,
  permissions = {},
  stage = "INTAKE"
} = {}) {
  return {
    contextType: "BusinessNavigatorContext",
    product: productIds.business,
    intent: businessIntents.growth,
    businessId: business?.businessId || null,
    organizationId: organization?.organizationId || business?.organizationId || null,
    workspaceId: workspace?.workspaceId || project?.workspaceId || null,
    projectId: project?.projectId || null,
    stage,
    currentUser: user ? { userId: user.userId || user.id || user } : null,
    permissions,
    availableActions: [
      "COMPLETE_INTAKE",
      "REVIEW_DIAGNOSIS",
      "REVIEW_GROWTH_PLAN",
      "APPROVE_REQUEST_CHANGES_OR_DECLINE_OFFER",
      "REQUEST_ESSA_BUSINESS_PARTNER"
    ],
    privateDataPolicy: {
      tenantScoped: true,
      doNotExposeOtherTenantData: true,
      doNotExportPrivateMetricsToLeadIntelligence: true
    }
  };
}
