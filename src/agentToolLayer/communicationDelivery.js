import { hasSecretLikeValue, redactForTrace } from "./policy.js";

export const communicationDeliveryCapabilities = {
  email: "EMAIL_DELIVERY",
  whatsapp: "WHATSAPP_DELIVERY",
  telegram: "TELEGRAM_DELIVERY",
  businessDm: "BUSINESS_DM_DELIVERY"
};

export const communicationDeliveryResultStatuses = {
  notExecuted: "NOT_EXECUTED",
  dryRunValidated: "DRY_RUN_VALIDATED",
  deliveryAccepted: "DELIVERY_ACCEPTED",
  deliveryRejected: "DELIVERY_REJECTED",
  deliveryFailed: "DELIVERY_FAILED"
};

export const communicationProviderReadinessStates = {
  available: "AVAILABLE",
  degraded: "DEGRADED",
  unavailable: "UNAVAILABLE",
  notConfigured: "NOT_CONFIGURED",
  disabled: "DISABLED"
};

export const communicationRoutingStatuses = {
  selected: "SELECTED",
  capabilityUnavailable: "CAPABILITY_UNAVAILABLE",
  providerNotConfigured: "PROVIDER_NOT_CONFIGURED",
  providerDisabled: "PROVIDER_DISABLED",
  gatewayRequired: "GATEWAY_REQUIRED",
  liveExecutionBlocked: "LIVE_EXECUTION_BLOCKED",
  invalidRequest: "INVALID_REQUEST",
  invalidResult: "INVALID_RESULT"
};

export const communicationDeliveryPolicyVersion = "communication-delivery-boundary-v1";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hasVendorField(value = {}) {
  return /\b(sendgrid|resend|mailgun|twilio|meta|telegram bot api|providerName|providerVendor|vendorName)\b/i.test(
    JSON.stringify(value || {})
  );
}

export function createCommunicationDeliveryRequest(input = {}) {
  const acquisition = input.acquisition || input.executionIntent?.normalizedInput?.acquisition || {};
  return redactForTrace({
    modelType: "CommunicationDeliveryRequest",
    deliveryRequestId: input.deliveryRequestId || createId("communication_delivery_request"),
    executionIntentId: input.executionIntentId || input.executionIntent?.executionIntentId || null,
    capabilityType: input.capabilityType || input.executionIntent?.capability || communicationDeliveryCapabilities.email,
    recipientRef: input.recipientRef || acquisition.recipientEligibilityRef || null,
    recipientAddressProjection: input.recipientAddressProjection || acquisition.redactedRecipient || null,
    messageSubject: input.messageSubject || null,
    messageBody: input.messageBody || null,
    artifactRefs: safeArray(input.artifactRefs || acquisition.artifactIntegrityRefs),
    messageFingerprint: input.messageFingerprint || acquisition.messageFingerprint || null,
    actionFingerprint: input.actionFingerprint || acquisition.actionFingerprint || null,
    idempotencyKey: input.idempotencyKey || input.executionIntent?.idempotencyKey || null,
    approvalRef: input.approvalRef || acquisition.humanSendApprovalRef || null,
    metadata: {
      ...(input.metadata || {}),
      bridgeVersion: input.executionIntent?.bridgeVersion || null,
      source: "ExecutionIntent"
    },
    createdAt: input.createdAt || new Date().toISOString()
  });
}

export function createCommunicationDeliveryResult(input = {}) {
  return redactForTrace({
    modelType: "CommunicationDeliveryResult",
    deliveryResultId: input.deliveryResultId || createId("communication_delivery_result"),
    deliveryRequestId: input.deliveryRequestId,
    executionIntentId: input.executionIntentId || null,
    capabilityType: input.capabilityType || null,
    status: input.status || communicationDeliveryResultStatuses.notExecuted,
    providerAdapterId: input.providerAdapterId || null,
    providerExecutionRef: null,
    providerMessageRef: null,
    acceptedAt: null,
    deliveredAt: null,
    failureCode: input.failureCode || null,
    retryable: input.retryable === true,
    dryRun: input.dryRun !== false,
    externalExecution: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    outreachActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    validation: input.validation || {},
    createdAt: input.createdAt || new Date().toISOString()
  });
}

