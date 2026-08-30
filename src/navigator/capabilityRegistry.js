const STATUS = {
  READY: "READY",
  CONNECTED: "CONNECTED",
  NOT_CONNECTED: "NOT_CONNECTED",
  DEGRADED: "DEGRADED",
  REQUIRES_PAYMENT: "REQUIRES_PAYMENT",
  DISABLED: "DISABLED",
  UNAVAILABLE: "UNAVAILABLE"
};

const EXECUTABLE_STATUSES = new Set([STATUS.READY, STATUS.CONNECTED]);

const capabilityDefinitions = [
  {
    capabilityId: "navigator_routing",
    category: "navigation",
    status: STATUS.READY,
    supportedActions: ["route_request", "continue_workflow", "resolve_conflict"],
    providers: ["essa_navigator"],
    preferredProvider: "essa_navigator",
    requiredPermissions: ["READ"],
    costMode: "included",
    health: "healthy",
    limits: { scope: "internal routing only" },
    dependencies: [],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "production_chapter_outline",
    category: "documents",
    status: STATUS.READY,
    supportedActions: ["create_chapter_structure", "create_chapter_outline"],
    providers: ["essa_local_execution"],
    preferredProvider: "essa_local_execution",
    requiredPermissions: ["GENERATE_INTERNAL", "SAVE_INTERNAL"],
    costMode: "included",
    health: "healthy",
    limits: { execution: "deterministic local outline/artifact assembly" },
    dependencies: ["internal_project_save"],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "production_chapter_draft",
    category: "documents",
    status: STATUS.READY,
    supportedActions: ["create_chapter_draft"],
    providers: ["essa_documents", "essa_local_execution"],
    preferredProvider: "essa_documents",
    requiredPermissions: ["GENERATE_INTERNAL", "SAVE_INTERNAL"],
    costMode: "included",
    health: "healthy",
    limits: { execution: "internal local draft artifact; no model provider selection" },
    dependencies: ["internal_project_save", "internal_artifact_update"],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "internal_project_save",
    category: "storage",
    status: STATUS.READY,
    supportedActions: ["save_project", "update_project_state", "save_chapter_artifact"],
    providers: ["workspace_project_storage"],
    preferredProvider: "workspace_project_storage",
    requiredPermissions: ["SAVE_INTERNAL"],
    costMode: "included",
    health: "healthy",
    limits: { persistence: "workspace/project response + browser project storage" },
    dependencies: [],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "internal_artifact_update",
    category: "storage",
    status: STATUS.READY,
    supportedActions: ["create_artifact", "update_artifact", "save_artifact"],
    providers: ["workspace_project_storage"],
    preferredProvider: "workspace_project_storage",
    requiredPermissions: ["SAVE_INTERNAL", "MODIFY_DRAFT"],
    costMode: "included",
    health: "healthy",
    limits: { idempotency: "artifact type + sourceStepId" },
    dependencies: ["internal_project_save"],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "digital_identity_routing",
    category: "navigation",
    status: STATUS.READY,
    supportedActions: ["route_digital_identity", "create_avatar_intake"],
    providers: ["essa_navigator"],
    preferredProvider: "essa_navigator",
    requiredPermissions: ["READ"],
    costMode: "included",
    health: "healthy",
    limits: { execution: "routing/intake only; avatar providers not connected" },
    dependencies: [],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "voice_transcription",
    category: "voice",
    status: process.env.OPENAI_API_KEY ? STATUS.CONNECTED : STATUS.NOT_CONNECTED,
    supportedActions: ["transcribe_voice"],
    providers: ["openai_whisper"],
    preferredProvider: "openai_whisper",
    requiredPermissions: ["READ"],
    costMode: "metered",
    health: process.env.OPENAI_API_KEY ? "unknown" : "down",
    limits: { note: "existing voice layer uses configured API key when available" },
    dependencies: ["OPENAI_API_KEY"],
    internal: true,
    metadata: { declared: true, configured: Boolean(process.env.OPENAI_API_KEY), executable: Boolean(process.env.OPENAI_API_KEY) }
  },
  {
    capabilityId: "voice_tts",
    category: "voice",
    status: process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID)
      ? STATUS.CONNECTED
      : STATUS.NOT_CONNECTED,
    supportedActions: ["generate_voice"],
    providers: ["elevenlabs", "omnivoice"],
    preferredProvider: "elevenlabs",
    requiredPermissions: ["GENERATE_INTERNAL"],
    costMode: "metered",
    health: process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID) ? "unknown" : "down",
    limits: { note: "existing voice layer only if ElevenLabs key and voice id are configured" },
    dependencies: ["ELEVENLABS_API_KEY", "ELEVENLABS_LISA_VOICE_ID"],
    internal: true,
    metadata: {
      declared: true,
      configured: Boolean(process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID)),
      executable: Boolean(process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID)),
      artifactBridge: true,
      primaryProvider: "elevenlabs",
      secondaryProviders: [
        {
          providerId: "omnivoice",
          status: "experimental",
          role: "secondary",
          executable: false,
          productionApproved: false,
          commercialLicenseApproved: false
        }
      ]
    }
  },
  {
    capabilityId: "voice_synthesis",
    category: "voice",
    status: process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID)
      ? STATUS.CONNECTED
      : STATUS.NOT_CONNECTED,
    supportedActions: ["synthesize_voice", "create_voice_artifact"],
    providers: ["elevenlabs", "omnivoice"],
    preferredProvider: "elevenlabs",
    requiredPermissions: ["GENERATE_INTERNAL", "SAVE_INTERNAL"],
    costMode: "metered",
    health: process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID) ? "unknown" : "down",
    limits: { note: "Phase 19C declares Production voice synthesis; execution still requires explicit provider-call approval" },
    dependencies: ["ELEVENLABS_API_KEY", "ELEVENLABS_LISA_VOICE_ID"],
    internal: true,
    metadata: {
      declared: true,
      configured: Boolean(process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_LISA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID)),
      executable: false,
      artifactBridge: true,
      approvalRequired: true,
      primaryProvider: "elevenlabs",
      secondaryProviders: [
        {
          providerId: "omnivoice",
          status: "experimental",
          role: "secondary",
          executable: false,
          productionApproved: false,
          commercialLicenseApproved: false
        }
      ]
    }
  },
  {
    capabilityId: "knowledge_retrieval",
    category: "knowledge",
    status: STATUS.DEGRADED,
    supportedActions: ["retrieve_essa_knowledge"],
    providers: ["essa_knowledge_index"],
    preferredProvider: "essa_knowledge_index",
    requiredPermissions: ["READ"],
    costMode: "included",
    health: "degraded",
    limits: { note: "available when local/vector dependencies respond; caller must handle retrieval errors" },
    dependencies: ["knowledge_index"],
    internal: true,
    metadata: { declared: true, configured: true, executable: false }
  },
  {
    capabilityId: "local_execution",
    category: "execution",
    status: STATUS.READY,
    supportedActions: ["execute_internal_step", "create_chapter_draft"],
    providers: ["essa_local_execution"],
    preferredProvider: "essa_local_execution",
    requiredPermissions: ["GENERATE_INTERNAL", "SAVE_INTERNAL"],
    costMode: "included",
    health: "healthy",
    limits: { note: "safe internal deterministic execution only" },
    dependencies: [],
    internal: true,
    metadata: { declared: true, configured: true, executable: true }
  },
  {
    capabilityId: "youtube_publish",
    category: "publishing",
    status: STATUS.NOT_CONNECTED,
    supportedActions: ["publish_to_youtube", "external_action"],
    providers: [],
    preferredProvider: null,
    requiredPermissions: ["PUBLISH", "EXTERNAL_ACTION"],
    costMode: "unknown",
    health: "down",
    limits: { note: "YouTube account/provider is not connected" },
    dependencies: ["youtube_account", "youtube_api_provider"],
    internal: false,
    metadata: { declared: true, configured: false, executable: false }
  },
  {
    capabilityId: "tiktok_publish",
    category: "publishing",
    status: STATUS.NOT_CONNECTED,
    supportedActions: ["publish_to_tiktok", "external_action"],
    providers: [],
    preferredProvider: null,
    requiredPermissions: ["PUBLISH", "EXTERNAL_ACTION"],
    costMode: "unknown",
    health: "down",
    limits: { note: "TikTok account/provider is not connected" },
    dependencies: ["tiktok_account", "tiktok_api_provider"],
    internal: false,
    metadata: { declared: true, configured: false, executable: false }
  },
  {
    capabilityId: "external_video_generation",
    category: "video",
    status: STATUS.NOT_CONNECTED,
    supportedActions: ["generate_video", "render_video"],
    providers: [],
    preferredProvider: null,
    requiredPermissions: ["GENERATE_INTERNAL"],
    costMode: "paid",
    health: "down",
    limits: { note: "No external video provider is connected in Phase 9" },
    dependencies: ["video_provider"],
    internal: false,
    metadata: { declared: true, configured: false, executable: false }
  },
  {
    capabilityId: "external_image_generation",
    category: "image",
    status: STATUS.NOT_CONNECTED,
    supportedActions: ["generate_image"],
    providers: [],
    preferredProvider: null,
    requiredPermissions: ["GENERATE_INTERNAL"],
    costMode: "paid",
    health: "down",
    limits: { note: "No external image provider is connected in Phase 9" },
    dependencies: ["image_provider"],
    internal: false,
    metadata: { declared: true, configured: false, executable: false }
  },
  {
    capabilityId: "paid_capability_simulation",
    category: "billing",
    status: STATUS.REQUIRES_PAYMENT,
    supportedActions: ["paid_action"],
    providers: [],
    preferredProvider: null,
    requiredPermissions: ["PAID_ACTION"],
    costMode: "paid",
    health: "healthy",
    limits: { note: "simulation entry for policy tests; no billing execution" },
    dependencies: ["payment_confirmation"],
    internal: false,
    metadata: { declared: true, configured: false, executable: false }
  },
  {
    capabilityId: "degraded_capability_simulation",
    category: "diagnostics",
    status: STATUS.DEGRADED,
    supportedActions: ["degraded_action"],
    providers: ["diagnostic_provider"],
    preferredProvider: "diagnostic_provider",
    requiredPermissions: ["READ"],
    costMode: "included",
    health: "degraded",
    limits: { note: "simulation entry for degraded capability tests" },
    dependencies: ["diagnostic_dependency"],
    internal: true,
    metadata: { declared: true, configured: true, executable: false }
  }
];

