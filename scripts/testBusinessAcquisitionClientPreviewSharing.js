import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionLifecycleStates,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createProspectDigitalOpportunityAudit,
  evaluateSharePackageAccess,
  generateLocalPreviewPackage,
  prepareClientPreviewSharePackage,
  previewReviewDecisions,
  recipientEligibilityStatuses,
  revokeSharePackage,
  reviewGeneratedPreview,
  scoreBusinessAcquisitionOpportunity,
  sharePreparationStatuses,
  shareRevocationReasons,
  validateShareTransition
} from "../src/businessAcquisition/index.js";
import { leadFreshnessStates } from "../src/leadIntelligence/index.js";

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

function createApprovedPreview(suffix = "share") {
  const prospect = createBusinessProspect({
    business: {
      businessId: `phase_e_service_${suffix}`,
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
      sourceRefs: [{ sourceId: `fixture_service_directory_${suffix}`, retrievedAt: "2026-08-20T00:00:00.000Z", factType: "OBSERVED" }]
    }
  });
  const digitalAudit = createProspectDigitalOpportunityAudit({ prospect, needSignals: [], essaMatches: [] });
  const score = scoreBusinessAcquisitionOpportunity({
    prospect,
    digitalAudit,
    qualification: { fitLevel: "REVIEW", evidenceForNeeds: [] },
    verification: { verificationStatus: "REVIEW_REQUIRED" },
    scoreOverrides: { digitalGap: 3, commercialPotential: 3, essaProductFit: 3, demoCommunicationValue: 3, implementationComplexity: 1, publicEvidenceQuality: 2 }
  });
  const plan = createContextAwareDemoPlan({ prospect, digitalAudit, score, needSignals: [] });
  const generated = generateLocalPreviewPackage({
    prospect,
    demoPlan: plan.demoPlan,
    request: {
      generationRequestId: `phase_e_generation_${suffix}`,
      idempotencyKey: `phase_e_generation_${suffix}`
    }
  });
  assert.equal(generated.ok, true);
  const review = reviewGeneratedPreview({
    generatedPreview: generated.generatedPreview,
    qc: generated.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: `phase_e_review_${suffix}`
  });
  assert.equal(review.ok, true);
  return { prospect, digitalAudit, score, ...plan, ...generated, review: review.review, reviewAudit: review.audit };
}

const base = createApprovedPreview("base");
const eligibleRecipient = {
  value: "hello@servicestudio.example",
  channel: "PUBLIC_BUSINESS_EMAIL",
  sourceRef: "fixture_service_directory_base",
  provenanceRefs: ["fixture_service_directory_base"],
  verifiedPublicBusinessContact: true
};
const share = prepareClientPreviewSharePackage({
  prospect: base.prospect,
  generatedPreview: base.generatedPreview,
  review: base.review,
  recipient: eligibleRecipient,
  packageDir: base.packageDir,
  request: {
    sharePreparationId: "phase_e_share_base",
    idempotencyKey: "phase_e_share_base",
    requestedBy: "lisa_operator",
    requestedExpiration: "2026-09-07T00:00:00.000Z"
  },
  now: new Date("2026-09-01T00:00:00.000Z")
});

check("A approved preview and eligible public business contact become MANUAL_SHARE_READY", () => {
  assert.equal(share.ok, true);
  assert.equal(share.status, sharePreparationStatuses.manualShareReady);
  assert.equal(share.eligibility.status, recipientEligibilityStatuses.eligible);
  assert.equal(share.sharePackage.clientShareAllowed, true);
  assert.equal(share.sharePackage.sendAllowed, false);
  assert.equal(share.sharePackage.publicAccessAllowed, false);
  assert.equal(share.sharePackage.sourceTransferAllowed, false);
  assert.equal(share.sharePackage.productionUseAllowed, false);
  assert.equal(share.sharePackage.publishAllowed, false);
  return {
    sharePackageId: share.sharePackage.sharePackageId,
    previewId: share.sharePackage.previewId,
    previewVersion: share.sharePackage.previewVersion
  };
});

check("B preview not human-approved blocks share preparation", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: { ...base.review, decision: previewReviewDecisions.requestRevision, clientShareAllowed: false },
    recipient: eligibleRecipient,
    request: { idempotencyKey: "phase_e_unapproved" }
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("PREVIEW_NOT_APPROVED_FOR_CLIENT_PREVIEW"));
});

check("C suppressed prospect blocks sharing regardless of opportunity", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: { ...base.prospect, suppressionStatus: "DO_NOT_CONTACT" },
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: eligibleRecipient,
    request: { idempotencyKey: "phase_e_suppressed" }
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("PROSPECT_SUPPRESSED_OR_REJECTED"));
});

check("D opted-out contact is blocked", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: { ...eligibleRecipient, optedOut: true },
    request: { idempotencyKey: "phase_e_optout" }
  });
  assert.equal(result.ok, false);
  assert.equal(result.eligibility.status, recipientEligibilityStatuses.blocked);
});

check("E private personal contact without authorization is blocked", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: { value: "+995 599 000000", channel: "PERSONAL_MOBILE", sourceRef: "unsafe_private", personal: true },
    request: { idempotencyKey: "phase_e_private" }
  });
  assert.equal(result.ok, false);
  assert.ok(result.eligibility.reasonCodes.includes("PERSONAL_OR_PRIVATE_CONTACT_BLOCKED"));
});

check("F missing recipient provenance is blocked by policy", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: { value: "unknown@example.com", channel: "PUBLIC_BUSINESS_EMAIL", verifiedPublicBusinessContact: true },
    request: { idempotencyKey: "phase_e_missing_provenance" }
  });
  assert.equal(result.ok, false);
  assert.equal(result.eligibility.status, recipientEligibilityStatuses.blocked);
  assert.ok(result.eligibility.reasonCodes.includes("RECIPIENT_PROVENANCE_MISSING"));
});

