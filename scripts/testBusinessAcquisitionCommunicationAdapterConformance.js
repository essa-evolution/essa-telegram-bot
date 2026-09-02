import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  communicationAdapterConformanceStatuses,
  createCommunicationAdapterConformanceAudit,
  runCommunicationAdapterConformance
} from "../src/agentToolLayer/communicationAdapterConformance.js";
import {
  communicationDeliveryCapabilities,
  communicationDeliveryResultStatuses,
  communicationProviderReadinessStates,
  createCommunicationDeliveryResult,
  createCommunicationProviderAdapter,
  createLocalCommunicationDryRunAdapter,
  runCommunicationDeliveryDryRun
} from "../src/agentToolLayer/communicationDelivery.js";
import {
  communicationProviderSelectionStatuses,
  selectCommunicationProviderForCapability
} from "../src/agentToolLayer/communicationProviderSelection.js";
import { communicationProviderRegistry } from "../src/agentToolLayer/communicationProviderRegistry.js";

let failures = 0;
const scenarioResults = [];

const gatewayReadyDecision = {
  decision: "READY",
  executed: false,
  reason: "phase_j_local_conformance_fixture"
};

const baseExecutionIntent = {
  executionIntentId: "phase_j_delivery_regression_intent",
  capability: communicationDeliveryCapabilities.email,
  idempotencyKey: "phase_j_delivery_regression",
  normalizedInput: {
    acquisition: {
      recipientEligibilityRef: "phase_j_delivery_recipient",
      redactedRecipient: "phase-j-recipient",
      artifactIntegrityRefs: [],
      messageFingerprint: "phase_j_delivery_message",
      actionFingerprint: "phase_j_delivery_action",
      humanSendApprovalRef: "phase_j_delivery_approval"
    }
  }
};

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

function conform(adapter, options = {}) {
  return runCommunicationAdapterConformance(adapter, {
    capabilityId: communicationDeliveryCapabilities.email,
    gatewayDecision: gatewayReadyDecision,
    ...options
  });
}

function localAdapter(overrides = {}) {
  return {
    ...createLocalCommunicationDryRunAdapter(),
    ...overrides
  };
}

const fixtureAdapters = {
  validLocalDryRun: createLocalCommunicationDryRunAdapter({
    adapterId: "VALID_LOCAL_DRY_RUN_ADAPTER"
  }),
  malformedMissingMethod: (() => {
    const adapter = localAdapter({ adapterId: "MALFORMED_ADAPTER_MISSING_METHOD" });
    delete adapter.dryRun;
    return adapter;
  })(),
  unsupportedCapability: createCommunicationProviderAdapter({
    adapterId: "UNSUPPORTED_CAPABILITY_ADAPTER",
    providerId: "LOCAL_UNSUPPORTED_CAPABILITY_PROVIDER",
    capabilities: [communicationDeliveryCapabilities.telegram],
    readiness: communicationProviderReadinessStates.available,
    dryRunOnly: true,
    supportsLiveExecution: false
  }),
  invalidReadiness: localAdapter({
    adapterId: "INVALID_READINESS_ADAPTER",
    checkReadiness() {
      return {
        readiness: "LIVE_READY",
        credentialsResolved: false,
        liveProviderConfigured: false
      };
    }
  }),
  invalidDryRunSent: localAdapter({
    adapterId: "INVALID_DRY_RUN_STATUS_SENT_ADAPTER",
    dryRun(request) {
      return createCommunicationDeliveryResult({
        deliveryRequestId: request.deliveryRequestId,
        executionIntentId: request.executionIntentId,
        capabilityType: request.capabilityType,
        providerAdapterId: this.adapterId,
        status: "SENT"
      });
    }
  }),
  invalidDryRunDelivered: localAdapter({
    adapterId: "INVALID_DRY_RUN_STATUS_DELIVERED_ADAPTER",
    dryRun(request) {
      return createCommunicationDeliveryResult({
        deliveryRequestId: request.deliveryRequestId,
        executionIntentId: request.executionIntentId,
        capabilityType: request.capabilityType,
        providerAdapterId: this.adapterId,
        status: "DELIVERED"
      });
    }
  }),
  invalidDryRunUnknownStatus: localAdapter({
    adapterId: "INVALID_DRY_RUN_UNKNOWN_STATUS_ADAPTER",
    dryRun(request) {
      return createCommunicationDeliveryResult({
        deliveryRequestId: request.deliveryRequestId,
        executionIntentId: request.executionIntentId,
        capabilityType: request.capabilityType,
        providerAdapterId: this.adapterId,
        status: "SOMETHING_UNRECOGNIZED"
      });
    }
  }),
  sideEffectCounter: localAdapter({
    adapterId: "SIDE_EFFECT_COUNTER_VIOLATION_ADAPTER",
    dryRun(request) {
      return {
        ...createCommunicationDeliveryResult({
          deliveryRequestId: request.deliveryRequestId,
          executionIntentId: request.executionIntentId,
          capabilityType: request.capabilityType,
          providerAdapterId: this.adapterId,
          status: communicationDeliveryResultStatuses.dryRunValidated
        }),
        providerCalls: 1
      };
    }
  }),
  externalSendCounter: localAdapter({
    adapterId: "EXTERNAL_SEND_COUNTER_VIOLATION_ADAPTER",
    dryRun(request) {
      return {
        ...createCommunicationDeliveryResult({
          deliveryRequestId: request.deliveryRequestId,
          executionIntentId: request.executionIntentId,
          capabilityType: request.capabilityType,
          providerAdapterId: this.adapterId,
          status: communicationDeliveryResultStatuses.dryRunValidated
        }),
        externalCalls: 1,
        sendActions: 1
      };
    }
  }),
  gatewayBypassAttempt: localAdapter({
    adapterId: "GATEWAY_BYPASS_ATTEMPT_ADAPTER",
    gatewayBypassAttempt: true
  }),
  liveExecutionClaim: localAdapter({
    adapterId: "LIVE_EXECUTION_CLAIM_ADAPTER",
    supportsLiveExecution: true,
    liveReady: true
  })
};

