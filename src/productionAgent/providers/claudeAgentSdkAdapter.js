import fs from "fs";
import {
  createFirstLisaVideoProductionAgentRequest,
  firstLisaElevenSecondWorkflowFixture
} from "../firstLisaVideoFixture.js";
import { createApprovalReadyReport } from "../fixtureHarness.js";
import { runProductionAgent } from "../runner.js";

export const CLAUDE_AGENT_PROVIDER_ID = "claude_agent_sdk";

export const claudeSandboxFutureEnvNames = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "CLAUDE_AGENT_ENABLED",
  "CLAUDE_AGENT_MAX_TURNS",
  "CLAUDE_AGENT_MAX_COST_USD",
  "CLAUDE_AGENT_PERMISSION_MODE"
];

export const claudeSandboxExecutionGate = {
  realClaudeCallAllowed: false,
  requiresExplicitUserApproval: true,
  requiresAnthropicApiKey: true,
  requiresConfiguredModel: true,
  requiresConfiguredBudget: true,
  firstSandboxMaxTurns: 1,
  toolsDisabled: true,
  publishAllowed: false,
  externalToolUseAllowed: false,
  providerCallsAllowedNow: false
};

export const claudeSandboxOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "providerId",
    "semanticSummary",
    "proposedEditDecisions",
    "subtitlePlan",
    "visualRequests",
    "unresolvedItems",
    "toolRequests",
    "artifacts",
    "approvalRequired",
    "completionState",
    "traceMetadata"
  ],
  properties: {
    providerId: "claude_agent_sdk",
    semanticSummary: "string",
    proposedEditDecisions: "array<object|string>",
    subtitlePlan: "array<object>",
    visualRequests: "array<object>",
    unresolvedItems: "array<object|string>",
    toolRequests: [],
    artifacts: [],
    approvalRequired: true,
    completionState: "draft|needs_approval|blocked",
    traceMetadata: "object"
  }
};

const allowedSandboxResponseFields = new Set(claudeSandboxOutputSchema.required);

