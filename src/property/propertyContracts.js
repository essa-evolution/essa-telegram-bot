export const propertyFreshnessStatuses = {
  current: "CURRENT",
  aging: "AGING",
  stale: "STALE",
  unknown: "UNKNOWN"
};

export const propertyConfidenceClasses = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  unknown: "UNKNOWN"
};

export const propertyVerificationStatuses = {
  verified: "VERIFIED",
  partiallyVerified: "PARTIALLY_VERIFIED",
  unverified: "UNVERIFIED",
  insufficientEvidence: "INSUFFICIENT_EVIDENCE",
  staleReviewRequired: "STALE_REVIEW_REQUIRED",
  professionalReviewRequired: "PROFESSIONAL_REVIEW_REQUIRED"
};

export const propertyFactStatuses = {
  fact: "FACT",
  inferred: "INFERRED",
  unverified: "UNVERIFIED",
  stale: "STALE"
};

export const propertyLifecycleEventTypes = {
  propertyCreated: "PROPERTY_CREATED",
  propertyUpdated: "PROPERTY_UPDATED",
  propertyVerified: "PROPERTY_VERIFIED",
  listingObserved: "LISTING_OBSERVED",
  listedForSale: "LISTED_FOR_SALE",
  listedForRent: "LISTED_FOR_RENT",
  priceChanged: "PRICE_CHANGED",
  statusChanged: "STATUS_CHANGED",
  documentAdded: "DOCUMENT_ADDED",
  documentVerified: "DOCUMENT_VERIFIED",
  reserved: "RESERVED",
  transactionOpened: "TRANSACTION_OPENED",
  contractSigned: "CONTRACT_SIGNED",
  ownershipTransferred: "OWNERSHIP_TRANSFERRED",
  bookingCompleted: "BOOKING_COMPLETED",
  managementStarted: "MANAGEMENT_STARTED",
  renovated: "RENOVATED",
  listedForResale: "LISTED_FOR_RESALE"
};

export const propertyContract = {
  propertyId: null,
  propertyType: null,
  country: "",
  region: "",
  city: "",
  address: "",
  geo: null,
  projectId: null,
  buildingId: null,
  unitId: null,
  currentStatus: "UNKNOWN",
  sourceRefs: [],
  facts: [],
  createdAt: null,
  updatedAt: null,
  freshness: propertyFreshnessStatuses.unknown,
  confidence: propertyConfidenceClasses.unknown
};

export const propertyIdContract = {
  propertyId: null,
  externalSourceRefs: [],
  sourceEntityIds: [],
  canonicalIdentityReady: false,
  deterministicDuplicateMatchingReady: false,
  providerIndependent: true
};

export const propertySourceRefContract = {
  sourceType: null,
  sourceName: "",
  sourceId: null,
  sourceUrl: null,
  observedAt: null,
  fetchedAt: null,
  effectiveAt: null,
  confidence: propertyConfidenceClasses.unknown,
  freshnessStatus: propertyFreshnessStatuses.unknown,
  verificationStatus: propertyVerificationStatuses.unverified
};

export const propertyFactContract = {
  factType: null,
  value: null,
  sourceRef: null,
  confidence: propertyConfidenceClasses.unknown,
  observedAt: null,
  freshnessStatus: propertyFreshnessStatuses.unknown,
  factStatus: propertyFactStatuses.unverified
};

export const propertyListingSnapshotContract = {
  listingId: null,
  propertyId: null,
  sourceRef: null,
  listingType: null,
  price: null,
  currency: null,
  availability: null,
  listingStatus: "UNKNOWN",
  observedAt: null,
  staleAfter: null,
  freshnessStatus: propertyFreshnessStatuses.unknown
};

export const propertyPassportContract = {
  propertyId: null,
  currentSummary: "",
  verifiedFacts: [],
  unverifiedFacts: [],
  inferredFacts: [],
  sourceRefs: [],
  freshness: propertyFreshnessStatuses.unknown,
  confidence: propertyConfidenceClasses.unknown,
  riskFlags: [],
  documentChecklist: [],
  verificationStatus: propertyVerificationStatuses.unverified,
  publicView: {},
  protectedViewMetadata: {},
  generatedAt: null
};

export const propertyLifecycleEventContract = {
  eventId: null,
  propertyId: null,
  eventType: null,
  sourceRef: null,
  payload: {},
  observedAt: null,
  createdAt: null,
  appendOnly: true
};

export const propertyAuditArtifactContract = {
  auditId: null,
  propertyId: null,
  operation: null,
  inputs: {},
  outputs: {},
  sourceRefs: [],
  warnings: [],
  gaps: [],
  confidence: propertyConfidenceClasses.unknown,
  createdAt: null,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0
};

export const developerContract = {
  developerId: null,
  displayName: "",
  country: "",
  region: "",
  city: "",
  businessBridgeId: null,
  sourceRefs: [],
  verificationStatus: propertyVerificationStatuses.unverified
};

