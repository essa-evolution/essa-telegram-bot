import crypto from "node:crypto";

import {
  createCreatorFirstDecision,
  createUserEffortProfile,
  creatorFirstDecisionRecommendations,
  creatorFirstPermissionStates,
  creatorFirstUxImplications,
  detectCreatorFirstAntiPattern,
  systemPrincipleIds
} from "../systemPrinciples/index.js";
import {
  capabilityRiskClasses
} from "./capabilityContracts.js";
import { getCapability } from "./capabilityRegistry.js";
import { executionCostPreviewClasses } from "./executionPreview.js";
import {
  approvalTypes as preflightApprovalTypes,
  createExecutionIntentDraft,
  executionIntentClasses,
  inputReadinessStatuses,
  preflightExecutionIntentDraft
} from "./executionIntentDraft.js";

export const phase21MHardGuards = {
  executionEnabled: false,
  toolExecutionEnabled: false,
  providerExecutionEnabled: false,
  paymentEnabled: false,
  publishEnabled: false,
  deployEnabled: false,
  executionPerformed: false,
  capabilityExecutionCount: 0,
  providerCalls: 0,
  externalCalls: 0,
  externalModelCalls: 0,
  paymentActions: 0,
  publishActions: 0,
  deployActions: 0,
  productionMutations: 0,
  disabledReason: "EXECUTION_DISABLED_PHASE_21M"
};

export const executionInputSourceTypes = {
  userProvidedCurrent: "USER_PROVIDED_CURRENT",
  userProvidedPrevious: "USER_PROVIDED_PREVIOUS",
  projectContext: "PROJECT_CONTEXT",
  workspaceContext: "WORKSPACE_CONTEXT",
  systemDerived: "SYSTEM_DERIVED",
  capabilityDefault: "CAPABILITY_DEFAULT",
  safeInference: "SAFE_INFERENCE",
  externalReferenceFuture: "EXTERNAL_REFERENCE_FUTURE",
  unknown: "UNKNOWN"
};

export const executionInputResolutionStates = {
  resolved: "RESOLVED",
  resolvedConfirmationRequired: "RESOLVED_CONFIRMATION_REQUIRED",
  missing: "MISSING",
  invalid: "INVALID",
  ambiguous: "AMBIGUOUS",
  stale: "STALE",
  conflicting: "CONFLICTING",
  unavailable: "UNAVAILABLE"
};

export const executionInputBuckets = {
  known: "KNOWN",
  derivable: "DERIVABLE",
  reusable: "REUSABLE",
  optional: "OPTIONAL",
  missing: "MISSING",
  materialConfirmationRequired: "MATERIAL_CONFIRMATION_REQUIRED"
};

export const executionInputMateriality = {
  nonMaterial: "NON_MATERIAL",
  material: "MATERIAL",
  highImpact: "HIGH_IMPACT"
};

export const executionInputSensitivityClasses = {
  public: "PUBLIC",
  internal: "INTERNAL",
  personal: "PERSONAL",
  confidential: "CONFIDENTIAL",
  secretReferenceOnly: "SECRET_REFERENCE_ONLY"
};

export const executionInputFreshnessStates = {
  current: "CURRENT",
  stale: "STALE",
  unknown: "UNKNOWN"
};

export const executionInputValidationStates = {
  valid: "VALID",
  validWithWarning: "VALID_WITH_WARNING",
  invalid: "INVALID",
  ambiguous: "AMBIGUOUS",
  unsupported: "UNSUPPORTED",
  outOfRange: "OUT_OF_RANGE",
  conflicting: "CONFLICTING",
  staleConfirmationRequired: "STALE_CONFIRMATION_REQUIRED"
};

export const executionInputCompletenessStates = {
  complete: "COMPLETE",
  partial: "PARTIAL",
  blocked: "BLOCKED",
  invalid: "INVALID"
};

export const executionApprovalTypes = {
  userConfirmation: "USER_CONFIRMATION",
  cost: "COST",
  providerActivation: "PROVIDER_ACTIVATION",
  payment: "PAYMENT",
  publish: "PUBLISH",
  deploy: "DEPLOY",
  externalAccount: "EXTERNAL_ACCOUNT",
  destructiveHighImpact: "DESTRUCTIVE_HIGH_IMPACT",
  legalPolicy: "LEGAL_POLICY",
  rightsConsent: "RIGHTS_CONSENT",
  humanReview: "HUMAN_REVIEW"
};

export const executionApprovalStates = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  deferred: "DEFERRED",
  modifiedRequested: "MODIFIED_REQUESTED"
};

export const scopedApprovalTokenStatuses = {
  active: "ACTIVE",
  consumedFuture: "CONSUMED_FUTURE",
  revoked: "REVOKED",
  expired: "EXPIRED",
  invalidated: "INVALIDATED",
  versionMismatch: "VERSION_MISMATCH",
  scopeMismatch: "SCOPE_MISMATCH",
  notYetValid: "NOT_YET_VALID",
  executionDisabled: "EXECUTION_DISABLED"
};

export const executionMaterialChangeMateriality = {
  nonMaterial: "NON_MATERIAL",
  material: "MATERIAL",
  highImpact: "HIGH_IMPACT"
};

export const executionApprovalAntiPatterns = {
  blanketApproval: "BLANKET_APPROVAL",
  ambiguousScope: "AMBIGUOUS_SCOPE",
  hiddenExternalEffect: "HIDDEN_EXTERNAL_EFFECT",
  hiddenCost: "HIDDEN_COST",
  hiddenDestructiveEffect: "HIDDEN_DESTRUCTIVE_EFFECT",
  staleApproval: "STALE_APPROVAL",
  versionMismatch: "VERSION_MISMATCH",
  scopeExpansion: "SCOPE_EXPANSION",
  assumedConsent: "ASSUMED_CONSENT",
  microApprovalOverload: "MICRO_APPROVAL_OVERLOAD",
  approvalWithoutContext: "APPROVAL_WITHOUT_CONTEXT"
};

export const execution21MReadinessStates = {
  inputRequired: "INPUT_REQUIRED",
  inputInvalid: "INPUT_INVALID",
  preflightBlocked: "PREFLIGHT_BLOCKED",
  approvalRequired: "APPROVAL_REQUIRED",
  approvalRejected: "APPROVAL_REJECTED",
  approvalIncomplete: "APPROVAL_INCOMPLETE",
  tokenInvalid: "TOKEN_INVALID",
  tokenScopeMismatch: "TOKEN_SCOPE_MISMATCH",
  tokenVersionMismatch: "TOKEN_VERSION_MISMATCH",
  readyForFutureExecution: "READY_FOR_FUTURE_EXECUTION",
  executionDisabledPhase21M: "EXECUTION_DISABLED_PHASE_21M"
};

function createId(prefix, seed = "") {
  const hash = crypto.createHash("sha256").update(`${prefix}:${seed}:${Date.now()}`).digest("hex").slice(0, 10);
  return `${prefix}_${hash}`;
}

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sortObject(value)))
    .digest("hex");
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortObject(value[key]);
    return acc;
  }, {});
}

function redactIfSensitive(value, sensitivityClass) {
  if (sensitivityClass === executionInputSensitivityClasses.secretReferenceOnly) return "[SECRET_REFERENCE]";
  return value;
}

