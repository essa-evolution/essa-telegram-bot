import assert from "node:assert/strict";
import fs from "node:fs";

import {
  attemptExecutionFromPreview,
  buildExecutionPreview,
  buildExecutionPreviewViewModel,
  capabilityActivationStates,
  createCapabilityExecutionRequest,
  executionCostPreviewClasses,
  executionPreviewHardGuards,
  executionPreviewStatuses,
  executionStepClassifications,
  productDiscoveryModes,
  parseProductDiscoveryHash
} from "../src/capabilities/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const app = fs.readFileSync("workspace/app.js", "utf8");
const docs = fs.readFileSync("docs/ESSA_EXECUTION_PREVIEW.md", "utf8");

const request = createCapabilityExecutionRequest({
  userNeed: "Сделай обложку для моей книги.",
  primaryCapabilityId: "BOOK_COVER"
});
assert.equal(request.executionRequested, true);
assert.equal(request.providerSecrets, null);
assert.equal(request.primaryCapabilityId, "BOOK_COVER");
pass("CapabilityExecutionRequest is provider-independent", request);

const book = buildExecutionPreview({
  userNeed: "Сделай обложку для моей книги.",
  primaryCapabilityId: "BOOK_COVER"
});
assert.equal(book.product.productId, "ESSA_PUBLISHING");
assert.equal(book.primaryCapability.capabilityId, "BOOK_COVER");
assert.ok(book.requiredCapabilities.includes("IMAGE_GENERATE"));
assert.ok(book.requiredCapabilities.includes("IMAGE_EDIT"));
assert.ok(book.requiredCapabilities.includes("IMAGE_COMPOSE"));
assert.ok(book.optionalCapabilities.includes("TEXT_EDIT"));
assert.ok(book.optionalCapabilities.includes("IMAGE_UPSCALE"));
assert.ok(book.inputRequirements.some((item) => item.requirementId === "book_title"));
assert.equal(book.executionEnabled, false);
pass("A BOOK_COVER execution preview", {
  status: book.executionStatus,
  required: book.requiredCapabilities,
  optional: book.optionalCapabilities
});

const website = buildExecutionPreview({
  userNeed: "Сделай сайт для ресторана.",
  primaryCapabilityId: "WEBSITE_GENERATE"
});
assert.equal(website.primaryCapability.capabilityId, "WEBSITE_GENERATE");
assert.ok(website.requiredCapabilities.includes("ARCHITECTURE_DESIGN"));
assert.ok(website.requiredCapabilities.includes("BROWSER_OBSERVE"));
assert.ok(website.requiredCapabilities.includes("UI_VERIFY"));
assert.ok(website.intelligenceSteps[0].required);
pass("B WEBSITE_GENERATE preview", {
  local: website.localSteps.map((step) => step.capabilityId),
  intelligence: website.intelligenceSteps[0].userFacingLabel
});

const video = buildExecutionPreview({
  userNeed: "Сделай из этого ролик.",
  primaryCapabilityId: "VIDEO_EDIT"
});
assert.equal(video.product.productId, "ESSA_PRODUCTION");
assert.ok(video.requiredCapabilities.includes("VIDEO_EDIT"));
assert.ok(video.expectedArtifacts.includes("RenderArtifact"));
pass("C video production preview", {
  artifacts: video.expectedArtifacts,
  verification: video.verificationPlan
});

const vocal = buildExecutionPreview({
  userNeed: "Хочу, чтобы эта песня звучала моим голосом.",
  primaryCapabilityId: "VOCAL_REPLACE"
});
assert.equal(vocal.product.productId, "ESSA_MUSIC_FACTORY");
assert.ok(vocal.requiredCapabilities.includes("MUSIC_ANALYZE"));
assert.ok(vocal.requiredCapabilities.includes("STEM_SEPARATE"));
assert.ok(vocal.inputRequirements.some((item) => item.requirementId === "rights_consent"));
assert.ok(vocal.safetyNotes.some((note) => note.includes("Voice/rights")));
pass("D vocal replacement preview", {
  required: vocal.requiredCapabilities,
  inputs: vocal.inputRequirements.map((item) => item.requirementId)
});

const localOnly = buildExecutionPreview({
  userNeed: "Обрежь видео.",
  primaryCapabilityId: "VIDEO_TRIM"
}, {
  providedInputs: {
    source_video: true,
    time_range: true
  }
});
assert.equal(localOnly.primaryCapability.capabilityId, "VIDEO_TRIM");
assert.ok(localOnly.localSteps.some((step) => step.classification === executionStepClassifications.localReady));
assert.equal(localOnly.estimatedCostClass, executionCostPreviewClasses.localCompute);
pass("E local-only capability", {
  status: localOnly.executionStatus,
  local: localOnly.localSteps
});

const providerRequired = buildExecutionPreview({
  userNeed: "Сделай обложку.",
  primaryCapabilityId: "BOOK_COVER"
}, {
  providedInputs: {
    book_title: true,
    author: true,
    genre_theme: true,
    desired_style: true
  }
});
assert.ok(providerRequired.providerDependentSteps.length > 0);
pass("F provider-required capability", providerRequired.providerDependentSteps);

