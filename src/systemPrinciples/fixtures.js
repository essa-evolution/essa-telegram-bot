import { productIds } from "../capabilities/productCapabilityMap.js";
import {
  createCreatorFirstAuditArtifact,
  createCreatorFirstDecision,
  createCreatorFirstWorkflowAudit,
  createManualBurdenFinding,
  createUserEffortProfile,
  creatorFirstAntiPatterns,
  creatorFirstDecisionRecommendations,
  creatorFirstPermissionStates,
  creatorFirstRiskClasses,
  creatorFirstReversibilityStates
} from "./creatorFirstSystemPrinciple.js";

export function createCreatorFirstAuditFixture() {
  const safePreparationDecision = createCreatorFirstDecision({
    action: "calculate_local_content_metrics",
    canSystemPrepare: true,
    canSystemExecute: false,
    humanDecisionRequired: false,
    approvalRequired: false,
    reversibility: creatorFirstReversibilityStates.reversible,
    permissionState: creatorFirstPermissionStates.allowed,
    recommendedInteraction: creatorFirstDecisionRecommendations.systemPrepare
  });

  const moneyDecision = createCreatorFirstDecision({
    action: "approve_ad_spend",
    canSystemPrepare: true,
    canSystemExecute: false,
    humanDecisionRequired: true,
    approvalRequired: true,
    riskClass: creatorFirstRiskClasses.financial,
    reversibility: creatorFirstReversibilityStates.limited,
    permissionState: creatorFirstPermissionStates.approvalRequired
  });

  const publishDecision = createCreatorFirstDecision({
    action: "publish_content",
    canSystemPrepare: true,
    canSystemExecute: false,
    humanDecisionRequired: true,
    approvalRequired: true,
    riskClass: creatorFirstRiskClasses.publish,
    reversibility: creatorFirstReversibilityStates.limited,
    permissionState: creatorFirstPermissionStates.approvalRequired
  });

  const destructiveDecision = createCreatorFirstDecision({
    action: "delete_external_campaign",
    canSystemPrepare: true,
    canSystemExecute: false,
    humanDecisionRequired: true,
    approvalRequired: true,
    riskClass: creatorFirstRiskClasses.destructive,
    reversibility: creatorFirstReversibilityStates.irreversible,
    permissionState: creatorFirstPermissionStates.approvalRequired
  });

  const effortProfile = createUserEffortProfile({
    task: "content_experiment_review",
    requiredHumanInputs: ["creative_goal"],
    requiredHumanDecisions: ["accept_or_reject_recommendation"],
    systemPreparations: ["normalize_metrics", "compare_variants", "prepare_next_test_options"],
    systemExecutableSteps: ["local_calculation"],
    avoidableManualSteps: ["manual_copying", "manual_recalculation"],
    unavoidableHumanSteps: ["taste_judgment", "risk_acceptance"],
    approvalSteps: ["publish_approval"]
  });

  const manualBurdenFindings = [
    createManualBurdenFinding({
      workflow: "content_intelligence",
      step: "copy_metric_values",
      reasonManualToday: "metrics_provider_not_connected",
      systemCapabilityAvailable: true,
      permissionRequired: "future_platform_adapter_approval",
      automationPotential: "FUTURE_ALLOWED_AFTER_PROVIDER_AND_PRIVACY_GATES",
      risk: creatorFirstRiskClasses.material,
      antiPattern: creatorFirstAntiPatterns.manualCopying
    }),
    createManualBurdenFinding({
      workflow: "business_management",
      step: "recalculate_cash_flow_signal",
      reasonManualToday: "live_business_repository_not_connected",
      systemCapabilityAvailable: true,
      permissionRequired: "business_data_permission",
      automationPotential: "FUTURE_REPORT_BY_EXCEPTION",
      risk: creatorFirstRiskClasses.financial,
      antiPattern: creatorFirstAntiPatterns.manualRecalculation
    })
  ];

  const workflowAudits = [
    createCreatorFirstWorkflowAudit({
      workflow: "Product Discovery",
      whatSystemAlreadyHandles: ["bounded Product Knowledge search", "availability wording", "next safe actions"],
      whatUserStillDoes: ["states intent", "chooses direction"],
      whatMustRemainHuman: ["goal", "final selection"],
      whatCouldBecomeAutomatedLater: ["richer option preparation"],
      approvalBlocksAutomation: ["execution intent approval"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Execution Preflight",
      whatSystemAlreadyHandles: ["inputs", "dependencies", "cost class", "provider requirements", "approval points", "rollback"],
      whatUserStillDoes: ["supplies missing required inputs", "approves material action"],
      whatMustRemainHuman: ["money", "publish", "provider activation", "destructive action"],
      whatCouldBecomeAutomatedLater: ["safe internal readiness checks"],
      approvalBlocksAutomation: ["payment", "publish", "deploy", "external mutation"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Business Management",
      whatSystemAlreadyHandles: ["business contracts", "revenue loop modeling", "health snapshot concepts"],
      whatUserStillDoes: ["business authority decisions", "financial approvals"],
      whatMustRemainHuman: ["owner judgment", "risk acceptance", "payment decisions"],
      whatCouldBecomeAutomatedLater: ["anomaly detection", "report generation", "action preparation"],
      approvalBlocksAutomation: ["money", "legal", "external accounts"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Production",
      whatSystemAlreadyHandles: ["production intent", "media workflow contracts", "Lisa profile protection", "publish gates"],
      whatUserStillDoes: ["creative intent", "taste approval"],
      whatMustRemainHuman: ["identity", "voice/rights consent", "final publish approval"],
      whatCouldBecomeAutomatedLater: ["technical pipeline", "quality checks", "format adaptation"],
      approvalBlocksAutomation: ["publish", "identity use", "rights"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Content Intelligence",
      whatSystemAlreadyHandles: ["content economics contracts", "goal-aware winner detection", "next recommendations"],
      whatUserStillDoes: ["chooses creative direction", "accepts/rejects learning"],
      whatMustRemainHuman: ["brand judgment", "creative boundary"],
      whatCouldBecomeAutomatedLater: ["metric ingestion", "routine comparisons"],
      approvalBlocksAutomation: ["platform adapters", "privacy", "publishing"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Technology Intelligence",
      whatSystemAlreadyHandles: ["candidate records", "claim verification", "risk policy", "recommendation artifacts"],
      whatUserStillDoes: ["adoption decision"],
      whatMustRemainHuman: ["provider activation", "budget", "data policy"],
      whatCouldBecomeAutomatedLater: ["routine radar updates"],
      approvalBlocksAutomation: ["install", "keys", "billing", "provider calls"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Property",
      whatSystemAlreadyHandles: ["local property query", "passport preview", "freshness/risk flags", "guided add-property intake"],
      whatUserStillDoes: ["authority declaration", "investment choices"],
      whatMustRemainHuman: ["ownership", "legal review", "transaction decisions"],
      whatCouldBecomeAutomatedLater: ["source normalization", "exception reporting"],
      approvalBlocksAutomation: ["legal verification", "payment", "transaction"]
    }),
    createCreatorFirstWorkflowAudit({
      workflow: "Publishing",
      whatSystemAlreadyHandles: ["cover/package planning", "format checks", "publishing package gate"],
      whatUserStillDoes: ["author direction", "publication approval"],
      whatMustRemainHuman: ["rights", "author judgment", "publish decision"],
      whatCouldBecomeAutomatedLater: ["format validation", "metadata preparation"],
      approvalBlocksAutomation: ["publish", "rights", "payment"]
    })
  ];

  return {
    decisions: {
      safePreparationDecision,
      moneyDecision,
      publishDecision,
      destructiveDecision
    },
    effortProfile,
    manualBurdenFindings,
    workflowAudits,
    requiredVerticals: [
      productIds.business,
      productIds.production,
      productIds.advertising,
      productIds.property
    ],
    auditArtifact: createCreatorFirstAuditArtifact({
      existingAlignedSystems: [
        "ESSA Core",
        "Navigator Product Knowledge Bridge",
        "Capability Fabric",
        "Intelligence Fabric",
        "Execution Preview",
        "ExecutionIntentDraft Preflight",
        "Agent Tool Layer",
        "ExecutionGateway",
        "ESSA Business",
        "ESSA Production",
        "Content Intelligence",
        "Technology Intelligence"
      ],
      manualBurdenFindings,
      workflowAudits,
      antiPatternFindings: [
        creatorFirstAntiPatterns.redundantInput,
        creatorFirstAntiPatterns.manualCopying,
        creatorFirstAntiPatterns.manualRecalculation,
        creatorFirstAntiPatterns.unpreparedApprovalRequest
      ]
    })
  };
}

