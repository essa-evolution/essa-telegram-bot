import {
  blockLiveLeadDiscoveryAttempt,
  businessNeedSignalTypes,
  businessVerificationStatuses,
  createLeadExportPreview,
  createRestaurantDiscoveryRequest,
  createLeadSourceReplacementProbe,
  dedupeStatuses,
  discoverBusinessesFromFixture,
  evaluateOutreachAttempt,
  fixtureBusinessEntities,
  leadFreshnessStates,
  normalizeBusinessEntity,
  validateBusinessEntityDataPolicy,
  verifyBusinessEntity
} from "../src/leadIntelligence/index.js";
import {
  buildExecutionPreview,
  getCapability,
  getProductCapabilities,
  productIds,
  productKnowledgeNodes
} from "../src/capabilities/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const request = createRestaurantDiscoveryRequest({
  requestId: "lead_test_request_21j_li",
  traceId: "lead_test_trace_21j_li"
});
const run = discoverBusinessesFromFixture(request, fixtureBusinessEntities);
const harbor = run.reviewed.find((item) => item.business.businessId === "batumi_bistro_1");
const roasters = normalizeBusinessEntity(fixtureBusinessEntities.find((item) => item.businessId === "tbilisi_roasters")).entity;
const stale = run.reviewed.find((item) => item.business.businessId === "stale_restaurant");

check(
  request.targetMarket === "restaurants" &&
    request.geography === "Batumi / Tbilisi" &&
    request.dataPolicy.prohibitedDataClasses.includes("PERSONAL_DATA"),
  "A LeadDiscoveryRequest captures market, geography and data policy",
  request
);

check(
  run.reviewed.length > 0 &&
    run.reviewed.every((item) => ["Batumi", "Tbilisi"].includes(item.business.city)),
  "B fixture discovery stays bounded to requested geography",
  run.reviewed.map((item) => ({ id: item.business.businessId, city: item.business.city }))
);

check(
  roasters.website === "tbilisiroasters.example" &&
    roasters.publicBusinessEmail === "info@tbilisiroasters.example" &&
    harbor.business.publicBusinessPhone === "+995555010101",
  "C normalization lowercases URL/email and normalizes business phone",
  { roasters, harbor: harbor.business }
);

check(
  run.dedupeResult.decisions.some((item) =>
    item.businessId === "batumi_bistro_duplicate" &&
      item.status === dedupeStatuses.possibleDuplicate &&
      item.duplicateOf === "batumi_bistro_1"
  ),
  "D deduplication flags repeated public business listing",
  run.dedupeResult
);

check(
  harbor.verification.verificationStatus === businessVerificationStatuses.verified &&
    harbor.verification.sourceCount === 1,
  "E verification confirms sufficient public business evidence",
  harbor.verification
);

const insufficient = normalizeBusinessEntity(fixtureBusinessEntities.find((item) => item.businessId === "kutaisi_catering")).entity;
const insufficientVerification = verifyBusinessEntity(insufficient);
check(
  insufficientVerification.verificationStatus === businessVerificationStatuses.insufficientEvidence &&
    run.audit.entitiesVerified >= 1,
  "F fixture contains insufficient-evidence path outside request scope and audit counts verified leads",
  { insufficientVerification, entitiesVerified: run.audit.entitiesVerified }
);

check(
  harbor.needSignals.some((signal) => signal.signalType === businessNeedSignalTypes.noWebsiteFound),
  "G no-website signal is observed and source-labeled",
  harbor.needSignals
);

check(
  harbor.essaMatches.some((match) => match.productId === productIds.advertising && match.capabilityId === "CAMPAIGN_PLAN"),
  "H ESSA Advertising fit is produced from verified need signals",
  harbor.essaMatches
);

check(
  harbor.essaMatches.some((match) => match.productId === productIds.production && match.capabilityId === "VIDEO_EDIT"),
  "I ESSA Production fit is produced for content opportunity",
  harbor.essaMatches
);

check(
  harbor.essaMatches.some((match) => match.productId === productIds.business && match.capabilityId === "BUSINESS_ANALYZE"),
  "J ESSA Business fit is produced for analysis opportunity",
  harbor.essaMatches
);

check(
  harbor.brandOpportunityCandidate?.productId === productIds.creatorNetwork &&
    harbor.brandOpportunityCandidate.dispatchEnabled === false,
  "K Creator Network BrandOpportunityCandidate is non-dispatching",
  harbor.brandOpportunityCandidate
);

check(
  validateBusinessEntityDataPolicy(harbor.business).ok === true &&
    harbor.business.publicBusinessEmail.includes("@"),
  "L public business contact fields are allowed",
  harbor.business
);

