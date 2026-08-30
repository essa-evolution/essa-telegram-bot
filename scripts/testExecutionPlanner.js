import { createExecutionPlan } from "../src/connect/index.js";
import { lisaIdentityProfile } from "../src/identity/lisaIdentityProfile.js";
import { canUseVoiceForProject, getVoiceUsageForProject } from "../src/identity/voiceUsagePolicy.js";
import { buildAutonomousPipelineAssets, buildAutonomousPipelineDraft } from "../src/workspace/autonomousProductionPipeline.js";

const cases = [
  {
    workflowId: "digital_identity_profile",
    expectedCategories: ["documents", "image", "voice", "ai_model", "video"]
  },
  {
    workflowId: "production_video",
    expectedCategories: ["ai_model", "voice", "image", "video", "editing", "publishing"]
  },
  {
    workflowId: "production_cartoon",
    expectedCategories: ["ai_model", "voice", "image", "video", "editing", "publishing"]
  },
  {
    workflowId: "production_animated_story",
    expectedCategories: ["ai_model", "voice", "image", "video", "editing", "publishing"]
  },
  {
    workflowId: "production_documentary",
    expectedCategories: ["ai_model", "documents", "voice", "image", "video", "editing", "publishing"]
  },
  {
    workflowId: "production_film",
    expectedCategories: ["ai_model", "voice", "image", "video", "editing", "publishing"]
  },
  {
    workflowId: "production_music_video",
    expectedCategories: ["ai_model", "image", "video", "editing", "publishing"]
  },
  {
    workflowId: "content_multiplication_package",
    expectedCategories: ["ai_model", "image", "voice", "documents", "publishing"]
  },
  {
    workflowId: "website_project",
    expectedCategories: ["ai_model", "website", "documents"]
  },
  {
    workflowId: "marketing_campaign",
    expectedCategories: ["ai_model", "image", "publishing", "analytics"]
  },
  {
    workflowId: "property_request",
    expectedCategories: ["search", "browser", "documents"]
  },
  {
    workflowId: "legal_preparation",
    expectedCategories: ["documents", "ai_model"]
  }
];

let failures = 0;

function includesAll(actual, expected) {
  return expected.every((item) => actual.includes(item));
}

for (const testCase of cases) {
  const plan = createExecutionPlan({
    id: `project_${testCase.workflowId}`,
    workflowId: testCase.workflowId
  });
  const categories = plan.steps.map((step) => step.category);
  const toolsSelected = plan.steps.every((step) => step.selectedTool?.id);
  const passed = plan.status === "planned" &&
    plan.execution === "not_started" &&
    plan.approvalsRequired === true &&
    includesAll(categories, testCase.expectedCategories) &&
    toolsSelected;

  if (!passed) {
    failures += 1;
  }

  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.workflowId}`);
  console.log(JSON.stringify({
    workflowId: plan.workflowId,
    status: plan.status,
    steps: plan.steps.map((step) => ({
      id: step.id,
      category: step.category,
      capability: step.capability,
      selectedTool: step.selectedTool?.id || null,
      executionStatus: step.executionStatus
    }))
  }, null, 2));
}

const identityPlan = createExecutionPlan({
  id: "project_identity_production",
  type: "production",
  subtype: "video",
  workflowId: "production_video",
  identityId: "lisa",
  identityName: "Lisa Molis",
  identitySnapshot: {
    id: "lisa",
    name: "Lisa Molis"
  }
});

const identityMetadataPassed = identityPlan.metadata?.identityId === "lisa" &&
  identityPlan.metadata?.identityName === "Lisa Molis" &&
  identityPlan.metadata?.identityRequired === true &&
  identityPlan.metadata?.voiceIdentity === "Lisa Molis" &&
  identityPlan.identityId === "lisa" &&
  identityPlan.identityName === "Lisa Molis" &&
  identityPlan.identityRequired === true &&
  identityPlan.voiceIdentity === "Lisa Molis";

if (!identityMetadataPassed) {
  failures += 1;
}

console.log(`${identityMetadataPassed ? "PASS" : "FAIL"} production identity metadata`);

const lisaVoiceAllowed = canUseVoiceForProject(lisaIdentityProfile, {
  type: "production",
  subtype: "content_multiplication",
  identityId: "lisa"
});

if (!lisaVoiceAllowed) {
  failures += 1;
}

console.log(`${lisaVoiceAllowed ? "PASS" : "FAIL"} Lisa project can use Lisa voice`);

const nonLisaVoiceUsage = getVoiceUsageForProject(lisaIdentityProfile, {
  type: "production",
  subtype: "content_multiplication",
  identityId: "sveta",
  identityName: "Sveta"
});
const nonLisaBlocked = nonLisaVoiceUsage.allowed === false &&
  nonLisaVoiceUsage.fallbackVoice === "neutral_system_voice";

if (!nonLisaBlocked) {
  failures += 1;
}

console.log(`${nonLisaBlocked ? "PASS" : "FAIL"} non-Lisa project cannot use Lisa voice`);

const missingVoiceUsage = getVoiceUsageForProject(null, {
  type: "production",
  subtype: "content_multiplication",
  identityId: "vasya",
  identityName: "Vasya"
});
const missingVoiceFallback = missingVoiceUsage.allowed === false &&
  missingVoiceUsage.fallbackVoice === "neutral_system_voice";

if (!missingVoiceFallback) {
  failures += 1;
}

console.log(`${missingVoiceFallback ? "PASS" : "FAIL"} missing voice identity falls back to neutral voice`);

const autonomousDraft = buildAutonomousPipelineDraft({
  id: "project_content_multiplication",
  title: "Content Multiplication test",
  type: "production",
  subtype: "content_multiplication",
  identityId: "lisa",
  identityName: "Lisa Molis",
  identitySnapshot: lisaIdentityProfile
}, getVoiceUsageForProject(lisaIdentityProfile, { identityId: "lisa" }));
const autonomousAssets = buildAutonomousPipelineAssets({ title: "Content Multiplication test" }, autonomousDraft);
const autonomousDraftOnly = autonomousDraft.status === "draft" &&
  autonomousDraft.mode === "planning_only" &&
  autonomousDraft.steps.length === 17 &&
  autonomousDraft.steps.every((step) => step.executionStatus === "not_started" && step.requiresApproval === true) &&
  Array.isArray(autonomousAssets.documents) &&
  autonomousAssets.documents.length === 6;

if (!autonomousDraftOnly) {
  failures += 1;
}

console.log(`${autonomousDraftOnly ? "PASS" : "FAIL"} autonomous pipeline creates draft only`);

const noStepRunning = autonomousDraft.steps.every((step) => step.executionStatus !== "running");

if (!noStepRunning) {
  failures += 1;
}

console.log(`${noStepRunning ? "PASS" : "FAIL"} no autonomous step is running automatically`);

if (failures > 0) {
  console.error(`ESSA execution planner tests failed: ${failures}`);
  process.exit(1);
}

console.log("ESSA execution planner tests passed.");
