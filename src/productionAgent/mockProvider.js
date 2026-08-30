export function createSafeLisaElevenSecondMockResult(request = {}) {
  return {
    ok: true,
    providerId: "mock_production_agent",
    plan: {
      planId: "mock_lisa_11s_semantic_edit_plan",
      status: "ready_for_human_approval",
      summary: "Keep Lisa as the primary visual anchor, preserve the ending smile/laugh, add readable semantic subtitles, and avoid forced B-roll.",
      semanticDecisions: [
        {
          timing: { start: 0, end: 3.2 },
          decision: "KEEP_PRIMARY_VIDEO",
          reason: "Opening thought lands through Lisa presence."
        },
        {
          timing: { start: 3.2, end: 7.4 },
          decision: "TEXT_EMPHASIS",
          emphasis: ["предназначение", "не существует"],
          reason: "Core reversal of the idea."
        },
        {
          timing: { start: 7.4, end: 11 },
          decision: "KEEP_PRIMARY_VIDEO",
          emphasis: ["сам"],
          reason: "Preserve Lisa's smile/laugh as the emotional release."
        }
      ],
      subtitleChunks: [
        { start: 0, end: 2.2, text: "Ты всё время ищешь предназначение." },
        { start: 2.2, end: 5.6, text: "А что, если предназначение вообще не существует?" },
        { start: 5.6, end: 8.4, text: "Что, если предназначение - это то," },
        { start: 8.4, end: 11, text: "что ты сам предназначаешь себе?" }
      ],
      visualRequests: [],
      guardrails: [
        "No forced B-roll.",
        "No image-per-sentence editing.",
        "Original source must not be overwritten.",
        "Publishing requires human approval."
      ]
    },
    toolRequests: [
      { toolId: "inspect_media", input: { sourcePath: request.sourceArtifacts?.[0]?.path || "future_source.mp4" } },
      { toolId: "transcribe_media", input: { sourcePath: request.sourceArtifacts?.[0]?.path || "future_source.mp4", language: "ru" } },
      { toolId: "semantic_edit", input: { transcriptRef: "TranscriptArtifact", productionIntentRef: "ProductionIntent" } },
      { toolId: "create_edit_plan", input: { semanticEditPlanRef: "SemanticEditPlan" } },
      { toolId: "subtitle_render", input: { subtitlePlanRef: "SubtitlePlan", preset: "lisa_readable_reels_mvp" } },
      { toolId: "ffmpeg_render", input: { editPlanRef: "EditDecisionList", outputPath: "media/output/phase20d/mock/reels.mp4" } },
      { toolId: "verify_render", input: { renderPath: "media/output/phase20d/mock/reels.mp4", expectedSpec: { platform: "Instagram Reels" } } }
    ],
    artifacts: [
      { artifactId: "mock_semantic_edit_plan", type: "SemanticEditPlan", source: "mock_production_agent" },
      { artifactId: "mock_edit_decision_list", type: "EditDecisionList", source: "mock_production_agent" },
      { artifactId: "mock_subtitle_plan", type: "SubtitlePlan", source: "mock_production_agent" },
      { artifactId: "mock_verification_report", type: "VerificationReport", passed: true, verified: true }
    ],
    unresolved: [],
    approvalRequired: true,
    errors: [],
    trace: [
      {
        step: "mock_provider_generated_plan",
        providerId: "mock_production_agent",
        providerCallMade: false
      }
    ]
  };
}

export function createUnsafeMockResult(kind, request = {}) {
  const base = createSafeLisaElevenSecondMockResult(request);

  if (kind === "invalid_tool") {
    return {
      ...base,
      toolRequests: [
        ...base.toolRequests,
        { toolId: "publish_instagram", input: { platform: "Instagram Reels" }, approvalGranted: false }
      ]
    };
  }

  if (kind === "paid_tool") {
    return {
      ...base,
      toolRequests: [
        ...base.toolRequests,
        { toolId: "image_request", input: { sourceStrategy: "generate" }, approvalGranted: false }
      ]
    };
  }

  if (kind === "identity_mutation") {
    return {
      ...base,
      plan: {
        ...base.plan,
        mutate_character_core: {
          action: "rewrite_lisa_character_core",
          claim: "new source of truth"
        }
      }
    };
  }

  if (kind === "fake_success") {
    return {
      ...base,
      ok: true,
      completion: true,
      status: "completed",
      artifacts: base.artifacts.filter((artifact) => artifact.type !== "VerificationReport")
    };
  }

  if (kind === "source_overwrite") {
    return {
      ...base,
      toolRequests: [
        ...base.toolRequests,
        {
          toolId: "ffmpeg_render",
          input: {
            outputPath: request.sourceArtifacts?.[0]?.path || "media/input/source.mp4"
          }
        }
      ]
    };
  }

  return base;
}

export async function invokeMockProductionAgent(request = {}, options = {}) {
  return createUnsafeMockResult(options.kind || "safe", request);
}
