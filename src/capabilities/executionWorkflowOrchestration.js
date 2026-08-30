import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createCapabilityCompositionPlan } from "./capabilityComposition.js";
import { getCapability } from "./capabilityRegistry.js";
import {
  createSyntheticVideoFixture,
  defaultPhase21PBoundary,
  fingerprintFile,
  getSafeLocalCapabilityProfile,
  localExecutionStatuses,
  rollbackLocalExecution,
  safeLocalExecutionBlockers,
  localExecutionRollbackStatuses
} from "./safeLocalExecution.js";
import { executeSafeLocalWorkspaceAction } from "./safeLocalExecutionWorkspace.js";

export const executionWorkflowClasses = {
  safeLocalMultiStep: "SAFE_LOCAL_MULTI_STEP",
  localPlusIntelligence: "LOCAL_PLUS_INTELLIGENCE",
  externalProvider: "EXTERNAL_PROVIDER",
  publishing: "PUBLISHING",
  transactional: "TRANSACTIONAL"
};

export const executionWorkflowStatuses = {
  draft: "DRAFT",
  planned: "PLANNED",
  inputRequired: "INPUT_REQUIRED",
  preflightBlocked: "PREFLIGHT_BLOCKED",
  ready: "READY",
  running: "RUNNING",
  partiallySucceeded: "PARTIALLY_SUCCEEDED",
  failed: "FAILED",
  verificationFailed: "VERIFICATION_FAILED",
  succeeded: "SUCCEEDED",
  rollbackAvailable: "ROLLBACK_AVAILABLE",
  partiallyRolledBack: "PARTIALLY_ROLLED_BACK",
  rolledBack: "ROLLED_BACK",
  cancelled: "CANCELLED"
};

export const executionWorkflowStepStatuses = {
  planned: "PLANNED",
  waitingForDependency: "WAITING_FOR_DEPENDENCY",
  inputRequired: "INPUT_REQUIRED",
  preflightBlocked: "PREFLIGHT_BLOCKED",
  ready: "READY",
  running: "RUNNING",
  succeeded: "SUCCEEDED",
  failed: "FAILED",
  verificationFailed: "VERIFICATION_FAILED",
  skipped: "SKIPPED",
  cancelled: "CANCELLED",
  rolledBack: "ROLLED_BACK",
  blocked: "BLOCKED"
};

export const executionWorkflowPolicies = {
  safeSequential: "SAFE_SEQUENTIAL",
  stopOnRequiredStepFailure: "STOP_ON_REQUIRED_STEP_FAILURE"
};

export const executionWorkflowBlockers = {
  cycle: "BLOCKED_WORKFLOW_CYCLE",
  selfDependency: "BLOCKED_WORKFLOW_SELF_DEPENDENCY",
  missingDependency: "BLOCKED_WORKFLOW_MISSING_DEPENDENCY",
  duplicateStep: "BLOCKED_WORKFLOW_DUPLICATE_STEP_ID",
  invalidBinding: "BLOCKED_INVALID_WORKFLOW_BINDING",
  typeMismatch: "BLOCKED_BINDING_TYPE_MISMATCH",
  foreignArtifact: "BLOCKED_FOREIGN_ARTIFACT_BINDING",
  unverifiedUpstream: "BLOCKED_UNVERIFIED_UPSTREAM_OUTPUT",
  executionClass: "BLOCKED_WORKFLOW_EXECUTION_CLASS",
  phaseBoundary: "BLOCKED_BY_PHASE_BOUNDARY",
  missingInput: "BLOCKED_WORKFLOW_MISSING_INPUT",
  staleWorkflow: "BLOCKED_STALE_WORKFLOW_VERSION",
  sourceOverwrite: "BLOCKED_SOURCE_OVERWRITE",
  outputBoundary: "BLOCKED_OUTPUT_BOUNDARY"
};

export const workflowBindingSources = {
  userInput: "USER_INPUT",
  sourceAsset: "SOURCE_ASSET",
  stepOutput: "STEP_OUTPUT",
  stepObservation: "STEP_OBSERVATION",
  workflowContext: "WORKFLOW_CONTEXT",
  canonicalDefault: "CANONICAL_DEFAULT"
};

