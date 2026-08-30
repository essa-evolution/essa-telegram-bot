import {
  businessAuditEvents,
  businessCommercialStates,
  businessCurrencies,
  businessOnboardingStatuses,
  businessPaymentModels,
  businessPaymentProviders,
  businessPaymentStatuses,
  businessPricingStatuses,
  createId,
  nowIso,
  safeArray
} from "./businessContracts.js";

const providerStatuses = {
  notConfigured: "NOT_CONFIGURED"
};

const allowedCurrencies = new Set(Object.values(businessCurrencies));
const allowedPaymentModels = new Set(Object.values(businessPaymentModels));

export function normalizeCurrency(value) {
  const currency = String(value || businessCurrencies.usd).trim().toUpperCase();
  return allowedCurrencies.has(currency) ? currency : null;
}

export function normalizePaymentModel(value) {
  const paymentModel = String(value || businessPaymentModels.oneTime).trim().toUpperCase();
  return allowedPaymentModels.has(paymentModel) ? paymentModel : null;
}

export function createNotConfiguredPaymentProviderAdapter(options = {}) {
  const provider = options.provider || businessPaymentProviders.notConfigured;
  const response = (operation) => ({
    ok: false,
    status: providerStatuses.notConfigured,
    provider,
    operation,
    reason: "payment_provider_not_configured"
  });

  return {
    provider,
    configured: false,
    createPaymentIntent: async () => response("createPaymentIntent"),
    getPaymentStatus: async () => response("getPaymentStatus"),
    cancelPayment: async () => response("cancelPayment"),
    verifyWebhookEvent: async () => response("verifyWebhookEvent"),
    normalizeProviderEvent: async () => response("normalizeProviderEvent"),
    describe: () => ({
      provider,
      configured: false,
      activationRequired: true,
      noFakeProviderSuccess: true
    })
  };
}

export function createPaymentIntentFromOffer({ offer, actorUserId, providerResult = {}, input = {} }) {
  const requestedAt = nowIso();
  return {
    modelType: "BusinessPaymentIntent",
    paymentIntentId: input.paymentIntentId || createId("business_payment_intent"),
    organizationId: offer.organizationId,
    businessId: offer.businessId,
    offerId: offer.offerId,
    amount: offer.amount,
    currency: offer.currency,
    paymentModel: offer.paymentModel,
    status: businessPaymentStatuses.required,
    provider: providerResult.provider || businessPaymentProviders.manual,
    providerReference: providerResult.providerReference || null,
    requestedBy: actorUserId,
    requestedAt,
    confirmedAt: null,
    failedAt: null,
    cancelledAt: null,
    metadata: {
      checkoutConfigured: providerResult.ok === true,
      providerStatus: providerResult.status || providerStatuses.notConfigured,
      providerReason: providerResult.reason || null,
      paymentSchedule: offer.paymentSchedule || null,
      billing: offer.billing || null,
      performanceTermsStatus: offer.performanceTerms?.status || null,
      clientSuppliedAmountIgnored: input.clientSuppliedAmount != null,
      clientSuppliedCurrencyIgnored: Boolean(input.clientSuppliedCurrency)
    },
    auditRefs: [],
    idempotencyKey: input.idempotencyKey || `payment_request:${offer.offerId}`,
    createdAt: requestedAt,
    updatedAt: requestedAt
  };
}

export function createCommercialOnboarding({ business, offer, paymentIntent, actorUserId, input = {} }) {
  const createdAt = nowIso();
  return {
    modelType: "BusinessCommercialOnboarding",
    onboardingId: input.onboardingId || createId("business_onboarding"),
    organizationId: business.organizationId,
    businessId: business.businessId,
    offerId: offer.offerId,
    paymentIntentId: paymentIntent.paymentIntentId,
    status: businessOnboardingStatuses.onboarding,
    primaryContact: input.primaryContact || business.name || "Primary business contact",
    approvedScope: safeArray(offer.scope || offer.proposedScope),
    communicationPreference: input.communicationPreference || "EMAIL_OR_TELEGRAM",
    projectOwner: input.projectOwner || actorUserId,
    missingClientMaterials: safeArray(input.missingClientMaterials),
    requiredAccessList: safeArray(input.requiredAccessList).map((item) => ({
      label: String(item.label || item || "").trim(),
      status: "REQUEST_REQUIRED",
      secureCredentialMechanismRequired: true
    })).filter((item) => item.label),
    nextAction: input.nextAction || "Collect onboarding materials without requesting passwords in generic intake.",
    onboardingNotes: input.onboardingNotes || "",
    sensitiveCredentialPolicy: {
      doNotCollectPasswordsInBusinessIntake: true,
      futureSecureCredentialMechanismRequired: true
    },
    createdBy: actorUserId,
    createdAt,
    updatedAt: createdAt
  };
}

export function canCreatePaymentRequest(offer = {}) {
  if (!offer.offerId) return { ok: false, status: 404, reason: "offer_not_found" };
  if (offer.approvalStatus !== "APPROVED") {
    return { ok: false, status: 409, reason: "offer_approval_required_before_payment_request" };
  }
  if (offer.pricingStatus === businessPricingStatuses.notPriced || offer.amount == null) {
    return { ok: false, status: 409, reason: "price_confirmation_required_before_payment_request" };
  }
  if (Number(offer.amount) <= 0) {
    return { ok: false, status: 409, reason: "positive_offer_amount_required" };
  }
  if (!normalizeCurrency(offer.currency)) {
    return { ok: false, status: 409, reason: "supported_currency_required" };
  }
  if (!normalizePaymentModel(offer.paymentModel)) {
    return { ok: false, status: 409, reason: "supported_payment_model_required" };
  }
  return { ok: true };
}

export function buildCommercialState({ offer, paymentIntent, onboarding, project } = {}) {
  if (project?.status === "PROJECT_ACTIVE") return businessCommercialStates.projectActive;
  if (onboarding?.status === businessOnboardingStatuses.onboarding) return businessCommercialStates.onboarding;
  if (paymentIntent?.status === businessPaymentStatuses.confirmed) return businessCommercialStates.paymentConfirmed;
  if (paymentIntent?.status === businessPaymentStatuses.pending) return businessCommercialStates.paymentPending;
  if (paymentIntent?.status === businessPaymentStatuses.failed) return businessCommercialStates.paymentFailed;
  if (paymentIntent?.status === businessPaymentStatuses.cancelled) return businessCommercialStates.paymentCancelled;
  if (paymentIntent?.status === businessPaymentStatuses.required) return businessCommercialStates.paymentRequired;
  if (offer?.approvalStatus === "APPROVED") return businessCommercialStates.offerApproved;
  if (offer?.offerId) return businessCommercialStates.offerDraft;
  return null;
}

export function createBusinessPaymentService(options = {}) {
  const adapter = options.adapter || createNotConfiguredPaymentProviderAdapter();
  return {
    adapter,
    describeProvider: () => adapter.describe(),
    createProviderPaymentIntent: (request) => adapter.createPaymentIntent(request),
    getPaymentStatus: (request) => adapter.getPaymentStatus(request),
    cancelPayment: (request) => adapter.cancelPayment(request),
    verifyWebhookEvent: (request) => adapter.verifyWebhookEvent(request),
    normalizeProviderEvent: (request) => adapter.normalizeProviderEvent(request)
  };
}