function materialityForRequirement(requirement = {}) {
  const key = `${requirement.requirementId || ""} ${requirement.label || ""} ${requirement.validationRule || ""}`.toLowerCase();
  if (/budget|payment|credential|rights|consent|legal|account|approval|voice/.test(key)) {
    return executionInputMateriality.highImpact;
  }
  if (/brand|audience|campaign|objective|source|public|domain|cta|goal|author|title/.test(key)) {
    return executionInputMateriality.material;
  }
  return executionInputMateriality.nonMaterial;
}

function sensitivityForRequirement(requirement = {}) {
  const privacy = String(requirement.privacyClass || "").toUpperCase();
  const key = `${requirement.requirementId || ""} ${requirement.label || ""}`.toLowerCase();
  if (/SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL/.test(privacy) || /api[_ -]?key|secret|password|token|credential/.test(key)) {
    return executionInputSensitivityClasses.secretReferenceOnly;
  }
  if (/LEGAL|BIOMETRIC|CONFIDENTIAL/.test(privacy)) return executionInputSensitivityClasses.confidential;
  if (/USER|PERSONAL/.test(privacy)) return executionInputSensitivityClasses.personal;
  if (/PUBLIC/.test(privacy)) return executionInputSensitivityClasses.public;
  return executionInputSensitivityClasses.internal;
}

function normalizeValue(rawValue, requirement = {}) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return { normalizedValue: rawValue, warnings: [] };
  const text = String(rawValue).trim();
  const key = String(requirement.requirementId || "").toLowerCase();

  const money = text.match(/^(\d+(?:[.,]\d+)?)\s*(usd|eur|gel|rub|₾|\$|€)?$/i);
  if (/budget|price|amount|cost/.test(key) && money) {
    const currencyMap = { "$": "USD", "€": "EUR", "₾": "GEL" };
    const currency = money[2] ? (currencyMap[money[2]] || money[2].toUpperCase()) : null;
    return {
      normalizedValue: {
        amount: Number(money[1].replace(",", ".")),
        currency
      },
      warnings: currency ? [] : ["CURRENCY_MISSING"]
    };
  }

  const languageMap = {
    русский: "ru",
    russian: "ru",
    english: "en",
    английский: "en",
    georgian: "ka",
    грузинский: "ka"
  };
  if (/language|язык/.test(key) && languageMap[text.toLowerCase()]) {
    return { normalizedValue: languageMap[text.toLowerCase()], warnings: [] };
  }

  const ratio = text.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (/ratio|aspect|format|target_format/.test(key) && ratio) {
    return {
      normalizedValue: {
        width: Number(ratio[1]),
        height: Number(ratio[2]),
        ratio: `${Number(ratio[1])}:${Number(ratio[2])}`
      },
      warnings: []
    };
  }

  const timeRange = text.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (/time|range/.test(key) && timeRange) {
    const startSeconds = Number(timeRange[1]) * 60 + Number(timeRange[2]);
    const endSeconds = Number(timeRange[3]) * 60 + Number(timeRange[4]);
    return {
      normalizedValue: {
        startSeconds,
        endSeconds,
        raw: text
      },
      warnings: []
    };
  }

  if (/date|deadline|publish_date/.test(key) && /^tomorrow$/i.test(text)) {
    return {
      normalizedValue: null,
      warnings: ["RELATIVE_DATE_REQUIRES_TIMEZONE_AWARE_CONFIRMATION"]
    };
  }

  return { normalizedValue: rawValue, warnings: [] };
}

export function validateExecutionInput(input = {}, requirement = {}, context = {}) {
  const errors = [];
  const warnings = [];
  const materiality = input.materiality || materialityForRequirement(requirement);
  const { normalizedValue, warnings: normalizationWarnings } = normalizeValue(
    input.rawValue ?? input.value ?? input.selectedValue,
    requirement
  );
  warnings.push(...normalizationWarnings);

  const value = normalizedValue ?? input.rawValue ?? input.value ?? input.selectedValue;
  if (requirement.required !== false && (value === undefined || value === null || value === "")) {
    errors.push("REQUIRED_VALUE_MISSING");
  }

  if (requirement.allowedRange && typeof value === "number") {
    if (value < requirement.allowedRange.min || value > requirement.allowedRange.max) errors.push("OUT_OF_RANGE");
  }

  if (requirement.choices?.length && value && !requirement.choices.includes(value)) {
    errors.push("ENUM_VALUE_UNSUPPORTED");
  }

  if (requirement.requirementId === "time_range" && value?.startSeconds !== undefined) {
    if (value.startSeconds >= value.endSeconds) errors.push("TIME_RANGE_START_MUST_BE_BEFORE_END");
    if (context.mediaDurationSeconds && value.endSeconds > context.mediaDurationSeconds) errors.push("TIME_RANGE_EXCEEDS_MEDIA_DURATION");
  }

  if (requirement.requirementId === "target_format" && value?.ratio === "9:16" && context.landscapeOnly === true) {
    errors.push("TARGET_FORMAT_CONFLICTS_WITH_LANDSCAPE_ONLY");
  }

  if (materiality === executionInputMateriality.highImpact && input.sourceType === executionInputSourceTypes.safeInference) {
    errors.push("SAFE_INFERENCE_CANNOT_REPLACE_HIGH_IMPACT_AUTHORITY");
  }

  if (input.freshness === executionInputFreshnessStates.stale && materiality !== executionInputMateriality.nonMaterial) {
    return {
      modelType: "ExecutionInputValidationResult",
      inputKey: input.inputKey || requirement.requirementId,
      status: executionInputValidationStates.staleConfirmationRequired,
      normalizedValue: redactIfSensitive(normalizedValue, input.sensitivityClass),
      errors,
      warnings,
      materiality,
      requiresUserCorrection: errors.length > 0,
      requiresConfirmation: true
    };
  }

  let status = executionInputValidationStates.valid;
  if (errors.includes("OUT_OF_RANGE")) status = executionInputValidationStates.outOfRange;
  else if (errors.some((item) => /CONFLICT/.test(item))) status = executionInputValidationStates.conflicting;
  else if (errors.length) status = executionInputValidationStates.invalid;
  else if (warnings.some((item) => /AMBIGUOUS|RELATIVE_DATE|CURRENCY_MISSING/.test(item))) {
    status = executionInputValidationStates.ambiguous;
  } else if (warnings.length) {
    status = executionInputValidationStates.validWithWarning;
  }

  return {
    modelType: "ExecutionInputValidationResult",
    inputKey: input.inputKey || requirement.requirementId,
    status,
    normalizedValue: redactIfSensitive(normalizedValue, input.sensitivityClass),
    errors,
    warnings,
    materiality,
    requiresUserCorrection: [
      executionInputValidationStates.invalid,
      executionInputValidationStates.outOfRange,
      executionInputValidationStates.conflicting,
      executionInputValidationStates.unsupported
    ].includes(status),
    requiresConfirmation: status === executionInputValidationStates.ambiguous ||
      (materiality === executionInputMateriality.highImpact && input.userConfirmationRequired !== false)
  };
}

