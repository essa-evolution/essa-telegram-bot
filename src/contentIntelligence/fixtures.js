import {
  attributionModels,
  contentGoalTypes,
  contentProductionModes,
  createContentExperimentAuditArtifact,
  conversionEventTypes,
  createAttributionRecord,
  createAttentionPerformance,
  createContentAnalyticsAuditArtifact,
  createContentAsset,
  createContentEconomicsRecord,
  createContentVariant,
  createContentIntelligenceReport,
  createContentLearningObservation,
  createContentPatternInsight,
  createExperimentLearningHandoff,
  createExperimentVariantSet,
  createConversionEvent,
  createNextContentRecommendation,
  createNextVariantGenerationRecommendation,
  createSequentialExperimentPlan,
  createVariantChangeSet,
  createWinnerDetectionResult,
  dataCompletenessStates,
  learningEvidenceStates,
  metricAvailabilityStates,
  sampleAdequacyStates,
  variantChangeDimensions,
  variantGenerationStrategies,
  winnerDecisionStates,
  winnerGoalTypes,
  revenueEvidenceTypes
} from "./contentIntelligenceContracts.js";

export function createViewsVsRevenueFixture() {
  const highViewAsset = createContentAsset({
    contentAssetId: "content_short_184",
    brandId: "brand_lisa",
    campaignId: "campaign_product_education",
    projectId: "project_essa_growth",
    audienceId: "audience_creators",
    topic: "ESSA overview",
    hook: "This is what ESSA can become",
    format: "short_video",
    platform: "PLATFORM_INDEPENDENT",
    productionMode: contentProductionModes.humanCreator,
    goal: contentGoalTypes.awareness,
    offerId: "offer_essa_business_future",
    ctaId: "cta_learn_more",
    funnelId: "funnel_product_discovery",
    sourceArtifacts: ["brief_a"],
    derivedArtifacts: ["render_a"],
    createdAt: "2026-08-29T00:00:00.000Z"
  });

  const lowerViewAsset = createContentAsset({
    contentAssetId: "content_short_185",
    brandId: "brand_lisa",
    campaignId: "campaign_product_education",
    projectId: "project_essa_growth",
    audienceId: "audience_business_owners",
    topic: "Content that brings clients",
    hook: "Views are not clients",
    format: "short_video",
    platform: "PLATFORM_INDEPENDENT",
    productionMode: contentProductionModes.hybrid,
    goal: contentGoalTypes.revenue,
    offerId: "offer_essa_business_future",
    ctaId: "cta_book_call_future",
    funnelId: "funnel_product_discovery",
    sourceArtifacts: ["brief_b"],
    derivedArtifacts: ["render_b"],
    lineage: {
      parentContentAssetId: highViewAsset.contentAssetId,
      rootContentAssetId: highViewAsset.contentAssetId,
      derivationType: "HOOK_VARIANT"
    },
    createdAt: "2026-08-29T00:10:00.000Z"
  });

  const highViewAttention = createAttentionPerformance({
    metrics: [
      { metricKey: "views", value: 1000000, availability: metricAvailabilityStates.available },
      { metricKey: "impressions", value: 1600000, availability: metricAvailabilityStates.available },
      { metricKey: "clicks", value: 400, availability: metricAvailabilityStates.available },
      { metricKey: "completionRate", value: 0.24, availability: metricAvailabilityStates.available }
    ]
  });

  const lowerViewAttention = createAttentionPerformance({
    metrics: [
      { metricKey: "views", value: 20000, availability: metricAvailabilityStates.available },
      { metricKey: "impressions", value: 50000, availability: metricAvailabilityStates.available },
      { metricKey: "clicks", value: 900, availability: metricAvailabilityStates.available },
      { metricKey: "completionRate", value: 0.61, availability: metricAvailabilityStates.available }
    ]
  });

  const highViewConversion = createConversionEvent({
    eventId: "conversion_high_view_purchase",
    eventType: conversionEventTypes.purchase,
    contentAssetId: highViewAsset.contentAssetId,
    campaignId: highViewAsset.campaignId,
    offerId: highViewAsset.offerId,
    channel: "organic_short_video",
    funnelStep: "purchase",
    valueFuture: 100,
    currencyFuture: "USD"
  });

  const lowerViewConversion = createConversionEvent({
    eventId: "conversion_lower_view_purchase",
    eventType: conversionEventTypes.purchase,
    contentAssetId: lowerViewAsset.contentAssetId,
    campaignId: lowerViewAsset.campaignId,
    offerId: lowerViewAsset.offerId,
    channel: "organic_short_video",
    funnelStep: "purchase",
    valueFuture: 1200,
    currencyFuture: "USD"
  });

  const highViewAttribution = createAttributionRecord({
    attributionId: "attr_high_view",
    contentAssetId: highViewAsset.contentAssetId,
    campaignId: highViewAsset.campaignId,
    offerId: highViewAsset.offerId,
    conversionEventId: highViewConversion.eventId,
    attributionModel: attributionModels.lastTouch,
    attributedValue: 100,
    revenueEvidenceType: revenueEvidenceTypes.attributed,
    confidence: "MEDIUM",
    sourceEvidence: ["local_fixture_conversion_high_view"]
  });

  const lowerViewAttribution = createAttributionRecord({
    attributionId: "attr_lower_view",
    contentAssetId: lowerViewAsset.contentAssetId,
    campaignId: lowerViewAsset.campaignId,
    offerId: lowerViewAsset.offerId,
    conversionEventId: lowerViewConversion.eventId,
    attributionModel: attributionModels.lastTouch,
    attributedValue: 1200,
    revenueEvidenceType: revenueEvidenceTypes.attributed,
    confidence: "MEDIUM",
    sourceEvidence: ["local_fixture_conversion_lower_view"]
  });

  const highViewEconomics = createContentEconomicsRecord({
    contentAssetId: highViewAsset.contentAssetId,
    productionCost: 200,
    distributionCost: 0,
    impressions: 1600000,
    views: 1000000,
    clicks: 400,
    leads: 2,
    customers: 1,
    attributedRevenue: highViewAttribution.attributedValue,
    revenueEvidenceType: revenueEvidenceTypes.attributed,
    confidence: "MEDIUM"
  });

  const lowerViewEconomics = createContentEconomicsRecord({
    contentAssetId: lowerViewAsset.contentAssetId,
    productionCost: 200,
    distributionCost: 0,
    impressions: 50000,
    views: 20000,
    clicks: 900,
    leads: 18,
    customers: 4,
    attributedRevenue: lowerViewAttribution.attributedValue,
    revenueEvidenceType: revenueEvidenceTypes.attributed,
    confidence: "MEDIUM"
  });

  const learning = createContentLearningObservation({
    observationId: "learning_views_not_clients",
    contentAssetId: lowerViewAsset.contentAssetId,
    scope: {
      brandId: "brand_lisa",
      creatorRef: "creator_lisa",
      productRef: "ESSA_BUSINESS",
      audienceId: "audience_business_owners",
      platform: "PLATFORM_INDEPENDENT",
      offerId: "offer_essa_business_future"
    },
    inputDimensions: {
      Hook: "Views are not clients",
      Topic: "Content-driven growth intelligence",
      ProductionMode: contentProductionModes.hybrid,
      CTA: "book_call_future"
    },
    outcomes: {
      attention: lowerViewAttention,
      conversion: lowerViewConversion,
      revenue: lowerViewEconomics.attributedRevenue,
      quality: "HUMAN_REVIEW_REQUIRED"
    },
    evidenceState: learningEvidenceStates.observed
  });

  const insight = createContentPatternInsight({
    insightId: "insight_direct_business_hook",
    scope: {
      brandId: "brand_lisa",
      audienceId: "audience_business_owners",
      platform: "PLATFORM_INDEPENDENT"
    },
    pattern: "Direct business-outcome hooks may outperform broad awareness hooks for buyer-intent audiences.",
    evidenceState: learningEvidenceStates.hypothesis,
    supportingObservationIds: [learning.observationId],
    confidence: "LOW"
  });

  const recommendation = createNextContentRecommendation({
    recommendationId: "next_content_business_hook",
    basisObservationIds: [learning.observationId],
    basisInsightIds: [insight.insightId],
    recommendedHookStyle: "direct_business_outcome",
    durationRange: "20-35s",
    format: "short_video",
    ctaStyle: "soft_product_discovery",
    platform: "PLATFORM_INDEPENDENT",
    contentObjective: contentGoalTypes.leadGeneration,
    audienceId: "audience_business_owners",
    productionMode: contentProductionModes.hybrid,
    confidence: "LOW"
  });

  const report = createContentIntelligenceReport({
    contentAssetId: lowerViewAsset.contentAssetId,
    goal: lowerViewAsset.goal,
    attentionPerformance: lowerViewAttention,
    conversionPerformance: [lowerViewConversion],
    economicPerformance: lowerViewEconomics,
    learningObservations: [learning],
    patternInsights: [insight],
    confidence: "MEDIUM",
    dataCompleteness: lowerViewEconomics.completeness,
    nextRecommendations: [recommendation]
  });

  const auditArtifact = createContentAnalyticsAuditArtifact({
    dataSources: ["LOCAL_SYNTHETIC_FIXTURE"],
    contentAssets: [highViewAsset.contentAssetId, lowerViewAsset.contentAssetId],
    metricsPresent: ["impressions", "views", "clicks", "leads", "customers", "attributedRevenue"],
    metricsAbsent: ["reportedRevenue", "platformUserIdentity", "liveTransactionProvider"],
    attributionMethod: attributionModels.lastTouch,
    economicFields: ["productionCost", "distributionCost", "totalCost", "attributedRevenue", "roi", "roas"],
    confidence: "MEDIUM",
    learningInputs: [learning.observationId],
    generatedRecommendations: [recommendation.recommendationId],
    timestamp: "2026-08-29T00:20:00.000Z"
  });

  return {
    assets: [highViewAsset, lowerViewAsset],
    attention: [highViewAttention, lowerViewAttention],
    conversions: [highViewConversion, lowerViewConversion],
    attributions: [highViewAttribution, lowerViewAttribution],
    economics: [highViewEconomics, lowerViewEconomics],
    learning,
    insight,
    recommendation,
    report,
    auditArtifact
  };
}

