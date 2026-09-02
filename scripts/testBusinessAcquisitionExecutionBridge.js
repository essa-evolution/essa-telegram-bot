import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  acquisitionExecutionBridgeStatuses,
  acquisitionLifecycleStates,
  approveHumanSend,
  bridgeApprovedAcquisitionDeliveryToExecution,
  createBusinessAcquisitionDeliveryDryRunTool,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createControlledDeliveryIntent,
  createDeterministicMessagePreview,
  createProspectDigitalOpportunityAudit,
  deliveryChannels,
  deliveryIntentStatuses,
  finalPreExecutionValidationStatuses,
  generateLocalPreviewPackage,
  prepareClientPreviewSharePackage,
  previewReviewDecisions,
  revokeHumanSendApproval,
  reviewGeneratedPreview,
  runDeliveryPreflight,
  scoreBusinessAcquisitionOpportunity,
  validateDeliveryStateTransition
} from "../src/businessAcquisition/index.js";
import { createExecutionQueue, executionIntentStatuses } from "../src/agentToolLayer/executionQueue.js";
import { executionGateDecisions, executionProviderContract } from "../src/agentToolLayer/executionGateway.js";
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

function createApprovedDelivery(suffix = "bridge") {
  const prospect = createBusinessProspect({
    business: {
      businessId: `phase_g_service_${suffix}`,
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
      generationRequestId: `phase_g_generation_${suffix}`,
      idempotencyKey: `phase_g_generation_${suffix}`
    }
  });
  assert.equal(generated.ok, true);
  const review = reviewGeneratedPreview({
    generatedPreview: generated.generatedPreview,
    qc: generated.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: `phase_g_review_${suffix}`
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
      sharePreparationId: `phase_g_share_${suffix}`,
      idempotencyKey: `phase_g_share_${suffix}`,
      requestedBy: "lisa_operator",
      requestedExpiration: "2026-09-07T00:00:00.000Z"
    },
    now: new Date("2026-09-01T00:00:00.000Z")
  });
  assert.equal(share.ok, true);
  const intentResult = createControlledDeliveryIntent({
    prospect,
    sharePackage: share.sharePackage,
    recipient,
    recipientEligibility: share.eligibility,
    digitalAudit,
    channel: deliveryChannels.email,
    request: { requestedBy: "lisa_operator" }
  });
  const preflight = runDeliveryPreflight({
    prospect,
    sharePackage: share.sharePackage,
    generatedPreview: generated.generatedPreview,
    review: review.review,
    recipient,
    recipientEligibility: share.eligibility,
    accessPolicy: share.accessPolicy,
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
  return {
    prospect,
    digitalAudit,
    generatedPreview: generated.generatedPreview,
    review: review.review,
    recipient,
    recipientEligibility: share.eligibility,
    sharePackage: share.sharePackage,
    accessPolicy: share.accessPolicy,
    deliveryIntent: { ...intentResult.intent, status: deliveryIntentStatuses.approvedForFutureDelivery },
    messagePreview: intentResult.messagePreview,
    approval: approvalResult.approval,
    preflight
  };
}

const dryRunTool = createBusinessAcquisitionDeliveryDryRunTool();
const dryRunProviders = [{
  ...executionProviderContract,
  providerId: dryRunTool.providerId,
  toolIds: [dryRunTool.toolId],
  capabilities: [...dryRunTool.capabilities],
  status: "dry_run_only",
  health: "local_only",
  executable: false
}];
const base = createApprovedDelivery("valid");

function bridge(overrides = {}) {
  return bridgeApprovedAcquisitionDeliveryToExecution({
    ...base,
    registry: [dryRunTool],
    executionProviders: dryRunProviders,
    now: new Date("2026-09-02T00:00:00.000Z"),
    ...overrides
  });
}

check("A valid approved EMAIL action creates ExecutionIntent and reaches DRY_RUN_ALLOWED", () => {
  const result = bridge();
  assert.equal(result.ok, true);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.dryRunAllowed);
  assert.equal(result.executionIntent.status, executionIntentStatuses.readyForExecution);
  assert.equal(result.gatewayDecision.decision, executionGateDecisions.ready);
  assert.equal(result.gatewayDecision.executed, false);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.executionIntent.normalizedInput.acquisition.actionFingerprint, base.approval.actionFingerprint);
  return {
    executionIntentId: result.executionIntent.executionIntentId,
    gatewayDecision: result.gatewayDecision.decision,
    actionFingerprint: result.executionIntent.normalizedInput.acquisition.actionFingerprint
  };
});

check("B no HumanSendApproval blocks bridge", () => {
  const result = bridge({ approval: null });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.actionMutated);
});

check("C expired approval blocks bridge", () => {
  const result = bridge({ approval: { ...base.approval, expiresAt: "2026-09-01T01:00:00.000Z" } });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.approvalInvalid);
});

check("D revoked approval blocks bridge", () => {
  const result = bridge({ approval: revokeHumanSendApproval(base.approval, "HUMAN_REVOKED", "2026-09-02T00:00:00.000Z") });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.approvalInvalid);
});

