import { businessRevenueLoop } from "../business/businessContracts.js";

export const metricAvailabilityStates = {
  available: "AVAILABLE",
  unavailable: "UNAVAILABLE",
  estimated: "ESTIMATED",
  unknown: "UNKNOWN"
};

export const dataCompletenessStates = {
  complete: "COMPLETE",
  partial: "PARTIAL",
  insufficient: "INSUFFICIENT",
  unknown: "UNKNOWN"
};

export const contentProductionModes = {
  humanCreator: "HUMAN_CREATOR",
  aiAvatar: "AI_AVATAR",
  faceless: "FACELESS",
  hybrid: "HYBRID"
};

export const contentAssetRoles = {
  master: "MASTER",
  variant: "VARIANT",
  derived: "DERIVED"
};

export const contentOperationModes = {
  manual: "MANUAL",
  assisted: "ASSISTED",
  autonomousFuture: "AUTONOMOUS_FUTURE"
};

export const facelessChannelFactoryModes = {
  manual: "MANUAL",
  assisted: "ASSISTED",
  autonomous: "AUTONOMOUS"
};

export const contentGoalTypes = {
  awareness: "AWARENESS",
  engagement: "ENGAGEMENT",
  education: "EDUCATION",
  trust: "TRUST",
  leadGeneration: "LEAD_GENERATION",
  conversion: "CONVERSION",
  revenue: "REVENUE",
  retention: "RETENTION",
  community: "COMMUNITY",
  productDiscovery: "PRODUCT_DISCOVERY",
  brandBuilding: "BRAND_BUILDING",
  organicGrowth: "ORGANIC_GROWTH"
};

export const conversionEventTypes = {
  view: "VIEW",
  click: "CLICK",
  landingVisit: "LANDING_VISIT",
  lead: "LEAD",
  registration: "REGISTRATION",
  booking: "BOOKING",
  checkoutStart: "CHECKOUT_START",
  purchase: "PURCHASE",
  subscription: "SUBSCRIPTION",
  otherConversion: "OTHER_CONVERSION"
};

export const attributionModels = {
  firstTouch: "FIRST_TOUCH",
  lastTouch: "LAST_TOUCH",
  linear: "LINEAR",
  positionBased: "POSITION_BASED",
  dataDrivenFuture: "DATA_DRIVEN_FUTURE",
  unknown: "UNKNOWN"
};

export const revenueEvidenceTypes = {
  reported: "REPORTED_REVENUE",
  attributed: "ATTRIBUTED_REVENUE",
  estimated: "ESTIMATED_REVENUE",
  unknown: "UNKNOWN_REVENUE"
};

export const learningEvidenceStates = {
  observed: "OBSERVED",
  correlated: "CORRELATED",
  hypothesis: "HYPOTHESIS",
  validated: "VALIDATED"
};

export const variantChangeDimensions = {
  hook: "HOOK",
  firstFrame: "FIRST_FRAME",
  title: "TITLE",
  duration: "DURATION",
  scriptStructure: "SCRIPT_STRUCTURE",
  pacing: "PACING",
  editingStyle: "EDITING_STYLE",
  captions: "CAPTIONS",
  subtitleStyle: "SUBTITLE_STYLE",
  music: "MUSIC",
  voice: "VOICE",
  visualStyle: "VISUAL_STYLE",
  cta: "CTA",
  thumbnail: "THUMBNAIL",
  description: "DESCRIPTION",
  format: "FORMAT",
  platformAdaptation: "PLATFORM_ADAPTATION",
  other: "OTHER"
};

export const variantVariableStates = {
  singleVariable: "SINGLE_VARIABLE",
  multiVariable: "MULTI_VARIABLE"
};

export const contentVariantStatuses = {
  draft: "DRAFT",
  readyForReview: "READY_FOR_REVIEW",
  approvedForTestFuture: "APPROVED_FOR_TEST_FUTURE",
  testingFuture: "TESTING_FUTURE",
  measured: "MEASURED",
  archived: "ARCHIVED"
};

export const experimentHypothesisStates = {
  proposed: "HYPOTHESIS_PROPOSED",
  testing: "TESTING",
  supported: "SUPPORTED",
  notSupported: "NOT_SUPPORTED",
  inconclusive: "INCONCLUSIVE",
  invalidated: "INVALIDATED"
};

export const experimentStartStates = {
  planned: "PLANNED",
  reviewRequired: "REVIEW_REQUIRED",
  readyFuture: "READY_FUTURE"
};

