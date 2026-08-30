import { claimStatuses, evidenceStatuses, sourceTrustTiers } from "./technologyContracts.js";
import { getTechnologySource } from "./technologySourceRegistry.js";

export function classifyEvidenceFromSource(sourceRef = {}) {
  const source = getTechnologySource(sourceRef.sourceId) || sourceRef;
  if (source.trustTier === sourceTrustTiers.tier1Official) return evidenceStatuses.officialFact;
  if (source.trustTier === sourceTrustTiers.tier2IndependentTechnical) return evidenceStatuses.independentEvidence;
  if (source.trustTier === sourceTrustTiers.tier3RepositoryCommunity) return evidenceStatuses.communitySignal;
  if (source.trustTier === sourceTrustTiers.tier4SocialSignal) return evidenceStatuses.socialClaim;
  return evidenceStatuses.unknown;
}

export function verifyTechnologyClaim(claim = {}) {
  const evidenceTypes = (claim.evidence || []).map(classifyEvidenceFromSource);
  const hasConflict = claim.conflicts?.length > 0;

  if (hasConflict) {
    return { ...claim, status: claimStatuses.conflicting, evidenceTypes };
  }

  if (evidenceTypes.includes(evidenceStatuses.officialFact)) {
    return { ...claim, status: claimStatuses.verified, evidenceTypes };
  }

  if (evidenceTypes.includes(evidenceStatuses.independentEvidence)) {
    return { ...claim, status: claimStatuses.probable, evidenceTypes };
  }

  if (evidenceTypes.includes(evidenceStatuses.communitySignal) || evidenceTypes.includes(evidenceStatuses.socialClaim)) {
    return { ...claim, status: claimStatuses.unverified, evidenceTypes };
  }

  return { ...claim, status: claimStatuses.unknown, evidenceTypes };
}

export function verifyTechnologyClaims(claims = []) {
  return claims.map(verifyTechnologyClaim);
}

