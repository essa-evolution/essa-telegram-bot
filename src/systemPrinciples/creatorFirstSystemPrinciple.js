import { capabilityRiskClasses } from "../capabilities/capabilityContracts.js";
import { productIds } from "../capabilities/productCapabilityMap.js";

export const systemPrincipleIds = {
  creatorFirst: "CREATOR_FIRST_SYSTEM_PRINCIPLE"
};

export const systemPrincipleStatuses = {
  canonical: "CANONICAL",
  draft: "DRAFT",
  deprecated: "DEPRECATED"
};

export const creatorFirstBrandExpressionIds = {
  philosophy: "ESSA_CREATOR_FIRST_PHILOSOPHY",
  shortline: "ESSA_CREATOR_FIRST_SHORTLINE"
};

export const creatorFirstDecisionRecommendations = {
  systemPrepare: "SYSTEM_PREPARES",
  systemExecuteWhenAllowed: "SYSTEM_EXECUTES_WHEN_ALLOWED",
  askHumanDecision: "ASK_HUMAN_DECISION",
  askApproval: "ASK_APPROVAL",
  block: "BLOCKED_BY_POLICY",
  report: "REPORT"
};

export const creatorFirstPermissionStates = {
  allowed: "ALLOWED",
  missingPermission: "MISSING_PERMISSION",
  approvalRequired: "APPROVAL_REQUIRED",
  blocked: "BLOCKED",
  architectureOnly: "ARCHITECTURE_ONLY"
};

export const creatorFirstReversibilityStates = {
  reversible: "REVERSIBLE",
  limited: "LIMITED_REVERSIBILITY",
  irreversible: "IRREVERSIBLE",
  notApplicable: "NOT_APPLICABLE"
};

export const creatorFirstRiskClasses = {
  low: "LOW",
  material: "MATERIAL",
  financial: "FINANCIAL",
  legal: "LEGAL",
  publish: "PUBLISH",
  externalAccount: "EXTERNAL_ACCOUNT",
  destructive: "DESTRUCTIVE",
  highImpact: "HIGH_IMPACT"
};

export const creatorFirstInteractionModel = [
  "OBSERVE",
  "UNDERSTAND",
  "PREPARE",
  "EXECUTE_WHEN_ALLOWED",
  "REPORT",
  "LEARN"
];

export const creatorFirstAvoidedUserBurdenModel = [
  "USER_SEARCHES",
  "USER_COUNTS",
  "USER_COPIES",
  "USER_CHECKS",
  "USER_TRANSFERS",
  "USER_REMEMBERS",
  "USER_REPEATS"
];

export const creatorFirstUxImplications = {
  systemPreparesUserDecides: "SYSTEM_PREPARES_USER_DECIDES",
  noRedundantInput: "NO_REDUNDANT_INPUT",
  noRedundantContextRequest: "NO_REDUNDANT_CONTEXT_REQUEST",
  actionableDecisionContext: "ACTIONABLE_DECISION_CONTEXT",
  minimizeManualCoordination: "MINIMIZE_MANUAL_COORDINATION",
  reportByException: "REPORT_BY_EXCEPTION",
  progressiveDisclosure: "PROGRESSIVE_DISCLOSURE",
  humanControlWhereMaterial: "HUMAN_CONTROL_WHERE_MATERIAL",
  prepareBeforeAsking: "PREPARE_BEFORE_ASKING",
  doNotOffloadSystemWorkToUser: "DO_NOT_OFFLOAD_SYSTEM_WORK_TO_USER"
};

export const creatorFirstAntiPatterns = {
  redundantQuestion: "REDUNDANT_QUESTION",
  redundantInput: "REDUNDANT_INPUT",
  manualCopying: "MANUAL_COPYING",
  manualRecalculation: "MANUAL_RECALCULATION",
  manualStateTracking: "MANUAL_STATE_TRACKING",
  rawDataDump: "RAW_DATA_DUMP",
  unpreparedApprovalRequest: "UNPREPARED_APPROVAL_REQUEST",
  tooManyMicroApprovals: "TOO_MANY_MICRO_APPROVALS",
  systemCapabilityHiddenFromUser: "SYSTEM_CAPABILITY_HIDDEN_FROM_USER",
  userForcedToChooseProvider: "USER_FORCED_TO_CHOOSE_PROVIDER",
  automationWithoutAuthority: "AUTOMATION_WITHOUT_AUTHORITY"
};