export function createSequentialVariantExperimentFixture() {
  const master = createContentAsset({
    contentAssetId: "content_master_hook_001",
    brandId: "brand_lisa",
    campaignId: "campaign_variant_learning",
    audienceId: "audience_business_owners",
    topic: "Content intelligence",
    hook: "Views do not equal clients",
    format: "short_video",
    platform: "PLATFORM_INDEPENDENT",
    productionMode: contentProductionModes.humanCreator,
    goal: contentGoalTypes.leadGeneration,
    createdAt: "2026-08-29T01:00:00.000Z"
  });

  const variantsGeneration1 = [
    createContentVariant({
      variantId: "variant_hook_a",
      masterContentAssetId: master.contentAssetId,
      experimentId: "experiment_hook_001",
      generationId: "generation_1",
      contentAssetRef: "content_variant_hook_a_asset",
      variantLabel: "Hook A statement",
      hypothesisRef: "hypothesis_question_hook_retention",
      audienceRef: master.audienceId,
      platformRef: master.platform,
      offerRef: "offer_essa_business_future",
      campaignRef: master.campaignId,
      changeSet: {
        changes: [
          { dimension: variantChangeDimensions.hook, from: "direct statement", to: "strong statement" }
        ]
      }
    }),
    createContentVariant({
      variantId: "variant_hook_b",
      masterContentAssetId: master.contentAssetId,
      experimentId: "experiment_hook_001",
      generationId: "generation_1",
      contentAssetRef: "content_variant_hook_b_asset",
      variantLabel: "Hook B question",
      hypothesisRef: "hypothesis_question_hook_retention",
      audienceRef: master.audienceId,
      platformRef: master.platform,
      offerRef: "offer_essa_business_future",
      campaignRef: master.campaignId,
      changeSet: {
        changes: [
          { dimension: variantChangeDimensions.hook, from: "direct statement", to: "question" }
        ]
      }
    }),
    createContentVariant({
      variantId: "variant_hook_c",
      masterContentAssetId: master.contentAssetId,
      experimentId: "experiment_hook_001",
      generationId: "generation_1",
      contentAssetRef: "content_variant_hook_c_asset",
      variantLabel: "Hook C contrarian",
      hypothesisRef: "hypothesis_question_hook_retention",
      audienceRef: master.audienceId,
      platformRef: master.platform,
      offerRef: "offer_essa_business_future",
      campaignRef: master.campaignId,
      changeSet: {
        changes: [
          { dimension: variantChangeDimensions.hook, from: "direct statement", to: "contrarian" }
        ]
      }
    })
  ];

  const generation1 = createExperimentVariantSet({
    experimentId: "experiment_hook_001",
    generationId: "generation_1",
    masterContentAssetId: master.contentAssetId,
    hypothesis: "Question-based hooks improve first-3-second retention for business owners on platform-independent short video.",
    variants: variantsGeneration1,
    controlledVariables: ["audience", "format", "duration", "offer", "campaign"],
    audienceScope: master.audienceId,
    platformScope: master.platform,
    offerScope: "offer_essa_business_future",
    campaignScope: master.campaignId,
    successGoal: contentGoalTypes.education,
    primaryMetric: "retention_3s",
    secondaryMetrics: ["views", "attributedRevenue", "roi"]
  });

  const metricResults = [
    { variantId: "variant_hook_a", metric: "views", value: 100000, confidence: "MEDIUM" },
    { variantId: "variant_hook_b", metric: "views", value: 70000, confidence: "MEDIUM" },
    { variantId: "variant_hook_c", metric: "views", value: 30000, confidence: "MEDIUM" },
    { variantId: "variant_hook_a", metric: "retention_3s", value: 0.41, confidence: "MEDIUM" },
    { variantId: "variant_hook_b", metric: "retention_3s", value: 0.64, confidence: "MEDIUM" },
    { variantId: "variant_hook_c", metric: "retention_3s", value: 0.55, confidence: "MEDIUM" },
    { variantId: "variant_hook_a", metric: "attributedRevenue", value: 120, confidence: "LOW" },
    { variantId: "variant_hook_b", metric: "attributedRevenue", value: 600, confidence: "LOW" },
    { variantId: "variant_hook_c", metric: "attributedRevenue", value: 1100, confidence: "LOW" },
    { variantId: "variant_hook_a", metric: "roi", value: -0.4, confidence: "LOW" },
    { variantId: "variant_hook_b", metric: "roi", value: 2, confidence: "LOW" },
    { variantId: "variant_hook_c", metric: "roi", value: 4.5, confidence: "LOW" }
  ];

  const retentionWinner = createWinnerDetectionResult({
    experimentId: generation1.experimentId,
    generationId: generation1.generationId,
    goal: winnerGoalTypes.retention,
    primaryMetric: "retention_3s",
    secondaryMetrics: ["views", "attributedRevenue", "roi"],
    metricResults,
    dataCompleteness: dataCompletenessStates.partial,
    sampleAdequacy: sampleAdequacyStates.limited,
    confidence: "MEDIUM",
    evidence: ["local_synthetic_retention_fixture"]
  });

  const revenueWinner = createWinnerDetectionResult({
    experimentId: generation1.experimentId,
    generationId: generation1.generationId,
    goal: winnerGoalTypes.revenue,
    primaryMetric: "attributedRevenue",
    secondaryMetrics: ["views", "retention_3s", "roi"],
    metricResults,
    dataCompleteness: dataCompletenessStates.partial,
    sampleAdequacy: sampleAdequacyStates.limited,
    confidence: "LOW",
    evidence: ["local_synthetic_revenue_fixture"]
  });

  const multiVariableVariant = createContentVariant({
    variantId: "variant_hook_music_cta",
    masterContentAssetId: master.contentAssetId,
    experimentId: "experiment_multivar_001",
    generationId: "generation_1",
    variantLabel: "Hook + music + CTA change",
    changeSet: {
      changes: [
        { dimension: variantChangeDimensions.hook, from: "statement", to: "question" },
        { dimension: variantChangeDimensions.music, from: "none", to: "soft beat" },
        { dimension: variantChangeDimensions.cta, from: "learn more", to: "book call" }
      ]
    }
  });

  const insufficientWinner = createWinnerDetectionResult({
    experimentId: "experiment_insufficient_001",
    generationId: "generation_1",
    goal: winnerGoalTypes.revenue,
    primaryMetric: "attributedRevenue",
    metricResults: [
      { variantId: "variant_hook_a", metric: "views", value: 50 }
    ],
    dataCompleteness: dataCompletenessStates.insufficient,
    sampleAdequacy: sampleAdequacyStates.insufficient,
    confidence: "LOW",
    decision: winnerDecisionStates.insufficientData
  });

  const variantsGeneration2 = ["b1", "b2", "b3"].map((suffix) =>
    createContentVariant({
      variantId: `variant_hook_${suffix}`,
      masterContentAssetId: master.contentAssetId,
      parentVariantId: "variant_hook_b",
      experimentId: "experiment_hook_001",
      generationId: "generation_2",
      variantLabel: `Hook ${suffix.toUpperCase()} question refinement`,
      hypothesisRef: "hypothesis_refine_question_hook",
      audienceRef: master.audienceId,
      platformRef: master.platform,
      offerRef: "offer_essa_business_future",
      campaignRef: master.campaignId,
      changeSet: {
        changes: [
          { dimension: variantChangeDimensions.hook, from: "question", to: `question_refinement_${suffix}` }
        ]
      }
    })
  );

  const generation2 = createExperimentVariantSet({
    experimentId: "experiment_hook_001",
    generationId: "generation_2",
    masterContentAssetId: master.contentAssetId,
    hypothesis: "Refining the strongest question hook improves retention without sacrificing conversion.",
    variants: variantsGeneration2,
    controlledVariables: ["audience", "format", "duration", "offer", "campaign"],
    audienceScope: master.audienceId,
    platformScope: master.platform,
    offerScope: "offer_essa_business_future",
    campaignScope: master.campaignId,
    successGoal: contentGoalTypes.education,
    primaryMetric: "retention_3s",
    secondaryMetrics: ["attributedRevenue", "roi"]
  });

  const nextGenerationRecommendation = createNextVariantGenerationRecommendation({
    sourceExperimentId: generation1.experimentId,
    sourceGenerationId: generation1.generationId,
    evidence: ["variant_hook_b won retention_3s in local synthetic fixture"],
    retainedElements: ["question hook", "same audience", "same offer", "same format"],
    variablesToExplore: [variantChangeDimensions.hook],
    variablesToHoldConstant: ["duration", "format", "offer", "campaign", "platform"],
    proposedHypotheses: ["Sharper question wording improves first-3-second retention."],
    suggestedVariantCount: 3,
    strategy: variantGenerationStrategies.exploit,
    reason: "Generation 1 produced a retention signal around question hooks.",
    confidence: "MEDIUM"
  });

  const sequentialPlan = createSequentialExperimentPlan({
    planId: "sequential_hook_plan_001",
    masterContentAssetId: master.contentAssetId,
    strategy: variantGenerationStrategies.balanced,
    generations: [generation1, generation2],
    maxVariantsPerGenerationFuture: 3
  });

  const qualityRejectedWinner = createWinnerDetectionResult({
    experimentId: "experiment_quality_001",
    generationId: "generation_1",
    goal: winnerGoalTypes.engagement,
    primaryMetric: "clicks",
    metricResults: [
      { variantId: "variant_aggressive_clickbait", metric: "clicks", value: 1000, confidence: "MEDIUM" },
      { variantId: "variant_hook_b", metric: "clicks", value: 600, confidence: "MEDIUM" }
    ],
    qualityRejectedVariantIds: ["variant_aggressive_clickbait"],
    dataCompleteness: dataCompletenessStates.partial,
    sampleAdequacy: sampleAdequacyStates.limited,
    confidence: "MEDIUM",
    evidence: ["human_review_rejected_aggressive_clickbait"]
  });

  const learningHandoff = createExperimentLearningHandoff({
    winnerDetectionResult: retentionWinner,
    observationId: "learning_experiment_hook_001_generation_1",
    scope: {
      brandId: "brand_lisa",
      creatorRef: "creator_lisa",
      audienceId: master.audienceId,
      platform: master.platform,
      offerId: "offer_essa_business_future"
    },
    inputDimensions: {
      changedVariable: variantChangeDimensions.hook,
      controlledVariables: generation1.controlledVariables
    },
    pattern: "Question hook showed a retention signal for business-owner audience in this controlled synthetic fixture.",
    confidence: "MEDIUM"
  });

  const auditArtifact = createContentExperimentAuditArtifact({
    experimentId: generation1.experimentId,
    generationId: generation1.generationId,
    masterContentAssetId: master.contentAssetId,
    variantIds: variantsGeneration1.map((variant) => variant.variantId),
    changeSets: variantsGeneration1.map((variant) => variant.changeSet),
    hypothesis: generation1.hypothesis,
    goal: retentionWinner.goal,
    metrics: metricResults,
    winnerDecision: retentionWinner.decision,
    confidence: retentionWinner.confidence,
    dataCompleteness: retentionWinner.dataCompleteness,
    sampleAdequacy: retentionWinner.sampleAdequacy,
    learningHandoff,
    nextGenerationRecommendation,
    timestamp: "2026-08-29T01:30:00.000Z"
  });

  return {
    master,
    generation1,
    generation2,
    retentionWinner,
    revenueWinner,
    multiVariableVariant,
    insufficientWinner,
    sequentialPlan,
    nextGenerationRecommendation,
    qualityRejectedWinner,
    learningHandoff,
    auditArtifact,
    explicitHookOnlyChangeSet: createVariantChangeSet({
      changes: [
        { dimension: variantChangeDimensions.hook, from: "statement", to: "question" }
      ]
    })
  };
}
