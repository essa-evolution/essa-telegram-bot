import fs from "fs";
import path from "path";
import {
  buildClaudeSandboxRequest,
  CLAUDE_AGENT_PROVIDER_ID,
  claudeSandboxOutputSchema,
  createClaudeSandboxPromptPackage,
  parseClaudeSandboxResponse,
  runClaudeSandboxRawResponseFixture
} from "./claudeAgentSdkAdapter.js";
import { createFirstLisaVideoProductionAgentRequest } from "../firstLisaVideoFixture.js";

export const CLAUDE_MESSAGES_ENDPOINT = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MESSAGES_PATH = "/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
export const DEFAULT_CLAUDE_SANDBOX_MODEL = "claude-sonnet-5";
export const DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS = 1200;
export const DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS = 45000;
export const DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD = 0.10;
export const CLAUDE_ONE_CALL_APPROVAL_VALUE = "APPROVED_PHASE_20G_ONE_CALL";

export const claudeSandboxModelPricing = {
  "claude-sonnet-5": {
    inputUsdPerMillionTokens: 2,
    outputUsdPerMillionTokens: 10,
    note: "Phase 20G readiness pricing through 2026-08-31."
  }
};

function nowIso() {
  return new Date().toISOString();
}

function validationError(code, message, details = {}) {
  return { code, message, details };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function estimateTokensFromText(text = "") {
  return Math.ceil(String(text).length / 4);
}

function redactHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase() === "x-api-key" ? "[REDACTED]" : value
    ])
  );
}

function safeJson(value = {}) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultClaudeOneCallOptions(input = {}) {
  const request = input.request || createFirstLisaVideoProductionAgentRequest({
    taskId: "phase20g_one_call_lisa_11s_task",
    traceId: "phase20g_one_call_lisa_11s_trace"
  });
  const sandboxRequest = input.sandboxRequest || buildClaudeSandboxRequest({ request });

  return {
    providerId: CLAUDE_AGENT_PROVIDER_ID,
    request,
    sandboxRequest,
    model: input.model || process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_SANDBOX_MODEL,
    maxTokens: Number(input.maxTokens || DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS),
    maxTurns: Number(input.maxTurns || 1),
    maxCostUsd: Number(input.maxCostUsd ?? DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD),
    timeoutMs: Number(input.timeoutMs || DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS),
    explicitRuntimeApproval: Boolean(input.explicitRuntimeApproval),
    runtimeApprovalValue: input.runtimeApprovalValue || process.env.CLAUDE_AGENT_RUNTIME_APPROVAL || "",
    apiKeyPresent: Boolean(input.apiKeyPresent ?? process.env.ANTHROPIC_API_KEY),
    dryRun: input.dryRun !== false,
    execute: input.execute === true,
    publish: input.publish === true,
    media: input.media === true,
    externalToolUse: input.externalToolUse === true,
    retryCount: 0,
    fetchImpl: input.fetchImpl || fetch
  };
}

export function estimateClaudeOneCallRequestSize(options = {}) {
  const promptPackage = createClaudeSandboxPromptPackage({ request: options.request });
  const body = buildClaudeMessagesBody({
    ...options,
    promptPackage
  });
  const serializedBody = JSON.stringify(body);
  const serializedPromptPackage = JSON.stringify(promptPackage);

  return {
    bodyChars: serializedBody.length,
    bodyEstimatedTokens: estimateTokensFromText(serializedBody),
    promptPackageChars: serializedPromptPackage.length,
    promptPackageEstimatedTokens: estimateTokensFromText(serializedPromptPackage)
  };
}

