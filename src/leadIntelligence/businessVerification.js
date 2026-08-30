import {
  businessVerificationStatuses,
  leadConfidenceClasses,
  leadFreshnessStates
} from "./leadContracts.js";

export function verifyBusinessEntity(entity = {}) {
  const existsEvidence = [
    entity.legalOrDisplayName ? "public_name_present" : null,
    entity.directoryProfiles?.length ? "directory_profile_present" : null,
    entity.website ? "website_present" : null
  ].filter(Boolean);
  const websiteEvidence = entity.website ? ["normalized_domain_present"] : [];
  const locationEvidence = entity.city || entity.country ? ["public_location_present"] : [];
  const activityEvidence = entity.socialProfiles?.length ? ["public_social_profile_present"] : [];
  const sourceCount = entity.sourceRefs?.length || 0;
  const staleSignals = entity.dataFreshness === leadFreshnessStates.stale ? ["stale_business_data"] : [];
  const verified = existsEvidence.length >= 2 && sourceCount >= 1 && staleSignals.length === 0;

  return {
    businessId: entity.businessId,
    existsEvidence,
    websiteEvidence,
    locationEvidence,
    activityEvidence,
    sourceCount,
    verificationStatus: verified
      ? businessVerificationStatuses.verified
      : staleSignals.length
      ? businessVerificationStatuses.staleReviewRequired
      : businessVerificationStatuses.insufficientEvidence,
    staleSignals,
    confidenceClass: verified ? leadConfidenceClasses.high : sourceCount ? leadConfidenceClasses.medium : leadConfidenceClasses.low,
    reviewRequired: !verified
  };
}
