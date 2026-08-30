import { businessVerificationStatuses, createBusinessEntity, leadFreshnessStates } from "../leadIntelligence/leadContracts.js";
import { propertySourceTypes } from "./propertyIngestionContracts.js";
import {
  businessEntityBridgeStatuses,
  jurisdictionAuthorityRuleStatuses,
  propertyActorCapabilities,
  propertyActorIdentityStatuses,
  propertyAuthorityActions,
  propertyAuthorityEvidenceTypes,
  propertyAuthorityStatuses,
  propertyAuthorityTypes,
  propertyCapabilityGrantStatuses,
  propertyMembershipRoles,
  propertyMembershipStatuses,
  propertyOrganizationStatuses,
  propertyOrganizationTypes,
  propertyRelationshipStatuses,
  propertyRelationshipTypes
} from "./propertyActorAuthorityContracts.js";
import {
  createActorCapabilityGrant,
  createActorIdentity,
  createAddPropertyIntent,
  createAuthorityEvidence,
  createAuthorityGrant,
  createBusinessEntityOrganizationBridge,
  createJurisdictionAuthorityContext,
  createOrganization,
  createOrganizationMembership,
  createPropertyRelationship
} from "./propertyActorAuthority.js";
import { propertyFreshnessStatuses, propertyVerificationStatuses } from "./propertyContracts.js";

const now = "2026-08-22T00:00:00.000Z";
const future = "2027-08-22T00:00:00.000Z";
const past = "2026-01-01T00:00:00.000Z";

function sourceRef(sourceId, sourceType = propertySourceTypes.localFixture) {
  return {
    sourceType,
    sourceName: "phase_23a_local_fixture",
    sourceId,
    observedAt: now,
    confidence: "HIGH",
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.partiallyVerified
  };
}

function evidenceRef(refId, refType = "AuthorityEvidence") {
  return { refType, refId, sourceBacked: true };
}

const actors = {
  ownerAlice: createActorIdentity({
    actorId: "actor_owner_alice",
    displayName: "Owner Alice",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_owner_alice", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_owner_alice")],
    createdAt: now,
    updatedAt: now
  }),
  developerDana: createActorIdentity({
    actorId: "actor_developer_dana",
    displayName: "Developer Dana",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_developer_dana", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_developer_dana")],
    createdAt: now,
    updatedAt: now
  }),
  agentBob: createActorIdentity({
    actorId: "actor_agent_bob",
    displayName: "Agent Bob",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_agent_bob", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_agent_bob")],
    createdAt: now,
    updatedAt: now
  }),
  managerCarol: createActorIdentity({
    actorId: "actor_manager_carol",
    displayName: "Manager Carol",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_manager_carol", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_manager_carol")],
    createdAt: now,
    updatedAt: now
  }),
  cleanerChris: createActorIdentity({
    actorId: "actor_cleaner_chris",
    displayName: "Cleaner Chris",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_cleaner_chris", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_cleaner_chris")],
    createdAt: now,
    updatedAt: now
  }),
  multiMia: createActorIdentity({
    actorId: "actor_multi_mia",
    displayName: "Multi-Relationship Mia",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_multi_mia", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_multi_mia")],
    createdAt: now,
    updatedAt: now
  }),
  reviewerPaul: createActorIdentity({
    actorId: "reviewer_property_001",
    displayName: "Reviewer Paul",
    identityStatus: propertyActorIdentityStatuses.verifiedLocalProof,
    identityEvidenceRefs: [evidenceRef("identity_ref_reviewer_paul", "IdentityLocalProof")],
    sourceRefs: [sourceRef("source_actor_reviewer_paul")],
    createdAt: now,
    updatedAt: now,
    auditMetadata: { reviewerRole: "PROPERTY_REVIEWER" }
  })
};

const publicDeveloperBusiness = createBusinessEntity({
  businessId: "business_batumi_green_builders",
  legalOrDisplayName: "Batumi Green Builders",
  businessType: "Developer",
  industry: "Real Estate",
  country: "Georgia",
  region: "Adjara",
  city: "Batumi",
  publicBusinessEmail: "info@example.invalid",
  sourceRefs: [sourceRef("source_public_business_developer")],
  verificationStatus: businessVerificationStatuses.reviewRequired,
  dataFreshness: leadFreshnessStates.current,
  createdAt: now,
  updatedAt: now
});

