import { createBenchmarkResult, createProviderAdapter, PROVIDER_STATUS } from "./contracts.js";

function getAnswer(task = {}, index, fallback = "Not specified") {
  const answers = task.contextPack?.activeWorkflow?.state?.answers || {};
  const value = String(answers[index] || answers[String(index)] || "").trim();
  return value || fallback;
}

function getChapterOutline(task = {}) {
  const outline = (task.artifactInputs || []).find((artifact) => artifact.type === "chapter_outline") ||
    (task.projectSnapshot?.artifacts || []).find((artifact) => artifact.type === "chapter_outline");

  return String(outline?.content || "").trim();
}

function estimateTokens(text = "") {
  return Math.ceil(String(text || "").length / 4);
}

function normalizeOpenAiError(error = {}) {
  const message = String(error?.message || error || "provider_error").toLowerCase();
  const status = error?.status || error?.statusCode || null;
  const code = String(error?.code || error?.type || "").toLowerCase();

  if (status === 401 || status === 403 || code.includes("auth") || message.includes("api key")) {
    return "authentication";
  }

  if (status === 429 || code.includes("rate_limit") || message.includes("rate limit")) {
    return "rate_limit";
  }

  if (message.includes("quota") || message.includes("insufficient") || message.includes("billing")) {
    return "insufficient_balance_or_quota";
  }

  if (message.includes("timeout") || code.includes("timeout")) {
    return "timeout";
  }

  if (message.includes("network") || message.includes("fetch failed") || code.includes("econn")) {
    return "network_error";
  }

  if (status === 404 || message.includes("model") || code.includes("model")) {
    return "invalid_model";
  }

  return "provider_error";
}

function calculateEstimatedCost({ inputTokens, maxOutputTokens, inputUsdPer1m, outputUsdPer1m } = {}) {
  if (!Number.isFinite(inputUsdPer1m) || !Number.isFinite(outputUsdPer1m)) {
    return null;
  }

  return ((inputTokens / 1_000_000) * inputUsdPer1m) + ((maxOutputTokens / 1_000_000) * outputUsdPer1m);
}

export function buildOpenAiChapterDraftPrompt(task = {}) {
  const goal = task.goal || {};
  const outputRequirements = task.outputRequirements || {};
  const outline = getChapterOutline(task);

  return [
    "You are writing one production-quality chapter draft for a book project.",
    "",
    "Return only the chapter draft content in Russian markdown.",
    "Do not mention provider benchmarking, ESSA internals, hidden routing, API details or scoring rubrics.",
    "Do not claim that any artifact was saved, published or verified.",
    "",
    "Goal:",
    `- Type: ${goal.type || "create_artifact"}`,
    `- Subject: ${goal.subject || "chapter"}`,
    `- Desired outcome: ${goal.desiredOutcome || task.contextPack?.activeGoal?.desiredOutcome || "finished chapter draft saved as project artifact"}`,
    "",
    "Collected intake answers:",
    `1. Topic: ${getAnswer(task, 0)}`,
    `2. Book/context: ${getAnswer(task, 1)}`,
    `3. Style: ${getAnswer(task, 2)}`,
    `4. Desired reader effect: ${getAnswer(task, 3)}`,
    `5. Existing material: ${getAnswer(task, 4)}`,
    "",
    "Chapter outline:",
    outline || "No outline supplied.",
    "",
    "Output requirements:",
    `- Language: ${outputRequirements.language || "ru"}`,
    `- Format: ${outputRequirements.format || "markdown"}`,
    `- Minimum sections: ${outputRequirements.minimumSections || 5}`,
    `- Artifact type target: ${outputRequirements.artifactType || "chapter_draft"}`,
    "- Produce a complete readable draft, not an outline.",
    "- Preserve the requested deep, clear, human style.",
    "- Avoid repetition, fake facts, fake citations and technical explanations."
  ].join("\n");
}

