import {
  propertyConfidenceClasses,
  propertyFreshnessStatuses
} from "./propertyContracts.js";

export const propertySourceTypes = {
  ownerSubmission: "OWNER_SUBMISSION",
  developerFeed: "DEVELOPER_FEED",
  agencyFeed: "AGENCY_FEED",
  partnerFeed: "PARTNER_FEED",
  propertyPortal: "PROPERTY_PORTAL",
  governmentRegistry: "GOVERNMENT_REGISTRY",
  manualAdminEntry: "MANUAL_ADMIN_ENTRY",
  futureProvider: "FUTURE_PROVIDER",
  localFixture: "LOCAL_FIXTURE"
};

export const propertyIngestionValidationStatuses = {
  accepted: "ACCEPTED",
  acceptedWithGaps: "ACCEPTED_WITH_GAPS",
  quarantined: "QUARANTINED",
  rejected: "REJECTED"
};

export const propertyIngestionMatchOutcomes = {
  exactMatch: "EXACT_MATCH",
  probableMatchReviewRequired: "PROBABLE_MATCH_REVIEW_REQUIRED",
  noMatchNewPropertyCandidate: "NO_MATCH_NEW_PROPERTY_CANDIDATE",
  conflictReviewRequired: "CONFLICT_REVIEW_REQUIRED"
};

export const propertyIngestionListingStatuses = {
  active: "ACTIVE",
  unavailable: "UNAVAILABLE",
  closed: "CLOSED",
  stale: "STALE",
  sourceRemoved: "SOURCE_REMOVED"
};

export const propertySourceRecordContract = {
  modelType: "PropertySourceRecord",
  readOnlyImport: true,
  sourceType: null,
  sourceName: "",
  sourceRecordId: null,
  sourceUrl: null,
  observedAt: null,
  fetchedAt: null,
  rawPayload: {},
  declaredPropertyType: "UNKNOWN",
  location: {},
  listing: {},
  price: null,
  currency: null,
  mediaRefs: [],
  sourceConfidence: propertyConfidenceClasses.unknown,
  providerMetadata: {},
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0
};

export const normalizedPropertyCandidateContract = {
  modelType: "NormalizedPropertyCandidate",
  candidateId: null,
  sourceRecordId: null,
  normalizedLocation: {},
  propertyType: "UNKNOWN",
  hierarchyHints: {},
  listingObservation: {},
  normalizedFacts: [],
  sourceRefs: [],
  evidenceGaps: [],
  normalizationWarnings: [],
  duplicateMatchHints: [],
  confidence: propertyConfidenceClasses.unknown,
  freshnessStatus: propertyFreshnessStatuses.unknown
};

export const propertyIngestionAuditContract = {
  modelType: "PropertyIngestionAudit",
  ingestionId: null,
  sourceRecordId: null,
  validationResult: null,
  normalizationResult: null,
  duplicateResolution: null,
  canonicalPropertyId: null,
  listingSnapshotId: null,
  warnings: [],
  conflicts: [],
  gaps: [],
  timestamp: null,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0,
  bookingActions: 0,
  transactionActions: 0
};

export function clonePropertyIngestionValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createPropertySourceRecord(input = {}) {
  return {
    ...propertySourceRecordContract,
    ...input,
    rawPayload: { ...(input.rawPayload || {}) },
    location: { ...(input.location || {}) },
    listing: { ...(input.listing || {}) },
    mediaRefs: [...(Array.isArray(input.mediaRefs) ? input.mediaRefs : [])],
    providerMetadata: { ...(input.providerMetadata || {}) },
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function createNormalizedPropertyCandidate(input = {}) {
  return {
    ...normalizedPropertyCandidateContract,
    ...input,
    normalizedLocation: { ...(input.normalizedLocation || {}) },
    hierarchyHints: { ...(input.hierarchyHints || {}) },
    listingObservation: { ...(input.listingObservation || {}) },
    normalizedFacts: clonePropertyIngestionValue(input.normalizedFacts || []),
    sourceRefs: clonePropertyIngestionValue(input.sourceRefs || []),
    evidenceGaps: [...(input.evidenceGaps || [])],
    normalizationWarnings: [...(input.normalizationWarnings || [])],
    duplicateMatchHints: [...(input.duplicateMatchHints || [])]
  };
}

export function createPropertyIngestionAudit(input = {}) {
  return {
    ...propertyIngestionAuditContract,
    ...input,
    validationResult: clonePropertyIngestionValue(input.validationResult),
    normalizationResult: clonePropertyIngestionValue(input.normalizationResult),
    duplicateResolution: clonePropertyIngestionValue(input.duplicateResolution),
    warnings: [...(input.warnings || [])],
    conflicts: [...(input.conflicts || [])],
    gaps: [...(input.gaps || [])],
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}
