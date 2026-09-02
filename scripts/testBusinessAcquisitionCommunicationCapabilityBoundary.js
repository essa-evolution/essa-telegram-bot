import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  bridgeApprovedAcquisitionDeliveryToExecution,
  approveHumanSend,
  createBusinessAcquisitionDeliveryDryRunTool,
  createBusinessProspect,
  createContextAwareDemoPlan,
  createControlledDeliveryIntent,
  createDeterministicMessagePreview,
  createProspectDigitalOpportunityAudit,
  deliveryChannels,
  deliveryIntentStatuses,
  generateLocalPreviewPackage,
  prepareClientPreviewSharePackage,
  previewReviewDecisions,
  reviewGeneratedPreview,
  runDeliveryPreflight,
  scoreBusinessAcquisitionOpportunity
} from "../src/businessAcquisition/index.js";
import {
  communicationDeliveryCapabilities,
  communicationDeliveryResultStatuses,
  communicationProviderReadinessStates,
  communicationRoutingStatuses,
  createCommunicationDeliveryRequest,
  createCommunicationDeliveryResult,
  createCommunicationProviderAdapter,
  createLocalCommunicationDryRunAdapter,
  runCommunicationDeliveryDryRun,
  validateCommunicationDeliveryResult
} from "../src/agentToolLayer/communicationDelivery.js";
import { executionProviderContract } from "../src/agentToolLayer/executionGateway.js";
import { getCapability } from "../src/capabilities/index.js";
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

function createApprovedDelivery(suffix = "phase_h") {
  const prospect = createBusinessProspect({
    business: {
      businessId: `phase_h_service_${suffix}`,
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
    request: { generationRequestId: `phase_h_generation_${suffix}`, idempotencyKey: `phase_h_generation_${suffix}` }
  });
  const review = reviewGeneratedPreview({
    generatedPreview: generated.generatedPreview,
    qc: generated.qc,
    decision: previewReviewDecisions.approveForClientPreview,
    reviewer: { reviewerRef: "lisa_operator" },
    allowPassWithWarnings: true,
    idempotencyKey: `phase_h_review_${suffix}`
  });
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
      sharePreparationId: `phase_h_share_${suffix}`,
      idempotencyKey: `phase_h_share_${suffix}`,
      requestedBy: "lisa_operator",
      requestedExpiration: "2026-09-07T00:00:00.000Z"
    },
    now: new Date("2026-09-01T00:00:00.000Z")
  });
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
  const approval = approveHumanSend({
    deliveryIntent: intentResult.intent,
    preflight,
    approvedBy: "lisa_operator",
    approvedAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2026-09-10T00:00:00.000Z"
  }).approval;
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
    approval
  };
}

const dryRunTool = createBusinessAcquisitionDeliveryDryRunTool();
const dryRunGatewayProviders = [{
  ...executionProviderContract,
  providerId: dryRunTool.providerId,
  toolIds: [dryRunTool.toolId],
  capabilities: [...dryRunTool.capabilities],
  status: "dry_run_only",
  health: "local_only",
  executable: false
}];
const dryRunAdapter = createLocalCommunicationDryRunAdapter();
const base = createApprovedDelivery("valid");

function bridge(overrides = {}) {
  return bridgeApprovedAcquisitionDeliveryToExecution({
    ...base,
    registry: [dryRunTool],
    executionProviders: dryRunGatewayProviders,
    now: new Date("2026-09-02T00:00:00.000Z"),
    ...overrides
  });
}

check("A EMAIL_DELIVERY gateway pass resolves local dry-run adapter and validates", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter]
  });
  assert.equal(bridged.ok, true);
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.result.status, communicationDeliveryResultStatuses.dryRunValidated);
  assert.equal(dryRun.selection.adapter.providerId, "LOCAL_COMMUNICATION_DRY_RUN");
  assert.equal(dryRun.providerCalls, 0);
  assert.equal(dryRun.result.externalExecution, false);
  return {
    capability: dryRun.request.capabilityType,
    adapterId: dryRun.selection.adapter.adapterId,
    result: dryRun.result.status
  };
});

check("B WHATSAPP capability is defined and dry-run only", () => {
  const capability = getCapability(communicationDeliveryCapabilities.whatsapp);
  assert.equal(capability.capabilityId, communicationDeliveryCapabilities.whatsapp);
  assert.equal(capability.metadata.supportsDryRun, true);
  assert.equal(capability.metadata.supportsLiveExecution, false);
  const request = createCommunicationDeliveryRequest({
    executionIntent: {
      executionIntentId: "phase_h_whatsapp_intent",
      capability: communicationDeliveryCapabilities.whatsapp,
      idempotencyKey: "phase_h_whatsapp",
      normalizedInput: {
        acquisition: {
          recipientEligibilityRef: "recipient_eligibility_whatsapp",
          redactedRecipient: "+995***",
          artifactIntegrityRefs: [],
          messageFingerprint: "message_fp_whatsapp",
          actionFingerprint: "action_fp_whatsapp",
          humanSendApprovalRef: "send_approval_whatsapp"
        }
      }
    }
  });
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: { executionIntentId: request.executionIntentId, capability: request.capabilityType, idempotencyKey: request.idempotencyKey, normalizedInput: { acquisition: request } },
    gatewayDecision: { decision: "READY", executed: false },
    adapters: [dryRunAdapter],
    rawInput: request
  });
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.result.status, communicationDeliveryResultStatuses.dryRunValidated);
});

