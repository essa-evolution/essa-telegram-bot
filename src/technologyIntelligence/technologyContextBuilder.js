export function buildTechnologyResearchContext({ sources = [], claims = [], maxSources = 5, maxClaims = 8, maxChars = 2000 } = {}) {
  const selectedSources = sources.slice(0, maxSources);
  const selectedClaims = claims.slice(0, maxClaims);
  const serialized = JSON.stringify({ selectedSources, selectedClaims });
  const trimmed = serialized.length > maxChars;

  return {
    selectedSources,
    selectedClaims,
    excludedNoise: Math.max(0, sources.length - selectedSources.length) + Math.max(0, claims.length - selectedClaims.length),
    chars: Math.min(serialized.length, maxChars),
    estimatedTokens: Math.ceil(Math.min(serialized.length, maxChars) / 4),
    trustTiers: [...new Set(selectedSources.map((source) => source.trustTier || "UNKNOWN"))],
    trimmed,
    policy: {
      neverSendFullMemoryAutomatically: true,
      publicTechnologyMetadataOnly: true,
      providerMayExpandContext: false
    }
  };
}

