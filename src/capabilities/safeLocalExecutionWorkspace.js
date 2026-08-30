import fs from "node:fs";
import path from "node:path";

import {
  authorizeLocalExecution,
  createAudioExtractExecutionPlan,
  createMediaProbeExecutionPlan,
  createVideoResizeExecutionPlan,
  createVideoTrimExecutionPlan,
  defaultPhase21PBoundary,
  deferredSafeLocalCapabilities,
  evaluateLocalExecutionEligibility,
  fingerprintFile,
  getSafeLocalCapabilityProfile,
  localExecutionGateDecisions,
  localExecutionModes,
  localExecutionRollbackStatuses,
  localExecutionStatuses,
  rollbackLocalExecution,
  runSafeLocalExecution,
  safeLocalExecutionBlockers
} from "./safeLocalExecution.js";
import { buildExecution21MFlow } from "./executionInputApproval.js";
import { productIds } from "./productCapabilityMap.js";

export const safeLocalWorkspaceCapabilities = Object.freeze([
  {
    capabilityId: "MEDIA_PROBE",
    title: "Показать параметры файла",
    description: "Локальная read-only проверка медиафайла.",
    actionLabel: "Показать параметры"
  },
  {
    capabilityId: "VIDEO_TRIM",
    title: "Обрезать видео",
    description: "Создать новый видеофайл из выбранного фрагмента.",
    actionLabel: "Обрезать видео"
  },
  {
    capabilityId: "VIDEO_RESIZE",
    title: "Создать версию 320 x 180",
    description: "Создать новую уменьшенную версию видео.",
    actionLabel: "Создать новую версию"
  },
  {
    capabilityId: "AUDIO_EXTRACT",
    title: "Извлечь аудио",
    description: "Извлечь аудиодорожку в новый WAV-файл.",
    actionLabel: "Извлечь аудио"
  }
]);

export const safeLocalWorkspaceStates = {
  pending: "PENDING",
  authorized: "AUTHORIZED",
  running: "RUNNING",
  succeeded: "SUCCEEDED",
  failed: "FAILED",
  verificationFailed: "VERIFICATION_FAILED",
  rolledBack: "ROLLED_BACK",
  blocked: "BLOCKED",
  cancelled: "CANCELLED"
};

const capabilityInputDefaults = {
  MEDIA_PROBE: {},
  VIDEO_TRIM: { startSeconds: 2, endSeconds: 5 },
  VIDEO_RESIZE: { targetProfile: "VIDEO_RESIZE_320x180" },
  AUDIO_EXTRACT: { targetProfile: "AUDIO_WAV_STANDARD" }
};

const missingInputLabels = {
  source: "Выберите локальный медиафайл.",
  startSeconds: "Укажите время начала.",
  endSeconds: "Укажите время окончания.",
  targetProfile: "Выберите поддерживаемый профиль результата."
};

const blockerLabels = {
  [safeLocalExecutionBlockers.notEligibleSafeLocalExecution]: "Эта возможность пока недоступна для локального выполнения.",
  [safeLocalExecutionBlockers.inputNotReady]: "Не хватает обязательных данных.",
  [safeLocalExecutionBlockers.preflightNotReady]: "Preflight пока не готов.",
  [safeLocalExecutionBlockers.invalidRange]: "Проверьте время начала и окончания.",
  [safeLocalExecutionBlockers.rangeOutOfBounds]: "Время окончания выходит за длительность видео.",
  [safeLocalExecutionBlockers.invalidFileType]: "Этот тип файла не поддерживается.",
  [safeLocalExecutionBlockers.resourceLimit]: "Параметры задачи превышают безопасный локальный лимит.",
  [safeLocalExecutionBlockers.blockedSourceOverwrite]: "Нельзя заменить исходный файл.",
  [safeLocalExecutionBlockers.blockedOutputBoundary]: "Результат должен создаваться только в разрешённой рабочей области.",
  [safeLocalExecutionBlockers.unsupportedOperation]: "Эта операция не разрешена для выбранной возможности.",
  [safeLocalExecutionBlockers.unsupportedProfile]: "Этот профиль результата не поддерживается.",
  [safeLocalExecutionBlockers.toolCapabilityMismatch]: "Инструмент не соответствует выбранной возможности.",
  [safeLocalExecutionBlockers.arbitraryExecutableBlocked]: "Произвольный исполняемый файл заблокирован.",
  [safeLocalExecutionBlockers.unsafeFlagBlocked]: "Произвольные параметры инструмента заблокированы.",
  [safeLocalExecutionBlockers.pathTraversalBlocked]: "Недопустимый путь результата заблокирован."
};