const personalPolicy = validateBusinessEntityDataPolicy(fixtureBusinessEntities.find((item) => item.businessId === "personal_data_bad_fixture"));
check(
  personalPolicy.ok === false && personalPolicy.personalDataExcludedCount >= 1,
  "M personal-data fixture is rejected",
  personalPolicy
);

const sensitivePolicy = validateBusinessEntityDataPolicy(fixtureBusinessEntities.find((item) => item.businessId === "sensitive_data_bad_fixture"));
check(
  sensitivePolicy.ok === false && sensitivePolicy.sensitiveDataExcludedCount >= 1,
  "N sensitive-data fixture is rejected",
  sensitivePolicy
);

check(
  harbor.needSignals.every((signal) => signal.observedEvidence && signal.allowedInterpretation && signal.prohibitedInterpretation),
  "O observed facts and inferred interpretations stay separate",
  harbor.needSignals
);

check(
  stale.business.dataFreshness === leadFreshnessStates.stale &&
    stale.verification.verificationStatus === businessVerificationStatuses.staleReviewRequired,
  "P stale-content path requires refresh/review",
  { business: stale.business, verification: stale.verification }
);

check(
  evaluateOutreachAttempt({ lead: harbor }).status === "OUTREACH_DISABLED_PHASE_21J_LI",
  "Q individual outreach attempt is disabled",
  evaluateOutreachAttempt({ lead: harbor })
);

check(
  evaluateOutreachAttempt({ massSend: true, leads: run.reviewed }).status === "NO_MASS_UNREVIEWED_OUTREACH",
  "R mass outreach is blocked by anti-spam policy",
  evaluateOutreachAttempt({ massSend: true, leads: run.reviewed })
);

const replacement = createLeadSourceReplacementProbe("BUSINESS_DISCOVERY");
check(
  replacement.capabilityId === "BUSINESS_DISCOVERY" &&
    replacement.beforeProvider !== replacement.afterProvider &&
    replacement.providerCalls === 0,
  "S source/provider replacement preserves capability identity",
  replacement
);

check(
  run.dryRoute.providerCalls === 0 &&
    run.externalCalls === 0 &&
    run.providerCalls === 0,
  "T local-first intelligence route is dry and non-executing",
  run.dryRoute
);

check(
  harbor.context.privacyClass === "PUBLIC_BUSINESS_DATA" &&
    !JSON.stringify(harbor.context.selectedFields).includes("ownerName") &&
    !JSON.stringify(harbor.context.selectedFields).includes("rawDataset") &&
    harbor.context.excludedFields.includes("rawDataset"),
  "U bounded lead context excludes raw dataset and personal fields",
  harbor.context
);

check(
  run.audit.artifactType === "LeadIntelligenceAuditArtifact" &&
    run.audit.externalCalls === 0 &&
    run.audit.outreachPerformed === false,
  "V audit artifact records lineage and zero external effects",
  run.audit
);

check(
  blockLiveLeadDiscoveryAttempt().providerCalls === 0 &&
    createLeadExportPreview(run.reviewed.map((item) => item.business)).crmMutationPerformed === false,
  "W live discovery/export remain no-call and no-CRM-mutation",
  { liveBlock: blockLiveLeadDiscoveryAttempt(), exportPreview: createLeadExportPreview(run.reviewed.map((item) => item.business)) }
);

const discoveryCapability = getCapability("BUSINESS_DISCOVERY");
const preview = buildExecutionPreview({
  primaryCapabilityId: "BUSINESS_DISCOVERY",
  productId: productIds.business,
  userNeed: "Find restaurants in Batumi for ESSA"
});
check(
  discoveryCapability?.capabilityId === "BUSINESS_DISCOVERY" &&
    getProductCapabilities(productIds.business).includes("BUSINESS_DISCOVERY") &&
    productKnowledgeNodes.some((node) => node.capabilityId === "BUSINESS_DISCOVERY") &&
    preview.expectedArtifacts.includes("LeadIntelligenceAuditArtifact") &&
    preview.providerCalls === 0,
  "X Capability Fabric, Product Knowledge and Execution Preview are connected",
  {
    discoveryCapability,
    productCapabilities: getProductCapabilities(productIds.business),
    preview: {
      expectedArtifacts: preview.expectedArtifacts,
      executionStatus: preview.executionStatus,
      providerCalls: preview.providerCalls
    }
  }
);

if (failures > 0) {
  console.error(`Lead Intelligence tests failed: ${failures}`);
  process.exit(1);
}

console.log("Lead Intelligence tests passed.");
