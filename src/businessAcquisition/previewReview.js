import {
  createPreviewReview,
  createPreviewRevisionRequest,
  previewQcStatuses,
  previewReviewDecisions,
  previewReviewStates,
  previewRevisionStatuses
} from "./businessAcquisitionContracts.js";
import { generateLocalPreviewPackage } from "./localPreviewGenerator.js";
import fs from "node:fs";
import path from "node:path";

const allowedReviewTransitions = {
  [previewReviewStates.readyForHumanReview]: new Set([previewReviewStates.inReview]),
  [previewReviewStates.inReview]: new Set([
    previewReviewStates.clientPreviewReady,
    previewReviewStates.revisionRequested,
    previewReviewStates.rejected
  ]),
  [previewReviewStates.revisionRequested]: new Set([previewReviewStates.revisionInProgress]),
  [previewReviewStates.revisionInProgress]: new Set([previewReviewStates.readyForHumanReview]),
  [previewReviewStates.clientPreviewReady]: new Set([]),
  [previewReviewStates.rejected]: new Set([])
};

function transitionAllowed(from, to) {
  return allowedReviewTransitions[from]?.has(to) === true;
}

function inferCurrentState(preview = {}) {
  if (preview.reviewState) return preview.reviewState;
  if (preview.status === previewReviewStates.readyForHumanReview || preview.status === "PREVIEW_READY_FOR_HUMAN_REVIEW") {
    return previewReviewStates.readyForHumanReview;
  }
  return previewReviewStates.readyForHumanReview;
}

function decisionToNextState(decision) {
  if (decision === previewReviewDecisions.approveForClientPreview) return previewReviewStates.clientPreviewReady;
  if (decision === previewReviewDecisions.requestRevision) return previewReviewStates.revisionRequested;
  if (decision === previewReviewDecisions.rejectPreview) return previewReviewStates.rejected;
  return previewReviewStates.inReview;
}

function permissionSnapshot(preview = {}) {
  return {
    clientShareAllowed: preview.clientShareAllowed === true,
    publishAllowed: preview.publishAllowed === true,
    productionReady: preview.productionReady === true,
    commercialUseAllowed: preview.commercialUseAllowed === true,
    handoffAllowed: preview.handoffAllowed === true,
    providerCalls: Number(preview.providerCalls || 0),
    externalCalls: Number(preview.externalCalls || 0),
    outreachActions: Number(preview.outreachActions || 0),
    paymentActions: Number(preview.paymentActions || 0),
    publishActions: Number(preview.publishActions || 0),
    productionHandoffs: Number(preview.productionHandoffs || 0)
  };
}

export function validatePreviewReviewTransition(fromState, toState) {
  return {
    ok: transitionAllowed(fromState, toState),
    fromState,
    toState,
    reason: transitionAllowed(fromState, toState) ? null : "PREVIEW_REVIEW_TRANSITION_NOT_ALLOWED"
  };
}

export function evaluatePreviewReviewSafety({
  generatedPreview = {},
  qc = {},
  decision,
  allowPassWithWarnings = false
} = {}) {
  const blockers = [];
  const warnings = [];
  const permissions = permissionSnapshot(generatedPreview);
  const qcStatus = qc.status || generatedPreview.qcStatus;
  const approvalDecision = decision === previewReviewDecisions.approveForClientPreview;
  const checks = {
    supportedDecision: Object.values(previewReviewDecisions).includes(decision),
    productionApprovalNotSupported: decision !== "APPROVE_FOR_PRODUCTION",
    qcPassesPolicy: approvalDecision
      ? qcStatus === previewQcStatuses.pass || (allowPassWithWarnings && qcStatus === previewQcStatuses.passWithWarnings)
      : qcStatus !== previewQcStatuses.blocked,
    noSensitivePersonalData: !(qc.blockedClaims || generatedPreview.blockedClaims || []).includes("PERSONAL_OR_SENSITIVE_DATA"),
    factualityChecksPass: !(qc.blockedClaims || []).some((claim) => /FABRICATED|PRODUCTION_OR_OFFICIAL/.test(claim)),
    demoConceptNoticeExists: qc.checks?.demoConceptLabelExists !== false,
    notOfficialNoticeExists: qc.checks?.notOfficialNoticeExists !== false,
    publishRemainsFalse: permissions.publishAllowed === false && generatedPreview.publishAllowed === false,
    productionReadyRemainsFalse: permissions.productionReady === false && generatedPreview.productionReady === false,
    commercialUseRemainsFalse: permissions.commercialUseAllowed === false && generatedPreview.commercialUseAllowed === false,
    noOutreachActionAttached: permissions.outreachActions === 0,
    noPaymentActionAttached: permissions.paymentActions === 0,
    noExternalCalls: permissions.externalCalls === 0,
    noProviderCalls: permissions.providerCalls === 0
  };

  Object.entries(checks).forEach(([key, ok]) => {
    if (!ok) blockers.push(key.toUpperCase());
  });
  if (qcStatus === previewQcStatuses.passWithWarnings) warnings.push("QC_PASS_WITH_WARNINGS_REVIEWED_BY_POLICY");

  return {
    modelType: "PreviewReviewSafetyGate",
    ok: blockers.length === 0,
    checks,
    blockers,
    warnings,
    permissionsBeforeDecision: permissions,
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    paymentActions: 0,
    publishActions: 0,
    productionHandoffs: 0
  };
}

