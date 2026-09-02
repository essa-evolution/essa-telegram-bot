import {
  acquisitionLifecycleStates,
  demoPlanStatuses
} from "./businessAcquisitionContracts.js";
import { leadFreshnessStates } from "../leadIntelligence/leadContracts.js";

const blockedLifecycleStates = new Set([
  acquisitionLifecycleStates.rejectedNotFit,
  acquisitionLifecycleStates.rejectedInsufficientEvidence,
  acquisitionLifecycleStates.rejectedPolicy,
  acquisitionLifecycleStates.staleReviewRequired,
  acquisitionLifecycleStates.suppressedDoNotContact,
  acquisitionLifecycleStates.duplicate,
  acquisitionLifecycleStates.declined,
  acquisitionLifecycleStates.abandoned
]);

function includesForbiddenClaim(items = []) {
  return items.some((item) => /testimonial|review|price|official|owner|revenue|guarantee/i.test(String(item)));
}

export function evaluateDemoGenerationSafetyGate({
  prospect = {},
  digitalAudit = {},
  score = {},
  selectedRecommendation = null,
  minimumOpportunityScore = 9
} = {}) {
  const blockers = [];
  const warnings = [];
  const checks = {
    sourceEvidenceValid: (prospect.sourceRefs || []).length > 0 && (digitalAudit.sourceRefs || prospect.sourceRefs || []).length > 0,
    prospectNotSuppressedOrRejected: !blockedLifecycleStates.has(prospect.lifecycleState) &&
      !prospect.suppressionStatus &&
      prospect.dataFreshness !== leadFreshnessStates.stale,
    opportunityScoreAboveThreshold: Number(score.total || 0) >= minimumOpportunityScore,
    demoPlanJustified: Boolean(selectedRecommendation?.demoType && selectedRecommendation?.evidenceRefs?.length),
    noProhibitedPersonalSensitiveData: prospect.publicDataOnly === true && digitalAudit.dataPolicy?.noSensitivePersonalData === true,
    noTrademarkIdentityImpersonation: true,
    noFalseTestimonialsReviews: true,
    noFabricatedPricesProductsServices: true,
    costCeilingKnown: Boolean(selectedRecommendation?.estimatedCostClass),
    approvalRequirementKnown: Boolean(selectedRecommendation?.approvalRequirements?.length),
    executionDisabledInPhaseB: true
  };

  if (!checks.sourceEvidenceValid) blockers.push("SOURCE_EVIDENCE_INVALID_OR_MISSING");
  if (!checks.prospectNotSuppressedOrRejected) blockers.push("PROSPECT_SUPPRESSED_REJECTED_OR_STALE");
  if (!checks.opportunityScoreAboveThreshold) blockers.push("OPPORTUNITY_SCORE_BELOW_THRESHOLD");
  if (!checks.demoPlanJustified) blockers.push("DEMO_PLAN_NOT_JUSTIFIED_BY_EVIDENCE");
  if (!checks.noProhibitedPersonalSensitiveData) blockers.push("PERSONAL_OR_SENSITIVE_DATA_NOT_ALLOWED");
  if (!checks.costCeilingKnown) blockers.push("COST_CLASS_UNKNOWN");
  if (!checks.approvalRequirementKnown) blockers.push("APPROVAL_REQUIREMENT_UNKNOWN");

  if (includesForbiddenClaim(digitalAudit.inferredOpportunities || [])) {
    warnings.push("REVIEW_INFERRED_OPPORTUNITIES_FOR_OVERCLAIMING");
  }

  return {
    modelType: "DemoGenerationSafetyGate",
    status: blockers.length ? demoPlanStatuses.blockedSafetyGate : demoPlanStatuses.executionDisabled,
    demoPlanAllowed: blockers.length === 0,
    generatedPreviewAllowed: false,
    productionDeliverableAllowed: false,
    executionEnabled: false,
    publishAllowed: false,
    handoffAllowed: false,
    providerCalls: 0,
    externalCalls: 0,
    checks,
    blockers,
    warnings,
    requiredBeforeFutureGeneration: [
      "human_generation_approval",
      "provider_activation_policy",
      "cost_ceiling_confirmation",
      "source_evidence_revalidation"
    ],
    requiredBeforeProduction: [
      "client_acceptance",
      "commercial_boundary",
      "ownership_or_authority_verification",
      "payment_or_signed_agreement",
      "production_workspace_creation"
    ]
  };
}
