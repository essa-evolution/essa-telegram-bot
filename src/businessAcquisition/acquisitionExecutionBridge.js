import {
  createAgentToolContract,
  toolCategories,
  toolCostClasses,
  toolEnvironments,
  toolPermissionClasses
} from "../agentToolLayer/contracts.js";
import { communicationDeliveryCapabilities } from "../agentToolLayer/communicationDelivery.js";
import { executionGateDecisions, prepareExecution } from "../agentToolLayer/executionGateway.js";
import {
  createExecutionIntentFromDecision,
  createExecutionQueue,
  executionIntentStatuses
} from "../agentToolLayer/executionQueue.js";
import { agentToolDecisions } from "../agentToolLayer/toolRequestBridge.js";
import {
  deliveryIntentStatuses,
  finalPreExecutionValidationStatuses
} from "./businessAcquisitionContracts.js";
import { finalPreExecutionValidation } from "./previewDelivery.js";

export const acquisitionExecutionBridgeVersion = "business-acquisition-execution-bridge-v1";

export const acquisitionExecutionBridgeStatuses = {
  dryRunAllowed: "DRY_RUN_ALLOWED",
  capabilityUnavailable: "CAPABILITY_UNAVAILABLE",
  approvalInvalid: "APPROVAL_INVALID",
  actionMutated: "ACTION_MUTATED",
  suppressed: "SUPPRESSED",
  optedOut: "OPTED_OUT",
  artifactInvalid: "ARTIFACT_INVALID",
  policyBlocked: "POLICY_BLOCKED",
  gatewayBlocked: "GATEWAY_BLOCKED",
  idempotentDuplicate: "IDEMPOTENT_DUPLICATE"
};

export const acquisitionDeliveryCapabilities = {
  emailDelivery: communicationDeliveryCapabilities.email,
  whatsappDelivery: communicationDeliveryCapabilities.whatsapp,
  telegramDelivery: communicationDeliveryCapabilities.telegram,
  businessDmDelivery: communicationDeliveryCapabilities.businessDm
};

const channelCapabilityMap = {
  EMAIL: acquisitionDeliveryCapabilities.emailDelivery,
  WHATSAPP: acquisitionDeliveryCapabilities.whatsappDelivery,
  TELEGRAM: acquisitionDeliveryCapabilities.telegramDelivery,
  BUSINESS_DM: acquisitionDeliveryCapabilities.businessDmDelivery
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function blockingStatus(reasonCodes = []) {
  const text = reasonCodes.join(" ");
  if (/SUPPRESSED/.test(text)) return acquisitionExecutionBridgeStatuses.suppressed;
  if (/OPT_OUT/.test(text)) return acquisitionExecutionBridgeStatuses.optedOut;
  if (/ARTIFACT/.test(text)) return acquisitionExecutionBridgeStatuses.artifactInvalid;
  if (/APPROVAL|FINGERPRINT|MESSAGE|RECIPIENT|CHANNEL|PREVIEW/.test(text)) {
    return acquisitionExecutionBridgeStatuses.actionMutated;
  }
  return acquisitionExecutionBridgeStatuses.policyBlocked;
}

export function createBusinessAcquisitionDeliveryDryRunTool(input = {}) {
  return createAgentToolContract({
    toolId: input.toolId || "business_acquisition.delivery.dry_run",
    providerId: input.providerId || "essa_business_acquisition_dry_run",
    category: toolCategories.includes("communication") ? "communication" : "research",
    capabilities: safeArray(input.capabilities || [acquisitionDeliveryCapabilities.emailDelivery]),
    permissions: [toolPermissionClasses.readOnly],
    readScope: ["business_acquisition_delivery_dry_run"],
    writeScope: [],
    externalSideEffects: false,
    costClass: toolCostClasses.none,
    requiresSecrets: false,
    environment: toolEnvironments.local,
    productionAccess: "deny_by_default",
    approvalRequired: false,
    executable: false,
    rollback: { supported: false, strategy: "dry_run_no_mutation" },
    adapter: { kind: "BusinessAcquisitionDeliveryDryRun", status: "dry_run_gateway_only" }
  });
}

export function resolveAcquisitionDeliveryCapability(channel, registry = []) {
  const requiredCapability = channelCapabilityMap[channel] || null;
  if (!requiredCapability) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.capabilityUnavailable,
      channel,
      requiredCapability: null,
      reason: "CHANNEL_HAS_NO_EXECUTION_CAPABILITY_MAPPING"
    };
  }
  const tool = registry.find((item) => safeArray(item.capabilities).includes(requiredCapability));
  if (!tool) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.capabilityUnavailable,
      channel,
      requiredCapability,
      reason: "CAPABILITY_UNAVAILABLE"
    };
  }
  return {
    ok: true,
    status: "CAPABILITY_AVAILABLE",
    channel,
    requiredCapability,
    toolId: tool.toolId,
    providerId: tool.providerId,
    providerExecutionAllowed: false
  };
}

