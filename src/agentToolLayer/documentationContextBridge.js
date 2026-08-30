import { buildContextPackage } from "./contextBudget.js";
import {
  createDocumentationContextPackage,
  validateDocumentationArtifact
} from "./providers/context7ExecutionProvider.js";

export const documentationContextStatuses = {
  ready: "READY",
  rejected: "REJECTED",
  notRelevant: "NOT_RELEVANT",
  refreshRequired: "DOCUMENTATION_REFRESH_REQUIRED"
};

const defaultTtlDays = 30;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase();
}

function approxTokens(chars) {
  return Math.ceil(Number(chars || 0) / 4);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

function versionMajor(version = "") {
  const match = String(version || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function isDocumentationRelevantToTask({
  artifact,
  task = {},
  requestedCapability = null
} = {}) {
  const text = normalizeText([
    task.title,
    task.description,
    task.prompt,
    task.library,
    task.packageName,
    safeArray(task.dependencies).join(" "),
    requestedCapability
  ].filter(Boolean).join(" "));
  const library = normalizeText(artifact?.library || "");
  const resolved = normalizeText(artifact?.resolvedLibraryId || "");
  const libraryTokens = [
    library,
    library.replace(/^@/, ""),
    resolved.replace(/^\//, "").replace(/\//g, " "),
    "supabase"
  ].filter(Boolean);

  const explicitCapabilityMatch = requestedCapability &&
    task.requestedCapability &&
    normalizeText(task.requestedCapability) === normalizeText(requestedCapability);

  return Boolean(text) && (
    libraryTokens.some((token) => token && text.includes(token)) ||
    explicitCapabilityMatch
  );
}

export function evaluateDocumentationRefresh({
  artifact,
  task = {},
  now = new Date(),
  ttlDays = defaultTtlDays
} = {}) {
  const retrievedAt = artifact?.retrievedAt ? new Date(artifact.retrievedAt) : null;
  const staleAfter = retrievedAt && !Number.isNaN(retrievedAt.getTime())
    ? addDays(retrievedAt, ttlDays)
    : null;
  const reasons = [];

  if (!retrievedAt || Number.isNaN(retrievedAt.getTime())) reasons.push("missing_retrieved_at");
  if (staleAfter && new Date(staleAfter) < now) reasons.push("artifact_stale");

  const requestedVersion = artifact?.requestedVersion || null;
  const taskVersion = task.version || task.requestedVersion || null;
  if (taskVersion && taskVersion !== requestedVersion) reasons.push("dependency_version_changed");
  if (task.query && artifact?.query && normalizeText(task.query) !== normalizeText(artifact.query)) {
    reasons.push("query_changed");
  }

  const artifactMajor = versionMajor(requestedVersion);
  const taskMajor = versionMajor(taskVersion || requestedVersion);
  const versionResolution = artifact?.provenance?.libraryResolution?.versionResolution ||
    artifact?.versionResolution ||
    {};
  if (task.requiresExactVersion && versionResolution.status !== "exact") {
    reasons.push("exact_version_not_covered");
  }
  if (artifactMajor && taskMajor && artifactMajor !== taskMajor) {
    reasons.push("major_version_changed");
  }

  return {
    status: reasons.length ? documentationContextStatuses.refreshRequired : "CURRENT",
    reasons,
    staleAfter,
    ttlDays
  };
}

export function createDocumentationContext({
  artifact,
  task = {},
  requestedCapability = "documentation_lookup",
  maxItems = 3,
  maxChars = 1200,
  now = new Date()
} = {}) {
  const validation = validateDocumentationArtifact(artifact);
  const verificationStatus = artifact?.verificationStatus || null;

  if (!validation.ok || verificationStatus !== "VERIFIED") {
    return {
      status: documentationContextStatuses.rejected,
      reason: "documentation_artifact_not_verified",
      validation,
      verificationStatus
    };
  }

  if (!isDocumentationRelevantToTask({ artifact, task, requestedCapability })) {
    return {
      status: documentationContextStatuses.notRelevant,
      reason: "documentation_not_relevant_to_task",
      requestedLibrary: artifact.library,
      traceId: artifact.traceId
    };
  }

  const refresh = evaluateDocumentationRefresh({ artifact, task, now });
  if (refresh.status === documentationContextStatuses.refreshRequired && refresh.reasons.includes("major_version_changed")) {
    return {
      status: documentationContextStatuses.refreshRequired,
      reason: "major_version_changed",
      refresh
    };
  }

  const packageResult = createDocumentationContextPackage({ artifact, maxItems, maxChars });
  if (packageResult.blocked) {
    return {
      status: documentationContextStatuses.rejected,
      reason: packageResult.reason,
      validation: packageResult.validation
    };
  }

  const selectedSnippets = packageResult.selected.map((snippet) => ({
    id: snippet.id,
    text: snippet.text,
    relevance: snippet.relevance,
    source: "verified_documentation",
    relevanceReason: "matches current coding task/library and bounded ContextBudget"
  }));
  const boundedChars = packageResult.budget.usedChars;

  return {
    status: documentationContextStatuses.ready,
    capability: requestedCapability,
    requestedLibrary: artifact.library,
    requestedVersion: artifact.requestedVersion,
    resolvedLibraryId: artifact.resolvedLibraryId,
    versionResolution: artifact.provenance?.libraryResolution?.versionResolution || null,
    query: artifact.query,
    selectedSnippets,
    provenanceRefs: safeArray(artifact.sourceRefs).map((ref) => ({
      sourceId: ref.sourceId,
      title: ref.title || null
    })),
    verificationStatus,
    retrievedAt: artifact.retrievedAt,
    relevanceReason: "task references the documented dependency/capability",
    boundedChars,
    approximateTokens: approxTokens(boundedChars),
    staleAfter: refresh.staleAfter,
    refreshStatus: refresh.status,
    refreshReasons: refresh.reasons,
    traceId: artifact.traceId,
    policy: {
      providerIndependent: true,
      fullArtifactExcludedFromModelContext: true,
      providerAccessAllowedForConsumer: false,
      exactPatchDocumentationConfirmed: artifact.resolvedVersion === artifact.requestedVersion
    }
  };
}

export function buildContextPackWithDocumentation({
  task = {},
  projectContext = {},
  sourceFiles = [],
  documentationArtifacts = [],
  allowedTools = [],
  policy = {},
  maxDocumentationItems = 3,
  maxDocumentationChars = 1200
} = {}) {
  const contexts = safeArray(documentationArtifacts)
    .map((artifact) => createDocumentationContext({
      artifact,
      task,
      requestedCapability: "documentation_lookup",
      maxItems: maxDocumentationItems,
      maxChars: maxDocumentationChars
    }))
    .filter((context) => context.status === documentationContextStatuses.ready);

  return {
    task,
    projectContext,
    sourceFiles: safeArray(sourceFiles),
    documentationContext: contexts[0] || null,
    allowedTools: safeArray(allowedTools),
    policy: {
      sourceOfTruth: "ESSA Core",
      providerMayExpandContext: false,
      modelsMayContactDocumentationProviders: false,
      ...(policy || {})
    }
  };
}

export function buildCodingAgentRequest({
  task,
  projectContext = {},
  sourceFiles = [],
  documentationArtifacts = [],
  allowedTools = [],
  policy = {}
} = {}) {
  const contextPack = buildContextPackWithDocumentation({
    task,
    projectContext,
    sourceFiles,
    documentationArtifacts,
    allowedTools,
    policy
  });

  return {
    requestId: task?.requestId || "coding_agent_documentation_context_request",
    agentType: "coding",
    task,
    contextPack,
    allowedTools: contextPack.allowedTools,
    policy: contextPack.policy,
    providerCallMade: false
  };
}

export function createDocumentationContextAuditReport(documentationContext = {}) {
  return {
    status: documentationContext.status,
    capability: documentationContext.capability,
    library: documentationContext.requestedLibrary,
    requestedVersion: documentationContext.requestedVersion,
    resolvedLibraryId: documentationContext.resolvedLibraryId,
    versionResolution: documentationContext.versionResolution,
    verificationStatus: documentationContext.verificationStatus,
    snippetsSelected: safeArray(documentationContext.selectedSnippets).length,
    provenanceRefs: documentationContext.provenanceRefs,
    contextSize: {
      boundedChars: documentationContext.boundedChars || 0,
      approximateTokens: documentationContext.approximateTokens || 0
    },
    refreshStatus: documentationContext.refreshStatus,
    refreshReasons: documentationContext.refreshReasons || [],
    traceId: documentationContext.traceId
  };
}

export function buildMemoryContextForCodingAgent(documentationContext = {}) {
  return buildContextPackage({
    intent: "coding_agent_documentation_context",
    maxItems: safeArray(documentationContext.selectedSnippets).length,
    maxChars: documentationContext.boundedChars || 0,
    memoryItems: safeArray(documentationContext.selectedSnippets).map((snippet) => ({
      id: snippet.id,
      text: snippet.text,
      relevance: snippet.relevance,
      source: snippet.source
    }))
  });
}
