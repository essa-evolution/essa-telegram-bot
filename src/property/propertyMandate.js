import {
  createAuthorityGrant,
  createPropertyAuthorityAuditEvent
} from "./propertyActorAuthority.js";
import {
  propertyAuthorityActions,
  propertyAuthorityAuditEvents,
  propertyAuthorityEvidenceTypes,
  propertyAuthorityStatuses,
  propertyAuthorityTypes,
  propertyRelationshipTypes
} from "./propertyActorAuthorityContracts.js";
import { buildPropertyActorAuthorityFixtureSet } from "./propertyActorAuthorityFixtures.js";

const now = "2026-08-22T00:00:00.000Z";
const future = "2027-08-22T00:00:00.000Z";
const past = "2026-01-01T00:00:00.000Z";

export const propertyMandateTypes = {
  ownerToAgentListingMandate: "OWNER_TO_AGENT_LISTING_MANDATE",
  ownerToAgencyMandate: "OWNER_TO_AGENCY_MANDATE",
  ownerToPropertyManager: "OWNER_TO_PROPERTY_MANAGER",
  ownerToAuthorizedRepresentative: "OWNER_TO_AUTHORIZED_REPRESENTATIVE",
  developerToRepresentative: "DEVELOPER_TO_REPRESENTATIVE",
  organizationSignatoryAuthority: "ORGANIZATION_SIGNATORY_AUTHORITY",
  listingAuthorization: "LISTING_AUTHORIZATION",
  rentalAuthorization: "RENTAL_AUTHORIZATION",
  stayManagementAuthorization: "STAY_MANAGEMENT_AUTHORIZATION",
  marketingAuthorization: "MARKETING_AUTHORIZATION",
  temporaryServiceAccessAuthorization: "TEMPORARY_SERVICE_ACCESS_AUTHORIZATION",
  otherStructuredAuthority: "OTHER_STRUCTURED_AUTHORITY"
};

export const propertyMandateRequestStatuses = {
  draft: "DRAFT",
  requested: "REQUESTED",
  waitingForGrantor: "WAITING_FOR_GRANTOR",
  waitingForEvidence: "WAITING_FOR_EVIDENCE",
  readyForReview: "READY_FOR_REVIEW",
  reviewRequired: "REVIEW_REQUIRED",
  readyForFutureSignature: "READY_FOR_FUTURE_SIGNATURE",
  signatureNotActive: "SIGNATURE_NOT_ACTIVE",
  legalReviewRequired: "LEGAL_REVIEW_REQUIRED",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED",
  cancelled: "CANCELLED",
  expired: "EXPIRED",
  revoked: "REVOKED",
  superseded: "SUPERSEDED"
};

export const propertyMandateReviewStatuses = {
  notReviewed: "NOT_REVIEWED",
  reviewRequired: "REVIEW_REQUIRED",
  readyForReview: "READY_FOR_REVIEW"
};

export const propertyMandateSignatureStatuses = {
  notRequiredLocalProof: "NOT_REQUIRED_LOCAL_PROOF",
  signatureRequiredFuture: "SIGNATURE_REQUIRED_FUTURE",
  bothPartiesRequiredFuture: "BOTH_PARTIES_REQUIRED_FUTURE",
  organizationSignatoryRequiredFuture: "ORGANIZATION_SIGNATORY_REQUIRED_FUTURE",
  notaryReviewRequiredFuture: "NOTARY_REVIEW_REQUIRED_FUTURE",
  unknownJurisdiction: "UNKNOWN_JURISDICTION",
  notActive: "NOT_ACTIVE"
};

export const propertyMandateLegalReviewStatuses = {
  notVerified: "NOT_VERIFIED",
  legalReviewRequired: "LEGAL_REVIEW_REQUIRED",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED"
};

export const propertyMandateExclusivityStates = {
  exclusive: "EXCLUSIVE",
  nonExclusive: "NON_EXCLUSIVE",
  notSpecified: "NOT_SPECIFIED"
};

export const propertyMandateEligibilityStatuses = {
  readyForLocalDraft: "READY_FOR_LOCAL_DRAFT",
  grantorRequired: "GRANTOR_REQUIRED",
  granteeRequired: "GRANTEE_REQUIRED",
  propertyRequired: "PROPERTY_REQUIRED",
  grantorAuthorityRequired: "GRANTOR_AUTHORITY_REQUIRED",
  evidenceRequired: "EVIDENCE_REQUIRED",
  invalidScope: "INVALID_SCOPE",
  invalidDateRange: "INVALID_DATE_RANGE",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED",
  legalReviewRequired: "LEGAL_REVIEW_REQUIRED",
  blockedAuthorityEscalation: "BLOCKED_AUTHORITY_ESCALATION",
  blockedDelegation: "BLOCKED_DELEGATION",
  blockedCircularAuthority: "BLOCKED_CIRCULAR_AUTHORITY_BOOTSTRAP",
  expired: "EXPIRED",
  blockedRevoked: "BLOCKED_REVOKED",
  blocked: "BLOCKED"
};

