import { createEmptyHumanScorecard } from "./rubric.js";

const BLIND_LABELS = ["Candidate A", "Candidate B", "Candidate C", "Candidate D", "Candidate E", "Candidate F"];

function deterministicShuffle(items = []) {
  return [...items].sort((left, right) => {
    const leftKey = `${left.providerId || ""}:${left.modelId || ""}`;
    const rightKey = `${right.providerId || ""}:${right.modelId || ""}`;
    return leftKey.localeCompare(rightKey);
  });
}

export function createBlindReviewPackage(results = []) {
  const shuffled = deterministicShuffle(results);
  const mapping = {};
  const blindOutputs = shuffled.map((result, index) => {
    const candidateId = BLIND_LABELS[index] || `Candidate ${index + 1}`;

    mapping[candidateId] = {
      providerId: result.providerId,
      modelId: result.modelId,
      ok: result.ok,
      errors: result.errors
    };

    return {
      candidateId,
      ok: result.ok,
      content: result.ok ? result.content : "",
      hiddenProvider: true,
      reviewScorecard: createEmptyHumanScorecard(candidateId),
      operationalMetrics: {
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCost: result.estimatedCost,
        errors: result.errors
      }
    };
  });

  return {
    blindOutputs,
    providerMappingForDebugOnly: mapping
  };
}