function lookupKnownValue(requirement, sources = {}) {
  const key = requirement.requirementId;
  const sourceOrder = [
    [executionInputSourceTypes.userProvidedCurrent, sources.currentUserInputs],
    [executionInputSourceTypes.projectContext, sources.projectContext],
    [executionInputSourceTypes.workspaceContext, sources.workspaceContext],
    [executionInputSourceTypes.userProvidedPrevious, sources.previousUserInputs],
    [executionInputSourceTypes.capabilityDefault, sources.capabilityDefaults]
  ];
  for (const [sourceType, source] of sourceOrder) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      return { value: source[key], sourceType, sourceRef: `${sourceType}:${key}` };
    }
  }
  return null;
}

function deriveSafeValue(requirement, sources = {}) {
  if (requirement.requirementId === "media_duration" && sources.localMetadata?.durationSeconds) {
    return {
      value: sources.localMetadata.durationSeconds,
      sourceType: executionInputSourceTypes.systemDerived,
      sourceRef: "local_metadata:durationSeconds"
    };
  }
  if (requirement.requirementId === "language" && sources.projectContext?.locale) {
    return {
      value: sources.projectContext.locale,
      sourceType: executionInputSourceTypes.safeInference,
      sourceRef: "project_context:locale"
    };
  }
  return null;
}

export function createExecutionInputResolution(input = {}) {
  const sensitivityClass = input.sensitivityClass || executionInputSensitivityClasses.internal;
  return {
    modelType: "ExecutionInputResolution",
    requirementId: input.requirementId || null,
    inputKey: input.inputKey || input.requirementId || null,
    requirementType: input.requirementType || "TEXT",
    status: input.status || executionInputResolutionStates.missing,
    bucket: input.bucket || executionInputBuckets.missing,
    value: redactIfSensitive(input.value, sensitivityClass),
    normalizedValue: redactIfSensitive(input.normalizedValue, sensitivityClass),
    sourceType: input.sourceType || executionInputSourceTypes.unknown,
    sourceRef: input.sourceRef || null,
    confidence: input.confidence ?? 0,
    userConfirmationRequired: input.userConfirmationRequired === true,
    sensitivityClass,
    materiality: input.materiality || executionInputMateriality.nonMaterial,
    freshness: input.freshness || executionInputFreshnessStates.current,
    validationState: input.validationState || executionInputValidationStates.valid,
    reason: input.reason || "INPUT_RESOLUTION"
  };
}

export function resolveExecutionInputs(draftInput = {}, sources = {}, options = {}) {
  const draft = draftInput.inputSnapshot ? draftInput : createExecutionIntentDraft(draftInput, options);
  const resolutions = draft.inputSnapshot.map((requirement) => {
    const materiality = materialityForRequirement(requirement);
    const sensitivityClass = sensitivityForRequirement(requirement);
    const known = lookupKnownValue(requirement, sources);
    const derived = known ? null : deriveSafeValue(requirement, sources);
    const candidate = known || derived;
    const projectValue = sources.projectContext?.[requirement.requirementId];
    const currentValue = sources.currentUserInputs?.[requirement.requirementId];
    const conflicting = projectValue !== undefined && currentValue !== undefined && projectValue !== currentValue;

    if (requirement.required === false && !candidate) {
      return createExecutionInputResolution({
        requirementId: requirement.requirementId,
        inputKey: requirement.requirementId,
        requirementType: requirement.type,
        status: executionInputResolutionStates.resolved,
        bucket: executionInputBuckets.optional,
        sourceType: executionInputSourceTypes.unknown,
        confidence: 1,
        sensitivityClass,
        materiality,
        reason: "OPTIONAL_INPUT_NOT_FORCED"
      });
    }

    if (conflicting) {
      return createExecutionInputResolution({
        requirementId: requirement.requirementId,
        requirementType: requirement.type,
        status: executionInputResolutionStates.conflicting,
        bucket: executionInputBuckets.materialConfirmationRequired,
        value: { projectContext: projectValue, currentUserInput: currentValue },
        sourceType: executionInputSourceTypes.userProvidedCurrent,
        sourceRef: `conflict:${requirement.requirementId}`,
        confidence: 0.4,
        userConfirmationRequired: true,
        sensitivityClass,
        materiality,
        freshness: executionInputFreshnessStates.current,
        validationState: executionInputValidationStates.conflicting,
        reason: "TRUSTED_SOURCES_DISAGREE"
      });
    }

    if (!candidate) {
      return createExecutionInputResolution({
        requirementId: requirement.requirementId,
        requirementType: requirement.type,
        status: executionInputResolutionStates.missing,
        bucket: executionInputBuckets.missing,
        confidence: 0,
        sensitivityClass,
        materiality,
        validationState: executionInputValidationStates.invalid,
        reason: "TRULY_MISSING_AFTER_RESOLVE_BEFORE_ASK"
      });
    }

    const freshness = sources.staleInputKeys?.includes(requirement.requirementId)
      ? executionInputFreshnessStates.stale
      : executionInputFreshnessStates.current;
    const validation = validateExecutionInput({
      inputKey: requirement.requirementId,
      rawValue: candidate.value,
      sourceType: candidate.sourceType,
      freshness,
      sensitivityClass,
      materiality,
      userConfirmationRequired: materiality !== executionInputMateriality.nonMaterial
    }, requirement, sources.validationContext || {});
    const confirmationRequired = validation.requiresConfirmation ||
      (freshness === executionInputFreshnessStates.stale && materiality !== executionInputMateriality.nonMaterial);
    const status = validation.status === executionInputValidationStates.valid ||
      validation.status === executionInputValidationStates.validWithWarning
      ? (confirmationRequired ? executionInputResolutionStates.resolvedConfirmationRequired : executionInputResolutionStates.resolved)
      : validation.status === executionInputValidationStates.ambiguous
      ? executionInputResolutionStates.ambiguous
      : validation.status === executionInputValidationStates.staleConfirmationRequired
      ? executionInputResolutionStates.stale
      : executionInputResolutionStates.invalid;

    return createExecutionInputResolution({
      requirementId: requirement.requirementId,
      requirementType: requirement.type,
      status,
      bucket: candidate.sourceType === executionInputSourceTypes.systemDerived
        ? executionInputBuckets.derivable
        : candidate.sourceType === executionInputSourceTypes.userProvidedPrevious
        ? executionInputBuckets.reusable
        : confirmationRequired
        ? executionInputBuckets.materialConfirmationRequired
        : executionInputBuckets.known,
      value: candidate.value,
      normalizedValue: validation.normalizedValue,
      sourceType: candidate.sourceType,
      sourceRef: candidate.sourceRef,
      confidence: confirmationRequired ? 0.75 : 0.95,
      userConfirmationRequired: confirmationRequired,
      sensitivityClass,
      materiality,
      freshness,
      validationState: validation.status,
      reason: candidate.sourceType === executionInputSourceTypes.safeInference && materiality !== executionInputMateriality.nonMaterial
        ? "SAFE_INFERENCE_REQUIRES_MATERIAL_CONFIRMATION"
        : "RESOLVED_BEFORE_ASK"
    });
  });

  return {
    modelType: "ExecutionInputResolutionSet",
    intentId: draft.intentId,
    capabilityId: draft.primaryCapabilityId,
    known: resolutions.filter((item) => item.bucket === executionInputBuckets.known),
    derivable: resolutions.filter((item) => item.bucket === executionInputBuckets.derivable),
    reusable: resolutions.filter((item) => item.bucket === executionInputBuckets.reusable),
    optional: resolutions.filter((item) => item.bucket === executionInputBuckets.optional),
    missing: resolutions.filter((item) => item.status === executionInputResolutionStates.missing),
    materialConfirmationRequired: resolutions.filter((item) => item.userConfirmationRequired),
    invalid: resolutions.filter((item) => item.status === executionInputResolutionStates.invalid),
    conflicting: resolutions.filter((item) => item.status === executionInputResolutionStates.conflicting),
    resolutions,
    creatorFirstDecision: createCreatorFirstDecision({
      action: "resolve_execution_inputs",
      canSystemPrepare: true,
      canSystemExecute: false,
      humanDecisionRequired: resolutions.some((item) => item.userConfirmationRequired),
      approvalRequired: false,
      permissionState: creatorFirstPermissionStates.allowed,
      recommendedInteraction: creatorFirstDecisionRecommendations.systemPrepare,
      reason: "RESOLVE_BEFORE_ASK"
    })
  };
}