export const propertyMandateAuditEvents = {
  mandateRequestCreated: "MANDATE_REQUEST_CREATED",
  grantorResolved: "GRANTOR_RESOLVED",
  granteeResolved: "GRANTEE_RESOLVED",
  propertyScopeResolved: "PROPERTY_SCOPE_RESOLVED",
  actionScopeDefined: "ACTION_SCOPE_DEFINED",
  evidenceAttached: "EVIDENCE_ATTACHED",
  draftBuilt: "DRAFT_BUILT",
  reviewRequired: "REVIEW_REQUIRED",
  signatureRequiredFuture: "SIGNATURE_REQUIRED_FUTURE",
  mandateSuperseded: "MANDATE_SUPERSEDED",
  revocationRequested: "REVOCATION_REQUESTED",
  mandateExpired: "MANDATE_EXPIRED",
  mandateCancelled: "MANDATE_CANCELLED"
};

export const proposedAuthorityGrantStatuses = {
  proposedFromMandate: "PROPOSED_FROM_MANDATE",
  reviewRequired: "REVIEW_REQUIRED",
  signatureRequired: "SIGNATURE_REQUIRED",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED"
};

export const mandateSideEffectCounters = {
  canonicalPropertyMutation: 0,
  listingMutation: 0,
  ownershipMutation: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
};

export const mandateExtraActions = {
  communicateWithBuyer: "COMMUNICATE_WITH_BUYER",
  receiveOffers: "RECEIVE_OFFERS",
  requestPropertyReview: "REQUEST_PROPERTY_REVIEW",
  transferOwnership: "TRANSFER_OWNERSHIP",
  signFinalSaleContract: "SIGN_FINAL_SALE_CONTRACT",
  changeOwnerBankDetails: "CHANGE_OWNER_BANK_DETAILS",
  createMortgage: "CREATE_MORTGAGE",
  sellOtherProperties: "SELL_OTHER_PROPERTIES",
  viewOperationalReports: "VIEW_OPERATIONAL_REPORTS",
  signSaleContract: "SIGN_SALE_CONTRACT",
  changeOwnerIdentity: "CHANGE_OWNER_IDENTITY",
  submitDeveloperProject: "SUBMIT_DEVELOPER_PROJECT",
  submitUnitInventory: "SUBMIT_UNIT_INVENTORY",
  updateUnitAvailability: "UPDATE_UNIT_AVAILABILITY",
  updateUnitPrice: "UPDATE_UNIT_PRICE",
  provideProjectDocuments: "PROVIDE_PROJECT_DOCUMENTS",
  promoteProject: "PROMOTE_PROJECT",
  serviceAccess: "SERVICE_ACCESS",
  propertyManagement: "PROPERTY_MANAGEMENT",
  sale: "SALE",
  rent: "RENT"
};