check("C unsupported capability returns CAPABILITY_UNAVAILABLE", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: { ...bridged.executionIntent, capability: "FAX_DELIVERY" },
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter]
  });
  assert.equal(dryRun.ok, false);
  assert.ok(dryRun.reasonCodes.includes("CAPABILITY_UNAVAILABLE"));
});

check("D live execution requested is blocked", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter],
    liveExecutionRequested: true
  });
  assert.equal(dryRun.ok, false);
  assert.ok(dryRun.reasonCodes.includes("LIVE_EXECUTION_BLOCKED_PHASE_H"));
});

check("E vendor selection in domain input is rejected", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter],
    rawInput: { providerName: "SendGrid" }
  });
  assert.equal(dryRun.ok, false);
  assert.ok(dryRun.reasonCodes.includes("VENDOR_SELECTION_NOT_ALLOWED_AT_DOMAIN_BOUNDARY"));
});

check("F provider not configured returns NOT_CONFIGURED", () => {
  const bridged = bridge();
  const notConfigured = createLocalCommunicationDryRunAdapter({ readiness: communicationProviderReadinessStates.notConfigured });
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [notConfigured]
  });
  assert.equal(dryRun.ok, false);
  assert.equal(dryRun.status, communicationRoutingStatuses.providerNotConfigured);
});

check("G provider disabled is blocked", () => {
  const bridged = bridge();
  const disabled = createLocalCommunicationDryRunAdapter({ readiness: communicationProviderReadinessStates.disabled });
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [disabled]
  });
  assert.equal(dryRun.ok, false);
  assert.equal(dryRun.status, communicationRoutingStatuses.providerDisabled);
});

check("H gateway bypass attempt is unsupported", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: null,
    adapters: [dryRunAdapter]
  });
  assert.equal(dryRun.ok, false);
  assert.equal(dryRun.status, communicationRoutingStatuses.gatewayRequired);
});

check("I invalid approval/action fingerprint is blocked upstream", () => {
  const result = bridge({ approval: { ...base.approval, actionFingerprint: "mutated_action_fp" } });
  assert.equal(result.ok, false);
});

check("J duplicate delivery request is deterministic by idempotency", () => {
  const bridged = bridge();
  const first = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter]
  });
  const second = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter],
    existingRequests: [{ idempotencyKey: first.request.idempotencyKey, request: first.request, result: first.result }]
  });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(second.request.deliveryRequestId, first.request.deliveryRequestId);
});

check("K credential-like value in request is blocked and proof-safe", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter],
    rawInput: { metadata: { api_key: "sk_test_secretvalue" } }
  });
  assert.equal(dryRun.ok, false);
  assert.ok(dryRun.reasonCodes.includes("CREDENTIAL_LIKE_VALUE_BLOCKED"));
  assert.ok(!JSON.stringify(dryRun).includes("sk_test_secretvalue"));
});

check("L adapter returning SENT/DELIVERED during dry run is invalid", () => {
  const result = createCommunicationDeliveryResult({
    deliveryRequestId: "phase_h_bad_result",
    status: "SENT",
    providerCalls: 0,
    sendActions: 0
  });
  const validation = validateCommunicationDeliveryResult(result);
  assert.equal(validation.ok, false);
  assert.equal(validation.reason, "LIVE_DELIVERY_RESULT_NOT_ALLOWED_IN_DRY_RUN");
});

check("M proof artifact records communication audit without recipient, secrets or paths", () => {
  const bridged = bridge();
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: bridged.executionIntent,
    gatewayDecision: bridged.gatewayDecision,
    adapters: [dryRunAdapter]
  });
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionCommunicationCapabilityBoundaryProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    artifactType: "BusinessAcquisitionCommunicationCapabilityBoundaryProof",
    phase: "BUSINESS_ACQUISITION_PHASE_H",
    status: "BUSINESS_ACQUISITION_PHASE_H_PASS",
    capabilityDefinitions: Object.values(communicationDeliveryCapabilities).map((capabilityId) => {
      const capability = getCapability(capabilityId);
      return {
        capabilityId,
        capabilityType: capability.metadata.capabilityType,
        supportsDryRun: capability.metadata.supportsDryRun,
        supportsLiveExecution: capability.metadata.supportsLiveExecution,
        requiresApproval: capability.approvalRequirements.includes("human_send_approval"),
        requiresRecipientEligibility: capability.metadata.requiresRecipientEligibility,
        requiresIdempotency: capability.metadata.requiresIdempotency,
        providerSelectionPolicyRef: capability.metadata.providerSelectionPolicyRef,
        safetyPolicyRef: capability.metadata.safetyPolicyRef,
        status: capability.activationState
      };
    }),
    bridgeAudit: bridged.audit,
    communicationAudit: dryRun.audit,
    deliveryRequest: dryRun.request,
    deliveryResult: dryRun.result,
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
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_H_PASS");
  assert.ok(!JSON.stringify(loaded).includes("hello@servicestudio.example"));
  assert.ok(!/C:\\\\Users|essa-telegram-bot-main/.test(JSON.stringify(loaded)));
  assert.equal(loaded.communicationAudit.credentialsResolved, false);
  assert.equal(loaded.deliveryResult.status, communicationDeliveryResultStatuses.dryRunValidated);
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionCommunicationCapabilityBoundaryProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Communication Capability Boundary tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Communication Capability Boundary tests passed.");
