export const productionAgentStatuses = {
  candidate: "candidate",
  readyContract: "READY_CONTRACT",
  disabled: "disabled"
};

export const productionAgentPermissionLevels = {
  readAnalyzeLocal: "READ_ANALYZE_LOCAL",
  localReversibleGeneration: "LOCAL_REVERSIBLE_GENERATION",
  externalPaidGeneration: "EXTERNAL_PAID_GENERATION",
  publish: "PUBLISH",
  destructive: "DESTRUCTIVE"
};

export const productionAgentApprovalPolicy = {
  readAnalyzeLocal: {
    permissionLevel: productionAgentPermissionLevels.readAnalyzeLocal,
    automaticAllowed: true,
    approvalRequired: false
  },
  localReversibleGeneration: {
    permissionLevel: productionAgentPermissionLevels.localReversibleGeneration,
    automaticAllowed: true,
    approvalRequired: false
  },
  externalPaidGeneration: {
    permissionLevel: productionAgentPermissionLevels.externalPaidGeneration,
    automaticAllowed: false,
    approvalRequired: true
  },
  publish: {
    permissionLevel: productionAgentPermissionLevels.publish,
    automaticAllowed: false,
    approvalRequired: true
  },
  destructive: {
    permissionLevel: productionAgentPermissionLevels.destructive,
    automaticAllowed: false,
    approvalRequired: true,
    blockedByDefault: true
  }
};

export const productionAgentProviderContract = {
  providerId: null,
  status: productionAgentStatuses.candidate,
  executable: false,
  capabilities: [],
  supports: {},
  invoke: null,
  health: "not_configured",
  metadata: {}
};

export const productionAgentRequestContract = {
  taskId: null,
  goalId: null,
  projectId: null,
  workflowId: null,
  taskType: null,
  userGoal: "",
  contextPack: null,
  characterCore: null,
  productionProfile: null,
  expressionContext: null,
  productionIntent: null,
  sourceArtifacts: [],
  allowedTools: [],
  approvalPolicy: productionAgentApprovalPolicy,
  budgetPolicy: null,
  traceId: null
};

export const productionAgentResultContract = {
  ok: false,
  providerId: null,
  plan: null,
  toolRequests: [],
  artifacts: [],
  unresolved: [],
  approvalRequired: true,
  errors: [],
  trace: []
};