export const mandateActionTemplates = {
  [propertyMandateTypes.ownerToAgentListingMandate]: {
    allowedActions: [
      propertyAuthorityActions.createSaleListing,
      propertyAuthorityActions.editListing,
      propertyAuthorityActions.promoteProperty,
      mandateExtraActions.communicateWithBuyer,
      mandateExtraActions.receiveOffers,
      mandateExtraActions.requestPropertyReview
    ],
    deniedActions: [
      mandateExtraActions.transferOwnership,
      mandateExtraActions.signFinalSaleContract,
      mandateExtraActions.changeOwnerBankDetails,
      mandateExtraActions.createMortgage,
      mandateExtraActions.sellOtherProperties
    ]
  },
  [propertyMandateTypes.ownerToPropertyManager]: {
    allowedActions: [
      propertyAuthorityActions.manageProperty,
      propertyAuthorityActions.updateAvailability,
      propertyAuthorityActions.updatePrice,
      propertyAuthorityActions.createLongTermRentListing,
      propertyAuthorityActions.createStayListing,
      propertyAuthorityActions.requestCleaning,
      propertyAuthorityActions.requestMaintenance,
      propertyAuthorityActions.communicateWithGuest,
      propertyAuthorityActions.communicateWithTenant,
      mandateExtraActions.viewOperationalReports
    ],
    deniedActions: [
      propertyAuthorityActions.startSaleWorkflow,
      mandateExtraActions.transferOwnership,
      mandateExtraActions.signSaleContract,
      mandateExtraActions.changeOwnerIdentity,
      mandateExtraActions.createMortgage
    ]
  },
  [propertyMandateTypes.developerToRepresentative]: {
    allowedActions: [
      mandateExtraActions.submitDeveloperProject,
      mandateExtraActions.submitUnitInventory,
      mandateExtraActions.updateUnitAvailability,
      mandateExtraActions.updateUnitPrice,
      mandateExtraActions.provideProjectDocuments,
      mandateExtraActions.promoteProject
    ],
    deniedActions: [mandateExtraActions.sellOtherProperties, mandateExtraActions.transferOwnership]
  },
  [propertyMandateTypes.temporaryServiceAccessAuthorization]: {
    allowedActions: [mandateExtraActions.serviceAccess, propertyAuthorityActions.requestCleaning],
    deniedActions: [
      mandateExtraActions.sale,
      mandateExtraActions.rent,
      mandateExtraActions.propertyManagement,
      propertyAuthorityActions.createSaleListing,
      propertyAuthorityActions.createLongTermRentListing,
      propertyAuthorityActions.manageProperty
    ]
  }
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createMandateFingerprint(value = {}) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `mandate_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function audit(eventType, request, extras = {}) {
  return {
    ...createPropertyAuthorityAuditEvent({
      eventType,
      actorId: request.requesterActorId,
      organizationId: request.granteeOrganizationId || request.grantorOrganizationId || null,
      addPropertyIntentId: request.mandateRequestId
    }),
    ...extras,
    ...mandateSideEffectCounters
  };
}

export function createMandateScope(input = {}) {
  return {
    allowedActions: clone(input.allowedActions || []),
    deniedActions: clone(input.deniedActions || []),
    propertyScope: input.propertyScope || input.propertyId || null,
    projectScope: input.projectScope || input.projectId || null,
    buildingScope: input.buildingScope || null,
    unitScope: input.unitScope || null,
    listingScope: input.listingScope || null,
    serviceScope: input.serviceScope || null,
    timeScope: input.timeScope || { validFrom: input.validFrom || null, validUntil: input.validUntil || null },
    jurisdictionScope: input.jurisdictionScope || input.jurisdiction || "UNKNOWN",
    priceLimit: input.priceLimit || null,
    availabilityScope: input.availabilityScope || null,
    communicationScope: clone(input.communicationScope || []),
    delegationAllowed: input.delegationAllowed === true,
    subdelegationAllowed: input.subdelegationAllowed === true,
    revocationPolicy: input.revocationPolicy || "REVOCABLE_BY_GRANTOR_LOCAL_RECORD_ONLY"
  };
}

export function createPropertyMandateRequest(input = {}) {
  const template = mandateActionTemplates[input.requestedMandateType] || { allowedActions: [], deniedActions: [] };
  const requestedActions = clone(input.requestedActions || template.allowedActions);
  const deniedActions = clone(input.deniedActions || template.deniedActions);
  const request = {
    modelType: "PropertyMandateRequest",
    mandateRequestId: input.mandateRequestId || `mandate_request_${String(input.requestedMandateType || "structured").toLowerCase()}`,
    requesterActorId: input.requesterActorId || null,
    grantorActorId: input.grantorActorId || null,
    granteeActorId: input.granteeActorId || null,
    grantorOrganizationId: input.grantorOrganizationId || null,
    granteeOrganizationId: input.granteeOrganizationId || null,
    propertyId: input.propertyId || null,
    propertyCandidateRef: input.propertyCandidateRef || null,
    projectId: input.projectId || null,
    relationshipType: input.relationshipType || null,
    requestedMandateType: input.requestedMandateType || propertyMandateTypes.otherStructuredAuthority,
    requestedActions,
    deniedActions,
    requestedScope: createMandateScope({
      ...(input.requestedScope || {}),
      allowedActions: requestedActions,
      deniedActions,
      propertyId: input.propertyId,
      projectId: input.projectId,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      jurisdiction: input.jurisdiction
    }),
    jurisdiction: input.jurisdiction || "UNKNOWN",
    exclusivity: input.exclusivity || propertyMandateExclusivityStates.notSpecified,
    validFrom: input.validFrom || past,
    validUntil: input.validUntil || future,
    revocable: input.revocable !== false,
    evidenceRefs: clone(input.evidenceRefs || []),
    documentRefs: clone(input.documentRefs || []),
    requestStatus: input.requestStatus || propertyMandateRequestStatuses.draft,
    reviewStatus: input.reviewStatus || propertyMandateReviewStatuses.reviewRequired,
    signatureStatus: input.signatureStatus || propertyMandateSignatureStatuses.signatureRequiredFuture,
    legalReviewStatus: input.legalReviewStatus || propertyMandateLegalReviewStatuses.legalReviewRequired,
    supersedesMandateRequestId: input.supersedesMandateRequestId || null,
    previousVersionRef: input.previousVersionRef || null,
    draftVersion: input.draftVersion || "1.0.0",
    serviceAccess: input.serviceAccess || null,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  };
  return {
    ...request,
    auditMetadata: {
      localOnly: true,
      legalEffectCreated: false,
      activeAuthorityCreated: false,
      audit: [
        audit(propertyMandateAuditEvents.mandateRequestCreated, request),
        audit(propertyMandateAuditEvents.actionScopeDefined, request)
      ],
      ...mandateSideEffectCounters
    },
    ...mandateSideEffectCounters
  };
}

export function createMandateJurisdictionRequirement(input = {}) {
  return {
    modelType: "MandateJurisdictionRequirement",
    jurisdiction: input.jurisdiction || "UNKNOWN",
    mandateType: input.mandateType || propertyMandateTypes.otherStructuredAuthority,
    requirementStatus: input.requirementStatus || "UNKNOWN",
    signatureRequirement: input.signatureRequirement || propertyMandateSignatureStatuses.unknownJurisdiction,
    notarizationRequirement: input.notarizationRequirement || "UNKNOWN_JURISDICTION",
    registrationRequirement: input.registrationRequirement || "UNKNOWN_JURISDICTION",
    professionalReviewRequired: input.professionalReviewRequired !== false,
    requiredEvidenceTypes: clone(input.requiredEvidenceTypes || []),
    sourceRefs: clone(input.sourceRefs || []),
    verifiedAt: input.verifiedAt || null,
    limitations: clone(input.limitations || ["No live jurisdiction law is encoded in Phase 23C."]),
    ...mandateSideEffectCounters
  };
}

export function createPropertyMandateRevocationIntent(input = {}) {
  return {
    modelType: "PropertyMandateRevocationIntent",
    revocationIntentId: input.revocationIntentId || `revocation_${input.mandateRequestId || "mandate"}`,
    mandateRequestId: input.mandateRequestId || null,
    requestedBy: input.requestedBy || null,
    reasonCode: input.reasonCode || "LOCAL_REVOCATION_REQUEST",
    requestedAt: input.requestedAt || now,
    effectiveAt: input.effectiveAt || null,
    status: input.status || "REQUESTED_LOCAL_ONLY",
    auditMetadata: {
      audit: [audit(propertyMandateAuditEvents.revocationRequested, { requesterActorId: input.requestedBy, mandateRequestId: input.mandateRequestId })],
      productionAuthorityRevoked: false,
      ...mandateSideEffectCounters
    },
    ...mandateSideEffectCounters
  };
}

function timeStatus(request) {
  const start = new Date(request.validFrom).getTime();
  const end = new Date(request.validUntil).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return "invalid";
  if (end <= current) return "expired";
  return "valid";
}

function findActor(fixtures, actorId) {
  return fixtures.actors.find((actor) => actor.actorId === actorId) || null;
}

function grantorRelationships(fixtures, request) {
  return fixtures.relationships.filter((relationship) =>
    relationship.actorId === request.grantorActorId &&
    (!request.propertyId || relationship.propertyId === request.propertyId) &&
    (!request.propertyCandidateRef || relationship.propertyCandidateRef === request.propertyCandidateRef)
  );
}

function grantorAuthorities(fixtures, request) {
  const relationships = grantorRelationships(fixtures, request);
  const relationshipIds = new Set(relationships.map((relationship) => relationship.relationshipId));
  return fixtures.authorityGrants.filter((authority) =>
    authority.actorId === request.grantorActorId &&
    relationshipIds.has(authority.relationshipId) &&
    authority.status === propertyAuthorityStatuses.activeLocalProof
  );
}

function allowedByGrantor(fixtures, request) {
  const relationships = grantorRelationships(fixtures, request);
  const isOwner = relationships.some((relationship) => relationship.relationshipType === propertyRelationshipTypes.owner);
  const authorities = grantorAuthorities(fixtures, request);
  const ownedProject = request.grantorOrganizationId && request.requestedMandateType === propertyMandateTypes.developerToRepresentative;
  if (isOwner || ownedProject) return { ok: true, reason: null };
  const granted = new Set(authorities.flatMap((authority) => authority.allowedActions || []));
  const missing = request.requestedActions.filter((action) => !granted.has(action));
  return {
    ok: missing.length === 0 && authorities.length > 0,
    reason: missing.length ? "grantor_cannot_delegate_requested_actions" : "grantor_authority_missing"
  };
}

function scopeValid(request) {
  if (request.requestedMandateType === propertyMandateTypes.developerToRepresentative && request.projectId !== "project_green_tower") {
    return { ok: false, reason: "project_scope_mismatch" };
  }
  if (request.requestedActions.some((action) => request.deniedActions.includes(action))) {
    return { ok: false, reason: "action_allowed_and_denied" };
  }
  if (request.requestedMandateType === propertyMandateTypes.temporaryServiceAccessAuthorization) {
    const allowed = new Set(mandateActionTemplates[propertyMandateTypes.temporaryServiceAccessAuthorization].allowedActions);
    const impossible = request.requestedActions.filter((action) => !allowed.has(action));
    if (impossible.length) return { ok: false, reason: "service_access_scope_exceeds_cleaning_only" };
  }
  return { ok: true, reason: null };
}

function evidenceSatisfied(request) {
  return request.evidenceRefs.length > 0 || request.requestedMandateType === propertyMandateTypes.temporaryServiceAccessAuthorization;
}

export function validatePropertyMandateRequest(request = {}, fixtures = buildPropertyActorAuthorityFixtureSet()) {
  const blockers = [];
  const missingRequirements = [];
  const grantor = findActor(fixtures, request.grantorActorId);
  const grantee = findActor(fixtures, request.granteeActorId);
  const requester = findActor(fixtures, request.requesterActorId);
  if (!requester) missingRequirements.push("requester");
  if (!grantor) blockers.push("grantor_missing");
  if (!grantee && request.requestedMandateType !== propertyMandateTypes.temporaryServiceAccessAuthorization) blockers.push("grantee_missing");
  if (!request.propertyId && !request.propertyCandidateRef && !request.projectId) blockers.push("property_or_project_missing");
  if (request.grantorActorId === request.granteeActorId &&
    ![propertyMandateTypes.organizationSignatoryAuthority, propertyMandateTypes.developerToRepresentative].includes(request.requestedMandateType)) {
    blockers.push("circular_authority_bootstrap");
  }
  const dates = timeStatus(request);
  if (dates === "invalid") blockers.push("invalid_date_range");
  if (dates === "expired" || request.requestStatus === propertyMandateRequestStatuses.expired) blockers.push("expired");
  if (request.requestStatus === propertyMandateRequestStatuses.revoked) blockers.push("revoked");
  if (!request.requestedActions.length) blockers.push("requested_actions_missing");
  const scope = scopeValid(request);
  if (!scope.ok) blockers.push(scope.reason);
  const grantorAuthority = allowedByGrantor(fixtures, request);
  if (!grantorAuthority.ok) blockers.push(grantorAuthority.reason);
  if (request.requestedMandateType === propertyMandateTypes.temporaryServiceAccessAuthorization && request.requestedScope.delegationAllowed !== true && request.grantorActorId === "actor_manager_carol") {
    blockers.push("delegation_not_allowed");
  }
  if (!evidenceSatisfied(request)) blockers.push("evidence_missing");
  if (request.jurisdiction === "UNKNOWN") blockers.push("jurisdiction_review_required");

  let status = propertyMandateEligibilityStatuses.readyForLocalDraft;
  if (blockers.includes("grantor_missing")) status = propertyMandateEligibilityStatuses.grantorRequired;
  else if (blockers.includes("grantee_missing")) status = propertyMandateEligibilityStatuses.granteeRequired;
  else if (blockers.includes("property_or_project_missing")) status = propertyMandateEligibilityStatuses.propertyRequired;
  else if (blockers.includes("invalid_date_range")) status = propertyMandateEligibilityStatuses.invalidDateRange;
  else if (blockers.includes("expired")) status = propertyMandateEligibilityStatuses.expired;
  else if (blockers.includes("revoked")) status = propertyMandateEligibilityStatuses.blockedRevoked;
  else if (blockers.includes("circular_authority_bootstrap")) status = propertyMandateEligibilityStatuses.blockedCircularAuthority;
  else if (blockers.includes("delegation_not_allowed")) status = propertyMandateEligibilityStatuses.blockedDelegation;
  else if (blockers.includes("grantor_cannot_delegate_requested_actions")) status = propertyMandateEligibilityStatuses.blockedAuthorityEscalation;
  else if (blockers.some((item) => item.includes("scope") || item.includes("action"))) status = propertyMandateEligibilityStatuses.invalidScope;
  else if (blockers.includes("grantor_authority_missing")) status = propertyMandateEligibilityStatuses.grantorAuthorityRequired;
  else if (blockers.includes("evidence_missing")) status = propertyMandateEligibilityStatuses.evidenceRequired;
  else if (blockers.includes("jurisdiction_review_required")) status = propertyMandateEligibilityStatuses.jurisdictionReviewRequired;

  return {
    modelType: "PropertyMandateEligibility",
    ok: status === propertyMandateEligibilityStatuses.readyForLocalDraft || status === propertyMandateEligibilityStatuses.jurisdictionReviewRequired,
    status,
    request,
    requester,
    grantor,
    grantee,
    missingRequirements,
    blockers,
    jurisdictionReviewRequired: blockers.includes("jurisdiction_review_required"),
    legalReviewRequired: true,
    signatureActive: false,
    activeAuthorityCreated: false,
    ...mandateSideEffectCounters
  };
}

export function mapMandateDraftToProposedAuthorityGrant(draft = {}) {
  const request = draft.request || draft.mandateRequest || {};
  const status = request.jurisdiction === "UNKNOWN"
    ? proposedAuthorityGrantStatuses.jurisdictionReviewRequired
    : proposedAuthorityGrantStatuses.reviewRequired;
  return {
    ...createAuthorityGrant({
      authorityGrantId: `proposed_auth_${request.mandateRequestId}`,
      actorId: request.granteeActorId,
      organizationId: request.granteeOrganizationId,
      relationshipId: `proposed_relationship_${request.mandateRequestId}`,
      propertyId: request.propertyId,
      propertyCandidateRef: request.propertyCandidateRef,
      authorityType: mandateTypeToAuthorityType(request.requestedMandateType),
      allowedActions: request.requestedActions,
      deniedActions: request.deniedActions,
      scope: request.requestedScope,
      jurisdiction: request.jurisdiction,
      status: propertyAuthorityStatuses.requested,
      evidenceRefs: request.evidenceRefs,
      documentLinks: request.documentRefs.map((documentRef) => ({ documentRef, protected: true })),
      validFrom: request.validFrom,
      validUntil: request.validUntil,
      createdAt: now,
      updatedAt: now
    }),
    proposedAuthorityStatus: status,
    activeAuthorityCreated: false,
    localDraftOnly: true,
    ...mandateSideEffectCounters
  };
}

function mandateTypeToAuthorityType(mandateType) {
  if (mandateType === propertyMandateTypes.ownerToAgentListingMandate || mandateType === propertyMandateTypes.ownerToAgencyMandate) return propertyAuthorityTypes.agencyMandate;
  if (mandateType === propertyMandateTypes.ownerToPropertyManager) return propertyAuthorityTypes.propertyManagementAuthority;
  if (mandateType === propertyMandateTypes.developerToRepresentative) return propertyAuthorityTypes.developerRepresentativeAuthority;
  if (mandateType === propertyMandateTypes.temporaryServiceAccessAuthorization) return propertyAuthorityTypes.serviceAccessAuthority;
  if (mandateType === propertyMandateTypes.ownerToAuthorizedRepresentative) return propertyAuthorityTypes.powerOfAttorney;
  return propertyAuthorityTypes.otherStructuredAuthority;
}

export function buildPropertyMandateDraft(request = {}, options = {}) {
  const fixtures = options.fixtures || buildPropertyActorAuthorityFixtureSet();
  const eligibility = validatePropertyMandateRequest(request, fixtures);
  const grantor = eligibility.grantor?.displayName || request.grantorActorId || request.grantorOrganizationId || "Missing grantor";
  const grantee = eligibility.grantee?.displayName || request.granteeActorId || request.granteeOrganizationId || "Missing grantee";
  const disclaimer = "This is a structured ESSA draft / authority preparation record. Legal sufficiency, signature requirements, notarization, registration, or jurisdiction-specific validity are not verified in this phase.";
  const doc = {
    modelType: "PropertyMandateDraftDocument",
    title: `ESSA Mandate Draft - ${request.requestedMandateType}`,
    mandateType: request.requestedMandateType,
    grantor,
    grantee,
    propertyDescription: request.propertyId || request.propertyCandidateRef || request.projectId || "Missing Property / Project scope",
    authorityPurpose: purposeFor(request),
    allowedActionClauses: request.requestedActions.map((action) => `${action} = ALLOWED`),
    deniedActionClauses: request.deniedActions.map((action) => `${action} = DENIED`),
    validityClause: `Valid from ${request.validFrom || "missing"} until ${request.validUntil || "missing"}.`,
    revocationClause: request.revocable ? "Revocable by grantor as a local preparation record." : "Revocation not specified in local draft.",
    jurisdictionNotice: request.jurisdiction === "UNKNOWN"
      ? "Jurisdiction unknown; professional/legal review is required before any real execution."
      : "LOCAL_DEMO jurisdiction only; no live country law encoded.",
    evidenceSummary: request.evidenceRefs.map((ref) => ({ evidenceRef: ref.refId || ref.evidenceRef || ref, protected: true })),
    signatureReadiness: request.signatureStatus,
    legalReviewRequirement: request.legalReviewStatus,
    disclaimer,
    generatedAt: now,
    draftVersion: request.draftVersion || "1.0.0",
    integrityMetadata: {
      fingerprint: createMandateFingerprint({
        mandateRequestId: request.mandateRequestId,
        requestedActions: request.requestedActions,
        deniedActions: request.deniedActions,
        scope: request.requestedScope,
        validFrom: request.validFrom,
        validUntil: request.validUntil,
        granteeActorId: request.granteeActorId
      }),
      legalSignature: false,
      notaryIntegrity: false
    }
  };
  const proposedAuthorityGrant = mapMandateDraftToProposedAuthorityGrant({ request });
  return {
    modelType: "PropertyMandateDraft",
    mandateRequest: request,
    request,
    eligibility,
    document: doc,
    markdown: [
      `# ${doc.title}`,
      "",
      `Grantor: ${doc.grantor}`,
      `Grantee: ${doc.grantee}`,
      `Scope: ${doc.propertyDescription}`,
      "",
      "Allowed actions:",
      ...doc.allowedActionClauses.map((item) => `- ${item}`),
      "",
      "Denied actions:",
      ...doc.deniedActionClauses.map((item) => `- ${item}`),
      "",
      doc.validityClause,
      doc.revocationClause,
      doc.jurisdictionNotice,
      "",
      doc.disclaimer
    ].join("\n"),
    proposedAuthorityGrant,
    auditMetadata: {
      audit: [
        audit(propertyMandateAuditEvents.draftBuilt, request),
        audit(propertyMandateAuditEvents.reviewRequired, request),
        audit(propertyMandateAuditEvents.signatureRequiredFuture, request)
      ],
      activeAuthorityCreated: false,
      ...mandateSideEffectCounters
    },
    ...mandateSideEffectCounters
  };
}

