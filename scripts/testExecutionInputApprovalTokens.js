import assert from "node:assert/strict";

import {
  buildExecution21MFlow,
  buildExecution21MReadiness,
  createApprovalDependencies,
  createAuthorizationFingerprint,
  createExecutionApprovalDecision,
  createExecutionApprovalRequest,
  createExecutionInputAnswer,
  createExecutionInputApprovalFixture,
  createExecutionInputCollectionRequest,
  createExecutionInputDraft,
  createExecutionInputResolution,
  createExecutionIntentDraft,
  detectApprovalAntiPattern,
  detectMaterialChanges,
  discoverExecutionApprovalRequests,
  execution21MReadinessStates,
  executionApprovalAntiPatterns,
  executionApprovalStates,
  executionApprovalTypes,
  executionInputCompletenessStates,
  executionInputFreshnessStates,
  executionInputMateriality,
  executionInputResolutionStates,
  executionInputSensitivityClasses,
  executionInputSourceTypes,
  executionInputValidationStates,
  issueScopedApprovalToken,
  phase21MHardGuards,
  productIds,
  productKnowledgeNodes,
  rePreflightExecutionIntentDraft,
  revokeApprovalToken,
  scopedApprovalTokenStatuses,
  validateExecutionInput,
  verifyScopedApprovalToken
} from "../src/capabilities/index.js";
import { systemPrincipleIds } from "../src/systemPrinciples/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const fixture = createExecutionInputApprovalFixture();

const bookDraft = createExecutionIntentDraft({
  intentId: "test_book_intent",
  requestId: "test_book_request",
  traceId: "test_book_trace",
  userNeed: "Сделай обложку для моей книги",
  productId: productIds.publishing,
  primaryCapabilityId: "BOOK_COVER"
});
const bookSources = {
  projectContext: {
    book_title: "Life OS",
    author: "Lisa"
  }
};
const bookCollection = createExecutionInputCollectionRequest(bookDraft, bookSources);

assert.ok(bookCollection.alreadyResolvedInputs.some((item) => item.inputKey === "book_title"));
pass("A known input reused", bookCollection.alreadyResolvedInputs);

assert.ok(bookCollection.questions.some((item) => item.inputKey === "genre_theme"));
pass("B missing input detected", bookCollection.questions.map((item) => item.inputKey));

assert.ok(bookCollection.resolutionSet.optional.some((item) => item.inputKey === "optional_reference"));
pass("C optional input not forced");

assert.equal(fixture.staleMaterialResolution.status, executionInputResolutionStates.stale);
assert.equal(fixture.staleMaterialResolution.userConfirmationRequired, true);
pass("D stale material input asks confirmation", fixture.staleMaterialResolution);

const conflictCollection = createExecutionInputCollectionRequest(bookDraft, {
  projectContext: { book_title: "A" },
  currentUserInputs: { book_title: "B" }
});
assert.ok(conflictCollection.resolutionSet.conflicting.some((item) => item.inputKey === "book_title"));
pass("E conflicting input detected", conflictCollection.resolutionSet.conflicting);

const derivedResolution = createExecutionInputCollectionRequest(bookDraft, {
  projectContext: {
    book_title: "Life OS",
    author: "Lisa",
    genre_theme: "memoir",
    desired_style: "minimal"
  },
  localMetadata: { durationSeconds: 12 }
});
assert.ok(derivedResolution.creatorFirstSummary.resolvedBeforeAsk);
pass("F safe system-derived input path represented");

assert.equal(fixture.unsafeMaterialInference.status, executionInputResolutionStates.invalid);
pass("G no unsafe material inference", fixture.unsafeMaterialInference);

assert.equal(bookCollection.questionBatching.batchSimpleInputs, true);
assert.ok(bookCollection.questionBatching.groupedQuestionCount > 1);
pass("H input batching", bookCollection.questionBatching);

assert.ok(bookCollection.alreadyResolvedInputs.every((item) => item.sourceType));
pass("I input provenance");

const budgetValidation = validateExecutionInput({
  inputKey: "ad_budget",
  rawValue: "500 usd"
}, {
  requirementId: "ad_budget",
  required: true
});
assert.deepEqual(budgetValidation.normalizedValue, { amount: 500, currency: "USD" });
pass("J normalization", budgetValidation);

const invalidTrim = validateExecutionInput({
  inputKey: "time_range",
  rawValue: "00:05-00:03"
}, {
  requirementId: "time_range",
  required: true
});
assert.equal(invalidTrim.status, executionInputValidationStates.invalid);
pass("K invalid input", invalidTrim);

const ambiguousDate = validateExecutionInput({
  inputKey: "publish_date",
  rawValue: "tomorrow"
}, {
  requirementId: "publish_date",
  required: true
});
assert.equal(ambiguousDate.status, executionInputValidationStates.ambiguous);
pass("L ambiguous input", ambiguousDate);

