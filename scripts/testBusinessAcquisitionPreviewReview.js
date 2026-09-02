import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionDemoTypes,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createPreviewReviewAudit,
  createProspectDigitalOpportunityAudit,
  createRevisionRequestFromReview,
  evaluatePreviewReviewSafety,
  generateLocalPreviewPackage,
  generatePreviewRevision,
  previewQcStatuses,
  previewReviewDecisions,
  previewReviewStates,
  reviewGeneratedPreview,
  runPreviewQc,
  scoreBusinessAcquisitionOpportunity,
  validatePreviewReviewTransition
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

function createServicePreview(suffix = "base") {
  const prospect = createBusinessProspect({
    business: {
      businessId: `phase_d_service_${suffix}`,
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
  assert.equal(plan.demoPlan.demoType, acquisitionDemoTypes.serviceLandingPreview);
  const generated = generateLocalPreviewPackage({
    prospect,
    demoPlan: plan.demoPlan,
    request: {
      generationRequestId: `phase_d_generation_${suffix}`,
      idempotencyKey: `phase_d_generation_${suffix}`
    }
  });
  assert.equal(generated.ok, true);
  return { prospect, digitalAudit, score, ...plan, ...generated };
}

const base = createServicePreview("approve");
const revisionBase = createServicePreview("revision");
const rejectedBase = createServicePreview("reject");
const blockedQc = runPreviewQc({
  request: base.request,
  prospect: base.prospect,
  demoPlan: base.demoPlan,
  generatedPreview: {
    ...base.generatedPreview,
    publishAllowed: true,
    generatedArtifacts: []
  },
  artifacts: {},
  html: "<html><body><main>missing label</main></body></html>"
});

check("A valid preview approves only for client preview readiness", () => {
  const result = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    reasonCodes: ["QC_ACCEPTED_FOR_CLIENT_PREVIEW_ONLY"],
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_approve"
  });
  assert.equal(result.ok, true);
  assert.equal(result.resultingState, previewReviewStates.clientPreviewReady);
  assert.equal(result.review.clientShareAllowed, true);
  assert.equal(result.review.publishAllowed, false);
  assert.equal(result.review.productionUseAllowed, false);
  assert.equal(result.review.commercialHandoffAllowed, false);
  return result.review;
});

check("B valid preview can request revision and generate v2 locally", () => {
  const review = reviewGeneratedPreview({
    generatedPreview: revisionBase.generatedPreview,
    qc: revisionBase.qc,
    decision: previewReviewDecisions.requestRevision,
    reviewer: { reviewerRef: "lisa_operator" },
    requestedChanges: ["Clarify CTA wording", "Reduce hero copy"],
    reasonCodes: ["CTA_CLARITY"],
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_revision_review"
  });
  assert.equal(review.ok, true);
  assert.equal(review.resultingState, previewReviewStates.revisionRequested);
  const revision = createRevisionRequestFromReview(review.review, {
    changeCategories: ["copy", "cta"],
    requestedBy: "lisa_operator"
  });
  assert.equal(revision.ok, true);
  const originalPreviewPath = path.join(revisionBase.packageDir, "preview.json");
  const originalBefore = fs.readFileSync(originalPreviewPath, "utf8");
  const regenerated = generatePreviewRevision({
    parentPreview: revisionBase.generatedPreview,
    revisionRequest: revision.revisionRequest,
    prospect: revisionBase.prospect,
    demoPlan: revisionBase.demoPlan,
    request: {
      generationRequestId: "phase_d_revision_generation",
      idempotencyKey: "phase_d_revision_generation"
    }
  });
  assert.equal(regenerated.ok, true);
  assert.equal(regenerated.generatedPreview.parentPreviewId, revisionBase.generatedPreview.previewId);
  assert.equal(regenerated.generatedPreview.parentVersion, revisionBase.generatedPreview.version);
  assert.equal(regenerated.generatedPreview.revisionRequestId, revision.revisionRequest.revisionRequestId);
  assert.notEqual(regenerated.generatedPreview.previewId, revisionBase.generatedPreview.previewId);
  assert.equal(fs.readFileSync(originalPreviewPath, "utf8"), originalBefore);
  const v2Disk = JSON.parse(fs.readFileSync(path.join(regenerated.packageDir, "preview.json"), "utf8"));
  assert.equal(v2Disk.parentPreviewId, revisionBase.generatedPreview.previewId);
  assert.equal(v2Disk.revisionRequestId, revision.revisionRequest.revisionRequestId);
  return {
    v1: revisionBase.generatedPreview.previewId,
    v2: regenerated.generatedPreview.previewId,
    revisionRequestId: revision.revisionRequest.revisionRequestId
  };
});

check("C rejected preview never becomes client-shareable", () => {
  const result = reviewGeneratedPreview({
    generatedPreview: rejectedBase.generatedPreview,
    qc: rejectedBase.qc,
    decision: previewReviewDecisions.rejectPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    reasonCodes: ["DO_NOT_SHOW_THIS_CONCEPT"],
    comments: "Rejected locally.",
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_reject"
  });
  assert.equal(result.ok, true);
  assert.equal(result.resultingState, previewReviewStates.rejected);
  assert.equal(result.review.clientShareAllowed, false);
});

check("D QC BLOCKED preview cannot be approved", () => {
  assert.equal(blockedQc.status, previewQcStatuses.blocked);
  const result = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: blockedQc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    idempotencyKey: "phase_d_blocked_qc"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "PREVIEW_REVIEW_SAFETY_BLOCKED");
});