function fileName(value) {
  return value ? path.basename(value) : null;
}

function fileSize(value) {
  return value && fs.existsSync(value) ? fs.statSync(value).size : null;
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
    externalAccountMutations: 0,
    productionDbMutations: 0,
    envKeyBillingChanges: 0
  };
}

function currentInputsFor(capabilityId, sourceAsset, inputs = {}) {
  const sourcePath = sourceAsset?.localPathRef;
  if (capabilityId === "VIDEO_TRIM") {
    return {
      source_video: sourcePath,
      time_range: Number.isFinite(Number(inputs.startSeconds)) && Number.isFinite(Number(inputs.endSeconds))
        ? `${inputs.startSeconds}-${inputs.endSeconds}`
        : null
    };
  }
  if (capabilityId === "VIDEO_RESIZE") {
    return {
      source_video: sourcePath,
      target_profile: inputs.targetProfile || capabilityInputDefaults.VIDEO_RESIZE.targetProfile
    };
  }
  if (capabilityId === "AUDIO_EXTRACT") {
    return {
      source_media: sourcePath,
      target_profile: inputs.targetProfile || capabilityInputDefaults.AUDIO_EXTRACT.targetProfile
    };
  }
  return {
    source_media: sourcePath
  };
}

function createFlow(capabilityId, sourceAsset, inputs = {}) {
  return buildExecution21MFlow({
    intentId: inputs.intentId || createId(`workspace_${capabilityId.toLowerCase()}_intent`),
    requestId: inputs.requestId || createId(`workspace_${capabilityId.toLowerCase()}_request`),
    traceId: inputs.traceId || createId(`workspace_${capabilityId.toLowerCase()}_trace`),
    userNeed: inputs.userNeed || safeLocalWorkspaceCapabilities.find((item) => item.capabilityId === capabilityId)?.title || capabilityId,
    productId: productIds.production,
    primaryCapabilityId: capabilityId
  }, {
    currentUserInputs: currentInputsFor(capabilityId, sourceAsset, inputs),
    validationContext: {
      mediaDurationSeconds: sourceAsset?.durationSeconds
    }
  }, [], {}, {
    intentVersion: "1.0.0",
    createdAt: "2026-08-30T00:00:00.000Z"
  });
}

export function createWorkspaceExecutionPlan({ capabilityId, sourceAsset, inputs = {}, boundary = defaultPhase21PBoundary() } = {}) {
  if (!sourceAsset?.localPathRef) return null;
  if (capabilityId === "MEDIA_PROBE") {
    return createMediaProbeExecutionPlan({
      sourceAssetId: sourceAsset.sourceAssetId,
      sourcePath: sourceAsset.localPathRef
    }, boundary);
  }
  if (capabilityId === "VIDEO_RESIZE") {
    return createVideoResizeExecutionPlan({
      sourceAssetId: sourceAsset.sourceAssetId,
      sourcePath: sourceAsset.localPathRef,
      targetProfile: inputs.targetProfile || "VIDEO_RESIZE_320x180"
    }, boundary);
  }
  if (capabilityId === "AUDIO_EXTRACT") {
    return createAudioExtractExecutionPlan({
      sourceAssetId: sourceAsset.sourceAssetId,
      sourcePath: sourceAsset.localPathRef,
      targetProfile: inputs.targetProfile || "AUDIO_WAV_STANDARD"
    }, boundary);
  }
  return createVideoTrimExecutionPlan({
    sourceAssetId: sourceAsset.sourceAssetId,
    sourcePath: sourceAsset.localPathRef,
    startSeconds: Number(inputs.startSeconds),
    endSeconds: Number(inputs.endSeconds)
  }, boundary);
}

function missingInputsFor(capabilityId, sourceAsset, inputs = {}) {
  const missing = [];
  if (!sourceAsset?.localPathRef) missing.push({ inputKey: "source", label: missingInputLabels.source });
  if (capabilityId === "VIDEO_TRIM") {
    if (!Number.isFinite(Number(inputs.startSeconds))) missing.push({ inputKey: "startSeconds", label: missingInputLabels.startSeconds });
    if (!Number.isFinite(Number(inputs.endSeconds))) missing.push({ inputKey: "endSeconds", label: missingInputLabels.endSeconds });
  }
  if (["VIDEO_RESIZE", "AUDIO_EXTRACT"].includes(capabilityId) && !inputs.targetProfile) {
    missing.push({ inputKey: "targetProfile", label: missingInputLabels.targetProfile });
  }
  return missing;
}

