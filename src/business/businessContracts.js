import { leadFreshnessStates } from "../leadIntelligence/leadContracts.js";

export const businessRoles = {
  owner: "OWNER",
  admin: "ADMIN",
  editor: "EDITOR",
  viewer: "VIEWER"
};

export const businessProfileStatuses = {
  active: "ACTIVE",
  archived: "ARCHIVED"
};

export const businessDataClasses = {
  publicBusinessData: "PUBLIC_BUSINESS_DATA",
  clientPrivateData: "CLIENT_PRIVATE_DATA"
};

export const businessStoreKinds = {
  serverBackedMemory: "SERVER_BACKED_MEMORY",
  durableDatabase: "DURABLE_DATABASE",
  durableLocalFile: "DURABLE_LOCAL_FILE"
};

export const businessFlowStages = {
  user: "USER",
  businessClient: "BUSINESS_CLIENT",
  businessProfile: "BUSINESS_PROFILE",
  businessIntake: "BUSINESS_INTAKE",
  diagnosis: "DIAGNOSIS",
  growthPlan: "GROWTH_PLAN",
  commercialOfferDraft: "COMMERCIAL_OFFER_DRAFT",
  offerApproval: "OFFER_APPROVAL",
  paymentRequired: "PAYMENT_REQUIRED",
  paymentPending: "PAYMENT_PENDING",
  paymentConfirmed: "PAYMENT_CONFIRMED",
  onboarding: "ONBOARDING",
  projectActive: "PROJECT_ACTIVE",
  projectWorkspace: "PROJECT_WORKSPACE"
};

export const businessLifecycleStages = {
  create: "CREATE",
  setUp: "SET_UP",
  launch: "LAUNCH",
  sell: "SELL",
  operate: "OPERATE",
  monitor: "MONITOR",
  optimize: "OPTIMIZE",
  grow: "GROW",
  scale: "SCALE",
  value: "VALUE",
  sellExit: "SELL_EXIT"
};

export const businessOperatingLoop = [
  "SEE",
  "UNDERSTAND",
  "RECOMMEND",
  "APPROVE",
  "EXECUTE",
  "MEASURE",
  "LEARN",
  "NEXT_ACTION"
];

export const businessRevenueLoop = [
  "CONTENT",
  "ATTENTION",
  "OFFER",
  "CONVERSION",
  "REVENUE",
  "ANALYTICS",
  "LEARNING",
  "NEXT_CONTENT",
  "NEXT_ACTION"
];

export const businessAutonomyLevels = {
  observe: "OBSERVE",
  recommend: "RECOMMEND",
  approveToExecute: "APPROVE_TO_EXECUTE",
  delegatedAutomation: "DELEGATED_AUTOMATION"
};

export const businessActionRiskLevels = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  regulated: "REGULATED"
};

export const businessSignalStatuses = {
  available: "AVAILABLE",
  unavailable: "UNAVAILABLE",
  notConnected: "NOT_CONNECTED",
  insufficientData: "INSUFFICIENT_DATA"
};

export const businessApprovalStatuses = {
  required: "APPROVAL_REQUIRED",
  approved: "APPROVED",
  rejected: "REJECTED",
  modifyRequested: "MODIFY_REQUESTED",
  notRequired: "NOT_REQUIRED"
};

export const businessProjectStatuses = {
  draft: "DRAFT",
  intake: "INTAKE",
  diagnosisReady: "DIAGNOSIS_READY",
  planReady: "PLAN_READY",
  offerReady: "OFFER_READY",
  awaitingApproval: "AWAITING_APPROVAL",
  approved: "APPROVED",
  paymentRequired: "PAYMENT_REQUIRED",
  paymentPending: "PAYMENT_PENDING",
  paymentConfirmed: "PAYMENT_CONFIRMED",
  onboarding: "ONBOARDING",
  projectActive: "PROJECT_ACTIVE",
  readyForExecution: "READY_FOR_EXECUTION",
  inProgress: "IN_PROGRESS",
  review: "REVIEW",
  completed: "COMPLETED",
  blocked: "BLOCKED"
};

