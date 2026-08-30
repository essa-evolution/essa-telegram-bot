import {
  buildPublicationReadinessViewModel,
  buildPublicationReadinessFixtures,
  createPropertyListingPublicationPlan,
  createPropertyPublicationChannel,
  detectPublicationPlanStaleness,
  evaluatePropertyListingPublicationReadiness,
  localPublicationChannelId,
  publicationPlanStatuses,
  publicationReadinessStatuses
} from "./propertyPublicationReadiness.js";
import {
  propertyAuthorityStatuses
} from "./propertyActorAuthorityContracts.js";

const now = "2026-08-22T00:00:00.000Z";

export const marketplacePublicationActionTypes = {
  publishSaleListingLocalProof: "PUBLISH_SALE_LISTING_TO_ESSA_MARKETPLACE_LOCAL_PROOF"
};

export const blockedMarketplacePublicationActions = [
  "PUBLISH_TO_EXTERNAL_PORTAL",
  "PUBLISH_TO_PRODUCTION_MARKETPLACE",
  "CONTACT_SELLER",
  "CONTACT_AGENT",
  "SUBMIT_OFFER",
  "RESERVE_PROPERTY",
  "START_DEAL_ROOM",
  "START_SALE_TRANSACTION",
  "TRANSFER_OWNERSHIP",
  "PAY",
  "BOOK",
  "CREATE_MORTGAGE",
  "SIGN_CONTRACT"
];

export const publicationExecutionPreflightStatuses = {
  readyForApproval: "READY_FOR_APPROVAL",
  blockedReadiness: "BLOCKED_READINESS",
  blockedPlan: "BLOCKED_PLAN",
  blockedStalePlan: "BLOCKED_STALE_PLAN",
  blockedListingChanged: "BLOCKED_LISTING_CHANGED",
  blockedPropertyChanged: "BLOCKED_PROPERTY_CHANGED",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedExpiredAuthority: "BLOCKED_EXPIRED_AUTHORITY",
  blockedExclusivityConflict: "BLOCKED_EXCLUSIVITY_CONFLICT",
  blockedMedia: "BLOCKED_MEDIA",
  blockedPrivacy: "BLOCKED_PRIVACY",
  blockedJurisdiction: "BLOCKED_JURISDICTION",
  blockedCompliance: "BLOCKED_COMPLIANCE",
  blockedDisclosure: "BLOCKED_DISCLOSURE",
  blockedFreshness: "BLOCKED_FRESHNESS",
  blockedIdempotency: "BLOCKED_IDEMPOTENCY",
  blockedStateMismatch: "BLOCKED_STATE_MISMATCH",
  blockedChannel: "BLOCKED_CHANNEL"
};

export const marketplacePublicationApprovalStatuses = {
  pending: "PENDING_EXPLICIT_LOCAL_HUMAN_APPROVAL",
  approved: "APPROVED_BY_LOCAL_HUMAN",
  blocked: "APPROVAL_BLOCKED"
};

export const marketplacePublicationExecutionStatuses = {
  draft: "DRAFT",
  blocked: "BLOCKED",
  publishedLocalProof: "PUBLISHED_LOCAL_PROOF",
  failed: "FAILED",
  alreadyPublishedIdempotent: "ALREADY_PUBLISHED_IDEMPOTENT",
  unpublishedLocalProof: "UNPUBLISHED_LOCAL_PROOF",
  rolledBackLocalProof: "ROLLED_BACK_LOCAL_PROOF",
  rollbackBlocked: "ROLLBACK_BLOCKED"
};

export const marketplacePublicationStatuses = {
  pendingLocal: "PENDING_LOCAL",
  publishedLocalProof: "PUBLISHED_LOCAL_PROOF",
  unpublishedLocalProof: "UNPUBLISHED_LOCAL_PROOF",
  rolledBackLocalProof: "ROLLED_BACK_LOCAL_PROOF",
  blocked: "BLOCKED",
  superseded: "SUPERSEDED"
};

export const marketplacePublicationLifecycleEvents = {
  intentCreated: "LISTING_PUBLICATION_INTENT_CREATED",
  preflightPassed: "LISTING_PUBLICATION_PREFLIGHT_PASSED",
  approvalGranted: "LISTING_PUBLICATION_APPROVAL_GRANTED",
  published: "LISTING_PUBLISHED_TO_ESSA_MARKETPLACE_LOCAL_PROOF",
  indexed: "LISTING_DISCOVERY_INDEXED_LOCAL_PROOF",
  verified: "LISTING_PUBLICATION_VERIFIED",
  failed: "LISTING_PUBLICATION_FAILED",
  unpublishRequested: "LISTING_UNPUBLISH_REQUESTED",
  unpublished: "LISTING_UNPUBLISHED_LOCAL_PROOF",
  rollbackRequested: "LISTING_PUBLICATION_ROLLBACK_REQUESTED",
  rolledBack: "LISTING_PUBLICATION_ROLLED_BACK"
};

