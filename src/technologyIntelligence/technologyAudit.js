export function createTechnologyIntelligenceAuditArtifact(input = {}) {
  return {
    artifactType: "TechnologyIntelligenceAuditArtifact",
    phase: "21K-TS",
    scan: input.scan || null,
    sources: [...(input.sources || [])],
    candidates: [...(input.candidates || [])],
    research: [...(input.research || [])],
    verification: [...(input.verification || [])],
    relevance: [...(input.relevance || [])],
    comparison: [...(input.comparison || [])],
    recommendations: [...(input.recommendations || [])],
    humanDecisionsFuture: [...(input.humanDecisionsFuture || [])],
    benchmarkHandoffs: [...(input.benchmarkHandoffs || [])],
    providerCalls: input.providerCalls || 0,
    externalCalls: input.externalCalls || 0,
    installs: input.installs || 0,
    activations: input.activations || 0,
    secretChanges: input.secretChanges || 0,
    apiKeysCreated: input.apiKeysCreated || 0,
    billingChanges: input.billingChanges || 0,
    timestamp: input.timestamp || "2026-08-27T00:00:00.000Z"
  };
}