function registryDisabled() {
  return process.env.ESSA_CAPABILITY_REGISTRY_DISABLED === "1";
}

function cloneCapability(capability) {
  return capability ? {
    ...capability,
    supportedActions: [...(capability.supportedActions || [])],
    providers: [...(capability.providers || [])],
    requiredPermissions: [...(capability.requiredPermissions || [])],
    dependencies: [...(capability.dependencies || [])],
    limits: { ...(capability.limits || {}) },
    metadata: { ...(capability.metadata || {}) }
  } : null;
}

function actionToCapabilityId(action = "") {
  const normalized = String(action || "").toLowerCase();

  if (normalized === "create_chapter_structure" || normalized === "create_chapter_outline") {
    return "production_chapter_outline";
  }

  if (normalized === "create_chapter_draft") {
    return "production_chapter_draft";
  }

  if (["save_project", "update_project_state", "save_chapter_artifact"].includes(normalized)) {
    return "internal_project_save";
  }

  if (["create_artifact", "update_artifact", "save_artifact"].includes(normalized)) {
    return "internal_artifact_update";
  }

  if (normalized.includes("youtube")) return "youtube_publish";
  if (normalized.includes("tiktok")) return "tiktok_publish";
  if (normalized.includes("publish") || normalized === "external_action") return "youtube_publish";
  if (normalized.includes("video")) return "external_video_generation";
  if (normalized.includes("image")) return "external_image_generation";
  if (normalized.includes("paid")) return "paid_capability_simulation";
  if (normalized.includes("degraded")) return "degraded_capability_simulation";

  return null;
}