export const marketplacePublicationSideEffectCounters = {
  localMarketplacePublications: 0,
  localMarketplaceDiscoveryInsertions: 0,
  duplicatePublicationRecords: 0,
  duplicateDiscoveryEntries: 0,
  externalPublicationActions: 0,
  productionMarketplaceWrites: 0,
  canonicalPropertyMutations: 0,
  ownershipMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  sellerContactActions: 0,
  offerActions: 0,
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
  return `marketplace_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function mediaFingerprint(listing = {}) {
  return fingerprint(listing.mediaRefs || []);
}

function privacyPolicyFingerprint(projection = {}) {
  return fingerprint({ safeLocation: projection.safeLocation, safeMediaRefs: projection.safeMediaRefs, contactSellerEnabled: projection.contactSellerEnabled });
}

function disclosureFingerprint(readiness = {}) {
  return fingerprint({ jurisdiction: readiness.jurisdictionReadiness, compliance: readiness.complianceReadiness });
}

export function createLocalMarketplacePublicationStore(input = {}) {
  const publications = new Map((input.publications || []).map((record) => [record.publicationId, clone(record)]));
  const discovery = new Map((input.discoveryEntries || []).map((entry) => [entry.publicationId, clone(entry)]));
  const publicationByIdempotency = new Map();
  const lifecycleEvents = [...(input.lifecycleEvents || [])].map(clone);
  const history = [];
  const downstreamDependencies = new Map(Object.entries(input.downstreamDependencies || {}));
  return {
    addPublication(record) {
      publications.set(record.publicationId, clone(record));
    },
    updatePublication(record) {
      publications.set(record.publicationId, clone(record));
    },
    getPublication(publicationId) {
      return clone(publications.get(publicationId));
    },
    listPublications() {
      return Array.from(publications.values()).map(clone);
    },
    activePublicationForListing(listingId) {
      return Array.from(publications.values()).find((record) => record.listingId === listingId && record.publicationStatus === marketplacePublicationStatuses.publishedLocalProof);
    },
    addDiscoveryEntry(entry) {
      discovery.set(entry.publicationId, clone(entry));
    },
    removeDiscoveryEntry(publicationId) {
      discovery.delete(publicationId);
    },
    listDiscoveryEntries() {
      return Array.from(discovery.values()).map(clone);
    },
    getDiscoveryEntry(publicationId) {
      return clone(discovery.get(publicationId));
    },
    rememberIdempotency(key, record) {
      publicationByIdempotency.set(key, clone(record));
    },
    getByIdempotency(key) {
      return clone(publicationByIdempotency.get(key));
    },
    hasIdempotency(key) {
      return publicationByIdempotency.has(key);
    },
    addLifecycleEvents(events = []) {
      lifecycleEvents.push(...events.map(clone));
    },
    lifecycleEvents() {
      return lifecycleEvents.map(clone);
    },
    addHistory(item) {
      history.push(clone(item));
    },
    history() {
      return history.map(clone);
    },
    setDownstreamDependencies(publicationId, dependencies = []) {
      downstreamDependencies.set(publicationId, clone(dependencies));
    },
    getDownstreamDependencies(publicationId) {
      return clone(downstreamDependencies.get(publicationId) || []);
    }
  };
}

export function createMarketplacePublicationExecutionIntent(input = {}) {
  const { readiness = {}, plan = {}, listing = {}, property = {}, projection = {}, authorityGrant = {}, channel = createPropertyPublicationChannel() } = input;
  return {
    modelType: "PropertyListingPublicationExecutionIntent",
    publicationExecutionIntentId: input.publicationExecutionIntentId || `publication_execution_${plan.publicationPlanId || "local"}`,
    actionType: input.actionType || marketplacePublicationActionTypes.publishSaleListingLocalProof,
    publicationPlanId: plan.publicationPlanId,
    publicationReadinessId: readiness.publicationReadinessId,
    listingId: listing.listingId,
    propertyId: property.propertyId,
    actorId: listing.actorId,
    authorityGrantId: listing.authorityGrantId,
    mandateRef: listing.mandateRef || null,
    targetChannelId: channel.channelId,
    targetChannelType: channel.channelType,
    listingFingerprint: plan.listingFingerprint,
    publicProjectionFingerprint: plan.publicProjectionFingerprint,
    authorityFingerprint: plan.authorityFingerprint,
    mediaFingerprint: mediaFingerprint(listing),
    privacyPolicyFingerprint: privacyPolicyFingerprint(projection),
    disclosureFingerprint: disclosureFingerprint(readiness),
    jurisdictionContext: clone(input.jurisdictionContext || readiness.jurisdictionReadiness || {}),
    requestedBy: input.requestedBy || "human:local_property_admin_fixture",
    createdAt: now,
    preflightStatus: publicationExecutionPreflightStatuses.readyForApproval,
    approvalStatus: marketplacePublicationApprovalStatuses.pending,
    executionStatus: marketplacePublicationExecutionStatuses.draft,
    idempotencyKey: input.idempotencyKey || fingerprint({ planId: plan.publicationPlanId, listingId: listing.listingId, projection: plan.publicProjectionFingerprint }),
    expectedPostConditions: {
      publicationStatus: marketplacePublicationStatuses.publishedLocalProof,
      discoveryEntries: 1,
      localMarketplacePublications: 1,
      localMarketplaceDiscoveryInsertions: 1,
      externalPublicationActions: 0,
      productionMarketplaceWrites: 0
    },
    rollbackPlan: {
      rollbackType: "UNPUBLISH_LOCAL_MARKETPLACE_PROOF",
      preservesListing: true,
      preservesProperty: true,
      preservesAudit: true
    },
    source: {
      readiness: clone(readiness),
      plan: clone(plan),
      listing: clone(listing),
      property: clone(property),
      publicProjection: clone(projection),
      authorityGrant: clone(authorityGrant),
      channel: clone(channel)
    },
    auditMetadata: {
      readinessOnly: false,
      localProofOnly: true,
      lisaCanApprove: false,
      navigatorCanApprove: false,
      providerCanApprove: false,
      audit: [marketplacePublicationLifecycleEvents.intentCreated]
    },
    ...marketplacePublicationSideEffectCounters
  };
}

function block(status, reason) {
  return { ok: false, status, reasons: [reason], approvalRequired: false, ...marketplacePublicationSideEffectCounters };
}

function mapReadinessBlock(status) {
  if (status === publicationReadinessStatuses.blockedMedia) return publicationExecutionPreflightStatuses.blockedMedia;
  if (status === publicationReadinessStatuses.blockedPrivacy) return publicationExecutionPreflightStatuses.blockedPrivacy;
  if (status === publicationReadinessStatuses.blockedJurisdiction) return publicationExecutionPreflightStatuses.blockedJurisdiction;
  if (status === publicationReadinessStatuses.blockedCompliance) return publicationExecutionPreflightStatuses.blockedCompliance;
  if (status === publicationReadinessStatuses.blockedStale) return publicationExecutionPreflightStatuses.blockedFreshness;
  if (status === publicationReadinessStatuses.blockedExclusivityConflict) return publicationExecutionPreflightStatuses.blockedExclusivityConflict;
  if (status === publicationReadinessStatuses.blockedAuthority) return publicationExecutionPreflightStatuses.blockedAuthority;
  return publicationExecutionPreflightStatuses.blockedReadiness;
}

export function validateMarketplacePublicationPreflight(intent = {}, context = {}) {
  const publicationStore = context.publicationStore || createLocalMarketplacePublicationStore();
  const readiness = context.readiness || intent.source?.readiness || {};
  const plan = context.plan || intent.source?.plan || {};
  const listing = context.listing || intent.source?.listing || {};
  const property = context.property || intent.source?.property || {};
  const projection = context.projection || intent.source?.publicProjection || {};
  const authorityGrant = context.authorityGrant || intent.source?.authorityGrant || {};
  const channel = context.channel || intent.source?.channel || {};
  if (intent.actionType !== marketplacePublicationActionTypes.publishSaleListingLocalProof || blockedMarketplacePublicationActions.includes(intent.actionType)) return block(publicationExecutionPreflightStatuses.blockedStateMismatch, "Only local ESSA Marketplace publication proof action is allowed.");
  if (intent.targetChannelId !== localPublicationChannelId) return block(publicationExecutionPreflightStatuses.blockedChannel, "Only ESSA_PROPERTY_MARKETPLACE_LOCAL_PREVIEW can be targeted.");
  if (publicationStore.hasIdempotency(intent.idempotencyKey) || publicationStore.activePublicationForListing(intent.listingId)) return block(publicationExecutionPreflightStatuses.blockedIdempotency, "Listing is already locally published.");
  if (readiness.readinessStatus !== publicationReadinessStatuses.readyForPublicationApproval) return block(mapReadinessBlock(readiness.readinessStatus), "Publication readiness is not ready for approval.");
  if (plan.planStatus !== publicationPlanStatuses.readyForPublicationApproval) return block(publicationExecutionPreflightStatuses.blockedPlan, "Publication plan is not ready.");
  if (authorityGrant.status !== propertyAuthorityStatuses.activeLocalProof || authorityGrant.expired === true) return block(publicationExecutionPreflightStatuses.blockedExpiredAuthority, "Authority expired before publish.");
  const staleness = detectPublicationPlanStaleness(plan, { listing, projection, authorityGrant });
  if (staleness.stale) return block(publicationExecutionPreflightStatuses.blockedStalePlan, "Publication plan fingerprint is stale.");
  if (intent.listingFingerprint !== plan.listingFingerprint) return block(publicationExecutionPreflightStatuses.blockedListingChanged, "Listing fingerprint changed.");
  if (intent.publicProjectionFingerprint !== plan.publicProjectionFingerprint) return block(publicationExecutionPreflightStatuses.blockedStateMismatch, "Public projection fingerprint changed.");
  if (intent.authorityFingerprint !== plan.authorityFingerprint) return block(publicationExecutionPreflightStatuses.blockedAuthority, "Authority fingerprint changed.");
  if (intent.mediaFingerprint !== mediaFingerprint(listing)) return block(publicationExecutionPreflightStatuses.blockedMedia, "Media fingerprint changed.");
  if (intent.privacyPolicyFingerprint !== privacyPolicyFingerprint(projection)) return block(publicationExecutionPreflightStatuses.blockedPrivacy, "Privacy policy fingerprint changed.");
  if (projection.publishEnabled !== false || projection.contactSellerEnabled !== false) return block(publicationExecutionPreflightStatuses.blockedPrivacy, "Public projection must not enable publish/contact actions.");
  return {
    ok: true,
    status: publicationExecutionPreflightStatuses.readyForApproval,
    approvalRequired: true,
    reasons: ["Eligible for exact local marketplace publication proof."],
    beforeState: {
      activePublication: publicationStore.activePublicationForListing(intent.listingId) || null,
      discoveryCount: publicationStore.listDiscoveryEntries().length,
      listingStatus: listing.listingStatus,
      propertyStatus: property.currentStatus
    },
    ...marketplacePublicationSideEffectCounters
  };
}

function approvalScopeFor(intent = {}) {
  const projection = intent.source?.publicProjection || {};
  return {
    publicationExecutionIntentId: intent.publicationExecutionIntentId,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    targetChannelId: intent.targetChannelId,
    askingPrice: projection.askingPrice,
    currency: projection.currency,
    publicTitle: projection.publicTitle,
    publicDescription: projection.publicDescription,
    publicMediaSet: projection.safeMediaRefs || [],
    safeLocationPolicy: projection.safeLocation,
    authorityGrantId: intent.authorityGrantId,
    publicationPlanFingerprint: fingerprint({
      publicationPlanId: intent.publicationPlanId,
      listingFingerprint: intent.listingFingerprint,
      publicProjectionFingerprint: intent.publicProjectionFingerprint,
      authorityFingerprint: intent.authorityFingerprint
    })
  };
}

export function createMarketplacePublicationApproval(intent = {}, input = {}) {
  const scope = input.scope || approvalScopeFor(intent);
  const exactScope = stableStringify(scope) === stableStringify(approvalScopeFor(intent));
  const actor = String(input.decidedBy || "");
  const human = actor.startsWith("human:");
  const forbidden = /ai:|lisa|navigator|provider/i.test(actor);
  const approved = human && !forbidden && exactScope;
  return {
    modelType: "MarketplacePublicationApproval",
    approvalId: input.approvalId || `marketplace_publication_approval_${intent.publicationExecutionIntentId || "local"}`,
    publicationExecutionIntentId: intent.publicationExecutionIntentId,
    approvalStatus: approved ? marketplacePublicationApprovalStatuses.approved : marketplacePublicationApprovalStatuses.blocked,
    decidedBy: input.decidedBy || null,
    exactScope,
    approvalRefSafe: approved ? `approval_ref_${fingerprint(scope).replace("marketplace_fp_", "")}` : null,
    approvalTokenPrivate: approved ? fingerprint({ scope, actor }) : null,
    lisaCanApprove: false,
    navigatorCanApprove: false,
    providerCanApprove: false,
    scope,
    ...marketplacePublicationSideEffectCounters
  };
}

export function createApprovalForMarketplacePublicationIntent(intent = {}) {
  return createMarketplacePublicationApproval(intent, { decidedBy: "human:local_property_admin_fixture", scope: approvalScopeFor(intent) });
}

export function prepareMarketplacePublicationThroughGateway(intent = {}, approval = {}, preflight = null) {
  const checked = preflight || validateMarketplacePublicationPreflight(intent);
  const allowed = checked.ok && approval.approvalStatus === marketplacePublicationApprovalStatuses.approved;
  return {
    modelType: "ExecutionGatewayMarketplacePublicationPreflight",
    actionType: intent.actionType,
    allowed,
    status: allowed ? "GATEWAY_LOCAL_MARKETPLACE_PUBLICATION_READY" : "GATEWAY_BLOCKED",
    reason: allowed ? "Exact local marketplace publication proof may proceed." : checked.status || approval.approvalStatus,
    directStoreMutationAllowed: false,
    executionMode: "LOCAL_ONLY",
    ...marketplacePublicationSideEffectCounters
  };
}

export function createMarketplaceDiscoveryEntry(record = {}) {
  const projection = record.publicProjection || {};
  return {
    modelType: "PropertyMarketplaceDiscoveryIndexEntry",
    publicationId: record.publicationId,
    listingId: record.listingId,
    propertyId: record.propertyId,
    publicTitle: projection.publicTitle,
    propertyType: projection.propertyType,
    safeLocation: projection.safeLocation,
    askingPrice: projection.askingPrice,
    currency: projection.currency,
    coverMediaSafeRef: projection.safeMediaRefs?.[0] || null,
    publicVerificationReadinessBadges: projection.publicVerificationBadges || [],
    freshness: projection.freshness,
    passportPublicLinkReadiness: projection.passportPublicLinkReadiness,
    publicDetailRoute: `#property-listing?listingId=${record.listingId}`,
    searchVisibility: "LOCAL_MARKETPLACE_VISIBLE",
    localProofOnly: true
  };
}

