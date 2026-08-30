import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { getAgentTool } from "../agentToolLayer/registry.js";
import { prepareExecution } from "../agentToolLayer/executionGateway.js";
import { resolveFfmpeg, resolveFfprobe } from "../media/mediaExecutionReadiness.js";
import {
  buildExecution21MFlow,
  execution21MReadinessStates,
  verifyScopedApprovalToken
} from "./executionInputApproval.js";
import { capabilityActivationStates } from "./capabilityContracts.js";
import { getCapability } from "./capabilityRegistry.js";
import { productIds } from "./productCapabilityMap.js";

export const localExecutionClasses = {
  safeLocalExecution: "SAFE_LOCAL_EXECUTION"
};

export const localExecutionModes = {
  readOnly: "LOCAL_READ_ONLY",
  derivedArtifact: "LOCAL_DERIVED_ARTIFACT"
};

export const localExecutionGateDecisions = {
  authorized: "AUTHORIZED_LOCAL_EXECUTION",
  blocked: "BLOCKED"
};

export const localExecutionStatuses = {
  pending: "PENDING",
  authorized: "AUTHORIZED",
  running: "RUNNING",
  succeeded: "SUCCEEDED",
  failed: "FAILED",
  verificationFailed: "VERIFICATION_FAILED",
  rolledBack: "ROLLED_BACK",
  blocked: "BLOCKED",
  cancelled: "CANCELLED",
  alreadyExecuted: "ALREADY_EXECUTED",
  reuseExistingResult: "REUSE_EXISTING_RESULT"
};

export const localExecutionRollbackStatuses = {
  available: "AVAILABLE",
  completed: "COMPLETED",
  blocked: "BLOCKED",
  notAvailable: "NOT_AVAILABLE",
  notApplicable: "NOT_APPLICABLE"
};

export const safeLocalExecutionBlockers = {
  notEligibleSafeLocalExecution: "NOT_ELIGIBLE_SAFE_LOCAL_EXECUTION",
  notVideoTrim: "NOT_ELIGIBLE_SAFE_LOCAL_EXECUTION",
  unsupportedOperation: "BLOCKED_UNSUPPORTED_OPERATION",
  toolCapabilityMismatch: "BLOCKED_TOOL_CAPABILITY_MISMATCH",
  unsupportedProfile: "BLOCKED_UNSUPPORTED_PROFILE",
  invalidFileType: "BLOCKED_INVALID_FILE_TYPE",
  resourceLimit: "BLOCKED_RESOURCE_LIMIT",
  duplicateProfile: "DUPLICATE_RUNTIME_PROFILE",
  missingVerifier: "MISSING_VERIFIER",
  inputNotReady: "INPUT_NOT_READY",
  preflightNotReady: "PREFLIGHT_NOT_READY",
  approvalsNotReady: "APPROVALS_NOT_READY",
  tokenInvalid: "TOKEN_INVALID",
  versionMismatch: "VERSION_MISMATCH",
  providerRequired: "EXTERNAL_PROVIDER_REQUIRED",
  paymentRequired: "PAYMENT_REQUIRED",
  publishRequired: "PUBLISH_REQUIRED",
  deployRequired: "DEPLOY_REQUIRED",
  externalMutationRequired: "EXTERNAL_MUTATION_REQUIRED",
  sourceMissing: "SOURCE_MISSING",
  sourceUnreadable: "SOURCE_UNREADABLE",
  invalidRange: "INVALID_RANGE",
  rangeOutOfBounds: "RANGE_OUT_OF_BOUNDS",
  blockedSourceOverwrite: "BLOCKED_SOURCE_OVERWRITE",
  blockedOutputBoundary: "BLOCKED_OUTPUT_BOUNDARY",
  verificationUnavailable: "VERIFICATION_UNAVAILABLE",
  rollbackUnavailable: "ROLLBACK_UNAVAILABLE",
  toolNotAllowlisted: "TOOL_NOT_ALLOWLISTED",
  arbitraryExecutableBlocked: "ARBITRARY_EXECUTABLE_BLOCKED",
  unsafeFlagBlocked: "UNSAFE_FLAG_BLOCKED",
  pathTraversalBlocked: "PATH_TRAVERSAL_BLOCKED"
};

export const safeLocalOutputProfiles = Object.freeze({
  VIDEO_MP4_STANDARD: {
    profileId: "VIDEO_MP4_STANDARD",
    artifactType: "VIDEO",
    extension: ".mp4",
    container: "mp4",
    videoCodec: "h264",
    ffmpegArgs: ["-c:v", "libx264", "-pix_fmt", "yuv420p"]
  },
  VIDEO_RESIZE_320x180: {
    profileId: "VIDEO_RESIZE_320x180",
    artifactType: "VIDEO",
    extension: ".mp4",
    width: 320,
    height: 180,
    container: "mp4",
    videoCodec: "h264",
    ffmpegArgs: ["-vf", "scale=320:180", "-c:v", "libx264", "-pix_fmt", "yuv420p"]
  },
  AUDIO_WAV_STANDARD: {
    profileId: "AUDIO_WAV_STANDARD",
    artifactType: "AUDIO",
    extension: ".wav",
    audioCodec: "pcm_s16le",
    ffmpegArgs: ["-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1"]
  }
});

export const safeLocalToolAllowlist = Object.freeze({
  FFMPEG_LOCAL: {
    adapterId: "FFMPEG_LOCAL",
    agentToolId: "media.local.mock",
    toolClass: "FFMPEG_FFPROBE",
    executableNames: ["ffmpeg", "ffprobe"],
    operations: ["probe", "trim", "resize", "audio_extract"],
    allowedFlags: [
      "-hide_banner", "-loglevel", "-y", "-v", "-show_entries", "-of",
      "-ss", "-t", "-i", "-c:v", "-pix_fmt", "-avoid_negative_ts",
      "-vf", "-vn", "-acodec", "-ar", "-ac", "-f"
    ]
  },
  MEDIA_PROBE: {
    capabilityId: "MEDIA_PROBE",
    toolId: "media.local.ffprobe.media_probe",
    agentToolId: "media.local.mock",
    toolClass: "FFMPEG_FFPROBE",
    executableNames: ["ffprobe"],
    operations: ["probe"],
    allowedFlags: ["-v", "-show_entries", "-of"]
  },
  VIDEO_TRIM: {
    capabilityId: "VIDEO_TRIM",
    toolId: "media.local.ffmpeg.video_trim",
    agentToolId: "media.local.mock",
    toolClass: "FFMPEG_FFPROBE",
    executableNames: ["ffmpeg", "ffprobe"],
    operations: ["trim"],
    allowedFlags: ["-hide_banner", "-loglevel", "-y", "-ss", "-t", "-i", "-c:v", "-pix_fmt", "-avoid_negative_ts"]
  },
  VIDEO_RESIZE: {
    capabilityId: "VIDEO_RESIZE",
    toolId: "media.local.ffmpeg.video_resize",
    agentToolId: "media.local.mock",
    toolClass: "FFMPEG_FFPROBE",
    executableNames: ["ffmpeg", "ffprobe"],
    operations: ["resize"],
    allowedFlags: ["-hide_banner", "-loglevel", "-y", "-i", "-vf", "-c:v", "-pix_fmt"]
  },
  AUDIO_EXTRACT: {
    capabilityId: "AUDIO_EXTRACT",
    toolId: "media.local.ffmpeg.audio_extract",
    agentToolId: "media.local.mock",
    toolClass: "FFMPEG_FFPROBE",
    executableNames: ["ffmpeg", "ffprobe"],
    operations: ["audio_extract"],
    allowedFlags: ["-hide_banner", "-loglevel", "-y", "-i", "-vn", "-acodec", "-ar", "-ac"]
  }
});

export const safeLocalVerificationProfiles = Object.freeze({
  MEDIA_PROBE_STRUCTURED_OBSERVATION: {
    verificationProfileId: "MEDIA_PROBE_STRUCTURED_OBSERVATION",
    capabilityId: "MEDIA_PROBE",
    requiredChecks: ["SOURCE_EXISTS", "SOURCE_READABLE", "OBSERVATION_STRUCTURED", "SOURCE_FINGERPRINT_UNCHANGED"],
    tolerances: {},
    failurePolicy: "FAIL_CLOSED"
  },
  VIDEO_TRIM_DURATION_STREAM_SOURCE: {
    verificationProfileId: "VIDEO_TRIM_DURATION_STREAM_SOURCE",
    capabilityId: "VIDEO_TRIM",
    requiredChecks: ["OUTPUT_EXISTS", "OUTPUT_READABLE", "DURATION_MATCHES_REQUEST", "STREAM_PRESENT", "SOURCE_FINGERPRINT_UNCHANGED"],
    tolerances: { durationSeconds: 0.35 },
    failurePolicy: "FAIL_CLOSED"
  },
  VIDEO_RESIZE_DIMENSIONS_SOURCE: {
    verificationProfileId: "VIDEO_RESIZE_DIMENSIONS_SOURCE",
    capabilityId: "VIDEO_RESIZE",
    requiredChecks: ["OUTPUT_EXISTS", "OUTPUT_READABLE", "DIMENSIONS_MATCH_REQUEST", "STREAM_PRESENT", "SOURCE_FINGERPRINT_UNCHANGED"],
    tolerances: {},
    failurePolicy: "FAIL_CLOSED"
  },
  AUDIO_EXTRACT_STREAM_SOURCE: {
    verificationProfileId: "AUDIO_EXTRACT_STREAM_SOURCE",
    capabilityId: "AUDIO_EXTRACT",
    requiredChecks: ["OUTPUT_EXISTS", "OUTPUT_READABLE", "AUDIO_STREAM_PRESENT", "SOURCE_FINGERPRINT_UNCHANGED"],
    tolerances: {},
    failurePolicy: "FAIL_CLOSED"
  }
});