export function validateCommunicationDeliveryRequest(request = {}, options = {}) {
  const errors = [];
  const allowedCapabilities = Object.values(communicationDeliveryCapabilities);
  if (!allowedCapabilities.includes(request.capabilityType)) errors.push("CAPABILITY_UNAVAILABLE");
  if (!request.executionIntentId) errors.push("EXECUTION_INTENT_REQUIRED");
  if (!request.actionFingerprint) errors.push("ACTION_FINGERPRINT_REQUIRED");
  if (!request.messageFingerprint) errors.push("MESSAGE_FINGERPRINT_REQUIRED");
  if (!request.idempotencyKey) errors.push("IDEMPOTENCY_KEY_REQUIRED");
  if (!request.approvalRef) errors.push("APPROVAL_REF_REQUIRED");
  if (hasSecretLikeValue(request)) errors.push("CREDENTIAL_LIKE_VALUE_BLOCKED");
  if (hasVendorField(request) || hasVendorField(options.rawInput)) errors.push("VENDOR_SELECTION_NOT_ALLOWED_AT_DOMAIN_BOUNDARY");
  if (options.liveExecutionRequested === true) errors.push("LIVE_EXECUTION_BLOCKED_PHASE_H");
  return {
    ok: errors.length === 0,
    errors,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0
  };
}

export function validateCommunicationDeliveryResult(result = {}, { dryRunOnly = true } = {}) {
  const liveOnly = new Set([
    communicationDeliveryResultStatuses.deliveryAccepted,
    communicationDeliveryResultStatuses.deliveryRejected,
    communicationDeliveryResultStatuses.deliveryFailed,
    "SENT",
    "DELIVERED"
  ]);
  if (dryRunOnly && liveOnly.has(result.status)) {
    return { ok: false, reason: "LIVE_DELIVERY_RESULT_NOT_ALLOWED_IN_DRY_RUN" };
  }
  if (result.externalExecution === true || result.providerCalls > 0 || result.sendActions > 0) {
    return { ok: false, reason: "DRY_RUN_SIDE_EFFECT_COUNTER_VIOLATION" };
  }
  return { ok: true, reason: null };
}

export function createCommunicationProviderAdapter(input = {}) {
  return {
    adapterId: input.adapterId,
    providerId: input.providerId || null,
    capabilities: safeArray(input.capabilities),
    readiness: input.readiness || communicationProviderReadinessStates.notConfigured,
    dryRunOnly: input.dryRunOnly !== false,
    supportsLiveExecution: input.supportsLiveExecution === true,
    supports(capability) {
      return this.capabilities.includes(capability);
    },
    validate(request) {
      return validateCommunicationDeliveryRequest(request);
    },
    estimateCost() {
      return {
        costClass: "LOCAL_DRY_RUN",
        estimatedAmount: 0,
        currency: null,
        billable: false,
        providerPricingFetched: false
      };
    },
    checkReadiness() {
      return {
        readiness: this.readiness,
        credentialsResolved: false,
        liveProviderConfigured: false
      };
    },
    dryRun(request) {
      const validation = this.validate(request);
      if (!validation.ok) {
        return createCommunicationDeliveryResult({
          deliveryRequestId: request.deliveryRequestId,
          executionIntentId: request.executionIntentId,
          capabilityType: request.capabilityType,
          providerAdapterId: this.adapterId,
          status: communicationDeliveryResultStatuses.notExecuted,
          failureCode: validation.errors.join("|"),
          validation
        });
      }
      return createCommunicationDeliveryResult({
        deliveryRequestId: request.deliveryRequestId,
        executionIntentId: request.executionIntentId,
        capabilityType: request.capabilityType,
        providerAdapterId: this.adapterId,
        status: communicationDeliveryResultStatuses.dryRunValidated,
        validation
      });
    },
    execute() {
      return createCommunicationDeliveryResult({
        providerAdapterId: this.adapterId,
        status: communicationDeliveryResultStatuses.notExecuted,
        failureCode: "EXECUTE_DISABLED_PHASE_H",
        validation: { ok: false, errors: ["EXECUTE_DISABLED_PHASE_H"] }
      });
    }
  };
}

export function createLocalCommunicationDryRunAdapter(input = {}) {
  return createCommunicationProviderAdapter({
    adapterId: input.adapterId || "LOCAL_COMMUNICATION_DRY_RUN_ADAPTER",
    providerId: "LOCAL_COMMUNICATION_DRY_RUN",
    capabilities: safeArray(input.capabilities || Object.values(communicationDeliveryCapabilities)),
    readiness: input.readiness || communicationProviderReadinessStates.available,
    dryRunOnly: true,
    supportsLiveExecution: false
  });
}

