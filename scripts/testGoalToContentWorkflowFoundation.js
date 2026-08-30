import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createExecutionFrontier,
  createGoalToContentExecutionWorkflow,
  createGoalToContentWorkflowFoundationProof,
  createGoalToContentWorkflowViewModel,
  createMasterContentArtifact,
  createProductionGoal,
  createProductionIntent,
  createSemanticClipPlan,
  createShortFormDerivative,
  executionFrontierStates,
  podcastToShortsFoundationRecipe,
  preflightGoalToContentWorkflow,
  productionIntentTypes,
  productionRecipeIds,
  resolveGoalToContentInputs
} from "../src/production/index.js";
import {
  validateWorkflowBindings,
  validateWorkflowDag
} from "../src/capabilities/index.js";
import { getCapability } from "../src/capabilities/capabilityRegistry.js";
import { loadLisaCharacterCore } from "../src/identity/lisaCharacterCore.js";
import { getLisaProductionProfile } from "../src/identity/lisaProductionProfile.js";

const passed = [];
function pass(label) {
  passed.push(label);
  console.log(`PASS ${label}`);
}

const goal = createProductionGoal();
assert.equal(goal.modelType, "ProductionGoal");
pass("A ProductionGoal contract exists");
assert.ok(goal.rawGoal.includes("подкаст"));
pass("B human goal text preserved");
assert.equal(goal.topic, "почему человек теряет себя в отношениях");
pass("C default podcast topic resolved");
assert.deepEqual(goal.requestedDerivatives, ["short_form_clips"]);
pass("D derivative request represented");

const intent = createProductionIntent({ goal });
assert.equal(intent.modelType, "ProductionIntent");
pass("E ProductionIntent contract exists");
assert.equal(intent.intentType, productionIntentTypes.podcastWithShortFormDerivatives);
pass("F initial intent is PODCAST_WITH_SHORT_FORM_DERIVATIVES");
assert.equal(intent.recipeId, productionRecipeIds.podcastToShortsFoundation);
pass("G intent selects canonical recipe");
assert.equal(intent.providerExecutionEnabled, false);
pass("H provider execution disabled on intent");

const resolution = resolveGoalToContentInputs({ goal, intent });
assert.equal(resolution.modelType, "MaterialInputResolution");
pass("I material input resolution exists");
assert.equal(resolution.known.topic, goal.topic);
pass("J known context topic resolved");
assert.equal(resolution.known.hostIdentityId, "lisa");
pass("K Lisa identity resolved as input ref");
assert.equal(resolution.missing.length, 0);
pass("L missing input list empty for fixture");
assert.equal(resolution.noInventedInputs, true);
pass("M no invented inputs flag true");
assert.equal(resolution.classifications.voiceRights, "RIGHTS_AND_PROVIDER_BOUNDARY");
pass("N voice rights classified");
assert.equal(resolution.classifications.avatarRights, "RIGHTS_AND_PROVIDER_BOUNDARY");
pass("O avatar rights classified");
assert.equal(resolution.providerBoundary.voiceProviderCallMade, false);
pass("P voice provider call not made");
assert.equal(resolution.providerBoundary.avatarProviderCallMade, false);
pass("Q avatar provider call not made");

assert.equal(podcastToShortsFoundationRecipe.recipeId, "PODCAST_TO_SHORTS_FOUNDATION");
pass("R canonical recipe id present");
assert.equal(podcastToShortsFoundationRecipe.stepTemplates.length, 11);
pass("S recipe has 11 required steps");
assert.deepEqual(podcastToShortsFoundationRecipe.stepTemplates.map((step) => step.capabilityId), [
  "CONTENT_BRIEF",
  "SCRIPT_GENERATE",
  "SCRIPT_QUALITY_REVIEW",
  "VOICE_GENERATE",
  "AVATAR_RENDER",
  "MASTER_ASSEMBLE",
  "MASTER_VERIFY",
  "SEMANTIC_CLIP_PLAN",
  "SHORT_FORM_DERIVATIVES",
  "SHORT_FORM_QUALITY_REVIEW",
  "HUMAN_REVIEW_CHECKPOINT"
]);
pass("T recipe step order matches 21R");

const workflow = createGoalToContentExecutionWorkflow({ goal, intent });
assert.equal(workflow.modelType, "ExecutionWorkflow");
pass("U workflow reuses ExecutionWorkflow model");
assert.equal(workflow.recipeId, "PODCAST_TO_SHORTS_FOUNDATION");
pass("V workflow compiled with canonical recipe");
assert.equal(workflow.workflowClass, "LOCAL_PLUS_INTELLIGENCE");
pass("W workflow class separates local intelligence from providers");
assert.equal(workflow.steps.length, 11);
pass("X workflow step count is 11");
assert.equal(validateWorkflowDag(workflow).ok, true);
pass("Y workflow DAG valid");
assert.equal(validateWorkflowBindings(workflow).ok, true);
pass("Z workflow typed bindings valid");
assert.ok(workflow.workflowVersion.startsWith("1.0.0-"));
pass("AA workflow version is content-addressed");
assert.ok(workflow.lineage.edges.some((edge) => edge.type === "GOAL_TO_INTENT"));
pass("AB lineage from goal to intent present");
assert.ok(workflow.audit[0].reused.includes("ExecutionWorkflow"));
pass("AC existing workflow engine lineage recorded");