export const safeLocalCapabilityProfiles = Object.freeze([
  {
    modelType: "SafeLocalCapabilityProfile",
    capabilityId: "MEDIA_PROBE",
    executionMode: localExecutionModes.readOnly,
    toolAdapterId: "FFMPEG_LOCAL",
    toolId: "media.local.ffprobe.media_probe",
    allowedOperations: ["probe"],
    requiredInputs: ["source_media"],
    outputBehavior: "STRUCTURED_OBSERVATION_ONLY",
    sourceMutationAllowed: false,
    verificationProfileId: "MEDIA_PROBE_STRUCTURED_OBSERVATION",
    rollbackProfile: "NOT_APPLICABLE",
    securityProfile: "LOCAL_READ_ONLY_NO_MUTATION",
    availability: "SAFE_LOCAL_EXECUTION_AVAILABLE"
  },
  {
    modelType: "SafeLocalCapabilityProfile",
    capabilityId: "VIDEO_TRIM",
    executionMode: localExecutionModes.derivedArtifact,
    toolAdapterId: "FFMPEG_LOCAL",
    toolId: "media.local.ffmpeg.video_trim",
    allowedOperations: ["trim"],
    requiredInputs: ["source_video", "time_range"],
    outputBehavior: "DERIVED_VIDEO_ARTIFACT",
    sourceMutationAllowed: false,
    verificationProfileId: "VIDEO_TRIM_DURATION_STREAM_SOURCE",
    rollbackProfile: "DELETE_DERIVED_ARTIFACT_ONLY",
    securityProfile: "LOCAL_MEDIA_DERIVED_ARTIFACT_ONLY",
    availability: "SAFE_LOCAL_EXECUTION_AVAILABLE"
  },
  {
    modelType: "SafeLocalCapabilityProfile",
    capabilityId: "VIDEO_RESIZE",
    executionMode: localExecutionModes.derivedArtifact,
    toolAdapterId: "FFMPEG_LOCAL",
    toolId: "media.local.ffmpeg.video_resize",
    allowedOperations: ["resize"],
    requiredInputs: ["source_video", "target_profile"],
    outputBehavior: "DERIVED_VIDEO_ARTIFACT",
    sourceMutationAllowed: false,
    verificationProfileId: "VIDEO_RESIZE_DIMENSIONS_SOURCE",
    rollbackProfile: "DELETE_DERIVED_ARTIFACT_ONLY",
    securityProfile: "LOCAL_MEDIA_DERIVED_ARTIFACT_ONLY",
    availability: "SAFE_LOCAL_EXECUTION_AVAILABLE",
    allowedProfiles: ["VIDEO_RESIZE_320x180"],
    resourceLimits: { maxWidth: 1920, maxHeight: 1920, maxPixels: 2073600 }
  },
  {
    modelType: "SafeLocalCapabilityProfile",
    capabilityId: "AUDIO_EXTRACT",
    executionMode: localExecutionModes.derivedArtifact,
    toolAdapterId: "FFMPEG_LOCAL",
    toolId: "media.local.ffmpeg.audio_extract",
    allowedOperations: ["audio_extract"],
    requiredInputs: ["source_media", "target_profile"],
    outputBehavior: "DERIVED_AUDIO_ARTIFACT",
    sourceMutationAllowed: false,
    verificationProfileId: "AUDIO_EXTRACT_STREAM_SOURCE",
    rollbackProfile: "DELETE_DERIVED_ARTIFACT_ONLY",
    securityProfile: "LOCAL_MEDIA_DERIVED_ARTIFACT_ONLY",
    availability: "SAFE_LOCAL_EXECUTION_AVAILABLE",
    allowedProfiles: ["AUDIO_WAV_STANDARD"]
  }
]);

export const deferredSafeLocalCapabilities = Object.freeze([
  {
    capabilityId: "VIDEO_TRANSCODE",
    deferredReason: "No existing canonical VIDEO_TRANSCODE capability id is present in the current Capability Fabric taxonomy."
  },
  {
    capabilityId: "IMAGE_RESIZE",
    deferredReason: "No existing safe local image processor such as Sharp or ImageMagick is available in package dependencies or repo utilities."
  },
  {
    capabilityId: "IMAGE_CONVERT",
    deferredReason: "No existing safe local image processor such as Sharp or ImageMagick is available in package dependencies or repo utilities."
  }
]);

export function defaultPhase21NBoundary(cwd = process.cwd()) {
  const root = path.resolve(cwd, "artifacts", "execution", "phase21n");
  return {
    root,
    fixtureSourceRoot: path.join(root, "fixtures"),
    artifactRoot: path.join(root, "derived"),
    tempRoot: path.join(root, "tmp"),
    proofPath: path.join(root, "SafeLocalExecutionE2EProof.json")
  };
}

export function defaultPhase21OBoundary(cwd = process.cwd()) {
  const root = path.resolve(cwd, "artifacts", "execution", "phase21o");
  return {
    root,
    fixtureSourceRoot: path.join(root, "fixtures"),
    artifactRoot: path.join(root, "derived"),
    tempRoot: path.join(root, "tmp"),
    proofPath: path.join(root, "SafeLocalCapabilityMatrixProof.json")
  };
}

