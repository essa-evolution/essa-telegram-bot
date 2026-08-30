import {
  propertyReviewerDecisionStatuses,
  propertyReviewerExecutionStatuses,
  propertyReviewerRoles
} from "./propertyReviewerDecision.js";

export const propertyReviewCaseStatuses = {
  incomplete: "INCOMPLETE",
  readyForHumanReview: "READY_FOR_HUMAN_REVIEW",
  reviewedDecisionRecorded: "REVIEWED_DECISION_RECORDED",
  blockedByMissingEvidence: "BLOCKED_BY_MISSING_EVIDENCE",
  blockedByConflict: "BLOCKED_BY_CONFLICT",
  blockedByQuarantine: "BLOCKED_BY_QUARANTINE"
};

export const propertyReviewExecutionReadiness = {
  notEnabled: "EXECUTION_NOT_ENABLED"
};

export const propertyProfessionalReviewRequirements = {
  noneIdentified: "NONE_IDENTIFIED",
  propertyReviewRequired: "PROPERTY_REVIEW_REQUIRED",
  complianceReviewRequired: "COMPLIANCE_REVIEW_REQUIRED",
  legalReviewRequired: "LEGAL_REVIEW_REQUIRED",
  ownershipEvidenceRequired: "OWNERSHIP_EVIDENCE_REQUIRED",
  sourceClarificationRequired: "SOURCE_CLARIFICATION_REQUIRED",
  additionalDocumentsRequired: "ADDITIONAL_DOCUMENTS_REQUIRED"
};

export const propertyReviewHandoffStatuses = {
  draft: "DRAFT",
  readyForHandoff: "READY_FOR_HANDOFF",
  handedOffLocalProof: "HANDED_OFF_LOCAL_PROOF",
  returnedForMoreEvidence: "RETURNED_FOR_MORE_EVIDENCE",
  closed: "CLOSED"
};

export const propertyReviewHandoffTargetRoles = {
  propertyReviewer: "PROPERTY_REVIEWER",
  propertyCompliance: "PROPERTY_COMPLIANCE",
  propertyAdmin: "PROPERTY_ADMIN",
  legalSpecialistFuture: "LEGAL_SPECIALIST_FUTURE"
};

export const propertyReviewCasePackageContract = {
  modelType: "PropertyReviewCasePackage",
  packageId: null,
  packageVersion: "1.0.0",
  generatedAt: null,
  caseStatus: propertyReviewCaseStatuses.incomplete,
  ingestionId: null,
  sourceRecordId: null,
  canonicalPropertyId: null,
  listingSnapshotIds: [],
  reviewerDecisionId: null,
  currentDecisionStatus: "NO_REVIEWER_DECISION_RECORDED",
  executionStatus: propertyReviewerExecutionStatuses.notExecuted,
  executionReadiness: propertyReviewExecutionReadiness.notEnabled,
  summary: "",
  sourceSummary: {},
  validationSummary: {},
  normalizationSummary: {},
  identityResolutionSummary: {},
  evidenceSummary: {},
  conflictSummary: {},
  gapSummary: {},
  riskSummary: {},
  reviewerDecisionSummary: {},
  auditSummary: {},
  professionalReviewRequirements: [],
  limitations: [],
  provenance: [],
  integrity: {},
  previousPackage: null,
  reasonForNewVersion: null,
  providerCalls: 0,
  externalCalls: 0,
  dbMutations: 0,
  payments: 0,
  bookingActions: 0,
  transactionActions: 0,
  mergeActions: 0,
  publishActions: 0,
  quarantineMutations: 0
};

export const propertyReviewHandoffContract = {
  modelType: "PropertyReviewHandoff",
  handoffId: null,
  packageId: null,
  targetRole: propertyReviewHandoffTargetRoles.propertyReviewer,
  requestedReviewType: propertyProfessionalReviewRequirements.propertyReviewRequired,
  generatedAt: null,
  status: propertyReviewHandoffStatuses.draft,
  localProofOnly: true,
  dispatchPerformed: false,
  externalCalls: 0,
  providerCalls: 0,
  dbMutations: 0,
  payments: 0,
  bookingActions: 0,
  transactionActions: 0
};

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createPropertyReviewCaseIntegrity(value = {}) {
  const canonical = stableStringify(value);
  let hash = 0xcbf29ce4;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return {
    algorithm: "local-fnv1a-32",
    fingerprint: hash.toString(16).padStart(8, "0"),
    canonicalLength: canonical.length,
    deterministic: true
  };
}

