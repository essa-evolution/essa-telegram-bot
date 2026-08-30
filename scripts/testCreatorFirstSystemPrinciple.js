import assert from "node:assert/strict";

import {
  productKnowledgeNodes,
  getCapability
} from "../src/capabilities/index.js";
import { productIds } from "../src/capabilities/productCapabilityMap.js";
import {
  createCreatorFirstAuditFixture,
  createCreatorFirstDecision,
  createManualBurdenFinding,
  createUserEffortProfile,
  creatorFirstAntiPatterns,
  creatorFirstBrandExpressionIds,
  creatorFirstDecisionRecommendations,
  creatorFirstInteractionModel,
  creatorFirstPermissionStates,
  creatorFirstRiskClasses,
  creatorFirstUxImplications,
  detectCreatorFirstAntiPattern,
  getCreatorFirstBrandExpression,
  getCreatorFirstRootPrinciple,
  getCreatorFirstVerticalManifestation,
  listCreatorFirstVerticalManifestations,
  mapCapabilityToCreatorFirstDecision,
  systemPrincipleIds
} from "../src/systemPrinciples/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const root = getCreatorFirstRootPrinciple();
const fixture = createCreatorFirstAuditFixture();
const manifestations = listCreatorFirstVerticalManifestations();

assert.equal(root.principleId, systemPrincipleIds.creatorFirst);
assert.equal(new Set(manifestations.map((item) => item.rootPrincipleId)).size, 1);
pass("A one root principle", { principleId: root.principleId });

assert.ok(manifestations.every((item) => item.rootPrinciple === root));
assert.ok(manifestations.every((item) => item.coreSemanticsLocked === true));
pass("B no vertical duplication", manifestations.map((item) => item.productId));

assert.equal(getCreatorFirstVerticalManifestation(productIds.business).rootPrincipleId, root.principleId);
pass("C Business inherits root", getCreatorFirstVerticalManifestation(productIds.business));

assert.equal(getCreatorFirstVerticalManifestation(productIds.production).rootPrincipleId, root.principleId);
pass("D Production inherits root", getCreatorFirstVerticalManifestation(productIds.production));

assert.equal(getCreatorFirstVerticalManifestation(productIds.advertising).rootPrincipleId, root.principleId);
pass("E Advertising inherits root", getCreatorFirstVerticalManifestation(productIds.advertising));

assert.equal(getCreatorFirstVerticalManifestation(productIds.property).rootPrincipleId, root.principleId);
pass("F Property inherits root", getCreatorFirstVerticalManifestation(productIds.property));

assert.notEqual(
  getCreatorFirstVerticalManifestation(productIds.business).contextualExpression,
  getCreatorFirstVerticalManifestation(productIds.production).contextualExpression
);
pass("G contextual wording may differ");

assert.ok(root.inheritance.verticalsMayNotOverride.includes("core_semantics"));
assert.ok(getCreatorFirstVerticalManifestation(productIds.business).approvalBoundariesLocked);
pass("H core semantics cannot be overridden", root.inheritance);

assert.ok(root.humanAuthorityRules.includes("payment"));
assert.ok(root.humanAuthorityRules.includes("publishing"));
assert.ok(root.humanAuthorityRules.includes("destructive_or_high_impact_actions"));
pass("I approval policies remain authoritative", root.humanAuthorityRules);

assert.equal(fixture.decisions.moneyDecision.approvalRequired, true);
assert.equal(fixture.decisions.moneyDecision.canSystemExecute, false);
pass("J money requires existing gate", fixture.decisions.moneyDecision);

assert.equal(fixture.decisions.publishDecision.approvalRequired, true);
assert.equal(fixture.decisions.publishDecision.recommendedInteraction, creatorFirstDecisionRecommendations.askApproval);
pass("K publish requires existing gate", fixture.decisions.publishDecision);

assert.equal(fixture.decisions.destructiveDecision.approvalRequired, true);
assert.equal(fixture.decisions.destructiveDecision.canSystemExecute, false);
pass("L destructive action remains gated", fixture.decisions.destructiveDecision);

assert.equal(fixture.decisions.safePreparationDecision.canSystemPrepare, true);
assert.equal(fixture.decisions.safePreparationDecision.approvalRequired, false);
pass("M safe preparation may remain system-side", fixture.decisions.safePreparationDecision);

assert.equal(
  detectCreatorFirstAntiPattern({ contextAlreadyAvailable: true, asksUserToRepeatContext: true }),
  creatorFirstAntiPatterns.redundantInput
);
pass("N redundant input anti-pattern detected");

assert.equal(
  detectCreatorFirstAntiPattern({ systemCanCalculate: true, asksUserToCalculate: true }),
  creatorFirstAntiPatterns.manualRecalculation
);
pass("O redundant calculation anti-pattern detected");