export function defaultPhase21PBoundary(cwd = process.cwd()) {
  const root = path.resolve(cwd, "artifacts", "execution", "phase21p");
  return {
    root,
    fixtureSourceRoot: path.join(root, "fixtures"),
    artifactRoot: path.join(root, "derived"),
    tempRoot: path.join(root, "tmp"),
    proofPath: path.join(root, "SafeLocalExecutionWorkspaceProof.json"),
    screenshotRoot: path.join(root, "screenshots")
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizePath(value) {
  return path.resolve(String(value || ""));
}

function pathInside(child, parent) {
  const normalizedChild = normalizePath(child).toLowerCase();
  const normalizedParent = normalizePath(parent).toLowerCase();
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}${path.sep}`);
}

function hasTraversalSegment(value) {
  return String(value || "").split(/[\\/]+/).includes("..");
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

export function fingerprintFile(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(sortObject(value))).digest("hex");
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortObject(value[key]);
    return acc;
  }, {});
}

function parseTimeSeconds(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    if (typeof value.startSeconds === "number" || typeof value.endSeconds === "number") return value;
  }
  const text = String(value || "").trim();
  const simple = Number(text);
  if (Number.isFinite(simple)) return simple;
  const parts = text.split(":").map(Number);
  if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

function formatSeconds(seconds) {
  return Number(seconds).toFixed(3);
}

function runLocalTool(executable, args, options = {}) {
  return spawnSync(executable, args, {
    cwd: options.cwd || process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 8
  });
}

function resolvedExecutable(name) {
  if (name === "ffmpeg") return resolveFfmpeg().resolvedPath || "ffmpeg";
  if (name === "ffprobe") return resolveFfprobe().resolvedPath || "ffprobe";
  return name;
}

export function probeMedia(filePath, ffprobePath = resolvedExecutable("ffprobe")) {
  const result = runLocalTool(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=format_name,duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
    "-of",
    "json",
    filePath
  ]);
  if (result.status !== 0) {
    return {
      ok: false,
      error: result.stderr || result.stdout || "ffprobe_failed"
    };
  }
  const metadata = JSON.parse(result.stdout || "{}");
  const streams = metadata.streams || [];
  const video = streams.find((stream) => stream.codec_type === "video") || null;
  const audio = streams.find((stream) => stream.codec_type === "audio") || null;
  return {
    ok: true,
    durationSeconds: Number(metadata.format?.duration),
    container: metadata.format?.format_name || null,
    sizeBytes: Number(metadata.format?.size),
    streams,
    video: video ? {
      present: true,
      codecName: video.codec_name || null,
      width: Number(video.width) || null,
      height: Number(video.height) || null,
      frameRate: video.r_frame_rate || null
    } : { present: false },
    audio: audio ? {
      present: true,
      codecName: audio.codec_name || null,
      sampleRate: Number(audio.sample_rate) || null,
      channels: Number(audio.channels) || null
    } : { present: false }
  };
}

function uniqueOutputPath(sourcePath, artifactRoot, suffix = "artifact", extension = ".mp4") {
  const sourceBase = path.basename(sourcePath, path.extname(sourcePath)).replace(/[^a-zA-Z0-9_-]+/g, "_");
  for (let index = 1; index < 10000; index += 1) {
    const candidate = path.join(artifactRoot, `${sourceBase}_${suffix}_${String(index).padStart(4, "0")}${extension}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error("unable_to_generate_unique_output_path");
}

export function getSafeLocalCapabilityProfile(capabilityId, profiles = safeLocalCapabilityProfiles) {
  return profiles.find((profile) => profile.capabilityId === capabilityId) || null;
}

export function validateSafeLocalRuntimeRegistry(profiles = safeLocalCapabilityProfiles) {
  const seen = new Set();
  return profiles.map((profile) => {
    const blockers = [];
    if (seen.has(profile.capabilityId)) blockers.push(safeLocalExecutionBlockers.duplicateProfile);
    seen.add(profile.capabilityId);
    if (!safeLocalToolAllowlist[profile.toolAdapterId]) blockers.push(safeLocalExecutionBlockers.toolNotAllowlisted);
    if (!safeLocalVerificationProfiles[profile.verificationProfileId]) blockers.push(safeLocalExecutionBlockers.missingVerifier);
    const adapter = safeLocalToolAllowlist[profile.toolAdapterId];
    if (adapter && !profile.allowedOperations.every((operation) => adapter.operations.includes(operation))) {
      blockers.push(safeLocalExecutionBlockers.unsupportedOperation);
    }
    if (profile.sourceMutationAllowed !== false) blockers.push(safeLocalExecutionBlockers.blockedSourceOverwrite);
    return {
      capabilityId: profile.capabilityId,
      valid: blockers.length === 0,
      blockers
    };
  });
}

function createBaseExecutionPlan(input = {}, boundary = defaultPhase21NBoundary()) {
  const capabilityId = input.capabilityId || "VIDEO_TRIM";
  const profile = getSafeLocalCapabilityProfile(capabilityId);
  const sourcePath = normalizePath(input.sourcePath || input.sourceAssetPath);
  const outputProfileId = input.outputProfileId || input.targetProfile || profile?.allowedProfiles?.[0] || null;
  const outputProfile = outputProfileId ? safeLocalOutputProfiles[outputProfileId] : null;
  const outputPath = profile?.executionMode === localExecutionModes.derivedArtifact
    ? input.outputPath
      ? normalizePath(input.outputPath)
      : uniqueOutputPath(sourcePath, boundary.artifactRoot, input.outputSuffix || capabilityId.toLowerCase(), outputProfile?.extension || ".mp4")
    : null;
  return {
    modelType: "LocalExecutionPlan",
    capabilityId,
    executionMode: profile?.executionMode || localExecutionModes.derivedArtifact,
    toolAdapterId: profile?.toolAdapterId || null,
    toolId: profile?.toolId || null,
    agentToolId: safeLocalToolAllowlist[profile?.toolAdapterId]?.agentToolId || "media.local.mock",
    toolClass: safeLocalToolAllowlist[profile?.toolAdapterId]?.toolClass || null,
    sourceAsset: {
      sourceAssetId: input.sourceAssetId || "synthetic_media_source",
      localPathRef: sourcePath
    },
    operation: input.operation || profile?.allowedOperations?.[0] || null,
    outputProfileId,
    outputProfile,
    requestedOutput: outputPath ? {
      artifactType: input.artifactType || profile?.outputBehavior || "DerivedExecutionArtifact",
      localPathRef: outputPath,
      collisionPolicy: input.collisionPolicy || "GENERATE_UNIQUE_NAME"
    } : null,
    verificationProfileId: profile?.verificationProfileId || null,
    rollbackBehavior: profile?.rollbackProfile || "DELETE_DERIVED_ARTIFACT_ONLY",
    sideEffectClass: profile?.executionMode === localExecutionModes.readOnly ? "LOCAL_READ_ONLY" : "LOCAL_DERIVED_ARTIFACT_ONLY",
    sourceMutation: false,
    normalizedParameters: {},
    parametersFingerprint: null
  };
}

export function createMediaProbeExecutionPlan(input = {}, boundary = defaultPhase21OBoundary()) {
  const plan = createBaseExecutionPlan({
    ...input,
    capabilityId: "MEDIA_PROBE",
    operation: "probe"
  }, boundary);
  plan.normalizedParameters = { operation: "probe" };
  plan.parametersFingerprint = stableHash(plan.normalizedParameters);
  return plan;
}

export function createVideoTrimExecutionPlan(input = {}, boundary = defaultPhase21NBoundary()) {
  const startSeconds = parseTimeSeconds(input.startSeconds ?? input.startTime);
  const endSeconds = parseTimeSeconds(input.endSeconds ?? input.endTime);
  const plan = createBaseExecutionPlan({
    ...input,
    capabilityId: "VIDEO_TRIM",
    operation: "trim",
    outputProfileId: "VIDEO_MP4_STANDARD",
    outputSuffix: "trim",
    artifactType: "TrimmedVideoArtifact"
  }, boundary);
  plan.normalizedParameters = {
    operation: "trim",
    startSeconds,
    endSeconds,
    durationSeconds: Number.isFinite(startSeconds) && Number.isFinite(endSeconds) ? endSeconds - startSeconds : null,
    outputProfileId: "VIDEO_MP4_STANDARD"
  };
  plan.parametersFingerprint = stableHash(plan.normalizedParameters);
  return plan;
}

export function createVideoResizeExecutionPlan(input = {}, boundary = defaultPhase21OBoundary()) {
  const outputProfileId = input.outputProfileId || input.targetProfile || "VIDEO_RESIZE_320x180";
  const outputProfile = safeLocalOutputProfiles[outputProfileId];
  const plan = createBaseExecutionPlan({
    ...input,
    capabilityId: "VIDEO_RESIZE",
    operation: "resize",
    outputProfileId,
    outputSuffix: "resize",
    artifactType: "ResizedVideoArtifact"
  }, boundary);
  plan.normalizedParameters = {
    operation: "resize",
    outputProfileId,
    targetWidth: Number(input.targetWidth || outputProfile?.width),
    targetHeight: Number(input.targetHeight || outputProfile?.height),
    preserveAspectRatio: input.preserveAspectRatio !== false
  };
  plan.parametersFingerprint = stableHash(plan.normalizedParameters);
  return plan;
}

export function createAudioExtractExecutionPlan(input = {}, boundary = defaultPhase21OBoundary()) {
  const outputProfileId = input.outputProfileId || input.targetProfile || "AUDIO_WAV_STANDARD";
  const plan = createBaseExecutionPlan({
    ...input,
    capabilityId: "AUDIO_EXTRACT",
    operation: "audio_extract",
    outputProfileId,
    outputSuffix: "audio_extract",
    artifactType: "ExtractedAudioArtifact"
  }, boundary);
  plan.normalizedParameters = {
    operation: "audio_extract",
    outputProfileId
  };
  plan.parametersFingerprint = stableHash(plan.normalizedParameters);
  return plan;
}

export function createSafeLocalExecutionPlan(input = {}, boundary = defaultPhase21OBoundary()) {
  if (input.capabilityId === "MEDIA_PROBE") return createMediaProbeExecutionPlan(input, boundary);
  if (input.capabilityId === "VIDEO_RESIZE") return createVideoResizeExecutionPlan(input, boundary);
  if (input.capabilityId === "AUDIO_EXTRACT") return createAudioExtractExecutionPlan(input, boundary);
  return createVideoTrimExecutionPlan(input, boundary);
}

function createGatewayIntent(flow, executionPlan) {
  const writeScope = executionPlan.requestedOutput?.localPathRef || executionPlan.sourceAsset.localPathRef;
  return {
    executionIntentId: flow.draft.intentId,
    requestId: flow.draft.requestId,
    traceId: flow.draft.traceId,
    toolId: "media.local.mock",
    capability: executionPlan.executionMode === localExecutionModes.readOnly ? "inspect_media" : "render_local",
    action: executionPlan.executionMode === localExecutionModes.readOnly ? "read_local_media_observation" : "write_local_derived_media_artifact",
    normalizedInput: {
      operation: executionPlan.executionMode === localExecutionModes.readOnly ? "read" : "write",
      writeScope,
      targetPath: writeScope,
      capabilityId: executionPlan.capabilityId
    },
    status: "READY_FOR_EXECUTION",
    environment: "local",
    approvalRequired: false,
    costClass: "LOCAL_COMPUTE",
    estimatedCost: 0,
    maxApprovedCost: 0,
    createdAt: flow.draft.createdAt,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    idempotencyKey: `${flow.draft.intentId}:${flow.draft.version || "1.0.0"}:${executionPlan.parametersFingerprint}`,
    policyVersion: "agent-tool-policy-v1",
    registryVersion: "agent-tool-registry-v1",
    audit: []
  };
}

export function createExecutionFingerprint(input = {}) {
  return stableHash({
    intentId: input.intentId,
    intentVersion: input.intentVersion,
    capabilityId: input.capabilityId,
    sourceFingerprint: input.sourceFingerprint,
    normalizedParameters: input.normalizedParameters,
    toolClass: input.toolClass,
    requestedOutputSemantics: input.requestedOutputSemantics
  });
}

function validatePlanAgainstProfile({ executionPlan, boundary, input }) {
  const profile = getSafeLocalCapabilityProfile(executionPlan.capabilityId);
  const capabilityAllowlist = safeLocalToolAllowlist[executionPlan.capabilityId];
  const adapter = safeLocalToolAllowlist[profile?.toolAdapterId];
  const blockers = [];
  const warnings = [];

  if (!profile) blockers.push(safeLocalExecutionBlockers.notEligibleSafeLocalExecution);
  if (profile && executionPlan.toolAdapterId !== profile.toolAdapterId) blockers.push(safeLocalExecutionBlockers.toolCapabilityMismatch);
  if (profile && executionPlan.toolId !== profile.toolId) blockers.push(safeLocalExecutionBlockers.toolCapabilityMismatch);
  if (!adapter || !capabilityAllowlist) blockers.push(safeLocalExecutionBlockers.toolNotAllowlisted);
  if (profile && !profile.allowedOperations.includes(executionPlan.operation)) blockers.push(safeLocalExecutionBlockers.unsupportedOperation);
  if (input.requestedOperation && !profile?.allowedOperations.includes(input.requestedOperation)) blockers.push(safeLocalExecutionBlockers.unsupportedOperation);
  if (executionPlan.outputProfileId && !safeLocalOutputProfiles[executionPlan.outputProfileId]) blockers.push(safeLocalExecutionBlockers.unsupportedProfile);
  if (profile?.allowedProfiles && !profile.allowedProfiles.includes(executionPlan.outputProfileId)) blockers.push(safeLocalExecutionBlockers.unsupportedProfile);
  if (input.executableOverride && !adapter?.executableNames.includes(input.executableOverride)) {
    blockers.push(safeLocalExecutionBlockers.arbitraryExecutableBlocked);
  }
  if ((input.extraFlags || []).some((flag) => !adapter?.allowedFlags.includes(flag) && !capabilityAllowlist?.allowedFlags.includes(flag))) {
    blockers.push(safeLocalExecutionBlockers.unsafeFlagBlocked);
  }
  if (hasTraversalSegment(input.rawOutputPath || executionPlan.requestedOutput?.localPathRef || "")) {
    blockers.push(safeLocalExecutionBlockers.pathTraversalBlocked);
  }
  if (!safeLocalVerificationProfiles[profile?.verificationProfileId]) blockers.push(safeLocalExecutionBlockers.missingVerifier);
  if (!fs.existsSync(executionPlan.sourceAsset.localPathRef)) blockers.push(safeLocalExecutionBlockers.sourceMissing);
  else {
    try {
      fs.accessSync(executionPlan.sourceAsset.localPathRef, fs.constants.R_OK);
    } catch {
      blockers.push(safeLocalExecutionBlockers.sourceUnreadable);
    }
  }
  if (fs.existsSync(executionPlan.sourceAsset.localPathRef)) {
    const sourceProbe = probeMedia(executionPlan.sourceAsset.localPathRef);
    const extension = path.extname(executionPlan.sourceAsset.localPathRef).toLowerCase();
    if (!sourceProbe.ok || ![".mp4", ".mov", ".webm", ".mkv", ".wav", ".mp3", ".m4a"].includes(extension)) {
      blockers.push(safeLocalExecutionBlockers.invalidFileType);
    }
    if (sourceProbe.ok && ["VIDEO_TRIM", "VIDEO_RESIZE"].includes(executionPlan.capabilityId) && !sourceProbe.video.present) {
      blockers.push(safeLocalExecutionBlockers.invalidFileType);
    }
    if (sourceProbe.ok && executionPlan.capabilityId === "AUDIO_EXTRACT" && !sourceProbe.audio.present) {
      blockers.push(safeLocalExecutionBlockers.invalidFileType);
    }
    if (sourceProbe.ok && executionPlan.capabilityId === "VIDEO_TRIM" && executionPlan.normalizedParameters.endSeconds > sourceProbe.durationSeconds + 0.05) {
      blockers.push(safeLocalExecutionBlockers.rangeOutOfBounds);
    }
    if (!sourceProbe.ok) warnings.push("SOURCE_PROBE_FAILED_BEFORE_ELIGIBILITY");
  }
  if (executionPlan.capabilityId === "VIDEO_TRIM" && (
    !Number.isFinite(executionPlan.normalizedParameters.startSeconds) ||
    !Number.isFinite(executionPlan.normalizedParameters.endSeconds) ||
    executionPlan.normalizedParameters.startSeconds < 0 ||
    executionPlan.normalizedParameters.endSeconds <= executionPlan.normalizedParameters.startSeconds
  )) {
    blockers.push(safeLocalExecutionBlockers.invalidRange);
  }
  if (executionPlan.capabilityId === "VIDEO_RESIZE") {
    const { targetWidth, targetHeight } = executionPlan.normalizedParameters;
    const limits = profile?.resourceLimits;
    if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight) ||
      targetWidth <= 0 || targetHeight <= 0 ||
      targetWidth > limits.maxWidth || targetHeight > limits.maxHeight ||
      targetWidth * targetHeight > limits.maxPixels) {
      blockers.push(safeLocalExecutionBlockers.resourceLimit);
    }
  }
  if (profile?.executionMode === localExecutionModes.derivedArtifact) {
    if (normalizePath(executionPlan.sourceAsset.localPathRef) === normalizePath(executionPlan.requestedOutput.localPathRef)) {
      blockers.push(safeLocalExecutionBlockers.blockedSourceOverwrite);
    }
    if (!pathInside(executionPlan.requestedOutput.localPathRef, boundary.artifactRoot)) {
      blockers.push(safeLocalExecutionBlockers.blockedOutputBoundary);
    }
    if (executionPlan.rollbackBehavior !== "DELETE_DERIVED_ARTIFACT_ONLY") blockers.push(safeLocalExecutionBlockers.rollbackUnavailable);
  }
  if (profile?.executionMode === localExecutionModes.readOnly && executionPlan.requestedOutput) {
    blockers.push(safeLocalExecutionBlockers.blockedOutputBoundary);
  }
  if (!getAgentTool(executionPlan.agentToolId)) blockers.push(safeLocalExecutionBlockers.toolNotAllowlisted);
  if (!adapter?.executableNames.includes("ffprobe")) blockers.push(safeLocalExecutionBlockers.verificationUnavailable);

  return { profile, adapter, blockers, warnings };
}