function sourceAssetView(sourceAsset = null) {
  if (!sourceAsset) {
    return {
      selected: false,
      displayName: null,
      type: null,
      duration: null,
      dimensions: null,
      size: null,
      preservedMessage: "Выберите локальный файл. Исходный файл не будет изменён."
    };
  }
  return {
    selected: true,
    assetId: sourceAsset.sourceAssetId,
    displayName: fileName(sourceAsset.localPathRef),
    type: "local_media_fixture",
    duration: sourceAsset.durationSeconds,
    dimensions: sourceAsset.dimensions || null,
    hasAudio: sourceAsset.hasAudio === true,
    size: fileSize(sourceAsset.localPathRef),
    preservedMessage: "Исходный файл не будет изменён."
  };
}

function ctaFor({ capabilityId, profile, missingInputs, eligibility, deferred }) {
  const capability = safeLocalWorkspaceCapabilities.find((item) => item.capabilityId === capabilityId);
  const disabledReason = deferred
    ? "Пока недоступно для локального выполнения"
    : missingInputs.length
      ? missingInputs[0].label
      : eligibility && !eligibility.eligible
        ? (eligibility.blockers.map((blocker) => blockerLabels[blocker] || blocker).join(" ") || "Локальное выполнение заблокировано.")
        : null;
  return {
    action: "EXECUTE_LOCAL",
    label: capability?.actionLabel || "Выполнить локально",
    enabled: Boolean(profile && !deferred && missingInputs.length === 0 && eligibility?.eligible === true),
    disabledReason
  };
}

function renderStateFor(result = null, rollbackResult = null, executionState = null) {
  if (rollbackResult?.status === localExecutionRollbackStatuses.completed) return safeLocalWorkspaceStates.rolledBack;
  if (executionState) return executionState;
  if (!result) return safeLocalWorkspaceStates.pending;
  if (result.status === localExecutionStatuses.succeeded) return safeLocalWorkspaceStates.succeeded;
  if (result.status === localExecutionStatuses.failed) return safeLocalWorkspaceStates.failed;
  if (result.status === localExecutionStatuses.verificationFailed) return safeLocalWorkspaceStates.verificationFailed;
  if (result.status === localExecutionStatuses.blocked) return safeLocalWorkspaceStates.blocked;
  return result.status;
}

function presentArtifacts(result = null) {
  return (result?.derivedArtifacts || []).map((artifact) => ({
    artifactId: artifact.artifactId,
    displayName: fileName(artifact.localPathRef),
    artifactType: artifact.artifactType,
    verificationState: artifact.verificationState,
    sourceRelationship: "Original -> Created version",
    createdAt: artifact.createdAt,
    access: {
      action: "OPEN_BOUNDED_ARTIFACT",
      href: `/api/safe-local/artifacts/${encodeURIComponent(result.executionId)}/${encodeURIComponent(artifact.artifactId)}`,
      bounded: true
    }
  }));
}

function presentObservations(result = null) {
  return (result?.observations || []).map((observation) => ({
    capabilityId: observation.capabilityId,
    duration: observation.duration,
    container: observation.container,
    video: observation.video,
    audio: observation.audio,
    dimensions: observation.dimensions,
    frameRate: observation.frameRate,
    fileSize: observation.fileSize,
    verified: observation.verified,
    observedAt: observation.observedAt
  }));
}

function verificationPresentation(result = null) {
  if (!result?.verification) {
    return {
      verified: false,
      label: "Проверка появится после локального выполнения.",
      checks: []
    };
  }
  return {
    verified: result.verification.verified,
    label: result.verification.verified ? "Результат проверен." : "Проверка результата не прошла.",
    checks: result.verification.checks.map((check) => ({
      code: check.code,
      passed: check.passed,
      label: check.code
    }))
  };
}

