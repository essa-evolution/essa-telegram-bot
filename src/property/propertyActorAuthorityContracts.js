import {
  propertyFreshnessStatuses,
  propertyVerificationStatuses
} from "./propertyContracts.js";

export const propertyActorTypes = {
  person: "PERSON",
  organizationActorReference: "ORGANIZATION_ACTOR_REFERENCE",
  systemInternal: "SYSTEM_INTERNAL"
};

export const propertyActorIdentityStatuses = {
  declared: "DECLARED",
  evidencePending: "EVIDENCE_PENDING",
  reviewPending: "REVIEW_PENDING",
  verifiedLocalProof: "VERIFIED_LOCAL_PROOF",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
  requiresReverification: "REQUIRES_REVERIFICATION"
};

export const propertyOrganizationTypes = {
  developer: "DEVELOPER",
  realEstateAgency: "REAL_ESTATE_AGENCY",
  propertyManagementCompany: "PROPERTY_MANAGEMENT_COMPANY",
  serviceProvider: "SERVICE_PROVIDER",
  financialPartner: "FINANCIAL_PARTNER",
  legalPartner: "LEGAL_PARTNER",
  otherBusiness: "OTHER_BUSINESS"
};

export const propertyOrganizationStatuses = {
  declared: "DECLARED",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  reviewPending: "REVIEW_PENDING",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
  requiresReverification: "REQUIRES_REVERIFICATION"
};

export const businessEntityBridgeStatuses = {
  proposed: "PROPOSED",
  linkedLocalProof: "LINKED_LOCAL_PROOF",
  reviewRequired: "REVIEW_REQUIRED",
  rejected: "REJECTED"
};

export const propertyMembershipRoles = {
  ownerDirector: "OWNER_DIRECTOR",
  director: "DIRECTOR",
  employee: "EMPLOYEE",
  salesManager: "SALES_MANAGER",
  agent: "AGENT",
  propertyManager: "PROPERTY_MANAGER",
  authorizedRepresentative: "AUTHORIZED_REPRESENTATIVE",
  member: "MEMBER"
};

export const propertyMembershipStatuses = {
  declared: "DECLARED",
  pendingEvidence: "PENDING_EVIDENCE",
  pendingReview: "PENDING_REVIEW",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  expired: "EXPIRED",
  revoked: "REVOKED",
  suspended: "SUSPENDED",
  rejected: "REJECTED",
  superseded: "SUPERSEDED",
  requiresReverification: "REQUIRES_REVERIFICATION"
};

export const propertyActorCapabilities = {
  submitPropertyData: "SUBMIT_PROPERTY_DATA",
  submitDeveloperProject: "SUBMIT_DEVELOPER_PROJECT",
  submitAgencyListing: "SUBMIT_AGENCY_LISTING",
  submitManagementRelationship: "SUBMIT_MANAGEMENT_RELATIONSHIP",
  requestPropertyReview: "REQUEST_PROPERTY_REVIEW",
  viewPrivatePropertyWorkflow: "VIEW_PRIVATE_PROPERTY_WORKFLOW",
  submitAuthorityEvidence: "SUBMIT_AUTHORITY_EVIDENCE"
};

export const propertyCapabilityGrantStatuses = {
  declared: "DECLARED",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  expired: "EXPIRED",
  revoked: "REVOKED",
  suspended: "SUSPENDED",
  rejected: "REJECTED",
  requiresReverification: "REQUIRES_REVERIFICATION"
};

export const propertyRelationshipTypes = {
  owner: "OWNER",
  coOwner: "CO_OWNER",
  seller: "SELLER",
  landlord: "LANDLORD",
  host: "HOST",
  developer: "DEVELOPER",
  developerRepresentative: "DEVELOPER_REPRESENTATIVE",
  agent: "AGENT",
  agencyRepresentative: "AGENCY_REPRESENTATIVE",
  propertyManager: "PROPERTY_MANAGER",
  authorizedRepresentative: "AUTHORIZED_REPRESENTATIVE",
  buyer: "BUYER",
  tenant: "TENANT",
  investor: "INVESTOR",
  guest: "GUEST"
};

export const propertyRelationshipStatuses = {
  claimed: "CLAIMED",
  evidencePending: "EVIDENCE_PENDING",
  reviewPending: "REVIEW_PENDING",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  rejected: "REJECTED",
  expired: "EXPIRED",
  revoked: "REVOKED",
  suspended: "SUSPENDED",
  requiresReverification: "REQUIRES_REVERIFICATION"
};