function validationError(code, message, details = {}) {
  return { code, message, details };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasSecretLikeValue(value) {
  return /anthropic_api_key|openai_api_key|elevenlabs_api_key|api[_-]?key|bearer\s+[a-z0-9._-]+|sk[-_][a-z0-9_-]{12,}/i.test(
    JSON.stringify(value || {})
  );
}

function stableReference(ref, fallbackId) {
  return {
    referenceId: ref?.referenceId || fallbackId,
    source: ref?.source || "ESSA",
    summary: ref?.summary || null,
    immutable: true
  };
}

export function createClaudeSandboxPolicyPackage() {
  return {
    mode: "static_text_json_only_sandbox",
    providerRole: "temporary ProductionAgent provider inside ESSA",
    sourceOfTruth: {
      identity: "ESSA",
      characterCore: "ESSA",
      productionProfile: "ESSA",
      artifacts: "ESSA",
      approvals: "human_required"
    },
    instructions: [
      "Return JSON only.",
      "Do not redefine Lisa.",
      "Do not alter Character Core.",
      "Do not alter LisaProductionProfile.",
      "Do not publish.",
      "Do not call tools.",
      "Do not request tools.",
      "Do not generate media.",
      "Do not claim execution or verified completion.",
      "Preserve Lisa performance first.",
      "Do not force B-roll.",
      "VisualRequests must be semantically justified.",
      "Unknowns stay unresolved.",
      "Human approval remains required."
    ],
    forbidden: [
      "tool execution",
      "shell access",
      "file-system access",
      "media processing",
      "publishing",
      "identity mutation",
      "ProductionProfile mutation",
      "provider secret handling"
    ],
    allowedTools: [],
    outputSchema: claudeSandboxOutputSchema
  };
}

export function buildClaudeSandboxRequest({
  request = createFirstLisaVideoProductionAgentRequest(),
  transcript = firstLisaElevenSecondWorkflowFixture.contentConcept.approximateMeaning,
  contextPackSubset = {},
  characterCoreReference = null,
  productionProfileReference = null,
  expressionContext = null,
  productionIntent = null
} = {}) {
  return {
    providerId: CLAUDE_AGENT_PROVIDER_ID,
    taskId: request.taskId,
    projectId: request.projectId,
    goalId: request.goalId,
    taskType: request.taskType,
    userGoal: request.userGoal,
    contextPack: {
      language: "ru",
      platform: "Instagram Reels",
      sourceFixtureId: firstLisaElevenSecondWorkflowFixture.fixtureId,
      performanceNotes: [...firstLisaElevenSecondWorkflowFixture.contentConcept.performanceNotes],
      ...contextPackSubset
    },
    characterCore: stableReference(characterCoreReference, "lisa_character_core"),
    productionProfile: stableReference(productionProfileReference, "lisa_production_profile"),
    dynamicExpressionContext: expressionContext || {
      identityId: "lisa",
      deliveryIntent: "direct_mirror",
      performancePriority: "preserve_lisa_presence"
    },
    productionIntent: productionIntent || {
      platform: "Instagram Reels",
      format: "short_vertical",
      subtitles: true,
      publish: false
    },
    staticTranscript: {
      language: "ru",
      text: transcript,
      source: "static_fixture_text"
    },
    controlledOutputSchema: claudeSandboxOutputSchema,
    policy: createClaudeSandboxPolicyPackage(),
    allowedTools: [],
    permissions: {
      tools: false,
      shell: false,
      fileSystem: false,
      media: false,
      publish: false,
      externalGeneration: false
    },
    executionGate: { ...claudeSandboxExecutionGate }
  };
}

export function createClaudeSandboxPromptPackage(options = {}) {
  const sandboxRequest = buildClaudeSandboxRequest(options);

  return {
    systemPolicy: createClaudeSandboxPolicyPackage(),
    userTask:
      "Analyze this short Lisa monologue and return a structured ProductionAgentResult-compatible JSON plan.",
    sandboxRequest,
    responseFormat: {
      type: "json_object",
      schema: claudeSandboxOutputSchema
    }
  };
}

export function parseClaudeSandboxResponse(rawText = "") {
  const text = String(rawText ?? "").trim();

  if (!text) {
    return {
      ok: false,
      errors: [validationError("empty_claude_response", "Claude sandbox response is empty")]
    };
  }

  if (text.startsWith("```") || text.includes("```")) {
    return {
      ok: false,
      errors: [validationError("markdown_wrapped_response", "Claude sandbox response must be strict JSON only")]
    };
  }

  if (!text.startsWith("{") || !text.endsWith("}")) {
    return {
      ok: false,
      errors: [validationError("non_json_response", "Claude sandbox response must contain only a JSON object")]
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text)
    };
  } catch (error) {
    return {
      ok: false,
      errors: [validationError("invalid_json_response", error.message)]
    };
  }
}