function questionPrompt(requirement = {}, resolution = {}) {
  if (resolution.status === executionInputResolutionStates.resolvedConfirmationRequired ||
    resolution.status === executionInputResolutionStates.stale ||
    resolution.status === executionInputResolutionStates.conflicting) {
    return `Для "${requirement.label || requirement.requirementId}" уже есть значение. Подтвердить или изменить?`;
  }
  return requirement.label ? `Укажите: ${requirement.label}` : `Укажите значение для ${requirement.requirementId}`;
}

export function createExecutionInputQuestion(requirement = {}, resolution = {}) {
  return {
    modelType: "ExecutionInputQuestion",
    questionId: createId("input_question", `${requirement.requirementId}:${resolution.status}`),
    requirementId: requirement.requirementId,
    inputKey: requirement.requirementId,
    prompt: questionPrompt(requirement, resolution),
    expectedType: requirement.type || "TEXT",
    required: requirement.required !== false,
    choices: requirement.choices || null,
    allowedRange: requirement.allowedRange || null,
    formatHint: requirement.acceptedFormats?.length ? requirement.acceptedFormats.join(", ") : requirement.validationRule || null,
    whyNeeded: requirement.description || requirement.validationRule || "Нужно для будущего запуска.",
    consequenceIfMissing: requirement.required === false ? "Можно пропустить." : "Preflight останется заблокированным.",
    sensitivityClass: resolution.sensitivityClass || sensitivityForRequirement(requirement),
    confirmationOnly: resolution.userConfirmationRequired === true && resolution.status !== executionInputResolutionStates.missing,
    canSkip: requirement.required === false,
    defaultValue: resolution.userConfirmationRequired ? resolution.value : undefined,
    defaultSource: resolution.userConfirmationRequired ? resolution.sourceType : undefined
  };
}

export function createExecutionInputCollectionRequest(draftInput = {}, sources = {}, options = {}) {
  const draft = draftInput.inputSnapshot ? draftInput : createExecutionIntentDraft(draftInput, options);
  const resolutionSet = resolveExecutionInputs(draft, sources, options);
  const questions = resolutionSet.resolutions
    .filter((resolution) => [
      executionInputResolutionStates.missing,
      executionInputResolutionStates.ambiguous,
      executionInputResolutionStates.stale,
      executionInputResolutionStates.conflicting,
      executionInputResolutionStates.resolvedConfirmationRequired,
      executionInputResolutionStates.invalid
    ].includes(resolution.status))
    .map((resolution) => {
      const requirement = draft.inputSnapshot.find((item) => item.requirementId === resolution.requirementId) || {};
      return createExecutionInputQuestion(requirement, resolution);
    });
  const alreadyResolvedInputs = resolutionSet.resolutions.filter((resolution) =>
    resolution.status === executionInputResolutionStates.resolved
  );
  const systemResolvedInputs = alreadyResolvedInputs.filter((resolution) =>
    resolution.bucket !== executionInputBuckets.optional
  );
  const effortProfile = createUserEffortProfile({
    task: draft.primaryCapabilityId,
    requiredHumanInputs: questions.filter((item) => !item.confirmationOnly).map((item) => item.inputKey),
    requiredHumanDecisions: questions.filter((item) => item.confirmationOnly).map((item) => item.inputKey),
    systemPreparations: systemResolvedInputs.map((item) => item.inputKey),
    avoidableManualSteps: []
  });

  return {
    modelType: "ExecutionInputCollectionRequest",
    intentId: draft.intentId,
    capabilityId: draft.primaryCapabilityId,
    requiredInputs: draft.inputSnapshot.filter((item) => item.required !== false),
    optionalInputs: draft.inputSnapshot.filter((item) => item.required === false),
    alreadyResolvedInputs,
    questions,
    questionBatching: {
      batchSimpleInputs: true,
      oneQuestionPerTurnRequired: false,
      groupedQuestionCount: questions.length
    },
    reasonForEachQuestion: Object.fromEntries(questions.map((question) => [
      question.questionId,
      question.confirmationOnly ? "CONFIRM_MATERIAL_OR_STALE_OR_CONFLICTING_VALUE" : "TRULY_MISSING_INPUT"
    ])),
    estimatedUserEffort: {
      requiredHumanInputs: effortProfile.requiredHumanInputs.length,
      requiredHumanDecisions: effortProfile.requiredHumanDecisions.length,
      systemResolvedInputs: systemResolvedInputs.length,
      avoidableManualSteps: effortProfile.avoidableManualSteps.length
    },
    creatorFirstSummary: {
      principleId: systemPrincipleIds.creatorFirst,
      policy: creatorFirstUxImplications.doNotOffloadSystemWorkToUser,
      resolvedBeforeAsk: true,
      onlyTrulyMissingQuestions: true
    },
    resolutionSet
  };
}

export function createExecutionInputAnswer(input = {}) {
  return {
    modelType: "ExecutionInputAnswer",
    questionId: input.questionId || null,
    requirementId: input.requirementId || null,
    inputKey: input.inputKey || input.requirementId || null,
    rawValue: input.sensitivityClass === executionInputSensitivityClasses.secretReferenceOnly ? undefined : input.rawValue,
    selectedValue: input.selectedValue,
    userProvided: input.userProvided !== false,
    timestamp: input.timestamp || "2026-08-29T00:00:00.000Z",
    provenance: input.provenance || executionInputSourceTypes.userProvidedCurrent,
    confirmationState: input.confirmationState || "CONFIRMED"
  };
}

