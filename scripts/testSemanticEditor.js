import fs from "fs";
import { dynamicExpressionExamples } from "../src/identity/dynamicExpressionContext.js";
import { lisaProductionProfile } from "../src/identity/lisaProductionProfile.js";
import { createLisaProductionIntent } from "../src/workspace/productionIntent.js";
import {
  EDITOR_ACTIONS,
  EDITOR_APPROVAL_GATES,
  assessSourceCleanliness,
  createSemanticEditPlan
} from "../src/workspace/semanticEditor.js";

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

function actions(plan) {
  return plan.editorialDecisions.map((decision) => decision.action);
}

function visualInsertCount(plan) {
  return actions(plan).filter((action) => action === EDITOR_ACTIONS.VISUAL_INSERT).length;
}

function baseSource() {
  return {
    path: "media/input/test.mp4",
    width: 1080,
    height: 1920,
    hasAudio: true
  };
}

const quietExpression = dynamicExpressionExamples.quietReflection;
const quietIntent = createLisaProductionIntent({
  contentType: "short_video",
  platform: "Instagram Reels",
  targetFormat: "vertical_short",
  expressionContext: quietExpression
});
const quietPlan = createSemanticEditPlan({
  sourceVideo: baseSource(),
  expressionContext: quietExpression,
  productionIntent: quietIntent,
  segments: [
    { startTime: 0, endTime: 5, text: "Иногда важно просто остановиться и услышать себя." },
    { startTime: 5, endTime: 10, text: "В этой паузе появляется честность." },
    { startTime: 10, endTime: 15, text: "И не нужно сразу ничего объяснять." }
  ]
});

check(
  quietPlan.semanticStructure.mode === "quiet_reflection",
  "Test A quiet reflection mode detected",
  { mode: quietPlan.semanticStructure.mode }
);
check(
  actions(quietPlan).every((action) =>
    [EDITOR_ACTIONS.KEEP_PRIMARY_VIDEO, EDITOR_ACTIONS.PAUSE_HOLD].includes(action)
  ),
  "Test A quiet reflection avoids gratuitous B-roll/punch-ins",
  { actions: actions(quietPlan) }
);
check(
  visualInsertCount(quietPlan) === 0,
  "Test A quiet reflection keeps Lisa as primary anchor"
);

const standupExpression = dynamicExpressionExamples.standupExpression;
const standupIntent = createLisaProductionIntent({
  contentType: "short_video",
  platform: "Instagram Reels",
  targetFormat: "vertical_short",
  expressionContext: standupExpression
});
const standupPlan = createSemanticEditPlan({
  sourceVideo: baseSource(),
  expressionContext: standupExpression,
  productionIntent: standupIntent,
  segments: [
    { startTime: 0, endTime: 3, text: "Знаешь, это звучит смешно, но это правда." },
    { startTime: 3, endTime: 7, text: "Мы все делаем вид, что контролируем хаос." },
    { startTime: 7, endTime: 10, text: "А потом хаос такой: спасибо, я сам." }
  ]
});

check(
  standupPlan.semanticStructure.mode === "standup",
  "Test B stand-up mode detected",
  { mode: standupPlan.semanticStructure.mode }
);
check(
  actions(standupPlan).includes(EDITOR_ACTIONS.PUNCH_IN) &&
    actions(standupPlan).includes(EDITOR_ACTIONS.TEXT_EMPHASIS),
  "Test B stand-up allows justified punch-in/text timing",
  { actions: actions(standupPlan) }
);
check(
  standupPlan.editorialDecisions.every((decision) => decision.preserveSpeech),
  "Test B stand-up preserves speech"
);

