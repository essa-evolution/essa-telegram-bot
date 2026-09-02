import {
  businessCurrencies,
  businessPaymentModels,
  businessPricingStatuses,
  clone,
  createId,
  nowIso,
  safeArray
} from "../business/businessContracts.js";
import {
  leadDataClasses,
  leadFreshnessStates
} from "../leadIntelligence/leadContracts.js";

export const acquisitionLifecycleStates = {
  discovered: "DISCOVERED",
  normalized: "NORMALIZED",
  deduped: "DEDUPED",
  verifiedPublicRecord: "VERIFIED_PUBLIC_RECORD",
  qualified: "QUALIFIED",
  audited: "AUDITED",
  scored: "SCORED",
  demoSelected: "DEMO_SELECTED",
  demoReady: "DEMO_READY",
  outreachReady: "OUTREACH_READY",
  contactApproved: "CONTACT_APPROVED",
  contacted: "CONTACTED",
  demoViewed: "DEMO_VIEWED",
  interested: "INTERESTED",
  offerSent: "OFFER_SENT",
  accepted: "ACCEPTED",
  ownershipVerificationRequired: "OWNERSHIP_VERIFICATION_REQUIRED",
  paymentOrAgreementRequired: "PAYMENT_OR_AGREEMENT_REQUIRED",
  activating: "ACTIVATING",
  activeBusiness: "ACTIVE_BUSINESS",
  rejectedNotFit: "REJECTED_NOT_FIT",
  rejectedInsufficientEvidence: "REJECTED_INSUFFICIENT_EVIDENCE",
  rejectedPolicy: "REJECTED_POLICY",
  duplicate: "DUPLICATE",
  staleReviewRequired: "STALE_REVIEW_REQUIRED",
  paused: "PAUSED",
  suppressedDoNotContact: "SUPPRESSED_DO_NOT_CONTACT",
  outreachExpired: "OUTREACH_EXPIRED",
  demoExpired: "DEMO_EXPIRED",
  declined: "DECLINED",
  abandoned: "ABANDONED"
};

export const acquisitionDemoTypes = {
  homepageConcept: "HOMEPAGE_CONCEPT",
  serviceLandingPreview: "SERVICE_LANDING_PREVIEW",
  catalogPreviewV2: "CATALOG_PREVIEW",
  storefrontPreview: "STOREFRONT_PREVIEW",
  bookingFlowPreview: "BOOKING_FLOW_PREVIEW",
  menuOrderPreview: "MENU_ORDER_PREVIEW",
  projectPortfolioPreview: "PROJECT_PORTFOLIO_PREVIEW",
  developerProjectPreview: "DEVELOPER_PROJECT_PREVIEW",
  leadCapturePreview: "LEAD_CAPTURE_PREVIEW",
  contentCreativePreview: "CONTENT_CREATIVE_PREVIEW",
  businessDashboardPreview: "BUSINESS_DASHBOARD_PREVIEW",
  homepageRedesign: "HOMEPAGE_REDESIGN_CONCEPT",
  serviceLandingPage: "SERVICE_LANDING_PAGE_CONCEPT",
  catalogPreview: "CATALOG_PREVIEW_CONCEPT",
  hotelBookingExperience: "HOTEL_BOOKING_EXPERIENCE_CONCEPT",
  restaurantMenuOrder: "RESTAURANT_MENU_ORDER_EXPERIENCE_CONCEPT",
  developerPresentation: "DEVELOPER_PROJECT_PRESENTATION_CONCEPT",
  businessDashboard: "BUSINESS_DASHBOARD_CONCEPT"
};

export const acquisitionEventTypes = {
  prospectCreated: "PROSPECT_CREATED",
  digitalAuditCreated: "DIGITAL_OPPORTUNITY_AUDIT_CREATED",
  opportunityScored: "OPPORTUNITY_SCORED",
  demoProjectPrepared: "DEMO_PROJECT_PREPARED",
  offerPrepared: "ACQUISITION_OFFER_PREPARED",
  activationBlocked: "ACTIVATION_BLOCKED_PENDING_VERIFICATION"
};

export const demoPlanStatuses = {
  recommended: "RECOMMENDED",
  blockedInsufficientEvidence: "BLOCKED_INSUFFICIENT_EVIDENCE",
  blockedSafetyGate: "BLOCKED_SAFETY_GATE",
  executionDisabled: "EXECUTION_DISABLED_PHASE_B"
};

export const previewGenerationStatuses = {
  requested: "PREVIEW_GENERATION_REQUESTED",
  blocked: "PREVIEW_GENERATION_BLOCKED",
  readyForHumanReview: "PREVIEW_READY_FOR_HUMAN_REVIEW"
};

export const previewQcStatuses = {
  pass: "PASS",
  passWithWarnings: "PASS_WITH_WARNINGS",
  blocked: "BLOCKED"
};

export const previewReviewStates = {
  readyForHumanReview: "PREVIEW_READY_FOR_HUMAN_REVIEW",
  inReview: "IN_REVIEW",
  clientPreviewReady: "CLIENT_PREVIEW_READY",
  revisionRequested: "REVISION_REQUESTED",
  revisionInProgress: "REVISION_IN_PROGRESS",
  rejected: "REJECTED"
};

