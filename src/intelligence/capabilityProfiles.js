export const capabilityValues = {
  yes: "YES",
  no: "NO",
  unknown: "UNKNOWN",
  partial: "PARTIAL"
};

export const modelCapabilityCategories = [
  "reasoning",
  "coding",
  "structured_output",
  "tool_calling",
  "long_context",
  "multilingual",
  "vision",
  "image_input",
  "video_input",
  "audio_input",
  "video_understanding",
  "video_rendering",
  "computer_use",
  "agent_orchestration",
  "latency_class",
  "cost_class"
];

export const localDeterministicCapabilities = [
  {
    toolId: "ffmpeg",
    decisionLabel: "FFmpeg",
    capabilities: ["video_trim", "local_video_render", "media_transform"],
    taskTypes: ["video_trim", "video_render"],
    costUsd: 0
  },
  {
    toolId: "ffprobe",
    decisionLabel: "ffprobe",
    capabilities: ["media_metadata", "media_inspection"],
    taskTypes: ["media_metadata", "media_inspection"],
    costUsd: 0
  },
  {
    toolId: "whisper.cpp",
    decisionLabel: "whisper.cpp",
    capabilities: ["local_transcription", "speech_to_text"],
    taskTypes: ["transcription", "speech_to_text"],
    costUsd: 0
  },
  {
    toolId: "context7",
    decisionLabel: "Context7",
    capabilities: ["verified_documentation_lookup", "documentation_lookup"],
    taskTypes: ["documentation_lookup"],
    costUsd: 0
  },
  {
    toolId: "playwright",
    decisionLabel: "Playwright Browser Vision",
    capabilities: ["browser_observation", "ui_observation"],
    taskTypes: ["browser_observation", "ui_audit"],
    costUsd: 0
  },
  {
    toolId: "essa_verifier",
    decisionLabel: "ESSA Verifier",
    capabilities: ["deterministic_verification", "schema_validation"],
    taskTypes: ["verification", "schema_validation"],
    costUsd: 0
  }
];

export function findLocalDeterministicCapability(request = {}) {
  const required = request.requiredCapabilities || [];
  return localDeterministicCapabilities.find((tool) =>
    tool.taskTypes.includes(request.taskType) ||
    required.some((capability) => tool.capabilities.includes(capability))
  ) || null;
}

export function createUnknownCapabilityMatrix(overrides = {}) {
  return Object.fromEntries(
    modelCapabilityCategories.map((category) => [category, overrides[category] || capabilityValues.unknown])
  );
}