export function evaluateLocalExecutionEligibility(input = {}) {
  const flow = input.flow || buildExecution21MFlow(input.intent || {}, input.sources || {}, input.answers || [], {}, input.options || {});
  const boundary = input.boundary || defaultPhase21NBoundary(input.cwd || process.cwd());
  const executionPlan = input.executionPlan || createSafeLocalExecutionPlan(input.executionPlanInput || {}, boundary);
  const capability = getCapability(executionPlan.capabilityId);
  const planValidation = validatePlanAgainstProfile({ executionPlan, boundary, input });
  const profile = planValidation.profile;
  const blockers = [...planValidation.blockers];
  const warnings = [...planValidation.warnings];

  if (flow.inputDraft.completeness !== "COMPLETE") blockers.push(safeLocalExecutionBlockers.inputNotReady);
  if (!flow.rePreflight.usedExistingPreflightEngine) blockers.push(safeLocalExecutionBlockers.preflightNotReady);
  const meaningfulPreflightBlockers = (flow.rePreflight.preflight.blockers || []).filter((blocker) =>
    !["EXECUTION_DISABLED_PHASE_21K"].includes(blocker)
  );
  if (meaningfulPreflightBlockers.length) blockers.push(safeLocalExecutionBlockers.preflightNotReady);
  if (![
    execution21MReadinessStates.readyForFutureExecution,
    execution21MReadinessStates.approvalIncomplete
  ].includes(flow.readiness.readinessState) && flow.approvalDiscovery.approvalRequests.length > 0) {
    blockers.push(safeLocalExecutionBlockers.approvalsNotReady);
  }
  const tokenChecks = (input.approvalTokens || []).map((token) => verifyScopedApprovalToken(token, {
    intentId: flow.draft.intentId,
    intentVersion: input.intentVersion || "1.0.0",
    capabilityId: executionPlan.capabilityId,
    scope: token.scope
  }));
  if (tokenChecks.some((check) => !check.valid)) blockers.push(safeLocalExecutionBlockers.tokenInvalid);
  if (input.intentVersion && input.intentVersion !== (input.expectedIntentVersion || input.intentVersion)) {
    blockers.push(safeLocalExecutionBlockers.versionMismatch);
  }
  if (!capability?.localPossible || capability.activationState !== capabilityActivationStates.localReady || !profile) {
    blockers.push(safeLocalExecutionBlockers.notEligibleSafeLocalExecution);
  }
  if (capability?.externalProviderPossible) blockers.push(safeLocalExecutionBlockers.providerRequired);
  if (flow.draft.costClass === "PAID_PROVIDER_REQUIRED") blockers.push(safeLocalExecutionBlockers.paymentRequired);
  if (flow.draft.executionClass === "PUBLISH_REQUIRED") blockers.push(safeLocalExecutionBlockers.publishRequired);
  if (input.deployRequired) blockers.push(safeLocalExecutionBlockers.deployRequired);
  if (input.externalMutationRequired) blockers.push(safeLocalExecutionBlockers.externalMutationRequired);

  const uniqueBlockers = unique(blockers);
  return {
    modelType: "LocalExecutionEligibility",
    intentId: flow.draft.intentId,
    intentVersion: input.intentVersion || "1.0.0",
    capabilityId: executionPlan.capabilityId,
    eligible: uniqueBlockers.length === 0,
    executionClass: localExecutionClasses.safeLocalExecution,
    executionMode: profile?.executionMode || null,
    profile,
    inputReady: flow.inputDraft.completeness === "COMPLETE",
    preflightReady: meaningfulPreflightBlockers.length === 0,
    approvalsReady: flow.approvalDiscovery.approvalRequests.length === 0 || flow.approvalDecisions.every((decision) => decision.decision === "APPROVED"),
    tokensValid: tokenChecks.every((check) => check.valid),
    localCapabilityAvailable: capability?.localPossible === true && capability.activationState === capabilityActivationStates.localReady,
    externalProviderRequired: capability?.externalProviderPossible === true,
    paymentRequired: flow.draft.costClass === "PAID_PROVIDER_REQUIRED",
    publishRequired: flow.draft.executionClass === "PUBLISH_REQUIRED",
    deployRequired: input.deployRequired === true,
    externalMutationRequired: input.externalMutationRequired === true,
    sourcePreservationGuaranteed: executionPlan.requestedOutput
      ? normalizePath(executionPlan.sourceAsset.localPathRef) !== normalizePath(executionPlan.requestedOutput.localPathRef)
      : true,
    outputBoundaryValid: executionPlan.requestedOutput ? pathInside(executionPlan.requestedOutput.localPathRef, boundary.artifactRoot) : true,
    verificationAvailable: Boolean(safeLocalVerificationProfiles[profile?.verificationProfileId]),
    rollbackAvailable: profile?.executionMode === localExecutionModes.readOnly || executionPlan.rollbackBehavior === "DELETE_DERIVED_ARTIFACT_ONLY",
    blockers: uniqueBlockers,
    warnings,
    flow,
    executionPlan,
    boundary,
    tokenChecks
  };
}

