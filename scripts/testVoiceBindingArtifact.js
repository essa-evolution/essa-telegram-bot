import fs from "fs";
import os from "os";
import path from "path";
import {
  createVoiceRequest,
  getVoiceHealth,
  prepareProductionVoiceRequest,
  resolveVoiceBinding,
  saveVoiceArtifact
} from "../src/voice/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) {
    failures += 1;
  }

  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function createSilentWav({
  sampleRate = 16000,
  seconds = 0.25
} = {}) {
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function containsSecretLikeValue(value) {
  const text = JSON.stringify(value);
  return /sk-[a-z0-9_-]{20,}|sk_[a-z0-9_-]{20,}|xi-api-key|elevenlabs_api_key\\s*[:=]\\s*[^"\\s]*(?!MISSING|PRESENT)/i.test(text);
}

const originalEnv = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_LISA_VOICE_ID: process.env.ELEVENLABS_LISA_VOICE_ID,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID
};

delete process.env.ELEVENLABS_API_KEY;
delete process.env.ELEVENLABS_LISA_VOICE_ID;
delete process.env.ELEVENLABS_VOICE_ID;

const quietRequest = createVoiceRequest({
  identityId: "lisa",
  text: "Тихий тест голоса Лисы.",
  language: "ru",
  purpose: "production_voiceover",
  deliveryIntent: {
    performanceMode: "quiet_reflection",
    energy: "quiet"
  },
  outputFormat: "wav",
  projectId: "phase19c_test"
});
const standupRequest = createVoiceRequest({
  ...quietRequest,
  deliveryIntent: {
    performanceMode: "standup",
    energy: "high"
  }
});

const quietPrepared = prepareProductionVoiceRequest(quietRequest);
const standupPrepared = prepareProductionVoiceRequest(standupRequest);

check(
  quietPrepared.binding?.identityId === "lisa" &&
    quietPrepared.binding?.voiceIdentityId === "lisa_voice" &&
    quietPrepared.provider === "elevenlabs",
  "Test A Lisa VoiceRequest resolves to Lisa binding metadata without API call",
  {
    identityId: quietPrepared.binding?.identityId,
    voiceIdentityId: quietPrepared.binding?.voiceIdentityId,
    provider: quietPrepared.provider,
    providerCallMade: quietPrepared.providerCallMade
  }
);

check(
  quietPrepared.binding?.voiceIdentityId === standupPrepared.binding?.voiceIdentityId &&
    quietPrepared.voiceRequest.deliveryIntent.performanceMode !== standupPrepared.voiceRequest.deliveryIntent.performanceMode,
  "Test B different deliveryIntent values use same stable Lisa voice identity",
  {
    quiet: quietPrepared.voiceRequest.deliveryIntent,
    standup: standupPrepared.voiceRequest.deliveryIntent,
    voiceIdentityId: quietPrepared.binding?.voiceIdentityId
  }
);

const missingResolution = resolveVoiceBinding("lisa");
check(
  missingResolution.safeStatus === "NOT_CONFIGURED" &&
    missingResolution.safeConfig.apiKey === "MISSING" &&
    missingResolution.safeConfig.providerVoiceId === "MISSING" &&
    missingResolution.executable === false,
  "Test C missing API key / voice ID returns safe NOT_CONFIGURED state",
  missingResolution.safeConfig
);

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "essa_voice_artifact_"));
const ffprobePath = "C:\\Users\\Lisa\\Tools\\ffmpeg\\ffmpeg-9.0.1-essentials_build\\bin\\ffprobe.exe";
const artifact = saveVoiceArtifact({
  audioBytes: createSilentWav(),
  voiceRequest: quietRequest,
  binding: quietPrepared.binding,
  outputRoot,
  phaseOrProjectId: "phase19c_test",
  artifactId: "voice_audio_phase19c_fixture",
  format: "wav",
  ffprobePath: fs.existsSync(ffprobePath) ? ffprobePath : null,
  provenance: {
    testFixture: true,
    providerCallMade: false
  }
});

check(
  fs.existsSync(artifact.audioPath) &&
    artifact.fileSize > 0 &&
    artifact.type === "voice_audio" &&
    artifact.status === "saved",
  "Test D local VoiceArtifact saver writes fixture and returns metadata",
  {
    audioPath: artifact.audioPath,
    fileSize: artifact.fileSize,
    type: artifact.type
  }
);

check(
  artifact.duration == null || artifact.duration > 0,
  "Test E FFmpeg can inspect saved fixture when available",
  {
    duration: artifact.duration,
    ffprobeAvailable: fs.existsSync(ffprobePath)
  }
);

const health = getVoiceHealth();
check(
  health.lisaVoiceBinding?.binding === "PRESENT" &&
    health.lisaVoiceBinding?.apiKey === "MISSING" &&
    health.lisaVoiceBinding?.providerVoiceId === "MISSING" &&
    health.lisaVoiceBinding?.artifactBridge === "READY",
  "voiceHealth reports safe Lisa binding status",
  health.lisaVoiceBinding
);

check(
  !containsSecretLikeValue({
    quietPrepared,
    missingResolution,
    artifact,
    health
  }),
  "Test F no secret-like values appear in test reports"
);

process.env.ELEVENLABS_API_KEY = originalEnv.ELEVENLABS_API_KEY;
process.env.ELEVENLABS_LISA_VOICE_ID = originalEnv.ELEVENLABS_LISA_VOICE_ID;
process.env.ELEVENLABS_VOICE_ID = originalEnv.ELEVENLABS_VOICE_ID;

if (failures > 0) {
  console.error(`Voice binding/artifact tests failed: ${failures}`);
  process.exit(1);
}

console.log("Voice binding/artifact tests passed.");
