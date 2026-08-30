import { buildContextPack } from "../src/navigator/contextEngine.js";
import { lisaIdentityProfile } from "../src/identity/lisaIdentityProfile.js";
import { dynamicExpressionExamples } from "../src/identity/dynamicExpressionContext.js";

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

async function build(expressionContext, userText) {
  return buildContextPack({
    userText,
    sessionId: "phase_16a_test",
    identitySnapshot: lisaIdentityProfile,
    expressionContext,
    permissions: {
      internalSave: true
    }
  });
}

const standup = await build(
  dynamicExpressionExamples.standupExpression,
  "Lisa stand-up expression test"
);
const quiet = await build(
  dynamicExpressionExamples.quietReflection,
  "Lisa quiet reflection test"
);

check(
  standup.identityContext?.id === "lisa" && quiet.identityContext?.id === "lisa",
  "same Lisa identity"
);
check(
  standup.characterCore?.id === quiet.characterCore?.id &&
    standup.characterCore?.id === "lisa_character_core",
  "same Character Core"
);
check(
  standup.characterCore?.providerIndependent === true &&
    !JSON.stringify(standup.characterCore).toLowerCase().includes("elevenlabs"),
  "provider-independent Character Core metadata"
);
check(
  standup.expressionContext?.performanceMode === "standup" &&
    standup.expressionContext?.humorLevel === "high" &&
    standup.expressionContext?.profanityMode === "organic",
  "Test A stand-up expression context"
);
check(
  quiet.expressionContext?.performanceMode === "intimate_reflection" &&
    quiet.expressionContext?.energy === "quiet" &&
    quiet.expressionContext?.profanityMode === "none",
  "Test B quiet reflection expression context"
);
check(
  standup.productionProfile?.profileId === "lisa_production_profile" &&
    quiet.productionProfile?.profileId === "lisa_production_profile" &&
    standup.productionIntent === null &&
    quiet.productionIntent === null,
  "production profile connected and production intent remains optional"
);
check(
  standup.contextSources.includes("identity") &&
    standup.contextSources.includes("character_core") &&
    standup.contextSources.includes("expression_context"),
  "ContextPack source flags include identity, character core, expression context",
  { contextSources: standup.contextSources }
);

if (failures > 0) {
  console.error(`Lisa Character Core tests failed: ${failures}`);
  process.exit(1);
}

console.log("Lisa Character Core tests passed.");
