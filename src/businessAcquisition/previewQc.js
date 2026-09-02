import { leadFreshnessStates } from "../leadIntelligence/leadContracts.js";
import {
  acquisitionLifecycleStates,
  previewQcStatuses
} from "./businessAcquisitionContracts.js";
import { getDemoTypeDefinition } from "./demoTypeRegistry.js";

const blockedLifecycleStates = new Set([
  acquisitionLifecycleStates.rejectedNotFit,
  acquisitionLifecycleStates.rejectedInsufficientEvidence,
  acquisitionLifecycleStates.rejectedPolicy,
  acquisitionLifecycleStates.suppressedDoNotContact,
  acquisitionLifecycleStates.duplicate,
  acquisitionLifecycleStates.declined,
  acquisitionLifecycleStates.abandoned,
  acquisitionLifecycleStates.staleReviewRequired
]);

const unsupportedClaimPatterns = [
  { code: "FABRICATED_PRICE_OR_DISCOUNT", pattern: /\$\s?\d+|\b\d+\s?(usd|gel|eur)\b|discount|sale price|special offer/i },
  { code: "FABRICATED_REVIEW_OR_TESTIMONIAL", pattern: /testimonial|customer review|guest review|client review|rating|five star|5-star|award-winning/i },
  { code: "FABRICATED_AVAILABILITY", pattern: /available today|rooms available|book now guaranteed|in stock/i },
  { code: "PRODUCTION_OR_OFFICIAL_CLAIM", pattern: /official website|production ready|client-owned|published site/i },
  { code: "PERSONAL_OR_SENSITIVE_DATA", pattern: /owner name|personal mobile|private person|health status|patient|ssn|passport/i },
  { code: "SECRET_LIKE_STRING", pattern: /sk-[a-z0-9]{20,}|ghp_[a-z0-9_]+|authorization:|bearer\s+[a-z0-9._-]+/i }
];

export const locallySupportedPreviewDemoTypes = new Set([
  "SERVICE_LANDING_PREVIEW",
  "CATALOG_PREVIEW",
  "STOREFRONT_PREVIEW",
  "BOOKING_FLOW_PREVIEW",
  "PROJECT_PORTFOLIO_PREVIEW",
  "MENU_ORDER_PREVIEW",
  "LEAD_CAPTURE_PREVIEW"
]);

function stringify(value) {
  return JSON.stringify(value || "");
}

function detectUnsupportedClaims(...values) {
  const text = values.map(stringify).join(" ");
  return unsupportedClaimPatterns
    .filter((item) => item.pattern.test(text))
    .map((item) => item.code);
}

