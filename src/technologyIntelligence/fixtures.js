import {
  costChangeClasses,
  technologyEventTypes,
  technologyLifecycleStatuses,
  technologyTypes
} from "./technologyContracts.js";

export const knownTechnologyCapabilityGaps = ["VIDEO_GENERATE", "VOICE_GENERATE", "LOCAL_INFERENCE", "BROWSER_AGENT"];

export const technologyIntelligenceFixtureSignals = [
  {
    candidateId: "ox_alpha_glm_5_3_flash",
    name: "Ox Alpha / GLM-5.3-Flash",
    technologyType: technologyTypes.aiModel,
    developer: "Z.ai",
    provider: "Z.ai",
    sourceId: "openrouter_models",
    firstObservedAt: "2026-08-20T00:00:00.000Z",
    lastObservedAt: "2026-08-27T00:00:00.000Z",
    officialUrlRefs: ["https://openrouter.ai/z-ai/glm-5.3-flash"],
    claimedCapabilities: ["TEXT_REASON", "CODE_REASON", "IMAGE_UNDERSTAND", "VIDEO_UNDERSTAND", "TOOL_CALL"],
    versionOrModelId: "z-ai/glm-5.3-flash",
    pricingStatus: "PAID_REVALIDATION_REQUIRED",
    availabilityStatus: "WATCH_RESEARCH_ONLY",
    lifecycleStatus: technologyLifecycleStatuses.watch,
    eventType: technologyEventTypes.update,
    claims: [
      {
        claimId: "ox_alias_resolved",
        text: "Ox Alpha was resolved to GLM-5.3-Flash.",
        evidence: [{ sourceId: "openrouter_models" }]
      },
      {
        claimId: "ox_beats_gpt_sol",
        text: "Ox Alpha beats GPT-5.6 Sol.",
        evidence: [{ sourceId: "social_signal" }]
      }
    ]
  },
  {
    candidateId: "hypothetical_video_model",
    name: "Hypothetical Video Model",
    technologyType: technologyTypes.videoTool,
    sourceId: "reputable_tech_news",
    claimedCapabilities: ["VIDEO_GENERATE", "VIDEO_EDIT"],
    pricingStatus: "UNKNOWN",
    availabilityStatus: "PREVIEW",
    eventType: technologyEventTypes.newOpportunity,
    qualityClaim: true,
    claims: [{ claimId: "video_generation", text: "New video generation capability.", evidence: [{ sourceId: "reputable_tech_news" }] }]
  },
  {
    candidateId: "hypothetical_open_voice_engine",
    name: "Hypothetical Open Voice Engine",
    technologyType: technologyTypes.voiceTool,
    sourceId: "github_releases",
    repositoryRefs: ["https://github.com/example/open-voice-engine"],
    claimedCapabilities: ["VOICE_GENERATE"],
    openSourceStatus: "OPEN_SOURCE",
    licenseStatus: "UNKNOWN_REVIEW_REQUIRED",
    pricingStatus: "FREE",
    eventType: technologyEventTypes.newOpportunity,
    claims: [{ claimId: "voice_engine_readme", text: "README claims voice generation.", evidence: [{ sourceId: "github_releases" }] }]
  },
  {
    candidateId: "hypothetical_github_coding_tool",
    name: "Hypothetical GitHub Coding Tool",
    technologyType: technologyTypes.codingAgent,
    sourceId: "github_trending_or_search",
    repositoryRefs: ["https://github.com/example/coding-tool"],
    claimedCapabilities: ["CODE_EDIT", "CODE_REVIEW"],
    openSourceStatus: "OPEN_SOURCE",
    licenseStatus: "MIT_CLAIMED_REVIEW_REQUIRED",
    eventType: technologyEventTypes.discovered,
    claims: [{ claimId: "stars_are_signal", text: "Trending stars imply quality.", evidence: [{ sourceId: "github_trending_or_search" }] }]
  },
  {
    candidateId: "provider_pricing_increase",
    name: "Provider Pricing Increase",
    technologyType: technologyTypes.modelProvider,
    sourceId: "official_changelogs",
    claimedCapabilities: ["TEXT_GENERATE"],
    eventType: technologyEventTypes.costChange,
    costChangeClass: costChangeClasses.regression,
    pricingStatus: "PRICE_INCREASED_REVALIDATION_REQUIRED",
    claims: [{ claimId: "price_increase", text: "Provider pricing materially changed.", evidence: [{ sourceId: "official_changelogs" }] }]
  },
  {
    candidateId: "model_deprecation",
    name: "Model Deprecation",
    technologyType: technologyTypes.aiModel,
    sourceId: "official_changelogs",
    claimedCapabilities: ["TEXT_GENERATE"],
    eventType: technologyEventTypes.breakingChange,
    availabilityStatus: "DEPRECATION_REPORTED",
    claims: [{ claimId: "model_deprecated", text: "Current provider model deprecated.", evidence: [{ sourceId: "official_changelogs" }] }]
  },
  {
    candidateId: "irrelevant_viral_repository",
    name: "Irrelevant Viral Repository",
    technologyType: technologyTypes.openSourceTool,
    sourceId: "social_signal",
    repositoryRefs: ["https://github.com/example/viral-noise"],
    claimedCapabilities: ["UNRELATED_MEME_GENERATOR"],
    eventType: technologyEventTypes.discovered,
    noise: true,
    claims: [{ claimId: "viral_hype", text: "Viral repository changes everything.", evidence: [{ sourceId: "social_signal" }] }]
  },
  {
    candidateId: "security_risk_repository",
    name: "Security Risk Repository",
    technologyType: technologyTypes.openSourceTool,
    sourceId: "github_releases",
    repositoryRefs: ["https://github.com/example/risky-tool"],
    claimedCapabilities: ["CODE_EDIT"],
    openSourceStatus: "OPEN_SOURCE",
    securityRisk: "HIGH",
    eventType: technologyEventTypes.discovered,
    claims: [{ claimId: "install_script_network", text: "Install script downloads remote binary.", evidence: [{ sourceId: "github_releases" }] }]
  },
  {
    candidateId: "cheaper_local_alternative",
    name: "Cheaper Local Alternative",
    technologyType: technologyTypes.openSourceTool,
    sourceId: "github_releases",
    repositoryRefs: ["https://github.com/example/local-alt"],
    claimedCapabilities: ["LOCAL_INFERENCE", "AUDIO_TRANSCRIBE"],
    openSourceStatus: "OPEN_SOURCE",
    pricingStatus: "FREE",
    eventType: technologyEventTypes.newOpportunity,
    claims: [{ claimId: "local_free", text: "Local free alternative exists.", evidence: [{ sourceId: "github_releases" }] }]
  },
  {
    candidateId: "capability_gap_match",
    name: "Capability Gap Match",
    technologyType: technologyTypes.mcpTool,
    sourceId: "official_documentation",
    claimedCapabilities: ["BROWSER_AGENT"],
    eventType: technologyEventTypes.newOpportunity,
    claims: [{ claimId: "browser_agent", text: "Official docs claim browser agent capability.", evidence: [{ sourceId: "official_documentation" }] }]
  }
];

