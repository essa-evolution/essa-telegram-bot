import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildBusinessNavigatorContext,
  businessFlowStages,
  businessHealthStates,
  businessOfferStatuses,
  businessPricingStatuses,
  businessProjectStatuses,
  businessRoles,
  businessStoreKinds,
  createBusinessFlowService,
  createBusinessStore,
  detectBusinessNavigatorIntent,
  publicBusinessProjection,
  restrictedBusinessMetricKeys
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

function expectOk(result) {
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

const store = createBusinessStore();
const service = createBusinessFlowService(store);
const scenario = service.runSprint01AcceptanceScenario();
const businessId = scenario.created.business.businessId;
const offerId = scenario.flow.offer.offerId;

check("A user becomes business client and profile owner", () => {
  assert.equal(scenario.created.business.ownerUserId, scenario.users.alice);
  assert.equal(scenario.created.membership.role, businessRoles.owner);
  assert.equal(scenario.created.workspace.businessId, businessId);
  return scenario.created.business;
});

check("B Business Profile supports progressive update", () => {
  assert.equal(scenario.updated.business.targetAudience, "Local residents and tourists");
  assert.equal(scenario.updated.business.currentSituation, "Strong product, inconsistent weekday demand.");
});

check("C public projection excludes private metrics", () => {
  const projectionText = JSON.stringify(scenario.publicProjection);
  restrictedBusinessMetricKeys.forEach((key) => assert.equal(projectionText.includes(key), false));
  assert.equal(scenario.publicProjection.sourceRefs[0].dataClass, "PUBLIC_BUSINESS_DATA");
});

check("D unrelated user cannot read another business", () => {
  assert.equal(scenario.bobRead.ok, false);
  assert.equal(scenario.bobRead.status, 403);
});

check("E viewer cannot mutate another client workspace", () => {
  assert.equal(scenario.viewerMutation.ok, false);
  assert.equal(scenario.viewerMutation.status, 403);
  assert.equal(scenario.viewerMutation.reason, "insufficient_business_role");
});

check("F intake creates the requested vertical chain", () => {
  assert.equal(scenario.flow.intake.modelType, "BusinessIntake");
  assert.equal(scenario.flow.diagnosis.modelType, "BusinessDiagnosis");
  assert.equal(scenario.flow.growthPlan.modelType, "BusinessGrowthPlan");
  assert.equal(scenario.flow.offer.modelType, "CommercialOfferDraft");
  assert.equal(scenario.flow.project.modelType, "BusinessProjectWorkspace");
});

check("G diagnosis does not fabricate missing commercial metrics", () => {
  const unknownMetrics = scenario.flow.diagnosis.unknowns.map((item) => item.metric);
  ["approximateRevenue", "leads", "conversion", "traffic", "profitability"].forEach((metric) => {
    assert.ok(unknownMetrics.includes(metric), metric);
  });
});

check("H health dimensions use states, not fake scores", () => {
  const allowed = new Set(Object.values(businessHealthStates));
  Object.values(scenario.flow.diagnosis.dimensions).forEach((dimension) => {
    assert.ok(allowed.has(dimension.state), dimension.state);
    assert.equal(typeof dimension.state, "string");
  });
});

check("I growth plan is evidence-linked and approval-gated", () => {
  assert.equal(scenario.flow.growthPlan.noAutoExecution, true);
  assert.equal(scenario.flow.growthPlan.diagnosisId, scenario.flow.diagnosis.diagnosisId);
  assert.ok(scenario.flow.growthPlan.evidenceReasoning.length > 0);
});

check("J commercial offer has no hardcoded price or fake checkout", () => {
  assert.equal(scenario.flow.offer.pricingStatus, businessPricingStatuses.notPriced);
  assert.equal(scenario.flow.offer.amount, null);
  assert.equal(scenario.flow.offer.paymentStatus, businessPricingStatuses.paymentNotConfigured);
  assert.ok(scenario.flow.offer.exclusions.includes("No payment collection"));
});

check("K approving offer stops at payment-required boundary", () => {
  assert.equal(scenario.approval.offer.approvalStatus, businessOfferStatuses.approved);
  assert.equal(scenario.approval.offer.paymentStatus, businessPricingStatuses.paymentRequired);
  assert.equal(scenario.dashboardAfterApproval.dashboard.project.status, businessProjectStatuses.paymentRequired);
});

check("L workspace is server-backed memory for Sprint 01", () => {
  assert.equal(scenario.storeMetadata.storeKind, businessStoreKinds.serverBackedMemory);
  assert.equal(scenario.storeMetadata.browserLocalStorageUsedForBusinessRecords, false);
  assert.equal(scenario.storeMetadata.durablePersistenceReady, false);
});

check("M Navigator detects Business growth intent", () => {
  assert.equal(detectBusinessNavigatorIntent("хочу развить бизнес"), "BUSINESS_GROWTH");
  const context = buildBusinessNavigatorContext({
    user: { userId: scenario.users.alice },
    business: scenario.created.business,
    workspace: scenario.created.workspace,
    project: scenario.flow.project,
    stage: businessFlowStages.commercialOfferDraft
  });
  assert.equal(context.product, "ESSA_BUSINESS");
  assert.equal(context.businessId, businessId);
  assert.equal(context.privateDataPolicy.doNotExposeOtherTenantData, true);
});

check("N ESSA Business Partner request is interest only", () => {
  assert.equal(scenario.partnerRequest.partnerRequest.requestedScope, "ESSA_BUSINESS_PARTNER");
  assert.equal(scenario.partnerRequest.partnerRequest.preferredInvolvementLevel, "EXTERNAL_GROWTH_DEPARTMENT_INTEREST");
});

check("O audit events are tenant scoped", () => {
  assert.ok(scenario.audit.auditEvents.length >= 6);
  assert.ok(scenario.audit.auditEvents.every((event) => event.businessId === businessId));
  assert.ok(scenario.audit.auditEvents.every((event) => event.organizationId === scenario.created.organization.organizationId));
});

check("P client A/B isolation holds through independent business", () => {
  const bobBusiness = expectOk(service.createProfile(scenario.users.bob, { name: "Bob Studio" }));
  const aliceReadBob = service.getDashboard(scenario.users.alice, bobBusiness.business.businessId);
  assert.equal(aliceReadBob.ok, false);
  assert.equal(aliceReadBob.status, 403);
});

check("Q invalid intake is rejected", () => {
  const empty = store.saveIntake(scenario.users.alice, businessId, { businessId });
  assert.equal(empty.ok, false);
  assert.ok(empty.errors.includes("intake_requires_business_context"));
});

check("R future intents are not activated as automation", () => {
  assert.equal(scenario.flow.growthPlan.suggestedEssaCapabilities.every((capability) => capability.executionEnabled === false), true);
  assert.equal(scenario.flow.project.status === businessProjectStatuses.inProgress, false);
});

check("S dashboard explains what ESSA needs and what happens next", () => {
  assert.equal(scenario.dashboardAfterApproval.dashboard.whatHappensNext, "Payment request and verified confirmation are required before onboarding/project activation.");
  assert.ok(scenario.dashboardAfterApproval.dashboard.whatEssaNeedsFromMe.length > 0);
});

check("T private client data is not exported to Lead Intelligence", () => {
  assert.equal(scenario.flow.diagnosis.dataPolicy.privateMetricsStayPrivate, true);
  assert.equal(scenario.flow.diagnosis.dataPolicy.publicLeadIntelligenceExportAllowed, false);
});

check("U no external provider, model, payment, or OpenRouter calls occurred", () => {
  assert.equal(scenario.externalProviderCalls, 0);
  assert.equal(scenario.paymentProviderCalls, 0);
  assert.equal(scenario.modelProviderCalls, 0);
});

check("V store snapshot remains tenant-aware", () => {
  const snapshot = service.snapshot();
  assert.equal(snapshot.metadata.tenantScoped, true);
  assert.ok(snapshot.memberships.some((item) => item.organizationId === scenario.created.organization.organizationId));
});

check("W offer change/decline decisions remain local state transitions", () => {
  const second = expectOk(service.createProfile("decision_owner", { name: "Decision Studio" }));
  const secondFlow = expectOk(service.runGrowthIntake("decision_owner", second.business.businessId, {
    description: "Studio needing sharper positioning."
  }));
  const changed = expectOk(service.decideOffer("decision_owner", second.business.businessId, secondFlow.offer.offerId, "request_changes"));
  const declined = expectOk(service.decideOffer("decision_owner", second.business.businessId, secondFlow.offer.offerId, "decline"));
  assert.equal(changed.offer.approvalStatus, businessOfferStatuses.changesRequested);
  assert.equal(declined.offer.approvalStatus, businessOfferStatuses.declined);
});

check("X Business source files do not persist records in browser localStorage", () => {
  const files = [
    "src/business/businessContracts.js",
    "src/business/businessDiagnosis.js",
    "src/business/businessNavigatorBridge.js",
    "src/business/businessService.js",
    "src/business/businessStore.js"
  ];
  files.forEach((file) => {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("localStorage"), false, file);
  });
});

if (failures > 0) {
  console.error(`Business Sprint 01 tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Sprint 01 tests passed.");
