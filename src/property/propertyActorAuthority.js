import {
  addPropertyEligibilityStatuses,
  addPropertyIntentContract,
  addPropertyWorkflowStages,
  addPropertyWorkflowStatuses,
  actorCapabilityGrantContract,
  actorIdentityContract,
  authorityEvidenceContract,
  authorityGrantContract,
  businessEntityBridgeStatuses,
  businessEntityOrganizationBridgeContract,
  jurisdictionAuthorityContextContract,
  jurisdictionAuthorityRuleStatuses,
  organizationContract,
  organizationMembershipContract,
  propertyActorCapabilities,
  propertyActorIdentityStatuses,
  propertyAuthorityActions,
  propertyAuthorityAuditEvents,
  propertyAuthorityEvidenceTypes,
  propertyAuthoritySideEffectCounters,
  propertyAuthorityStatuses,
  propertyMembershipStatuses,
  propertyOrganizationStatuses,
  propertyRelationshipContract,
  propertyRelationshipStatuses,
  propertyRelationshipTypes
} from "./propertyActorAuthorityContracts.js";

const fixedNow = "2026-08-22T00:00:00.000Z";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function requiredMissing(source = {}, fields = []) {
  return fields.filter((field) => source[field] == null || source[field] === "");
}

function includes(values = [], value) {
  return safeArray(values).includes(value);
}

function timeBlocked(record = {}, at = fixedNow) {
  const now = new Date(at).getTime();
  if (record.validFrom && new Date(record.validFrom).getTime() > now) return "not_yet_valid";
  if (record.validUntil && new Date(record.validUntil).getTime() <= now) return "expired";
  return null;
}

function idsMatch(record = {}, intent = {}) {
  if (intent.propertyId && record.propertyId && record.propertyId !== intent.propertyId) return false;
  if (intent.propertyCandidateRef && record.propertyCandidateRef && record.propertyCandidateRef !== intent.propertyCandidateRef) return false;
  return true;
}