export function createPreviewReviewAudit({
  generatedPreview = {},
  review = {},
  qc = {},
  safety = {},
  priorState,
  resultingState
} = {}) {
  return {
    artifactType: "BusinessAcquisitionPreviewReviewAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_D",
    previewId: generatedPreview.previewId,
    previewVersion: generatedPreview.version,
    demoPlanId: generatedPreview.demoPlanId,
    prospectId: generatedPreview.prospectId,
    reviewId: review.reviewId,
    reviewer: {
      reviewerType: review.reviewerType,
      reviewerRef: review.reviewerRef
    },
    decision: review.decision,
    reviewedAt: review.reviewedAt,
    reasonCodes: review.decisionReasonCodes || [],
    comments: review.comments || "",
    requestedChanges: review.requestedChanges || [],
    priorState,
    resultingState,
    qcSnapshot: qc,
    safetySnapshot: safety,
    permissionsBeforeDecision: safety.permissionsBeforeDecision || permissionSnapshot(generatedPreview),
    permissionsAfterDecision: {
      clientShareAllowed: review.clientShareAllowed,
      publishAllowed: review.publishAllowed,
      productionUseAllowed: review.productionUseAllowed,
      commercialHandoffAllowed: review.commercialHandoffAllowed,
      providerCalls: 0,
      externalCalls: 0,
      outreachActions: 0,
      paymentActions: 0,
      publishActions: 0,
      productionHandoffs: 0
    },
    providerCalls: 0,
    externalCalls: 0,
    outreachActions: 0,
    paymentActions: 0,
    publishActions: 0,
    productionHandoffs: 0
  };
}

export function reviewGeneratedPreview({
  generatedPreview = {},
  qc = {},
  decision = previewReviewDecisions.approveForClientPreview,
  reviewer = {},
  comments = "",
  requestedChanges = [],
  reasonCodes = [],
  allowPassWithWarnings = false,
  currentState,
  existingReviews = [],
  idempotencyKey = null
} = {}) {
  const dedupeKey = idempotencyKey || `${generatedPreview.previewId}:${generatedPreview.version}:${decision}`;
  const duplicate = existingReviews.find((item) => item.idempotencyKey === dedupeKey);
  if (duplicate) return { ok: true, duplicate: true, review: duplicate.review, audit: duplicate.audit };

  const priorState = currentState || inferCurrentState(generatedPreview);
  const inReview = validatePreviewReviewTransition(priorState, previewReviewStates.inReview);
  if (!inReview.ok) return { ok: false, reason: inReview.reason, transition: inReview };

  const resultingState = decisionToNextState(decision);
  const finalTransition = validatePreviewReviewTransition(previewReviewStates.inReview, resultingState);
  if (!finalTransition.ok) return { ok: false, reason: finalTransition.reason, transition: finalTransition };

  const safety = evaluatePreviewReviewSafety({ generatedPreview, qc, decision, allowPassWithWarnings });
  if (!safety.ok) return { ok: false, reason: "PREVIEW_REVIEW_SAFETY_BLOCKED", safety };

  const review = {
    ...createPreviewReview({
      previewId: generatedPreview.previewId,
      previewVersion: generatedPreview.version,
      demoPlanId: generatedPreview.demoPlanId,
      prospectId: generatedPreview.prospectId,
      reviewerType: reviewer.reviewerType || "HUMAN_OPERATOR",
      reviewerRef: reviewer.reviewerRef || "local_reviewer",
      decision,
      decisionReasonCodes: reasonCodes,
      comments,
      requestedChanges,
      nextState: resultingState
    }),
    idempotencyKey: dedupeKey
  };
  const audit = createPreviewReviewAudit({
    generatedPreview,
    review,
    qc,
    safety,
    priorState,
    resultingState
  });
  return {
    ok: true,
    duplicate: false,
    priorState,
    resultingState,
    review: { ...review, auditRef: `review_audit_${review.reviewId}` },
    audit
  };
}