export function evaluatePreviewGenerationSafetyGate({
  request = {},
  prospect = {},
  demoPlan = {}
} = {}) {
  const blockedClaims = detectUnsupportedClaims(request.assetInputs, request.brandInputs, demoPlan.contentInputs);
  const blockers = [];
  const warnings = [];
  const definition = getDemoTypeDefinition(demoPlan.demoType);
  const checks = {
    localOnlyExecutionMode: request.executionMode === "LOCAL_ONLY",
    demoPlanValid: Boolean(demoPlan.demoPlanId && demoPlan.prospectId && demoPlan.demoType),
    prospectLinkageValid: Boolean(prospect.prospectId && demoPlan.prospectId === prospect.prospectId && request.prospectId === prospect.prospectId),
    demoPlanLinkageValid: Boolean(request.demoPlanId && request.demoPlanId === demoPlan.demoPlanId),
    evidenceRefsValid: (demoPlan.evidenceRefs || []).length > 0 && (request.evidenceRefs || []).length > 0,
    sourceSnapshotExists: (demoPlan.sourceSnapshotRefs || []).length > 0 && (request.sourceSnapshotRefs || []).length > 0,
    prospectFreshAndAllowed: prospect.dataFreshness !== leadFreshnessStates.stale &&
      !blockedLifecycleStates.has(prospect.lifecycleState) &&
      !prospect.suppressionStatus,
    locallySupportedDemoType: locallySupportedPreviewDemoTypes.has(demoPlan.demoType) && Boolean(definition),
    publicDataOnly: prospect.publicDataOnly === true,
    costPolicyKnown: Boolean(request.costCeiling),
    approvalStateCompatible: request.approvalState === "LOCAL_PREVIEW_APPROVED",
    noPublishPermission: demoPlan.publishAllowed === false && request.publishAllowed !== true,
    noProductionReady: demoPlan.productionReady !== true && request.productionReady !== true,
    noCommercialHandoff: demoPlan.handoffAllowed === false && request.handoffAllowed !== true,
    unsupportedClaimsAbsent: blockedClaims.length === 0
  };

  Object.entries(checks).forEach(([key, ok]) => {
    if (!ok) blockers.push(key.toUpperCase());
  });
  if ((demoPlan.missingInputs || []).some((item) => /image|asset|brand/i.test(String(item)))) {
    warnings.push("MISSING_CLIENT_ASSETS_REPLACED_WITH_DEMO_PLACEHOLDERS");
  }

  return {
    modelType: "PreviewGenerationSafetyGate",
    status: blockers.length ? "PREVIEW_GENERATION_BLOCKED" : "LOCAL_PREVIEW_GENERATION_ALLOWED",
    generationAllowed: blockers.length === 0,
    checks,
    blockers,
    warnings,
    blockedClaims,
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    outreachActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}

export function runPreviewQc({
  request = {},
  prospect = {},
  demoPlan = {},
  generatedPreview = {},
  artifacts = {},
  html = ""
} = {}) {
  const blockedClaims = detectUnsupportedClaims(generatedPreview, html);
  const checks = {
    demoPlanLinkageValid: generatedPreview.demoPlanId === demoPlan.demoPlanId,
    prospectLinkageValid: generatedPreview.prospectId === prospect.prospectId,
    evidenceRefsValid: (generatedPreview.evidenceRefs || []).every((ref) => (demoPlan.evidenceRefs || []).includes(ref)),
    sourceSnapshotExists: (generatedPreview.sourceSnapshotRefs || []).length > 0,
    noUnsupportedFactualClaims: blockedClaims.length === 0,
    assumptionsClearlyMarked: html.includes("Assumptions"),
    noPersonalSensitiveData: !blockedClaims.includes("PERSONAL_OR_SENSITIVE_DATA"),
    demoConceptLabelExists: html.includes("ESSA DEMO / CONCEPT"),
    notOfficialNoticeExists: html.includes("not the official business website"),
    noProductionClaims: generatedPreview.productionReady === false && !/production ready|client-owned|published site/i.test(html),
    noPublishPermissions: generatedPreview.publishAllowed === false,
    noCommercialHandoffPermissions: generatedPreview.handoffAllowed === false && generatedPreview.commercialUseAllowed === false,
    noProviderCalls: generatedPreview.providerCalls === 0,
    noExternalCalls: generatedPreview.externalCalls === 0,
    noOutreachActions: generatedPreview.outreachActions === 0,
    noPaymentActions: generatedPreview.paymentActions === 0,
    noProductionMutations: generatedPreview.productionHandoffs === 0,
    noSecretLikeStrings: !blockedClaims.includes("SECRET_LIKE_STRING"),
    requiredArtifactFilesGenerated: ["preview.json", "index.html", "preview.css", "audit.json"].every((name) => artifacts[name]),
    htmlStructurallyValidEnough: /<!doctype html>/i.test(html) && /<html/i.test(html) && /<\/html>/i.test(html) && /<main/i.test(html)
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  const warnings = [
    ...((generatedPreview.placeholdersUsed || []).length ? ["BOUNDED_PLACEHOLDERS_USED"] : []),
    ...((request.assetInputs?.imagesMissing || generatedPreview.missingInputs?.includes("client_approved_brand_assets")) ? ["MISSING_IMAGES_OR_BRAND_ASSETS"] : [])
  ];
  return {
    modelType: "PreviewQC",
    status: failed.length ? previewQcStatuses.blocked : warnings.length ? previewQcStatuses.passWithWarnings : previewQcStatuses.pass,
    checks,
    failedChecks: failed,
    warnings,
    blockedClaims,
    providerCalls: 0,
    externalCalls: 0,
    publishActions: 0,
    outreachActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}