export function createExecutionInputDraft(draftInput = {}, sources = {}, answers = [], options = {}) {
  const draft = draftInput.inputSnapshot ? draftInput : createExecutionIntentDraft(draftInput, options);
  const answeredSources = {
    ...sources,
    currentUserInputs: {
      ...(sources.currentUserInputs || {}),
      ...Object.fromEntries(answers.map((answer) => [answer.requirementId || answer.inputKey, answer.selectedValue ?? answer.rawValue]))
    }
  };
  const resolutionSet = resolveExecutionInputs(draft, answeredSources, options);
  const invalidInputs = resolutionSet.resolutions.filter((item) => [
    executionInputResolutionStates.invalid,
    executionInputResolutionStates.ambiguous
  ].includes(item.status));
  const missingInputs = resolutionSet.resolutions.filter((item) => item.status === executionInputResolutionStates.missing);
  const conflictingInputs = resolutionSet.conflicting;
  const completeness = invalidInputs.length
    ? executionInputCompletenessStates.invalid
    : conflictingInputs.length
    ? executionInputCompletenessStates.blocked
    : missingInputs.length || resolutionSet.materialConfirmationRequired.length
    ? executionInputCompletenessStates.partial
    : executionInputCompletenessStates.complete;

  return {
    modelType: "ExecutionInputDraft",
    inputDraftId: options.inputDraftId || createId("execution_input_draft", draft.intentId),
    intentId: draft.intentId,
    intentVersion: options.intentVersion || draft.version || "1.0.0",
    capabilityId: draft.primaryCapabilityId,
    resolvedInputs: resolutionSet.resolutions.filter((item) => [
      executionInputResolutionStates.resolved,
      executionInputResolutionStates.resolvedConfirmationRequired
    ].includes(item.status)),
    missingInputs,
    invalidInputs,
    conflictingInputs,
    validationSummary: {
      valid: resolutionSet.resolutions.filter((item) => item.validationState === executionInputValidationStates.valid).length,
      invalid: invalidInputs.length,
      confirmationRequired: resolutionSet.materialConfirmationRequired.length,
      conflicts: conflictingInputs.length
    },
    completeness,
    version: "1.0.0",
    createdAt: options.createdAt || "2026-08-29T00:00:00.000Z",
    updatedAt: options.updatedAt || "2026-08-29T00:00:00.000Z",
    resolutionSet,
    privacy: {
      dataMinimized: true,
      secretsStored: false,
      rawProjectContextCopied: false
    }
  };
}

export function rePreflightExecutionIntentDraft(draftInput = {}, inputDraft = {}, options = {}) {
  const draft = draftInput.inputSnapshot ? draftInput : createExecutionIntentDraft(draftInput, options);
  const rawPreflight = preflightExecutionIntentDraft(draft, options);
  const inputComplete = inputDraft.completeness === executionInputCompletenessStates.complete;
  const preflight = inputComplete
    ? {
      ...rawPreflight,
      blockers: rawPreflight.blockers.filter((blocker) => blocker !== "REQUIRED_INPUTS_MISSING"),
      requiredInputs: []
    }
    : rawPreflight;
  return {
    modelType: "ExecutionInputRePreflightResult",
    intentId: draft.intentId,
    inputDraftId: inputDraft.inputDraftId,
    usedExistingPreflightEngine: true,
    preflight,
    rawPreflight,
    inputCompleteness: inputDraft.completeness,
    ...phase21MHardGuards
  };
}

function mapPreflightApprovalType(type) {
  const map = {
    [preflightApprovalTypes.userInputApproval]: executionApprovalTypes.userConfirmation,
    [preflightApprovalTypes.costApproval]: executionApprovalTypes.cost,
    [preflightApprovalTypes.providerActivationApproval]: executionApprovalTypes.providerActivation,
    [preflightApprovalTypes.paymentApproval]: executionApprovalTypes.payment,
    [preflightApprovalTypes.publishApproval]: executionApprovalTypes.publish,
    [preflightApprovalTypes.destructiveActionApproval]: executionApprovalTypes.destructiveHighImpact,
    [preflightApprovalTypes.externalAccountApproval]: executionApprovalTypes.externalAccount,
    [preflightApprovalTypes.legalOrPolicyReview]: executionApprovalTypes.legalPolicy,
    [preflightApprovalTypes.humanReview]: executionApprovalTypes.humanReview
  };
  return map[type] || type;
}

function riskForApproval(approvalType, capability = {}) {
  if (approvalType === executionApprovalTypes.payment || approvalType === executionApprovalTypes.cost) return "FINANCIAL";
  if (approvalType === executionApprovalTypes.publish) return capabilityRiskClasses.publish;
  if (approvalType === executionApprovalTypes.destructiveHighImpact) return capabilityRiskClasses.destructive;
  if (approvalType === executionApprovalTypes.legalPolicy || approvalType === executionApprovalTypes.rightsConsent) return "LEGAL";
  return capability.riskClass || capabilityRiskClasses.low;
}

export function createExecutionApprovalRequest(input = {}) {
  return {
    modelType: "ExecutionApprovalRequest",
    approvalRequestId: input.approvalRequestId || createId("approval_request", `${input.intentId}:${input.approvalType}`),
    intentId: input.intentId,
    intentVersion: input.intentVersion || "1.0.0",
    capabilityId: input.capabilityId,
    approvalType: input.approvalType,
    scope: input.scope || {},
    reason: input.reason || "DERIVED_FROM_EXISTING_PREFLIGHT",
    actionSummary: input.actionSummary || "",
    consequenceSummary: input.consequenceSummary || "",
    costClass: input.costClass || null,
    riskClass: input.riskClass || capabilityRiskClasses.low,
    reversibility: input.reversibility || "UNKNOWN",
    externalEffect: input.externalEffect || "NONE",
    providerRef: input.providerRef || null,
    accountRef: input.accountRef || null,
    resourceRefs: [...(input.resourceRefs || [])],
    expiresAt: input.expiresAt || null,
    required: input.required !== false,
    approvalState: input.approvalState || executionApprovalStates.pending,
    presentation: {
      whatWillHappen: input.whatWillHappen || input.actionSummary || "ESSA will prepare this future action only.",
      whyApprovalIsNeeded: input.whyApprovalIsNeeded || input.reason || "Policy requires a material human decision.",
      externalEffect: input.externalEffect || "NONE",
      costClass: input.costClass || null,
      risk: input.riskClass || capabilityRiskClasses.low,
      reversibility: input.reversibility || "UNKNOWN",
      scope: input.scope || {},
      whatWillNotBeAuthorized: input.whatWillNotBeAuthorized || [
        "unrelated actions",
        "future blanket authority",
        "payment/publish/deploy/external mutation in Phase 21M"
      ]
    }
  };
}