export function createSafeLocalExecutionWorkspaceViewModel(input = {}) {
  const capabilityId = input.capabilityId || "VIDEO_TRIM";
  const boundary = input.boundary || defaultPhase21PBoundary(input.cwd || process.cwd());
  const capability = safeLocalWorkspaceCapabilities.find((item) => item.capabilityId === capabilityId);
  const profile = getSafeLocalCapabilityProfile(capabilityId);
  const deferred = !profile || deferredSafeLocalCapabilities.some((item) => item.capabilityId === capabilityId);
  const sourceAsset = input.sourceAsset || null;
  const normalizedInputs = {
    ...capabilityInputDefaults[capabilityId],
    ...(input.inputs || {})
  };
  const missingInputs = missingInputsFor(capabilityId, sourceAsset, normalizedInputs);
  const flow = profile ? createFlow(capabilityId, sourceAsset, normalizedInputs) : null;
  const executionPlan = profile && sourceAsset ? createWorkspaceExecutionPlan({
    capabilityId,
    sourceAsset,
    inputs: normalizedInputs,
    boundary
  }) : null;
  const eligibility = flow && executionPlan ? evaluateLocalExecutionEligibility({
    flow,
    executionPlan,
    boundary,
    intentVersion: input.intentVersion || "1.0.0",
    expectedIntentVersion: input.expectedIntentVersion || input.intentVersion || "1.0.0"
  }) : null;
  const cta = ctaFor({ capabilityId, profile, missingInputs, eligibility, deferred });
  const executionState = renderStateFor(input.result, input.rollbackResult, input.executionState);

  return {
    modelType: "SafeLocalExecutionWorkspaceViewModel",
    route: `#execution/${capabilityId}`,
    capabilityId,
    title: capability?.title || capabilityId,
    description: capability?.description || "Пока недоступно для локального выполнения.",
    executionMode: profile?.executionMode || null,
    sourceAsset: sourceAssetView(sourceAsset),
    inputState: {
      values: normalizedInputs,
      complete: missingInputs.length === 0,
      sourcePathInRoute: false
    },
    missingInputs,
    preflightState: flow ? {
      ready: eligibility?.preflightReady === true,
      blockers: flow.rePreflight.preflight.blockers
    } : {
      ready: false,
      blockers: deferred ? [safeLocalExecutionBlockers.notEligibleSafeLocalExecution] : []
    },
    approvalState: flow ? {
      required: flow.approvalDiscovery.approvalRequests.length,
      noApprovalInvented: flow.approvalDiscovery.approvalRequests.length === 0
    } : {
      required: 0,
      noApprovalInvented: true
    },
    eligibility: eligibility ? {
      eligible: eligibility.eligible,
      blockers: eligibility.blockers,
      labels: eligibility.blockers.map((blocker) => blockerLabels[blocker] || blocker)
    } : {
      eligible: false,
      blockers: deferred ? [safeLocalExecutionBlockers.notEligibleSafeLocalExecution] : [],
      labels: deferred ? [blockerLabels[safeLocalExecutionBlockers.notEligibleSafeLocalExecution]] : []
    },
    executionState,
    result: input.result ? {
      executionId: input.result.executionId,
      status: input.result.status,
      userSummary: input.result.userSummary,
      succeededAfterVerification: input.result.status === localExecutionStatuses.succeeded && input.result.verification?.verified === true
    } : null,
    derivedArtifacts: presentArtifacts(input.result),
    observations: presentObservations(input.result),
    verification: verificationPresentation(input.result),
    sourcePreserved: input.result ? input.result.sourcePreserved === true && input.result.verification?.sourceIntegrity?.state === "SOURCE_UNCHANGED" : null,
    rollback: {
      available: input.result?.rollbackAvailable === true && executionState !== safeLocalWorkspaceStates.rolledBack,
      status: input.rollbackResult?.status || input.result?.rollback?.status || (profile?.executionMode === localExecutionModes.readOnly ? localExecutionRollbackStatuses.notApplicable : localExecutionRollbackStatuses.notAvailable),
      label: profile?.executionMode === localExecutionModes.readOnly
        ? "Rollback не нужен для read-only проверки."
        : "Можно удалить только созданную версию. Исходный файл останется без изменений."
    },
    warnings: eligibility?.warnings || [],
    userActions: [
      { action: "SELECT_ASSET", label: "Выбрать файл", enabled: true },
      cta,
      { action: "VIEW_DETAILS", label: "Показать детали", enabled: Boolean(input.result || eligibility) },
      { action: "ROLLBACK_DERIVED", label: "Удалить созданную версию", enabled: Boolean(input.result?.rollbackAvailable) && executionState !== safeLocalWorkspaceStates.rolledBack },
      { action: "START_NEW_TASK", label: "Новая задача", enabled: true }
    ],
    executionPlan,
    flow,
    debugProvenance: input.debug ? {
      boundary,
      profile,
      executionPlan,
      flow,
      result: input.result || null
    } : null,
    externalActionCounters: zeroCounters()
  };
}

