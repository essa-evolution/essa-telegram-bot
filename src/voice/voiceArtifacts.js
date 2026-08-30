import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { resolveFfprobe } from "../media/mediaExecutionReadiness.js";

export const voiceArtifactContract = {
  id: null,
  type: "voice_audio",
  identityId: null,
  voiceIdentityId: null,
  provider: null,
  providerModel: null,
  projectId: null,
  goalId: null,
  sourceText: "",
  language: null,
  purpose: null,
  deliveryIntent: {},
  audioPath: null,
  format: null,
  duration: null,
  fileSize: 0,
  createdAt: null,
  sourceStepId: null,
  provenance: {},
  status: "draft"
};

function slug(value = "voice") {
  return String(value || "voice")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "voice";
}

function createId(prefix = "voice_audio") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write outside output root: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function getDurationWithFfprobe(audioPath, ffprobePath = null) {
  const executable = ffprobePath || resolveFfprobe().resolvedPath || "ffprobe";

  try {
    const output = execFileSync(
      executable,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioPath],
      { encoding: "utf8" }
    ).trim();
    const duration = Number(output);
    return Number.isFinite(duration) ? duration : null;
  } catch {
    return null;
  }
}

export function createVoiceArtifactMetadata({
  voiceRequest = {},
  binding = {},
  audioPath = null,
  format = "mp3",
  duration = null,
  fileSize = 0,
  id = null,
  createdAt = null,
  sourceStepId = "voice_synthesis",
  provenance = {},
  status = "saved"
} = {}) {
  const timestamp = createdAt || new Date().toISOString();

  return {
    ...voiceArtifactContract,
    id: id || createId("voice_audio"),
    identityId: voiceRequest.identityId || binding.identityId || null,
    voiceIdentityId: binding.voiceIdentityId || null,
    provider: binding.provider || null,
    providerModel: binding.model || null,
    projectId: voiceRequest.projectId || null,
    goalId: voiceRequest.goalId || null,
    sourceText: voiceRequest.text || "",
    language: voiceRequest.language || null,
    purpose: voiceRequest.purpose || null,
    deliveryIntent: voiceRequest.deliveryIntent || {},
    audioPath,
    format,
    duration,
    fileSize,
    createdAt: timestamp,
    sourceStepId,
    provenance: {
      providerCallMade: false,
      secretsStored: false,
      ...provenance
    },
    status
  };
}

export function saveVoiceArtifact({
  audioBytes,
  voiceRequest = {},
  binding = {},
  outputRoot = "media/output",
  phaseOrProjectId = null,
  artifactId = null,
  format = null,
  ffprobePath = null,
  provenance = {}
} = {}) {
  if (!audioBytes || !Buffer.from(audioBytes).length) {
    throw new Error("audioBytes are required to save a VoiceArtifact");
  }

  const safeFormat = slug(format || voiceRequest.outputFormat || "mp3");
  const id = artifactId || createId("voice_audio");
  const projectSegment = slug(phaseOrProjectId || voiceRequest.projectId || "voice");
  const voiceDir = ensureInside(outputRoot, path.join(outputRoot, projectSegment, "voice"));
  fs.mkdirSync(voiceDir, { recursive: true });

  const audioPath = ensureInside(outputRoot, path.join(voiceDir, `${id}.${safeFormat}`));

  if (fs.existsSync(audioPath)) {
    throw new Error(`VoiceArtifact already exists and will not be overwritten: ${audioPath}`);
  }

  fs.writeFileSync(audioPath, Buffer.from(audioBytes));
  const stats = fs.statSync(audioPath);

  if (stats.size <= 0) {
    throw new Error(`VoiceArtifact write failed: ${audioPath}`);
  }

  const duration = getDurationWithFfprobe(audioPath, ffprobePath);

  return createVoiceArtifactMetadata({
    voiceRequest,
    binding,
    audioPath,
    format: safeFormat,
    duration,
    fileSize: stats.size,
    id,
    provenance: {
      artifactBridge: "local_file",
      ffprobeDurationAvailable: duration != null,
      ...provenance
    }
  });
}