const crossField = validateExecutionInput({
  inputKey: "time_range",
  rawValue: "00:01-00:30"
}, {
  requirementId: "time_range",
  required: true
}, {
  mediaDurationSeconds: 20
});
assert.equal(crossField.status, executionInputValidationStates.invalid);
pass("M cross-field validation", crossField);

const completeInputDraft = createExecutionInputDraft(bookDraft, bookSources, [
  createExecutionInputAnswer({ requirementId: "genre_theme", rawValue: "memoir" }),
  createExecutionInputAnswer({ requirementId: "desired_style", rawValue: "minimal" })
]);
assert.equal(completeInputDraft.completeness, executionInputCompletenessStates.complete);
pass("N completeness", completeInputDraft.validationSummary);

const rePreflight = rePreflightExecutionIntentDraft(bookDraft, completeInputDraft);
assert.equal(rePreflight.usedExistingPreflightEngine, true);
assert.equal(rePreflight.preflight.requiredInputs.length, 0);
pass("O re-preflight uses existing engine", rePreflight.preflight.requiredInputs);

const vocalDiscovery = fixture.vocalReplaceFlow.approvalDiscovery;
assert.ok(vocalDiscovery.approvalRequests.length > 0);
assert.equal(vocalDiscovery.source, "EXISTING_PREFLIGHT");
pass("P approval derived from Preflight", vocalDiscovery.approvalRequests.map((item) => item.approvalType));

assert.equal(vocalDiscovery.arbitraryApprovalsCreated, false);
pass("Q no arbitrary approval");

const approvalContext = vocalDiscovery.approvalRequests[0].presentation;
assert.ok(approvalContext.whatWillHappen);
assert.ok(approvalContext.whyApprovalIsNeeded);
assert.ok(approvalContext.whatWillNotBeAuthorized.length > 0);
pass("R approval context complete", approvalContext);

const approved = createExecutionApprovalDecision({
  approvalRequestId: vocalDiscovery.approvalRequests[0].approvalRequestId,
  decision: executionApprovalStates.approved,
  acknowledgedScope: vocalDiscovery.approvalRequests[0].scope
});
assert.equal(approved.decision, executionApprovalStates.approved);
pass("S approved", approved);

assert.equal(fixture.rejection.decision.decision, executionApprovalStates.rejected);
assert.equal(fixture.rejection.token, null);
pass("T rejected", fixture.rejection.decision);

const deferred = createExecutionApprovalDecision({
  approvalRequestId: "deferred_request",
  decision: executionApprovalStates.deferred
});
assert.equal(deferred.decision, executionApprovalStates.deferred);
pass("U deferred", deferred);

const modified = createExecutionApprovalDecision({
  approvalRequestId: "modified_request",
  decision: executionApprovalStates.modifiedRequested,
  constraints: { maxBudget: 100 }
});
assert.equal(modified.decision, executionApprovalStates.modifiedRequested);
pass("V modified request", modified);

assert.equal(approved.assumedConsent, false);
assert.equal(detectApprovalAntiPattern({ scope: { action: "publish" }, assumedConsent: true }), executionApprovalAntiPatterns.assumedConsent);
pass("W no assumed consent");

assert.equal(vocalDiscovery.groupedPresentation.tokensRemainIndividuallyTraceable, true);
pass("X grouped presentation where appropriate", vocalDiscovery.groupedPresentation);

const dependencies = createApprovalDependencies([
  createExecutionApprovalRequest({ intentId: "x", capabilityId: "BOOK_COVER", approvalType: executionApprovalTypes.providerActivation }),
  createExecutionApprovalRequest({ intentId: "x", capabilityId: "BOOK_COVER", approvalType: executionApprovalTypes.payment })
]);
assert.ok(dependencies.some((item) => item.before === executionApprovalTypes.providerActivation));
pass("Y approval dependency", dependencies);

assert.equal(vocalDiscovery.groupedPresentation.antiPatternAvoided, executionApprovalAntiPatterns.microApprovalOverload);
pass("Z micro-approval anti-pattern");

const token = issueScopedApprovalToken(vocalDiscovery.approvalRequests[0], approved, { tokenId: "approved_token" });
assert.ok(token);
assert.equal(token.status, scopedApprovalTokenStatuses.active);
pass("AA scoped token issued only after approval", token);

assert.equal(token.intentId, vocalDiscovery.approvalRequests[0].intentId);
pass("AB token bound to intent");

assert.equal(token.intentVersion, vocalDiscovery.approvalRequests[0].intentVersion);
pass("AC token bound to intentVersion");