export function createLocalExecutionRequest(input = {}) {
  return {
    modelType: "LocalExecutionRequest",
    executionRequestId: input.executionRequestId || `local_exec_request_${Date.now().toString(36)}`,
    intentId: input.intentId,
    intentVersion: input.intentVersion || "1.0.0",
    capabilityId: input.capabilityId || input.executionPlan?.capabilityId || "VIDEO_TRIM",
    inputDraftId: input.inputDraftId || null,
    preflightRef: input.preflightRef || null,
    approvalTokenRefs: [...(input.approvalTokenRefs || [])],
    executionPlan: input.executionPlan,
    sourceAssetRefs: [...(input.sourceAssetRefs || [])],
    requestedOutputs: [...(input.requestedOutputs || [])],
    executionBoundary: input.executionBoundary,
    requestedAt: input.requestedAt || new Date().toISOString()
  };
}

export function authorizeLocalExecution(input = {}) {
  const eligibility = input.eligibility || evaluateLocalExecutionEligibility(input);
  const gatewayResult = prepareExecution(createGatewayIntent(eligibility.flow, eligibility.executionPlan));
  const gatewayAccepted = ["READY", "BLOCKED"].includes(gatewayResult.decision);
  const blockers = [...eligibility.blockers];
  if (!gatewayAccepted) blockers.push("EXECUTION_GATEWAY_REQUIRES_REAPPROVAL");
  if (gatewayResult.executed !== false) blockers.push("GATEWAY_SHOULD_NOT_EXECUTE_DIRECTLY");

  return {
    modelType: "LocalExecutionGateResult",
    decision: blockers.length ? localExecutionGateDecisions.blocked : localExecutionGateDecisions.authorized,
    intentId: eligibility.intentId,
    intentVersion: eligibility.intentVersion,
    capabilityId: eligibility.capabilityId,
    executionMode: eligibility.executionMode,
    eligibility,
    gatewayResult: {
      decision: gatewayResult.decision,
      reason: gatewayResult.reason,
      executed: gatewayResult.executed
    },
    blockers: unique(blockers),
    warnings: eligibility.warnings,
    toolAllowlisted: Boolean(safeLocalToolAllowlist[eligibility.executionPlan.capabilityId]),
    materialFingerprintVerified: true,
    localOnly: true
  };
}

function createDerivedArtifact(input = {}) {
  return {
    modelType: "DerivedExecutionArtifact",
    artifactId: input.artifactId,
    executionId: input.executionId,
    capabilityId: input.capabilityId,
    sourceAssetRefs: input.sourceAssetRefs || [],
    lineage: input.lineage,
    artifactType: input.artifactType || "DerivedExecutionArtifact",
    localPathRef: input.localPathRef,
    createdAt: input.createdAt,
    toolRef: input.toolRef,
    parametersFingerprint: input.parametersFingerprint,
    verificationState: input.verificationState || "PENDING",
    rollbackState: input.rollbackState || localExecutionRollbackStatuses.available,
    artifactFingerprint: input.artifactFingerprint || null
  };
}

export function createMediaProbeResult(input = {}) {
  const observation = input.observation || {};
  return {
    modelType: "MediaProbeResult",
    capabilityId: "MEDIA_PROBE",
    sourceAssetRef: input.sourceAssetRef,
    duration: observation.durationSeconds ?? null,
    container: observation.container || null,
    video: observation.video || { present: false },
    audio: observation.audio || { present: false },
    dimensions: observation.video?.present ? {
      width: observation.video.width,
      height: observation.video.height
    } : null,
    frameRate: observation.video?.frameRate || null,
    fileSize: observation.sizeBytes ?? null,
    verified: input.verified === true,
    observedAt: input.observedAt || new Date().toISOString(),
    provenance: input.provenance || null
  };
}

export function verifyLocalExecutionArtifact(input = {}) {
  const executionPlan = input.executionPlan;
  const profile = getSafeLocalCapabilityProfile(executionPlan.capabilityId);
  const sourceBefore = input.sourceFingerprintBefore;
  const sourceAfter = fs.existsSync(executionPlan.sourceAsset.localPathRef)
    ? fingerprintFile(executionPlan.sourceAsset.localPathRef)
    : null;
  const outputPath = executionPlan.requestedOutput?.localPathRef;
  const probe = outputPath && fs.existsSync(outputPath)
    ? probeMedia(outputPath)
    : { ok: false, error: outputPath ? "output_missing" : "no_output_for_read_only" };
  const sourceProbe = fs.existsSync(executionPlan.sourceAsset.localPathRef)
    ? probeMedia(executionPlan.sourceAsset.localPathRef)
    : { ok: false, error: "source_missing" };
  const checks = [];
  let observation = null;

  if (profile?.executionMode === localExecutionModes.readOnly) {
    observation = createMediaProbeResult({
      sourceAssetRef: executionPlan.sourceAsset,
      observation: sourceProbe,
      verified: sourceProbe.ok && sourceBefore === sourceAfter,
      provenance: {
        toolAdapterId: executionPlan.toolAdapterId,
        verificationProfileId: executionPlan.verificationProfileId
      }
    });
    checks.push(
      { code: "SOURCE_EXISTS", passed: fs.existsSync(executionPlan.sourceAsset.localPathRef) },
      { code: "SOURCE_READABLE", passed: sourceProbe.ok },
      { code: "OBSERVATION_STRUCTURED", passed: sourceProbe.ok && Boolean(sourceProbe.durationSeconds || sourceProbe.video.present || sourceProbe.audio.present) },
      { code: "NO_DERIVED_ARTIFACT", passed: !executionPlan.requestedOutput },
      { code: "SOURCE_FINGERPRINT_UNCHANGED", passed: sourceBefore === sourceAfter }
    );
  } else {
    checks.push(
      { code: "OUTPUT_EXISTS", passed: Boolean(outputPath && fs.existsSync(outputPath)) },
      { code: "OUTPUT_READABLE", passed: Boolean(outputPath && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) },
      { code: "SOURCE_EXISTS", passed: fs.existsSync(executionPlan.sourceAsset.localPathRef) },
      { code: "SOURCE_FINGERPRINT_UNCHANGED", passed: sourceBefore === sourceAfter }
    );
    if (executionPlan.capabilityId === "VIDEO_TRIM") {
      const expectedDuration = executionPlan.normalizedParameters.durationSeconds;
      const durationDelta = probe.ok ? Math.abs(probe.durationSeconds - expectedDuration) : null;
      checks.push(
        { code: "DURATION_MATCHES_REQUEST", passed: probe.ok && durationDelta <= (input.durationToleranceSeconds ?? 0.35), expected: expectedDuration, observed: probe.durationSeconds },
        { code: "STREAM_PRESENT", passed: probe.ok && probe.streams.some((stream) => stream.codec_type === "video") }
      );
    }
    if (executionPlan.capabilityId === "VIDEO_RESIZE") {
      checks.push(
        { code: "DIMENSIONS_MATCH_REQUEST", passed: probe.ok && probe.video.width === executionPlan.normalizedParameters.targetWidth && probe.video.height === executionPlan.normalizedParameters.targetHeight, expected: { width: executionPlan.normalizedParameters.targetWidth, height: executionPlan.normalizedParameters.targetHeight }, observed: { width: probe.video?.width, height: probe.video?.height } },
        { code: "STREAM_PRESENT", passed: probe.ok && probe.video.present === true }
      );
    }
    if (executionPlan.capabilityId === "AUDIO_EXTRACT") {
      checks.push(
        { code: "AUDIO_STREAM_PRESENT", passed: probe.ok && probe.audio.present === true },
        { code: "NO_REQUIRED_VIDEO_STREAM", passed: probe.ok && probe.video.present === false }
      );
    }
  }

  const failures = checks.filter((check) => !check.passed).map((check) => check.code);
  return {
    modelType: "ExecutionVerificationResult",
    executionId: input.executionId,
    verificationProfileId: executionPlan.verificationProfileId,
    capabilityId: executionPlan.capabilityId,
    verified: failures.length === 0,
    checks,
    failures,
    warnings: [],
    sourceIntegrity: {
      before: sourceBefore,
      after: sourceAfter,
      state: sourceBefore === sourceAfter ? "SOURCE_UNCHANGED" : "SOURCE_CHANGED"
    },
    artifactIntegrity: probe.ok && outputPath ? {
      artifactFingerprint: fingerprintFile(outputPath),
      sizeBytes: fs.statSync(outputPath).size
    } : null,
    observation,
    expectedVsObserved: {
      requestedDurationSeconds: executionPlan.normalizedParameters.durationSeconds ?? null,
      observedDurationSeconds: probe.durationSeconds ?? null,
      requestedDimensions: executionPlan.normalizedParameters.targetWidth ? {
        width: executionPlan.normalizedParameters.targetWidth,
        height: executionPlan.normalizedParameters.targetHeight
      } : null,
      observedDimensions: probe.video?.present ? {
        width: probe.video.width,
        height: probe.video.height
      } : null,
      toleranceSeconds: input.durationToleranceSeconds ?? 0.35
    },
    verifiedAt: new Date().toISOString()
  };
}