export function createActorIdentity(input = {}) {
  return {
    ...clone(actorIdentityContract),
    ...input,
    identityEvidenceRefs: clone(input.identityEvidenceRefs || []),
    sourceRefs: clone(input.sourceRefs || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      localProofOnly: input.identityStatus === propertyActorIdentityStatuses.verifiedLocalProof,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function validateActorIdentity(actor = {}) {
  const missing = requiredMissing(actor, ["actorId", "actorType", "displayName", "identityStatus"]);
  const ok = actor.modelType === "ActorIdentity" &&
    missing.length === 0 &&
    Object.values(propertyActorIdentityStatuses).includes(actor.identityStatus);
  return { ok, status: ok ? "VALID_ACTOR_IDENTITY" : "INVALID_ACTOR_IDENTITY", missing };
}

export function createOrganization(input = {}) {
  return {
    ...clone(organizationContract),
    ...input,
    sourceRefs: clone(input.sourceRefs || []),
    evidenceRefs: clone(input.evidenceRefs || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function validateOrganization(organization = {}) {
  const missing = requiredMissing(organization, ["organizationId", "organizationType", "displayName", "organizationStatus"]);
  const ok = organization.modelType === "Organization" &&
    missing.length === 0 &&
    Object.values(propertyOrganizationStatuses).includes(organization.organizationStatus);
  return { ok, status: ok ? "VALID_ORGANIZATION" : "INVALID_ORGANIZATION", missing };
}

export function createBusinessEntityOrganizationBridge(input = {}) {
  return {
    ...clone(businessEntityOrganizationBridgeContract),
    ...input,
    bridgeStatus: input.bridgeStatus || businessEntityBridgeStatuses.proposed,
    evidenceRefs: clone(input.evidenceRefs || []),
    sourceRefs: clone(input.sourceRefs || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      copiesBusinessEntityPayload: false,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function createOrganizationMembership(input = {}) {
  return {
    ...clone(organizationMembershipContract),
    ...input,
    capabilityRefs: clone(input.capabilityRefs || []),
    authorityEvidenceRefs: clone(input.authorityEvidenceRefs || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      membershipIsNotPropertyAuthority: true,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function validateOrganizationMembership(membership = {}) {
  const missing = requiredMissing(membership, ["membershipId", "actorId", "organizationId", "membershipRole", "membershipStatus"]);
  const ok = membership.modelType === "OrganizationMembership" &&
    missing.length === 0 &&
    Object.values(propertyMembershipStatuses).includes(membership.membershipStatus);
  return { ok, status: ok ? "VALID_ORGANIZATION_MEMBERSHIP" : "INVALID_ORGANIZATION_MEMBERSHIP", missing };
}

export function createActorCapabilityGrant(input = {}) {
  return {
    ...clone(actorCapabilityGrantContract),
    ...input,
    scope: { ...(input.scope || {}) },
    evidenceRefs: clone(input.evidenceRefs || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      capabilityIsNotPropertyAuthority: true,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function createPropertyRelationship(input = {}) {
  return {
    ...clone(propertyRelationshipContract),
    ...input,
    sourceRefs: clone(input.sourceRefs || []),
    evidenceRefs: clone(input.evidenceRefs || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      relationshipIsNotAuthority: true,
      contextualRelationship: true,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function validatePropertyRelationship(relationship = {}) {
  const missing = requiredMissing(relationship, ["relationshipId", "actorId", "relationshipType", "relationshipStatus"]);
  if (!relationship.propertyId && !relationship.propertyCandidateRef) missing.push("propertyId_or_propertyCandidateRef");
  const ok = relationship.modelType === "PropertyRelationship" &&
    missing.length === 0 &&
    Object.values(propertyRelationshipTypes).includes(relationship.relationshipType);
  return { ok, status: ok ? "VALID_PROPERTY_RELATIONSHIP" : "INVALID_PROPERTY_RELATIONSHIP", missing };
}

export function createAuthorityGrant(input = {}) {
  return {
    ...clone(authorityGrantContract),
    ...input,
    allowedActions: clone(input.allowedActions || []),
    deniedActions: clone(input.deniedActions || []),
    scope: { ...(input.scope || {}) },
    evidenceRefs: clone(input.evidenceRefs || []),
    documentLinks: clone(input.documentLinks || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      localProofOnly: [propertyAuthorityStatuses.activeLocalProof, propertyAuthorityStatuses.limited].includes(input.status),
      noLegalSufficiencyClaim: true,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function validateAuthorityGrant(authority = {}) {
  const missing = requiredMissing(authority, ["authorityGrantId", "actorId", "relationshipId", "authorityType", "status"]);
  if (!authority.propertyId && !authority.propertyCandidateRef && !authority.scope?.projectId) missing.push("property_or_project_scope");
  const ok = authority.modelType === "AuthorityGrant" &&
    missing.length === 0 &&
    Object.values(propertyAuthorityStatuses).includes(authority.status);
  return { ok, status: ok ? "VALID_AUTHORITY_GRANT" : "INVALID_AUTHORITY_GRANT", missing };
}

export function createAuthorityEvidence(input = {}) {
  return {
    ...clone(authorityEvidenceContract),
    ...input,
    sourceRefs: clone(input.sourceRefs || []),
    limitations: clone(input.limitations || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      evidenceIsNotAuthority: true,
      privatePayloadStored: false,
      ...propertyAuthoritySideEffectCounters
    }
  };
}

export function validateAuthorityEvidence(evidence = {}) {
  const missing = requiredMissing(evidence, ["authorityEvidenceId", "evidenceType", "actorId"]);
  if (!evidence.documentRef && !evidence.evidenceRef) missing.push("documentRef_or_evidenceRef");
  if (!evidence.sourceRefs?.length) missing.push("sourceRefs");
  const ok = evidence.modelType === "AuthorityEvidence" &&
    missing.length === 0 &&
    Object.values(propertyAuthorityEvidenceTypes).includes(evidence.evidenceType);
  return { ok, status: ok ? "VALID_AUTHORITY_EVIDENCE" : "INVALID_AUTHORITY_EVIDENCE", missing };
}

export function createJurisdictionAuthorityContext(input = {}) {
  return {
    ...clone(jurisdictionAuthorityContextContract),
    ...input,
    requiredEvidenceTypes: clone(input.requiredEvidenceTypes || []),
    limitations: clone(input.limitations || []),
    sourceRefs: clone(input.sourceRefs || [])
  };
}

export function createAddPropertyIntent(input = {}) {
  return {
    ...clone(addPropertyIntentContract),
    ...input,
    evidenceRefs: clone(input.evidenceRefs || []),
    missingRequirements: clone(input.missingRequirements || []),
    blockedReasons: clone(input.blockedReasons || []),
    auditMetadata: {
      ...(input.auditMetadata || {}),
      createsListing: false,
      executionEligible: false,
      ...propertyAuthoritySideEffectCounters,
      audit: [
        ...(input.auditMetadata?.audit || []),
        createPropertyAuthorityAuditEvent({
          eventType: propertyAuthorityAuditEvents.addPropertyIntentCreated,
          actorId: input.actorId,
          organizationId: input.organizationId,
          addPropertyIntentId: input.addPropertyIntentId
        })
      ]
    }
  };
}

export function validateAddPropertyIntentContract(intent = {}) {
  const missing = requiredMissing(intent, ["addPropertyIntentId", "actorId", "relationshipClaimId", "intendedAction"]);
  if (!intent.propertyId && !intent.propertyCandidateRef) missing.push("propertyId_or_propertyCandidateRef");
  const ok = intent.modelType === "AddPropertyIntent" &&
    missing.length === 0 &&
    Object.values(propertyAuthorityActions).includes(intent.intendedAction);
  return { ok, status: ok ? "VALID_ADD_PROPERTY_INTENT" : addPropertyEligibilityStatuses.invalidIntent, missing };
}

export function createPropertyAuthorityAuditEvent(input = {}) {
  return {
    auditRecordId: input.auditRecordId || `authority_audit_${String(input.eventType || "event").toLowerCase()}_${input.addPropertyIntentId || input.authorityGrantId || input.relationshipId || input.actorId || "local"}`,
    eventType: input.eventType,
    actorId: input.actorId || null,
    organizationId: input.organizationId || null,
    relationshipId: input.relationshipId || null,
    authorityGrantId: input.authorityGrantId || null,
    authorityEvidenceId: input.authorityEvidenceId || null,
    addPropertyIntentId: input.addPropertyIntentId || null,
    timestamp: input.timestamp || fixedNow,
    appendOnly: true,
    ...propertyAuthoritySideEffectCounters
  };
}

const requiredCapabilityByAction = {
  [propertyAuthorityActions.addProperty]: propertyActorCapabilities.submitPropertyData,
  [propertyAuthorityActions.claimExistingProperty]: propertyActorCapabilities.submitPropertyData,
  [propertyAuthorityActions.submitPropertyEvidence]: propertyActorCapabilities.submitAuthorityEvidence,
  [propertyAuthorityActions.createSaleListing]: propertyActorCapabilities.submitAgencyListing,
  [propertyAuthorityActions.createLongTermRentListing]: propertyActorCapabilities.submitAgencyListing,
  [propertyAuthorityActions.createStayListing]: propertyActorCapabilities.submitManagementRelationship,
  [propertyAuthorityActions.editListing]: propertyActorCapabilities.submitAgencyListing,
  [propertyAuthorityActions.updatePrice]: propertyActorCapabilities.submitAgencyListing,
  [propertyAuthorityActions.updateAvailability]: propertyActorCapabilities.submitManagementRelationship,
  [propertyAuthorityActions.promoteProperty]: propertyActorCapabilities.submitAgencyListing,
  [propertyAuthorityActions.manageProperty]: propertyActorCapabilities.submitManagementRelationship,
  [propertyAuthorityActions.requestCleaning]: propertyActorCapabilities.submitManagementRelationship,
  [propertyAuthorityActions.requestMaintenance]: propertyActorCapabilities.submitManagementRelationship,
  [propertyAuthorityActions.startSaleWorkflow]: propertyActorCapabilities.submitAgencyListing
};

const relationshipActions = {
  [propertyRelationshipTypes.owner]: [
    propertyAuthorityActions.addProperty,
    propertyAuthorityActions.claimExistingProperty,
    propertyAuthorityActions.submitPropertyEvidence,
    propertyAuthorityActions.createSaleListing,
    propertyAuthorityActions.createLongTermRentListing,
    propertyAuthorityActions.createStayListing,
    propertyAuthorityActions.editListing,
    propertyAuthorityActions.updatePrice,
    propertyAuthorityActions.updateAvailability,
    propertyAuthorityActions.promoteProperty,
    propertyAuthorityActions.manageProperty,
    propertyAuthorityActions.requestCleaning,
    propertyAuthorityActions.requestMaintenance,
    propertyAuthorityActions.startSaleWorkflow
  ],
  [propertyRelationshipTypes.coOwner]: [
    propertyAuthorityActions.addProperty,
    propertyAuthorityActions.submitPropertyEvidence,
    propertyAuthorityActions.createSaleListing,
    propertyAuthorityActions.startSaleWorkflow
  ],
  [propertyRelationshipTypes.developer]: [
    propertyAuthorityActions.addProperty,
    propertyAuthorityActions.submitPropertyEvidence
  ],
  [propertyRelationshipTypes.developerRepresentative]: [
    propertyAuthorityActions.addProperty,
    propertyAuthorityActions.submitPropertyEvidence,
    propertyAuthorityActions.createSaleListing
  ],
  [propertyRelationshipTypes.agent]: [
    propertyAuthorityActions.createSaleListing,
    propertyAuthorityActions.editListing,
    propertyAuthorityActions.updatePrice,
    propertyAuthorityActions.promoteProperty
  ],
  [propertyRelationshipTypes.agencyRepresentative]: [
    propertyAuthorityActions.createSaleListing,
    propertyAuthorityActions.editListing,
    propertyAuthorityActions.updatePrice,
    propertyAuthorityActions.promoteProperty
  ],
  [propertyRelationshipTypes.propertyManager]: [
    propertyAuthorityActions.manageProperty,
    propertyAuthorityActions.updateAvailability,
    propertyAuthorityActions.requestCleaning,
    propertyAuthorityActions.requestMaintenance,
    propertyAuthorityActions.communicateWithGuest,
    propertyAuthorityActions.communicateWithTenant
  ],
  [propertyRelationshipTypes.authorizedRepresentative]: [
    propertyAuthorityActions.addProperty,
    propertyAuthorityActions.submitPropertyEvidence,
    propertyAuthorityActions.createSaleListing,
    propertyAuthorityActions.manageProperty
  ],
  [propertyRelationshipTypes.seller]: [
    propertyAuthorityActions.createSaleListing,
    propertyAuthorityActions.startSaleWorkflow
  ],
  [propertyRelationshipTypes.landlord]: [
    propertyAuthorityActions.createLongTermRentListing,
    propertyAuthorityActions.updateAvailability
  ],
  [propertyRelationshipTypes.host]: [
    propertyAuthorityActions.createStayListing,
    propertyAuthorityActions.updateAvailability,
    propertyAuthorityActions.communicateWithGuest
  ],
  [propertyRelationshipTypes.buyer]: [],
  [propertyRelationshipTypes.tenant]: [],
  [propertyRelationshipTypes.investor]: [],
  [propertyRelationshipTypes.guest]: []
};

function findById(items = [], key, id) {
  return safeArray(items).find((item) => item?.[key] === id) || null;
}

function findRelationship(intent = {}, relationships = []) {
  return safeArray(relationships).find((relationship) =>
    relationship.relationshipId === intent.relationshipClaimId &&
    relationship.actorId === intent.actorId &&
    idsMatch(relationship, intent)
  ) || null;
}

function findMembership(intent = {}, memberships = []) {
  if (!intent.organizationId) return null;
  return safeArray(memberships).find((membership) =>
    membership.actorId === intent.actorId &&
    membership.organizationId === intent.organizationId
  ) || null;
}

function findCapabilityGrant(intent = {}, grants = []) {
  const requiredCapability = requiredCapabilityByAction[intent.intendedAction] || propertyActorCapabilities.submitPropertyData;
  return safeArray(grants).find((grant) =>
    grant.actorId === intent.actorId &&
    grant.capability === requiredCapability &&
    (!intent.organizationId || !grant.organizationId || grant.organizationId === intent.organizationId)
  ) || null;
}

function scopeMismatch(authority = {}, intent = {}) {
  const scope = authority.scope || {};
  if (!idsMatch(authority, intent)) return "property_scope_mismatch";
  if (scope.propertyId && intent.propertyId && scope.propertyId !== intent.propertyId) return "property_scope_mismatch";
  if (scope.propertyCandidateRef && intent.propertyCandidateRef && scope.propertyCandidateRef !== intent.propertyCandidateRef) return "property_candidate_scope_mismatch";
  if (scope.projectId && intent.projectId && scope.projectId !== intent.projectId) return "project_scope_mismatch";
  if (scope.buildingId && intent.buildingId && scope.buildingId !== intent.buildingId) return "building_scope_mismatch";
  if (safeArray(scope.allowedActions).length && !scope.allowedActions.includes(intent.intendedAction)) return "action_scope_mismatch";
  return null;
}

function jurisdictionBlock(authority = {}, jurisdictionContexts = []) {
  const context = safeArray(jurisdictionContexts).find((item) =>
    item.authorityType === authority.authorityType &&
    item.jurisdiction === authority.jurisdiction
  ) || safeArray(jurisdictionContexts).find((item) => item.jurisdiction === "UNKNOWN");
  if (!context) return null;
  if (context.ruleStatus === jurisdictionAuthorityRuleStatuses.blocked) return "jurisdiction_blocked";
  if (context.ruleStatus === jurisdictionAuthorityRuleStatuses.unknown) return "jurisdiction_unknown";
  return null;
}

function evidenceForAuthority(authority = {}, evidence = []) {
  const refs = new Set([
    ...safeArray(authority.evidenceRefs).map((ref) => ref.refId || ref.evidenceRef || ref.authorityEvidenceId || ref),
    ...safeArray(authority.documentLinks).map((ref) => ref.refId || ref.documentRef || ref)
  ]);
  return safeArray(evidence).filter((item) =>
    item.authorityGrantId === authority.authorityGrantId ||
    refs.has(item.authorityEvidenceId) ||
    refs.has(item.evidenceRef) ||
    refs.has(item.documentRef)
  );
}

export function resolveActorAuthorityForAction({
  intent = {},
  actor = null,
  organization = null,
  membership = null,
  relationship = null,
  capabilityGrant = null,
  authorityGrants = [],
  authorityEvidence = [],
  jurisdictionContexts = [],
  timestamp = fixedNow
} = {}) {
  const rejectedGrants = [];
  const missingEvidence = [];
  const scopeMismatches = [];
  const lifecycleBlockers = [];
  const explanationCodes = [];

  if (!actor || actor.identityStatus !== propertyActorIdentityStatuses.verifiedLocalProof) {
    explanationCodes.push("actor_not_verified_local_proof");
  }
  if (intent.organizationId && !organization) explanationCodes.push("organization_missing");
  if (intent.organizationId && (!membership || membership.membershipStatus !== propertyMembershipStatuses.activeLocalProof)) {
    explanationCodes.push("active_membership_required");
  }
  if (!capabilityGrant || capabilityGrant.status !== "ACTIVE_LOCAL_PROOF") {
    explanationCodes.push("active_capability_grant_required");
  }
  if (!relationship || relationship.relationshipStatus !== propertyRelationshipStatuses.activeLocalProof) {
    explanationCodes.push("active_property_relationship_required");
  } else if (!safeArray(relationshipActions[relationship.relationshipType]).includes(intent.intendedAction)) {
    explanationCodes.push("relationship_type_cannot_perform_action");
  }

  const applicable = safeArray(authorityGrants).filter((grant) =>
    grant.actorId === intent.actorId &&
    grant.relationshipId === intent.relationshipClaimId &&
    (!intent.organizationId || !grant.organizationId || grant.organizationId === intent.organizationId)
  );

  const accepted = [];
  applicable.forEach((grant) => {
    const evidenceItems = evidenceForAuthority(grant, authorityEvidence);
    const timeReason = timeBlocked(grant, timestamp);
    const grantScopeMismatch = scopeMismatch(grant, intent);
    const jurisdictionReason = jurisdictionBlock(grant, jurisdictionContexts);
    if (![propertyAuthorityStatuses.activeLocalProof, propertyAuthorityStatuses.limited].includes(grant.status)) {
      lifecycleBlockers.push({ authorityGrantId: grant.authorityGrantId, status: grant.status });
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: `authority_status_${grant.status}` });
      return;
    }
    if (timeReason) {
      lifecycleBlockers.push({ authorityGrantId: grant.authorityGrantId, status: timeReason });
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: timeReason });
      return;
    }
    if (!grant.allowedActions.includes(intent.intendedAction) || grant.deniedActions.includes(intent.intendedAction)) {
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: "action_not_allowed_by_authority" });
      return;
    }
    if (grantScopeMismatch) {
      scopeMismatches.push({ authorityGrantId: grant.authorityGrantId, reason: grantScopeMismatch });
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: grantScopeMismatch });
      return;
    }
    if (jurisdictionReason) {
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: jurisdictionReason });
      return;
    }
    if (!evidenceItems.length) {
      missingEvidence.push({ authorityGrantId: grant.authorityGrantId, reason: "authority_evidence_missing" });
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: "authority_evidence_missing" });
      return;
    }
    const expiredEvidence = evidenceItems.find((item) => timeBlocked(item, timestamp));
    if (expiredEvidence) {
      lifecycleBlockers.push({ authorityGrantId: grant.authorityGrantId, status: "evidence_expired", authorityEvidenceId: expiredEvidence.authorityEvidenceId });
      rejectedGrants.push({ authorityGrantId: grant.authorityGrantId, reason: "evidence_expired" });
      return;
    }
    accepted.push(grant);
  });

  if (!applicable.length) explanationCodes.push("authority_grant_missing");
  if (missingEvidence.length) explanationCodes.push("authority_evidence_missing");
  if (scopeMismatches.length) explanationCodes.push("authority_scope_mismatch");
  if (lifecycleBlockers.length) explanationCodes.push("authority_lifecycle_blocked");

  const foundationOk = !explanationCodes.some((code) => [
    "actor_not_verified_local_proof",
    "organization_missing",
    "active_membership_required",
    "active_capability_grant_required",
    "active_property_relationship_required",
    "relationship_type_cannot_perform_action",
    "authority_grant_missing",
    "authority_evidence_missing",
    "authority_scope_mismatch",
    "authority_lifecycle_blocked"
  ].includes(code));

  return {
    modelType: "AuthorityExplanation",
    requestedAction: intent.intendedAction || null,
    result: foundationOk && accepted.length > 0 ? "AUTHORIZED_LOCAL_PROOF_REVIEW_REQUIRED" : "NOT_AUTHORIZED",
    authorizedLocalProof: foundationOk && accepted.length > 0,
    applicableRelationship: relationship ? {
      relationshipId: relationship.relationshipId,
      relationshipType: relationship.relationshipType,
      relationshipStatus: relationship.relationshipStatus
    } : null,
    applicableAuthority: accepted.map((grant) => ({
      authorityGrantId: grant.authorityGrantId,
      authorityType: grant.authorityType,
      status: grant.status
    })),
    rejectedGrants,
    missingEvidence,
    scopeMismatches,
    lifecycleBlockers,
    requiredReview: true,
    scope: accepted[0]?.scope || null,
    lifecycleStatus: accepted[0]?.status || null,
    jurisdictionStatus: accepted[0]?.jurisdiction || intent.jurisdiction || "UNKNOWN",
    humanReadableCodes: explanationCodes.length ? explanationCodes : ["authority_valid_for_local_review_only"],
    ...propertyAuthoritySideEffectCounters
  };
}

function statusFromBlock(reason) {
  if (reason === "actor_missing" || reason === "actor_status_not_acceptable") return addPropertyEligibilityStatuses.blockedActor;
  if (reason === "organization_missing" || reason === "organization_status_not_acceptable") return addPropertyEligibilityStatuses.blockedOrganization;
  if (reason.includes("membership")) return reason.includes("expired") ? addPropertyEligibilityStatuses.blockedExpired : addPropertyEligibilityStatuses.blockedMembership;
  if (reason.includes("capability")) return addPropertyEligibilityStatuses.blockedCapability;
  if (reason.includes("relationship")) return addPropertyEligibilityStatuses.blockedRelationship;
  if (reason.includes("evidence")) return addPropertyEligibilityStatuses.blockedEvidence;
  if (reason.includes("expired")) return addPropertyEligibilityStatuses.blockedExpired;
  if (reason.includes("revoked")) return addPropertyEligibilityStatuses.blockedRevoked;
  if (reason.includes("jurisdiction")) return addPropertyEligibilityStatuses.blockedJurisdiction;
  if (reason.includes("scope")) return addPropertyEligibilityStatuses.blockedScope;
  return addPropertyEligibilityStatuses.blockedAuthority;
}

export function validateAddPropertyIntentEligibility({
  intent = {},
  actors = [],
  organizations = [],
  memberships = [],
  capabilityGrants = [],
  relationships = [],
  authorityGrants = [],
  authorityEvidence = [],
  jurisdictionContexts = [],
  timestamp = fixedNow,
  explicitBlocks = []
} = {}) {
  const contract = validateAddPropertyIntentContract(intent);
  const missingRequirements = [...contract.missing];
  const blockedReasons = [];
  if (!contract.ok) blockedReasons.push("invalid_intent_contract");

  const actor = findById(actors, "actorId", intent.actorId);
  if (!actor) blockedReasons.push("actor_missing");
  else if (actor.identityStatus !== propertyActorIdentityStatuses.verifiedLocalProof) blockedReasons.push("actor_status_not_acceptable");

  const organization = intent.organizationId ? findById(organizations, "organizationId", intent.organizationId) : null;
  if (intent.organizationId && !organization) blockedReasons.push("organization_missing");
  if (organization && ![propertyOrganizationStatuses.activeLocalProof, propertyOrganizationStatuses.reviewPending].includes(organization.organizationStatus)) {
    blockedReasons.push("organization_status_not_acceptable");
  }

  const membership = findMembership(intent, memberships);
  if (intent.organizationId && !membership) blockedReasons.push("membership_missing");
  if (membership) {
    const membershipTime = timeBlocked(membership, timestamp);
    if (membership.membershipStatus === propertyMembershipStatuses.revoked) blockedReasons.push("membership_revoked");
    else if (membership.membershipStatus === propertyMembershipStatuses.suspended) blockedReasons.push("membership_suspended");
    else if (membership.membershipStatus === propertyMembershipStatuses.expired || membershipTime === "expired") blockedReasons.push("membership_expired");
    else if (membership.membershipStatus !== propertyMembershipStatuses.activeLocalProof) blockedReasons.push("membership_not_active");
  }

  const capabilityGrant = findCapabilityGrant(intent, capabilityGrants);
  if (!capabilityGrant) blockedReasons.push("capability_grant_missing");
  else {
    const capabilityTime = timeBlocked(capabilityGrant, timestamp);
    if (capabilityGrant.status !== "ACTIVE_LOCAL_PROOF") blockedReasons.push("capability_not_active");
    if (capabilityTime === "expired") blockedReasons.push("capability_expired");
  }

  const relationship = findRelationship(intent, relationships);
  if (!relationship) blockedReasons.push("relationship_missing");
  else if (relationship.relationshipStatus !== propertyRelationshipStatuses.activeLocalProof) blockedReasons.push("relationship_not_active");
  else if (!safeArray(relationshipActions[relationship.relationshipType]).includes(intent.intendedAction)) blockedReasons.push("relationship_action_incompatible");

  const authority = findById(authorityGrants, "authorityGrantId", intent.authorityGrantId);
  if (!authority) blockedReasons.push("authority_missing");
  else {
    if (authority.relationshipId !== intent.relationshipClaimId || authority.actorId !== intent.actorId) blockedReasons.push("authority_relationship_mismatch");
    if (authority.status === propertyAuthorityStatuses.revoked) blockedReasons.push("authority_revoked");
    else if (authority.status === propertyAuthorityStatuses.suspended) blockedReasons.push("authority_suspended");
    else if (authority.status === propertyAuthorityStatuses.expired) blockedReasons.push("authority_expired");
    else if (authority.status === propertyAuthorityStatuses.jurisdictionBlocked) blockedReasons.push("authority_jurisdiction_blocked");
    else if (![propertyAuthorityStatuses.activeLocalProof, propertyAuthorityStatuses.limited].includes(authority.status)) blockedReasons.push("authority_not_active");
    const authorityTime = timeBlocked(authority, timestamp);
    if (authorityTime === "expired") blockedReasons.push("authority_expired");
    if (!authority.allowedActions.includes(intent.intendedAction)) blockedReasons.push("authority_action_not_allowed");
    if (authority.deniedActions.includes(intent.intendedAction)) blockedReasons.push("authority_action_denied");
    const mismatch = scopeMismatch(authority, intent);
    if (mismatch) blockedReasons.push(mismatch);
    const jurisdictionReason = jurisdictionBlock(authority, jurisdictionContexts);
    if (jurisdictionReason === "jurisdiction_blocked") blockedReasons.push("jurisdiction_blocked");
    if (jurisdictionReason === "jurisdiction_unknown" && intent.requiresExecutionReadiness) blockedReasons.push("jurisdiction_unknown_for_execution");
    const evidenceItems = evidenceForAuthority(authority, authorityEvidence);
    if (!evidenceItems.length) blockedReasons.push("authority_evidence_missing");
    if (evidenceItems.some((item) => timeBlocked(item, timestamp) === "expired")) blockedReasons.push("authority_evidence_expired");
  }

  blockedReasons.push(...explicitBlocks);
  if (!intent.propertyId && !intent.propertyCandidateRef) missingRequirements.push("property_identification");

  const resolver = resolveActorAuthorityForAction({
    intent,
    actor,
    organization,
    membership,
    relationship,
    capabilityGrant,
    authorityGrants: authority ? [authority] : authorityGrants,
    authorityEvidence,
    jurisdictionContexts,
    timestamp
  });

  let status = addPropertyEligibilityStatuses.readyForLocalReview;
  if (blockedReasons.length) status = statusFromBlock(blockedReasons[0]);
  if (blockedReasons.includes("authority_revoked") || blockedReasons.includes("membership_revoked")) status = addPropertyEligibilityStatuses.blockedRevoked;
  if (blockedReasons.some((reason) => reason.includes("expired"))) status = addPropertyEligibilityStatuses.blockedExpired;
  if (blockedReasons.some((reason) => reason.includes("scope") || reason.includes("action_denied") || reason.includes("action_not_allowed"))) status = addPropertyEligibilityStatuses.blockedScope;
  if (blockedReasons.some((reason) => reason.includes("evidence"))) status = addPropertyEligibilityStatuses.blockedEvidence;
  if (blockedReasons.some((reason) => reason.includes("jurisdiction"))) status = addPropertyEligibilityStatuses.blockedJurisdiction;
  if (!contract.ok) status = addPropertyEligibilityStatuses.invalidIntent;

  const reviewRequired = status === addPropertyEligibilityStatuses.readyForLocalReview;
  return {
    ok: status === addPropertyEligibilityStatuses.readyForLocalReview,
    status,
    workflowStatus: reviewRequired ? addPropertyWorkflowStatuses.readyForLocalReview : addPropertyWorkflowStatuses.blocked,
    intent: {
      ...intent,
      validationStatus: status,
      workflowStatus: reviewRequired ? addPropertyWorkflowStatuses.readyForLocalReview : addPropertyWorkflowStatuses.blocked,
      missingRequirements: [...new Set(missingRequirements)],
      blockedReasons: [...new Set(blockedReasons)]
    },
    actor,
    organization,
    membership,
    capabilityGrant,
    relationship,
    authorityGrant: authority,
    authorityExplanation: resolver,
    missingRequirements: [...new Set(missingRequirements)],
    blockedReasons: [...new Set(blockedReasons)],
    reviewRequired,
    executionEligible: false,
    ...propertyAuthoritySideEffectCounters
  };
}

export function buildPropertyActorRelationshipSummary({
  intent = {},
  relationship = null,
  organization = null,
  authorityExplanation = null
} = {}) {
  return {
    modelType: "PropertyActorRelationshipSummary",
    actorId: intent.actorId || relationship?.actorId || null,
    propertyId: intent.propertyId || relationship?.propertyId || null,
    propertyCandidateRef: intent.propertyCandidateRef || relationship?.propertyCandidateRef || null,
    relationshipType: relationship?.relationshipType || null,
    relationshipStatus: relationship?.relationshipStatus || null,
    organizationContext: organization ? {
      organizationId: organization.organizationId,
      organizationType: organization.organizationType,
      displayName: organization.displayName,
      jurisdiction: organization.jurisdiction,
      verificationStatus: organization.verificationStatus
    } : null,
    authorityStatus: authorityExplanation?.authorizedLocalProof ? "LOCAL_PROOF_REVIEW_REQUIRED" : "NOT_AUTHORIZED",
    allowedActionSummary: authorityExplanation?.applicableAuthority?.length
      ? authorityExplanation.applicableAuthority.map((authority) => authority.authorityType)
      : [],
    validUntil: null,
    requiresReview: true,
    limitations: [
      "Private authority evidence is not exposed in this read model.",
      "Local proof does not publish a listing or prove real-world legal sufficiency."
    ],
    ...propertyAuthoritySideEffectCounters
  };
}

export function createPublicSafeAuthorityReadModel({ organization = null, relationship = null, authority = null, evidence = [] } = {}) {
  return {
    modelType: "PublicSafeAuthorityReadModel",
    organization: organization ? {
      organizationId: organization.organizationId,
      organizationType: organization.organizationType,
      displayName: organization.displayName,
      jurisdiction: organization.jurisdiction,
      verificationStatus: organization.verificationStatus,
      businessEntityBridgeId: organization.businessEntityBridgeId
    } : null,
    relationship: relationship ? {
      relationshipId: relationship.relationshipId,
      actorId: relationship.actorId,
      organizationId: relationship.organizationId,
      propertyId: relationship.propertyId,
      propertyCandidateRef: relationship.propertyCandidateRef,
      relationshipType: relationship.relationshipType,
      relationshipStatus: relationship.relationshipStatus
    } : null,
    authority: authority ? {
      authorityGrantId: authority.authorityGrantId,
      authorityType: authority.authorityType,
      status: authority.status,
      allowedActions: authority.allowedActions,
      deniedActions: authority.deniedActions,
      jurisdiction: authority.jurisdiction
    } : null,
    evidenceSummary: safeArray(evidence).map((item) => ({
      authorityEvidenceId: item.authorityEvidenceId,
      evidenceType: item.evidenceType,
      verificationStatus: item.verificationStatus,
      freshnessStatus: item.freshnessStatus,
      jurisdiction: item.jurisdiction,
      limitations: item.limitations
    })),
    privateEvidenceDocumentsExposed: false,
    ...propertyAuthoritySideEffectCounters
  };
}

export function buildAddPropertyWorkflowStageProgress(eligibility = {}) {
  const stages = addPropertyWorkflowStages.map((stage, index) => ({
    stage,
    index,
    status: "PENDING"
  }));
  const blockers = new Set(eligibility.blockedReasons || []);
  function markThrough(stageName) {
    const last = stages.findIndex((stage) => stage.stage === stageName);
    stages.forEach((stage, index) => {
      if (index <= last) stage.status = "COMPLETE_LOCAL_CONTRACT_PROOF";
    });
  }
  if (eligibility.ok) markThrough("ROUTE_TO_REVIEW");
  else if (blockers.has("actor_missing") || blockers.has("actor_status_not_acceptable")) markThrough("IDENTIFY_ACTOR");
  else if (blockers.has("organization_missing")) markThrough("RESOLVE_ORGANIZATION");
  else if ([...blockers].some((reason) => reason.includes("membership"))) markThrough("RESOLVE_MEMBERSHIP");
  else if ([...blockers].some((reason) => reason.includes("relationship"))) markThrough("CLAIM_PROPERTY_RELATIONSHIP");
  else if ([...blockers].some((reason) => reason.includes("evidence"))) markThrough("COLLECT_AUTHORITY_EVIDENCE");
  else if ([...blockers].some((reason) => reason.includes("authority") || reason.includes("scope") || reason.includes("jurisdiction"))) markThrough("VALIDATE_AUTHORITY");
  else markThrough("CREATE_ADD_PROPERTY_INTENT");
  return {
    modelType: "AddPropertyWorkflowStageProgress",
    stages,
    terminalStage: eligibility.ok ? "ROUTE_TO_REVIEW" : "BLOCKED",
    executionStageReached: false,
    ...propertyAuthoritySideEffectCounters
  };
}

export function createAddPropertyReviewPipelineBridge(eligibility = {}) {
  return {
    modelType: "AddPropertyReviewPipelineBridge",
    sourceSystem: "AddPropertyIntent",
    targetSystem: "PropertyReviewWorkflow",
    dispatchPerformed: false,
    duplicateReviewQueueCreated: false,
    readyForExistingReviewWorkflow: eligibility.ok,
    payload: {
      addPropertyIntentId: eligibility.intent?.addPropertyIntentId || null,
      actorId: eligibility.intent?.actorId || null,
      organizationId: eligibility.intent?.organizationId || null,
      relationshipClaimId: eligibility.intent?.relationshipClaimId || null,
      authorityGrantId: eligibility.intent?.authorityGrantId || null,
      evidenceRefs: clone(eligibility.intent?.evidenceRefs || []),
      authorityExplanation: eligibility.authorityExplanation,
      limitations: [
        "This bridge is a local readiness payload only.",
        "Existing Property Review Workflow remains the review system.",
        "No listing, property, quarantine, provider or production state is mutated."
      ]
    },
    ...propertyAuthoritySideEffectCounters
  };
}

export function createLisaAddPropertyAuthorityExplanation(eligibility = {}) {
  return {
    modelType: "LisaAddPropertyAuthorityExplanation",
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    mayVerifyOwnership: false,
    mayActivateAuthority: false,
    mayInventMembership: false,
    mayApproveMandate: false,
    mayApproveExecution: false,
    mayInterpretUnknownJurisdictionAsSettledLaw: false,
    explanation: [
      `Actor: ${eligibility.intent?.actorId || "missing"}.`,
      `Organization context: ${eligibility.intent?.organizationId || "personal/no organization"}.`,
      `Relationship claim: ${eligibility.intent?.relationshipClaimId || "missing"}.`,
      `Requested action: ${eligibility.intent?.intendedAction || "missing"}.`,
      eligibility.ok
        ? "The local authority proof can move to human review; it does not publish or execute anything."
        : `Blocked: ${(eligibility.blockedReasons || []).join(", ") || eligibility.status}.`,
      "Lisa can explain missing authority, evidence, scope and review steps, but cannot approve them."
    ].join(" "),
    ...propertyAuthoritySideEffectCounters
  };
}

export function createNavigatorAddPropertyRoutingReadiness(input = {}) {
  return {
    modelType: "NavigatorAddPropertyRoutingReadiness",
    userIntent: input.userIntent || "I want to add a property",
    routedWorkflow: "ADD_PROPERTY_COMPOSED_WORKFLOW_FUTURE",
    allowedNow: ["explain_required_actor_authority_layers", "create_local_contract_readiness_preview"],
    blockedNow: ["create_authority", "activate_authority", "publish_listing", "execute_property_action"],
    navigatorCanBypassAuthority: false,
    ...propertyAuthoritySideEffectCounters
  };
}