export const experimentResultStates = {
  notRun: "NOT_RUN",
  measured: "MEASURED",
  noClearWinner: "NO_CLEAR_WINNER",
  insufficientData: "INSUFFICIENT_DATA",
  inconclusive: "RESULT_INCONCLUSIVE",
  invalid: "EXPERIMENT_INVALID"
};

export const winnerGoalTypes = {
  reach: "REACH",
  retention: "RETENTION",
  engagement: "ENGAGEMENT",
  followGrowth: "FOLLOW_GROWTH",
  leadGeneration: "LEAD_GENERATION",
  conversion: "CONVERSION",
  revenue: "REVENUE",
  roi: "ROI"
};

export const winnerDecisionStates = {
  performanceWinner: "PERFORMANCE_WINNER",
  qualityRejected: "QUALITY_REJECTED",
  noClearWinner: "NO_CLEAR_WINNER",
  insufficientData: "INSUFFICIENT_DATA",
  metricsConflict: "METRICS_CONFLICT",
  experimentInvalid: "EXPERIMENT_INVALID",
  resultInconclusive: "RESULT_INCONCLUSIVE"
};

export const sampleAdequacyStates = {
  sufficient: "SUFFICIENT",
  limited: "LIMITED",
  insufficient: "INSUFFICIENT",
  unknown: "UNKNOWN"
};

export const variantGenerationStrategies = {
  explore: "EXPLORE",
  exploit: "EXPLOIT",
  balanced: "BALANCED"
};

export const experimentEvidenceStates = {
  observedDifference: "OBSERVED_DIFFERENCE",
  correlatedSignal: "CORRELATED_SIGNAL",
  experimentSupported: "EXPERIMENT_SUPPORTED",
  validatedPattern: "VALIDATED_PATTERN"
};

export const humanExperimentDecisions = {
  acceptWinner: "ACCEPT_WINNER",
  acceptAlternative: "ACCEPT_ALTERNATIVE",
  rejectResult: "REJECT_RESULT",
  continueTesting: "CONTINUE_TESTING",
  stopExperiment: "STOP_EXPERIMENT"
};

export const contentReviewStatuses = {
  accepted: "ACCEPTED",
  acceptedWithChanges: "ACCEPTED_WITH_CHANGES",
  rejected: "REJECTED"
};

export const viralPatternBoundaries = {
  patternExtraction: "PATTERN_EXTRACTION",
  contentCloning: "CONTENT_CLONING_PROHIBITED"
};

export const contentIntelligenceLoop = [
  "CREATE",
  "PUBLISH",
  "OBSERVE",
  "MEASURE",
  "ATTRIBUTE",
  "LEARN",
  "ADAPT",
  "NEXT_CONTENT"
];

export const contentRevenuePrinciple = {
  canonicalBusinessLoop: businessRevenueLoop,
  canonicalContentLoop: contentIntelligenceLoop,
  principle: "Views alone are not business success.",
  distinguishesContentPerformanceFromBusinessOutcome: true,
  neverInventRevenue: true
};

export const sourceOfTruthOwnership = {
  production: ["ContentAsset", "production metadata", "quality verification refs"],
  advertising: ["campaign strategy", "distribution", "ad spend refs"],
  business: ["business goals", "offers", "target audience", "business economics"],
  transaction: ["transaction truth", "reported revenue", "payment/provider verification"],
  attribution: ["mapping between touchpoints and outcomes"],
  analytics: ["normalized observations", "metric availability"],
  intelligence: ["learning observations", "pattern insights", "next content recommendations"],
  creatorNetwork: ["creator distribution refs", "creator audience exposure refs"],
  propertyAndVerticals: ["promoted object/product/service refs"]
};

function nowIso(input) {
  return input || new Date(0).toISOString();
}

function createId(prefix, value) {
  return value || `${prefix}_fixture`;
}

function array(value) {
  return Array.isArray(value) ? [...value] : [];
}

function cloneObject(value = {}) {
  return { ...value };
}

