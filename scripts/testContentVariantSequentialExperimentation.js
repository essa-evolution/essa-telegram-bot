import assert from "node:assert/strict";

import { getCapability, productKnowledgeNodes } from "../src/capabilities/index.js";
import {
  contentAssetRoles,
  contentProductionModes,
  createContentAsset,
  createContentExperimentAuditArtifact,
  createContentVariant,
  createContentEconomicsRecord,
  createExperimentVariantSet,
  createGoalAwareSuccessPolicy,
  createPlatformExperimentAdapter,
  createVariantChangeSet,
  createWinnerDetectionResult,
  dataCompletenessStates,
  experimentHypothesisStates,
  humanExperimentDecisions,
  sampleAdequacyStates,
  variantChangeDimensions,
  variantGenerationStrategies,
  variantVariableStates,
  winnerDecisionStates,
  winnerGoalTypes
} from "../src/contentIntelligence/index.js";
import { createSequentialVariantExperimentFixture } from "../src/contentIntelligence/fixtures.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const fixture = createSequentialVariantExperimentFixture();
const variants = fixture.generation1.variants;

assert.equal(fixture.master.role, contentAssetRoles.master);
assert.ok(variants.every((variant) => variant.masterContentAssetId === fixture.master.contentAssetId));
assert.ok(variants.every((variant) => variant.orphanVariant === false));
pass("A Master lineage", { master: fixture.master.contentAssetId, variants: variants.map((item) => item.variantId) });

assert.equal(new Set(variants.map((variant) => variant.variantId)).size, variants.length);
pass("B Variant ID uniqueness");

assert.equal(fixture.generation2.variants[0].parentVariantId, "variant_hook_b");
assert.equal(fixture.generation2.variants[0].lineage.rootContentAssetId, fixture.master.contentAssetId);
pass("C Parent variant lineage", fixture.generation2.variants[0].lineage);

assert.equal(fixture.explicitHookOnlyChangeSet.changes[0].dimension, variantChangeDimensions.hook);
assert.equal(fixture.explicitHookOnlyChangeSet.explicitChangeRequired, true);
pass("D VariantChangeSet", fixture.explicitHookOnlyChangeSet);

assert.equal(variants[1].changeSet.variableState, variantVariableStates.singleVariable);
assert.equal(variants[1].changeSet.causalConfidenceAdjustment, "NORMAL");
pass("E single-variable state");

assert.equal(fixture.multiVariableVariant.changeSet.variableState, variantVariableStates.multiVariable);
assert.equal(fixture.multiVariableVariant.changeSet.causalConfidenceAdjustment, "REDUCED");
pass("F multi-variable state", fixture.multiVariableVariant.changeSet);

assert.equal(fixture.generation1.modelType, "ExperimentVariantSet");
assert.equal(fixture.generation1.changedVariables.length, 1);
assert.equal(fixture.generation1.changedVariables[0], variantChangeDimensions.hook);
pass("G ExperimentVariantSet", fixture.generation1);

assert.equal(fixture.generation1.hypothesisState, experimentHypothesisStates.proposed);
assert.equal(createExperimentVariantSet({ hypothesisState: experimentHypothesisStates.testing }).hypothesisState, "TESTING");
pass("H hypothesis lifecycle");

assert.equal(fixture.retentionWinner.goal, winnerGoalTypes.retention);
assert.equal(fixture.retentionWinner.winnerVariantId, "variant_hook_b");
pass("I goal-aware winner", fixture.retentionWinner);

const winnerByMetric = Object.fromEntries(fixture.retentionWinner.metricWinners.map((winner) => [winner.metric, winner.variantId]));
assert.equal(winnerByMetric.views, "variant_hook_a");
assert.equal(winnerByMetric.retention_3s, "variant_hook_b");
assert.equal(winnerByMetric.attributedRevenue, "variant_hook_c");
pass("J different metric winners", fixture.retentionWinner.metricWinners);

assert.equal(fixture.revenueWinner.winnerVariantId, "variant_hook_c");
assert.notEqual(fixture.revenueWinner.winnerVariantId, winnerByMetric.views);
pass("K revenue winner differs from view winner", {
  viewWinner: winnerByMetric.views,
  revenueWinner: fixture.revenueWinner.winnerVariantId
});