export const propertyAuthorityTypes = {
  ownerSelfAuthority: "OWNER_SELF_AUTHORITY",
  coOwnerAuthority: "CO_OWNER_AUTHORITY",
  developerOrganizationAuthority: "DEVELOPER_ORGANIZATION_AUTHORITY",
  developerRepresentativeAuthority: "DEVELOPER_REPRESENTATIVE_AUTHORITY",
  agencyMandate: "AGENCY_MANDATE",
  agentMandate: "AGENT_MANDATE",
  propertyManagementAuthority: "PROPERTY_MANAGEMENT_AUTHORITY",
  powerOfAttorney: "POWER_OF_ATTORNEY",
  listingAuthority: "LISTING_AUTHORITY",
  rentalAuthority: "RENTAL_AUTHORITY",
  stayManagementAuthority: "STAY_MANAGEMENT_AUTHORITY",
  marketingAuthority: "MARKETING_AUTHORITY",
  serviceAccessAuthority: "SERVICE_ACCESS_AUTHORITY",
  otherStructuredAuthority: "OTHER_STRUCTURED_AUTHORITY"
};

export const propertyAuthorityActions = {
  addProperty: "ADD_PROPERTY",
  claimExistingProperty: "CLAIM_EXISTING_PROPERTY",
  submitPropertyEvidence: "SUBMIT_PROPERTY_EVIDENCE",
  createSaleListing: "CREATE_SALE_LISTING",
  createLongTermRentListing: "CREATE_LONG_TERM_RENT_LISTING",
  createStayListing: "CREATE_STAY_LISTING",
  editListing: "EDIT_LISTING",
  updatePrice: "UPDATE_PRICE",
  updateAvailability: "UPDATE_AVAILABILITY",
  promoteProperty: "PROMOTE_PROPERTY",
  manageProperty: "MANAGE_PROPERTY",
  requestCleaning: "REQUEST_CLEANING",
  requestMaintenance: "REQUEST_MAINTENANCE",
  communicateWithGuest: "COMMUNICATE_WITH_GUEST",
  communicateWithTenant: "COMMUNICATE_WITH_TENANT",
  startSaleWorkflow: "START_SALE_WORKFLOW"
};

export const propertyAuthorityScopeDimensions = {
  property: "PROPERTY",
  propertyCandidate: "PROPERTY_CANDIDATE",
  project: "PROJECT",
  building: "BUILDING",
  unitSet: "UNIT_SET",
  inventory: "INVENTORY",
  listing: "LISTING",
  organization: "ORGANIZATION",
  dealTransactionFuture: "DEAL_TRANSACTION_FUTURE",
  rent: "RENT",
  stay: "STAY",
  serviceOrder: "SERVICE_ORDER",
  action: "ACTION",
  time: "TIME",
  jurisdiction: "JURISDICTION"
};

export const propertyAuthorityStatuses = {
  requested: "REQUESTED",
  pendingEvidence: "PENDING_EVIDENCE",
  pendingReview: "PENDING_REVIEW",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  limited: "LIMITED",
  expired: "EXPIRED",
  revoked: "REVOKED",
  suspended: "SUSPENDED",
  superseded: "SUPERSEDED",
  rejected: "REJECTED",
  requiresReverification: "REQUIRES_REVERIFICATION",
  jurisdictionBlocked: "JURISDICTION_BLOCKED"
};

export const propertyAuthorityEvidenceTypes = {
  ownershipDocument: "OWNERSHIP_DOCUMENT",
  organizationRegistration: "ORGANIZATION_REGISTRATION",
  organizationMembershipEvidence: "ORGANIZATION_MEMBERSHIP_EVIDENCE",
  agencyAgreement: "AGENCY_AGREEMENT",
  exclusiveMandate: "EXCLUSIVE_MANDATE",
  nonExclusiveMandate: "NON_EXCLUSIVE_MANDATE",
  powerOfAttorney: "POWER_OF_ATTORNEY",
  propertyManagementAgreement: "PROPERTY_MANAGEMENT_AGREEMENT",
  developerEmploymentAuthorization: "DEVELOPER_EMPLOYMENT_AUTHORIZATION",
  companySignatoryAuthorization: "COMPANY_SIGNATORY_AUTHORIZATION",
  listingAuthorization: "LISTING_AUTHORIZATION",
  otherStructuredDocument: "OTHER_STRUCTURED_DOCUMENT"
};

export const jurisdictionAuthorityRuleStatuses = {
  localDemo: "LOCAL_DEMO",
  unknown: "UNKNOWN",
  requiresProfessionalReview: "REQUIRES_PROFESSIONAL_REVIEW",
  blocked: "BLOCKED"
};

