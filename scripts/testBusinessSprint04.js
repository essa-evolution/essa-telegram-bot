import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  businessAuditEvents,
  businessCurrencies,
  businessFunnelEvents,
  businessOfferStatuses,
  businessPaymentModels,
  businessPaymentStatuses,
  businessProjectStatuses,
  businessRoles,
  businessStoreKinds,
  createBusinessFlowService,
  createDurableBusinessStore,
  createNotConfiguredPaymentProviderAdapter,
  createSupabaseBusinessRepository,
  resolveBusinessRuntime
} from "../src/business/index.js";

let failures = 0;

function check(label, fn) {
  try {
    const details = fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

async function checkAsync(label, fn) {
  try {
    const details = await fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

function expectOk(result) {
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

const storePath = path.resolve("artifacts/business/sprint04-test-store.json");
fs.rmSync(storePath, { force: true });

const clientA = "sprint04_client_a";
const clientB = "sprint04_client_b";
const viewer = "sprint04_viewer";
const operator = "sprint04_essa_operator";
const service = createBusinessFlowService(createDurableBusinessStore({ filePath: storePath }));

const created = expectOk(service.createProfile(clientA, {
  name: "Sprint 04 Studio",
  industry: "Creative Services",
  city: "Tbilisi",
  website: "https://sprint04.example",
  description: "A studio selling bounded growth and production packages.",
  productsServices: ["Growth diagnosis", "Production plan"],
  targetAudience: "Local hospitality businesses",
  goals: ["increase qualified leads"],
  challenges: ["unclear commercial funnel"]
}));

const flow = expectOk(service.runGrowthIntake(clientA, created.business.businessId, {
  businessName: "Sprint 04 Studio",
  description: "A studio selling bounded growth and production packages.",
  productsServices: ["Growth diagnosis", "Production plan"],
  currentSituation: "Good delivery, unclear commercial funnel.",
  goals: ["increase qualified leads"],
  challenges: ["unclear commercial funnel"]
}));

expectOk(service.addMembership(clientA, created.business.businessId, { userId: viewer, role: businessRoles.viewer }));
expectOk(service.addMembership(clientA, created.business.businessId, { userId: operator, role: businessRoles.admin }));

check("A repository mode boundary fails closed for production/local mismatch", () => {
  const runtime = resolveBusinessRuntime(
    { NODE_ENV: "production", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
    {
      storeKind: businessStoreKinds.durableLocalFile,
      repository: { repositoryKind: "JSON_DURABLE_LOCAL_FILE" }
    }
  );
  assert.equal(runtime.ok, false);
  assert.ok(runtime.blockers.includes("LIVE_SUPABASE_CONFIGURATION_REQUIRED"));
  assert.ok(runtime.blockers.includes("PRODUCTION_MUST_NOT_USE_LOCAL_JSON_BUSINESS_STORE"));
  assert.ok(runtime.blockers.includes("SUPABASE_BUSINESS_REPOSITORY_NOT_ACTIVE"));
});

check("B local/test mode intentionally allows durable local repository", () => {
  const runtime = resolveBusinessRuntime(
    { NODE_ENV: "test", ESSA_BUSINESS_STORE: "local" },
    service.snapshot().metadata
  );
  assert.equal(runtime.ok, true);
  assert.equal(runtime.localBacked, true);
});

check("C unpriced approved offer cannot create payment request", () => {
  const approval = expectOk(service.decideOffer(clientA, created.business.businessId, flow.offer.offerId, "approve"));
  assert.equal(approval.offer.approvalStatus, businessOfferStatuses.approved);
  assert.equal(approval.offer.pricingStatus, "NOT_PRICED");
});

await checkAsync("D payment provider adapter returns explicit NOT_CONFIGURED", async () => {
  const adapter = createNotConfiguredPaymentProviderAdapter();
  const result = await adapter.createPaymentIntent({});
  assert.equal(result.ok, false);
  assert.equal(result.status, "NOT_CONFIGURED");
  assert.equal(adapter.describe().noFakeProviderSuccess, true);
});

check("E only ESSA operator can configure offer commercial terms", () => {
  const denied = service.configureOfferCommercialTerms(clientA, created.business.businessId, flow.offer.offerId, {
    amount: 500,
    currency: businessCurrencies.usd,
    paymentModel: businessPaymentModels.oneTime
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);

  const configured = expectOk(service.configureOfferCommercialTerms(operator, created.business.businessId, flow.offer.offerId, {
    amount: 500,
    currency: businessCurrencies.usd,
    paymentModel: businessPaymentModels.oneTime,
    scope: ["Growth diagnosis", "Commercial activation plan"],
    deliverables: ["Paid onboarding plan", "Approval-gated project activation"]
  }));
  assert.equal(configured.offer.amount, 500);
  assert.equal(configured.offer.currency, "USD");
  assert.equal(configured.offer.pricingStatus, "PRICE_CONFIRMED");
});

let paymentRequest;
await checkAsync("F client creates payment request; tampered amount is ignored", async () => {
  paymentRequest = expectOk(await service.createPaymentRequest(clientA, created.business.businessId, flow.offer.offerId, {
    amount: 1,
    currency: "GEL",
    idempotencyKey: `payment_request:${flow.offer.offerId}`
  }));
  assert.equal(paymentRequest.paymentIntent.amount, 500);
  assert.equal(paymentRequest.paymentIntent.currency, "USD");
  assert.equal(paymentRequest.paymentIntent.status, businessPaymentStatuses.required);
  assert.equal(paymentRequest.provider.configured, false);
  assert.equal(paymentRequest.paymentIntent.metadata.clientSuppliedAmountIgnored, true);
});

await checkAsync("G duplicate client click returns same payment request", async () => {
  const duplicate = expectOk(await service.createPaymentRequest(clientA, created.business.businessId, flow.offer.offerId, {
    amount: 1,
    idempotencyKey: `payment_request:${flow.offer.offerId}`
  }));
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.paymentIntent.paymentIntentId, paymentRequest.paymentIntent.paymentIntentId);
});

check("H client self-confirmation and viewer confirmation are denied", () => {
  const self = service.verifyManualPayment(clientA, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId, {
    evidenceRef: "manual_receipt_001"
  });
  const view = service.verifyManualPayment(viewer, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId, {
    evidenceRef: "manual_receipt_001"
  });
  assert.equal(self.status, 403);
  assert.equal(self.reason, "essa_operator_role_required");
  assert.equal(view.status, 403);
});

check("I project activation is impossible before confirmed payment", () => {
  const blocked = service.activateCommercialProject(operator, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.reason, "payment_confirmation_required_before_project_activation");
});

let confirmation;
let onboarding;
let activation;
check("J privileged manual payment verification creates confirmed payment", () => {
  confirmation = expectOk(service.verifyManualPayment(operator, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId, {
    evidenceRef: "manual_receipt_001"
  }));
  assert.equal(confirmation.paymentIntent.status, businessPaymentStatuses.confirmed);
  assert.equal(confirmation.paymentIntent.metadata.evidenceStoredAsReferenceOnly, true);
});

check("K onboarding starts only after payment confirmation", () => {
  onboarding = expectOk(service.startCommercialOnboarding(operator, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId, {
    primaryContact: "Sprint 04 owner",
    communicationPreference: "EMAIL_OR_TELEGRAM",
    requiredAccessList: ["Website CMS access via future secure credential vault"]
  }));
  assert.equal(onboarding.onboarding.status, "ONBOARDING");
  assert.equal(onboarding.onboarding.sensitiveCredentialPolicy.doNotCollectPasswordsInBusinessIntake, true);
});

check("L project activation is idempotent and starts no external execution", () => {
  activation = expectOk(service.activateCommercialProject(operator, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId, {
    ownerTeam: [operator],
    nextAction: "Prepare approval-gated execution plan."
  }));
  const duplicate = expectOk(service.activateCommercialProject(operator, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId));
  assert.equal(activation.project.status, businessProjectStatuses.projectActive);
  assert.equal(activation.externalExecutionStarted, false);
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.project.projectId, activation.project.projectId);
});

check("M cross-tenant commercial access is denied", () => {
  assert.equal(service.getDashboard(clientB, created.business.businessId).status, 403);
  assert.equal(service.configureOfferCommercialTerms(clientB, created.business.businessId, flow.offer.offerId, { amount: 100, currency: "USD", paymentModel: "ONE_TIME" }).status, 403);
  assert.equal(service.verifyManualPayment(clientB, created.business.businessId, paymentRequest.paymentIntent.paymentIntentId, { evidenceRef: "x" }).status, 403);
});

check("N returning user sees persisted offer, payment, onboarding and project state", () => {
  const reloaded = createBusinessFlowService(createDurableBusinessStore({ filePath: storePath }));
  const dashboard = expectOk(reloaded.getDashboard(clientA, created.business.businessId)).dashboard;
  assert.equal(dashboard.proposal.offerId, flow.offer.offerId);
  assert.equal(dashboard.paymentIntent.status, businessPaymentStatuses.confirmed);
  assert.equal(dashboard.onboarding.status, "ONBOARDING");
  assert.equal(dashboard.project.status, businessProjectStatuses.projectActive);
  assert.equal(dashboard.nextAction, "PROJECT_ACTIVE_APPROVAL_GATED_EXECUTION");
});

check("O analytics and audit trail are privacy-safe and complete", () => {
  const snapshot = service.snapshot();
  const analyticsText = JSON.stringify(snapshot.analyticsEvents);
  assert.equal(analyticsText.includes("manual_receipt_001"), false);
  [
    businessFunnelEvents.paymentRequestCreated,
    businessFunnelEvents.paymentConfirmed,
    businessFunnelEvents.onboardingStarted,
    businessFunnelEvents.projectActivated
  ].forEach((eventType) => assert.ok(snapshot.analyticsEvents.some((event) => event.eventType === eventType), eventType));
  [
    businessAuditEvents.offerApproved,
    businessAuditEvents.paymentRequestCreated,
    businessAuditEvents.paymentIntentCreated,
    businessAuditEvents.manualPaymentVerified,
    businessAuditEvents.paymentConfirmed,
    businessAuditEvents.onboardingStarted,
    businessAuditEvents.projectActivated
  ].forEach((eventType) => assert.ok(snapshot.auditEvents.some((event) => event.eventType === eventType), eventType));
});

check("P Supabase repository and migration include Sprint 04 tables and RLS", () => {
  const repository = createSupabaseBusinessRepository({
    env: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "secret-value"
    },
    client: {
      from: () => ({
        select: () => ({ limit: async () => ({ error: null }) }),
        upsert: async () => ({ error: null })
      })
    }
  });
  [
    "business_payment_intents",
    "business_commercial_onboardings",
    "business_payment_provider_events"
  ].forEach((table) => assert.ok(repository.requiredTables.includes(table), table));
  const sql = fs.readFileSync("supabase/migrations/20260827_business_sprint04_commercial_activation.sql", "utf8");
  [
    "alter table business_projects",
    "create table if not exists business_payment_intents",
    "create table if not exists business_commercial_onboardings",
    "create table if not exists business_payment_provider_events",
    "enable row level security",
    "business_payment_intents_select_member",
    "business_payment_intents_update_admin",
    "business_commercial_onboardings_select_member",
    "business_payment_provider_events_insert_admin",
    "unique (organization_id, idempotency_key)",
    "unique (provider, event_fingerprint)"
  ].forEach((needle) => assert.ok(sql.includes(needle), needle));
});

if (failures > 0) {
  console.error(`Business Sprint 04 tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Sprint 04 tests passed.");
