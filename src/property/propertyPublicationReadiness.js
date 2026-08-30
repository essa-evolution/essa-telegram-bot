import {
  propertyFreshnessStatuses,
  propertyVerificationStatuses
} from "./propertyContracts.js";
import {
  propertyAuthorityActions,
  propertyAuthorityStatuses,
  propertyRelationshipStatuses
} from "./propertyActorAuthorityContracts.js";
import {
  buildSaleListingFixtures,
  commitSaleListingCreationLocalProof,
  createApprovalForSaleListingCreationIntent,
  createLocalPropertyListingCreationStore,
  saleListingStatuses
} from "./propertySaleListingProof.js";

const now = "2026-08-22T00:00:00.000Z";

export const publicationAuthorityActions = {
  prepareListingForPublication: "PREPARE_LISTING_FOR_PUBLICATION",
  requestListingPublication: "REQUEST_LISTING_PUBLICATION",
  publishSaleListingFuture: "PUBLISH_SALE_LISTING_FUTURE"
};

export const publicationReadinessStatuses = {
  draft: "DRAFT",
  incomplete: "INCOMPLETE",
  reviewRequired: "REVIEW_REQUIRED",
  readyForPublicationApproval: "READY_FOR_PUBLICATION_APPROVAL",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedEvidence: "BLOCKED_EVIDENCE",
  blockedContent: "BLOCKED_CONTENT",
  blockedMedia: "BLOCKED_MEDIA",
  blockedPrivacy: "BLOCKED_PRIVACY",
  blockedJurisdiction: "BLOCKED_JURISDICTION",
  blockedCompliance: "BLOCKED_COMPLIANCE",
  blockedStale: "BLOCKED_STALE",
  blockedPropertyState: "BLOCKED_PROPERTY_STATE",
  blockedListingState: "BLOCKED_LISTING_STATE",
  blockedExclusivityConflict: "BLOCKED_EXCLUSIVITY_CONFLICT",
  notSupported: "NOT_SUPPORTED",
  cancelled: "CANCELLED"
};

export const publicationPlanStatuses = {
  draft: "DRAFT",
  blocked: "BLOCKED",
  readyForPublicationApproval: "READY_FOR_PUBLICATION_APPROVAL",
  stalePlan: "STALE_PLAN",
  cancelled: "CANCELLED"
};

export const publicLocationPolicies = {
  exactPublic: "EXACT_PUBLIC",
  approximatePublic: "APPROXIMATE_PUBLIC",
  districtOnly: "DISTRICT_ONLY",
  cityOnly: "CITY_ONLY",
  hiddenUntilContactFuture: "HIDDEN_UNTIL_CONTACT_FUTURE"
};

export const mediaRightsReadinessStatuses = {
  declaredRightsLocalProof: "DECLARED_RIGHTS_LOCAL_PROOF",
  rightsReviewRequired: "RIGHTS_REVIEW_REQUIRED",
  rightsMissing: "RIGHTS_MISSING",
  notChecked: "NOT_CHECKED",
  blocked: "BLOCKED"
};

export const propertyPublicationChannelTypes = {
  essaPropertyMarketplace: "ESSA_PROPERTY_MARKETPLACE",
  essaStayFuture: "ESSA_STAY_FUTURE",
  externalPortalFuture: "EXTERNAL_PORTAL_FUTURE",
  developerShowcase: "DEVELOPER_SHOWCASE",
  privateShareFuture: "PRIVATE_SHARE_FUTURE"
};

export const localPublicationChannelId = "ESSA_PROPERTY_MARKETPLACE_LOCAL_PREVIEW";

export const publicationComplianceFlags = {
  contentReviewRequired: "CONTENT_REVIEW_REQUIRED",
  disclosureMissing: "DISCLOSURE_MISSING",
  authorityReviewRequired: "AUTHORITY_REVIEW_REQUIRED",
  mediaRightsReviewRequired: "MEDIA_RIGHTS_REVIEW_REQUIRED",
  jurisdictionReviewRequired: "JURISDICTION_REVIEW_REQUIRED",
  possibleDuplicate: "POSSIBLE_DUPLICATE",
  staleListing: "STALE_LISTING",
  privateDataRisk: "PRIVATE_DATA_RISK",
  noneIdentifiedLocalProof: "NONE_IDENTIFIED_LOCAL_PROOF"
};

export const publicationReadinessSideEffectCounters = {
  publicationReadinessEvaluations: 0,
  publicationPlansCreated: 0,
  publishActions: 0,
  publicDiscoveryInsertions: 0,
  listingMutations: 0,
  canonicalPropertyMutations: 0,
  ownershipMutations: 0,
  providerCalls: 0,
  externalCalls: 0,
  productionDbMutations: 0,
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
};