export function createContentAsset(input = {}) {
  return {
    modelType: "ContentAsset",
    contentAssetId: createId("content_asset", input.contentAssetId),
    brandId: input.brandId || null,
    campaignId: input.campaignId || null,
    projectId: input.projectId || null,
    audienceId: input.audienceId || null,
    topic: input.topic || "",
    hook: input.hook || "",
    format: input.format || "",
    platform: input.platform || "PLATFORM_INDEPENDENT",
    productionMode: input.productionMode || contentProductionModes.hybrid,
    goal: input.goal || contentGoalTypes.awareness,
    role: input.role || contentAssetRoles.master,
    offerId: input.offerId || null,
    ctaId: input.ctaId || null,
    funnelId: input.funnelId || null,
    creatorRef: input.creatorRef || null,
    sourceArtifacts: array(input.sourceArtifacts),
    derivedArtifacts: array(input.derivedArtifacts),
    version: input.version || 1,
    lineage: {
      parentContentAssetId: input.lineage?.parentContentAssetId || null,
      rootContentAssetId: input.lineage?.rootContentAssetId || input.contentAssetId || null,
      derivationType: input.lineage?.derivationType || "ORIGINAL"
    },
    publicationRefsFuture: array(input.publicationRefsFuture),
    createdAt: nowIso(input.createdAt),
    publishEnabled: false,
    providerCalls: 0,
    externalCalls: 0
  };
}

export function createOfferReference(input = {}) {
  return {
    modelType: "OfferReference",
    offerId: input.offerId || null,
    businessId: input.businessId || null,
    productOrServiceRef: input.productOrServiceRef || null,
    audience: input.audience || null,
    promise: input.promise || "",
    priceFuture: input.priceFuture || null,
    destination: input.destination || null,
    cta: input.cta || null,
    funnelRef: input.funnelRef || null,
    availability: input.availability || "OPTIONAL",
    version: input.version || 1,
    sourceOfTruth: "ESSA_BUSINESS"
  };
}

export function createAttentionMetric(input = {}) {
  return {
    metricKey: input.metricKey,
    value: input.value ?? null,
    unit: input.unit || null,
    availability: input.availability || metricAvailabilityStates.unknown,
    platformMetricName: input.platformMetricName || null,
    source: input.source || "LOCAL_FIXTURE",
    measuredAt: nowIso(input.measuredAt)
  };
}

export function createAttentionPerformance(input = {}) {
  const defaultKeys = [
    "impressions",
    "views",
    "watchTime",
    "averageWatchTime",
    "retentionCurve",
    "completionRate",
    "rewatches",
    "saves",
    "shares",
    "comments",
    "profileVisits",
    "clicks"
  ];
  const provided = new Map(array(input.metrics).map((metric) => [metric.metricKey, createAttentionMetric(metric)]));
  return defaultKeys.map((metricKey) =>
    provided.get(metricKey) || createAttentionMetric({ metricKey, availability: metricAvailabilityStates.unknown })
  );
}

export function createConversionEvent(input = {}) {
  return {
    modelType: "ConversionEvent",
    eventId: createId("conversion_event", input.eventId),
    eventType: input.eventType || conversionEventTypes.otherConversion,
    timestamp: nowIso(input.timestamp),
    contentAssetId: input.contentAssetId || null,
    campaignId: input.campaignId || null,
    offerId: input.offerId || null,
    channel: input.channel || null,
    funnelStep: input.funnelStep || null,
    anonymousOrUserRefFuture: input.anonymousOrUserRefFuture || "ANONYMOUS_OR_AGGREGATED",
    valueFuture: input.valueFuture ?? null,
    currencyFuture: input.currencyFuture || null,
    sourceProvenance: input.sourceProvenance || "LOCAL_SYNTHETIC_FIXTURE",
    privacy: {
      dataMinimized: true,
      consentRequiredFuture: true,
      rawUserTrackingEnabled: false,
      retentionPolicyFuture: input.privacy?.retentionPolicyFuture || "REQUIRED_BEFORE_LIVE_USE"
    },
    providerCalls: 0,
    externalCalls: 0
  };
}

export function createAttributionRecord(input = {}) {
  return {
    modelType: "AttributionRecord",
    attributionId: createId("attribution", input.attributionId),
    contentAssetId: input.contentAssetId || null,
    campaignId: input.campaignId || null,
    offerId: input.offerId || null,
    touchpointSequence: array(input.touchpointSequence),
    conversionEventId: input.conversionEventId || null,
    attributionModel: input.attributionModel || attributionModels.unknown,
    attributedValue: input.attributedValue ?? null,
    revenueEvidenceType: input.revenueEvidenceType || revenueEvidenceTypes.unknown,
    confidence: input.confidence || "UNKNOWN",
    sourceEvidence: array(input.sourceEvidence),
    version: input.version || 1,
    exactAttributionClaimed: false
  };
}