export function createRevisionRequestFromReview(review = {}, input = {}) {
  if (review.decision !== previewReviewDecisions.requestRevision) {
    return { ok: false, reason: "REVISION_REQUEST_REQUIRES_REQUEST_REVISION_DECISION" };
  }
  const revisionRequest = createPreviewRevisionRequest({
    reviewId: review.reviewId,
    previewId: review.previewId,
    sourcePreviewVersion: review.previewVersion,
    requestedChanges: input.requestedChanges?.length ? input.requestedChanges : review.requestedChanges,
    changeCategories: input.changeCategories || ["copy", "layout"],
    reasonCodes: input.reasonCodes || review.decisionReasonCodes,
    allowedChangeScope: input.allowedChangeScope,
    newEvidenceAllowed: input.newEvidenceAllowed,
    newAssumptionsAllowed: input.newAssumptionsAllowed,
    requestedBy: input.requestedBy || review.reviewerRef,
    status: previewRevisionStatuses.requested
  });
  return { ok: true, revisionRequest };
}

export function generatePreviewRevision({
  parentPreview = {},
  revisionRequest = {},
  prospect = {},
  demoPlan = {},
  request = {}
} = {}) {
  if (revisionRequest.previewId !== parentPreview.previewId) {
    return { ok: false, reason: "REVISION_PARENT_PREVIEW_MISMATCH" };
  }
  const nextPatch = {
    version: request.version || incrementPatchVersion(parentPreview.version || revisionRequest.sourcePreviewVersion),
    idempotencyKey: request.idempotencyKey || `${revisionRequest.revisionRequestId}:v2`
  };
  const result = generateLocalPreviewPackage({
    prospect,
    demoPlan,
    request: {
      ...request,
      ...nextPatch
    }
  });
  if (!result.ok) return result;
  const changedSections = revisionRequest.changeCategories?.length ? revisionRequest.changeCategories : ["copy", "layout"];
  result.generatedPreview = {
    ...result.generatedPreview,
    parentPreviewId: parentPreview.previewId,
    parentVersion: parentPreview.version,
    revisionRequestId: revisionRequest.revisionRequestId,
    changedSections,
    unchangedSections: ["sourceSnapshotRefs", "evidenceRefs", "businessIdentityBoundary"],
    evidenceDelta: [],
    assumptionDelta: revisionRequest.newAssumptionsAllowed ? revisionRequest.requestedChanges : [],
    artifactDelta: result.generatedPreview.generatedArtifacts.map((item) => item.artifactName)
  };
  const previewPath = path.join(result.packageDir, "preview.json");
  const auditPath = path.join(result.packageDir, "audit.json");
  if (fs.existsSync(previewPath)) {
    fs.writeFileSync(previewPath, JSON.stringify(result.generatedPreview, null, 2));
  }
  if (fs.existsSync(auditPath)) {
    const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
    const nextAudit = {
      ...audit,
      revisionLineage: {
        parentPreviewId: parentPreview.previewId,
        parentVersion: parentPreview.version,
        revisionRequestId: revisionRequest.revisionRequestId,
        changedSections: result.generatedPreview.changedSections,
        unchangedSections: result.generatedPreview.unchangedSections,
        evidenceDelta: result.generatedPreview.evidenceDelta,
        assumptionDelta: result.generatedPreview.assumptionDelta,
        artifactDelta: result.generatedPreview.artifactDelta
      }
    };
    fs.writeFileSync(auditPath, JSON.stringify(nextAudit, null, 2));
    result.audit = nextAudit;
  }
  return {
    ...result,
    revisionRequest: {
      ...revisionRequest,
      status: previewRevisionStatuses.previewRegenerated
    }
  };
}

function incrementPatchVersion(version = "1.0.0") {
  const parts = String(version).split(".").map((item) => Number(item));
  while (parts.length < 3) parts.push(0);
  parts[2] = Number.isFinite(parts[2]) ? parts[2] + 1 : 1;
  return parts.join(".");
}
