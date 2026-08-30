import { createTechnologyResearchArtifact, evidenceStatuses } from "./technologyContracts.js";
import { verifyTechnologyClaims } from "./claimVerification.js";

export function createTechnologyResearchArtifactFromCandidate(candidate = {}, options = {}) {
  const claims = verifyTechnologyClaims(options.claims || candidate.signals?.flatMap((signal) => signal.claims || []) || []);
  const byEvidence = (status) => claims.filter((claim) => claim.evidenceTypes?.includes(status));

  return createTechnologyResearchArtifact({
    candidateId: candidate.candidateId,
    researchTimestamp: options.researchTimestamp || "2026-08-27T00:00:00.000Z",
    sources: candidate.sourceRefs || [],
    claims,
    officialFacts: byEvidence(evidenceStatuses.officialFact),
    independentEvidence: byEvidence(evidenceStatuses.independentEvidence),
    communitySignals: byEvidence(evidenceStatuses.communitySignal),
    socialClaims: byEvidence(evidenceStatuses.socialClaim),
    conflicts: claims.filter((claim) => claim.status === "CONFLICTING"),
    unknowns: claims.filter((claim) => claim.status === "UNKNOWN"),
    requiresRevalidation: options.requiresRevalidation || ["fresh_metadata_before_activation"],
    providerCalls: 0,
    externalCalls: 0
  });
}

