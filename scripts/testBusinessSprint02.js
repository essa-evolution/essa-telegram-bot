import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  businessCommercialRequestStatuses,
  businessFunnelEvents,
  businessOfferStatuses,
  businessProjectStatuses,
  businessRoles,
  businessStoreKinds,
  createBusinessAuthAdapter,
  createBusinessFlowService,
  createDurableBusinessStore
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

const storePath = path.resolve("artifacts/business/sprint02-test-store.json");
fs.rmSync(storePath, { force: true });

const clientA = "sprint02_client_a";
const clientB = "sprint02_client_b";
const viewer = "sprint02_viewer";
const storeA = createDurableBusinessStore({ filePath: storePath });
const serviceA = createBusinessFlowService(storeA);

const created = expectOk(serviceA.createProfile(clientA, {
  name: "Sprint 02 Studio",
  industry: "Creative Services",
  city: "Tbilisi",
  website: "https://studio.example",
  description: "A small studio selling content and production packages.",
  productsServices: ["Video content", "Brand shoots"],
  targetAudience: "Local hospitality and retail businesses",
  goals: ["increase qualified leads"],
  challenges: ["inconsistent sales pipeline"]
}));

const flow = expectOk(serviceA.runGrowthIntake(clientA, created.business.businessId, {
  businessName: "Sprint 02 Studio",
  industry: "Creative Services",
  location: "Tbilisi, Georgia",
  website: "studio.example",
  socials: ["instagram.com/sprint02"],
  description: "A small studio selling content and production packages.",
  productsServices: ["Video content", "Brand shoots"],
  targetAudience: "Local hospitality and retail businesses",
  currentSituation: "Good delivery quality, inconsistent demand.",
  goals: ["increase qualified leads"],
  challenges: ["inconsistent sales pipeline"],
  optionalMetrics: {
    leads: "PRIVATE_TEST_VALUE"
  }
}));

const viewerMembership = expectOk(serviceA.addMembership(clientA, created.business.businessId, {
  userId: viewer,
  role: businessRoles.viewer
}));

const approval = expectOk(serviceA.decideOffer(clientA, created.business.businessId, flow.offer.offerId, "approve"));
const commercialRequest = expectOk(serviceA.createCommercialRequest(clientA, created.business.businessId, {
  offerId: flow.offer.offerId,
  contactPreference: "EMAIL_OR_TELEGRAM"
}));
const partnerRequest = expectOk(serviceA.createPartnerRequest(clientA, created.business.businessId, {
  desiredScope: "External growth department",
  areasToDelegate: ["Strategy", "Content"],
  preferredInvolvementLevel: "Weekly review",
  currentTeam: "Owner and one contractor",
  notes: "Please contact after offer review."
}));
const analytics = expectOk(serviceA.recordBusinessFunnelEvent(clientA, created.business.businessId, businessFunnelEvents.businessHomeViewed, {
  route: "#business",
  stage: "HOME"
}));

check("A durable store metadata is active", () => {
  const snapshot = serviceA.snapshot();
  assert.equal(snapshot.metadata.storeKind, businessStoreKinds.durableLocalFile);
  assert.equal(snapshot.metadata.durablePersistenceReady, true);
  assert.equal(snapshot.metadata.browserLocalStorageUsedForBusinessRecords, false);
  return snapshot.metadata.repository;
});

check("B all Sprint 02 Business artifacts persist before restart", () => {
  const snapshot = serviceA.snapshot();
  assert.equal(snapshot.businessProfiles.length, 1);
  assert.equal(snapshot.intakes.length, 1);
  assert.equal(snapshot.diagnoses.length, 1);
  assert.equal(snapshot.growthPlans.length, 1);
  assert.equal(snapshot.offers.length, 1);
  assert.equal(snapshot.projects.length, 1);
  assert.equal(snapshot.partnerRequests.length, 1);
  assert.equal(snapshot.commercialRequests.length, 1);
  assert.ok(snapshot.auditEvents.length >= 7);
});

check("C critical artifacts carry tenant and version metadata", () => {
  [flow.diagnosis, flow.growthPlan, flow.offer].forEach((artifact) => {
    assert.equal(artifact.organizationId, created.organization.organizationId);
    assert.equal(artifact.businessId, created.business.businessId);
    assert.equal(artifact.revision, 1);
    assert.equal(artifact.status, "ACTIVE");
    assert.equal(artifact.createdBy, clientA);
  });
});