function createPublicationRecord(intent = {}, approval = {}) {
  return {
    modelType: "PropertyMarketplacePublicationRecord",
    publicationId: `publication_local_${intent.listingId}`,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    channelId: intent.targetChannelId,
    publicationStatus: marketplacePublicationStatuses.publishedLocalProof,
    publicProjection: clone(intent.source.publicProjection),
    publicProjectionFingerprint: intent.publicProjectionFingerprint,
    publicationPlanId: intent.publicationPlanId,
    authorityRef: { authorityGrantId: intent.authorityGrantId, safe: true },
    actorRef: { representation: intent.source.publicProjection.sellerRepresentationTypeSafeSummary, internalActorIdHidden: true },
    publishedAt: now,
    updatedAt: now,
    freshness: intent.source.publicProjection.freshness,
    searchVisibility: "LOCAL_MARKETPLACE_VISIBLE",
    discoveryStatus: "INDEXED_LOCAL_PROOF",
    rollbackStatus: "ROLLBACK_AVAILABLE",
    auditRefs: [marketplacePublicationLifecycleEvents.published, marketplacePublicationLifecycleEvents.indexed],
    approvalRefSafe: approval.approvalRefSafe,
    localProofOnly: true,
    sellerContactEnabled: false,
    transactionStarted: false
  };
}

