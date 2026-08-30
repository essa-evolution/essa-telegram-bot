import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  businessActionRiskLevels,
  businessAutonomyLevels,
  businessLifecycleStages,
  businessOperatingLoop,
  businessRevenueLoop,
  businessSignalStatuses,
  createActionIntent,
  createAutomationPermission,
  createBusinessFlowService,
  createBusinessHealthSnapshot,
  createDurableBusinessStore,
  createFinancialOperationsBoundary,
  createJurisdictionAdapterBoundary
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

const storePath = path.resolve("artifacts/business/sprint05a-test-store.json");
fs.rmSync(storePath, { force: true });

const owner = "sprint05a_owner";
const outsider = "sprint05a_outsider";
const service = createBusinessFlowService(createDurableBusinessStore({ filePath: storePath }));

const businessA = expectOk(service.createProfile(owner, {
  name: "Pocket Bakery",
  industry: "Food",
  city: "Tbilisi",
  goals: ["launch delivery channel"]
}));
const businessB = expectOk(service.createProfile(owner, {
  name: "Pocket Studio",
  industry: "Creative Services",
  city: "Batumi",
  goals: ["sell productized content packages"]
}));

check("A canonical lifecycle and operating loops are exported", () => {
  assert.equal(businessLifecycleStages.create, "CREATE");
  assert.equal(businessLifecycleStages.sellExit, "SELL_EXIT");
  assert.deepEqual(businessOperatingLoop, ["SEE", "UNDERSTAND", "RECOMMEND", "APPROVE", "EXECUTE", "MEASURE", "LEARN", "NEXT_ACTION"]);
  assert.ok(businessRevenueLoop.includes("NEXT_CONTENT"));
});

check("B multiple businesses stay independently addressable for one user", () => {
  const list = expectOk(service.listBusinessesForUser(owner));
  assert.equal(list.businesses.length, 2);
  assert.notEqual(businessA.business.businessId, businessB.business.businessId);
  assert.notEqual(businessA.business.organizationId, businessB.business.organizationId);
});

check("C management state and subscription are business-scoped and independent", () => {
  const dashboardA = expectOk(service.getDashboard(owner, businessA.business.businessId)).dashboard;
  const dashboardB = expectOk(service.getDashboard(owner, businessB.business.businessId)).dashboard;
  assert.equal(dashboardA.managementSubscription.businessId, businessA.business.businessId);
  assert.equal(dashboardB.managementSubscription.businessId, businessB.business.businessId);
  assert.notEqual(dashboardA.managementSubscription.subscriptionId, dashboardB.managementSubscription.subscriptionId);
  assert.equal(dashboardA.management.autonomyLevel, businessAutonomyLevels.approveToExecute);
  assert.equal(dashboardA.managementSubscription.pricingFinalized, false);
});

check("D portfolio dashboard is computed and does not create a portfolio table", () => {
  const portfolio = expectOk(service.getPortfolioDashboard(owner)).portfolio;
  const snapshot = service.snapshot();
  assert.equal(portfolio.computed, true);
  assert.equal(portfolio.persistedSourceOfTruth, false);
  assert.equal(portfolio.businessCount, 2);
  assert.equal(snapshot.creationFlows.length, 2);
  assert.equal(Object.hasOwn(snapshot, "businessPortfolioViews"), false);
});

check("E low-risk delegated automation is allowed only when explicit", () => {
  const denied = createAutomationPermission({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId,
    actionType: "INTERNAL_REPORT",
    riskLevel: businessActionRiskLevels.low,
    autonomyLevel: businessAutonomyLevels.delegatedAutomation,
    explicitlyAuthorized: false
  });
  const allowed = createAutomationPermission({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId,
    actionType: "INTERNAL_REPORT",
    riskLevel: businessActionRiskLevels.low,
    autonomyLevel: businessAutonomyLevels.delegatedAutomation,
    explicitlyAuthorized: true
  });
  assert.equal(denied.delegatedExecutionAllowed, false);
  assert.equal(allowed.delegatedExecutionAllowed, true);
});

check("F high and regulated actions require approval", () => {
  const high = createActionIntent({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId,
    riskLevel: businessActionRiskLevels.high,
    autonomyLevel: businessAutonomyLevels.delegatedAutomation,
    title: "Increase ad budget",
    external: true
  });
  const regulated = createActionIntent({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId,
    riskLevel: businessActionRiskLevels.regulated,
    autonomyLevel: businessAutonomyLevels.delegatedAutomation,
    title: "Prepare tax filing"
  });
  assert.equal(high.approvalRequired, true);
  assert.equal(high.executionAllowedWithoutApproval, false);
  assert.equal(regulated.approvalRequired, true);
});

check("F2 local-first action creation persists an approval gate when required", () => {
  const created = expectOk(service.createAction(owner, businessA.business.businessId, {
    riskLevel: businessActionRiskLevels.high,
    title: "Publish public campaign",
    external: true
  }));
  const snapshot = service.snapshot();
  assert.equal(created.actionIntent.approvalRequired, true);
  assert.ok(snapshot.approvalGates.some((gate) => gate.actionIntentId === created.actionIntent.actionIntentId));
});

check("G business health does not fabricate missing or unconnected metrics", () => {
  const health = createBusinessHealthSnapshot({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId,
    signals: {
      revenue: businessSignalStatuses.insufficientData,
      advertising: businessSignalStatuses.notConnected
    }
  });
  assert.equal(health.fabricatedMetrics, false);
  assert.equal(health.signals.revenue, businessSignalStatuses.insufficientData);
  assert.equal(health.signals.advertising, businessSignalStatuses.notConnected);
});

check("H no cross-business or outsider leakage in computed portfolio", () => {
  const outsiderPortfolio = expectOk(service.getPortfolioDashboard(outsider)).portfolio;
  assert.equal(outsiderPortfolio.businessCount, 0);
  const ownerPortfolio = expectOk(service.getPortfolioDashboard(owner)).portfolio;
  assert.equal(ownerPortfolio.businesses.some((item) => item.businessId === businessA.business.businessId), true);
  assert.equal(ownerPortfolio.businesses.some((item) => item.businessId === businessB.business.businessId), true);
});

check("I financial and jurisdiction layers are boundaries only", () => {
  const financial = createFinancialOperationsBoundary({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId
  });
  const jurisdiction = createJurisdictionAdapterBoundary({
    businessId: businessA.business.businessId,
    organizationId: businessA.business.organizationId,
    country: "GE"
  });
  assert.equal(financial.regulatedAccountingProvided, false);
  assert.equal(financial.requiresJurisdictionAdapterForLegalReporting, true);
  assert.equal(jurisdiction.legalTaxReportingEnabled, false);
  assert.equal(jurisdiction.adapterStatus, businessSignalStatuses.notConnected);
});

if (failures > 0) {
  console.error(`Business Sprint 05A tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Sprint 05A tests passed.");