export const creatorFirstHardApprovalBoundaries = [
  "money",
  "provider_activation",
  "payment",
  "publishing",
  "deployment",
  "external_account_changes",
  "destructive_or_high_impact_actions",
  "legal_or_policy_decisions",
  "rights_or_consent",
  "irreversible_actions",
  "explicit_execution_policy_gates"
];

export const humanValueZone = [
  "vision",
  "intent",
  "creative_direction",
  "values",
  "taste",
  "ownership",
  "relationships",
  "human_presence_negotiation",
  "final_judgment",
  "risk_acceptance",
  "life_choices",
  "strategic_decisions",
  "creative_expression"
];

export const creatorFirstSystemPrinciple = Object.freeze({
  modelType: "SystemPrinciple",
  principleId: systemPrincipleIds.creatorFirst,
  title: "Creator-First System Principle",
  status: systemPrincipleStatuses.canonical,
  version: "1.0.0",
  sourceOfTruth: "src/systemPrinciples/creatorFirstSystemPrinciple.js",
  meaning: {
    core: "ESSA exists so the system serves the human, not so the human serves the system.",
    systemWorkVsHumanDecision: "SYSTEM_DOES_SYSTEM_WORK__HUMAN_MAKES_HUMAN_DECISIONS",
    behavior: "When safe, lawful, reliable, reversible and permitted, ESSA should prepare or perform system work instead of forcing unnecessary manual work on the user.",
    authority: "When judgment, consent, authority, money, legal responsibility, external permission, high impact, irreversible action or explicit approval is required, ESSA prepares context and brings the human a clear decision."
  },
  behaviorRules: [
    "PREPARE_BEFORE_ASKING",
    "DO_NOT_OFFLOAD_SYSTEM_WORK_TO_USER",
    "SYSTEM_PREPARES_USER_DECIDES",
    "REPORT_BY_EXCEPTION",
    "NO_REDUNDANT_INPUT",
    "NO_REDUNDANT_CONTEXT_REQUEST",
    "ACTIONABLE_DECISION_CONTEXT",
    "MINIMIZE_MANUAL_COORDINATION",
    "PROGRESSIVE_DISCLOSURE"
  ],
  humanAuthorityRules: creatorFirstHardApprovalBoundaries,
  interactionModel: creatorFirstInteractionModel,
  avoidedUserBurdenModel: creatorFirstAvoidedUserBurdenModel,
  humanValueZone,
  brandExpressions: {
    [creatorFirstBrandExpressionIds.philosophy]: {
      locale: "ru",
      text: "Пусть система считает деньги. А Творец создаёт жизнь.",
      displayPolicy: "CANONICAL_PHILOSOPHY_NOT_EVERY_SCREEN_COPY"
    },
    [creatorFirstBrandExpressionIds.shortline]: {
      locale: "ru",
      text: "ESSA работает. Ты живёшь.",
      displayPolicy: "PRODUCT_EXPRESSION_USE_CONTEXTUALLY"
    }
  },
  uxImplications: Object.values(creatorFirstUxImplications),
  inheritance: {
    owner: "ESSA_OS_SHARED_SYSTEM_LEVEL",
    inheritedByVerticals: true,
    verticalsMayOverride: ["contextual_wording", "examples", "automation_examples", "approval_examples"],
    verticalsMayNotOverride: [
      "human_authority_boundaries",
      "approval_policy",
      "safety_rules",
      "source_of_truth_ownership",
      "core_semantics"
    ]
  },
  localization: {
    semanticIdStable: true,
    canonicalLocale: "ru",
    policyIdentifierIsNotLocalizedCopy: true,
    futureTranslationsAllowed: true
  },
  providerIndependent: true,
  architectureOnly: true,
  executionEnabled: false,
  providerCalls: 0,
  externalCalls: 0,
  paymentActions: 0,
  publishActions: 0,
  deployActions: 0
});