check("A canonical local dry-run adapter passes contract conformance", () => {
  const result = conform(fixtureAdapters.validLocalDryRun);
  assert.equal(result.status, communicationAdapterConformanceStatuses.contractCompatible);
  assert.equal(result.passed, true);
  assert.equal(result.dryRunVerified, true);
  assert.equal(result.liveReady, false);
  assert.equal(result.providerVerified, false);
  assert.equal(result.credentialsResolved, false);
  assert.equal(result.networkTested, false);
  assert.equal(result.providerCalls, 0);
  return { status: result.status, adapterId: result.adapterId };
});

check("B missing required adapter method fails", () => {
  const result = conform(fixtureAdapters.malformedMissingMethod);
  assert.notEqual(result.status, communicationAdapterConformanceStatuses.contractCompatible);
  assert.ok(result.failures.includes("DRY_RUN_METHOD_VALID"));
});

check("C unsupported capability fails", () => {
  const result = conform(fixtureAdapters.unsupportedCapability);
  assert.equal(result.status, communicationAdapterConformanceStatuses.capabilityUnsupported);
});

check("D invalid readiness value fails", () => {
  const result = conform(fixtureAdapters.invalidReadiness);
  assert.equal(result.status, communicationAdapterConformanceStatuses.readinessInvalid);
});

check("E dryRun returning SENT fails", () => {
  const result = conform(fixtureAdapters.invalidDryRunSent);
  assert.equal(result.status, communicationAdapterConformanceStatuses.dryRunInvalid);
  assert.ok(result.failures.includes("LIVE_DELIVERY_RESULT_NOT_ALLOWED_IN_DRY_RUN"));
});

check("F dryRun returning DELIVERED fails", () => {
  const result = conform(fixtureAdapters.invalidDryRunDelivered);
  assert.equal(result.status, communicationAdapterConformanceStatuses.dryRunInvalid);
  assert.ok(result.failures.includes("LIVE_DELIVERY_RESULT_NOT_ALLOWED_IN_DRY_RUN"));
});

check("G arbitrary unsupported dryRun status fails closed", () => {
  const result = conform(fixtureAdapters.invalidDryRunUnknownStatus);
  assert.equal(result.status, communicationAdapterConformanceStatuses.dryRunInvalid);
  assert.equal(result.passed, false);
  assert.ok(result.failures.includes("DRY_RUN_STATUS_UNSUPPORTED"));
  assert.equal(result.liveReady, false);
  assert.equal(result.providerVerified, false);
  assert.equal(result.credentialsResolved, false);
  assert.equal(result.networkTested, false);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.externalCalls, 0);
  assert.equal(result.sendActions, 0);
});

check("H non-zero providerCalls fails", () => {
  const result = conform(fixtureAdapters.sideEffectCounter);
  assert.equal(result.status, communicationAdapterConformanceStatuses.dryRunInvalid);
  assert.ok(result.failures.includes("DRY_RUN_SIDE_EFFECT_COUNTER_VIOLATION"));
});

check("I non-zero externalCalls/sendActions fails", () => {
  const result = conform(fixtureAdapters.externalSendCounter);
  assert.equal(result.status, communicationAdapterConformanceStatuses.dryRunInvalid);
  assert.ok(result.failures.includes("DRY_RUN_SIDE_EFFECT_COUNTER_VIOLATION"));
});

check("J missing Gateway READY decision remains blocked", () => {
  const result = conform(fixtureAdapters.validLocalDryRun, { gatewayDecision: null });
  assert.equal(result.status, communicationAdapterConformanceStatuses.gatewayRequirementFailed);
  assert.equal(result.dryRunVerified, false);
  assert.ok(result.failures.includes("EXECUTION_GATEWAY_REQUIRED"));
});

check("K Gateway bypass attempt fails", () => {
  const result = conform(fixtureAdapters.gatewayBypassAttempt);
  assert.equal(result.status, communicationAdapterConformanceStatuses.gatewayRequirementFailed);
});

check("L live execution request is not tested/executed and remains forbidden", () => {
  const result = conform(fixtureAdapters.liveExecutionClaim, { liveExecutionRequested: true });
  assert.equal(result.status, communicationAdapterConformanceStatuses.liveExecutionForbidden);
  assert.equal(result.liveExecutionTested, false);
  assert.equal(result.liveReady, false);
  assert.equal(result.providerCalls, 0);
});

