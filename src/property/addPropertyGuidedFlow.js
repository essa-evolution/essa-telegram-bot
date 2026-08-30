import {
  createAddPropertyReviewPipelineBridge,
  createActorCapabilityGrant,
  createAddPropertyIntent,
  createAuthorityEvidence,
  createAuthorityGrant,
  createLisaAddPropertyAuthorityExplanation,
  createNavigatorAddPropertyRoutingReadiness,
  createPropertyRelationship,
  validateAddPropertyIntentEligibility
} from "./propertyActorAuthority.js";
import {
  addPropertyEligibilityStatuses,
  propertyActorCapabilities,
  propertyAuthorityActions,
  propertyAuthorityEvidenceTypes,
  propertyAuthorityStatuses,
  propertyAuthorityTypes,
  propertyCapabilityGrantStatuses,
  propertyRelationshipStatuses,
  propertyRelationshipTypes
} from "./propertyActorAuthorityContracts.js";
import {
  buildPropertyActorAuthorityFixtureSet
} from "./propertyActorAuthorityFixtures.js";
import {
  propertyFreshnessStatuses,
  propertyVerificationStatuses
} from "./propertyContracts.js";
import { propertySourceTypes } from "./propertyIngestionContracts.js";

export const addPropertyRouteHash = "#add-property";

export const addPropertyFlowTypes = {
  owner: "owner",
  developer: "developer",
  agent: "agent",
  manager: "manager",
  authorizedRepresentative: "authorized_representative",
  serviceProvider: "service_provider",
  unsure: "unsure"
};

export const addPropertyReadinessStatuses = {
  readyForLocalReview: "READY_FOR_LOCAL_REVIEW",
  evidenceRequired: "EVIDENCE_REQUIRED",
  membershipRequired: "MEMBERSHIP_REQUIRED",
  authorityRequired: "AUTHORITY_REQUIRED",
  relationshipRequired: "RELATIONSHIP_REQUIRED",
  propertyIdentificationRequired: "PROPERTY_IDENTIFICATION_REQUIRED",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED",
  blockedScope: "BLOCKED_SCOPE",
  blocked: "BLOCKED",
  notActiveYet: "NOT_ACTIVE_YET"
};

export const addPropertyStepIds = [
  "about_you",
  "organization",
  "property_relationship",
  "property",
  "intent",
  "authority",
  "evidence",
  "review_readiness"
];

export const addPropertyPropertyCandidateTypes = {
  apartmentUnit: "APARTMENT_UNIT",
  house: "HOUSE",
  villa: "VILLA",
  land: "LAND",
  commercialProperty: "COMMERCIAL_PROPERTY",
  hotel: "HOTEL",
  building: "BUILDING",
  developmentProject: "DEVELOPMENT_PROJECT",
  unitInventory: "UNIT_INVENTORY",
  investmentProperty: "INVESTMENT_PROPERTY",
  otherStructured: "OTHER_STRUCTURED",
  unknown: "UNKNOWN"
};

export const addPropertyIntendedActions = {
  addProperty: propertyAuthorityActions.addProperty,
  claimExistingProperty: propertyAuthorityActions.claimExistingProperty,
  createSaleListingReadiness: propertyAuthorityActions.createSaleListing,
  createLongTermRentListingReadiness: propertyAuthorityActions.createLongTermRentListing,
  createStayListingReadiness: propertyAuthorityActions.createStayListing,
  managePropertyReadiness: propertyAuthorityActions.manageProperty,
  promotePropertyReadiness: propertyAuthorityActions.promoteProperty,
  submitDeveloperProjectReadiness: propertyAuthorityActions.addProperty,
  submitAgencyListingReadiness: propertyAuthorityActions.createSaleListing
};

