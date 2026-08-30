import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import { createLisaProductGuideContext } from "../capabilities/capabilityKnowledge.js";
import {
  propertyIngestionFixtureBatch
} from "./propertyIngestionFixtures.js";
import {
  propertyIngestionMatchOutcomes,
  propertyIngestionValidationStatuses
} from "./propertyIngestionContracts.js";
import {
  runLocalPropertyIngestionFixtureBatch
} from "./propertyIngestionPipeline.js";
import {
  blockPropertyReviewerDecisionExecution,
  buildPropertyReviewerDecisionAuditTrail,
  buildPropertyReviewerEvidenceRefs,
  createPropertyReviewerDecision,
  getAllowedPropertyReviewerDecisionTypes,
  propertyReviewerDecisionStatuses,
  propertyReviewerDecisionTypes,
  propertyReviewerExecutionStatuses,
  propertyReviewerReasonCodes,
  propertyReviewerRoles,
  validatePropertyReviewerDecision
} from "./propertyReviewerDecision.js";
import {
  propertyReviewerDecisionFixtureList as defaultReviewerDecisions
} from "./propertyReviewerDecisionFixtures.js";
import {
  buildPropertyReviewCasePackage,
  createLisaPropertyReviewCasePackageExplanation,
  createPropertyReviewHandoff,
  createVersionedPropertyReviewCasePackage,
  exportPropertyReviewCasePackageJson,
  exportPropertyReviewCasePackageMarkdown
} from "./propertyReviewCasePackage.js";