assert.equal(token.capabilityId, vocalDiscovery.approvalRequests[0].capabilityId);
pass("AD token bound to capability");

assert.equal(verifyScopedApprovalToken(token, {
  intentId: token.intentId,
  intentVersion: token.intentVersion,
  capabilityId: token.capabilityId,
  scope: token.scope,
  costClass: token.scope.maxCostClass
}).valid, true);
pass("AE token scope checked");

assert.equal(fixture.costChange.materialChanges[0].approvalImpact, "REAPPROVAL_REQUIRED");
pass("AF material change invalidates", fixture.costChange.materialChanges);

assert.equal(fixture.nonMaterialChange.changes[0].approvalImpact, "MAY_PRESERVE_APPROVAL");
assert.equal(fixture.nonMaterialChange.fingerprintStableForPresentationOnly, true);
pass("AG non-material change may preserve", fixture.nonMaterialChange);

assert.ok(fixture.costChange.materialChanges.some((item) => item.field === "budget"));
pass("AH cost expansion invalidates");

assert.equal(fixture.publish.scopeMismatch.status, scopedApprovalTokenStatuses.scopeMismatch);
pass("AI target account change invalidates", fixture.publish.scopeMismatch);

const expiringRequest = createExecutionApprovalRequest({
  intentId: "expiring",
  intentVersion: "1",
  capabilityId: "PUBLISHING_PACKAGE",
  approvalType: executionApprovalTypes.publish,
  scope: { action: "publish" },
  expiresAt: "2026-08-28T00:00:00.000Z"
});
const expiringDecision = createExecutionApprovalDecision({
  approvalRequestId: expiringRequest.approvalRequestId,
  decision: executionApprovalStates.approved,
  acknowledgedScope: expiringRequest.scope
});
const expiredToken = issueScopedApprovalToken(expiringRequest, expiringDecision);
assert.equal(verifyScopedApprovalToken(expiredToken, { now: "2026-08-29T00:00:00.000Z" }).status, scopedApprovalTokenStatuses.expired);
pass("AJ expiry");

assert.equal(fixture.revocation.after.status, scopedApprovalTokenStatuses.revoked);
assert.equal(verifyScopedApprovalToken(fixture.revocation.after).valid, false);
pass("AK revocation", fixture.revocation.after);

assert.equal(token.singleUse, true);
assert.equal(token.revocable, true);
pass("AL single-use metadata");

assert.equal(detectApprovalAntiPattern({ scope: { allFutureActions: true }, contextPresented: true }), executionApprovalAntiPatterns.blanketApproval);
pass("AM no blanket scope");

const fp1 = createAuthorizationFingerprint({
  intentId: "x",
  intentVersion: "1",
  capabilityId: "BOOK_COVER",
  approvalType: executionApprovalTypes.cost,
  scope: { budget: 100 },
  costClass: "METERED"
});
const fp2 = createAuthorizationFingerprint({
  costClass: "METERED",
  scope: { budget: 100 },
  approvalType: executionApprovalTypes.cost,
  capabilityId: "BOOK_COVER",
  intentVersion: "1",
  intentId: "x"
});
assert.equal(fp1, fp2);
pass("AN fingerprint deterministic");

assert.equal(verifyScopedApprovalToken(token, {
  intentId: token.intentId,
  intentVersion: "999",
  capabilityId: token.capabilityId
}).status, scopedApprovalTokenStatuses.versionMismatch);
pass("AO version mismatch");

assert.equal(verifyScopedApprovalToken(token, {
  intentId: token.intentId,
  intentVersion: token.intentVersion,
  capabilityId: "OTHER"
}).status, scopedApprovalTokenStatuses.scopeMismatch);
pass("AP scope mismatch");

assert.equal(bookCollection.creatorFirstSummary.resolvedBeforeAsk, true);
pass("AQ system resolves known input before asking");

assert.equal(bookCollection.estimatedUserEffort.systemResolvedInputs, 2);
assert.ok(bookCollection.estimatedUserEffort.requiredHumanInputs < bookDraft.inputSnapshot.length);
pass("AR user effort reduced", bookCollection.estimatedUserEffort);

assert.ok(bookCollection.questions.every((question) => !["book_title", "author"].includes(question.inputKey)));
pass("AS only truly missing values requested");

assert.ok(vocalDiscovery.approvalRequests.some((item) => item.approvalType === executionApprovalTypes.legalPolicy || item.approvalType === executionApprovalTypes.destructiveHighImpact));
pass("AT material human decision preserved");

assert.equal(token.executionAuthorityNow, false);
pass("AU system preparation does not create authority");

const knowledgeNode = productKnowledgeNodes.find((node) => node.nodeId === "execution_input_approval_tokens");
assert.equal(knowledgeNode.metadata.creatorFirstPrincipleId, systemPrincipleIds.creatorFirst);
assert.equal(knowledgeNode.availabilityState, "ARCHITECTURE_ONLY");
pass("AV Product Knowledge grounded", knowledgeNode);