const paymentRequired = buildExecutionPreview({
  userNeed: "Сделай обложку.",
  primaryCapabilityId: "BOOK_COVER"
}, {
  availabilityOverride: capabilityActivationStates.readyForPayment,
  providedInputs: {
    book_title: true,
    author: true,
    genre_theme: true,
    desired_style: true
  }
});
assert.equal(paymentRequired.estimatedCostClass, executionCostPreviewClasses.paidProviderRequired);
assert.equal(paymentRequired.executionStatus, executionPreviewStatuses.blockedProviderNotActive);
pass("G payment-required capability", {
  status: paymentRequired.executionStatus,
  cost: paymentRequired.estimatedCostClass
});

assert.equal(providerRequired.executionStatus, executionPreviewStatuses.blockedCapabilityUnavailable);
pass("H architecture-only capability", {
  status: providerRequired.executionStatus,
  availability: providerRequired.currentAvailability
});

assert.equal(book.executionStatus, executionPreviewStatuses.blockedMissingInput);
assert.ok(book.approvalPlan.userInputRequired);
pass("I missing input requirement", {
  status: book.executionStatus,
  missing: book.inputRequirements.filter((item) => item.currentStatus === "MISSING").map((item) => item.requirementId)
});

const stale = buildExecutionPreview({
  userNeed: "Сделай обложку.",
  primaryCapabilityId: "BOOK_COVER"
}, {
  freshnessStatus: "STALE_CONTENT",
  providedInputs: {
    book_title: true,
    author: true,
    genre_theme: true,
    desired_style: true
  }
});
assert.equal(stale.executionStatus, executionPreviewStatuses.blockedCapabilityUnavailable);
pass("J stale capability", stale.executionStatus);

assert.ok(book.sourceOfTruth.includes("ProductKnowledge"));
assert.ok(book.sourceOfTruth.includes("CapabilityCompositionPlan"));
pass("K bounded/source context", book.sourceOfTruth);

assert.equal(website.intelligenceSteps[0].providerCalls, 0);
assert.ok(website.intelligenceSteps[0].debugDecision.reasoningLevel);
pass("L intelligence dry-route", website.intelligenceSteps[0]);

assert.equal(book.exactPriceStatus, "REVALIDATION_REQUIRED");
pass("M cost-class preview", {
  cost: book.estimatedCostClass,
  exactPriceStatus: book.exactPriceStatus
});

assert.equal(book.approvalPlan.required, true);
assert.equal(book.approvalPlan.autoApproved, false);
pass("N approval plan", book.approvalPlan);

assert.ok(book.expectedArtifacts.includes("CoverArtifact"));
assert.ok(website.expectedArtifacts.includes("SiteProject"));
assert.ok(video.expectedArtifacts.includes("VerificationReport"));
assert.ok(vocal.expectedArtifacts.includes("MixArtifact"));
pass("O expected artifacts");

assert.ok(book.verificationPlan.some((item) => item.includes("human visual approval")));
assert.ok(website.verificationPlan.some((item) => item.includes("browser observation")));
pass("P verification plan");

assert.equal(book.executionEnabled, false);
assert.equal(attemptExecutionFromPreview().status, "EXECUTION_NOT_ENABLED_PHASE_21J");
pass("Q execution disabled", attemptExecutionFromPreview());

assert.equal(book.providerCalls, 0);
assert.equal(book.externalModelCalls, 0);
pass("R provider calls = 0");

const localUpdated = buildExecutionPreview({
  userNeed: "Сделай обложку.",
  primaryCapabilityId: "BOOK_COVER"
}, {
  availabilityOverride: capabilityActivationStates.localReady,
  providedInputs: {
    book_title: true,
    author: true,
    genre_theme: true,
    desired_style: true
  }
});
assert.equal(localUpdated.primaryCapability.availabilityState, capabilityActivationStates.localReady);
pass("S source-of-truth propagation", {
  availability: localUpdated.primaryCapability.availabilityState,
  status: localUpdated.executionStatus
});

const view = buildExecutionPreviewViewModel({
  userNeed: "Сделай сайт для ресторана.",
  primaryCapabilityId: "WEBSITE_GENERATE"
});
assert.ok(view.userFacingSections.whatIsNeeded.length >= 3);
assert.ok(app.includes("renderExecutionPreview"));
assert.ok(app.includes("execution-preview-detail"));
assert.ok(docs.includes("EXECUTION_NOT_ENABLED_PHASE_21J"));
pass("T responsive preview contract");

const route = parseProductDiscoveryHash("#product-discovery/execute/BOOK_COVER?q=%D0%BE%D0%B1%D0%BB%D0%BE%D0%B6%D0%BA%D0%B0");
assert.equal(route.mode, productDiscoveryModes.executionPreview);
assert.equal(route.selectedCapabilityId, "BOOK_COVER");
pass("Execution Preview route", route);

assert.deepEqual(
  {
    executionEnabled: book.executionEnabled,
    providerExecutionEnabled: book.providerExecutionEnabled,
    toolExecutionEnabled: book.toolExecutionEnabled,
    publishEnabled: book.publishEnabled,
    deployEnabled: book.deployEnabled,
    paymentEnabled: book.paymentEnabled
  },
  {
    executionEnabled: false,
    providerExecutionEnabled: false,
    toolExecutionEnabled: false,
    publishEnabled: false,
    deployEnabled: false,
    paymentEnabled: false
  }
);
assert.equal(executionPreviewHardGuards.disabledReason, "EXECUTION_NOT_ENABLED_PHASE_21J");
pass("Hard execution guard");

console.log("Execution Preview tests passed.");