const privateDenylist = [
  "ownership_document",
  "mandate_document",
  "passport_identity",
  "reviewer_note",
  "protected_doc_ref",
  "bank_account",
  "private_phone",
  "private_email",
  "approval_token",
  "execution_record",
  "membership_evidence",
  "kyc",
  "kyb",
  "cadastral_private"
];

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
  return `publication_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function factValue(property = {}, type) {
  return (property.facts || []).find((fact) => fact.factType === type)?.value;
}

function hasPrivateText(value) {
  const text = stableStringify(value || {}).toLowerCase();
  return privateDenylist.some((token) => text.includes(token));
}

function makeReadiness(status, details = {}) {
  return {
    readinessStatus: status,
    blockers: details.blockers || [],
    warnings: details.warnings || [],
    missingRequirements: details.missingRequirements || []
  };
}

export function createPropertyPublicationChannel(input = {}) {
  return {
    modelType: "PropertyPublicationChannel",
    channelId: input.channelId || localPublicationChannelId,
    channelType: input.channelType || propertyPublicationChannelTypes.essaPropertyMarketplace,
    channelName: input.channelName || "ESSA Property Marketplace Local Preview",
    ownership: input.ownership || "ESSA_LOCAL",
    status: input.status || "LOCAL_PREVIEW_READY",
    capabilities: input.capabilities || ["SALE_LISTING_PREVIEW", "PUBLIC_SAFE_PROJECTION", "PASSPORT_LINK_READY"],
    requirements: input.requirements || ["PUBLIC_SAFE_CONTENT", "SAFE_LOCATION", "MEDIA_RIGHTS", "LOCAL_DEMO_JURISDICTION"],
    providerRequired: false,
    publicationMode: "READINESS_ONLY_NO_DISPATCH",
    ...publicationReadinessSideEffectCounters
  };
}

export function createListingPublicationJurisdictionContext(input = {}) {
  const jurisdiction = input.jurisdiction || "LOCAL_DEMO";
  const unknown = jurisdiction === "UNKNOWN";
  return {
    modelType: "ListingPublicationJurisdictionContext",
    jurisdiction,
    publicationRuleStatus: unknown ? "UNKNOWN_RULES_NOT_PUBLICATION_READY" : "LOCAL_DEMO_RULES_READY",
    requiredDisclosures: unknown ? ["JURISDICTION_REVIEW_REQUIRED"] : ["LOCAL_DEMO_DISCLOSURE"],
    prohibitedContentFlags: input.prohibitedContentFlags || [],
    professionalReviewRequired: unknown,
    sourceRefs: input.sourceRefs || [{ sourceType: "LOCAL_FIXTURE", sourceName: "phase_23h_local_publication_readiness", sourceId: `jurisdiction_${jurisdiction.toLowerCase()}` }],
    verifiedAt: now,
    limitations: ["Local readiness fixture only; no legal conclusion."]
  };
}

export function createListingMediaReadiness(input = {}) {
  const mediaRefs = input.mediaRefs || [];
  const fixture = input.fixture || {};
  const unsupportedMediaCount = mediaRefs.filter((ref) => String(ref).includes("unsupported")).length;
  const missingMediaWarnings = mediaRefs.length ? [] : ["At least one local image reference is required for marketplace preview."];
  const privacyFlags = fixture.mediaPrivacyFlags || [];
  const rightsReadiness = fixture.mediaRightsReadiness || mediaRightsReadinessStatuses.declaredRightsLocalProof;
  const blocked = unsupportedMediaCount > 0 || rightsReadiness === mediaRightsReadinessStatuses.rightsMissing || rightsReadiness === mediaRightsReadinessStatuses.blocked;
  return {
    modelType: "ListingMediaReadiness",
    mediaRefs: clone(mediaRefs),
    coverMediaRef: mediaRefs[0] || null,
    photoCount: mediaRefs.length,
    unsupportedMediaCount,
    missingMediaWarnings,
    privacyFlags,
    rightsReadiness,
    readinessStatus: blocked || missingMediaWarnings.length || privacyFlags.length ? publicationReadinessStatuses.blockedMedia : publicationReadinessStatuses.readyForPublicationApproval
  };
}

export function createPublicSafeSaleListingProjection(input = {}) {
  const { property = {}, listing = {}, fixture = {}, mediaReadiness = {} } = input;
  const locationPolicy = fixture.locationPolicy || publicLocationPolicies.cityOnly;
  const safeLocation = locationPolicy === publicLocationPolicies.exactPublic
    ? { city: property.city, region: property.region, address: property.address }
    : locationPolicy === publicLocationPolicies.districtOnly
      ? { city: property.city, region: property.region, district: fixture.publicDistrict || "Public demo district" }
      : locationPolicy === publicLocationPolicies.hiddenUntilContactFuture
        ? { city: property.city, locationHiddenUntilContactFuture: true }
        : { city: property.city, region: property.region };
  const projection = {
    modelType: "PublicSafeSaleListingProjection",
    listingId: listing.listingId,
    propertyId: listing.propertyId,
    listingType: "SALE",
    publicTitle: listing.listingTitle,
    publicDescription: listing.listingDescription,
    propertyType: property.propertyType,
    safeLocation,
    askingPrice: listing.price,
    currency: listing.currency,
    safeMediaRefs: clone(mediaReadiness.mediaRefs || []).filter((ref) => !String(ref).includes("private")),
    publicAmenities: clone(fixture.publicAmenities || []),
    publicVerificationBadges: ["LOCAL_PROOF", propertyVerificationStatuses.partiallyVerified],
    freshness: listing.freshnessStatus || propertyFreshnessStatuses.current,
    publicRiskLimitationSummary: "Local readiness preview. Not published. No legal conclusion.",
    sellerRepresentationTypeSafeSummary: listing.mandateRef ? "Authorized representative" : "Owner represented locally",
    passportPublicLinkReadiness: "PUBLIC_SAFE_PASSPORT_LINK_READY",
    contactSellerEnabled: false,
    publishEnabled: false
  };
  return projection;
}

function evaluateContent(property = {}, listing = {}, fixture = {}) {
  const missing = [];
  const blockers = [];
  const warnings = [];
  if (!listing.listingTitle) missing.push("public title");
  if (!listing.listingDescription) missing.push("public description");
  if (!property.propertyType) missing.push("property type");
  if (!Number.isFinite(Number(listing.price)) || Number(listing.price) <= 0 || !["USD", "GEL", "EUR"].includes(listing.currency)) blockers.push("Invalid asking price/currency.");
  if (hasPrivateText({ title: listing.listingTitle, description: listing.listingDescription, extra: fixture.publicContentExtra })) blockers.push("Private/internal text detected in public content.");
  if (/\bundefined\b|\bnull\b|\[object Object\]/i.test(`${listing.listingTitle || ""} ${listing.listingDescription || ""}`)) blockers.push("Placeholder/null/object text detected.");
  const canonicalArea = factValue(property, "UNIT_AREA_SQM");
  if (fixture.claimedAreaSqm != null && Number(fixture.claimedAreaSqm) !== Number(canonicalArea)) blockers.push(`Listing area ${fixture.claimedAreaSqm} conflicts with canonical area ${canonicalArea}.`);
  if (fixture.claimedBedrooms != null && factValue(property, "BEDROOMS") != null && Number(fixture.claimedBedrooms) !== Number(factValue(property, "BEDROOMS"))) blockers.push("Listing bedrooms conflict with canonical bedrooms.");
  if (/best investment|guaranteed return/i.test(listing.listingDescription || "")) warnings.push("Promotional copy remains marketing copy, not verified Property fact.");
  return makeReadiness(missing.length ? publicationReadinessStatuses.incomplete : blockers.length ? publicationReadinessStatuses.blockedContent : publicationReadinessStatuses.readyForPublicationApproval, { blockers, warnings, missingRequirements: missing });
}

function evaluateEvidence(property = {}, listing = {}, fixture = {}) {
  const missing = [];
  if (!(property.sourceRefs || []).length) missing.push("property source");
  if (!(property.facts || []).length) missing.push("property facts");
  if (!(listing.evidenceRefs || []).length) missing.push("listing authority evidence");
  if (fixture.mediaRightsReadiness === mediaRightsReadinessStatuses.rightsMissing) missing.push("media rights declaration");
  return makeReadiness(missing.length ? publicationReadinessStatuses.blockedEvidence : publicationReadinessStatuses.readyForPublicationApproval, { missingRequirements: missing });
}

function evaluateAuthority(property = {}, listing = {}, fixture = {}) {
  const actor = fixture.actor || {};
  const relationship = fixture.relationship || {};
  const authority = fixture.authorityGrant || {};
  const blockers = [];
  if (!actor.actorId || actor.actorId !== listing.actorId) blockers.push("Actor missing or mismatched.");
  if (!relationship.relationshipId || relationship.propertyId !== listing.propertyId || relationship.relationshipStatus !== propertyRelationshipStatuses.activeLocalProof) blockers.push("Active relationship to Property required.");
  if (!authority.authorityGrantId || authority.authorityGrantId !== listing.authorityGrantId || authority.status !== propertyAuthorityStatuses.activeLocalProof || authority.expired === true) blockers.push("Active authority required at publication-readiness time.");
  const allowed = authority.allowedActions || [];
  const canPrepare = allowed.includes(publicationAuthorityActions.prepareListingForPublication) ||
    allowed.includes(publicationAuthorityActions.requestListingPublication) ||
    allowed.includes(propertyAuthorityActions.createSaleListing);
  if (!canPrepare) blockers.push("Authority does not permit publication-readiness preparation.");
  if (authority.scope?.propertyId !== property.propertyId) blockers.push("Authority scope no longer matches Property.");
  const price = Number(listing.price);
  const priceScope = authority.priceScope || listing.priceScope || fixture.saleListingIntent?.priceScope;
  if (priceScope && (price < Number(priceScope.minPrice) || price > Number(priceScope.maxPrice))) blockers.push("Asking price is outside current authority scope.");
  return makeReadiness(blockers.length ? publicationReadinessStatuses.blockedAuthority : publicationReadinessStatuses.readyForPublicationApproval, { blockers });
}

function evaluateFreshness(listing = {}, fixture = {}) {
  const status = fixture.freshnessStatus || listing.freshnessStatus || propertyFreshnessStatuses.current;
  if (status === "STALE" || status === propertyFreshnessStatuses.stale) {
    return makeReadiness(publicationReadinessStatuses.blockedStale, { blockers: ["Listing freshness is STALE under local policy."] });
  }
  if (status === "AGING") return makeReadiness(publicationReadinessStatuses.reviewRequired, { warnings: ["Listing is aging and should be reviewed."] });
  return makeReadiness(publicationReadinessStatuses.readyForPublicationApproval);
}

function evaluatePrivacy(projection = {}, fixture = {}) {
  const blockers = [];
  const warnings = [];
  if (hasPrivateText(projection) || hasPrivateText(fixture.publicLeakCandidate)) blockers.push("Public projection contains private denylisted data.");
  if (fixture.locationPolicy === publicLocationPolicies.exactPublic && fixture.exactLocationSensitive !== false) warnings.push("Exact address requires explicit policy confirmation.");
  return makeReadiness(blockers.length ? publicationReadinessStatuses.blockedPrivacy : publicationReadinessStatuses.readyForPublicationApproval, { blockers, warnings });
}

function evaluateJurisdiction(context = {}) {
  if (context.jurisdiction === "UNKNOWN") return makeReadiness(publicationReadinessStatuses.blockedJurisdiction, { blockers: ["Unknown jurisdiction cannot become real publication-ready."] });
  return makeReadiness(publicationReadinessStatuses.readyForPublicationApproval);
}

function evaluateCompliance(input = {}) {
  const flags = [];
  if (input.jurisdictionReadiness.readinessStatus === publicationReadinessStatuses.blockedJurisdiction) flags.push(publicationComplianceFlags.jurisdictionReviewRequired);
  if (input.mediaReadiness.rightsReadiness !== mediaRightsReadinessStatuses.declaredRightsLocalProof) flags.push(publicationComplianceFlags.mediaRightsReviewRequired);
  if (input.privacyReadiness.readinessStatus === publicationReadinessStatuses.blockedPrivacy) flags.push(publicationComplianceFlags.privateDataRisk);
  if (input.freshnessReadiness.readinessStatus === publicationReadinessStatuses.blockedStale) flags.push(publicationComplianceFlags.staleListing);
  if ((input.requiredDisclosures || []).includes("MISSING_DISCLOSURE")) flags.push(publicationComplianceFlags.disclosureMissing);
  if (!flags.length) flags.push(publicationComplianceFlags.noneIdentifiedLocalProof);
  return {
    readinessStatus: flags.length === 1 && flags[0] === publicationComplianceFlags.noneIdentifiedLocalProof
      ? publicationReadinessStatuses.readyForPublicationApproval
      : publicationReadinessStatuses.reviewRequired,
    flags,
    legalConclusion: false
  };
}

function chooseStatus(checks = {}) {
  const order = [
    publicationReadinessStatuses.blockedPropertyState,
    publicationReadinessStatuses.blockedListingState,
    publicationReadinessStatuses.blockedAuthority,
    publicationReadinessStatuses.blockedExclusivityConflict,
    publicationReadinessStatuses.blockedPrivacy,
    publicationReadinessStatuses.blockedContent,
    publicationReadinessStatuses.blockedMedia,
    publicationReadinessStatuses.blockedEvidence,
    publicationReadinessStatuses.blockedStale,
    publicationReadinessStatuses.blockedJurisdiction,
    publicationReadinessStatuses.blockedCompliance,
    publicationReadinessStatuses.incomplete,
    publicationReadinessStatuses.reviewRequired
  ];
  const statuses = Object.values(checks).map((check) => check?.readinessStatus).filter(Boolean);
  return order.find((status) => statuses.includes(status)) || publicationReadinessStatuses.readyForPublicationApproval;
}

export function createPublicationReadinessIntent(input = {}) {
  return {
    modelType: "PublicationReadinessIntent",
    publicationReadinessIntentId: input.publicationReadinessIntentId || `publication_readiness_intent_${input.listingId || "local"}`,
    listingId: input.listingId,
    propertyId: input.propertyId,
    actorId: input.actorId,
    authorityGrantId: input.authorityGrantId,
    targetChannelIds: input.targetChannelIds || [localPublicationChannelId],
    executionAction: null,
    publishActionEnabled: false,
    createdAt: now,
    ...publicationReadinessSideEffectCounters
  };
}

export function evaluatePropertyListingPublicationReadiness(input = {}) {
  const { store = createLocalPropertyListingCreationStore(), intent = {}, fixture = {}, channel = createPropertyPublicationChannel() } = input;
  const property = store.getProperty(intent.propertyId);
  const listing = store.getListing(intent.listingId);
  const propertyStatus = !property || property.currentStatus !== "CREATED_LOCAL_PROOF"
    ? makeReadiness(publicationReadinessStatuses.blockedPropertyState, { blockers: ["Canonical Property must exist and be active local proof."] })
    : makeReadiness(publicationReadinessStatuses.readyForPublicationApproval);
  const listingStatus = !listing || listing.propertyId !== intent.propertyId || listing.listingType !== "SALE" || [saleListingStatuses.rolledBackLocalProof, saleListingStatuses.withdrawnLocalProof, saleListingStatuses.closedLocalProof].includes(listing.listingStatus)
    ? makeReadiness(publicationReadinessStatuses.blockedListingState, { blockers: ["Existing active local SALE Listing is required."] })
    : makeReadiness(publicationReadinessStatuses.readyForPublicationApproval);
  const safeProperty = property || {};
  const safeListing = listing || {};
  const authorityReadiness = evaluateAuthority(safeProperty, safeListing, fixture);
  const contentReadiness = evaluateContent(safeProperty, safeListing, fixture);
  const evidenceReadiness = evaluateEvidence(safeProperty, safeListing, fixture);
  const mediaReadiness = createListingMediaReadiness({ mediaRefs: safeListing.mediaRefs || [], fixture });
  const projection = createPublicSafeSaleListingProjection({ property: safeProperty, listing: safeListing, fixture, mediaReadiness });
  const privacyReadiness = evaluatePrivacy(projection, fixture);
  const jurisdictionContext = createListingPublicationJurisdictionContext({ jurisdiction: fixture.jurisdiction || safeListing.jurisdictionContext || "LOCAL_DEMO" });
  const jurisdictionReadiness = evaluateJurisdiction(jurisdictionContext);
  const freshnessReadiness = evaluateFreshness(safeListing, fixture);
  const exclusivityReadiness = fixture.exclusiveConflict
    ? makeReadiness(publicationReadinessStatuses.blockedExclusivityConflict, { blockers: ["Exclusive mandate conflict detected at publication-readiness time."] })
    : makeReadiness(publicationReadinessStatuses.readyForPublicationApproval);
  const channelReadiness = channel.channelId === localPublicationChannelId && safeListing.listingType === "SALE"
    ? makeReadiness(publicationReadinessStatuses.readyForPublicationApproval)
    : makeReadiness(publicationReadinessStatuses.notSupported, { blockers: ["Target channel does not support this local sale Listing preview."] });
  const complianceReadiness = evaluateCompliance({
    jurisdictionReadiness,
    mediaReadiness,
    privacyReadiness,
    freshnessReadiness,
    requiredDisclosures: jurisdictionContext.requiredDisclosures
  });
  const checks = {
    propertyStatus,
    listingStatus,
    authorityReadiness,
    contentReadiness,
    evidenceReadiness,
    mediaReadiness,
    privacyReadiness,
    jurisdictionReadiness,
    complianceReadiness,
    freshnessReadiness,
    exclusivityReadiness,
    channelReadiness
  };
  const readinessStatus = chooseStatus(checks);
  const blockers = Object.values(checks).flatMap((check) => check.blockers || []);
  const warnings = Object.values(checks).flatMap((check) => check.warnings || []);
  const missingRequirements = Object.values(checks).flatMap((check) => check.missingRequirements || []);
  const readiness = {
    modelType: "PropertyListingPublicationReadiness",
    publicationReadinessId: `publication_readiness_${intent.listingId || "missing"}`,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    actorId: intent.actorId,
    authorityGrantId: intent.authorityGrantId,
    mandateRef: safeListing.mandateRef || null,
    listingStatus: safeListing.listingStatus || "MISSING",
    propertyStatus: safeProperty.currentStatus || "MISSING",
    authorityStatus: fixture.authorityGrant?.status || "MISSING",
    authorityScope: clone(fixture.authorityGrant?.scope || {}),
    authorityReadiness,
    contentReadiness,
    mediaReadiness,
    evidenceReadiness,
    privacyReadiness,
    jurisdictionReadiness,
    complianceReadiness,
    freshnessReadiness,
    channelReadiness,
    exclusivityReadiness,
    visibilityReadiness: readinessStatus === publicationReadinessStatuses.readyForPublicationApproval ? "MARKETPLACE_DISCOVERY_READY" : "NOT_DISCOVERY_READY",
    missingRequirements,
    blockers,
    warnings,
    readinessStatus,
    createdAt: now,
    updatedAt: now,
    auditMetadata: {
      readinessOnly: true,
      publishesListing: false,
      publicDiscoveryInserted: false,
      providerDispatch: false
    },
    publicationReadinessEvaluations: 1,
    publicationPlansCreated: 0,
    ...Object.fromEntries(Object.entries(publicationReadinessSideEffectCounters).filter(([key]) => key !== "publicationReadinessEvaluations"))
  };
  return { readiness, projection, jurisdictionContext, channel, checks };
}

export function createPropertyListingPublicationPlan(input = {}) {
  const { readiness = {}, projection = {}, listing = {}, property = {}, authorityGrant = {}, channel = createPropertyPublicationChannel() } = input;
  const ready = readiness.readinessStatus === publicationReadinessStatuses.readyForPublicationApproval;
  const publicProjectionFingerprint = fingerprint(projection);
  const plan = {
    modelType: "PropertyListingPublicationPlan",
    publicationPlanId: `publication_plan_${readiness.listingId || "missing"}`,
    listingId: readiness.listingId,
    propertyId: readiness.propertyId,
    targetChannels: [channel],
    publicProjectionFingerprint,
    listingFingerprint: fingerprint({
      listingId: listing.listingId,
      title: listing.listingTitle,
      description: listing.listingDescription,
      price: listing.price,
      currency: listing.currency,
      mediaRefs: listing.mediaRefs
    }),
    authorityFingerprint: fingerprint(authorityGrant),
    readinessSnapshot: clone(readiness),
    blockers: clone(readiness.blockers || []),
    warnings: clone(readiness.warnings || []),
    requiredApprovals: ready ? ["HUMAN_PUBLICATION_APPROVAL_REQUIRED_FUTURE"] : [],
    generatedAt: now,
    planStatus: ready ? publicationPlanStatuses.readyForPublicationApproval : publicationPlanStatuses.blocked,
    fingerprintInputs: {
      listingId: listing.listingId,
      propertyFactsFingerprint: fingerprint(property.facts || []),
      price: listing.price,
      mediaRefs: clone(listing.mediaRefs || []),
      privacy: projection.safeLocation,
      disclosures: readiness.jurisdictionReadiness?.warnings || [],
      channelId: channel.channelId
    },
    ...publicationReadinessSideEffectCounters,
    publicationPlansCreated: 1
  };
  return plan;
}

export function detectPublicationPlanStaleness(plan = {}, current = {}) {
  const nextListingFingerprint = fingerprint({
    listingId: current.listing?.listingId,
    title: current.listing?.listingTitle,
    description: current.listing?.listingDescription,
    price: current.listing?.price,
    currency: current.listing?.currency,
    mediaRefs: current.listing?.mediaRefs
  });
  const nextProjectionFingerprint = fingerprint(current.projection || {});
  const nextAuthorityFingerprint = fingerprint(current.authorityGrant || {});
  const stale = plan.listingFingerprint !== nextListingFingerprint ||
    plan.publicProjectionFingerprint !== nextProjectionFingerprint ||
    plan.authorityFingerprint !== nextAuthorityFingerprint;
  return {
    modelType: "PublicationPlanStalenessCheck",
    planStatus: stale ? publicationPlanStatuses.stalePlan : plan.planStatus,
    stale,
    rePreflightRequired: stale,
    changed: {
      listing: plan.listingFingerprint !== nextListingFingerprint,
      projection: plan.publicProjectionFingerprint !== nextProjectionFingerprint,
      authority: plan.authorityFingerprint !== nextAuthorityFingerprint
    },
    ...publicationReadinessSideEffectCounters
  };
}

export function createPublicationReadinessExplanation(readiness = {}) {
  const ready = readiness.readinessStatus === publicationReadinessStatuses.readyForPublicationApproval;
  return {
    modelType: "PublicationReadinessExplanation",
    readinessStatus: readiness.readinessStatus,
    readyChecks: ready ? ["Property exists", "Listing exists", "Authority current", "Public projection safe", "Local channel compatible"] : [],
    warnings: clone(readiness.warnings || []),
    blockers: clone(readiness.blockers || []),
    missingRequirements: clone(readiness.missingRequirements || []),
    publicProjectionWarnings: readiness.privacyReadiness?.warnings || [],
    authorityWarnings: readiness.authorityReadiness?.warnings || [],
    evidenceWarnings: readiness.evidenceReadiness?.warnings || [],
    mediaWarnings: readiness.mediaReadiness?.missingMediaWarnings || [],
    jurisdictionWarnings: readiness.jurisdictionReadiness?.warnings || [],
    nextStep: ready ? "Human publication approval may be requested in a future phase." : "Resolve blockers and re-run publication readiness.",
    mandatoryAnswer: "No. Phase 23H only evaluates publication readiness.",
    ...publicationReadinessSideEffectCounters
  };
}

export function createSaleListingPublicationReviewPayload(readiness = {}) {
  return {
    modelType: "PropertyReviewCasePackage",
    reviewType: "SALE_LISTING_PUBLICATION_REVIEW",
    listingId: readiness.listingId,
    propertyId: readiness.propertyId,
    readinessStatus: readiness.readinessStatus,
    blockers: clone(readiness.blockers || []),
    warnings: clone(readiness.warnings || []),
    duplicateReviewQueueCreated: false,
    publishesAutomatically: false,
    ...publicationReadinessSideEffectCounters
  };
}

function makePublicationScenario(caseKey = "owner") {
  const fixtures = buildSaleListingFixtures();
  const source = {
    owner: fixtures.owner,
    agent: fixtures.agent,
    expiredAuthority: fixtures.agent,
    manager: fixtures.manager,
    serviceProvider: fixtures.cleaner,
    exclusiveConflict: fixtures.exclusiveB
  }[caseKey] || fixtures.owner;
  let intent = {
    owner: fixtures.intents.owner,
    agent: fixtures.intents.agent,
    expiredAuthority: fixtures.intents.agent,
    manager: fixtures.intents.owner,
    serviceProvider: fixtures.intents.owner,
    exclusiveConflict: fixtures.intents.exclusiveB
  }[caseKey] || fixtures.intents.owner;
  const store = createLocalPropertyListingCreationStore({ properties: [fixtures.property] });
  const creationResult = ["missingListing"].includes(caseKey)
    ? null
    : commitSaleListingCreationLocalProof({
      intent,
      approval: createApprovalForSaleListingCreationIntent(intent),
      store
    });
  const listing = creationResult?.listing || store.getListing(intent.expectedPostConditions?.listingId);
  const authorityGrant = clone(source.authorityGrant || {});
  authorityGrant.allowedActions = Array.from(new Set([...(authorityGrant.allowedActions || []), publicationAuthorityActions.prepareListingForPublication]));
  if (caseKey === "expiredAuthority") authorityGrant.status = propertyAuthorityStatuses.expired;
  const fixture = {
    property: fixtures.property,
    listing,
    actor: source.actor,
    relationship: source.relationship,
    authorityGrant,
    saleListingIntent: source.saleListingIntent,
    locationPolicy: publicLocationPolicies.cityOnly,
    mediaRightsReadiness: mediaRightsReadinessStatuses.declaredRightsLocalProof,
    freshnessStatus: propertyFreshnessStatuses.current,
    jurisdiction: "LOCAL_DEMO",
    publicAmenities: [{ amenity: "Elevator", sourceBacked: true }]
  };
  if (caseKey === "privateData") fixture.publicLeakCandidate = "protected_doc_ref ownership_document private_email";
  if (caseKey === "contentConflict") fixture.claimedAreaSqm = 99;
  if (caseKey === "missingMedia" && listing) {
    listing.mediaRefs = [];
    store.addListing(listing);
  }
  if (caseKey === "mediaRights") fixture.mediaRightsReadiness = mediaRightsReadinessStatuses.rightsMissing;
  if (caseKey === "stale") fixture.freshnessStatus = "STALE";
  if (caseKey === "unknownJurisdiction") fixture.jurisdiction = "UNKNOWN";
  if (caseKey === "exclusiveConflict") fixture.exclusiveConflict = true;
  if (caseKey === "marketingCopy" && listing) {
    listing.listingDescription = "Best investment in Batumi. Unpublished local sale listing proof.";
    store.addListing(listing);
  }
  return { fixtures, source, intent, store, listing, fixture };
}

export function buildPublicationReadinessFixtures() {
  const owner = makePublicationScenario("owner");
  const agent = makePublicationScenario("agent");
  return {
    owner,
    agent,
    expiredAuthority: makePublicationScenario("expiredAuthority"),
    manager: makePublicationScenario("manager"),
    serviceProvider: makePublicationScenario("serviceProvider"),
    privateData: makePublicationScenario("privateData"),
    contentConflict: makePublicationScenario("contentConflict"),
    missingMedia: makePublicationScenario("missingMedia"),
    mediaRights: makePublicationScenario("mediaRights"),
    stale: makePublicationScenario("stale"),
    unknownJurisdiction: makePublicationScenario("unknownJurisdiction"),
    exclusiveConflict: makePublicationScenario("exclusiveConflict"),
    marketingCopy: makePublicationScenario("marketingCopy"),
    stalePlan: owner,
    missingListing: makePublicationScenario("missingListing")
  };
}

export function buildPublicationReadinessViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "owner";
  const fixtures = buildPublicationReadinessFixtures();
  const scenario = fixtures[caseKey] || fixtures.owner;
  const listing = scenario.listing || {};
  const intent = createPublicationReadinessIntent({
    listingId: listing.listingId || scenario.intent.expectedPostConditions?.listingId,
    propertyId: scenario.intent.propertyId,
    actorId: scenario.intent.actorId,
    authorityGrantId: scenario.intent.authorityGrantId
  });
  const channel = createPropertyPublicationChannel();
  const evaluation = evaluatePropertyListingPublicationReadiness({
    store: scenario.store,
    intent,
    fixture: scenario.fixture,
    channel
  });
  const property = scenario.store.getProperty(intent.propertyId) || scenario.fixture.property;
  const currentListing = scenario.store.getListing(intent.listingId) || listing;
  const plan = createPropertyListingPublicationPlan({
    readiness: evaluation.readiness,
    projection: evaluation.projection,
    listing: currentListing,
    property,
    authorityGrant: scenario.fixture.authorityGrant,
    channel
  });
  const changedListing = { ...currentListing, price: Number(currentListing.price || 0) + 1000 };
  const changedProjection = createPublicSafeSaleListingProjection({
    property,
    listing: changedListing,
    fixture: scenario.fixture,
    mediaReadiness: evaluation.readiness.mediaReadiness
  });
  const stalePlan = detectPublicationPlanStaleness(plan, {
    listing: changedListing,
    projection: changedProjection,
    authorityGrant: scenario.fixture.authorityGrant
  });
  const explanation = createPublicationReadinessExplanation(evaluation.readiness);
  const reviewPayload = createSaleListingPublicationReviewPayload(evaluation.readiness);
  return {
    modelType: "PropertySaleListingPublicationReadinessViewModel",
    route: "#property-sale-publication-readiness",
    caseKey,
    banner: "PUBLICATION READINESS ONLY. NOT PUBLISHED. NO PROVIDER DISPATCH. NO PRODUCTION WRITE.",
    property,
    listing: currentListing,
    intent,
    channel,
    readiness: evaluation.readiness,
    projection: evaluation.projection,
    jurisdictionContext: evaluation.jurisdictionContext,
    plan,
    stalePlan,
    explanation,
    reviewPayload,
    viewAsPublic: {
      mode: "VIEW_AS_PUBLIC",
      projection: evaluation.projection,
      internalFieldsVisible: false,
      searchIndexed: false,
      publicRouteActive: false
    },
    lisaGuide: createLisaPublicationReadinessGuide("Is the Listing public now?", evaluation.readiness),
    navigatorRouting: createNavigatorPublicationReadinessRouting("I want to publish this Listing."),
    marketplaceDiscoveryReady: evaluation.readiness.readinessStatus === publicationReadinessStatuses.readyForPublicationApproval,
    actualDiscoveryInsertion: false,
    publicationReadinessEvaluations: evaluation.readiness.publicationReadinessEvaluations,
    publicationPlansCreated: plan.publicationPlansCreated,
    ...Object.fromEntries(Object.entries(publicationReadinessSideEffectCounters).filter(([key]) => !["publicationReadinessEvaluations", "publicationPlansCreated"].includes(key)))
  };
}

export function createLisaPublicationReadinessGuide(question = "", readiness = {}) {
  const text = String(question).toLowerCase();
  let answer = "No. Phase 23H only evaluates publication readiness.";
  if (text.includes("why") || text.includes("missing")) {
    answer = readiness.blockers?.length || readiness.missingRequirements?.length
      ? `No. Phase 23H only evaluates publication readiness. Blockers: ${[...(readiness.blockers || []), ...(readiness.missingRequirements || [])].join("; ")}`
      : "No. Phase 23H only evaluates publication readiness. This Listing is ready for a future human publication approval.";
  }
  if (text.includes("ownership documents") || text.includes("documents")) answer = "No. Private ownership, mandate, identity, KYC/KYB, and evidence documents are not included in the public projection.";
  if (text.includes("address") || text.includes("location")) answer = "Exact apartment/unit-sensitive location is hidden by local public-location policy unless a future explicit policy allows it.";
  if (text.includes("price")) answer = "The public price is an Asking Price / Requested Price, not a verified Property valuation.";
  return {
    modelType: "LisaPublicationReadinessGuide",
    answer,
    mayApprove: false,
    mayPublish: false,
    mayExecute: false,
    ...publicationReadinessSideEffectCounters
  };
}

export function createNavigatorPublicationReadinessRouting(input = "") {
  return {
    modelType: "NavigatorPublicationReadinessRouting",
    input,
    hash: "#property-sale-publication-readiness",
    routeOnly: true,
    navigatorCanApprove: false,
    navigatorCanExecute: false,
    navigatorCanPublish: false,
    ...publicationReadinessSideEffectCounters
  };
}
