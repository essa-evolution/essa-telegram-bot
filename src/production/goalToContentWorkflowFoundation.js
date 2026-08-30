import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  executionWorkflowBlockers,
  executionWorkflowClasses,
  executionWorkflowPolicies,
  executionWorkflowStatuses,
  executionWorkflowStepStatuses,
  validateWorkflowBindings,
  validateWorkflowDag,
  workflowBindingSources
} from "../capabilities/executionWorkflowOrchestration.js";
import { getCapability } from "../capabilities/capabilityRegistry.js";
import {
  contentVariantStatuses,
  createContentVariant,
  variantChangeDimensions
} from "../contentIntelligence/contentIntelligenceContracts.js";
import { loadLisaCharacterCore } from "../identity/lisaCharacterCore.js";
import { getLisaProductionProfile } from "../identity/lisaProductionProfile.js";
import { prepareVoiceSynthesisRequest } from "../voice/voiceBindings.js";

export const productionIntentTypes = Object.freeze({
  podcastWithShortFormDerivatives: "PODCAST_WITH_SHORT_FORM_DERIVATIVES"
});

export const productionRecipeIds = Object.freeze({
  podcastToShortsFoundation: "PODCAST_TO_SHORTS_FOUNDATION"
});

export const productionRightsStates = Object.freeze({
  approved: "APPROVED",
  needsRightsProof: "NEEDS_RIGHTS_PROOF",
  needsUserApproval: "NEEDS_USER_APPROVAL",
  notExecutableInFoundation: "NOT_EXECUTABLE_IN_FOUNDATION"
});

export const executionFrontierStates = Object.freeze({
  blockedOnInput: "BLOCKED_ON_INPUT",
  blockedOnHumanApproval: "BLOCKED_ON_HUMAN_APPROVAL",
  blockedOnProviderBoundary: "BLOCKED_ON_PROVIDER_BOUNDARY",
  readyForFutureExecution: "READY_FOR_FUTURE_EXECUTION"
});