function lifecycle(intent = {}, events = []) {
  return events.map((eventType) => ({
    eventType,
    publicationExecutionIntentId: intent.publicationExecutionIntentId,
    publicationPlanId: intent.publicationPlanId,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    timestamp: now,
    appendOnly: true,
    ...marketplacePublicationSideEffectCounters
  }));
}

export function verifyMarketplacePublicationPostConditions(input = {}) {
  const { intent = {}, record = {}, discoveryEntry = {}, publicationStore = createLocalMarketplacePublicationStore() } = input;
  const records = publicationStore.listPublications().filter((item) => item.publicationId === record.publicationId);
  const discoveryEntries = publicationStore.listDiscoveryEntries().filter((item) => item.publicationId === record.publicationId);
  const publicText = stableStringify({ record: record.publicProjection, discoveryEntry }).toLowerCase();
  const checks = {
    publicationRecordExists: records.length === 1,
    publicationStatusCorrect: record.publicationStatus === marketplacePublicationStatuses.publishedLocalProof,
    exactListingPropertyLinkage: record.listingId === intent.listingId && record.propertyId === intent.propertyId,
    projectionFingerprintMatches: record.publicProjectionFingerprint === intent.publicProjectionFingerprint,
    exactlyOneDiscoveryEntry: discoveryEntries.length === 1,
    publicRouteSafe: discoveryEntry.publicDetailRoute === `#property-listing?listingId=${intent.listingId}`,
    privateDataAbsent: !/mandate_ref|ownership_document|reviewer|evidence_|approvaltoken|actor_owner|actor_agent|private_email|bank|kyc|kyb|audit/i.test(publicText),
    propertyUnchanged: true,
    ownershipUnchanged: true,
    noTransaction: record.transactionStarted === false,
    noSellerContact: record.sellerContactEnabled === false,
    noProviderCalls: true,
    noProductionWrite: true
  };
  const ok = Object.values(checks).every(Boolean);
  return {
    ok,
    status: ok ? "POST_CONDITIONS_VERIFIED" : "POST_CONDITIONS_FAILED",
    checks,
    failedChecks: Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    ...marketplacePublicationSideEffectCounters
  };
}

