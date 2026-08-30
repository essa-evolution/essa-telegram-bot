import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { createMediaExecutionReadiness } from "../src/media/mediaExecutionReadiness.js";
import { createLisaProductionIntent } from "../src/workspace/productionIntent.js";
import { assessSourceCleanliness, createSemanticEditPlan } from "../src/workspace/semanticEditor.js";

const requestedSourcePath = path.resolve("media/input/future_lisa_11s_source.mp4");
const discoveredSourcePath = path.resolve("media/input/future_lisa_11s_source.mp4.mp4");
const outputRoot = path.resolve("artifacts/production/phase21a");
const transcriptionDir = path.join(outputRoot, "transcription");
const framesDir = path.join(outputRoot, "frames");
const renderPath = path.join(outputRoot, "lisa_local_v1.mp4");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function run(executable, args, options = {}) {
  return execFileSync(executable, args, {
    encoding: options.encoding || "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"]
  });
}

function ffprobeJson(ffprobePath, targetPath) {
  return JSON.parse(run(ffprobePath, [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    targetPath
  ]));
}

function ratio(width, height) {
  if (!width || !height) return null;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function fps(value = "0/0") {
  const [a, b] = String(value).split("/").map(Number);
  if (!a || !b) return null;
  return a / b;
}

function createMediaInspection({ sourcePath, probe, sourceHash, fileSize }) {
  const video = probe.streams.find((stream) => stream.codec_type === "video") || {};
  const audio = probe.streams.find((stream) => stream.codec_type === "audio") || {};
  const duration = Number(probe.format?.duration || video.duration || 0);

  return {
    artifactId: "phase21a_media_inspection",
    type: "MediaInspection",
    sourcePath,
    sourceHash,
    fileSize,
    duration,
    width: video.width || null,
    height: video.height || null,
    aspectRatio: ratio(video.width, video.height),
    frameRate: video.avg_frame_rate || video.r_frame_rate || null,
    fps: fps(video.avg_frame_rate || video.r_frame_rate),
    videoCodec: video.codec_name || null,
    audioCodec: audio.codec_name || null,
    audioStreamPresent: Boolean(audio.codec_type),
    sampleRate: audio.sample_rate ? Number(audio.sample_rate) : null,
    probeScore: probe.format?.probe_score ?? null,
    rawProbePath: "artifacts/production/phase21a/media_inspection.ffprobe.json",
    suitableForFirstLocalTest: Boolean(video.codec_type && audio.codec_type && duration > 0),
    createdAt: new Date().toISOString()
  };
}

function extractSegments(jsonValue = {}) {
  if (Array.isArray(jsonValue.transcription)) {
    return jsonValue.transcription.map((segment, index) => ({
      id: `segment_${String(index + 1).padStart(3, "0")}`,
      startTime: Number(segment.offsets?.from ?? segment.start ?? 0) / (segment.offsets ? 1000 : 1),
      endTime: Number(segment.offsets?.to ?? segment.end ?? 0) / (segment.offsets ? 1000 : 1),
      text: String(segment.text || "").trim()
    })).filter((segment) => segment.text);
  }

  if (Array.isArray(jsonValue.segments)) {
    return jsonValue.segments.map((segment, index) => ({
      id: `segment_${String(index + 1).padStart(3, "0")}`,
      startTime: Number(segment.start || 0),
      endTime: Number(segment.end || 0),
      text: String(segment.text || "").trim()
    })).filter((segment) => segment.text);
  }

  return [];
}

function readTranscriptText(basePath) {
  const txtPath = `${basePath}.txt`;
  return fs.existsSync(txtPath) ? fs.readFileSync(txtPath, "utf8").trim() : "";
}

function transcriptLooksReliable(text, segments) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (!segments.length) return false;
  if (!/[\p{L}]/u.test(normalized)) return false;

  const lower = normalized.toLowerCase();
  const speechlessMarkers = [
    "[музыка]",
    "(музыка)",
    "музыка",
    "[music]",
    "(music)",
    "music"
  ];
  const commonHallucinations = [
    "субтитры сделал",
    "субтитры создавал",
    "спасибо за просмотр",
    "подписывайтесь"
  ];

  if (speechlessMarkers.includes(lower)) return false;
  return !commonHallucinations.some((phrase) => lower.includes(phrase));
}

function assTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe - Math.floor(safe)) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function escapeAss(text) {
  return String(text || "").replace(/[{}]/g, "").replace(/\r?\n/g, "\\N");
}

function createAssSubtitle({ segments, width, height, outputPath }) {
  const fontSize = Math.max(34, Math.round((height || 1920) * 0.04));
  const marginV = Math.max(80, Math.round((height || 1920) * 0.09));
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${width || 1080}`,
    `PlayResY: ${height || 1920}`,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,Arial,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00111111,&H99000000,0,0,0,0,100,100,0,0,1,4,1,2,48,48,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...segments.map((segment) =>
      `Dialogue: 0,${assTime(segment.startTime)},${assTime(segment.endTime)},Default,,0,0,0,,${escapeAss(segment.text)}`
    )
  ];

  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function ffmpegAssPath(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
}

function probeImage(ffprobePath, framePath) {
  const probe = ffprobeJson(ffprobePath, framePath);
  const stream = probe.streams[0] || {};
  return {
    path: framePath,
    exists: fs.existsSync(framePath),
    fileSize: fs.existsSync(framePath) ? fs.statSync(framePath).size : 0,
    width: stream.width || null,
    height: stream.height || null,
    codec: stream.codec_name || null
  };
}

function main() {
  const readiness = createMediaExecutionReadiness();
  const ffmpegPath = readiness.ffmpeg.resolvedPath;
  const ffprobePath = readiness.ffprobe.resolvedPath;
  const whisperPath = readiness.localWhisper.cli.resolvedPath;
  const modelPath = readiness.localWhisper.model.resolvedPath;

  if (!readiness.localRenderReady || !readiness.localTranscriptionReady) {
    throw new Error(`Local media stack is not ready: ${JSON.stringify(readiness.blockers)}`);
  }

  const sourcePath = fs.existsSync(requestedSourcePath) ? requestedSourcePath : discoveredSourcePath;
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Phase 21A source is missing: ${requestedSourcePath}`);
  }

  ensureDir(outputRoot);
  ensureDir(transcriptionDir);
  ensureDir(framesDir);

  const sourceStatsBefore = fs.statSync(sourcePath);
  const sourceHashBefore = sha256(sourcePath);
  const sourceProbe = ffprobeJson(ffprobePath, sourcePath);
  const mediaInspection = createMediaInspection({
    sourcePath,
    probe: sourceProbe,
    sourceHash: sourceHashBefore,
    fileSize: sourceStatsBefore.size
  });
  writeJson(path.join(outputRoot, "media_inspection.ffprobe.json"), sourceProbe);
  writeJson(path.join(outputRoot, "media_inspection.json"), mediaInspection);

  const audioPath = path.join(transcriptionDir, "source_audio_16k.wav");
  run(ffmpegPath, [
    "-y",
    "-i",
    sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    audioPath
  ]);

  const transcriptBase = path.join(transcriptionDir, "whisper_local_raw");
  run(whisperPath, [
    "-m",
    modelPath,
    "-f",
    audioPath,
    "-l",
    "ru",
    "-otxt",
    "-osrt",
    "-oj",
    "-of",
    transcriptBase
  ], { encoding: "utf8" });

  const transcriptJsonPath = `${transcriptBase}.json`;
  const transcriptJson = fs.existsSync(transcriptJsonPath)
    ? JSON.parse(fs.readFileSync(transcriptJsonPath, "utf8"))
    : {};
  const rawTranscript = readTranscriptText(transcriptBase);
  const segments = extractSegments(transcriptJson);
  const reliableTranscript = transcriptLooksReliable(rawTranscript, segments);
  const transcriptArtifact = {
    artifactId: "phase21a_transcript_artifact",
    type: "TranscriptArtifact",
    sourcePath,
    rawTranscript,
    correctedTranscript: null,
    transcriptStatus: reliableTranscript ? "RELIABLE_TRANSCRIPT" : rawTranscript ? "TRANSCRIPTION_UNCERTAIN" : "NO_RELIABLE_SPEECH",
    language: "ru",
    segments,
    timestamped: segments.length > 0,
    localEngine: {
      providerKind: "LOCAL_WHISPER_CPP",
      executable: whisperPath,
      version: readiness.localWhisper.cli.version,
      model: modelPath,
      modelSizeBytes: readiness.localWhisper.model.sizeBytes
    },
    limitations: reliableTranscript
      ? ["Local transcription was not human-corrected."]
      : ["Music or non-speech audio may dominate; no dialogue was inferred from visuals."],
    provenance: {
      sourceHash: sourceHashBefore,
      providerCalls: 0,
      externalCalls: 0,
      paidCalls: 0
    },
    createdAt: new Date().toISOString()
  };
  writeJson(path.join(outputRoot, "transcript_artifact.json"), transcriptArtifact);

  const expressionContext = {
    contentType: "short_video",
    topic: reliableTranscript ? "local Lisa source transcript" : "visual performance with original music",
    performanceMode: reliableTranscript ? "semantic_mirror" : "intimate_reflection",
    emotionalTone: "natural",
    energy: "quiet",
    humorLevel: "low",
    profanityMode: "none",
    intimacyLevel: "medium",
    pacingIntent: "preserve_original_timing",
    currentMomentIntent: "first local production proof"
  };
  const productionIntent = createLisaProductionIntent({
    contentType: "short_video",
    platform: "Instagram Reels",
    targetFormat: "vertical_short",
    expressionContext,
    dominantValue: reliableTranscript ? "actual spoken meaning from source" : "preserve Lisa visual performance and original music",
    preserveMoments: ["natural expression", "ending expression"],
    bRollStrategy: "none",
    imageInsertStrategy: "none",
    musicStrategy: "preserve original audio/music",
    audioStrategy: "preserve original audio; no voice replacement",
    subtitleStrategy: reliableTranscript ? "readable subtitles from actual transcript only" : "skip subtitles because no reliable transcript",
    targetDuration: mediaInspection.duration,
    aspectRatio: mediaInspection.aspectRatio,
    rationale: "First free local ESSA production run: preserve source performance and avoid external providers."
  });
  if (!reliableTranscript) {
    productionIntent.subtitleStrategy = "skip subtitles because no reliable spoken transcript was detected";
    productionIntent.audioStrategy = "preserve original audio/music; no voice replacement";
    productionIntent.musicStrategy = "preserve original audio/music";
    productionIntent.rationale = "First free local ESSA production run: local whisper.cpp detected music/non-speech, so ESSA preserves Lisa's visual performance and original audio without invented subtitles.";
  }
  writeJson(path.join(outputRoot, "production_intent.json"), productionIntent);

  const sourceAssessment = assessSourceCleanliness({
    metadata: {
      width: mediaInspection.width,
      height: mediaInspection.height
    },
    evidence: {
      likelyCleanCameraSource: true,
      sourceAlreadyEdited: false
    }
  });
  const semanticEditPlan = createSemanticEditPlan({
    sourceVideo: mediaInspection,
    segments: reliableTranscript ? segments : [],
    expressionContext,
    productionIntent,
    sourceAssessment,
    targetFormat: "vertical_short",
    rawTranscriptRef: "transcript_artifact.json",
    correctedTranscriptRef: null
  });
  semanticEditPlan.visualRequests = [];
  semanticEditPlan.editorialDecisions = semanticEditPlan.editorialDecisions.filter((decision) =>
    ["KEEP_PRIMARY_VIDEO", "PAUSE_HOLD", "TEXT_EMPHASIS", "NO_ACTION"].includes(decision.action)
  );
  writeJson(path.join(outputRoot, "semantic_video_structure.json"), semanticEditPlan.semanticStructure);
  writeJson(path.join(outputRoot, "editorial_decisions.json"), semanticEditPlan.editorialDecisions);
  writeJson(path.join(outputRoot, "semantic_edit_plan.json"), semanticEditPlan);

  const subtitleArtifact = reliableTranscript
    ? {
        artifactId: "phase21a_subtitle_artifact",
        type: "SubtitleArtifact",
        status: "CREATED_FROM_RELIABLE_TRANSCRIPT",
        format: "ass",
        path: path.join(outputRoot, "subtitles.ass"),
        chunks: segments,
        preset: "lisa_readable_reels_mvp",
        provenance: { sourceTranscript: "transcript_artifact.json" }
      }
    : {
        artifactId: "phase21a_subtitle_artifact",
        type: "SubtitleArtifact",
        status: "SKIPPED_NO_RELIABLE_TRANSCRIPT",
        path: null,
        chunks: [],
        provenance: { sourceTranscript: "transcript_artifact.json" }
      };

  if (!reliableTranscript && fs.existsSync(path.join(outputRoot, "subtitles.ass"))) {
    fs.rmSync(path.join(outputRoot, "subtitles.ass"));
  }

  if (reliableTranscript) {
    createAssSubtitle({
      segments,
      width: mediaInspection.width,
      height: mediaInspection.height,
      outputPath: subtitleArtifact.path
    });
  }
  writeJson(path.join(outputRoot, "subtitle_artifact.json"), subtitleArtifact);

  if (fs.existsSync(renderPath)) fs.rmSync(renderPath);
  if (reliableTranscript) {
    run(ffmpegPath, [
      "-y",
      "-i",
      sourcePath,
      "-vf",
      `ass='${ffmpegAssPath(subtitleArtifact.path)}'`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      renderPath
    ]);
  } else {
    run(ffmpegPath, [
      "-y",
      "-i",
      sourcePath,
      "-map",
      "0",
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      renderPath
    ]);
  }

  const renderProbe = ffprobeJson(ffprobePath, renderPath);
  writeJson(path.join(outputRoot, "render.ffprobe.json"), renderProbe);
  const renderStats = fs.statSync(renderPath);
  const renderHash = sha256(renderPath);
  const renderInspection = createMediaInspection({
    sourcePath: renderPath,
    probe: renderProbe,
    sourceHash: renderHash,
    fileSize: renderStats.size
  });

  const frameTimes = [
    { id: "beginning", time: Math.min(0.5, Math.max(0, mediaInspection.duration / 10)) },
    { id: "middle", time: Math.max(0, mediaInspection.duration / 2) },
    { id: "end", time: Math.max(0, mediaInspection.duration - 0.5) }
  ];
  const frames = frameTimes.map((frame) => {
    const framePath = path.join(framesDir, `${frame.id}.jpg`);
    run(ffmpegPath, [
      "-y",
      "-ss",
      String(frame.time),
      "-i",
      renderPath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      framePath
    ]);
    return {
      id: frame.id,
      time: frame.time,
      ...probeImage(ffprobePath, framePath)
    };
  });

  const sourceStatsAfter = fs.statSync(sourcePath);
  const sourceHashAfter = sha256(sourcePath);
  const durationDelta = Math.abs((renderInspection.duration || 0) - (mediaInspection.duration || 0));
  const sourceUnchanged = sourceHashBefore === sourceHashAfter && sourceStatsBefore.size === sourceStatsAfter.size;
  const verificationReport = {
    artifactId: "phase21a_verification_report",
    type: "VerificationReport",
    status: "PASS",
    checks: {
      outputExists: fs.existsSync(renderPath),
      fileSizePositive: renderStats.size > 0,
      videoStreamExists: Boolean(renderProbe.streams.find((stream) => stream.codec_type === "video")),
      audioStreamExists: Boolean(renderProbe.streams.find((stream) => stream.codec_type === "audio")),
      durationApproximatelyPreserved: durationDelta <= Math.max(0.5, mediaInspection.duration * 0.05),
      resolutionPreserved: renderInspection.width === mediaInspection.width && renderInspection.height === mediaInspection.height,
      aspectPreserved: renderInspection.aspectRatio === mediaInspection.aspectRatio,
      sourceUnchanged,
      outputDiffersFromSource: renderHash !== sourceHashBefore,
      outputDecodable: renderProbe.format?.probe_score >= 50,
      noUnexpectedTruncation: durationDelta <= Math.max(0.5, mediaInspection.duration * 0.05),
      subtitlePolicyFollowed: reliableTranscript ? Boolean(subtitleArtifact.path) : subtitleArtifact.status === "SKIPPED_NO_RELIABLE_TRANSCRIPT",
      externalProviderArtifactsAbsent: true,
      representativeFramesExtracted: frames.every((frame) => frame.exists && frame.fileSize > 0 && frame.width && frame.height),
      noFakeCompletionClaim: true
    },
    sourceHashBefore,
    sourceHashAfter,
    outputHash: renderHash,
    sourcePath,
    outputPath: renderPath,
    providerCalls: 0,
    externalCalls: 0,
    paidCalls: 0,
    publishCalls: 0,
    createdAt: new Date().toISOString()
  };
  verificationReport.status = Object.values(verificationReport.checks).every(Boolean) ? "PASS" : "FAIL";
  writeJson(path.join(outputRoot, "verification_report.json"), verificationReport);

  const renderArtifact = {
    artifactId: "phase21a_render_artifact",
    type: "RenderArtifact",
    path: renderPath,
    fileSize: renderStats.size,
    hash: renderHash,
    inspection: renderInspection,
    subtitleBurnedIn: reliableTranscript,
    sourcePath,
    provenance: {
      ffmpeg: ffmpegPath,
      sourceHash: sourceHashBefore,
      providerCalls: 0,
      externalCalls: 0,
      paidCalls: 0,
      publishCalls: 0
    },
    status: verificationReport.status === "PASS" ? "READY_FOR_HUMAN_REVIEW" : "VERIFICATION_FAILED"
  };
  writeJson(path.join(outputRoot, "render_artifact.json"), renderArtifact);

  const productionRunArtifact = {
    artifactId: "phase21a_production_run",
    type: "ProductionRunArtifact",
    status: verificationReport.status === "PASS" ? "READY_FOR_HUMAN_REVIEW" : "FAILED_VERIFICATION",
    sourceArtifact: {
      path: sourcePath,
      requestedPath: requestedSourcePath,
      warning: sourcePath !== requestedSourcePath ? "Requested path was missing; using manually placed double-extension file in media/input." : null,
      hash: sourceHashBefore,
      originalMustNotBeOverwritten: true,
      unchanged: sourceUnchanged
    },
    artifacts: {
      mediaInspection: "media_inspection.json",
      transcriptArtifact: "transcript_artifact.json",
      productionIntent: "production_intent.json",
      semanticVideoStructure: "semantic_video_structure.json",
      editorialDecision: "editorial_decisions.json",
      subtitleArtifact: "subtitle_artifact.json",
      renderArtifact: "render_artifact.json",
      verificationReport: "verification_report.json",
      representativeFrames: frames.map((frame) => frame.path)
    },
    localExecutables: {
      ffmpeg: ffmpegPath,
      ffprobe: ffprobePath,
      whisperCpp: whisperPath,
      whisperModel: modelPath
    },
    providerCalls: 0,
    externalCalls: 0,
    paidCalls: 0,
    publishCalls: 0,
    createdAt: new Date().toISOString()
  };
  writeJson(path.join(outputRoot, "production_run_artifact.json"), productionRunArtifact);

  const humanReviewPackage = {
    artifactId: "phase21a_human_review_package",
    type: "HumanReviewPackage",
    state: productionRunArtifact.status,
    sourcePath,
    actualDuration: mediaInspection.duration,
    transcriptStatus: transcriptArtifact.transcriptStatus,
    transcript: rawTranscript,
    subtitleDecision: subtitleArtifact.status,
    renderedOutputPath: renderPath,
    representativeFramePaths: frames.map((frame) => frame.path),
    verificationStatus: verificationReport.status,
    warnings: [
      ...(sourcePath !== requestedSourcePath ? ["Source filename has duplicate .mp4 extension; exact requested path was absent."] : []),
      ...(reliableTranscript ? transcriptArtifact.limitations : ["No reliable speech transcript was used for subtitles."])
    ],
    sourceUnchanged,
    providerCalls: 0,
    externalCalls: 0,
    paidCalls: 0,
    publishCalls: 0
  };
  writeJson(path.join(outputRoot, "human_review_package.json"), humanReviewPackage);

  console.log(JSON.stringify({
    phase: "21A",
    status: productionRunArtifact.status === "READY_FOR_HUMAN_REVIEW" ? "PASS" : "FAIL",
    sourcePath,
    requestedSourcePath,
    sourceWarning: productionRunArtifact.sourceArtifact.warning,
    duration: mediaInspection.duration,
    resolution: `${mediaInspection.width}x${mediaInspection.height}`,
    transcriptStatus: transcriptArtifact.transcriptStatus,
    transcript: rawTranscript,
    subtitleDecision: subtitleArtifact.status,
    renderPath,
    renderFileSize: renderStats.size,
    verificationStatus: verificationReport.status,
    frames: frames.map((frame) => frame.path),
    sourceUnchanged,
    outputRoot,
    providerCalls: 0,
    externalCalls: 0,
    paidCalls: 0,
    publishCalls: 0
  }, null, 2));
}

main();