export const creatorFirstVerticalManifestations = Object.freeze({
  [productIds.business]: {
    productId: productIds.business,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система ведёт операционку. Владелец создаёт, решает и развивает.",
    automationExamples: ["sales_drop", "inventory_risk", "campaign_anomaly", "cost_increase", "cash_flow_signal"],
    approvalExamples: ["money", "payment", "ad_budget", "legal_policy_decision"]
  },
  [productIds.production]: {
    productId: productIds.production,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система производит, измеряет и учится. Автор создаёт.",
    automationExamples: ["content_measurement", "variant_comparison", "next_recommendation", "technical_pipeline_preparation"],
    approvalExamples: ["publishing", "identity_use", "rights_or_consent", "autonomous_mode_policy"]
  },
  [productIds.advertising]: {
    productId: productIds.advertising,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система анализирует и оптимизирует. Человек определяет направление и границы.",
    automationExamples: ["performance_review", "creative_signal_summary", "campaign_anomaly_detection"],
    approvalExamples: ["ad_spend", "external_account_change", "public_campaign_launch"]
  },
  [productIds.property]: {
    productId: productIds.property,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система сопровождает процессы. Человек владеет, инвестирует и живёт.",
    automationExamples: ["local_listing_normalization", "freshness_check", "risk_flag_preparation"],
    approvalExamples: ["transaction", "legal_verification", "ownership_claim", "payment"]
  },
  [productIds.publishing]: {
    productId: productIds.publishing,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система организует производство и распространение. Автор пишет и создаёт.",
    automationExamples: ["cover_brief_preparation", "formatting_checks", "distribution_package_preparation"],
    approvalExamples: ["publish_approval", "rights_review", "payment"]
  },
  [productIds.musicFactory]: {
    productId: productIds.musicFactory,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система берёт на себя технический pipeline. Музыкант создаёт музыку.",
    automationExamples: ["stem_workflow_plan", "mix_check_preparation", "export_readiness"],
    approvalExamples: ["voice_identity_use", "rights_review", "paid_provider_activation"]
  },
  [productIds.creatorNetwork]: {
    productId: productIds.creatorNetwork,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Система координирует инфраструктуру. Создатель создаёт.",
    automationExamples: ["creator_fit_summary", "brief_normalization", "coordination_state_tracking"],
    approvalExamples: ["outreach_send", "contract_terms", "external_account_change"]
  },
  [productIds.navigator]: {
    productId: productIds.navigator,
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    contextualExpression: "Навигатор сам достаёт ограниченный контекст и приносит следующий безопасный выбор.",
    automationExamples: ["bounded_product_knowledge_retrieval", "deterministic_calculation", "approval_requirement_lookup"],
    approvalExamples: ["execution_intent", "provider_activation", "high_impact_action"]
  }
});

export function getCreatorFirstRootPrinciple() {
  return creatorFirstSystemPrinciple;
}

export function getCreatorFirstBrandExpression(expressionId) {
  return creatorFirstSystemPrinciple.brandExpressions[expressionId] || null;
}

export function getCreatorFirstVerticalManifestation(productId) {
  const manifestation = creatorFirstVerticalManifestations[productId] || null;
  if (!manifestation) return null;
  return {
    ...manifestation,
    rootPrinciple: creatorFirstSystemPrinciple,
    coreSemanticsLocked: true,
    approvalBoundariesLocked: true,
    safetyRulesLocked: true
  };
}

export function listCreatorFirstVerticalManifestations() {
  return Object.values(creatorFirstVerticalManifestations).map((manifestation) =>
    getCreatorFirstVerticalManifestation(manifestation.productId)
  );
}