export function discoverExecutionApprovalRequests(draftInput = {}, preflightInput = null, options = {}) {
  const draft = draftInput.inputSnapshot ? draftInput : createExecutionIntentDraft(draftInput, options);
  const preflight = preflightInput || preflightExecutionIntentDraft(draft, options);
  const capability = getCapability(draft.primaryCapabilityId) || {};
  const meaningfulPreflightBlockers = (preflight.blockers || []).filter((blocker) =>
    !["EXECUTION_DISABLED_PHASE_21K"].includes(blocker)
  );
  const preflightApprovals = (preflight.requiredApprovals || draft.approvals || []).filter((approval) => {
    if (approval.type === preflightApprovalTypes.userInputApproval && (preflight.requiredInputs || []).length === 0) {
      return false;
    }
    if (
      approval.type === preflightApprovalTypes.humanReview &&
      (preflight.requiredInputs || []).length === 0 &&
      meaningfulPreflightBlockers.length === 0 &&
      capability.riskClass === capabilityRiskClasses.low &&
      capability.externalProviderPossible !== true
    ) {
      return false;
    }
    return true;
  });
  const approvals = preflightApprovals.map((approval) => {
    const approvalType = mapPreflightApprovalType(approval.type);
    return createExecutionApprovalRequest({
      intentId: draft.intentId,
      intentVersion: options.intentVersion || draft.version || "1.0.0",
      capabilityId: draft.primaryCapabilityId,
      approvalType,
      scope: {
        action: draft.primaryCapabilityId,
        capabilityId: draft.primaryCapabilityId,
        maxCostClass: draft.costClass,
        intentVersion: options.intentVersion || draft.version || "1.0.0",
        resourceRefs: options.resourceRefs || []
      },
      reason: "DERIVED_FROM_EXISTING_PREFLIGHT",
      actionSummary: `Future ${draft.primaryCapabilityId} authorization review`,
      consequenceSummary: "This records local approval metadata only; it does not execute.",
      costClass: draft.costClass,
      riskClass: riskForApproval(approvalType, capability),
      reversibility: draft.rollbackPlan?.length ? "ROLLBACK_PLAN_PRESENT" : "UNKNOWN",
      externalEffect: [
        executionApprovalTypes.providerActivation,
        executionApprovalTypes.payment,
        executionApprovalTypes.publish,
        executionApprovalTypes.deploy,
        executionApprovalTypes.externalAccount
      ].includes(approvalType) ? "FUTURE_EXTERNAL_EFFECT_REQUIRES_GATE" : "NO_PHASE_21M_EXTERNAL_EFFECT",
      providerRef: options.providerRef || null,
      accountRef: options.accountRef || null,
      resourceRefs: options.resourceRefs || []
    });
  });

  return {
    modelType: "ExecutionApprovalDiscovery",
    intentId: draft.intentId,
    source: "EXISTING_PREFLIGHT",
    arbitraryApprovalsCreated: false,
    approvalRequests: approvals,
    dependencies: createApprovalDependencies(approvals),
    groupedPresentation: groupApprovalRequests(approvals),
    preflight
  };
}

export function createApprovalDependencies(approvalRequests = []) {
  const has = (type) => approvalRequests.some((request) => request.approvalType === type);
  const dependencies = [];
  if (has(executionApprovalTypes.payment) && has(executionApprovalTypes.providerActivation)) {
    dependencies.push({
      before: executionApprovalTypes.providerActivation,
      after: executionApprovalTypes.payment,
      reason: "PROVIDER_ACTIVATION_BEFORE_PAID_PROVIDER_EXECUTION"
    });
  }
  if (has(executionApprovalTypes.publish) && has(executionApprovalTypes.rightsConsent)) {
    dependencies.push({
      before: executionApprovalTypes.rightsConsent,
      after: executionApprovalTypes.publish,
      reason: "RIGHTS_CONSENT_BEFORE_PUBLISH"
    });
  }
  if (has(executionApprovalTypes.publish) && has(executionApprovalTypes.legalPolicy)) {
    dependencies.push({
      before: executionApprovalTypes.legalPolicy,
      after: executionApprovalTypes.publish,
      reason: "LEGAL_POLICY_REVIEW_BEFORE_PUBLISH"
    });
  }
  return dependencies;
}

export function groupApprovalRequests(approvalRequests = []) {
  return {
    modelType: "ExecutionApprovalGroupedPresentation",
    groupId: createId("approval_group", approvalRequests.map((item) => item.approvalType).join(":")),
    approvalRequestIds: approvalRequests.map((item) => item.approvalRequestId),
    canPresentTogether: approvalRequests.length > 1,
    tokensRemainIndividuallyTraceable: true,
    antiPatternAvoided: executionApprovalAntiPatterns.microApprovalOverload
  };
}

export function createExecutionApprovalDecision(input = {}) {
  return {
    modelType: "ExecutionApprovalDecision",
    approvalRequestId: input.approvalRequestId,
    decision: input.decision || executionApprovalStates.deferred,
    userActorRef: input.userActorRef || "human_user",
    timestamp: input.timestamp || "2026-08-29T00:00:00.000Z",
    reason: input.reason || null,
    constraints: input.constraints || {},
    acknowledgedScope: input.acknowledgedScope || {},
    intentVersion: input.intentVersion || "1.0.0",
    assumedConsent: false
  };
}

export function createAuthorizationFingerprint(input = {}) {
  return stableHash({
    intentId: input.intentId,
    intentVersion: input.intentVersion,
    capabilityId: input.capabilityId,
    approvalType: input.approvalType,
    scope: input.scope,
    materialParameters: input.materialParameters || {},
    costClass: input.costClass || null,
    externalEffect: input.externalEffect || null
  });
}

export function issueScopedApprovalToken(approvalRequest = {}, decision = {}, options = {}) {
  if (decision.decision !== executionApprovalStates.approved) return null;
  const scope = {
    ...(approvalRequest.scope || {}),
    ...(decision.constraints || {})
  };
  const authorizationFingerprint = createAuthorizationFingerprint({
    intentId: approvalRequest.intentId,
    intentVersion: approvalRequest.intentVersion,
    capabilityId: approvalRequest.capabilityId,
    approvalType: approvalRequest.approvalType,
    scope,
    materialParameters: options.materialParameters || {},
    costClass: approvalRequest.costClass,
    externalEffect: approvalRequest.externalEffect
  });
  return {
    modelType: "ScopedApprovalToken",
    tokenId: options.tokenId || createId("scoped_approval_token", authorizationFingerprint),
    approvalRequestId: approvalRequest.approvalRequestId,
    intentId: approvalRequest.intentId,
    intentVersion: approvalRequest.intentVersion,
    capabilityId: approvalRequest.capabilityId,
    approvalType: approvalRequest.approvalType,
    scope,
    constraints: decision.constraints || {},
    issuedTo: options.issuedTo || "future_execution_path",
    issuedBy: decision.userActorRef,
    issuedAt: decision.timestamp,
    expiresAt: approvalRequest.expiresAt || options.expiresAt || null,
    singleUse: options.singleUse !== false,
    revocable: true,
    status: scopedApprovalTokenStatuses.active,
    authorizationFingerprint,
    phase21MOnly: true,
    executionAuthorityNow: false
  };
}

export function revokeApprovalToken(token = {}, reason = null) {
  return {
    ...token,
    status: scopedApprovalTokenStatuses.revoked,
    revokedAt: "2026-08-29T00:00:00.000Z",
    revocationReason: reason || null,
    executionAuthorityNow: false
  };
}

export function createExecutionMaterialChange(input = {}) {
  return {
    modelType: "ExecutionMaterialChange",
    field: input.field,
    before: input.before,
    after: input.after,
    materiality: input.materiality || executionMaterialChangeMateriality.nonMaterial,
    approvalImpact: input.approvalImpact || "NONE",
    reason: input.reason || "MATERIAL_CHANGE_CHECK"
  };
}