export const podcastToShortsFoundationRecipe = Object.freeze({
  modelType: "WorkflowRecipe",
  recipeId: productionRecipeIds.podcastToShortsFoundation,
  version: "1.0.0",
  goalClass: "GOAL_TO_CONTENT_PRODUCTION",
  intentType: productionIntentTypes.podcastWithShortFormDerivatives,
  executionClass: executionWorkflowClasses.localPlusIntelligence,
  executionPolicy: executionWorkflowPolicies.safeSequential,
  failurePolicy: executionWorkflowPolicies.stopOnRequiredStepFailure,
  requiredUserInputs: ["topic", "hostIdentityId", "language", "masterFormat", "shortFormTargets"],
  expectedFinalOutputs: ["contentBrief", "masterContentArtifact", "semanticClipPlan", "shortFormDerivatives"],
  requiredCapabilities: [
    "CONTENT_BRIEF",
    "SCRIPT_GENERATE",
    "SCRIPT_QUALITY_REVIEW",
    "VOICE_GENERATE",
    "AVATAR_RENDER",
    "MASTER_ASSEMBLE",
    "MASTER_VERIFY",
    "SEMANTIC_CLIP_PLAN",
    "SHORT_FORM_DERIVATIVES",
    "SHORT_FORM_QUALITY_REVIEW",
    "HUMAN_REVIEW_CHECKPOINT"
  ],
  stepTemplates: [
    {
      stepId: "STEP_1_CONTENT_BRIEF",
      label: "Content brief",
      capabilityId: "CONTENT_BRIEF",
      dependsOn: [],
      outputBindings: [{ outputName: "contentBrief", outputType: "ContentBrief" }]
    },
    {
      stepId: "STEP_2_SCRIPT_GENERATE",
      label: "Script generation",
      capabilityId: "SCRIPT_GENERATE",
      dependsOn: ["STEP_1_CONTENT_BRIEF"],
      inputBindings: [
        { inputName: "contentBrief", source: workflowBindingSources.stepOutput, stepId: "STEP_1_CONTENT_BRIEF", outputName: "contentBrief", expectedType: "ContentBrief" }
      ],
      outputBindings: [{ outputName: "scriptArtifact", outputType: "ScriptArtifact" }]
    },
    {
      stepId: "STEP_3_SCRIPT_QUALITY_REVIEW",
      label: "Script quality review",
      capabilityId: "SCRIPT_QUALITY_REVIEW",
      dependsOn: ["STEP_2_SCRIPT_GENERATE"],
      inputBindings: [
        { inputName: "scriptArtifact", source: workflowBindingSources.stepOutput, stepId: "STEP_2_SCRIPT_GENERATE", outputName: "scriptArtifact", expectedType: "ScriptArtifact" }
      ],
      outputBindings: [{ outputName: "scriptQualityGate", outputType: "QualityGate" }]
    },
    {
      stepId: "STEP_4_VOICE_RENDER",
      label: "Voice render",
      capabilityId: "VOICE_GENERATE",
      dependsOn: ["STEP_2_SCRIPT_GENERATE", "STEP_3_SCRIPT_QUALITY_REVIEW"],
      providerBoundary: true,
      inputBindings: [
        { inputName: "scriptArtifact", source: workflowBindingSources.stepOutput, stepId: "STEP_2_SCRIPT_GENERATE", outputName: "scriptArtifact", expectedType: "ScriptArtifact" },
        { inputName: "voiceRights", source: workflowBindingSources.workflowContext, key: "voiceRights", expectedType: "RightsState" }
      ],
      outputBindings: [{ outputName: "voiceArtifact", outputType: "VoiceArtifact" }]
    },
    {
      stepId: "STEP_5_AVATAR_RENDER",
      label: "Avatar render",
      capabilityId: "AVATAR_RENDER",
      dependsOn: ["STEP_3_SCRIPT_QUALITY_REVIEW"],
      providerBoundary: true,
      inputBindings: [
        { inputName: "avatarRights", source: workflowBindingSources.workflowContext, key: "avatarRights", expectedType: "RightsState" }
      ],
      outputBindings: [{ outputName: "avatarArtifact", outputType: "AvatarArtifact" }]
    },
    {
      stepId: "STEP_6_MASTER_ASSEMBLE",
      label: "Master assemble",
      capabilityId: "MASTER_ASSEMBLE",
      dependsOn: ["STEP_4_VOICE_RENDER", "STEP_5_AVATAR_RENDER"],
      inputBindings: [
        { inputName: "voiceArtifact", source: workflowBindingSources.stepOutput, stepId: "STEP_4_VOICE_RENDER", outputName: "voiceArtifact", expectedType: "VoiceArtifact" },
        { inputName: "avatarArtifact", source: workflowBindingSources.stepOutput, stepId: "STEP_5_AVATAR_RENDER", outputName: "avatarArtifact", expectedType: "AvatarArtifact" }
      ],
      outputBindings: [{ outputName: "masterContentArtifact", outputType: "MasterContentArtifact" }]
    },
    {
      stepId: "STEP_7_MASTER_VERIFY",
      label: "Master verify",
      capabilityId: "MASTER_VERIFY",
      dependsOn: ["STEP_6_MASTER_ASSEMBLE"],
      inputBindings: [
        { inputName: "masterContentArtifact", source: workflowBindingSources.stepOutput, stepId: "STEP_6_MASTER_ASSEMBLE", outputName: "masterContentArtifact", expectedType: "MasterContentArtifact" }
      ],
      outputBindings: [{ outputName: "masterVerification", outputType: "MasterVerification" }]
    },
    {
      stepId: "STEP_8_SEMANTIC_CLIP_PLAN",
      label: "Semantic clip plan",
      capabilityId: "SEMANTIC_CLIP_PLAN",
      dependsOn: ["STEP_7_MASTER_VERIFY"],
      inputBindings: [
        { inputName: "masterVerification", source: workflowBindingSources.stepOutput, stepId: "STEP_7_MASTER_VERIFY", outputName: "masterVerification", expectedType: "MasterVerification" }
      ],
      outputBindings: [{ outputName: "semanticClipPlan", outputType: "SemanticClipPlan" }]
    },
    {
      stepId: "STEP_9_SHORT_FORM_DERIVATIVES",
      label: "Short-form derivatives",
      capabilityId: "SHORT_FORM_DERIVATIVES",
      dependsOn: ["STEP_8_SEMANTIC_CLIP_PLAN"],
      inputBindings: [
        { inputName: "semanticClipPlan", source: workflowBindingSources.stepOutput, stepId: "STEP_8_SEMANTIC_CLIP_PLAN", outputName: "semanticClipPlan", expectedType: "SemanticClipPlan" }
      ],
      outputBindings: [{ outputName: "shortFormDerivatives", outputType: "ShortFormDerivativeSet" }]
    },
    {
      stepId: "STEP_10_SHORT_FORM_QUALITY_REVIEW",
      label: "Short-form quality review",
      capabilityId: "SHORT_FORM_QUALITY_REVIEW",
      dependsOn: ["STEP_9_SHORT_FORM_DERIVATIVES"],
      inputBindings: [
        { inputName: "shortFormDerivatives", source: workflowBindingSources.stepOutput, stepId: "STEP_9_SHORT_FORM_DERIVATIVES", outputName: "shortFormDerivatives", expectedType: "ShortFormDerivativeSet" }
      ],
      outputBindings: [{ outputName: "shortFormQualityGate", outputType: "QualityGate" }]
    },
    {
      stepId: "STEP_11_HUMAN_REVIEW_CHECKPOINT",
      label: "Human review checkpoint",
      capabilityId: "HUMAN_REVIEW_CHECKPOINT",
      dependsOn: ["STEP_10_SHORT_FORM_QUALITY_REVIEW"],
      outputBindings: [{ outputName: "humanReviewCheckpoint", outputType: "HumanReviewCheckpoint" }]
    }
  ]
});

