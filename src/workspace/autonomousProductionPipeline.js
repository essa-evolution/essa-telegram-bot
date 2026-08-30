export const autonomousProductionPipelineSteps = [
  "Source analysis",
  "Meaning extraction",
  "Content strategy",
  "Podcast script",
  "Shorts scripts",
  "TikTok scripts",
  "Reels scripts",
  "Visual prompts",
  "Video prompts",
  "Music brief",
  "Voice package",
  "Translation package",
  "Publication package",
  "Schedule package",
  "QA approval",
  "Human approval",
  "Result package"
];

export const autonomousPipelineAssetTemplates = [
  { key: "pipeline_plan", title: "Pipeline plan", category: "documents" },
  { key: "agent_task_map", title: "Agent task map", category: "documents" },
  { key: "voice_usage_report", title: "Voice usage report", category: "documents" },
  { key: "publication_schedule_draft", title: "Publication schedule draft", category: "documents" },
  { key: "qa_checklist", title: "QA checklist", category: "documents" },
  { key: "result_package_plan", title: "Result package plan", category: "documents" }
];

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildAutonomousPipelineDraft(project = {}, voiceUsage = {}) {
  const createdAt = new Date().toISOString();

  return {
    id: makeId("autonomous_pipeline"),
    createdAt,
    status: "draft",
    mode: "planning_only",
    identityId: project.identityId || project.identitySnapshot?.id || null,
    identityName: project.identityName || project.identitySnapshot?.name || null,
    voiceUsage,
    steps: autonomousProductionPipelineSteps.map((title, index) => ({
      id: `${String(index + 1).padStart(2, "0")}_${slugify(title)}`,
      title,
      executionStatus: "not_started",
      requiresApproval: true
    }))
  };
}

export function buildAutonomousPipelineAssets(project = {}, draft = {}) {
  const createdAt = draft.createdAt || new Date().toISOString();
  const voiceUsage = draft.voiceUsage || {};

  return autonomousPipelineAssetTemplates.reduce((assets, template) => {
    const asset = {
      id: makeId(`asset_${template.key}`),
      title: template.title,
      type: template.key,
      description: `Planning-only asset for autonomous production pipeline: ${template.key}`,
      content: [
        "ESSA Autonomous Production Pipeline",
        "",
        `Project: ${project.title || "ESSA project"}`,
        `Pipeline draft: ${draft.id || ""}`,
        `Mode: ${draft.mode || "planning_only"}`,
        `Status: ${draft.status || "draft"}`,
        `Identity: ${draft.identityName || "not set"}`,
        `Voice usage: ${voiceUsage.usage || "not set"}`,
        `Fallback voice: ${voiceUsage.fallbackVoice || "none"}`,
        "",
        "Planned steps:",
        ...(draft.steps || []).map((step) => `- ${step.title}: ${step.executionStatus}; requiresApproval=${step.requiresApproval}`),
        "",
        "External tools were not launched. Autopublishing is disabled."
      ].join("\n"),
      createdAt,
      updatedAt: createdAt
    };

    return {
      ...assets,
      [template.category]: [
        ...(assets[template.category] || []),
        asset
      ]
    };
  }, {});
}