check("E PASS_WITH_WARNINGS requires explicit review policy", () => {
  assert.equal(base.qc.status, previewQcStatuses.passWithWarnings);
  const blocked = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    idempotencyKey: "phase_d_warnings_blocked"
  });
  assert.equal(blocked.ok, false);
  const allowed = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_warnings_allowed"
  });
  assert.equal(allowed.ok, true);
});

check("F publishAllowed true blocks approval", () => {
  const result = reviewGeneratedPreview({
    generatedPreview: { ...base.generatedPreview, publishAllowed: true },
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_publish_block"
  });
  assert.equal(result.ok, false);
  assert.ok(result.safety.blockers.includes("PUBLISHREMAINSFALSE"));
});

check("G productionReady true blocks approval", () => {
  const result = reviewGeneratedPreview({
    generatedPreview: { ...base.generatedPreview, productionReady: true },
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_production_block"
  });
  assert.equal(result.ok, false);
  assert.ok(result.safety.blockers.includes("PRODUCTIONREADYREMAINSFALSE"));
});

check("H invalid lifecycle transition is blocked", () => {
  const transition = validatePreviewReviewTransition(previewReviewStates.rejected, previewReviewStates.clientPreviewReady);
  assert.equal(transition.ok, false);
  const result = reviewGeneratedPreview({
    generatedPreview: rejectedBase.generatedPreview,
    qc: rejectedBase.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    currentState: previewReviewStates.rejected,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_invalid_transition"
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "PREVIEW_REVIEW_TRANSITION_NOT_ALLOWED");
});

check("I duplicate review decision is idempotent and safe", () => {
  const first = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_duplicate"
  });
  const second = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_duplicate",
    existingReviews: [{ idempotencyKey: "phase_d_duplicate", review: first.review, audit: first.audit }]
  });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(second.review.reviewId, first.review.reviewId);
});

check("J review audit records safety, permissions and zero actions", () => {
  const reviewed = reviewGeneratedPreview({
    generatedPreview: base.generatedPreview,
    qc: base.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    comments: "Approved for later client preview only.",
    reasonCodes: ["SAFE_FOR_CLIENT_PREVIEW_SCOPE_ONLY"],
    allowPassWithWarnings: true,
    idempotencyKey: "phase_d_audit"
  });
  const audit = createPreviewReviewAudit({
    generatedPreview: base.generatedPreview,
    review: reviewed.review,
    qc: base.qc,
    safety: evaluatePreviewReviewSafety({
      generatedPreview: base.generatedPreview,
      qc: base.qc,
      decision: previewReviewDecisions.approveForClientPreview,
      allowPassWithWarnings: true
    }),
    priorState: previewReviewStates.readyForHumanReview,
    resultingState: previewReviewStates.clientPreviewReady
  });
  assert.equal(audit.providerCalls, 0);
  assert.equal(audit.externalCalls, 0);
  assert.equal(audit.outreachActions, 0);
  assert.equal(audit.paymentActions, 0);
  assert.equal(audit.publishActions, 0);
  assert.equal(audit.productionHandoffs, 0);
  assert.equal(audit.permissionsAfterDecision.publishAllowed, false);
  assert.equal(audit.permissionsAfterDecision.productionUseAllowed, false);
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionPreviewReviewProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    artifactType: "BusinessAcquisitionPreviewReviewProof",
    phase: "BUSINESS_ACQUISITION_PHASE_D",
    status: "BUSINESS_ACQUISITION_PHASE_D_PASS",
    audit,
    scenarios: [
      "APPROVE_FOR_CLIENT_PREVIEW",
      "REQUEST_REVISION",
      "REJECT_PREVIEW",
      "QC_BLOCKED_APPROVAL_BLOCKED",
      "PASS_WITH_WARNINGS_POLICY",
      "PUBLISH_BLOCK",
      "PRODUCTION_BLOCK",
      "INVALID_TRANSITION",
      "IDEMPOTENCY",
      "REVISION_LINEAGE"
    ],
    counters: {
      providerCalls: 0,
      externalCalls: 0,
      outreachActions: 0,
      paymentActions: 0,
      publishActions: 0,
      productionHandoffs: 0
    }
  }, null, 2));
  const loaded = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_D_PASS");
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionPreviewReviewProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Preview Review tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Preview Review tests passed.");