function purposeFor(request) {
  if (request.requestedMandateType === propertyMandateTypes.ownerToPropertyManager) return "Owner authorizes manager to perform scoped property operations.";
  if (request.requestedMandateType === propertyMandateTypes.temporaryServiceAccessAuthorization) return "Temporary service access for a limited time and service scope only.";
  if (request.requestedMandateType === propertyMandateTypes.developerToRepresentative) return "Developer organization authorizes representative for scoped project/unit inventory work.";
  return "Grantor authorizes grantee for the explicitly allowed actions only.";
}

export function createMandateSupersession(previousDraft = {}, nextRequest = {}) {
  const next = createPropertyMandateRequest({
    ...nextRequest,
    supersedesMandateRequestId: previousDraft.request?.mandateRequestId || previousDraft.mandateRequest?.mandateRequestId || null,
    previousVersionRef: previousDraft.document?.integrityMetadata?.fingerprint || null,
    draftVersion: "2.0.0"
  });
  const nextDraft = buildPropertyMandateDraft(next);
  return {
    modelType: "PropertyMandateSupersession",
    previousDraft,
    nextDraft,
    historyPreserved: true,
    auditEvent: propertyMandateAuditEvents.mandateSuperseded,
    ...mandateSideEffectCounters
  };
}

export function diffPropertyMandateDrafts(previousDraft = {}, nextDraft = {}) {
  const previous = previousDraft.request || previousDraft.mandateRequest || {};
  const next = nextDraft.request || nextDraft.mandateRequest || {};
  const prevAllowed = new Set(previous.requestedActions || []);
  const nextAllowed = new Set(next.requestedActions || []);
  return {
    modelType: "PropertyMandateDraftDiff",
    actionsAdded: [...nextAllowed].filter((action) => !prevAllowed.has(action)),
    actionsRemoved: [...prevAllowed].filter((action) => !nextAllowed.has(action)),
    scopeChanged: stableStringify(previous.requestedScope) !== stableStringify(next.requestedScope),
    validityChanged: previous.validFrom !== next.validFrom || previous.validUntil !== next.validUntil,
    granteeChanged: previous.granteeActorId !== next.granteeActorId || previous.granteeOrganizationId !== next.granteeOrganizationId,
    propertyScopeChanged: previous.propertyId !== next.propertyId || previous.propertyCandidateRef !== next.propertyCandidateRef || previous.projectId !== next.projectId,
    hiddenChanges: false,
    ...mandateSideEffectCounters
  };
}

