import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionLifecycleStates,
  approveHumanSend,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createControlledDeliveryIntent,
  createDeliveryApprovalAudit,
  createDeterministicMessagePreview,
  createProspectDigitalOpportunityAudit,
  deliveryChannels,
  deliveryChannelPlanningStatuses,
  deliveryIntentStatuses,
  deliveryPreflightStatuses,
  finalPreExecutionValidation,
  finalPreExecutionValidationStatuses,
  generateLocalPreviewPackage,
  getDeliveryChannelPolicy,
  humanSendApprovalStatuses,
  prepareClientPreviewSharePackage,
  previewReviewDecisions,
  recipientEligibilityStatuses,
  revokeHumanSendApproval,
  revokeSharePackage,
  reviewGeneratedPreview,
  runDeliveryPreflight,
  scoreBusinessAcquisitionOpportunity,
  shareRevocationReasons,
  validateDeliveryStateTransition
} from "../src/businessAcquisition/index.js";
import { leadFreshnessStates } from "../src/leadIntelligence/index.js";

let failures = 0;
const scenarioResults = [];

function check(label, fn) {
  try {
    const details = fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
    scenarioResults.push({ label, status: "PASS", details });
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
    scenarioResults.push({ label, status: "FAIL", message: error.message });
  }
}

function createApprovedShare(suffix = "delivery") {
  const prospect = createBusinessProspect({
    business: {
      businessId: `phase_f_service_${suffix}`,
      legalOrDisplayName: "Batumi Service Studio",
      businessType: "service studio",
      industry: "services",
      subIndustry: "consulting",
      country: "Georgia",
      city: "Batumi",
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
      generationRequestId: `phase_f_generation_${suffix}`,
      idempotencyKey: `phase_f_generation_${suffix}`
    }
  });
  assert.equal(generated.ok, true);
  const review = reviewGeneratedPreview({
    generatedPreview: generated.generatedPreview,
    qc: generated.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: `phase_f_review_${suffix}`
  });
  assert.equal(review.ok, true);
  const recipient = {
    value: "hello@servicestudio.example",
    channel: "PUBLIC_BUSINESS_EMAIL",
    sourceRef: `fixture_service_directory_${suffix}`,
    provenanceRefs: [`fixture_service_directory_${suffix}`],
    verifiedPublicBusinessContact: true
  };
  const share = prepareClientPreviewSharePackage({
    prospect,
    generatedPreview: generated.generatedPreview,
    review: review.review,
    recipient,
    packageDir: generated.packageDir,
    request: {
      sharePreparationId: `phase_f_share_${suffix}`,
      idempotencyKey: `phase_f_share_${suffix}`,
      requestedBy: "lisa_operator",
      requestedExpiration: "2026-09-07T00:00:00.000Z"
    },
    now: new Date("2026-09-01T00:00:00.000Z")
  });
  assert.equal(share.ok, true);
  return { prospect, digitalAudit, generatedPreview: generated.generatedPreview, packageDir: generated.packageDir, review: review.review, recipient, share };
}