export function createCreatorFirstDecision(input = {}) {
  const approvalRequired = input.approvalRequired === true;
  const humanDecisionRequired = input.humanDecisionRequired === true || approvalRequired;
  const humanPresenceRequired = input.humanPresenceRequired === true || humanDecisionRequired;
  const canSystemExecute = input.canSystemExecute === true && !humanDecisionRequired && !approvalRequired;
  const canSystemPrepare = input.canSystemPrepare !== false;

  let recommendedInteraction = input.recommendedInteraction;
  if (!recommendedInteraction) {
    if (input.permissionState === creatorFirstPermissionStates.blocked) {
      recommendedInteraction = creatorFirstDecisionRecommendations.block;
    } else if (approvalRequired) {
      recommendedInteraction = creatorFirstDecisionRecommendations.askApproval;
    } else if (humanDecisionRequired) {
      recommendedInteraction = creatorFirstDecisionRecommendations.askHumanDecision;
    } else if (canSystemExecute) {
      recommendedInteraction = creatorFirstDecisionRecommendations.systemExecuteWhenAllowed;
    } else {
      recommendedInteraction = creatorFirstDecisionRecommendations.systemPrepare;
    }
  }

  return {
    modelType: "CreatorFirstDecision",
    principleId: systemPrincipleIds.creatorFirst,
    action: input.action || null,
    context: input.context || {},
    canSystemPrepare,
    canSystemExecute,
    humanPresenceRequired,
    humanDecisionRequired,
    approvalRequired,
    reason: input.reason || "CREATOR_FIRST_POLICY_EVALUATION",
    riskClass: input.riskClass || creatorFirstRiskClasses.low,
    reversibility: input.reversibility || creatorFirstReversibilityStates.notApplicable,
    permissionState: input.permissionState || (
      approvalRequired ? creatorFirstPermissionStates.approvalRequired : creatorFirstPermissionStates.allowed
    ),
    recommendedInteraction,
    executionAuthorizedByPrinciple: false
  };
}

export function createUserEffortProfile(input = {}) {
  return {
    modelType: "UserEffortProfile",
    principleId: systemPrincipleIds.creatorFirst,
    task: input.task || null,
    requiredHumanInputs: [...(input.requiredHumanInputs || [])],
    requiredHumanDecisions: [...(input.requiredHumanDecisions || [])],
    systemPreparations: [...(input.systemPreparations || [])],
    systemExecutableSteps: [...(input.systemExecutableSteps || [])],
    avoidableManualSteps: [...(input.avoidableManualSteps || [])],
    unavoidableHumanSteps: [...(input.unavoidableHumanSteps || [])],
    approvalSteps: [...(input.approvalSteps || [])]
  };
}

export function createManualBurdenFinding(input = {}) {
  return {
    modelType: "ManualBurdenFinding",
    principleId: systemPrincipleIds.creatorFirst,
    workflow: input.workflow || null,
    step: input.step || null,
    reasonManualToday: input.reasonManualToday || "UNKNOWN",
    systemCapabilityAvailable: input.systemCapabilityAvailable === true,
    permissionRequired: input.permissionRequired || null,
    automationPotential: input.automationPotential || "FUTURE_POLICY_GATED",
    risk: input.risk || creatorFirstRiskClasses.low,
    recommendedFutureState: input.recommendedFutureState || "SYSTEM_PREPARES_USER_DECIDES",
    antiPattern: input.antiPattern || null
  };
}

export function detectCreatorFirstAntiPattern(input = {}) {
  if (input.systemKnowsValue === true && input.asksUserToCopy === true) {
    return creatorFirstAntiPatterns.manualCopying;
  }
  if (input.systemCanCalculate === true && input.asksUserToCalculate === true) {
    return creatorFirstAntiPatterns.manualRecalculation;
  }
  if (input.contextAlreadyAvailable === true && input.asksUserToRepeatContext === true) {
    return creatorFirstAntiPatterns.redundantInput;
  }
  if (input.approvalRequestedWithoutContext === true) {
    return creatorFirstAntiPatterns.unpreparedApprovalRequest;
  }
  if (input.approvalRequestedForSafeInternalStep === true) {
    return creatorFirstAntiPatterns.tooManyMicroApprovals;
  }
  if (input.providerChoiceForcedWithoutNeed === true) {
    return creatorFirstAntiPatterns.userForcedToChooseProvider;
  }
  if (input.automationWithoutPermission === true) {
    return creatorFirstAntiPatterns.automationWithoutAuthority;
  }
  return null;
}

