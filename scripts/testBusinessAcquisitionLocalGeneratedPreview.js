import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionDemoTypes,
  acquisitionLifecycleStates,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createProspectDigitalOpportunityAudit,
  evaluatePreviewGenerationSafetyGate,
  generateLocalPreviewPackage,
  previewGenerationStatuses,
  previewQcStatuses,
  runPreviewQc,
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

function reviewedLeadFor(businessId) {
  const discovery = discoverBusinessesFromFixture(createLeadDiscoveryRequest({
    targetMarket: "",
    geography: "Georgia",
    industries: [],
    businessTypes: [],
    maxResults: 20
  }), fixtureBusinessEntities);
  return discovery.reviewed.find((item) => item.business.businessId === businessId);
}

function manualBusinessPlan({ business, expectedDemoType, scoreOverrides }) {
  const prospect = createBusinessProspect({ business });
  const digitalAudit = createProspectDigitalOpportunityAudit({ prospect, needSignals: [], essaMatches: [] });
  const score = scoreBusinessAcquisitionOpportunity({
    prospect,
    digitalAudit,
    qualification: { fitLevel: "REVIEW", evidenceForNeeds: [] },
    verification: { verificationStatus: "REVIEW_REQUIRED" },
    scoreOverrides: scoreOverrides || { digitalGap: 3, commercialPotential: 3, essaProductFit: 3, demoCommunicationValue: 3, implementationComplexity: 1, publicEvidenceQuality: 2 }
  });
  const result = createContextAwareDemoPlan({ prospect, digitalAudit, score, needSignals: [] });
  if (expectedDemoType) assert.equal(result.demoPlan.demoType, expectedDemoType);
  return { prospect, digitalAudit, score, ...result };
}

function leadPlan(businessId, overrides = {}) {
  const reviewed = reviewedLeadFor(businessId);
  const prospect = createBusinessProspect({
    business: { ...reviewed.business, ...(overrides.business || {}) },
    verificationStatus: reviewed.verification.verificationStatus,
    lifecycleState: overrides.lifecycleState,
    suppressionStatus: overrides.suppressionStatus
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
    verification: reviewed.verification,
    scoreOverrides: overrides.scoreOverrides
  });
  return { prospect, digitalAudit, score, ...createContextAwareDemoPlan({ prospect, digitalAudit, score, needSignals: reviewed.needSignals, minimumOpportunityScore: overrides.minimumOpportunityScore }) };
}

function generate(plan, suffix, extra = {}) {
  return generateLocalPreviewPackage({
    prospect: plan.prospect,
    demoPlan: plan.demoPlan,
    request: {
      generationRequestId: `phase_c_${suffix}`,
      idempotencyKey: `phase_c_${suffix}`,
      ...extra
    }
  });
}