assert.ok(fixture.bookFlow.ui.lisaExplanation.includes("Я уже взяла из проекта"));
pass("AW Lisa explanation grounded", fixture.bookFlow.ui.lisaExplanation);

assert.ok(vocalDiscovery.approvalRequests.some((item) => ["FINANCIAL", "HIGH", "LEGAL", "PUBLISH", "DESTRUCTIVE"].includes(String(item.riskClass))));
pass("AX money remains gated");

assert.ok(fixture.businessDiscoveryFlow.rePreflight.preflight.blockers.includes("PROVIDER_ACTIVATION_REQUIRED") || fixture.businessDiscoveryFlow.rePreflight.preflight.blockers.includes("LIVE_SOURCE_ACTIVATION_REQUIRED"));
pass("AY provider activation remains gated");

assert.ok(fixture.bookFlow.approvalDiscovery.approvalRequests.some((item) => item.approvalType === executionApprovalTypes.payment || item.approvalType === executionApprovalTypes.cost));
pass("AZ payment remains gated");

assert.equal(fixture.publish.request.approvalType, executionApprovalTypes.publish);
pass("BA publish remains gated");

const deployRequest = createExecutionApprovalRequest({
  intentId: "deploy_intent",
  capabilityId: "WEBSITE_GENERATE",
  approvalType: executionApprovalTypes.deploy,
  scope: { action: "deploy", site: "siteX" },
  externalEffect: "FUTURE_DEPLOY"
});
assert.equal(deployRequest.approvalType, executionApprovalTypes.deploy);
pass("BB deploy remains gated", deployRequest);

assert.ok(fixture.vocalReplaceFlow.approvalDiscovery.approvalRequests.some((item) => item.approvalType === executionApprovalTypes.destructiveHighImpact));
pass("BC destructive/high-impact remains gated");

assert.ok(fixture.vocalReplaceFlow.approvalDiscovery.approvalRequests.some((item) => item.approvalType === executionApprovalTypes.legalPolicy));
pass("BD rights/consent remains gated");

const secretResolution = createExecutionInputResolution({
  requirementId: "api_key",
  value: "sk-secret",
  sensitivityClass: executionInputSensitivityClasses.secretReferenceOnly,
  sourceType: executionInputSourceTypes.userProvidedCurrent,
  status: executionInputResolutionStates.resolved
});
assert.equal(secretResolution.value, "[SECRET_REFERENCE]");
assert.equal(/sk-secret/.test(JSON.stringify(secretResolution)), false);
pass("BE secret not exposed in audit", secretResolution);

assert.equal(fixture.bookFlow.externalCalls, 0);
assert.equal(fixture.bookFlow.auditArtifact.externalCalls, 0);
pass("BF zero external calls");

assert.equal(fixture.bookFlow.providerCalls + fixture.bookFlow.externalModelCalls, 0);
pass("BG zero provider/model calls");

assert.equal(fixture.bookFlow.paymentActions, 0);
assert.equal(fixture.bookFlow.auditArtifact.paymentActions, 0);
pass("BH zero payment");

assert.equal(fixture.bookFlow.publishActions, 0);
assert.equal(fixture.bookFlow.auditArtifact.publishActions, 0);
pass("BI zero publish");

assert.equal(fixture.bookFlow.deployActions, 0);
assert.equal(fixture.bookFlow.auditArtifact.deployActions, 0);
pass("BJ zero deploy");

assert.equal(fixture.bookFlow.productionMutations, 0);
assert.equal(fixture.bookFlow.auditArtifact.productionMutations, 0);
pass("BK zero production mutation");

const readyNoApproval = buildExecution21MReadiness(completeInputDraft, [], [], []);
assert.equal(readyNoApproval.futureExecutionReady, true);
assert.equal(readyNoApproval.executionEnabled, false);
assert.equal(readyNoApproval.executionPerformed, false);
assert.equal(readyNoApproval.hardStopState, execution21MReadinessStates.executionDisabledPhase21M);
pass("BL execution false even when future-ready", readyNoApproval);

Object.entries(phase21MHardGuards).forEach(([key, value]) => {
  assert.deepEqual(fixture.bookFlow[key], value, key);
});

const materialChanges = detectMaterialChanges({ targetAccount: "A" }, { targetAccount: "B" });
assert.equal(materialChanges[0].approvalImpact, "REAPPROVAL_REQUIRED");

const revoked = revokeApprovalToken(token, "user_changed_mind");
assert.equal(revoked.status, scopedApprovalTokenStatuses.revoked);

console.log("Execution Input Approval Token tests passed.");