export const businessHealthStates = {
  strong: "STRONG",
  healthy: "HEALTHY",
  needsAttention: "NEEDS_ATTENTION",
  weak: "WEAK",
  unknown: "UNKNOWN"
};

export const businessOfferStatuses = {
  draft: "DRAFT",
  awaitingApproval: "AWAITING_APPROVAL",
  approved: "APPROVED",
  changesRequested: "CHANGES_REQUESTED",
  declined: "DECLINED"
};

export const businessPricingStatuses = {
  priceDraft: "PRICE_DRAFT",
  priceConfirmed: "PRICE_CONFIRMED",
  customQuote: "CUSTOM_QUOTE",
  notPriced: "NOT_PRICED",
  requiresConfiguration: "REQUIRES_CONFIGURATION",
  paymentNotConfigured: "PAYMENT_NOT_CONFIGURED",
  paymentRequired: "PAYMENT_REQUIRED"
};

export const businessPaymentModels = {
  oneTime: "ONE_TIME",
  setupFee: "SETUP_FEE",
  recurring: "RECURRING",
  subscription: "SUBSCRIPTION",
  performanceFee: "PERFORMANCE_FEE",
  successFee: "SUCCESS_FEE",
  revenueShare: "REVENUE_SHARE",
  transactionCommission: "TRANSACTION_COMMISSION",
  custom: "CUSTOM"
};

export const businessCurrencies = {
  usd: "USD",
  eur: "EUR",
  gel: "GEL"
};

export const businessCommercialStates = {
  offerDraft: "OFFER_DRAFT",
  offerApproved: "OFFER_APPROVED",
  paymentRequired: "PAYMENT_REQUIRED",
  paymentPending: "PAYMENT_PENDING",
  paymentConfirmed: "PAYMENT_CONFIRMED",
  onboarding: "ONBOARDING",
  projectActive: "PROJECT_ACTIVE",
  paymentFailed: "PAYMENT_FAILED",
  paymentCancelled: "PAYMENT_CANCELLED"
};

export const businessPaymentStatuses = {
  required: "PAYMENT_REQUIRED",
  pending: "PAYMENT_PENDING",
  confirmed: "PAYMENT_CONFIRMED",
  failed: "PAYMENT_FAILED",
  cancelled: "PAYMENT_CANCELLED"
};

export const businessPaymentProviders = {
  manual: "MANUAL",
  notConfigured: "NOT_CONFIGURED",
  stripe: "STRIPE",
  paddle: "PADDLE",
  invoice: "INVOICE"
};

export const businessOnboardingStatuses = {
  notStarted: "NOT_STARTED",
  onboarding: "ONBOARDING",
  projectActive: "PROJECT_ACTIVE"
};

export const businessPartnerStatuses = {
  requested: "REQUESTED",
  reviewRequired: "REVIEW_REQUIRED"
};

export const businessCommercialRequestStatuses = {
  requested: "REQUESTED",
  contactPending: "CONTACT_PENDING",
  contacted: "CONTACTED",
  onboarding: "ONBOARDING"
};

