import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { leadFreshnessStates } from "../leadIntelligence/leadContracts.js";
import {
  acquisitionLifecycleStates,
  createClientPreviewSharePackage,
  createRecipientEligibilityCheck,
  createShareAccessPolicy,
  createSharePreparationRequest,
  previewReviewDecisions,
  previewReviewStates,
  recipientBasisTypes,
  recipientEligibilityStatuses,
  sharePreparationStatuses,
  shareRevocationReasons
} from "./businessAcquisitionContracts.js";

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

const allowedShareTransitions = {
  [sharePreparationStatuses.draft]: new Set([
    sharePreparationStatuses.eligibilityChecked,
    sharePreparationStatuses.blocked
  ]),
  [sharePreparationStatuses.eligibilityChecked]: new Set([
    sharePreparationStatuses.accessPolicyReady,
    sharePreparationStatuses.blocked
  ]),
  [sharePreparationStatuses.accessPolicyReady]: new Set([
    sharePreparationStatuses.manualShareReady,
    sharePreparationStatuses.blocked
  ]),
  [sharePreparationStatuses.manualShareReady]: new Set([
    sharePreparationStatuses.revoked,
    sharePreparationStatuses.expired,
    sharePreparationStatuses.stale
  ]),
  [sharePreparationStatuses.blocked]: new Set([]),
  [sharePreparationStatuses.revoked]: new Set([]),
  [sharePreparationStatuses.expired]: new Set([]),
  [sharePreparationStatuses.stale]: new Set([])
};

function addDaysIso(days = 7, now = new Date()) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

function sourceRefsFromProspect(prospect = {}) {
  return (prospect.sourceRefs || []).map((source) => source.sourceId || source.sourceRef).filter(Boolean);
}

function prospectSuppressed(prospect = {}) {
  return Boolean(
    prospect.suppressionStatus ||
    blockedProspectStates.has(prospect.lifecycleState) ||
    prospect.dataFreshness === leadFreshnessStates.stale
  );
}

export function validateShareTransition(fromState, toState) {
  return {
    ok: allowedShareTransitions[fromState]?.has(toState) === true,
    fromState,
    toState,
    reason: allowedShareTransitions[fromState]?.has(toState) ? null : "SHARE_TRANSITION_NOT_ALLOWED"
  };
}

export function checkRecipientEligibility({
  prospect = {},
  recipient = {},
  policy = {}
} = {}) {
  const reasonCodes = [];
  const provenanceRefs = recipient.provenanceRefs || (recipient.sourceRef ? [recipient.sourceRef] : []);
  const suppressionCheck = {
    prospectSuppressed: prospectSuppressed(prospect),
    contactOptedOut: recipient.optedOut === true,
    recipientBlocked: recipient.blocked === true
  };

  if (suppressionCheck.prospectSuppressed) reasonCodes.push("PROSPECT_SUPPRESSED_OR_REJECTED");
  if (suppressionCheck.contactOptedOut) reasonCodes.push("CONTACT_OPT_OUT");
  if (suppressionCheck.recipientBlocked) reasonCodes.push("RECIPIENT_BLOCKED");
  if (!provenanceRefs.length) reasonCodes.push("RECIPIENT_PROVENANCE_MISSING");
  if (recipient.personal === true || recipient.private === true || /personal|private/i.test(String(recipient.channel || ""))) {
    reasonCodes.push("PERSONAL_OR_PRIVATE_CONTACT_BLOCKED");
  }
  if (recipient.sourceType === "PURCHASED_LIST" || recipient.enriched === true) {
    reasonCodes.push("UNAUTHORIZED_ENRICHMENT_BLOCKED");
  }

  let status = recipientEligibilityStatuses.requiresReview;
  let recipientBasis = recipientBasisTypes.safeBusinessContactReviewRequired;
  if (reasonCodes.some((code) => /SUPPRESSED|OPT_OUT|BLOCKED|PERSONAL|PRIVATE|ENRICHMENT/.test(code))) {
    status = recipientEligibilityStatuses.blocked;
    recipientBasis = recipientBasisTypes.personalPrivateBlocked;
  } else if (recipient.verifiedPublicBusinessContact === true && provenanceRefs.length) {
    status = recipientEligibilityStatuses.eligible;
    recipientBasis = recipientBasisTypes.verifiedPublicBusinessContact;
  } else if (recipient.explicitlyAuthorizedBusinessContact === true && provenanceRefs.length) {
    status = recipientEligibilityStatuses.eligible;
    recipientBasis = recipientBasisTypes.explicitlyAuthorizedBusinessContact;
  } else if (policy.missingProvenanceBlocks !== false && !provenanceRefs.length) {
    status = recipientEligibilityStatuses.blocked;
  }

  return createRecipientEligibilityCheck({
    prospectId: prospect.prospectId,
    recipientRef: recipient.recipientRef || recipient.value || null,
    recipientChannel: recipient.channel || null,
    recipientBasis,
    status,
    reasonCodes,
    provenanceRefs,
    suppressionCheck,
    redactedRecipient: redactedRecipient(recipient)
  });
}

