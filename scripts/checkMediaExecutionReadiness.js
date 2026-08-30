import fs from "fs";
import path from "path";
import { createMediaExecutionReadiness } from "../src/media/mediaExecutionReadiness.js";

const readiness = createMediaExecutionReadiness();
const outputDir = path.join("artifacts", "media", "phase20v");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "media_execution_readiness.json");
fs.writeFileSync(outputPath, `${JSON.stringify(readiness, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  localRenderReady: readiness.localRenderReady,
  localTranscriptionReady: readiness.localTranscriptionReady,
  ffmpeg: readiness.ffmpeg,
  ffprobe: readiness.ffprobe,
  localWhisper: readiness.localWhisper,
  externalWhisperApi: readiness.externalWhisperApi,
  blockers: readiness.blockers
}, null, 2));

if (!readiness.localRenderReady || !readiness.localTranscriptionReady) {
  process.exitCode = 1;
}