assert.equal(fixture.insufficientWinner.winnerVariantId, null);
assert.equal(fixture.insufficientWinner.decision, winnerDecisionStates.insufficientData);
pass("L no clear winner", fixture.insufficientWinner);

assert.equal(fixture.insufficientWinner.dataCompleteness, dataCompletenessStates.insufficient);
pass("M incomplete data");

assert.equal(fixture.insufficientWinner.sampleAdequacy, sampleAdequacyStates.insufficient);
assert.equal(fixture.retentionWinner.sampleAdequacy, sampleAdequacyStates.limited);
pass("N sample adequacy");

assert.equal(fixture.sequentialPlan.modelType, "SequentialExperimentPlan");
assert.equal(fixture.sequentialPlan.generations.length, 2);
assert.equal(fixture.sequentialPlan.noMassDuplicateSpam, true);
pass("O sequential generation", fixture.sequentialPlan);

assert.ok(fixture.nextGenerationRecommendation.retainedElements.includes("question hook"));
pass("P retained elements", fixture.nextGenerationRecommendation.retainedElements);

assert.deepEqual(fixture.nextGenerationRecommendation.variablesToExplore, [variantChangeDimensions.hook]);
pass("Q variables-to-explore");

assert.ok(fixture.generation2.variants.every((variant) => variant.generationId === "generation_2"));
assert.ok(fixture.generation2.variants.every((variant) => variant.parentVariantId === "variant_hook_b"));
pass("R generation lineage");

assert.equal(fixture.learningHandoff.modelType, "ExperimentLearningHandoff");
assert.equal(fixture.learningHandoff.observation.canRewriteLisaCharacterCore, false);
pass("S scoped learning handoff", fixture.learningHandoff);

assert.equal(fixture.learningHandoff.overgeneralizationAllowed, false);
assert.equal(fixture.learningHandoff.insight.causationClaimAllowed, false);
pass("T no overgeneralization");

const expensiveLowRevenue = createContentEconomicsRecord({
  contentAssetId: "variant_expensive",
  productionCost: 1000,
  distributionCost: 200,
  views: 100000,
  clicks: 100,
  leads: 2,
  customers: 1,
  attributedRevenue: 300
});
const cheaperHighRevenue = createContentEconomicsRecord({
  contentAssetId: "variant_efficient",
  productionCost: 100,
  distributionCost: 50,
  views: 30000,
  clicks: 300,
  leads: 20,
  customers: 5,
  attributedRevenue: 1500
});
assert.ok(cheaperHighRevenue.roi > expensiveLowRevenue.roi);
pass("U cost-aware evaluation", { expensiveLowRevenue, cheaperHighRevenue });

const platformAdapter = createPlatformExperimentAdapter({
  adapterId: "trial_reels_future_adapter",
  platform: "INSTAGRAM_FUTURE",
  providerFeatureFuture: "Trial Reels"
});
assert.equal(platformAdapter.architecturalDependency, false);
assert.equal(platformAdapter.liveApiCallsEnabled, false);
pass("V platform independence", platformAdapter);

assert.equal(fixture.learningHandoff.canRewriteLisaCharacterCore, false);
assert.equal(fixture.qualityRejectedWinner.autoPropagateToProduction, false);
pass("W Lisa Character protection");

assert.equal(fixture.qualityRejectedWinner.decision, winnerDecisionStates.qualityRejected);
assert.equal(fixture.qualityRejectedWinner.tieOrNoWinnerReason, "PERFORMANCE_WINNER_QUALITY_REJECTED");
pass("X quality overrides performance where required", fixture.qualityRejectedWinner);

assert.equal(fixture.auditArtifact.providerCalls, 0);
assert.equal(fixture.auditArtifact.externalCalls, 0);
assert.equal(platformAdapter.liveApiCallsEnabled, false);
pass("Y zero external/provider calls");

assert.equal(fixture.auditArtifact.publishActions, 0);
assert.equal(fixture.auditArtifact.executionActions, 0);
assert.equal(fixture.nextGenerationRecommendation.autoGenerateVariants, false);
assert.equal(fixture.sequentialPlan.publishEnabled, false);
pass("Z zero publish/execution");