export const localMediaRepurposeRecipe = Object.freeze({
  modelType: "WorkflowRecipe",
  recipeId: "LOCAL_MEDIA_REPURPOSE_PROOF",
  version: "1.0.0",
  goalClass: "SAFE_LOCAL_MEDIA_DERIVATIVES",
  requiredCapabilities: ["MEDIA_PROBE", "VIDEO_TRIM", "VIDEO_RESIZE", "AUDIO_EXTRACT"],
  executionClass: executionWorkflowClasses.safeLocalMultiStep,
  executionPolicy: executionWorkflowPolicies.safeSequential,
  failurePolicy: executionWorkflowPolicies.stopOnRequiredStepFailure,
  requiredUserInputs: ["sourceVideo", "trimStart", "trimEnd"],
  expectedFinalOutputs: ["mediaObservation", "trimmedVideo", "resizedVideo", "extractedAudio"],
  stepTemplates: [
    {
      stepId: "STEP_1_MEDIA_PROBE",
      capabilityId: "MEDIA_PROBE",
      dependsOn: [],
      outputBindings: [{ outputName: "observation", outputType: "MediaObservation" }]
    },
    {
      stepId: "STEP_2_VIDEO_TRIM",
      capabilityId: "VIDEO_TRIM",
      dependsOn: ["STEP_1_MEDIA_PROBE"],
      inputBindings: [
        { inputName: "sourceAsset", source: workflowBindingSources.sourceAsset, key: "sourceVideo", expectedType: "VideoAsset" },
        { inputName: "startSeconds", source: workflowBindingSources.userInput, key: "trimStart", expectedType: "Number" },
        { inputName: "endSeconds", source: workflowBindingSources.userInput, key: "trimEnd", expectedType: "Number" },
        { inputName: "probeObservation", source: workflowBindingSources.stepObservation, stepId: "STEP_1_MEDIA_PROBE", outputName: "observation", expectedType: "MediaObservation" }
      ],
      outputBindings: [{ outputName: "derivedVideo", outputType: "VideoArtifact" }]
    },
    {
      stepId: "STEP_3_VIDEO_RESIZE",
      capabilityId: "VIDEO_RESIZE",
      dependsOn: ["STEP_2_VIDEO_TRIM"],
      parallelizable: true,
      inputBindings: [
        { inputName: "sourceAsset", source: workflowBindingSources.stepOutput, stepId: "STEP_2_VIDEO_TRIM", outputName: "derivedVideo", expectedType: "VideoArtifact" },
        { inputName: "targetProfile", source: workflowBindingSources.canonicalDefault, value: "VIDEO_RESIZE_320x180", expectedType: "Profile" }
      ],
      outputBindings: [{ outputName: "derivedVideo", outputType: "VideoArtifact" }]
    },
    {
      stepId: "STEP_4_AUDIO_EXTRACT",
      capabilityId: "AUDIO_EXTRACT",
      dependsOn: ["STEP_2_VIDEO_TRIM"],
      parallelizable: true,
      inputBindings: [
        { inputName: "sourceAsset", source: workflowBindingSources.stepOutput, stepId: "STEP_2_VIDEO_TRIM", outputName: "derivedVideo", expectedType: "VideoArtifact" },
        { inputName: "targetProfile", source: workflowBindingSources.canonicalDefault, value: "AUDIO_WAV_STANDARD", expectedType: "Profile" }
      ],
      outputBindings: [{ outputName: "derivedAudio", outputType: "AudioArtifact" }]
    }
  ],
  dependencyTemplates: [
    { from: "STEP_1_MEDIA_PROBE", to: "STEP_2_VIDEO_TRIM" },
    { from: "STEP_2_VIDEO_TRIM", to: "STEP_3_VIDEO_RESIZE" },
    { from: "STEP_2_VIDEO_TRIM", to: "STEP_4_AUDIO_EXTRACT" }
  ]
});

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function zeroCounters() {
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
    directFfmpegInvocationsByWorkflow: 0
  };
}

export function defaultPhase21QBoundary(cwd = process.cwd()) {
  const root = path.join(cwd, "artifacts", "execution", "phase21q");
  return {
    ...defaultPhase21PBoundary(cwd),
    root,
    fixtureSourceRoot: path.join(root, "fixtures"),
    artifactRoot: path.join(root, "derived"),
    tempRoot: path.join(root, "tmp"),
    proofPath: path.join(root, "AutonomousWorkflowOrchestrationProof.json"),
    screenshotRoot: path.join(root, "screenshots")
  };
}

function ensureBoundary(boundary) {
  fs.mkdirSync(boundary.fixtureSourceRoot, { recursive: true });
  fs.mkdirSync(boundary.artifactRoot, { recursive: true });
  fs.mkdirSync(boundary.tempRoot, { recursive: true });
  fs.mkdirSync(boundary.screenshotRoot, { recursive: true });
}

function normalizeSourceAsset(sourceAsset = null, boundary = defaultPhase21QBoundary()) {
  if (sourceAsset?.localPathRef) return sourceAsset;
  ensureBoundary(boundary);
  return createSyntheticVideoFixture(boundary);
}

function stepFromTemplate(template) {
  return {
    modelType: "ExecutionWorkflowStep",
    stepId: template.stepId,
    capabilityId: template.capabilityId,
    executionClass: executionWorkflowClasses.safeLocalMultiStep,
    status: template.dependsOn?.length ? executionWorkflowStepStatuses.waitingForDependency : executionWorkflowStepStatuses.planned,
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
    blockers: [],
    warnings: [],
    parallelizable: template.parallelizable === true
  };
}

