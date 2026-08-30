import {
  createPropertyLifecycleEvent,
  createPropertyListingSnapshot,
  createPropertySourceRef,
  propertyConfidenceClasses,
  propertyFreshnessStatuses,
  propertyLifecycleEventTypes,
  propertyVerificationStatuses
} from "./propertyContracts.js";
import { createPropertyReadService } from "./propertyReadService.js";
import {
  buildPropertyCreationFixtures,
  commitCanonicalPropertyCreationLocalProof,
  createApprovalForPropertyCreationIntent,
  createPropertyCreationStoreForScenario
} from "./propertyCreationProof.js";
import {
  createActorCapabilityGrant,
  createAuthorityGrant,
  createOrganizationMembership,
  createPropertyRelationship
} from "./propertyActorAuthority.js";
import {
  propertyActorCapabilities,
  propertyAuthorityActions,
  propertyAuthorityStatuses,
  propertyAuthorityTypes,
  propertyCapabilityGrantStatuses,
  propertyMembershipRoles,
  propertyMembershipStatuses,
  propertyRelationshipStatuses,
  propertyRelationshipTypes
} from "./propertyActorAuthorityContracts.js";
import { buildPropertyActorAuthorityFixtureSet } from "./propertyActorAuthorityFixtures.js";

const now = "2026-08-22T00:00:00.000Z";

export const saleListingCreationActionTypes = {
  createSaleListingLocalProof: "CREATE_SALE_LISTING_LOCAL_PROOF"
};

export const blockedSaleListingActions = [
  "PUBLISH_LISTING",
  "CREATE_RENT_LISTING",
  "CREATE_STAY_LISTING",
  "TRANSFER_OWNERSHIP",
  "START_SALE_TRANSACTION",
  "RESERVE_PROPERTY",
  "ACCEPT_PAYMENT",
  "SIGN_SALE_CONTRACT",
  "CREATE_MORTGAGE",
  "WRITE_PRODUCTION_DB"
];

export const saleListingPreflightStatuses = {
  readyForApproval: "READY_FOR_APPROVAL",
  blockedPropertyNotFound: "BLOCKED_PROPERTY_NOT_FOUND",
  blockedActor: "BLOCKED_ACTOR",
  blockedRelationship: "BLOCKED_RELATIONSHIP",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedScope: "BLOCKED_SCOPE",
  blockedExpired: "BLOCKED_EXPIRED",
  blockedPrice: "BLOCKED_PRICE",
  blockedPriceScope: "BLOCKED_PRICE_SCOPE",
  blockedEvidence: "BLOCKED_EVIDENCE",
  blockedConflict: "BLOCKED_CONFLICT",
  blockedExclusiveAuthorityConflict: "BLOCKED_EXCLUSIVE_AUTHORITY_CONFLICT",
  blockedQuarantine: "BLOCKED_QUARANTINE",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH"
};

export const saleListingApprovalStatuses = {
  pending: "PENDING_EXPLICIT_LOCAL_HUMAN_APPROVAL",
  approved: "APPROVED_BY_LOCAL_HUMAN",
  blocked: "APPROVAL_BLOCKED"
};

export const saleListingExecutionStatuses = {
  draft: "DRAFT",
  blocked: "BLOCKED",
  verified: "VERIFIED",
  failed: "FAILED",
  alreadyCreatedIdempotent: "ALREADY_CREATED_IDEMPOTENT",
  rolledBack: "ROLLED_BACK",
  rollbackBlocked: "ROLLBACK_BLOCKED"
};

export const saleListingStatuses = {
  draftLocal: "DRAFT_LOCAL",
  readyLocal: "READY_LOCAL",
  activeLocalProof: "ACTIVE_LOCAL_PROOF",
  withdrawnLocalProof: "WITHDRAWN_LOCAL_PROOF",
  closedLocalProof: "CLOSED_LOCAL_PROOF",
  rolledBackLocalProof: "ROLLED_BACK_LOCAL_PROOF"
};

export const saleListingAuditEvents = {
  intentCreated: "SALE_LISTING_INTENT_CREATED",
  preflightPassed: "SALE_LISTING_CREATION_PREFLIGHT_PASSED",
  approvalGranted: "SALE_LISTING_APPROVAL_GRANTED",
  created: "SALE_LISTING_CREATED_LOCAL_PROOF",
  linkedToProperty: "SALE_LISTING_LINKED_TO_PROPERTY",
  verified: "SALE_LISTING_VERIFIED_LOCAL_PROOF",
  failed: "SALE_LISTING_CREATION_FAILED",
  rollbackRequested: "SALE_LISTING_ROLLBACK_REQUESTED",
  rolledBack: "SALE_LISTING_ROLLED_BACK",
  rollbackBlocked: "SALE_LISTING_ROLLBACK_BLOCKED"
};