const masterDerived = createContentAsset({
  contentAssetId: "content_derived_from_master",
  role: contentAssetRoles.derived,
  lineage: {
    parentContentAssetId: fixture.master.contentAssetId,
    rootContentAssetId: fixture.master.contentAssetId,
    derivationType: "EXPERIMENT_VARIANT_ASSET"
  }
});
assert.equal(masterDerived.lineage.rootContentAssetId, fixture.master.contentAssetId);
pass("Master/Variant relationship uses ContentAsset, not a separate master engine");

assert.equal(createGoalAwareSuccessPolicy("REVENUE").revenueRequired, true);
assert.equal(fixture.generation1.primaryMetric, "retention_3s");
pass("Business Goal connection");

assert.equal(fixture.nextGenerationRecommendation.strategy, variantGenerationStrategies.exploit);
assert.equal(createSequentialVariantExperimentFixture().sequentialPlan.strategy, variantGenerationStrategies.balanced);
pass("EXPLORE / EXPLOIT / BALANCED strategy support");

const noWinner = createWinnerDetectionResult({
  experimentId: "experiment_no_winner",
  generationId: "generation_1",
  goal: winnerGoalTypes.retention,
  primaryMetric: "retention_3s",
  metricResults: [
    { variantId: "a", metric: "retention_3s", value: 0.5 },
    { variantId: "b", metric: "retention_3s", value: 0.5 }
  ],
  dataCompleteness: dataCompletenessStates.partial,
  sampleAdequacy: sampleAdequacyStates.limited
});
assert.equal(noWinner.decision, winnerDecisionStates.noClearWinner);
assert.equal(noWinner.tieOrNoWinnerReason, "NO_CLEAR_WINNER");
pass("Explicit no-winner tie behavior", noWinner);

const audit = createContentExperimentAuditArtifact({
  experimentId: "audit_test",
  generationId: "generation_1",
  masterContentAssetId: fixture.master.contentAssetId,
  variantIds: variants.map((variant) => variant.variantId),
  changeSets: variants.map((variant) => variant.changeSet),
  hypothesis: fixture.generation1.hypothesis,
  goal: fixture.retentionWinner.goal,
  winnerDecision: fixture.retentionWinner.decision,
  sampleAdequacy: fixture.retentionWinner.sampleAdequacy
});
assert.equal(audit.artifactType, "ContentExperimentAuditArtifact");
assert.equal(audit.providerCalls + audit.externalCalls + audit.publishActions + audit.executionActions, 0);
pass("Experiment audit artifact", audit);

const contentExperimentCapability = getCapability("CONTENT_EXPERIMENT");
assert.equal(contentExperimentCapability.activationState, "ARCHITECTURE_ONLY");
assert.ok(contentExperimentCapability.outputTypes.includes("WinnerDetectionResult"));
pass("Capability Fabric result", contentExperimentCapability);

const variantKnowledge = productKnowledgeNodes.find((node) => node.nodeId === "production_controlled_content_variants");
assert.equal(variantKnowledge.availabilityState, "ARCHITECTURE_ONLY");
assert.ok(variantKnowledge.limitations.some((limitation) => /No live social testing/i.test(limitation)));
pass("Product Knowledge result", variantKnowledge);

assert.equal(humanExperimentDecisions.acceptWinner, "ACCEPT_WINNER");
assert.equal(humanExperimentDecisions.rejectResult, "REJECT_RESULT");
pass("Human review decisions");

for (const mode of Object.values(contentProductionModes)) {
  const asset = createContentAsset({ productionMode: mode });
  const variant = createContentVariant({
    variantId: `variant_${mode.toLowerCase()}`,
    masterContentAssetId: fixture.master.contentAssetId,
    contentAssetRef: asset.contentAssetId,
    changeSet: {
      changes: [{ dimension: variantChangeDimensions.hook, from: "a", to: "b" }]
    }
  });
  assert.equal(variant.orphanVariant, false);
}
pass("Production-mode compatibility");

const orphan = createContentVariant({
  variantId: "orphan_variant",
  changeSet: { changes: [{ dimension: variantChangeDimensions.hook, from: "a", to: "b" }] }
});
assert.equal(orphan.orphanVariant, true);
pass("No orphan variants");

console.log("Content Variant Sequential Experimentation tests passed.");

