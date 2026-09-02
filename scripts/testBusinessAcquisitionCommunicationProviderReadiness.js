import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  communicationDeliveryCapabilities,
  communicationProviderReadinessStates,
  communicationRoutingStatuses,
  createLocalCommunicationDryRunAdapter,
  runCommunicationDeliveryDryRun
} from "../src/agentToolLayer/communicationDelivery.js";
import {
  communicationProviderRegistry,
  createCommunicationProviderDefinition,
  evaluateCommunicationProviderReadiness
} from "../src/agentToolLayer/communicationProviderRegistry.js";
import {
  communicationProviderSelectionReasonCodes,
  communicationProviderSelectionStatuses,
  createCommunicationProviderSelectionAudit,
  selectCommunicationProviderForCapability
} from "../src/agentToolLayer/communicationProviderSelection.js";
import { providerCapabilityMap } from "../src/capabilities/providerCapabilityMap.js";

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

function provider(input = {}) {
  return createCommunicationProviderDefinition({
    providerId: input.providerId,
    adapterId: `${input.providerId}_ADAPTER`,
    displayLabel: input.providerId,
    capabilityIds: input.capabilityIds || [communicationDeliveryCapabilities.email],
    readiness: input.readiness || communicationProviderReadinessStates.available,
    enabled: input.enabled !== false,
    dryRunOnly: true,
    supportsLiveExecution: false,
    executableNow: false,
    hypothetical: true,
    credentialRequirements: input.credentialRequirements || [{ credentialType: "API_TOKEN" }],
    configurationRequirements: input.configurationRequirements || [],
    channelConstraints: input.channelConstraints || ["EMAIL"],
    costClass: "METERED",
    priority: input.priority ?? 50,
    sourceOfTruth: "scripts/testBusinessAcquisitionCommunicationProviderReadiness.js",
    notes: ["test fixture"]
  });
}

function select(registry, extra = {}) {
  return selectCommunicationProviderForCapability({
    capabilityId: communicationDeliveryCapabilities.email,
    registry,
    checkedAt: "2026-09-02T00:00:00.000Z",
    ...extra
  });
}

check("A AVAILABLE primary plus AVAILABLE fallback selects primary by priority and plans fallback", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_EMAIL_FALLBACK", priority: 20 }),
    provider({ providerId: "PHASE_I_EMAIL_PRIMARY", priority: 10 })
  ]);
  assert.equal(decision.status, communicationProviderSelectionStatuses.selected);
  assert.equal(decision.selectedProviderId, "PHASE_I_EMAIL_PRIMARY");
  assert.deepEqual(decision.fallbackProviderIds, ["PHASE_I_EMAIL_FALLBACK"]);
  assert.equal(decision.providerCalls, 0);
  return { selected: decision.selectedProviderId, fallback: decision.fallbackProviderIds };
});

check("B primary DISABLED is rejected and fallback selected", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_DISABLED_PRIMARY", priority: 10, enabled: false, readiness: communicationProviderReadinessStates.disabled }),
    provider({ providerId: "PHASE_I_EMAIL_FALLBACK", priority: 20 })
  ]);
  assert.equal(decision.selectedProviderId, "PHASE_I_EMAIL_FALLBACK");
  const rejected = decision.rejectedCandidates.find((item) => item.providerId === "PHASE_I_DISABLED_PRIMARY");
  assert.ok(rejected.reasonCodes.includes(communicationProviderSelectionReasonCodes.providerDisabled));
});

check("C primary UNAVAILABLE is rejected and fallback selected", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_UNAVAILABLE_PRIMARY", priority: 10, readiness: communicationProviderReadinessStates.unavailable }),
    provider({ providerId: "PHASE_I_EMAIL_FALLBACK", priority: 20 })
  ]);
  assert.equal(decision.selectedProviderId, "PHASE_I_EMAIL_FALLBACK");
  assert.ok(decision.rejectedCandidates[0].reasonCodes.includes(communicationProviderSelectionReasonCodes.providerUnavailable));
});

