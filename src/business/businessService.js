import {
  createBusinessDiagnosis,
  createBusinessGrowthPlan,
  createBusinessProjectWorkspace,
  createCommercialOfferDraft
} from "./businessDiagnosis.js";
import { businessOfferStatuses, clone, publicBusinessProjection } from "./businessContracts.js";
import { defaultBusinessStore } from "./businessStore.js";

function resultOrThrow(result) {
  if (!result?.ok) {
    const error = new Error(result?.reason || result?.errors?.join(",") || "business_operation_failed");
    error.status = result?.status || 400;
    error.result = result;
    throw error;
  }
  return result;
}

export function createBusinessFlowService(store = defaultBusinessStore) {
  function createProfile(actorUserId, input = {}) {
    return store.createProfile(actorUserId, input);
  }

  function updateProfile(actorUserId, businessId, patch = {}) {
    return store.updateProfile(actorUserId, businessId, patch);
  }

  function runGrowthIntake(actorUserId, businessId, input = {}) {
    const intakeResult = resultOrThrow(store.saveIntake(actorUserId, businessId, input));
    const diagnosis = createBusinessDiagnosis({
      business: intakeResult.business,
      intake: intakeResult.intake
    });
    const diagnosisResult = resultOrThrow(store.saveDiagnosis(actorUserId, businessId, diagnosis));
    const growthPlan = createBusinessGrowthPlan({
      business: intakeResult.business,
      diagnosis: diagnosisResult.diagnosis
    });
    const growthPlanResult = resultOrThrow(store.saveGrowthPlan(actorUserId, businessId, growthPlan));
    const offer = createCommercialOfferDraft({
      business: intakeResult.business,
      diagnosis: diagnosisResult.diagnosis,
      growthPlan: growthPlanResult.growthPlan
    });
    const offerResult = resultOrThrow(store.saveOffer(actorUserId, businessId, offer));
    const project = createBusinessProjectWorkspace({
      business: intakeResult.business,
      diagnosis: diagnosisResult.diagnosis,
      growthPlan: growthPlanResult.growthPlan,
      offer: offerResult.offer
    });
    const projectResult = resultOrThrow(store.saveProject(actorUserId, businessId, project));

    return {
      ok: true,
      business: intakeResult.business,
      workspace: intakeResult.workspace,
      intake: intakeResult.intake,
      diagnosis: diagnosisResult.diagnosis,
      growthPlan: growthPlanResult.growthPlan,
      offer: offerResult.offer,
      project: projectResult.project
    };
  }

  function decideOffer(actorUserId, businessId, offerId, decision, notes = "") {
    const mapping = {
      approve: businessOfferStatuses.approved,
      request_changes: businessOfferStatuses.changesRequested,
      decline: businessOfferStatuses.declined
    };
    return store.updateOfferStatus(actorUserId, businessId, offerId, mapping[decision] || decision, notes);
  }

  function configureOfferCommercialTerms(actorUserId, businessId, offerId, input = {}) {
    return store.configureOfferCommercialTerms(actorUserId, businessId, offerId, input);
  }

  async function createPaymentRequest(actorUserId, businessId, offerId, input = {}) {
    return store.createPaymentRequest(actorUserId, businessId, offerId, input);
  }

  function verifyManualPayment(actorUserId, businessId, paymentIntentId, input = {}) {
    return store.verifyManualPayment(actorUserId, businessId, paymentIntentId, input);
  }

  function startCommercialOnboarding(actorUserId, businessId, paymentIntentId, input = {}) {
    return store.startCommercialOnboarding(actorUserId, businessId, paymentIntentId, input);
  }

  function activateCommercialProject(actorUserId, businessId, paymentIntentId, input = {}) {
    return store.activateCommercialProject(actorUserId, businessId, paymentIntentId, input);
  }

  function createPartnerRequest(actorUserId, businessId, input = {}) {
    return store.savePartnerRequest(actorUserId, businessId, {
      requestedScope: "ESSA_BUSINESS_PARTNER",
      requestedServices: ["Strategy", "Production", "Advertising", "Content", "Growth", "Automation"],
      ...input
    });
  }

  function createCommercialRequest(actorUserId, businessId, input = {}) {
    return store.saveCommercialRequest(actorUserId, businessId, input);
  }

  function getDashboard(actorUserId, businessId) {
    return store.getDashboard(actorUserId, businessId);
  }

  function listBusinessesForUser(actorUserId) {
    return store.listBusinessesForUser(actorUserId);
  }

  function getPortfolioDashboard(actorUserId) {
    return store.getPortfolioDashboard(actorUserId);
  }

  function createRecommendation(actorUserId, businessId, input = {}) {
    return store.createRecommendation(actorUserId, businessId, input);
  }

  function createAction(actorUserId, businessId, input = {}) {
    return store.createAction(actorUserId, businessId, input);
  }

  function createApprovalGateForAction(actorUserId, businessId, actionIntentId, input = {}) {
    return store.createApprovalGateForAction(actorUserId, businessId, actionIntentId, input);
  }

  function grantAutomationPermission(actorUserId, businessId, input = {}) {
    return store.grantAutomationPermission(actorUserId, businessId, input);
  }

  function recordOperationalMetric(actorUserId, businessId, input = {}) {
    return store.recordOperationalMetric(actorUserId, businessId, input);
  }

  function recordBusinessFunnelEvent(actorUserId, businessId, eventType, metadata = {}) {
    if (businessId) {
      const access = store.requireBusinessAccess(actorUserId, businessId);
      if (!access.ok) return access;
    }
    return {
      ok: true,
      event: store.recordAnalytics(actorUserId, businessId, eventType, metadata)
    };
  }

  function addMembership(actorUserId, businessId, input = {}) {
    return store.addMembership(actorUserId, businessId, input);
  }

  function runSprint01AcceptanceScenario() {
    const alice = "sprint01_alice";
    const bob = "sprint01_bob";
    const viewer = "sprint01_viewer";
    const created = resultOrThrow(createProfile(alice, {
      name: "Sprint 01 Cafe",
      industry: "Hospitality",
      city: "Tbilisi",
      website: "https://sprint01.example",
      description: "Neighborhood cafe and brunch room.",
      productsServices: ["Coffee", "Brunch", "Private events"],
      goals: ["increase customer flow"],
      challenges: ["customer acquisition is inconsistent"]
    }));
    const updated = resultOrThrow(updateProfile(alice, created.business.businessId, {
      targetAudience: "Local residents and tourists",
      currentSituation: "Strong product, inconsistent weekday demand."
    }));
    const viewerMembership = resultOrThrow(addMembership(alice, created.business.businessId, {
      userId: viewer,
      role: "VIEWER"
    }));
    const flow = resultOrThrow(runGrowthIntake(alice, created.business.businessId, {
      businessName: updated.business.name,
      website: updated.business.website,
      description: updated.business.description,
      productsServices: updated.business.productsServices,
      targetAudience: updated.business.targetAudience,
      currentSituation: updated.business.currentSituation,
      goals: updated.business.goals,
      challenges: updated.business.challenges,
      optionalMetrics: {}
    }));
    const publicProjection = publicBusinessProjection(updated.business);
    const bobRead = getDashboard(bob, created.business.businessId);
    const viewerMutation = updateProfile(viewer, created.business.businessId, { name: "Blocked rename" });
    const approval = resultOrThrow(decideOffer(alice, created.business.businessId, flow.offer.offerId, "approve", "Client approved Sprint 01 draft."));
    const dashboardAfterApproval = resultOrThrow(getDashboard(alice, created.business.businessId));
    const partnerRequest = resultOrThrow(createPartnerRequest(alice, created.business.businessId, {
      goals: updated.business.goals,
      preferredInvolvementLevel: "EXTERNAL_GROWTH_DEPARTMENT_INTEREST"
    }));
    const commercialRequest = resultOrThrow(createCommercialRequest(alice, created.business.businessId, {
      offerId: flow.offer.offerId,
      contactPreference: "EMAIL_OR_TELEGRAM",
      scope: flow.offer.proposedScope
    }));
    const audit = resultOrThrow(store.getAuditEvents(alice, created.business.businessId));

    return {
      ok: true,
      users: { alice, bob, viewer },
      created,
      updated,
      viewerMembership,
      flow,
      publicProjection,
      bobRead,
      viewerMutation,
      approval,
      dashboardAfterApproval,
      partnerRequest,
      commercialRequest,
      audit,
      storeMetadata: clone(store.state.metadata),
      externalProviderCalls: 0,
      paymentProviderCalls: 0,
      modelProviderCalls: 0
    };
  }

  return {
    createProfile,
    updateProfile,
    runGrowthIntake,
    decideOffer,
    configureOfferCommercialTerms,
    createPaymentRequest,
    verifyManualPayment,
    startCommercialOnboarding,
    activateCommercialProject,
    createPartnerRequest,
    createCommercialRequest,
    getDashboard,
    listBusinessesForUser,
    getPortfolioDashboard,
    createRecommendation,
    createAction,
    createApprovalGateForAction,
    grantAutomationPermission,
    recordOperationalMetric,
    recordBusinessFunnelEvent,
    addMembership,
    runSprint01AcceptanceScenario,
    getAuditEvents: store.getAuditEvents,
    requireBusinessAccess: store.requireBusinessAccess,
    snapshot: () => clone({
      organizations: [...store.state.organizations.values()],
      metadata: store.state.metadata,
      memberships: [...store.state.memberships.values()],
      businessProfiles: [...store.state.businessProfiles.values()],
      workspaces: [...store.state.workspaces.values()],
      creationFlows: [...store.state.creationFlows.values()],
      intakes: [...store.state.intakes.values()],
      diagnoses: [...store.state.diagnoses.values()],
      growthPlans: [...store.state.growthPlans.values()],
      offers: [...store.state.offers.values()],
      managementSubscriptions: [...store.state.managementSubscriptions.values()],
      managementStates: [...store.state.managementStates.values()],
      operationalMetrics: [...store.state.operationalMetrics.values()],
      recommendations: [...store.state.recommendations.values()],
      actionIntents: [...store.state.actionIntents.values()],
      approvalGates: [...store.state.approvalGates.values()],
      automationPermissions: [...store.state.automationPermissions.values()],
      healthSnapshots: [...store.state.healthSnapshots.values()],
      financialOperations: [...store.state.financialOperations.values()],
      jurisdictionAdapters: [...store.state.jurisdictionAdapters.values()],
      paymentIntents: [...store.state.paymentIntents.values()],
      commercialOnboardings: [...store.state.commercialOnboardings.values()],
      paymentProviderEvents: [...store.state.paymentProviderEvents.values()],
      projects: [...store.state.projects.values()],
      partnerRequests: [...store.state.partnerRequests.values()],
      commercialRequests: [...store.state.commercialRequests.values()],
      analyticsEvents: [...store.state.analyticsEvents.values()],
      auditEvents: store.state.auditEvents
    })
  };
}

export const defaultBusinessService = createBusinessFlowService(defaultBusinessStore);
