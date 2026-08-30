import { createDynamicExpressionContext } from "../identity/dynamicExpressionContext.js";
import { getLisaProductionProfile, NEEDS_USER_DECISION, PLATFORM_RULE_REQUIRED } from "../identity/lisaProductionProfile.js";

export const productionIntentFields = [
  "contentType",
  "platform",
  "targetFormat",
  "expressionContext",
  "dominantValue",
  "emotionalArc",
  "attentionStrategy",
  "editingMode",
  "pacingIntent",
  "preserveMoments",
  "cutStrategy",
  "zoomStrategy",
  "bRollStrategy",
  "imageInsertStrategy",
  "subtitleStrategy",
  "musicStrategy",
  "audioStrategy",
  "hookStrategy",
  "endingStrategy",
  "targetDuration",
  "aspectRatio",
  "rationale",
  "unresolved"
];

function expressionValue(expressionContext = {}, field, fallback = "") {
  return String(expressionContext?.[field] ?? fallback).toLowerCase();
}

function isHigh(value) {
  return ["high", "dense", "fast"].includes(String(value || "").toLowerCase());
}

function isQuiet(value) {
  return ["quiet", "low", "slow", "minimal"].includes(String(value || "").toLowerCase());
}

function buildStandupIntent(base) {
  return {
    ...base,
    dominantValue: "humor and absurdity without losing Lisa presence",
    emotionalArc: "quick escalation, punchline, live reaction",
    attentionStrategy: "rhythm, reactions and contextual visual jokes when they strengthen the material",
    editingMode: "standup_adaptive",
    pacingIntent: base.expressionContext.pacingIntent || "dense_when_it_serves_the_joke",
    preserveMoments: ["punchlines", "laughs", "reaction pauses", "absurdity turns"],
    cutStrategy: "tighter cuts are allowed when they improve comic timing",
    zoomStrategy: "reaction zooms are allowed when they emphasize the live beat",
    bRollStrategy: "contextual visual jokes or B-roll are allowed only when they strengthen the thought",
    imageInsertStrategy: "use inserts as comedic or semantic counterpoint, not fixed frequency",
    subtitleStrategy: "dynamic subtitles are allowed if they remain readable and do not create noise",
    musicStrategy: "rhythmic or comedic music is optional; voice remains primary",
    audioStrategy: "preserve speech and organic profanity if expression context calls for it",
    hookStrategy: "lead with the funniest or sharpest thought when it is the real hook",
    endingStrategy: "land the thought or punchline without adding generic CTA pressure",
    rationale: "High humor, irony, energy and absurdity allow denser adaptive editing without changing Lisa identity."
  };
}

function buildQuietIntent(base) {
  return {
    ...base,
    dominantValue: "presence, silence and emotional depth",
    emotionalArc: "slow recognition, pause, quiet aftertaste",
    attentionStrategy: "hold the human moment instead of decorating it",
    editingMode: "intimate_minimal",
    pacingIntent: base.expressionContext.pacingIntent || "slow",
    preserveMoments: ["long live takes", "gaze", "breath", "silence", "soft reaction"],
    cutStrategy: "minimum cuts; avoid cutting meaningful silence",
    zoomStrategy: "avoid decorative zooms; use only if intimacy or meaning increases",
    bRollStrategy: "usually none unless a visual is necessary to understand the thought",
    imageInsertStrategy: "avoid inserts that break the emotional field",
    subtitleStrategy: "calm readable subtitles; no aggressive animation",
    musicStrategy: "none or almost invisible background only if it supports the moment",
    audioStrategy: "voice and silence are primary",
    hookStrategy: "begin with the phrase or moment that opens emotional attention",
    endingStrategy: "leave space; do not over-explain",
    rationale: "Quiet intimate reflection needs minimal intervention and must not receive a stand-up template."
  };
}