export const addPropertySideEffectCounters = {
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

const now = "2026-08-22T00:00:00.000Z";
const future = "2027-08-22T00:00:00.000Z";
const past = "2026-01-01T00:00:00.000Z";

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sourceRef(sourceId, sourceType = propertySourceTypes.localFixture) {
  return {
    sourceType,
    sourceName: "phase_23b_guided_add_property",
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

function idOf(item, key) {
  return item?.[key] || null;
}

function findBy(items, key, value) {
  return (items || []).find((item) => item?.[key] === value) || null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function baseFixtureSet() {
  return buildPropertyActorAuthorityFixtureSet();
}

function createOwnerNewCandidateScenario(fixtures) {
  const actor = findBy(fixtures.actors, "actorId", "actor_owner_alice");
  const relationship = createPropertyRelationship({
    relationshipId: "rel_23b_alice_owner_candidate",
    actorId: actor.actorId,
    propertyCandidateRef: "candidate_23b_owner_apartment_sell",
    relationshipType: propertyRelationshipTypes.owner,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_23b_owner_candidate", propertySourceTypes.ownerSubmission)],
    evidenceRefs: [evidenceRef("evidence_23b_alice_owner_candidate")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  });
  const capability = createActorCapabilityGrant({
    capabilityGrantId: "grant_23b_alice_candidate_sale",
    actorId: actor.actorId,
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { actorId: actor.actorId, propertyCandidateRef: "candidate_23b_owner_apartment_sell" },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef("identity_ref_owner_alice")]
  });
  const evidence = createAuthorityEvidence({
    authorityEvidenceId: "evidence_23b_alice_owner_candidate",
    evidenceType: propertyAuthorityEvidenceTypes.ownershipDocument,
    actorId: actor.actorId,
    propertyCandidateRef: "candidate_23b_owner_apartment_sell",
    authorityGrantId: "auth_23b_alice_owner_candidate_sale",
    documentRef: "protected_doc_ref_23b_alice_owner_candidate",
    evidenceRef: "review_evidence_ref_23b_alice_owner_candidate",
    sourceRefs: [sourceRef("source_23b_alice_owner_document")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    limitations: ["local guided intake proof only"]
  });
  const authority = createAuthorityGrant({
    authorityGrantId: "auth_23b_alice_owner_candidate_sale",
    actorId: actor.actorId,
    relationshipId: relationship.relationshipId,
    propertyCandidateRef: "candidate_23b_owner_apartment_sell",
    authorityType: propertyAuthorityTypes.ownerSelfAuthority,
    allowedActions: [propertyAuthorityActions.createSaleListing],
    deniedActions: [],
    scope: {
      propertyCandidateRef: "candidate_23b_owner_apartment_sell",
      allowedActions: [propertyAuthorityActions.createSaleListing]
    },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef(evidence.authorityEvidenceId)],
    documentLinks: [{ documentRef: evidence.documentRef, protected: true }],
    grantedByActorRef: actor.actorId,
    createdAt: now,
    updatedAt: now
  });
  const intent = createAddPropertyIntent({
    addPropertyIntentId: "intent_23b_owner_candidate_sale",
    actorId: actor.actorId,
    relationshipClaimId: relationship.relationshipId,
    authorityGrantId: authority.authorityGrantId,
    propertyCandidateRef: "candidate_23b_owner_apartment_sell",
    propertyType: addPropertyPropertyCandidateTypes.apartmentUnit,
    intendedAction: propertyAuthorityActions.createSaleListing,
    listingIntent: { listingType: "SALE", readinessOnly: true },
    sourceType: propertySourceTypes.ownerSubmission,
    evidenceRefs: [evidenceRef(evidence.authorityEvidenceId)],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  });

  return {
    fixtures: {
      ...fixtures,
      relationships: [...fixtures.relationships, relationship],
      capabilityGrants: [...fixtures.capabilityGrants, capability],
      authorityEvidence: [...fixtures.authorityEvidence, evidence],
      authorityGrants: [...fixtures.authorityGrants, authority]
    },
    intent,
    propertyCandidate: createPropertyCandidate({
      propertyCandidateRef: "candidate_23b_owner_apartment_sell",
      country: "Georgia",
      region: "Adjara",
      city: "Batumi",
      locationDescription: "Owner-declared apartment candidate",
      propertyType: addPropertyPropertyCandidateTypes.apartmentUnit,
      area: 64,
      bedrooms: 2
    })
  };
}

function createOwnerMissingEvidenceScenario(fixtures) {
  const actor = findBy(fixtures.actors, "actorId", "actor_owner_alice");
  const relationship = createPropertyRelationship({
    relationshipId: "rel_23b_alice_owner_no_evidence",
    actorId: actor.actorId,
    propertyCandidateRef: "candidate_23b_owner_missing_evidence",
    relationshipType: propertyRelationshipTypes.owner,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_23b_owner_claim_only", propertySourceTypes.ownerSubmission)],
    evidenceRefs: [],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  });
  const capability = createActorCapabilityGrant({
    capabilityGrantId: "grant_23b_alice_missing_evidence_sale",
    actorId: actor.actorId,
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { actorId: actor.actorId },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future
  });
  const authority = createAuthorityGrant({
    authorityGrantId: "auth_23b_alice_owner_missing_evidence",
    actorId: actor.actorId,
    relationshipId: relationship.relationshipId,
    propertyCandidateRef: "candidate_23b_owner_missing_evidence",
    authorityType: propertyAuthorityTypes.ownerSelfAuthority,
    allowedActions: [propertyAuthorityActions.createSaleListing],
    deniedActions: [],
    scope: {
      propertyCandidateRef: "candidate_23b_owner_missing_evidence",
      allowedActions: [propertyAuthorityActions.createSaleListing]
    },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [],
    createdAt: now,
    updatedAt: now
  });
  const intent = createAddPropertyIntent({
    addPropertyIntentId: "intent_23b_owner_missing_evidence",
    actorId: actor.actorId,
    relationshipClaimId: relationship.relationshipId,
    authorityGrantId: authority.authorityGrantId,
    propertyCandidateRef: "candidate_23b_owner_missing_evidence",
    propertyType: addPropertyPropertyCandidateTypes.apartmentUnit,
    intendedAction: propertyAuthorityActions.createSaleListing,
    listingIntent: { listingType: "SALE", readinessOnly: true },
    sourceType: propertySourceTypes.ownerSubmission,
    evidenceRefs: [],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  });

  return {
    fixtures: {
      ...fixtures,
      relationships: [...fixtures.relationships, relationship],
      capabilityGrants: [...fixtures.capabilityGrants, capability],
      authorityGrants: [...fixtures.authorityGrants, authority]
    },
    intent,
    propertyCandidate: createPropertyCandidate({
      propertyCandidateRef: "candidate_23b_owner_missing_evidence",
      country: "Georgia",
      city: "Batumi",
      propertyType: addPropertyPropertyCandidateTypes.apartmentUnit
    })
  };
}

function createRepresentativeScenario(fixtures) {
  const actor = findBy(fixtures.actors, "actorId", "actor_agent_bob");
  const relationship = createPropertyRelationship({
    relationshipId: "rel_23b_bob_authorized_representative",
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    propertyId: "prop_phase23b_represented_property",
    relationshipType: propertyRelationshipTypes.authorizedRepresentative,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: [sourceRef("source_23b_representative_claim")],
    evidenceRefs: [evidenceRef("evidence_23b_power_of_attorney")],
    validFrom: past,
    validUntil: future,
    createdAt: now,
    updatedAt: now
  });
  const capability = createActorCapabilityGrant({
    capabilityGrantId: "grant_23b_bob_representative_sale",
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { propertyId: "prop_phase23b_represented_property" },
    status: propertyCapabilityGrantStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future
  });
  const evidence = createAuthorityEvidence({
    authorityEvidenceId: "evidence_23b_power_of_attorney",
    evidenceType: propertyAuthorityEvidenceTypes.powerOfAttorney,
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    propertyId: "prop_phase23b_represented_property",
    authorityGrantId: "auth_23b_bob_power_of_attorney",
    documentRef: "protected_doc_ref_23b_power_of_attorney",
    evidenceRef: "review_evidence_ref_23b_power_of_attorney",
    sourceRefs: [sourceRef("source_23b_power_of_attorney")],
    declaredAt: now,
    validFrom: past,
    validUntil: future,
    verificationStatus: propertyVerificationStatuses.partiallyVerified,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "UNKNOWN",
    limitations: ["legal sufficiency not verified"]
  });
  const authority = createAuthorityGrant({
    authorityGrantId: "auth_23b_bob_power_of_attorney",
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    relationshipId: relationship.relationshipId,
    propertyId: "prop_phase23b_represented_property",
    authorityType: propertyAuthorityTypes.powerOfAttorney,
    allowedActions: [propertyAuthorityActions.createSaleListing, propertyAuthorityActions.manageProperty],
    deniedActions: [],
    scope: {
      propertyId: "prop_phase23b_represented_property",
      allowedActions: [propertyAuthorityActions.createSaleListing, propertyAuthorityActions.manageProperty]
    },
    jurisdiction: "UNKNOWN",
    status: propertyAuthorityStatuses.activeLocalProof,
    validFrom: past,
    validUntil: future,
    evidenceRefs: [evidenceRef(evidence.authorityEvidenceId)],
    documentLinks: [{ documentRef: evidence.documentRef, protected: true }],
    createdAt: now,
    updatedAt: now
  });
  const intent = createAddPropertyIntent({
    addPropertyIntentId: "intent_23b_authorized_representative",
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    relationshipClaimId: relationship.relationshipId,
    authorityGrantId: authority.authorityGrantId,
    propertyId: "prop_phase23b_represented_property",
    propertyType: addPropertyPropertyCandidateTypes.house,
    intendedAction: propertyAuthorityActions.createSaleListing,
    sourceType: propertySourceTypes.manualAdminEntry,
    evidenceRefs: [evidenceRef(evidence.authorityEvidenceId)],
    workflowStatus: "INTENT_READY",
    createdAt: now,
    updatedAt: now
  });

  return {
    fixtures: {
      ...fixtures,
      relationships: [...fixtures.relationships, relationship],
      capabilityGrants: [...fixtures.capabilityGrants, capability],
      authorityEvidence: [...fixtures.authorityEvidence, evidence],
      authorityGrants: [...fixtures.authorityGrants, authority]
    },
    intent,
    propertyCandidate: null
  };
}

export function createPropertyCandidate(input = {}) {
  const type = Object.values(addPropertyPropertyCandidateTypes).includes(input.propertyType)
    ? input.propertyType
    : addPropertyPropertyCandidateTypes.unknown;
  return {
    modelType: "AddPropertyCandidateReference",
    propertyCandidateRef: input.propertyCandidateRef || `candidate_${Date.now()}`,
    existingPropertyResolution: input.existingPropertyResolution || "NEW_CANDIDATE_LOCAL_ONLY",
    country: input.country || null,
    region: input.region || null,
    city: input.city || null,
    address: input.address || null,
    locationDescription: input.locationDescription || null,
    cadastralOrRegistryRef: input.cadastralOrRegistryRef || null,
    project: input.project || null,
    building: input.building || null,
    unit: input.unit || null,
    propertyType: type,
    candidateTypeWarning: type === addPropertyPropertyCandidateTypes.unknown
      ? "Type is not canonical yet; kept as UNKNOWN instead of inventing a property type."
      : null,
    area: input.area ?? null,
    bedrooms: input.bedrooms ?? null,
    missingFields: [
      "country",
      "city",
      "propertyType"
    ].filter((field) => input[field] == null || input[field] === ""),
    canonicalPropertyCreated: false,
    listingCreated: false,
    ...addPropertySideEffectCounters
  };
}

export function parseAddPropertyHash(inputHash = addPropertyRouteHash) {
  const raw = inputHash || addPropertyRouteHash;
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const flow = params.get("flow") || "";
  const step = params.get("step") || "about_you";
  return {
    route: addPropertyRouteHash,
    flow: Object.values(addPropertyFlowTypes).includes(flow) ? flow : "",
    scenario: params.get("scenario") || "",
    step: addPropertyStepIds.includes(step) ? step : "about_you"
  };
}

export function buildAddPropertyHash({ flow = "", scenario = "", step = "about_you" } = {}) {
  const params = new URLSearchParams();
  if (flow) params.set("flow", flow);
  if (scenario) params.set("scenario", scenario);
  if (step && step !== "about_you") params.set("step", step);
  const query = params.toString();
  return query ? `${addPropertyRouteHash}?${query}` : addPropertyRouteHash;
}

export function createAddPropertyDraft(input = {}) {
  return {
    modelType: "AddPropertyDraft",
    draftId: input.draftId || `draft_add_property_${String(input.flow || "guided")}`,
    currentStep: input.currentStep || "about_you",
    actorRef: input.actorRef || null,
    orgRef: input.orgRef || null,
    relationshipRef: input.relationshipRef || null,
    propertyCandidateRef: input.propertyCandidateRef || null,
    authorityRef: input.authorityRef || null,
    intentRef: input.intentRef || null,
    evidenceRefs: clone(input.evidenceRefs || []),
    updatedAt: input.updatedAt || now,
    persistence: "LOCAL_IN_MEMORY_ONLY",
    ...addPropertySideEffectCounters
  };
}

function scenarioForRoute(route = {}) {
  const fixtures = baseFixtureSet();
  if (route.flow === addPropertyFlowTypes.owner && route.scenario !== "missing-evidence") {
    return { key: "owner_success", flow: route.flow, ...createOwnerNewCandidateScenario(fixtures) };
  }
  if (route.flow === addPropertyFlowTypes.owner && route.scenario === "missing-evidence") {
    return { key: "owner_missing_evidence", flow: route.flow, ...createOwnerMissingEvidenceScenario(fixtures) };
  }
  if (route.flow === addPropertyFlowTypes.developer && route.scenario === "out-of-scope") {
    return { key: "developer_out_of_scope", flow: route.flow, fixtures, intent: fixtures.intents.developerOutOfScope };
  }
  if (route.flow === addPropertyFlowTypes.developer) {
    return { key: "developer_in_scope", flow: route.flow, fixtures, intent: fixtures.intents.developerInScope };
  }
  if (route.flow === addPropertyFlowTypes.agent && route.scenario === "missing-mandate") {
    return { key: "agent_missing_mandate", flow: route.flow, fixtures, intent: fixtures.intents.agentWithoutMandate };
  }
  if (route.flow === addPropertyFlowTypes.agent) {
    return { key: "agent_with_mandate", flow: route.flow, fixtures, intent: fixtures.intents.agentWithMandate };
  }
  if (route.flow === addPropertyFlowTypes.manager && route.scenario === "sale") {
    return { key: "manager_sale_blocked", flow: route.flow, fixtures, intent: fixtures.intents.managerSaleAttempt };
  }
  if (route.flow === addPropertyFlowTypes.manager) {
    return { key: "manager_operational", flow: route.flow, fixtures, intent: fixtures.intents.managerOperational };
  }
  if (route.flow === addPropertyFlowTypes.authorizedRepresentative) {
    return { key: "authorized_representative", flow: route.flow, ...createRepresentativeScenario(fixtures) };
  }
  if (route.flow === addPropertyFlowTypes.serviceProvider) {
    return { key: "service_provider_separation", flow: route.flow, fixtures, intent: fixtures.intents.cleaningCompanySaleAttempt };
  }
  if (route.flow === addPropertyFlowTypes.unsure) {
    return { key: "unsure_guided", flow: route.flow, fixtures, intent: fixtures.intents.managerOperational };
  }
  return { key: "entry", flow: "", fixtures, intent: null };
}

function computeReadiness(eligibility, route = {}) {
  if (route.flow === addPropertyFlowTypes.serviceProvider) return addPropertyReadinessStatuses.notActiveYet;
  if (!eligibility) return addPropertyReadinessStatuses.blocked;
  if (eligibility.status === addPropertyEligibilityStatuses.readyForLocalReview) return addPropertyReadinessStatuses.readyForLocalReview;
  if (eligibility.status === addPropertyEligibilityStatuses.blockedEvidence) return addPropertyReadinessStatuses.evidenceRequired;
  if (eligibility.status === addPropertyEligibilityStatuses.blockedMembership) return addPropertyReadinessStatuses.membershipRequired;
  if (eligibility.status === addPropertyEligibilityStatuses.blockedRelationship) return addPropertyReadinessStatuses.relationshipRequired;
  if (eligibility.status === addPropertyEligibilityStatuses.blockedScope) return addPropertyReadinessStatuses.blockedScope;
  if (eligibility.status === addPropertyEligibilityStatuses.blockedJurisdiction) return addPropertyReadinessStatuses.jurisdictionReviewRequired;
  if ((eligibility.blockedReasons || []).some((reason) => reason.includes("authority"))) return addPropertyReadinessStatuses.authorityRequired;
  if ((eligibility.missingRequirements || []).includes("property_identification")) return addPropertyReadinessStatuses.propertyIdentificationRequired;
  return addPropertyReadinessStatuses.blocked;
}

function buildQuestionEngine(route = {}, context = {}) {
  const flow = route.flow || "";
  const action = context.intent?.intendedAction || "";
  const questionsByFlow = {
    [addPropertyFlowTypes.owner]: [
      "Are you acting personally or through an organization?",
      "Is this an existing ESSA Property or a new candidate?",
      action === propertyAuthorityActions.createSaleListing ? "What ownership evidence ref supports sale readiness?" : "What ownership evidence do you have?"
    ],
    [addPropertyFlowTypes.developer]: [
      "Which developer organization do you represent?",
      "What is your role in that organization?",
      "Which project, building, phase or unit inventory is in scope?",
      "What developer authority evidence supports this submission?"
    ],
    [addPropertyFlowTypes.agent]: [
      "Are you independent or part of an agency?",
      "Which agency and membership proof apply?",
      "Who authorized you to represent this Property?",
      "What mandate/evidence and allowed actions are in scope?"
    ],
    [addPropertyFlowTypes.manager]: [
      "Are you an individual manager or company representative?",
      "Which Property is under management?",
      "Which operational actions are included?",
      "Is sale authority separate and present?"
    ],
    [addPropertyFlowTypes.authorizedRepresentative]: [
      "Who are you representing?",
      "What authority instrument exists?",
      "What validity period and jurisdiction apply?",
      "Which actions are permitted?"
    ],
    [addPropertyFlowTypes.serviceProvider]: [
      "Are you providing services rather than representing the Property?",
      "Do you need the future ESSA Partner Marketplace path?"
    ],
    [addPropertyFlowTypes.unsure]: [
      "Is the Property yours?",
      "Are you acting for a company?",
      "Did the owner authorize you?",
      "Are you managing, selling/renting, or providing a service?"
    ]
  };

  return {
    modelType: "AddPropertyAuthorityQuestionEngine",
    flow,
    selectedQuestions: questionsByFlow[flow] || [],
    deterministic: true,
    providerCalls: 0,
    externalCalls: 0
  };
}

function evidenceSummary(eligibility = {}) {
  const refs = new Set((eligibility.intent?.evidenceRefs || []).map((ref) => ref.refId || ref.evidenceRef || ref));
  return safeArray(eligibility.authorityGrant ? [eligibility.authorityGrant] : [])
    .flatMap((authority) => safeArray(authority.evidenceRefs).map((ref) => ref.refId || ref.evidenceRef || ref))
    .concat([...refs])
    .filter(Boolean)
    .map((refId) => ({
      evidenceRef: refId,
      evidenceType: "AUTHORITY_EVIDENCE_REF",
      verificationState: "REVIEW_REQUIRED",
      freshness: propertyFreshnessStatuses.current,
      validity: "LOCAL_PROOF_ONLY",
      protected: true,
      privateDocumentContentRendered: false
    }));
}

function buildMissingRequirements(eligibility = {}, readinessStatus) {
  const blocked = new Set(eligibility.blockedReasons || []);
  const missing = new Set(eligibility.missingRequirements || []);
  return {
    known: [
      eligibility.actor ? `Actor: ${eligibility.actor.displayName}` : null,
      eligibility.organization ? `Organization: ${eligibility.organization.displayName}` : "Organization: personal/no organization",
      eligibility.relationship ? `Relationship: ${eligibility.relationship.relationshipType}` : null,
      eligibility.intent?.intendedAction ? `Intent: ${eligibility.intent.intendedAction}` : null
    ].filter(Boolean),
    claimed: [
      eligibility.relationship?.relationshipType || "No verified relationship claim selected"
    ],
    evidenceProvided: evidenceSummary(eligibility),
    evidenceMissing: [...blocked].filter((reason) => reason.includes("evidence")),
    authorityActiveLocalProof: eligibility.authorityExplanation?.authorizedLocalProof === true,
    authorityReviewRequired: true,
    scopeBlocked: [...blocked].some((reason) => reason.includes("scope") || reason.includes("action")),
    jurisdictionUnknown: eligibility.authorityExplanation?.jurisdictionStatus === "UNKNOWN",
    notActiveYet: readinessStatus === addPropertyReadinessStatuses.notActiveYet,
    missing: [...missing, ...blocked].filter(Boolean)
  };
}

function buildProgress(route = {}, readinessStatus) {
  const skipOrganization = route.flow === addPropertyFlowTypes.owner;
  const terminalIndex = readinessStatus === addPropertyReadinessStatuses.readyForLocalReview
    ? addPropertyStepIds.length - 1
    : Math.max(0, addPropertyStepIds.indexOf(route.step || "about_you"));
  return addPropertyStepIds
    .filter((step) => !(skipOrganization && step === "organization"))
    .map((step, index) => ({
      step,
      label: {
        about_you: "About You",
        organization: "Organization",
        property_relationship: "Property Relationship",
        property: "Property",
        intent: "Intent",
        authority: "Authority",
        evidence: "Evidence",
        review_readiness: "Review Readiness"
      }[step],
      status: index <= terminalIndex ? "VISIBLE_LOCAL_STEP" : "PENDING",
      current: step === route.step
    }));
}

function buildLisaExplanation(route = {}, readinessStatus, eligibility = null) {
  if (route.flow === addPropertyFlowTypes.serviceProvider) {
    return "Service Provider onboarding is separate from Property ownership or representation. ESSA can prepare a future Partner Marketplace path, but it does not grant Property authority.";
  }
  if (route.flow === addPropertyFlowTypes.unsure) {
    return "Suggested path: Property Manager / Authorized Representative. Suggested path is not verified authority; ESSA still needs relationship, mandate/evidence, scope and review.";
  }
  const base = createLisaAddPropertyAuthorityExplanation(eligibility || {});
  if (readinessStatus === addPropertyReadinessStatuses.evidenceRequired) {
    return "Evidence is required because a claim alone does not prove ownership, mandate or scope. Lisa can explain the missing proof but cannot verify ownership.";
  }
  if (readinessStatus === addPropertyReadinessStatuses.authorityRequired) {
    return "Membership or role declaration is not enough. ESSA needs a local authority grant or mandate evidence before review readiness.";
  }
  if (readinessStatus === addPropertyReadinessStatuses.blockedScope) {
    return "Authority scope does not cover this Property, action, project, building or time. Management authority does not imply sale authority.";
  }
  return base.explanation;
}

function buildNavigatorRouting(route = {}) {
  const intentByFlow = {
    [addPropertyFlowTypes.owner]: "I want to add a property",
    [addPropertyFlowTypes.developer]: "I represent a developer",
    [addPropertyFlowTypes.agent]: "I'm an agent and want to add a listing",
    [addPropertyFlowTypes.manager]: "I manage this apartment",
    [addPropertyFlowTypes.serviceProvider]: "I clean apartments",
    [addPropertyFlowTypes.unsure]: "I'm not sure how to add this property"
  };
  return createNavigatorAddPropertyRoutingReadiness({
    userIntent: intentByFlow[route.flow] || "I want to add a property"
  });
}

export function buildGuidedAddPropertyViewModel(routeInput = {}) {
  const route = typeof routeInput === "string" ? parseAddPropertyHash(routeInput) : { ...parseAddPropertyHash(), ...routeInput };
  const scenario = scenarioForRoute(route);
  const fixtures = scenario.fixtures;

  if (!scenario.intent) {
    return {
      modelType: "GuidedAddPropertyViewModel",
      route,
      mode: "entry",
      title: "ADD PROPERTY TO ESSA",
      entryMessage: "Tell ESSA what you want to add and in what capacity you are acting.",
      actorChoices: [
        { flow: addPropertyFlowTypes.owner, label: "I am the Owner" },
        { flow: addPropertyFlowTypes.developer, label: "I represent a Developer" },
        { flow: addPropertyFlowTypes.agent, label: "I am an Agent / Agency Representative" },
        { flow: addPropertyFlowTypes.manager, label: "I am a Property Manager" },
        { flow: addPropertyFlowTypes.authorizedRepresentative, label: "I am an Authorized Representative" },
        { flow: addPropertyFlowTypes.serviceProvider, label: "I am a Cleaning Company / Service Provider" },
        { flow: addPropertyFlowTypes.unsure, label: "I am not sure which role applies" }
      ],
      ...addPropertySideEffectCounters
    };
  }

  if (route.flow === addPropertyFlowTypes.serviceProvider) {
    return {
      modelType: "GuidedAddPropertyViewModel",
      route,
      mode: "guided",
      flow: route.flow,
      scenarioKey: scenario.key,
      title: "ADD PROPERTY TO ESSA",
      readinessStatus: addPropertyReadinessStatuses.notActiveYet,
      currentPath: {
        actor: "Cleaner Chris",
        organization: "Clean Batumi",
        relationship: "SERVICE_PROVIDER_PARTNER_FLOW_FUTURE",
        property: "No Property authority created",
        intent: "Service Provider Partner Marketplace readiness",
        authority: "No Property ownership/listing/management authority granted",
        evidence: [],
        missing: ["Service Provider onboarding is separate from Add Property authority"],
        nextStep: "SERVICE PROVIDER PARTNER FLOW - FUTURE"
      },
      serviceProviderMessage: "Service Provider onboarding is a separate ESSA Partner Marketplace flow.",
      futureMandate: buildFutureMandateReadiness("TEMPORARY_SERVICE_ACCESS_AUTHORIZATION"),
      questionEngine: buildQuestionEngine(route, scenario),
      lisaExplanation: buildLisaExplanation(route, addPropertyReadinessStatuses.notActiveYet),
      navigatorRouting: buildNavigatorRouting(route),
      progress: buildProgress(route, addPropertyReadinessStatuses.notActiveYet),
      draft: createAddPropertyDraft({ flow: route.flow, currentStep: route.step }),
      reviewHandoff: { readyForExistingReviewWorkflow: false, dispatchPerformed: false, duplicateReviewQueueCreated: false },
      ...addPropertySideEffectCounters
    };
  }

  const eligibility = validateAddPropertyIntentEligibility({
    intent: scenario.intent,
    actors: fixtures.actors,
    organizations: fixtures.organizations,
    memberships: fixtures.memberships,
    capabilityGrants: fixtures.capabilityGrants,
    relationships: fixtures.relationships,
    authorityGrants: fixtures.authorityGrants,
    authorityEvidence: fixtures.authorityEvidence,
    jurisdictionContexts: fixtures.jurisdictionContexts,
    timestamp: now
  });
  const readinessStatus = computeReadiness(eligibility, route);
  const missingRequirements = buildMissingRequirements(eligibility, readinessStatus);
  const reviewHandoff = createAddPropertyReviewPipelineBridge(eligibility);
  const propertyCandidate = scenario.propertyCandidate || createPropertyCandidate({
    propertyCandidateRef: scenario.intent.propertyCandidateRef || null,
    existingPropertyResolution: scenario.intent.propertyId ? "EXISTING_PROPERTY_LOCAL_LOOKUP" : "NEW_CANDIDATE_LOCAL_ONLY",
    propertyType: scenario.intent.propertyType,
    country: "Georgia",
    city: scenario.intent.propertyId ? null : "Batumi"
  });

  return {
    modelType: "GuidedAddPropertyViewModel",
    route,
    mode: "guided",
    flow: route.flow,
    scenarioKey: scenario.key,
    title: "ADD PROPERTY TO ESSA",
    entryMessage: "Tell ESSA what you want to add and in what capacity you are acting.",
    propertyTypes: Object.values(addPropertyPropertyCandidateTypes),
    intendedActions: Object.values(addPropertyIntendedActions),
    propertyResolutionOptions: ["KNOWN_PROPERTY_ID", "MAYBE_HELP_IDENTIFY", "NEW_CANDIDATE", "UNKNOWN"],
    intent: eligibility.intent,
    eligibility,
    readinessStatus,
    missingRequirements,
    currentPath: {
      actor: eligibility.actor?.displayName || eligibility.intent.actorId,
      organization: eligibility.organization?.displayName || "Personal / no organization",
      relationship: eligibility.relationship?.relationshipType || "Missing relationship",
      property: eligibility.intent.propertyId || eligibility.intent.propertyCandidateRef || "Missing property identification",
      project: eligibility.intent.projectId || null,
      building: eligibility.intent.buildingId || null,
      intent: eligibility.intent.intendedAction,
      authority: eligibility.authorityExplanation?.result || "NOT_AUTHORIZED",
      evidence: evidenceSummary(eligibility),
      missing: missingRequirements.missing,
      nextStep: readinessStatus === addPropertyReadinessStatuses.readyForLocalReview
        ? "Ready for ESSA review."
        : readinessStatus
    },
    propertyCandidate,
    authorityExplanation: eligibility.authorityExplanation,
    questionEngine: buildQuestionEngine(route, { intent: eligibility.intent }),
    lisaExplanation: buildLisaExplanation(route, readinessStatus, eligibility),
    lisaPrompts: [
      "Why do you need this document?",
      "Why isn't my agency membership enough?",
      "Can a property manager sell the property?",
      "What does authority scope mean?",
      "What happens after review?",
      "What if I don't have a mandate yet?",
      "Why does jurisdiction matter?"
    ],
    navigatorRouting: buildNavigatorRouting(route),
    progress: buildProgress(route, readinessStatus),
    draft: createAddPropertyDraft({
      flow: route.flow,
      currentStep: route.step,
      actorRef: eligibility.intent.actorId,
      orgRef: eligibility.intent.organizationId || null,
      relationshipRef: eligibility.intent.relationshipClaimId,
      propertyCandidateRef: eligibility.intent.propertyCandidateRef || null,
      authorityRef: eligibility.intent.authorityGrantId || null,
      intentRef: eligibility.intent.addPropertyIntentId,
      evidenceRefs: eligibility.intent.evidenceRefs
    }),
    reviewHandoff,
    reviewPreview: {
      ready: readinessStatus === addPropertyReadinessStatuses.readyForLocalReview,
      actorClaim: eligibility.actor?.displayName || eligibility.intent.actorId,
      organization: eligibility.organization?.displayName || null,
      relationship: eligibility.relationship?.relationshipType || null,
      intendedAction: eligibility.intent.intendedAction,
      authorityScope: eligibility.authorityGrant?.scope || null,
      evidenceRefs: evidenceSummary(eligibility),
      missingItems: missingRequirements.missing,
      jurisdictionStatus: eligibility.authorityExplanation?.jurisdictionStatus || "UNKNOWN",
      warnings: [
        "Preview only.",
        "No auto-approval.",
        "No listing, publication, provider call or execution."
      ]
    },
    futureMandate: buildFutureMandateReadiness(route.flow),
    publicSafeBoundary: {
      publicPassportEvidenceLeakage: false,
      privateActorIdentityExposed: false,
      privateMembershipEvidenceExposed: false,
      privateAuthorityEvidenceExposed: false
    },
    jurisdictionMessage: "ESSA can collect your claim and evidence, but legal sufficiency must be reviewed for this jurisdiction before real execution.",
    execution: {
      readyForLocalReviewDoesNotPublish: true,
      executionEligible: false
    },
    ...addPropertySideEffectCounters
  };
}

export function buildFutureMandateReadiness(flow = "") {
  const categoryByFlow = {
    [addPropertyFlowTypes.owner]: "Owner -> Agent Listing Mandate",
    [addPropertyFlowTypes.agent]: "Owner -> Agency Mandate",
    [addPropertyFlowTypes.manager]: "Owner -> Property Manager Agreement",
    [addPropertyFlowTypes.authorizedRepresentative]: "Owner -> Authorized Representative",
    [addPropertyFlowTypes.developer]: "Developer -> Employee/Representative Authority",
    TEMPORARY_SERVICE_ACCESS_AUTHORIZATION: "Temporary Service Access Authorization"
  };
  return {
    actionCode: "CREATE_OR_REQUEST_ESSA_MANDATE",
    label: "CREATE / REQUEST ESSA MANDATE",
    status: "NOT_ACTIVE_YET",
    enabled: false,
    category: categoryByFlow[flow] || "Other structured authority",
    legalDocumentGenerated: false,
    providerCalls: 0,
    externalCalls: 0
  };
}

export function createGuidedAddPropertyProductKnowledgeUpdate() {
  return {
    productId: "ESSA_PROPERTY",
    capabilityId: "PROPERTY_ADD_INTAKE",
    availableLocally: [
      "guided Add Property intake",
      "actor/organization/relationship declaration",
      "authority readiness checks",
      "evidence readiness",
      "review readiness",
      "Owner/Developer/Agent/Manager flows",
      "Lisa explanations",
      "Navigator routing"
    ],
    notActive: [
      "real identity verification",
      "real ownership verification",
      "legal mandate validation",
      "government registry",
      "real document signing",
      "real listing creation",
      "listing publication",
      "provider-backed verification",
      "production persistence",
      "payment",
      "booking",
      "transaction",
      "service ordering",
      "Stay execution"
    ],
    ...addPropertySideEffectCounters
  };
}

export function explainUnsureAddPropertyPath(answers = {}) {
  const service = String(answers.activity || "").toLowerCase().includes("clean");
  const owner = answers.propertyIsMine === true;
  const company = answers.actingForCompany === true;
  const ownerAuthorized = answers.ownerAuthorized === true;
  const managing = String(answers.activity || "").toLowerCase().includes("manage") ||
    String(answers.activity || "").toLowerCase().includes("booking");

  let suggestedFlow = addPropertyFlowTypes.unsure;
  if (owner) suggestedFlow = addPropertyFlowTypes.owner;
  else if (ownerAuthorized && managing) suggestedFlow = addPropertyFlowTypes.manager;
  else if (company && managing) suggestedFlow = addPropertyFlowTypes.manager;
  else if (service) suggestedFlow = addPropertyFlowTypes.serviceProvider;
  else if (company) suggestedFlow = addPropertyFlowTypes.developer;
  else if (ownerAuthorized) suggestedFlow = addPropertyFlowTypes.authorizedRepresentative;

  return {
    modelType: "AddPropertyUnsurePathSuggestion",
    suggestedFlow,
    verifiedAuthority: false,
    message: "Suggested path - authority not verified.",
    providerCalls: 0,
    externalCalls: 0
  };
}
