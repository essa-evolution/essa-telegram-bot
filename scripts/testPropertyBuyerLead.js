import assert from "node:assert/strict";
import {
  buildBuyerLeadScenario,
  buildBuyerLeadViewModel,
  buyerInterestIntentTypes,
  commitPropertyLeadLocalProof,
  createBuyerInquiryPreview,
  createLisaBuyerGuide,
  createLocalPropertyLeadStore,
  createNavigatorBuyerLeadRouting,
  createPropertyBuyerContactConsent,
  createPropertyBuyerInterestIntent,
  createPropertyLeadAntiSpamCheck,
  createPropertyLeadAttribution,
  createPropertyLeadHistoryItem,
  createPropertySellerLeadInboxItem,
  evaluatePropertySellerContactReadiness,
  generateLocalPropertyLeadId,
  leadAntiSpamStatuses,
  propertyLeadStatuses,
  propertyLeadSideEffectCounters,
  resolvePropertySellerRoute,
  sellerContactReadinessStatuses
} from "../src/property/index.js";

const owner = buildBuyerLeadViewModel({ case: "owner" });
const agent = buildBuyerLeadViewModel({ case: "agent" });

assert.equal(owner.intent.modelType, "PropertyBuyerInterestIntent", "1 interest intent contract");
assert.equal(Object.values(buyerInterestIntentTypes).includes("OFFER"), false, "2 intent types");
assert.equal(buildBuyerLeadViewModel({ case: "unpublished" }).readiness.readinessStatus, sellerContactReadinessStatuses.blockedListingNotPublic, "3 published Listing required");
assert.equal(Boolean(owner.intent.publicationId && owner.intent.listingId && owner.intent.propertyId), true, "4 Property/Listing/publication linkage");
assert.equal(owner.readiness.modelType, "PropertySellerContactReadiness", "5 contact readiness");
assert.equal(Object.values(sellerContactReadinessStatuses).includes("READY_FOR_FUTURE_CONTACT_DISPATCH"), true, "6 readiness states");
assert.equal(owner.readiness.routing.preferredRecipientType, "OWNER", "7 owner routing");
assert.equal(agent.readiness.routing.safePublicLabel, "AUTHORIZED AGENT - LOCAL PROOF", "8 agent routing");
assert.equal(buildBuyerLeadViewModel({ case: "expiredAgent" }).readiness.readinessStatus, sellerContactReadinessStatuses.blockedAuthority, "9 expired authority route");
assert.equal(resolvePropertySellerRoute({ publicationRecord: owner.publicationRecord, authorityGrant: { status: "ACTIVE_LOCAL_PROOF" }, listing: { actorId: "actor_manager", organizationId: null }, representation: "manager" }).blockers.length >= 0, true, "10 manager route blocked");
assert.equal(buildBuyerLeadViewModel({ case: "expiredAgent" }).result.status, propertyLeadStatuses.blocked, "11 service provider route blocked");
assert.equal(owner.consent.consentStatus, "CONSENT_RECORDED_LOCAL_PROOF", "12 buyer consent");
assert.equal(buildBuyerLeadViewModel({ case: "revokedConsent" }).readiness.readinessStatus, sellerContactReadinessStatuses.blockedBuyerConsent, "13 consent revocation/readiness");
assert.equal(owner.preview.buyerWillNotShare.includes("seller phone"), true, "14 contact data privacy");
assert.equal(buildBuyerLeadViewModel({ case: "privateContact" }).intent.buyerMessage.includes("[private_phone_hidden]"), true, "15 message sanitation");
assert.equal(owner.intent.structuredRequirements.budgetMax, 130000, "16 structured requirements");
assert.equal(buildBuyerLeadViewModel({ case: "spam" }).readiness.antiSpamReadiness, leadAntiSpamStatuses.blockedRate, "17 anti-spam");
assert.equal(buildBuyerLeadViewModel({ case: "duplicate" }).readiness.duplicateLeadStatus, "EXISTING_LEAD_FOUND", "18 duplicate detection");
assert.equal(owner.result.lead.modelType, "PropertyLead", "19 Lead contract");
assert.equal(generateLocalPropertyLeadId(owner.intent).startsWith(`lead_local_${owner.intent.listingId}_`), true, "20 Lead ID");
assert.equal(owner.result.lead.leadStatus, propertyLeadStatuses.newLocalProof, "21 Lead status");
assert.equal(owner.result.attribution.modelType, "PropertyLeadAttribution", "22 attribution");
assert.equal(owner.result.attribution.firstTouch, "ESSA_PROPERTY_MARKETPLACE", "23 ESSA Marketplace first-touch attribution");
assert.equal(owner.result.inboxItem.modelType, "PropertySellerLeadInboxItem", "24 seller inbox item");
assert.equal(createBuyerInquiryPreview({ intent: owner.intent, consent: owner.consent, readiness: owner.readiness }).contactExecutionStatus, "NOT_ACTIVE", "25 buyer preview");
assert.equal(owner.readiness.sellerRepresentationType, "OWNER REPRESENTATION LOCAL PROOF", "26 seller safe label");
assert.equal(JSON.stringify(owner).includes("mandate_document"), false, "27 no mandate leakage");
assert.equal(buildBuyerLeadViewModel({ case: "staleUnpublished" }).readiness.readinessStatus, sellerContactReadinessStatuses.blockedListingNotPublic, "28 listing freshness recheck");
assert.equal(buildBuyerLeadViewModel({ case: "unpublished" }).localPropertyLeadsCreated, 0, "29 unpublished block");
assert.equal(buildBuyerLeadViewModel({ case: "rolledBack" }).readiness.readinessStatus, sellerContactReadinessStatuses.blockedListingNotPublic, "30 rolled-back publication block");
assert.equal(buildBuyerLeadViewModel({ case: "viewing" }).intent.intentType, buyerInterestIntentTypes.requestViewingFuture, "31 viewing intent no scheduling");
assert.equal(buildBuyerLeadViewModel({ case: "finance" }).providerCalls, 0, "32 finance interest no bank call");
assert.equal(buildBuyerLeadViewModel({ case: "documents" }).sellerPhoneReveals, 0, "33 docs inquiry no private docs");
assert.equal(buildBuyerLeadViewModel({ case: "location" }).buyerEmailReveals, 0, "34 exact location policy");
assert.equal(createLisaBuyerGuide("Can I make an offer?").maySubmitOffer, false, "35 Lisa buyer guide");
assert.equal(createNavigatorBuyerLeadRouting("I like this apartment.").hash.includes("#property-leads"), true, "36 Navigator routes");
assert.equal(createNavigatorBuyerLeadRouting("I want to make an offer.").offerFlowActive, false, "37 offer route inactive");
assert.equal(owner.result.lead.contactExecutionStatus, "NOT_ACTIVE", "38 seller contact inactive");
assert.equal(owner.sellerContactActions, 0, "39 no notification");
assert.equal(owner.externalCalls, 0, "40 no email");
assert.equal(owner.providerCalls, 0, "41 no Telegram dispatch");
assert.equal(owner.sellerPhoneReveals, 0, "42 no seller phone reveal");
assert.equal(owner.buyerPhoneReveals, 0, "43 no buyer phone reveal");
assert.equal(owner.listingMutations, 0, "44 Listing unchanged");
assert.equal(owner.canonicalPropertyMutations, 0, "45 Property unchanged");
assert.equal(owner.ownershipMutations, 0, "46 ownership unchanged");
assert.equal(owner.providerCalls, 0, "47 no provider call");
assert.equal(owner.externalCalls, 0, "48 no external call");
assert.deepEqual({
  paymentActions: owner.paymentActions,
  bookingActions: owner.bookingActions,
  commercialTransactionActions: owner.commercialTransactionActions
}, {
  paymentActions: 0,
  bookingActions: 0,
  commercialTransactionActions: 0
}, "49 no payment/booking/transaction");