export function createPropertyMandateReviewPayload(draft = {}) {
  const request = draft.request || draft.mandateRequest || {};
  return {
    modelType: "PropertyMandateReviewPayload",
    mandateRequest: request,
    grantor: draft.eligibility?.grantor || null,
    grantee: draft.eligibility?.grantee || null,
    property: request.propertyId || request.propertyCandidateRef || request.projectId || null,
    scope: request.requestedScope || null,
    evidence: request.evidenceRefs || [],
    jurisdiction: request.jurisdiction || "UNKNOWN",
    proposedAuthorityGrant: draft.proposedAuthorityGrant || null,
    missingRequirements: draft.eligibility?.missingRequirements || [],
    warnings: [
      "Mandate draft is private local preparation only.",
      "AuthorityGrant proposal is not active authority.",
      "Signature, legal sufficiency and jurisdiction validity are not verified."
    ],
    duplicateReviewQueueCreated: false,
    dispatchPerformed: false,
    ...mandateSideEffectCounters
  };
}

export function createLisaMandateGuideExplanation(question = "", draft = null) {
  const lower = String(question || "").toLowerCase();
  const legal = lower.includes("legally valid") || lower.includes("legal") || lower.includes("valid");
  return {
    modelType: "LisaMandateGuideExplanation",
    mayActivateAuthority: false,
    maySign: false,
    mayNotarize: false,
    mayVerifyLegalSufficiency: false,
    mayApproveHerself: false,
    answer: legal
      ? "Legal sufficiency is not verified in this local phase. ESSA can prepare structured scope and review materials only."
      : "Lisa can explain mandate scope, allowed and denied actions, evidence gaps, expiration, revocation and why review/signature/jurisdiction steps are separate.",
    draftRef: draft?.request?.mandateRequestId || null,
    ...mandateSideEffectCounters
  };
}