function provenance(statementId, evidenceRefs = []) {
  return {
    statementId,
    evidenceRefs: clone(evidenceRefs),
    trace: "Package Statement -> Evidence -> PropertyFact / ListingSnapshot -> SourceRef -> SourceRecord -> Ingestion Audit"
  };
}

function classifyCaseStatus(item = {}) {
  if (item.validationStatus === "QUARANTINED") return propertyReviewCaseStatuses.blockedByQuarantine;
  if (item.conflictDetail?.hasConflict) return propertyReviewCaseStatuses.blockedByConflict;
  if (item.gaps?.length || item.currentDecision?.decisionType === "REQUEST_MORE_EVIDENCE") return propertyReviewCaseStatuses.blockedByMissingEvidence;
  if (item.currentDecision?.decisionStatus === propertyReviewerDecisionStatuses.approvedAsDecision) return propertyReviewCaseStatuses.reviewedDecisionRecorded;
  if (item.decisionDraftValidation?.ok) return propertyReviewCaseStatuses.readyForHumanReview;
  return propertyReviewCaseStatuses.incomplete;
}

export function classifyPropertyProfessionalReviewRequirements(item = {}) {
  const requirements = new Set();
  if (item.validationStatus === "QUARANTINED") requirements.add(propertyProfessionalReviewRequirements.sourceClarificationRequired);
  if (item.conflictDetail?.hasConflict) requirements.add(propertyProfessionalReviewRequirements.complianceReviewRequired);
  if (item.gaps?.length) requirements.add(propertyProfessionalReviewRequirements.additionalDocumentsRequired);
  if (item.validationStatus === "ACCEPTED_WITH_GAPS") requirements.add(propertyProfessionalReviewRequirements.propertyReviewRequired);
  if (item.warnings?.some((warning) => String(warning).includes("ownership"))) requirements.add(propertyProfessionalReviewRequirements.ownershipEvidenceRequired);
  if (!requirements.size && item.currentDecision?.decisionStatus === propertyReviewerDecisionStatuses.approvedAsDecision) {
    requirements.add(propertyProfessionalReviewRequirements.noneIdentified);
  }
  if (!requirements.size) requirements.add(propertyProfessionalReviewRequirements.propertyReviewRequired);
  return [...requirements];
}

function buildSummary(item = {}) {
  const conflictText = item.conflictDetail?.hasConflict
    ? `${item.conflictDetail.conflicts.length} conflict(s) remain preserved.`
    : "No conflict is selected.";
  const gapText = item.gaps?.length ? `Evidence gaps: ${item.gaps.join(", ")}.` : "No evidence gaps are listed.";
  const decisionText = item.currentDecision
    ? `Reviewer recorded ${item.currentDecision.decisionType} as ${item.currentDecision.decisionStatus}.`
    : "NO REVIEWER DECISION RECORDED.";
  return `${item.sourceType} source record ${item.sourceRecordId} has validation ${item.validationStatus} and identity resolution ${item.matchOutcome}. Canonical property: ${item.canonicalPropertyId || "not applicable"}. ${conflictText} ${gapText} ${decisionText} No merge or repository mutation has been executed.`;
}

export function sanitizePropertyReviewCasePackage(packageValue = {}) {
  const sanitized = clone(packageValue);
  const text = stableStringify(sanitized);
  if (text.includes("rawPayload") || text.includes("ownerText") || text.includes("reviewNote") || text.includes("process.env") || text.includes("SUPABASE") || text.includes("OPENAI_API_KEY")) {
    throw new Error("Unsafe data detected in PropertyReviewCasePackage export.");
  }
  return sanitized;
}

