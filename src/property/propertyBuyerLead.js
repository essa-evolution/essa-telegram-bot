import {
  buildMarketplacePublicationViewModel,
  createMarketplacePublicationScenario,
  marketplacePublicationStatuses
} from "./propertyMarketplacePublication.js";
import { propertyAuthorityStatuses } from "./propertyActorAuthorityContracts.js";

const now = "2026-08-22T00:00:00.000Z";

export const buyerInterestIntentTypes = {
  generalInterest: "GENERAL_INTEREST",
  requestMoreInformation: "REQUEST_MORE_INFORMATION",
  requestViewingFuture: "REQUEST_VIEWING_FUTURE",
  askAboutPrice: "ASK_ABOUT_PRICE",
  askAboutDocuments: "ASK_ABOUT_DOCUMENTS",
  askAboutFinancing: "ASK_ABOUT_FINANCING",
  askAboutLocation: "ASK_ABOUT_LOCATION",
  askAboutAvailability: "ASK_ABOUT_AVAILABILITY",
  buyerIntent: "BUYER_INTENT",
  investorInterest: "INVESTOR_INTEREST",
  otherStructuredInquiry: "OTHER_STRUCTURED_INQUIRY"
};

export const sellerContactReadinessStatuses = {
  draft: "DRAFT",
  incomplete: "INCOMPLETE",
  readyForLocalLeadCreation: "READY_FOR_LOCAL_LEAD_CREATION",
  readyForFutureContactDispatch: "READY_FOR_FUTURE_CONTACT_DISPATCH",
  blockedBuyerConsent: "BLOCKED_BUYER_CONSENT",
  blockedListingNotPublic: "BLOCKED_LISTING_NOT_PUBLIC",
  blockedListingStale: "BLOCKED_LISTING_STALE",
  blockedSellerRouting: "BLOCKED_SELLER_ROUTING",
  blockedAuthority: "BLOCKED_AUTHORITY",
  blockedPrivacy: "BLOCKED_PRIVACY",
  blockedSpam: "BLOCKED_SPAM",
  blockedDuplicate: "BLOCKED_DUPLICATE",
  blockedPolicy: "BLOCKED_POLICY",
  reviewRequired: "REVIEW_REQUIRED",
  cancelled: "CANCELLED"
};

export const leadAntiSpamStatuses = {
  pass: "PASS",
  reviewRequired: "REVIEW_REQUIRED",
  blockedDuplicate: "BLOCKED_DUPLICATE",
  blockedRate: "BLOCKED_RATE",
  blockedPattern: "BLOCKED_PATTERN",
  blockedActor: "BLOCKED_ACTOR"
};

export const propertyLeadStatuses = {
  newLocalProof: "NEW_LOCAL_PROOF",
  contactReady: "CONTACT_READY",
  waitingForSellerFuture: "WAITING_FOR_SELLER_FUTURE",
  reviewRequired: "REVIEW_REQUIRED",
  duplicate: "DUPLICATE",
  blocked: "BLOCKED",
  closedLocal: "CLOSED_LOCAL",
  superseded: "SUPERSEDED"
};

export const propertyLeadAuditEvents = {
  interestCreated: "BUYER_INTEREST_INTENT_CREATED",
  consentRecorded: "BUYER_CONSENT_RECORDED",
  routeResolved: "SELLER_ROUTE_RESOLVED",
  antiSpamPassed: "LEAD_ANTI_SPAM_CHECK_PASSED",
  leadCreated: "LEAD_CREATED_LOCAL_PROOF",
  attributionRecorded: "LEAD_ATTRIBUTION_RECORDED",
  inboxCreated: "SELLER_INBOX_ITEM_CREATED_LOCAL_PROOF",
  blocked: "LEAD_CREATION_BLOCKED",
  duplicate: "LEAD_DUPLICATE_DETECTED",
  cancelled: "LEAD_CANCELLED_LOCAL"
};

