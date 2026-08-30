export const qualityRecordContract = {
  taskType: null,
  provider: null,
  model: null,
  canonicalModelId: null,
  historicalAliases: [],
  success: null,
  verificationStatus: null,
  cost: null,
  latency: null,
  retries: 0,
  qualityScore: null,
  status: "UNSCORED",
  evidenceLevel: "NONE",
  sourceOfTruth: null,
  providerCallsMade: false,
  externalDataSent: false,
  timestamp: null
};

export function createQualityRecord(input = {}) {
  return {
    ...qualityRecordContract,
    ...input,
    historicalAliases: [...(input.historicalAliases || qualityRecordContract.historicalAliases)],
    timestamp: input.timestamp || new Date(0).toISOString()
  };
}

export const glm53FlashResearchQualityRecord = createQualityRecord({
  taskType: "phase21k_ox_research_candidate",
  provider: "z-ai",
  model: "glm-5.3-flash",
  canonicalModelId: "z-ai/glm-5.3-flash",
  historicalAliases: ["Ox Alpha", "stealth/ox-alpha"],
  success: null,
  verificationStatus: "NOT_BENCHMARKED",
  cost: null,
  latency: null,
  retries: 0,
  qualityScore: null,
  status: "WATCH_RESEARCH_ONLY",
  evidenceLevel: "PUBLIC_RESEARCH_ONLY",
  sourceOfTruth: "artifacts/research/OxAlphaResearchArtifact.json",
  providerCallsMade: false,
  externalDataSent: false,
  timestamp: "2026-08-27T04:47:56.5168075+04:00"
});

export const qualityHistory = [glm53FlashResearchQualityRecord];
