export const BENCHMARK_RECOMMENDATIONS = {
  BEST_QUALITY: "BEST_QUALITY",
  BEST_VALUE: "BEST_VALUE",
  BEST_SPEED: "BEST_SPEED",
  BEST_STRUCTURED: "BEST_STRUCTURED",
  KEEP_TESTING: "KEEP_TESTING"
};

export const PROVIDER_STATUS = {
  UNCONFIGURED: "UNCONFIGURED",
  CONFIGURED: "CONFIGURED",
  DISABLED: "DISABLED",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED"
};

export function createBenchmarkTask({
  taskId,
  goal,
  contextPack,
  workflowId,
  projectSnapshot,
  artifactInputs = [],
  instructions = "",
  outputRequirements = {}
} = {}) {
  return {
    taskId,
    goal,
    contextPack,
    workflowId,
    projectSnapshot,
    artifactInputs,
    instructions,
    outputRequirements
  };
}

export function createBenchmarkResult({
  providerId,
  modelId = null,
  ok = false,
  content = "",
  latencyMs = 0,
  inputTokens = null,
  outputTokens = null,
  estimatedCost = null,
  structuredCompliance = {
    ok: false,
    missing: []
  },
  errors = [],
  metadata = {}
} = {}) {
  return {
    providerId,
    modelId,
    ok,
    content,
    latencyMs,
    inputTokens,
    outputTokens,
    estimatedCost,
    structuredCompliance,
    errors,
    metadata
  };
}

export function createProviderAdapter({
  providerId,
  displayName,
  envKeys = [],
  candidateModels = [],
  capabilities = [],
  disabled = false,
  disabledReason = null,
  researchOnly = false,
  sourceOfTruth = null,
  invoke
} = {}) {
  return {
    providerId,
    displayName,
    envKeys,
    candidateModels,
    capabilities,
    disabled,
    disabledReason,
    researchOnly,
    sourceOfTruth,
    getStatus(env = process.env) {
      if (disabled) {
        return PROVIDER_STATUS.DISABLED;
      }
      const configured = envKeys.every((key) => Boolean(env[key]));
      return configured ? PROVIDER_STATUS.CONFIGURED : PROVIDER_STATUS.UNCONFIGURED;
    },
    async run(task, options = {}) {
      if (this.getStatus(options.env || process.env) === PROVIDER_STATUS.DISABLED) {
        return createBenchmarkResult({
          providerId,
          modelId: candidateModels[0] || null,
          ok: false,
          errors: ["provider_disabled_research_only"],
          metadata: {
            status: PROVIDER_STATUS.DISABLED,
            skipped: true,
            researchOnly,
            sourceOfTruth,
            disabledReason,
            networkCallStatus: "NOT_EXECUTED"
          }
        });
      }

      if (this.getStatus(options.env || process.env) === PROVIDER_STATUS.UNCONFIGURED) {
        return createBenchmarkResult({
          providerId,
          modelId: candidateModels[0] || null,
          ok: false,
          errors: ["provider_unconfigured"],
          metadata: {
            status: PROVIDER_STATUS.UNCONFIGURED,
            requiredEnv: envKeys,
            skipped: true
          }
        });
      }

      if (!options.allowProviderCalls) {
        return createBenchmarkResult({
          providerId,
          modelId: candidateModels[0] || null,
          ok: false,
          errors: ["provider_calls_disabled"],
          metadata: {
            status: PROVIDER_STATUS.CONFIGURED,
            skipped: true,
            safety: "Run with an explicit benchmark command and provider-call flag before spending API credits."
          }
        });
      }

      if (typeof invoke !== "function") {
        return createBenchmarkResult({
          providerId,
          modelId: candidateModels[0] || null,
          ok: false,
          errors: ["provider_adapter_not_implemented"],
          metadata: {
            status: PROVIDER_STATUS.NOT_IMPLEMENTED,
            skipped: true,
            taskId: task?.taskId || null
          }
        });
      }

      return invoke(task, options);
    }
  };
}