export function createContentEconomicsRecord(input = {}) {
  const productionCost = input.productionCost ?? null;
  const distributionCost = input.distributionCost ?? null;
  const totalCost = productionCost === null || distributionCost === null ? null : productionCost + distributionCost;
  const attributedRevenue = input.attributedRevenue ?? null;
  const views = input.views ?? null;
  const clicks = input.clicks ?? null;
  const leads = input.leads ?? null;
  const customers = input.customers ?? null;
  const roi = totalCost && attributedRevenue !== null ? (attributedRevenue - totalCost) / totalCost : null;
  const roas = totalCost && attributedRevenue !== null ? attributedRevenue / totalCost : null;

  return {
    modelType: "ContentEconomicsRecord",
    contentAssetId: input.contentAssetId || null,
    productionCost,
    distributionCost,
    totalCost,
    impressions: input.impressions ?? null,
    views,
    clicks,
    leads,
    customers,
    attributedRevenue,
    revenueEvidenceType: input.revenueEvidenceType || revenueEvidenceTypes.unknown,
    costPerContentAsset: totalCost,
    costPerThousandViews: totalCost !== null && views ? totalCost / (views / 1000) : null,
    costPerClick: totalCost !== null && clicks ? totalCost / clicks : null,
    costPerLead: totalCost !== null && leads ? totalCost / leads : null,
    costPerCustomer: totalCost !== null && customers ? totalCost / customers : null,
    revenuePerAsset: attributedRevenue,
    revenuePerThousandViews: attributedRevenue !== null && views ? attributedRevenue / (views / 1000) : null,
    roi,
    roas,
    lifetimeContentRevenueFuture: null,
    confidence: input.confidence || "UNKNOWN",
    completeness: input.completeness || classifyDataCompleteness({
      requiredFields: ["productionCost", "distributionCost", "views", "clicks", "leads", "customers", "attributedRevenue"],
      record: { productionCost, distributionCost, views, clicks, leads, customers, attributedRevenue }
    }),
    fabricatedMetrics: false
  };
}

export function createContentLearningObservation(input = {}) {
  return {
    modelType: "ContentLearningObservation",
    observationId: createId("content_learning", input.observationId),
    contentAssetId: input.contentAssetId || null,
    scope: {
      brandId: input.scope?.brandId || null,
      creatorRef: input.scope?.creatorRef || null,
      productRef: input.scope?.productRef || null,
      audienceId: input.scope?.audienceId || null,
      platform: input.scope?.platform || null,
      offerId: input.scope?.offerId || null
    },
    inputDimensions: cloneObject(input.inputDimensions),
    outcomes: cloneObject(input.outcomes),
    evidenceState: input.evidenceState || learningEvidenceStates.observed,
    humanReview: input.humanReview || null,
    canRewriteLisaCharacterCore: false,
    createdAt: nowIso(input.createdAt)
  };
}

export function createContentPatternInsight(input = {}) {
  return {
    modelType: "ContentPatternInsight",
    insightId: createId("content_pattern", input.insightId),
    scope: cloneObject(input.scope),
    pattern: input.pattern || "",
    evidenceState: input.evidenceState || learningEvidenceStates.hypothesis,
    supportingObservationIds: array(input.supportingObservationIds),
    confidence: input.confidence || "LOW",
    causationClaimAllowed: input.evidenceState === learningEvidenceStates.validated,
    createdAt: nowIso(input.createdAt)
  };
}

export function createNextContentRecommendation(input = {}) {
  return {
    modelType: "NextContentRecommendation",
    recommendationId: createId("next_content", input.recommendationId),
    basisObservationIds: array(input.basisObservationIds),
    basisInsightIds: array(input.basisInsightIds),
    recommendedHookStyle: input.recommendedHookStyle || null,
    durationRange: input.durationRange || null,
    format: input.format || null,
    ctaStyle: input.ctaStyle || null,
    platform: input.platform || null,
    contentObjective: input.contentObjective || contentGoalTypes.awareness,
    audienceId: input.audienceId || null,
    productionMode: input.productionMode || contentProductionModes.hybrid,
    confidence: input.confidence || "LOW",
    autoGenerateContent: false,
    publishEnabled: false
  };
}

export function createContentExperiment(input = {}) {
  return {
    modelType: "ContentExperiment",
    experimentId: createId("content_experiment", input.experimentId),
    hypothesis: input.hypothesis || "",
    variants: array(input.variants),
    controlledVariables: array(input.controlledVariables),
    successMetric: input.successMetric || null,
    businessMetric: input.businessMetric || null,
    startFuture: input.startFuture || null,
    endFuture: input.endFuture || null,
    result: input.result || "NOT_RUN",
    confidence: input.confidence || "UNKNOWN",
    executionEnabled: false
  };
}

