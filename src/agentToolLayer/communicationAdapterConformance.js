import {
  communicationDeliveryCapabilities,
  communicationDeliveryResultStatuses,
  communicationProviderReadinessStates,
  createCommunicationDeliveryRequest,
  validateCommunicationDeliveryResult
} from "./communicationDelivery.js";
import { redactForTrace } from "./policy.js";

export const communicationAdapterConformancePhase = "BUSINESS_ACQUISITION_PHASE_J";
export const communicationAdapterConformanceContractVersion = "communication-adapter-conformance-v1";

export const communicationAdapterConformanceStatuses = {
  contractCompatible: "CONTRACT_COMPATIBLE",
  contractIncompatible: "CONTRACT_INCOMPATIBLE",
  invalidAdapter: "INVALID_ADAPTER",
  capabilityUnsupported: "CAPABILITY_UNSUPPORTED",
  readinessInvalid: "READINESS_INVALID",
  dryRunInvalid: "DRY_RUN_INVALID",
  gatewayRequirementFailed: "GATEWAY_REQUIREMENT_FAILED",
  liveExecutionForbidden: "LIVE_EXECUTION_FORBIDDEN"
};

export const communicationAdapterConformanceCheckIds = {
  adapterIdPresent: "ADAPTER_ID_PRESENT",
  providerIdPresent: "PROVIDER_ID_PRESENT",
  supportsMethodValid: "SUPPORTS_METHOD_VALID",
  validateMethodValid: "VALIDATE_METHOD_VALID",
  estimateCostMethodValid: "ESTIMATE_COST_METHOD_VALID",
  checkReadinessMethodValid: "CHECK_READINESS_METHOD_VALID",
  dryRunMethodValid: "DRY_RUN_METHOD_VALID",
  executeMethodPresent: "EXECUTE_METHOD_PRESENT",
  capabilityDeclarationValid: "CAPABILITY_DECLARATION_VALID",
  validationResultShapeValid: "VALIDATION_RESULT_SHAPE_VALID",
  costEstimateMetadataOnly: "COST_ESTIMATE_METADATA_ONLY",
  readinessStateValid: "READINESS_STATE_VALID",
  dryRunResultValid: "DRY_RUN_RESULT_VALID",
  dryRunZeroSideEffects: "DRY_RUN_ZERO_SIDE_EFFECTS",
  liveResultStatusForbidden: "LIVE_RESULT_STATUS_FORBIDDEN",
  executionGatewayRequired: "EXECUTION_GATEWAY_REQUIRED",
  noCredentialResolution: "NO_CREDENTIAL_RESOLUTION",
  noNetworkExecution: "NO_NETWORK_EXECUTION"
};

const knownReadinessStates = new Set(Object.values(communicationProviderReadinessStates));
const allowedDryRunStatuses = new Set([
  communicationDeliveryResultStatuses.notExecuted,
  communicationDeliveryResultStatuses.dryRunValidated
]);
const liveDryRunStatuses = new Set([
  communicationDeliveryResultStatuses.deliveryAccepted,
  communicationDeliveryResultStatuses.deliveryRejected,
  communicationDeliveryResultStatuses.deliveryFailed,
  "SENT",
  "DELIVERED"
]);

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isCallable(value) {
  return typeof value === "function";
}

function addCheck(checks, checkId, passed, details = {}) {
  const check = {
    checkId,
    passed: passed === true,
    failureCode: passed === true ? null : details.failureCode || checkId,
    warningCode: details.warningCode || null,
    details: details.details || {}
  };
  checks.push(check);
  return check;
}

function countersFrom(value = {}) {
  return {
    providerCalls: Number(value.providerCalls || 0),
    externalCalls: Number(value.externalCalls || 0),
    sendActions: Number(value.sendActions || 0),
    outreachActions: Number(value.outreachActions || 0)
  };
}

function zeroCounters(value = {}) {
  const counters = countersFrom(value);
  return Object.values(counters).every((count) => count === 0);
}

function createHarnessRequest(capabilityId) {
  return createCommunicationDeliveryRequest({
    executionIntent: {
      executionIntentId: "phase_j_conformance_intent",
      capability: capabilityId,
      idempotencyKey: "phase_j_conformance_intent",
      normalizedInput: {
        acquisition: {
          recipientEligibilityRef: "phase_j_recipient_eligibility",
          redactedRecipient: "phase-j-recipient",
          artifactIntegrityRefs: [],
          messageFingerprint: "phase_j_message_fingerprint",
          actionFingerprint: "phase_j_action_fingerprint",
          humanSendApprovalRef: "phase_j_human_send_approval"
        }
      }
    }
  });
}