export function buildPropertyReviewCasePackage({
  reviewItem = {},
  generatedAt = "2026-08-20T00:00:00.000Z",
  packageVersion = "1.0.0",
  previousPackage = null,
  reasonForNewVersion = null
} = {}) {
  const evidenceRefs = reviewItem.decisionDraft?.evidenceRefs || [];
  const listingSnapshotIds = [
    reviewItem.listingSnapshotId,
    ...(reviewItem.conflictDetail?.observations || []).map((observation) => observation.listingSnapshotId)
  ].filter(Boolean);
  const reviewerDecision = reviewItem.currentDecision || null;
  const professionalReviewRequirements = classifyPropertyProfessionalReviewRequirements(reviewItem);
  const base = {
    ...clone(propertyReviewCasePackageContract),
    packageId: `pkg_${reviewItem.ingestionId || "unknown"}_${packageVersion.replaceAll(".", "_")}`,
    packageVersion,
    generatedAt,
    caseStatus: classifyCaseStatus(reviewItem),
    ingestionId: reviewItem.ingestionId,
    sourceRecordId: reviewItem.sourceRecordId,
    canonicalPropertyId: reviewItem.canonicalPropertyId || null,
    listingSnapshotIds: [...new Set(listingSnapshotIds)],
    reviewerDecisionId: reviewerDecision?.decisionId || null,
    currentDecisionStatus: reviewerDecision?.decisionStatus || "NO_REVIEWER_DECISION_RECORDED",
    executionStatus: propertyReviewerExecutionStatuses.notExecuted,
    executionReadiness: propertyReviewExecutionReadiness.notEnabled,
    summary: buildSummary(reviewItem),
    sourceSummary: {
      sourceType: reviewItem.sourceType,
      sourceName: reviewItem.sourceName,
      sourceRecordId: reviewItem.sourceRecordId,
      sourceUrl: reviewItem.sourceUrl,
      observedAt: reviewItem.observedAt,
      fetchedAt: reviewItem.fetchedAt
    },
    validationSummary: clone(reviewItem.validationDetail || {}),
    normalizationSummary: {
      status: reviewItem.normalizationStatus,
      fields: clone(reviewItem.normalizationDetail?.rows || [])
    },
    identityResolutionSummary: clone(reviewItem.identityResolutionDetail || {}),
    evidenceSummary: {
      evidenceRefs: clone(evidenceRefs),
      sourceLineage: clone(reviewItem.sourceLineage || []),
      listingSnapshots: clone(reviewItem.conflictDetail?.observations || []),
      freshness: [...new Set((reviewItem.conflictDetail?.observations || []).map((observation) => observation.freshness).filter(Boolean))],
      verificationStates: [...new Set((reviewItem.sourceLineage || []).map((entry) => entry.artifactType).filter(Boolean))]
    },
    conflictSummary: clone(reviewItem.conflictDetail || {}),
    gapSummary: {
      gaps: clone(reviewItem.gaps || []),
      missingEvidenceCount: (reviewItem.gaps || []).length
    },
    riskSummary: {
      validationBlocked: reviewItem.validationStatus === "QUARANTINED",
      conflictPresent: Boolean(reviewItem.conflictDetail?.hasConflict),
      missingEvidencePresent: Boolean(reviewItem.gaps?.length),
      executionRisk: "EXECUTION_DISABLED_PHASE_22K"
    },
    reviewerDecisionSummary: reviewerDecision
      ? {
          decisionId: reviewerDecision.decisionId,
          decisionType: reviewerDecision.decisionType,
          decisionStatus: reviewerDecision.decisionStatus,
          reviewerRole: reviewerDecision.reviewerRole,
          reviewerId: reviewerDecision.reviewerId,
          reasonCode: reviewerDecision.reasonCode,
          rationale: reviewerDecision.rationale,
          evidenceRefs: clone(reviewerDecision.evidenceRefs),
          warningsAcknowledged: clone(reviewerDecision.warningsAcknowledged),
          createdAt: reviewerDecision.createdAt,
          supersedesDecisionId: reviewerDecision.supersedesDecisionId,
          executionStatus: reviewerDecision.executionStatus
        }
      : { status: "NO REVIEWER DECISION RECORDED", executionStatus: propertyReviewerExecutionStatuses.notExecuted },
    auditSummary: {
      ingestionTimeline: clone(reviewItem.auditTimeline || []),
      decisionHistory: clone(reviewItem.decisionHistory || []),
      decisionAuditTrail: clone(reviewItem.decisionAuditTrail || []),
      appendOnly: true
    },
    professionalReviewRequirements,
    limitations: [
      "Review Case Package is not an execution command.",
      "Human handoff does not mutate Property state.",
      "Approved decision does not mean applied change.",
      "No legal, ownership, KYC/KYB, payment, booking or transaction verification is performed in Phase 22K."
    ],
    provenance: [
      provenance("case_summary", evidenceRefs),
      provenance("source_summary", [{ refType: "PropertySourceRecord", refId: reviewItem.sourceRecordId }]),
      provenance("validation_summary", [{ refType: "PropertyIngestionAudit", refId: reviewItem.ingestionId }]),
      provenance("identity_resolution_summary", [{ refType: "MatchOutcome", refId: reviewItem.matchOutcome }]),
      provenance("reviewer_decision_summary", reviewerDecision?.evidenceRefs || evidenceRefs)
    ],
    previousPackage: previousPackage
      ? {
          packageId: previousPackage.packageId,
          packageVersion: previousPackage.packageVersion,
          integrityFingerprint: previousPackage.integrity?.fingerprint
        }
      : null,
    reasonForNewVersion,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0,
    mergeActions: 0,
    publishActions: 0,
    quarantineMutations: 0
  };
  const withoutIntegrity = { ...base, integrity: {} };
  const packageValue = {
    ...base,
    integrity: createPropertyReviewCaseIntegrity(withoutIntegrity)
  };
  return sanitizePropertyReviewCasePackage(packageValue);
}

