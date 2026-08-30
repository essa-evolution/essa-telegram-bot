import fs from "fs";
import path from "path";
import { buildContextPackage } from "../contextBudget.js";
import { executionGateDecisions } from "../executionGateway.js";
import { redactForTrace } from "../policy.js";

export const context7ProviderId = "context7";
export const context7McpEndpoint = "https://mcp.context7.com/mcp";
export const context7ToolNames = {
  resolveLibraryId: "resolve-library-id",
  queryDocs: "query-docs",
  legacyGetLibraryDocs: "get-library-docs"
};
export const context7ResultStatuses = {
  libraryResolutionFailed: "LIBRARY_RESOLUTION_FAILED",
  ambiguousLibraryResolution: "AMBIGUOUS_LIBRARY_RESOLUTION",
  libraryNotFound: "LIBRARY_NOT_FOUND",
  versionNotResolved: "VERSION_NOT_RESOLVED",
  queryDocsFailed: "QUERY_DOCS_FAILED",
  providerErrorContent: "PROVIDER_ERROR_CONTENT",
  validDocumentationResult: "VALID_DOCUMENTATION_RESULT"
};

const documentationCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cacheKey({ library, requestedVersion, query }) {
  return `${library || ""}::${requestedVersion || ""}::${query || ""}`.toLowerCase();
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function packageNameParts(name = "") {
  const cleaned = String(name || "").replace(/^@/, "");
  const [org = "", project = ""] = cleaned.split("/");
  return {
    org: org.toLowerCase(),
    project: project.toLowerCase(),
    normalized: normalizeText(cleaned)
  };
}

function versionMajor(version = "") {
  const match = String(version || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parsePossiblySse(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== "[DONE]");
  const last = dataLines.at(-1);

  return last ? JSON.parse(last) : null;
}

function extractTextFromMcpResult(result = {}) {
  const content = safeArray(result.content);
  const text = content
    .map((item) => item?.text || item?.content || "")
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return text || result.text || "";
}

function looksLikeProviderError(text = "") {
  return /^(input validation error|invalid arguments|tool execution error|error:|library ".+" not found)/i.test(String(text || "").trim()) ||
    /check the library id or your access permissions/i.test(String(text || ""));
}

function extractLibraryIdsFromText(text = "") {
  return [...String(text || "").matchAll(/\/[a-z0-9_.-]+\/[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)?/gi)]
    .map((match) => match[0]);
}

function normalizeCandidate(raw = {}, index = 0) {
  const libraryId = raw.libraryId || raw.id || raw.context7CompatibleLibraryID || raw.context7CompatibleLibraryId || raw.value || null;
  if (!libraryId || !String(libraryId).startsWith("/")) return null;

  return {
    libraryId,
    title: raw.title || raw.name || raw.packageName || null,
    description: raw.description || raw.summary || raw.text || null,
    versions: safeArray(raw.versions || raw.availableVersions || raw.version),
    trustScore: Number.isFinite(Number(raw.trustScore ?? raw.trust_score ?? raw.score))
      ? Number(raw.trustScore ?? raw.trust_score ?? raw.score)
      : null,
    snippetCount: Number.isFinite(Number(raw.snippetCount ?? raw.codeSnippets ?? raw.snippets))
      ? Number(raw.snippetCount ?? raw.codeSnippets ?? raw.snippets)
      : null,
    relevance: Number.isFinite(Number(raw.relevance))
      ? Number(raw.relevance)
      : Math.max(0, 1 - index * 0.05)
  };
}

export function normalizeContext7Candidates(resolveResult = {}) {
  const directLists = [
    resolveResult.candidates,
    resolveResult.results,
    resolveResult.libraries,
    resolveResult.matches,
    resolveResult.data
  ].find(Array.isArray);
  const directCandidates = safeArray(directLists)
    .map(normalizeCandidate)
    .filter(Boolean);

  if (directCandidates.length) return directCandidates;

  const direct = normalizeCandidate(resolveResult, 0);
  if (direct) return [direct];

  const text = extractTextFromMcpResult(resolveResult);
  return extractLibraryIdsFromText(text)
    .map((libraryId, index) => normalizeCandidate({ libraryId, description: text }, index))
    .filter(Boolean);
}

export function createLibraryResolutionResult({
  requestedLibraryName,
  requestedPackageVersion = null,
  query = "",
  candidates = [],
  selectedLibraryId = null,
  selectionReason = null,
  resolvedVersion = null,
  versionResolution = null,
  status = "RESOLVED"
} = {}) {
  return {
    requestedLibraryName,
    requestedPackageVersion,
    query,
    candidates,
    selectedLibraryId,
    selectionReason,
    resolvedVersion,
    versionResolution: versionResolution || {
      status: resolvedVersion ? "resolved" : context7ResultStatuses.versionNotResolved,
      resolvedVersion,
      compatibleMajor: versionMajor(requestedPackageVersion)
    },
    status
  };
}

function candidateScore(candidate, requestedLibraryName, requestedPackageVersion) {
  const parts = packageNameParts(requestedLibraryName);
  const haystack = normalizeText([
    candidate.libraryId,
    candidate.title,
    candidate.description
  ].filter(Boolean).join(" "));
  const idText = normalizeText(candidate.libraryId);
  const exactProject = idText.includes(parts.normalized) ||
    (parts.org && parts.project && idText.includes(parts.org) && idText.includes(parts.project));
  const officialOrg = parts.org && candidate.libraryId.toLowerCase().startsWith(`/${parts.org}/`);
  const projectMatch = parts.project && haystack.includes(parts.project);
  const major = versionMajor(requestedPackageVersion);
  const versionCompatible = major
    ? safeArray(candidate.versions).some((version) => versionMajor(version) === major)
    : false;

  return {
    score:
      (exactProject ? 100 : 0) +
      (officialOrg ? 40 : 0) +
      (projectMatch ? 25 : 0) +
      (Number(candidate.trustScore || 0) * 2) +
      Math.min(Number(candidate.snippetCount || 0), 20) +
      Number(candidate.relevance || 0) * 10 +
      (versionCompatible ? 15 : 0),
    exactProject,
    officialOrg,
    projectMatch,
    versionCompatible
  };
}

function resolveVersionStatus(candidate, requestedPackageVersion) {
  const requestedMajor = versionMajor(requestedPackageVersion);
  if (!requestedPackageVersion) {
    return {
      status: "not_requested",
      resolvedVersion: null,
      compatibleMajor: null
    };
  }

  const versions = safeArray(candidate?.versions);
  if (!versions.length) {
    return {
      status: context7ResultStatuses.versionNotResolved,
      resolvedVersion: null,
      compatibleMajor: requestedMajor
    };
  }

  const compatible = versions.find((version) => versionMajor(version) === requestedMajor);
  return {
    status: compatible ? "compatible_major" : context7ResultStatuses.versionNotResolved,
    resolvedVersion: compatible || null,
    compatibleMajor: requestedMajor
  };
}

export function selectContext7LibraryCandidate({
  requestedLibraryName,
  requestedPackageVersion = null,
  query = "",
  candidates = []
} = {}) {
  const normalizedCandidates = safeArray(candidates);
  if (!normalizedCandidates.length) {
    return createLibraryResolutionResult({
      requestedLibraryName,
      requestedPackageVersion,
      query,
      candidates: [],
      status: context7ResultStatuses.libraryNotFound,
      selectionReason: "no_context7_candidates_returned"
    });
  }

  const ranked = normalizedCandidates
    .map((candidate) => ({
      ...candidate,
      _selection: candidateScore(candidate, requestedLibraryName, requestedPackageVersion)
    }))
    .sort((a, b) => b._selection.score - a._selection.score);
  const [best, second] = ranked;
  const bestSignals = best?._selection || {};

  if (!bestSignals.exactProject && !bestSignals.officialOrg && !bestSignals.projectMatch) {
    return createLibraryResolutionResult({
      requestedLibraryName,
      requestedPackageVersion,
      query,
      candidates: ranked.map(({ _selection, ...candidate }) => candidate),
      status: context7ResultStatuses.ambiguousLibraryResolution,
      selectionReason: "top_candidate_does_not_match_requested_package"
    });
  }

  if (second && (best._selection.score - second._selection.score < 10)) {
    return createLibraryResolutionResult({
      requestedLibraryName,
      requestedPackageVersion,
      query,
      candidates: ranked.map(({ _selection, ...candidate }) => candidate),
      status: context7ResultStatuses.ambiguousLibraryResolution,
      selectionReason: "top_candidates_too_close_to_choose_safely"
    });
  }

  const versionResolution = resolveVersionStatus(best, requestedPackageVersion);
  return createLibraryResolutionResult({
    requestedLibraryName,
    requestedPackageVersion,
    query,
    candidates: ranked.map(({ _selection, ...candidate }) => candidate),
    selectedLibraryId: best.libraryId,
    selectionReason: [
      bestSignals.exactProject ? "exact_package_or_project_match" : null,
      bestSignals.officialOrg ? "official_organization_match" : null,
      bestSignals.projectMatch ? "project_name_match" : null,
      bestSignals.versionCompatible ? "major_version_compatible" : null
    ].filter(Boolean).join(";"),
    resolvedVersion: versionResolution.resolvedVersion,
    versionResolution,
    status: "RESOLVED"
  });
}

export function resolveContext7LibraryResult({
  requestedLibraryName,
  requestedPackageVersion = null,
  query = "",
  resolveResult = {}
} = {}) {
  const content = extractTextFromMcpResult(resolveResult);
  if (resolveResult?.isError || looksLikeProviderError(content)) {
    return createLibraryResolutionResult({
      requestedLibraryName,
      requestedPackageVersion,
      query,
      candidates: [],
      status: context7ResultStatuses.libraryResolutionFailed,
      selectionReason: content.slice(0, 240) || "context7_resolution_error"
    });
  }

  return selectContext7LibraryCandidate({
    requestedLibraryName,
    requestedPackageVersion,
    query,
    candidates: normalizeContext7Candidates(resolveResult)
  });
}

function createSourceRefs(result = {}, endpoint = context7McpEndpoint) {
  const content = safeArray(result.content);
  const refs = content
    .map((item, index) => ({
      sourceId: item?.uri || item?.source || `context7_content_${index + 1}`,
      title: item?.title || item?.name || null,
      provider: context7ProviderId
    }));

  return refs.length
    ? refs
    : [{ sourceId: endpoint, title: "Context7 MCP documentation result", provider: context7ProviderId }];
}

async function postMcpJsonRpc({
  endpoint = context7McpEndpoint,
  apiKey = process.env.CONTEXT7_API_KEY || null,
  sessionId = null,
  payload,
  timeoutMs = 30000
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "content-type": "application/json",
    "accept": "application/json, text/event-stream"
  };

  if (sessionId) headers["mcp-session-id"] = sessionId;
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const responseText = await response.text();
    const parsed = responseText ? parsePossiblySse(responseText) : null;

    return {
      ok: response.ok,
      status: response.status,
      sessionId: response.headers.get("mcp-session-id") || sessionId,
      body: parsed,
      error: response.ok ? null : parsed?.error || { message: `HTTP ${response.status}` }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function defaultContext7Transport({
  library,
  requestedVersion,
  query,
  endpoint = context7McpEndpoint,
  timeoutMs = 30000
} = {}) {
  const initialize = await postMcpJsonRpc({
    endpoint,
    timeoutMs,
    payload: {
      jsonrpc: "2.0",
      id: "essa_context7_initialize",
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: {
          name: "essa-agent-tool-layer",
          version: "1.0.0"
        }
      }
    }
  });

  if (!initialize.ok) return initialize;
  const sessionId = initialize.sessionId;

  await postMcpJsonRpc({
    endpoint,
    sessionId,
    timeoutMs,
    payload: {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    }
  }).catch(() => null);

  const resolve = await postMcpJsonRpc({
    endpoint,
    sessionId,
    timeoutMs,
    payload: {
      jsonrpc: "2.0",
      id: "essa_context7_resolve",
      method: "tools/call",
      params: {
        name: context7ToolNames.resolveLibraryId,
        arguments: {
          libraryName: library,
          query
        }
      }
    }
  });

  if (!resolve.ok) return resolve;
  const resolution = resolveContext7LibraryResult({
    requestedLibraryName: library,
    requestedPackageVersion: requestedVersion,
    query,
    resolveResult: resolve.body?.result
  });

  if (resolution.status !== "RESOLVED") {
    return {
      ok: false,
      status: resolution.status,
      error: { message: resolution.selectionReason || resolution.status },
      providerCallMade: true,
      resolution
    };
  }

  const docs = await postMcpJsonRpc({
    endpoint,
    sessionId,
    timeoutMs,
    payload: {
      jsonrpc: "2.0",
      id: "essa_context7_query",
      method: "tools/call",
      params: {
        name: context7ToolNames.queryDocs,
        arguments: {
          libraryId: resolution.selectedLibraryId,
          query
        }
      }
    }
  });

  return {
    ...docs,
    resolvedLibraryId: resolution.selectedLibraryId,
    resolvedVersion: resolution.resolvedVersion,
    resolution,
    resolveResult: resolve.body?.result
  };
}

export function createDocumentationArtifact({
  providerId = context7ProviderId,
  capability = "documentation_lookup",
  library,
  requestedVersion,
  resolvedLibraryId,
  resolvedVersion = null,
  query,
  content,
  snippets = [],
  sourceRefs = [],
  projectId = null,
  taskId = null,
  traceId = null,
  provenance = {}
} = {}) {
  return redactForTrace({
    artifactId: createId("documentation_result"),
    type: "documentation_result",
    providerId,
    capability,
    library,
    requestedVersion,
    resolvedLibraryId,
    resolvedVersion,
    query,
    content,
    snippets,
    sourceRefs,
    retrievedAt: nowIso(),
    projectId,
    taskId,
    traceId,
    readOnly: true,
    provenance
  });
}

export function validateDocumentationArtifact(artifact = {}) {
  const errors = [];

  if (artifact.type !== "documentation_result") errors.push("invalid_type");
  if (!artifact.providerId) errors.push("missing_provider_id");
  if (!artifact.library) errors.push("missing_library");
  if (!artifact.query) errors.push("missing_query");
  if (!artifact.content || !String(artifact.content).trim()) errors.push("empty_content");
  if (looksLikeProviderError(artifact.content)) errors.push("provider_error_content");
  if (artifact.readOnly !== true) errors.push("not_read_only");
  if (!safeArray(artifact.sourceRefs).length) errors.push("missing_source_refs");
  if (!artifact.taskId || !artifact.projectId || !artifact.traceId) errors.push("missing_task_project_trace");
  if (!artifact.provenance?.libraryResolution || artifact.provenance.libraryResolution.status !== "RESOLVED") {
    errors.push("missing_verified_library_resolution");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function verifyDocumentationResult({
  artifact,
  expectedLibrary,
  beforeSnapshot = {},
  afterSnapshot = {}
} = {}) {
  const validation = validateDocumentationArtifact(artifact);
  const libraryMatches = String(artifact?.library || "").toLowerCase() === String(expectedLibrary || "").toLowerCase() ||
    String(artifact?.resolvedLibraryId || "").toLowerCase().includes(String(expectedLibrary || "").replace(/^@/, "").toLowerCase());
  const noFileChanges = beforeSnapshot.fileMutationCount === afterSnapshot.fileMutationCount;
  const noDatabaseChanges = beforeSnapshot.databaseMutationCount === afterSnapshot.databaseMutationCount;

  return {
    ok: validation.ok &&
      libraryMatches &&
      artifact?.readOnly === true &&
      noFileChanges &&
      noDatabaseChanges &&
      safeArray(artifact.sourceRefs).length > 0,
    validation,
    checks: {
      nonEmptyResult: Boolean(artifact?.content),
      libraryMatches,
      readOnly: artifact?.readOnly === true,
      noFileChanges,
      noDatabaseChanges,
      provenanceExists: Boolean(artifact?.provenance?.providerId || artifact?.providerId),
      linkedToTaskProjectTrace: Boolean(artifact?.taskId && artifact?.projectId && artifact?.traceId)
    }
  };
}

export function createDocumentationContextPackage({
  artifact,
  maxItems = 3,
  maxChars = 2000
} = {}) {
  const validation = validateDocumentationArtifact(artifact);
  if (!validation.ok) {
    return {
      intent: "documentation_lookup",
      selected: [],
      omittedCount: safeArray(artifact?.snippets).length,
      budget: { maxItems, maxChars, usedChars: 0 },
      blocked: true,
      reason: "documentation_artifact_not_verified",
      validation,
      policy: {
        neverSendFullMemoryAutomatically: true,
        sourceOfTruth: "ESSA Core",
        providerMayExpandContext: false
      }
    };
  }

  const chunks = safeArray(artifact?.snippets).length
    ? artifact.snippets
    : String(artifact?.content || "")
      .split(/\n{2,}/)
      .filter(Boolean)
      .slice(0, 8)
      .map((text, index) => ({
        id: `${artifact.artifactId}_snippet_${index + 1}`,
        text,
        relevance: index === 0 ? 1 : 0.7 - index * 0.05,
        source: artifact.providerId
      }));
  const perItemBudget = Math.max(80, Math.floor(maxChars / Math.max(1, maxItems)));

  return buildContextPackage({
    intent: "documentation_lookup",
    maxItems,
    maxChars,
    memoryItems: chunks.map((snippet, index) => ({
      id: snippet.id || `${artifact.artifactId}_snippet_${index + 1}`,
      text: String(snippet.text || snippet).slice(0, perItemBudget),
      relevance: snippet.relevance ?? (index === 0 ? 1 : 0.5),
      source: snippet.source || artifact.providerId
    }))
  });
}

export function createContext7ExecutionProvider({
  transport = defaultContext7Transport,
  endpoint = context7McpEndpoint,
  timeoutMs = 30000
} = {}) {
  return {
    providerId: context7ProviderId,
    toolIds: ["documentation.context7.mock"],
    capabilities: ["documentation_lookup", "versioned_library_docs", "api_reference_lookup"],
    status: "controlled_read_only",
    health: "unknown",
    executable: false,
    readOnly: true,
    external: true,
    endpoint,
    async executeDocumentationLookup({
      executionIntent,
      gateResult,
      allowExternalRead = false
    } = {}) {
      if (gateResult?.decision !== executionGateDecisions.ready) {
        return {
          ok: false,
          status: "BLOCKED",
          reason: "execution_gate_not_ready",
          providerCallMade: false
        };
      }

      if (!allowExternalRead) {
        return {
          ok: false,
          status: "BLOCKED",
          reason: "external_read_not_approved",
          providerCallMade: false
        };
      }

      const input = gateResult.safeInput || executionIntent.normalizedInput || {};
      const library = input.library || input.packageName || input.scope || null;
      const requestedVersion = input.version || input.requestedVersion || null;
      const query = input.query || input.topic || input.question || "documentation lookup";
      const key = cacheKey({ library, requestedVersion, query });

      if (documentationCache.has(key)) {
        return {
          ok: true,
          status: "CACHE_HIT",
          providerCallMade: false,
          artifact: documentationCache.get(key)
        };
      }

      const response = await transport({
        library,
        requestedVersion,
        query,
        endpoint,
        timeoutMs
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status || context7ResultStatuses.queryDocsFailed,
          reason: response.error?.message || "context7_provider_failed",
          providerCallMade: true,
          errorType: response.error?.type || null,
          resolution: response.resolution || null
        };
      }

      const result = response.body?.result || response.result || {};
      const content = extractTextFromMcpResult(result);
      if (!content) {
        return {
          ok: false,
          status: "MALFORMED_PROVIDER_RESPONSE",
          reason: "empty_documentation_content",
          providerCallMade: true
        };
      }
      if (result.isError || looksLikeProviderError(content)) {
        return {
          ok: false,
          status: context7ResultStatuses.providerErrorContent,
          reason: content.slice(0, 240),
          providerCallMade: true,
          resolution: response.resolution || null
        };
      }

      const libraryResolution = response.resolution || createLibraryResolutionResult({
        requestedLibraryName: library,
        requestedPackageVersion: requestedVersion,
        query,
        selectedLibraryId: response.resolvedLibraryId,
        resolvedVersion: response.resolvedVersion || null,
        status: response.resolvedLibraryId ? "RESOLVED" : context7ResultStatuses.libraryResolutionFailed,
        selectionReason: "transport_provided_resolution"
      });

      const artifact = createDocumentationArtifact({
        providerId: context7ProviderId,
        capability: "documentation_lookup",
        library,
        requestedVersion,
        resolvedLibraryId: response.resolvedLibraryId || input.resolvedLibraryId || library,
        resolvedVersion: response.resolvedVersion || libraryResolution.resolvedVersion || null,
        query,
        content,
        snippets: content
          .split(/\n{2,}/)
          .filter(Boolean)
          .slice(0, 6)
          .map((text, index) => ({
            id: `context7_snippet_${index + 1}`,
            text,
            relevance: index === 0 ? 1 : 0.6
          })),
        sourceRefs: createSourceRefs(result, endpoint),
        projectId: executionIntent.projectId,
        taskId: executionIntent.taskId,
        traceId: executionIntent.traceId,
        provenance: {
          providerId: context7ProviderId,
          endpoint,
          mcpTools: [context7ToolNames.resolveLibraryId, context7ToolNames.queryDocs],
          libraryResolution,
          providerCallMade: true,
          readOnly: true
        }
      });

      documentationCache.set(key, artifact);

      return {
        ok: true,
        status: context7ResultStatuses.validDocumentationResult,
        providerCallMade: true,
        artifact
      };
    }
  };
}

export function saveDocumentationArtifact(artifact, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return outputPath;
}

export function clearDocumentationCache() {
  documentationCache.clear();
}