export function createVariantChange(input = {}) {
  return {
    dimension: input.dimension || variantChangeDimensions.other,
    from: input.from ?? null,
    to: input.to ?? null,
    rationale: input.rationale || "",
    meaningful: input.meaningful !== false
  };
}

export function createVariantChangeSet(input = {}) {
  const changes = array(input.changes).map(createVariantChange);
  const changedDimensions = [...new Set(changes.map((change) => change.dimension))];
  return {
    modelType: "VariantChangeSet",
    changeSetId: createId("variant_change_set", input.changeSetId),
    changes,
    changedDimensions,
    variableState: changedDimensions.length <= 1
      ? variantVariableStates.singleVariable
      : variantVariableStates.multiVariable,
    causalConfidenceAdjustment: changedDimensions.length <= 1 ? "NORMAL" : "REDUCED",
    explicitChangeRequired: true
  };
}

export function createContentVariant(input = {}) {
  const masterContentAssetId = input.masterContentAssetId || input.lineage?.rootContentAssetId || null;
  return {
    modelType: "ContentVariant",
    variantId: createId("content_variant", input.variantId),
    masterContentAssetId,
    parentVariantId: input.parentVariantId || null,
    experimentId: input.experimentId || null,
    generationId: input.generationId || null,
    contentAssetRef: input.contentAssetRef || null,
    variantLabel: input.variantLabel || "",
    changeSet: createVariantChangeSet(input.changeSet || {}),
    hypothesisRef: input.hypothesisRef || null,
    audienceRef: input.audienceRef || null,
    platformRef: input.platformRef || "PLATFORM_INDEPENDENT",
    offerRef: input.offerRef || null,
    campaignRef: input.campaignRef || null,
    createdAt: nowIso(input.createdAt),
    lineage: {
      masterContentAssetId,
      parentVariantId: input.parentVariantId || null,
      rootContentAssetId: masterContentAssetId,
      derivationType: input.lineage?.derivationType || "VARIANT"
    },
    status: input.status || contentVariantStatuses.draft,
    orphanVariant: !masterContentAssetId,
    publishEnabled: false,
    providerCalls: 0,
    externalCalls: 0
  };
}

export function createExperimentVariantSet(input = {}) {
  const variants = array(input.variants).map(createContentVariant);
  const changedVariables = [...new Set(variants.flatMap((variant) => variant.changeSet.changedDimensions))];
  return {
    modelType: "ExperimentVariantSet",
    experimentId: createId("content_experiment", input.experimentId),
    generationId: input.generationId || "generation_1",
    masterContentAssetId: input.masterContentAssetId || variants[0]?.masterContentAssetId || null,
    hypothesis: input.hypothesis || "",
    hypothesisState: input.hypothesisState || experimentHypothesisStates.proposed,
    variants,
    controlledVariables: array(input.controlledVariables),
    changedVariables,
    audienceScope: input.audienceScope || null,
    platformScope: input.platformScope || "PLATFORM_INDEPENDENT",
    offerScope: input.offerScope || null,
    campaignScope: input.campaignScope || null,
    successGoal: input.successGoal || contentGoalTypes.awareness,
    primaryMetric: input.primaryMetric || createGoalAwareSuccessPolicy(input.successGoal || contentGoalTypes.awareness).primaryMetrics[0],
    secondaryMetrics: array(input.secondaryMetrics),
    startState: input.startState || experimentStartStates.planned,
    resultState: input.resultState || experimentResultStates.notRun,
    executionEnabled: false,
    publishEnabled: false
  };
}

export function createMetricWinner(input = {}) {
  return {
    modelType: "MetricWinner",
    metric: input.metric || null,
    variantId: input.variantId || null,
    value: input.value ?? null,
    confidence: input.confidence || "UNKNOWN"
  };
}

function metricDirection(metric) {
  return /cost|cpc|cpl|cpa|costPer/i.test(metric || "") ? "ASC" : "DESC";
}

export function detectMetricWinner(metricResults = [], metric) {
  const candidates = metricResults.filter((result) => result.metric === metric && result.value !== null && result.value !== undefined);
  if (!candidates.length) return null;
  const direction = candidates[0].direction || metricDirection(metric);
  const ranked = [...candidates].sort((a, b) => direction === "ASC" ? a.value - b.value : b.value - a.value);
  const [winner, runnerUp] = ranked;
  const tied = runnerUp && winner.value === runnerUp.value;
  return createMetricWinner({
    metric,
    variantId: tied ? null : winner.variantId,
    value: tied ? winner.value : winner.value,
    confidence: tied ? "LOW" : (winner.confidence || "MEDIUM")
  });
}