export const businessAuditEvents = {
  businessCreated: "BUSINESS_CREATED",
  businessUpdated: "BUSINESS_UPDATED",
  intakeStarted: "INTAKE_STARTED",
  intakeCompleted: "INTAKE_COMPLETED",
  diagnosisCreated: "DIAGNOSIS_CREATED",
  growthPlanCreated: "GROWTH_PLAN_CREATED",
  offerCreated: "OFFER_CREATED",
  offerUpdated: "OFFER_UPDATED",
  offerApproved: "OFFER_APPROVED",
  offerDeclined: "OFFER_DECLINED",
  paymentRequestCreated: "PAYMENT_REQUEST_CREATED",
  paymentIntentCreated: "PAYMENT_INTENT_CREATED",
  paymentPending: "PAYMENT_PENDING",
  paymentConfirmed: "PAYMENT_CONFIRMED",
  paymentFailed: "PAYMENT_FAILED",
  paymentCancelled: "PAYMENT_CANCELLED",
  manualPaymentVerified: "MANUAL_PAYMENT_VERIFIED",
  onboardingStarted: "ONBOARDING_STARTED",
  projectActivated: "PROJECT_ACTIVATED",
  projectCreated: "PROJECT_CREATED",
  projectStatusChanged: "PROJECT_STATUS_CHANGED",
  businessPartnerRequested: "BUSINESS_PARTNER_REQUESTED",
  commercialRequestCreated: "COMMERCIAL_REQUEST_CREATED",
  businessHomeViewed: "BUSINESS_HOME_VIEWED",
  diagnosisViewed: "DIAGNOSIS_VIEWED",
  growthPlanViewed: "GROWTH_PLAN_VIEWED",
  offerViewed: "OFFER_VIEWED"
};

export const businessFunnelEvents = {
  businessHomeViewed: "BUSINESS_HOME_VIEWED",
  businessCreated: "BUSINESS_CREATED",
  businessIntakeStarted: "BUSINESS_INTAKE_STARTED",
  businessIntakeCompleted: "BUSINESS_INTAKE_COMPLETED",
  diagnosisViewed: "DIAGNOSIS_VIEWED",
  growthPlanViewed: "GROWTH_PLAN_VIEWED",
  offerViewed: "OFFER_VIEWED",
  offerApproved: "OFFER_APPROVED",
  paymentPageViewed: "PAYMENT_PAGE_VIEWED",
  paymentRequestCreated: "PAYMENT_REQUEST_CREATED",
  paymentPending: "PAYMENT_PENDING",
  paymentConfirmed: "PAYMENT_CONFIRMED",
  onboardingStarted: "ONBOARDING_STARTED",
  projectActivated: "PROJECT_ACTIVATED",
  commercialRequestCreated: "COMMERCIAL_REQUEST_CREATED",
  businessPartnerRequested: "BUSINESS_PARTNER_REQUESTED"
};

export const restrictedBusinessMetricKeys = [
  "approximateRevenue",
  "averageOrderValue",
  "leads",
  "customers",
  "conversion",
  "advertisingBudget",
  "marketingSpend"
];

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeUrl(value) {
  const text = normalizeText(value);
  if (!text) return null;
  return text.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
}

export function createSourceRef(input = {}) {
  return {
    sourceId: input.sourceId || createId("business_source"),
    sourceType: input.sourceType || "CLIENT_PROVIDED",
    retrievedAt: input.retrievedAt || nowIso(),
    freshnessStatus: input.freshnessStatus || leadFreshnessStates.current,
    dataClass: input.dataClass || businessDataClasses.clientPrivateData,
    factType: input.factType || "CLIENT_STATEMENT"
  };
}