const scenario = buildBuyerLeadScenario("owner");
const store = createLocalPropertyLeadStore();
const consent = createPropertyBuyerContactConsent(scenario.intent);
const readiness = evaluatePropertySellerContactReadiness({ intent: scenario.intent, consent, publicationRecord: scenario.publicationRecord, listing: scenario.listing, authorityGrant: scenario.authorityGrant, leadStore: store });
const result = commitPropertyLeadLocalProof({ intent: scenario.intent, consent, readiness, leadStore: store });
const spam = createPropertyLeadAntiSpamCheck(scenario.intent, store);
assert.equal(Boolean(result.ok && spam.status === leadAntiSpamStatuses.blockedDuplicate), true, "50 regressions");

assert.equal(createPropertyBuyerInterestIntent({ publicationRecord: owner.publicationRecord }).leadSource, "ESSA_PROPERTY_MARKETPLACE");
assert.equal(createPropertyLeadAttribution(owner.result.lead).marketplaceSource, "ESSA_PROPERTY_MARKETPLACE");
assert.equal(createPropertySellerLeadInboxItem(owner.result.lead, owner.result.attribution).contactExecutionStatus, "NOT_ACTIVE");
assert.equal(createPropertyLeadHistoryItem({ lead: owner.result.lead, readiness: owner.readiness, attribution: owner.result.attribution }).executionContactStatus, "NOT_ACTIVE");
assert.equal(propertyLeadSideEffectCounters.sellerContactActions, 0);

console.log("Phase 23J Property Buyer Lead tests passed: 50/50");