export function createWinnerDetectionResult(input = {}) {
  const metricResults = array(input.metricResults);
  const primaryMetric = input.primaryMetric || createGoalAwareSuccessPolicy(input.goal || contentGoalTypes.awareness).primaryMetrics[0];
  const metricWinners = [...new Set([primaryMetric, ...array(input.secondaryMetrics)].filter(Boolean))]
    .map((metric) => detectMetricWinner(metricResults, metric))
    .filter(Boolean);
  const primaryWinner = metricWinners.find((winner) => winner.metric === primaryMetric);
  const qualityRejectedVariantIds = array(input.qualityRejectedVariantIds);
  let decision = input.decision || winnerDecisionStates.performanceWinner;
  let winnerVariantId = input.winnerVariantId ?? primaryWinner?.variantId ?? null;
  let tieOrNoWinnerReason = input.tieOrNoWinnerReason || null;

  if ([dataCompletenessStates.insufficient, dataCompletenessStates.unknown].includes(input.dataCompleteness)) {
    decision = winnerDecisionStates.insufficientData;
    winnerVariantId = null;
    tieOrNoWinnerReason = "INSUFFICIENT_DATA";
  } else if ([sampleAdequacyStates.insufficient, sampleAdequacyStates.unknown].includes(input.sampleAdequacy)) {
    decision = winnerDecisionStates.insufficientData;
    winnerVariantId = null;
    tieOrNoWinnerReason = "SAMPLE_INADEQUATE";
  } else if (!winnerVariantId) {
    decision = input.decision || winnerDecisionStates.noClearWinner;
    tieOrNoWinnerReason = tieOrNoWinnerReason || "NO_CLEAR_WINNER";
  } else if (qualityRejectedVariantIds.includes(winnerVariantId)) {
    decision = winnerDecisionStates.qualityRejected;
    tieOrNoWinnerReason = "PERFORMANCE_WINNER_QUALITY_REJECTED";
  }

  return {
    modelType: "WinnerDetectionResult",
    experimentId: input.experimentId || null,
    generationId: input.generationId || null,
    goal: input.goal || contentGoalTypes.awareness,
    primaryMetric,
    winnerVariantId,
    rankedVariants: array(input.rankedVariants),
    metricResults,
    metricWinners,
    confidence: input.confidence || "UNKNOWN",
    dataCompleteness: input.dataCompleteness || dataCompletenessStates.unknown,
    sampleAdequacy: input.sampleAdequacy || sampleAdequacyStates.unknown,
    tieOrNoWinnerReason,
    evidence: array(input.evidence),
    decision,
    humanDecisionFuture: input.humanDecisionFuture || null,
    publishEnabled: false,
    autoPropagateToProduction: false
  };
}

export function createSequentialExperimentPlan(input = {}) {
  return {
    modelType: "SequentialExperimentPlan",
    planId: createId("sequential_experiment", input.planId),
    masterContentAssetId: input.masterContentAssetId || null,
    strategy: input.strategy || variantGenerationStrategies.balanced,
    generations: array(input.generations),
    loop: [
      "GENERATION",
      "SMALL_MEANINGFUL_VARIANT_SET",
      "MEASURE",
      "DETECT_STRONG_SIGNAL",
      "FORMULATE_NEXT_HYPOTHESIS",
      "REFINE"
    ],
    continueOnlyWhileUseful: true,
    maxVariantsPerGenerationFuture: input.maxVariantsPerGenerationFuture || 5,
    minimumHypothesisQualityRequired: true,
    minimumChangeMeaningfulnessRequired: true,
    noMassDuplicateSpam: true,
    executionEnabled: false,
    publishEnabled: false
  };
}

export function createNextVariantGenerationRecommendation(input = {}) {
  return {
    modelType: "NextVariantGenerationRecommendation",
    sourceExperimentId: input.sourceExperimentId || null,
    sourceGenerationId: input.sourceGenerationId || null,
    evidence: array(input.evidence),
    retainedElements: array(input.retainedElements),
    variablesToExplore: array(input.variablesToExplore),
    variablesToHoldConstant: array(input.variablesToHoldConstant),
    proposedHypotheses: array(input.proposedHypotheses),
    suggestedVariantCount: input.suggestedVariantCount ?? 3,
    strategy: input.strategy || variantGenerationStrategies.balanced,
    reason: input.reason || "",
    confidence: input.confidence || "LOW",
    autoGenerateVariants: false,
    publishEnabled: false
  };
}

