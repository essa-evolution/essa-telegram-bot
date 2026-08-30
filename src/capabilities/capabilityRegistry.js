import {
  capabilityActivationStates,
  capabilityCostClasses,
  capabilityRiskClasses,
  createEssaCapability
} from "./capabilityContracts.js";

export const capabilityCategories = {
  text: [
    "TEXT_GENERATE",
    "TEXT_REWRITE",
    "TEXT_EDIT",
    "TEXT_SUMMARIZE",
    "TEXT_TRANSLATE",
    "TEXT_CLASSIFY",
    "TEXT_EXTRACT",
    "STRUCTURED_OUTPUT",
    "SEMANTIC_ANALYZE"
  ],
  image: [
    "IMAGE_GENERATE",
    "IMAGE_EDIT",
    "IMAGE_ANALYZE",
    "IMAGE_VARIATION",
    "IMAGE_UPSCALE",
    "IMAGE_BACKGROUND_REMOVE",
    "IMAGE_COMPOSE"
  ],
  video: [
    "VIDEO_GENERATE",
    "VIDEO_EDIT",
    "VIDEO_ANALYZE",
    "MEDIA_PROBE",
    "VIDEO_TRIM",
    "VIDEO_RESIZE",
    "VIDEO_COMPOSE",
    "VIDEO_CAPTION",
    "VIDEO_TRANSCRIBE",
    "VIDEO_REFRAME",
    "VIDEO_EXPORT",
    "FRAME_EXTRACT"
  ],
  audio_voice: [
    "AUDIO_ANALYZE",
    "AUDIO_EXTRACT",
    "AUDIO_TRANSCRIBE",
    "VOICE_GENERATE",
    "VOICE_CLONE",
    "VOICE_REPLACE",
    "VOICE_TRANSLATE",
    "AUDIO_CLEAN",
    "AUDIO_MIX",
    "AUDIO_MASTER"
  ],
  music: [
    "MUSIC_GENERATE",
    "MUSIC_ANALYZE",
    "STEM_SEPARATE",
    "ARRANGEMENT_TRANSFORM",
    "KEY_CHANGE",
    "TEMPO_CHANGE",
    "INSTRUMENT_REPLACE",
    "VOCAL_REPLACE",
    "MIX",
    "MASTER",
    "MUSIC_EXPORT"
  ],
  code_product: [
    "CODE_GENERATE",
    "CODE_EDIT",
    "CODE_REVIEW",
    "CODE_DEBUG",
    "ARCHITECTURE_DESIGN",
    "UI_GENERATE",
    "UI_ANALYZE",
    "WEBSITE_GENERATE",
    "APP_GENERATE",
    "DATABASE_DESIGN",
    "API_INTEGRATE",
    "AUTOMATION_BUILD"
  ],
  browser_computer: ["BROWSER_OBSERVE", "BROWSER_CAPTURE", "BROWSER_VERIFY", "UI_VERIFY"],
  document_publishing: [
    "DOCUMENT_GENERATE",
    "DOCUMENT_EDIT",
    "DOCUMENT_FORMAT",
    "BOOK_STRUCTURE",
    "BOOK_COVER",
    "EBOOK_BUILD",
    "AUDIOBOOK_BUILD",
    "PUBLISHING_PACKAGE"
  ],
  business: [
    "BUSINESS_ANALYZE",
    "BUSINESS_AUDIT",
    "BUSINESS_VALUATION",
    "BUSINESS_GROWTH_PLAN",
    "BUSINESS_SALE_PREP",
    "MARKETING_PLAN",
    "CAMPAIGN_BUILD",
    "BUSINESS_DISCOVERY",
    "BUSINESS_ENTITY_VERIFY",
    "BUSINESS_DATA_NORMALIZE",
    "BUSINESS_DEDUPLICATE",
    "LEAD_QUALIFY",
    "LEAD_SCORE",
    "BUSINESS_NEED_ANALYZE",
    "ESSA_FIT_MATCH",
    "LEAD_EXPORT",
    "OUTREACH_PREPARE",
    "OUTREACH_SEND"
  ],
  advertising_creator: [
    "CREATIVE_BRIEF",
    "AD_CREATIVE_GENERATE",
    "CAMPAIGN_PLAN",
    "CREATOR_MATCH",
    "CONTENT_PLAN",
    "PERFORMANCE_ANALYZE",
    "CONTENT_ANALYZE",
    "CONTENT_PERFORMANCE_ANALYZE",
    "CONTENT_ATTRIBUTION",
    "CONTENT_ECONOMICS",
    "CONTENT_LEARN",
    "NEXT_CONTENT_RECOMMEND",
    "CAMPAIGN_INTELLIGENCE",
    "VIRAL_PATTERN_ANALYZE",
    "FACELESS_CHANNEL_BUILD",
    "CONTENT_EXPERIMENT",
    "OFFER_AWARE_CONTENT_PLAN"
  ],
  real_estate_development: [
    "PROPERTY_ANALYZE",
    "PROPERTY_ADD_INTAKE",
    "PROPERTY_PRESENTATION",
    "INVESTMENT_PACKAGE",
    "DEVELOPMENT_CONCEPT",
    "PROPERTY_MARKETING"
  ],
  mirror: ["PATTERN_REFLECTION", "QUESTION_GENERATION", "REFLECTION_SUMMARY", "PATTERN_TIMELINE"],
  kids_education: ["LESSON_GENERATE", "STORY_GENERATE", "EDUCATIONAL_EXPLAIN", "KIDS_CONTENT_PLAN"],
  research: ["DOCUMENTATION_LOOKUP", "WEB_RESEARCH", "SOURCE_COMPARE", "FACT_EXTRACT"]
};