function deriveStatus({ adapter, supported, readiness, dryRunResult, checks }) {
  const failed = checks.filter((check) => !check.passed);
  if (adapter?.supportsLiveExecution === true || adapter?.liveReady === true || adapter?.liveDeliveryConfirmed === true) {
    return communicationAdapterConformanceStatuses.liveExecutionForbidden;
  }
  if (adapter?.gatewayBypassAttempt === true || adapter?.directExecutionAllowed === true) {
    return communicationAdapterConformanceStatuses.gatewayRequirementFailed;
  }
  if (!adapter || typeof adapter !== "object") {
    return communicationAdapterConformanceStatuses.invalidAdapter;
  }
  if (!supported) return communicationAdapterConformanceStatuses.capabilityUnsupported;
  if (readiness && !knownReadinessStates.has(readiness.readiness)) {
    return communicationAdapterConformanceStatuses.readinessInvalid;
  }
  if (dryRunResult && liveDryRunStatuses.has(dryRunResult.status)) {
    return communicationAdapterConformanceStatuses.dryRunInvalid;
  }
  if (dryRunResult && !allowedDryRunStatuses.has(dryRunResult.status)) {
    return communicationAdapterConformanceStatuses.dryRunInvalid;
  }
  if (dryRunResult && !zeroCounters(dryRunResult)) {
    return communicationAdapterConformanceStatuses.dryRunInvalid;
  }
  if (failed.some((check) => check.checkId === communicationAdapterConformanceCheckIds.executionGatewayRequired)) {
    return communicationAdapterConformanceStatuses.gatewayRequirementFailed;
  }
  if (failed.length > 0) return communicationAdapterConformanceStatuses.contractIncompatible;
  return communicationAdapterConformanceStatuses.contractCompatible;
}

export function validateCommunicationAdapterContract(adapter = null, options = {}) {
  const capabilityId = options.capabilityId || communicationDeliveryCapabilities.email;
  const checks = [];
  const request = options.request || createHarnessRequest(capabilityId);

  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.adapterIdPresent,
    typeof adapter?.adapterId === "string" && adapter.adapterId.length > 0
  );
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.providerIdPresent,
    typeof adapter?.providerId === "string" && adapter.providerId.length > 0
  );
  addCheck(checks, communicationAdapterConformanceCheckIds.supportsMethodValid, isCallable(adapter?.supports));
  addCheck(checks, communicationAdapterConformanceCheckIds.validateMethodValid, isCallable(adapter?.validate));
  addCheck(checks, communicationAdapterConformanceCheckIds.estimateCostMethodValid, isCallable(adapter?.estimateCost));
  addCheck(checks, communicationAdapterConformanceCheckIds.checkReadinessMethodValid, isCallable(adapter?.checkReadiness));
  addCheck(checks, communicationAdapterConformanceCheckIds.dryRunMethodValid, isCallable(adapter?.dryRun));
  addCheck(checks, communicationAdapterConformanceCheckIds.executeMethodPresent, isCallable(adapter?.execute));

  const declaredCapabilities = safeArray(adapter?.capabilities);
  const supported = isCallable(adapter?.supports) && adapter.supports(capabilityId) === true;
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.capabilityDeclarationValid,
    declaredCapabilities.includes(capabilityId) && supported,
    { details: { capabilityId, declaredCapabilities, supported } }
  );

  let validation = null;
  if (isCallable(adapter?.validate)) {
    validation = adapter.validate(request);
  }
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.validationResultShapeValid,
    validation &&
      typeof validation === "object" &&
      typeof validation.ok === "boolean" &&
      Array.isArray(validation.errors),
    { details: { validationOk: validation?.ok ?? null } }
  );

  let costEstimate = null;
  if (isCallable(adapter?.estimateCost)) {
    costEstimate = adapter.estimateCost(request);
  }
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.costEstimateMetadataOnly,
    costEstimate &&
      typeof costEstimate === "object" &&
      costEstimate.billable !== true &&
      costEstimate.providerPricingFetched !== true &&
      zeroCounters(costEstimate),
    { details: { costEstimate } }
  );

  let readiness = null;
  if (isCallable(adapter?.checkReadiness)) {
    readiness = adapter.checkReadiness();
  }
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.readinessStateValid,
    readiness &&
      typeof readiness === "object" &&
      knownReadinessStates.has(readiness.readiness) &&
      readiness.credentialsResolved !== true,
    { details: { readiness: readiness?.readiness || null } }
  );

  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.executionGatewayRequired,
    options.gatewayDecision?.decision === "READY" &&
      options.gatewayDecision?.executed === false &&
      adapter?.gatewayBypassAttempt !== true &&
      adapter?.directExecutionAllowed !== true,
    { details: { gatewayDecision: options.gatewayDecision?.decision || null } }
  );

  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.noCredentialResolution,
    readiness?.credentialsResolved !== true &&
      adapter?.credentialsResolved !== true &&
      adapter?.credentialLookupAttempted !== true
  );

  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.noNetworkExecution,
    adapter?.networkTested !== true &&
      adapter?.externalCalls !== true &&
      adapter?.providerCalls !== true &&
      adapter?.sendActions !== true
  );

  return redactForTrace({
    adapterId: adapter?.adapterId || null,
    providerId: adapter?.providerId || null,
    capabilityId,
    phase: communicationAdapterConformancePhase,
    contractVersion: communicationAdapterConformanceContractVersion,
    supported,
    checks,
    failures: checks.filter((check) => !check.passed).map((check) => check.failureCode),
    warnings: checks.filter((check) => check.warningCode).map((check) => check.warningCode),
    readinessObserved: readiness?.readiness || null,
    validationObserved: validation ? { ok: validation.ok === true, errors: safeArray(validation.errors) } : null,
    costEstimate,
    gatewayRequired: true,
    liveExecutionTested: false,
    credentialsResolved: false,
    networkTested: false,
    providerVerified: false,
    liveReady: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0
  });
}