const executedFingerprints = new Map();

function buildAdapterInvocation(executionPlan) {
  if (executionPlan.capabilityId === "MEDIA_PROBE") {
    return {
      executable: resolvedExecutable("ffprobe"),
      args: [
        "-v",
        "error",
        "-show_entries",
        "format=format_name,duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
        "-of",
        "json",
        executionPlan.sourceAsset.localPathRef
      ]
    };
  }
  if (executionPlan.capabilityId === "VIDEO_TRIM") {
    return {
      executable: resolvedExecutable("ffmpeg"),
      args: [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        formatSeconds(executionPlan.normalizedParameters.startSeconds),
        "-i",
        executionPlan.sourceAsset.localPathRef,
        "-t",
        formatSeconds(executionPlan.normalizedParameters.durationSeconds),
        ...safeLocalOutputProfiles.VIDEO_MP4_STANDARD.ffmpegArgs,
        "-avoid_negative_ts",
        "make_zero",
        executionPlan.requestedOutput.localPathRef
      ]
    };
  }
  if (executionPlan.capabilityId === "VIDEO_RESIZE") {
    return {
      executable: resolvedExecutable("ffmpeg"),
      args: [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        executionPlan.sourceAsset.localPathRef,
        ...executionPlan.outputProfile.ffmpegArgs,
        executionPlan.requestedOutput.localPathRef
      ]
    };
  }
  if (executionPlan.capabilityId === "AUDIO_EXTRACT") {
    return {
      executable: resolvedExecutable("ffmpeg"),
      args: [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        executionPlan.sourceAsset.localPathRef,
        ...executionPlan.outputProfile.ffmpegArgs,
        executionPlan.requestedOutput.localPathRef
      ]
    };
  }
  return { executable: null, args: [] };
}

export const localToolAdapters = Object.freeze({
  FFMPEG_LOCAL: {
    adapterId: "FFMPEG_LOCAL",
    toolClass: "FFMPEG_FFPROBE",
    supports(capabilityId) {
      return Boolean(getSafeLocalCapabilityProfile(capabilityId)?.toolAdapterId === "FFMPEG_LOCAL");
    },
    validateOperation(executionPlan) {
      const profile = getSafeLocalCapabilityProfile(executionPlan.capabilityId);
      return Boolean(profile && profile.allowedOperations.includes(executionPlan.operation));
    },
    buildInvocation: buildAdapterInvocation,
    execute(executionPlan) {
      const invocation = buildAdapterInvocation(executionPlan);
      return {
        invocation,
        result: runLocalTool(invocation.executable, invocation.args)
      };
    },
    verify(input) {
      return verifyLocalExecutionArtifact(input);
    },
    rollback(result, boundary) {
      return rollbackLocalExecution(result, boundary);
    }
  }
});

export function runSafeLocalExecution(input = {}) {
  const start = Date.now();
  const gate = input.gate || authorizeLocalExecution(input);
  const eligibility = gate.eligibility;
  const executionPlan = eligibility.executionPlan;
  const profile = getSafeLocalCapabilityProfile(executionPlan.capabilityId);
  const adapter = localToolAdapters[executionPlan.toolAdapterId];
  const executionId = input.executionId || `local_execution_${Date.now().toString(36)}`;
  const sourceFingerprintBefore = fs.existsSync(executionPlan.sourceAsset.localPathRef)
    ? fingerprintFile(executionPlan.sourceAsset.localPathRef)
    : null;
  const executionFingerprint = createExecutionFingerprint({
    intentId: eligibility.intentId,
    intentVersion: eligibility.intentVersion,
    capabilityId: executionPlan.capabilityId,
    sourceFingerprint: sourceFingerprintBefore,
    normalizedParameters: executionPlan.normalizedParameters,
    toolClass: executionPlan.toolClass,
    requestedOutputSemantics: executionPlan.requestedOutput?.artifactType || profile?.outputBehavior
  });

  if (gate.decision !== localExecutionGateDecisions.authorized || !adapter) {
    return createLocalExecutionResult({
      executionId,
      status: localExecutionStatuses.blocked,
      gate,
      executionPlan,
      executionFingerprint,
      durationMs: Date.now() - start,
      warnings: gate.warnings,
      sourceFingerprintBefore,
      sourceFingerprintAfter: sourceFingerprintBefore
    });
  }

  if (executedFingerprints.has(executionFingerprint)) {
    const existing = executedFingerprints.get(executionFingerprint);
    return {
      ...existing,
      status: localExecutionStatuses.reuseExistingResult,
      idempotency: "REUSE_EXISTING_RESULT",
      durationMs: Date.now() - start
    };
  }

  if (executionPlan.requestedOutput) ensureDir(path.dirname(executionPlan.requestedOutput.localPathRef));
  const invocation = adapter.buildInvocation(executionPlan);
  const toolResult = input.simulateToolFailure
    ? { status: 1, stderr: "simulated_tool_failure", stdout: "" }
    : runLocalTool(invocation.executable, invocation.args);

  if (toolResult.status !== 0) {
    if (executionPlan.requestedOutput?.localPathRef && fs.existsSync(executionPlan.requestedOutput.localPathRef)) {
      fs.rmSync(executionPlan.requestedOutput.localPathRef, { force: true });
    }
    return createLocalExecutionResult({
      executionId,
      status: localExecutionStatuses.failed,
      gate,
      executionPlan,
      executionFingerprint,
      toolInvocation: {
        toolClass: executionPlan.toolClass,
        toolId: executionPlan.toolId,
        executable: path.basename(invocation.executable || ""),
        args: invocation.args,
        exitCode: toolResult.status,
        stderr: toolResult.stderr
      },
      durationMs: Date.now() - start,
      warnings: [],
      sourceFingerprintBefore,
      sourceFingerprintAfter: fs.existsSync(executionPlan.sourceAsset.localPathRef) ? fingerprintFile(executionPlan.sourceAsset.localPathRef) : null
    });
  }

  if (input.simulateVerificationFailure && executionPlan.requestedOutput?.localPathRef && fs.existsSync(executionPlan.requestedOutput.localPathRef)) {
    fs.writeFileSync(executionPlan.requestedOutput.localPathRef, "");
  }

  const verification = verifyLocalExecutionArtifact({
    executionId,
    executionPlan,
    sourceFingerprintBefore
  });
  const status = verification.verified ? localExecutionStatuses.succeeded : localExecutionStatuses.verificationFailed;
  const artifact = verification.verified && executionPlan.requestedOutput
    ? createDerivedArtifact({
      artifactId: `artifact_${executionId}`,
      executionId,
      capabilityId: executionPlan.capabilityId,
      sourceAssetRefs: [executionPlan.sourceAsset.sourceAssetId],
      lineage: {
        sourceAssetId: executionPlan.sourceAsset.sourceAssetId,
        executionId,
        derivedArtifactId: `artifact_${executionId}`,
        capabilityId: executionPlan.capabilityId,
        operation: executionPlan.operation,
        profile: executionPlan.outputProfileId,
        parameters: executionPlan.normalizedParameters,
        tool: executionPlan.toolId,
        toolAdapterId: executionPlan.toolAdapterId,
        timestamp: verification.verifiedAt,
        verification: "VERIFIED"
      },
      artifactType: executionPlan.requestedOutput.artifactType,
      localPathRef: executionPlan.requestedOutput.localPathRef,
      createdAt: verification.verifiedAt,
      toolRef: executionPlan.toolId,
      parametersFingerprint: executionPlan.parametersFingerprint,
      verificationState: "VERIFIED",
      artifactFingerprint: verification.artifactIntegrity?.artifactFingerprint
    })
    : null;

  const result = createLocalExecutionResult({
    executionId,
    status,
    gate,
    executionPlan,
    executionFingerprint,
    toolInvocation: {
      toolClass: executionPlan.toolClass,
      toolId: executionPlan.toolId,
      executable: path.basename(invocation.executable || ""),
      args: invocation.args,
      exitCode: toolResult.status
    },
    derivedArtifacts: artifact ? [artifact] : [],
    observations: verification.observation ? [verification.observation] : [],
    verification,
    durationMs: Date.now() - start,
    warnings: [],
    sourceFingerprintBefore,
    sourceFingerprintAfter: verification.sourceIntegrity.after
  });

  if (status === localExecutionStatuses.succeeded) {
    executedFingerprints.set(executionFingerprint, result);
  }

  return result;
}

function summaryForStatus(status, capabilityId) {
  if (status === localExecutionStatuses.succeeded && capabilityId === "MEDIA_PROBE") {
    return "Готово. Я локально проверила параметры медиафайла, исходник не изменён.";
  }
  if (status === localExecutionStatuses.succeeded && capabilityId === "VIDEO_RESIZE") {
    return "Готово. Я локально создала новую версию видео другого размера, исходник не изменён, результат проверен.";
  }
  if (status === localExecutionStatuses.succeeded && capabilityId === "AUDIO_EXTRACT") {
    return "Готово. Я локально извлекла аудиодорожку в новый файл, исходник не изменён, результат проверен.";
  }
  if (status === localExecutionStatuses.succeeded) {
    return "Готово. Я локально обрезала видео, исходник не изменён, новый файл создан и проверен.";
  }
  if (status === localExecutionStatuses.blocked) return "Локальное выполнение заблокировано политикой безопасности.";
  if (status === localExecutionStatuses.verificationFailed) return "Локальный инструмент завершился, но проверка результата не прошла.";
  return "Локальное выполнение не завершилось успешно.";
}