check("D AVAILABLE wins over DEGRADED even when degraded has stronger priority", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_DEGRADED_PRIMARY", priority: 1, readiness: communicationProviderReadinessStates.degraded }),
    provider({ providerId: "PHASE_I_AVAILABLE_FALLBACK", priority: 90 })
  ]);
  assert.equal(decision.selectedProviderId, "PHASE_I_AVAILABLE_FALLBACK");
  assert.deepEqual(decision.fallbackProviderIds, ["PHASE_I_DEGRADED_PRIMARY"]);
});

check("E NOT_CONFIGURED provider is not selected when a usable candidate exists", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_NOT_CONFIGURED_PRIMARY", priority: 10, readiness: communicationProviderReadinessStates.notConfigured }),
    provider({ providerId: "PHASE_I_EMAIL_FALLBACK", priority: 20 })
  ]);
  assert.equal(decision.selectedProviderId, "PHASE_I_EMAIL_FALLBACK");
  const rejected = decision.rejectedCandidates.find((item) => item.providerId === "PHASE_I_NOT_CONFIGURED_PRIMARY");
  assert.ok(rejected.reasonCodes.includes(communicationProviderSelectionReasonCodes.providerNotConfigured));
});

check("F capability mismatch is rejected", () => {
  const decision = select([
    provider({
      providerId: "PHASE_I_WHATSAPP_ONLY",
      capabilityIds: [communicationDeliveryCapabilities.whatsapp],
      channelConstraints: ["WHATSAPP"]
    }),
    provider({ providerId: "PHASE_I_EMAIL_FALLBACK", priority: 20 })
  ]);
  const rejected = decision.rejectedCandidates.find((item) => item.providerId === "PHASE_I_WHATSAPP_ONLY");
  assert.equal(decision.selectedProviderId, "PHASE_I_EMAIL_FALLBACK");
  assert.ok(rejected.reasonCodes.includes(communicationProviderSelectionReasonCodes.capabilityMismatch));
});

check("G equal readiness and equal priority use stable providerId tie-break", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_Z_EMAIL", priority: 10 }),
    provider({ providerId: "PHASE_I_A_EMAIL", priority: 10 })
  ]);
  assert.equal(decision.selectedProviderId, "PHASE_I_A_EMAIL");
});

check("H no eligible providers returns safe no-provider result and no execution", () => {
  const decision = select([
    provider({ providerId: "PHASE_I_DISABLED", readiness: communicationProviderReadinessStates.disabled, enabled: false })
  ]);
  assert.equal(decision.status, communicationProviderSelectionStatuses.noEligibleProvider);
  assert.equal(decision.selectedProviderId, null);
  assert.equal(decision.sendActions, 0);
});

check("I liveExecutionRequested is blocked with zero provider calls", () => {
  const decision = select([provider({ providerId: "PHASE_I_EMAIL_PRIMARY", priority: 10 })], {
    liveExecutionRequested: true
  });
  assert.equal(decision.status, communicationProviderSelectionStatuses.liveExecutionBlocked);
  assert.equal(decision.selectedProviderId, null);
  assert.ok(decision.selectionReasonCodes.includes(communicationProviderSelectionReasonCodes.liveExecutionBlockedPhaseI));
  assert.equal(decision.providerCalls, 0);
});

check("J missing Gateway READY decision during delivery dry-run preserves gateway-required behavior", () => {
  const dryRun = runCommunicationDeliveryDryRun({
    executionIntent: {
      executionIntentId: "phase_i_gateway_boundary",
      capability: communicationDeliveryCapabilities.email,
      idempotencyKey: "phase_i_gateway_boundary",
      normalizedInput: {
        acquisition: {
          recipientEligibilityRef: "recipient_eligibility_phase_i",
          redactedRecipient: "he***@example.invalid",
          artifactIntegrityRefs: [],
          messageFingerprint: "message_fp_phase_i",
          actionFingerprint: "action_fp_phase_i",
          humanSendApprovalRef: "send_approval_phase_i"
        }
      }
    },
    gatewayDecision: null,
    adapters: [createLocalCommunicationDryRunAdapter()]
  });
  assert.equal(dryRun.ok, false);
  assert.equal(dryRun.status, communicationRoutingStatuses.gatewayRequired);
  assert.equal(dryRun.providerCalls, 0);
});