for (const capabilityId of podcastToShortsFoundationRecipe.requiredCapabilities) {
  assert.ok(getCapability(capabilityId), capabilityId);
}
pass("AD every recipe capability resolves in existing registry");

const characterCore = loadLisaCharacterCore({ includeContent: false });
assert.equal(characterCore.stableCore, true);
pass("AE Lisa Character Core resolved");
const productionProfile = getLisaProductionProfile("lisa");
assert.equal(productionProfile.profileId, "lisa_production_profile");
pass("AF Lisa Production Profile resolved");
assert.equal(workflow.generatedArtifacts.contentBrief.hostIdentityId, "lisa");
pass("AG content brief binds Lisa identity");
assert.equal(workflow.generatedArtifacts.contentBrief.providerCalls, 0);
pass("AH content brief made no provider call");
assert.equal(workflow.generatedArtifacts.scriptArtifact.status, "DRAFT_NOT_RENDERED");
pass("AI script artifact is draft, not model output");
assert.equal(workflow.generatedArtifacts.scriptArtifact.externalModelCalls, 0);
pass("AJ script generation made no live model call");
assert.ok(workflow.generatedArtifacts.scriptArtifact.qualityGate.checks.includes("meaning_preserved"));
pass("AK script quality gate exists");

const voiceStep = workflow.steps.find((step) => step.stepId === "STEP_4_VOICE_RENDER");
assert.equal(voiceStep.providerBoundary, true);
pass("AL voice render is provider boundary");
assert.ok(voiceStep.blockers.includes("BLOCKED_PROVIDER_EXECUTION_BOUNDARY"));
pass("AM voice render blocked before approval");
assert.equal(workflow.materialInputs.voiceRights, resolution.materialInputs.voiceRights);
pass("AN voice rights state stored");
const avatarStep = workflow.steps.find((step) => step.stepId === "STEP_5_AVATAR_RENDER");
assert.equal(avatarStep.providerBoundary, true);
pass("AO avatar render is provider boundary");
assert.ok(avatarStep.blockers.includes("BLOCKED_PROVIDER_EXECUTION_BOUNDARY"));
pass("AP avatar render blocked before approval");
assert.equal(workflow.materialInputs.avatarRights, resolution.materialInputs.avatarRights);
pass("AQ avatar rights state stored");

const master = workflow.generatedArtifacts.masterArtifact;
assert.equal(master.modelType, "MasterContentArtifact");
pass("AR master artifact contract exists");
assert.equal(master.immutable, true);
pass("AS master artifact immutable");
assert.equal(master.verified, false);
pass("AT master starts unverified");
assert.equal(master.assembled, false);
pass("AU master assembly truthfully not executed");
assert.equal(master.providerCalls, 0);
pass("AV master has zero provider calls");

const pendingMaster = createMasterContentArtifact({ verificationState: "PENDING_PROVIDER_OUTPUT" });
assert.equal(pendingMaster.verified, false);
pass("AW unverified master remains blocked");

const clipPlan = workflow.generatedArtifacts.semanticClipPlan;
assert.equal(clipPlan.modelType, "SemanticClipPlan");
pass("AX semantic clip plan contract exists");
assert.equal(clipPlan.masterVerifiedRequired, true);
pass("AY clip plan requires verified master");
assert.equal(clipPlan.providerCalls, 0);
pass("AZ clip plan has zero provider calls");
assert.ok(createSemanticClipPlan({ masterContentAssetId: master.artifactId }).clips.length >= 3);
pass("BA semantic clip fixture has planned clips");

const derivative = createShortFormDerivative({ masterContentAssetId: master.artifactId, clipId: "clip_1", platform: "TikTok" });
assert.equal(derivative.modelType, "ShortFormDerivative");
pass("BB short-form derivative contract exists");
assert.equal(derivative.masterContentAssetId, master.artifactId);
pass("BC derivative keeps master lineage");
assert.equal(derivative.contentVariant.modelType, "ContentVariant");
pass("BD ContentVariant integrated");
assert.equal(derivative.publishEnabled, false);
pass("BE derivative publish disabled");
assert.ok(workflow.generatedArtifacts.shortFormDerivatives.length >= 3);
pass("BF workflow creates short-form derivative set");
assert.ok(workflow.generatedArtifacts.shortFormDerivatives.every((item) => item.contentVariant.orphanVariant === false));
pass("BG all variants are rooted in master");

