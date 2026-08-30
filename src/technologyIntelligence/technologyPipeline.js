import { analyzeTechnologyEssaFit } from "./essaRelevanceAnalyzer.js";
import { runTechScoutFixtureScan } from "./techScoutAgent.js";
import { createTechnologyResearchArtifactFromCandidate } from "./technologyResearchAgent.js";
import { createTechnologyComparison } from "./technologyComparator.js";
import { evaluateTechnologyRisk } from "./technologyRiskPolicy.js";
import { createTechnologyRecommendationPackage } from "./technologyRecommendation.js";
import { createRadarEntryFromRecommendation, upsertTechnologyRadarEntry } from "./technologyRadar.js";
import { createTechnologyDigest } from "./technologyDigest.js";
import { createTechnologyIntelligenceAuditArtifact } from "./technologyAudit.js";

export function runTechnologyIntelligenceFixturePipeline({ signals = [], knownCapabilityGaps = [], radar = [] } = {}) {
  const scan = runTechScoutFixtureScan({ signals, knownCapabilityGaps });
  const research = scan.candidatesDiscovered.map((candidate) =>
    createTechnologyResearchArtifactFromCandidate(candidate)
  );
  const relevance = scan.candidatesDiscovered.map((candidate) => analyzeTechnologyEssaFit(candidate, { knownCapabilityGaps }));
  const comparison = scan.candidatesDiscovered.map((candidate, index) =>
    createTechnologyComparison({ candidate, fit: relevance[index], research: research[index] })
  );
  const risk = scan.candidatesDiscovered.map((candidate, index) =>
    evaluateTechnologyRisk(candidate, research[index])
  );
  const recommendations = scan.candidatesDiscovered.map((candidate, index) =>
    createTechnologyRecommendationPackage({
      candidate,
      research: research[index],
      fit: relevance[index],
      risk: risk[index],
      comparison: comparison[index]
    })
  );
  const radarEntries = scan.candidatesDiscovered.map((candidate, index) =>
    upsertTechnologyRadarEntry(createRadarEntryFromRecommendation(candidate, recommendations[index]), radar)
  );
  const digest = createTechnologyDigest({ scanResult: scan, recommendations });
  const audit = createTechnologyIntelligenceAuditArtifact({
    scan,
    sources: scan.candidatesDiscovered.flatMap((candidate) => candidate.sourceRefs),
    candidates: scan.candidatesDiscovered,
    research,
    verification: research,
    relevance,
    comparison,
    recommendations,
    benchmarkHandoffs: recommendations.map((item) => item.benchmarkPlan).filter(Boolean),
    providerCalls: 0,
    externalCalls: 0,
    installs: 0,
    activations: 0,
    secretChanges: 0,
    apiKeysCreated: 0,
    billingChanges: 0
  });

  return { scan, research, relevance, comparison, risk, recommendations, radarEntries, digest, audit };
}

