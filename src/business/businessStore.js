import {
  businessAuditEvents,
  businessAutonomyLevels,
  businessCommercialStates,
  businessOfferStatuses,
  businessPartnerStatuses,
  businessPaymentProviders,
  businessPaymentStatuses,
  businessPricingStatuses,
  businessProjectStatuses,
  businessRoles,
  businessStoreKinds,
  businessCommercialRequestStatuses,
  businessFunnelEvents,
  clone,
  createActionIntent,
  createApprovalGate,
  createAutomationPermission,
  createBusinessCreationFlow,
  createBusinessHealthSnapshot,
  createBusinessIntake,
  createBusinessManagementState,
  createBusinessProfile,
  createFinancialOperationsBoundary,
  createJurisdictionAdapterBoundary,
  createManagementSubscription,
  createOperationalMetric,
  createBusinessRecommendation,
  createId,
  nowIso,
  safeArray,
  validateBusinessIntakeInput,
  validateBusinessProfileInput
} from "./businessContracts.js";
import {
  buildCommercialState,
  canCreatePaymentRequest,
  createBusinessPaymentService,
  createCommercialOnboarding,
  createPaymentIntentFromOffer,
  normalizeCurrency,
  normalizePaymentModel
} from "./businessPayments.js";
import {
  createJsonBusinessRepository,
  hydrateStateFromSnapshot,
  snapshotFromState
} from "./durableBusinessRepository.js";

const roleRank = {
  [businessRoles.owner]: 4,
  [businessRoles.admin]: 3,
  [businessRoles.editor]: 2,
  [businessRoles.viewer]: 1
};

export const businessPermissions = {
  read: "READ",
  mutate: "MUTATE",
  admin: "ADMIN",
  approveOffer: "APPROVE_OFFER",
  configureOfferCommercials: "CONFIGURE_OFFER_COMMERCIALS",
  createPaymentRequest: "CREATE_PAYMENT_REQUEST",
  verifyManualPayment: "VERIFY_MANUAL_PAYMENT",
  manageOnboarding: "MANAGE_ONBOARDING",
  activateProject: "ACTIVATE_PROJECT"
};

function requiredRank(permission) {
  if (permission === businessPermissions.read) return roleRank[businessRoles.viewer];
  if (permission === businessPermissions.mutate) return roleRank[businessRoles.editor];
  return roleRank[businessRoles.admin];
}

function createOrganization({ ownerUserId, name }) {
  const createdAt = nowIso();
  return {
    modelType: "Organization",
    organizationId: createId("org"),
    ownerUserId,
    name: name || "Business Organization",
    createdAt,
    updatedAt: createdAt
  };
}

function createWorkspace({ organizationId, businessId }) {
  const createdAt = nowIso();
  return {
    modelType: "BusinessWorkspace",
    workspaceId: createId("business_workspace"),
    organizationId,
    businessId,
    status: "ACTIVE",
    createdAt,
    updatedAt: createdAt
  };
}

function createMembership({ organizationId, userId, role }) {
  const createdAt = nowIso();
  return {
    modelType: "OrganizationMembership",
    membershipId: createId("membership"),
    organizationId,
    userId,
    role,
    createdAt,
    updatedAt: createdAt
  };
}

function createAuditEvent({ organizationId, businessId, actorUserId, eventType, targetId, metadata = {} }) {
  return {
    modelType: "BusinessAuditEvent",
    eventId: createId("business_event"),
    organizationId,
    businessId,
    actorUserId,
    eventType,
    targetId,
    metadata,
    createdAt: nowIso()
  };
}