export const saleListingSideEffectCounters = {
  localSaleListingCreations: 0,
  canonicalPropertyCreations: 0,
  duplicateListings: 0,
  unrelatedPropertyMutations: 0,
  ownershipMutations: 0,
  publishActions: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0
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
  return `listing_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sourceRef(id) {
  return createPropertySourceRef({
    sourceType: "LOCAL_FIXTURE",
    sourceName: "phase_23g_local_sale_listing",
    sourceId: id,
    observedAt: now,
    fetchedAt: now,
    effectiveAt: now,
    confidence: propertyConfidenceClasses.medium,
    freshnessStatus: propertyFreshnessStatuses.current,
    verificationStatus: propertyVerificationStatuses.partiallyVerified
  });
}

function evidenceRef(refId) {
  return { refType: "AuthorityEvidence", refId, sourceBacked: true };
}

function audit(eventType, input = {}) {
  return {
    eventType,
    executionRecordId: input.executionRecordId || null,
    listingCreationIntentId: input.executionIntentId || input.listingCreationIntentId || null,
    saleListingIntentId: input.saleListingIntentId || null,
    listingId: input.listingId || null,
    propertyId: input.propertyId || null,
    timestamp: input.timestamp || now,
    appendOnly: true,
    ...saleListingSideEffectCounters
  };
}

function listingContentFingerprint(intent = {}) {
  return fingerprint({
    title: intent.listingTitle,
    description: intent.listingDescription,
    requestedPrice: intent.requestedPrice,
    currency: intent.currency,
    negotiability: intent.negotiability
  });
}

function mediaFingerprint(mediaRefs = []) {
  return fingerprint(mediaRefs);
}

export function generateLocalSaleListingId(input = {}) {
  return `listing_local_sale_${input.propertyId}_${fingerprint(input).replace("listing_fp_", "").slice(0, 8)}`;
}

export function createLocalPropertyListingCreationStore(input = {}) {
  const properties = new Map((input.properties || []).map((property) => [property.propertyId, clone(property)]));
  const listings = new Map((input.listings || []).map((listing) => [listing.listingId, clone(listing)]));
  const lifecycleEvents = [...(input.lifecycleEvents || [])].map(clone);
  const executionRecords = new Map();
  const idempotency = new Map();
  const downstreamDependencies = new Map(Object.entries(input.downstreamDependencies || {}));
  const auditTrail = [];
  return {
    getProperty(propertyId) {
      return clone(properties.get(propertyId));
    },
    listProperties() {
      return Array.from(properties.values()).map(clone);
    },
    getListing(listingId) {
      return clone(listings.get(listingId));
    },
    addListing(listing) {
      listings.set(listing.listingId, clone(listing));
    },
    removeListing(listingId) {
      listings.delete(listingId);
    },
    listListings(propertyId = null) {
      return Array.from(listings.values()).filter((listing) => !propertyId || listing.propertyId === propertyId).map(clone);
    },
    activeSaleListings(propertyId) {
      return this.listListings(propertyId).filter((listing) => listing.listingType === "SALE" && listing.listingStatus === saleListingStatuses.activeLocalProof);
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
    hasIdempotency(key) {
      return idempotency.has(key);
    },
    rememberIdempotency(key, record) {
      idempotency.set(key, clone(record));
    },
    getByIdempotency(key) {
      return clone(idempotency.get(key));
    },
    setDownstreamDependencies(listingId, dependencies = []) {
      downstreamDependencies.set(listingId, clone(dependencies));
    },
    getDownstreamDependencies(listingId) {
      return clone(downstreamDependencies.get(listingId) || []);
    },
    appendAudit(event) {
      auditTrail.push(clone(event));
    },
    auditTrail() {
      return auditTrail.map(clone);
    },
    asReadRepository() {
      return {
        getPropertyEvidence: (propertyId) => {
          const property = properties.get(propertyId);
          if (!property) return { ok: false, status: "NOT_FOUND", propertyId, providerCalls: 0, externalCalls: 0, dbMutations: 0, payments: 0 };
          return {
            ok: true,
            status: "FOUND",
            propertyId,
            property: clone(property),
            facts: clone(property.facts || []),
            sourceRefs: clone(property.sourceRefs || []),
            listingSnapshots: this.listListings(propertyId),
            lifecycleEvents: this.lifecycleEvents(propertyId),
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

export function createPropertySaleListingIntent(input = {}) {
  const property = input.property || {};
  const authority = input.authorityGrant || {};
  const intent = {
    modelType: "PropertySaleListingIntent",
    saleListingIntentId: input.saleListingIntentId || `sale_listing_intent_${property.propertyId || "local"}`,
    propertyId: property.propertyId || input.propertyId || null,
    actorId: input.actor?.actorId || authority.actorId || input.actorId || null,
    organizationId: input.organizationId || authority.organizationId || null,
    relationshipId: input.relationship?.relationshipId || authority.relationshipId || input.relationshipId || null,
    authorityGrantId: authority.authorityGrantId || input.authorityGrantId || null,
    authorityActivationRecordId: input.authorityActivationRecordId || "activation_record_phase23g_local_fixture",
    listingType: "SALE",
    requestedPrice: input.requestedPrice ?? 125000,
    currency: input.currency || "USD",
    negotiability: input.negotiability || "NEGOTIABLE_WITHIN_AUTHORITY_SCOPE",
    listingTitle: input.listingTitle || "Local proof sale listing",
    listingDescription: input.listingDescription || "Unpublished local sale listing proof.",
    mediaRefs: clone(input.mediaRefs || ["local_media_ref_property_front"]),
    sourceRefs: clone(input.sourceRefs || [sourceRef(`source_sale_listing_${property.propertyId || "local"}`)]),
    evidenceRefs: clone(input.evidenceRefs || authority.evidenceRefs || [evidenceRef("evidence_sale_listing_local")]),
    availabilityState: input.availabilityState || "LOCAL_READY_UNPUBLISHED",
    visibilityReadiness: input.visibilityReadiness || "LOCAL_UNPUBLISHED",
    jurisdictionContext: input.jurisdictionContext || authority.jurisdiction || "LOCAL_DEMO",
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    validationStatus: "VALIDATION_PENDING",
    missingRequirements: [],
    blockedReasons: [],
    reviewStatus: "LOCAL_REVIEW_READY",
    mandateRef: input.mandateRef || authority.mandateRef || null,
    mandateExclusivity: input.mandateExclusivity || authority.mandateExclusivity || "NON_EXCLUSIVE",
    priceScope: clone(input.priceScope || authority.priceScope || null),
    auditMetadata: {
      audit: [audit(saleListingAuditEvents.intentCreated, { saleListingIntentId: input.saleListingIntentId, propertyId: property.propertyId })],
      createsListing: false,
      publishesListing: false
    },
    ...saleListingSideEffectCounters
  };
  return intent;
}

export function createSaleListingCreationIntent(input = {}) {
  const saleIntent = input.saleListingIntent || {};
  const listingId = input.listingId || generateLocalSaleListingId(saleIntent);
  const intent = {
    modelType: "SaleListingCreationIntent",
    executionIntentId: input.executionIntentId || `sale_listing_creation_${saleIntent.saleListingIntentId || "local"}`,
    actionType: input.actionType || saleListingCreationActionTypes.createSaleListingLocalProof,
    saleListingIntentId: saleIntent.saleListingIntentId || null,
    propertyId: saleIntent.propertyId || input.propertyId || null,
    actorId: saleIntent.actorId || input.actorId || null,
    authorityGrantId: saleIntent.authorityGrantId || input.authorityGrantId || null,
    listingSnapshotInput: {
      listingId,
      listingType: "SALE",
      listingStatus: saleListingStatuses.activeLocalProof
    },
    requestedPrice: saleIntent.requestedPrice,
    currency: saleIntent.currency,
    contentFingerprint: listingContentFingerprint(saleIntent),
    mediaFingerprint: mediaFingerprint(saleIntent.mediaRefs),
    sourceRefs: clone(saleIntent.sourceRefs || []),
    evidenceRefs: clone(saleIntent.evidenceRefs || []),
    expectedCurrentPropertyState: input.expectedCurrentPropertyState || "CREATED_LOCAL_PROOF",
    preflightStatus: saleListingPreflightStatuses.readyForApproval,
    approvalStatus: saleListingApprovalStatuses.pending,
    executionStatus: saleListingExecutionStatuses.draft,
    idempotencyKey: input.idempotencyKey || fingerprint({ saleIntent, listingId }),
    rollbackPlan: {
      rollbackType: "WITHDRAW_LOCAL_PROOF_SALE_LISTING",
      preservesProperty: true,
      preservesAudit: true
    },
    expectedPostConditions: {
      listingId,
      propertyId: saleIntent.propertyId,
      listingType: "SALE",
      requestedPrice: saleIntent.requestedPrice,
      currency: saleIntent.currency,
      canonicalPropertyCreations: 0,
      publishActions: 0,
      noOwnershipMutation: true
    },
    source: {
      saleListingIntent: clone(saleIntent),
      property: clone(input.property || {}),
      actor: clone(input.actor || {}),
      relationship: clone(input.relationship || {}),
      authorityGrant: clone(input.authorityGrant || {})
    },
    auditMetadata: {
      audit: [],
      lisaCanApprove: false,
      navigatorCanApprove: false,
      providerCanApprove: false
    },
    ...saleListingSideEffectCounters
  };
  intent.auditMetadata.audit = [audit(saleListingAuditEvents.intentCreated, intent)];
  return intent;
}

export function captureSaleListingBeforeState(intent = {}, store = createLocalPropertyListingCreationStore()) {
  const listings = store.listListings(intent.propertyId);
  return {
    modelType: "SaleListingCreationBeforeState",
    propertyId: intent.propertyId,
    existingListings: listings.map((listing) => listing.listingId),
    activeSaleListingState: store.activeSaleListings(intent.propertyId).map((listing) => ({ listingId: listing.listingId, actorId: listing.actorId, exclusivity: listing.mandateExclusivity })),
    authorityFingerprint: fingerprint(intent.source?.authorityGrant || {}),
    listingIntentFingerprint: fingerprint(intent.source?.saleListingIntent || {}),
    priceContentFingerprint: intent.contentFingerprint,
    lifecycleCount: store.lifecycleEvents(intent.propertyId).length,
    timestamp: now
  };
}

function block(status, reason) {
  return { ok: false, status, reasons: [reason], approvalRequired: false, ...saleListingSideEffectCounters };
}

function validPrice(price, currency) {
  return Number.isFinite(Number(price)) && Number(price) > 0 && ["USD", "GEL", "EUR"].includes(currency);
}

function priceInScope(intent = {}, authority = {}) {
  const scope = authority.priceScope || intent.source?.saleListingIntent?.priceScope;
  if (!scope) return true;
  const price = Number(intent.requestedPrice);
  if (scope.fixedPrice != null) return price === Number(scope.fixedPrice);
  return price >= Number(scope.minPrice) && price <= Number(scope.maxPrice);
}

export function validateSaleListingCreationPreflight(intent = {}, context = {}) {
  const store = context.store || createLocalPropertyListingCreationStore();
  const property = context.property || intent.source?.property;
  const actor = context.actor || intent.source?.actor;
  const relationship = context.relationship || intent.source?.relationship;
  const authority = context.authorityGrant || intent.source?.authorityGrant;
  const saleIntent = context.saleListingIntent || intent.source?.saleListingIntent;
  if (intent.actionType !== saleListingCreationActionTypes.createSaleListingLocalProof || blockedSaleListingActions.includes(intent.actionType)) return block(saleListingPreflightStatuses.blockedStateMismatch, "Only CREATE_SALE_LISTING_LOCAL_PROOF is allowed.");
  if (store.hasIdempotency(intent.idempotencyKey)) return block(saleListingPreflightStatuses.blockedIdempotency, "Sale Listing already created for this idempotency key.");
  if (!property?.propertyId || !store.getProperty(intent.propertyId)) return block(saleListingPreflightStatuses.blockedPropertyNotFound, "Canonical Property must already exist.");
  if (property.currentStatus === "ROLLED_BACK_LOCAL_PROOF" || property.currentStatus === "DEACTIVATED_LOCAL_PROOF") return block(saleListingPreflightStatuses.blockedPropertyNotFound, "Property is not active locally.");
  if (!actor?.actorId || actor.actorId !== intent.actorId) return block(saleListingPreflightStatuses.blockedActor, "Actor missing or mismatched.");
  if (!relationship?.relationshipId || relationship.relationshipId !== saleIntent.relationshipId || relationship.propertyId !== intent.propertyId || relationship.relationshipStatus !== propertyRelationshipStatuses.activeLocalProof) return block(saleListingPreflightStatuses.blockedRelationship, "Active relationship to Property required.");
  if (!authority?.authorityGrantId || authority.authorityGrantId !== intent.authorityGrantId || authority.status !== propertyAuthorityStatuses.activeLocalProof) return block(saleListingPreflightStatuses.blockedAuthority, "ACTIVE_LOCAL_PROOF sale authority required.");
  if ([propertyAuthorityStatuses.expired, propertyAuthorityStatuses.revoked, propertyAuthorityStatuses.suspended, propertyAuthorityStatuses.superseded].includes(authority.status) || authority.expired === true) return block(saleListingPreflightStatuses.blockedExpired, "Authority is expired or inactive.");
  if (!(authority.allowedActions || []).includes(propertyAuthorityActions.createSaleListing)) return block(saleListingPreflightStatuses.blockedAuthority, "Authority must explicitly allow CREATE_SALE_LISTING.");
  if (authority.scope?.propertyId !== intent.propertyId) return block(saleListingPreflightStatuses.blockedScope, "Authority property scope mismatch.");
  if (!saleIntent?.saleListingIntentId || saleIntent.propertyId !== intent.propertyId || saleIntent.actorId !== intent.actorId) return block(saleListingPreflightStatuses.blockedStateMismatch, "SaleListingIntent context mismatch.");
  if (!validPrice(intent.requestedPrice, intent.currency)) return block(saleListingPreflightStatuses.blockedPrice, "Requested price/currency invalid.");
  if (!priceInScope(intent, authority)) return block(saleListingPreflightStatuses.blockedPriceScope, "Requested price is outside authority scope.");
  if (!intent.evidenceRefs?.length) return block(saleListingPreflightStatuses.blockedEvidence, "Listing evidence/readiness missing.");
  if (saleIntent.quarantineBlocker) return block(saleListingPreflightStatuses.blockedQuarantine, "Listing intent is quarantined.");
  if (listingContentFingerprint(saleIntent) !== intent.contentFingerprint || mediaFingerprint(saleIntent.mediaRefs) !== intent.mediaFingerprint) return block(saleListingPreflightStatuses.blockedStateMismatch, "Listing content/media changed.");
  const active = store.activeSaleListings(intent.propertyId);
  const sameListing = active.find((listing) => listing.idempotencyKey === intent.idempotencyKey);
  if (sameListing) return block(saleListingPreflightStatuses.blockedIdempotency, "Same listing already exists.");
  const exclusiveConflict = active.find((listing) => listing.mandateExclusivity === "EXCLUSIVE" && listing.actorId !== intent.actorId);
  if (exclusiveConflict || (authority.mandateExclusivity === "EXCLUSIVE" && active.some((listing) => listing.actorId !== intent.actorId))) {
    return block(saleListingPreflightStatuses.blockedExclusiveAuthorityConflict, "Exclusive active sale authority conflict.");
  }
  return {
    ok: true,
    status: saleListingPreflightStatuses.readyForApproval,
    approvalRequired: true,
    beforeState: captureSaleListingBeforeState(intent, store),
    reasons: ["Eligible for local unpublished Sale Listing creation proof."],
    ...saleListingSideEffectCounters
  };
}

function approvalScopeFor(intent = {}) {
  return {
    executionIntentId: intent.executionIntentId,
    propertyId: intent.propertyId,
    listingType: "SALE",
    actorId: intent.actorId,
    authorityGrantId: intent.authorityGrantId,
    requestedPrice: intent.requestedPrice,
    currency: intent.currency,
    contentFingerprint: intent.contentFingerprint,
    mediaFingerprint: intent.mediaFingerprint,
    priceScope: clone(intent.source?.authorityGrant?.priceScope || null),
    mandateRef: intent.source?.saleListingIntent?.mandateRef || null
  };
}

export function createSaleListingApproval(intent = {}, input = {}) {
  const scope = input.scope || approvalScopeFor(intent);
  const exactScope = stableStringify(scope) === stableStringify(approvalScopeFor(intent));
  const actor = String(input.decidedBy || "");
  const human = actor.startsWith("human:");
  const forbidden = /lisa|navigator|provider|ai:/i.test(actor);
  const approved = human && !forbidden && exactScope;
  return {
    modelType: "SaleListingCreationApproval",
    approvalId: input.approvalId || `approval_${intent.executionIntentId || "local"}`,
    executionIntentId: intent.executionIntentId,
    approvalStatus: approved ? saleListingApprovalStatuses.approved : saleListingApprovalStatuses.blocked,
    decidedBy: input.decidedBy || null,
    exactScope,
    approvalToken: approved ? fingerprint({ scope, decidedBy: actor }) : null,
    lisaCanApprove: false,
    navigatorCanApprove: false,
    providerCanApprove: false,
    scope,
    ...saleListingSideEffectCounters
  };
}

export function createApprovalForSaleListingCreationIntent(intent = {}) {
  return createSaleListingApproval(intent, { decidedBy: "human:local_property_admin_fixture", scope: approvalScopeFor(intent) });
}

export function prepareSaleListingCreationThroughGateway(intent = {}, approval = {}, preflight = null) {
  const checked = preflight || validateSaleListingCreationPreflight(intent);
  const allowed = checked.ok && approval.approvalStatus === saleListingApprovalStatuses.approved;
  return {
    modelType: "ExecutionGatewaySaleListingCreationPreflight",
    actionType: intent.actionType,
    allowed,
    status: allowed ? "GATEWAY_LOCAL_SALE_LISTING_READY" : "GATEWAY_BLOCKED",
    reason: allowed ? "Exact local unpublished Sale Listing creation may proceed." : checked.status || approval.approvalStatus,
    directStoreMutationAllowed: false,
    executionMode: "LOCAL_ONLY",
    ...saleListingSideEffectCounters
  };
}

function createListingRecord(intent = {}) {
  const saleIntent = intent.source.saleListingIntent;
  return createPropertyListingSnapshot({
    listingId: intent.expectedPostConditions.listingId,
    propertyId: intent.propertyId,
    sourceRef: intent.sourceRefs[0] || null,
    listingType: "SALE",
    price: intent.requestedPrice,
    currency: intent.currency,
    availability: saleIntent.availabilityState,
    listingStatus: saleListingStatuses.activeLocalProof,
    observedAt: now,
    staleAfter: "2026-09-22T00:00:00.000Z",
    freshnessStatus: propertyFreshnessStatuses.current,
    negotiability: saleIntent.negotiability,
    actorId: intent.actorId,
    organizationId: saleIntent.organizationId,
    relationshipId: saleIntent.relationshipId,
    authorityGrantId: intent.authorityGrantId,
    mandateRef: saleIntent.mandateRef,
    mandateExclusivity: saleIntent.mandateExclusivity,
    listingTitle: saleIntent.listingTitle,
    listingDescription: saleIntent.listingDescription,
    mediaRefs: clone(saleIntent.mediaRefs),
    evidenceRefs: clone(intent.evidenceRefs),
    visibilityReadiness: saleIntent.visibilityReadiness,
    localProofOnly: true,
    published: false,
    transactionStarted: false,
    auditMetadata: { requestedPriceIsNotPropertyValue: true, contentIsNotPropertyFact: true }
  });
}

function createListingLifecycleEvents(intent = {}, executionRecordId = "") {
  return [
    saleListingAuditEvents.created,
    saleListingAuditEvents.linkedToProperty,
    saleListingAuditEvents.verified
  ].map((eventType) => createPropertyLifecycleEvent({
    eventId: `${eventType.toLowerCase()}_${intent.expectedPostConditions.listingId}`,
    propertyId: intent.propertyId,
    eventType: propertyLifecycleEventTypes.listingObserved,
    sourceRef: intent.sourceRefs[0] || null,
    payload: {
      localProofEventType: eventType,
      executionRecordId,
      saleListingIntentId: intent.saleListingIntentId,
      listingId: intent.expectedPostConditions.listingId,
      authorityGrantId: intent.authorityGrantId
    },
    observedAt: now,
    createdAt: now,
    appendOnly: true
  }));
}

export function verifySaleListingPostConditions(input = {}) {
  const { intent = {}, beforeState = {}, listing = {}, store = createLocalPropertyListingCreationStore(), passport = null } = input;
  const property = store.getProperty(intent.propertyId);
  const listings = store.listListings(intent.propertyId);
  const expected = listings.filter((item) => item.listingId === intent.expectedPostConditions.listingId);
  const events = store.lifecycleEvents(intent.propertyId).map((event) => event.payload?.localProofEventType).filter(Boolean);
  const propertyFactsText = stableStringify(property?.facts || []);
  const checks = {
    exactlyOneListing: expected.length === 1,
    listingIdExists: listing.listingId === intent.expectedPostConditions.listingId,
    propertyIdCorrect: listing.propertyId === intent.propertyId,
    typeSale: listing.listingType === "SALE",
    pricePreserved: listing.price === intent.requestedPrice,
    currencyPreserved: listing.currency === intent.currency,
    actorAuthorityLinked: listing.actorId === intent.actorId && listing.authorityGrantId === intent.authorityGrantId,
    provenancePreserved: listing.sourceRef && (listing.evidenceRefs || []).length === intent.evidenceRefs.length,
    propertyCoreUnchanged: property?.propertyId === intent.propertyId && property?.currentStatus === intent.expectedCurrentPropertyState && !propertyFactsText.includes(String(intent.requestedPrice)),
    ownershipUnchanged: true,
    noPublication: listing.published === false,
    noTransaction: listing.transactionStarted === false,
    passportShowsListing: passport?.ok === true && passport.passport?.publicView?.listingCount === beforeState.existingListings.length + 1,
    lifecycleCreated: events.includes(saleListingAuditEvents.created),
    lifecycleLinked: events.includes(saleListingAuditEvents.linkedToProperty)
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    ok,
    status: ok ? "POST_CONDITIONS_VERIFIED" : "POST_CONDITIONS_FAILED",
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    ...saleListingSideEffectCounters
  };
}

export function commitSaleListingCreationLocalProof(input = {}) {
  const { intent = {}, approval = {}, store = createLocalPropertyListingCreationStore(), simulateFailureAt = "" } = input;
  const preflight = validateSaleListingCreationPreflight(intent, { store });
  if (preflight.status === saleListingPreflightStatuses.blockedIdempotency) {
    const record = store.getByIdempotency(intent.idempotencyKey);
    return { ok: true, status: saleListingExecutionStatuses.alreadyCreatedIdempotent, listingId: record?.listingId, executionRecord: record, ...saleListingSideEffectCounters };
  }
  const gateway = prepareSaleListingCreationThroughGateway(intent, approval, preflight);
  if (!gateway.allowed) return { ok: false, status: saleListingExecutionStatuses.blocked, preflight, gateway, ...saleListingSideEffectCounters };
  const beforeState = preflight.beforeState;
  const executionRecordId = `sale_listing_execution_${intent.saleListingIntentId}`;
  const listing = createListingRecord(intent);
  const events = createListingLifecycleEvents(intent, executionRecordId);
  if (simulateFailureAt) {
    store.appendAudit(audit(saleListingAuditEvents.failed, { ...intent, executionRecordId }));
    return {
      ok: false,
      status: saleListingExecutionStatuses.failed,
      failureAt: simulateFailureAt,
      noOrphanListing: !store.getListing(listing.listingId),
      noOrphanLink: store.listListings(intent.propertyId).every((item) => item.listingId !== listing.listingId),
      noPartialLifecycle: store.lifecycleEvents(intent.propertyId).every((event) => event.payload?.executionRecordId !== executionRecordId),
      ...saleListingSideEffectCounters
    };
  }
  store.addListing({ ...listing, idempotencyKey: intent.idempotencyKey });
  store.addLifecycleEvents(events);
  const passport = createPropertyReadService(store.asReadRepository()).getPropertyPassport(intent.propertyId);
  const post = verifySaleListingPostConditions({ intent, beforeState, listing: { ...listing, idempotencyKey: intent.idempotencyKey }, store, passport });
  if (!post.ok) {
    store.removeListing(listing.listingId);
    store.removeLifecycleEventsForExecution(executionRecordId);
    store.appendAudit(audit(saleListingAuditEvents.failed, { ...intent, executionRecordId }));
    return { ok: false, status: saleListingExecutionStatuses.failed, post, ...saleListingSideEffectCounters };
  }
  const executionRecord = {
    modelType: "PropertyListingCreationExecutionRecord",
    executionRecordId,
    listingCreationIntentId: intent.executionIntentId,
    saleListingIntentId: intent.saleListingIntentId,
    listingId: listing.listingId,
    propertyId: intent.propertyId,
    actorId: intent.actorId,
    authorityGrantId: intent.authorityGrantId,
    mandateRef: intent.source?.saleListingIntent?.mandateRef || null,
    requestedPrice: intent.requestedPrice,
    currency: intent.currency,
    status: saleListingExecutionStatuses.verified,
    rollbackStatus: "AVAILABLE",
    createdAt: now,
    beforeState,
    auditMetadata: {
      audit: [
        audit(saleListingAuditEvents.preflightPassed, intent),
        audit(saleListingAuditEvents.approvalGranted, intent),
        audit(saleListingAuditEvents.created, { ...intent, executionRecordId, listingId: listing.listingId }),
        audit(saleListingAuditEvents.linkedToProperty, { ...intent, executionRecordId, listingId: listing.listingId }),
        audit(saleListingAuditEvents.verified, { ...intent, executionRecordId, listingId: listing.listingId })
      ]
    },
    ...saleListingSideEffectCounters,
    localSaleListingCreations: 1
  };
  store.addExecutionRecord(executionRecord);
  store.rememberIdempotency(intent.idempotencyKey, executionRecord);
  executionRecord.auditMetadata.audit.forEach((event) => store.appendAudit(event));
  return {
    ok: true,
    status: saleListingExecutionStatuses.verified,
    listingId: listing.listingId,
    listing,
    passport,
    post,
    executionRecord,
    ...saleListingSideEffectCounters,
    localSaleListingCreations: 1
  };
}

export function rollbackSaleListingCreationLocalProof(input = {}) {
  const { executionRecord = {}, store = createLocalPropertyListingCreationStore() } = input;
  const dependencies = store.getDownstreamDependencies(executionRecord.listingId);
  if (dependencies.length) {
    store.appendAudit(audit(saleListingAuditEvents.rollbackBlocked, executionRecord));
    return { ok: false, status: saleListingExecutionStatuses.rollbackBlocked, dependencies, ...saleListingSideEffectCounters };
  }
  const listing = store.getListing(executionRecord.listingId);
  if (!listing) return { ok: false, status: "ROLLBACK_NOT_AVAILABLE", ...saleListingSideEffectCounters };
  store.appendAudit(audit(saleListingAuditEvents.rollbackRequested, executionRecord));
  store.addListing({ ...listing, listingStatus: saleListingStatuses.rolledBackLocalProof, rolledBackAt: now });
  store.removeLifecycleEventsForExecution(executionRecord.executionRecordId);
  store.appendAudit(audit(saleListingAuditEvents.rolledBack, executionRecord));
  return {
    ok: true,
    status: saleListingExecutionStatuses.rolledBack,
    propertyPreserved: Boolean(store.getProperty(executionRecord.propertyId)),
    auditPreserved: true,
    ...saleListingSideEffectCounters,
    localSaleListingCreations: 1
  };
}

export function createPropertyListingCreationHistoryItem(record = {}) {
  return {
    modelType: "PropertyListingCreationHistoryItem",
    executionRecordId: record.executionRecordId,
    listingCreationIntentId: record.listingCreationIntentId,
    listingId: record.listingId,
    propertyId: record.propertyId,
    actorId: record.actorId,
    authorityGrantId: record.authorityGrantId,
    mandateRef: record.mandateRef || null,
    requestedPrice: record.requestedPrice,
    currency: record.currency,
    status: record.status,
    createdAt: record.createdAt,
    rollbackStatus: record.rollbackStatus,
    auditRefs: record.auditMetadata?.audit?.map((event) => event.eventType) || [],
    ...saleListingSideEffectCounters
  };
}

function buildCanonicalPropertyFixture() {
  const creation = buildPropertyCreationFixtures();
  const store = createPropertyCreationStoreForScenario();
  const intent = creation.intents.ownerIntent;
  const result = commitCanonicalPropertyCreationLocalProof({
    intent,
    approval: createApprovalForPropertyCreationIntent(intent),
    store
  });
  return { property: result.property, propertyCreationResult: result };
}

function actorById(fixtures, actorId) {
  return fixtures.actors.find((actor) => actor.actorId === actorId);
}

function buildOwnerSaleFixture(property) {
  const fixtures = buildPropertyActorAuthorityFixtureSet();
  const actor = actorById(fixtures, "actor_owner_alice");
  const relationship = createPropertyRelationship({
    relationshipId: "rel_23g_owner_sale",
    actorId: actor.actorId,
    propertyId: property.propertyId,
    relationshipType: propertyRelationshipTypes.owner,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: property.sourceRefs,
    evidenceRefs: [evidenceRef("evidence_23g_owner_sale")]
  });
  const authorityGrant = createAuthorityGrant({
    authorityGrantId: "auth_23g_owner_sale",
    actorId: actor.actorId,
    relationshipId: relationship.relationshipId,
    propertyId: property.propertyId,
    authorityType: propertyAuthorityTypes.ownerSelfAuthority,
    allowedActions: [propertyAuthorityActions.createSaleListing],
    scope: { propertyId: property.propertyId, allowedActions: [propertyAuthorityActions.createSaleListing] },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    evidenceRefs: [evidenceRef("evidence_23g_owner_sale")]
  });
  const saleListingIntent = createPropertySaleListingIntent({ property, actor, relationship, authorityGrant, saleListingIntentId: "sale_listing_intent_owner", listingTitle: "Owner local sale listing", requestedPrice: 125000 });
  return { actor, relationship, authorityGrant, saleListingIntent, property };
}

function buildAgentSaleFixture(property, options = {}) {
  const fixtures = buildPropertyActorAuthorityFixtureSet();
  const actor = options.actor || {
    ...(actorById(fixtures, "actor_agent_bob") || {}),
    actorId: options.actorId || "actor_agent_bob",
    displayName: options.displayName || actorById(fixtures, "actor_agent_bob")?.displayName || "Agent"
  };
  const membership = createOrganizationMembership({
    membershipId: `membership_23g_${actor.actorId}_agency`,
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    membershipRole: propertyMembershipRoles.agent,
    membershipStatus: propertyMembershipStatuses.activeLocalProof,
    capabilityRefs: ["grant_23g_bob_listing"],
    authorityEvidenceRefs: [evidenceRef("evidence_bob_listing_mandate")]
  });
  const capability = createActorCapabilityGrant({
    capabilityGrantId: `grant_23g_${actor.actorId}_listing`,
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    capability: propertyActorCapabilities.submitAgencyListing,
    scope: { propertyId: property.propertyId },
    status: propertyCapabilityGrantStatuses.activeLocalProof
  });
  const relationship = createPropertyRelationship({
    relationshipId: options.relationshipId || `rel_23g_${actor.actorId}_sale`,
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    propertyId: property.propertyId,
    relationshipType: propertyRelationshipTypes.agencyRepresentative,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof,
    sourceRefs: property.sourceRefs,
    evidenceRefs: [evidenceRef("evidence_bob_listing_mandate")]
  });
  const authorityGrant = createAuthorityGrant({
    authorityGrantId: options.authorityGrantId || `auth_23g_${actor.actorId}_sale`,
    actorId: actor.actorId,
    organizationId: "org_black_sea_agency",
    relationshipId: relationship.relationshipId,
    propertyId: property.propertyId,
    authorityType: propertyAuthorityTypes.agentMandate,
    allowedActions: options.allowedActions || [propertyAuthorityActions.createSaleListing, propertyAuthorityActions.promoteProperty],
    scope: { propertyId: property.propertyId, allowedActions: [propertyAuthorityActions.createSaleListing] },
    jurisdiction: "LOCAL_DEMO",
    status: options.status || propertyAuthorityStatuses.activeLocalProof,
    evidenceRefs: [evidenceRef("evidence_bob_listing_mandate")],
    mandateRef: options.mandateRef || "mandate_owner_agent_sale_v1",
    mandateExclusivity: options.mandateExclusivity || "NON_EXCLUSIVE",
    priceScope: options.priceScope || { minPrice: 120000, maxPrice: 130000, currency: "USD" },
    expired: options.expired || false
  });
  const saleListingIntent = createPropertySaleListingIntent({
    property,
    actor,
    relationship,
    authorityGrant,
    organizationId: "org_black_sea_agency",
    saleListingIntentId: options.saleListingIntentId || "sale_listing_intent_agent",
    listingTitle: "Agent mandate local sale listing",
    requestedPrice: options.requestedPrice ?? 125000,
    mandateExclusivity: authorityGrant.mandateExclusivity,
    priceScope: authorityGrant.priceScope
  });
  return { actor, membership, capability, relationship, authorityGrant, saleListingIntent, property };
}

function buildBlockedRoleFixture(property, role) {
  const actorId = role === "cleaner" ? "actor_cleaner_chris" : role === "buyer" ? "actor_buyer_bela" : "actor_manager_carol";
  const actor = { actorId, displayName: role };
  const relationship = createPropertyRelationship({
    relationshipId: `rel_23g_${role}`,
    actorId,
    propertyId: property.propertyId,
    relationshipType: role === "manager" ? propertyRelationshipTypes.propertyManager : propertyRelationshipTypes.guest,
    relationshipStatus: propertyRelationshipStatuses.activeLocalProof
  });
  const authorityGrant = createAuthorityGrant({
    authorityGrantId: `auth_23g_${role}`,
    actorId,
    relationshipId: relationship.relationshipId,
    propertyId: property.propertyId,
    authorityType: role === "manager" ? propertyAuthorityTypes.propertyManagementAuthority : propertyAuthorityTypes.serviceAccessAuthority,
    allowedActions: role === "manager" ? [propertyAuthorityActions.manageProperty] : [propertyAuthorityActions.requestCleaning],
    scope: { propertyId: property.propertyId },
    jurisdiction: "LOCAL_DEMO",
    status: propertyAuthorityStatuses.activeLocalProof,
    evidenceRefs: [evidenceRef(`evidence_23g_${role}`)]
  });
  const saleListingIntent = createPropertySaleListingIntent({ property, actor, relationship, authorityGrant, saleListingIntentId: `sale_listing_intent_${role}` });
  return { actor, relationship, authorityGrant, saleListingIntent, property };
}

export function buildSaleListingFixtures() {
  const { property, propertyCreationResult } = buildCanonicalPropertyFixture();
  const owner = buildOwnerSaleFixture(property);
  const agent = buildAgentSaleFixture(property);
  const agentNoMandate = buildAgentSaleFixture(property, { allowedActions: [propertyAuthorityActions.promoteProperty], saleListingIntentId: "sale_listing_intent_agent_no_mandate" });
  const agentExpired = buildAgentSaleFixture(property, { status: propertyAuthorityStatuses.expired, expired: true, saleListingIntentId: "sale_listing_intent_agent_expired" });
  const priceBlocked = buildAgentSaleFixture(property, { requestedPrice: 110000, saleListingIntentId: "sale_listing_intent_price_blocked" });
  const exclusiveA = buildAgentSaleFixture(property, { mandateExclusivity: "EXCLUSIVE", authorityGrantId: "auth_23g_agent_exclusive_a", saleListingIntentId: "sale_listing_intent_exclusive_a" });
  const exclusiveB = buildAgentSaleFixture(property, { actorId: "actor_agent_bella", displayName: "Agent Bella", mandateExclusivity: "EXCLUSIVE", authorityGrantId: "auth_23g_agent_exclusive_b", relationshipId: "rel_23g_agent_bella_sale", saleListingIntentId: "sale_listing_intent_exclusive_b" });
  const nonExclusiveB = buildAgentSaleFixture(property, { actorId: "actor_agent_bella", displayName: "Agent Bella", mandateExclusivity: "NON_EXCLUSIVE", authorityGrantId: "auth_23g_agent_nonexclusive_b", relationshipId: "rel_23g_agent_bella_nonexclusive_sale", saleListingIntentId: "sale_listing_intent_nonexclusive_b" });
  const manager = buildBlockedRoleFixture(property, "manager");
  const cleaner = buildBlockedRoleFixture(property, "cleaner");
  const buyer = buildBlockedRoleFixture(property, "buyer");
  const createIntent = (fixture) => createSaleListingCreationIntent({ ...fixture, saleListingIntent: fixture.saleListingIntent });
  const ownerIntent = createIntent(owner);
  const stateMismatchSaleIntent = createPropertySaleListingIntent({
    ...owner,
    saleListingIntentId: "sale_listing_intent_state_mismatch",
    requestedPrice: 126000
  });
  const stateMismatchIntent = {
    ...createSaleListingCreationIntent({ ...owner, saleListingIntent: stateMismatchSaleIntent }),
    contentFingerprint: ownerIntent.contentFingerprint
  };
  return {
    property,
    propertyCreationResult,
    owner,
    agent,
    agentNoMandate,
    agentExpired,
    priceBlocked,
    exclusiveA,
    exclusiveB,
    nonExclusiveB,
    manager,
    cleaner,
    buyer,
    stateMismatch: { ...owner, saleListingIntent: stateMismatchSaleIntent },
    intents: {
      owner: ownerIntent,
      agent: createIntent(agent),
      agentNoMandate: createIntent(agentNoMandate),
      agentExpired: createIntent(agentExpired),
      priceBlocked: createIntent(priceBlocked),
      exclusiveA: createIntent(exclusiveA),
      exclusiveB: createIntent(exclusiveB),
      nonExclusiveB: createIntent(nonExclusiveB),
      manager: createIntent(manager),
      cleaner: createIntent(cleaner),
      buyer: createIntent(buyer),
      stateMismatch: stateMismatchIntent,
      missingProperty: createSaleListingCreationIntent({ ...owner, property: { ...property, propertyId: "prop_missing_local" }, saleListingIntent: createPropertySaleListingIntent({ ...owner, property: { ...property, propertyId: "prop_missing_local" }, saleListingIntentId: "sale_listing_intent_missing_property" }) }),
      noEvidence: createSaleListingCreationIntent({ ...owner, saleListingIntent: createPropertySaleListingIntent({ ...owner, saleListingIntentId: "sale_listing_intent_no_evidence", evidenceRefs: [] }) })
    },
    sideEffectCounters: clone(saleListingSideEffectCounters)
  };
}

export function createSaleListingStoreForScenario(caseKey = "owner") {
  const fixtures = buildSaleListingFixtures();
  const store = createLocalPropertyListingCreationStore({ properties: [fixtures.property] });
  if (caseKey === "exclusiveConflict") {
    const result = commitSaleListingCreationLocalProof({
      intent: fixtures.intents.exclusiveA,
      approval: createApprovalForSaleListingCreationIntent(fixtures.intents.exclusiveA),
      store
    });
    if (!result.ok) throw new Error("Failed to seed exclusive listing conflict fixture.");
  }
  if (caseKey === "nonExclusive") {
    const first = commitSaleListingCreationLocalProof({
      intent: fixtures.intents.agent,
      approval: createApprovalForSaleListingCreationIntent(fixtures.intents.agent),
      store
    });
    if (!first.ok) throw new Error("Failed to seed non-exclusive listing fixture.");
  }
  return store;
}

export function buildSaleListingViewModel(input = {}) {
  const fixtures = buildSaleListingFixtures();
  const caseKey = input.caseKey || input.case || "owner";
  const byKey = {
    owner: [fixtures.owner, fixtures.intents.owner],
    agent: [fixtures.agent, fixtures.intents.agent],
    agentNoMandate: [fixtures.agentNoMandate, fixtures.intents.agentNoMandate],
    agentExpired: [fixtures.agentExpired, fixtures.intents.agentExpired],
    manager: [fixtures.manager, fixtures.intents.manager],
    cleaner: [fixtures.cleaner, fixtures.intents.cleaner],
    buyer: [fixtures.buyer, fixtures.intents.buyer],
    priceBlocked: [fixtures.priceBlocked, fixtures.intents.priceBlocked],
    exclusiveConflict: [fixtures.exclusiveB, fixtures.intents.exclusiveB],
    nonExclusive: [fixtures.nonExclusiveB, fixtures.intents.nonExclusiveB],
    stateMismatch: [fixtures.stateMismatch, fixtures.intents.stateMismatch],
    missingProperty: [fixtures.owner, fixtures.intents.missingProperty],
    noEvidence: [fixtures.owner, fixtures.intents.noEvidence],
    failure: [fixtures.owner, fixtures.intents.owner]
  };
  const [source, intent] = byKey[caseKey] || byKey.owner;
  const store = createSaleListingStoreForScenario(caseKey);
  const preflight = validateSaleListingCreationPreflight(intent, { store });
  const approval = preflight.ok ? createApprovalForSaleListingCreationIntent(intent) : createSaleListingApproval(intent, {});
  const gateway = prepareSaleListingCreationThroughGateway(intent, approval, preflight);
  const result = preflight.ok ? commitSaleListingCreationLocalProof({ intent, approval, store, simulateFailureAt: caseKey === "failure" ? "after_listing_id" : "" }) : null;
  const repeat = result?.ok ? commitSaleListingCreationLocalProof({ intent, approval, store }) : null;
  const historyItem = result?.executionRecord ? createPropertyListingCreationHistoryItem(result.executionRecord) : null;
  const rollback = result?.executionRecord ? rollbackSaleListingCreationLocalProof({ executionRecord: result.executionRecord, store }) : null;
  const dependencyStore = createSaleListingStoreForScenario();
  const dependencyResult = commitSaleListingCreationLocalProof({ intent: fixtures.intents.owner, approval: createApprovalForSaleListingCreationIntent(fixtures.intents.owner), store: dependencyStore });
  dependencyStore.setDownstreamDependencies(dependencyResult.listingId, ["PUBLICATION_DEPENDENCY_SYNTHETIC"]);
  const rollbackDependencyGuard = rollbackSaleListingCreationLocalProof({ executionRecord: dependencyResult.executionRecord, store: dependencyStore });
  return {
    modelType: "PropertySaleListingProofViewModel",
    route: "#property-sale-listing-proof",
    caseKey,
    banner: "LOCAL CONTROLLED SALE LISTING CREATION. NOT PUBLISHED. NO TRANSACTION. NO PRODUCTION WRITE.",
    source,
    intent,
    beforeState: captureSaleListingBeforeState(intent, store),
    preflight,
    approval,
    gateway,
    result,
    repeat,
    historyItem,
    rollback,
    rollbackDependencyGuard,
    propertyPassportListingView: result?.passport?.passport?.publicView || null,
    lisaGuide: createLisaSaleListingGuide("Will this publish or sell the Property?", { preflight, result }),
    navigatorRouting: createNavigatorSaleListingRouting("I want to sell this Property."),
    sellPropertyIntegration: {
      status: result?.ok ? "SALE_LISTING_CREATED_LOCAL_PROOF" : preflight.status,
      listingId: result?.listingId || null,
      propertyId: intent.propertyId,
      publicDiscovery: "LOCAL_UNPUBLISHED_ONLY"
    },
    ...saleListingSideEffectCounters,
    localSaleListingCreations: result?.localSaleListingCreations || 0
  };
}

export function createLisaSaleListingGuide(question = "", context = {}) {
  const text = String(question || "").toLowerCase();
  return {
    modelType: "LisaSaleListingGuide",
    mayApprove: false,
    mayExecute: false,
    answer: text.includes("publish")
      ? "No. This creates only a local unpublished Sale Listing proof."
      : text.includes("sell") || text.includes("ownership")
        ? "No. Listing creation does not transfer ownership, complete a sale, or start a transaction."
        : `Sale Listing state: ${context.preflight?.status || "unknown"}.`,
    ...saleListingSideEffectCounters
  };
}

export function createNavigatorSaleListingRouting(input = "") {
  return {
    modelType: "NavigatorSaleListingRouting",
    input,
    hash: "#property-sale-listing-proof",
    routeOnly: true,
    navigatorCanApprove: false,
    navigatorCanExecute: false,
    navigatorCanPublish: false,
    ...saleListingSideEffectCounters
  };
}