export function createCreatorFirstWorkflowAudit(input = {}) {
  return {
    modelType: "CreatorFirstWorkflowAudit",
    principleId: systemPrincipleIds.creatorFirst,
    workflow: input.workflow || null,
    whatSystemAlreadyHandles: [...(input.whatSystemAlreadyHandles || [])],
    whatUserStillDoes: [...(input.whatUserStillDoes || [])],
    whatMustRemainHuman: [...(input.whatMustRemainHuman || [])],
    whatCouldBecomeAutomatedLater: [...(input.whatCouldBecomeAutomatedLater || [])],
    approvalBlocksAutomation: [...(input.approvalBlocksAutomation || [])]
  };
}

export function createCreatorFirstAuditArtifact(input = {}) {
  return {
    modelType: "CreatorFirstAuditArtifact",
    artifactType: "CreatorFirstAuditArtifact",
    rootPrincipleId: systemPrincipleIds.creatorFirst,
    sourceOfTruth: creatorFirstSystemPrinciple.sourceOfTruth,
    inheritance: listCreatorFirstVerticalManifestations().map((manifestation) => ({
      productId: manifestation.productId,
      rootPrincipleId: manifestation.rootPrincipleId,
      contextualExpression: manifestation.contextualExpression
    })),
    existingAlignedSystems: [...(input.existingAlignedSystems || [])],
    manualBurdenFindings: [...(input.manualBurdenFindings || [])],
    workflowAudits: [...(input.workflowAudits || [])],
    approvalBoundaries: creatorFirstHardApprovalBoundaries,
    antiPatternFindings: [...(input.antiPatternFindings || [])],
    duplicatePrevention: {
      oneRootPrinciple: true,
      verticalsReferenceRootPrincipleId: true,
      fullPolicyCopiedIntoVerticals: false
    },
    version: input.version || creatorFirstSystemPrinciple.version,
    timestamp: input.timestamp || "2026-08-29T00:00:00.000Z",
    architectureOnly: true,
    providerIndependent: true,
    providerCalls: 0,
    externalCalls: 0,
    executionActions: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0
  };
}

export function mapCapabilityToCreatorFirstDecision(capability = {}) {
  const gatedByRisk = [
    capabilityRiskClasses.high,
    capabilityRiskClasses.publish,
    capabilityRiskClasses.externalMutation,
    capabilityRiskClasses.destructive
  ].includes(capability.riskClass);
  const approvalRequired = gatedByRisk || (capability.approvalRequirements || []).length > 0;
  const paymentRequired = capability.costClass === "PAID_EXTERNAL" || capability.costClass === "METERED";

  return createCreatorFirstDecision({
    action: capability.capabilityId,
    canSystemPrepare: true,
    canSystemExecute: capability.activationState === "ACTIVE" && !approvalRequired && !paymentRequired,
    approvalRequired: approvalRequired || paymentRequired,
    humanDecisionRequired: approvalRequired || paymentRequired,
    riskClass: capability.riskClass || creatorFirstRiskClasses.low,
    permissionState: approvalRequired || paymentRequired
      ? creatorFirstPermissionStates.approvalRequired
      : creatorFirstPermissionStates.allowed,
    reason: approvalRequired
      ? "CAPABILITY_POLICY_APPROVAL_GATE_REMAINS_AUTHORITATIVE"
      : paymentRequired
      ? "CAPABILITY_COST_GATE_REMAINS_AUTHORITATIVE"
      : "CAPABILITY_CAN_BE_PREPARED_WITHIN_CREATOR_FIRST_POLICY"
  });
}