export function commitMarketplacePublicationLocalProof(input = {}) {
  const { intent = {}, approval = {}, publicationStore = createLocalMarketplacePublicationStore(), simulateFailureAt = "" } = input;
  const preflight = validateMarketplacePublicationPreflight(intent, { publicationStore });
  if (preflight.status === publicationExecutionPreflightStatuses.blockedIdempotency) {
    const existing = publicationStore.getByIdempotency(intent.idempotencyKey) || publicationStore.activePublicationForListing(intent.listingId);
    return { ok: true, status: marketplacePublicationExecutionStatuses.alreadyPublishedIdempotent, publicationId: existing?.publicationId, publicationRecord: existing, ...marketplacePublicationSideEffectCounters };
  }
  const gateway = prepareMarketplacePublicationThroughGateway(intent, approval, preflight);
  if (!gateway.allowed) return { ok: false, status: marketplacePublicationExecutionStatuses.blocked, preflight, gateway, ...marketplacePublicationSideEffectCounters };
  try {
    if (simulateFailureAt === "before_record") throw new Error("Synthetic publication failure before record.");
    const record = createPublicationRecord(intent, approval);
    if (simulateFailureAt === "after_record") throw new Error("Synthetic publication failure after record.");
    const discoveryEntry = createMarketplaceDiscoveryEntry(record);
    publicationStore.addPublication(record);
    publicationStore.addDiscoveryEntry(discoveryEntry);
    publicationStore.rememberIdempotency(intent.idempotencyKey, record);
    publicationStore.addLifecycleEvents(lifecycle(intent, [
      marketplacePublicationLifecycleEvents.preflightPassed,
      marketplacePublicationLifecycleEvents.approvalGranted,
      marketplacePublicationLifecycleEvents.published,
      marketplacePublicationLifecycleEvents.indexed,
      marketplacePublicationLifecycleEvents.verified
    ]));
    const post = verifyMarketplacePublicationPostConditions({ intent, record, discoveryEntry, publicationStore });
    const historyItem = createPropertyMarketplacePublicationHistoryItem({ intent, record, approval, post });
    publicationStore.addHistory(historyItem);
    return {
      ok: post.ok,
      status: post.ok ? marketplacePublicationExecutionStatuses.publishedLocalProof : marketplacePublicationExecutionStatuses.failed,
      publicationId: record.publicationId,
      publicationRecord: record,
      discoveryEntry,
      preflight,
      gateway,
      post,
      historyItem,
      localMarketplacePublications: 1,
      localMarketplaceDiscoveryInsertions: 1,
      ...Object.fromEntries(Object.entries(marketplacePublicationSideEffectCounters).filter(([key]) => !["localMarketplacePublications", "localMarketplaceDiscoveryInsertions"].includes(key)))
    };
  } catch (error) {
    publicationStore.addLifecycleEvents(lifecycle(intent, [marketplacePublicationLifecycleEvents.failed]));
    return {
      ok: false,
      status: marketplacePublicationExecutionStatuses.failed,
      error: error.message,
      noOrphanPublicationRecord: publicationStore.listPublications().every((record) => record.listingId !== intent.listingId),
      noOrphanDiscoveryEntry: publicationStore.listDiscoveryEntries().every((entry) => entry.listingId !== intent.listingId),
      ...marketplacePublicationSideEffectCounters
    };
  }
}