function nowIso(input) {
  return input ? new Date(input).toISOString() : new Date().toISOString();
}

function createId(prefix, seed) {
  if (seed) return `${prefix}_${hash(seed).slice(0, 12)}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function array(value) {
  return Array.isArray(value) ? value.filter((item) => item != null) : [];
}

function zeroProductionCounters() {
  return {
    externalProviderCalls: 0,
    externalModelCalls: 0,
    paidProviderCalls: 0,
    externalCalls: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    adActions: 0,
    socialDispatches: 0,
    externalAccountMutations: 0,
    productionDbMutations: 0,
    envKeyBillingChanges: 0,
    workflowExecutionRequests: 0,
    stepExecutionRequests: 0,
    voiceProviderCalls: 0,
    avatarProviderCalls: 0,
    contentIntelligenceProviderCalls: 0
  };
}

export function createProductionGoal(input = {}) {
  const rawGoal = String(input.rawGoal || input.goal || "").trim();
  const topic = String(input.topic || "почему человек теряет себя в отношениях").trim();
  const goalText = rawGoal || `Сделай мне подкаст на тему: ${topic}. Ведущая - LISA. После мастер-подкаста подготовь короткие ролики для short-form.`;

  return {
    modelType: "ProductionGoal",
    goalId: input.goalId || createId("production_goal", goalText),
    rawGoal: goalText,
    topic,
    requestedMasterArtifact: input.requestedMasterArtifact || "master_podcast",
    requestedDerivatives: array(input.requestedDerivatives).length ? array(input.requestedDerivatives) : ["short_form_clips"],
    humanOwner: input.humanOwner || "Lisa",
    createdAt: nowIso(input.createdAt),
    source: input.source || "human_goal"
  };
}

export function createProductionIntent(input = {}) {
  const goal = input.goal?.modelType === "ProductionGoal" ? input.goal : createProductionGoal(input);
  const shortFormTargets = array(input.shortFormTargets).length ? array(input.shortFormTargets) : ["TikTok", "Instagram Reels", "YouTube Shorts"];

  return {
    modelType: "ProductionIntent",
    intentId: input.intentId || createId("production_intent", { goalId: goal.goalId, shortFormTargets }),
    intentType: productionIntentTypes.podcastWithShortFormDerivatives,
    goalId: goal.goalId,
    recipeId: productionRecipeIds.podcastToShortsFoundation,
    language: input.language || "ru",
    hostIdentityId: input.hostIdentityId || "lisa",
    hostDisplayName: input.hostDisplayName || "LISA",
    masterFormat: input.masterFormat || "master_podcast",
    shortFormTargets,
    outputStyle: input.outputStyle || "meaning_first_conversational",
    executionEnabled: false,
    providerExecutionEnabled: false,
    publishingEnabled: false,
    createdAt: nowIso(input.createdAt)
  };
}

export function resolveGoalToContentInputs(input = {}) {
  const goal = input.goal?.modelType === "ProductionGoal" ? input.goal : createProductionGoal(input);
  const intent = input.intent?.modelType === "ProductionIntent" ? input.intent : createProductionIntent({ ...input, goal });
  const known = {};
  const missing = [];

  const required = {
    topic: goal.topic,
    hostIdentityId: intent.hostIdentityId,
    language: intent.language,
    masterFormat: intent.masterFormat,
    shortFormTargets: intent.shortFormTargets
  };

  for (const [key, value] of Object.entries(required)) {
    if (Array.isArray(value) ? value.length > 0 : Boolean(value)) {
      known[key] = value;
    } else {
      missing.push(key);
    }
  }

  const voiceRequest = prepareVoiceSynthesisRequest({
    identityId: intent.hostIdentityId,
    text: "",
    language: intent.language,
    purpose: "production_voiceover",
    goalId: goal.goalId,
    traceId: intent.intentId
  });
  const voiceRights = voiceRequest.executable
    ? productionRightsStates.needsUserApproval
    : productionRightsStates.needsRightsProof;

  const avatarRights = input.avatarRights || productionRightsStates.needsRightsProof;

  return {
    modelType: "MaterialInputResolution",
    goal,
    intent,
    known,
    missing,
    materialInputs: {
      ...known,
      goal,
      intent,
      contentBrief: null,
      scriptArtifact: null,
      voiceRights,
      avatarRights
    },
    classifications: {
      topic: "HUMAN_GOAL",
      hostIdentityId: "CANONICAL_IDENTITY_REF",
      language: "CANONICAL_DEFAULT_OR_USER_INPUT",
      masterFormat: "PRODUCTION_FORMAT",
      shortFormTargets: "DISTRIBUTION_TARGETS_NOT_PUBLISHING",
      voiceRights: "RIGHTS_AND_PROVIDER_BOUNDARY",
      avatarRights: "RIGHTS_AND_PROVIDER_BOUNDARY"
    },
    noInventedInputs: missing.length === 0,
    providerBoundary: {
      voiceProviderConfigured: voiceRequest.executable,
      voiceProviderCallRequiredLater: true,
      voiceProviderCallMade: false,
      avatarProviderCallRequiredLater: true,
      avatarProviderCallMade: false,
      providerNamesHiddenInNormalUx: true
    }
  };
}

function stepFromTemplate(template) {
  const blockedByProvider = template.providerBoundary === true;
  return {
    modelType: "ExecutionWorkflowStep",
    stepId: template.stepId,
    label: template.label,
    capabilityId: template.capabilityId,
    executionClass: podcastToShortsFoundationRecipe.executionClass,
    status: blockedByProvider ? executionWorkflowStepStatuses.blocked : executionWorkflowStepStatuses.planned,
    dependsOn: [...(template.dependsOn || [])],
    inputBindings: (template.inputBindings || []).map((binding) => ({ ...binding })),
    resolvedInputs: {},
    outputBindings: (template.outputBindings || []).map((binding) => ({ ...binding })),
    outputs: {},
    preflight: null,
    eligibility: null,
    executionId: null,
    result: null,
    verification: null,
    attempts: 0,
    maxAutomaticRetries: 0,
    providerBoundary: blockedByProvider,
    blockers: blockedByProvider ? ["BLOCKED_PROVIDER_EXECUTION_BOUNDARY"] : [],
    warnings: [],
    parallelizable: false
  };
}

export function createContentBriefArtifact({ goal, intent }) {
  return {
    modelType: "ContentBrief",
    artifactId: createId("content_brief", { goalId: goal.goalId, intentId: intent.intentId }),
    goalId: goal.goalId,
    intentId: intent.intentId,
    topic: goal.topic,
    hostIdentityId: intent.hostIdentityId,
    language: intent.language,
    masterFormat: intent.masterFormat,
    shortFormTargets: [...intent.shortFormTargets],
    angle: "человек теряет себя в отношениях, когда подменяет внутреннюю опору слиянием, страхом потери и ролью удобного человека",
    nonGoals: ["publish", "payment", "provider_execution", "invent_missing_facts"],
    verificationRequired: ["topic_present", "host_present", "derivatives_present"],
    providerCalls: 0
  };
}

export function createScriptArtifact({ goal, intent, contentBrief }) {
  return {
    modelType: "ScriptArtifact",
    artifactId: createId("script_artifact", { goalId: goal.goalId, intentId: intent.intentId }),
    goalId: goal.goalId,
    intentId: intent.intentId,
    sourceBriefId: contentBrief.artifactId,
    language: intent.language,
    hostDisplayName: intent.hostDisplayName,
    status: "DRAFT_NOT_RENDERED",
    sections: [
      "opening_hook",
      "loss_of_self_pattern",
      "emotional_dependency_loop",
      "return_to_self_practices",
      "closing_reflection"
    ],
    qualityGate: {
      status: "PLANNED",
      checks: ["meaning_preserved", "Lisa_voice_direction_present", "no_generic_motivation_mask", "short_form_extractability"]
    },
    externalModelCalls: 0
  };
}

export function createMasterContentArtifact(input = {}) {
  return {
    modelType: "MasterContentArtifact",
    artifactId: input.artifactId || createId("master_content", input.goalId || input.intentId || "foundation"),
    goalId: input.goalId || null,
    intentId: input.intentId || null,
    sourceScriptArtifactId: input.sourceScriptArtifactId || null,
    immutable: true,
    format: input.format || "master_podcast",
    verificationState: input.verificationState || "PENDING_PROVIDER_OUTPUT",
    verified: input.verified === true,
    assembled: false,
    providerCalls: 0,
    publishingEnabled: false,
    lineage: input.lineage || []
  };
}

export function createSemanticClipPlan(input = {}) {
  const masterContentAssetId = input.masterContentAssetId || createId("master_content", input.goalId || "foundation");
  return {
    modelType: "SemanticClipPlan",
    planId: input.planId || createId("semantic_clip_plan", masterContentAssetId),
    masterContentAssetId,
    strategy: "meaning_first_sequence",
    clips: [
      { clipId: "clip_1", theme: "страх потерять другого", platformTargets: ["TikTok", "Instagram Reels", "YouTube Shorts"], status: "PLANNED" },
      { clipId: "clip_2", theme: "роль удобного человека", platformTargets: ["TikTok", "Instagram Reels"], status: "PLANNED" },
      { clipId: "clip_3", theme: "возвращение к себе", platformTargets: ["YouTube Shorts", "Instagram Reels"], status: "PLANNED" }
    ],
    masterVerifiedRequired: true,
    providerCalls: 0
  };
}

export function createShortFormDerivative(input = {}) {
  return {
    modelType: "ShortFormDerivative",
    derivativeId: input.derivativeId || createId("short_form_derivative", { master: input.masterContentAssetId, platform: input.platform, clip: input.clipId }),
    masterContentAssetId: input.masterContentAssetId || null,
    semanticClipId: input.clipId || null,
    platform: input.platform || "PLATFORM_INDEPENDENT",
    status: "PLANNED_FROM_MASTER",
    masterLineageRequired: true,
    contentVariant: createContentVariant({
      masterContentAssetId: input.masterContentAssetId || null,
      variantLabel: `${input.platform || "platform"} ${input.clipId || "clip"}`,
      platformRef: input.platform || "PLATFORM_INDEPENDENT",
      status: contentVariantStatuses.draft,
      changeSet: {
        changes: [
          {
            dimension: variantChangeDimensions.format,
            from: "master_podcast",
            to: "short_form_clip",
            rationale: "Create a controlled short-form derivative from the immutable master."
          }
        ]
      }
    }),
    providerCalls: 0,
    publishEnabled: false
  };
}

export function createGoalToContentExecutionWorkflow(input = {}) {
  const resolution = resolveGoalToContentInputs(input);
  const { goal, intent } = resolution;
  const createdAt = nowIso(input.createdAt);
  const workflowVersion = `1.0.0-${hash({
    recipeId: podcastToShortsFoundationRecipe.recipeId,
    goal: goal.rawGoal,
    intentType: intent.intentType,
    materialInputs: resolution.known
  }).slice(0, 12)}`;
  const steps = podcastToShortsFoundationRecipe.stepTemplates.map(stepFromTemplate);
  const dependencies = steps.flatMap((step) => step.dependsOn.map((from) => ({ from, to: step.stepId })));
  const contentBrief = createContentBriefArtifact({ goal, intent });
  const scriptArtifact = createScriptArtifact({ goal, intent, contentBrief });
  const masterArtifact = createMasterContentArtifact({
    goalId: goal.goalId,
    intentId: intent.intentId,
    sourceScriptArtifactId: scriptArtifact.artifactId,
    format: intent.masterFormat,
    lineage: [contentBrief.artifactId, scriptArtifact.artifactId]
  });
  const semanticClipPlan = createSemanticClipPlan({
    goalId: goal.goalId,
    masterContentAssetId: masterArtifact.artifactId
  });
  const shortFormDerivatives = semanticClipPlan.clips.flatMap((clip) =>
    clip.platformTargets.map((platform) =>
      createShortFormDerivative({
        masterContentAssetId: masterArtifact.artifactId,
        clipId: clip.clipId,
        platform
      })
    )
  );

  const workflow = {
    modelType: "ExecutionWorkflow",
    workflowId: input.workflowId || createId("workflow_goal_to_content", { goalId: goal.goalId, intentId: intent.intentId }),
    workflowVersion,
    goal: goal.rawGoal,
    productionGoal: goal,
    productionIntent: intent,
    goalClass: podcastToShortsFoundationRecipe.goalClass,
    recipeId: podcastToShortsFoundationRecipe.recipeId,
    recipeVersion: podcastToShortsFoundationRecipe.version,
    workflowClass: podcastToShortsFoundationRecipe.executionClass,
    status: resolution.missing.length ? executionWorkflowStatuses.inputRequired : executionWorkflowStatuses.preflightBlocked,
    sourceAssets: [],
    materialInputs: resolution.materialInputs,
    materialInputResolution: resolution,
    steps,
    dependencies,
    inputBindings: steps.flatMap((step) => step.inputBindings.map((binding) => ({ stepId: step.stepId, ...binding }))),
    outputBindings: steps.flatMap((step) => step.outputBindings.map((binding) => ({ stepId: step.stepId, ...binding }))),
    approvals: [
      { approvalId: "approve_content_brief", checkpoint: "after_content_brief", required: true, status: "PENDING" },
      { approvalId: "approve_provider_execution", checkpoint: "before_voice_avatar_render", required: true, status: "PENDING" },
      { approvalId: "approve_master", checkpoint: "after_master_verify", required: true, status: "PENDING" },
      { approvalId: "approve_short_form_package", checkpoint: "before_publish_or_distribution", required: true, status: "PENDING" }
    ],
    readiness: null,
    executionPolicy: {
      policy: podcastToShortsFoundationRecipe.executionPolicy,
      parallelExecutionEnabled: false,
      maxAutomaticRetries: 0,
      providerExecutionEnabled: false
    },
    failurePolicy: {
      policy: podcastToShortsFoundationRecipe.failurePolicy,
      stopOnRequiredStepFailure: true
    },
    rollbackPolicy: {
      strategy: "SELECTIVE_INVALIDATION_OF_DOWNSTREAM_DERIVATIVES",
      sourceAffected: false
    },
    capabilityComposition: {
      modelType: "CapabilityCompositionPlan",
      primaryCapability: "CONTENT_BRIEF",
      requiredCapabilities: [...podcastToShortsFoundationRecipe.requiredCapabilities],
      missingCapabilities: podcastToShortsFoundationRecipe.requiredCapabilities.filter((id) => !getCapability(id)),
      localOrDeterministicCapabilities: ["CONTENT_BRIEF", "SCRIPT_QUALITY_REVIEW", "MASTER_VERIFY", "SEMANTIC_CLIP_PLAN", "SHORT_FORM_QUALITY_REVIEW", "HUMAN_REVIEW_CHECKPOINT"],
      providerBoundaryCapabilities: ["VOICE_GENERATE", "AVATAR_RENDER"],
      approvalPoints: ["content_brief", "provider_execution", "master_review", "short_form_review"]
    },
    generatedArtifacts: {
      contentBrief,
      scriptArtifact,
      masterArtifact,
      semanticClipPlan,
      shortFormDerivatives
    },
    finalOutputs: [],
    verification: null,
    lineage: {
      nodes: [goal.goalId, intent.intentId, contentBrief.artifactId, scriptArtifact.artifactId, masterArtifact.artifactId, semanticClipPlan.planId],
      edges: [
        { from: goal.goalId, to: intent.intentId, type: "GOAL_TO_INTENT" },
        { from: intent.intentId, to: contentBrief.artifactId, type: "INTENT_TO_BRIEF" },
        { from: contentBrief.artifactId, to: scriptArtifact.artifactId, type: "BRIEF_TO_SCRIPT" },
        { from: scriptArtifact.artifactId, to: masterArtifact.artifactId, type: "SCRIPT_TO_MASTER" },
        { from: masterArtifact.artifactId, to: semanticClipPlan.planId, type: "MASTER_TO_CLIP_PLAN" }
      ]
    },
    audit: [
      {
        event: "goal_to_content_workflow_compiled",
        recipeId: podcastToShortsFoundationRecipe.recipeId,
        reused: ["ExecutionWorkflow", "validateWorkflowDag", "validateWorkflowBindings", "ContentVariant", "LisaCharacterCore", "LisaProductionProfile", "VoiceBinding"],
        at: createdAt
      }
    ],
    externalActionCounters: zeroProductionCounters(),
    createdAt,
    updatedAt: createdAt
  };

  workflow.readiness = preflightGoalToContentWorkflow(workflow);
  workflow.executionFrontier = createExecutionFrontier(workflow);
  return workflow;
}

export function preflightGoalToContentWorkflow(workflow = {}) {
  const dag = validateWorkflowDag(workflow);
  const bindings = validateWorkflowBindings(workflow);
  const capabilityIssues = workflow.capabilityComposition?.missingCapabilities || [];
  const inputIssues = workflow.materialInputResolution?.missing || [];
  const providerIssues = ["VOICE_RENDER_PROVIDER_BOUNDARY", "AVATAR_RENDER_PROVIDER_BOUNDARY"];
  const masterIssues = workflow.generatedArtifacts?.masterArtifact?.verified === true ? [] : ["MASTER_NOT_VERIFIED"];
  const blockers = [...new Set([
    ...dag.blockers,
    ...bindings.blockers,
    ...capabilityIssues.map((id) => `MISSING_CAPABILITY_${id}`),
    ...inputIssues.map((id) => `${executionWorkflowBlockers.missingInput}_${id}`),
    ...providerIssues,
    ...masterIssues
  ])];

  return {
    modelType: "GoalToContentWorkflowPreflight",
    workflowId: workflow.workflowId,
    workflowVersion: workflow.workflowVersion,
    workflowReady: blockers.length === 0,
    futureExecutionReady: dag.ok && bindings.ok && inputIssues.length === 0,
    missingInputs: inputIssues,
    dependencyIssues: dag.blockers,
    bindingIssues: bindings.blockers,
    capabilityIssues,
    providerBoundaryIssues: providerIssues,
    masterVerificationIssues: masterIssues,
    materialApprovals: workflow.approvals || [],
    blockers,
    warnings: ["foundation_prepares_execution_grade_plan_only"],
    externalActionCounters: zeroProductionCounters()
  };
}

export function createExecutionFrontier(workflow = {}) {
  const missingInputs = workflow.readiness?.missingInputs || [];
  const blockers = workflow.readiness?.blockers || [];
  const state = missingInputs.length
    ? executionFrontierStates.blockedOnInput
    : blockers.some((item) => /PROVIDER_BOUNDARY/.test(item))
      ? executionFrontierStates.blockedOnProviderBoundary
      : blockers.length
        ? executionFrontierStates.blockedOnHumanApproval
        : executionFrontierStates.readyForFutureExecution;

  return {
    modelType: "ExecutionFrontier",
    state,
    currentStepId: missingInputs.length ? "STEP_1_CONTENT_BRIEF" : "STEP_4_VOICE_RENDER",
    nextAllowedAction: state === executionFrontierStates.readyForFutureExecution ? "READY_FOR_EXECUTION_HANDOFF" : "COLLECT_INPUT_OR_APPROVAL",
    blockedStepIds: workflow.steps?.filter((step) => step.blockers?.length).map((step) => step.stepId) || [],
    resumeToken: createId("resume_goal_to_content", { workflowVersion: workflow.workflowVersion, state }),
    selectiveInvalidationPolicy: {
      onScriptChange: ["STEP_4_VOICE_RENDER", "STEP_5_AVATAR_RENDER", "STEP_6_MASTER_ASSEMBLE", "STEP_7_MASTER_VERIFY", "STEP_8_SEMANTIC_CLIP_PLAN", "STEP_9_SHORT_FORM_DERIVATIVES", "STEP_10_SHORT_FORM_QUALITY_REVIEW", "STEP_11_HUMAN_REVIEW_CHECKPOINT"],
      onMasterChange: ["STEP_8_SEMANTIC_CLIP_PLAN", "STEP_9_SHORT_FORM_DERIVATIVES", "STEP_10_SHORT_FORM_QUALITY_REVIEW", "STEP_11_HUMAN_REVIEW_CHECKPOINT"]
    },
    staleWorkflowBlocked: false
  };
}

export function createGoalToContentWorkflowViewModel(workflow = createGoalToContentExecutionWorkflow()) {
  const characterCore = loadLisaCharacterCore({ includeContent: false });
  const productionProfile = getLisaProductionProfile(workflow.productionIntent?.hostIdentityId || "lisa");

  return {
    modelType: "GoalToContentWorkflowViewModel",
    route: `#production/workflow/${productionRecipeIds.podcastToShortsFoundation}`,
    title: "Podcast to Shorts",
    ctaLabel: "Подготовить производство",
    recipeId: workflow.recipeId,
    goal: workflow.goal,
    topic: workflow.productionGoal?.topic || "",
    status: workflow.status,
    workflowClass: workflow.workflowClass,
    workflowVersion: workflow.workflowVersion,
    formDefaults: {
      topic: workflow.productionGoal?.topic || "",
      hostIdentityId: workflow.productionIntent?.hostIdentityId || "lisa",
      language: workflow.productionIntent?.language || "ru",
      masterFormat: workflow.productionIntent?.masterFormat || "master_podcast",
      shortFormTargets: workflow.productionIntent?.shortFormTargets || []
    },
    steps: workflow.steps.map((step) => ({
      stepId: step.stepId,
      label: step.label,
      capabilityId: step.capabilityId,
      status: step.status,
      blockers: step.blockers,
      dependsOn: step.dependsOn,
      providerBoundary: step.providerBoundary === true
    })),
    materialInputs: workflow.materialInputResolution,
    readiness: workflow.readiness,
    executionFrontier: workflow.executionFrontier,
    artifacts: workflow.generatedArtifacts,
    contentIntelligenceHandoff: {
      enabled: true,
      masterContentAssetId: workflow.generatedArtifacts.masterArtifact.artifactId,
      variantCount: workflow.generatedArtifacts.shortFormDerivatives.length,
      experimentStartState: "PLANNED_NOT_RUN",
      providerCalls: 0,
      publishEnabled: false
    },
    lisa: {
      characterCoreRef: characterCore.path,
      productionProfileId: productionProfile?.profileId || null,
      characterCoreDuplicated: false,
      productionProfileDuplicated: false,
      explanation: "Lisa Character Core and Lisa Production Profile are resolved as canonical references; this workflow does not fork identity."
    },
    providerLabels: {
      normalUx: ["voice provider boundary", "avatar provider boundary"],
      debugOnly: ["configured voice binding can be inspected in diagnostics"]
    },
    counters: zeroProductionCounters()
  };
}