export function createArtifactIntegrityRefs(generatedPreview = {}, options = {}) {
  const packageDir = options.packageDir || null;
  return (generatedPreview.generatedArtifacts || []).map((artifact) => {
    const filePath = packageDir ? path.join(packageDir, artifact.artifactName) : null;
    return {
      artifactName: artifact.artifactName,
      previewId: generatedPreview.previewId,
      previewVersion: generatedPreview.version,
      relativePath: artifact.relativePath,
      hashAlgorithm: filePath && fs.existsSync(filePath) ? "sha256" : "not_available",
      hash: filePath && fs.existsSync(filePath) ? sha256File(filePath) : null
    };
  });
}

export function createClientPreviewShareAudit(input = {}) {
  const eligibility = input.recipientEligibilityResult || null;
  const eligibilityProjection = eligibility ? {
    recipientEligibilityId: eligibility.recipientEligibilityId,
    prospectId: eligibility.prospectId,
    recipientChannel: eligibility.recipientChannel,
    recipientBasis: eligibility.recipientBasis,
    status: eligibility.status,
    reasonCodes: eligibility.reasonCodes || [],
    provenanceRefs: eligibility.provenanceRefs || [],
    suppressionCheck: eligibility.suppressionCheck || {},
    redactedRecipient: eligibility.redactedRecipient || null
  } : null;
  return {
    artifactType: "ClientPreviewShareAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_E",
    sharePreparationId: input.sharePreparationId,
    sharePackageId: input.sharePackageId || null,
    prospectId: input.prospectId,
    previewId: input.previewId,
    previewVersion: input.previewVersion,
    reviewApprovalRef: input.reviewApprovalRef || null,
    recipientEligibilityResult: eligibilityProjection,
    recipientProvenance: input.recipientProvenance || [],
    suppressionCheck: input.suppressionCheck || {},
    accessPolicy: input.accessPolicy || null,
    expiration: input.expiration || null,
    permissions: input.permissions || null,
    stateTransitions: input.stateTransitions || [],
    revocation: input.revocation || null,
    safetySnapshot: input.safetySnapshot || {},
    artifactIntegrityRefs: input.artifactIntegrityRefs || [],
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

function validateApprovedPreview({ generatedPreview = {}, review = {} }) {
  return Boolean(
    generatedPreview.previewId &&
    generatedPreview.version &&
    generatedPreview.qcStatus !== "BLOCKED" &&
    review.previewId === generatedPreview.previewId &&
    review.previewVersion === generatedPreview.version &&
    review.decision === previewReviewDecisions.approveForClientPreview &&
    review.nextState === previewReviewStates.clientPreviewReady &&
    review.clientShareAllowed === true &&
    review.publishAllowed === false &&
    review.productionUseAllowed === false &&
    review.commercialHandoffAllowed === false
  );
}

function unsafeRequestedPermissions(request = {}) {
  const scope = request.requestedAccessScope || "";
  return {
    publicAccessAllowed: request.publicAccessAllowed === true || /PUBLIC/i.test(scope),
    sourceTransferAllowed: request.sourceTransferAllowed === true || /SOURCE_TRANSFER/i.test(scope),
    productionUseAllowed: request.productionUseAllowed === true || /PRODUCTION/i.test(scope),
    sendRequested: request.status === "SENT" || request.sendAllowed === true
  };
}

export function prepareClientPreviewSharePackage({
  prospect = {},
  generatedPreview = {},
  review = {},
  recipient = {},
  request: requestInput = {},
  existingPackages = [],
  packageDir = null,
  now = new Date()
} = {}) {
  const request = createSharePreparationRequest({
    prospectId: prospect.prospectId,
    previewId: generatedPreview.previewId,
    previewVersion: generatedPreview.version,
    reviewId: review.reviewId,
    recipientRef: recipient.recipientRef || recipient.value || null,
    recipientChannel: recipient.channel || "PUBLIC_BUSINESS_EMAIL",
    recipientSourceRef: recipient.sourceRef || null,
    requestedExpiration: requestInput.requestedExpiration || addDaysIso(7, now),
    requestedBy: requestInput.requestedBy || "local_operator",
    approvalRef: review.reviewId,
    ...requestInput
  });
  const idempotencyKey = requestInput.idempotencyKey || [
    request.prospectId,
    request.previewId,
    request.previewVersion,
    request.reviewId,
    request.recipientRef
  ].join(":");
  const existing = existingPackages.find((item) => item.idempotencyKey === idempotencyKey);
  if (existing) return { ok: true, duplicate: true, ...existing };

  const transitions = [];
  const unsafe = unsafeRequestedPermissions(requestInput);
  const eligibility = checkRecipientEligibility({ prospect, recipient });
  const blockers = [];
  if (!validateApprovedPreview({ generatedPreview, review })) blockers.push("PREVIEW_NOT_APPROVED_FOR_CLIENT_PREVIEW");
  if (prospectSuppressed(prospect)) blockers.push("PROSPECT_SUPPRESSED_OR_REJECTED");
  if (eligibility.status !== recipientEligibilityStatuses.eligible) blockers.push(`RECIPIENT_${eligibility.status}`);
  if (unsafe.publicAccessAllowed) blockers.push("PUBLIC_ACCESS_NOT_ALLOWED_PHASE_E");
  if (unsafe.sourceTransferAllowed) blockers.push("SOURCE_TRANSFER_NOT_ALLOWED_PHASE_E");
  if (unsafe.productionUseAllowed) blockers.push("PRODUCTION_USE_NOT_ALLOWED_PHASE_E");
  if (unsafe.sendRequested) blockers.push("SENT_OR_SEND_NOT_ALLOWED_PHASE_E");

  transitions.push({ from: sharePreparationStatuses.draft, to: blockers.length ? sharePreparationStatuses.blocked : sharePreparationStatuses.eligibilityChecked });
  if (blockers.length) {
    const audit = createClientPreviewShareAudit({
      sharePreparationId: request.sharePreparationId,
      prospectId: prospect.prospectId,
      previewId: generatedPreview.previewId,
      previewVersion: generatedPreview.version,
      reviewApprovalRef: review.reviewId,
      recipientEligibilityResult: eligibility,
      recipientProvenance: eligibility.provenanceRefs,
      suppressionCheck: eligibility.suppressionCheck,
      stateTransitions: transitions,
      safetySnapshot: { blockers, unsafePermissions: unsafe }
    });
    return { ok: false, duplicate: false, status: sharePreparationStatuses.blocked, request, eligibility, blockers, audit, idempotencyKey };
  }

  transitions.push({ from: sharePreparationStatuses.eligibilityChecked, to: sharePreparationStatuses.accessPolicyReady });
  const accessPolicy = createShareAccessPolicy({
    expiresAt: request.requestedExpiration
  });
  const artifactIntegrityRefs = createArtifactIntegrityRefs(generatedPreview, { packageDir });
  transitions.push({ from: sharePreparationStatuses.accessPolicyReady, to: sharePreparationStatuses.manualShareReady });
  const sharePackage = {
    ...createClientPreviewSharePackage({
      prospectId: prospect.prospectId,
      previewId: generatedPreview.previewId,
      previewVersion: generatedPreview.version,
      reviewId: review.reviewId,
      recipientEligibilityRef: eligibility.recipientEligibilityId,
      artifactRefs: generatedPreview.generatedArtifacts || [],
      artifactIntegrityRefs,
      accessPolicyRef: accessPolicy.accessPolicyId,
      expiresAt: request.requestedExpiration,
      clientShareAllowed: true
    }),
    idempotencyKey
  };
  const audit = createClientPreviewShareAudit({
    sharePreparationId: request.sharePreparationId,
    sharePackageId: sharePackage.sharePackageId,
    prospectId: prospect.prospectId,
    previewId: generatedPreview.previewId,
    previewVersion: generatedPreview.version,
    reviewApprovalRef: review.reviewId,
    recipientEligibilityResult: eligibility,
    recipientProvenance: eligibility.provenanceRefs,
    suppressionCheck: eligibility.suppressionCheck,
    accessPolicy,
    expiration: sharePackage.expiresAt,
    permissions: permissionSummary(sharePackage),
    stateTransitions: transitions,
    safetySnapshot: { blockers: [], unsafePermissions: unsafe },
    artifactIntegrityRefs
  });
  return {
    ok: true,
    duplicate: false,
    status: sharePreparationStatuses.manualShareReady,
    request,
    eligibility,
    accessPolicy,
    sharePackage: { ...sharePackage, auditRef: `share_audit_${sharePackage.sharePackageId}` },
    audit,
    idempotencyKey
  };
}

function permissionSummary(sharePackage = {}) {
  return {
    clientShareAllowed: sharePackage.clientShareAllowed === true,
    sendAllowed: sharePackage.sendAllowed === true,
    publicAccessAllowed: sharePackage.publicAccessAllowed === true,
    downloadAllowed: sharePackage.downloadAllowed === true,
    sourceTransferAllowed: sharePackage.sourceTransferAllowed === true,
    editAllowed: sharePackage.editAllowed === true,
    productionUseAllowed: sharePackage.productionUseAllowed === true,
    commercialUseAllowed: sharePackage.commercialUseAllowed === true,
    publishAllowed: sharePackage.publishAllowed === true
  };
}

export function evaluateSharePackageAccess(sharePackage = {}, { now = new Date(), canonicalPreview = null } = {}) {
  if (!sharePackage.sharePackageId) return { ok: false, status: sharePreparationStatuses.blocked, reason: "SHARE_PACKAGE_MISSING" };
  if (sharePackage.status === sharePreparationStatuses.revoked) return { ok: false, status: sharePreparationStatuses.revoked, reason: "SHARE_PACKAGE_REVOKED" };
  if (sharePackage.expiresAt && new Date(sharePackage.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, status: sharePreparationStatuses.expired, reason: shareRevocationReasons.expired };
  }
  if (canonicalPreview && (
    canonicalPreview.previewId !== sharePackage.previewId ||
    canonicalPreview.version !== sharePackage.previewVersion
  )) {
    return { ok: false, status: sharePreparationStatuses.stale, reason: shareRevocationReasons.previewRevised };
  }
  return { ok: sharePackage.status === sharePreparationStatuses.manualShareReady, status: sharePackage.status };
}

export function revokeSharePackage(sharePackage = {}, reason = shareRevocationReasons.humanRevoked, input = {}) {
  if (sharePackage.status === sharePreparationStatuses.revoked) {
    return { ok: true, duplicate: true, sharePackage };
  }
  const revoked = {
    ...sharePackage,
    status: sharePreparationStatuses.revoked,
    revokedAt: input.revokedAt || new Date().toISOString(),
    revocationReason: reason,
    clientShareAllowed: false
  };
  const audit = createClientPreviewShareAudit({
    sharePreparationId: input.sharePreparationId || null,
    sharePackageId: revoked.sharePackageId,
    prospectId: revoked.prospectId,
    previewId: revoked.previewId,
    previewVersion: revoked.previewVersion,
    reviewApprovalRef: revoked.reviewId,
    expiration: revoked.expiresAt,
    permissions: permissionSummary(revoked),
    stateTransitions: [{ from: sharePackage.status, to: sharePreparationStatuses.revoked }],
    revocation: { reason, revokedAt: revoked.revokedAt, irreversibleForPackage: true },
    safetySnapshot: { revocationRequired: true }
  });
  return { ok: true, duplicate: false, sharePackage: revoked, audit };
}