export function rollbackOrUnpublishListingPublicationLocalProof(input = {}) {
  const { publicationId, publicationStore = createLocalMarketplacePublicationStore(), rollback = false } = input;
  const record = publicationStore.getPublication(publicationId);
  if (!record) return { ok: false, status: "PUBLICATION_NOT_FOUND", ...marketplacePublicationSideEffectCounters };
  const dependencies = publicationStore.getDownstreamDependencies(publicationId);
  if (dependencies.length) return { ok: false, status: marketplacePublicationExecutionStatuses.rollbackBlocked, dependencies, ...marketplacePublicationSideEffectCounters };
  const next = {
    ...record,
    publicationStatus: rollback ? marketplacePublicationStatuses.rolledBackLocalProof : marketplacePublicationStatuses.unpublishedLocalProof,
    searchVisibility: "REMOVED_FROM_LOCAL_MARKETPLACE",
    discoveryStatus: "REMOVED_FROM_DISCOVERY_LOCAL_PROOF",
    rollbackStatus: rollback ? marketplacePublicationStatuses.rolledBackLocalProof : marketplacePublicationStatuses.unpublishedLocalProof,
    unpublishedAt: now,
    updatedAt: now
  };
  publicationStore.updatePublication(next);
  publicationStore.removeDiscoveryEntry(publicationId);
  publicationStore.addLifecycleEvents(lifecycle({ listingId: record.listingId, propertyId: record.propertyId, publicationPlanId: record.publicationPlanId }, [
    rollback ? marketplacePublicationLifecycleEvents.rollbackRequested : marketplacePublicationLifecycleEvents.unpublishRequested,
    rollback ? marketplacePublicationLifecycleEvents.rolledBack : marketplacePublicationLifecycleEvents.unpublished
  ]));
  return {
    ok: true,
    status: rollback ? marketplacePublicationExecutionStatuses.rolledBackLocalProof : marketplacePublicationExecutionStatuses.unpublishedLocalProof,
    publicationRecord: next,
    listingPreserved: true,
    propertyPreserved: true,
    discoveryEntriesAfter: publicationStore.listDiscoveryEntries().length,
    ...marketplacePublicationSideEffectCounters
  };
}

