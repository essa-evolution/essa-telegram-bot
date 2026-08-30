import { technologyLifecycleStatuses } from "./technologyContracts.js";

export const technologyRadar = [
  {
    radarId: "GLM_5_3_FLASH",
    candidateId: "ox_alpha_glm_5_3_flash",
    name: "GLM-5.3-Flash",
    canonicalModelId: "z-ai/glm-5.3-flash",
    historicalAliases: ["Ox Alpha", "stealth/ox-alpha"],
    stage: technologyLifecycleStatuses.watch,
    sourceOfTruth: "artifacts/research/OxAlphaResearchArtifact.json",
    providerCalls: 0,
    externalCalls: 0,
    notes: ["Ox Alpha archived as historical alias.", "No production activation."]
  }
];

export function upsertTechnologyRadarEntry(entry = {}, radar = technologyRadar) {
  const existing = radar.find((item) => item.radarId === entry.radarId || item.candidateId === entry.candidateId);
  const normalized = {
    radarId: entry.radarId || entry.candidateId,
    candidateId: entry.candidateId,
    name: entry.name,
    stage: entry.stage || technologyLifecycleStatuses.discovered,
    history: [...(entry.history || [])],
    providerCalls: entry.providerCalls || 0,
    externalCalls: entry.externalCalls || 0,
    installs: entry.installs || 0,
    activations: entry.activations || 0,
    ...entry
  };

  if (existing) {
    Object.assign(existing, normalized, {
      history: [...(existing.history || []), ...(entry.history || [])]
    });
    return existing;
  }

  radar.push(normalized);
  return normalized;
}

export function createRadarEntryFromRecommendation(candidate = {}, recommendationPackage = {}) {
  const stageByRecommendation = {
    IGNORE: technologyLifecycleStatuses.archived,
    WATCH: technologyLifecycleStatuses.watch,
    RESEARCH: technologyLifecycleStatuses.research,
    SECURITY_REVIEW: technologyLifecycleStatuses.research,
    BENCHMARK: technologyLifecycleStatuses.benchmarkPending,
    ADOPTION_REVIEW: technologyLifecycleStatuses.adoptionReview,
    ADOPT_FUTURE: technologyLifecycleStatuses.adoptionReview,
    REJECT: technologyLifecycleStatuses.rejected
  };

  return {
    radarId: candidate.candidateId,
    candidateId: candidate.candidateId,
    name: candidate.name,
    stage: stageByRecommendation[recommendationPackage.recommendation] || technologyLifecycleStatuses.watch,
    technologyType: candidate.technologyType,
    recommendation: recommendationPackage.recommendation,
    sourceRefs: candidate.sourceRefs,
    providerCalls: 0,
    externalCalls: 0,
    history: [{ event: "phase21k_ts_radar_update", stage: stageByRecommendation[recommendationPackage.recommendation] }]
  };
}