export function validateClaudeSandboxResponse(value = {}) {
  const errors = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(validationError("claude_response_not_object", "Claude sandbox response must be an object"));
    return { ok: false, errors };
  }

  for (const field of claudeSandboxOutputSchema.required) {
    if (!(field in value)) {
      errors.push(validationError("missing_sandbox_response_field", "Required sandbox response field is missing", { field }));
    }
  }

  for (const field of Object.keys(value)) {
    if (!allowedSandboxResponseFields.has(field)) {
      errors.push(validationError("unknown_sandbox_response_field", "Unknown sandbox response field is not allowed", { field }));
    }
  }

  if (value.providerId && value.providerId !== CLAUDE_AGENT_PROVIDER_ID) {
    errors.push(validationError("invalid_provider_id", "Claude sandbox providerId must remain claude_agent_sdk"));
  }

  if (typeof value.semanticSummary !== "string" || !value.semanticSummary.trim()) {
    errors.push(validationError("invalid_semantic_summary", "semanticSummary must be a non-empty string"));
  }

  for (const field of ["proposedEditDecisions", "subtitlePlan", "visualRequests", "unresolvedItems", "toolRequests", "artifacts"]) {
    if (!Array.isArray(value[field])) {
      errors.push(validationError("invalid_sandbox_array_field", `${field} must be an array`, { field }));
    }
  }

  if (safeArray(value.toolRequests).length > 0) {
    errors.push(validationError("sandbox_tool_requests_not_allowed", "Claude sandbox response must not request tools"));
  }

  if (safeArray(value.artifacts).length > 0) {
    errors.push(validationError("sandbox_artifacts_not_allowed", "Claude sandbox response must not invent artifacts"));
  }

  if (value.approvalRequired !== true) {
    errors.push(validationError("approval_required_must_be_true", "Claude sandbox response must require human approval"));
  }

  if (value.completionState === "completed") {
    errors.push(validationError("sandbox_completion_not_allowed", "Claude sandbox response must not claim completed execution"));
  }

  const serialized = JSON.stringify(value).toLowerCase();
  if (
    serialized.includes("mutate_character_core") ||
    serialized.includes("rewrite_lisa_character_core") ||
    serialized.includes("new source of truth")
  ) {
    errors.push(validationError("identity_source_of_truth_mutation_attempt", "Claude sandbox response must not mutate Lisa identity"));
  }

  if (
    serialized.includes("mutate_production_profile") ||
    serialized.includes("rewrite_lisa_production_profile")
  ) {
    errors.push(validationError("production_profile_mutation_attempt", "Claude sandbox response must not mutate LisaProductionProfile"));
  }

  if (hasSecretLikeValue(value)) {
    errors.push(validationError("secret_like_value_detected", "Claude sandbox response must not contain provider secrets"));
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function mapClaudeSandboxResponseToProductionAgentResult(value = {}) {
  return {
    providerId: CLAUDE_AGENT_PROVIDER_ID,
    ok: true,
    plan: {
      summary: value.semanticSummary,
      semanticDecisions: [...safeArray(value.proposedEditDecisions)],
      subtitleChunks: [...safeArray(value.subtitlePlan)],
      visualRequests: [...safeArray(value.visualRequests)],
      completionState: value.completionState
    },
    toolRequests: [],
    artifacts: [],
    unresolved: [...safeArray(value.unresolvedItems)],
    approvalRequired: true,
    trace: [
      {
        step: "claude_sandbox_raw_response_parsed",
        providerId: CLAUDE_AGENT_PROVIDER_ID,
        completionState: value.completionState,
        providerCallMade: false,
        traceMetadata: value.traceMetadata || {}
      }
    ]
  };
}

export async function runClaudeSandboxRawResponseFixture({
  fixturePath,
  request = createFirstLisaVideoProductionAgentRequest({
    taskId: "phase20f_claude_sandbox_task",
    traceId: "phase20f_claude_sandbox_trace"
  }),
  validationPolicy = {}
} = {}) {
  const rawText = fs.readFileSync(fixturePath, "utf8");
  const parsed = parseClaudeSandboxResponse(rawText);

  if (!parsed.ok) {
    const rejected = {
      ok: false,
      providerId: CLAUDE_AGENT_PROVIDER_ID,
      validation: {
        status: "rejected",
        errors: parsed.errors,
        blockedTools: []
      },
      trace: []
    };

    return {
      ...rejected,
      fixturePath,
      providerCallMade: false,
      approvalReport: createApprovalReadyReport(rejected)
    };
  }

  const sandboxValidation = validateClaudeSandboxResponse(parsed.value);
  if (!sandboxValidation.ok) {
    const rejected = {
      ok: false,
      providerId: parsed.value?.providerId || CLAUDE_AGENT_PROVIDER_ID,
      validation: {
        status: "rejected",
        errors: sandboxValidation.errors,
        blockedTools: []
      },
      trace: []
    };

    return {
      ...rejected,
      fixturePath,
      providerCallMade: false,
      approvalReport: createApprovalReadyReport(rejected)
    };
  }

  const fixtureResult = mapClaudeSandboxResponseToProductionAgentResult(parsed.value);
  const validationRequest = {
    ...request,
    allowedTools: ["inspect_media"]
  };
  const runResult = await runProductionAgent({
    providerId: CLAUDE_AGENT_PROVIDER_ID,
    request: validationRequest,
    validationPolicy,
    allowFixtureProvider: true,
    fixtureResult
  });

  return {
    ...runResult,
    fixturePath,
    providerCallMade: false,
    rawResponseMode: true,
    sandboxRequest: buildClaudeSandboxRequest({ request }),
    approvalReport: createApprovalReadyReport(runResult)
  };
}