export function createNavigatorMandateRouting(input = "") {
  const text = String(input || "").toLowerCase();
  let route = "owner-agent";
  if (text.includes("manager") || text.includes("bookings") || text.includes("cleaning")) route = "owner-manager";
  if (text.includes("cleaner") || text.includes("enter tomorrow")) route = "temporary-cleaning";
  if (text.includes("developer")) route = "developer-representative";
  return {
    modelType: "NavigatorMandateRouting",
    route,
    hash: `#property-mandate?flow=${route}`,
    navigatorCanApprove: false,
    providerCalls: 0,
    externalCalls: 0
  };
}

export function buildMandateFixtures() {
  const fixtures = buildPropertyActorAuthorityFixtureSet();
  const ownerAgentRequest = createPropertyMandateRequest({
    mandateRequestId: "mandate_owner_agent_sale_v1",
    requesterActorId: "actor_owner_alice",
    grantorActorId: "actor_owner_alice",
    granteeActorId: "actor_agent_bob",
    granteeOrganizationId: "org_black_sea_agency",
    propertyId: "prop_phase23a_alice_apartment",
    relationshipType: propertyRelationshipTypes.agencyRepresentative,
    requestedMandateType: propertyMandateTypes.ownerToAgentListingMandate,
    jurisdiction: "LOCAL_DEMO",
    exclusivity: propertyMandateExclusivityStates.nonExclusive,
    evidenceRefs: [{ refType: "AuthorityEvidence", refId: "evidence_alice_ownership_doc", sourceBacked: true }]
  });
  const ownerAgentNoEvidence = createPropertyMandateRequest({
    ...ownerAgentRequest,
    mandateRequestId: "mandate_owner_agent_no_evidence",
    evidenceRefs: []
  });
  const ownerManager = createPropertyMandateRequest({
    mandateRequestId: "mandate_owner_manager_v1",
    requesterActorId: "actor_owner_alice",
    grantorActorId: "actor_owner_alice",
    granteeActorId: "actor_manager_carol",
    granteeOrganizationId: "org_batumi_property_management",
    propertyId: "prop_phase23a_alice_apartment",
    relationshipType: propertyRelationshipTypes.propertyManager,
    requestedMandateType: propertyMandateTypes.ownerToPropertyManager,
    jurisdiction: "LOCAL_DEMO",
    evidenceRefs: [{ refType: "AuthorityEvidence", refId: "evidence_alice_ownership_doc", sourceBacked: true }]
  });
  const developerRepresentative = createPropertyMandateRequest({
    mandateRequestId: "mandate_developer_rep_project_x",
    requesterActorId: "actor_developer_dana",
    grantorActorId: "actor_developer_dana",
    granteeActorId: "actor_developer_dana",
    grantorOrganizationId: "org_batumi_green_builders",
    granteeOrganizationId: "org_batumi_green_builders",
    projectId: "project_green_tower",
    relationshipType: propertyRelationshipTypes.developerRepresentative,
    requestedMandateType: propertyMandateTypes.developerToRepresentative,
    jurisdiction: "LOCAL_DEMO",
    evidenceRefs: [{ refType: "AuthorityEvidence", refId: "evidence_developer_employment_authorization", sourceBacked: true }]
  });
  const developerOutOfScope = createPropertyMandateRequest({
    ...developerRepresentative,
    mandateRequestId: "mandate_developer_rep_project_z",
    projectId: "project_z"
  });
  const tempCleaning = createPropertyMandateRequest({
    mandateRequestId: "mandate_temp_cleaning_access",
    requesterActorId: "actor_owner_alice",
    grantorActorId: "actor_owner_alice",
    granteeActorId: "actor_cleaner_chris",
    granteeOrganizationId: "org_clean_batumi",
    propertyId: "prop_phase23a_alice_apartment",
    relationshipType: propertyRelationshipTypes.guest,
    requestedMandateType: propertyMandateTypes.temporaryServiceAccessAuthorization,
    jurisdiction: "LOCAL_DEMO",
    validFrom: "2026-08-24T12:00:00.000Z",
    validUntil: "2026-08-24T15:00:00.000Z",
    requestedScope: {
      serviceScope: "CLEANING_ONLY",
      accessScope: "ENTRY_ONLY_12_15",
      delegationAllowed: false
    },
    serviceAccess: {
      serviceProviderOrgId: "org_clean_batumi",
      serviceType: "CLEANING",
      validFrom: "2026-08-24T12:00:00.000Z",
      validUntil: "2026-08-24T15:00:00.000Z",
      accessScope: "ENTRY_ONLY_FOR_CLEANING",
      serviceOrderRef: "future_service_order_ref",
      accessMethodRef: "future_access_method_ref",
      authorizedBy: "actor_owner_alice",
      status: "READY_FOR_LOCAL_DRAFT"
    }
  });
  const escalation = createPropertyMandateRequest({
    mandateRequestId: "mandate_manager_bad_sale_delegation",
    requesterActorId: "actor_manager_carol",
    grantorActorId: "actor_manager_carol",
    granteeActorId: "actor_agent_bob",
    propertyId: "prop_phase23a_managed_unit",
    relationshipType: propertyRelationshipTypes.agent,
    requestedMandateType: propertyMandateTypes.ownerToAgentListingMandate,
    requestedActions: [propertyAuthorityActions.createSaleListing],
    deniedActions: [],
    jurisdiction: "LOCAL_DEMO",
    evidenceRefs: [{ refType: "AuthorityEvidence", refId: "evidence_carol_management_authority", sourceBacked: true }]
  });
  const expired = createPropertyMandateRequest({
    ...ownerAgentRequest,
    mandateRequestId: "mandate_expired",
    validFrom: "2025-01-01T00:00:00.000Z",
    validUntil: "2025-02-01T00:00:00.000Z",
    requestStatus: propertyMandateRequestStatuses.expired
  });
  const revoked = createPropertyMandateRequest({
    ...ownerAgentRequest,
    mandateRequestId: "mandate_revoked",
    requestStatus: propertyMandateRequestStatuses.revoked
  });
  return {
    fixtures,
    requests: {
      ownerAgentRequest,
      ownerAgentNoEvidence,
      ownerManager,
      developerRepresentative,
      developerOutOfScope,
      tempCleaning,
      escalation,
      expired,
      revoked
    },
    sideEffectCounters: clone(mandateSideEffectCounters)
  };
}