export const propertyLeadSideEffectCounters = {
  localBuyerInterestIntents: 0,
  localPropertyLeadsCreated: 0,
  sellerInboxItemsCreatedLocal: 0,
  duplicateLeadsCreated: 0,
  sellerContactActions: 0,
  sellerPhoneReveals: 0,
  sellerEmailReveals: 0,
  buyerPhoneReveals: 0,
  buyerEmailReveals: 0,
  offerActions: 0,
  reservationActions: 0,
  dealRoomActions: 0,
  canonicalPropertyMutations: 0,
  listingMutations: 0,
  publicationMutations: 0,
  ownershipMutations: 0,
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
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function fingerprint(value = {}) {
  let hash = 2166136261;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `lead_fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sanitizeMessage(message = "") {
  return String(message)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[private_email_hidden]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[private_phone_hidden]")
    .replace(/https?:\/\/\S+/gi, "[url_removed]")
    .slice(0, 500)
    .trim();
}

export function generateLocalPropertyLeadId(input = {}) {
  return `lead_local_${input.listingId}_${fingerprint({ buyer: input.buyerActorRef, intent: input.intentType, message: input.buyerMessage }).replace("lead_fp_", "").slice(0, 8)}`;
}

export function createLocalPropertyLeadStore(input = {}) {
  const leads = new Map((input.leads || []).map((lead) => [lead.leadId, clone(lead)]));
  const inbox = new Map((input.inboxItems || []).map((item) => [item.leadId, clone(item)]));
  const audit = [];
  return {
    addLead(lead) {
      leads.set(lead.leadId, clone(lead));
    },
    listLeads() {
      return Array.from(leads.values()).map(clone);
    },
    findLead(predicate) {
      return clone(Array.from(leads.values()).find(predicate));
    },
    addInboxItem(item) {
      inbox.set(item.leadId, clone(item));
    },
    listInboxItems(filters = {}) {
      return Array.from(inbox.values()).filter((item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.listingId && item.listingId !== filters.listingId) return false;
        if (filters.propertyId && item.propertyId !== filters.propertyId) return false;
        if (filters.interestType && item.interestType !== filters.interestType) return false;
        if (filters.financingNeeded != null && item.financingNeeded !== filters.financingNeeded) return false;
        return true;
      }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone);
    },
    appendAudit(event) {
      audit.push(clone(event));
    },
    auditTrail() {
      return audit.map(clone);
    }
  };
}

function auditEvent(eventType, input = {}) {
  return {
    eventType,
    leadId: input.leadId || null,
    interestIntentId: input.interestIntentId || null,
    publicationId: input.publicationId || null,
    listingId: input.listingId || null,
    propertyId: input.propertyId || null,
    timestamp: now,
    appendOnly: true,
    ...propertyLeadSideEffectCounters
  };
}

export function createPropertyBuyerInterestIntent(input = {}) {
  const publication = input.publicationRecord || {};
  const intentType = input.intentType || buyerInterestIntentTypes.generalInterest;
  const buyerMessage = sanitizeMessage(input.buyerMessage || "I am interested in this property.");
  return {
    modelType: "PropertyBuyerInterestIntent",
    interestIntentId: input.interestIntentId || `interest_${publication.publicationId || "local"}_${fingerprint({ buyer: input.buyerActorRef || input.actorId, intentType, buyerMessage }).replace("lead_fp_", "")}`,
    actorId: input.actorId || "actor_buyer_demo",
    buyerActorRef: input.buyerActorRef || { actorId: input.actorId || "actor_buyer_demo", buyerLabel: "Local demo buyer", kycVerified: false },
    publicationId: publication.publicationId || input.publicationId,
    listingId: publication.listingId || input.listingId,
    propertyId: publication.propertyId || input.propertyId,
    intentType,
    buyerMessage,
    structuredRequirements: clone(input.structuredRequirements || {
      budgetMin: null,
      budgetMax: 130000,
      currency: "USD",
      financingNeeded: false,
      desiredMoveDate: null,
      preferredViewingWindowFuture: null,
      notes: "",
      intentStrength: "MEDIUM",
      buyerType: "LOCAL_DEMO_BUYER"
    }),
    preferredContactModeFuture: input.preferredContactModeFuture || "CONTACT_INSIDE_ESSA_ONLY",
    consentStatus: input.consentStatus || "CONSENT_PENDING",
    privacyStatus: "CONTACT_PROTECTED",
    leadSource: "ESSA_PROPERTY_MARKETPLACE",
    attributionRefs: clone(input.attributionRefs || [{ source: "ESSA_PROPERTY_MARKETPLACE", publicationId: publication.publicationId }]),
    createdAt: now,
    updatedAt: now,
    readinessStatus: sellerContactReadinessStatuses.draft,
    missingRequirements: [],
    blockers: [],
    auditMetadata: {
      audit: [auditEvent(propertyLeadAuditEvents.interestCreated, { publicationId: publication.publicationId, listingId: publication.listingId, propertyId: publication.propertyId })],
      contactExecutionStatus: "NOT_ACTIVE"
    },
    localBuyerInterestIntents: 1,
    ...Object.fromEntries(Object.entries(propertyLeadSideEffectCounters).filter(([key]) => key !== "localBuyerInterestIntents"))
  };
}

export function createPropertyBuyerContactConsent(intent = {}, input = {}) {
  return {
    modelType: "PropertyBuyerContactConsent",
    consentId: input.consentId || `consent_${intent.interestIntentId}`,
    buyerActorRef: clone(intent.buyerActorRef),
    interestIntentId: intent.interestIntentId,
    shareName: input.shareName ?? true,
    shareEmailFuture: input.shareEmailFuture ?? false,
    sharePhoneFuture: input.sharePhoneFuture ?? false,
    shareMessage: input.shareMessage ?? true,
    shareBudget: input.shareBudget ?? true,
    shareFinancingNeed: input.shareFinancingNeed ?? true,
    contactInsideEssaOnly: input.contactInsideEssaOnly ?? true,
    consentStatus: input.consentStatus || "CONSENT_RECORDED_LOCAL_PROOF",
    createdAt: now,
    revokedAt: input.revokedAt || null,
    auditMetadata: { contactDispatchAllowed: false, audit: [propertyLeadAuditEvents.consentRecorded] },
    ...propertyLeadSideEffectCounters
  };
}

export function resolvePropertySellerRoute(input = {}) {
  const { publicationRecord = {}, authorityGrant = {}, listing = {} } = input;
  const representation = publicationRecord.publicProjection?.sellerRepresentationTypeSafeSummary || "Owner represented locally";
  const agent = /representative|agent/i.test(representation);
  const active = authorityGrant.status === propertyAuthorityStatuses.activeLocalProof && authorityGrant.expired !== true;
  const saleActor = listing.actorId || "actor_owner_alice";
  const blockers = [];
  if (!active) blockers.push("Seller/representative authority is not active.");
  if (/manager|cleaner|service/i.test(representation)) blockers.push("Operational/service role cannot receive buyer sales inquiry.");
  return {
    modelType: "PropertySellerRoutingResult",
    propertyId: publicationRecord.propertyId,
    listingId: publicationRecord.listingId,
    publicationId: publicationRecord.publicationId,
    preferredRecipientType: agent ? "AUTHORIZED_AGENT" : "OWNER",
    recipientActorId: saleActor,
    recipientOrganizationId: listing.organizationId || null,
    authorityRef: authorityGrant.authorityGrantId ? { authorityGrantId: authorityGrant.authorityGrantId } : null,
    authorityStatus: authorityGrant.status || "UNKNOWN",
    fallbackRoute: blockers.length ? "REVIEW_REQUIRED_NO_DIRECT_ROUTE" : "ESSA_INTERNAL_SELLER_INBOX_FUTURE",
    routingReason: blockers.length ? "Authority/routing requires review." : "Route follows local publication seller representation.",
    blockers,
    safePublicLabel: agent ? "AUTHORIZED AGENT - LOCAL PROOF" : "OWNER REPRESENTATION LOCAL PROOF",
    ...propertyLeadSideEffectCounters
  };
}

export function createPropertyLeadAntiSpamCheck(intent = {}, store = createLocalPropertyLeadStore(), input = {}) {
  const message = intent.buyerMessage || "";
  const existing = store.findLead((lead) => lead.buyerActorRef?.actorId === intent.buyerActorRef?.actorId && lead.listingId === intent.listingId && lead.leadType === intent.intentType && lead.messageFingerprint === fingerprint(message));
  const repeated = input.repeatedCount || 0;
  const malformed = !message || /\[url_removed\].*\[url_removed\]/.test(message);
  const blockedActor = intent.buyerActorRef?.blocked === true;
  let status = leadAntiSpamStatuses.pass;
  if (existing) status = leadAntiSpamStatuses.blockedDuplicate;
  else if (repeated > 3) status = leadAntiSpamStatuses.blockedRate;
  else if (malformed) status = leadAntiSpamStatuses.blockedPattern;
  else if (blockedActor) status = leadAntiSpamStatuses.blockedActor;
  return {
    modelType: "PropertyLeadAntiSpamCheck",
    status,
    existingLeadId: existing?.leadId || null,
    messageFingerprint: fingerprint(message),
    duplicateLeadStatus: existing ? "EXISTING_LEAD_FOUND" : "NO_DUPLICATE",
    ...propertyLeadSideEffectCounters
  };
}

export function evaluatePropertySellerContactReadiness(input = {}) {
  const { intent = {}, consent = {}, publicationRecord = {}, listing = {}, authorityGrant = {}, leadStore = createLocalPropertyLeadStore(), spamInput = {} } = input;
  const routing = resolvePropertySellerRoute({ publicationRecord, authorityGrant, listing });
  const antiSpam = createPropertyLeadAntiSpamCheck(intent, leadStore, spamInput);
  const blockers = [];
  const warnings = [];
  if (publicationRecord.publicationStatus !== marketplacePublicationStatuses.publishedLocalProof) blockers.push("Listing is not active published local proof.");
  if (publicationRecord.freshness === "STALE") blockers.push("Published Listing is stale.");
  if (consent.consentStatus !== "CONSENT_RECORDED_LOCAL_PROOF" || consent.revokedAt) blockers.push("Buyer consent missing or revoked.");
  if (routing.blockers.length) blockers.push(...routing.blockers);
  if (antiSpam.status === leadAntiSpamStatuses.blockedDuplicate) blockers.push("Duplicate buyer inquiry detected.");
  if ([leadAntiSpamStatuses.blockedRate, leadAntiSpamStatuses.blockedPattern, leadAntiSpamStatuses.blockedActor].includes(antiSpam.status)) blockers.push("Buyer inquiry blocked by local anti-spam policy.");
  if (/(seller phone|seller email|reveal phone|reveal email)/i.test(intent.buyerMessage || "")) warnings.push("Direct contact reveal request recorded but not executed.");
  const readinessStatus = blockers.some((item) => item.includes("not active published")) ? sellerContactReadinessStatuses.blockedListingNotPublic
    : blockers.some((item) => item.includes("stale")) ? sellerContactReadinessStatuses.blockedListingStale
    : blockers.some((item) => item.includes("consent")) ? sellerContactReadinessStatuses.blockedBuyerConsent
    : blockers.some((item) => item.includes("authority") || item.includes("Authority")) ? sellerContactReadinessStatuses.blockedAuthority
    : blockers.some((item) => item.includes("Duplicate")) ? sellerContactReadinessStatuses.blockedDuplicate
    : blockers.some((item) => item.includes("anti-spam")) ? sellerContactReadinessStatuses.blockedSpam
    : sellerContactReadinessStatuses.readyForLocalLeadCreation;
  return {
    modelType: "PropertySellerContactReadiness",
    contactReadinessId: `contact_readiness_${intent.interestIntentId}`,
    interestIntentId: intent.interestIntentId,
    publicationId: intent.publicationId,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    buyerActorRef: clone(intent.buyerActorRef),
    sellerRepresentationType: routing.safePublicLabel,
    targetActorId: routing.recipientActorId,
    targetOrganizationId: routing.recipientOrganizationId,
    authorityGrantId: authorityGrant.authorityGrantId || null,
    routingStatus: routing.blockers.length ? "ROUTING_REVIEW_REQUIRED" : "ROUTE_RESOLVED_LOCAL_PROOF",
    buyerConsentStatus: consent.consentStatus,
    sellerReceiveReadiness: "SELLER_INBOX_READY_LOCAL_PROOF",
    privacyReadiness: "CONTACT_DATA_PROTECTED",
    antiSpamReadiness: antiSpam.status,
    duplicateLeadStatus: antiSpam.duplicateLeadStatus,
    listingFreshnessStatus: publicationRecord.freshness || "UNKNOWN",
    publicationStatus: publicationRecord.publicationStatus || "MISSING",
    blockers,
    warnings,
    readinessStatus,
    routing,
    antiSpam,
    createdAt: now,
    auditMetadata: { contactDispatchAllowed: false, audit: [propertyLeadAuditEvents.routeResolved, antiSpam.status === leadAntiSpamStatuses.pass ? propertyLeadAuditEvents.antiSpamPassed : propertyLeadAuditEvents.blocked] },
    ...propertyLeadSideEffectCounters
  };
}

export function createPropertyLeadAttribution(lead = {}, input = {}) {
  return {
    modelType: "PropertyLeadAttribution",
    leadId: lead.leadId,
    publicationId: lead.publicationId,
    listingId: lead.listingId,
    propertyId: lead.propertyId,
    marketplaceSource: "ESSA_PROPERTY_MARKETPLACE",
    discoveryQueryRef: input.discoveryQueryRef || "Apartment in Batumi",
    campaignRefFuture: null,
    creatorRefFuture: null,
    referralRefFuture: null,
    firstTouch: "ESSA_PROPERTY_MARKETPLACE",
    lastTouch: "ESSA_PROPERTY_MARKETPLACE",
    attributionCreatedAt: now,
    ...propertyLeadSideEffectCounters
  };
}

export function createPropertyLead(input = {}) {
  const { intent = {}, consent = {}, readiness = {} } = input;
  const leadId = input.leadId || generateLocalPropertyLeadId(intent);
  const shareBudget = consent.shareBudget !== false;
  const messageSummary = consent.shareMessage === false ? "[message_private]" : sanitizeMessage(intent.buyerMessage);
  return {
    modelType: "PropertyLead",
    leadId,
    buyerActorRef: clone({ actorId: intent.buyerActorRef?.actorId, buyerLabel: intent.buyerActorRef?.buyerLabel || "Local buyer" }),
    publicationId: intent.publicationId,
    listingId: intent.listingId,
    propertyId: intent.propertyId,
    interestIntentId: intent.interestIntentId,
    leadType: intent.intentType,
    leadStatus: propertyLeadStatuses.newLocalProof,
    leadSource: intent.leadSource,
    attributionSource: "ESSA_PROPERTY_MARKETPLACE",
    targetActorId: readiness.targetActorId,
    targetOrganizationId: readiness.targetOrganizationId,
    sellerRepresentationType: readiness.sellerRepresentationType,
    consentRef: consent.consentId,
    messageSummary,
    messageFingerprint: fingerprint(messageSummary),
    structuredRequirements: shareBudget ? clone(intent.structuredRequirements) : { consentProtected: true },
    createdAt: now,
    updatedAt: now,
    freshness: "CURRENT",
    routingStatus: readiness.routingStatus,
    crmReadiness: "LOCAL_CRM_READY_NO_SYNC",
    contactExecutionStatus: "NOT_ACTIVE",
    auditMetadata: { audit: [propertyLeadAuditEvents.leadCreated], sellerContacted: false, offerSubmitted: false },
    ...propertyLeadSideEffectCounters
  };
}

export function createPropertySellerLeadInboxItem(lead = {}, attribution = {}) {
  return {
    modelType: "PropertySellerLeadInboxItem",
    leadId: lead.leadId,
    listingId: lead.listingId,
    propertyId: lead.propertyId,
    safeBuyerLabel: lead.buyerActorRef?.buyerLabel || "Local buyer",
    interestType: lead.leadType,
    messagePreview: lead.messageSummary,
    budgetSummary: lead.structuredRequirements?.budgetMax ? `Up to ${lead.structuredRequirements.budgetMax} ${lead.structuredRequirements.currency}` : "Not shared",
    financingNeeded: Boolean(lead.structuredRequirements?.financingNeeded),
    createdAt: lead.createdAt,
    leadSource: lead.leadSource,
    attribution,
    status: lead.leadStatus,
    contactExecutionStatus: "NOT_ACTIVE",
    ...propertyLeadSideEffectCounters
  };
}

export function createPropertyLeadHistoryItem(input = {}) {
  const { lead = {}, readiness = {}, attribution = {} } = input;
  return {
    modelType: "PropertyLeadHistoryItem",
    leadId: lead.leadId,
    publicationId: lead.publicationId,
    listingId: lead.listingId,
    propertyId: lead.propertyId,
    buyerActorRef: clone(lead.buyerActorRef),
    targetRoute: readiness.routing,
    attribution,
    status: lead.leadStatus,
    createdAt: lead.createdAt,
    consentStatus: readiness.buyerConsentStatus,
    antiSpamStatus: readiness.antiSpamReadiness,
    executionContactStatus: "NOT_ACTIVE",
    auditRefs: [propertyLeadAuditEvents.leadCreated, propertyLeadAuditEvents.attributionRecorded, propertyLeadAuditEvents.inboxCreated],
    ...propertyLeadSideEffectCounters
  };
}

export function commitPropertyLeadLocalProof(input = {}) {
  const { intent = {}, consent = {}, readiness = {}, leadStore = createLocalPropertyLeadStore() } = input;
  if (readiness.readinessStatus !== sellerContactReadinessStatuses.readyForLocalLeadCreation) {
    leadStore.appendAudit(auditEvent(propertyLeadAuditEvents.blocked, intent));
    return { ok: false, status: propertyLeadStatuses.blocked, readiness, ...propertyLeadSideEffectCounters };
  }
  const duplicate = leadStore.findLead((lead) => lead.buyerActorRef?.actorId === intent.buyerActorRef?.actorId && lead.listingId === intent.listingId && lead.leadType === intent.intentType);
  if (duplicate) {
    leadStore.appendAudit(auditEvent(propertyLeadAuditEvents.duplicate, intent));
    return { ok: false, status: propertyLeadStatuses.duplicate, existingLeadId: duplicate.leadId, duplicateLeadsCreated: 0, ...propertyLeadSideEffectCounters };
  }
  const lead = createPropertyLead({ intent, consent, readiness });
  const attribution = createPropertyLeadAttribution(lead);
  const inboxItem = createPropertySellerLeadInboxItem(lead, attribution);
  const historyItem = createPropertyLeadHistoryItem({ lead, readiness, attribution });
  leadStore.addLead(lead);
  leadStore.addInboxItem(inboxItem);
  [propertyLeadAuditEvents.leadCreated, propertyLeadAuditEvents.attributionRecorded, propertyLeadAuditEvents.inboxCreated].forEach((eventType) => leadStore.appendAudit(auditEvent(eventType, lead)));
  return {
    ok: true,
    status: propertyLeadStatuses.newLocalProof,
    lead,
    attribution,
    inboxItem,
    historyItem,
    localPropertyLeadsCreated: 1,
    sellerInboxItemsCreatedLocal: 1,
    localBuyerInterestIntents: intent.localBuyerInterestIntents || 1,
    ...Object.fromEntries(Object.entries(propertyLeadSideEffectCounters).filter(([key]) => !["localPropertyLeadsCreated", "sellerInboxItemsCreatedLocal", "localBuyerInterestIntents"].includes(key)))
  };
}

export function createBuyerInquiryPreview(input = {}) {
  const { intent = {}, consent = {}, readiness = {} } = input;
  const shared = [];
  const notShared = ["seller phone", "seller email", "buyer phone", "buyer email", "private ownership documents", "mandate documents"];
  if (consent.shareName) shared.push("safe buyer label");
  if (consent.shareMessage) shared.push("sanitized message");
  if (consent.shareBudget) shared.push("budget summary");
  if (consent.shareFinancingNeed) shared.push("financing need flag");
  return {
    modelType: "BuyerInquiryPreview",
    buyerWillShare: shared,
    buyerWillNotShare: notShared,
    futureRouteSafeLabel: readiness.sellerRepresentationType,
    messagePreview: consent.shareMessage ? sanitizeMessage(intent.buyerMessage) : "[message_private]",
    contactExecutionStatus: "NOT_ACTIVE",
    ...propertyLeadSideEffectCounters
  };
}

export function createLisaBuyerGuide(question = "") {
  const text = String(question).toLowerCase();
  let answer = "I'm Interested creates a local Lead inside ESSA. It does not contact the seller yet.";
  if (text.includes("phone")) answer = "No phone is revealed. Buyer and seller contact data stay protected in Phase 23J.";
  if (text.includes("viewing")) answer = "You can request a future viewing as a Lead intent, but no viewing is scheduled yet.";
  if (text.includes("offer")) answer = "Offer flow is not active yet. Phase 23J creates interest, not an offer.";
  if (text.includes("documents")) answer = "Private ownership documents are not shared. Future controlled data-room access would be separate.";
  if (text.includes("financing")) answer = "Financing interest can be recorded for future Finance Hub routing, with no bank contact or mortgage application.";
  return { modelType: "LisaBuyerGuide", answer, mayContactSeller: false, maySubmitOffer: false, mayRevealContact: false, ...propertyLeadSideEffectCounters };
}

export function createNavigatorBuyerLeadRouting(input = "") {
  const text = String(input).toLowerCase();
  const hash = text.includes("offer")
    ? "#property-leads?future=offer-not-active"
    : text.includes("mortgage") || text.includes("financing")
      ? "#property-leads?future=finance-hub"
      : text.includes("contact")
        ? "#property-leads?mode=contact-readiness"
        : "#property-leads?mode=interest";
  return { modelType: "NavigatorBuyerLeadRouting", input, hash, routeOnly: true, offerFlowActive: false, contactExecutionActive: false, providerCalls: 0, ...propertyLeadSideEffectCounters };
}

export function buildBuyerLeadScenario(caseKey = "owner") {
  const publicationCase = caseKey === "agent" || caseKey === "expiredAgent" ? "agent" : "owner";
  const marketplace = buildMarketplacePublicationViewModel({ case: publicationCase });
  const scenario = createMarketplacePublicationScenario(publicationCase);
  const leadStore = createLocalPropertyLeadStore();
  const publicationRecord = clone(marketplace.result?.publicationRecord || {});
  const listing = clone(marketplace.listing || {});
  let authorityGrant = clone(scenario.authorityGrant || {});
  if (caseKey === "expiredAgent") authorityGrant.status = propertyAuthorityStatuses.expired;
  if (caseKey === "unpublished" || caseKey === "staleUnpublished") publicationRecord.publicationStatus = "UNPUBLISHED_LOCAL_PROOF";
  if (caseKey === "rolledBack") publicationRecord.publicationStatus = "ROLLED_BACK_LOCAL_PROOF";
  if (caseKey === "staleUnpublished") publicationRecord.freshness = "STALE";
  const intent = createPropertyBuyerInterestIntent({
    publicationRecord,
    intentType: caseKey === "viewing" ? buyerInterestIntentTypes.requestViewingFuture
      : caseKey === "finance" ? buyerInterestIntentTypes.askAboutFinancing
        : caseKey === "documents" ? buyerInterestIntentTypes.askAboutDocuments
          : caseKey === "location" ? buyerInterestIntentTypes.askAboutLocation
            : buyerInterestIntentTypes.generalInterest,
    buyerMessage: caseKey === "privateContact" ? "Please call me at +995 555 123 456 or email buyer@example.com"
      : caseKey === "spam" ? "http://spam.test http://spam.test"
        : "I am interested in this apartment in Batumi.",
    structuredRequirements: { budgetMin: 100000, budgetMax: 130000, currency: "USD", financingNeeded: caseKey === "finance", desiredMoveDate: null, preferredViewingWindowFuture: caseKey === "viewing" ? "future weekend" : null, notes: "", intentStrength: "MEDIUM", buyerType: "LOCAL_DEMO_BUYER" }
  });
  const consent = createPropertyBuyerContactConsent(intent, { consentStatus: caseKey === "missingConsent" ? "CONSENT_MISSING" : "CONSENT_RECORDED_LOCAL_PROOF", revokedAt: caseKey === "revokedConsent" ? now : null });
  const readiness = evaluatePropertySellerContactReadiness({ intent, consent, publicationRecord, listing, authorityGrant, leadStore, spamInput: { repeatedCount: caseKey === "spam" ? 5 : 0 } });
  if (caseKey === "duplicate") {
    const first = commitPropertyLeadLocalProof({ intent, consent, readiness, leadStore });
    const secondReadiness = evaluatePropertySellerContactReadiness({ intent, consent, publicationRecord, listing, authorityGrant, leadStore });
    return { marketplace, publicationRecord, listing, authorityGrant, intent, consent, readiness: secondReadiness, leadStore, duplicateFirst: first };
  }
  return { marketplace, publicationRecord, listing, authorityGrant, intent, consent, readiness, leadStore };
}

export function buildBuyerLeadViewModel(input = {}) {
  const caseKey = input.caseKey || input.case || "owner";
  const scenario = buildBuyerLeadScenario(caseKey);
  const preview = createBuyerInquiryPreview({ intent: scenario.intent, consent: scenario.consent, readiness: scenario.readiness });
  const result = commitPropertyLeadLocalProof({ intent: scenario.intent, consent: scenario.consent, readiness: scenario.readiness, leadStore: scenario.leadStore });
  const inboxItems = scenario.leadStore.listInboxItems();
  return {
    modelType: "PropertyBuyerLeadViewModel",
    route: "#property-leads",
    caseKey,
    banner: "LOCAL BUYER LEAD / CONTACT-READY INTENT. NO SELLER CONTACT. NO OFFER. NO PAYMENT. NO TRANSACTION.",
    ...scenario,
    preview,
    result,
    inboxItems,
    sellerInboxFilters: {
      newLeads: scenario.leadStore.listInboxItems({ status: propertyLeadStatuses.newLocalProof }).length,
      listing: scenario.leadStore.listInboxItems({ listingId: scenario.intent.listingId }).length,
      property: scenario.leadStore.listInboxItems({ propertyId: scenario.intent.propertyId }).length,
      interestType: scenario.leadStore.listInboxItems({ interestType: scenario.intent.intentType }).length,
      financingNeeded: scenario.leadStore.listInboxItems({ financingNeeded: true }).length
    },
    lisaGuide: createLisaBuyerGuide("What does I'm interested do?"),
    navigatorRouting: createNavigatorBuyerLeadRouting("I like this apartment."),
    localBuyerInterestIntents: scenario.intent.localBuyerInterestIntents || 0,
    localPropertyLeadsCreated: result.localPropertyLeadsCreated || 0,
    sellerInboxItemsCreatedLocal: result.sellerInboxItemsCreatedLocal || 0,
    ...Object.fromEntries(Object.entries(propertyLeadSideEffectCounters).filter(([key]) => !["localBuyerInterestIntents", "localPropertyLeadsCreated", "sellerInboxItemsCreatedLocal"].includes(key)))
  };
}
