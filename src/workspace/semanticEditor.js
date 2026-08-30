export const EDITOR_APPROVAL_GATES = {
  PLAN_READY: "EDITOR_PLAN_READY_FOR_APPROVAL"
};

export const EDITOR_ACTIONS = {
  KEEP_PRIMARY_VIDEO: "KEEP_PRIMARY_VIDEO",
  CUT: "CUT",
  PUNCH_IN: "PUNCH_IN",
  PUNCH_OUT: "PUNCH_OUT",
  REFRAME: "REFRAME",
  TEXT_EMPHASIS: "TEXT_EMPHASIS",
  VISUAL_INSERT: "VISUAL_INSERT",
  BROLL_REQUEST: "BROLL_REQUEST",
  GENERATED_VISUAL_REQUEST: "GENERATED_VISUAL_REQUEST",
  GRAPHIC_REQUEST: "GRAPHIC_REQUEST",
  PAUSE_HOLD: "PAUSE_HOLD",
  AUDIO_EMPHASIS: "AUDIO_EMPHASIS",
  TRANSITION: "TRANSITION",
  NO_ACTION: "NO_ACTION"
};

export const visualRequestContract = {
  id: null,
  type: null,
  concept: null,
  mood: null,
  durationIntent: null,
  sourceStrategy: null,
  returnToPrimarySubject: true,
  avoid: [],
  rationale: null,
  unresolvedRequirements: []
};

export const semanticBeatContract = {
  id: null,
  startTime: 0,
  endTime: 0,
  transcript: "",
  normalizedText: "",
  semanticRole: null,
  topic: null,
  emotionalFunction: null,
  intensity: "medium",
  keyIdea: null,
  hookStrength: 0,
  retentionImportance: 0,
  visualImportance: 0,
  pauseImportance: 0,
  humorOpportunity: 0,
  ironyOpportunity: 0,
  emphasisWords: [],
  preservePerformance: true,
  visualConcepts: [],
  notes: []
};

export const editorialDecisionContract = {
  id: null,
  startTime: 0,
  endTime: 0,
  action: EDITOR_ACTIONS.NO_ACTION,
  reason: "",
  semanticTrigger: null,
  priority: "medium",
  intensity: "medium",
  visualRequest: null,
  preserveSpeech: true,
  preserveFace: true,
  transitionIntent: null,
  confidence: 0,
  unresolvedRequirements: []
};

export const sourceAssessmentContract = {
  likelyCleanCameraSource: null,
  existingTextOverlays: false,
  existingWatermark: false,
  existingBakedSubtitles: false,
  existingBakedBroll: false,
  existingTransitions: false,
  sourceAlreadyEdited: false,
  suitabilityForReEdit: "unknown",
  warnings: []
};