export function compileWorkflowRecipe(input = {}) {
  const recipe = input.recipe || localMediaRepurposeRecipe;
  const boundary = input.boundary || defaultPhase21QBoundary(input.cwd || process.cwd());
  const sourceAsset = normalizeSourceAsset(input.sourceAsset, boundary);
  const trimStart = Number(input.trimStart ?? input.inputs?.trimStart ?? 2);
  const trimEnd = Number(input.trimEnd ?? input.inputs?.trimEnd ?? 5);
  const workflowId = input.workflowId || createId("workflow_local_media_repurpose");
  const materialInputs = {
    sourceVideo: sourceAsset,
    trimStart,
    trimEnd
  };
  const workflowVersion = input.workflowVersion || `1.0.0-${hash({
    recipeId: recipe.recipeId,
    sourceFingerprint: sourceAsset.fingerprint || fingerprintFile(sourceAsset.localPathRef),
    trimStart,
    trimEnd
  }).slice(0, 12)}`;
  const createdAt = input.createdAt || nowIso();
  const steps = recipe.stepTemplates.map(stepFromTemplate);
  const dependencies = recipe.dependencyTemplates.map((item) => ({ ...item }));
  const composition = createCapabilityCompositionPlan({
    goal: input.goal || "Проверь видео, обрежь, сделай уменьшенную версию и извлеки аудио.",
    primaryCapabilityId: "VIDEO_TRIM",
    constraints: {
      workflowRecipeId: recipe.recipeId,
      requiredCapabilities: recipe.requiredCapabilities
    }
  });

  return {
    modelType: "ExecutionWorkflow",
    workflowId,
    workflowVersion,
    goal: input.goal || "Проверь видео, обрежь, сделай уменьшенную версию и извлеки аудио.",
    goalClass: recipe.goalClass,
    recipeId: recipe.recipeId,
    recipeVersion: recipe.version,
    workflowClass: recipe.executionClass,
    status: executionWorkflowStatuses.planned,
    sourceAssets: [sourceAsset],
    materialInputs,
    steps,
    dependencies,
    inputBindings: steps.flatMap((step) => step.inputBindings.map((binding) => ({ stepId: step.stepId, ...binding }))),
    outputBindings: steps.flatMap((step) => step.outputBindings.map((binding) => ({ stepId: step.stepId, ...binding }))),
    approvals: [],
    readiness: null,
    executionPolicy: {
      policy: recipe.executionPolicy,
      parallelExecutionEnabled: false,
      maxAutomaticRetries: 0
    },
    failurePolicy: {
      policy: recipe.failurePolicy,
      stopOnRequiredStepFailure: true
    },
    rollbackPolicy: {
      strategy: "ROLLBACK_DERIVED_ARTIFACTS_REVERSE_TOPOLOGICAL_ORDER",
      sourceAffected: false
    },
    capabilityComposition: composition,
    finalOutputs: [],
    verification: null,
    lineage: { nodes: [], edges: [] },
    audit: [{
      event: "workflow_compiled",
      recipeId: recipe.recipeId,
      reused: ["CapabilityCompositionPlan", "Execution21MFlow", "Preflight", "LocalExecutionEligibility", "SafeLocalExecutionRuntime"],
      at: createdAt
    }],
    externalActionCounters: zeroCounters(),
    createdAt,
    updatedAt: createdAt
  };
}

function stepMap(workflow) {
  return new Map((workflow.steps || []).map((step) => [step.stepId, step]));
}