export const addPropertyWorkflowStatuses = {
  notStarted: "NOT_STARTED",
  actorRequired: "ACTOR_REQUIRED",
  organizationRequired: "ORGANIZATION_REQUIRED",
  membershipRequired: "MEMBERSHIP_REQUIRED",
  relationshipRequired: "RELATIONSHIP_REQUIRED",
  authorityRequired: "AUTHORITY_REQUIRED",
  evidenceRequired: "EVIDENCE_REQUIRED",
  authorityReviewRequired: "AUTHORITY_REVIEW_REQUIRED",
  propertyIdentificationRequired: "PROPERTY_IDENTIFICATION_REQUIRED",
  intentReady: "INTENT_READY",
  readyForLocalReview: "READY_FOR_LOCAL_REVIEW",
  blocked: "BLOCKED",
  completedLocalContractProof: "COMPLETED_LOCAL_CONTRACT_PROOF"
};

export const addPropertyEligibilityStatuses = {
  readyForLocalReview: "READY_FOR_LOCAL_REVIEW",
  blockedActor: "BLOCKED_ACTOR",
  blockedOrganization: "BLOCKED_ORGANIZATION",
  blockedMembership: "BLOCKED_MEMBERSHIP",
  blockedCapability: "BLOCKED_CAPABILITY",
  blockedRelationship: "BLOCKED_RELATIONSHIP",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedScope: "BLOCKED_SCOPE",
  blockedEvidence: "BLOCKED_EVIDENCE",
  blockedExpired: "BLOCKED_EXPIRED",
  blockedRevoked: "BLOCKED_REVOKED",
  blockedJurisdiction: "BLOCKED_JURISDICTION",
  blockedReviewRequired: "BLOCKED_REVIEW_REQUIRED",
  invalidIntent: "INVALID_INTENT"
};

export const addPropertyWorkflowStages = [
  "IDENTIFY_ACTOR",
  "RESOLVE_ORGANIZATION",
  "RESOLVE_MEMBERSHIP",
  "CLAIM_PROPERTY_RELATIONSHIP",
  "COLLECT_AUTHORITY_EVIDENCE",
  "VALIDATE_AUTHORITY",
  "IDENTIFY_EXISTING_PROPERTY_OR_CANDIDATE",
  "CREATE_ADD_PROPERTY_INTENT",
  "VALIDATE_INTENT",
  "ROUTE_TO_REVIEW",
  "REVIEW_DECISION_FUTURE_EXISTING_BRIDGE",
  "CONTROLLED_EXECUTION_FUTURE"
];

export const propertyAuthorityAuditEvents = {
  actorDeclared: "ACTOR_DECLARED",
  organizationLinked: "ORGANIZATION_LINKED",
  membershipDeclared: "MEMBERSHIP_DECLARED",
  membershipEvidenceAttached: "MEMBERSHIP_EVIDENCE_ATTACHED",
  propertyRelationshipClaimed: "PROPERTY_RELATIONSHIP_CLAIMED",
  authorityRequested: "AUTHORITY_REQUESTED",
  authorityEvidenceAttached: "AUTHORITY_EVIDENCE_ATTACHED",
  authorityReviewRequired: "AUTHORITY_REVIEW_REQUIRED",
  authorityActivatedLocalProof: "AUTHORITY_ACTIVATED_LOCAL_PROOF",
  authorityLimited: "AUTHORITY_LIMITED",
  authorityRevoked: "AUTHORITY_REVOKED",
  authorityExpired: "AUTHORITY_EXPIRED",
  addPropertyIntentCreated: "ADD_PROPERTY_INTENT_CREATED",
  addPropertyIntentBlocked: "ADD_PROPERTY_INTENT_BLOCKED",
  addPropertyIntentReadyForLocalReview: "ADD_PROPERTY_INTENT_READY_FOR_LOCAL_REVIEW"
};

export const propertyAuthoritySideEffectCounters = {
  canonicalPropertyMutation: 0,
  listingMutation: 0,
  ownershipMutation: 0,
  quarantineMutation: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
};

export const actorIdentityContract = {
  modelType: "ActorIdentity",
  actorId: null,
  actorType: propertyActorTypes.person,
  displayName: "",
  accountRef: null,
  identityStatus: propertyActorIdentityStatuses.declared,
  identityEvidenceRefs: [],
  createdAt: null,
  updatedAt: null,
  sourceRefs: [],
  auditMetadata: {}
};