export const previewReviewDecisions = {
  approveForClientPreview: "APPROVE_FOR_CLIENT_PREVIEW",
  requestRevision: "REQUEST_REVISION",
  rejectPreview: "REJECT_PREVIEW",
  pauseReview: "PAUSE_REVIEW"
};

export const previewRevisionStatuses = {
  requested: "REVISION_REQUESTED",
  inProgress: "REVISION_IN_PROGRESS",
  previewRegenerated: "PREVIEW_REGENERATED",
  blocked: "REVISION_BLOCKED"
};

export const sharePreparationStatuses = {
  draft: "DRAFT",
  eligibilityChecked: "ELIGIBILITY_CHECKED",
  accessPolicyReady: "ACCESS_POLICY_READY",
  manualShareReady: "MANUAL_SHARE_READY",
  blocked: "BLOCKED",
  revoked: "REVOKED",
  expired: "EXPIRED",
  stale: "STALE"
};

export const recipientEligibilityStatuses = {
  eligible: "ELIGIBLE",
  requiresReview: "REQUIRES_REVIEW",
  blocked: "BLOCKED"
};

export const recipientBasisTypes = {
  verifiedPublicBusinessContact: "VERIFIED_PUBLIC_BUSINESS_CONTACT",
  explicitlyAuthorizedBusinessContact: "EXPLICITLY_AUTHORIZED_BUSINESS_CONTACT",
  safeBusinessContactReviewRequired: "SAFE_BUSINESS_CONTACT_REVIEW_REQUIRED",
  personalPrivateBlocked: "PERSONAL_PRIVATE_BLOCKED"
};

export const shareAccessPolicyTypes = {
  privatePreview: "PRIVATE_PREVIEW",
  manualRecipientOnly: "MANUAL_RECIPIENT_ONLY",
  expiringAccess: "EXPIRING_ACCESS"
};

export const shareRevocationReasons = {
  previewRevised: "PREVIEW_REVISED",
  factualityIssue: "FACTUALITY_ISSUE",
  prospectSuppressed: "PROSPECT_SUPPRESSED",
  contactOptOut: "CONTACT_OPT_OUT",
  humanRevoked: "HUMAN_REVOKED",
  policyViolation: "POLICY_VIOLATION",
  expired: "EXPIRED"
};

export const deliveryIntentStatuses = {
  draft: "DRAFT",
  preflightReady: "PREFLIGHT_READY",
  awaitingHumanApproval: "AWAITING_HUMAN_APPROVAL",
  humanApproved: "HUMAN_APPROVED",
  finalValidationPassed: "FINAL_VALIDATION_PASSED",
  approvedForFutureDelivery: "APPROVED_FOR_FUTURE_DELIVERY",
  blocked: "BLOCKED",
  rejected: "REJECTED",
  revoked: "REVOKED",
  expired: "EXPIRED",
  requiresReapproval: "REQUIRES_REAPPROVAL"
};

export const deliveryChannels = {
  email: "EMAIL",
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
  businessDm: "BUSINESS_DM"
};

export const deliveryChannelPlanningStatuses = {
  supportedForPlanning: "SUPPORTED_FOR_PLANNING",
  requiresProviderLater: "REQUIRES_PROVIDER_LATER",
  blocked: "BLOCKED"
};

export const deliveryPreflightStatuses = {
  pass: "PASS",
  passWithWarnings: "PASS_WITH_WARNINGS",
  blocked: "BLOCKED"
};

export const humanSendApprovalStatuses = {
  active: "ACTIVE",
  rejected: "REJECTED",
  revoked: "REVOKED",
  expired: "EXPIRED",
  invalidated: "INVALIDATED"
};

export const finalPreExecutionValidationStatuses = {
  approvedForFutureDelivery: "APPROVED_FOR_FUTURE_DELIVERY",
  requiresReapproval: "REQUIRES_REAPPROVAL",
  blocked: "BLOCKED",
  expired: "EXPIRED",
  revoked: "REVOKED"
};

export const acquisitionSafetyBoundary = {
  publicBusinessDataOnly: true,
  demoOnlyBeforePurchase: true,
  noSourceFileTransferBeforePurchase: true,
  noProductionDomainHandoffBeforePurchase: true,
  noFakeOfficialWebsite: true,
  noAutomatedOutreach: true,
  outreachSendEnabled: false,
  crmMutationEnabled: false,
  providerCalls: 0,
  externalCalls: 0,
  externalModelCalls: 0,
  paymentActions: 0,
  publishActions: 0,
  deployActions: 0,
  businessProfileCreated: false,
  supabaseMutation: false
};

export const acquisitionScoreVersion = "business-acquisition-score-v1";