export function runCommunicationAdapterConformance(adapter = null, options = {}) {
  const capabilityId = options.capabilityId || communicationDeliveryCapabilities.email;
  const request = options.request || createHarnessRequest(capabilityId);
  const contract = validateCommunicationAdapterContract(adapter, {
    ...options,
    capabilityId,
    request
  });
  const checks = [...contract.checks];
  let dryRunResult = null;

  if (
    contract.supported === true &&
    options.gatewayDecision?.decision === "READY" &&
    options.gatewayDecision?.executed === false &&
    isCallable(adapter?.dryRun)
  ) {
    dryRunResult = adapter.dryRun(request);
  }

  const dryRunShapeValid = dryRunResult &&
    typeof dryRunResult === "object" &&
    typeof dryRunResult.status === "string";
  const dryRunStatusAllowed = dryRunShapeValid && allowedDryRunStatuses.has(dryRunResult.status);
  const dryRunStatusForbidden = dryRunShapeValid && liveDryRunStatuses.has(dryRunResult.status);
  const dryRunValidation = !dryRunShapeValid
    ? { ok: false, reason: "DRY_RUN_NOT_EXECUTED_OR_INVALID_SHAPE" }
    : dryRunStatusAllowed
      ? validateCommunicationDeliveryResult(dryRunResult, { dryRunOnly: true })
      : {
          ok: false,
          reason: dryRunStatusForbidden
            ? "LIVE_DELIVERY_RESULT_NOT_ALLOWED_IN_DRY_RUN"
            : "DRY_RUN_STATUS_UNSUPPORTED"
        };

  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.dryRunResultValid,
    dryRunShapeValid && dryRunValidation.ok === true,
    { failureCode: dryRunValidation.reason || "DRY_RUN_RESULT_INVALID", details: { status: dryRunResult?.status || null } }
  );
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.dryRunZeroSideEffects,
    dryRunShapeValid && zeroCounters(dryRunResult),
    { failureCode: "DRY_RUN_SIDE_EFFECT_COUNTER_VIOLATION", details: countersFrom(dryRunResult || {}) }
  );
  addCheck(
    checks,
    communicationAdapterConformanceCheckIds.liveResultStatusForbidden,
    !dryRunShapeValid || !dryRunStatusForbidden,
    { failureCode: "LIVE_DELIVERY_RESULT_NOT_ALLOWED_IN_DRY_RUN", details: { status: dryRunResult?.status || null } }
  );

  const status = deriveStatus({
    adapter,
    supported: contract.supported,
    readiness: { readiness: contract.readinessObserved },
    dryRunResult,
    checks
  });
  const failures = checks.filter((check) => !check.passed).map((check) => check.failureCode);
  const warnings = checks.filter((check) => check.warningCode).map((check) => check.warningCode);

  return redactForTrace({
    adapterId: adapter?.adapterId || null,
    providerId: adapter?.providerId || null,
    capabilityId,
    phase: communicationAdapterConformancePhase,
    contractVersion: communicationAdapterConformanceContractVersion,
    status,
    passed: status === communicationAdapterConformanceStatuses.contractCompatible,
    checks,
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)],
    readinessObserved: contract.readinessObserved,
    gatewayRequired: true,
    dryRunVerified: status === communicationAdapterConformanceStatuses.contractCompatible,
    liveExecutionTested: false,
    credentialsResolved: false,
    networkTested: false,
    providerVerified: false,
    liveReady: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    dryRunResultStatus: dryRunResult?.status || null,
    dryRunResultValidation: dryRunValidation
  });
}

export function createCommunicationAdapterConformanceAudit(input = {}) {
  const result = input.result || input;
  return redactForTrace({
    artifactType: "CommunicationAdapterConformanceAudit",
    phase: communicationAdapterConformancePhase,
    contractVersion: result.contractVersion || communicationAdapterConformanceContractVersion,
    adapterId: result.adapterId || null,
    providerId: result.providerId || null,
    capabilityId: result.capabilityId || null,
    status: result.status || null,
    passed: result.passed === true,
    checkResults: safeArray(result.checks).map((check) => ({
      checkId: check.checkId,
      passed: check.passed,
      failureCode: check.failureCode,
      warningCode: check.warningCode
    })),
    failureCodes: safeArray(result.failures),
    warningCodes: safeArray(result.warnings),
    gatewayRequired: true,
    dryRunOnly: true,
    credentialsResolved: false,
    networkTested: false,
    liveExecutionAllowed: false,
    providerVerified: false,
    liveReady: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    outreachActions: 0,
    createdAt: input.createdAt || new Date().toISOString()
  });
}