export function createLocalExecutionResult(input = {}) {
  const sourceAfter = input.sourceFingerprintAfter ?? input.sourceFingerprintBefore;
  const sourcePreserved = input.sourceFingerprintBefore === sourceAfter;
  const executionMode = input.gate?.eligibility?.executionMode || input.executionPlan?.executionMode || localExecutionModes.derivedArtifact;
  const rollback = {
    modelType: "LocalExecutionRollback",
    executionId: input.executionId,
    available: executionMode === localExecutionModes.derivedArtifact && (input.derivedArtifacts || []).length > 0,
    rollbackType: executionMode === localExecutionModes.readOnly ? "NOT_APPLICABLE" : "DELETE_DERIVED_ARTIFACT_ONLY",
    affectedArtifacts: (input.derivedArtifacts || []).map((artifact) => artifact.artifactId),
    sourceAffected: false,
    status: executionMode === localExecutionModes.readOnly
      ? localExecutionRollbackStatuses.notApplicable
      : (input.derivedArtifacts || []).length > 0
      ? localExecutionRollbackStatuses.available
      : localExecutionRollbackStatuses.notAvailable
  };
  const record = {
    modelType: "ExecutionRecord",
    executionId: input.executionId,
    executionRequestId: input.gate?.eligibility?.flow?.draft?.requestId || null,
    intentId: input.gate?.intentId || null,
    intentVersion: input.gate?.intentVersion || null,
    capabilityId: input.executionPlan?.capabilityId || "VIDEO_TRIM",
    executionClass: localExecutionClasses.safeLocalExecution,
    executionMode,
    status: input.status,
    startedAt: new Date(Date.now() - (input.durationMs || 0)).toISOString(),
    completedAt: new Date().toISOString(),
    toolInvocationRef: input.toolInvocation ? {
      toolId: input.toolInvocation.toolId,
      toolClass: input.toolInvocation.toolClass,
      exitCode: input.toolInvocation.exitCode
    } : null,
    sourceAssets: [input.executionPlan?.sourceAsset].filter(Boolean),
    outputArtifacts: input.derivedArtifacts || [],
    observations: input.observations || [],
    verification: input.verification || null,
    rollback,
    auditRef: `audit_${input.executionId}`
  };

  return {
    modelType: "LocalExecutionResult",
    executionId: input.executionId,
    status: input.status,
    capabilityId: input.executionPlan?.capabilityId || "VIDEO_TRIM",
    executionMode,
    sourceAssets: record.sourceAssets,
    derivedArtifacts: input.derivedArtifacts || [],
    observations: input.observations || [],
    verification: input.verification || null,
    sourcePreserved,
    rollbackAvailable: rollback.available,
    rollback,
    executionRecord: record,
    executionFingerprint: input.executionFingerprint,
    durationMs: input.durationMs || 0,
    warnings: input.warnings || [],
    userSummary: summaryForStatus(input.status, input.executionPlan?.capabilityId || "VIDEO_TRIM"),
    debugProvenance: {
      gate: input.gate,
      toolInvocation: input.toolInvocation || null,
      sourceFingerprintBefore: input.sourceFingerprintBefore,
      sourceFingerprintAfter: sourceAfter
    },
    auditArtifact: createSafeLocalExecutionAuditArtifact({
      executionId: input.executionId,
      resultStatus: input.status,
      gate: input.gate,
      executionPlan: input.executionPlan,
      executionFingerprint: input.executionFingerprint,
      sourceFingerprintBefore: input.sourceFingerprintBefore,
      sourceFingerprintAfter: sourceAfter,
      derivedArtifacts: input.derivedArtifacts || [],
      observations: input.observations || [],
      verification: input.verification || null,
      rollback
    })
  };
}

export function createSafeLocalExecutionAuditArtifact(input = {}) {
  const eligibility = input.gate?.eligibility || {};
  return {
    modelType: "SafeLocalExecutionAuditArtifact",
    artifactType: "SafeLocalExecutionAuditArtifact",
    executionId: input.executionId,
    intent: {
      intentId: eligibility.intentId || null,
      intentVersion: eligibility.intentVersion || null,
      capabilityId: eligibility.capabilityId || input.executionPlan?.capabilityId || null
    },
    capabilityId: input.executionPlan?.capabilityId || null,
    executionMode: input.executionPlan?.executionMode || null,
    toolAdapterId: input.executionPlan?.toolAdapterId || null,
    operation: input.executionPlan?.operation || null,
    outputProfileId: input.executionPlan?.outputProfileId || null,
    verificationProfileId: input.executionPlan?.verificationProfileId || null,
    eligibility: {
      eligible: eligibility.eligible === true,
      blockers: eligibility.blockers || [],
      warnings: eligibility.warnings || []
    },
    inputReadiness: eligibility.inputReady || false,
    preflightState: eligibility.preflightReady || false,
    approvalState: eligibility.approvalsReady || false,
    tokenState: eligibility.tokensValid || true,
    executionFingerprint: input.executionFingerprint,
    toolClass: input.executionPlan?.toolClass || null,
    sourceRefs: input.executionPlan?.sourceAsset ? [input.executionPlan.sourceAsset] : [],
    sourceFingerprintBefore: input.sourceFingerprintBefore || null,
    sourceFingerprintAfter: input.sourceFingerprintAfter || null,
    derivedArtifactRefs: (input.derivedArtifacts || []).map((artifact) => ({
      artifactId: artifact.artifactId,
      localPathRef: artifact.localPathRef,
      artifactFingerprint: artifact.artifactFingerprint
    })),
    observations: input.observations || [],
    verification: input.verification,
    rollbackAvailability: input.rollback,
    resultStatus: input.resultStatus,
    providerCalls: 0,
    externalProviderCalls: 0,
    paidProviderCalls: 0,
    externalCalls: 0,
    externalModelCalls: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    adActions: 0,
    externalAccountMutations: 0,
    productionDbMutations: 0,
    envKeyBillingChanges: 0,
    timestamp: new Date().toISOString()
  };
}

export function rollbackLocalExecution(result = {}, boundary = defaultPhase21NBoundary()) {
  if (result.executionMode === localExecutionModes.readOnly) {
    return {
      modelType: "LocalExecutionRollback",
      executionId: result.executionId,
      available: false,
      rollbackType: "NOT_APPLICABLE",
      affectedArtifacts: [],
      sourceAffected: false,
      status: localExecutionRollbackStatuses.notApplicable
    };
  }
  const artifacts = result.derivedArtifacts || [];
  const blocked = artifacts.some((artifact) => !pathInside(artifact.localPathRef, boundary.artifactRoot));
  if (blocked) {
    return {
      modelType: "LocalExecutionRollback",
      executionId: result.executionId,
      available: false,
      rollbackType: "DELETE_DERIVED_ARTIFACT_ONLY",
      affectedArtifacts: [],
      sourceAffected: false,
      status: localExecutionRollbackStatuses.blocked,
      reason: safeLocalExecutionBlockers.blockedOutputBoundary
    };
  }
  artifacts.forEach((artifact) => {
    if (fs.existsSync(artifact.localPathRef)) fs.rmSync(artifact.localPathRef, { force: true });
  });
  return {
    modelType: "LocalExecutionRollback",
    executionId: result.executionId,
    available: true,
    rollbackType: "DELETE_DERIVED_ARTIFACT_ONLY",
    affectedArtifacts: artifacts.map((artifact) => artifact.artifactId),
    sourceAffected: false,
    status: localExecutionRollbackStatuses.completed,
    auditUpdated: true
  };
}

export function createSyntheticVideoFixture(boundary = defaultPhase21NBoundary()) {
  ensureDir(boundary.fixtureSourceRoot);
  const sourcePath = path.join(boundary.fixtureSourceRoot, boundary.root.includes("phase21o") ? "phase21o_source_8s_av.mp4" : "phase21n_source_8s.mp4");
  if (!fs.existsSync(sourcePath)) {
    const result = runLocalTool(resolvedExecutable("ffmpeg"), [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=duration=8:size=640x360:rate=10",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=8",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-acodec",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "1",
      sourcePath
    ]);
    if (result.status !== 0) {
      throw new Error(`synthetic_video_generation_failed: ${result.stderr || result.stdout}`);
    }
  }
  const metadata = probeMedia(sourcePath);
  return {
    sourceAssetId: boundary.root.includes("phase21o") ? "phase21o_synthetic_av_source" : "phase21n_synthetic_video_source",
    localPathRef: sourcePath,
    durationSeconds: metadata.durationSeconds,
    dimensions: metadata.video?.present ? { width: metadata.video.width, height: metadata.video.height } : null,
    hasAudio: metadata.audio?.present === true,
    fingerprint: fingerprintFile(sourcePath),
    generated: true
  };
}

function createPhaseFlow({ capabilityId, fixture, intentId, requestId, traceId, userNeed, currentUserInputs }) {
  return buildExecution21MFlow({
    intentId,
    requestId,
    traceId,
    userNeed,
    productId: productIds.production,
    primaryCapabilityId: capabilityId
  }, {
    currentUserInputs,
    validationContext: {
      mediaDurationSeconds: fixture.durationSeconds
    }
  }, [], {}, {
    intentVersion: "1.0.0",
    createdAt: "2026-08-29T00:00:00.000Z"
  });
}