export function detectMaterialChanges(before = {}, after = {}) {
  const materialFields = new Set([
    "budget",
    "maxCostClass",
    "targetAccount",
    "publishDestination",
    "providerRef",
    "destructiveScope",
    "legalScope",
    "contentAssetId",
    "paymentAmount",
    "campaignObjective"
  ]);
  const nonMaterialFields = new Set(["displayLabel", "localPresentationTitle", "outputFilename"]);
  return Object.keys({ ...before, ...after })
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => {
      const material = materialFields.has(field);
      const nonMaterial = nonMaterialFields.has(field);
      return createExecutionMaterialChange({
        field,
        before: before[field],
        after: after[field],
        materiality: material
          ? executionMaterialChangeMateriality.material
          : nonMaterial
          ? executionMaterialChangeMateriality.nonMaterial
          : executionMaterialChangeMateriality.material,
        approvalImpact: material ? "REAPPROVAL_REQUIRED" : "MAY_PRESERVE_APPROVAL",
        reason: material ? "MATERIAL_AUTHORIZATION_CONTEXT_CHANGED" : "PRESENTATION_ONLY_OR_NON_MATERIAL_CHANGE"
      });
    });
}

export function verifyScopedApprovalToken(token = {}, context = {}) {
  if (!token) return { status: scopedApprovalTokenStatuses.invalidated, valid: false, reason: "TOKEN_MISSING" };
  if (token.status !== scopedApprovalTokenStatuses.active) return { status: token.status, valid: false, reason: "TOKEN_NOT_ACTIVE" };
  if (token.expiresAt && new Date(token.expiresAt).getTime() < new Date(context.now || "2026-08-29T00:00:00.000Z").getTime()) {
    return { status: scopedApprovalTokenStatuses.expired, valid: false, reason: "TOKEN_EXPIRED" };
  }
  if (context.intentId && token.intentId !== context.intentId) {
    return { status: scopedApprovalTokenStatuses.scopeMismatch, valid: false, reason: "INTENT_MISMATCH" };
  }
  if (context.intentVersion && token.intentVersion !== context.intentVersion) {
    return { status: scopedApprovalTokenStatuses.versionMismatch, valid: false, reason: "VERSION_MISMATCH" };
  }
  if (context.capabilityId && token.capabilityId !== context.capabilityId) {
    return { status: scopedApprovalTokenStatuses.scopeMismatch, valid: false, reason: "CAPABILITY_MISMATCH" };
  }
  const expectedFingerprint = createAuthorizationFingerprint({
    intentId: token.intentId,
    intentVersion: token.intentVersion,
    capabilityId: token.capabilityId,
    approvalType: token.approvalType,
    scope: context.scope || token.scope,
    materialParameters: context.materialParameters || {},
    costClass: context.costClass || context.scope?.maxCostClass || token.scope?.maxCostClass || null,
    externalEffect: context.externalEffect || null
  });
  if (context.authorizationFingerprint && context.authorizationFingerprint !== token.authorizationFingerprint) {
    return { status: scopedApprovalTokenStatuses.invalidated, valid: false, reason: "FINGERPRINT_MISMATCH" };
  }
  if (context.expectedFingerprint && context.expectedFingerprint !== token.authorizationFingerprint) {
    return { status: scopedApprovalTokenStatuses.invalidated, valid: false, reason: "FINGERPRINT_MISMATCH" };
  }
  if (context.scope) {
    const scopeMismatch = Object.entries(context.scope).some(([key, value]) =>
      token.scope?.[key] !== undefined && JSON.stringify(token.scope[key]) !== JSON.stringify(value)
    );
    if (scopeMismatch) return { status: scopedApprovalTokenStatuses.scopeMismatch, valid: false, reason: "SCOPE_MISMATCH" };
  }
  return {
    status: scopedApprovalTokenStatuses.active,
    valid: true,
    reason: "TOKEN_VALID_FOR_FUTURE_EXECUTION_ONLY",
    expectedFingerprint,
    executionEnabled: false,
    executionPerformed: false
  };
}

export function detectApprovalAntiPattern(input = {}) {
  if (input.scope?.allFutureActions === true || input.scope?.unbounded === true) return executionApprovalAntiPatterns.blanketApproval;
  if (!input.scope || Object.keys(input.scope).length === 0) return executionApprovalAntiPatterns.ambiguousScope;
  if (input.externalEffect && input.externalEffect !== "NONE" && input.externalEffectDisclosed !== true) {
    return executionApprovalAntiPatterns.hiddenExternalEffect;
  }
  if (input.costClass && input.costDisclosed !== true) return executionApprovalAntiPatterns.hiddenCost;
  if (input.destructiveEffect === true && input.destructiveEffectDisclosed !== true) return executionApprovalAntiPatterns.hiddenDestructiveEffect;
  if (input.assumedConsent === true) return executionApprovalAntiPatterns.assumedConsent;
  if (input.contextPresented !== true) return executionApprovalAntiPatterns.approvalWithoutContext;
  return null;
}

export function buildExecution21MReadiness(inputDraft = {}, approvalRequests = [], decisions = [], tokens = [], options = {}) {
  const rejected = decisions.some((decision) => decision.decision === executionApprovalStates.rejected);
  const requiredApprovals = approvalRequests.filter((request) => request.required !== false);
  const approvedRequestIds = new Set(decisions
    .filter((decision) => decision.decision === executionApprovalStates.approved)
    .map((decision) => decision.approvalRequestId));
  const missingApprovals = requiredApprovals.filter((request) => !approvedRequestIds.has(request.approvalRequestId));
  const tokenChecks = tokens.map((token) => verifyScopedApprovalToken(token, {
    intentId: token.intentId,
    intentVersion: token.intentVersion,
    capabilityId: token.capabilityId,
    scope: token.scope,
    costClass: token.scope?.maxCostClass
  }));
  const invalidToken = tokenChecks.find((check) => !check.valid);

  let readinessState = execution21MReadinessStates.readyForFutureExecution;
  if (inputDraft.completeness === executionInputCompletenessStates.invalid) readinessState = execution21MReadinessStates.inputInvalid;
  else if ([executionInputCompletenessStates.partial, executionInputCompletenessStates.blocked].includes(inputDraft.completeness)) {
    readinessState = execution21MReadinessStates.inputRequired;
  } else if (rejected) readinessState = execution21MReadinessStates.approvalRejected;
  else if (missingApprovals.length) readinessState = execution21MReadinessStates.approvalIncomplete;
  else if (invalidToken) readinessState = invalidToken.status === scopedApprovalTokenStatuses.scopeMismatch
    ? execution21MReadinessStates.tokenScopeMismatch
    : invalidToken.status === scopedApprovalTokenStatuses.versionMismatch
    ? execution21MReadinessStates.tokenVersionMismatch
    : execution21MReadinessStates.tokenInvalid;

  return {
    modelType: "Execution21MReadinessState",
    intentId: inputDraft.intentId,
    inputDraftId: inputDraft.inputDraftId,
    readinessState,
    hardStopState: execution21MReadinessStates.executionDisabledPhase21M,
    futureExecutionReady: readinessState === execution21MReadinessStates.readyForFutureExecution,
    approvalRequestsRequired: requiredApprovals.length,
    approvalRequestsApproved: approvedRequestIds.size,
    tokenChecks,
    creatorFirstDecision: createCreatorFirstDecision({
      action: "phase_21m_future_execution_readiness",
      canSystemPrepare: true,
      canSystemExecute: false,
      humanDecisionRequired: requiredApprovals.length > 0,
      approvalRequired: requiredApprovals.length > 0,
      permissionState: readinessState === execution21MReadinessStates.readyForFutureExecution
        ? creatorFirstPermissionStates.approvalRequired
        : creatorFirstPermissionStates.blocked,
      reason: "PHASE_21M_STOPS_BEFORE_EXECUTION"
    }),
    materialChanges: options.materialChanges || [],
    ...phase21MHardGuards
  };
}