check("D process restart simulation reloads the same Business state", () => {
  const restartedStore = createDurableBusinessStore({ filePath: storePath });
  const restartedService = createBusinessFlowService(restartedStore);
  const dashboard = expectOk(restartedService.getDashboard(clientA, created.business.businessId));
  assert.equal(dashboard.dashboard.business.name, "Sprint 02 Studio");
  assert.equal(dashboard.dashboard.latestDiagnosis.diagnosisId, flow.diagnosis.diagnosisId);
  assert.equal(dashboard.dashboard.growthPlan.growthPlanId, flow.growthPlan.growthPlanId);
  assert.equal(dashboard.dashboard.proposal.offerId, flow.offer.offerId);
  assert.equal(dashboard.dashboard.project.status, businessProjectStatuses.paymentRequired);
  assert.equal(dashboard.dashboard.commercialRequest.status, businessCommercialRequestStatuses.requested);
  return {
    businessId: dashboard.dashboard.business.businessId,
    storeFile: storePath
  };
});

check("E Client B cannot access Client A after restart", () => {
  const restartedService = createBusinessFlowService(createDurableBusinessStore({ filePath: storePath }));
  const blocked = restartedService.getDashboard(clientB, created.business.businessId);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.reason, "organization_membership_required");
});

check("F Viewer can read but cannot mutate", () => {
  const dashboard = expectOk(serviceA.getDashboard(viewer, created.business.businessId));
  const mutation = serviceA.updateProfile(viewer, created.business.businessId, { name: "Nope" });
  assert.equal(dashboard.dashboard.business.businessId, created.business.businessId);
  assert.equal(mutation.ok, false);
  assert.equal(mutation.status, 403);
  assert.equal(viewerMembership.membership.role, businessRoles.viewer);
});

check("G approval stops at commercial/payment boundary", () => {
  assert.equal(approval.offer.approvalStatus, businessOfferStatuses.approved);
  assert.equal(approval.offer.paymentStatus, "PAYMENT_REQUIRED");
  assert.equal(commercialRequest.commercialRequest.paymentBoundary.automatedCheckoutConfigured, false);
  assert.match(commercialRequest.commercialRequest.paymentBoundary.message, /not yet configured/);
});

check("H analytics stores safe metadata only", () => {
  const eventText = JSON.stringify(analytics.event);
  assert.equal(eventText.includes("PRIVATE_TEST_VALUE"), false);
  assert.equal(eventText.includes("optionalMetrics"), false);
  assert.equal(analytics.event.privacyPolicy.noSensitiveRawPayload, true);
});

check("I Business Partner request persists required request fields", () => {
  assert.equal(partnerRequest.partnerRequest.requestedScope, "ESSA_BUSINESS_PARTNER");
  assert.deepEqual(partnerRequest.partnerRequest.areasToDelegate, ["Strategy", "Content"]);
  assert.equal(partnerRequest.partnerRequest.currentTeam, "Owner and one contractor");
});

await checkAsync("J unauthenticated Business API request is denied when auth env is absent", async () => {
  const auth = createBusinessAuthAdapter({
    env: {
      NODE_ENV: "production",
      ESSA_BUSINESS_LOCAL_AUTH: "0"
    }
  });
  const result = await auth.authenticate({ headers: {}, query: {} });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "supabase_auth_configuration_required");
});

await checkAsync("K invalid Supabase token is denied through auth adapter", async () => {
  const auth = createBusinessAuthAdapter({
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "test"
    },
    supabaseClient: {
      auth: {
        getUser: async () => ({ data: null, error: new Error("invalid") })
      }
    }
  });
  const result = await auth.authenticate({ headers: { authorization: "Bearer invalid" }, query: {} });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(result.reason, "invalid_or_expired_token");
});

check("L no fake provider, payment, ads, outreach, or model execution flags exist", () => {
  assert.equal(flow.growthPlan.noAutoExecution, true);
  assert.equal(flow.growthPlan.suggestedEssaCapabilities.every((item) => item.executionEnabled === false), true);
  assert.equal(commercialRequest.commercialRequest.paymentBoundary.automatedCheckoutConfigured, false);
});

if (failures > 0) {
  console.error(`Business Sprint 02 tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Sprint 02 tests passed.");