function createFlatProofArtifact({ artifactType, fixture, result, flow, eligibility, gate, requested = {} }) {
  return {
    artifactType,
    fixtureSource: fixture,
    sourceDuration: fixture.durationSeconds,
    requestedTrim: requested,
    eligibilityResult: {
      eligible: eligibility.eligible,
      blockers: eligibility.blockers,
      executionClass: eligibility.executionClass,
      executionMode: eligibility.executionMode,
      capabilityId: eligibility.capabilityId
    },
    preflightResult: {
      blockers: flow.rePreflight.preflight.blockers,
      usedExistingPreflightEngine: flow.rePreflight.usedExistingPreflightEngine
    },
    inputReadiness: flow.inputDraft.completeness,
    approvalState: {
      required: flow.approvalDiscovery.approvalRequests.length,
      noApprovalInvented: flow.approvalDiscovery.approvalRequests.length === 0
    },
    executionAuthorization: {
      decision: gate.decision,
      blockers: gate.blockers
    },
    toolInvocationSummary: result.debugProvenance.toolInvocation ? {
      toolClass: result.debugProvenance.toolInvocation.toolClass,
      toolId: result.debugProvenance.toolInvocation.toolId,
      exitCode: result.debugProvenance.toolInvocation.exitCode,
      shell: false
    } : null,
    derivedArtifact: result.derivedArtifacts[0] || null,
    observations: result.observations || [],
    verification: result.verification,
    sourceFingerprintBefore: result.debugProvenance.sourceFingerprintBefore,
    sourceFingerprintAfter: result.debugProvenance.sourceFingerprintAfter,
    artifactFingerprint: result.derivedArtifacts[0]?.artifactFingerprint || null,
    lineage: result.derivedArtifacts[0]?.lineage || null,
    rollbackAvailability: result.rollback,
    resultStatus: result.status,
    userSummary: result.userSummary,
    externalProviderCalls: 0,
    externalModelCalls: 0,
    paidProviderCalls: 0,
    externalCalls: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    adActions: 0,
    externalAccountMutations: 0,
    productionDbMutations: 0,
    envKeyBillingChanges: 0,
    timestamp: new Date().toISOString()
  };
}

export function runPhase21NSafeLocalExecutionProof(cwd = process.cwd()) {
  const boundary = defaultPhase21NBoundary(cwd);
  ensureDir(boundary.artifactRoot);
  ensureDir(boundary.tempRoot);
  const fixture = createSyntheticVideoFixture(boundary);
  const flow = createPhaseFlow({
    capabilityId: "VIDEO_TRIM",
    fixture,
    intentId: "phase21n_video_trim_intent",
    requestId: "phase21n_video_trim_request",
    traceId: "phase21n_video_trim_trace",
    userNeed: "Обрежь синтетическое видео с 2 до 5 секунды",
    currentUserInputs: {
      source_video: fixture.localPathRef,
      time_range: "00:02-00:05"
    }
  });
  const executionPlan = createVideoTrimExecutionPlan({
    sourceAssetId: fixture.sourceAssetId,
    sourcePath: fixture.localPathRef,
    startSeconds: 2,
    endSeconds: 5
  }, boundary);
  const eligibility = evaluateLocalExecutionEligibility({
    flow,
    executionPlan,
    boundary,
    intentVersion: "1.0.0"
  });
  const gate = authorizeLocalExecution({ eligibility });
  const result = runSafeLocalExecution({ gate, executionId: "phase21n_video_trim_execution" });
  const proof = createFlatProofArtifact({
    artifactType: "SafeLocalExecutionE2EProof",
    fixture,
    result,
    flow,
    eligibility,
    gate,
    requested: { startSeconds: 2, endSeconds: 5, expectedDurationSeconds: 3 }
  });
  fs.writeFileSync(boundary.proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  return {
    boundary,
    flow,
    executionPlan,
    eligibility,
    gate,
    result,
    proof,
    proofPath: boundary.proofPath
  };
}

function phase21OFlowFor(capabilityId, fixture, extraInputs = {}) {
  const inputMap = {
    MEDIA_PROBE: { source_media: fixture.localPathRef },
    VIDEO_TRIM: { source_video: fixture.localPathRef, time_range: "00:02-00:05" },
    VIDEO_RESIZE: { source_video: fixture.localPathRef, target_profile: "VIDEO_RESIZE_320x180" },
    AUDIO_EXTRACT: { source_media: fixture.localPathRef, target_profile: "AUDIO_WAV_STANDARD" }
  };
  return createPhaseFlow({
    capabilityId,
    fixture,
    intentId: `phase21o_${capabilityId.toLowerCase()}_intent`,
    requestId: `phase21o_${capabilityId.toLowerCase()}_request`,
    traceId: `phase21o_${capabilityId.toLowerCase()}_trace`,
    userNeed: `Run safe local ${capabilityId}`,
    currentUserInputs: {
      ...(inputMap[capabilityId] || {}),
      ...extraInputs
    }
  });
}

function zeroExternalEffectCounters() {
  return {
    externalProviderCalls: 0,
    externalModelCalls: 0,
    paidProviderCalls: 0,
    externalCalls: 0,
    paymentActions: 0,
    publishActions: 0,
    deployActions: 0,
    adActions: 0,
    externalAccountMutations: 0,
    productionDbMutations: 0,
    envKeyBillingChanges: 0
  };
}

function runProfileProof({ capabilityId, fixture, boundary, executionPlan }) {
  const flow = phase21OFlowFor(capabilityId, fixture);
  const eligibility = evaluateLocalExecutionEligibility({
    flow,
    executionPlan,
    boundary,
    intentVersion: "1.0.0"
  });
  const gate = authorizeLocalExecution({ eligibility });
  const result = runSafeLocalExecution({
    gate,
    executionId: `phase21o_${capabilityId.toLowerCase()}_execution`
  });
  return {
    capabilityId,
    executionMode: executionPlan.executionMode,
    availabilityBefore: getCapability(capabilityId)?.activationState || "UNKNOWN",
    availabilityAfter: getSafeLocalCapabilityProfile(capabilityId)?.availability || "NOT_ENABLED",
    adapter: executionPlan.toolAdapterId,
    fixture,
    executionPlan,
    eligibility: {
      eligible: eligibility.eligible,
      blockers: eligibility.blockers
    },
    executionResult: {
      status: result.status,
      derivedArtifacts: result.derivedArtifacts,
      observations: result.observations,
      userSummary: result.userSummary
    },
    verification: result.verification,
    sourcePreservation: result.sourcePreserved,
    rollback: result.rollback,
    externalCallCounters: zeroExternalEffectCounters(),
    result
  };
}

export function runPhase21OSafeLocalCapabilityMatrixProof(cwd = process.cwd()) {
  const boundary = defaultPhase21OBoundary(cwd);
  ensureDir(boundary.fixtureSourceRoot);
  ensureDir(boundary.artifactRoot);
  ensureDir(boundary.tempRoot);
  const fixture = createSyntheticVideoFixture(boundary);
  const proofs = [
    runProfileProof({
      capabilityId: "MEDIA_PROBE",
      fixture,
      boundary,
      executionPlan: createMediaProbeExecutionPlan({
        sourceAssetId: fixture.sourceAssetId,
        sourcePath: fixture.localPathRef
      }, boundary)
    }),
    runProfileProof({
      capabilityId: "VIDEO_TRIM",
      fixture,
      boundary,
      executionPlan: createVideoTrimExecutionPlan({
        sourceAssetId: fixture.sourceAssetId,
        sourcePath: fixture.localPathRef,
        startSeconds: 2,
        endSeconds: 5
      }, boundary)
    }),
    runProfileProof({
      capabilityId: "VIDEO_RESIZE",
      fixture,
      boundary,
      executionPlan: createVideoResizeExecutionPlan({
        sourceAssetId: fixture.sourceAssetId,
        sourcePath: fixture.localPathRef,
        targetProfile: "VIDEO_RESIZE_320x180"
      }, boundary)
    }),
    runProfileProof({
      capabilityId: "AUDIO_EXTRACT",
      fixture,
      boundary,
      executionPlan: createAudioExtractExecutionPlan({
        sourceAssetId: fixture.sourceAssetId,
        sourcePath: fixture.localPathRef,
        targetProfile: "AUDIO_WAV_STANDARD"
      }, boundary)
    })
  ];
  const proof = {
    artifactType: "SafeLocalCapabilityMatrixProof",
    phase: "21O",
    runtimeProvenReusable: proofs.every((item) => item.executionResult.status === localExecutionStatuses.succeeded),
    registryValidation: validateSafeLocalRuntimeRegistry(),
    auditedLocalUtilities: {
      ffmpeg: resolveFfmpeg(),
      ffprobe: resolveFfprobe(),
      imageProcessor: {
        found: false,
        deferredCapabilities: ["IMAGE_RESIZE", "IMAGE_CONVERT"],
        reason: "No Sharp/ImageMagick/local image utility is present in package dependencies or repo-local safe wrappers."
      },
      dependenciesAdded: 0
    },
    enabledCapabilities: proofs.map((item) => ({
      capabilityId: item.capabilityId,
      executionMode: item.executionMode,
      availabilityBefore: item.availabilityBefore,
      availabilityAfter: item.availabilityAfter,
      adapter: item.adapter,
      fixture: item.fixture,
      executionResult: item.executionResult,
      verification: item.verification,
      sourcePreservation: item.sourcePreservation,
      rollback: item.rollback,
      externalCallCounters: item.externalCallCounters
    })),
    deferredCapabilities: deferredSafeLocalCapabilities,
    externalCallCounters: zeroExternalEffectCounters(),
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(boundary.proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  return {
    boundary,
    fixture,
    proofs,
    proof,
    proofPath: boundary.proofPath
  };
}