export function createExecutionInputApprovalAuditArtifact(input = {}) {
  return {
    modelType: "ExecutionInputApprovalAuditArtifact",
    artifactType: "ExecutionInputApprovalAuditArtifact",
    intentId: input.intentId,
    intentVersion: input.intentVersion || "1.0.0",
    inputResolutionSummary: input.inputResolutionSummary || {},
    collectedInputKeys: [...(input.collectedInputKeys || [])],
    validationSummary: input.validationSummary || {},
    approvalsRequired: [...(input.approvalsRequired || [])],
    approvalDecisions: [...(input.approvalDecisions || [])],
    tokenSummary: [...(input.tokenSummary || [])],
    materialChanges: [...(input.materialChanges || [])],
    creatorFirstSummary: input.creatorFirstSummary || {
      principleId: systemPrincipleIds.creatorFirst,
      resolvedBeforeAsk: true,
      systemPreparesUserDecides: true
    },
    executionEnabled: false,
    executionPerformed: false,
    providerCalls: 0,
    externalCalls: 0,
    externalModelCalls: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    productionMutations: 0,
    timestamp: input.timestamp || "2026-08-29T00:00:00.000Z"
  };
}

export function buildExecution21MFlow(input = {}, sources = {}, answers = [], decisionsByType = {}, options = {}) {
  const draft = createExecutionIntentDraft(input, options);
  const collectionRequest = createExecutionInputCollectionRequest(draft, sources, options);
  const inputDraft = createExecutionInputDraft(draft, sources, answers, options);
  const rePreflight = rePreflightExecutionIntentDraft(draft, inputDraft, options);
  const discovery = discoverExecutionApprovalRequests(draft, rePreflight.preflight, options);
  const decisions = discovery.approvalRequests.map((request) =>
    createExecutionApprovalDecision({
      approvalRequestId: request.approvalRequestId,
      decision: decisionsByType[request.approvalType] || executionApprovalStates.deferred,
      userActorRef: options.userActorRef || "human_user",
      acknowledgedScope: request.scope,
      intentVersion: request.intentVersion
    })
  );
  const tokens = discovery.approvalRequests
    .map((request) => issueScopedApprovalToken(
      request,
      decisions.find((decision) => decision.approvalRequestId === request.approvalRequestId),
      options
    ))
    .filter(Boolean);
  const readiness = buildExecution21MReadiness(inputDraft, discovery.approvalRequests, decisions, tokens, options);
  const auditArtifact = createExecutionInputApprovalAuditArtifact({
    intentId: draft.intentId,
    intentVersion: options.intentVersion || "1.0.0",
    inputResolutionSummary: {
      systemResolvedInputs: collectionRequest.alreadyResolvedInputs.length,
      questionsAsked: collectionRequest.questions.length,
      missingInputs: inputDraft.missingInputs.length,
      conflictingInputs: inputDraft.conflictingInputs.length
    },
    collectedInputKeys: answers.map((answer) => answer.inputKey || answer.requirementId),
    validationSummary: inputDraft.validationSummary,
    approvalsRequired: discovery.approvalRequests.map((request) => request.approvalType),
    approvalDecisions: decisions.map((decision) => ({
      approvalRequestId: decision.approvalRequestId,
      decision: decision.decision,
      intentVersion: decision.intentVersion
    })),
    tokenSummary: tokens.map((token) => ({
      tokenId: token.tokenId,
      approvalType: token.approvalType,
      intentVersion: token.intentVersion,
      status: token.status,
      singleUse: token.singleUse
    })),
    materialChanges: options.materialChanges || [],
    creatorFirstSummary: collectionRequest.creatorFirstSummary
  });

  return {
    modelType: "Execution21MFlow",
    draft,
    collectionRequest,
    inputDraft,
    rePreflight,
    approvalDiscovery: discovery,
    approvalDecisions: decisions,
    scopedApprovalTokens: tokens,
    readiness,
    auditArtifact,
    ui: buildExecutionInputApprovalViewModel({
      draft,
      collectionRequest,
      inputDraft,
      approvalRequests: discovery.approvalRequests,
      decisions,
      tokens,
      readiness
    }),
    creatorFirstAntiPatterns: [
      detectCreatorFirstAntiPattern({
        systemKnowsValue: collectionRequest.alreadyResolvedInputs.length > 0,
        asksUserToCopy: false
      })
    ].filter(Boolean),
    ...phase21MHardGuards
  };
}

export function buildExecutionInputApprovalViewModel(input = {}) {
  const known = input.collectionRequest?.alreadyResolvedInputs || [];
  const questions = input.collectionRequest?.questions || [];
  return {
    viewType: "ExecutionInputApprovalViewModel",
    route: `#product-discovery/preflight/${input.draft?.primaryCapabilityId || "unknown"}`,
    sections: ["Input Collection", "Validation", "Approval Review", "Approval Decision", "Future-Ready Summary"],
    alreadyKnown: known.map((item) => ({
      label: item.inputKey,
      provenance: item.sourceType,
      showInternalIdByDefault: false
    })),
    needFromUser: questions.map((question) => ({
      prompt: question.prompt,
      whyNeeded: question.whyNeeded,
      status: question.confirmationOnly ? "CONFIRMATION_REQUIRED" : "NEEDS_INPUT"
    })),
    validation: {
      completeness: input.inputDraft?.completeness,
      summary: input.inputDraft?.validationSummary
    },
    approvals: (input.approvalRequests || []).map((request) => ({
      approvalRequestId: request.approvalRequestId,
      type: request.approvalType,
      title: "Подтверждение перед будущим запуском",
      whatWillHappen: request.presentation.whatWillHappen,
      whyApprovalIsNeeded: request.presentation.whyApprovalIsNeeded,
      whatWillChange: request.consequenceSummary,
      externalEffect: request.presentation.externalEffect,
      costClass: request.presentation.costClass,
      risk: request.presentation.risk,
      reversibility: request.presentation.reversibility,
      scope: request.presentation.scope,
      actions: ["ОДОБРИТЬ", "ОТКЛОНИТЬ", "ИЗМЕНИТЬ"]
    })),
    tokenSummary: (input.tokens || []).map((token) => ({
      humanReadable: `Разрешено: ${token.approvalType} только для ${token.capabilityId} по версии ${token.intentVersion}.`,
      advanced: {
        tokenId: token.tokenId,
        scope: token.scope,
        intentVersion: token.intentVersion,
        fingerprint: token.authorizationFingerprint,
        status: token.status
      }
    })),
    lisaExplanation: questions.length
      ? `Я уже взяла из проекта всё, что знаю. От тебя нужны только ${questions.length} уточнения или решения.`
      : "Я уже взяла из проекта всё, что знаю. Остались только материальные подтверждения, если они требуются политикой.",
    readiness: input.readiness,
    ...phase21MHardGuards
  };
}
