import { buildContextPack } from "../src/navigator/contextEngine.js";
import { dynamicExpressionExamples } from "../src/identity/dynamicExpressionContext.js";
import { lisaIdentityProfile } from "../src/identity/lisaIdentityProfile.js";
import { lisaProductionProfile } from "../src/identity/lisaProductionProfile.js";
import { createLisaProductionIntent } from "../src/workspace/productionIntent.js";

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

async function buildPack(expressionContext, productionIntent) {
  return buildContextPack({
    userText: "Lisa adaptive production test",
    sessionId: "phase_16b_test",
    identitySnapshot: lisaIdentityProfile,
    expressionContext,
    productionIntent,
    permissions: {
      internalSave: true
    }
  });
}

const standupExpression = dynamicExpressionExamples.standupExpression;
const quietExpression = dynamicExpressionExamples.quietReflection;
const directMirrorExpression = {
  contentType: "short_video",
  topic: "unconscious behavioral mechanism",
  performanceMode: "direct_mirror",
  emotionalTone: "clear",
  energy: "controlled",
  humorLevel: "medium",
  ironyLevel: "medium",
  profanityMode: "organic_if_present_in_source",
  intimacyLevel: "medium",
  seriousness: "high",
  absurdityLevel: "medium",
  pacingIntent: "clear_and_controlled",
  currentMomentIntent: "show behavioral mechanism"
};

const standupIntent = createLisaProductionIntent({
  contentType: "short_video",
  platform: "Instagram Reels",
  targetFormat: "vertical_short",
  expressionContext: standupExpression
});
const quietIntent = createLisaProductionIntent({
  contentType: "short_video",
  platform: "Instagram Reels",
  targetFormat: "vertical_short",
  expressionContext: quietExpression
});
const directMirrorIntent = createLisaProductionIntent({
  contentType: "short_video",
  platform: "Instagram Reels",
  targetFormat: "vertical_short",
  expressionContext: directMirrorExpression
});

const standupPack = await buildPack(standupExpression, standupIntent);
const quietPack = await buildPack(quietExpression, quietIntent);
const directMirrorPack = await buildPack(directMirrorExpression, directMirrorIntent);

check(
  [standupPack, quietPack, directMirrorPack].every((pack) => pack.identityContext?.id === "lisa"),
  "same Lisa identity across scenarios"
);
check(
  [standupPack, quietPack, directMirrorPack].every((pack) => pack.characterCore?.id === "lisa_character_core"),
  "same Character Core across scenarios"
);
check(
  [standupPack, quietPack, directMirrorPack].every((pack) => pack.productionProfile?.profileId === lisaProductionProfile.profileId),
  "same Production Profile across scenarios"
);
check(
  standupPack.productionIntent.editingMode !== quietPack.productionIntent.editingMode &&
    quietPack.productionIntent.editingMode !== directMirrorPack.productionIntent.editingMode,
  "different ProductionIntent editing modes",
  {
    standup: standupPack.productionIntent.editingMode,
    quiet: quietPack.productionIntent.editingMode,
    directMirror: directMirrorPack.productionIntent.editingMode
  }
);
check(
  standupPack.productionIntent.editingMode === "standup_adaptive" &&
    standupPack.productionIntent.zoomStrategy.includes("reaction"),
  "Scenario A stand-up adaptive intent"
);
check(
  quietPack.productionIntent.editingMode === "intimate_minimal" &&
    quietPack.productionIntent.bRollStrategy.includes("usually none"),
  "Scenario B quiet reflection minimal intent"
);
check(
  directMirrorPack.productionIntent.editingMode === "semantic_mirror" &&
    directMirrorPack.productionIntent.hookStrategy.includes("thought"),
  "Scenario C direct mirror semantic-first intent"
);
check(
  [standupPack, quietPack, directMirrorPack].every((pack) =>
    pack.contextSources.includes("production_profile") &&
    pack.contextSources.includes("production_intent")
  ),
  "ContextPack source flags include production profile and intent"
);
check(
  !JSON.stringify(lisaProductionProfile).toLowerCase().includes("elevenlabs") &&
    !JSON.stringify(lisaProductionProfile).toLowerCase().includes("openai") &&
    !JSON.stringify(lisaProductionProfile).toLowerCase().includes("capcut"),
  "LisaProductionProfile has no provider hard-code"
);

if (failures > 0) {
  console.error(`Lisa Production Profile tests failed: ${failures}`);
  process.exit(1);
}

console.log("Lisa Production Profile tests passed.");
