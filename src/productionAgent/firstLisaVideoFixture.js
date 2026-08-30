import { productionAgentApprovalPolicy } from "./contracts.js";

export const firstLisaElevenSecondWorkflowFixture = {
  fixtureId: "phase20c_first_lisa_11s_workflow",
  status: "contract_only",
  source: {
    kind: "future_local_video",
    artifactId: "source_lisa_11s_original",
    path: "media/input/future_lisa_11s_source.mp4",
    description: "Clean approximately 11-second Lisa talking-head or animated-avatar source.",
    originalMustNotBeOverwritten: true
  },
  contentConcept: {
    language: "ru",
    approximateMeaning:
      "You keep searching for purpose. What if purpose does not exist? What if purpose is what you assign to yourself?",
    performanceNotes: [
      "Lisa remains the primary on-screen subject.",
      "Preserve smile or laugh near the ending when it carries the meaning.",
      "Do not force B-roll or image inserts."
    ]
  },
  expectedProcess: [
    "inspect_media",
    "transcribe_media",
    "semantic_edit",
    "create_edit_plan",
    "subtitle_render",
    "ffmpeg_render",
    "verify_render",
    "human_approval"
  ],
  allowedMvpTools: [
    "inspect_media",
    "transcribe_media",
    "semantic_edit",
    "create_edit_plan",
    "subtitle_render",
    "ffmpeg_render",
    "verify_render"
  ],
  approvalPolicy: productionAgentApprovalPolicy,
  expectedOutputArtifacts: [
    "MediaInspection",
    "TranscriptArtifact",
    "SemanticEditPlan",
    "EditDecisionList",
    "SubtitleArtifact",
    "RenderArtifact",
    "VerificationReport",
    "HumanApprovalArtifact"
  ],
  guardrails: [
    "No provider call.",
    "No publishing.",
    "No external paid generation.",
    "No unrestricted shell.",
    "No hidden state outside ESSA artifacts."
  ]
};

export function createFirstLisaVideoProductionAgentRequest(input = {}) {
  return {
    taskId: input.taskId || "phase20c_first_lisa_11s_task",
    goalId: input.goalId || "phase20c_contract_goal",
    projectId: input.projectId || "first_lisa_video_contract_fixture",
    workflowId: "first_lisa_11s_reels_mvp",
    taskType: "semantic_video_edit_plan",
    userGoal: "Prepare a controlled ESSA plan for the first 11-second Lisa Reels workflow.",
    sourceArtifacts: input.sourceArtifacts || [
      {
        artifactId: firstLisaElevenSecondWorkflowFixture.source.artifactId,
        type: "SourceVideo",
        path: firstLisaElevenSecondWorkflowFixture.source.path,
        originalMustNotBeOverwritten: true
      }
    ],
    allowedTools: [...firstLisaElevenSecondWorkflowFixture.allowedMvpTools],
    approvalPolicy: productionAgentApprovalPolicy,
    traceId: input.traceId || "phase20c_trace_contract_only"
  };
}