export function getCapability(id) {
  if (!id) return null;

  return cloneCapability(capabilityDefinitions.find((item) => item.capabilityId === id) || null);
}

export function listCapabilities(filters = {}) {
  return capabilityDefinitions
    .filter((capability) => {
      if (filters.category && capability.category !== filters.category) return false;
      if (filters.status && capability.status !== filters.status) return false;
      if (typeof filters.internal === "boolean" && capability.internal !== filters.internal) return false;
      if (filters.action && !capability.supportedActions.includes(filters.action)) return false;
      return true;
    })
    .map(cloneCapability);
}

export function getCapabilityStatus(capabilityId) {
  return getCapability(capabilityId)?.status || STATUS.UNAVAILABLE;
}

export function getAvailableProviders(capabilityId) {
  const capability = getCapability(capabilityId);

  if (!capability || !EXECUTABLE_STATUSES.has(capability.status) || capability.health === "down") {
    return [];
  }

  const nonExecutableSecondaryProviders = new Set(
    (capability.metadata?.secondaryProviders || [])
      .filter((provider) => provider.executable === false)
      .map((provider) => provider.providerId)
  );

  return (capability.providers || []).filter((provider) =>
    !nonExecutableSecondaryProviders.has(provider)
  );
}

export function getCapabilityForAction(action = "") {
  const capabilityId = actionToCapabilityId(action);

  return capabilityId ? getCapability(capabilityId) : null;
}