assert.ok(root.behaviorRules.includes(creatorFirstUxImplications.prepareBeforeAsking));
pass("P prepare-before-ask represented");

assert.ok(root.uxImplications.includes(creatorFirstUxImplications.reportByException));
pass("Q report-by-exception represented");

const navigator = getCreatorFirstVerticalManifestation(productIds.navigator);
assert.ok(navigator.automationExamples.includes("bounded_product_knowledge_retrieval"));
pass("R Navigator connection", navigator);

assert.ok(fixture.auditArtifact.existingAlignedSystems.includes("ExecutionIntentDraft Preflight"));
pass("S Execution Preflight connection", fixture.auditArtifact.existingAlignedSystems);

assert.ok(root.architectureOnly);
assert.equal(root.executionEnabled, false);
pass("T 21M future connection only");

const knowledgeNode = productKnowledgeNodes.find((node) => node.nodeId === "essa_creator_first_system_principle");
assert.equal(knowledgeNode.metadata.principleId, root.principleId);
assert.ok(knowledgeNode.limitations.some((item) => /does not enable execution/i.test(item)));
pass("U Product Knowledge truthfulness", knowledgeNode);

assert.ok(/judgment, consent or authority/.test(knowledgeNode.plainLanguageDescription));
assert.equal(knowledgeNode.metadata.canonicalShortline, getCreatorFirstBrandExpression(creatorFirstBrandExpressionIds.shortline).text);
pass("V Lisa explanation grounded", knowledgeNode.plainLanguageDescription);

assert.equal(root.localization.semanticIdStable, true);
assert.equal(root.localization.policyIdentifierIsNotLocalizedCopy, true);
pass("W localization-ready", root.localization);

assert.equal(root.providerIndependent, true);
assert.equal(fixture.auditArtifact.providerCalls, 0);
pass("X provider independence");

assert.equal(root.providerCalls + root.externalCalls, 0);
assert.equal(fixture.auditArtifact.providerCalls + fixture.auditArtifact.externalCalls, 0);
pass("Y zero external calls");

assert.equal(root.paymentActions + root.publishActions + root.deployActions, 0);
assert.equal(
  fixture.auditArtifact.executionActions +
    fixture.auditArtifact.paymentActions +
    fixture.auditArtifact.publishActions +
    fixture.auditArtifact.deployActions,
  0
);
pass("Z zero execution/publish/payment/deploy");

const vocalDecision = mapCapabilityToCreatorFirstDecision(getCapability("VOCAL_REPLACE"));
assert.equal(vocalDecision.approvalRequired, true);
assert.equal(vocalDecision.permissionState, creatorFirstPermissionStates.approvalRequired);
pass("Capability gates consumed, not bypassed", vocalDecision);

const localPrep = createCreatorFirstDecision({
  action: "prepare_bounded_product_knowledge",
  canSystemPrepare: true,
  canSystemExecute: false
});
assert.equal(localPrep.recommendedInteraction, creatorFirstDecisionRecommendations.systemPrepare);
pass("System work vs human decision contract", localPrep);

const effortProfile = createUserEffortProfile({
  task: "business_health_review",
  systemPreparations: ["normalize_metrics"],
  requiredHumanDecisions: ["approve_budget_change"],
  avoidableManualSteps: ["manual_state_tracking"]
});
assert.ok(effortProfile.avoidableManualSteps.includes("manual_state_tracking"));
pass("UserEffortProfile", effortProfile);

const burden = createManualBurdenFinding({
  workflow: "Product Discovery",
  step: "choose_provider",
  reasonManualToday: "advanced_debug_mode_only",
  systemCapabilityAvailable: true,
  risk: creatorFirstRiskClasses.material,
  antiPattern: creatorFirstAntiPatterns.userForcedToChooseProvider
});
assert.equal(burden.modelType, "ManualBurdenFinding");
pass("ManualBurdenFinding", burden);

assert.equal(getCreatorFirstBrandExpression(creatorFirstBrandExpressionIds.philosophy).locale, "ru");
assert.ok(getCreatorFirstBrandExpression(creatorFirstBrandExpressionIds.philosophy).displayPolicy.includes("NOT_EVERY_SCREEN"));
pass("Brand expressions are canonical tokens, not UI spam");

assert.deepEqual(creatorFirstInteractionModel, [
  "OBSERVE",
  "UNDERSTAND",
  "PREPARE",
  "EXECUTE_WHEN_ALLOWED",
  "REPORT",
  "LEARN"
]);
pass("Target interaction model");

assert.equal(fixture.auditArtifact.workflowAudits.length, 8);
assert.ok(fixture.auditArtifact.duplicatePrevention.oneRootPrinciple);
pass("Representative workflow audit and audit artifact", fixture.auditArtifact);

console.log("Creator-First System Principle tests passed.");
