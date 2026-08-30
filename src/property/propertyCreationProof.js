import {
  createProperty,
  createPropertyFact,
  createPropertyLifecycleEvent,
  createPropertySourceRef,
  propertyConfidenceClasses,
  propertyFactStatuses,
  propertyFreshnessStatuses,
  propertyLifecycleEventTypes,
  propertyVerificationStatuses
} from "./propertyContracts.js";
import { createPropertyReadService } from "./propertyReadService.js";
import { buildGuidedAddPropertyViewModel } from "./addPropertyGuidedFlow.js";
import {
  createAuthorityGrant,
  createPropertyRelationship
} from "./propertyActorAuthority.js";
import {
  propertyAuthorityActions,
  propertyAuthorityStatuses,
  propertyAuthorityTypes,
  propertyRelationshipStatuses,
  propertyRelationshipTypes
} from "./propertyActorAuthorityContracts.js";
import { buildPropertyActorAuthorityFixtureSet } from "./propertyActorAuthorityFixtures.js";

const now = "2026-08-22T00:00:00.000Z";

export const propertyCreationActionTypes = {
  createCanonicalPropertyLocalProof: "CREATE_CANONICAL_PROPERTY_LOCAL_PROOF"
};

export const blockedPropertyCreationActions = [
  "CREATE_LISTING",
  "PUBLISH_LISTING",
  "CREATE_SALE_LISTING",
  "CREATE_RENT_LISTING",
  "CREATE_STAY_LISTING",
  "TRANSFER_OWNERSHIP",
  "ACTIVATE_PRODUCTION_PROPERTY",
  "WRITE_PRODUCTION_DB",
  "PAY",
  "BOOK",
  "START_TRANSACTION"
];

export const propertyCreationPreflightStatuses = {
  readyForApproval: "READY_FOR_APPROVAL",
  existingPropertyMatch: "EXISTING_PROPERTY_MATCH",
  blockedDuplicateReview: "BLOCKED_DUPLICATE_REVIEW",
  blockedIdentityConflict: "BLOCKED_IDENTITY_CONFLICT",
  blockedActor: "BLOCKED_ACTOR",
  blockedAddPropertyIntent: "BLOCKED_ADD_PROPERTY_INTENT",
  blockedCandidate: "BLOCKED_CANDIDATE",
  blockedRelationship: "BLOCKED_RELATIONSHIP",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedScope: "BLOCKED_SCOPE",
  blockedEvidence: "BLOCKED_EVIDENCE",
  blockedJurisdiction: "BLOCKED_JURISDICTION",
  blockedQuarantine: "BLOCKED_QUARANTINE",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH",
  blockedCandidateChanged: "BLOCKED_CANDIDATE_CHANGED"
};

export const propertyCreationApprovalStatuses = {
  pending: "PENDING_EXPLICIT_LOCAL_HUMAN_APPROVAL",
  approved: "APPROVED_BY_LOCAL_HUMAN",
  blocked: "APPROVAL_BLOCKED"
};

export const propertyCreationExecutionStatuses = {
  draft: "DRAFT",
  blocked: "BLOCKED",
  verified: "VERIFIED",
  failed: "FAILED",
  alreadyCreatedIdempotent: "ALREADY_CREATED_IDEMPOTENT",
  rolledBack: "ROLLED_BACK",
  rollbackBlocked: "ROLLBACK_BLOCKED"
};

export const propertyCreationIdentityOutcomes = {
  exactMatch: "EXACT_MATCH",
  probableMatchReviewRequired: "PROBABLE_MATCH_REVIEW_REQUIRED",
  noMatchNewPropertyCandidate: "NO_MATCH_NEW_PROPERTY_CANDIDATE",
  conflict: "CONFLICT"
};

export const propertyCreationAuditEvents = {
  intentCreated: "PROPERTY_CREATION_INTENT_CREATED",
  preflightPassed: "PROPERTY_CREATION_PREFLIGHT_PASSED",
  approvalGranted: "PROPERTY_CREATION_APPROVAL_GRANTED",
  started: "PROPERTY_CREATION_STARTED",
  propertyIdAssigned: "PROPERTY_ID_ASSIGNED_LOCAL_PROOF",
  created: "CANONICAL_PROPERTY_CREATED_LOCAL_PROOF",
  verified: "PROPERTY_CREATION_VERIFIED",
  failed: "PROPERTY_CREATION_FAILED",
  rollbackRequested: "PROPERTY_CREATION_ROLLBACK_REQUESTED",
  rolledBack: "PROPERTY_CREATION_ROLLED_BACK",
  rollbackBlocked: "PROPERTY_CREATION_ROLLBACK_BLOCKED"
};

export const propertyCreationLifecycleEvents = {
  propertyCreatedLocalProof: "PROPERTY_CREATED_LOCAL_PROOF",
  propertyIdAssigned: "PROPERTY_ID_ASSIGNED",
  sourceEvidenceLinked: "SOURCE_EVIDENCE_LINKED",
  relationshipLinkedLocalProof: "PROPERTY_RELATIONSHIP_LINKED_LOCAL_PROOF",
  authorityReferenceLinked: "AUTHORITY_REFERENCE_LINKED"
};