export const propertyIngestionReviewStateLabels = {
  ACCEPTED: "Accepted: validation passed and canonical read objects were created.",
  ACCEPTED_WITH_GAPS: "Accepted with gaps: safe enough for local review, but missing fields remain visible.",
  QUARANTINED: "Quarantined: blocked before canonical repository read because validation found unsafe or impossible values.",
  REJECTED: "Rejected: record is not eligible for ingestion.",
  EXACT_MATCH: "Exact match: deterministic local identity matched an existing canonical Property.",
  PROBABLE_MATCH_REVIEW_REQUIRED: "Probable match: review is required; no confirmed merge should be claimed.",
  NO_MATCH_NEW_PROPERTY_CANDIDATE: "New candidate: deterministic local rules created a new canonical Property candidate.",
  CONFLICT_REVIEW_REQUIRED: "Conflict review: source-backed observations disagree and no value is silently overwritten."
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function valueText(value) {
  if (value == null || value === "") return "MISSING";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function sourceForAudit(audit = {}, sourceRecords = []) {
  return sourceRecords.find((record) => record.sourceRecordId === audit.sourceRecordId) || null;
}

function safeRawPreview(record = {}) {
  return {
    project: record.rawPayload?.project || null,
    building: record.rawPayload?.building || null,
    unit: record.rawPayload?.unit || null,
    areaSqm: record.rawPayload?.areaSqm ?? null,
    bedrooms: record.rawPayload?.bedrooms ?? null,
    agencyListingId: record.rawPayload?.agencyListingId || null,
    sourceVisible: record.rawPayload?.sourceVisible ?? null
  };
}

function buildNormalizationRows(record = {}, candidate = {}) {
  return [
    ["country", record.location?.country, candidate.normalizedLocation?.country],
    ["region", record.location?.region, candidate.normalizedLocation?.region],
    ["city", record.location?.city, candidate.normalizedLocation?.city],
    ["address", record.location?.address, candidate.normalizedLocation?.address],
    ["propertyType", record.declaredPropertyType, candidate.propertyType],
    ["listingType", record.listing?.listingType, candidate.listingObservation?.listingType],
    ["listingStatus", record.listing?.listingStatus, candidate.listingObservation?.listingStatus],
    ["price", record.price, candidate.listingObservation?.price],
    ["currency", record.currency, candidate.listingObservation?.currency],
    ["areaSqm", record.rawPayload?.areaSqm, candidate.hierarchyHints?.areaSqm],
    ["bedrooms", record.rawPayload?.bedrooms, candidate.hierarchyHints?.bedrooms],
    ["project", record.rawPayload?.project, candidate.hierarchyHints?.projectName],
    ["building", record.rawPayload?.building, candidate.hierarchyHints?.buildingName],
    ["unit", record.rawPayload?.unit, candidate.hierarchyHints?.unitNumber]
  ].map(([field, rawValue, normalizedValue]) => ({
    field,
    rawValue: valueText(rawValue),
    normalizedValue: valueText(normalizedValue),
    invented: rawValue == null && normalizedValue != null && normalizedValue !== "" && normalizedValue !== "UNKNOWN"
  }));
}

function buildTimeline(item = {}) {
  const stopped = item.validationStatus === propertyIngestionValidationStatuses.quarantined ||
    item.validationStatus === propertyIngestionValidationStatuses.rejected;
  const normalized = item.normalizationStatus && item.normalizationStatus !== "NOT_NORMALIZED";
  const identityResolved = item.matchOutcome && item.matchOutcome !== "NOT_RESOLVED";
  const steps = [
    ["Received", true, item.observedAt],
    ["Validated", Boolean(item.validationStatus), item.auditTimestamp],
    ["Normalized", Boolean(normalized), item.auditTimestamp],
    ["Identity Resolved", Boolean(identityResolved), item.auditTimestamp],
    ["Listing Snapshot Created", Boolean(item.listingSnapshotId), item.auditTimestamp],
    ["Canonical Property Linked / Candidate Created", Boolean(item.canonicalPropertyId), item.auditTimestamp],
    ["Repository Read Ready", Boolean(item.canonicalPropertyId) && !stopped, item.auditTimestamp]
  ];
  return steps.map(([stage, completed, timestamp]) => ({
    stage,
    status: completed ? "COMPLETE" : stopped ? "STOPPED" : "PENDING",
    timestamp: timestamp || null
  }));
}

function listingRowsForProperty(propertyId, listings = []) {
  return safeArray(listings)
    .filter((listing) => listing.propertyId === propertyId)
    .map((listing) => ({
      listingSnapshotId: listing.listingId,
      source: `${listing.sourceRef?.sourceName || "MISSING"} / ${listing.sourceRef?.sourceId || "MISSING"}`,
      observedAt: listing.observedAt,
      freshness: listing.freshnessStatus,
      price: listing.price,
      currency: listing.currency,
      listingStatus: listing.listingStatus,
      conflictState: "SOURCE_BACKED_OBSERVATION"
    }));
}

function buildLineageRows(item = {}, batch = {}) {
  if (!item.canonicalPropertyId) return [];
  const facts = safeArray(batch.store?.facts).filter((fact) => fact.sourceRef?.sourceId === item.sourceRecordId);
  const listings = safeArray(batch.store?.listingSnapshots).filter((listing) => listing.sourceRef?.sourceId === item.sourceRecordId);
  return [
    ...facts.map((fact) => ({
      trace: "SourceRecord -> SourceRef -> PropertyFact -> Canonical Property -> Property Passport",
      sourceRecordId: item.sourceRecordId,
      sourceRefId: fact.sourceRef?.sourceId,
      artifactType: "PropertyFact",
      artifactId: fact.factType,
      canonicalPropertyId: item.canonicalPropertyId,
      observedAt: fact.observedAt
    })),
    ...listings.map((listing) => ({
      trace: "SourceRecord -> SourceRef -> ListingSnapshot -> Canonical Property -> Property Passport",
      sourceRecordId: item.sourceRecordId,
      sourceRefId: listing.sourceRef?.sourceId,
      artifactType: "ListingSnapshot",
      artifactId: listing.listingId,
      canonicalPropertyId: item.canonicalPropertyId,
      observedAt: listing.observedAt
    }))
  ];
}

function buildReviewItem(audit = {}, batch = {}, sourceRecords = []) {
  const record = sourceForAudit(audit, sourceRecords) || {};
  const candidate = audit.normalizationResult || {};
  const validation = audit.validationResult || {};
  const resolution = audit.duplicateResolution || {};
  const validationStatus = validation.status || "UNKNOWN";
  const matchOutcome = resolution.outcome || "NOT_RESOLVED";
  const sourceType = record.sourceType || candidate.sourceRefs?.[0]?.sourceType || "UNKNOWN";
  const conflictRows = audit.conflicts?.length
    ? listingRowsForProperty(audit.canonicalPropertyId, batch.store?.listingSnapshots)
    : [];
  const item = {
    modelType: "PropertyIngestionReviewItem",
    ingestionId: audit.ingestionId,
    sourceType,
    sourceName: record.sourceName || candidate.sourceRefs?.[0]?.sourceName || "MISSING",
    sourceRecordId: audit.sourceRecordId,
    sourceUrl: record.sourceUrl || null,
    observedAt: record.observedAt || candidate.listingObservation?.observedAt || null,
    fetchedAt: record.fetchedAt || null,
    validationStatus,
    normalizationStatus: candidate.modelType ? "NORMALIZED" : "NOT_NORMALIZED",
    matchOutcome,
    canonicalPropertyId: audit.canonicalPropertyId || null,
    listingSnapshotId: audit.listingSnapshotId || null,
    warnings: safeArray(audit.warnings),
    conflicts: safeArray(audit.conflicts),
    gaps: safeArray(audit.gaps),
    auditTimestamp: audit.timestamp,
    explanations: {
      validation: propertyIngestionReviewStateLabels[validationStatus] || "Validation state is not available.",
      match: propertyIngestionReviewStateLabels[matchOutcome] || "Identity resolution did not produce a match outcome."
    },
    sourceDetail: {
      sourceType,
      sourceName: record.sourceName || "MISSING",
      sourceRecordId: record.sourceRecordId || audit.sourceRecordId,
      sourceUrl: record.sourceUrl || null,
      observedAt: record.observedAt || null,
      fetchedAt: record.fetchedAt || null,
      declaredData: {
        propertyType: record.declaredPropertyType || "UNKNOWN",
        location: clone(record.location || {}),
        listingType: record.listing?.listingType || "MISSING",
        listingStatus: record.listing?.listingStatus || "MISSING",
        price: record.price ?? null,
        currency: record.currency || null,
        rawPreview: safeRawPreview(record)
      }
    },
    validationDetail: {
      status: validationStatus,
      passedChecks: validationStatus === propertyIngestionValidationStatuses.accepted || validationStatus === propertyIngestionValidationStatuses.acceptedWithGaps
        ? ["source_identity", "source_record_id", "observed_at", "location_shape", "price_shape", "currency_shape"]
        : [],
      warnings: safeArray(validation.warnings),
      gaps: safeArray(validation.gaps),
      errors: safeArray(validation.errors),
      blockedStage: validationStatus === propertyIngestionValidationStatuses.quarantined ? "VALIDATION" : null
    },
    normalizationDetail: {
      status: candidate.modelType ? "NORMALIZED" : "NOT_NORMALIZED",
      rows: buildNormalizationRows(record, candidate)
    },
    identityResolutionDetail: {
      candidateIdentityHints: safeArray(candidate.duplicateMatchHints),
      matchedPropertyId: audit.canonicalPropertyId || null,
      matchOutcome,
      deterministicRuleUsed: resolution.reason || "NOT_AVAILABLE",
      confidence: candidate.confidence || "UNKNOWN",
      manualReviewRequired: [
        propertyIngestionMatchOutcomes.probableMatchReviewRequired,
        propertyIngestionMatchOutcomes.conflictReviewRequired
      ].includes(matchOutcome)
    },
    conflictDetail: {
      hasConflict: safeArray(audit.conflicts).length > 0,
      conflicts: safeArray(audit.conflicts),
      observations: conflictRows
    },
    sourceLineage: [],
    auditTimeline: [],
    mutationActions: {
      approveMerge: "NOT_ACTIVE_YET",
      rejectMerge: "NOT_ACTIVE_YET",
      restoreFromQuarantine: "NOT_ACTIVE_YET",
      publish: "NOT_ACTIVE_YET",
      writeProperty: "NOT_ACTIVE_YET"
    },
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
  item.sourceLineage = buildLineageRows(item, batch);
  item.auditTimeline = buildTimeline(item);
  return item;
}

function applyFilters(items = [], filters = {}) {
  return items.filter((item) => {
    if (filters.sourceType && item.sourceType !== filters.sourceType) return false;
    if (filters.validationStatus && item.validationStatus !== filters.validationStatus) return false;
    if (filters.matchOutcome && item.matchOutcome !== filters.matchOutcome) return false;
    if (filters.hasConflict === true && !item.conflictDetail.hasConflict) return false;
    if (filters.hasGaps === true && !item.gaps.length) return false;
    if (filters.quarantined === true && item.validationStatus !== propertyIngestionValidationStatuses.quarantined) return false;
    if (filters.canonicalPropertyId && item.canonicalPropertyId !== filters.canonicalPropertyId) return false;
    if (filters.decisionStatus && item.currentDecision?.decisionStatus !== filters.decisionStatus) return false;
    if (filters.decisionType && item.currentDecision?.decisionType !== filters.decisionType) return false;
    if (filters.reviewerRole && item.currentDecision?.reviewerRole !== filters.reviewerRole) return false;
    if (filters.hasDecision === true && !item.decisionHistory.length) return false;
    if (filters.superseded === true && !item.decisionHistory.some((decision) => decision.decisionStatus === propertyReviewerDecisionStatuses.superseded)) return false;
    if (filters.needsMoreEvidence === true && item.currentDecision?.decisionType !== propertyReviewerDecisionTypes.requestMoreEvidence) return false;
    return true;
  });
}

function defaultReasonForDecision(decisionType) {
  if (decisionType === propertyReviewerDecisionTypes.confirmExactMatch) return propertyReviewerReasonCodes.projectBuildingUnitMatch;
  if (decisionType === propertyReviewerDecisionTypes.acknowledgeConflict) return propertyReviewerReasonCodes.conflictingPrice;
  if (decisionType === propertyReviewerDecisionTypes.keepInQuarantine) return propertyReviewerReasonCodes.malformedSource;
  if (decisionType === propertyReviewerDecisionTypes.rejectSourceRecord) return propertyReviewerReasonCodes.malformedSource;
  if (decisionType === propertyReviewerDecisionTypes.acceptWithGaps) return propertyReviewerReasonCodes.missingRequiredSourceData;
  if (decisionType === propertyReviewerDecisionTypes.requestMoreEvidence) return propertyReviewerReasonCodes.insufficientEvidence;
  return propertyReviewerReasonCodes.manualReviewRequired;
}

function attachReviewerDecisionContext(item = {}, decisions = []) {
  const availableDecisionTypes = getAllowedPropertyReviewerDecisionTypes(item);
  const decisionHistory = decisions
    .filter((decision) => decision.ingestionId === item.ingestionId)
    .map((decision) => ({
      ...decision,
      validation: validatePropertyReviewerDecision(decision, item),
      executionGuard: blockPropertyReviewerDecisionExecution(decision)
    }));
  const currentDecision = [...decisionHistory]
    .reverse()
    .find((decision) => decision.decisionStatus !== propertyReviewerDecisionStatuses.superseded) || null;
  const draftType = availableDecisionTypes[0] || propertyReviewerDecisionTypes.requestMoreEvidence;
  const decisionDraft = createPropertyReviewerDecision({
    decisionId: `draft_${item.ingestionId || "unknown"}`,
    ingestionId: item.ingestionId,
    sourceRecordId: item.sourceRecordId,
    canonicalPropertyId: item.canonicalPropertyId,
    decisionType: draftType,
    reviewerRole: propertyReviewerRoles.reviewer,
    reviewerId: "local_property_reviewer_lisa_placeholder",
    reasonCode: defaultReasonForDecision(draftType),
    rationale: "Local reviewer draft for Phase 22J contract validation only.",
    evidenceRefs: buildPropertyReviewerEvidenceRefs(item),
    warningsAcknowledged: [...(item.warnings || []), ...(item.gaps || []), ...(item.conflicts || [])],
    createdAt: item.auditTimestamp,
    decisionStatus: propertyReviewerDecisionStatuses.draft
  });
  const draftValidation = validatePropertyReviewerDecision(decisionDraft, item);
  const itemWithDecision = {
    ...item,
    availableDecisionTypes,
    decisionDraft,
    decisionDraftValidation: draftValidation,
    decisionHistory,
    currentDecision,
    decisionAuditTrail: buildPropertyReviewerDecisionAuditTrail(decisionHistory),
    decisionExecutionGuard: blockPropertyReviewerDecisionExecution(currentDecision || decisionDraft),
    decisionStatusSummary: currentDecision
      ? `${currentDecision.decisionStatus} / ${currentDecision.executionStatus}`
      : `NO REVIEWER DECISION YET / ${propertyReviewerExecutionStatuses.notExecuted}`
  };
  const reviewCasePackage = buildPropertyReviewCasePackage({ reviewItem: itemWithDecision });
  const versionedReviewCasePackage = createVersionedPropertyReviewCasePackage({
    reviewItem: itemWithDecision,
    previousPackage: reviewCasePackage,
    generatedAt: "2026-08-21T00:00:00.000Z",
    reasonForNewVersion: "LOCAL_NEW_EVIDENCE_VERSION_PROOF"
  });
  return {
    ...itemWithDecision,
    reviewCasePackage,
    versionedReviewCasePackage,
    reviewCaseHandoff: createPropertyReviewHandoff({ packageValue: reviewCasePackage }),
    reviewCaseExports: {
      json: exportPropertyReviewCasePackageJson(reviewCasePackage),
      markdown: exportPropertyReviewCasePackageMarkdown(reviewCasePackage)
    },
    reviewCaseLisaExplanation: createLisaPropertyReviewCasePackageExplanation(reviewCasePackage)
  };
}

export function buildPropertyIngestionReviewViewModel({
  batch = runLocalPropertyIngestionFixtureBatch(propertyIngestionFixtureBatch),
  sourceRecords = propertyIngestionFixtureBatch,
  selectedIngestionId = null,
  filters = {},
  reviewerDecisions = defaultReviewerDecisions
} = {}) {
  const queue = safeArray(batch.audits)
    .map((audit) => buildReviewItem(audit, batch, sourceRecords))
    .map((item) => attachReviewerDecisionContext(item, reviewerDecisions));
  const filteredQueue = applyFilters(queue, filters);
  const selected = filteredQueue.find((item) => item.ingestionId === selectedIngestionId) || filteredQueue[0] || null;
  const quarantine = queue
    .filter((item) => item.validationStatus === propertyIngestionValidationStatuses.quarantined)
    .map((item) => ({
      ingestionId: item.ingestionId,
      reason: item.validationDetail.errors.join(", ") || "QUARANTINED",
      source: item.sourceName,
      sourceRecordId: item.sourceRecordId,
      blockedStage: item.validationDetail.blockedStage,
      retryOrReviewFuture: "THEORETICAL_REVIEW_ONLY_NOT_ACTIVE"
    }));
  return {
    modelType: "PropertyIngestionReviewViewModel",
    accessBoundary: "INTERNAL / ADMIN / LOCAL PROOF",
    queue,
    filteredQueue,
    selected,
    filters: clone(filters),
    stateExplanations: clone(propertyIngestionReviewStateLabels),
    quarantine,
    summary: {
      total: queue.length,
      accepted: queue.filter((item) => item.validationStatus === propertyIngestionValidationStatuses.accepted).length,
      acceptedWithGaps: queue.filter((item) => item.validationStatus === propertyIngestionValidationStatuses.acceptedWithGaps).length,
      quarantined: quarantine.length,
      rejected: queue.filter((item) => item.validationStatus === propertyIngestionValidationStatuses.rejected).length,
      exactMatches: queue.filter((item) => item.matchOutcome === propertyIngestionMatchOutcomes.exactMatch).length,
      probableReview: queue.filter((item) => item.matchOutcome === propertyIngestionMatchOutcomes.probableMatchReviewRequired).length,
      newCandidates: queue.filter((item) => item.matchOutcome === propertyIngestionMatchOutcomes.noMatchNewPropertyCandidate).length,
      conflicts: queue.filter((item) => item.matchOutcome === propertyIngestionMatchOutcomes.conflictReviewRequired).length
    },
    disabledActions: ["approve_merge", "reject_merge", "restore_from_quarantine", "publish", "import", "activate_listing", "write_property"],
    decisionCatalog: {
      decisionTypes: clone(propertyReviewerDecisionTypes),
      decisionStatuses: clone(propertyReviewerDecisionStatuses),
      reasonCodes: clone(propertyReviewerReasonCodes),
      reviewerRoles: clone(propertyReviewerRoles)
    },
    decisionSummary: {
      totalDecisions: queue.reduce((total, item) => total + item.decisionHistory.length, 0),
      approvedAsDecision: queue.filter((item) => item.currentDecision?.decisionStatus === propertyReviewerDecisionStatuses.approvedAsDecision).length,
      readyForReview: queue.filter((item) => item.currentDecision?.decisionStatus === propertyReviewerDecisionStatuses.readyForReview).length,
      superseded: queue.filter((item) => item.decisionHistory.some((decision) => decision.decisionStatus === propertyReviewerDecisionStatuses.superseded)).length,
      needsMoreEvidence: queue.filter((item) => item.currentDecision?.decisionType === propertyReviewerDecisionTypes.requestMoreEvidence).length,
      executionPerformed: 0,
      mergeActions: 0,
      publishActions: 0,
      quarantineMutations: 0
    },
    packageSummary: {
      totalPackages: queue.length,
      readyForHumanReview: queue.filter((item) => item.reviewCasePackage.caseStatus === "READY_FOR_HUMAN_REVIEW").length,
      reviewedDecisionRecorded: queue.filter((item) => item.reviewCasePackage.caseStatus === "REVIEWED_DECISION_RECORDED").length,
      blockedByConflict: queue.filter((item) => item.reviewCasePackage.caseStatus === "BLOCKED_BY_CONFLICT").length,
      blockedByQuarantine: queue.filter((item) => item.reviewCasePackage.caseStatus === "BLOCKED_BY_QUARANTINE").length,
      blockedByMissingEvidence: queue.filter((item) => item.reviewCasePackage.caseStatus === "BLOCKED_BY_MISSING_EVIDENCE").length,
      executionReadiness: "EXECUTION_NOT_ENABLED"
    },
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0,
    bookingActions: 0,
    transactionActions: 0
  };
}

export function buildBoundedPropertyIngestionReviewContext(viewModel = buildPropertyIngestionReviewViewModel()) {
  const selected = viewModel.selected || {};
  const boundedContext = buildContextPackage({
    intent: "property_ingestion_internal_review",
    maxItems: 4,
    maxChars: 1800,
    memoryItems: [
      {
        id: "ingestion_review_selected",
        text: JSON.stringify({
          ingestionId: selected.ingestionId,
          validationStatus: selected.validationStatus,
          matchOutcome: selected.matchOutcome,
          canonicalPropertyId: selected.canonicalPropertyId,
          warnings: selected.warnings,
          conflicts: selected.conflicts,
          gaps: selected.gaps,
          availableDecisionTypes: selected.availableDecisionTypes,
          decisionStatusSummary: selected.decisionStatusSummary,
          executionStatus: selected.currentDecision?.executionStatus || selected.decisionDraft?.executionStatus,
          reviewCasePackageId: selected.reviewCasePackage?.packageId,
          reviewCaseStatus: selected.reviewCasePackage?.caseStatus
        }),
        relevance: 1,
        source: "PropertyIngestionReviewViewModel"
      },
      {
        id: "reviewer_decision_context",
        text: JSON.stringify({
          currentDecision: selected.currentDecision,
          decisionHistory: selected.decisionHistory,
          allowedDecisionTypes: selected.availableDecisionTypes,
          executionGuard: selected.decisionExecutionGuard
        }),
        relevance: 0.92,
        source: "PropertyReviewerDecision"
      },
      {
        id: "review_case_package",
        text: JSON.stringify({
          packageId: selected.reviewCasePackage?.packageId,
          caseStatus: selected.reviewCasePackage?.caseStatus,
          professionalReviewRequirements: selected.reviewCasePackage?.professionalReviewRequirements,
          executionReadiness: selected.reviewCasePackage?.executionReadiness,
          integrity: selected.reviewCasePackage?.integrity
        }),
        relevance: 0.91,
        source: "PropertyReviewCasePackage"
      },
      {
        id: "ingestion_review_lineage",
        text: JSON.stringify(selected.sourceLineage || []),
        relevance: 0.95,
        source: "PropertyIngestionLineage"
      },
      {
        id: "ingestion_review_timeline",
        text: JSON.stringify(selected.auditTimeline || []),
        relevance: 0.9,
        source: "PropertyIngestionAudit"
      }
    ]
  });
  return {
    intent: "PROPERTY_INGESTION_INTERNAL_REVIEW",
    accessBoundary: viewModel.accessBoundary,
    selectedIngestionId: selected.ingestionId || null,
    boundedContext,
    boundedContextMetadata: {
      selectedCount: boundedContext.selected.length,
      omittedCount: boundedContext.omittedCount,
      usedChars: boundedContext.budget.usedChars,
      maxChars: boundedContext.budget.maxChars
    },
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export function createLisaPropertyIngestionReviewExplanation(viewModel = buildPropertyIngestionReviewViewModel()) {
  const lisaGuide = createLisaProductGuideContext();
  const selected = viewModel.selected || {};
  const conflictText = selected.conflicts?.length
    ? `Conflict: ${selected.conflicts.join(", ")}. ESSA does not choose the correct value automatically.`
    : "No conflict is selected.";
  const quarantineText = selected.validationStatus === propertyIngestionValidationStatuses.quarantined
    ? `This record is quarantined because: ${selected.validationDetail.errors.join(", ") || "validation failed"}.`
    : "This selected record is not quarantined.";
  const decisionText = selected.currentDecision
    ? `Reviewer decision: ${selected.currentDecision.decisionType} is ${selected.currentDecision.decisionStatus}; execution status is ${selected.currentDecision.executionStatus}.`
    : `No reviewer decision yet. Available decision options: ${(selected.availableDecisionTypes || []).join(", ") || "none"}.`;
  const supersededText = selected.decisionHistory?.some((decision) => decision.decisionStatus === propertyReviewerDecisionStatuses.superseded)
    ? "This item has a superseded decision preserved in append-only history."
    : "No superseded reviewer decision is selected.";
  return {
    roleId: lisaGuide.role.roleId,
    accessBoundary: viewModel.accessBoundary,
    selectedIngestionId: selected.ingestionId || null,
    explanation: [
      `This is an internal local ingestion review for ${selected.sourceRecordId || "no selected record"}.`,
      `Validation: ${selected.validationStatus || "UNKNOWN"}. Identity resolution: ${selected.matchOutcome || "UNKNOWN"}.`,
      selected.identityResolutionDetail?.deterministicRuleUsed ? `Rule used: ${selected.identityResolutionDetail.deterministicRuleUsed}.` : "",
      conflictText,
      quarantineText,
      decisionText,
      supersededText,
      "Approved as Decision means a human review decision was recorded only; it does not mean merge/write/publish/quarantine execution.",
      "No execution has occurred.",
      "No approve, merge, restore, publish, provider retry, database write, booking, payment or transaction action is active."
    ].filter(Boolean).join(" "),
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}