function categoryFor(capabilityId) {
  return Object.entries(capabilityCategories).find(([, ids]) => ids.includes(capabilityId))?.[0] || "custom";
}

function base(capabilityId, input = {}) {
  return createEssaCapability({
    capabilityId,
    canonicalName: capabilityId,
    category: categoryFor(capabilityId),
    description: input.description || capabilityId.replaceAll("_", " ").toLowerCase(),
    inputTypes: input.inputTypes || ["text"],
    outputTypes: input.outputTypes || ["artifact"],
    verificationRequirements: input.verificationRequirements || ["schema_or_artifact_validation"],
    version: input.version || "1.0.0",
    ...input
  });
}

const allTaxonomyCapabilities = Object.values(capabilityCategories)
  .flat()
  .map((capabilityId) => base(capabilityId));

const overrides = [
  base("BOOK_COVER", {
    description: "Plan and produce a book cover concept through image/design capabilities.",
    domainTags: ["publishing", "books"],
    inputTypes: ["book_description", "style_reference", "title"],
    outputTypes: ["cover_brief", "image_artifact", "publishing_asset"],
    requiredSubCapabilities: ["IMAGE_GENERATE", "IMAGE_EDIT", "IMAGE_COMPOSE"],
    optionalSubCapabilities: ["TEXT_EDIT", "IMAGE_UPSCALE"],
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.medium,
    costClass: capabilityCostClasses.paidExternal,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("WEBSITE_GENERATE", {
    description: "Compose structure, design, code, observation and verification for a website.",
    domainTags: ["developer", "workspace"],
    inputTypes: ["business_brief", "style_reference", "content"],
    outputTypes: ["website_project", "code_artifact", "verification_report"],
    requiredSubCapabilities: ["ARCHITECTURE_DESIGN", "UI_GENERATE", "CODE_GENERATE", "BROWSER_OBSERVE", "UI_VERIFY"],
    optionalSubCapabilities: ["IMAGE_GENERATE", "DOCUMENT_GENERATE"],
    localPossible: true,
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.medium,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("VIDEO_TRIM", {
    description: "Trim a video to requested time boundaries using safe local execution when inputs and boundaries pass policy.",
    domainTags: ["production", "workspace"],
    inputTypes: ["video_file", "time_range"],
    outputTypes: ["video_file", "DerivedExecutionArtifact", "ExecutionVerificationResult"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    riskClass: capabilityRiskClasses.low,
    costClass: capabilityCostClasses.localCompute,
    supportedProviders: ["LOCAL_FFMPEG"],
    activationState: capabilityActivationStates.localReady,
    metadata: {
      safeLocalExecutionAvailable: true,
      safeLocalExecutionClass: "SAFE_LOCAL_EXECUTION",
      allowedOperation: "VIDEO_TRIM",
      sourcePreservationRequired: true,
      derivedArtifactRequired: true,
      verificationRequired: "ffprobe",
      rollback: "delete_derived_artifact_only",
      externalProviderCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0
    }
  }),
  base("MEDIA_PROBE", {
    description: "Inspect local media metadata as a read-only safe local execution capability.",
    domainTags: ["production", "workspace"],
    inputTypes: ["media_file"],
    outputTypes: ["MediaProbeResult", "ExecutionVerificationResult"],
    verificationRequirements: ["ffprobe_structured_observation", "source_fingerprint_unchanged"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    riskClass: capabilityRiskClasses.low,
    costClass: capabilityCostClasses.localCompute,
    supportedProviders: ["LOCAL_FFPROBE"],
    activationState: capabilityActivationStates.localReady,
    metadata: {
      safeLocalExecutionAvailable: true,
      safeLocalExecutionClass: "SAFE_LOCAL_EXECUTION",
      allowedOperation: "MEDIA_PROBE",
      executionMode: "LOCAL_READ_ONLY",
      sourcePreservationRequired: true,
      derivedArtifactRequired: false,
      verificationRequired: "ffprobe",
      rollback: "not_applicable",
      externalProviderCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0
    }
  }),
  base("VIDEO_RESIZE", {
    description: "Create a bounded resized local video copy using safe local execution and verified dimensions.",
    domainTags: ["production", "workspace"],
    inputTypes: ["video_file", "target_profile"],
    outputTypes: ["video_file", "DerivedExecutionArtifact", "ExecutionVerificationResult"],
    verificationRequirements: ["ffprobe_dimensions_check", "source_fingerprint_unchanged"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    riskClass: capabilityRiskClasses.low,
    costClass: capabilityCostClasses.localCompute,
    supportedProviders: ["LOCAL_FFMPEG"],
    activationState: capabilityActivationStates.localReady,
    metadata: {
      safeLocalExecutionAvailable: true,
      safeLocalExecutionClass: "SAFE_LOCAL_EXECUTION",
      allowedOperation: "VIDEO_RESIZE",
      executionMode: "LOCAL_DERIVED_ARTIFACT",
      allowedProfiles: ["VIDEO_RESIZE_320x180"],
      sourcePreservationRequired: true,
      derivedArtifactRequired: true,
      verificationRequired: "ffprobe",
      rollback: "delete_derived_artifact_only",
      externalProviderCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0
    }
  }),
  base("AUDIO_EXTRACT", {
    description: "Extract an audio track from a local media file into a new derived artifact.",
    domainTags: ["production", "workspace"],
    inputTypes: ["media_file", "target_profile"],
    outputTypes: ["audio_file", "DerivedExecutionArtifact", "ExecutionVerificationResult"],
    verificationRequirements: ["ffprobe_audio_stream_check", "source_fingerprint_unchanged"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    riskClass: capabilityRiskClasses.low,
    costClass: capabilityCostClasses.localCompute,
    supportedProviders: ["LOCAL_FFMPEG"],
    activationState: capabilityActivationStates.localReady,
    metadata: {
      safeLocalExecutionAvailable: true,
      safeLocalExecutionClass: "SAFE_LOCAL_EXECUTION",
      allowedOperation: "AUDIO_EXTRACT",
      executionMode: "LOCAL_DERIVED_ARTIFACT",
      allowedProfiles: ["AUDIO_WAV_STANDARD"],
      sourcePreservationRequired: true,
      derivedArtifactRequired: true,
      verificationRequired: "ffprobe",
      rollback: "delete_derived_artifact_only",
      externalProviderCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      deployActions: 0
    }
  }),
  base("VOCAL_REPLACE", {
    description: "Plan a vocal replacement workflow without claiming voice cloning is active.",
    domainTags: ["music_factory", "voice"],
    requiredSubCapabilities: ["MUSIC_ANALYZE", "STEM_SEPARATE", "VOICE_REPLACE", "AUDIO_MIX", "MUSIC_EXPORT"],
    optionalSubCapabilities: ["VOICE_CLONE", "AUDIO_MASTER"],
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.high,
    costClass: capabilityCostClasses.paidExternal,
    approvalRequirements: ["human_approval_for_voice_identity_use", "rights_review_required"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("PUBLISHING_PACKAGE", {
    description: "Prepare a publishing package. Publishing itself remains approval-gated.",
    domainTags: ["publishing"],
    requiredSubCapabilities: ["DOCUMENT_FORMAT"],
    optionalSubCapabilities: ["BOOK_COVER", "EBOOK_BUILD", "AUDIOBOOK_BUILD"],
    riskClass: capabilityRiskClasses.publish,
    costClass: capabilityCostClasses.metered,
    approvalRequirements: ["human_publish_approval"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("DOCUMENTATION_LOOKUP", {
    description: "Retrieve verified bounded documentation context.",
    domainTags: ["research", "developer"],
    deterministicPossible: true,
    localPossible: false,
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.low,
    costClass: capabilityCostClasses.free,
    supportedProviders: ["CONTEXT7"],
    activationState: capabilityActivationStates.providerReady
  }),
  base("BROWSER_OBSERVE", {
    deterministicPossible: true,
    localPossible: true,
    supportedProviders: ["PLAYWRIGHT"],
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.localReady
  }),
  base("UI_VERIFY", {
    deterministicPossible: true,
    localPossible: true,
    supportedProviders: ["PLAYWRIGHT"],
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.localReady
  }),
  base("AUDIO_TRANSCRIBE", {
    deterministicPossible: true,
    localPossible: true,
    supportedProviders: ["LOCAL_WHISPER_CPP"],
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.localReady
  }),
  base("VIDEO_TRANSCRIBE", {
    deterministicPossible: true,
    localPossible: true,
    supportedProviders: ["LOCAL_WHISPER_CPP"],
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.localReady
  }),
  base("BUSINESS_DISCOVERY", {
    description: "Plan and normalize public business discovery into reviewable B2B lead intelligence.",
    domainTags: ["business", "lead_intelligence", "growth"],
    inputTypes: ["lead_discovery_request", "public_business_source_policy"],
    outputTypes: ["BusinessEntitySet", "LeadIntelligenceAuditArtifact"],
    requiredSubCapabilities: ["BUSINESS_DATA_NORMALIZE", "BUSINESS_DEDUPLICATE", "BUSINESS_ENTITY_VERIFY"],
    optionalSubCapabilities: ["BUSINESS_NEED_ANALYZE", "ESSA_FIT_MATCH", "LEAD_QUALIFY", "LEAD_SCORE"],
    localPossible: true,
    deterministicPossible: true,
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.medium,
    costClass: capabilityCostClasses.localCompute,
    approvalRequirements: ["live_source_activation_requires_explicit_approval"],
    supportedProviders: ["LOCAL_SYNTHETIC_BUSINESS_FIXTURE"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("BUSINESS_ENTITY_VERIFY", {
    description: "Check public business evidence, source count, freshness and review status.",
    domainTags: ["business", "lead_intelligence", "verification"],
    inputTypes: ["BusinessEntity"],
    outputTypes: ["BusinessVerificationResult"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("BUSINESS_DATA_NORMALIZE", {
    description: "Normalize public business fields while excluding personal and sensitive data.",
    domainTags: ["business", "lead_intelligence", "privacy"],
    inputTypes: ["raw_public_business_record"],
    outputTypes: ["BusinessEntity"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("BUSINESS_DEDUPLICATE", {
    description: "Deduplicate normalized business entities with transparent matching reasons.",
    domainTags: ["business", "lead_intelligence"],
    inputTypes: ["BusinessEntitySet"],
    outputTypes: ["BusinessDeduplicationReport"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("LEAD_QUALIFY", {
    description: "Qualify public business leads against a user-requested market, geography and ESSA fit.",
    domainTags: ["business", "lead_intelligence", "growth"],
    inputTypes: ["LeadDiscoveryRequest", "BusinessEntity", "BusinessVerificationResult"],
    outputTypes: ["LeadQualificationResult"],
    requiredSubCapabilities: ["BUSINESS_ENTITY_VERIFY", "BUSINESS_NEED_ANALYZE", "ESSA_FIT_MATCH"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("LEAD_SCORE", {
    description: "Score qualified business leads with explainable, reviewable component scores.",
    domainTags: ["business", "lead_intelligence"],
    inputTypes: ["LeadQualificationResult", "BusinessNeedSignalSet"],
    outputTypes: ["LeadScore"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("BUSINESS_NEED_ANALYZE", {
    description: "Detect observed public business need signals without inventing private or unsupported claims.",
    domainTags: ["business", "lead_intelligence", "product_education"],
    inputTypes: ["BusinessEntity"],
    outputTypes: ["BusinessNeedSignalSet"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("ESSA_FIT_MATCH", {
    description: "Map verified business need signals to ESSA products and capabilities.",
    domainTags: ["business", "lead_intelligence", "product_knowledge"],
    inputTypes: ["BusinessNeedSignalSet", "ProductKnowledge"],
    outputTypes: ["EssaFitMatchSet"],
    requiredSubCapabilities: ["BUSINESS_NEED_ANALYZE"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("LEAD_EXPORT", {
    description: "Create a local, review-only export preview of allowed public business fields.",
    domainTags: ["business", "lead_intelligence"],
    inputTypes: ["BusinessEntitySet"],
    outputTypes: ["LeadExportPreview"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    approvalRequirements: ["human_review_before_external_crm_import"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("OUTREACH_PREPARE", {
    description: "Prepare a human-reviewed outreach brief without sending, posting or mutating external systems.",
    domainTags: ["business", "lead_intelligence", "advertising", "creator_network"],
    inputTypes: ["LeadQualificationResult", "EssaFitMatchSet"],
    outputTypes: ["OutreachBriefPreview"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    riskClass: capabilityRiskClasses.high,
    costClass: capabilityCostClasses.localCompute,
    approvalRequirements: ["human_review_required", "legal_policy_revalidation_required"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("OUTREACH_SEND", {
    description: "Future approval-gated sending boundary; disabled in Phase 21J-LI.",
    domainTags: ["business", "lead_intelligence", "advertising", "creator_network"],
    inputTypes: ["ApprovedOutreachBrief"],
    outputTypes: ["OutreachDeliveryRecord"],
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.externalMutation,
    costClass: capabilityCostClasses.metered,
    approvalRequirements: ["explicit_human_send_approval", "legal_policy_revalidation_required", "channel_policy_required"],
    activationState: capabilityActivationStates.disabled,
    userFacing: false,
    educationEligible: false,
    contentEligible: false
  }),
  base("CONTENT_ANALYZE", {
    description: "Analyze content assets using provider-independent identity, lineage, quality and performance boundaries.",
    domainTags: ["production", "advertising", "creator_network", "business", "content_intelligence"],
    inputTypes: ["ContentAsset", "quality_refs", "analytics_refs_future"],
    outputTypes: ["ContentIntelligenceReport", "ContentAnalyticsAuditArtifact"],
    requiredSubCapabilities: ["SEMANTIC_ANALYZE"],
    optionalSubCapabilities: ["CONTENT_PERFORMANCE_ANALYZE", "CONTENT_LEARN"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    verificationRequirements: ["content_asset_contract_validation", "no_provider_calls"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("CONTENT_PERFORMANCE_ANALYZE", {
    description: "Separate attention metrics from conversion, economics and learning metrics without claiming unavailable platform data.",
    domainTags: ["production", "advertising", "analytics", "content_intelligence"],
    inputTypes: ["canonical_metrics", "metric_availability"],
    outputTypes: ["attentionPerformance", "conversionPerformance", "dataCompleteness"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    costClass: capabilityCostClasses.localCompute,
    approvalRequirements: ["live_platform_adapter_activation_requires_approval"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("CONTENT_ATTRIBUTION", {
    description: "Map content touchpoints to conversion outcomes with explicit confidence and incomplete-evidence handling.",
    domainTags: ["production", "advertising", "business", "attribution", "content_intelligence"],
    inputTypes: ["ConversionEvent", "AttributionRecord"],
    outputTypes: ["AttributionRecord", "revenue_evidence"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.medium,
    costClass: capabilityCostClasses.localCompute,
    approvalRequirements: ["privacy_policy_required_before_live_tracking"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("CONTENT_ECONOMICS", {
    description: "Compute content economics only from available cost, conversion and revenue evidence; never invent missing revenue.",
    domainTags: ["production", "business", "advertising", "content_intelligence"],
    inputTypes: ["ContentEconomicsRecord", "BusinessFinancialOperationsBoundary"],
    outputTypes: ["ContentEconomicsRecord"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    verificationRequirements: ["missing_data_does_not_create_fake_roi"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("CONTENT_LEARN", {
    description: "Create scoped learning observations and pattern insights while keeping observed, correlated, hypothesis and validated states separate.",
    domainTags: ["production", "intelligence", "product_education", "content_intelligence"],
    inputTypes: ["ContentLearningObservation", "ContentPatternInsight", "QualityHistory"],
    outputTypes: ["ContentLearningObservation", "ContentPatternInsight"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    costClass: capabilityCostClasses.localCompute,
    verificationRequirements: ["correlation_not_causation", "lisa_character_core_not_mutated"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("NEXT_CONTENT_RECOMMEND", {
    description: "Recommend next content strategy from bounded observations without automatically generating or publishing content.",
    domainTags: ["production", "intelligence", "product_education", "content_intelligence"],
    inputTypes: ["ContentIntelligenceReport", "CampaignIntelligenceReport"],
    outputTypes: ["NextContentRecommendation"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("CAMPAIGN_INTELLIGENCE", {
    description: "Roll content asset outcomes into Advertising-owned campaign intelligence with spend, attention, conversion, revenue and learning signals.",
    domainTags: ["advertising", "production", "business", "content_intelligence"],
    inputTypes: ["CampaignIntelligenceReport", "ContentIntelligenceReport"],
    outputTypes: ["CampaignIntelligenceReport"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: true,
    costClass: capabilityCostClasses.localCompute,
    approvalRequirements: ["live_ad_platform_adapter_activation_requires_approval"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("VIRAL_PATTERN_ANALYZE", {
    description: "Extract structural content patterns from source-provenance-aware observations without copying or cloning third-party content.",
    domainTags: ["production", "research", "content_intelligence"],
    inputTypes: ["public_trend_metadata_future", "ViralPatternObservation"],
    outputTypes: ["ViralPatternObservation"],
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.medium,
    costClass: capabilityCostClasses.metered,
    approvalRequirements: ["copyright_boundary_review", "platform_terms_review", "live_research_activation_requires_approval"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("FACELESS_CHANNEL_BUILD", {
    description: "Architecture-only faceless channel factory covering research through learning with approval and policy gates.",
    domainTags: ["production", "creator_network", "advertising", "content_intelligence"],
    inputTypes: ["business_goal", "audience", "brand", "creative_strategy"],
    outputTypes: ["FacelessChannelFactoryPlan"],
    requiredSubCapabilities: ["CONTENT_PLAN", "SEMANTIC_ANALYZE", "VIDEO_CAPTION", "CONTENT_PERFORMANCE_ANALYZE", "CONTENT_LEARN"],
    optionalSubCapabilities: ["VOICE_GENERATE", "VIDEO_EDIT", "NEXT_CONTENT_RECOMMEND"],
    externalProviderPossible: true,
    riskClass: capabilityRiskClasses.publish,
    costClass: capabilityCostClasses.metered,
    approvalRequirements: ["human_approval", "autonomous_mode_policy", "publish_approval_required"],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("CONTENT_EXPERIMENT", {
    description: "Prepare controlled content variant experiments, goal-aware winner detection and sequential next-generation recommendations without live distribution.",
    domainTags: ["production", "advertising", "content_intelligence"],
    inputTypes: ["ContentExperiment", "ContentVariant", "ExperimentVariantSet", "WinnerDetectionResult"],
    outputTypes: ["ContentExperiment", "WinnerDetectionResult", "NextVariantGenerationRecommendation", "ContentPatternInsight"],
    requiredSubCapabilities: ["CONTENT_PERFORMANCE_ANALYZE", "CONTENT_LEARN"],
    optionalSubCapabilities: ["CONTENT_ECONOMICS", "NEXT_CONTENT_RECOMMEND"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    verificationRequirements: [
      "master_variant_lineage_present",
      "explicit_change_set_present",
      "controlled_variables_present",
      "goal_aware_winner_detection",
      "sufficient_evidence_required_for_validated_state",
      "no_mass_duplicate_spam"
    ],
    activationState: capabilityActivationStates.architectureOnly
  }),
  base("OFFER_AWARE_CONTENT_PLAN", {
    description: "Plan commercial content around Business-owned offers, CTA and funnel refs while allowing non-commercial content.",
    domainTags: ["production", "business", "advertising", "content_intelligence"],
    inputTypes: ["OfferReference", "ContentAsset", "BusinessGoal"],
    outputTypes: ["ContentAsset", "ChannelEducationBrief"],
    deterministicPossible: true,
    localPossible: true,
    externalProviderPossible: false,
    costClass: capabilityCostClasses.localCompute,
    activationState: capabilityActivationStates.architectureOnly
  })
];

const overrideById = new Map(overrides.map((capability) => [capability.capabilityId, capability]));
export const capabilityRegistry = allTaxonomyCapabilities.map((capability) =>
  overrideById.get(capability.capabilityId) || capability
);

export function getCapability(capabilityId, registry = capabilityRegistry) {
  const capability = registry.find((item) => item.capabilityId === capabilityId);
  return capability ? createEssaCapability(capability) : null;
}

export function listCapabilities(filters = {}, registry = capabilityRegistry) {
  return registry
    .filter((capability) => {
      if (filters.category && capability.category !== filters.category) return false;
      if (filters.domain && !capability.domainTags.includes(filters.domain)) return false;
      if (filters.activationState && capability.activationState !== filters.activationState) return false;
      if (typeof filters.userFacing === "boolean" && capability.userFacing !== filters.userFacing) return false;
      return true;
    })
    .map(createEssaCapability);
}

export function validateCapabilityRegistry(registry = capabilityRegistry) {
  return registry.map((capability) => ({
    capabilityId: capability.capabilityId,
    valid: Boolean(
      capability.capabilityId &&
      capability.canonicalName &&
      capability.category &&
      !/openai|claude|anthropic|elevenlabs|omni/i.test(capability.capabilityId) &&
      Array.isArray(capability.requiredSubCapabilities) &&
      Array.isArray(capability.supportedProviders)
    )
  }));
}