const organizations = {
  developerOrg: createOrganization({
    organizationId: "org_batumi_green_builders",
    organizationType: propertyOrganizationTypes.developer,
    displayName: "Batumi Green Builders",
    legalName: "Batumi Green Builders LLC",
    jurisdiction: "LOCAL_DEMO",
    country: "Georgia",
    businessEntityBridgeId: publicDeveloperBusiness.businessId,
    organizationStatus: propertyOrganizationStatuses.activeLocalProof,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    sourceRefs: [sourceRef("source_org_developer")],
    evidenceRefs: [evidenceRef("evidence_org_registration_developer")],
    createdAt: now,
    updatedAt: now
  }),
  agencyOrg: createOrganization({
    organizationId: "org_black_sea_agency",
    organizationType: propertyOrganizationTypes.realEstateAgency,
    displayName: "Black Sea Agency",
    jurisdiction: "LOCAL_DEMO",
    country: "Georgia",
    organizationStatus: propertyOrganizationStatuses.activeLocalProof,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    sourceRefs: [sourceRef("source_org_agency")],
    evidenceRefs: [evidenceRef("evidence_org_registration_agency")],
    createdAt: now,
    updatedAt: now
  }),
  managementOrg: createOrganization({
    organizationId: "org_batumi_property_management",
    organizationType: propertyOrganizationTypes.propertyManagementCompany,
    displayName: "Batumi Property Management",
    jurisdiction: "LOCAL_DEMO",
    country: "Georgia",
    organizationStatus: propertyOrganizationStatuses.activeLocalProof,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    sourceRefs: [sourceRef("source_org_management")],
    evidenceRefs: [evidenceRef("evidence_org_registration_management")],
    createdAt: now,
    updatedAt: now
  }),
  cleaningOrg: createOrganization({
    organizationId: "org_clean_batumi",
    organizationType: propertyOrganizationTypes.serviceProvider,
    displayName: "Clean Batumi",
    jurisdiction: "LOCAL_DEMO",
    country: "Georgia",
    organizationStatus: propertyOrganizationStatuses.activeLocalProof,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    sourceRefs: [sourceRef("source_org_cleaning")],
    evidenceRefs: [evidenceRef("evidence_org_registration_cleaning")],
    createdAt: now,
    updatedAt: now
  })
};

const businessEntityBridges = [
  createBusinessEntityOrganizationBridge({
    businessEntityId: publicDeveloperBusiness.businessId,
    organizationId: organizations.developerOrg.organizationId,
    bridgeStatus: businessEntityBridgeStatuses.linkedLocalProof,
    evidenceRefs: [evidenceRef("evidence_org_registration_developer")],
    sourceRefs: [sourceRef("source_public_business_developer")],
    createdAt: now,
    updatedAt: now
  })
];