const mirrorExpression = {
  contentType: "short_video",
  topic: "reflection between inner state and outer world",
  performanceMode: "semantic_mirror",
  emotionalTone: "serious_reflective",
  energy: "controlled",
  humorLevel: "low",
  ironyLevel: "low",
  profanityMode: "none",
  intimacyLevel: "medium",
  seriousness: "high",
  absurdityLevel: "low",
  pacingIntent: "clear_and_controlled",
  currentMomentIntent: "show the mechanism of reflection"
};
const mirrorIntent = createLisaProductionIntent({
  contentType: "short_video",
  platform: "Instagram Reels",
  targetFormat: "vertical_short",
  expressionContext: mirrorExpression
});
const mirrorPlan = createSemanticEditPlan({
  sourceVideo: baseSource(),
  expressionContext: mirrorExpression,
  productionIntent: mirrorIntent,
  segments: [
    { startTime: 0, endTime: 4, text: "Мир - это отражение нашего внутреннего состояния." },
    { startTime: 4, endTime: 8, text: "Мы привыкли думать, что он существует отдельно от нас." },
    { startTime: 8, endTime: 12, text: "Но если посмотреть глубже, все начинается раньше." },
    { startTime: 12, endTime: 16, text: "Каждый ребенок учится видеть жизнь через любовь или страх." }
  ]
});

check(
  mirrorPlan.semanticStructure.beats.length === 4,
  "Test C semantic mirror generates semantic beats"
);
check(
  visualInsertCount(mirrorPlan) > 0 &&
    visualInsertCount(mirrorPlan) < mirrorPlan.semanticStructure.beats.length,
  "Test C semantic mirror creates restrained visual requests, not B-roll for every sentence",
  {
    visualInsertCount: visualInsertCount(mirrorPlan),
    beatCount: mirrorPlan.semanticStructure.beats.length
  }
);
check(
  mirrorPlan.visualRequests.every((request) =>
    request.returnToPrimarySubject &&
    request.rationale &&
    request.unresolvedRequirements.includes("source_or_generation_strategy")
  ),
  "Test C visual requests are provider-independent and return to Lisa",
  { visualRequests: mirrorPlan.visualRequests }
);
check(
  actions(mirrorPlan).includes(EDITOR_ACTIONS.KEEP_PRIMARY_VIDEO),
  "Test C Lisa remains anchor"
);

const editedAssessment = assessSourceCleanliness({
  metadata: { width: 472, height: 850 },
  evidence: {
    existingWatermark: true,
    existingTextOverlays: true,
    existingBakedSubtitles: true
  }
});
const editedPlan = createSemanticEditPlan({
  sourceVideo: baseSource(),
  sourceAssessment: editedAssessment,
  expressionContext: mirrorExpression,
  productionIntent: mirrorIntent,
  segments: [
    { startTime: 0, endTime: 4, text: "Мир - это отражение нашего внутреннего состояния." },
    { startTime: 4, endTime: 8, text: "Если ребенок растет в любви, он учится доверию." }
  ]
});

check(
  editedAssessment.sourceAlreadyEdited &&
    editedAssessment.suitabilityForReEdit === "reduced" &&
    editedAssessment.warnings.length > 0,
  "Test D already edited source is flagged",
  editedAssessment
);
check(
  visualInsertCount(editedPlan) === 0,
  "Test D edited source does not pretend to be a clean source for fresh visual inserts"
);

const moduleText = fs.readFileSync("src/workspace/semanticEditor.js", "utf8").toLowerCase();
const forbiddenProviders = [
  "openai",
  "claude",
  "gemini",
  "xai",
  "runway",
  "kling",
  "sora",
  "veo",
  "capcut",
  "elevenlabs"
];
const foundProviders = forbiddenProviders.filter((provider) => moduleText.includes(provider));
check(
  foundProviders.length === 0,
  "Test E Phase 18 editor module has no provider hard-code",
  { foundProviders }
);
check(
  [quietPlan, standupPlan, mirrorPlan].every((plan) =>
    plan.approvalGate?.state === EDITOR_APPROVAL_GATES.PLAN_READY &&
    plan.approvalGate.requiresHumanApproval
  ),
  "Human approval gate is present on semantic edit plans"
);
check(
  [quietIntent, standupIntent, mirrorIntent].every((intent) =>
    intent.identityId === "lisa" &&
    intent.productionProfileId === lisaProductionProfile.profileId
  ),
  "Same Character/Profile chain can drive different editor behavior"
);

if (failures > 0) {
  console.error(`Semantic Editor tests failed: ${failures}`);
  process.exit(1);
}

console.log("Semantic Editor tests passed.");