function createApprovedDelivery(suffix = "valid") {
  const base = createApprovedShare(suffix);
  const intentResult = createControlledDeliveryIntent({
    prospect: base.prospect,
    sharePackage: base.share.sharePackage,
    recipient: base.recipient,
    recipientEligibility: base.share.eligibility,
    digitalAudit: base.digitalAudit,
    channel: deliveryChannels.email,
    request: { requestedBy: "lisa_operator" }
  });
  const preflight = runDeliveryPreflight({
    prospect: base.prospect,
    sharePackage: base.share.sharePackage,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: base.recipient,
    recipientEligibility: base.share.eligibility,
    accessPolicy: base.share.accessPolicy,
    deliveryIntent: intentResult.intent,
    messagePreview: intentResult.messagePreview,
    now: new Date("2026-09-01T00:00:00.000Z")
  });
  const approvalResult = approveHumanSend({
    deliveryIntent: intentResult.intent,
    preflight,
    approvedBy: "lisa_operator",
    approvedAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2026-09-10T00:00:00.000Z"
  });
  const finalValidation = finalPreExecutionValidation({
    prospect: base.prospect,
    sharePackage: base.share.sharePackage,
    generatedPreview: base.generatedPreview,
    review: base.review,
    recipient: base.recipient,
    recipientEligibility: base.share.eligibility,
    accessPolicy: base.share.accessPolicy,
    deliveryIntent: intentResult.intent,
    messagePreview: intentResult.messagePreview,
    approval: approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  return {
    ...base,
    sharePackage: base.share.sharePackage,
    accessPolicy: base.share.accessPolicy,
    recipientEligibility: base.share.eligibility,
    deliveryIntent: intentResult.intent,
    messagePreview: intentResult.messagePreview,
    approval: approvalResult.approval,
    intentResult,
    preflight,
    approvalResult,
    finalValidation
  };
}

const valid = createApprovedDelivery("valid");

check("A exact safe EMAIL action reaches APPROVED_FOR_FUTURE_DELIVERY", () => {
  assert.equal(valid.intentResult.intent.executionEnabled, false);
  assert.equal(valid.intentResult.intent.providerExecutionAllowed, false);
  assert.equal(valid.preflight.status, deliveryPreflightStatuses.pass);
  assert.equal(valid.approvalResult.ok, true);
  assert.equal(valid.approvalResult.approval.executionAuthorityNow, false);
  assert.equal(valid.finalValidation.status, finalPreExecutionValidationStatuses.approvedForFutureDelivery);
  assert.equal(valid.finalValidation.executionIntentCreationAllowed, true);
  return {
    deliveryIntentId: valid.intentResult.intent.deliveryIntentId,
    sendApprovalId: valid.approvalResult.approval.sendApprovalId,
    actionFingerprint: valid.approvalResult.approval.actionFingerprint
  };
});

check("B missing human approval cannot reach approved state", () => {
  const result = finalPreExecutionValidation({ deliveryIntent: valid.intentResult.intent });
  assert.equal(result.status, finalPreExecutionValidationStatuses.requiresReapproval);
  assert.ok(result.reasonCodes.includes("HUMAN_SEND_APPROVAL_MISSING"));
});

check("C message changes after approval require reapproval", () => {
  const changedMessage = createDeterministicMessagePreview({
    prospect: valid.prospect,
    digitalAudit: valid.digitalAudit,
    sharePackage: valid.share.sharePackage,
    channel: deliveryChannels.email,
    messageOverride: { subject: "Updated demo note", body: valid.intentResult.messagePreview.body }
  });
  const result = finalPreExecutionValidation({
    ...valid,
    deliveryIntent: { ...valid.intentResult.intent, messageFingerprint: changedMessage.messageFingerprint, messageDraftRef: changedMessage.messagePreviewId },
    messagePreview: changedMessage,
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.requiresReapproval);
});

check("D recipient changes after approval require reapproval", () => {
  const result = finalPreExecutionValidation({
    ...valid,
    deliveryIntent: { ...valid.intentResult.intent, recipientRef: "sales@servicestudio.example" },
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.requiresReapproval);
});

check("E channel changes after approval require reapproval", () => {
  const result = finalPreExecutionValidation({
    ...valid,
    deliveryIntent: { ...valid.intentResult.intent, channel: deliveryChannels.telegram },
    messagePreview: { ...valid.intentResult.messagePreview, channel: deliveryChannels.telegram },
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.requiresReapproval);
});

check("F preview/version changes invalidate old approval", () => {
  const result = finalPreExecutionValidation({
    ...valid,
    generatedPreview: { ...valid.generatedPreview, version: "1.0.1" },
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.blocked);
  assert.ok(result.reasonCodes.includes("SHARE_PACKAGE_STALE"));
});

check("G artifact integrity changes are blocked", () => {
  const refs = valid.share.sharePackage.artifactIntegrityRefs.map((item, index) =>
    index === 0 ? { ...item, hash: "changed_hash" } : item
  );
  const result = finalPreExecutionValidation({
    ...valid,
    currentArtifactIntegrityRefs: refs,
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.blocked);
  assert.ok(result.reasonCodes.includes("ARTIFACT_INTEGRITY_CHANGED_OR_UNAVAILABLE"));
});

check("H recipient opt-out after approval is blocked", () => {
  const recipient = { ...valid.recipient, optedOut: true };
  const result = finalPreExecutionValidation({
    ...valid,
    recipient,
    recipientEligibility: null,
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.blocked);
  assert.ok(result.reasonCodes.includes(`RECIPIENT_${recipientEligibilityStatuses.blocked}`));
});

check("I suppressed prospect after approval is blocked", () => {
  const result = finalPreExecutionValidation({
    ...valid,
    prospect: { ...valid.prospect, suppressionStatus: "DO_NOT_CONTACT", lifecycleState: acquisitionLifecycleStates.suppressedDoNotContact },
    recipientEligibility: null,
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.blocked);
  assert.ok(result.reasonCodes.includes("PROSPECT_SUPPRESSED_OR_REJECTED"));
});

check("J expired share package is blocked", () => {
  const result = finalPreExecutionValidation({
    ...valid,
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-08T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.blocked);
  assert.ok(result.reasonCodes.includes("SHARE_PACKAGE_EXPIRED"));
});

check("K revoked share package is blocked", () => {
  const revoked = revokeSharePackage(valid.share.sharePackage, shareRevocationReasons.humanRevoked);
  const result = finalPreExecutionValidation({
    ...valid,
    sharePackage: revoked.sharePackage,
    approval: valid.approvalResult.approval,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.blocked);
  assert.ok(result.reasonCodes.includes("SHARE_PACKAGE_REVOKED"));
});

check("L unsafe or fabricated message claim blocks preflight", () => {
  const unsafeMessage = createDeterministicMessagePreview({
    prospect: valid.prospect,
    digitalAudit: valid.digitalAudit,
    sharePackage: valid.share.sharePackage,
    channel: deliveryChannels.email,
    messageOverride: {
      subject: "Guaranteed revenue today",
      body: "As we discussed, this official website will double your revenue with a five star testimonial.",
      claims: [{ claimId: "fake_metric", claimType: "FACT", text: "Guaranteed revenue" }]
    }
  });
  const preflight = runDeliveryPreflight({
    ...valid,
    deliveryIntent: { ...valid.intentResult.intent, messageFingerprint: unsafeMessage.messageFingerprint },
    messagePreview: unsafeMessage,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(preflight.status, deliveryPreflightStatuses.blocked);
  assert.ok(preflight.reasonCodes.includes("MESSAGE_FACTUALITY_BLOCKED"));
});

check("M unsupported channel blocks preflight", () => {
  const policy = getDeliveryChannelPolicy("VOICE_CALL");
  assert.equal(policy.planningStatus, deliveryChannelPlanningStatuses.blocked);
  const preflight = runDeliveryPreflight({
    ...valid,
    deliveryIntent: { ...valid.intentResult.intent, channel: "VOICE_CALL" },
    messagePreview: { ...valid.intentResult.messagePreview, channel: "VOICE_CALL" },
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(preflight.status, deliveryPreflightStatuses.blocked);
  assert.ok(preflight.reasonCodes.includes("CHANNEL_BLOCKED"));
});

check("N expired human approval is expired and requires new approval", () => {
  const result = finalPreExecutionValidation({
    ...valid,
    approval: { ...valid.approvalResult.approval, expiresAt: "2026-09-04T00:00:00.000Z" },
    now: new Date("2026-09-05T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.expired);
});

check("O revoked human approval is revoked", () => {
  const revoked = revokeHumanSendApproval(valid.approvalResult.approval, "HUMAN_REVOKED", "2026-09-02T00:00:00.000Z");
  assert.equal(revoked.status, humanSendApprovalStatuses.revoked);
  const result = finalPreExecutionValidation({
    ...valid,
    approval: revoked,
    now: new Date("2026-09-02T00:00:00.000Z")
  });
  assert.equal(result.status, finalPreExecutionValidationStatuses.revoked);
});

check("P duplicate identical intent and approval are deterministic", () => {
  const duplicateIntent = createControlledDeliveryIntent({
    prospect: valid.prospect,
    sharePackage: valid.share.sharePackage,
    recipient: valid.recipient,
    recipientEligibility: valid.share.eligibility,
    digitalAudit: valid.digitalAudit,
    channel: deliveryChannels.email,
    existingIntents: [valid.intentResult.intent],
    request: { idempotencyKey: valid.intentResult.intent.idempotencyKey }
  });
  assert.equal(duplicateIntent.duplicate, true);
  assert.equal(duplicateIntent.intent.deliveryIntentId, valid.intentResult.intent.deliveryIntentId);
  const duplicateApproval = approveHumanSend({
    deliveryIntent: valid.intentResult.intent,
    preflight: valid.preflight,
    approvedBy: "lisa_operator",
    approvedAt: "2026-09-01T00:00:00.000Z",
    existingApprovals: [valid.approvalResult.approval]
  });
  assert.equal(duplicateApproval.duplicate, true);
  assert.equal(duplicateApproval.approval.sendApprovalId, valid.approvalResult.approval.sendApprovalId);
});

check("Q SENT transition is invalid and no delivery execution state exists", () => {
  const transition = validateDeliveryStateTransition(deliveryIntentStatuses.approvedForFutureDelivery, "SENT");
  assert.equal(transition.ok, false);
  assert.equal(Object.values(deliveryIntentStatuses).includes("SENT"), false);
  assert.equal(Object.values(deliveryIntentStatuses).includes("DELIVERED"), false);
});

check("R audit redacts recipient and records zero side effects", () => {
  const audit = createDeliveryApprovalAudit({
    deliveryIntent: valid.intentResult.intent,
    messagePreview: valid.intentResult.messagePreview,
    preflight: valid.preflight,
    approval: valid.approvalResult.approval,
    finalValidation: valid.finalValidation,
    stateTransitions: [
      { from: deliveryIntentStatuses.draft, to: deliveryIntentStatuses.preflightReady },
      { from: deliveryIntentStatuses.preflightReady, to: deliveryIntentStatuses.awaitingHumanApproval },
      { from: deliveryIntentStatuses.awaitingHumanApproval, to: deliveryIntentStatuses.humanApproved },
      { from: deliveryIntentStatuses.humanApproved, to: deliveryIntentStatuses.finalValidationPassed },
      { from: deliveryIntentStatuses.finalValidationPassed, to: deliveryIntentStatuses.approvedForFutureDelivery }
    ],
    createdAt: "2026-09-02T00:00:00.000Z"
  });
  assert.equal(audit.providerCalls, 0);
  assert.equal(audit.externalCalls, 0);
  assert.equal(audit.sendActions, 0);
  assert.equal(audit.outreachActions, 0);
  assert.equal(audit.publishActions, 0);
  assert.equal(audit.paymentActions, 0);
  assert.equal(audit.productionHandoffs, 0);
  assert.ok(!JSON.stringify(audit).includes("hello@servicestudio.example"));
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionControlledDeliveryIntentProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    artifactType: "BusinessAcquisitionControlledDeliveryIntentProof",
    phase: "BUSINESS_ACQUISITION_PHASE_F",
    status: "BUSINESS_ACQUISITION_PHASE_F_PASS",
    deliveryAudit: audit,
    scenarios: scenarioResults.map((item) => item.label),
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
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_F_PASS");
  assert.ok(!JSON.stringify(loaded).includes("hello@servicestudio.example"));
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionControlledDeliveryIntentProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Controlled Delivery Intent tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Controlled Delivery Intent tests passed.");
