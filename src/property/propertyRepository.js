export const propertyReadScopes = {
  public: "PUBLIC",
  authenticated: "AUTHENTICATED",
  verifiedBuyer: "VERIFIED_BUYER",
  owner: "OWNER",
  transactionParties: "TRANSACTION_PARTIES",
  partner: "PARTNER",
  essaComplianceAdmin: "ESSA_COMPLIANCE_ADMIN"
};

export const propertyRepositoryContract = {
  contractId: "ESSA_PROPERTY_REPOSITORY_READ_CONTRACT",
  version: "1.0.0",
  readOnly: true,
  operations: [
    "getPropertyById",
    "listProperties",
    "getListingsForProperty",
    "getFactsForProperty",
    "getSourcesForProperty",
    "getLifecycleEvents",
    "getHierarchyForProperty",
    "getPropertyEvidence"
  ],
  prohibitedOperations: [
    "createProperty",
    "updateProperty",
    "deleteProperty",
    "mutateListing",
    "verifyOwnership",
    "bookProperty",
    "payForProperty",
    "startTransaction"
  ],
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0
};

export function clonePropertyReadValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function createPropertyNotFound(propertyId = null) {
  return {
    ok: false,
    status: "NOT_FOUND",
    propertyId,
    property: null,
    reason: "PROPERTY_NOT_FOUND",
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function matchesPropertyFilters(property = {}, filters = {}) {
  if (filters.propertyId && property.propertyId !== filters.propertyId) return false;
  if (filters.country && property.country !== filters.country) return false;
  if (filters.city && property.city !== filters.city) return false;
  if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
  if (filters.currentStatus && property.currentStatus !== filters.currentStatus) return false;
  if (filters.projectId && property.projectId !== filters.projectId) return false;
  if (filters.buildingId && property.buildingId !== filters.buildingId) return false;
  return true;
}