function buildDirectMirrorIntent(base) {
  return {
    ...base,
    dominantValue: "semantic clarity of the mechanism",
    emotionalArc: "recognition of pattern, mirror, possible shift",
    attentionStrategy: "make the mechanism visible without assigning blame",
    editingMode: "semantic_mirror",
    pacingIntent: base.expressionContext.pacingIntent || "clear_and_controlled",
    preserveMoments: ["key phrase", "human reaction", "pause after recognition", "mechanism explanation"],
    cutStrategy: "cut around the thought structure, not around decoration",
    zoomStrategy: "use emphasis only on mechanism turns or recognitions",
    bRollStrategy: "use only where it helps reveal absurdity or the behavioral pattern",
    imageInsertStrategy: "semantic inserts only; avoid clutter",
    subtitleStrategy: "highlight key phrases if a later preset supports it",
    musicStrategy: "none, subtle or restrained; never compete with the thought",
    audioStrategy: "speech intelligibility and pause preservation are primary",
    hookStrategy: "the thought or phrase is the hook",
    endingStrategy: "close on the visible mechanism or the self-recognition moment",
    rationale: "Direct mirror material is semantic-first: reaction and pause can matter more than decorative editing."
  };
}

export function createProductionIntent(input = {}) {
  const expressionContext = createDynamicExpressionContext(input.expressionContext || {});
  const base = {
    contentType: input.contentType || null,
    platform: input.platform || null,
    targetFormat: input.targetFormat || null,
    expressionContext,
    dominantValue: input.dominantValue || NEEDS_USER_DECISION,
    emotionalArc: input.emotionalArc || NEEDS_USER_DECISION,
    attentionStrategy: input.attentionStrategy || NEEDS_USER_DECISION,
    editingMode: input.editingMode || NEEDS_USER_DECISION,
    pacingIntent: input.pacingIntent || expressionContext.pacingIntent || null,
    preserveMoments: input.preserveMoments || [],
    cutStrategy: input.cutStrategy || NEEDS_USER_DECISION,
    zoomStrategy: input.zoomStrategy || NEEDS_USER_DECISION,
    bRollStrategy: input.bRollStrategy || NEEDS_USER_DECISION,
    imageInsertStrategy: input.imageInsertStrategy || NEEDS_USER_DECISION,
    subtitleStrategy: input.subtitleStrategy || NEEDS_USER_DECISION,
    musicStrategy: input.musicStrategy || NEEDS_USER_DECISION,
    audioStrategy: input.audioStrategy || NEEDS_USER_DECISION,
    hookStrategy: input.hookStrategy || NEEDS_USER_DECISION,
    endingStrategy: input.endingStrategy || NEEDS_USER_DECISION,
    targetDuration: input.targetDuration || NEEDS_USER_DECISION,
    aspectRatio: input.aspectRatio || PLATFORM_RULE_REQUIRED,
    rationale: input.rationale || "",
    unresolved: input.unresolved || []
  };

  if (
    expressionValue(expressionContext, "performanceMode") === "standup" ||
    (isHigh(expressionContext.humorLevel) && isHigh(expressionContext.energy))
  ) {
    return buildStandupIntent(base);
  }

  if (
    expressionValue(expressionContext, "performanceMode") === "intimate_reflection" ||
    (isQuiet(expressionContext.energy) && isQuiet(expressionContext.humorLevel))
  ) {
    return buildQuietIntent(base);
  }

  if (
    expressionValue(expressionContext, "performanceMode").includes("mirror") ||
    expressionValue(expressionContext, "currentMomentIntent").includes("mechanism") ||
    expressionValue(expressionContext, "topic").includes("mechanism")
  ) {
    return buildDirectMirrorIntent(base);
  }

  return {
    ...base,
    dominantValue: input.dominantValue || "material-specific meaning",
    editingMode: input.editingMode || "adaptive",
    rationale: input.rationale || "No fixed template was selected; planner must adapt from source material."
  };
}

export function createLisaProductionIntent(input = {}) {
  return {
    identityId: "lisa",
    productionProfileId: getLisaProductionProfile("lisa")?.profileId || null,
    ...createProductionIntent(input)
  };
}

export const editPlanContract = {
  sourceVideo: null,
  targetFormat: null,
  timeline: [],
  cuts: [],
  preservedMoments: [],
  subtitles: null,
  overlays: [],
  visualInserts: [],
  bRoll: [],
  zooms: [],
  audio: null,
  music: null,
  branding: null,
  export: null
};