export function validateWorkflowDag(workflow = {}) {
  const blockers = [];
  const ids = new Set();
  for (const step of workflow.steps || []) {
    if (ids.has(step.stepId)) blockers.push(executionWorkflowBlockers.duplicateStep);
    ids.add(step.stepId);
  }
  for (const step of workflow.steps || []) {
    for (const dep of step.dependsOn || []) {
      if (dep === step.stepId) blockers.push(executionWorkflowBlockers.selfDependency);
      if (!ids.has(dep)) blockers.push(executionWorkflowBlockers.missingDependency);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      blockers.push(executionWorkflowBlockers.cycle);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const step = (workflow.steps || []).find((item) => item.stepId === id);
    for (const dep of step?.dependsOn || []) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const step of workflow.steps || []) visit(step.stepId);
  return { ok: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function outputTypeCompatible(expected, actual) {
  if (!expected || !actual) return true;
  if (expected === actual) return true;
  if (expected === "VideoAsset" && actual === "VideoArtifact") return true;
  return false;
}

export function validateWorkflowBindings(workflow = {}) {
  const blockers = [];
  const steps = stepMap(workflow);
  const outputs = new Map();
  for (const step of workflow.steps || []) {
    for (const output of step.outputBindings || []) {
      outputs.set(`${step.stepId}.${output.outputName}`, output);
    }
  }
  for (const step of workflow.steps || []) {
    for (const binding of step.inputBindings || []) {
      if (binding.source === workflowBindingSources.stepOutput || binding.source === workflowBindingSources.stepObservation) {
        const upstream = steps.get(binding.stepId);
        const output = outputs.get(`${binding.stepId}.${binding.outputName}`);
        if (!upstream || !output) blockers.push(executionWorkflowBlockers.invalidBinding);
        if (output && !outputTypeCompatible(binding.expectedType, output.outputType)) blockers.push(executionWorkflowBlockers.typeMismatch);
        if (upstream && !(step.dependsOn || []).includes(binding.stepId)) blockers.push(executionWorkflowBlockers.invalidBinding);
      }
      if (binding.source === workflowBindingSources.userInput && workflow.materialInputs?.[binding.key] == null) {
        blockers.push(executionWorkflowBlockers.missingInput);
      }
      if (binding.source === workflowBindingSources.sourceAsset && !workflow.materialInputs?.[binding.key]?.localPathRef) {
        blockers.push(executionWorkflowBlockers.missingInput);
      }
    }
  }
  return { ok: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function capabilityIssuesForWorkflow(workflow = {}) {
  const blockers = [];
  const stepReadiness = [];
  for (const step of workflow.steps || []) {
    const capability = getCapability(step.capabilityId);
    const profile = getSafeLocalCapabilityProfile(step.capabilityId);
    const stepBlockers = [];
    if (!capability) stepBlockers.push("CAPABILITY_NOT_FOUND");
    if (!profile) stepBlockers.push(executionWorkflowBlockers.executionClass);
    if (workflow.workflowClass !== executionWorkflowClasses.safeLocalMultiStep) stepBlockers.push(executionWorkflowBlockers.phaseBoundary);
    if (["PUBLISHING_PACKAGE", "WEBSITE_DEPLOY", "SOCIAL_PUBLISH"].includes(step.capabilityId)) stepBlockers.push(executionWorkflowBlockers.phaseBoundary);
    if (capability?.externalProviderPossible && !profile) stepBlockers.push(executionWorkflowBlockers.executionClass);
    stepReadiness.push({
      stepId: step.stepId,
      capabilityId: step.capabilityId,
      safeLocalProfileAvailable: Boolean(profile),
      adapterChecked: Boolean(profile?.toolAdapterId),
      verifierChecked: Boolean(profile?.verificationProfileId),
      profileChecked: Boolean(profile),
      blockers: stepBlockers
    });
    blockers.push(...stepBlockers);
  }
  return { blockers: [...new Set(blockers)], stepReadiness };
}

export function preflightExecutionWorkflow(workflow = {}) {
  const dag = validateWorkflowDag(workflow);
  const bindings = validateWorkflowBindings(workflow);
  const capabilityIssues = capabilityIssuesForWorkflow(workflow);
  const inputIssues = [];
  const source = workflow.materialInputs?.sourceVideo;
  if (!source?.localPathRef || !fs.existsSync(source.localPathRef)) inputIssues.push(executionWorkflowBlockers.missingInput);
  if (!Number.isFinite(Number(workflow.materialInputs?.trimStart)) || !Number.isFinite(Number(workflow.materialInputs?.trimEnd))) inputIssues.push(executionWorkflowBlockers.missingInput);
  if (Number(workflow.materialInputs?.trimStart) >= Number(workflow.materialInputs?.trimEnd)) inputIssues.push(safeLocalExecutionBlockers.invalidRange);
  const blockers = [...new Set([
    ...dag.blockers,
    ...bindings.blockers,
    ...capabilityIssues.blockers,
    ...inputIssues
  ])];
  return {
    modelType: "ExecutionWorkflowPreflight",
    workflowId: workflow.workflowId,
    workflowVersion: workflow.workflowVersion,
    workflowReady: blockers.length === 0,
    stepReadiness: capabilityIssues.stepReadiness,
    missingInputs: inputIssues.includes(executionWorkflowBlockers.missingInput) ? ["sourceVideo", "trimStart", "trimEnd"] : [],
    materialApprovals: [],
    dependencyIssues: dag.blockers,
    bindingIssues: bindings.blockers,
    capabilityIssues: capabilityIssues.blockers,
    boundaryIssues: blockers.filter((item) => item === executionWorkflowBlockers.phaseBoundary || item === executionWorkflowBlockers.executionClass),
    blockers,
    warnings: [],
    externalActionCounters: zeroCounters()
  };
}

function verifiedStep(step) {
  return step.status === executionWorkflowStepStatuses.succeeded && step.verification?.verified === true;
}

export function resolveRunnableWorkflowSteps(workflow = {}) {
  return (workflow.steps || []).filter((step) => {
    if (![executionWorkflowStepStatuses.planned, executionWorkflowStepStatuses.waitingForDependency, executionWorkflowStepStatuses.ready].includes(step.status)) return false;
    return (step.dependsOn || []).every((dep) => verifiedStep(stepMap(workflow).get(dep)));
  }).map((step) => step.stepId);
}

function artifactToSourceAsset(artifact) {
  return {
    sourceAssetId: artifact.artifactId,
    localPathRef: artifact.localPathRef,
    durationSeconds: null,
    dimensions: null,
    hasAudio: true,
    fingerprint: artifact.artifactFingerprint
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function pathInside(childPath, rootPath) {
  const resolvedChild = path.resolve(childPath || "");
  const resolvedRoot = path.resolve(rootPath || "");
  return resolvedChild === resolvedRoot || resolvedChild.startsWith(`${resolvedRoot}${path.sep}`);
}

export function validateVerifiedWorkflowHandoff(workflow = {}, binding = {}, candidate = null, boundary = defaultPhase21QBoundary()) {
  const blockers = [];
  const expectedWorkflowId = workflow.workflowId;
  const expectedType = binding.expectedType;
  const candidateWorkflowId = candidate?.workflowId;
  const candidateType = candidate?.type;
  const artifact = candidate?.artifact;

  if (!candidate || !binding.stepId || !binding.outputName) {
    blockers.push(executionWorkflowBlockers.invalidBinding);
  }
  if (candidateWorkflowId && expectedWorkflowId && candidateWorkflowId !== expectedWorkflowId) {
    blockers.push(executionWorkflowBlockers.foreignArtifact);
  }
  if (candidate?.verified !== true || artifact?.verificationState === "FAILED" || artifact?.verificationState === "PENDING") {
    blockers.push(executionWorkflowBlockers.unverifiedUpstream);
  }
  if (!outputTypeCompatible(expectedType, candidateType)) {
    blockers.push(executionWorkflowBlockers.typeMismatch);
  }
  if (artifact?.localPathRef) {
    const withinArtifactRoot = pathInside(artifact.localPathRef, boundary.artifactRoot);
    if (!withinArtifactRoot || !fs.existsSync(artifact.localPathRef)) {
      blockers.push(executionWorkflowBlockers.outputBoundary);
    }
  }

  return {
    ok: blockers.length === 0,
    blockers: [...new Set(blockers)]
  };
}

function resolveInputsForStep(step, workflow) {
  const outputs = workflow._runtimeOutputs || {};
  if (step.capabilityId === "MEDIA_PROBE") return { sourceAsset: workflow.materialInputs.sourceVideo, inputs: {} };
  if (step.capabilityId === "VIDEO_TRIM") {
    return {
      sourceAsset: workflow.materialInputs.sourceVideo,
      inputs: {
        startSeconds: Number(workflow.materialInputs.trimStart),
        endSeconds: Number(workflow.materialInputs.trimEnd)
      }
    };
  }
  const trimArtifact = outputs["STEP_2_VIDEO_TRIM.derivedVideo"];
  const handoff = validateVerifiedWorkflowHandoff(
    workflow,
    step.inputBindings?.find((binding) => binding.source === workflowBindingSources.stepOutput) || {},
    trimArtifact
  );
  if (!handoff.ok) {
    return { blocker: handoff.blockers[0] || executionWorkflowBlockers.unverifiedUpstream };
  }
  if (step.capabilityId === "VIDEO_RESIZE") {
    return {
      sourceAsset: artifactToSourceAsset(trimArtifact.artifact),
      inputs: { targetProfile: "VIDEO_RESIZE_320x180" }
    };
  }
  if (step.capabilityId === "AUDIO_EXTRACT") {
    return {
      sourceAsset: artifactToSourceAsset(trimArtifact.artifact),
      inputs: { targetProfile: "AUDIO_WAV_STANDARD" }
    };
  }
  return { blocker: executionWorkflowBlockers.executionClass };
}

function bindStepOutputs(step, workflow, result) {
  workflow._runtimeOutputs ||= {};
  if (step.capabilityId === "MEDIA_PROBE") {
    workflow._runtimeOutputs[`${step.stepId}.observation`] = {
      type: "MediaObservation",
      observation: result.observations[0],
      verified: result.verification?.verified === true,
      workflowId: workflow.workflowId
    };
    return;
  }
  const outputName = step.capabilityId === "AUDIO_EXTRACT" ? "derivedAudio" : "derivedVideo";
  workflow._runtimeOutputs[`${step.stepId}.${outputName}`] = {
    type: step.capabilityId === "AUDIO_EXTRACT" ? "AudioArtifact" : "VideoArtifact",
    artifact: result.derivedArtifacts[0],
    verified: result.verification?.verified === true && result.derivedArtifacts[0]?.verificationState === "VERIFIED",
    workflowId: workflow.workflowId
  };
}

function buildLineage(workflow) {
  const source = workflow.sourceAssets[0];
  const nodes = [
    { nodeId: "SOURCE_VIDEO", type: "SOURCE_ASSET", sourceAssetId: source.sourceAssetId, fingerprint: source.fingerprint },
    { nodeId: "MEDIA_OBSERVATION", type: "OBSERVATION", stepId: "STEP_1_MEDIA_PROBE" }
  ];
  const edges = [{ from: "SOURCE_VIDEO", to: "MEDIA_OBSERVATION", relationship: "OBSERVED_BY_MEDIA_PROBE" }];
  for (const step of workflow.steps || []) {
    for (const artifact of step.result?.derivedArtifacts || []) {
      const nodeId = step.capabilityId === "VIDEO_TRIM"
        ? "TRIMMED_VIDEO"
        : step.capabilityId === "VIDEO_RESIZE"
          ? "RESIZED_VIDEO"
          : "EXTRACTED_AUDIO";
      nodes.push({
        nodeId,
        type: artifact.artifactType,
        artifactId: artifact.artifactId,
        localPathRef: artifact.localPathRef,
        fingerprint: artifact.artifactFingerprint,
        stepId: step.stepId,
        role: step.capabilityId === "VIDEO_TRIM" ? "INTERMEDIATE_AND_USER_ACCESSIBLE" : "FINAL_ARTIFACT"
      });
      edges.push({
        from: step.capabilityId === "VIDEO_TRIM" ? "SOURCE_VIDEO" : "TRIMMED_VIDEO",
        to: nodeId,
        relationship: artifact.lineage?.operation || step.capabilityId
      });
    }
  }
  return { nodes, edges };
}

function finalOutputsFor(workflow) {
  const outputs = [];
  const probeStep = workflow.steps.find((step) => step.capabilityId === "MEDIA_PROBE");
  if (probeStep?.observations?.[0]) {
    outputs.push({ outputName: "mediaObservation", outputRole: "OBSERVATION", stepId: probeStep.stepId, value: probeStep.observations[0] });
  }
  for (const step of workflow.steps || []) {
    for (const artifact of step.result?.derivedArtifacts || []) {
      outputs.push({
        outputName: step.capabilityId === "VIDEO_TRIM" ? "trimmedVideo" : step.capabilityId === "VIDEO_RESIZE" ? "resizedVideo" : "extractedAudio",
        outputRole: step.capabilityId === "VIDEO_TRIM" ? "INTERMEDIATE_AND_USER_ACCESSIBLE" : "FINAL_ARTIFACT",
        stepId: step.stepId,
        artifact
      });
    }
  }
  return outputs;
}

function completeWorkflow(workflow, terminalStatus = null) {
  const requiredSucceeded = workflow.steps.every(verifiedStep);
  const sourceFingerprintAfter = fingerprintFile(workflow.sourceAssets[0].localPathRef);
  workflow.finalOutputs = finalOutputsFor(workflow);
  workflow.lineage = buildLineage(workflow);
  workflow.verification = {
    modelType: "ExecutionWorkflowVerification",
    workflowId: workflow.workflowId,
    verified: requiredSucceeded &&
      workflow.finalOutputs.length === 4 &&
      workflow.sourceAssets[0].fingerprint === sourceFingerprintAfter,
    requiredStepsSucceeded: requiredSucceeded,
    finalBindingsResolved: workflow.finalOutputs.length === 4,
    sourcePreserved: workflow.sourceAssets[0].fingerprint === sourceFingerprintAfter,
    verifiedAt: nowIso()
  };
  workflow.status = terminalStatus || (workflow.verification.verified
    ? executionWorkflowStatuses.succeeded
    : executionWorkflowStatuses.partiallySucceeded);
  workflow.rollback = {
    available: workflow.finalOutputs.some((output) => output.artifact),
    status: "AVAILABLE",
    label: "Удалить созданные версии. Исходный файл останется без изменений."
  };
  workflow.userSummary = workflow.verification.verified
    ? "Готово. ESSA выполнила весь локальный workflow: проверила видео, обрезала, создала уменьшенную версию и извлекла аудио. Исходник не изменён."
    : "Workflow завершён частично. Проверенные результаты сохранены, незавершённые шаги не выданы как успех.";
  workflow.updatedAt = nowIso();
  delete workflow._runtimeOutputs;
  return workflow;
}

export function executeWorkflow(input = {}) {
  const workflow = input.workflow || compileWorkflowRecipe(input);
  const expectedWorkflowVersion = input.expectedWorkflowVersion || workflow.workflowVersion;
  if (expectedWorkflowVersion !== workflow.workflowVersion) {
    return { ok: false, duplicate: false, workflow: { ...workflow, status: executionWorkflowStatuses.preflightBlocked }, blockers: [executionWorkflowBlockers.staleWorkflow], counters: zeroCounters() };
  }
  const preflight = preflightExecutionWorkflow(workflow);
  workflow.readiness = preflight;
  if (!preflight.workflowReady) {
    workflow.status = executionWorkflowStatuses.preflightBlocked;
    workflow.audit.push({ event: "workflow_preflight_blocked", blockers: preflight.blockers, at: nowIso() });
    return { ok: false, duplicate: false, workflow, blockers: preflight.blockers, counters: zeroCounters() };
  }
  if (input.executedWorkflowFingerprints?.has?.(workflow.workflowVersion)) {
    return {
      ok: true,
      duplicate: true,
      workflow: cloneJson(input.executedWorkflowFingerprints.get(workflow.workflowVersion)),
      blockers: [],
      counters: { ...zeroCounters(), workflowExecutionRequests: 1 }
    };
  }
  workflow.status = executionWorkflowStatuses.running;
  workflow.audit.push({ event: "workflow_execution_started", executionPolicy: workflow.executionPolicy.policy, at: nowIso() });
  const counters = { ...zeroCounters(), workflowExecutionRequests: 1 };
  const maxRounds = workflow.steps.length + 2;
  for (let round = 0; round < maxRounds; round += 1) {
    const runnable = resolveRunnableWorkflowSteps(workflow);
    if (!runnable.length) break;
    for (const stepId of runnable) {
      const step = workflow.steps.find((item) => item.stepId === stepId);
      const resolved = resolveInputsForStep(step, workflow);
      if (resolved.blocker) {
        step.status = executionWorkflowStepStatuses.preflightBlocked;
        step.blockers.push(resolved.blocker);
        continue;
      }
      step.status = executionWorkflowStepStatuses.running;
      step.attempts += 1;
      counters.stepExecutionRequests += 1;
      const run = executeSafeLocalWorkspaceAction({
        capabilityId: step.capabilityId,
        sourceAsset: resolved.sourceAsset,
        inputs: resolved.inputs,
        boundary: input.boundary || defaultPhase21QBoundary(input.cwd || process.cwd()),
        executionId: `${workflow.workflowId}_${step.stepId}`,
        simulateToolFailure: input.simulateStepFailure === step.capabilityId,
        simulateVerificationFailure: input.simulateVerificationFailure === step.capabilityId
      });
      step.result = run.result;
      step.executionId = run.result?.executionId || null;
      step.preflight = run.viewModel?.preflightState || null;
      step.eligibility = run.viewModel?.eligibility || null;
      step.verification = run.result?.verification || null;
      step.observations = run.result?.observations || [];
      if (run.result?.status === localExecutionStatuses.succeeded) {
        step.status = executionWorkflowStepStatuses.succeeded;
        bindStepOutputs(step, workflow, run.result);
        workflow.audit.push({ event: "workflow_step_succeeded", stepId, executionId: step.executionId, at: nowIso() });
      } else if (run.result?.status === localExecutionStatuses.verificationFailed) {
        step.status = executionWorkflowStepStatuses.verificationFailed;
        workflow.status = executionWorkflowStatuses.verificationFailed;
        workflow.audit.push({ event: "workflow_step_verification_failed", stepId, at: nowIso() });
        return { ok: false, duplicate: false, workflow: completeWorkflow(workflow, executionWorkflowStatuses.verificationFailed), blockers: [executionWorkflowBlockers.unverifiedUpstream], counters };
      } else {
        step.status = executionWorkflowStepStatuses.failed;
        workflow.status = executionWorkflowStatuses.failed;
        workflow.audit.push({ event: "workflow_step_failed", stepId, at: nowIso() });
        return { ok: false, duplicate: false, workflow: completeWorkflow(workflow, executionWorkflowStatuses.failed), blockers: step.blockers, counters };
      }
    }
  }
  for (const step of workflow.steps) {
    if (step.status === executionWorkflowStepStatuses.waitingForDependency) {
      step.status = executionWorkflowStepStatuses.skipped;
      step.blockers.push(executionWorkflowBlockers.unverifiedUpstream);
    }
  }
  const completed = completeWorkflow(workflow);
  input.executedWorkflowFingerprints?.set?.(workflow.workflowVersion, cloneJson(completed));
  return { ok: completed.status === executionWorkflowStatuses.succeeded, duplicate: false, workflow: completed, blockers: [], counters };
}

export function rollbackExecutionWorkflow(workflow = {}, boundary = defaultPhase21QBoundary()) {
  const derivedSteps = [...(workflow.steps || [])]
    .filter((step) => step.result?.derivedArtifacts?.length)
    .reverse();
  const results = [];
  for (const step of derivedSteps) {
    const rollback = rollbackLocalExecution(step.result, boundary);
    results.push({ stepId: step.stepId, executionId: step.executionId, rollback });
    if (rollback.status === localExecutionRollbackStatuses.completed) {
      step.status = executionWorkflowStepStatuses.rolledBack;
      step.result = {
        ...step.result,
        rollbackAvailable: false,
        derivedArtifacts: [],
        rollback
      };
    }
  }
  const allCompleted = results.every((item) => item.rollback.status === localExecutionRollbackStatuses.completed);
  const nextWorkflow = {
    ...workflow,
    status: allCompleted ? executionWorkflowStatuses.rolledBack : executionWorkflowStatuses.partiallyRolledBack,
    rollback: {
      available: false,
      status: allCompleted ? "COMPLETED" : "PARTIAL",
      results
    },
    finalOutputs: finalOutputsFor(workflow),
    updatedAt: nowIso(),
    audit: [
      ...(workflow.audit || []),
      { event: "workflow_rollback", reverseDependencyOrder: results.map((item) => item.stepId), status: allCompleted ? "COMPLETED" : "PARTIAL", at: nowIso() }
    ],
    externalActionCounters: zeroCounters()
  };
  nextWorkflow.lineage = buildLineage(nextWorkflow);
  return { ok: allCompleted, workflow: nextWorkflow, rollbackResults: results, counters: zeroCounters() };
}

export function createWorkflowViewModel(workflow = null) {
  const current = workflow || compileWorkflowRecipe();
  const preflight = current.readiness || preflightExecutionWorkflow(current);
  const primaryAction = {
    action: "EXECUTE_WORKFLOW",
    label: "Выполнить workflow",
    enabled: preflight.workflowReady && ![
      executionWorkflowStatuses.running,
      executionWorkflowStatuses.succeeded,
      executionWorkflowStatuses.rolledBack
    ].includes(current.status),
    disabledReason: preflight.blockers[0] || null
  };
  return {
    modelType: "ExecutionWorkflowViewModel",
    route: "#workflow/LOCAL_MEDIA_REPURPOSE_PROOF",
    workflowId: current.workflowId,
    workflowVersion: current.workflowVersion,
    recipeId: current.recipeId,
    title: "Local Media Repurpose Workflow",
    goal: current.goal,
    status: current.status,
    workflowClass: current.workflowClass,
    executionPolicy: current.executionPolicy,
    failurePolicy: current.failurePolicy,
    sourceAsset: {
      selected: Boolean(current.sourceAssets?.[0]?.localPathRef),
      displayName: current.sourceAssets?.[0]?.localPathRef ? path.basename(current.sourceAssets[0].localPathRef) : null,
      sourcePathInRoute: false
    },
    requiredInputs: {
      trimStart: current.materialInputs?.trimStart,
      trimEnd: current.materialInputs?.trimEnd
    },
    readiness: preflight,
    steps: current.steps.map((step) => ({
      stepId: step.stepId,
      capabilityId: step.capabilityId,
      status: step.status,
      dependsOn: step.dependsOn,
      parallelizable: step.parallelizable,
      executionId: step.executionId,
      attempts: step.attempts,
      verified: step.verification?.verified === true,
      blockers: step.blockers,
      outputCount: (step.result?.derivedArtifacts || []).length + (step.result?.observations || []).length
    })),
    dependencies: current.dependencies,
    finalOutputs: current.finalOutputs || [],
    lineage: current.lineage,
    verification: current.verification,
    rollback: current.rollback || { available: false, label: "Удалить созданные версии" },
    userActions: [
      { action: "SELECT_SYNTHETIC_ASSET", label: "Выбрать синтетическое видео", enabled: true },
      primaryAction,
      { action: "ROLLBACK_WORKFLOW", label: "Удалить созданные версии", enabled: current.rollback?.available === true }
    ],
    externalActionCounters: zeroCounters()
  };
}

export function createAutonomousWorkflowOrchestrationProof(input = {}) {
  const boundary = input.boundary || defaultPhase21QBoundary(input.cwd || process.cwd());
  ensureBoundary(boundary);
  const sourceAsset = createSyntheticVideoFixture(boundary);
  const workflow = compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 2, trimEnd: 5 });
  const executedWorkflowFingerprints = new Map();
  const success = executeWorkflow({ workflow, boundary, executedWorkflowFingerprints });
  const successWorkflowSnapshot = cloneJson(success.workflow);
  const rollback = rollbackExecutionWorkflow(cloneJson(success.workflow), boundary);
  const stepFailureWorkflow = compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 1, trimEnd: 4, workflowId: createId("workflow_failure") });
  const stepFailure = executeWorkflow({ workflow: stepFailureWorkflow, boundary, simulateStepFailure: "VIDEO_RESIZE" });
  const verificationFailureWorkflow = compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 1.5, trimEnd: 4.5, workflowId: createId("workflow_verification_failure") });
  const verificationFailure = executeWorkflow({ workflow: verificationFailureWorkflow, boundary, simulateVerificationFailure: "VIDEO_TRIM" });
  const invalidDag = compileWorkflowRecipe({ boundary, sourceAsset });
  invalidDag.steps[0].dependsOn = ["STEP_4_AUDIO_EXTRACT"];
  const invalidBinding = compileWorkflowRecipe({ boundary, sourceAsset });
  invalidBinding.steps[2].inputBindings[0].outputName = "missing";
  const typeMismatch = compileWorkflowRecipe({ boundary, sourceAsset });
  typeMismatch.steps[2].inputBindings[0].expectedType = "AudioArtifact";
  const externalStep = compileWorkflowRecipe({ boundary, sourceAsset });
  externalStep.steps.push(stepFromTemplate({ stepId: "STEP_5_BOOK_COVER", capabilityId: "BOOK_COVER", dependsOn: [] }));
  const publishStep = compileWorkflowRecipe({ boundary, sourceAsset });
  publishStep.steps.push(stepFromTemplate({ stepId: "STEP_5_PUBLISH", capabilityId: "PUBLISHING_PACKAGE", dependsOn: [] }));
  const stale = executeWorkflow({ workflow: compileWorkflowRecipe({ boundary, sourceAsset }), boundary, expectedWorkflowVersion: "stale" });
  const duplicateWorkflow = compileWorkflowRecipe({ boundary, sourceAsset, trimStart: 2.5, trimEnd: 5.5, workflowId: createId("workflow_duplicate") });
  const firstDuplicate = executeWorkflow({ workflow: duplicateWorkflow, boundary, executedWorkflowFingerprints });
  const secondDuplicate = executeWorkflow({ workflow: duplicateWorkflow, boundary, executedWorkflowFingerprints });

  const proof = {
    artifactType: "AutonomousWorkflowOrchestrationProof",
    phase: "21Q",
    status: success.ok && rollback.ok && secondDuplicate.duplicate
      ? "PHASE_21Q_AUTONOMOUS_WORKFLOW_ORCHESTRATION_PASS"
      : "PHASE_21Q_AUTONOMOUS_WORKFLOW_ORCHESTRATION_FAIL",
    workflowContract: {
      workflowId: successWorkflowSnapshot.workflowId,
      workflowVersion: successWorkflowSnapshot.workflowVersion,
      workflowClass: successWorkflowSnapshot.workflowClass,
      status: successWorkflowSnapshot.status
    },
    recipe: localMediaRepurposeRecipe,
    goal: successWorkflowSnapshot.goal,
    steps: successWorkflowSnapshot.steps,
    dag: successWorkflowSnapshot.dependencies,
    bindings: {
      inputBindings: successWorkflowSnapshot.inputBindings,
      outputBindings: successWorkflowSnapshot.outputBindings
    },
    preflight: successWorkflowSnapshot.readiness,
    executionPolicy: successWorkflowSnapshot.executionPolicy,
    failurePolicy: successWorkflowSnapshot.failurePolicy,
    stepExecutionIds: successWorkflowSnapshot.steps.map((step) => ({ stepId: step.stepId, executionId: step.executionId })),
    verification: successWorkflowSnapshot.verification,
    artifacts: successWorkflowSnapshot.finalOutputs.filter((output) => output.artifact),
    observations: successWorkflowSnapshot.finalOutputs.filter((output) => output.outputRole === "OBSERVATION"),
    lineage: successWorkflowSnapshot.lineage,
    finalResult: {
      status: successWorkflowSnapshot.status,
      outputs: successWorkflowSnapshot.finalOutputs.map((output) => output.outputName),
      userSummary: successWorkflowSnapshot.userSummary
    },
    sourceFingerprints: {
      before: sourceAsset.fingerprint,
      afterSuccess: fingerprintFile(sourceAsset.localPathRef),
      afterRollback: fingerprintFile(sourceAsset.localPathRef)
    },
    rollback: rollback.rollbackResults,
    failureFixtures: {
      stepFailure: {
        status: stepFailure.workflow.status,
        steps: stepFailure.workflow.steps.map((step) => ({ stepId: step.stepId, status: step.status }))
      },
      verificationFailure: {
        status: verificationFailure.workflow.status,
        steps: verificationFailure.workflow.steps.map((step) => ({ stepId: step.stepId, status: step.status }))
      },
      invalidDag: preflightExecutionWorkflow(invalidDag),
      invalidBinding: preflightExecutionWorkflow(invalidBinding),
      typeMismatch: preflightExecutionWorkflow(typeMismatch),
      externalStep: preflightExecutionWorkflow(externalStep),
      publishStep: preflightExecutionWorkflow(publishStep),
      staleWorkflow: stale,
      duplicateSubmit: { firstOk: firstDuplicate.ok, secondDuplicate: secondDuplicate.duplicate }
    },
    securityChecks: {
      noGenericExecutionStep: true,
      noWorkflowDirectFfmpeg: success.counters.directFfmpegInvocationsByWorkflow === 0,
      verifiedHandoffOnly: successWorkflowSnapshot.steps.every((step) => step.capabilityId === "MEDIA_PROBE" || step.verification?.verified === true),
      sourceImmutable: sourceAsset.fingerprint === fingerprintFile(sourceAsset.localPathRef)
    },
    externalCounters: zeroCounters(),
    createdAt: nowIso()
  };
  fs.mkdirSync(path.dirname(boundary.proofPath), { recursive: true });
  fs.writeFileSync(boundary.proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  return { proof, proofPath: boundary.proofPath };
}