const memberships = {
  developerDana: createOrganizationMembership({
    membershipId: "membership_dana_developer_sales",
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    membershipRole: propertyMembershipRoles.salesManager,
    membershipStatus: propertyMembershipStatuses.activeLocalProof,
    capabilityRefs: ["grant_dana_submit_developer"],
    authorityEvidenceRefs: [evidenceRef("evidence_developer_employment_authorization")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  agentBob: createOrganizationMembership({
    membershipId: "membership_bob_agency_agent",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    membershipRole: propertyMembershipRoles.agent,
    membershipStatus: propertyMembershipStatuses.activeLocalProof,
    capabilityRefs: ["grant_bob_submit_agency"],
    authorityEvidenceRefs: [evidenceRef("evidence_bob_agency_membership")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  managerCarol: createOrganizationMembership({
    membershipId: "membership_carol_management",
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    membershipRole: propertyMembershipRoles.propertyManager,
    membershipStatus: propertyMembershipStatuses.activeLocalProof,
    capabilityRefs: ["grant_carol_manage_property"],
    authorityEvidenceRefs: [evidenceRef("evidence_carol_management_membership")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  cleanerChris: createOrganizationMembership({
    membershipId: "membership_chris_cleaning",
    actorId: actors.cleanerChris.actorId,
    organizationId: organizations.cleaningOrg.organizationId,
    membershipRole: propertyMembershipRoles.employee,
    membershipStatus: propertyMembershipStatuses.activeLocalProof,
    capabilityRefs: ["grant_chris_service_provider"],
    authorityEvidenceRefs: [evidenceRef("evidence_chris_cleaning_membership")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  })
};

const capabilityGrants = {
  aliceSubmit: createActorCapabilityGrant({
    capabilityGrantId: "grant_alice_submit_property",
    actorId: actors.ownerAlice.actorId,
    capability: propertyActorCapabilities.submitPropertyData,
    scope: { actorId: actors.ownerAlice.actorId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("identity_ref_owner_alice")]
  }),
  aliceSale: createActorCapabilityGrant({
    capabilityGrantId: "grant_alice_sale_listing",
    actorId: actors.ownerAlice.actorId,
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { actorId: actors.ownerAlice.actorId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("identity_ref_owner_alice")]
  }),
  danaDeveloper: createActorCapabilityGrant({
    capabilityGrantId: "grant_dana_submit_developer",
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    capability: propertyActorCapabilities.submitPropertyData,
    scope: { organizationId: organizations.developerOrg.organizationId, projectId: "project_green_tower" },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_developer_employment_authorization")]
  }),
  bobAgency: createActorCapabilityGrant({
    capabilityGrantId: "grant_bob_submit_agency",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { organizationId: organizations.agencyOrg.organizationId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_bob_agency_membership")]
  }),
  carolManage: createActorCapabilityGrant({
    capabilityGrantId: "grant_carol_manage_property",
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    capability: propertyActorCapabilities.submitManagementRelationship,
    scope: { organizationId: organizations.managementOrg.organizationId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_carol_management_membership")]
  }),
  chrisService: createActorCapabilityGrant({
    capabilityGrantId: "grant_chris_service_provider",
    actorId: actors.cleanerChris.actorId,
    organizationId: organizations.cleaningOrg.organizationId,
    capability: propertyActorCapabilities.submitManagementRelationship,
    scope: { organizationId: organizations.cleaningOrg.organizationId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_chris_cleaning_membership")]
  }),
  miaSale: createActorCapabilityGrant({
    capabilityGrantId: "grant_mia_sale_listing",
    actorId: actors.multiMia.actorId,
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { actorId: actors.multiMia.actorId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("identity_ref_multi_mia")]
  })
};

const relationships = {
  aliceOwnerA: createPropertyRelationship({
    relationshipId: "rel_alice_owner_property_a",
    actorId: actors.ownerAlice.actorId,
    propertyId: "prop_phase23a_alice_apartment",
    relationshipType: propertyRelationshipTypes.owner,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_owner_claim_alice")],
    evidenceRefs: [evidenceRef("evidence_alice_ownership_doc")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  aliceClaimNoEvidence: createPropertyRelationship({
    relationshipId: "rel_alice_owner_claim_no_evidence",
    actorId: actors.ownerAlice.actorId,
    propertyCandidateRef: "candidate_alice_no_evidence",
    relationshipType: propertyRelationshipTypes.owner,
    relationshipStatus: propertyRelationshipStatuses.claimed,
    sourceRefs: [sourceRef("source_owner_claim_text_only", propertySourceTypes.ownerSubmission)],
    evidenceRefs: [],
    createdAt: now,
    updatedAt: now
  }),
  danaDeveloperProject: createPropertyRelationship({
    relationshipId: "rel_dana_developer_project",
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    propertyCandidateRef: "candidate_green_tower_inventory",
    relationshipType: propertyRelationshipTypes.developerRepresentative,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_developer_feed", propertySourceTypes.developerFeed)],
    evidenceRefs: [evidenceRef("evidence_developer_employment_authorization")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  bobAgentMandate: createPropertyRelationship({
    relationshipId: "rel_bob_agent_property_b",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    propertyId: "prop_phase23a_agency_sale",
    relationshipType: propertyRelationshipTypes.agencyRepresentative,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_agency_feed", propertySourceTypes.agencyFeed)],
    evidenceRefs: [evidenceRef("evidence_bob_listing_mandate")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  bobAgentNoMandate: createPropertyRelationship({
    relationshipId: "rel_bob_agent_property_no_mandate",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    propertyId: "prop_phase23a_no_mandate",
    relationshipType: propertyRelationshipTypes.agencyRepresentative,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_agency_feed_no_mandate", propertySourceTypes.agencyFeed)],
    evidenceRefs: [],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  carolManager: createPropertyRelationship({
    relationshipId: "rel_carol_manager_property_c",
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    propertyId: "prop_phase23a_managed_unit",
    relationshipType: propertyRelationshipTypes.propertyManager,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_management_agreement")],
    evidenceRefs: [evidenceRef("evidence_carol_management_authority")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  miaOwnerA: createPropertyRelationship({
    relationshipId: "rel_mia_owner_a",
    actorId: actors.multiMia.actorId,
    propertyId: "prop_mia_a",
    relationshipType: propertyRelationshipTypes.owner,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_mia_owner_a")],
    evidenceRefs: [evidenceRef("evidence_mia_owner_a")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  miaAgentB: createPropertyRelationship({
    relationshipId: "rel_mia_agent_b",
    actorId: actors.multiMia.actorId,
    propertyId: "prop_mia_b",
    relationshipType: propertyRelationshipTypes.agent,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_mia_agent_b", propertySourceTypes.agencyFeed)],
    evidenceRefs: [evidenceRef("evidence_mia_agent_b")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  }),
  miaBuyerC: createPropertyRelationship({
    relationshipId: "rel_mia_buyer_c",
    actorId: actors.multiMia.actorId,
    propertyId: "prop_mia_c",
    relationshipType: propertyRelationshipTypes.buyer,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_mia_buyer_c")],
    evidenceRefs: [evidenceRef("evidence_mia_buyer_c")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  })
};

const authorityEvidence = {
  aliceOwnership: createAuthorityEvidence({
    authorityEvidenceId: "evidence_alice_ownership_doc",
    evidenceType: propertyAuthorityEvidenceTypes.ownershipDocument,
    actorId: actors.ownerAlice.actorId,
    propertyId: "prop_phase23a_alice_apartment",
    authorityGrantId: "auth_alice_owner_sale",
    documentRef: "protected_doc_ref_alice_ownership",
    evidenceRef: "review_evidence_ref_alice_ownership",
    sourceRefs: [sourceRef("source_alice_ownership_doc")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["local fixture proof only"]
  }),
  developerAuthorization: createAuthorityEvidence({
    authorityEvidenceId: "evidence_developer_employment_authorization",
    evidenceType: propertyAuthorityEvidenceTypes.developerEmploymentAuthorization,
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    propertyCandidateRef: "candidate_green_tower_inventory",
    authorityGrantId: "auth_dana_developer_project",
    documentRef: "protected_doc_ref_developer_authorization",
    evidenceRef: "review_evidence_ref_developer_authorization",
    sourceRefs: [sourceRef("source_developer_authorization")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["scoped to project_green_tower/building_green_tower_a only"]
  }),
  bobMandate: createAuthorityEvidence({
    authorityEvidenceId: "evidence_bob_listing_mandate",
    evidenceType: propertyAuthorityEvidenceTypes.exclusiveMandate,
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    propertyId: "prop_phase23a_agency_sale",
    authorityGrantId: "auth_bob_agency_listing",
    documentRef: "protected_doc_ref_bob_mandate",
    evidenceRef: "review_evidence_ref_bob_mandate",
    sourceRefs: [sourceRef("source_bob_mandate")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["sale listing only"]
  }),
  carolManagement: createAuthorityEvidence({
    authorityEvidenceId: "evidence_carol_management_authority",
    evidenceType: propertyAuthorityEvidenceTypes.propertyManagementAgreement,
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    propertyId: "prop_phase23a_managed_unit",
    authorityGrantId: "auth_carol_management",
    documentRef: "protected_doc_ref_carol_management",
    evidenceRef: "review_evidence_ref_carol_management",
    sourceRefs: [sourceRef("source_carol_management")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["operational authority only"]
  }),
  miaOwnerA: createAuthorityEvidence({
    authorityEvidenceId: "evidence_mia_owner_a",
    evidenceType: propertyAuthorityEvidenceTypes.ownershipDocument,
    actorId: actors.multiMia.actorId,
    propertyId: "prop_mia_a",
    authorityGrantId: "auth_mia_owner_a",
    documentRef: "protected_doc_ref_mia_owner_a",
    evidenceRef: "review_evidence_ref_mia_owner_a",
    sourceRefs: [sourceRef("source_mia_owner_doc")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["property A only"]
  }),
  miaAgentB: createAuthorityEvidence({
    authorityEvidenceId: "evidence_mia_agent_b",
    evidenceType: propertyAuthorityEvidenceTypes.nonExclusiveMandate,
    actorId: actors.multiMia.actorId,
    propertyId: "prop_mia_b",
    authorityGrantId: "auth_mia_agent_b",
    documentRef: "protected_doc_ref_mia_agent_b",
    evidenceRef: "review_evidence_ref_mia_agent_b",
    sourceRefs: [sourceRef("source_mia_agent_mandate")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["property B listing only"]
  })
};

const authorityGrants = {
  aliceOwnerSale: createAuthorityGrant({
    authorityGrantId: "auth_alice_owner_sale",
    actorId: actors.ownerAlice.actorId,
    relationshipId: relationships.aliceOwnerA.relationshipId,
    propertyId: "prop_phase23a_alice_apartment",
    authorityType: propertyAuthorityTypes.ownerSelfAuthority,
    allowedActions: [propertyAuthorityActions.addProperty, propertyAuthorityActions.createSaleListing, propertyAuthorityActions.startSaleWorkflow],
    deniedActions: [],
    scope: { propertyId: "prop_phase23a_alice_apartment", allowedActions: [propertyAuthorityActions.addProperty, propertyAuthorityActions.createSaleListing, propertyAuthorityActions.startSaleWorkflow] },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_alice_ownership_doc")],
    documentLinks: [{ documentRef: "protected_doc_ref_alice_ownership", protected: true }],
    grantedByActorRef: actors.ownerAlice.actorId,
    createdAt: now,
    updatedAt: now
  }),
  danaDeveloperProject: createAuthorityGrant({
    authorityGrantId: "auth_dana_developer_project",
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    relationshipId: relationships.danaDeveloperProject.relationshipId,
    propertyCandidateRef: "candidate_green_tower_inventory",
    authorityType: propertyAuthorityTypes.developerRepresentativeAuthority,
    allowedActions: [propertyAuthorityActions.addProperty, propertyAuthorityActions.submitPropertyEvidence],
    deniedActions: [],
    scope: {
      projectId: "project_green_tower",
      buildingId: "building_green_tower_a",
      allowedActions: [propertyAuthorityActions.addProperty, propertyAuthorityActions.submitPropertyEvidence]
    },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_developer_employment_authorization")],
    documentLinks: [{ documentRef: "protected_doc_ref_developer_authorization", protected: true }],
    grantedByActorRef: "org_signatory_developer_fixture",
    createdAt: now,
    updatedAt: now
  }),
  bobAgencyListing: createAuthorityGrant({
    authorityGrantId: "auth_bob_agency_listing",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    relationshipId: relationships.bobAgentMandate.relationshipId,
    propertyId: "prop_phase23a_agency_sale",
    authorityType: propertyAuthorityTypes.agencyMandate,
    allowedActions: [propertyAuthorityActions.createSaleListing, propertyAuthorityActions.updatePrice, propertyAuthorityActions.promoteProperty],
    deniedActions: [],
    scope: { propertyId: "prop_phase23a_agency_sale", allowedActions: [propertyAuthorityActions.createSaleListing, propertyAuthorityActions.updatePrice, propertyAuthorityActions.promoteProperty] },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_bob_listing_mandate")],
    documentLinks: [{ documentRef: "protected_doc_ref_bob_mandate", protected: true }],
    grantedByActorRef: "owner_fixture_for_bob_mandate",
    createdAt: now,
    updatedAt: now
  }),
  carolManagement: createAuthorityGrant({
    authorityGrantId: "auth_carol_management",
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    relationshipId: relationships.carolManager.relationshipId,
    propertyId: "prop_phase23a_managed_unit",
    authorityType: propertyAuthorityTypes.propertyManagementAuthority,
    allowedActions: [
      propertyAuthorityActions.manageProperty,
      propertyAuthorityActions.updateAvailability,
      propertyAuthorityActions.requestCleaning,
      propertyAuthorityActions.requestMaintenance
    ],
    deniedActions: [propertyAuthorityActions.startSaleWorkflow, propertyAuthorityActions.createSaleListing],
    scope: {
      propertyId: "prop_phase23a_managed_unit",
      allowedActions: [
        propertyAuthorityActions.manageProperty,
        propertyAuthorityActions.updateAvailability,
        propertyAuthorityActions.requestCleaning,
        propertyAuthorityActions.requestMaintenance
      ]
    },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_carol_management_authority")],
    documentLinks: [{ documentRef: "protected_doc_ref_carol_management", protected: true }],
    grantedByActorRef: "owner_fixture_for_carol_management",
    createdAt: now,
    updatedAt: now
  }),
  miaOwnerA: createAuthorityGrant({
    authorityGrantId: "auth_mia_owner_a",
    actorId: actors.multiMia.actorId,
    relationshipId: relationships.miaOwnerA.relationshipId,
    propertyId: "prop_mia_a",
    authorityType: propertyAuthorityTypes.ownerSelfAuthority,
    allowedActions: [propertyAuthorityActions.createSaleListing],
    deniedActions: [],
    scope: { propertyId: "prop_mia_a", allowedActions: [propertyAuthorityActions.createSaleListing] },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_mia_owner_a")],
    documentLinks: [{ documentRef: "protected_doc_ref_mia_owner_a", protected: true }],
    createdAt: now,
    updatedAt: now
  }),
  miaAgentB: createAuthorityGrant({
    authorityGrantId: "auth_mia_agent_b",
    actorId: actors.multiMia.actorId,
    relationshipId: relationships.miaAgentB.relationshipId,
    propertyId: "prop_mia_b",
    authorityType: propertyAuthorityTypes.agentMandate,
    allowedActions: [propertyAuthorityActions.createSaleListing],
    deniedActions: [],
    scope: { propertyId: "prop_mia_b", allowedActions: [propertyAuthorityActions.createSaleListing] },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("evidence_mia_agent_b")],
    documentLinks: [{ documentRef: "protected_doc_ref_mia_agent_b", protected: true }],
    createdAt: now,
    updatedAt: now
  })
};

const jurisdictionContexts = [
  createJurisdictionAuthorityContext({
    jurisdiction: "LOCAL_DEMO",
    authorityType: propertyAuthorityTypes.ownerSelfAuthority,
    ruleStatus: jurisdictionAuthorityRuleStatuses.localDemo,
    requiredEvidenceTypes: [propertyAuthorityEvidenceTypes.ownershipDocument],
    professionalReviewRequired: true,
    limitations: ["local demo only; no country law encoded"],
    sourceRefs: [sourceRef("source_jurisdiction_local_demo")],
    verifiedAt: now
  }),
  createJurisdictionAuthorityContext({
    jurisdiction: "UNKNOWN",
    authorityType: null,
    ruleStatus: jurisdictionAuthorityRuleStatuses.unknown,
    requiredEvidenceTypes: [],
    professionalReviewRequired: true,
    limitations: ["jurisdiction rules unavailable; execution readiness blocked"],
    sourceRefs: [sourceRef("source_jurisdiction_unknown")],
    verifiedAt: null
  })
];

const intents = {
  ownerSale: createAddPropertyIntent({
    addPropertyIntentId: "intent_alice_owner_create_sale_listing",
    actorId: actors.ownerAlice.actorId,
    relationshipClaimId: relationships.aliceOwnerA.relationshipId,
    authorityGrantId: authorityGrants.aliceOwnerSale.authorityGrantId,
    propertyId: "prop_phase23a_alice_apartment",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    listingIntent: { listingType: "SALE" },
    sourceType: propertySourceTypes.ownerSubmission,
    evidenceRefs: [evidenceRef("evidence_alice_ownership_doc")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  ownerClaimNoEvidence: createAddPropertyIntent({
    addPropertyIntentId: "intent_alice_owner_claim_no_evidence",
    actorId: actors.ownerAlice.actorId,
    relationshipClaimId: relationships.aliceClaimNoEvidence.relationshipId,
    propertyCandidateRef: "candidate_alice_no_evidence",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.addProperty,
    sourceType: propertySourceTypes.ownerSubmission,
    evidenceRefs: [],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  developerInScope: createAddPropertyIntent({
    addPropertyIntentId: "intent_dana_developer_add_unit",
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    relationshipClaimId: relationships.danaDeveloperProject.relationshipId,
    authorityGrantId: authorityGrants.danaDeveloperProject.authorityGrantId,
    propertyCandidateRef: "candidate_green_tower_inventory",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.addProperty,
    sourceType: propertySourceTypes.developerFeed,
    projectId: "project_green_tower",
    buildingId: "building_green_tower_a",
    evidenceRefs: [evidenceRef("evidence_developer_employment_authorization")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  developerOutOfScope: createAddPropertyIntent({
    addPropertyIntentId: "intent_dana_developer_out_of_scope",
    actorId: actors.developerDana.actorId,
    organizationId: organizations.developerOrg.organizationId,
    relationshipClaimId: relationships.danaDeveloperProject.relationshipId,
    authorityGrantId: authorityGrants.danaDeveloperProject.authorityGrantId,
    propertyCandidateRef: "candidate_green_tower_inventory",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.addProperty,
    sourceType: propertySourceTypes.developerFeed,
    projectId: "project_other_tower",
    buildingId: "building_other",
    evidenceRefs: [evidenceRef("evidence_developer_employment_authorization")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  agentWithMandate: createAddPropertyIntent({
    addPropertyIntentId: "intent_bob_agency_listing",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    relationshipClaimId: relationships.bobAgentMandate.relationshipId,
    authorityGrantId: authorityGrants.bobAgencyListing.authorityGrantId,
    propertyId: "prop_phase23a_agency_sale",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    listingIntent: { listingType: "SALE" },
    sourceType: propertySourceTypes.agencyFeed,
    evidenceRefs: [evidenceRef("evidence_bob_listing_mandate")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  agentWithoutMandate: createAddPropertyIntent({
    addPropertyIntentId: "intent_bob_no_mandate",
    actorId: actors.agentBob.actorId,
    organizationId: organizations.agencyOrg.organizationId,
    relationshipClaimId: relationships.bobAgentNoMandate.relationshipId,
    propertyId: "prop_phase23a_no_mandate",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    listingIntent: { listingType: "SALE" },
    sourceType: propertySourceTypes.agencyFeed,
    evidenceRefs: [],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  managerOperational: createAddPropertyIntent({
    addPropertyIntentId: "intent_carol_request_cleaning",
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    relationshipClaimId: relationships.carolManager.relationshipId,
    authorityGrantId: authorityGrants.carolManagement.authorityGrantId,
    propertyId: "prop_phase23a_managed_unit",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.requestCleaning,
    sourceType: propertySourceTypes.partnerFeed,
    evidenceRefs: [evidenceRef("evidence_carol_management_authority")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  managerSaleAttempt: createAddPropertyIntent({
    addPropertyIntentId: "intent_carol_sale_attempt",
    actorId: actors.managerCarol.actorId,
    organizationId: organizations.managementOrg.organizationId,
    relationshipClaimId: relationships.carolManager.relationshipId,
    authorityGrantId: authorityGrants.carolManagement.authorityGrantId,
    propertyId: "prop_phase23a_managed_unit",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.partnerFeed,
    evidenceRefs: [evidenceRef("evidence_carol_management_authority")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  cleaningCompanySaleAttempt: createAddPropertyIntent({
    addPropertyIntentId: "intent_cleaning_company_sale_attempt",
    actorId: actors.cleanerChris.actorId,
    organizationId: organizations.cleaningOrg.organizationId,
    relationshipClaimId: "rel_cleaning_company_service_only",
    propertyId: "prop_phase23a_managed_unit",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.partnerFeed,
    evidenceRefs: [evidenceRef("evidence_chris_cleaning_membership")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  miaOwnerA: createAddPropertyIntent({
    addPropertyIntentId: "intent_mia_owner_a_sale",
    actorId: actors.multiMia.actorId,
    relationshipClaimId: relationships.miaOwnerA.relationshipId,
    authorityGrantId: authorityGrants.miaOwnerA.authorityGrantId,
    propertyId: "prop_mia_a",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.ownerSubmission,
    evidenceRefs: [evidenceRef("evidence_mia_owner_a")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  miaAgentB: createAddPropertyIntent({
    addPropertyIntentId: "intent_mia_agent_b_sale",
    actorId: actors.multiMia.actorId,
    relationshipClaimId: relationships.miaAgentB.relationshipId,
    authorityGrantId: authorityGrants.miaAgentB.authorityGrantId,
    propertyId: "prop_mia_b",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.agencyFeed,
    evidenceRefs: [evidenceRef("evidence_mia_agent_b")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  miaBuyerC: createAddPropertyIntent({
    addPropertyIntentId: "intent_mia_buyer_c_sale_attempt",
    actorId: actors.multiMia.actorId,
    relationshipClaimId: relationships.miaBuyerC.relationshipId,
    propertyId: "prop_mia_c",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.ownerSubmission,
    evidenceRefs: [evidenceRef("evidence_mia_buyer_c")],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  }),
  reviewerRoleAttempt: createAddPropertyIntent({
    addPropertyIntentId: "intent_reviewer_role_attempt",
    actorId: actors.reviewerPaul.actorId,
    relationshipClaimId: "rel_reviewer_attempt",
    propertyId: "prop_phase23a_alice_apartment",
    propertyType: "APARTMENT_UNIT",
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.manualAdminEntry,
    evidenceRefs: [],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  })
};

export function buildPropertyActorAuthorityFixtureSet() {
  return {
    now,
    publicBusinessEntities: [publicDeveloperBusiness],
    actors: Object.values(actors),
    organizations: Object.values(organizations),
    businessEntityBridges,
    memberships: Object.values(memberships),
    capabilityGrants: Object.values(capabilityGrants),
    relationships: Object.values(relationships),
    authorityGrants: Object.values(authorityGrants),
    authorityEvidence: Object.values(authorityEvidence),
    jurisdictionContexts,
    intents,
    sourceOnlyIntents: {
      ownerSubmissionOnly: { ...intents.ownerClaimNoEvidence, relationshipClaimId: "missing_owner_submission_relationship", sourceType: propertySourceTypes.ownerSubmission },
      agencyFeedOnly: { ...intents.agentWithoutMandate, relationshipClaimId: "missing_agency_feed_relationship", authorityGrantId: null, sourceType: propertySourceTypes.agencyFeed },
      developerFeedOnly: { ...intents.developerInScope, relationshipClaimId: "missing_developer_feed_relationship", authorityGrantId: null, sourceType: propertySourceTypes.developerFeed }
    },
    sideEffectCounters: {
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
    }
  };
}

export function buildAuthorityWithStatus(baseAuthority, status, overrides = {}) {
  return createAuthorityGrant({
    ...baseAuthority,
    status,
    ...overrides
  });
}

export function buildMembershipWithStatus(baseMembership, status, overrides = {}) {
  return createOrganizationMembership({
    ...baseMembership,
    membershipId: `${baseMembership.membershipId}_${String(status).toLowerCase()}`,
    membershipStatus: status,
    ...overrides
  });
}