export const semanticEditPlanContract = {
  sourceVideo: null,
  targetFormat: null,
  semanticStructure: null,
  editorialDecisions: [],
  timeline: [],
  visualRequests: [],
  subtitlePlan: null,
  unresolvedRequirements: [],
  approvalGate: null,
  renderPlan: null
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function seconds(value, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return fallback;
  const parts = value.replace(",", ".").split(":").map(Number);
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function segmentStart(segment = {}) {
  if (segment.startTime != null) return seconds(segment.startTime);
  if (segment.start != null) return seconds(segment.start);
  if (segment.offsets?.from != null) return segment.offsets.from / 1000;
  if (segment.timestamps?.from != null) return seconds(segment.timestamps.from);
  return 0;
}

function segmentEnd(segment = {}) {
  if (segment.endTime != null) return seconds(segment.endTime);
  if (segment.end != null) return seconds(segment.end);
  if (segment.offsets?.to != null) return segment.offsets.to / 1000;
  if (segment.timestamps?.to != null) return seconds(segment.timestamps.to);
  return segmentStart(segment);
}

function normalized(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function inferRole(text, index, total) {
  const n = normalized(text);
  if (index === 0 && n.length) return "hook";
  if (includesAny(n, ["почему", "because", "потому", "механизм", "отражение", "внутрен"])) return "mechanism";
  if (includesAny(n, ["если", "например", "когда", "каждый"])) return "example";
  if (includesAny(n, ["но", "а ", "вместо", "однако"])) return "contrast";
  if (includesAny(n, ["вдруг", "оказывается", "понима", "realization"])) return "realization";
  if (index >= total - 2 || includesAny(n, ["может быть", "именно тогда", "в итоге"])) return "conclusion";
  return "setup";
}

function inferMode({ expressionContext = {}, productionIntent = {} } = {}) {
  const values = [
    expressionContext.performanceMode,
    expressionContext.currentMomentIntent,
    expressionContext.topic,
    productionIntent.editingMode,
    productionIntent.pacingIntent
  ].map((value) => String(value || "").toLowerCase()).join(" ");

  if (values.includes("standup") || values.includes("humor") || values.includes("comedy")) return "standup";
  if (values.includes("mirror") || values.includes("mechanism") || values.includes("philosoph")) return "semantic_mirror";
  if (values.includes("quiet") || values.includes("intimate") || values.includes("minimal")) return "quiet_reflection";
  return "adaptive";
}

function emphasisWordsFor(text = "") {
  const n = normalized(text);
  return [
    "мир",
    "отражение",
    "внутреннего",
    "страх",
    "любов",
    "внимание",
    "энергия",
    "выбор",
    "свобода"
  ].filter((word) => n.includes(word));
}

function visualConceptsFor(role, text = "") {
  const n = normalized(text);
  const concepts = [];

  if (n.includes("отражение") || n.includes("внутрен")) {
    concepts.push({
      type: "symbolic_reflection",
      concept: "inner state reflected as outer world",
      mood: "contemplative"
    });
  }

  if (n.includes("ребен") || n.includes("детск")) {
    concepts.push({
      type: "contextual_memory",
      concept: "childhood emotional conditioning",
      mood: "tender restrained",
      avoid: ["melodrama", "literal exploitation"]
    });
  }

  if (role === "contrast") {
    concepts.push({
      type: "semantic_contrast",
      concept: "outer conflict contrasted with inner origin",
      mood: "clear"
    });
  }

  return concepts;
}

function scoreBeat(role, text, mode) {
  const n = normalized(text);
  const hasQuestion = text.includes("?") || n.includes("почему");
  const hookStrength = role === "hook" ? 0.95 : hasQuestion ? 0.75 : role === "conclusion" ? 0.65 : 0.4;
  const retentionImportance = ["hook", "mechanism", "contrast", "realization", "conclusion"].includes(role) ? 0.85 : 0.55;
  const visualImportance = mode === "quiet_reflection"
    ? 0.15
    : ["mechanism", "contrast"].includes(role)
      ? 0.75
      : role === "hook"
        ? 0.55
        : 0.35;
  const pauseImportance = role === "realization" || role === "conclusion" ? 0.75 : 0.35;
  const humorOpportunity = mode === "standup" ? (includesAny(n, ["смеш", "абсурд", "ну", "представ"]) ? 0.85 : 0.55) : 0.05;
  const ironyOpportunity = mode === "standup" || includesAny(n, ["вдруг", "оказывается", "вместо"]) ? 0.65 : 0.1;

  return {
    hookStrength,
    retentionImportance,
    visualImportance,
    pauseImportance,
    humorOpportunity,
    ironyOpportunity
  };
}

export function createVisualRequest(input = {}) {
  return {
    ...visualRequestContract,
    id: input.id || `visual_request_${input.beatId || Date.now()}`,
    type: input.type || "symbolic",
    concept: input.concept || null,
    mood: input.mood || "supportive",
    durationIntent: input.durationIntent || "short_supporting_insert",
    sourceStrategy: input.sourceStrategy || "unresolved",
    returnToPrimarySubject: input.returnToPrimarySubject !== false,
    avoid: Array.isArray(input.avoid) ? input.avoid : [],
    rationale: input.rationale || "",
    unresolvedRequirements: input.unresolvedRequirements || ["source_or_generation_strategy"]
  };
}

export function createSemanticVideoStructure({
  segments = [],
  expressionContext = {},
  productionIntent = {},
  topic = null
} = {}) {
  const mode = inferMode({ expressionContext, productionIntent });
  const beats = segments.map((segment, index) => {
    const transcript = String(segment.text || segment.transcript || "").trim();
    const semanticRole = segment.semanticRole || inferRole(transcript, index, segments.length);
    const scores = scoreBeat(semanticRole, transcript, mode);
    const visualConcepts = visualConceptsFor(semanticRole, transcript);

    return {
      ...semanticBeatContract,
      id: segment.id || `beat_${String(index + 1).padStart(3, "0")}`,
      startTime: segmentStart(segment),
      endTime: segmentEnd(segment),
      transcript,
      normalizedText: normalized(transcript),
      semanticRole,
      topic: segment.topic || topic || expressionContext.topic || null,
      emotionalFunction: segment.emotionalFunction || semanticRole,
      intensity: mode === "standup" ? "high" : mode === "quiet_reflection" ? "low" : "medium",
      keyIdea: transcript,
      ...scores,
      emphasisWords: emphasisWordsFor(transcript),
      preservePerformance: true,
      visualConcepts,
      notes: []
    };
  });

  return {
    id: `semantic_video_structure_${Date.now()}`,
    mode,
    beatCount: beats.length,
    beats,
    summary: {
      topic: topic || expressionContext.topic || null,
      strongestHook: beats.sort((a, b) => b.hookStrength - a.hookStrength)[0]?.transcript || "",
      primarySubjectIsAnchor: true
    }
  };
}

function maxVisualInserts(mode, beatCount) {
  if (mode === "quiet_reflection") return 0;
  if (mode === "standup") return Math.max(1, Math.ceil(beatCount * 0.35));
  if (mode === "semantic_mirror") return Math.max(1, Math.ceil(beatCount * 0.25));
  return Math.max(1, Math.ceil(beatCount * 0.2));
}

function createDecision(input = {}) {
  return {
    ...editorialDecisionContract,
    id: input.id || `edit_decision_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    startTime: input.startTime ?? 0,
    endTime: input.endTime ?? input.startTime ?? 0,
    action: input.action || EDITOR_ACTIONS.NO_ACTION,
    reason: input.reason || "",
    semanticTrigger: input.semanticTrigger || null,
    priority: input.priority || "medium",
    intensity: input.intensity || "medium",
    visualRequest: input.visualRequest || null,
    preserveSpeech: input.preserveSpeech !== false,
    preserveFace: input.preserveFace !== false,
    transitionIntent: input.transitionIntent || null,
    confidence: clamp(input.confidence ?? 0.75),
    unresolvedRequirements: input.unresolvedRequirements || []
  };
}

export function createEditorialDecisions({
  semanticStructure,
  expressionContext = {},
  productionIntent = {},
  sourceAssessment = sourceAssessmentContract
} = {}) {
  const structure = semanticStructure || createSemanticVideoStructure({ expressionContext, productionIntent });
  const mode = structure.mode || inferMode({ expressionContext, productionIntent });
  const decisions = [];
  const visualRequests = [];
  let visualInsertCount = 0;
  const visualLimit = maxVisualInserts(mode, structure.beats.length);

  structure.beats.forEach((beat, index) => {
    decisions.push(createDecision({
      id: `${beat.id}_primary_anchor`,
      startTime: beat.startTime,
      endTime: beat.endTime,
      action: EDITOR_ACTIONS.KEEP_PRIMARY_VIDEO,
      reason: "Lisa remains the primary carrier of voice, face and meaning.",
      semanticTrigger: beat.semanticRole,
      priority: beat.retentionImportance > 0.8 ? "high" : "medium",
      intensity: mode === "standup" ? "medium" : "low",
      confidence: 0.9
    }));

    if (mode === "quiet_reflection") {
      if (beat.pauseImportance > 0.6) {
        decisions.push(createDecision({
          id: `${beat.id}_pause_hold`,
          startTime: beat.startTime,
          endTime: beat.endTime,
          action: EDITOR_ACTIONS.PAUSE_HOLD,
          reason: "Quiet reflection benefits from preserving breath, gaze or afterthought.",
          semanticTrigger: beat.semanticRole,
          priority: "medium",
          intensity: "low"
        }));
      }
      return;
    }

    if (mode === "standup" && (beat.humorOpportunity > 0.5 || beat.hookStrength > 0.8)) {
      decisions.push(createDecision({
        id: `${beat.id}_punch_in`,
        startTime: beat.startTime,
        endTime: Math.min(beat.endTime, beat.startTime + 2.5),
        action: EDITOR_ACTIONS.PUNCH_IN,
        reason: "Punch-in is allowed because the material has a hook, joke or reaction beat.",
        semanticTrigger: beat.semanticRole,
        priority: beat.hookStrength > 0.8 ? "high" : "medium",
        intensity: "medium",
        confidence: 0.78
      }));
    }

    if (
      (beat.emphasisWords.length && ["hook", "mechanism", "conclusion", "punchline"].includes(beat.semanticRole)) ||
      (mode === "standup" && (beat.humorOpportunity > 0.5 || beat.ironyOpportunity > 0.5))
    ) {
      decisions.push(createDecision({
        id: `${beat.id}_text_emphasis`,
        startTime: beat.startTime,
        endTime: beat.endTime,
        action: EDITOR_ACTIONS.TEXT_EMPHASIS,
        reason: "Key words can be emphasized without replacing Lisa's presence.",
        semanticTrigger: beat.semanticRole,
        priority: beat.semanticRole === "hook" ? "high" : "medium",
        intensity: mode === "standup" ? "medium" : "low",
        confidence: 0.72
      }));
    }

    const canRequestVisual = !sourceAssessment.sourceAlreadyEdited &&
      beat.visualImportance >= 0.7 &&
      beat.visualConcepts.length &&
      visualInsertCount < visualLimit &&
      index > 0;

    if (canRequestVisual) {
      const concept = beat.visualConcepts[0];
      const visualRequest = createVisualRequest({
        id: `${beat.id}_visual_request`,
        beatId: beat.id,
        type: concept.type,
        concept: concept.concept,
        mood: concept.mood,
        avoid: concept.avoid || [],
        rationale: `Supports ${beat.semanticRole} without covering Lisa continuously.`
      });
      visualRequests.push(visualRequest);
      visualInsertCount += 1;
      decisions.push(createDecision({
        id: `${beat.id}_visual_insert`,
        startTime: beat.startTime,
        endTime: Math.min(beat.endTime, beat.startTime + 2.8),
        action: EDITOR_ACTIONS.VISUAL_INSERT,
        reason: "A short supporting visual is justified by the semantic beat.",
        semanticTrigger: beat.semanticRole,
        priority: "medium",
        intensity: "low",
        visualRequest,
        preserveSpeech: true,
        preserveFace: false,
        transitionIntent: "return_to_primary_subject",
        confidence: 0.7,
        unresolvedRequirements: ["supporting_visual_asset"]
      }));
      decisions.push(createDecision({
        id: `${beat.id}_return_to_lisa`,
        startTime: Math.min(beat.endTime, beat.startTime + 2.8),
        endTime: beat.endTime,
        action: EDITOR_ACTIONS.KEEP_PRIMARY_VIDEO,
        reason: "Return to Lisa after supporting visual to preserve presence.",
        semanticTrigger: "presence_rule",
        priority: "high",
        intensity: "low",
        confidence: 0.86
      }));
    }
  });

  return { decisions, visualRequests };
}

export function assessSourceCleanliness({
  metadata = {},
  evidence = {}
} = {}) {
  const assessment = {
    ...sourceAssessmentContract,
    likelyCleanCameraSource: evidence.likelyCleanCameraSource ?? null,
    existingTextOverlays: Boolean(evidence.existingTextOverlays),
    existingWatermark: Boolean(evidence.existingWatermark),
    existingBakedSubtitles: Boolean(evidence.existingBakedSubtitles),
    existingBakedBroll: Boolean(evidence.existingBakedBroll),
    existingTransitions: Boolean(evidence.existingTransitions),
    sourceAlreadyEdited: false,
    suitabilityForReEdit: "unknown",
    warnings: []
  };

  assessment.sourceAlreadyEdited = Boolean(
    evidence.sourceAlreadyEdited ||
      assessment.existingTextOverlays ||
      assessment.existingWatermark ||
      assessment.existingBakedSubtitles ||
      assessment.existingBakedBroll ||
      assessment.existingTransitions
  );

  if (assessment.sourceAlreadyEdited) {
    assessment.likelyCleanCameraSource = false;
    assessment.suitabilityForReEdit = "reduced";
    assessment.warnings.push("Source appears already edited; use a clean talking-head source for a stronger fresh edit demonstration.");
  } else if (assessment.likelyCleanCameraSource === true) {
    assessment.suitabilityForReEdit = "good";
  }

  if (metadata.width && metadata.height && metadata.width < 720) {
    assessment.warnings.push("Low source resolution may limit high-quality reframing.");
  }

  return assessment;
}

export function createSubtitleSemanticPlan({
  semanticStructure,
  rawTranscriptRef = null,
  correctedTranscriptRef = null
} = {}) {
  return {
    rawTranscriptRef,
    correctedTranscriptRef,
    preserveRawAsEvidence: true,
    grouping: "semantic_phrase",
    correctionLayer: "separate_derived_layer",
    lineBreakIntent: "meaningful_phrase_breaks",
    emphasisWords: (semanticStructure?.beats || []).flatMap((beat) => beat.emphasisWords),
    subtitleSafeTiming: true,
    unresolvedRequirements: ["final_subtitle_visual_preset"]
  };
}

export function createSemanticEditPlan({
  sourceVideo = null,
  segments = [],
  expressionContext = {},
  productionIntent = {},
  sourceAssessment = null,
  targetFormat = "vertical_short",
  rawTranscriptRef = null,
  correctedTranscriptRef = null
} = {}) {
  const assessment = sourceAssessment || assessSourceCleanliness({ metadata: sourceVideo || {} });
  const semanticStructure = createSemanticVideoStructure({
    segments,
    expressionContext,
    productionIntent,
    topic: expressionContext.topic
  });
  const { decisions, visualRequests } = createEditorialDecisions({
    semanticStructure,
    expressionContext,
    productionIntent,
    sourceAssessment: assessment
  });
  const unresolvedRequirements = [
    ...new Set(decisions.flatMap((decision) => decision.unresolvedRequirements || []))
  ];

  return {
    ...semanticEditPlanContract,
    sourceVideo,
    targetFormat,
    sourceAssessment: assessment,
    semanticStructure,
    editorialDecisions: decisions,
    visualRequests,
    timeline: decisions.map((decision) => ({
      timeRange: {
        startTime: decision.startTime,
        endTime: decision.endTime
      },
      primarySource: decision.action === EDITOR_ACTIONS.VISUAL_INSERT ? "supporting_visual" : "source_video",
      editorialAction: decision.action,
      visualLayer: decision.visualRequest,
      textLayer: decision.action === EDITOR_ACTIONS.TEXT_EMPHASIS ? { emphasis: decision.semanticTrigger } : null,
      audioIntent: decision.preserveSpeech ? "preserve_speech" : "needs_audio_decision",
      transitionIntent: decision.transitionIntent,
      rationale: decision.reason
    })),
    subtitlePlan: createSubtitleSemanticPlan({ semanticStructure, rawTranscriptRef, correctedTranscriptRef }),
    unresolvedRequirements,
    approvalGate: {
      state: EDITOR_APPROVAL_GATES.PLAN_READY,
      requiresHumanApproval: true,
      inspectableItems: [
        "selected_material",
        "semantic_structure",
        "editorial_decisions",
        "visual_requests",
        "subtitle_intent",
        "unresolved_media_requirements"
      ]
    },
    renderPlan: {
      status: unresolvedRequirements.length ? "blocked_until_assets_or_approval" : "ready_for_local_renderer",
      providerIndependent: true,
      notes: [
        "This plan describes what should happen, not which provider or renderer must implement it."
      ]
    }
  };
}
