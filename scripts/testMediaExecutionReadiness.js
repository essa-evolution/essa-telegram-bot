import assert from "assert";
import {
  createMediaExecutionReadiness,
  resolveFfmpeg,
  resolveFfprobe,
  resolveWhisperCpp
} from "../src/media/mediaExecutionReadiness.js";

const ffmpeg = resolveFfmpeg();
const ffprobe = resolveFfprobe();
const whisper = resolveWhisperCpp();
const readiness = createMediaExecutionReadiness();

assert.equal(ffmpeg.found, true, "ffmpeg should resolve through env, known local path, or PATH");
assert.equal(ffprobe.found, true, "ffprobe should resolve through env, known local path, or PATH");
assert.equal(whisper.cli.found, true, "local whisper.cpp CLI should resolve");
assert.equal(whisper.model.found, true, "local whisper.cpp model should resolve");
assert.equal(readiness.localRenderReady, true, "local render should be ready");
assert.equal(readiness.localTranscriptionReady, true, "local transcription should be ready");
assert.equal(readiness.externalCallsRequired, false, "local media readiness must not require external calls");
assert.equal(readiness.externalWhisperApi.providerKind, "OPENAI_WHISPER_API");
assert.equal(readiness.localWhisper.providerKind, "LOCAL_WHISPER_CPP");

console.log("Media execution readiness tests passed.");