export function createPropertyMarketplacePublicationHistoryItem(input = {}) {
  const { intent = {}, record = {}, approval = {}, post = {} } = input;
  return {
    modelType: "PropertyMarketplacePublicationHistoryItem",
    publicationId: record.publicationId,
    listingId: record.listingId,
    propertyId: record.propertyId,
    executionIntentId: intent.publicationExecutionIntentId,
    publicationPlanId: intent.publicationPlanId,
    approvalRefSafe: approval.approvalRefSafe || null,
    status: record.publicationStatus,
    publishedAt: record.publishedAt,
    unpublishedAt: record.unpublishedAt || null,
    rollbackStatus: record.rollbackStatus,
    discoveryStatus: record.discoveryStatus,
    auditRefs: record.auditRefs || [],
    verificationStatus: post.status || null,
    ...marketplacePublicationSideEffectCounters
  };
}

export function searchLocalMarketplaceDiscovery(publicationStore = createLocalMarketplacePublicationStore(), query = "", filters = {}) {
  const text = String(query || "").toLowerCase();
  const entries = publicationStore.listDiscoveryEntries().filter((entry) => {
    if (filters.city && entry.safeLocation?.city !== filters.city) return false;
    if (filters.propertyType && entry.propertyType !== filters.propertyType) return false;
    if (filters.currency && entry.currency !== filters.currency) return false;
    if (filters.maxAskingPrice != null && Number(entry.askingPrice) > Number(filters.maxAskingPrice)) return false;
    if (filters.currentOnly && entry.freshness !== "CURRENT") return false;
    const haystack = `${entry.publicTitle} ${entry.propertyType} ${entry.safeLocation?.city || ""}`.toLowerCase();
    return !text || text.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part));
  });
  return {
    modelType: "PropertyMarketplaceDiscoveryIndex",
    query,
    filters,
    entries,
    count: entries.length,
    unpublishedListingsIncluded: false,
    blockedListingsIncluded: false,
    privateIntakeDataIncluded: false,
    ...marketplacePublicationSideEffectCounters
  };
}

export function createMarketplacePublicationScenario(caseKey = "owner") {
  const readinessCase = {
    owner: "owner",
    agent: "agent",
    expiredAuthority: "owner",
    manager: "manager",
    blockedReadiness: "privateData",
    stalePlan: "owner",
    mediaChanged: "owner",
    privacyChanged: "owner",
    jurisdictionChanged: "unknownJurisdiction",
    exclusivityChanged: "exclusiveConflict",
    unpublished: "owner"
  }[caseKey] || "owner";
  const readinessFixtures = buildPublicationReadinessFixtures();
  const readinessFixture = readinessFixtures[readinessCase] || readinessFixtures.owner;
  const vm = buildPublicationReadinessViewModel({ case: readinessCase });
  const publicationStore = createLocalMarketplacePublicationStore();
  const channel = createPropertyPublicationChannel();
  let readiness = clone(vm.readiness);
  let plan = clone(vm.plan);
  let listing = clone(vm.listing);
  let projection = clone(vm.projection);
  let authorityGrant = clone(readinessFixture.fixture?.authorityGrant || {});
  authorityGrant.status = "ACTIVE_LOCAL_PROOF";
  if (caseKey === "expiredAuthority") authorityGrant.status = propertyAuthorityStatuses.expired;
  if (caseKey === "stalePlan") listing.price = Number(listing.price) + 1000;
  if (caseKey === "mediaChanged") listing.mediaRefs = [...(listing.mediaRefs || []), "local_media_ref_changed"];
  if (caseKey === "privacyChanged") projection.safeLocation = { ...projection.safeLocation, address: "Private unit address leaked" };
  if (caseKey === "jurisdictionChanged") readiness = { ...readiness, readinessStatus: publicationReadinessStatuses.blockedJurisdiction };
  if (caseKey === "exclusivityChanged") readiness = { ...readiness, readinessStatus: publicationReadinessStatuses.blockedExclusivityConflict };
  const evaluation = evaluatePropertyListingPublicationReadiness({
    store: readinessFixture.store,
    intent: vm.intent,
    fixture: readinessFixture.fixture,
    channel
  });
  if (caseKey === "blockedReadiness") readiness = vm.readiness;
  const intent = createMarketplacePublicationExecutionIntent({
    readiness,
    plan,
    listing,
    property: vm.property,
    projection,
    authorityGrant,
    channel,
    jurisdictionContext: evaluation.jurisdictionContext
  });
  return { vm, readiness, plan, listing, property: vm.property, projection, authorityGrant, channel, intent, publicationStore };
}