export function createVersionedPropertyReviewCasePackage({ reviewItem, previousPackage, generatedAt, reasonForNewVersion }) {
  const previousVersion = previousPackage?.packageVersion || "1.0.0";
  const [, minor = "0"] = previousVersion.split(".");
  const nextMinor = Number(minor) + 1;
  return buildPropertyReviewCasePackage({
    reviewItem,
    generatedAt,
    packageVersion: `1.${nextMinor}.0`,
    previousPackage,
    reasonForNewVersion: reasonForNewVersion || "CASE_EVIDENCE_OR_DECISION_CHANGED"
  });
}

export function exportPropertyReviewCasePackageJson(packageValue = {}) {
  const sanitized = sanitizePropertyReviewCasePackage(packageValue);
  return `${JSON.stringify(sanitized, null, 2)}\n`;
}

export function exportPropertyReviewCasePackageMarkdown(packageValue = {}) {
  const pkg = sanitizePropertyReviewCasePackage(packageValue);
  return [
    `# Property Review Case Package ${pkg.packageId}`,
    "",
    `Status: ${pkg.caseStatus}`,
    `Execution: ${pkg.executionStatus} / ${pkg.executionReadiness}`,
    "",
    "## Summary",
    pkg.summary,
    "",
    "## Reviewer Decision",
    pkg.reviewerDecisionSummary?.decisionId
      ? `${pkg.reviewerDecisionSummary.decisionType} / ${pkg.reviewerDecisionSummary.decisionStatus} / ${pkg.reviewerDecisionSummary.executionStatus}`
      : "NO REVIEWER DECISION RECORDED",
    "",
    "## Professional Review Requirements",
    pkg.professionalReviewRequirements.join(", "),
    "",
    "## Integrity",
    `${pkg.integrity.algorithm}: ${pkg.integrity.fingerprint}`,
    "",
    "## Limitations",
    ...pkg.limitations.map((limitation) => `- ${limitation}`)
  ].join("\n");
}

export function createPropertyReviewHandoff({
  packageValue = {},
  targetRole = propertyReviewHandoffTargetRoles.propertyReviewer,
  requestedReviewType = propertyProfessionalReviewRequirements.propertyReviewRequired,
  generatedAt = packageValue.generatedAt || "2026-08-20T00:00:00.000Z",
  status = propertyReviewHandoffStatuses.readyForHandoff
} = {}) {
  return {
    ...clone(propertyReviewHandoffContract),
    handoffId: `handoff_${packageValue.packageId || "unknown"}_${targetRole}`,
    packageId: packageValue.packageId || null,
    targetRole,
    requestedReviewType,
    generatedAt,
    status,
    localProofOnly: true,
    dispatchPerformed: false,
    externalCalls: 0,
    providerCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

export function createLisaPropertyReviewCasePackageExplanation(packageValue = {}) {
  const pkg = sanitizePropertyReviewCasePackage(packageValue);
  return {
    roleId: "LISA_ESSA_PRODUCT_GUIDE",
    accessBoundary: "INTERNAL / ADMIN / LOCAL PROOF",
    packageId: pkg.packageId,
    explanation: [
      `This case package contains source, validation, normalization, identity, evidence, conflict/gap, reviewer decision and audit history for ${pkg.sourceRecordId}.`,
      `Package status is ${pkg.caseStatus}; execution readiness is ${pkg.executionReadiness}.`,
      `Reviewer decision status is ${pkg.currentDecisionStatus}.`,
      `Professional review requirements: ${pkg.professionalReviewRequirements.join(", ")}.`,
      "REVIEWED_DECISION_RECORDED means a decision is auditable; it does not mean EXECUTED.",
      "No execution has occurred."
    ].join(" "),
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}