export const propertyCreationSideEffectCounters = {
  localCanonicalPropertyCreations: 0,
  duplicatePropertyCreations: 0,
  unrelatedCanonicalPropertyMutations: 0,
  listingCreations: 0,
  listingMutations: 0,
  ownershipMutations: 0,
  publishActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value = {}) {
  let hash = 2166136261;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `creation_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function audit(eventType, input = {}) {
  return {
    eventType,
    propertyCreationIntentId: input.propertyCreationIntentId || null,
    executionRecordId: input.executionRecordId || null,
    propertyCandidateRef: input.propertyCandidateRef || null,
    resultingPropertyId: input.resultingPropertyId || input.propertyId || null,
    timestamp: input.timestamp || now,
    appendOnly: true,
    ...propertyCreationSideEffectCounters
  };
}

function sourceRef(id, confidence = propertyConfidenceClasses.high) {
  return createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "phase_23f_local_property_creation",
    sourceId: id,
    observedAt: now,
    fetchedAt: now,
    effectiveAt: now,
    confidence,
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.partiallyVerified
  });
}

function evidenceRef(refId) {
  return { refType: "AuthorityEvidence", refId, sourceBacked: true };
}

function candidateFingerprint(candidate = {}) {
  return fingerprint({
    propertyCandidateRef: candidate.propertyCandidateRef,
    country: candidate.country,
    region: candidate.region,
    city: candidate.city,
    address: candidate.address,
    locationDescription: candidate.locationDescription,
    cadastralOrRegistryRef: candidate.cadastralOrRegistryRef,
    project: candidate.project,
    building: candidate.building,
    unit: candidate.unit,
    propertyType: candidate.propertyType,
    area: candidate.area,
    bedrooms: candidate.bedrooms,
    evidenceRefs: candidate.evidenceRefs,
    sourceRefs: candidate.sourceRefs
  });
}

export function generateLocalCanonicalPropertyId(candidate = {}) {
  const city = String(candidate.city || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const type = String(candidate.propertyType || "property").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const suffix = fingerprint(candidate).replace("creation_fp_", "").slice(0, 8);
  return `prop_local_${city || "unknown"}_${type || "property"}_${suffix}`;
}

function candidateToProperty(intent = {}) {
  const candidate = intent.source?.propertyCandidate || intent.propertyCandidate || {};
  const sourceRefs = (intent.sourceRefs?.length ? intent.sourceRefs : [sourceRef(`source_${candidate.propertyCandidateRef}`)]);
  const facts = [
    createPropertyFact({
      factType: "LOCATION",
      value: { country: candidate.country, region: candidate.region, city: candidate.city, address: candidate.address || candidate.locationDescription || null },
      sourceRef: sourceRefs[0],
      confidence: propertyConfidenceClasses.medium,
      observedAt: now,
      freshnessStatus: propertyFreshnessStatuses.current,
      factStatus: propertyFactStatuses.fact
    }),
    createPropertyFact({
      factType: "UNIT_AREA_SQM",
      value: candidate.area ?? null,
      sourceRef: sourceRefs[0],
      confidence: candidate.area == null ? propertyConfidenceClasses.unknown : propertyConfidenceClasses.medium,
      observedAt: now,
      freshnessStatus: propertyFreshnessStatuses.current,
      factStatus: candidate.area == null ? propertyFactStatuses.unverified : propertyFactStatuses.fact
    }),
    createPropertyFact({
      factType: "OWNERSHIP_STATUS",
      value: "not_legally_verified_phase_23f_local_proof",
      sourceRef: sourceRefs[0],
      confidence: propertyConfidenceClasses.unknown,
      observedAt: now,
      freshnessStatus: propertyFreshnessStatuses.current,
      factStatus: propertyFactStatuses.unverified
    })
  ];
  return createProperty({
    propertyId: intent.expectedPostConditions.resultingPropertyId,
    propertyType: intent.propertyType,
    country: candidate.country || "",
    region: candidate.region || "",
    city: candidate.city || "",
    address: candidate.address || candidate.locationDescription || "",
    geo: { lat: null, lng: null, precision: "not_verified_phase_23f" },
    projectId: candidate.project || intent.projectId || null,
    buildingId: candidate.building || null,
    unitId: candidate.unit || null,
    currentStatus: "CREATED_LOCAL_PROOF",
    sourceRefs,
    facts,
    createdAt: now,
    updatedAt: now,
    freshness: propertyFreshnessStatuses.current,
    confidence: propertyConfidenceClasses.medium
  });
}

export function createLocalPropertyCreationStore(input = {}) {
  const properties = new Map((input.properties || []).map((property) => [property.propertyId, clone(property)]));
  const candidateMappings = new Map(Object.entries(input.candidateMappings || {}));
  const lifecycleEvents = [...(input.lifecycleEvents || [])].map(clone);
  const executionRecords = new Map();
  const idempotency = new Map();
  const downstreamDependencies = new Map(Object.entries(input.downstreamDependencies || {}));
  const auditTrail = [];
  return {
    getProperty(propertyId) {
      return clone(properties.get(propertyId));
    },
    hasProperty(propertyId) {
      return properties.has(propertyId);
    },
    listProperties() {
      return Array.from(properties.values()).map(clone);
    },
    getCandidateMapping(candidateRef) {
      return clone(candidateMappings.get(candidateRef));
    },
    setCandidateMapping(candidateRef, mapping) {
      candidateMappings.set(candidateRef, clone(mapping));
    },
    deleteCandidateMapping(candidateRef) {
      candidateMappings.delete(candidateRef);
    },
    addProperty(property) {
      properties.set(property.propertyId, clone(property));
    },
    removeProperty(propertyId) {
      properties.delete(propertyId);
    },
    addLifecycleEvents(events = []) {
      lifecycleEvents.push(...events.map(clone));
    },
    removeLifecycleEventsForExecution(executionRecordId) {
      for (let index = lifecycleEvents.length - 1; index >= 0; index -= 1) {
        if (lifecycleEvents[index].payload?.executionRecordId === executionRecordId) lifecycleEvents.splice(index, 1);
      }
    },
    lifecycleEvents(propertyId = null) {
      return lifecycleEvents.filter((event) => !propertyId || event.propertyId === propertyId).map(clone);
    },
    addExecutionRecord(record) {
      executionRecords.set(record.executionRecordId, clone(record));
    },
    getExecutionRecord(recordId) {
      return clone(executionRecords.get(recordId));
    },
    rememberIdempotency(key, record) {
      idempotency.set(key, clone(record));
    },
    hasIdempotency(key) {
      return idempotency.has(key);
    },
    getByIdempotency(key) {
      return clone(idempotency.get(key));
    },
    setDownstreamDependencies(propertyId, dependencies = []) {
      downstreamDependencies.set(propertyId, clone(dependencies));
    },
    getDownstreamDependencies(propertyId) {
      return clone(downstreamDependencies.get(propertyId) || []);
    },
    appendAudit(event) {
      auditTrail.push(clone(event));
    },
    auditTrail() {
      return auditTrail.map(clone);
    },
    asReadRepository() {
      return {
        getPropertyEvidence(propertyId) {
          const property = properties.get(propertyId);
          if (!property) return { ok: false, status: "NOT_FOUND", propertyId, providerCalls: 0, externalCalls: 0, dbMutations: 0, payments: 0 };
          return {
            ok: true,
            status: "FOUND",
            propertyId,
            property: clone(property),
            facts: clone(property.facts || []),
            sourceRefs: clone(property.sourceRefs || []),
            listingSnapshots: [],
            lifecycleEvents: lifecycleEvents.filter((event) => event.propertyId === propertyId).map(clone),
            project: null,
            building: null,
            floor: null,
            unit: null,
            developer: null,
            landParcel: null,
            providerCalls: 0,
            externalCalls: 0,
            dbMutations: 0,
            payments: 0
          };
        }
      };
    }
  };
}

export function resolvePropertyCandidateIdentity(candidate = {}, store = createLocalPropertyCreationStore()) {
  if (candidate.identityResolutionOverride) return candidate.identityResolutionOverride;
  const mapped = store.getCandidateMapping(candidate.propertyCandidateRef);
  if (mapped?.propertyId) {
    return { outcome: propertyCreationIdentityOutcomes.exactMatch, propertyId: mapped.propertyId, reason: "candidate_already_mapped" };
  }
  const exact = store.listProperties().find((property) =>
    property.country === candidate.country &&
    property.city === candidate.city &&
    property.propertyType === candidate.propertyType &&
    property.address &&
    property.address === (candidate.address || candidate.locationDescription)
  );
  if (exact) return { outcome: propertyCreationIdentityOutcomes.exactMatch, propertyId: exact.propertyId, reason: "deterministic_identity_match" };
  return { outcome: propertyCreationIdentityOutcomes.noMatchNewPropertyCandidate, propertyId: null, reason: "deterministic_no_match" };
}

export function createPropertyCreationIntent(input = {}) {
  const candidate = input.propertyCandidate || {};
  const addIntent = input.addPropertyIntent || {};
  const authority = input.authorityGrant || {};
  const propertyId = input.resultingPropertyId || generateLocalCanonicalPropertyId(candidate);
  const sourceRefs = input.sourceRefs || candidate.sourceRefs || [sourceRef(`source_${candidate.propertyCandidateRef || "candidate"}`)];
  const evidenceRefs = input.evidenceRefs || addIntent.evidenceRefs || authority.evidenceRefs || [];
  const intent = {
    modelType: "PropertyCreationIntent",
    propertyCreationIntentId: input.propertyCreationIntentId || `property_creation_${candidate.propertyCandidateRef || "local"}`,
    actionType: input.actionType || propertyCreationActionTypes.createCanonicalPropertyLocalProof,
    addPropertyIntentId: addIntent.addPropertyIntentId || null,
    propertyCandidateRef: candidate.propertyCandidateRef || addIntent.propertyCandidateRef || null,
    actorId: addIntent.actorId || authority.actorId || input.actorId || null,
    organizationId: addIntent.organizationId || authority.organizationId || input.organizationId || null,
    relationshipId: addIntent.relationshipClaimId || authority.relationshipId || input.relationshipId || null,
    authorityGrantId: authority.authorityGrantId || addIntent.authorityGrantId || input.authorityGrantId || null,
    authorityActivationRecordId: input.authorityActivationRecordId || "activation_record_phase23f_local_fixture",
    propertyType: candidate.propertyType || addIntent.propertyType || input.propertyType || null,
    physicalIdentityInput: {
      propertyCandidateRef: candidate.propertyCandidateRef || null,
      cadastralOrRegistryRef: candidate.cadastralOrRegistryRef || null,
      localFingerprint: candidateFingerprint(candidate)
    },
    locationInput: {
      country: candidate.country || null,
      region: candidate.region || null,
      city: candidate.city || null,
      address: candidate.address || candidate.locationDescription || null
    },
    hierarchyInput: {
      projectId: candidate.project || addIntent.projectId || null,
      buildingId: candidate.building || addIntent.buildingId || null,
      unitId: candidate.unit || addIntent.unitId || null
    },
    technicalFactInputs: {
      area: candidate.area ?? null,
      bedrooms: candidate.bedrooms ?? null
    },
    sourceRefs: clone(sourceRefs),
    evidenceRefs: clone(evidenceRefs),
    jurisdictionContext: input.jurisdictionContext || authority.jurisdiction || "UNKNOWN",
    reviewRefs: clone(input.reviewRefs || ["phase_23b_add_property_readiness", "phase_23e_active_local_authority"]),
    requestedBy: input.requestedBy || "local_property_admin_fixture",
    createdAt: input.createdAt || now,
    preflightStatus: propertyCreationPreflightStatuses.readyForApproval,
    approvalStatus: propertyCreationApprovalStatuses.pending,
    executionStatus: propertyCreationExecutionStatuses.draft,
    idempotencyKey: input.idempotencyKey || fingerprint({ candidate, addIntentId: addIntent.addPropertyIntentId, authorityGrantId: authority.authorityGrantId, resultingPropertyId: propertyId }),
    expectedPostConditions: {
      resultingPropertyId: propertyId,
      candidateFingerprint: candidateFingerprint(candidate),
      propertyType: candidate.propertyType || addIntent.propertyType || null,
      listingCreations: 0,
      ownershipMutations: 0,
      noLegalOwnershipClaim: true
    },
    rollbackPlan: {
      rollbackType: "DEACTIVATE_LOCAL_CANONICAL_PROPERTY_CREATION_RECORD",
      localSystemRecordOnly: true,
      preservesAudit: true
    },
    source: {
      addPropertyIntent: clone(addIntent),
      propertyCandidate: clone(candidate),
      relationship: clone(input.relationship || {}),
      authorityGrant: clone(authority),
      actor: clone(input.actor || {}),
      identityResolution: clone(input.identityResolution || null)
    },
    auditMetadata: {
      audit: [],
      lisaCanApprove: false,
      navigatorCanApprove: false,
      providerCanApprove: false
    },
    ...propertyCreationSideEffectCounters
  };
  intent.auditMetadata.audit = [audit(propertyCreationAuditEvents.intentCreated, intent)];
  return intent;
}

export function capturePropertyCreationBeforeState(intent = {}, store = createLocalPropertyCreationStore()) {
  const candidate = intent.source?.propertyCandidate || {};
  const identity = resolvePropertyCandidateIdentity(candidate, store);
  return {
    modelType: "PropertyCreationBeforeState",
    propertyCandidateRef: intent.propertyCandidateRef,
    candidateFingerprint: candidateFingerprint(candidate),
    existingCanonicalMatchResult: identity.outcome,
    existingPropertyId: identity.propertyId,
    repositoryPropertyCount: store.listProperties().length,
    identityIndex: identity,
    lifecycleCount: store.lifecycleEvents().length,
    timestamp: now
  };
}

function block(status, reason) {
  return { ok: false, status, reasons: [reason], approvalRequired: false, ...propertyCreationSideEffectCounters };
}

export function validatePropertyCreationPreflight(intent = {}, context = {}) {
  const store = context.store || createLocalPropertyCreationStore();
  const actor = context.actor || intent.source?.actor;
  const addIntent = context.addPropertyIntent || intent.source?.addPropertyIntent;
  const candidate = context.propertyCandidate || intent.source?.propertyCandidate;
  const relationship = context.relationship || intent.source?.relationship;
  const authority = context.authorityGrant || intent.source?.authorityGrant;
  if (intent.actionType !== propertyCreationActionTypes.createCanonicalPropertyLocalProof || blockedPropertyCreationActions.includes(intent.actionType)) {
    return block(propertyCreationPreflightStatuses.blockedStateMismatch, "Only CREATE_CANONICAL_PROPERTY_LOCAL_PROOF is allowed.");
  }
  if (!actor?.actorId) return block(propertyCreationPreflightStatuses.blockedActor, "Actor missing.");
  if (!addIntent?.addPropertyIntentId || addIntent.actorId !== intent.actorId || addIntent.propertyCandidateRef !== intent.propertyCandidateRef) {
    return block(propertyCreationPreflightStatuses.blockedAddPropertyIntent, "AddPropertyIntent missing or context mismatch.");
  }
  if (!candidate?.propertyCandidateRef || candidate.propertyCandidateRef !== intent.propertyCandidateRef) {
    return block(propertyCreationPreflightStatuses.blockedCandidate, "Property candidate missing.");
  }
  if (store.hasIdempotency(intent.idempotencyKey)) return block(propertyCreationPreflightStatuses.blockedIdempotency, "Canonical Property already created for this idempotency key.");
  const identity = resolvePropertyCandidateIdentity(candidate, store);
  if (identity.outcome === propertyCreationIdentityOutcomes.exactMatch) return block(propertyCreationPreflightStatuses.existingPropertyMatch, "Existing Property found.");
  if (identity.outcome === propertyCreationIdentityOutcomes.probableMatchReviewRequired) return block(propertyCreationPreflightStatuses.blockedDuplicateReview, "Probable duplicate needs review.");
  if (identity.outcome === propertyCreationIdentityOutcomes.conflict) return block(propertyCreationPreflightStatuses.blockedIdentityConflict, "Candidate identity conflict.");
  if (candidate.quarantineBlocker) return block(propertyCreationPreflightStatuses.blockedQuarantine, "Candidate is quarantined.");
  if (candidateFingerprint(candidate) !== intent.expectedPostConditions?.candidateFingerprint) {
    return block(propertyCreationPreflightStatuses.blockedCandidateChanged, "Candidate changed after approval/preflight.");
  }
  if (!relationship?.relationshipId || relationship.relationshipId !== intent.relationshipId || relationship.relationshipStatus !== propertyRelationshipStatuses.activeLocalProof) {
    return block(propertyCreationPreflightStatuses.blockedRelationship, "Active local relationship missing.");
  }
  if (!authority?.authorityGrantId || authority.authorityGrantId !== intent.authorityGrantId || authority.status !== propertyAuthorityStatuses.activeLocalProof) {
    return block(propertyCreationPreflightStatuses.blockedAuthority, "ACTIVE_LOCAL_PROOF AuthorityGrant required.");
  }
  if ([propertyAuthorityStatuses.expired, propertyAuthorityStatuses.revoked, propertyAuthorityStatuses.suspended, propertyAuthorityStatuses.superseded].includes(authority.status)) {
    return block(propertyCreationPreflightStatuses.blockedAuthority, "Authority lifecycle blocks creation.");
  }
  if (!(authority.allowedActions || []).includes(propertyAuthorityActions.addProperty)) {
    return block(propertyCreationPreflightStatuses.blockedAuthority, "Authority must explicitly allow ADD_PROPERTY.");
  }
  if (authority.scope?.propertyCandidateRef && authority.scope.propertyCandidateRef !== intent.propertyCandidateRef) {
    return block(propertyCreationPreflightStatuses.blockedScope, "Authority candidate scope mismatch.");
  }
  if (authority.scope?.projectId && authority.scope.projectId !== intent.hierarchyInput.projectId) {
    return block(propertyCreationPreflightStatuses.blockedScope, "Authority project scope mismatch.");
  }
  if (!intent.evidenceRefs?.length) return block(propertyCreationPreflightStatuses.blockedEvidence, "Required candidate/property evidence missing.");
  if (intent.jurisdictionContext !== "LOCAL_DEMO") return block(propertyCreationPreflightStatuses.blockedJurisdiction, "Only LOCAL_DEMO creation proof is allowed.");
  return {
    ok: true,
    status: propertyCreationPreflightStatuses.readyForApproval,
    approvalRequired: true,
    beforeState: capturePropertyCreationBeforeState(intent, store),
    identity,
    reasons: ["Eligible for local canonical Property creation proof."],
    ...propertyCreationSideEffectCounters
  };
}

function approvalScopeFor(intent = {}) {
  return {
    propertyCreationIntentId: intent.propertyCreationIntentId,
    propertyCandidateRef: intent.propertyCandidateRef,
    actorId: intent.actorId,
    authorityGrantId: intent.authorityGrantId,
    propertyType: intent.propertyType,
    physicalIdentityFingerprint: intent.physicalIdentityInput?.localFingerprint,
    locationInput: clone(intent.locationInput),
    hierarchyInput: clone(intent.hierarchyInput),
    resultingPropertyId: intent.expectedPostConditions?.resultingPropertyId,
    sourceRefs: clone(intent.sourceRefs),
    evidenceRefs: clone(intent.evidenceRefs)
  };
}

export function createPropertyCreationApproval(intent = {}, input = {}) {
  const scope = input.scope || approvalScopeFor(intent);
  const exactScope = stableStringify(scope) === stableStringify(approvalScopeFor(intent));
  const actor = String(input.decidedBy || "");
  const human = actor.startsWith("human:");
  const forbidden = /lisa|navigator|provider|ai:/i.test(actor);
  const approved = human && !forbidden && exactScope;
  return {
    modelType: "PropertyCreationApproval",
    approvalId: input.approvalId || `approval_${intent.propertyCreationIntentId || "local"}`,
    propertyCreationIntentId: intent.propertyCreationIntentId,
    approvalStatus: approved ? propertyCreationApprovalStatuses.approved : propertyCreationApprovalStatuses.blocked,
    decidedBy: input.decidedBy || null,
    decidedAt: now,
    exactScope,
    approvalToken: approved ? fingerprint({ scope, decidedBy: actor }) : null,
    lisaCanApprove: false,
    navigatorCanApprove: false,
    providerCanApprove: false,
    scope,
    ...propertyCreationSideEffectCounters
  };
}

export function createApprovalForPropertyCreationIntent(intent = {}) {
  return createPropertyCreationApproval(intent, {
    decidedBy: "human:local_property_admin_fixture",
    scope: approvalScopeFor(intent)
  });
}

export function preparePropertyCreationThroughGateway(intent = {}, approval = {}, preflight = null) {
  const checked = preflight || validatePropertyCreationPreflight(intent);
  const allowed = checked.ok && approval.approvalStatus === propertyCreationApprovalStatuses.approved;
  return {
    modelType: "ExecutionGatewayPropertyCreationPreflight",
    actionType: intent.actionType,
    allowed,
    status: allowed ? "GATEWAY_LOCAL_PROPERTY_CREATION_READY" : "GATEWAY_BLOCKED",
    reason: allowed ? "Exact local canonical Property creation may proceed." : checked.status || approval.approvalStatus,
    directStoreMutationAllowed: false,
    executionMode: "LOCAL_ONLY",
    ...propertyCreationSideEffectCounters
  };
}

function createCreationLifecycleEvents(intent = {}, executionRecordId = "") {
  const propertyId = intent.expectedPostConditions.resultingPropertyId;
  return [
    propertyCreationLifecycleEvents.propertyCreatedLocalProof,
    propertyCreationLifecycleEvents.propertyIdAssigned,
    propertyCreationLifecycleEvents.sourceEvidenceLinked,
    propertyCreationLifecycleEvents.relationshipLinkedLocalProof,
    propertyCreationLifecycleEvents.authorityReferenceLinked
  ].map((eventType) => createPropertyLifecycleEvent({
    eventId: `${eventType.toLowerCase()}_${propertyId}`,
    propertyId,
    eventType: eventType === propertyCreationLifecycleEvents.propertyCreatedLocalProof ? propertyLifecycleEventTypes.propertyCreated : eventType,
    sourceRef: intent.sourceRefs[0] || null,
    payload: {
      localProofEventType: eventType,
      executionRecordId,
      propertyCreationIntentId: intent.propertyCreationIntentId,
      propertyCandidateRef: intent.propertyCandidateRef,
      authorityGrantId: intent.authorityGrantId,
      relationshipId: intent.relationshipId
    },
    observedAt: now,
    createdAt: now,
    appendOnly: true
  }));
}

export function verifyPropertyCreationPostConditions(input = {}) {
  const { intent = {}, beforeState = {}, property = {}, store = createLocalPropertyCreationStore(), passport = null } = input;
  const mapping = store.getCandidateMapping(intent.propertyCandidateRef);
  const events = store.lifecycleEvents(property.propertyId);
  const localEventTypes = events.map((event) => event.payload?.localProofEventType).filter(Boolean);
  const checks = {
    propertyIdExists: property.propertyId === intent.expectedPostConditions.resultingPropertyId,
    candidateMapped: mapping?.propertyId === property.propertyId,
    propertyTypePreserved: property.propertyType === intent.propertyType,
    locationPreserved: property.country === intent.locationInput.country && property.city === intent.locationInput.city,
    sourceLineagePreserved: (property.sourceRefs || []).length === intent.sourceRefs.length,
    evidenceLineagePreserved: (intent.evidenceRefs || []).length > 0,
    propertyCreatedEvent: localEventTypes.includes(propertyCreationLifecycleEvents.propertyCreatedLocalProof),
    propertyIdEvent: localEventTypes.includes(propertyCreationLifecycleEvents.propertyIdAssigned),
    sourceEvidenceEvent: localEventTypes.includes(propertyCreationLifecycleEvents.sourceEvidenceLinked),
    relationshipEvent: localEventTypes.includes(propertyCreationLifecycleEvents.relationshipLinkedLocalProof),
    authorityEvent: localEventTypes.includes(propertyCreationLifecycleEvents.authorityReferenceLinked),
    passportGenerated: passport?.ok === true,
    passportNoListing: passport?.passport?.publicView?.listingCount === 0,
    exactlyOneCreated: beforeState.repositoryPropertyCount + 1 === store.listProperties().length
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    ok,
    status: ok ? "POST_CONDITIONS_VERIFIED" : "POST_CONDITIONS_FAILED",
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    lifecycleEventTypes: localEventTypes,
    passportGenerated: passport?.ok === true,
    noListingCreated: passport?.passport?.publicView?.listingCount === 0,
    noLegalOwnershipClaim: true,
    ...propertyCreationSideEffectCounters
  };
}

export function commitCanonicalPropertyCreationLocalProof(input = {}) {
  const { intent = {}, approval = {}, store = createLocalPropertyCreationStore(), simulateFailureAt = "" } = input;
  const preflight = validatePropertyCreationPreflight(intent, { store });
  if (preflight.status === propertyCreationPreflightStatuses.blockedIdempotency) {
    const record = store.getByIdempotency(intent.idempotencyKey);
    return {
      ok: true,
      status: propertyCreationExecutionStatuses.alreadyCreatedIdempotent,
      resultingPropertyId: record?.resultingPropertyId,
      executionRecord: record,
      ...propertyCreationSideEffectCounters
    };
  }
  const gateway = preparePropertyCreationThroughGateway(intent, approval, preflight);
  if (!gateway.allowed) return { ok: false, status: propertyCreationExecutionStatuses.blocked, preflight, gateway, ...propertyCreationSideEffectCounters };
  const beforeState = preflight.beforeState;
  const executionRecordId = `property_creation_execution_${intent.propertyCandidateRef}`;
  const property = candidateToProperty(intent);
  const lifecycleEvents = createCreationLifecycleEvents(intent, executionRecordId);
  if (simulateFailureAt) {
    store.appendAudit(audit(propertyCreationAuditEvents.failed, { ...intent, executionRecordId }));
    return {
      ok: false,
      status: propertyCreationExecutionStatuses.failed,
      failureAt: simulateFailureAt,
      noOrphanProperty: !store.hasProperty(property.propertyId),
      noOrphanId: !store.getCandidateMapping(intent.propertyCandidateRef),
      noPartialLifecycle: store.lifecycleEvents(property.propertyId).length === 0,
      ...propertyCreationSideEffectCounters
    };
  }
  store.addProperty(property);
  store.setCandidateMapping(intent.propertyCandidateRef, { propertyId: property.propertyId, executionRecordId, candidateFingerprint: beforeState.candidateFingerprint });
  store.addLifecycleEvents(lifecycleEvents);
  const passport = createPropertyReadService(store.asReadRepository()).getPropertyPassport(property.propertyId);
  const post = verifyPropertyCreationPostConditions({ intent, beforeState, property, store, passport });
  if (!post.ok) {
    store.removeProperty(property.propertyId);
    store.deleteCandidateMapping(intent.propertyCandidateRef);
    store.removeLifecycleEventsForExecution(executionRecordId);
    store.appendAudit(audit(propertyCreationAuditEvents.failed, { ...intent, executionRecordId }));
    return { ok: false, status: propertyCreationExecutionStatuses.failed, post, ...propertyCreationSideEffectCounters };
  }
  const executionRecord = {
    modelType: "PropertyCreationExecutionRecord",
    executionRecordId,
    propertyCreationIntentId: intent.propertyCreationIntentId,
    propertyCandidateRef: intent.propertyCandidateRef,
    resultingPropertyId: property.propertyId,
    actorId: intent.actorId,
    authorityGrantId: intent.authorityGrantId,
    approvalRef: approval.approvalId,
    status: propertyCreationExecutionStatuses.verified,
    verificationStatus: post.status,
    rollbackStatus: "AVAILABLE",
    createdAt: now,
    beforeState,
    auditMetadata: {
      audit: [
        audit(propertyCreationAuditEvents.preflightPassed, intent),
        audit(propertyCreationAuditEvents.approvalGranted, intent),
        audit(propertyCreationAuditEvents.started, { ...intent, executionRecordId }),
        audit(propertyCreationAuditEvents.propertyIdAssigned, { ...intent, executionRecordId, resultingPropertyId: property.propertyId }),
        audit(propertyCreationAuditEvents.created, { ...intent, executionRecordId, resultingPropertyId: property.propertyId }),
        audit(propertyCreationAuditEvents.verified, { ...intent, executionRecordId, resultingPropertyId: property.propertyId })
      ]
    },
    ...propertyCreationSideEffectCounters,
    localCanonicalPropertyCreations: 1
  };
  store.addExecutionRecord(executionRecord);
  store.rememberIdempotency(intent.idempotencyKey, executionRecord);
  executionRecord.auditMetadata.audit.forEach((event) => store.appendAudit(event));
  return {
    ok: true,
    status: propertyCreationExecutionStatuses.verified,
    resultingPropertyId: property.propertyId,
    property,
    passport,
    post,
    executionRecord,
    ...propertyCreationSideEffectCounters,
    localCanonicalPropertyCreations: 1
  };
}

export function rollbackCanonicalPropertyCreationLocalProof(input = {}) {
  const { executionRecord = {}, store = createLocalPropertyCreationStore() } = input;
  const dependencies = store.getDownstreamDependencies(executionRecord.resultingPropertyId);
  if (dependencies.length) {
    store.appendAudit(audit(propertyCreationAuditEvents.rollbackBlocked, executionRecord));
    return { ok: false, status: propertyCreationExecutionStatuses.rollbackBlocked, dependencies, ...propertyCreationSideEffectCounters };
  }
  if (!executionRecord.resultingPropertyId || !store.hasProperty(executionRecord.resultingPropertyId)) {
    return { ok: false, status: "ROLLBACK_NOT_AVAILABLE", ...propertyCreationSideEffectCounters };
  }
  store.appendAudit(audit(propertyCreationAuditEvents.rollbackRequested, executionRecord));
  store.removeProperty(executionRecord.resultingPropertyId);
  store.deleteCandidateMapping(executionRecord.propertyCandidateRef);
  store.removeLifecycleEventsForExecution(executionRecord.executionRecordId);
  store.appendAudit(audit(propertyCreationAuditEvents.rolledBack, executionRecord));
  return {
    ok: true,
    status: propertyCreationExecutionStatuses.rolledBack,
    restoredCandidateState: "UNMAPPED_LOCAL_CANDIDATE",
    auditPreserved: true,
    ...propertyCreationSideEffectCounters,
    localCanonicalPropertyCreations: 1
  };
}

export function createPropertyCreationHistoryItem(record = {}) {
  return {
    modelType: "PropertyCreationHistoryItem",
    executionRecordId: record.executionRecordId,
    intentId: record.propertyCreationIntentId,
    candidateRef: record.propertyCandidateRef,
    resultingPropertyId: record.resultingPropertyId,
    actorId: record.actorId,
    authorityGrantId: record.authorityGrantId,
    approvalRef: record.approvalRef,
    status: record.status,
    createdAt: record.createdAt,
    verificationStatus: record.verificationStatus,
    rollbackStatus: record.rollbackStatus,
    auditRefs: record.auditMetadata?.audit?.map((event) => event.eventType) || [],
    ...propertyCreationSideEffectCounters
  };
}

function buildOwnerCreationFixture() {
  const guided = buildGuidedAddPropertyViewModel({ flow: "owner", step: "review_readiness" });
  const candidate = {
    ...guided.propertyCandidate,
    sourceRefs: [sourceRef("source_23f_owner_candidate")],
    evidenceRefs: [evidenceRef("evidence_23b_alice_owner_candidate")]
  };
  const relationship = {
    ...guided.eligibility.relationship,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof
  };
  const authority = createAuthorityGrant({
    ...guided.eligibility.authority,
    authorityGrantId: "auth_23f_owner_add_property",
    allowedActions: [propertyAuthorityActions.addProperty],
    scope: { propertyCandidateRef: candidate.propertyCandidateRef, allowedActions: [propertyAuthorityActions.addProperty] },
    status: propertyAuthorityStatuses.activeLocalProof,
    jurisdiction: "LOCAL_DEMO"
  });
  const addPropertyIntent = {
    ...guided.intent,
    intendedAction: propertyAuthorityActions.addProperty,
    authorityGrantId: authority.authorityGrantId,
    evidenceRefs: candidate.evidenceRefs
  };
  const actor = guided.eligibility.actor;
  return { guided, actor, addPropertyIntent, propertyCandidate: candidate, relationship, authorityGrant: authority };
}

function buildDeveloperCreationFixture() {
  const fixtures = buildPropertyActorAuthorityFixtureSet();
  const actor = fixtures.actors.find((item) => item.actorId === "actor_developer_dana");
  const propertyCandidate = {
    modelType: "AddPropertyCandidateReference",
    propertyCandidateRef: "candidate_23f_project_x_unit_1208",
    existingPropertyResolution: "NEW_CANDIDATE_LOCAL_ONLY",
    country: "Georgia",
    region: "Adjara",
    city: "Batumi",
    address: "Project X Tower A Unit 1208",
    locationDescription: "Developer-declared Project X unit",
    project: "project_green_tower",
    building: "tower_a",
    unit: "unit_1208",
    propertyType: "APARTMENT_UNIT",
    area: 58,
    bedrooms: 1,
    sourceRefs: [sourceRef("source_23f_developer_project_x")],
    evidenceRefs: [evidenceRef("evidence_developer_employment_authorization")]
  };
  const relationship = createPropertyRelationship({
    relationshipId: "rel_23f_developer_project_x",
    actorId: actor.actorId,
    organizationId: "org_batumi_green_builders",
    propertyCandidateRef: propertyCandidate.propertyCandidateRef,
    relationshipType: propertyRelationshipTypes.developerRepresentative,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: propertyCandidate.sourceRefs,
    evidenceRefs: propertyCandidate.evidenceRefs
  });
  const authorityGrant = createAuthorityGrant({
    authorityGrantId: "auth_23f_developer_project_x_add_property",
    actorId: actor.actorId,
    organizationId: "org_batumi_green_builders",
    relationshipId: relationship.relationshipId,
    propertyCandidateRef: propertyCandidate.propertyCandidateRef,
    authorityType: propertyAuthorityTypes.developerRepresentativeAuthority,
    allowedActions: [propertyAuthorityActions.addProperty],
    scope: { projectId: "project_green_tower", allowedActions: [propertyAuthorityActions.addProperty] },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    evidenceRefs: propertyCandidate.evidenceRefs
  });
  const addPropertyIntent = {
    modelType: "AddPropertyIntent",
    addPropertyIntentId: "intent_23f_developer_project_x",
    actorId: actor.actorId,
    organizationId: "org_batumi_green_builders",
    relationshipClaimId: relationship.relationshipId,
    authorityGrantId: authorityGrant.authorityGrantId,
    propertyCandidateRef: propertyCandidate.propertyCandidateRef,
    projectId: "project_green_tower",
    propertyType: propertyCandidate.propertyType,
    intendedAction: propertyAuthorityActions.addProperty,
    evidenceRefs: propertyCandidate.evidenceRefs
  };
  return { actor, addPropertyIntent, propertyCandidate, relationship, authorityGrant };
}

export function buildPropertyCreationFixtures() {
  const owner = buildOwnerCreationFixture();
  const developer = buildDeveloperCreationFixture();
  const agentGuided = buildGuidedAddPropertyViewModel({ flow: "agent", step: "review_readiness" });
  const managerGuided = buildGuidedAddPropertyViewModel({ flow: "manager", step: "review_readiness" });
  const cleanerGuided = buildGuidedAddPropertyViewModel({ flow: "service_provider", step: "about_you" });
  const ownerIntent = createPropertyCreationIntent(owner);
  const developerIntent = createPropertyCreationIntent(developer);
  const ownerVariant = (propertyCandidate, extra = {}) => createPropertyCreationIntent({
    ...owner,
    propertyCandidate,
    addPropertyIntent: { ...owner.addPropertyIntent, propertyCandidateRef: propertyCandidate.propertyCandidateRef, evidenceRefs: extra.evidenceRefs ?? owner.addPropertyIntent.evidenceRefs },
    relationship: { ...owner.relationship, propertyCandidateRef: propertyCandidate.propertyCandidateRef },
    authorityGrant: {
      ...owner.authorityGrant,
      authorityGrantId: extra.authorityGrantId || owner.authorityGrant.authorityGrantId,
      propertyCandidateRef: propertyCandidate.propertyCandidateRef,
      scope: { ...owner.authorityGrant.scope, propertyCandidateRef: propertyCandidate.propertyCandidateRef },
      evidenceRefs: extra.evidenceRefs ?? owner.authorityGrant.evidenceRefs
    },
    evidenceRefs: extra.evidenceRefs ?? owner.addPropertyIntent.evidenceRefs,
    ...extra
  });
  const developerZIntent = createPropertyCreationIntent({
    ...developer,
    propertyCandidate: { ...developer.propertyCandidate, propertyCandidateRef: "candidate_23f_project_z_unit", project: "project_z" },
    addPropertyIntent: { ...developer.addPropertyIntent, addPropertyIntentId: "intent_23f_developer_project_z", propertyCandidateRef: "candidate_23f_project_z_unit", projectId: "project_z" },
    relationship: { ...developer.relationship, propertyCandidateRef: "candidate_23f_project_z_unit" },
    authorityGrant: { ...developer.authorityGrant, propertyCandidateRef: "candidate_23f_project_z_unit" },
    propertyCreationIntentId: "property_creation_project_z"
  });
  return {
    owner,
    developer,
    agentListingOnly: {
      actor: agentGuided.eligibility.actor,
      addPropertyIntent: { ...agentGuided.intent, intendedAction: propertyAuthorityActions.addProperty, propertyCandidateRef: owner.propertyCandidate.propertyCandidateRef },
      propertyCandidate: owner.propertyCandidate,
      relationship: agentGuided.eligibility.relationship,
      authorityGrant: agentGuided.eligibility.authority
    },
    manager: {
      actor: managerGuided.eligibility.actor,
      addPropertyIntent: { ...managerGuided.intent, intendedAction: propertyAuthorityActions.addProperty, propertyCandidateRef: owner.propertyCandidate.propertyCandidateRef },
      propertyCandidate: owner.propertyCandidate,
      relationship: managerGuided.eligibility.relationship,
      authorityGrant: managerGuided.eligibility.authority
    },
    cleaner: {
      actor: cleanerGuided.eligibility?.actor || { actorId: "actor_cleaner_chris" },
      addPropertyIntent: { addPropertyIntentId: "intent_23f_cleaner", actorId: "actor_cleaner_chris", relationshipClaimId: "rel_23f_cleaner", authorityGrantId: "auth_23f_cleaner_service", propertyCandidateRef: owner.propertyCandidate.propertyCandidateRef, propertyType: "APARTMENT_UNIT", intendedAction: propertyAuthorityActions.addProperty, evidenceRefs: [evidenceRef("evidence_org_registration_cleaning")] },
      propertyCandidate: owner.propertyCandidate,
      relationship: { relationshipId: "rel_23f_cleaner", actorId: "actor_cleaner_chris", propertyCandidateRef: owner.propertyCandidate.propertyCandidateRef, relationshipStatus: propertyRelationshipStatuses.activeLocalProof },
      authorityGrant: { authorityGrantId: "auth_23f_cleaner_service", actorId: "actor_cleaner_chris", relationshipId: "rel_23f_cleaner", status: propertyAuthorityStatuses.activeLocalProof, allowedActions: [propertyAuthorityActions.requestCleaning], scope: { propertyCandidateRef: owner.propertyCandidate.propertyCandidateRef }, jurisdiction: "LOCAL_DEMO", evidenceRefs: [evidenceRef("evidence_org_registration_cleaning")] }
    },
    intents: {
      ownerIntent,
      developerIntent,
      developerZIntent,
      noEvidence: ownerVariant({ ...owner.propertyCandidate, propertyCandidateRef: "candidate_23f_no_evidence" }, { propertyCreationIntentId: "property_creation_no_evidence", authorityGrantId: "auth_23f_no_evidence", evidenceRefs: [] }),
      existingMatch: ownerVariant({ ...owner.propertyCandidate, propertyCandidateRef: "candidate_23f_existing_match", locationDescription: "Existing Property Found Address" }, { propertyCreationIntentId: "property_creation_existing_match" }),
      probableDuplicate: ownerVariant({ ...owner.propertyCandidate, propertyCandidateRef: "candidate_23f_probable_duplicate", identityResolutionOverride: { outcome: propertyCreationIdentityOutcomes.probableMatchReviewRequired, propertyId: null, reason: "similar_address" } }, { propertyCreationIntentId: "property_creation_probable_duplicate" }),
      conflict: ownerVariant({ ...owner.propertyCandidate, propertyCandidateRef: "candidate_23f_identity_conflict", identityResolutionOverride: { outcome: propertyCreationIdentityOutcomes.conflict, propertyId: null, reason: "conflicting_cadastral_ref" } }, { propertyCreationIntentId: "property_creation_identity_conflict" })
    },
    sideEffectCounters: clone(propertyCreationSideEffectCounters)
  };
}

export function createPropertyCreationStoreForScenario(caseKey = "owner") {
  const store = createLocalPropertyCreationStore();
  if (caseKey === "existingMatch") {
    store.addProperty(createProperty({
      propertyId: "prop_local_existing_match",
      propertyType: "APARTMENT_UNIT",
      country: "Georgia",
      region: "Adjara",
      city: "Batumi",
      address: "Existing Property Found Address",
      currentStatus: "CREATED_LOCAL_PROOF",
      sourceRefs: [sourceRef("source_existing_property_match")],
      facts: [],
      createdAt: now,
      updatedAt: now,
      freshness: propertyFreshnessStatuses.current,
      confidence: propertyConfidenceClasses.medium
    }));
  }
  return store;
}

export function buildPropertyCreationViewModel(input = {}) {
  const fixtures = buildPropertyCreationFixtures();
  const caseKey = input.caseKey || input.case || "owner";
  const baseByKey = {
    owner: fixtures.owner,
    agent: fixtures.agentListingOnly,
    manager: fixtures.manager,
    cleaner: fixtures.cleaner,
    developer: fixtures.developer
  };
  const intentByKey = {
    owner: fixtures.intents.ownerIntent,
    existingMatch: fixtures.intents.existingMatch,
    probableDuplicate: fixtures.intents.probableDuplicate,
    conflict: fixtures.intents.conflict,
    developer: fixtures.intents.developerIntent,
    developerZ: fixtures.intents.developerZIntent,
    noEvidence: fixtures.intents.noEvidence
  };
  const source = baseByKey[caseKey] || fixtures.owner;
  const intent = intentByKey[caseKey] || createPropertyCreationIntent(source);
  const store = createPropertyCreationStoreForScenario(caseKey);
  const preflight = validatePropertyCreationPreflight(intent, { store });
  const approval = preflight.ok ? createApprovalForPropertyCreationIntent(intent) : createPropertyCreationApproval(intent, {});
  const gateway = preparePropertyCreationThroughGateway(intent, approval, preflight);
  const result = preflight.ok ? commitCanonicalPropertyCreationLocalProof({ intent, approval, store, simulateFailureAt: caseKey === "failure" ? "after_property_id" : "" }) : null;
  const repeat = result?.ok ? commitCanonicalPropertyCreationLocalProof({ intent, approval, store }) : null;
  const historyItem = result?.executionRecord ? createPropertyCreationHistoryItem(result.executionRecord) : null;
  const rollback = result?.executionRecord ? rollbackCanonicalPropertyCreationLocalProof({ executionRecord: result.executionRecord, store }) : null;
  const dependencyStore = createPropertyCreationStoreForScenario();
  const dependencyResult = commitCanonicalPropertyCreationLocalProof({ intent: fixtures.intents.ownerIntent, approval: createApprovalForPropertyCreationIntent(fixtures.intents.ownerIntent), store: dependencyStore });
  dependencyStore.setDownstreamDependencies(dependencyResult.resultingPropertyId, ["LISTING_DEPENDENCY_SYNTHETIC"]);
  const rollbackDependencyGuard = rollbackCanonicalPropertyCreationLocalProof({ executionRecord: dependencyResult.executionRecord, store: dependencyStore });
  return {
    modelType: "PropertyCreationProofViewModel",
    route: "#property-creation-proof",
    caseKey,
    banner: "LOCAL CONTROLLED CANONICAL PROPERTY CREATION. NO LISTING CREATED. NO PRODUCTION WRITE. NO LEGAL OWNERSHIP CHANGE.",
    source,
    intent,
    beforeState: capturePropertyCreationBeforeState(intent, store),
    preflight,
    approval,
    gateway,
    creationPlan: {
      creates: ["canonical Property ID", "canonical Property record", "source/evidence lineage", "local lifecycle events"],
      doesNotCreate: ["Listing", "publication", "booking", "payment", "transaction", "legal ownership"]
    },
    result,
    repeat,
    historyItem,
    rollback,
    rollbackDependencyGuard,
    addPropertyIntegration: {
      status: result?.ok ? "PROPERTY_CREATED_LOCAL_PROOF" : preflight.status,
      propertyId: result?.resultingPropertyId || null,
      nextFutureActions: ["CREATE LISTING - NOT ACTIVE IN 23F", "MANAGE PROPERTY - FUTURE", "PROMOTE - FUTURE"]
    },
    lisaGuide: createLisaPropertyCreationGuide("Is a Listing created?", { preflight, result }),
    navigatorRouting: createNavigatorPropertyCreationRouting("prepare canonical property creation"),
    ...propertyCreationSideEffectCounters,
    localCanonicalPropertyCreations: result?.localCanonicalPropertyCreations || 0
  };
}

export function createLisaPropertyCreationGuide(question = "", context = {}) {
  const text = String(question || "").toLowerCase();
  return {
    modelType: "LisaPropertyCreationGuide",
    mayApprove: false,
    mayExecute: false,
    answer: text.includes("listing") || text.includes("publish")
      ? "No. Creating a canonical Property does not create or publish a Listing."
      : text.includes("ownership") || text.includes("legal")
        ? "No. This local proof preserves relationship and authority references but does not legally verify ownership."
        : `Current creation state: ${context.preflight?.status || "unknown"}.`,
    ...propertyCreationSideEffectCounters
  };
}

export function createNavigatorPropertyCreationRouting(input = "") {
  return {
    modelType: "NavigatorPropertyCreationRouting",
    input,
    hash: "#property-creation-proof",
    routeOnly: true,
    navigatorCanApprove: false,
    navigatorCanExecute: false,
    skipDuplicateResolutionAllowed: false,
    ...propertyCreationSideEffectCounters
  };
}