export function calculateClaudeCost({
  model = DEFAULT_CLAUDE_SANDBOX_MODEL,
  inputTokens = 0,
  outputTokens = 0
} = {}) {
  const pricing = claudeSandboxModelPricing[model] || claudeSandboxModelPricing[DEFAULT_CLAUDE_SANDBOX_MODEL];

  return {
    model,
    inputTokens,
    outputTokens,
    inputUsd: (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens,
    outputUsd: (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens,
    totalUsd:
      (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
      (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens,
    pricing
  };
}

export function buildClaudeMessagesBody({
  model = DEFAULT_CLAUDE_SANDBOX_MODEL,
  maxTokens = DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS,
  promptPackage = createClaudeSandboxPromptPackage()
} = {}) {
  return {
    model,
    max_tokens: maxTokens,
    system: [
      "You are a temporary ProductionAgent provider inside ESSA.",
      "Return JSON only. Do not use markdown.",
      "ESSA remains source of truth for Lisa identity, ProductionProfile, artifacts and approval.",
      "No tools. No media. No publishing. No execution claims.",
      `Output schema: ${JSON.stringify(claudeSandboxOutputSchema)}`
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify(promptPackage)
          }
        ]
      }
    ]
  };
}

export function prepareClaudeMessagesHttpRequest(options = {}) {
  const promptPackage = createClaudeSandboxPromptPackage({ request: options.request });
  const body = buildClaudeMessagesBody({
    model: options.model,
    maxTokens: options.maxTokens,
    promptPackage
  });
  const headers = {
    "x-api-key": options.apiKey || "[REDACTED_AT_RUNTIME]",
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json"
  };

  return {
    endpoint: CLAUDE_MESSAGES_ENDPOINT,
    path: CLAUDE_MESSAGES_PATH,
    method: "POST",
    headers,
    body,
    retryCount: 0,
    timeoutMs: options.timeoutMs || DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS
  };
}

export function createPayloadSummary(options = {}) {
  const httpRequest = prepareClaudeMessagesHttpRequest(options);
  const size = estimateClaudeOneCallRequestSize(options);

  return {
    providerId: options.providerId || CLAUDE_AGENT_PROVIDER_ID,
    endpoint: httpRequest.endpoint,
    method: httpRequest.method,
    headers: redactHeaders(httpRequest.headers),
    model: httpRequest.body.model,
    maxTokens: httpRequest.body.max_tokens,
    anthropicVersion: ANTHROPIC_VERSION,
    allowedTools: [],
    tools: false,
    media: false,
    publish: false,
    externalToolUse: false,
    maxTurns: options.maxTurns ?? 1,
    maxCostUsd: options.maxCostUsd ?? DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD,
    timeoutMs: httpRequest.timeoutMs,
    retryCount: 0,
    sourceFixtureId: options.sandboxRequest?.contextPack?.sourceFixtureId || null,
    sourceTaskId: options.request?.taskId || null,
    outputContract: claudeSandboxOutputSchema.required,
    requestSize: size,
    createdAt: nowIso()
  };
}

export function savePayloadSummary(summary, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return outputPath;
}

export function validateClaudeOneCallGates(options = {}) {
  const errors = [];
  const sandboxRequest = options.sandboxRequest || {};
  const productionIntent = sandboxRequest.productionIntent || {};
  const permissions = sandboxRequest.permissions || {};

  if (options.providerId !== CLAUDE_AGENT_PROVIDER_ID) {
    errors.push(validationError("wrong_provider", "Provider must be claude_agent_sdk"));
  }

  if (!options.explicitRuntimeApproval || options.runtimeApprovalValue !== CLAUDE_ONE_CALL_APPROVAL_VALUE) {
    errors.push(validationError("missing_runtime_approval", "Explicit one-call runtime approval flag is required"));
  }

  if (!options.apiKeyPresent) {
    errors.push(validationError("missing_anthropic_api_key", "ANTHROPIC_API_KEY must be present in process.env"));
  }

  if (!options.model) {
    errors.push(validationError("missing_anthropic_model", "ANTHROPIC_MODEL must be configured"));
  }

  if (options.maxTurns !== 1) {
    errors.push(validationError("invalid_max_turns", "First Claude sandbox call must use maxTurns=1", { maxTurns: options.maxTurns }));
  }

  if (safeArray(sandboxRequest.allowedTools).length !== 0) {
    errors.push(validationError("tools_not_allowed", "Claude sandbox request must have allowedTools=[]"));
  }

  if (options.publish === true || productionIntent.publish !== false || permissions.publish !== false) {
    errors.push(validationError("publish_not_allowed", "Publishing must be false"));
  }

  if (options.media === true || permissions.media !== false) {
    errors.push(validationError("media_not_allowed", "Media processing must be false"));
  }

  if (options.externalToolUse === true || permissions.externalGeneration !== false || permissions.tools !== false) {
    errors.push(validationError("external_tools_not_allowed", "External tool use must be false"));
  }

  if (Number(options.maxCostUsd) > DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD) {
    errors.push(validationError("max_cost_too_high", "Max cost must be <= 0.10 USD", { maxCostUsd: options.maxCostUsd }));
  }

  if (sandboxRequest.contextPack?.sourceFixtureId !== "phase20c_first_lisa_11s_workflow") {
    errors.push(validationError("wrong_source_fixture", "Only the approved Lisa 11-second fixture is allowed", {
      sourceFixtureId: sandboxRequest.contextPack?.sourceFixtureId || null
    }));
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function extractClaudeMessageJsonText(message = {}) {
  const errors = [];
  const content = safeArray(message.content);
  const textBlocks = [];

  if (!content.length) {
    errors.push(validationError("empty_anthropic_content", "Anthropic message content is empty"));
  }

  for (const block of content) {
    if (block?.type === "tool_use") {
      errors.push(validationError("tool_use_block_rejected", "Claude sandbox must not return tool_use blocks"));
      continue;
    }

    if (block?.type !== "text") {
      errors.push(validationError("unexpected_anthropic_content_block", "Only text content blocks are supported", {
        type: block?.type || null
      }));
      continue;
    }

    textBlocks.push(block.text || "");
  }

  if (textBlocks.length !== 1) {
    errors.push(validationError("invalid_text_block_count", "Claude sandbox expects exactly one text block", {
      textBlockCount: textBlocks.length
    }));
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
      stopReason: message.stop_reason || null,
      usage: message.usage || null
    };
  }

  return {
    ok: true,
    rawText: textBlocks[0],
    stopReason: message.stop_reason || null,
    usage: message.usage || null
  };
}

export async function validateClaudeAnthropicMessageResponse({
  message,
  request,
  rawOutputPath = null
} = {}) {
  const extracted = extractClaudeMessageJsonText(message);
  const cost = calculateClaudeCost({
    model: message?.model || DEFAULT_CLAUDE_SANDBOX_MODEL,
    inputTokens: message?.usage?.input_tokens || 0,
    outputTokens: message?.usage?.output_tokens || 0
  });

  if (!extracted.ok) {
    return {
      ok: false,
      validation: {
        status: "rejected",
        errors: extracted.errors,
        blockedTools: []
      },
      stopReason: extracted.stopReason,
      usage: extracted.usage,
      cost,
      retryCount: 0
    };
  }

  if (rawOutputPath) {
    fs.mkdirSync(path.dirname(rawOutputPath), { recursive: true });
    fs.writeFileSync(rawOutputPath, extracted.rawText, "utf8");
  }

  const parsed = parseClaudeSandboxResponse(extracted.rawText);
  if (!parsed.ok) {
    return {
      ok: false,
      validation: {
        status: "rejected",
        errors: parsed.errors,
        blockedTools: []
      },
      stopReason: extracted.stopReason,
      usage: extracted.usage,
      cost,
      retryCount: 0
    };
  }

  const localFixturePath = rawOutputPath || path.join(
    process.cwd(),
    "artifacts",
    "productionAgent",
    "claudeSandbox",
    "phase20g_last_raw_response.json"
  );

  if (!rawOutputPath) {
    fs.mkdirSync(path.dirname(localFixturePath), { recursive: true });
    fs.writeFileSync(localFixturePath, extracted.rawText, "utf8");
  }

  const runResult = await runClaudeSandboxRawResponseFixture({
    fixturePath: localFixturePath,
    request
  });
  const costLimitExceeded = cost.totalUsd > DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD;

  return {
    ...runResult,
    stopReason: extracted.stopReason,
    usage: extracted.usage,
    cost: {
      ...cost,
      costLimitExceeded
    },
    retryCount: 0
  };
}

export async function runClaudeOneCallSandbox(input = {}) {
  const options = createDefaultClaudeOneCallOptions(input);
  const summary = createPayloadSummary(options);
  const summaryPath = input.summaryPath || path.join(
    process.cwd(),
    "artifacts",
    "productionAgent",
    "claudeSandbox",
    "phase20g_payload_summary.json"
  );
  savePayloadSummary(summary, summaryPath);

  if (options.dryRun || !options.execute) {
    return {
      ok: true,
      status: "dry_run",
      networkCalled: false,
      providerCallMade: false,
      summaryPath,
      payloadSummary: summary,
      gateValidation: validateClaudeOneCallGates({
        ...options,
        explicitRuntimeApproval: true,
        runtimeApprovalValue: CLAUDE_ONE_CALL_APPROVAL_VALUE,
        apiKeyPresent: true
      })
    };
  }

  const gates = validateClaudeOneCallGates(options);
  if (!gates.ok) {
    return {
      ok: false,
      status: "blocked",
      networkCalled: false,
      providerCallMade: false,
      validation: {
        status: "blocked",
        errors: gates.errors,
        blockedTools: []
      },
      summaryPath,
      payloadSummary: summary,
      retryCount: 0
    };
  }

  const httpRequest = prepareClaudeMessagesHttpRequest({
    ...options,
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await options.fetchImpl(httpRequest.endpoint, {
      method: httpRequest.method,
      headers: httpRequest.headers,
      body: JSON.stringify(httpRequest.body),
      signal: controller.signal
    });
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: "blocked",
        networkCalled: true,
        providerCallMade: true,
        retryCount: 0,
        validation: {
          status: "rejected",
          errors: [
            validationError("anthropic_http_error", "Anthropic request failed; no retry was attempted", {
              status: response.status,
              type: responseBody?.error?.type || null
            })
          ],
          blockedTools: []
        },
        payloadSummary: summary
      };
    }

    return validateClaudeAnthropicMessageResponse({
      message: responseBody,
      request: options.request,
      rawOutputPath: input.rawOutputPath || path.join(
        process.cwd(),
        "artifacts",
        "productionAgent",
        "claudeSandbox",
        "phase20g_raw_response.json"
      )
    });
  } catch (error) {
    return {
      ok: false,
      status: "blocked",
      networkCalled: error.name !== "AbortError",
      providerCallMade: error.name !== "AbortError",
      retryCount: 0,
      validation: {
        status: "rejected",
        errors: [
          validationError(
            error.name === "AbortError" ? "anthropic_request_timeout" : "anthropic_request_failed",
            "Claude sandbox request stopped; no retry was attempted"
          )
        ],
        blockedTools: []
      },
      payloadSummary: summary
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function sanitizeClaudeOneCallResult(result = {}) {
  const sanitized = safeJson(result);
  const serialized = JSON.stringify(sanitized);

  if (/sk[-_][a-z0-9_-]{8,}|anthropic_api_key/i.test(serialized)) {
    throw new Error("Sanitized Claude one-call result contains a secret-like value");
  }

  return sanitized;
}