export function createAcquisitionExecutionBridgeAudit(input = {}) {
  return {
    artifactType: "BusinessAcquisitionExecutionBridgeAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_G",
    bridgeVersion: acquisitionExecutionBridgeVersion,
    prospectId: input.prospectId || null,
    demoPlanId: input.demoPlanId || null,
    previewId: input.previewId || null,
    previewVersion: input.previewVersion || null,
    reviewId: input.reviewId || null,
    sharePackageId: input.sharePackageId || null,
    deliveryIntentId: input.deliveryIntentId || null,
    humanSendApprovalRef: input.humanSendApprovalRef || null,
    actionFingerprint: input.actionFingerprint || null,
    recipientEligibilityRef: input.recipientEligibilityRef || null,
    redactedRecipient: input.redactedRecipient || null,
    channel: input.channel || null,
    messageFingerprint: input.messageFingerprint || null,
    requiredCapability: input.requiredCapability || null,
    executionIntentId: input.executionIntentId || null,
    gatewayDecision: input.gatewayDecision || null,
    bridgeStatus: input.bridgeStatus || null,
    reasonCodes: safeArray(input.reasonCodes),
    lineage: input.lineage || {},
    executed: false,
    gatewayRequired: true,
    gatewayBypassAllowed: false,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    sendActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0,
    createdAt: input.createdAt || new Date().toISOString()
  };
}

export function buildAcquisitionExecutionIntent({
  deliveryIntent = {},
  approval = {},
  finalValidation = {},
  capabilityMapping = {},
  context = {}
} = {}) {
  const normalizedInput = {
    scope: "business_acquisition_delivery_dry_run",
    operation: "prepare_future_delivery",
    dryRun: true,
    providerExecutionAllowed: false,
    acquisition: {
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      sharePackageId: deliveryIntent.sharePackageId,
      previewId: deliveryIntent.previewId,
      previewVersion: deliveryIntent.previewVersion,
      actionFingerprint: approval.actionFingerprint,
      humanSendApprovalRef: approval.sendApprovalId,
      recipientEligibilityRef: deliveryIntent.recipientEligibilityRef,
      redactedRecipient: deliveryIntent.redactedRecipient,
      artifactIntegrityRefs: deliveryIntent.artifactIntegrityRefs,
      channel: deliveryIntent.channel,
      messageFingerprint: deliveryIntent.messageFingerprint,
      finalValidationRef: finalValidation.validationId
    }
  };
  const result = {
    request: {
      requestId: `acquisition_bridge_${deliveryIntent.deliveryIntentId}`,
      taskId: context.taskId || null,
      goalId: context.goalId || null,
      projectId: context.projectId || null,
      workflowId: context.workflowId || null,
      toolId: capabilityMapping.toolId,
      capability: capabilityMapping.requiredCapability,
      action: "prepare_future_delivery",
      input: normalizedInput,
      environment: toolEnvironments.local,
      permissionLevel: toolPermissionClasses.readOnly,
      sourceArtifactRefs: [
        deliveryIntent.sharePackageId,
        deliveryIntent.deliveryIntentId,
        approval.sendApprovalId
      ].filter(Boolean),
      targetArtifactRefs: [],
      requestedByAgent: "business_acquisition_execution_bridge",
      traceId: `acquisition_bridge_trace_${deliveryIntent.deliveryIntentId}`
    },
    decision: {
      requestId: `acquisition_bridge_${deliveryIntent.deliveryIntentId}`,
      toolId: capabilityMapping.toolId,
      decision: agentToolDecisions.allow,
      normalizedInput,
      environmentCheck: { environment: toolEnvironments.local },
      permissionCheck: { registryPermissionLevel: toolPermissionClasses.readOnly },
      costCheck: { registryCost: toolCostClasses.none }
    }
  };
  const intent = createExecutionIntentFromDecision(result, {
    idempotencyKey: `business_acquisition_delivery::${approval.actionFingerprint}`,
    expiresAt: approval.expiresAt || undefined
  });
  return {
    ...intent,
    bridgeVersion: acquisitionExecutionBridgeVersion,
    acquisitionActionFingerprint: approval.actionFingerprint
  };
}