export function selectCommunicationProviderAdapter(request = {}, adapters = [], options = {}) {
  if (options.gatewayDecision?.executed !== false || options.gatewayDecision?.decision !== "READY") {
    return {
      ok: false,
      status: communicationRoutingStatuses.gatewayRequired,
      reason: "EXECUTION_GATEWAY_READY_DECISION_REQUIRED"
    };
  }
  if (options.liveExecutionRequested === true) {
    return {
      ok: false,
      status: communicationRoutingStatuses.liveExecutionBlocked,
      reason: "LIVE_EXECUTION_BLOCKED_PHASE_H"
    };
  }
  const adapter = adapters.find((item) => item.supports(request.capabilityType));
  if (!adapter) {
    return {
      ok: false,
      status: communicationRoutingStatuses.capabilityUnavailable,
      reason: "CAPABILITY_UNAVAILABLE"
    };
  }
  const readiness = adapter.checkReadiness();
  if (readiness.readiness === communicationProviderReadinessStates.disabled) {
    return { ok: false, status: communicationRoutingStatuses.providerDisabled, reason: "PROVIDER_DISABLED", adapter, readiness };
  }
  if (readiness.readiness === communicationProviderReadinessStates.notConfigured) {
    return { ok: false, status: communicationRoutingStatuses.providerNotConfigured, reason: "PROVIDER_NOT_CONFIGURED", adapter, readiness };
  }
  return {
    ok: true,
    status: communicationRoutingStatuses.selected,
    adapter,
    readiness,
    costEstimate: adapter.estimateCost(request),
    selectionReason: "LOCAL_DRY_RUN_ONLY_DETERMINISTIC_SELECTION"
  };
}

export function runCommunicationDeliveryDryRun({
  executionIntent = {},
  gatewayDecision = null,
  adapters = [],
  rawInput = {},
  liveExecutionRequested = false,
  existingRequests = []
} = {}) {
  const request = createCommunicationDeliveryRequest({ executionIntent, ...rawInput });
  const validation = validateCommunicationDeliveryRequest(request, { rawInput, liveExecutionRequested });
  if (!validation.ok) {
    return {
      ok: false,
      status: communicationRoutingStatuses.invalidRequest,
      request,
      reasonCodes: validation.errors,
      result: createCommunicationDeliveryResult({
        deliveryRequestId: request.deliveryRequestId,
        executionIntentId: request.executionIntentId,
        capabilityType: request.capabilityType,
        status: communicationDeliveryResultStatuses.notExecuted,
        failureCode: validation.errors.join("|"),
        validation
      }),
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }
  const existing = existingRequests.find((item) => item.idempotencyKey === request.idempotencyKey);
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      status: communicationDeliveryResultStatuses.dryRunValidated,
      request: existing.request,
      result: existing.result,
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }
  const selection = selectCommunicationProviderAdapter(request, adapters, { gatewayDecision, liveExecutionRequested });
  if (!selection.ok) {
    return {
      ok: false,
      status: selection.status,
      request,
      selection,
      result: createCommunicationDeliveryResult({
        deliveryRequestId: request.deliveryRequestId,
        executionIntentId: request.executionIntentId,
        capabilityType: request.capabilityType,
        status: communicationDeliveryResultStatuses.notExecuted,
        failureCode: selection.reason,
        validation: { ok: false, errors: [selection.reason] }
      }),
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }
  const result = selection.adapter.dryRun(request);
  const resultValidation = validateCommunicationDeliveryResult(result);
  if (!resultValidation.ok) {
    return {
      ok: false,
      status: communicationRoutingStatuses.invalidResult,
      request,
      selection,
      result,
      reasonCodes: [resultValidation.reason],
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }
  return {
    ok: true,
    duplicate: false,
    status: result.status,
    request,
    selection,
    result,
    audit: createCommunicationDeliveryAudit({ request, result, selection, gatewayDecision }),
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    outreachActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}

export function createCommunicationDeliveryAudit(input = {}) {
  return redactForTrace({
    artifactType: "CommunicationDeliveryBoundaryAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_H",
    policyVersion: communicationDeliveryPolicyVersion,
    executionIntentId: input.request?.executionIntentId || null,
    deliveryRequestId: input.request?.deliveryRequestId || null,
    capabilityType: input.request?.capabilityType || null,
    adapterId: input.selection?.adapter?.adapterId || null,
    providerId: input.selection?.adapter?.providerId || null,
    providerReadiness: input.selection?.readiness?.readiness || null,
    estimatedCost: input.selection?.costEstimate || null,
    actionFingerprint: input.request?.actionFingerprint || null,
    approvalRef: input.request?.approvalRef || null,
    idempotencyKey: input.request?.idempotencyKey || null,
    dryRunResult: input.result?.status || null,
    gatewayDecision: input.gatewayDecision ? {
      decision: input.gatewayDecision.decision,
      executed: input.gatewayDecision.executed,
      reason: input.gatewayDecision.reason
    } : null,
    credentialsResolved: false,
    externalExecution: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    outreachActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    createdAt: new Date().toISOString()
  });
}