export function createBusinessStore(options = {}) {
  const repository = options.repository || null;
  const paymentService = options.paymentService || createBusinessPaymentService();
  const state = {
    metadata: {
      modelType: "BusinessStoreMetadata",
      storeKind: options.storeKind || (repository ? businessStoreKinds.durableLocalFile : businessStoreKinds.serverBackedMemory),
      tenantScoped: true,
      browserLocalStorageUsedForBusinessRecords: false,
      durablePersistenceReady: Boolean(repository),
      repository: repository?.describe?.() || null,
      productionBlockers: repository
        ? [
            "Supabase Auth/JWT verification may still require environment configuration.",
            "Supabase production migration must be applied before production launch.",
            "Payment provider activation is intentionally not configured."
          ]
        : [
            "Supabase Auth/JWT verification is not configured.",
            "Durable database persistence is not connected for this store instance.",
            "Payment provider activation is intentionally not configured."
          ]
    },
    organizations: new Map(),
    memberships: new Map(),
    businessProfiles: new Map(),
    workspaces: new Map(),
    creationFlows: new Map(),
    intakes: new Map(),
    diagnoses: new Map(),
    growthPlans: new Map(),
    offers: new Map(),
    managementSubscriptions: new Map(),
    managementStates: new Map(),
    operationalMetrics: new Map(),
    recommendations: new Map(),
    actionIntents: new Map(),
    approvalGates: new Map(),
    automationPermissions: new Map(),
    healthSnapshots: new Map(),
    financialOperations: new Map(),
    jurisdictionAdapters: new Map(),
    paymentIntents: new Map(),
    commercialOnboardings: new Map(),
    paymentProviderEvents: new Map(),
    projects: new Map(),
    partnerRequests: new Map(),
    commercialRequests: new Map(),
    analyticsEvents: new Map(),
    auditEvents: []
  };

  if (repository) {
    hydrateStateFromSnapshot(state, repository.load());
    state.metadata = {
      ...state.metadata,
      storeKind: options.storeKind || businessStoreKinds.durableLocalFile,
      durablePersistenceReady: true,
      repository: repository.describe()
    };
  }

  function persist() {
    if (!repository) return;
    repository.save(snapshotFromState(state));
  }

  function emit(event) {
    const auditEvent = createAuditEvent(event);
    state.auditEvents.push(auditEvent);
    persist();
    return auditEvent;
  }

  function recordAnalytics(actorUserId, businessId, eventType, metadata = {}) {
    const business = businessId ? state.businessProfiles.get(businessId) : null;
    const event = {
      modelType: "BusinessFunnelAnalyticsEvent",
      analyticsEventId: createId("business_analytics"),
      eventType,
      actorUserId,
      organizationId: business?.organizationId || metadata.organizationId || null,
      businessId: businessId || null,
      metadata: {
        route: metadata.route || null,
        status: metadata.status || null,
        stage: metadata.stage || null
      },
      privacyPolicy: {
        noSensitiveRawPayload: true,
        noPrivateMetrics: true,
        noBusinessNotes: true
      },
      createdAt: nowIso()
    };
    state.analyticsEvents.set(event.analyticsEventId, event);
    persist();
    return clone(event);
  }

  function getMembership(userId, organizationId) {
    return [...state.memberships.values()].find((item) =>
      item.userId === userId && item.organizationId === organizationId
    ) || null;
  }

  function requireBusinessAccess(actorUserId, businessId, permission = businessPermissions.read) {
    const business = state.businessProfiles.get(businessId);
    if (!business) return { ok: false, status: 404, reason: "business_not_found" };
    const membership = getMembership(actorUserId, business.organizationId);
    if (!membership) return { ok: false, status: 403, reason: "organization_membership_required" };
    if ((roleRank[membership.role] || 0) < requiredRank(permission)) {
      return { ok: false, status: 403, reason: "insufficient_business_role", role: membership.role };
    }
    return { ok: true, business, membership };
  }

  function latestForBusiness(collection, businessId, field = "updatedAt") {
    return [...collection.values()]
      .filter((item) => item.businessId === businessId)
      .sort((a, b) => String(b[field] || b.createdAt).localeCompare(String(a[field] || a.createdAt)))[0] || null;
  }

  function requireEssaOperator(actorUserId, businessId, permission) {
    const access = requireBusinessAccess(actorUserId, businessId, permission);
    if (!access.ok) return access;
    if (actorUserId === access.business.ownerUserId || access.membership.role !== businessRoles.admin) {
      return { ok: false, status: 403, reason: "essa_operator_role_required" };
    }
    return access;
  }

  function updateLinkedProjectForOffer(businessId, offerId, patch = {}, activity = {}) {
    const updatedProjects = [];
    [...state.projects.values()]
      .filter((project) => project.businessId === businessId && project.linkedOfferId === offerId)
      .forEach((project) => {
        const updated = {
          ...project,
          ...patch,
          commercialStatus: patch.commercialStatus || project.commercialStatus || null,
          onboardingStatus: patch.onboardingStatus || project.onboardingStatus || null,
          updatedAt: nowIso(),
          activityEvents: [
            ...safeArray(project.activityEvents),
            {
              eventType: activity.eventType || businessAuditEvents.projectStatusChanged,
              status: patch.status || project.status,
              reason: activity.reason || null,
              paymentIntentId: patch.linkedPaymentIntentId || project.linkedPaymentIntentId || null,
              createdAt: nowIso()
            }
          ]
        };
        state.projects.set(project.projectId, updated);
        updatedProjects.push(updated);
      });
    return updatedProjects;
  }

  function initializeCanonicalManagementLayer({ actorUserId, organization, business }) {
    const subscription = createManagementSubscription({
      businessId: business.businessId,
      organizationId: organization.organizationId
    });
    const managementState = createBusinessManagementState({
      businessId: business.businessId,
      organizationId: organization.organizationId,
      subscriptionId: subscription.subscriptionId,
      autonomyLevel: businessAutonomyLevels.approveToExecute
    });
    const creationFlow = createBusinessCreationFlow({
      businessId: business.businessId,
      organizationId: organization.organizationId,
      requestedBy: actorUserId
    });
    const healthSnapshot = createBusinessHealthSnapshot({
      businessId: business.businessId,
      organizationId: organization.organizationId
    });
    const financialBoundary = createFinancialOperationsBoundary({
      businessId: business.businessId,
      organizationId: organization.organizationId
    });
    const jurisdictionBoundary = createJurisdictionAdapterBoundary({
      businessId: business.businessId,
      organizationId: organization.organizationId,
      country: business.country || null
    });

    state.managementSubscriptions.set(subscription.subscriptionId, subscription);
    state.managementStates.set(managementState.managementStateId, managementState);
    state.creationFlows.set(creationFlow.creationFlowId, creationFlow);
    state.healthSnapshots.set(healthSnapshot.healthSnapshotId, healthSnapshot);
    state.financialOperations.set(financialBoundary.financialOperationsId, financialBoundary);
    state.jurisdictionAdapters.set(jurisdictionBoundary.jurisdictionAdapterId, jurisdictionBoundary);

    return {
      subscription,
      managementState,
      creationFlow,
      healthSnapshot,
      financialBoundary,
      jurisdictionBoundary
    };
  }

  function createProfile(actorUserId, input = {}) {
    const validation = validateBusinessProfileInput(input);
    if (!validation.ok) return { ok: false, status: 400, errors: validation.errors };
    const organization = createOrganization({
      ownerUserId: actorUserId,
      name: input.organizationName || `${input.name} Organization`
    });
    const business = createBusinessProfile({
      ...input,
      organizationId: organization.organizationId,
      ownerUserId: actorUserId
    });
    business.createdBy = actorUserId;
    const workspace = createWorkspace({
      organizationId: organization.organizationId,
      businessId: business.businessId
    });
    workspace.createdBy = actorUserId;
    const membership = createMembership({
      organizationId: organization.organizationId,
      userId: actorUserId,
      role: businessRoles.owner
    });

    state.organizations.set(organization.organizationId, organization);
    state.businessProfiles.set(business.businessId, business);
    state.workspaces.set(workspace.workspaceId, workspace);
    state.memberships.set(membership.membershipId, membership);
    const management = initializeCanonicalManagementLayer({ actorUserId, organization, business });
    recordAnalytics(actorUserId, business.businessId, businessFunnelEvents.businessCreated, { stage: "BUSINESS_PROFILE" });
    emit({
      organizationId: organization.organizationId,
      businessId: business.businessId,
      actorUserId,
      eventType: businessAuditEvents.businessCreated,
      targetId: business.businessId
    });

    return { ok: true, organization: clone(organization), membership: clone(membership), business: clone(business), workspace: clone(workspace), management: clone(management) };
  }

  function addMembership(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.admin);
    if (!access.ok) return access;
    const role = Object.values(businessRoles).includes(input.role) ? input.role : businessRoles.viewer;
    const membership = createMembership({
      organizationId: access.business.organizationId,
      userId: input.userId,
      role
    });
    state.memberships.set(membership.membershipId, membership);
    persist();
    return { ok: true, membership: clone(membership) };
  }

  function updateProfile(actorUserId, businessId, patch = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const current = access.business;
    const updated = createBusinessProfile({
      ...current,
      ...patch,
      businessId,
      organizationId: current.organizationId,
      ownerUserId: current.ownerUserId,
      createdAt: current.createdAt,
      updatedAt: nowIso()
    });
    state.businessProfiles.set(businessId, updated);
    persist();
    emit({
      organizationId: updated.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.businessUpdated,
      targetId: businessId
    });
    return { ok: true, business: clone(updated) };
  }

  function saveIntake(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const inputValidation = validateBusinessIntakeInput({ ...input, businessId });
    if (!inputValidation.ok) return { ok: false, status: 400, errors: inputValidation.errors };
    const workspace = [...state.workspaces.values()].find((item) => item.businessId === businessId);
    const intake = createBusinessIntake({
      ...input,
      businessId,
      organizationId: access.business.organizationId,
      workspaceId: workspace?.workspaceId || null,
      businessName: input.businessName || input.name || access.business.name
    });
    intake.createdBy = actorUserId;
    const validation = validateBusinessIntakeInput(intake);
    if (!validation.ok) return { ok: false, status: 400, errors: validation.errors };
    state.intakes.set(intake.intakeId, intake);
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.businessIntakeCompleted, { stage: "BUSINESS_INTAKE" });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.intakeCompleted,
      targetId: intake.intakeId
    });
    return { ok: true, intake: clone(intake), business: clone(access.business), workspace: clone(workspace) };
  }

  function saveDiagnosis(actorUserId, businessId, diagnosis) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const storedDiagnosis = {
      ...diagnosis,
      revision: diagnosis.revision || 1,
      status: diagnosis.status || "ACTIVE",
      createdBy: diagnosis.createdBy || actorUserId,
      updatedAt: diagnosis.updatedAt || diagnosis.createdAt || nowIso()
    };
    state.diagnoses.set(storedDiagnosis.diagnosisId, storedDiagnosis);
    persist();
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.diagnosisCreated,
      targetId: storedDiagnosis.diagnosisId
    });
    return { ok: true, diagnosis: clone(storedDiagnosis) };
  }

  function saveGrowthPlan(actorUserId, businessId, growthPlan) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const storedGrowthPlan = {
      ...growthPlan,
      revision: growthPlan.revision || 1,
      status: growthPlan.status || "ACTIVE",
      createdBy: growthPlan.createdBy || actorUserId,
      updatedAt: growthPlan.updatedAt || growthPlan.createdAt || nowIso()
    };
    state.growthPlans.set(storedGrowthPlan.growthPlanId, storedGrowthPlan);
    persist();
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.growthPlanCreated,
      targetId: storedGrowthPlan.growthPlanId
    });
    return { ok: true, growthPlan: clone(storedGrowthPlan) };
  }

  function saveOffer(actorUserId, businessId, offer) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const storedOffer = {
      ...offer,
      revision: offer.revision || 1,
      status: offer.status || "ACTIVE",
      createdBy: offer.createdBy || actorUserId,
      updatedAt: offer.updatedAt || offer.createdAt || nowIso()
    };
    state.offers.set(storedOffer.offerId, storedOffer);
    persist();
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.offerCreated,
      targetId: storedOffer.offerId
    });
    return { ok: true, offer: clone(storedOffer) };
  }

  function updateOfferStatus(actorUserId, businessId, offerId, approvalStatus, notes = "") {
    const permission = approvalStatus === businessOfferStatuses.approved
      ? businessPermissions.approveOffer
      : businessPermissions.mutate;
    const access = requireBusinessAccess(actorUserId, businessId, permission);
    if (!access.ok) return access;
    const offer = state.offers.get(offerId);
    if (!offer || offer.businessId !== businessId) return { ok: false, status: 404, reason: "offer_not_found" };
    const updated = {
      ...offer,
      approvalStatus,
      approvedAt: approvalStatus === businessOfferStatuses.approved ? nowIso() : offer.approvedAt || null,
      decisionNotes: notes,
      pricingStatus: approvalStatus === businessOfferStatuses.approved
        ? offer.pricingStatus
        : offer.pricingStatus,
      paymentStatus: approvalStatus === businessOfferStatuses.approved
        ? businessPricingStatuses.paymentRequired
        : offer.paymentStatus,
      updatedAt: nowIso()
    };
    state.offers.set(offerId, updated);
    if (approvalStatus === businessOfferStatuses.approved) {
      [...state.projects.values()]
        .filter((project) => project.businessId === businessId && project.linkedOfferId === offerId)
        .forEach((project) => {
          state.projects.set(project.projectId, {
            ...project,
            status: businessProjectStatuses.paymentRequired,
            updatedAt: nowIso(),
            activityEvents: [
              ...safeArray(project.activityEvents),
              {
                eventType: businessAuditEvents.projectStatusChanged,
                status: businessProjectStatuses.paymentRequired,
                reason: "Offer approved; payment request can be created after server-side price confirmation.",
                createdAt: nowIso()
              }
            ]
          });
        });
    }
    if (approvalStatus === businessOfferStatuses.approved) {
      recordAnalytics(actorUserId, businessId, businessFunnelEvents.offerApproved, { status: approvalStatus, stage: "PAYMENT_REQUIRED" });
    } else {
      persist();
    }
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: approvalStatus === businessOfferStatuses.approved
        ? businessAuditEvents.offerApproved
        : approvalStatus === businessOfferStatuses.declined
          ? businessAuditEvents.offerDeclined
          : businessAuditEvents.offerUpdated,
      targetId: offerId,
      metadata: { approvalStatus }
    });
    return { ok: true, offer: clone(updated) };
  }

  function configureOfferCommercialTerms(actorUserId, businessId, offerId, input = {}) {
    const access = requireEssaOperator(actorUserId, businessId, businessPermissions.configureOfferCommercials);
    if (!access.ok) return access;
    const offer = state.offers.get(offerId);
    if (!offer || offer.businessId !== businessId) return { ok: false, status: 404, reason: "offer_not_found" };
    const amount = Number(input.amount);
    const currency = normalizeCurrency(input.currency);
    const paymentModel = normalizePaymentModel(input.paymentModel);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, status: 400, reason: "positive_offer_amount_required" };
    if (!currency) return { ok: false, status: 400, reason: "supported_currency_required" };
    if (!paymentModel) return { ok: false, status: 400, reason: "supported_payment_model_required" };
    const updated = {
      ...offer,
      scope: safeArray(input.scope).length ? safeArray(input.scope) : safeArray(offer.scope || offer.proposedScope),
      deliverables: safeArray(input.deliverables).length ? safeArray(input.deliverables) : safeArray(offer.deliverables),
      assumptions: safeArray(input.assumptions).length ? safeArray(input.assumptions) : safeArray(offer.assumptions),
      exclusions: safeArray(input.exclusions).length ? safeArray(input.exclusions) : safeArray(offer.exclusions),
      amount,
      currency,
      paymentModel,
      priceStatus: input.priceStatus || businessPricingStatuses.priceConfirmed,
      pricingStatus: input.pricingStatus || input.priceStatus || businessPricingStatuses.priceConfirmed,
      paymentSchedule: input.paymentSchedule || offer.paymentSchedule || null,
      billing: input.billing || offer.billing || null,
      performanceTerms: input.performanceTerms || offer.performanceTerms || null,
      revision: (offer.revision || 1) + 1,
      updatedAt: nowIso()
    };
    state.offers.set(offerId, updated);
    persist();
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.offerUpdated,
      targetId: offerId,
      metadata: {
        commercialTermsConfigured: true,
        amountStoredServerSide: true,
        currency,
        paymentModel
      }
    });
    return { ok: true, offer: clone(updated) };
  }

  async function createPaymentRequest(actorUserId, businessId, offerId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.createPaymentRequest);
    if (!access.ok) return access;
    const offer = state.offers.get(offerId);
    if (!offer || offer.businessId !== businessId) return { ok: false, status: 404, reason: "offer_not_found" };
    const readiness = canCreatePaymentRequest(offer);
    if (!readiness.ok) return readiness;
    const idempotencyKey = input.idempotencyKey || `payment_request:${offerId}`;
    const existing = [...state.paymentIntents.values()].find((item) => item.idempotencyKey === idempotencyKey);
    if (existing) {
      return {
        ok: true,
        paymentIntent: clone(existing),
        provider: paymentService.describeProvider(),
        idempotent: true
      };
    }
    const providerResult = await paymentService.createProviderPaymentIntent({
      organizationId: offer.organizationId,
      businessId,
      offerId,
      amount: offer.amount,
      currency: offer.currency,
      paymentModel: offer.paymentModel,
      idempotencyKey
    });
    const paymentIntent = createPaymentIntentFromOffer({
      offer,
      actorUserId,
      providerResult,
      input: {
        ...input,
        idempotencyKey,
        clientSuppliedAmount: input.amount,
        clientSuppliedCurrency: input.currency
      }
    });
    state.paymentIntents.set(paymentIntent.paymentIntentId, paymentIntent);
    state.offers.set(offerId, {
      ...offer,
      paymentStatus: businessPaymentStatuses.required,
      updatedAt: nowIso()
    });
    updateLinkedProjectForOffer(businessId, offerId, {
      status: businessProjectStatuses.paymentRequired,
      commercialStatus: businessCommercialStates.paymentRequired,
      linkedPaymentIntentId: paymentIntent.paymentIntentId
    }, {
      reason: "Payment request created from approved server-side offer terms."
    });
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.paymentRequestCreated, { status: paymentIntent.status, stage: "PAYMENT_REQUIRED" });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.paymentRequestCreated,
      targetId: paymentIntent.paymentIntentId,
      metadata: {
        offerId,
        provider: paymentIntent.provider,
        providerStatus: providerResult.status || null,
        amountDerivedFromOffer: true,
        clientSuppliedAmountIgnored: input.amount != null
      }
    });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.paymentIntentCreated,
      targetId: paymentIntent.paymentIntentId,
      metadata: { provider: paymentIntent.provider }
    });
    return {
      ok: true,
      paymentIntent: clone(paymentIntent),
      provider: paymentService.describeProvider(),
      idempotent: false
    };
  }

  function verifyManualPayment(actorUserId, businessId, paymentIntentId, input = {}) {
    const access = requireEssaOperator(actorUserId, businessId, businessPermissions.verifyManualPayment);
    if (!access.ok) return access;
    const paymentIntent = state.paymentIntents.get(paymentIntentId);
    if (!paymentIntent || paymentIntent.businessId !== businessId) return { ok: false, status: 404, reason: "payment_intent_not_found" };
    if (!input.evidenceRef) return { ok: false, status: 400, reason: "manual_payment_evidence_required" };
    if (paymentIntent.status === businessPaymentStatuses.confirmed) {
      return { ok: true, paymentIntent: clone(paymentIntent), idempotent: true };
    }
    const updated = {
      ...paymentIntent,
      status: businessPaymentStatuses.confirmed,
      provider: businessPaymentProviders.manual,
      providerReference: input.evidenceRef,
      confirmedAt: nowIso(),
      metadata: {
        ...paymentIntent.metadata,
        manualVerification: true,
        verifiedByRole: access.membership.role,
        evidenceStoredAsReferenceOnly: true
      },
      updatedAt: nowIso()
    };
    state.paymentIntents.set(paymentIntentId, updated);
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.paymentConfirmed, { status: updated.status, stage: "PAYMENT_CONFIRMED" });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.manualPaymentVerified,
      targetId: paymentIntentId,
      metadata: { evidenceRef: input.evidenceRef, noRawPaymentSecretsStored: true }
    });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.paymentConfirmed,
      targetId: paymentIntentId,
      metadata: { provider: businessPaymentProviders.manual }
    });
    return { ok: true, paymentIntent: clone(updated), idempotent: false };
  }

  function startCommercialOnboarding(actorUserId, businessId, paymentIntentId, input = {}) {
    const access = requireEssaOperator(actorUserId, businessId, businessPermissions.manageOnboarding);
    if (!access.ok) return access;
    const paymentIntent = state.paymentIntents.get(paymentIntentId);
    if (!paymentIntent || paymentIntent.businessId !== businessId) return { ok: false, status: 404, reason: "payment_intent_not_found" };
    if (paymentIntent.status !== businessPaymentStatuses.confirmed) {
      return { ok: false, status: 409, reason: "payment_confirmation_required_before_onboarding" };
    }
    const existing = [...state.commercialOnboardings.values()].find((item) => item.paymentIntentId === paymentIntentId);
    if (existing) return { ok: true, onboarding: clone(existing), idempotent: true };
    const offer = state.offers.get(paymentIntent.offerId);
    const onboarding = createCommercialOnboarding({
      business: access.business,
      offer,
      paymentIntent,
      actorUserId,
      input
    });
    state.commercialOnboardings.set(onboarding.onboardingId, onboarding);
    updateLinkedProjectForOffer(businessId, paymentIntent.offerId, {
      status: businessProjectStatuses.onboarding,
      commercialStatus: businessCommercialStates.onboarding,
      onboardingStatus: onboarding.status,
      linkedPaymentIntentId: paymentIntentId,
      linkedOnboardingId: onboarding.onboardingId
    }, {
      eventType: businessAuditEvents.onboardingStarted,
      reason: "Payment confirmed; onboarding started."
    });
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.onboardingStarted, { status: onboarding.status, stage: "ONBOARDING" });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.onboardingStarted,
      targetId: onboarding.onboardingId,
      metadata: { paymentIntentId }
    });
    return { ok: true, onboarding: clone(onboarding), idempotent: false };
  }

  function activateCommercialProject(actorUserId, businessId, paymentIntentId, input = {}) {
    const access = requireEssaOperator(actorUserId, businessId, businessPermissions.activateProject);
    if (!access.ok) return access;
    const paymentIntent = state.paymentIntents.get(paymentIntentId);
    if (!paymentIntent || paymentIntent.businessId !== businessId) return { ok: false, status: 404, reason: "payment_intent_not_found" };
    if (paymentIntent.status !== businessPaymentStatuses.confirmed) {
      return { ok: false, status: 409, reason: "payment_confirmation_required_before_project_activation" };
    }
    const onboarding = [...state.commercialOnboardings.values()].find((item) => item.paymentIntentId === paymentIntentId);
    if (!onboarding) return { ok: false, status: 409, reason: "onboarding_required_before_project_activation" };
    const existingActive = [...state.projects.values()].find((project) =>
      project.businessId === businessId &&
      project.linkedPaymentIntentId === paymentIntentId &&
      project.status === businessProjectStatuses.projectActive
    );
    if (existingActive) return { ok: true, project: clone(existingActive), idempotent: true, externalExecutionStarted: false };
    const updatedProjects = updateLinkedProjectForOffer(businessId, paymentIntent.offerId, {
      status: businessProjectStatuses.projectActive,
      commercialStatus: businessCommercialStates.projectActive,
      onboardingStatus: businessCommercialStates.projectActive,
      activationTimestamp: nowIso(),
      ownerTeam: safeArray(input.ownerTeam).length ? safeArray(input.ownerTeam) : [actorUserId],
      nextAction: input.nextAction || "Prepare approval-gated execution plan. Do not launch external execution automatically.",
      linkedPaymentIntentId: paymentIntentId,
      linkedOnboardingId: onboarding.onboardingId
    }, {
      eventType: businessAuditEvents.projectActivated,
      reason: "Confirmed payment and onboarding allow project activation boundary."
    });
    const project = updatedProjects[0] || null;
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.projectActivated, { status: businessProjectStatuses.projectActive, stage: "PROJECT_ACTIVE" });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.projectActivated,
      targetId: project?.projectId || paymentIntentId,
      metadata: {
        paymentIntentId,
        onboardingId: onboarding.onboardingId,
        externalExecutionStarted: false
      }
    });
    return { ok: true, project: clone(project), idempotent: false, externalExecutionStarted: false };
  }

  function saveProject(actorUserId, businessId, project) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    state.projects.set(project.projectId, project);
    project.createdBy = project.createdBy || actorUserId;
    persist();
    emit({
      organizationId: access.business.organizationId,
      requestedBy: actorUserId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.projectCreated,
      targetId: project.projectId
    });
    return { ok: true, project: clone(project) };
  }

  function savePartnerRequest(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const createdAt = nowIso();
    const request = {
      modelType: "BusinessPartnerRequest",
      partnerRequestId: createId("business_partner"),
      businessId,
      organizationId: access.business.organizationId,
      requestedScope: input.requestedScope || "ESSA_BUSINESS_PARTNER",
      goals: safeArray(input.goals),
      preferredInvolvementLevel: input.preferredInvolvementLevel || "REVIEW_REQUIRED",
      requestedServices: safeArray(input.requestedServices),
      status: input.status || businessPartnerStatuses.requested,
      desiredScope: input.desiredScope || input.requestedScope || "ESSA_BUSINESS_PARTNER",
      areasToDelegate: safeArray(input.areasToDelegate || input.requestedServices),
      currentTeam: input.currentTeam || "",
      notes: input.notes || "",
      createdAt,
      updatedAt: createdAt
    };
    state.partnerRequests.set(request.partnerRequestId, request);
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.businessPartnerRequested, { status: request.status });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.businessPartnerRequested,
      targetId: request.partnerRequestId
    });
    return { ok: true, partnerRequest: clone(request) };
  }

  function saveCommercialRequest(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.approveOffer);
    if (!access.ok) return access;
    const offer = state.offers.get(input.offerId);
    if (!offer || offer.businessId !== businessId) return { ok: false, status: 404, reason: "offer_not_found" };
    if (offer.approvalStatus !== businessOfferStatuses.approved) {
      return { ok: false, status: 409, reason: "offer_approval_required_before_commercial_request" };
    }
    const createdAt = nowIso();
    const request = {
      modelType: "BusinessCommercialRequest",
      commercialRequestId: createId("business_commercial_request"),
      businessId,
      organizationId: access.business.organizationId,
      offerId: offer.offerId,
      requestedBy: actorUserId,
      contactPreference: input.contactPreference || "CONTACT_ME",
      scope: safeArray(input.scope).length ? safeArray(input.scope) : safeArray(offer.proposedScope),
      status: input.status || businessCommercialRequestStatuses.requested,
      paymentBoundary: {
        automatedCheckoutConfigured: false,
        message: "Payment / onboarding is not yet configured for automated checkout. Request submitted."
      },
      createdAt,
      updatedAt: createdAt
    };
    state.commercialRequests.set(request.commercialRequestId, request);
    recordAnalytics(actorUserId, businessId, businessFunnelEvents.commercialRequestCreated, { status: request.status });
    emit({
      organizationId: access.business.organizationId,
      businessId,
      actorUserId,
      eventType: businessAuditEvents.commercialRequestCreated,
      targetId: request.commercialRequestId
    });
    return { ok: true, commercialRequest: clone(request) };
  }

  function getDashboard(actorUserId, businessId) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.read);
    if (!access.ok) return access;
    const workspace = [...state.workspaces.values()].find((item) => item.businessId === businessId);
    const latest = (items, field) => [...items.values()]
      .filter((item) => item.businessId === businessId)
      .sort((a, b) => String(b[field] || b.createdAt).localeCompare(String(a[field] || a.createdAt)))[0] || null;
    const project = latest(state.projects, "updatedAt");
    const diagnosis = latest(state.diagnoses, "createdAt");
    const growthPlan = latest(state.growthPlans, "createdAt");
    const offer = latest(state.offers, "updatedAt");
    const paymentIntent = latestForBusiness(state.paymentIntents, businessId, "updatedAt");
    const onboarding = latestForBusiness(state.commercialOnboardings, businessId, "updatedAt");
    const managementState = latestForBusiness(state.managementStates, businessId, "updatedAt");
    const managementSubscription = latestForBusiness(state.managementSubscriptions, businessId, "updatedAt");
    const healthSnapshot = latestForBusiness(state.healthSnapshots, businessId, "createdAt");
    const financialBoundary = latestForBusiness(state.financialOperations, businessId, "createdAt");
    const jurisdictionBoundary = latestForBusiness(state.jurisdictionAdapters, businessId, "createdAt");
    const partnerRequest = latest(state.partnerRequests, "updatedAt");
    const commercialRequest = latest(state.commercialRequests, "updatedAt");
    const commercialState = buildCommercialState({ offer, paymentIntent, onboarding, project });

    return {
      ok: true,
      dashboard: {
        modelType: "BusinessClientDashboard",
        business: clone(access.business),
        workspace: clone(workspace),
        storageBoundary: clone(state.metadata),
        currentGoal: safeArray(access.business.goals)[0] || "BUSINESS_GROWTH",
        currentStage: project?.status || (offer ? businessProjectStatuses.offerReady : growthPlan ? businessProjectStatuses.planReady : diagnosis ? businessProjectStatuses.diagnosisReady : businessProjectStatuses.intake),
        latestDiagnosis: diagnosis ? clone(diagnosis) : null,
        growthPlan: growthPlan ? clone(growthPlan) : null,
        proposal: offer ? clone(offer) : null,
        paymentIntent: paymentIntent ? clone(paymentIntent) : null,
        onboarding: onboarding ? clone(onboarding) : null,
        management: managementState ? clone(managementState) : null,
        managementSubscription: managementSubscription ? clone(managementSubscription) : null,
        businessHealth: healthSnapshot ? clone(healthSnapshot) : null,
        financialOperationsBoundary: financialBoundary ? clone(financialBoundary) : null,
        jurisdictionAdapterBoundary: jurisdictionBoundary ? clone(jurisdictionBoundary) : null,
        project: project ? clone(project) : null,
        partnerRequest: partnerRequest ? clone(partnerRequest) : null,
        commercialRequest: commercialRequest ? clone(commercialRequest) : null,
        commercialState,
        paymentProvider: paymentService.describeProvider(),
        paymentUi: {
          automatedCheckoutConfigured: paymentService.describeProvider().configured === true,
          message: paymentService.describeProvider().configured === true
            ? "Sandbox checkout may be shown only when explicitly configured."
            : "Automated checkout is not configured yet.",
          showCardFields: false,
          clientCanRequestPaymentInstructions: Boolean(offer?.approvalStatus === businessOfferStatuses.approved),
          clientCanViewPaymentStatus: Boolean(paymentIntent)
        },
        nextAction: offer?.approvalStatus === businessOfferStatuses.awaitingApproval
          ? "APPROVE_REQUEST_CHANGES_OR_DECLINE_OFFER"
          : paymentIntent?.status === businessPaymentStatuses.confirmed && !onboarding ? "AWAIT_ESSA_ONBOARDING"
            : onboarding?.status === "ONBOARDING" && project?.status !== businessProjectStatuses.projectActive ? "ONBOARDING_IN_PROGRESS"
              : project?.status === businessProjectStatuses.projectActive ? "PROJECT_ACTIVE_APPROVAL_GATED_EXECUTION"
                : offer?.approvalStatus === businessOfferStatuses.approved && !paymentIntent ? "CREATE_PAYMENT_REQUEST"
                  : offer?.approvalStatus === businessOfferStatuses.approved && paymentIntent ? "VIEW_PAYMENT_STATUS"
                    : offer?.approvalStatus === businessOfferStatuses.approved && !commercialRequest ? "REQUEST_ESSA_TO_START"
                      : !diagnosis ? "COMPLETE_BUSINESS_INTAKE" : !growthPlan ? "REVIEW_DIAGNOSIS" : !offer ? "CREATE_OFFER_DRAFT" : "REVIEW_NEXT_EXECUTION_BOUNDARY",
        whatEssaNeedsFromMe: !diagnosis ? "Tell ESSA about the business." : offer?.approvalStatus === businessOfferStatuses.awaitingApproval ? "Review the commercial offer draft." : "Review the plan and choose the next safe action.",
        whatHappensNext: project?.status === businessProjectStatuses.projectActive
          ? "Project is active, but external execution still requires separate approval."
          : paymentIntent?.status === businessPaymentStatuses.confirmed
            ? "ESSA can start onboarding; no external execution starts automatically."
            : offer?.approvalStatus === businessOfferStatuses.approved
              ? "Payment request and verified confirmation are required before onboarding/project activation."
              : "Plan -> approval -> commercial boundary."
      }
    };
  }

  function listBusinessesForUser(actorUserId) {
    const memberships = [...state.memberships.values()].filter((item) => item.userId === actorUserId);
    const organizationIds = new Set(memberships.map((item) => item.organizationId));
    return {
      ok: true,
      businesses: [...state.businessProfiles.values()]
        .filter((business) => organizationIds.has(business.organizationId))
        .map((business) => {
          const dashboard = getDashboard(actorUserId, business.businessId);
          return {
            business: clone(business),
            membership: clone(memberships.find((item) => item.organizationId === business.organizationId)),
            currentStage: dashboard.ok ? dashboard.dashboard.currentStage : null,
            nextAction: dashboard.ok ? dashboard.dashboard.nextAction : null
          };
        })
    };
  }

  function getPortfolioDashboard(actorUserId) {
    const list = listBusinessesForUser(actorUserId);
    if (!list.ok) return list;
    const businesses = list.businesses.map((item) => {
      const dashboard = getDashboard(actorUserId, item.business.businessId);
      return {
        businessId: item.business.businessId,
        organizationId: item.business.organizationId,
        name: item.business.name,
        membershipRole: item.membership?.role || null,
        currentStage: item.currentStage,
        nextAction: item.nextAction,
        managementStatus: dashboard.ok ? dashboard.dashboard.management?.managementMode || null : null,
        managementSubscriptionStatus: dashboard.ok ? dashboard.dashboard.managementSubscription?.status || null : null,
        autonomyLevel: dashboard.ok ? dashboard.dashboard.management?.autonomyLevel || null : null,
        healthStatus: dashboard.ok ? dashboard.dashboard.businessHealth?.overallStatus || null : null,
        pendingApprovalCount: dashboard.ok ? dashboard.dashboard.management?.pendingApprovalCount || 0 : 0
      };
    });

    return {
      ok: true,
      portfolio: {
        modelType: "BusinessPortfolioDashboard",
        computed: true,
        persistedSourceOfTruth: false,
        ownerUserId: actorUserId,
        businessCount: businesses.length,
        businesses,
        totals: {
          pendingApprovalCount: businesses.reduce((sum, item) => sum + Number(item.pendingApprovalCount || 0), 0),
          activeManagementSubscriptions: businesses.filter((item) => item.managementSubscriptionStatus === "ACTIVE").length
        },
        dataPolicy: {
          aggregatesAccessibleBusinessesOnly: true,
          noCrossBusinessPrivatePayloads: true,
          noPortfolioPersistenceTable: true
        }
      }
    };
  }

  function createRecommendation(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const recommendation = createBusinessRecommendation({
      ...input,
      businessId,
      organizationId: access.business.organizationId
    });
    state.recommendations.set(recommendation.recommendationId, recommendation);
    persist();
    return { ok: true, recommendation: clone(recommendation) };
  }

  function createAction(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const management = latestForBusiness(state.managementStates, businessId, "updatedAt");
    const actionIntent = createActionIntent({
      ...input,
      businessId,
      organizationId: access.business.organizationId,
      autonomyLevel: input.autonomyLevel || management?.autonomyLevel || businessAutonomyLevels.approveToExecute
    });
    state.actionIntents.set(actionIntent.actionIntentId, actionIntent);
    if (actionIntent.approvalRequired) {
      const approvalGate = createApprovalGate({
        businessId,
        organizationId: access.business.organizationId,
        actionIntentId: actionIntent.actionIntentId,
        requiredForRiskLevel: actionIntent.riskLevel
      });
      state.approvalGates.set(approvalGate.approvalGateId, approvalGate);
    }
    persist();
    return { ok: true, actionIntent: clone(actionIntent) };
  }

  function createApprovalGateForAction(actorUserId, businessId, actionIntentId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const actionIntent = state.actionIntents.get(actionIntentId);
    if (!actionIntent || actionIntent.businessId !== businessId) {
      return { ok: false, status: 404, reason: "action_intent_not_found" };
    }
    const approvalGate = createApprovalGate({
      ...input,
      businessId,
      organizationId: access.business.organizationId,
      actionIntentId
    });
    state.approvalGates.set(approvalGate.approvalGateId, approvalGate);
    persist();
    return { ok: true, approvalGate: clone(approvalGate) };
  }

  function grantAutomationPermission(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.admin);
    if (!access.ok) return access;
    const permission = createAutomationPermission({
      ...input,
      businessId,
      organizationId: access.business.organizationId
    });
    state.automationPermissions.set(permission.automationPermissionId, permission);
    persist();
    return { ok: true, permission: clone(permission) };
  }

  function recordOperationalMetric(actorUserId, businessId, input = {}) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.mutate);
    if (!access.ok) return access;
    const metric = createOperationalMetric({
      ...input,
      businessId,
      organizationId: access.business.organizationId
    });
    state.operationalMetrics.set(metric.metricId, metric);
    persist();
    return { ok: true, metric: clone(metric) };
  }

  function getAuditEvents(actorUserId, businessId) {
    const access = requireBusinessAccess(actorUserId, businessId, businessPermissions.read);
    if (!access.ok) return access;
    return {
      ok: true,
      auditEvents: state.auditEvents.filter((event) => event.businessId === businessId).map(clone)
    };
  }

  return {
    state,
    createProfile,
    addMembership,
    updateProfile,
    saveIntake,
    saveDiagnosis,
    saveGrowthPlan,
    saveOffer,
    updateOfferStatus,
    configureOfferCommercialTerms,
    createPaymentRequest,
    verifyManualPayment,
    startCommercialOnboarding,
    activateCommercialProject,
    saveProject,
    savePartnerRequest,
    saveCommercialRequest,
    getDashboard,
    listBusinessesForUser,
    getPortfolioDashboard,
    createRecommendation,
    createAction,
    createApprovalGateForAction,
    grantAutomationPermission,
    recordOperationalMetric,
    recordAnalytics,
    getAuditEvents,
    requireBusinessAccess
  };
}

export function createDurableBusinessStore(options = {}) {
  return createBusinessStore({
    ...options,
    repository: options.repository || createJsonBusinessRepository(options)
  });
}

export const defaultBusinessStore = createDurableBusinessStore();