check("M passing conformance does not set live readiness flags", () => {
  const result = conform(fixtureAdapters.validLocalDryRun);
  assert.equal(result.liveReady, false);
  assert.equal(result.providerVerified, false);
  assert.equal(result.credentialsResolved, false);
});

check("N Phase I deterministic provider selection remains unchanged", () => {
  const decision = selectCommunicationProviderForCapability({
    capabilityId: communicationDeliveryCapabilities.email,
    registry: communicationProviderRegistry,
    checkedAt: "2026-09-02T00:00:00.000Z"
  });
  assert.equal(decision.status, communicationProviderSelectionStatuses.selected);
  assert.equal(decision.selectedProviderId, "HYPOTHETICAL_EMAIL_PRIMARY");
  assert.equal(decision.selectedAdapterId, "HYPOTHETICAL_EMAIL_PRIMARY_ADAPTER");
  assert.ok(decision.fallbackProviderIds.includes("HYPOTHETICAL_EMAIL_FALLBACK"));
  assert.ok(decision.fallbackProviderIds.includes("LOCAL_COMMUNICATION_DRY_RUN"));
  assert.equal(decision.providerCalls, 0);
  return { selectedProviderId: decision.selectedProviderId, selectedAdapterId: decision.selectedAdapterId };
});

check("O Phase H communication delivery dry-run behavior remains unchanged", () => {
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: baseExecutionIntent,
    gatewayDecision: gatewayReadyDecision,
    adapters: [createLocalCommunicationDryRunAdapter()]
  });
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.result.status, communicationDeliveryResultStatuses.dryRunValidated);
  assert.equal(dryRun.providerCalls, 0);
});

check("P no provider/network/external calls", () => {
  const results = Object.values(fixtureAdapters).map((adapter) => conform(adapter));
  assert.ok(results.every((result) => result.providerCalls === 0));
  assert.ok(results.every((result) => result.externalCalls === 0));
  assert.ok(results.every((result) => result.sendActions === 0));
});

check("Q proof artifact records Phase J conformance boundary", () => {
  const canonicalPassing = conform(fixtureAdapters.validLocalDryRun);
  const malformed = conform(fixtureAdapters.malformedMissingMethod);
  const invalidDryRunStatus = conform(fixtureAdapters.invalidDryRunSent);
  const unsupportedDryRunStatus = conform(fixtureAdapters.invalidDryRunUnknownStatus);
  const gatewayRequired = conform(fixtureAdapters.validLocalDryRun, { gatewayDecision: null });
  const sideEffectViolation = conform(fixtureAdapters.sideEffectCounter);
  const liveClaim = conform(fixtureAdapters.liveExecutionClaim, { liveExecutionRequested: true });
  const audit = createCommunicationAdapterConformanceAudit({
    result: canonicalPassing,
    createdAt: "2026-09-02T00:00:00.000Z"
  });
  const proof = {
    artifactType: "BusinessAcquisitionCommunicationAdapterConformanceProof",
    phase: "BUSINESS_ACQUISITION_PHASE_J",
    status: "BUSINESS_ACQUISITION_PHASE_J_PASS",
    canonicalCheckpoint: "d2a537f37900ee339fc1a6ac01133a321b40f74a",
    canonicalPassingAdapterScenario: canonicalPassing,
    malformedAdapterScenario: malformed,
    invalidDryRunStatusScenario: invalidDryRunStatus,
    unsupportedDryRunStatusScenario: unsupportedDryRunStatus,
    gatewayRequirementScenario: gatewayRequired,
    sideEffectCounterScenario: sideEffectViolation,
    liveExecutionClaimScenario: liveClaim,
    audit,
    boundaryStatement: "Provider Readiness != Adapter Conformance != Live Readiness. CONTRACT_COMPATIBLE != LIVE_READY.",
    explicitNonLiveFlags: {
      liveExecutionTested: false,
      credentialsResolved: false,
      networkTested: false,
      providerVerified: false,
      liveReady: false,
      liveExecutionAllowed: false
    },
    counters: {
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0,
      outreachActions: 0,
      publishActions: 0,
      paymentActions: 0,
      productionHandoffs: 0
    },
    scenarios: scenarioResults.map((item) => item.label)
  };
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionCommunicationAdapterConformanceProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  const loaded = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  const proofText = JSON.stringify(loaded);
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_J_PASS");
  assert.equal(loaded.canonicalPassingAdapterScenario.status, communicationAdapterConformanceStatuses.contractCompatible);
  assert.equal(loaded.audit.gatewayRequired, true);
  assert.equal(loaded.audit.liveExecutionAllowed, false);
  assert.equal(loaded.counters.providerCalls, 0);
  assert.ok(!/sk[-_]|bearer\s|SECRET_VALUE|C:\\\\Users|essa-telegram-bot-main/i.test(proofText));
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionCommunicationAdapterConformanceProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Communication Adapter Conformance tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Communication Adapter Conformance tests passed.");