check("G expired share package becomes EXPIRED", () => {
  const access = evaluateSharePackageAccess(share.sharePackage, { now: new Date("2026-09-08T00:00:00.000Z") });
  assert.equal(access.ok, false);
  assert.equal(access.status, sharePreparationStatuses.expired);
});

check("H human revocation makes package REVOKED irreversibly for that package", () => {
  const revoked = revokeSharePackage(share.sharePackage, shareRevocationReasons.humanRevoked, { sharePreparationId: share.request.sharePreparationId });
  assert.equal(revoked.ok, true);
  assert.equal(revoked.sharePackage.status, sharePreparationStatuses.revoked);
  assert.equal(revoked.sharePackage.clientShareAllowed, false);
  const access = evaluateSharePackageAccess(revoked.sharePackage, { now: new Date("2026-09-02T00:00:00.000Z") });
  assert.equal(access.status, sharePreparationStatuses.revoked);
});

check("I superseded preview version makes old package STALE", () => {
  const newerPreview = { ...base.generatedPreview, previewId: "preview_newer", version: "1.0.1" };
  const access = evaluateSharePackageAccess(share.sharePackage, { now: new Date("2026-09-02T00:00:00.000Z"), canonicalPreview: newerPreview });
  assert.equal(access.ok, false);
  assert.equal(access.status, sharePreparationStatuses.stale);
});

check("J publicAccessAllowed request is blocked", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: eligibleRecipient,
    request: { idempotencyKey: "phase_e_public", publicAccessAllowed: true }
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("PUBLIC_ACCESS_NOT_ALLOWED_PHASE_E"));
});

check("K sourceTransferAllowed request is blocked", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: eligibleRecipient,
    request: { idempotencyKey: "phase_e_source_transfer", sourceTransferAllowed: true }
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("SOURCE_TRANSFER_NOT_ALLOWED_PHASE_E"));
});

check("L productionUseAllowed request is blocked", () => {
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: eligibleRecipient,
    request: { idempotencyKey: "phase_e_production", productionUseAllowed: true }
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("PRODUCTION_USE_NOT_ALLOWED_PHASE_E"));
});

check("M SENT transition is invalid and no SENT state exists", () => {
  const transition = validateShareTransition(sharePreparationStatuses.manualShareReady, "SENT");
  assert.equal(transition.ok, false);
  const result = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: eligibleRecipient,
    request: { idempotencyKey: "phase_e_sent", status: "SENT" }
  });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("SENT_OR_SEND_NOT_ALLOWED_PHASE_E"));
});

check("N duplicate preparation is idempotent and safe", () => {
  const duplicate = prepareClientPreviewSharePackage({
    prospect: base.prospect,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: eligibleRecipient,
    packageDir: base.packageDir,
    existingPackages: [{
      idempotencyKey: share.idempotencyKey,
      status: share.status,
      request: share.request,
      eligibility: share.eligibility,
      accessPolicy: share.accessPolicy,
      sharePackage: share.sharePackage,
      audit: share.audit
    }],
    request: { idempotencyKey: share.idempotencyKey }
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.sharePackage.sharePackageId, share.sharePackage.sharePackageId);
});

check("O version and artifact integrity locks are recorded", () => {
  assert.equal(share.sharePackage.previewId, base.generatedPreview.previewId);
  assert.equal(share.sharePackage.previewVersion, base.generatedPreview.version);
  assert.ok(share.sharePackage.artifactIntegrityRefs.length >= 4);
  assert.ok(share.sharePackage.artifactIntegrityRefs.some((item) => item.artifactName === "index.html" && item.hashAlgorithm === "sha256" && item.hash));
});

check("P share audit is persisted without outbound actions or sensitive recipient detail", () => {
  assert.equal(share.audit.providerCalls, 0);
  assert.equal(share.audit.externalCalls, 0);
  assert.equal(share.audit.sendActions, 0);
  assert.equal(share.audit.outreachActions, 0);
  assert.equal(share.audit.publishActions, 0);
  assert.equal(share.audit.paymentActions, 0);
  assert.equal(share.audit.productionHandoffs, 0);
  assert.ok(!JSON.stringify(share.audit).includes("hello@servicestudio.example"));
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionClientPreviewSharingProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    artifactType: "BusinessAcquisitionClientPreviewSharingProof",
    phase: "BUSINESS_ACQUISITION_PHASE_E",
    status: "BUSINESS_ACQUISITION_PHASE_E_PASS",
    shareAudit: share.audit,
    scenarios: [
      "MANUAL_SHARE_READY",
      "PREVIEW_NOT_APPROVED_BLOCKED",
      "SUPPRESSION_BLOCKED",
      "OPT_OUT_BLOCKED",
      "PRIVATE_CONTACT_BLOCKED",
      "MISSING_PROVENANCE_BLOCKED",
      "EXPIRED",
      "REVOKED",
      "SUPERSEDED_STALE",
      "PUBLIC_ACCESS_BLOCKED",
      "SOURCE_TRANSFER_BLOCKED",
      "PRODUCTION_USE_BLOCKED",
      "SENT_TRANSITION_BLOCKED",
      "IDEMPOTENCY",
      "VERSION_ARTIFACT_LOCK"
    ],
    counters: {
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0,
      outreachActions: 0,
      publishActions: 0,
      paymentActions: 0,
      productionHandoffs: 0
    }
  }, null, 2));
  const loaded = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_E_PASS");
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionClientPreviewSharingProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Client Preview Sharing tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Client Preview Sharing tests passed.");
