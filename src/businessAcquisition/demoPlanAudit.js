import {
  acquisitionSafetyBoundary,
  createAcquisitionAuditArtifact
} from "./businessAcquisitionContracts.js";

export function createDemoPlanAuditArtifact({
  prospect = {},
  digitalAudit = {},
  score = {},
  demoPlan = {},
  recommendations = [],
  opportunityCodes = [],
  sourceFiles = []
} = {}) {
  const selected = demoPlan.selectedRecommendation || null;
  return {
    ...createAcquisitionAuditArtifact({
      prospectId: prospect.prospectId,
      digitalAuditId: digitalAudit.auditId,
      scoreId: score.scoreId,
      lifecycleState: demoPlan.demoType ? "DEMO_PLAN_RECOMMENDED" : "DEMO_PLAN_BLOCKED",
      exactArtifacts: sourceFiles,
      sourceRefs: prospect.sourceRefs || [],
      counters: acquisitionSafetyBoundary
    }),
    artifactType: "BusinessAcquisitionDemoPlanProof",
    phase: "BUSINESS_ACQUISITION_PHASE_B",
    status: "BUSINESS_ACQUISITION_PHASE_B_PASS",
    inputProspect: prospect,
    opportunityEvidence: {
      observedFacts: digitalAudit.observedFacts || [],
      inferredOpportunities: digitalAudit.inferredOpportunities || [],
      missingEvidence: digitalAudit.missingEvidence || [],
      opportunityCodes
    },
    selectedDemo: selected ? {
      demoPlanId: demoPlan.demoPlanId,
      demoType: selected.demoType,
      businessContext: selected.businessContext,
      targetProblem: selected.targetProblem,
      expectedValue: selected.expectedValue,
      reasoningCodes: selected.reasoningCodes,
      evidenceRefs: selected.evidenceRefs
    } : null,
    rejectedDemoAlternatives: (demoPlan.rejectedAlternatives || recommendations.filter((item) => item.rejected)).map((item) => ({
      demoType: item.demoType,
      score: item.score,
      priority: item.priority,
      reasoningCodes: item.reasoningCodes,
      rejectionReasons: item.rejectionReasons || ["NOT_SELECTED"]
    })),
    assumptions: demoPlan.assumptions || [],
    missingInputs: demoPlan.missingInputs || [],
    capabilities: {
      required: demoPlan.requiredCapabilities || [],
      optional: demoPlan.optionalCapabilities || [],
      providerRequirements: demoPlan.providerRequirements || []
    },
    safetyGate: demoPlan.safetyGate || null,
    boundaries: {
      demoPlanSeparateFromGeneratedDemo: true,
      generatedDemoSeparateFromPaidProductionDeliverable: true,
      businessProfileCreationAllowed: false,
      executionEnabled: false,
      publishAllowed: false,
      handoffAllowed: false
    },
    counters: {
      ...acquisitionSafetyBoundary,
      providerCalls: 0,
      externalCalls: 0,
      publishActions: 0,
      outreachActions: 0,
      paymentActions: 0
    }
  };
}