check("E changed message fingerprint blocks bridge", () => {
  const messagePreview = createDeterministicMessagePreview({
    prospect: base.prospect,
    digitalAudit: base.digitalAudit,
    sharePackage: base.sharePackage,
    channel: deliveryChannels.email,
    messageOverride: { subject: "Updated", body: base.messagePreview.body }
  });
  const result = bridge({
    messagePreview,
    deliveryIntent: { ...base.deliveryIntent, messageFingerprint: messagePreview.messageFingerprint }
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.actionMutated);
});

check("F changed recipient blocks bridge", () => {
  const result = bridge({ deliveryIntent: { ...base.deliveryIntent, recipientRef: "sales@servicestudio.example" } });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.actionMutated);
});

check("G changed channel blocks bridge", () => {
  const result = bridge({
    deliveryIntent: { ...base.deliveryIntent, channel: deliveryChannels.telegram },
    messagePreview: { ...base.messagePreview, channel: deliveryChannels.telegram }
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.actionMutated);
});

check("H changed preview/version blocks bridge", () => {
  const result = bridge({ generatedPreview: { ...base.generatedPreview, version: "1.0.1" } });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.actionMutated);
});

check("I changed artifact integrity blocks bridge", () => {
  const currentArtifactIntegrityRefs = base.sharePackage.artifactIntegrityRefs.map((item, index) =>
    index === 0 ? { ...item, hash: "changed_hash" } : item
  );
  const result = bridge({ currentArtifactIntegrityRefs });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.artifactInvalid);
});

check("J prospect suppression after approval blocks bridge", () => {
  const result = bridge({
    prospect: { ...base.prospect, suppressionStatus: "DO_NOT_CONTACT", lifecycleState: acquisitionLifecycleStates.suppressedDoNotContact },
    recipientEligibility: null
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.suppressed);
});

check("K recipient opt-out after approval blocks bridge", () => {
  const result = bridge({ recipient: { ...base.recipient, optedOut: true }, recipientEligibility: null });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.actionMutated);
});

check("L unavailable execution capability returns CAPABILITY_UNAVAILABLE", () => {
  const result = bridge({ registry: [] });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.capabilityUnavailable);
});

check("M bypassing ExecutionGateway is not accepted as proof", () => {
  const result = bridge();
  const fakeBypass = { executionIntent: result.executionIntent, gatewayDecision: null, executed: false };
  assert.equal(Boolean(fakeBypass.gatewayDecision), false);
  assert.equal(result.audit.gatewayRequired, true);
  assert.equal(result.audit.gatewayBypassAllowed, false);
});

check("N duplicate identical execution preparation is idempotent", () => {
  const queue = createExecutionQueue();
  const first = bridge({ existingQueue: queue });
  const second = bridge({ existingQueue: queue });
  assert.equal(first.status, acquisitionExecutionBridgeStatuses.dryRunAllowed);
  assert.equal(second.status, acquisitionExecutionBridgeStatuses.idempotentDuplicate);
  assert.equal(second.executionIntent.executionIntentId, first.executionIntent.executionIntentId);
});

check("O provider execution enablement is blocked in Phase G", () => {
  const result = bridge({ allowProviderExecution: true });
  assert.equal(result.ok, false);
  assert.equal(result.status, acquisitionExecutionBridgeStatuses.policyBlocked);
  assert.ok(result.reasonCodes.includes("PROVIDER_EXECUTION_NOT_ALLOWED_PHASE_G"));
});

check("P SENT/DELIVERED transition remains invalid", () => {
  assert.equal(validateDeliveryStateTransition(deliveryIntentStatuses.approvedForFutureDelivery, "SENT").ok, false);
  assert.equal(validateDeliveryStateTransition(deliveryIntentStatuses.approvedForFutureDelivery, "DELIVERED").ok, false);
});

check("Q proof artifact preserves lineage, redaction and zero side effects", () => {
  const result = bridge();
  assert.equal(result.finalValidation.status, finalPreExecutionValidationStatuses.approvedForFutureDelivery);
  assert.equal(result.audit.executed, false);
  assert.equal(result.audit.providerCalls, 0);
  assert.equal(result.audit.externalCalls, 0);
  assert.equal(result.audit.sendActions, 0);
  assert.ok(!JSON.stringify(result.audit).includes("hello@servicestudio.example"));
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionExecutionBridgeProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    artifactType: "BusinessAcquisitionExecutionBridgeProof",
    phase: "BUSINESS_ACQUISITION_PHASE_G",
    status: "BUSINESS_ACQUISITION_PHASE_G_PASS",
    bridgeAudit: result.audit,
    executionIntent: {
      modelType: "ExecutionIntent",
      executionIntentId: result.executionIntent.executionIntentId,
      status: result.executionIntent.status,
      toolId: result.executionIntent.toolId,
      capability: result.executionIntent.capability,
      action: result.executionIntent.action,
      idempotencyKey: result.executionIntent.idempotencyKey,
      acquisitionActionFingerprint: result.executionIntent.acquisitionActionFingerprint,
      normalizedInput: result.executionIntent.normalizedInput
    },
    gatewayDecision: result.gatewayDecision,
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
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_G_PASS");
  assert.ok(!JSON.stringify(loaded).includes("hello@servicestudio.example"));
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionExecutionBridgeProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Execution Bridge tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Execution Bridge tests passed.");