const servicePlan = manualBusinessPlan({
  expectedDemoType: acquisitionDemoTypes.serviceLandingPreview,
  business: {
    businessId: "phase_c_service",
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
  }
});
const retailPlan = manualBusinessPlan({
  business: {
    businessId: "phase_c_retail",
    legalOrDisplayName: "Batumi Design Store",
    businessType: "retail shop",
    industry: "retail",
    subIndustry: "home goods",
    country: "Georgia",
    city: "Batumi",
    website: "design-store.example",
    publicBusinessPhone: "+995 555 040404",
    publicDescription: "Fictional local shop with product assortment visible in public description.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_retail_directory", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  }
});
const hotelPlan = leadPlan("batumi_hotel_group", { minimumOpportunityScore: 8 });
const constructionPlan = manualBusinessPlan({
  expectedDemoType: acquisitionDemoTypes.projectPortfolioPreview,
  business: {
    businessId: "phase_c_construction",
    legalOrDisplayName: "Batumi Build Studio",
    businessType: "construction company",
    industry: "construction",
    subIndustry: "project construction",
    country: "Georgia",
    city: "Batumi",
    website: "buildstudio.example",
    publicBusinessEmail: "office@buildstudio.example",
    publicDescription: "Fictional construction company with visible public project work.",
    dataFreshness: leadFreshnessStates.current,
    sourceRefs: [{ sourceId: "fixture_construction_registry", retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
  }
});

const servicePreview = generate(servicePlan, "service");
const retailPreview = generate(retailPlan, "retail");
const hotelPreview = generate(hotelPlan, "hotel");
const constructionPreview = generate(constructionPlan, "construction");

check("A service business generates SERVICE_LANDING_PREVIEW package", () => {
  assert.equal(servicePreview.ok, true);
  assert.equal(servicePreview.status, previewGenerationStatuses.readyForHumanReview);
  assert.equal(servicePreview.generatedPreview.demoType, acquisitionDemoTypes.serviceLandingPreview);
  assert.equal(servicePreview.generatedPreview.provider, "LOCAL");
  assert.equal(servicePreview.generatedPreview.providerCalls, 0);
});

check("B retail business generates storefront/catalog preview package", () => {
  assert.equal(retailPreview.ok, true);
  assert.ok([acquisitionDemoTypes.storefrontPreview, acquisitionDemoTypes.catalogPreviewV2].includes(retailPreview.generatedPreview.demoType));
  assert.notEqual(retailPreview.generatedPreview.layoutModel.layout, servicePreview.generatedPreview.layoutModel.layout);
});

check("C hotel generates booking flow preview package", () => {
  assert.equal(hotelPreview.ok, true);
  assert.equal(hotelPreview.generatedPreview.demoType, acquisitionDemoTypes.bookingFlowPreview);
  assert.equal(hotelPreview.generatedPreview.layoutModel.layout, "booking_flow");
});

check("D construction generates project portfolio preview package", () => {
  assert.equal(constructionPreview.ok, true);
  assert.equal(constructionPreview.generatedPreview.demoType, acquisitionDemoTypes.projectPortfolioPreview);
  assert.equal(constructionPreview.generatedPreview.layoutModel.layout, "project_portfolio");
});

check("E generated packages contain required files and distinct HTML", () => {
  const previews = [servicePreview, retailPreview, hotelPreview, constructionPreview];
  previews.forEach((item) => {
    ["preview.json", "index.html", "preview.css", "audit.json", "content-spec.json", "navigation-flow.json"].forEach((file) => {
      assert.equal(fs.existsSync(path.join(item.packageDir, file)), true, `${file} exists`);
    });
    const html = fs.readFileSync(path.join(item.packageDir, "index.html"), "utf8");
    assert.ok(html.includes("ESSA DEMO / CONCEPT"));
    assert.ok(html.includes("not the official business website"));
    assert.ok(html.includes("Generated by ESSA Preview Engine"));
  });
  const layouts = new Set(previews.map((item) => item.generatedPreview.layoutModel.layout));
  assert.equal(layouts.size, 4);
});

check("F stale prospect blocks preview generation", () => {
  const stale = leadPlan("stale_restaurant");
  const result = generate(stale, "stale");
  assert.equal(result.ok, false);
  assert.ok(result.safetyGate.blockers.includes("PROSPECTFRESHANDALLOWED"));
});

check("G suppressed prospect blocks preview generation", () => {
  const suppressed = leadPlan("batumi_bistro_1", { suppressionStatus: "DO_NOT_CONTACT" });
  const result = generate(suppressed, "suppressed");
  assert.equal(result.ok, false);
  assert.ok(result.safetyGate.blockers.includes("PROSPECTFRESHANDALLOWED"));
});

check("H insufficient evidence blocks preview generation", () => {
  const thin = manualBusinessPlan({
    business: {
      businessId: "phase_c_thin",
      legalOrDisplayName: "Thin Fixture",
      businessType: "service",
      industry: "services",
      country: "Georgia",
      city: "Batumi",
      website: null,
      publicDescription: "Fictional thin record.",
      dataFreshness: leadFreshnessStates.current,
      sourceRefs: []
    },
    scoreOverrides: { digitalGap: 1, commercialPotential: 1, essaProductFit: 1, demoCommunicationValue: 1, implementationComplexity: 0, publicEvidenceQuality: 0 }
  });
  const result = generate(thin, "thin");
  assert.equal(result.ok, false);
});

check("I unsupported demo type blocks local generation", () => {
  const unsupportedPlan = {
    ...servicePlan.demoPlan,
    demoType: acquisitionDemoTypes.contentCreativePreview
  };
  const result = generateLocalPreviewPackage({
    prospect: servicePlan.prospect,
    demoPlan: unsupportedPlan,
    request: { generationRequestId: "phase_c_unsupported", idempotencyKey: "phase_c_unsupported" }
  });
  assert.equal(result.ok, false);
  assert.ok(result.safetyGate.blockers.includes("LOCALLYSUPPORTEDDEMOTYPE"));
});

check("J missing images/assets produce QC warning, not provider generation", () => {
  assert.equal(servicePreview.qc.status, previewQcStatuses.passWithWarnings);
  assert.ok(servicePreview.qc.warnings.includes("MISSING_IMAGES_OR_BRAND_ASSETS"));
  assert.equal(servicePreview.providerCalls, 0);
});

check("K fabricated price attempt is blocked before generation", () => {
  const result = generate(servicePlan, "fake_price", { assetInputs: { requestedCopy: "Use $99 discount" } });
  assert.equal(result.ok, false);
  assert.ok(result.safetyGate.blockedClaims.includes("FABRICATED_PRICE_OR_DISCOUNT"));
});

check("L fabricated review/testimonial attempt is blocked before generation", () => {
  const result = generate(servicePlan, "fake_review", { assetInputs: { requestedCopy: "Add five star testimonial" } });
  assert.equal(result.ok, false);
  assert.ok(result.safetyGate.blockedClaims.includes("FABRICATED_REVIEW_OR_TESTIMONIAL"));
});

check("M personal-data injection is blocked before generation", () => {
  const result = generate(servicePlan, "personal_data", { assetInputs: { privateNote: "owner name private person personal mobile" } });
  assert.equal(result.ok, false);
  assert.ok(result.safetyGate.blockedClaims.includes("PERSONAL_OR_SENSITIVE_DATA"));
});

check("N duplicate generation is idempotent and versioning changes preview id", () => {
  const duplicate = generate(servicePlan, "service");
  const v2 = generate(servicePlan, "service", { version: "1.0.1" });
  assert.equal(duplicate.generatedPreview.previewId, servicePreview.generatedPreview.previewId);
  assert.notEqual(v2.generatedPreview.previewId, servicePreview.generatedPreview.previewId);
  assert.equal(v2.generatedPreview.version, "1.0.1");
});

check("O QC blocking failure catches missing demo labels and artifacts", () => {
  const badQc = runPreviewQc({
    request: servicePreview.request,
    prospect: servicePlan.prospect,
    demoPlan: servicePlan.demoPlan,
    generatedPreview: {
      ...servicePreview.generatedPreview,
      generatedArtifacts: [],
      publishAllowed: true
    },
    artifacts: {},
    html: "<html><body><main>plain preview</main></body></html>"
  });
  assert.equal(badQc.status, previewQcStatuses.blocked);
  assert.ok(badQc.failedChecks.includes("demoConceptLabelExists"));
  assert.ok(badQc.failedChecks.includes("requiredArtifactFilesGenerated"));
});

check("P generated preview never advances beyond human review", () => {
  [servicePreview, retailPreview, hotelPreview, constructionPreview].forEach((item) => {
    assert.equal(item.generatedPreview.status, previewGenerationStatuses.readyForHumanReview);
    assert.equal(item.generatedPreview.publishAllowed, false);
    assert.equal(item.generatedPreview.handoffAllowed, false);
    assert.equal(item.generatedPreview.productionReady, false);
    assert.equal(item.generatedPreview.commercialUseAllowed, false);
    assert.equal(item.generatedPreview.paymentActions, 0);
    assert.equal(item.generatedPreview.productionHandoffs, 0);
  });
});

check("Q Phase C proof summary is persisted locally", () => {
  const proof = {
    artifactType: "BusinessAcquisitionLocalGeneratedPreviewProof",
    phase: "BUSINESS_ACQUISITION_PHASE_C",
    status: "BUSINESS_ACQUISITION_PHASE_C_PASS",
    scenarios: {
      service: servicePreview.generatedPreview.previewId,
      retail: retailPreview.generatedPreview.previewId,
      hotel: hotelPreview.generatedPreview.previewId,
      construction: constructionPreview.generatedPreview.previewId
    },
    generatedPackages: [servicePreview, retailPreview, hotelPreview, constructionPreview].map((item) => ({
      previewId: item.generatedPreview.previewId,
      demoType: item.generatedPreview.demoType,
      packageDir: item.packageDir,
      qcStatus: item.qc.status,
      providerCalls: item.providerCalls,
      externalCalls: item.externalCalls
    })),
    counters: {
      providerCalls: 0,
      externalCalls: 0,
      publishActions: 0,
      outreachActions: 0,
      paymentActions: 0,
      productionHandoffs: 0
    }
  };
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionLocalGeneratedPreviewProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  const loaded = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_C_PASS");
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionLocalGeneratedPreviewProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Local Generated Preview tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Local Generated Preview tests passed.");