export function createGoalToContentWorkflowFoundationProof(input = {}) {
  const cwd = input.cwd || process.cwd();
  const workflow = createGoalToContentExecutionWorkflow(input);
  const viewModel = createGoalToContentWorkflowViewModel(workflow);
  const dag = validateWorkflowDag(workflow);
  const bindings = validateWorkflowBindings(workflow);
  const proof = {
    status: dag.ok && bindings.ok && workflow.externalActionCounters.externalCalls === 0
      ? "PHASE_21R_GOAL_TO_CONTENT_WORKFLOW_FOUNDATION_PASS"
      : "PHASE_21R_GOAL_TO_CONTENT_WORKFLOW_FOUNDATION_FAIL",
    phase: "21R",
    generatedAt: nowIso(input.generatedAt),
    recipeId: podcastToShortsFoundationRecipe.recipeId,
    productionGoal: workflow.productionGoal,
    productionIntent: workflow.productionIntent,
    workflow,
    viewModel,
    checks: {
      productionGoalContract: workflow.productionGoal.modelType === "ProductionGoal",
      productionIntentContract: workflow.productionIntent.intentType === productionIntentTypes.podcastWithShortFormDerivatives,
      existingExecutionWorkflowReused: workflow.modelType === "ExecutionWorkflow",
      recipeStepCount: workflow.steps.length === 11,
      dagValid: dag.ok,
      bindingsValid: bindings.ok,
      materialInputsClassified: Boolean(workflow.materialInputResolution.classifications.voiceRights),
      noInventedInputs: workflow.materialInputResolution.noInventedInputs,
      providerBoundaryBlocked: workflow.executionFrontier.state === executionFrontierStates.blockedOnProviderBoundary,
      voiceCallMade: false,
      avatarCallMade: false,
      externalProviderCalls: 0,
      paymentActions: 0,
      publishActions: 0,
      contentVariantIntegrated: workflow.generatedArtifacts.shortFormDerivatives.every((item) => item.contentVariant?.modelType === "ContentVariant"),
      humanReviewCheckpointPresent: workflow.steps.at(-1)?.capabilityId === "HUMAN_REVIEW_CHECKPOINT",
      route: viewModel.route
    },
    counters: zeroProductionCounters()
  };

  const proofPath = path.join(cwd, "artifacts", "production", "phase21r", "GoalToContentWorkflowFoundationProof.json");
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");

  return { proof, proofPath };
}