export function createBusinessProfile(input = {}) {
  const createdAt = input.createdAt || nowIso();

  return {
    modelType: "BusinessProfile",
    businessId: input.businessId || createId("business"),
    organizationId: input.organizationId || null,
    ownerUserId: input.ownerUserId || null,
    name: normalizeText(input.name),
    industry: normalizeText(input.industry),
    businessType: normalizeText(input.businessType),
    country: normalizeText(input.country),
    region: normalizeText(input.region),
    city: normalizeText(input.city),
    website: normalizeUrl(input.website),
    socialLinks: safeArray(input.socialLinks).map(normalizeUrl).filter(Boolean),
    description: normalizeText(input.description),
    productsServices: safeArray(input.productsServices).map(normalizeText).filter(Boolean),
    targetAudience: normalizeText(input.targetAudience),
    currentSituation: normalizeText(input.currentSituation),
    goals: safeArray(input.goals).map(normalizeText).filter(Boolean),
    challenges: safeArray(input.challenges).map(normalizeText).filter(Boolean),
    preferredLanguages: safeArray(input.preferredLanguages).map(normalizeText).filter(Boolean),
    status: input.status || businessProfileStatuses.active,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createBusinessIntake(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const optionalMetrics = input.optionalMetrics && typeof input.optionalMetrics === "object"
    ? { ...input.optionalMetrics }
    : {};

  return {
    modelType: "BusinessIntake",
    intakeId: input.intakeId || createId("business_intake"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    intent: input.intent || "BUSINESS_GROWTH",
    businessName: normalizeText(input.businessName || input.name),
    industry: normalizeText(input.industry),
    location: normalizeText(input.location),
    website: normalizeUrl(input.website),
    socials: safeArray(input.socials || input.socialLinks).map(normalizeUrl).filter(Boolean),
    description: normalizeText(input.description),
    productsServices: safeArray(input.productsServices).map(normalizeText).filter(Boolean),
    targetAudience: normalizeText(input.targetAudience),
    currentSituation: normalizeText(input.currentSituation),
    challenges: safeArray(input.challenges).map(normalizeText).filter(Boolean),
    goals: safeArray(input.goals).map(normalizeText).filter(Boolean),
    existingChannels: safeArray(input.existingChannels).map(normalizeText).filter(Boolean),
    optionalMetrics,
    sourceRefs: safeArray(input.sourceRefs).length ? safeArray(input.sourceRefs) : [createSourceRef()],
    completeness: input.completeness || "PARTIAL",
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createCreationStep(input = {}) {
  return {
    modelType: "BusinessCreationStep",
    stepId: input.stepId || createId("business_creation_step"),
    businessId: input.businessId || null,
    organizationId: input.organizationId || null,
    stage: input.stage || businessLifecycleStages.create,
    title: normalizeText(input.title),
    status: input.status || "PENDING",
    requiredInputs: safeArray(input.requiredInputs),
    outputRefs: safeArray(input.outputRefs),
    approvalRequired: input.approvalRequired !== false,
    createdAt: input.createdAt || nowIso(),
    updatedAt: input.updatedAt || input.createdAt || nowIso()
  };
}

export function createBusinessCreationFlow(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const stages = [
    "Business idea",
    "Business model",
    "Market and geography",
    "Required resources",
    "Products and services",
    "Operating structure",
    "Digital infrastructure",
    "Sales",
    "Marketing",
    "Automation",
    "Financial model",
    "External services and partners",
    "Launch plan"
  ];
  return {
    modelType: "BusinessCreationFlow",
    creationFlowId: input.creationFlowId || createId("business_creation_flow"),
    businessId: input.businessId || null,
    organizationId: input.organizationId || null,
    requestedBy: input.requestedBy || null,
    intent: input.intent || "CREATE_BUSINESS",
    currentLifecycleStage: input.currentLifecycleStage || businessLifecycleStages.create,
    steps: safeArray(input.steps).length ? safeArray(input.steps) : stages.map((title) => createCreationStep({
      businessId: input.businessId || null,
      organizationId: input.organizationId || null,
      title
    })),
    explainsRequirements: true,
    requiresUserApprovalBeforeLaunch: true,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createManagementSubscription(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "BusinessManagementSubscription",
    subscriptionId: input.subscriptionId || createId("business_management_subscription"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    status: input.status || "NOT_ACTIVE",
    planKey: input.planKey || "UNCONFIGURED",
    pricingFinalized: false,
    businessScopedOwnership: true,
    portfolioBundleEligibleFuture: true,
    monitoringLevel: input.monitoringLevel || "NONE",
    reportingFrequency: input.reportingFrequency || "ON_DEMAND",
    includedOperations: safeArray(input.includedOperations),
    humanSupport: input.humanSupport || "NOT_CONFIGURED",
    approvalPolicy: input.approvalPolicy || businessAutonomyLevels.approveToExecute,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createBusinessManagementState(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "BusinessManagementState",
    managementStateId: input.managementStateId || createId("business_management_state"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    lifecycleStage: input.lifecycleStage || businessLifecycleStages.create,
    autonomyLevel: input.autonomyLevel || businessAutonomyLevels.approveToExecute,
    managementMode: input.managementMode || "MANAGE_MYSELF",
    subscriptionId: input.subscriptionId || null,
    integrations: safeArray(input.integrations),
    activeRecommendations: safeArray(input.activeRecommendations),
    pendingApprovalCount: Number(input.pendingApprovalCount || 0),
    healthStatus: input.healthStatus || businessHealthStates.unknown,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createOperationalMetric(input = {}) {
  return {
    modelType: "BusinessOperationalMetric",
    metricId: input.metricId || createId("business_metric"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    metricKey: input.metricKey,
    value: input.value ?? null,
    unit: input.unit || null,
    status: input.status || businessSignalStatuses.insufficientData,
    source: input.source || "NOT_CONNECTED",
    measuredAt: input.measuredAt || nowIso(),
    createdAt: input.createdAt || nowIso()
  };
}

export function createBusinessRecommendation(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "BusinessRecommendation",
    recommendationId: input.recommendationId || createId("business_recommendation"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    title: normalizeText(input.title),
    reasoning: normalizeText(input.reasoning),
    evidenceRefs: safeArray(input.evidenceRefs),
    proposedActionIds: safeArray(input.proposedActionIds),
    riskLevel: input.riskLevel || businessActionRiskLevels.low,
    status: input.status || "OPEN",
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function isApprovalRequiredForAction({ riskLevel, autonomyLevel, external = false } = {}) {
  if (external) return true;
  if ([businessActionRiskLevels.medium, businessActionRiskLevels.high, businessActionRiskLevels.regulated].includes(riskLevel)) return true;
  return autonomyLevel !== businessAutonomyLevels.delegatedAutomation;
}

export function createActionIntent(input = {}) {
  const riskLevel = input.riskLevel || businessActionRiskLevels.low;
  const autonomyLevel = input.autonomyLevel || businessAutonomyLevels.approveToExecute;
  const approvalRequired = isApprovalRequiredForAction({
    riskLevel,
    autonomyLevel,
    external: input.external === true
  });
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "BusinessActionIntent",
    actionIntentId: input.actionIntentId || createId("business_action_intent"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    actionType: input.actionType || "INTERNAL_TASK",
    title: normalizeText(input.title),
    riskLevel,
    autonomyLevel,
    external: input.external === true,
    approvalRequired,
    executionAllowedWithoutApproval: !approvalRequired,
    status: approvalRequired ? businessApprovalStatuses.required : businessApprovalStatuses.notRequired,
    payload: input.payload || {},
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createApprovalGate(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "BusinessApprovalGate",
    approvalGateId: input.approvalGateId || createId("business_approval_gate"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    actionIntentId: input.actionIntentId || null,
    status: input.status || businessApprovalStatuses.required,
    options: ["APPROVE", "MODIFY", "REJECT"],
    requiredForRiskLevel: input.requiredForRiskLevel || businessActionRiskLevels.medium,
    decidedBy: input.decidedBy || null,
    decidedAt: input.decidedAt || null,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createAutomationPermission(input = {}) {
  const riskLevel = input.riskLevel || businessActionRiskLevels.low;
  const autonomyLevel = input.autonomyLevel || businessAutonomyLevels.approveToExecute;
  const allowed = riskLevel === businessActionRiskLevels.low &&
    autonomyLevel === businessAutonomyLevels.delegatedAutomation &&
    input.explicitlyAuthorized === true;
  return {
    modelType: "BusinessAutomationPermission",
    automationPermissionId: input.automationPermissionId || createId("business_automation_permission"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    actionType: input.actionType || "INTERNAL_TASK",
    riskLevel,
    autonomyLevel,
    explicitlyAuthorized: input.explicitlyAuthorized === true,
    delegatedExecutionAllowed: allowed,
    approvalRequiredByDefault: !allowed,
    createdAt: input.createdAt || nowIso()
  };
}

export function createBusinessHealthSnapshot(input = {}) {
  const createdAt = input.createdAt || nowIso();
  const signals = input.signals || {};
  return {
    modelType: "BusinessHealthSnapshot",
    healthSnapshotId: input.healthSnapshotId || createId("business_health_snapshot"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    overallStatus: input.overallStatus || businessHealthStates.unknown,
    signals: {
      revenue: signals.revenue || businessSignalStatuses.notConnected,
      sales: signals.sales || businessSignalStatuses.notConnected,
      orders: signals.orders || businessSignalStatuses.notConnected,
      customers: signals.customers || businessSignalStatuses.notConnected,
      advertising: signals.advertising || businessSignalStatuses.notConnected,
      inventory: signals.inventory || businessSignalStatuses.notConnected,
      profitability: signals.profitability || businessSignalStatuses.insufficientData
    },
    fabricatedMetrics: false,
    sourceRefs: safeArray(input.sourceRefs),
    createdAt
  };
}

export function createFinancialOperationsBoundary(input = {}) {
  return {
    modelType: "BusinessFinancialOperationsBoundary",
    financialOperationsId: input.financialOperationsId || createId("business_financial_operations"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    supportedConcepts: [
      "REVENUE",
      "EXPENSES",
      "COGS",
      "GROSS_MARGIN",
      "OPERATING_MARGIN",
      "CASH_FLOW",
      "INVOICES",
      "PAYMENTS",
      "RECEIVABLES",
      "PAYABLES",
      "BUDGETS",
      "FORECASTS",
      "PROFITABILITY",
      "UNIT_ECONOMICS"
    ],
    regulatedAccountingProvided: false,
    requiresJurisdictionAdapterForLegalReporting: true
  };
}

export function createJurisdictionAdapterBoundary(input = {}) {
  return {
    modelType: "BusinessJurisdictionAdapterBoundary",
    jurisdictionAdapterId: input.jurisdictionAdapterId || createId("business_jurisdiction_adapter"),
    businessId: input.businessId,
    organizationId: input.organizationId,
    country: input.country || null,
    jurisdiction: input.jurisdiction || null,
    adapterStatus: input.adapterStatus || businessSignalStatuses.notConnected,
    providerType: input.providerType || "NOT_CONFIGURED",
    legalTaxReportingEnabled: false,
    localProviderRequiredForRegulatedAccounting: true
  };
}

export function validateBusinessProfileInput(input = {}) {
  const errors = [];
  if (!normalizeText(input.name)) errors.push("business_name_required");
  return { ok: errors.length === 0, errors };
}

export function validateBusinessIntakeInput(input = {}) {
  const errors = [];
  const hasUsefulInput = [
    input.businessName,
    input.name,
    input.description,
    input.website,
    input.currentSituation,
    ...(safeArray(input.goals)),
    ...(safeArray(input.challenges))
  ].some((value) => normalizeText(value));

  if (!input.businessId) errors.push("business_id_required");
  if (!hasUsefulInput) errors.push("intake_requires_business_context");
  return { ok: errors.length === 0, errors };
}

export function publicBusinessProjection(profile = {}) {
  return {
    businessId: profile.businessId,
    legalOrDisplayName: profile.name,
    businessType: profile.businessType,
    industry: profile.industry,
    country: profile.country,
    region: profile.region,
    city: profile.city,
    website: profile.website,
    socialProfiles: safeArray(profile.socialLinks),
    publicDescription: profile.description,
    sourceRefs: [createSourceRef({ dataClass: businessDataClasses.publicBusinessData })]
  };
}