export const projectContract = {
  projectId: null,
  developerId: null,
  name: "",
  country: "",
  region: "",
  city: "",
  address: "",
  currentStatus: "UNKNOWN",
  sourceRefs: []
};

export const buildingContract = {
  buildingId: null,
  projectId: null,
  name: "",
  address: "",
  floorCount: null,
  currentStatus: "UNKNOWN",
  sourceRefs: []
};

export const floorContract = {
  floorId: null,
  buildingId: null,
  floorNumber: null,
  sourceRefs: []
};

export const unitContract = {
  unitId: null,
  buildingId: null,
  floorId: null,
  unitNumber: "",
  propertyId: null,
  bedrooms: null,
  bathrooms: null,
  areaSqm: null,
  sourceRefs: []
};

export const landParcelContract = {
  landParcelId: null,
  projectId: null,
  cadastralId: null,
  country: "",
  region: "",
  city: "",
  areaSqm: null,
  sourceRefs: []
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createProperty(input = {}) {
  return {
    ...propertyContract,
    ...input,
    sourceRefs: safeArray(input.sourceRefs).map(clone),
    facts: safeArray(input.facts).map(clone)
  };
}

export function createPropertyId(input = {}) {
  return {
    ...propertyIdContract,
    ...input,
    externalSourceRefs: safeArray(input.externalSourceRefs).map(clone),
    sourceEntityIds: [...safeArray(input.sourceEntityIds)],
    providerIndependent: true
  };
}

export function createPropertySourceRef(input = {}) {
  return { ...propertySourceRefContract, ...input };
}

export function createPropertyFact(input = {}) {
  return { ...propertyFactContract, ...input };
}

export function createPropertyListingSnapshot(input = {}) {
  return { ...propertyListingSnapshotContract, ...input };
}

export function createPropertyLifecycleEvent(input = {}) {
  return {
    ...propertyLifecycleEventContract,
    ...input,
    payload: { ...(input.payload || {}) },
    appendOnly: true
  };
}

export function createPropertyPassport(input = {}) {
  return {
    ...propertyPassportContract,
    ...input,
    verifiedFacts: safeArray(input.verifiedFacts).map(clone),
    unverifiedFacts: safeArray(input.unverifiedFacts).map(clone),
    inferredFacts: safeArray(input.inferredFacts).map(clone),
    sourceRefs: safeArray(input.sourceRefs).map(clone),
    riskFlags: [...safeArray(input.riskFlags)],
    documentChecklist: safeArray(input.documentChecklist).map(clone),
    publicView: { ...(input.publicView || {}) },
    protectedViewMetadata: { ...(input.protectedViewMetadata || {}) }
  };
}

export function createPropertyAuditArtifact(input = {}) {
  return {
    ...propertyAuditArtifactContract,
    ...input,
    inputs: { ...(input.inputs || {}) },
    outputs: { ...(input.outputs || {}) },
    sourceRefs: safeArray(input.sourceRefs).map(clone),
    warnings: [...safeArray(input.warnings)],
    gaps: [...safeArray(input.gaps)],
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function createDeveloper(input = {}) {
  return { ...developerContract, ...input, sourceRefs: safeArray(input.sourceRefs).map(clone) };
}

export function createProject(input = {}) {
  return { ...projectContract, ...input, sourceRefs: safeArray(input.sourceRefs).map(clone) };
}

export function createBuilding(input = {}) {
  return { ...buildingContract, ...input, sourceRefs: safeArray(input.sourceRefs).map(clone) };
}

export function createFloor(input = {}) {
  return { ...floorContract, ...input, sourceRefs: safeArray(input.sourceRefs).map(clone) };
}

export function createUnit(input = {}) {
  return { ...unitContract, ...input, sourceRefs: safeArray(input.sourceRefs).map(clone) };
}

export function createLandParcel(input = {}) {
  return { ...landParcelContract, ...input, sourceRefs: safeArray(input.sourceRefs).map(clone) };
}

export function validatePropertyContract(property = {}) {
  const missing = [
    "propertyId",
    "propertyType",
    "country",
    "city",
    "currentStatus",
    "freshness",
    "confidence"
  ].filter((field) => property[field] == null || property[field] === "");

  const listingFieldsOnProperty = ["listingId", "listingType", "price", "currency", "availability", "listingStatus"]
    .filter((field) => Object.prototype.hasOwnProperty.call(property, field));

  return {
    valid: missing.length === 0 && listingFieldsOnProperty.length === 0,
    missing,
    listingFieldsOnProperty,
    propertyId: property.propertyId || null
  };
}

export function validateLifecycleAppendOnly(events = []) {
  return safeArray(events).every((event) =>
    event.appendOnly === true &&
    Object.values(propertyLifecycleEventTypes).includes(event.eventType)
  );
}