export function bridgeApprovedAcquisitionDeliveryToExecution(input = {}) {
  const {
    deliveryIntent = {},
    approval = null,
    registry = [],
    executionProviders = [],
    existingQueue = null,
    existingExecutionHistory = [],
    allowProviderExecution = false
  } = input;

  if (allowProviderExecution === true) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.policyBlocked,
      reasonCodes: ["PROVIDER_EXECUTION_NOT_ALLOWED_PHASE_G"],
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }
  if (deliveryIntent.status && deliveryIntent.status !== deliveryIntentStatuses.approvedForFutureDelivery) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.policyBlocked,
      reasonCodes: ["DELIVERY_ACTION_NOT_APPROVED_FOR_FUTURE_DELIVERY"],
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }

  const finalValidation = finalPreExecutionValidation(input);
  if (finalValidation.status !== finalPreExecutionValidationStatuses.approvedForFutureDelivery) {
    const reasonCodes = finalValidation.reasonCodes || [];
    return {
      ok: false,
      status: finalValidation.status === finalPreExecutionValidationStatuses.requiresReapproval
        ? acquisitionExecutionBridgeStatuses.actionMutated
        : finalValidation.status === finalPreExecutionValidationStatuses.revoked || finalValidation.status === finalPreExecutionValidationStatuses.expired
          ? acquisitionExecutionBridgeStatuses.approvalInvalid
          : blockingStatus(reasonCodes),
      reasonCodes,
      finalValidation,
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }

  const capabilityMapping = resolveAcquisitionDeliveryCapability(deliveryIntent.channel, registry);
  if (!capabilityMapping.ok) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.capabilityUnavailable,
      reasonCodes: [capabilityMapping.reason],
      finalValidation,
      capabilityMapping,
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }

  const executionIntent = buildAcquisitionExecutionIntent({
    deliveryIntent,
    approval,
    finalValidation,
    capabilityMapping,
    context: input.context || {}
  });

  if (executionIntent.status !== executionIntentStatuses.readyForExecution) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.gatewayBlocked,
      reasonCodes: ["EXECUTION_INTENT_NOT_READY_FOR_GATEWAY"],
      finalValidation,
      capabilityMapping,
      executionIntent,
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }

  const queue = existingQueue || createExecutionQueue();
  const enqueueResult = queue.enqueue(executionIntent);
  if (!enqueueResult.ok) {
    return {
      ok: false,
      status: acquisitionExecutionBridgeStatuses.gatewayBlocked,
      reasonCodes: [enqueueResult.reason],
      finalValidation,
      capabilityMapping,
      executionIntent: enqueueResult.intent || executionIntent,
      providerCalls: 0,
      externalCalls: 0,
      sendActions: 0
    };
  }

  const gatewayDecision = prepareExecution(enqueueResult.intent, {
    queue,
    registry,
    executionProviders,
    executionHistory: existingExecutionHistory,
    expectedProjectId: input.context?.projectId,
    expectedTaskId: input.context?.taskId
  });
  const status = enqueueResult.duplicate
    ? acquisitionExecutionBridgeStatuses.idempotentDuplicate
    : gatewayDecision.decision === executionGateDecisions.ready
      ? acquisitionExecutionBridgeStatuses.dryRunAllowed
      : acquisitionExecutionBridgeStatuses.gatewayBlocked;
  const audit = createAcquisitionExecutionBridgeAudit({
    prospectId: deliveryIntent.prospectId,
    demoPlanId: input.generatedPreview?.demoPlanId,
    previewId: deliveryIntent.previewId,
    previewVersion: deliveryIntent.previewVersion,
    reviewId: input.review?.reviewId,
    sharePackageId: deliveryIntent.sharePackageId,
    deliveryIntentId: deliveryIntent.deliveryIntentId,
    humanSendApprovalRef: approval.sendApprovalId,
    actionFingerprint: approval.actionFingerprint,
    recipientEligibilityRef: deliveryIntent.recipientEligibilityRef,
    redactedRecipient: deliveryIntent.redactedRecipient,
    channel: deliveryIntent.channel,
    messageFingerprint: deliveryIntent.messageFingerprint,
    requiredCapability: capabilityMapping.requiredCapability,
    executionIntentId: enqueueResult.intent.executionIntentId,
    gatewayDecision,
    bridgeStatus: status,
    reasonCodes: gatewayDecision.decision === executionGateDecisions.ready ? [] : [gatewayDecision.reason],
    lineage: {
      prospectId: deliveryIntent.prospectId,
      demoPlanId: input.generatedPreview?.demoPlanId || null,
      previewId: deliveryIntent.previewId,
      previewVersion: deliveryIntent.previewVersion,
      reviewId: input.review?.reviewId || null,
      sharePackageId: deliveryIntent.sharePackageId,
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      humanSendApprovalRef: approval.sendApprovalId,
      executionIntentId: enqueueResult.intent.executionIntentId
    }
  });

  return {
    ok: gatewayDecision.decision === executionGateDecisions.ready,
    duplicate: enqueueResult.duplicate,
    status,
    finalValidation,
    capabilityMapping,
    executionIntent: enqueueResult.intent,
    enqueueResult,
    gatewayDecision,
    audit,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    outreachActions: 0,
    publishActions: 0,
    paymentActions: 0,
    productionHandoffs: 0
  };
}