export function createExperimentLearningHandoff(input = {}) {
  const winner = input.winnerDetectionResult || {};
  return {
    modelType: "ExperimentLearningHandoff",
    sourceExperimentId: winner.experimentId || input.sourceExperimentId || null,
    sourceGenerationId: winner.generationId || input.sourceGenerationId || null,
    observation: createContentLearningObservation({
      observationId: input.observationId,
      contentAssetId: input.contentAssetId || winner.winnerVariantId || null,
      scope: input.scope,
      inputDimensions: input.inputDimensions,
      outcomes: {
        winnerDecision: winner.decision,
        primaryMetric: winner.primaryMetric,
        metricWinners: winner.metricWinners,
        evidence: winner.evidence
      },
      evidenceState: input.evidenceState || learningEvidenceStates.observed
    }),
    insight: createContentPatternInsight({
      insightId: input.insightId,
      scope: input.scope,
      pattern: input.pattern,
      evidenceState: input.patternEvidenceState || learningEvidenceStates.hypothesis,
      supportingObservationIds: [input.observationId || "content_learning_fixture"],
      confidence: input.confidence || winner.confidence || "LOW"
    }),
    overgeneralizationAllowed: false,
    canRewriteLisaCharacterCore: false
  };
}

export function createPlatformExperimentAdapter(input = {}) {
  return {
    modelType: "PlatformExperimentAdapter",
    adapterId: input.adapterId || null,
    platform: input.platform || "PLATFORM_INDEPENDENT",
    providerFeatureFuture: input.providerFeatureFuture || null,
    canonicalExperimentMap: cloneObject(input.canonicalExperimentMap),
    activationState: input.activationState || "ARCHITECTURE_ONLY",
    architecturalDependency: false,
    liveApiCallsEnabled: false,
    publishEnabled: false
  };
}

export function createContentExperimentAuditArtifact(input = {}) {
  return {
    artifactType: "ContentExperimentAuditArtifact",
    experimentId: input.experimentId || null,
    generationId: input.generationId || null,
    masterContentAssetId: input.masterContentAssetId || null,
    variantIds: array(input.variantIds),
    changeSets: array(input.changeSets),
    hypothesis: input.hypothesis || "",
    goal: input.goal || null,
    metrics: array(input.metrics),
    winnerDecision: input.winnerDecision || null,
    confidence: input.confidence || "UNKNOWN",
    dataCompleteness: input.dataCompleteness || dataCompletenessStates.unknown,
    sampleAdequacy: input.sampleAdequacy || sampleAdequacyStates.unknown,
    learningHandoff: input.learningHandoff || null,
    nextGenerationRecommendation: input.nextGenerationRecommendation || null,
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    executionActions: 0,
    timestamp: nowIso(input.timestamp)
  };
}

export function createViralPatternObservation(input = {}) {
  return {
    modelType: "ViralPatternObservation",
    observationId: createId("viral_pattern", input.observationId),
    dimensions: cloneObject(input.dimensions),
    sourceProvenance: array(input.sourceProvenance),
    boundary: viralPatternBoundaries.patternExtraction,
    contentCloningAllowed: false,
    copyrightRespectRequired: true,
    platformTermsReviewRequiredFuture: true,
    privacyRespectRequired: true
  };
}

export function createPlatformMetricsAdapter(input = {}) {
  return {
    modelType: "PlatformMetricsAdapter",
    adapterId: input.adapterId || null,
    platform: input.platform || null,
    canonicalMetricMap: cloneObject(input.canonicalMetricMap),
    unsupportedMetrics: array(input.unsupportedMetrics),
    activationState: input.activationState || "ARCHITECTURE_ONLY",
    liveApiCallsEnabled: false
  };
}

export function createContentIntelligenceReport(input = {}) {
  return {
    modelType: "ContentIntelligenceReport",
    contentAssetId: input.contentAssetId || null,
    goal: input.goal || contentGoalTypes.awareness,
    attentionPerformance: array(input.attentionPerformance),
    conversionPerformance: array(input.conversionPerformance),
    economicPerformance: input.economicPerformance || null,
    audienceSignals: array(input.audienceSignals),
    creativeSignals: array(input.creativeSignals),
    offerPerformance: input.offerPerformance || null,
    funnelPerformance: input.funnelPerformance || null,
    learningObservations: array(input.learningObservations),
    patternInsights: array(input.patternInsights),
    confidence: input.confidence || "UNKNOWN",
    dataCompleteness: input.dataCompleteness || dataCompletenessStates.unknown,
    nextRecommendations: array(input.nextRecommendations)
  };
}