export function createSafeLocalExecutionUiAuditArtifact(viewModel = {}, input = {}) {
  return {
    artifactType: "SafeLocalExecutionUiAuditArtifact",
    route: viewModel.route,
    capability: viewModel.capabilityId,
    sourceAssetState: viewModel.sourceAsset,
    inputState: viewModel.inputState,
    preflightState: viewModel.preflightState,
    eligibility: viewModel.eligibility,
    ctaState: viewModel.userActions.find((action) => action.action === "EXECUTE_LOCAL"),
    executionState: viewModel.executionState,
    resultPresentation: viewModel.result,
    verificationPresentation: viewModel.verification,
    sourcePreservationPresentation: viewModel.sourcePreserved,
    rollbackPresentation: viewModel.rollback,
    advancedProvenanceAvailable: Boolean(viewModel.debugProvenance || input.advancedProvenanceAvailable),
    browserErrors: input.browserErrors || { consoleErrors: 0, pageErrors: 0, failedRequests: 0, runtimeExceptions: 0 },
    externalActionCounters: zeroCounters(),
    timestamp: new Date().toISOString()
  };
}

export function executeSafeLocalWorkspaceAction(input = {}) {
  const before = createSafeLocalExecutionWorkspaceViewModel(input);
  if (!before.userActions.find((action) => action.action === "EXECUTE_LOCAL")?.enabled) {
    return {
      ok: false,
      status: safeLocalWorkspaceStates.blocked,
      viewModel: before,
      result: null,
      counters: zeroCounters()
    };
  }
  const gate = authorizeLocalExecution({ eligibility: evaluateLocalExecutionEligibility({
    flow: before.flow,
    executionPlan: before.executionPlan,
    boundary: input.boundary || defaultPhase21PBoundary(input.cwd || process.cwd()),
    intentVersion: input.intentVersion || "1.0.0",
    expectedIntentVersion: input.expectedIntentVersion || input.intentVersion || "1.0.0"
  }) });
  if (gate.decision !== localExecutionGateDecisions.authorized) {
    const blockedResult = runSafeLocalExecution({ gate, executionId: input.executionId || createId("workspace_blocked_execution") });
    return {
      ok: false,
      status: safeLocalWorkspaceStates.blocked,
      viewModel: createSafeLocalExecutionWorkspaceViewModel({ ...input, result: blockedResult }),
      result: blockedResult,
      counters: zeroCounters()
    };
  }
  const result = runSafeLocalExecution({
    gate,
    executionId: input.executionId || createId(`workspace_${input.capabilityId || "local"}_execution`),
    simulateToolFailure: input.simulateToolFailure,
    simulateVerificationFailure: input.simulateVerificationFailure
  });
  const viewModel = createSafeLocalExecutionWorkspaceViewModel({
    ...input,
    result
  });
  return {
    ok: result.status === localExecutionStatuses.succeeded,
    status: viewModel.executionState,
    viewModel,
    result,
    counters: zeroCounters()
  };
}

export function rollbackSafeLocalWorkspaceResult(input = {}) {
  const rollbackResult = rollbackLocalExecution(input.result, input.boundary || defaultPhase21PBoundary(input.cwd || process.cwd()));
  const result = rollbackResult.status === localExecutionRollbackStatuses.completed
    ? {
      ...input.result,
      status: localExecutionStatuses.rolledBack,
      rollbackAvailable: false,
      derivedArtifacts: [],
      rollback: rollbackResult
    }
    : input.result;
  const viewModel = createSafeLocalExecutionWorkspaceViewModel({
    ...input,
    result,
    rollbackResult
  });
  return {
    ok: rollbackResult.status === localExecutionRollbackStatuses.completed || rollbackResult.status === localExecutionRollbackStatuses.notApplicable,
    rollbackResult,
    viewModel,
    result,
    counters: zeroCounters()
  };
}
