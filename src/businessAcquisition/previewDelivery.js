import crypto from "node:crypto";

import { leadFreshnessStates } from "../leadIntelligence/leadContracts.js";
import {
  acquisitionLifecycleStates,
  createDeliveryIntentAudit,
  createDeliveryIntentDraft,
  createDeliveryMessagePreview,
  createDeliveryPreflight,
  createFinalPreExecutionValidation,
  createHumanSendApproval,
  deliveryChannelPlanningStatuses,
  deliveryChannels,
  deliveryIntentStatuses,
  deliveryPreflightStatuses,
  finalPreExecutionValidationStatuses,
  humanSendApprovalStatuses,
  recipientEligibilityStatuses,
  sharePreparationStatuses
} from "./businessAcquisitionContracts.js";
import { checkRecipientEligibility, evaluateSharePackageAccess } from "./previewSharing.js";

export const previewDeliveryPolicyVersion = "business-acquisition-preview-delivery-v1";

const blockedProspectStates = new Set([
  acquisitionLifecycleStates.rejectedNotFit,
  acquisitionLifecycleStates.rejectedInsufficientEvidence,
  acquisitionLifecycleStates.rejectedPolicy,
  acquisitionLifecycleStates.suppressedDoNotContact,
  acquisitionLifecycleStates.duplicate,
  acquisitionLifecycleStates.declined,
  acquisitionLifecycleStates.abandoned,
  acquisitionLifecycleStates.staleReviewRequired
]);