const preflight = preflightGoalToContentWorkflow(workflow);
assert.equal(preflight.futureExecutionReady, true);
pass("BH preflight future execution readiness true");
assert.ok(preflight.providerBoundaryIssues.includes("VOICE_RENDER_PROVIDER_BOUNDARY"));
pass("BI voice provider issue surfaced");
assert.ok(preflight.providerBoundaryIssues.includes("AVATAR_RENDER_PROVIDER_BOUNDARY"));
pass("BJ avatar provider issue surfaced");
assert.ok(preflight.masterVerificationIssues.includes("MASTER_NOT_VERIFIED"));
pass("BK master verification blocker surfaced");
assert.equal(preflight.externalActionCounters.externalCalls, 0);
pass("BL preflight counters zero");

const frontier = createExecutionFrontier(workflow);
assert.equal(frontier.modelType, "ExecutionFrontier");
pass("BM ExecutionFrontier exists");
assert.equal(frontier.state, executionFrontierStates.blockedOnProviderBoundary);
pass("BN frontier blocks on provider boundary");
assert.equal(frontier.nextAllowedAction, "COLLECT_INPUT_OR_APPROVAL");
pass("BO frontier requests scoped approval path");
assert.ok(frontier.resumeToken.startsWith("resume_goal_to_content_"));
pass("BP frontier resume token exists");
assert.ok(frontier.selectiveInvalidationPolicy.onScriptChange.includes("STEP_8_SEMANTIC_CLIP_PLAN"));
pass("BQ selective invalidation covers downstream clip plan");
assert.equal(frontier.staleWorkflowBlocked, false);
pass("BR stale workflow flag explicit");

assert.ok(workflow.approvals.some((item) => item.approvalId === "approve_provider_execution"));
pass("BS provider execution approval required");
assert.ok(workflow.approvals.some((item) => item.approvalId === "approve_short_form_package"));
pass("BT short-form package approval required");
assert.equal(workflow.executionPolicy.providerExecutionEnabled, false);
pass("BU provider activation disabled in workflow policy");
assert.equal(workflow.externalActionCounters.paymentActions, 0);
pass("BV payment actions zero");
assert.equal(workflow.externalActionCounters.publishActions, 0);
pass("BW publish actions zero");
assert.equal(workflow.externalActionCounters.externalProviderCalls, 0);
pass("BX external provider calls zero");

const viewModel = createGoalToContentWorkflowViewModel(workflow);
assert.equal(viewModel.route, "#production/workflow/PODCAST_TO_SHORTS_FOUNDATION");
pass("BY UI route canonical");
assert.equal(viewModel.ctaLabel, "Подготовить производство");
pass("BZ UI CTA present");
assert.equal(viewModel.formDefaults.topic, goal.topic);
pass("CA UI form default topic present");
assert.deepEqual(viewModel.formDefaults.shortFormTargets, intent.shortFormTargets);
pass("CB UI short-form target defaults present");
assert.equal(viewModel.steps.length, 11);
pass("CC UI readable workflow plan has 11 steps");
assert.ok(viewModel.steps.some((step) => step.providerBoundary));
pass("CD UI labels provider boundary steps");
assert.equal(viewModel.executionFrontier.state, "BLOCKED_ON_PROVIDER_BOUNDARY");
pass("CE UI exposes frontier state");
assert.ok(viewModel.readiness.blockers.includes("MASTER_NOT_VERIFIED"));
pass("CF UI exposes master blocker");
assert.equal(viewModel.lisa.characterCoreDuplicated, false);
pass("CG UI explains Lisa without duplicating Character Core");
assert.equal(viewModel.lisa.productionProfileDuplicated, false);
pass("CH UI explains Lisa without duplicating Production Profile");
assert.equal(viewModel.providerLabels.normalUx.includes("voice provider boundary"), true);
pass("CI UI hides provider brands in normal labels");
assert.equal(viewModel.contentIntelligenceHandoff.variantCount, workflow.generatedArtifacts.shortFormDerivatives.length);
pass("CJ UI exposes Content Intelligence handoff");
assert.equal(viewModel.contentIntelligenceHandoff.publishEnabled, false);
pass("CK Content Intelligence handoff cannot publish");

const { proof, proofPath } = createGoalToContentWorkflowFoundationProof({ cwd: process.cwd(), goal, intent });
assert.equal(proof.status, "PHASE_21R_GOAL_TO_CONTENT_WORKFLOW_FOUNDATION_PASS");
pass("CL canonical proof status pass");
assert.ok(fs.existsSync(proofPath));
pass("CM canonical proof file written");
assert.equal(proof.checks.route, "#production/workflow/PODCAST_TO_SHORTS_FOUNDATION");
pass("CN proof records UI route");
assert.equal(proof.counters.voiceProviderCalls, 0);
pass("CO proof voice provider calls zero");
assert.equal(proof.counters.avatarProviderCalls, 0);
pass("CP proof avatar provider calls zero");
assert.equal(proof.counters.productionDbMutations, 0);
pass("CQ proof production DB mutations zero");
assert.equal(proof.counters.envKeyBillingChanges, 0);
pass("CR proof env/key/billing changes zero");

assert.equal(passed.length, 96);
console.log(`Goal-to-content workflow foundation checks passed: ${passed.length}`);