export function canExecute(capabilityId, action = "", context = {}) {
  if (registryDisabled()) {
    return {
      executable: true,
      status: "REGISTRY_DISABLED",
      health: "unknown",
      capability: null,
      blockingReason: null,
      requiresConfirmation: false
    };
  }

  const capability = getCapability(capabilityId) || getCapabilityForAction(action);

  if (!capability) {
    return {
      executable: false,
      status: STATUS.UNAVAILABLE,
      health: "unknown",
      capability: null,
      blockingReason: "capability_not_declared",
      requiresConfirmation: false
    };
  }

  if (capability.status === STATUS.REQUIRES_PAYMENT) {
    return {
      executable: false,
      status: capability.status,
      health: capability.health,
      capability,
      blockingReason: "requires_payment",
      requiresConfirmation: true
    };
  }

  if (!EXECUTABLE_STATUSES.has(capability.status)) {
    return {
      executable: false,
      status: capability.status,
      health: capability.health,
      capability,
      blockingReason: `capability_${capability.status.toLowerCase()}`,
      requiresConfirmation: capability.status === STATUS.NOT_CONNECTED
    };
  }

  if (capability.health && !["healthy", "unknown"].includes(capability.health)) {
    return {
      executable: false,
      status: capability.status,
      health: capability.health,
      capability,
      blockingReason: `capability_health_${capability.health}`,
      requiresConfirmation: false
    };
  }

  const deniedPermission = (capability.requiredPermissions || []).find((permission) =>
    context.permissions?.[permission] === false
  );

  if (deniedPermission) {
    return {
      executable: false,
      status: capability.status,
      health: capability.health,
      capability,
      blockingReason: `permission_denied:${deniedPermission}`,
      requiresConfirmation: true
    };
  }

  return {
    executable: true,
    status: capability.status,
    health: capability.health,
    capability,
    blockingReason: null,
    requiresConfirmation: false
  };
}

function relevantCapabilityIds({ userText = "", workflowState = null, goalState = null } = {}) {
  const text = String(userText || "").toLowerCase();
  const ids = new Set(["navigator_routing"]);

  if (workflowState?.workflow === "production_book" || goalState?.subject === "chapter") {
    ids.add("production_chapter_outline");
    ids.add("production_chapter_draft");
    ids.add("internal_project_save");
    ids.add("internal_artifact_update");
    ids.add("local_execution");
  }

  if (text.includes("avatar") || text.includes("аватар") || text.includes("digital identity")) {
    ids.add("digital_identity_routing");
  }

  if (text.includes("voice") || text.includes("голос")) {
    ids.add("voice_transcription");
    ids.add("voice_tts");
  }

  if (text.includes("essa") || text.includes("knowledge") || text.includes("знани")) {
    ids.add("knowledge_retrieval");
  }

  if (text.includes("youtube") || text.includes("publish") || text.includes("опубли")) {
    ids.add("youtube_publish");
  }

  if (text.includes("tiktok")) {
    ids.add("tiktok_publish");
  }

  if (text.includes("paid")) {
    ids.add("paid_capability_simulation");
  }

  if (text.includes("degraded")) {
    ids.add("degraded_capability_simulation");
  }

  return [...ids];
}

export function buildSystemCapabilitySnapshot(context = {}) {
  const capabilities = relevantCapabilityIds(context)
    .map(getCapability)
    .filter(Boolean)
    .map((capability) => ({
      capabilityId: capability.capabilityId,
      category: capability.category,
      status: capability.status,
      health: capability.health,
      executable: EXECUTABLE_STATUSES.has(capability.status) && ["healthy", "unknown"].includes(capability.health),
      providers: capability.providers,
      preferredProvider: capability.preferredProvider,
      supportedActions: capability.supportedActions,
      costMode: capability.costMode,
      requiredPermissions: capability.requiredPermissions,
      internal: capability.internal,
      blockingReason: canExecute(capability.capabilityId, "", context).blockingReason
    }));

  return {
    registryEnabled: !registryDisabled(),
    generatedAt: new Date().toISOString(),
    capabilities
  };
}

export const capabilityStatuses = { ...STATUS };