const allowedDeliveryTransitions = {
  [deliveryIntentStatuses.draft]: new Set([
    deliveryIntentStatuses.preflightReady,
    deliveryIntentStatuses.blocked
  ]),
  [deliveryIntentStatuses.preflightReady]: new Set([
    deliveryIntentStatuses.awaitingHumanApproval,
    deliveryIntentStatuses.blocked
  ]),
  [deliveryIntentStatuses.awaitingHumanApproval]: new Set([
    deliveryIntentStatuses.humanApproved,
    deliveryIntentStatuses.rejected,
    deliveryIntentStatuses.expired,
    deliveryIntentStatuses.revoked
  ]),
  [deliveryIntentStatuses.humanApproved]: new Set([
    deliveryIntentStatuses.finalValidationPassed,
    deliveryIntentStatuses.requiresReapproval,
    deliveryIntentStatuses.blocked,
    deliveryIntentStatuses.expired,
    deliveryIntentStatuses.revoked
  ]),
  [deliveryIntentStatuses.finalValidationPassed]: new Set([
    deliveryIntentStatuses.approvedForFutureDelivery,
    deliveryIntentStatuses.requiresReapproval,
    deliveryIntentStatuses.blocked,
    deliveryIntentStatuses.expired,
    deliveryIntentStatuses.revoked
  ]),
  [deliveryIntentStatuses.approvedForFutureDelivery]: new Set([
    deliveryIntentStatuses.requiresReapproval,
    deliveryIntentStatuses.blocked,
    deliveryIntentStatuses.expired,
    deliveryIntentStatuses.revoked
  ]),
  [deliveryIntentStatuses.blocked]: new Set([]),
  [deliveryIntentStatuses.rejected]: new Set([]),
  [deliveryIntentStatuses.revoked]: new Set([]),
  [deliveryIntentStatuses.expired]: new Set([]),
  [deliveryIntentStatuses.requiresReapproval]: new Set([])
};

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortObject(value[key]);
    return acc;
  }, {});
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(sortObject(value))).digest("hex");
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function addDaysIso(days = 3, now = new Date()) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function redactedRecipient(recipient = {}) {
  const value = String(recipient.value || recipient.recipientRef || "");
  if (!value) return null;
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 4)}***`;
}

function prospectSuppressed(prospect = {}) {
  return Boolean(
    prospect.suppressionStatus ||
    blockedProspectStates.has(prospect.lifecycleState) ||
    prospect.dataFreshness === leadFreshnessStates.stale
  );
}

function materialArtifactRefs(refs = []) {
  return safeArray(refs).map((ref) => ({
    artifactName: ref.artifactName,
    previewId: ref.previewId,
    previewVersion: ref.previewVersion,
    hashAlgorithm: ref.hashAlgorithm,
    hash: ref.hash || null
  }));
}

export function validateDeliveryStateTransition(fromState, toState) {
  return {
    ok: allowedDeliveryTransitions[fromState]?.has(toState) === true,
    fromState,
    toState,
    reason: allowedDeliveryTransitions[fromState]?.has(toState) ? null : "DELIVERY_TRANSITION_NOT_ALLOWED"
  };
}

export function getDeliveryChannelPolicy(channel = deliveryChannels.email) {
  const policies = {
    [deliveryChannels.email]: {
      channel: deliveryChannels.email,
      planningStatus: deliveryChannelPlanningStatuses.supportedForPlanning,
      requiresProviderLater: true,
      futureCapability: "business_acquisition_email_delivery",
      providerExecutionAllowed: false
    },
    [deliveryChannels.whatsapp]: {
      channel: deliveryChannels.whatsapp,
      planningStatus: deliveryChannelPlanningStatuses.requiresProviderLater,
      requiresProviderLater: true,
      futureCapability: "business_acquisition_whatsapp_delivery",
      providerExecutionAllowed: false
    },
    [deliveryChannels.telegram]: {
      channel: deliveryChannels.telegram,
      planningStatus: deliveryChannelPlanningStatuses.requiresProviderLater,
      requiresProviderLater: true,
      futureCapability: "business_acquisition_telegram_delivery",
      providerExecutionAllowed: false
    },
    [deliveryChannels.businessDm]: {
      channel: deliveryChannels.businessDm,
      planningStatus: deliveryChannelPlanningStatuses.requiresProviderLater,
      requiresProviderLater: true,
      futureCapability: "business_acquisition_business_dm_delivery",
      providerExecutionAllowed: false
    }
  };
  return policies[channel] || {
    channel,
    planningStatus: deliveryChannelPlanningStatuses.blocked,
    requiresProviderLater: false,
    futureCapability: null,
    providerExecutionAllowed: false,
    reason: "CHANNEL_NOT_SUPPORTED_FOR_PLANNING"
  };
}

export function createMessageFingerprint(messagePreview = {}) {
  return stableHash({
    subject: messagePreview.subject || null,
    body: messagePreview.body || "",
    claims: messagePreview.claims || [],
    evidenceRefs: messagePreview.evidenceRefs || [],
    reasoningRefs: messagePreview.reasoningRefs || []
  });
}

export function createActionFingerprint(input = {}) {
  return stableHash({
    policyVersion: previewDeliveryPolicyVersion,
    sharePackageId: input.sharePackageId,
    previewId: input.previewId,
    previewVersion: input.previewVersion,
    recipientRef: input.recipientRef,
    recipientEligibilityRef: input.recipientEligibilityRef,
    channel: input.channel,
    messageFingerprint: input.messageFingerprint,
    artifactIntegrityRefs: materialArtifactRefs(input.artifactIntegrityRefs),
    accessPolicyRef: input.accessPolicyRef || null,
    accessPolicyVersion: input.accessPolicyVersion || "phase_e_share_access_policy_v1"
  });
}

export function evaluateMessageFactuality(messagePreview = {}) {
  const text = `${messagePreview.subject || ""}\n${messagePreview.body || ""}`;
  const blockedClaims = [...safeArray(messagePreview.blockedClaims)];
  const patterns = [
    [/guaranteed|guarantee|100%|double your|triple your|instant revenue/i, "GUARANTEED_OUTCOME_CLAIM"],
    [/as we discussed|following our conversation|as promised/i, "FAKE_PRIOR_RELATIONSHIP"],
    [/(^|[^a-z])(?:your new official site|official website is ready|this is your official website|we are your agency)([^a-z]|$)/i, "MISLEADING_OFFICIAL_STATUS"],
    [/limited time|expires today|only today|urgent/i, "FAKE_URGENCY"],
    [/testimonial|customer review|five star|5-star|award-winning/i, "UNSUPPORTED_SOCIAL_PROOF"],
    [/discount|coupon|free forever/i, "INVENTED_COMMERCIAL_TERMS"],
    [/(^|[^a-z])(?:personal mobile|personal email|private phone|home address|family)([^a-z]|$)/i, "SENSITIVE_PERSONAL_REFERENCE"]
  ];
  for (const [pattern, code] of patterns) {
    if (pattern.test(text)) blockedClaims.push(code);
  }

  const claims = safeArray(messagePreview.claims);
  const unsupported = claims
    .filter((claim) => claim.material !== false)
    .filter((claim) => !claim.evidenceRef && !claim.reasoningRef && claim.claimType !== "BOUNDED_INFERENCE")
    .map((claim) => claim.claimId || "UNTRACEABLE_CLAIM");

  return {
    ok: blockedClaims.length === 0 && unsupported.length === 0,
    status: blockedClaims.length || unsupported.length ? "BLOCKED" : "PASS",
    blockedClaims,
    unsupportedClaims: unsupported,
    evidenceRefs: claims.map((claim) => claim.evidenceRef).filter(Boolean),
    reasoningRefs: claims.map((claim) => claim.reasoningRef).filter(Boolean)
  };
}

export function createDeterministicMessagePreview({
  prospect = {},
  digitalAudit = {},
  sharePackage = {},
  channel = deliveryChannels.email,
  messageOverride = null
} = {}) {
  const businessName = prospect.legalOrDisplayName || "your business";
  const observedOpportunity = safeArray(digitalAudit.inferredOpportunities)[0] ||
    "a clearer digital path for prospective customers";
  const sourceRef = prospect.sourceRefs?.[0]?.sourceId || prospect.sourceRefs?.[0]?.sourceRef || digitalAudit.auditId || "public_business_context";
  const subject = messageOverride?.subject || `ESSA demo concept for ${businessName}`;
  const body = messageOverride?.body || [
    `Hi ${businessName} team,`,
    "",
    `ESSA prepared a small demo/concept showing ${observedOpportunity}.`,
    `It is not your official website and it has not been published; it is only a private preview concept for review.`,
    "If useful, the next step would be for a human to share the preview link or details with your business contact."
  ].join("\n");
  const base = createDeliveryMessagePreview({
    prospectId: prospect.prospectId,
    previewId: sharePackage.previewId,
    previewVersion: sharePackage.previewVersion,
    channel,
    subject,
    body,
    claims: messageOverride?.claims || [
      {
        claimId: "business_name",
        claimType: "FACT",
        text: "Business name comes from public prospect context.",
        evidenceRef: sourceRef
      },
      {
        claimId: "demo_exists",
        claimType: "FACT",
        text: "ESSA has a local demo/concept package for this preview.",
        evidenceRef: sharePackage.sharePackageId
      },
      {
        claimId: "opportunity_reference",
        claimType: "BOUNDED_INFERENCE",
        text: "Digital opportunity is derived from bounded audit context.",
        reasoningRef: digitalAudit.auditId || "digital_opportunity_audit"
      },
      {
        claimId: "not_official",
        claimType: "FACT",
        text: "Preview is explicitly not the official website.",
        evidenceRef: sharePackage.sharePackageId
      }
    ],
    evidenceRefs: [sourceRef, sharePackage.sharePackageId].filter(Boolean),
    reasoningRefs: [digitalAudit.auditId].filter(Boolean)
  });
  const factuality = evaluateMessageFactuality(base);
  const messageFingerprint = createMessageFingerprint(base);
  return {
    ...base,
    blockedClaims: factuality.blockedClaims,
    factualityStatus: factuality.status,
    messageFingerprint
  };
}

export function createControlledDeliveryIntent({
  prospect = {},
  sharePackage = {},
  recipient = {},
  recipientEligibility = null,
  messagePreview = null,
  digitalAudit = {},
  channel = deliveryChannels.email,
  request = {},
  existingIntents = []
} = {}) {
  const effectiveMessage = messagePreview || createDeterministicMessagePreview({ prospect, digitalAudit, sharePackage, channel });
  const effectiveEligibility = recipientEligibility || checkRecipientEligibility({ prospect, recipient });
  const channelPolicy = getDeliveryChannelPolicy(channel);
  const idempotencyKey = request.idempotencyKey || stableHash({
    sharePackageId: sharePackage.sharePackageId,
    previewId: sharePackage.previewId,
    previewVersion: sharePackage.previewVersion,
    recipientRef: effectiveEligibility.recipientRef || recipient.recipientRef || recipient.value,
    recipientEligibilityRef: effectiveEligibility.recipientEligibilityId,
    channel,
    messageFingerprint: effectiveMessage.messageFingerprint
  });
  const existing = existingIntents.find((item) => item.idempotencyKey === idempotencyKey);
  if (existing) return { ok: true, duplicate: true, intent: existing, messagePreview: effectiveMessage, recipientEligibility: effectiveEligibility };

  const intent = createDeliveryIntentDraft({
    prospectId: prospect.prospectId || sharePackage.prospectId,
    sharePackageId: sharePackage.sharePackageId,
    previewId: sharePackage.previewId,
    previewVersion: sharePackage.previewVersion,
    recipientEligibilityRef: effectiveEligibility.recipientEligibilityId || sharePackage.recipientEligibilityRef,
    recipientRef: effectiveEligibility.recipientRef || recipient.recipientRef || recipient.value || null,
    redactedRecipient: effectiveEligibility.redactedRecipient || redactedRecipient(recipient),
    channel,
    channelPolicy,
    messageDraftRef: effectiveMessage.messagePreviewId,
    messageFingerprint: effectiveMessage.messageFingerprint,
    artifactIntegrityRefs: sharePackage.artifactIntegrityRefs || [],
    accessPolicyRef: sharePackage.accessPolicyRef,
    requestedBy: request.requestedBy || "local_operator",
    requestedAt: request.requestedAt,
    status: deliveryIntentStatuses.draft,
    idempotencyKey
  });
  return { ok: true, duplicate: false, intent, messagePreview: effectiveMessage, recipientEligibility: effectiveEligibility };
}

export function runDeliveryPreflight({
  prospect = {},
  sharePackage = {},
  generatedPreview = {},
  review = {},
  recipient = {},
  recipientEligibility = null,
  accessPolicy = {},
  deliveryIntent = {},
  messagePreview = {},
  currentArtifactIntegrityRefs = null,
  now = new Date()
} = {}) {
  const reasonCodes = [];
  const warnings = [];
  const access = evaluateSharePackageAccess(sharePackage, { now, canonicalPreview: generatedPreview });
  const eligibility = recipientEligibility || checkRecipientEligibility({ prospect, recipient });
  const channelPolicy = getDeliveryChannelPolicy(deliveryIntent.channel || messagePreview.channel);
  const factuality = evaluateMessageFactuality(messagePreview);
  const expectedArtifacts = materialArtifactRefs(sharePackage.artifactIntegrityRefs || []);
  const currentArtifacts = materialArtifactRefs(currentArtifactIntegrityRefs || sharePackage.artifactIntegrityRefs || []);
  const artifactIntegrityValid = stableHash(expectedArtifacts) === stableHash(currentArtifacts) &&
    expectedArtifacts.every((item) => item.hashAlgorithm === "sha256" && item.hash);
  const previewValid = sharePackage.previewId === generatedPreview.previewId &&
    sharePackage.previewVersion === generatedPreview.version &&
    review.previewId === generatedPreview.previewId &&
    review.previewVersion === generatedPreview.version &&
    review.nextState === "CLIENT_PREVIEW_READY" &&
    review.clientShareAllowed === true;
  const boundaries = {
    noPublicPublishing: sharePackage.publicAccessAllowed === false && generatedPreview.publishAllowed === false,
    noSourceTransfer: sharePackage.sourceTransferAllowed === false,
    noProductionPermission: sharePackage.productionUseAllowed === false && generatedPreview.productionReady === false,
    noPaymentAction: sharePackage.paymentActions === 0,
    executionDisabled: deliveryIntent.executionEnabled === false && deliveryIntent.providerExecutionAllowed === false
  };

  if (!access.ok) reasonCodes.push(`SHARE_PACKAGE_${access.status || "BLOCKED"}`);
  if (sharePackage.status !== sharePreparationStatuses.manualShareReady) reasonCodes.push("SHARE_PACKAGE_NOT_MANUAL_SHARE_READY");
  if (!previewValid) reasonCodes.push("PREVIEW_OR_REVIEW_VERSION_INVALID");
  if (!artifactIntegrityValid) reasonCodes.push("ARTIFACT_INTEGRITY_CHANGED_OR_UNAVAILABLE");
  if (eligibility.status !== recipientEligibilityStatuses.eligible) reasonCodes.push(`RECIPIENT_${eligibility.status || "NOT_ELIGIBLE"}`);
  if (prospectSuppressed(prospect)) reasonCodes.push("PROSPECT_SUPPRESSED_OR_REJECTED");
  if (channelPolicy.planningStatus === deliveryChannelPlanningStatuses.blocked) reasonCodes.push("CHANNEL_BLOCKED");
  if (!factuality.ok) reasonCodes.push("MESSAGE_FACTUALITY_BLOCKED");
  for (const [key, ok] of Object.entries(boundaries)) {
    if (!ok) reasonCodes.push(key.toUpperCase());
  }
  if (channelPolicy.planningStatus === deliveryChannelPlanningStatuses.requiresProviderLater) warnings.push("CHANNEL_REQUIRES_PROVIDER_LATER");

  const messageFingerprint = messagePreview.messageFingerprint || createMessageFingerprint(messagePreview);
  const actionFingerprint = createActionFingerprint({
    sharePackageId: sharePackage.sharePackageId,
    previewId: sharePackage.previewId,
    previewVersion: sharePackage.previewVersion,
    recipientRef: deliveryIntent.recipientRef || eligibility.recipientRef,
    recipientEligibilityRef: deliveryIntent.recipientEligibilityRef || eligibility.recipientEligibilityId,
    channel: deliveryIntent.channel || messagePreview.channel,
    messageFingerprint,
    artifactIntegrityRefs: sharePackage.artifactIntegrityRefs,
    accessPolicyRef: sharePackage.accessPolicyRef || accessPolicy.accessPolicyId
  });
  const status = reasonCodes.length
    ? deliveryPreflightStatuses.blocked
    : warnings.length
      ? deliveryPreflightStatuses.passWithWarnings
      : deliveryPreflightStatuses.pass;

  return createDeliveryPreflight({
    deliveryIntentId: deliveryIntent.deliveryIntentId,
    sharePackageId: sharePackage.sharePackageId,
    previewId: sharePackage.previewId,
    previewVersion: sharePackage.previewVersion,
    recipientEligibilityRef: deliveryIntent.recipientEligibilityRef || eligibility.recipientEligibilityId,
    channel: deliveryIntent.channel || messagePreview.channel,
    messageFingerprint,
    actionFingerprint,
    status,
    reasonCodes,
    warnings,
    checks: {
      sharePackageAccess: access,
      previewValid,
      artifactIntegrityValid,
      recipientEligibilityStatus: eligibility.status,
      prospectSuppressed: prospectSuppressed(prospect),
      channelPolicy,
      messageFactuality: factuality,
      boundaries
    },
    checkedAt: now.toISOString()
  });
}

export function approveHumanSend({
  deliveryIntent = {},
  preflight = {},
  approvedBy = null,
  approvedAt = new Date().toISOString(),
  expiresAt = null,
  existingApprovals = []
} = {}) {
  if (preflight.status === deliveryPreflightStatuses.blocked || !preflight.actionFingerprint) {
    return {
      ok: false,
      status: humanSendApprovalStatuses.rejected,
      reason: "PREFLIGHT_NOT_APPROVABLE",
      approval: null
    };
  }
  const idempotencyKey = stableHash({
    deliveryIntentId: deliveryIntent.deliveryIntentId,
    actionFingerprint: preflight.actionFingerprint,
    approvedBy,
    status: humanSendApprovalStatuses.active
  });
  const existing = existingApprovals.find((item) => item.idempotencyKey === idempotencyKey);
  if (existing) return { ok: true, duplicate: true, status: existing.status, approval: existing };

  const approval = createHumanSendApproval({
    deliveryIntentId: deliveryIntent.deliveryIntentId,
    sharePackageId: deliveryIntent.sharePackageId,
    previewId: deliveryIntent.previewId,
    previewVersion: deliveryIntent.previewVersion,
    recipientRef: deliveryIntent.recipientRef,
    redactedRecipient: deliveryIntent.redactedRecipient,
    recipientEligibilityRef: deliveryIntent.recipientEligibilityRef,
    channel: deliveryIntent.channel,
    messageFingerprint: deliveryIntent.messageFingerprint,
    artifactIntegrityRefs: deliveryIntent.artifactIntegrityRefs,
    approvedBy,
    approvedAt,
    expiresAt: expiresAt || addDaysIso(3, new Date(approvedAt)),
    approvalScope: {
      exactActionOnly: true,
      mayProceedToFutureExecutionBoundary: true,
      sendNowAllowed: false,
      providerCallAllowed: false,
      publicLinkCreationAllowed: false,
      publishAllowed: false,
      sourceTransferAllowed: false,
      paymentAllowed: false,
      productionActivationAllowed: false
    },
    status: humanSendApprovalStatuses.active,
    actionFingerprint: preflight.actionFingerprint,
    idempotencyKey
  });
  return { ok: true, duplicate: false, status: approval.status, approval };
}

export function revokeHumanSendApproval(approval = {}, reason = "HUMAN_REVOKED", revokedAt = new Date().toISOString()) {
  return {
    ...approval,
    status: humanSendApprovalStatuses.revoked,
    revokedAt,
    revocationReason: reason,
    executionAuthorityNow: false
  };
}

export function finalPreExecutionValidation(input = {}) {
  const {
    deliveryIntent = {},
    approval = null,
    now = new Date()
  } = input;
  if (!approval) {
    return createFinalPreExecutionValidation({
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      status: finalPreExecutionValidationStatuses.requiresReapproval,
      reasonCodes: ["HUMAN_SEND_APPROVAL_MISSING"],
      checkedAt: now.toISOString()
    });
  }
  if (approval.status === humanSendApprovalStatuses.revoked) {
    return createFinalPreExecutionValidation({
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      sendApprovalId: approval.sendApprovalId,
      status: finalPreExecutionValidationStatuses.revoked,
      reasonCodes: ["HUMAN_SEND_APPROVAL_REVOKED"],
      checkedAt: now.toISOString()
    });
  }
  if (approval.expiresAt && new Date(approval.expiresAt).getTime() <= now.getTime()) {
    return createFinalPreExecutionValidation({
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      sendApprovalId: approval.sendApprovalId,
      status: finalPreExecutionValidationStatuses.expired,
      reasonCodes: ["HUMAN_SEND_APPROVAL_EXPIRED"],
      checkedAt: now.toISOString()
    });
  }

  const preflight = runDeliveryPreflight(input);
  if (preflight.status === deliveryPreflightStatuses.blocked) {
    return createFinalPreExecutionValidation({
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      sendApprovalId: approval.sendApprovalId,
      actionFingerprint: preflight.actionFingerprint,
      expectedActionFingerprint: approval.actionFingerprint,
      status: finalPreExecutionValidationStatuses.blocked,
      reasonCodes: preflight.reasonCodes,
      checks: { preflight },
      checkedAt: now.toISOString()
    });
  }
  if (preflight.actionFingerprint !== approval.actionFingerprint) {
    return createFinalPreExecutionValidation({
      deliveryIntentId: deliveryIntent.deliveryIntentId,
      sendApprovalId: approval.sendApprovalId,
      actionFingerprint: preflight.actionFingerprint,
      expectedActionFingerprint: approval.actionFingerprint,
      status: finalPreExecutionValidationStatuses.requiresReapproval,
      reasonCodes: ["ACTION_FINGERPRINT_CHANGED"],
      checks: { preflight },
      checkedAt: now.toISOString()
    });
  }

  return createFinalPreExecutionValidation({
    deliveryIntentId: deliveryIntent.deliveryIntentId,
    sendApprovalId: approval.sendApprovalId,
    actionFingerprint: preflight.actionFingerprint,
    expectedActionFingerprint: approval.actionFingerprint,
    status: finalPreExecutionValidationStatuses.approvedForFutureDelivery,
    reasonCodes: [],
    checks: { preflight },
    executionIntentCreationAllowed: true,
    checkedAt: now.toISOString()
  });
}

export function createDeliveryApprovalAudit(input = {}) {
  const preflight = input.preflight || null;
  const approval = input.approval || null;
  const finalValidation = input.finalValidation || null;
  return createDeliveryIntentAudit({
    artifactType: "BusinessAcquisitionDeliveryApprovalAudit",
    deliveryIntentId: input.deliveryIntent?.deliveryIntentId,
    sharePackageId: input.deliveryIntent?.sharePackageId,
    previewId: input.deliveryIntent?.previewId,
    previewVersion: input.deliveryIntent?.previewVersion,
    recipientEligibilityRef: input.deliveryIntent?.recipientEligibilityRef,
    redactedRecipient: input.deliveryIntent?.redactedRecipient || approval?.redactedRecipient || null,
    channel: input.deliveryIntent?.channel,
    messageFingerprint: input.deliveryIntent?.messageFingerprint,
    evidenceRefs: input.messagePreview?.evidenceRefs || [],
    preflightResult: preflight ? {
      status: preflight.status,
      reasonCodes: preflight.reasonCodes,
      warnings: preflight.warnings
    } : null,
    actionFingerprint: preflight?.actionFingerprint || approval?.actionFingerprint || null,
    approvalRef: approval?.sendApprovalId || null,
    approvalState: approval?.status || null,
    expiration: approval?.expiresAt || null,
    revocation: approval?.revokedAt ? {
      revokedAt: approval.revokedAt,
      reason: approval.revocationReason
    } : null,
    finalValidationResult: finalValidation ? {
      status: finalValidation.status,
      reasonCodes: finalValidation.reasonCodes,
      executionIntentCreationAllowed: finalValidation.executionIntentCreationAllowed
    } : null,
    stateTransitions: input.stateTransitions || [],
    createdAt: input.createdAt
  });
}