export function createCampaignIntelligenceReport(input = {}) {
  return {
    modelType: "CampaignIntelligenceReport",
    campaignId: input.campaignId || null,
    sourceOfTruth: "ESSA_ADVERTISING",
    assets: array(input.assets),
    spend: input.spend ?? null,
    attention: cloneObject(input.attention),
    clicks: input.clicks ?? null,
    leads: input.leads ?? null,
    sales: input.sales ?? null,
    revenue: input.revenue ?? null,
    cost: input.cost ?? null,
    roi: input.roi ?? null,
    roas: input.roas ?? null,
    creativePatterns: array(input.creativePatterns),
    audiencePatterns: array(input.audiencePatterns),
    dataCompleteness: input.dataCompleteness || dataCompletenessStates.unknown
  };
}

export function createContentAnalyticsAuditArtifact(input = {}) {
  return {
    artifactType: "ContentAnalyticsAuditArtifact",
    dataSources: array(input.dataSources),
    contentAssets: array(input.contentAssets),
    metricsPresent: array(input.metricsPresent),
    metricsAbsent: array(input.metricsAbsent),
    attributionMethod: input.attributionMethod || attributionModels.unknown,
    economicFields: array(input.economicFields),
    confidence: input.confidence || "UNKNOWN",
    learningInputs: array(input.learningInputs),
    generatedRecommendations: array(input.generatedRecommendations),
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    transactionMutations: 0,
    timestamp: nowIso(input.timestamp)
  };
}

export function createGoalAwareSuccessPolicy(goal) {
  const policies = {
    [contentGoalTypes.awareness]: {
      primaryMetrics: ["impressions", "views", "reachFuture", "completionRate"],
      businessMetrics: [],
      revenueRequired: false
    },
    [contentGoalTypes.education]: {
      primaryMetrics: ["retentionCurve", "saves", "downstreamProductDiscoveryFuture"],
      businessMetrics: ["trustSignalFuture"],
      revenueRequired: false
    },
    [contentGoalTypes.leadGeneration]: {
      primaryMetrics: ["clicks", "leads", "qualifiedLeadsFuture"],
      businessMetrics: ["leadQualityFuture"],
      revenueRequired: false
    },
    [contentGoalTypes.revenue]: {
      primaryMetrics: ["purchase", "attributedRevenue", "roi"],
      businessMetrics: ["reportedRevenueFuture"],
      revenueRequired: true
    },
    [contentGoalTypes.community]: {
      primaryMetrics: ["comments", "shares", "returningAudienceFuture"],
      businessMetrics: [],
      revenueRequired: false
    }
  };

  return {
    modelType: "GoalAwareSuccessPolicy",
    goal,
    ...(policies[goal] || {
      primaryMetrics: ["goal_specific_metric_required"],
      businessMetrics: [],
      revenueRequired: false
    })
  };
}

export function classifyDataCompleteness({ requiredFields = [], record = {} } = {}) {
  if (!requiredFields.length) return dataCompletenessStates.unknown;
  const present = requiredFields.filter((field) => record[field] !== null && record[field] !== undefined);
  if (present.length === requiredFields.length) return dataCompletenessStates.complete;
  if (present.length === 0) return dataCompletenessStates.insufficient;
  return dataCompletenessStates.partial;
}

export function compareContentEconomicEffectiveness(records = []) {
  return [...records].sort((a, b) => {
    const aRevenue = a.attributedRevenue ?? Number.NEGATIVE_INFINITY;
    const bRevenue = b.attributedRevenue ?? Number.NEGATIVE_INFINITY;
    if (aRevenue !== bRevenue) return bRevenue - aRevenue;
    return (b.roi ?? Number.NEGATIVE_INFINITY) - (a.roi ?? Number.NEGATIVE_INFINITY);
  });
}

export function createFacelessChannelFactoryCapability(input = {}) {
  return {
    capabilityId: "FACELESS_CHANNEL_FACTORY",
    mode: input.mode || facelessChannelFactoryModes.assisted,
    pipeline: [
      "Research",
      "Ideas",
      "Scripts",
      "Voice",
      "Visuals",
      "Editing",
      "Captions",
      "Thumbnail",
      "Metadata",
      "QA",
      "Approval",
      "Scheduling",
      "Publishing",
      "Analytics",
      "Learning"
    ],
    autonomousInheritsApprovalPolicy: true,
    autonomousPublishingEnabled: false,
    livePlatformAdaptersEnabled: false,
    providerCalls: 0,
    externalCalls: 0
  };
}