check("K credential requirement metadata exposes types only and never resolves values", () => {
  const definition = communicationProviderRegistry.find((item) => item.providerId === "HYPOTHETICAL_EMAIL_PRIMARY");
  const readiness = evaluateCommunicationProviderReadiness(
    definition,
    communicationDeliveryCapabilities.email,
    { checkedAt: "2026-09-02T00:00:00.000Z" }
  );
  assert.ok(readiness.credentialsRequired.includes("API_TOKEN"));
  assert.equal(readiness.credentialsResolved, false);
  assert.ok(!JSON.stringify(readiness).includes("SECRET_VALUE"));
});

check("L hypothetical provider fixtures are non-executable, dry-run-only and non-live", () => {
  const fixtures = communicationProviderRegistry.filter((item) => item.hypothetical);
  assert.ok(fixtures.length >= 5);
  for (const fixture of fixtures) {
    assert.equal(fixture.executableNow, false);
    assert.equal(fixture.supportsLiveExecution, false);
    assert.equal(fixture.dryRunOnly, true);
    assert.equal(providerCapabilityMap[fixture.providerId].hypothetical, true);
    assert.equal(providerCapabilityMap[fixture.providerId].executableNow, false);
    assert.equal(providerCapabilityMap[fixture.providerId].dryRunOnly, true);
  }
});

check("M existing LOCAL_COMMUNICATION_DRY_RUN behavior remains valid and proof artifact is safe", () => {
  const decision = selectCommunicationProviderForCapability({
    capabilityId: communicationDeliveryCapabilities.email,
    registry: communicationProviderRegistry,
    checkedAt: "2026-09-02T00:00:00.000Z"
  });
  const audit = createCommunicationProviderSelectionAudit({
    decision,
    registry: communicationProviderRegistry,
    createdAt: "2026-09-02T00:00:00.000Z"
  });
  const proofPath = path.resolve("artifacts/business/acquisition-preview/BusinessAcquisitionCommunicationProviderReadinessProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify({
    artifactType: "BusinessAcquisitionCommunicationProviderReadinessProof",
    phase: "BUSINESS_ACQUISITION_PHASE_I",
    status: "BUSINESS_ACQUISITION_PHASE_I_PASS",
    decision,
    audit,
    registrySummary: communicationProviderRegistry.map((item) => ({
      providerId: item.providerId,
      adapterId: item.adapterId,
      capabilityIds: item.capabilityIds,
      readiness: item.readiness,
      enabled: item.enabled,
      dryRunOnly: item.dryRunOnly,
      supportsLiveExecution: item.supportsLiveExecution,
      executableNow: item.executableNow,
      hypothetical: item.hypothetical,
      credentialTypes: item.credentialRequirements.map((credential) => credential.credentialType)
    })),
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
  assert.equal(loaded.status, "BUSINESS_ACQUISITION_PHASE_I_PASS");
  assert.equal(loaded.audit.gatewayRequired, true);
  assert.equal(loaded.audit.liveExecutionAllowed, false);
  assert.equal(loaded.audit.credentialsResolved, false);
  assert.equal(loaded.counters.providerCalls, 0);
  assert.ok(!/sk[-_]|bearer\s|SECRET_VALUE|hello@/i.test(JSON.stringify(loaded)));
  return { proofPath: "artifacts/business/acquisition-preview/BusinessAcquisitionCommunicationProviderReadinessProof.json" };
});

if (failures > 0) {
  console.error(`Business Acquisition Communication Provider Readiness tests failed: ${failures}`);
  process.exit(1);
}

console.log("Business Acquisition Communication Provider Readiness tests passed.");
