import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionDemoTypes,
  acquisitionLifecycleStates,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createDemoPlanAuditArtifact,
  createProspectDigitalOpportunityAudit,
  evaluateDemoGenerationSafetyGate,
  listDemoTypes,
  scoreBusinessAcquisitionOpportunity
} from "../src/businessAcquisition/index.js";
import {
  createLeadDiscoveryRequest,
  discoverBusinessesFromFixture,
  fixtureBusinessEntities,
  leadFreshnessStates
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

function reviewedLeadFor(businessId, requestInput = {}) {
  const discovery = discoverBusinessesFromFixture(createLeadDiscoveryRequest({
    targetMarket: "",
    geography: "Georgia",
    industries: [],
    businessTypes: [],
    maxResults: 20,
    ...requestInput
  }), fixtureBusinessEntities);
  return discovery.reviewed.find((item) => item.business.businessId === businessId);
}

function planFromReviewed(reviewed, overrides = {}) {
  const prospect = createBusinessProspect({
    business: { ...reviewed.business, ...(overrides.business || {}) },
    verificationStatus: reviewed.verification.verificationStatus,
    lifecycleState: overrides.lifecycleState,
    suppressionStatus: overrides.suppressionStatus
  });
  const digitalAudit = createProspectDigitalOpportunityAudit({
    prospect,
    needSignals: overrides.needSignals || reviewed.needSignals,
    essaMatches: reviewed.essaMatches
  });
  const score = overrides.score || scoreBusinessAcquisitionOpportunity({
    prospect,
    digitalAudit,
    qualification: reviewed.qualification,
    verification: reviewed.verification,
    scoreOverrides: overrides.scoreOverrides
  });
  return {
    prospect,
    digitalAudit,
    score,
    ...createContextAwareDemoPlan({
      prospect,
      digitalAudit,
      score,
      needSignals: overrides.needSignals || reviewed.needSignals,
      minimumOpportunityScore: overrides.minimumOpportunityScore
    })
  };
}

function manualPlan({ business, scoreOverrides = {}, minimumOpportunityScore = 9 }) {
  const prospect = createBusinessProspect({ business });
  const digitalAudit = createProspectDigitalOpportunityAudit({ prospect, needSignals: [], essaMatches: [] });
  const score = scoreBusinessAcquisitionOpportunity({
    prospect,
    digitalAudit,
    qualification: { fitLevel: "REVIEW", evidenceForNeeds: [] },
    verification: { verificationStatus: "REVIEW_REQUIRED" },
    scoreOverrides
  });
  return {
    prospect,
    digitalAudit,
    score,
    ...createContextAwareDemoPlan({ prospect, digitalAudit, score, needSignals: [], minimumOpportunityScore })
  };
}

const restaurant = planFromReviewed(reviewedLeadFor("batumi_bistro_1"));
const hotel = planFromReviewed(reviewedLeadFor("batumi_hotel_group"), { minimumOpportunityScore: 8 });
const construction = planFromReviewed(reviewedLeadFor("batumi_builder"), {
  scoreOverrides: { digitalGap: 3, commercialPotential: 3, essaProductFit: 3, demoCommunicationValue: 3, implementationComplexity: 1, publicEvidenceQuality: 2 }
});
const retail = manualPlan({
  business: {
    businessId: "fixture_retail_shop",
    legalOrDisplayName: "Batumi Design Store",
    businessType: "retail shop",
    industry: "retail",
    subIndustry: "home goods",
    country: "Georgia",
    city: "Batumi",
    website: "design-store.example",
    publicBusinessPhone: "+995 555 040404",
    socialProfiles: ["instagram.com/designstoreexample"],
    publicDescription: "Fictional local shop with product assortment visible in public description.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_directory_retail", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  scoreOverrides: { digitalGap: 3, commercialPotential: 3, essaProductFit: 3, demoCommunicationValue: 3, implementationComplexity: 1, publicEvidenceQuality: 2 }
});
const insufficient = manualPlan({
  business: {
    businessId: "fixture_insufficient",
    legalOrDisplayName: "Thin Public Record",
    businessType: "service",
    industry: "services",
    country: "Georgia",
    city: "Batumi",
    website: null,
    publicDescription: "Fictional listing with no source refs.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: []
  },
  scoreOverrides: { digitalGap: 1, commercialPotential: 1, essaProductFit: 1, demoCommunicationValue: 1, implementationComplexity: 0, publicEvidenceQuality: 0 }
});
const stale = planFromReviewed(reviewedLeadFor("stale_restaurant"));
const weakScore = planFromReviewed(reviewedLeadFor("batumi_bistro_1"), {
  scoreOverrides: { digitalGap: 1, commercialPotential: 1, essaProductFit: 1, demoCommunicationValue: 1, implementationComplexity: 0, publicEvidenceQuality: 0 }
});
const suppressed = planFromReviewed(reviewedLeadFor("batumi_bistro_1"), {
  suppressionStatus: "DO_NOT_CONTACT"
});
const tieBreak = manualPlan({
  business: {
    businessId: "fixture_tie_service",
    legalOrDisplayName: "Batumi Service Studio",
    businessType: "service studio",
    industry: "services",
    subIndustry: "consulting",
    country: "Georgia",
    city: "Batumi",
    website: null,
    publicBusinessEmail: "hello@servicestudio.example",
    publicDescription: "Fictional service studio with clear service information and contact path.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_service_directory", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  },
  scoreOverrides: { digitalGap: 3, commercialPotential: 3, essaProductFit: 3, demoCommunicationValue: 3, implementationComplexity: 1, publicEvidenceQuality: 2 }
});

check("A demo type registry is bounded and mapped to ESSA capabilities", () => {
  const registry = listDemoTypes();
  assert.deepEqual(registry.map((item) => item.demoType), [
    acquisitionDemoTypes.homepageConcept,
    acquisitionDemoTypes.serviceLandingPreview,
    acquisitionDemoTypes.catalogPreviewV2,
    acquisitionDemoTypes.storefrontPreview,
    acquisitionDemoTypes.bookingFlowPreview,
    acquisitionDemoTypes.menuOrderPreview,
    acquisitionDemoTypes.projectPortfolioPreview,
    acquisitionDemoTypes.developerProjectPreview,
    acquisitionDemoTypes.leadCapturePreview,
    acquisitionDemoTypes.contentCreativePreview,
    acquisitionDemoTypes.businessDashboardPreview
  ]);
  assert.ok(registry.every((item) => item.requiredCapabilities.length > 0));
  assert.ok(registry.every((item) => item.executionEnabled === false));
  return registry.map((item) => ({ demoType: item.demoType, requiredCapabilities: item.requiredCapabilities }));
});

check("B restaurant selects menu/order preview", () => {
  assert.equal(restaurant.demoPlan.demoType, acquisitionDemoTypes.menuOrderPreview);
  assert.ok(restaurant.demoPlan.evidenceRefs.includes("MENU_OR_ORDER_OPPORTUNITY"));
  assert.notEqual(restaurant.demoPlan.demoType, hotel.demoPlan.demoType);
  return restaurant.demoPlan.selectedRecommendation;
});

check("C hotel selects booking flow preview", () => {
  assert.equal(hotel.demoPlan.demoType, acquisitionDemoTypes.bookingFlowPreview);
  assert.ok(hotel.demoPlan.evidenceRefs.includes("NO_VISIBLE_BOOKING_FLOW"));
});

check("D construction company selects developer/project preview path", () => {
  assert.equal(construction.demoPlan.demoType, acquisitionDemoTypes.developerProjectPreview);
  assert.ok(construction.demoPlan.evidenceRefs.includes("DEVELOPMENT_PRESENTATION_OPPORTUNITY"));
});

check("E retail shop selects storefront or catalog preview", () => {
  assert.ok([
    acquisitionDemoTypes.storefrontPreview,
    acquisitionDemoTypes.catalogPreviewV2
  ].includes(retail.demoPlan.demoType));
  assert.ok(retail.demoPlan.evidenceRefs.includes("PRODUCT_ASSORTMENT_VISIBLE"));
});

check("F insufficient evidence blocks demo planning", () => {
  assert.equal(insufficient.demoPlan.demoType, null);
  assert.ok(insufficient.demoPlan.safetyGate.blockers.includes("SOURCE_EVIDENCE_INVALID_OR_MISSING"));
});

check("G stale prospect blocks future generation boundary", () => {
  assert.equal(stale.demoPlan.demoType, null);
  assert.ok(stale.demoPlan.safetyGate.blockers.includes("PROSPECT_SUPPRESSED_REJECTED_OR_STALE"));
});

check("H weak opportunity score blocks demo planning", () => {
  assert.equal(weakScore.demoPlan.demoType, null);
  assert.ok(weakScore.demoPlan.safetyGate.blockers.includes("OPPORTUNITY_SCORE_BELOW_THRESHOLD"));
});

check("I suppressed prospect blocks demo planning", () => {
  assert.equal(suppressed.demoPlan.demoType, null);
  assert.ok(suppressed.demoPlan.safetyGate.blockers.includes("PROSPECT_SUPPRESSED_REJECTED_OR_STALE"));
});

check("J multiple valid candidates preserve rejected alternatives and tie policy", () => {
  assert.ok(tieBreak.recommendations.length > 1);
  assert.ok(tieBreak.demoPlan.rejectedAlternatives.length > 0);
  assert.ok(tieBreak.demoPlan.rejectedAlternatives.every((item) => item.rejectionReasons.length > 0));
  assert.equal(tieBreak.demoPlan.demoType, acquisitionDemoTypes.serviceLandingPreview);
  return tieBreak.demoPlan.rejectedAlternatives.map((item) => ({
    demoType: item.demoType,
    score: item.score,
    rejectionReasons: item.rejectionReasons
  }));
});

check("K safety gate separates DemoPlan from generated preview and production deliverable", () => {
  const gate = evaluateDemoGenerationSafetyGate({
    prospect: restaurant.prospect,
    digitalAudit: restaurant.digitalAudit,
    score: restaurant.score,
    selectedRecommendation: restaurant.demoPlan.selectedRecommendation
  });
  assert.equal(gate.demoPlanAllowed, true);
  assert.equal(gate.generatedPreviewAllowed, false);
  assert.equal(gate.productionDeliverableAllowed, false);
  assert.equal(gate.executionEnabled, false);
  assert.equal(restaurant.demoPlan.publishAllowed, false);
  assert.equal(restaurant.demoPlan.handoffAllowed, false);
});

check("L audit artifact records provenance and zero external effects", () => {
  const proof = createDemoPlanAuditArtifact({
    prospect: restaurant.prospect,
    digitalAudit: restaurant.digitalAudit,
    score: restaurant.score,
    demoPlan: restaurant.demoPlan,
    recommendations: restaurant.recommendations,
    opportunityCodes: restaurant.opportunityCodes,
    sourceFiles: [
      "src/businessAcquisition/demoTypeRegistry.js",
      "src/businessAcquisition/contextAwareDemoPlanner.js",
      "src/businessAcquisition/demoSafetyGates.js",
      "src/businessAcquisition/demoPlanAudit.js",
      "scripts/testBusinessAcquisitionContextAwareDemoPlanning.js"
    ]
  });
  assert.equal(proof.counters.providerCalls, 0);
  assert.equal(proof.counters.externalCalls, 0);
  assert.equal(proof.counters.publishActions, 0);
  assert.equal(proof.counters.outreachActions, 0);
  assert.equal(proof.counters.paymentActions, 0);
  assert.equal(proof.boundaries.demoPlanSeparateFromGeneratedDemo, true);
  const proofPath = path.resolve("artifacts/business/acquisition-demo-engine/BusinessAcquisitionContextAwareDemoPlanProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    proof,
    scenarios: {
      restaurant: restaurant.demoPlan.demoType,
      hotel: hotel.demoPlan.demoType,
      construction: construction.demoPlan.demoType,
      retail: retail.demoPlan.demoType,
      insufficient: insufficient.demoPlan.safetyGate.blockers,
      stale: stale.demoPlan.safetyGate.blockers,
      weakScore: weakScore.demoPlan.safetyGate.blockers,
      suppressed: suppressed.demoPlan.safetyGate.blockers,
      tieBreak: {
        selected: tieBreak.demoPlan.demoType,
        rejected: tieBreak.demoPlan.rejectedAlternatives.map((item) => item.demoType)
      }
    }
  }, null, 2));
  return { proofPath: "artifacts/business/acquisition-demo-engine/BusinessAcquisitionContextAwareDemoPlanProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Context-Aware Demo Planning tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Context-Aware Demo Planning tests passed.");