export const organizationContract = {
  modelType: "Organization",
  organizationId: null,
  organizationType: null,
  displayName: "",
  legalName: null,
  jurisdiction: "UNKNOWN",
  country: "",
  businessEntityBridgeId: null,
  organizationStatus: propertyOrganizationStatuses.declared,
  verificationStatus: propertyVerificationStatuses.unverified,
  sourceRefs: [],
  evidenceRefs: [],
  createdAt: null,
  updatedAt: null,
  auditMetadata: {}
};

export const businessEntityOrganizationBridgeContract = {
  modelType: "BusinessEntityOrganizationBridge",
  businessEntityId: null,
  organizationId: null,
  bridgeStatus: businessEntityBridgeStatuses.proposed,
  evidenceRefs: [],
  sourceRefs: [],
  createdAt: null,
  updatedAt: null,
  auditMetadata: {}
};

export const organizationMembershipContract = {
  modelType: "OrganizationMembership",
  membershipId: null,
  actorId: null,
  organizationId: null,
  membershipRole: propertyMembershipRoles.member,
  membershipStatus: propertyMembershipStatuses.declared,
  capabilityRefs: [],
  authorityEvidenceRefs: [],
  validFrom: null,
  validUntil: null,
  createdAt: null,
  updatedAt: null,
  auditMetadata: {}
};

export const actorCapabilityGrantContract = {
  modelType: "ActorCapabilityGrant",
  capabilityGrantId: null,
  actorId: null,
  organizationId: null,
  capability: null,
  scope: {},
  status: propertyCapabilityGrantStatuses.declared,
  validFrom: null,
  validUntil: null,
  evidenceRefs: [],
  auditMetadata: {}
};

export const propertyRelationshipContract = {
  modelType: "PropertyRelationship",
  relationshipId: null,
  actorId: null,
  organizationId: null,
  propertyId: null,
  propertyCandidateRef: null,
  relationshipType: null,
  relationshipStatus: propertyRelationshipStatuses.claimed,
  sourceRefs: [],
  evidenceRefs: [],
  validFrom: null,
  validUntil: null,
  createdAt: null,
  updatedAt: null,
  auditMetadata: {}
};

export const authorityGrantContract = {
  modelType: "AuthorityGrant",
  authorityGrantId: null,
  actorId: null,
  organizationId: null,
  relationshipId: null,
  propertyId: null,
  propertyCandidateRef: null,
  authorityType: null,
  allowedActions: [],
  deniedActions: [],
  scope: {},
  jurisdiction: "UNKNOWN",
  status: propertyAuthorityStatuses.requested,
  validFrom: null,
  validUntil: null,
  evidenceRefs: [],
  documentLinks: [],
  grantedByActorRef: null,
  supersedesAuthorityGrantId: null,
  createdAt: null,
  updatedAt: null,
  auditMetadata: {}
};

export const authorityEvidenceContract = {
  modelType: "AuthorityEvidence",
  authorityEvidenceId: null,
  evidenceType: null,
  actorId: null,
  organizationId: null,
  propertyId: null,
  propertyCandidateRef: null,
  authorityGrantId: null,
  documentRef: null,
  evidenceRef: null,
  sourceRefs: [],
  declaredAt: null,
  validFrom: null,
  validUntil: null,
  verificationStatus: propertyVerificationStatuses.unverified,
  freshnessStatus: propertyFreshnessStatuses.unknown,
  jurisdiction: "UNKNOWN",
  limitations: [],
  auditMetadata: {}
};

export const jurisdictionAuthorityContextContract = {
  modelType: "JurisdictionAuthorityContext",
  jurisdiction: "UNKNOWN",
  authorityType: null,
  ruleStatus: jurisdictionAuthorityRuleStatuses.unknown,
  requiredEvidenceTypes: [],
  professionalReviewRequired: true,
  limitations: [],
  sourceRefs: [],
  verifiedAt: null
};

export const addPropertyIntentContract = {
  modelType: "AddPropertyIntent",
  addPropertyIntentId: null,
  actorId: null,
  organizationId: null,
  relationshipClaimId: null,
  authorityGrantId: null,
  propertyId: null,
  propertyCandidateRef: null,
  propertyType: null,
  intendedAction: null,
  listingIntent: null,
  sourceType: null,
  evidenceRefs: [],
  workflowStatus: addPropertyWorkflowStatuses.notStarted,
  validationStatus: addPropertyEligibilityStatuses.invalidIntent,
  missingRequirements: [],
  blockedReasons: [],
  createdAt: null,
  updatedAt: null,
  auditMetadata: {}
};