export function createProspectSource(input = {}) {
  return {
    modelType: "ProspectSource",
    sourceId: input.sourceId || createId("prospect_source"),
    sourceType: input.sourceType || "PUBLIC_BUSINESS_SOURCE",
    sourceRef: input.sourceRef || input.url || null,
    retrievedAt: input.retrievedAt || nowIso(),
    freshnessStatus: input.freshnessStatus || input.dataFreshness || leadFreshnessStates.unknown,
    dataClass: input.dataClass || leadDataClasses.publicBusinessData,
    factType: input.factType || "OBSERVED_PUBLIC_BUSINESS_FACT",
    publicDataOnly: input.publicDataOnly !== false,
    termsReviewRequired: input.termsReviewRequired !== false,
    robotsReviewRequired: input.robotsReviewRequired !== false
  };
}

export function createBusinessProspect(input = {}) {
  const business = input.business || input.entity || {};
  const createdAt = input.createdAt || nowIso();
  const sourceRefs = safeArray(input.sourceRefs?.length ? input.sourceRefs : business.sourceRefs)
    .map((source) => createProspectSource({
      ...source,
      freshnessStatus: source.freshnessStatus || business.dataFreshness || leadFreshnessStates.unknown
    }));

  return {
    modelType: "BusinessProspect",
    prospectId: input.prospectId || `prospect_${business.businessId || createId("business")}`,
    sourceBusinessEntityId: business.businessId || null,
    legalOrDisplayName: business.legalOrDisplayName || input.legalOrDisplayName || "",
    businessType: business.businessType || input.businessType || "",
    industry: business.industry || input.industry || "",
    subIndustry: business.subIndustry || input.subIndustry || "",
    country: business.country || input.country || "",
    region: business.region || input.region || "",
    city: business.city || input.city || "",
    website: business.website || input.website || null,
    publicBusinessEmail: business.publicBusinessEmail || input.publicBusinessEmail || null,
    publicBusinessPhone: business.publicBusinessPhone || input.publicBusinessPhone || null,
    socialProfiles: safeArray(business.socialProfiles || input.socialProfiles),
    directoryProfiles: safeArray(business.directoryProfiles || input.directoryProfiles),
    publicDescription: business.publicDescription || input.publicDescription || "",
    sourceRefs,
    verificationStatus: input.verificationStatus || business.verificationStatus || "REVIEW_REQUIRED",
    dataFreshness: input.dataFreshness || business.dataFreshness || leadFreshnessStates.unknown,
    lifecycleState: input.lifecycleState || acquisitionLifecycleStates.verifiedPublicRecord,
    publicDataOnly: true,
    businessProfileCreated: false,
    linkedBusinessId: null,
    suppressionStatus: input.suppressionStatus || null,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createDigitalOpportunityAudit(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "DigitalOpportunityAudit",
    auditId: input.auditId || createId("digital_opportunity_audit"),
    prospectId: input.prospectId,
    observedFacts: safeArray(input.observedFacts),
    inferredOpportunities: safeArray(input.inferredOpportunities),
    prohibitedInterpretations: safeArray(input.prohibitedInterpretations),
    missingEvidence: safeArray(input.missingEvidence),
    recommendedDemoTypes: safeArray(input.recommendedDemoTypes),
    sourceRefs: safeArray(input.sourceRefs),
    dataPolicy: {
      publicBusinessDataOnly: true,
      noSensitivePersonalData: true,
      noGoodBadBusinessClassification: true,
      observedFactsSeparatedFromInferences: true
    },
    status: input.status || "AUDIT_READY",
    createdAt
  };
}

export function createOpportunityScore(input = {}) {
  const componentScores = input.componentScores || {};
  const total = Object.values(componentScores).reduce((sum, value) => sum + Number(value || 0), 0);
  return {
    modelType: "OpportunityScore",
    scoreId: input.scoreId || createId("opportunity_score"),
    prospectId: input.prospectId,
    scoreVersion: input.scoreVersion || acquisitionScoreVersion,
    total,
    totalClass: input.totalClass || (total >= 14 ? "HIGH_PRIORITY" : total >= 9 ? "MEDIUM_PRIORITY" : total >= 5 ? "LOW_PRIORITY" : "INSUFFICIENT_EVIDENCE"),
    componentScores: clone(componentScores),
    evidenceRefs: safeArray(input.evidenceRefs),
    reviewRequired: input.reviewRequired !== false,
    sensitivePersonalDataUsed: false,
    createdAt: input.createdAt || nowIso()
  };
}

export function createDemoProject(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "DemoProject",
    demoProjectId: input.demoProjectId || createId("demo_project"),
    prospectId: input.prospectId,
    demoType: input.demoType || acquisitionDemoTypes.homepageRedesign,
    title: input.title || "ESSA Business Demo Concept",
    lifecycleState: input.lifecycleState || acquisitionLifecycleStates.demoReady,
    status: input.status || "DEMO_READY",
    conceptOnly: true,
    productionWorkspace: false,
    sourceFilesTransferable: false,
    productionDomainHandoff: false,
    officialWebsiteClaim: false,
    demoLabelRequired: true,
    visibleDemoLabel: input.visibleDemoLabel || "DEMO / CONCEPT",
    artifacts: safeArray(input.artifacts),
    selectedBecause: safeArray(input.selectedBecause),
    providerProvenance: input.providerProvenance || {
      provider: "NONE",
      model: "NONE",
      workflow: "LOCAL_CONTRACT_ONLY",
      providerCalls: 0,
      externalModelCalls: 0
    },
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createDemoArtifact(input = {}) {
  return {
    modelType: "DemoArtifact",
    demoArtifactId: input.demoArtifactId || createId("demo_artifact"),
    demoProjectId: input.demoProjectId,
    prospectId: input.prospectId,
    artifactType: input.artifactType || "DEMO_BRIEF",
    title: input.title || "Demo concept brief",
    payload: clone(input.payload || {}),
    visibleDemoLabel: input.visibleDemoLabel || "DEMO / CONCEPT",
    productionDeliverable: false,
    transferAllowedBeforePurchase: false,
    providerProvenance: input.providerProvenance || {
      provider: "NONE",
      model: "NONE",
      workflow: "LOCAL_CONTRACT_ONLY"
    },
    createdAt: input.createdAt || nowIso()
  };
}

export function createDemoArtifactPlan(input = {}) {
  return {
    modelType: "DemoArtifactPlan",
    artifactPlanId: input.artifactPlanId || createId("demo_artifact_plan"),
    artifactType: input.artifactType || "STRUCTURED_GENERATION_BRIEF",
    title: input.title || "Planned demo artifact",
    purpose: input.purpose || "",
    contentStructure: safeArray(input.contentStructure),
    proposedCta: input.proposedCta || null,
    visualDirection: input.visualDirection || null,
    requiredImages: safeArray(input.requiredImages),
    structuredGenerationBrief: clone(input.structuredGenerationBrief || {}),
    previewMetadata: clone(input.previewMetadata || {}),
    generated: false,
    productionDeliverable: false,
    transferAllowedBeforePurchase: false
  };
}

export function createDemoRecommendation(input = {}) {
  return {
    modelType: "DemoRecommendation",
    recommendationId: input.recommendationId || createId("demo_recommendation"),
    prospectId: input.prospectId,
    opportunityAssessmentId: input.opportunityAssessmentId || input.digitalAuditId || null,
    demoType: input.demoType,
    businessContext: input.businessContext || "GENERAL_BUSINESS",
    targetProblem: input.targetProblem || "",
    expectedValue: input.expectedValue || "",
    evidenceRefs: safeArray(input.evidenceRefs),
    sourceSnapshotRefs: safeArray(input.sourceSnapshotRefs),
    reasoningCodes: safeArray(input.reasoningCodes),
    score: Number(input.score || 0),
    priority: Number(input.priority || 0),
    requiredCapabilities: safeArray(input.requiredCapabilities),
    optionalCapabilities: safeArray(input.optionalCapabilities),
    rejected: input.rejected === true,
    rejectionReasons: safeArray(input.rejectionReasons),
    restrictions: safeArray(input.restrictions),
    assumptions: safeArray(input.assumptions),
    missingInputs: safeArray(input.missingInputs),
    riskClass: input.riskClass || "MEDIUM",
    estimatedCostClass: input.estimatedCostClass || "LOCAL_COMPUTE",
    approvalRequirements: safeArray(input.approvalRequirements),
    providerRequirements: safeArray(input.providerRequirements),
    createdAt: input.createdAt || nowIso()
  };
}

export function createCanonicalDemoPlan(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "DemoPlan",
    demoPlanId: input.demoPlanId || createId("demo_plan"),
    prospectId: input.prospectId,
    opportunityAssessmentId: input.opportunityAssessmentId || input.digitalAuditId || null,
    selectedRecommendation: input.selectedRecommendation || null,
    rejectedAlternatives: safeArray(input.rejectedAlternatives),
    demoType: input.demoType || input.selectedRecommendation?.demoType || null,
    businessContext: input.businessContext || input.selectedRecommendation?.businessContext || "GENERAL_BUSINESS",
    targetProblem: input.targetProblem || input.selectedRecommendation?.targetProblem || "",
    expectedValue: input.expectedValue || input.selectedRecommendation?.expectedValue || "",
    evidenceRefs: safeArray(input.evidenceRefs || input.selectedRecommendation?.evidenceRefs),
    sourceSnapshotRefs: safeArray(input.sourceSnapshotRefs || input.selectedRecommendation?.sourceSnapshotRefs),
    requiredCapabilities: safeArray(input.requiredCapabilities || input.selectedRecommendation?.requiredCapabilities),
    optionalCapabilities: safeArray(input.optionalCapabilities || input.selectedRecommendation?.optionalCapabilities),
    artifactPlan: safeArray(input.artifactPlan),
    generationSteps: safeArray(input.generationSteps),
    contentInputs: clone(input.contentInputs || {}),
    brandInputs: clone(input.brandInputs || {}),
    missingInputs: safeArray(input.missingInputs || input.selectedRecommendation?.missingInputs),
    assumptions: safeArray(input.assumptions || input.selectedRecommendation?.assumptions),
    restrictions: safeArray(input.restrictions || input.selectedRecommendation?.restrictions),
    reasoningCodes: safeArray(input.reasoningCodes || input.selectedRecommendation?.reasoningCodes),
    riskClass: input.riskClass || input.selectedRecommendation?.riskClass || "MEDIUM",
    estimatedCostClass: input.estimatedCostClass || input.selectedRecommendation?.estimatedCostClass || "LOCAL_COMPUTE",
    approvalRequirements: safeArray(input.approvalRequirements || input.selectedRecommendation?.approvalRequirements),
    providerRequirements: safeArray(input.providerRequirements || input.selectedRecommendation?.providerRequirements),
    generationStatus: input.generationStatus || demoPlanStatuses.executionDisabled,
    publishAllowed: false,
    handoffAllowed: false,
    executionEnabled: false,
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    paymentActions: 0,
    deployActions: 0,
    boundary: {
      demoPlanOnly: true,
      generatedPreviewFutureOnly: true,
      productionProjectRequiresClientAcceptance: true,
      paidDeliverableRequiresCommercialBoundary: true
    },
    safetyGate: input.safetyGate || null,
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createPreviewGenerationRequest(input = {}) {
  return {
    modelType: "PreviewGenerationRequest",
    generationRequestId: input.generationRequestId || createId("preview_generation_request"),
    demoPlanId: input.demoPlanId,
    prospectId: input.prospectId,
    demoType: input.demoType,
    executionMode: "LOCAL_ONLY",
    allowedArtifactTypes: safeArray(input.allowedArtifactTypes || ["preview.json", "index.html", "preview.css", "audit.json"]),
    sourceSnapshotRefs: safeArray(input.sourceSnapshotRefs),
    evidenceRefs: safeArray(input.evidenceRefs),
    brandInputs: clone(input.brandInputs || {}),
    assetInputs: clone(input.assetInputs || {}),
    missingInputsPolicy: input.missingInputsPolicy || "USE_BOUNDED_PLACEHOLDERS",
    costCeiling: input.costCeiling || "LOCAL_COMPUTE_ONLY",
    approvalState: input.approvalState || "LOCAL_PREVIEW_APPROVED",
    idempotencyKey: input.idempotencyKey || null,
    requestedAt: input.requestedAt || nowIso()
  };
}

export function createGeneratedPreview(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "GeneratedPreview",
    previewId: input.previewId || createId("generated_preview"),
    parentPreviewId: input.parentPreviewId || null,
    parentVersion: input.parentVersion || null,
    revisionRequestId: input.revisionRequestId || null,
    changedSections: safeArray(input.changedSections),
    unchangedSections: safeArray(input.unchangedSections),
    evidenceDelta: safeArray(input.evidenceDelta),
    assumptionDelta: safeArray(input.assumptionDelta),
    artifactDelta: safeArray(input.artifactDelta),
    demoPlanId: input.demoPlanId,
    prospectId: input.prospectId,
    demoType: input.demoType,
    status: input.status || previewGenerationStatuses.readyForHumanReview,
    version: input.version || "1.0.0",
    sourceSnapshotRefs: safeArray(input.sourceSnapshotRefs),
    evidenceRefs: safeArray(input.evidenceRefs),
    generatedArtifacts: safeArray(input.generatedArtifacts),
    artifactFormat: input.artifactFormat || "LOCAL_HTML_PACKAGE",
    contentModel: clone(input.contentModel || {}),
    layoutModel: clone(input.layoutModel || {}),
    ctaModel: clone(input.ctaModel || {}),
    brandModel: clone(input.brandModel || {}),
    assumptions: safeArray(input.assumptions),
    missingInputs: safeArray(input.missingInputs),
    placeholdersUsed: safeArray(input.placeholdersUsed),
    blockedClaims: safeArray(input.blockedClaims),
    generationMethod: input.generationMethod || "DETERMINISTIC_LOCAL_TEMPLATE",
    generatorVersion: input.generatorVersion || "business-acquisition-preview-generator-v1",
    provider: "LOCAL",
    providerModel: "NONE",
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    commercialUseAllowed: false,
    publishAllowed: false,
    handoffAllowed: false,
    productionReady: false,
    watermarkRequired: true,
    qcStatus: input.qcStatus || "PENDING",
    auditRef: input.auditRef || null,
    createdAt,
    expiresAt: input.expiresAt || null
  };
}

export function createPreviewReview(input = {}) {
  const decision = input.decision || previewReviewDecisions.approveForClientPreview;
  const nextState = input.nextState ||
    (decision === previewReviewDecisions.approveForClientPreview
      ? previewReviewStates.clientPreviewReady
      : decision === previewReviewDecisions.requestRevision
        ? previewReviewStates.revisionRequested
        : decision === previewReviewDecisions.rejectPreview
          ? previewReviewStates.rejected
          : previewReviewStates.inReview);
  return {
    modelType: "PreviewReview",
    reviewId: input.reviewId || createId("preview_review"),
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    demoPlanId: input.demoPlanId,
    prospectId: input.prospectId,
    reviewStatus: input.reviewStatus || "DECIDED",
    reviewerType: input.reviewerType || "HUMAN_OPERATOR",
    reviewerRef: input.reviewerRef || null,
    reviewedAt: input.reviewedAt || nowIso(),
    decision,
    decisionReasonCodes: safeArray(input.decisionReasonCodes),
    comments: input.comments || "",
    requestedChanges: safeArray(input.requestedChanges),
    approvedScope: input.approvedScope || {
      clientPreviewOnly: decision === previewReviewDecisions.approveForClientPreview,
      mayLaterBeShownToProspect: decision === previewReviewDecisions.approveForClientPreview,
      publishAllowed: false,
      productionUseAllowed: false,
      commercialHandoffAllowed: false,
      sourceTransferAllowed: false,
      businessProfileCreationAllowed: false
    },
    clientShareAllowed: decision === previewReviewDecisions.approveForClientPreview,
    productionUseAllowed: false,
    publishAllowed: false,
    commercialHandoffAllowed: false,
    nextState,
    auditRef: input.auditRef || null,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    paymentActions: 0,
    publishActions: 0,
    productionHandoffs: 0
  };
}

export function createPreviewRevisionRequest(input = {}) {
  return {
    modelType: "PreviewRevisionRequest",
    revisionRequestId: input.revisionRequestId || createId("preview_revision_request"),
    reviewId: input.reviewId,
    previewId: input.previewId,
    sourcePreviewVersion: input.sourcePreviewVersion || "1.0.0",
    requestedChanges: safeArray(input.requestedChanges),
    changeCategories: safeArray(input.changeCategories),
    reasonCodes: safeArray(input.reasonCodes),
    allowedChangeScope: safeArray(input.allowedChangeScope || ["copy", "layout", "cta", "placeholders"]),
    newEvidenceAllowed: input.newEvidenceAllowed === true,
    newAssumptionsAllowed: input.newAssumptionsAllowed !== false,
    requestedBy: input.requestedBy || null,
    requestedAt: input.requestedAt || nowIso(),
    status: input.status || previewRevisionStatuses.requested,
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    outreachActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}

export function createSharePreparationRequest(input = {}) {
  return {
    modelType: "SharePreparationRequest",
    sharePreparationId: input.sharePreparationId || createId("share_preparation"),
    prospectId: input.prospectId,
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    reviewId: input.reviewId,
    recipientRef: input.recipientRef || null,
    recipientChannel: input.recipientChannel || "PUBLIC_BUSINESS_EMAIL",
    recipientSourceRef: input.recipientSourceRef || null,
    requestedBy: input.requestedBy || null,
    requestedAt: input.requestedAt || nowIso(),
    requestedAccessScope: input.requestedAccessScope || "PRIVATE_PREVIEW_MANUAL_RECIPIENT_ONLY",
    requestedExpiration: input.requestedExpiration || null,
    sharePurpose: input.sharePurpose || "SHOW_APPROVED_DEMO_PREVIEW_TO_PROSPECT_LATER",
    approvalRef: input.approvalRef || null,
    status: input.status || sharePreparationStatuses.draft,
    outboundDeliveryEnabled: false
  };
}

export function createRecipientEligibilityCheck(input = {}) {
  return {
    modelType: "RecipientEligibilityCheck",
    recipientEligibilityId: input.recipientEligibilityId || createId("recipient_eligibility"),
    prospectId: input.prospectId,
    recipientRef: input.recipientRef || null,
    recipientChannel: input.recipientChannel || null,
    recipientBasis: input.recipientBasis || recipientBasisTypes.safeBusinessContactReviewRequired,
    status: input.status || recipientEligibilityStatuses.requiresReview,
    reasonCodes: safeArray(input.reasonCodes),
    provenanceRefs: safeArray(input.provenanceRefs),
    suppressionCheck: clone(input.suppressionCheck || {}),
    redactedRecipient: input.redactedRecipient || null,
    checkedAt: input.checkedAt || nowIso(),
    providerCalls: 0,
    externalCalls: 0
  };
}

export function createShareAccessPolicy(input = {}) {
  return {
    modelType: "ShareAccessPolicy",
    accessPolicyId: input.accessPolicyId || createId("share_access_policy"),
    policyTypes: safeArray(input.policyTypes || [
      shareAccessPolicyTypes.privatePreview,
      shareAccessPolicyTypes.manualRecipientOnly,
      shareAccessPolicyTypes.expiringAccess
    ]),
    expiresAt: input.expiresAt,
    allowedRecipientScope: input.allowedRecipientScope || "EXACT_ELIGIBLE_RECIPIENT_ONLY",
    futureAuthenticationRequired: input.futureAuthenticationRequired !== false,
    downloadAllowed: false,
    forwardingPolicy: input.forwardingPolicy || "FORWARDING_NOT_AUTHORIZED",
    sourceAccessAllowed: false,
    productionUseAllowed: false,
    publicAccessAllowed: false,
    revocationState: input.revocationState || "ACTIVE",
    watermarkRequired: true,
    disclaimerRequirements: [
      "ESSA DEMO / CONCEPT",
      "NOT OFFICIAL WEBSITE",
      "NON_PRODUCTION_PREVIEW"
    ],
    createdAt: input.createdAt || nowIso()
  };
}

export function createClientPreviewSharePackage(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "ClientPreviewSharePackage",
    sharePackageId: input.sharePackageId || createId("client_preview_share_package"),
    prospectId: input.prospectId,
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    reviewId: input.reviewId,
    recipientEligibilityRef: input.recipientEligibilityRef,
    artifactRefs: safeArray(input.artifactRefs),
    artifactIntegrityRefs: safeArray(input.artifactIntegrityRefs),
    accessPolicyRef: input.accessPolicyRef,
    createdAt,
    expiresAt: input.expiresAt,
    status: input.status || sharePreparationStatuses.manualShareReady,
    clientShareAllowed: input.clientShareAllowed === true,
    sendAllowed: false,
    publicAccessAllowed: false,
    downloadAllowed: false,
    sourceTransferAllowed: false,
    editAllowed: false,
    productionUseAllowed: false,
    commercialUseAllowed: false,
    publishAllowed: false,
    forwardingPolicy: input.forwardingPolicy || "FORWARDING_NOT_AUTHORIZED",
    watermarkRequired: true,
    auditRef: input.auditRef || null,
    revokedAt: input.revokedAt || null,
    revocationReason: input.revocationReason || null,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}

export function createDeliveryIntentDraft(input = {}) {
  const requestedAt = input.requestedAt || nowIso();
  return {
    modelType: "DeliveryIntentDraft",
    deliveryIntentId: input.deliveryIntentId || createId("delivery_intent"),
    prospectId: input.prospectId,
    sharePackageId: input.sharePackageId,
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    recipientEligibilityRef: input.recipientEligibilityRef,
    recipientRef: input.recipientRef || null,
    redactedRecipient: input.redactedRecipient || null,
    channel: input.channel || deliveryChannels.email,
    channelPolicy: clone(input.channelPolicy || {}),
    messageDraftRef: input.messageDraftRef || null,
    messageFingerprint: input.messageFingerprint || null,
    artifactIntegrityRefs: safeArray(input.artifactIntegrityRefs),
    accessPolicyRef: input.accessPolicyRef || null,
    requestedBy: input.requestedBy || "local_operator",
    requestedAt,
    purpose: input.purpose || "PREPARE_EXACT_CLIENT_PREVIEW_DELIVERY_FOR_HUMAN_APPROVAL",
    status: input.status || deliveryIntentStatuses.draft,
    executionEnabled: false,
    providerExecutionAllowed: false,
    approvalRequired: true,
    auditRef: input.auditRef || null,
    idempotencyKey: input.idempotencyKey || null,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}

export function createDeliveryMessagePreview(input = {}) {
  return {
    modelType: "DeliveryMessagePreview",
    messagePreviewId: input.messagePreviewId || createId("delivery_message_preview"),
    prospectId: input.prospectId,
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    channel: input.channel || deliveryChannels.email,
    subject: input.subject || null,
    body: input.body || "",
    claims: safeArray(input.claims),
    evidenceRefs: safeArray(input.evidenceRefs),
    reasoningRefs: safeArray(input.reasoningRefs),
    blockedClaims: safeArray(input.blockedClaims),
    factualityStatus: input.factualityStatus || "PENDING",
    messageFingerprint: input.messageFingerprint || null,
    generatedLocally: true,
    providerCalls: 0,
    externalCalls: 0,
    createdAt: input.createdAt || nowIso()
  };
}

export function createDeliveryPreflight(input = {}) {
  return {
    modelType: "DeliveryPreflight",
    deliveryPreflightId: input.deliveryPreflightId || createId("delivery_preflight"),
    deliveryIntentId: input.deliveryIntentId,
    sharePackageId: input.sharePackageId,
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    recipientEligibilityRef: input.recipientEligibilityRef,
    channel: input.channel || deliveryChannels.email,
    messageFingerprint: input.messageFingerprint || null,
    actionFingerprint: input.actionFingerprint || null,
    status: input.status || deliveryPreflightStatuses.blocked,
    reasonCodes: safeArray(input.reasonCodes),
    warnings: safeArray(input.warnings),
    checks: clone(input.checks || {}),
    approvalRequired: true,
    executionEnabled: false,
    providerExecutionAllowed: false,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    checkedAt: input.checkedAt || nowIso()
  };
}

export function createHumanSendApproval(input = {}) {
  return {
    modelType: "HumanSendApproval",
    sendApprovalId: input.sendApprovalId || createId("send_approval"),
    deliveryIntentId: input.deliveryIntentId,
    sharePackageId: input.sharePackageId,
    previewId: input.previewId,
    previewVersion: input.previewVersion || "1.0.0",
    recipientRef: input.recipientRef || null,
    redactedRecipient: input.redactedRecipient || null,
    recipientEligibilityRef: input.recipientEligibilityRef,
    channel: input.channel || deliveryChannels.email,
    messageFingerprint: input.messageFingerprint,
    artifactIntegrityRefs: safeArray(input.artifactIntegrityRefs),
    approvedBy: input.approvedBy || null,
    approvedAt: input.approvedAt || nowIso(),
    expiresAt: input.expiresAt || null,
    approvalScope: clone(input.approvalScope || {}),
    status: input.status || humanSendApprovalStatuses.active,
    revokedAt: input.revokedAt || null,
    revocationReason: input.revocationReason || null,
    actionFingerprint: input.actionFingerprint,
    idempotencyKey: input.idempotencyKey || null,
    executionAuthorityNow: false,
    futureExecutionBoundaryOnly: true,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}

export function createFinalPreExecutionValidation(input = {}) {
  return {
    modelType: "FinalPreExecutionValidation",
    validationId: input.validationId || createId("final_pre_execution_validation"),
    deliveryIntentId: input.deliveryIntentId,
    sendApprovalId: input.sendApprovalId || null,
    actionFingerprint: input.actionFingerprint || null,
    expectedActionFingerprint: input.expectedActionFingerprint || null,
    status: input.status || finalPreExecutionValidationStatuses.blocked,
    reasonCodes: safeArray(input.reasonCodes),
    checks: clone(input.checks || {}),
    executionIntentCreationAllowed: input.executionIntentCreationAllowed === true,
    executionEnabled: false,
    providerExecutionAllowed: false,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    checkedAt: input.checkedAt || nowIso()
  };
}

export function createDeliveryIntentAudit(input = {}) {
  return {
    artifactType: input.artifactType || "BusinessAcquisitionDeliveryIntentAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_F",
    deliveryIntentId: input.deliveryIntentId || null,
    sharePackageId: input.sharePackageId || null,
    previewId: input.previewId || null,
    previewVersion: input.previewVersion || "1.0.0",
    recipientEligibilityRef: input.recipientEligibilityRef || null,
    redactedRecipient: input.redactedRecipient || null,
    channel: input.channel || null,
    messageFingerprint: input.messageFingerprint || null,
    evidenceRefs: safeArray(input.evidenceRefs),
    preflightResult: input.preflightResult || null,
    actionFingerprint: input.actionFingerprint || null,
    approvalRef: input.approvalRef || null,
    approvalState: input.approvalState || null,
    expiration: input.expiration || null,
    revocation: input.revocation || null,
    finalValidationResult: input.finalValidationResult || null,
    stateTransitions: safeArray(input.stateTransitions),
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    createdAt: input.createdAt || nowIso()
  };
}

export function createAcquisitionOffer(input = {}) {
  const createdAt = input.createdAt || nowIso();
  return {
    modelType: "AcquisitionOffer",
    acquisitionOfferId: input.acquisitionOfferId || createId("acquisition_offer"),
    prospectId: input.prospectId,
    demoProjectId: input.demoProjectId || null,
    title: input.title || "ESSA Business preview offer",
    offerConfiguration: {
      pricingModel: input.pricingModel || businessPaymentModels.custom,
      currency: input.currency || businessCurrencies.usd,
      fixedPrice: input.fixedPrice ?? null,
      setupFee: input.setupFee ?? null,
      subscriptionAmount: input.subscriptionAmount ?? null,
      packageKey: input.packageKey || null,
      optionalModules: safeArray(input.optionalModules),
      upgradePath: safeArray(input.upgradePath)
    },
    pricingStatus: input.pricingStatus || businessPricingStatuses.requiresConfiguration,
    hardCodedPrice: false,
    demoIncludedBeforePurchase: input.demoIncludedBeforePurchase !== false,
    fullImplementationPaid: true,
    sourceFileTransferBeforePurchase: false,
    productionDomainHandoffBeforePurchase: false,
    acceptanceStatus: input.acceptanceStatus || "NOT_ACCEPTED",
    createdAt,
    updatedAt: input.updatedAt || createdAt
  };
}

export function createAcquisitionAuditArtifact(input = {}) {
  return {
    artifactType: "BusinessAcquisitionDemoEngineProof",
    phase: "BUSINESS_ACQUISITION_PHASE_A",
    status: input.status || "BUSINESS_ACQUISITION_PHASE_A_PASS",
    prospectId: input.prospectId,
    digitalAuditId: input.digitalAuditId,
    scoreId: input.scoreId,
    demoProjectId: input.demoProjectId,
    acquisitionOfferId: input.acquisitionOfferId,
    lifecycleState: input.lifecycleState || acquisitionLifecycleStates.demoReady,
    exactArtifacts: safeArray(input.exactArtifacts),
    sourceRefs: safeArray(input.sourceRefs),
    counters: {
      ...acquisitionSafetyBoundary,
      ...(input.counters || {})
    },
    safety: {
      publicDataOnly: true,
      noBusinessProfileCreationBeforeVerification: true,
      demoSeparatedFromProduction: true,
      noOutreachSend: true,
      noSupabaseMigration: true,
      noSupabaseMutation: true
    },
    createdAt: input.createdAt || nowIso()
  };
}