export const controlledProductionToolContracts = [
  {
    toolId: "inspect_media",
    capability: "media_inspection",
    permissionLevel: productionAgentPermissionLevels.readAnalyzeLocal,
    inputSchema: { sourcePath: "string" },
    outputSchema: { mediaInspection: "object", streams: "array", duration: "number|null" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "ffprobe / Phase 17B local media inspection",
    mvp: true
  },
  {
    toolId: "transcribe_media",
    capability: "local_transcription",
    permissionLevel: productionAgentPermissionLevels.readAnalyzeLocal,
    inputSchema: { sourcePath: "string", language: "string|null" },
    outputSchema: { transcriptArtifact: "object", text: "string", segments: "array" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "local whisper.cpp / Phase 17C transcription path",
    mvp: true
  },
  {
    toolId: "semantic_edit",
    capability: "semantic_editing",
    permissionLevel: productionAgentPermissionLevels.readAnalyzeLocal,
    inputSchema: { transcript: "object|string", productionIntent: "object", productionProfile: "object" },
    outputSchema: { semanticEditPlan: "object" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "src/workspace/semanticEditor.js",
    mvp: true
  },
  {
    toolId: "create_edit_plan",
    capability: "edit_decision_planning",
    permissionLevel: productionAgentPermissionLevels.readAnalyzeLocal,
    inputSchema: { semanticEditPlan: "object" },
    outputSchema: { editPlan: "object", editorialDecisions: "array" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "src/workspace/semanticEditor.js editorial decisions",
    mvp: true
  },
  {
    toolId: "subtitle_render",
    capability: "subtitle_rendering",
    permissionLevel: productionAgentPermissionLevels.localReversibleGeneration,
    inputSchema: { sourcePath: "string", subtitlePlan: "object", preset: "object|null" },
    outputSchema: { subtitleArtifact: "object", path: "string" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "FFmpeg ASS/SRT subtitle path from Phase 17B",
    mvp: true
  },
  {
    toolId: "ffmpeg_render",
    capability: "local_video_render",
    permissionLevel: productionAgentPermissionLevels.localReversibleGeneration,
    inputSchema: { sourcePath: "string", editPlan: "object", outputPath: "string" },
    outputSchema: { renderArtifact: "object", path: "string" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "local FFmpeg / Phase 17B render path",
    mvp: true
  },
  {
    toolId: "verify_render",
    capability: "deterministic_verification",
    permissionLevel: productionAgentPermissionLevels.readAnalyzeLocal,
    inputSchema: { renderPath: "string", expectedSpec: "object" },
    outputSchema: { verificationReport: "object", passed: "boolean" },
    reversible: true,
    external: false,
    paid: false,
    approvalRequired: false,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "Phase 17B verification report + src/navigator/verifier.js pattern",
    mvp: true
  },
  {
    toolId: "image_request",
    capability: "visual_asset_request",
    permissionLevel: productionAgentPermissionLevels.externalPaidGeneration,
    inputSchema: { visualRequest: "object", sourceStrategy: "search|generate|none" },
    outputSchema: { assetRequest: "object", unresolvedRequirements: "array" },
    reversible: true,
    external: true,
    paid: true,
    approvalRequired: true,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "VisualRequest contract only; no provider execution",
    mvp: false
  },
  {
    toolId: "publishing_prepare",
    capability: "publishing_package",
    permissionLevel: productionAgentPermissionLevels.publish,
    inputSchema: { verifiedArtifact: "object", platform: "string" },
    outputSchema: { publishingPackage: "object", approvalRequired: "boolean" },
    reversible: true,
    external: true,
    paid: false,
    approvalRequired: true,
    status: productionAgentStatuses.readyContract,
    existingExecutionReference: "ESSA publishing placeholder only; no publishing",
    mvp: false
  }
];

export const existingExecutionMappings = {
  inspect_media: "ffprobe / existing local media path",
  transcribe_media: "local whisper.cpp",
  semantic_edit: "src/workspace/semanticEditor.js",
  create_edit_plan: "src/workspace/semanticEditor.js",
  subtitle_render: "FFmpeg subtitle path from Phase 17B",
  ffmpeg_render: "local FFmpeg path",
  verify_render: "deterministic verification path"
};

export function createProductionAgentProvider(input = {}) {
  return {
    ...productionAgentProviderContract,
    ...input,
    capabilities: [...(input.capabilities || productionAgentProviderContract.capabilities)],
    supports: { ...(input.supports || productionAgentProviderContract.supports) },
    metadata: { ...(input.metadata || productionAgentProviderContract.metadata) }
  };
}

export function createProductionAgentRequest(input = {}) {
  return {
    ...productionAgentRequestContract,
    ...input,
    sourceArtifacts: [...(input.sourceArtifacts || [])],
    allowedTools: [...(input.allowedTools || [])],
    approvalPolicy: input.approvalPolicy || productionAgentApprovalPolicy
  };
}

export function createProductionAgentResult(input = {}) {
  return {
    ...productionAgentResultContract,
    ...input,
    toolRequests: [...(input.toolRequests || [])],
    artifacts: [...(input.artifacts || [])],
    unresolved: [...(input.unresolved || [])],
    errors: [...(input.errors || [])],
    trace: [...(input.trace || [])]
  };
}

export function getControlledProductionTool(toolId) {
  return controlledProductionToolContracts.find((tool) => tool.toolId === toolId) || null;
}

export function listControlledProductionTools(filters = {}) {
  return controlledProductionToolContracts.filter((tool) => {
    if (typeof filters.mvp === "boolean" && tool.mvp !== filters.mvp) return false;
    if (filters.permissionLevel && tool.permissionLevel !== filters.permissionLevel) return false;
    return true;
  });
}

export function requiresApprovalForProductionTool(toolId) {
  const tool = getControlledProductionTool(toolId);

  return tool ? Boolean(tool.approvalRequired || tool.external || tool.paid) : true;
}