function createPreflight({ task, modelId, prompt, options }) {
  const maxOutputTokens = Number(options.maxOutputTokens || 1200);
  const inputTokens = estimateTokens(prompt);
  const tokenEnvelope = {
    estimatedInputTokens: inputTokens,
    maxOutputTokens,
    estimatedTotalTokenCeiling: inputTokens + maxOutputTokens
  };
  const estimatedCost = calculateEstimatedCost({
    inputTokens,
    maxOutputTokens,
    inputUsdPer1m: Number(options.openAiInputUsdPer1m),
    outputUsdPer1m: Number(options.openAiOutputUsdPer1m)
  });

  return {
    provider: "openai",
    selectedModel: modelId,
    taskId: task.taskId,
    tokenEnvelope,
    configuredCostCeiling: Number.isFinite(Number(options.maxEstimatedCostUsd))
      ? Number(options.maxEstimatedCostUsd)
      : null,
    estimatedRequestCostUsd: estimatedCost,
    maxProviderCalls: Number(options.maxProviderCalls || 1),
    networkCallStatus: "NOT_EXECUTED"
  };
}

function checkOpenAiGuards({ modelId, preflight, options }) {
  const maxProviderCalls = Number(options.maxProviderCalls || 1);
  const maxEstimatedCostUsd = Number(options.maxEstimatedCostUsd);

  if (!modelId) {
    return "model_not_selected";
  }

  if (!Number.isFinite(maxProviderCalls) || maxProviderCalls < 1) {
    return "max_provider_calls_invalid";
  }

  if (maxProviderCalls > 1) {
    return "max_provider_calls_exceeded";
  }

  if (Number.isFinite(maxEstimatedCostUsd)) {
    if (maxEstimatedCostUsd <= 0) {
      return "budget_blocked";
    }

    if (Number.isFinite(preflight.estimatedRequestCostUsd) && preflight.estimatedRequestCostUsd > maxEstimatedCostUsd) {
      return "budget_blocked";
    }
  }

  return null;
}

async function invokeOpenAiBenchmark(task, options = {}) {
  const modelId = options.openaiModel || options.modelId || null;
  const prompt = buildOpenAiChapterDraftPrompt(task);
  const preflight = createPreflight({ task, modelId, prompt, options });
  const guardError = checkOpenAiGuards({ modelId, preflight, options });

  if (guardError) {
    return createBenchmarkResult({
      providerId: "openai",
      modelId,
      ok: false,
      errors: [guardError],
      metadata: {
        status: PROVIDER_STATUS.CONFIGURED,
        preflight,
        skipped: true,
        networkCallStatus: "NOT_EXECUTED"
      }
    });
  }

  if (!options.executeProviderCall) {
    return createBenchmarkResult({
      providerId: "openai",
      modelId,
      ok: false,
      errors: ["openai_preflight_not_executed"],
      metadata: {
        status: PROVIDER_STATUS.CONFIGURED,
        preflight,
        skipped: true,
        networkCallStatus: "NOT_EXECUTED",
        safety: "Preflight completed. Real benchmark call requires explicit executeProviderCall in addition to --allow-provider-calls."
      }
    });
  }

  const started = Date.now();

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: options.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: Number(options.maxOutputTokens || 1200),
      temperature: 0.7
    });
    const content = response.choices?.[0]?.message?.content || "";

    return createBenchmarkResult({
      providerId: "openai",
      modelId,
      ok: Boolean(content.trim()),
      content,
      latencyMs: Date.now() - started,
      inputTokens: response.usage?.prompt_tokens ?? null,
      outputTokens: response.usage?.completion_tokens ?? null,
      estimatedCost: preflight.estimatedRequestCostUsd,
      errors: content.trim() ? [] : ["empty_provider_response"],
      metadata: {
        status: PROVIDER_STATUS.CONFIGURED,
        preflight: {
          ...preflight,
          networkCallStatus: "EXECUTED"
        },
        responseId: response.id || null,
        finishReason: response.choices?.[0]?.finish_reason || null,
        retries: 0
      }
    });
  } catch (error) {
    return createBenchmarkResult({
      providerId: "openai",
      modelId,
      ok: false,
      latencyMs: Date.now() - started,
      errors: [normalizeOpenAiError(error)],
      metadata: {
        status: PROVIDER_STATUS.CONFIGURED,
        preflight: {
          ...preflight,
          networkCallStatus: "FAILED"
        },
        providerErrorStatus: error?.status || error?.statusCode || null,
        retries: 0
      }
    });
  }
}

export function createOpenAiBenchmarkAdapter() {
  return createProviderAdapter({
    providerId: "openai",
    displayName: "OpenAI",
    envKeys: ["OPENAI_API_KEY"],
    candidateModels: [],
    capabilities: ["reasoning", "text_generation", "structured_output", "tool_calling", "long_context"],
    invoke: invokeOpenAiBenchmark
  });
}