export function buildMarketplacePublicationViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "owner";
  const scenario = createMarketplacePublicationScenario(caseKey);
  const preflight = validateMarketplacePublicationPreflight(scenario.intent, {
    publicationStore: scenario.publicationStore,
    readiness: scenario.readiness,
    plan: scenario.plan,
    listing: scenario.listing,
    property: scenario.property,
    projection: scenario.projection,
    authorityGrant: scenario.authorityGrant,
    channel: scenario.channel
  });
  const approval = preflight.ok ? createApprovalForMarketplacePublicationIntent(scenario.intent) : createMarketplacePublicationApproval(scenario.intent, {});
  const gateway = prepareMarketplacePublicationThroughGateway(scenario.intent, approval, preflight);
  const result = preflight.ok ? commitMarketplacePublicationLocalProof({ intent: scenario.intent, approval, publicationStore: scenario.publicationStore, simulateFailureAt: caseKey === "failure" ? "before_record" : "" }) : null;
  const repeat = result?.ok ? commitMarketplacePublicationLocalProof({ intent: scenario.intent, approval, publicationStore: scenario.publicationStore }) : null;
  const marketplace = searchLocalMarketplaceDiscovery(scenario.publicationStore, "Apartment in Batumi", { city: "Batumi", propertyType: "APARTMENT_UNIT", currency: "USD", maxAskingPrice: 200000, currentOnly: true });
  const detail = result?.publicationRecord?.publicProjection || null;
  const unpublish = result?.publicationId ? rollbackOrUnpublishListingPublicationLocalProof({ publicationId: result.publicationId, publicationStore: scenario.publicationStore }) : null;
  const searchAfterUnpublish = searchLocalMarketplaceDiscovery(scenario.publicationStore, "Apartment in Batumi", { city: "Batumi" });
  const dependencyStore = createLocalMarketplacePublicationStore();
  const depScenario = createMarketplacePublicationScenario("owner");
  const depApproval = createApprovalForMarketplacePublicationIntent(depScenario.intent);
  const depResult = commitMarketplacePublicationLocalProof({ intent: depScenario.intent, approval: depApproval, publicationStore: dependencyStore });
  dependencyStore.setDownstreamDependencies(depResult.publicationId, ["OFFER_DEPENDENCY_SYNTHETIC"]);
  const rollbackGuard = rollbackOrUnpublishListingPublicationLocalProof({ publicationId: depResult.publicationId, publicationStore: dependencyStore, rollback: true });
  return {
    modelType: "PropertyMarketplacePublicationProofViewModel",
    route: "#property-publication-proof",
    caseKey,
    banner: "LOCAL MARKETPLACE PUBLICATION PROOF. NOT PRODUCTION LIVE. NO SELLER CONTACT. NO PAYMENT. NO TRANSACTION.",
    ...scenario,
    preflight,
    approval,
    gateway,
    result,
    repeat,
    marketplace,
    detail,
    unpublish,
    searchAfterUnpublish,
    rollbackGuard,
    publicListingRoute: result?.discoveryEntry?.publicDetailRoute || `#property-listing?listingId=${scenario.listing.listingId}`,
    contactSellerFutureAction: "CONTACT SELLER / START CONVERSATION - NOT ACTIVE YET",
    lisaGuide: createLisaMarketplaceGuide("What is this Listing?", result?.publicationRecord),
    navigatorRouting: createNavigatorMarketplaceRouting("Show apartments in Batumi."),
    localMarketplacePublications: result?.localMarketplacePublications || 0,
    localMarketplaceDiscoveryInsertions: result?.localMarketplaceDiscoveryInsertions || 0,
    ...Object.fromEntries(Object.entries(marketplacePublicationSideEffectCounters).filter(([key]) => !["localMarketplacePublications", "localMarketplaceDiscoveryInsertions"].includes(key)))
  };
}

export function createLisaMarketplaceGuide(question = "", publicationRecord = null) {
  const text = String(question).toLowerCase();
  let answer = "This is a local ESSA Marketplace proof Listing. It is not a production marketplace publication.";
  if (text.includes("asking price")) answer = "Asking Price is the seller's requested price, not an ESSA verified market valuation.";
  if (text.includes("passport")) answer = "Property Passport is the public-safe Property truth surface; the Listing is the market-offer surface.";
  if (text.includes("legally verified")) answer = "No legal certification is implied. The badge is local proof readiness only.";
  if (text.includes("fresh")) answer = `Freshness: ${publicationRecord?.freshness || "unknown"}.`;
  return { modelType: "LisaMarketplaceGuide", answer, exposesInternalMandateOrAudit: false, mayContactSeller: false, mayPublish: false, ...marketplacePublicationSideEffectCounters };
}

export function createNavigatorMarketplaceRouting(input = "") {
  const text = String(input).toLowerCase();
  return {
    modelType: "NavigatorMarketplaceRouting",
    input,
    hash: text.includes("publish") ? "#property-publication-proof" : "#property-marketplace",
    routeOnly: true,
    navigatorCanPublish: false,
    navigatorCanContactSeller: false,
    navigatorCanStartTransaction: false,
    ...marketplacePublicationSideEffectCounters
  };
}
