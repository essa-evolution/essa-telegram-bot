import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  businessPaymentModels,
  createBusinessFlowService,
  createBusinessStore
} from "../src/business/index.js";
import {
  createBusinessProspect,
  createBusinessAcquisitionProof,
  createConfigurableAcquisitionOffer,
  createInstantDemoPlan,
  createProspectDigitalOpportunityAudit,
  evaluateBusinessActivationReadiness,
  scoreBusinessAcquisitionOpportunity
} from "../src/businessAcquisition/index.js";
import {
  createRestaurantDiscoveryRequest,
  discoverBusinessesFromFixture,
  evaluateOutreachAttempt,
  fixtureBusinessEntities,
  validateBusinessEntityDataPolicy
} from "../src/leadIntelligence/index.js";

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

const request = createRestaurantDiscoveryRequest({
  requestId: "business_acquisition_phase_a",
  traceId: "business_acquisition_phase_a_trace"
});
const discovery = discoverBusinessesFromFixture(request, fixtureBusinessEntities);
const reviewed = discovery.reviewed.find((item) => item.business.businessId === "batumi_bistro_1");
const prospect = createBusinessProspect({
  business: reviewed.business,
  verificationStatus: reviewed.verification.verificationStatus
});
const digitalAudit = createProspectDigitalOpportunityAudit({
  prospect,
  needSignals: reviewed.needSignals,
  essaMatches: reviewed.essaMatches
});
const score = scoreBusinessAcquisitionOpportunity({
  prospect,
  digitalAudit,
  qualification: reviewed.qualification,
  verification: reviewed.verification
});
const demoPlan = createInstantDemoPlan({ prospect, digitalAudit, score });
const acquisitionOffer = createConfigurableAcquisitionOffer({
  prospect,
  demoProject: demoPlan.demoProject,
  pricing: {
    pricingModel: businessPaymentModels.custom,
    packageKey: "CONFIGURABLE_PREVIEW_PACKAGE"
  }
});
const activationReadiness = evaluateBusinessActivationReadiness({
  prospect,
  offer: acquisitionOffer
});
const service = createBusinessFlowService(createBusinessStore());
const proof = createBusinessAcquisitionProof({
  prospect,
  digitalAudit,
  score,
  demoProject: demoPlan.demoProject,
  acquisitionOffer,
  activationReadiness,
  sourceFiles: [
    "src/businessAcquisition/businessAcquisitionContracts.js",
    "src/businessAcquisition/digitalOpportunityAudit.js",
    "src/businessAcquisition/opportunityScoring.js",
    "src/businessAcquisition/instantDemoPlanner.js",
    "src/businessAcquisition/acquisitionOffer.js",
    "src/businessAcquisition/acquisitionActivation.js",
    "src/businessAcquisition/acquisitionAudit.js",
    "src/businessAcquisition/index.js",
    "scripts/testBusinessAcquisitionDemoEngine.js"
  ]
});

check("A prospect is separate from canonical BusinessProfile", () => {
  assert.equal(prospect.modelType, "BusinessProspect");
  assert.equal(prospect.businessProfileCreated, false);
  assert.equal(prospect.linkedBusinessId, null);
  assert.equal(service.snapshot().businessProfiles.length, 0);
  return prospect;
});

check("B prospect requires public source refs and stays public-data-only", () => {
  assert.ok(prospect.sourceRefs.length >= 1);
  assert.equal(prospect.publicDataOnly, true);
  assert.equal(validateBusinessEntityDataPolicy(reviewed.business).ok, true);
});

check("C digital audit separates observed facts from inferred opportunities", () => {
  assert.ok(digitalAudit.observedFacts.some((fact) => fact.includes("No public website")));
  assert.ok(digitalAudit.inferredOpportunities.some((item) => item.includes("digital front-door")));
  assert.equal(digitalAudit.dataPolicy.observedFactsSeparatedFromInferences, true);
});

check("D audit does not classify business as good or bad", () => {
  const text = JSON.stringify(digitalAudit).toLowerCase();
  assert.equal(/\bgood business\b|\bbad business\b/.test(text), false);
  assert.ok(digitalAudit.prohibitedInterpretations.some((item) => item.includes("good or bad")));
});

check("E opportunity score is deterministic and explainable", () => {
  const again = scoreBusinessAcquisitionOpportunity({
    prospect,
    digitalAudit,
    qualification: reviewed.qualification,
    verification: reviewed.verification
  });
  assert.deepEqual(again.componentScores, score.componentScores);
  assert.equal(score.sensitivePersonalDataUsed, false);
  assert.ok(score.total > 0);
  return score;
});

check("F demo type is selected by business context", () => {
  assert.equal(demoPlan.demoType, "RESTAURANT_MENU_ORDER_EXPERIENCE_CONCEPT");
  assert.equal(demoPlan.demoProject.productionWorkspace, false);
  assert.equal(demoPlan.demoProject.visibleDemoLabel, "DEMO / CONCEPT");
});

check("G demo artifact is not a production deliverable", () => {
  assert.equal(demoPlan.demoArtifact.productionDeliverable, false);
  assert.equal(demoPlan.demoArtifact.transferAllowedBeforePurchase, false);
  assert.equal(demoPlan.deploymentPerformed, false);
});

check("H acquisition offer is configurable and does not hard-code 500", () => {
  assert.equal(acquisitionOffer.hardCodedPrice, false);
  assert.equal(acquisitionOffer.offerConfiguration.fixedPrice, null);
  assert.equal(acquisitionOffer.offerConfiguration.packageKey, "CONFIGURABLE_PREVIEW_PACKAGE");
  assert.ok(acquisitionOffer.offerConfiguration.optionalModules.includes("CRM"));
});

check("I outreach remains disabled and unsent", () => {
  const outreach = evaluateOutreachAttempt({ prospect });
  assert.equal(outreach.outreachEnabled, false);
  assert.equal(outreach.sendCount, 0);
  assert.equal(outreach.crmMutated, false);
});

check("J activation is blocked before acceptance and ownership verification", () => {
  assert.equal(activationReadiness.ok, false);
  assert.equal(activationReadiness.businessProfileCreationAllowed, false);
  assert.ok(activationReadiness.blockers.includes("OFFER_ACCEPTANCE_REQUIRED"));
  assert.ok(activationReadiness.blockers.includes("BUSINESS_OWNERSHIP_VERIFICATION_REQUIRED"));
});

check("K acquisition proof records zero external effects", () => {
  assert.equal(proof.counters.providerCalls, 0);
  assert.equal(proof.counters.externalModelCalls, 0);
  assert.equal(proof.counters.paymentActions, 0);
  assert.equal(proof.counters.publishActions, 0);
  assert.equal(proof.counters.deployActions, 0);
  assert.equal(proof.counters.businessProfileCreated, false);
});

check("L proof can be persisted as local artifact only", () => {
  const proofPath = path.resolve("artifacts/business/acquisition-demo-engine/BusinessAcquisitionDemoEngineProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  const loaded = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_A_PASS");
  return { proofPath: "artifacts/business/acquisition-demo-engine/BusinessAcquisitionDemoEngineProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Demo Engine tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Demo Engine tests passed.");