export function buildPropertyMandateFlowViewModel(input = {}) {
  const flow = input.flow || "owner-agent";
  const data = buildMandateFixtures();
  const byFlow = {
    "owner-agent": data.requests.ownerAgentRequest,
    "owner-agent-missing-evidence": data.requests.ownerAgentNoEvidence,
    "owner-manager": data.requests.ownerManager,
    "developer-representative": data.requests.developerRepresentative,
    "developer-out-of-scope": data.requests.developerOutOfScope,
    "temporary-cleaning": data.requests.tempCleaning,
    "authority-escalation": data.requests.escalation,
    expired: data.requests.expired,
    revoked: data.requests.revoked
  };
  const request = byFlow[flow] || data.requests.ownerAgentRequest;
  const draft = buildPropertyMandateDraft(request, { fixtures: data.fixtures });
  const reviewPayload = createPropertyMandateReviewPayload(draft);
  return {
    modelType: "PropertyMandateFlowViewModel",
    route: "#property-mandate",
    flow,
    steps: [
      "Why do you need authority?",
      "Who grants it?",
      "Who receives it?",
      "Which Property / Project?",
      "What actions are allowed?",
      "What actions are excluded?",
      "How long is authority valid?",
      "What evidence exists?",
      "Jurisdiction readiness",
      "Review mandate draft"
    ],
    request,
    draft,
    reviewPayload,
    lisaExplanation: createLisaMandateGuideExplanation("Is this document legally valid?", draft),
    navigatorRouting: createNavigatorMandateRouting("I need to give an agent permission to sell."),
    returnToAddProperty: {
      hash: "#add-property?flow=agent&scenario=missing-mandate&step=authority",
      status: "MANDATE_DRAFT_CREATED",
      authorityStatus: "AUTHORITY_NOT_ACTIVE",
      requiredNext: ["REVIEW_REQUIRED", "SIGNATURE_REQUIRED_FUTURE", request.jurisdiction === "UNKNOWN" ? "JURISDICTION_REVIEW_REQUIRED" : "LOCAL_DEMO_REVIEW_REQUIRED"]
    },
    publicSafeBoundary: {
      publicPassportLeakage: false,
      publicDiscoveryLeakage: false,
      publicBusinessEntityLeakage: false,
      urlContainsPrivateData: false
    },
    ...mandateSideEffectCounters
  };
}
