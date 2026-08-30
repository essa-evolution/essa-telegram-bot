import assert from "node:assert/strict";

import {
  buildExecutionPreflightViewModel,
  buildProductDiscoveryHash,
  executionIntentClasses,
  executionIntentDraftStatuses,
  parseProductDiscoveryHash,
  phase21KHardGuards,
  productDiscoveryModes,
  productIds,
  providerActivationStatuses,
  rollbackStates
} from "../src/capabilities/index.js";

let failures = 0;

function check(label, fn) {
  try {
    const details = fn();
    console.log(`PASS ${label}`);
    if (details) console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${label}`);
    console.log(error.stack || error.message);
  }
}

function vm(capabilityId, productId, options = {}) {
  return buildExecutionPreflightViewModel({
    requestId: `${capabilityId}_phase21l_request`,
    traceId: `${capabilityId}_phase21l_trace`,
    userNeed: options.userNeed || `Need ${capabilityId}`,
    productId,
    primaryCapabilityId: capabilityId
  }, {
    createdAt: "2026-08-27T00:00:00.000Z",
    route: `#product-discovery/preflight/${capabilityId}`,
    providedInputs: options.providedInputs || {},
    sourceVersionOverride: options.sourceVersionOverride,
    contextBudget: { maxItems: 6, maxChars: 1800 }
  });
}

const book = vm("BOOK_COVER", productIds.publishing);
const website = vm("WEBSITE_GENERATE", productIds.developer, {
  providedInputs: {
    business_description: "Restaurant in Batumi",
    site_goal: "Bookings",
    pages: "Home, menu, booking"
  }
});
const video = vm("VIDEO_EDIT", productIds.production, {
  providedInputs: {
    source_video: "local.mp4",
    video_goal: "Promo",
    target_format: "Reels"
  }
});
const vocal = vm("VOCAL_REPLACE", productIds.musicFactory);
const businessDiscovery = vm("BUSINESS_DISCOVERY", productIds.business, {
  providedInputs: {
    target_market: "restaurants",
    geography: "Batumi",
    industries: "hospitality",
    public_sources: "local fixture only",
    data_policy: "PUBLIC_BUSINESS_DATA_ONLY"
  }
});
const architectureOnly = vm("BUSINESS_ANALYZE", productIds.business, {
  providedInputs: {
    project_context: "local business profile"
  }
});
const trim = vm("VIDEO_TRIM", productIds.production, {
  providedInputs: {
    source_video: "local.mp4",
    time_range: "00:01-00:03"
  }
});
const stale = vm("BOOK_COVER", productIds.publishing, {
  sourceVersionOverride: "0.0.1"
});

check("A BOOK_COVER preflight view model", () => {
  assert.equal(book.viewType, "ExecutionPreflightUiViewModel");
  assert.equal(book.primaryCapability.capabilityId, "BOOK_COVER");
  assert.ok(book.expectedArtifacts.some((item) => item.artifactType === "CoverArtifact"));
});

check("B WEBSITE_GENERATE preflight", () => {
  assert.equal(website.primaryCapability.capabilityId, "WEBSITE_GENERATE");
  assert.ok(website.capabilityDependencies.some((item) => item.capabilityId === "UI_VERIFY"));
  assert.ok(website.verificationPlan.some((item) => item.label.includes("browser")));
});

check("C VIDEO_EDIT preflight", () => {
  assert.equal(video.primaryCapability.capabilityId, "VIDEO_EDIT");
  assert.ok(video.expectedArtifacts.some((item) => item.artifactType === "RenderArtifact"));
  assert.ok(video.verificationPlan.some((item) => item.label.includes("ffprobe")));
});

check("D VOCAL_REPLACE preflight", () => {
  assert.equal(vocal.executionClass, executionIntentClasses.destructiveOrHighImpact);
  assert.ok(vocal.approvals.some((item) => item.type === "LEGAL_POLICY_REVIEW"));
});

check("E BUSINESS_DISCOVERY preflight", () => {
  assert.equal(businessDiscovery.primaryCapability.capabilityId, "BUSINESS_DISCOVERY");
  assert.ok(businessDiscovery.blockers.some((item) => item.code === "LIVE_SOURCE_ACTIVATION_REQUIRED"));
  assert.equal(businessDiscovery.providerCalls, 0);
});

check("F architecture-only state", () => {
  assert.equal(architectureOnly.executionClass, executionIntentClasses.architectureOnly);
  assert.ok(architectureOnly.blockers.some((item) => item.code === "CAPABILITY_ARCHITECTURE_ONLY"));
});

check("G local-ready state", () => {
  assert.equal(trim.executionClass, executionIntentClasses.localOnly);
  assert.equal(trim.executionEnabled, false);
  assert.ok(trim.activationRequirements.some((item) => item.status === providerActivationStatuses.localOnlyNoProviderRequired));
});

check("H missing input state", () => {
  assert.ok(book.missingInputs.length >= 3);
  assert.equal(book.status, executionIntentDraftStatuses.preflightBlocked);
});

check("I stale state", () => {
  assert.equal(stale.freshness, "STALE_REVALIDATION_REQUIRED");
  assert.ok(stale.blockers.some((item) => item.code === "STALE_REVALIDATION_REQUIRED"));
});

check("J provider activation required", () => {
  assert.ok(book.activationRequirements.some((item) => item.status === providerActivationStatuses.capabilityRequiresProvider));
});

check("K payment required", () => {
  assert.equal(book.costPreview.costClass, "PAID_PROVIDER_REQUIRED");
  assert.ok(book.blockers.some((item) => item.code === "PAYMENT_REQUIRED"));
});

check("L approval required", () => {
  assert.ok(vocal.approvals.length > 0);
  assert.ok(vocal.approvals.every((item) => item.autoApproved === false));
});

check("M blocker/warning distinction", () => {
  assert.ok(book.blockers.every((item) => item.severity === "BLOCKER"));
  assert.ok(book.warnings.every((item) => item.severity === "WARNING"));
});

check("N artifact rendering", () => {
  assert.ok(website.expectedArtifacts.some((item) => item.artifactType === "SiteProject"));
  assert.ok(businessDiscovery.expectedArtifacts.some((item) => item.artifactType === "LeadIntelligenceAuditArtifact"));
});

check("O verification rendering", () => {
  assert.ok(vocal.verificationPlan.some((item) => item.label.includes("voice")));
  assert.ok(businessDiscovery.verificationPlan.some((item) => item.label.includes("freshness")));
});

check("P rollback rendering", () => {
  assert.ok(Object.values(rollbackStates).includes(website.rollbackPlan.state));
  assert.ok(website.rollbackPlan.steps.length > 0);
});

check("Q source-of-truth propagation", () => {
  assert.deepEqual(website.capabilityDependencies.map((item) => item.capabilityId), website.draft.dependencyOrder);
});

check("R bounded context", () => {
  assert.ok(book.auditSummary.contextEconomy.chars <= 1800);
  assert.ok(book.draft.contextEconomy.policy.neverSendFullMemoryAutomatically);
});

check("S execution disabled", () => {
  Object.entries(phase21KHardGuards).forEach(([key, value]) => {
    assert.deepEqual(book[key], value, key);
  });
});

check("T provider/external calls zero", () => {
  [book, website, video, vocal, businessDiscovery, trim].forEach((item) => {
    assert.equal(item.providerCalls, 0);
    assert.equal(item.externalCalls, 0);
    assert.equal(item.externalModelCalls, 0);
  });
});

check("U navigation/deep link", () => {
  const hash = buildProductDiscoveryHash({
    mode: productDiscoveryModes.executionPreflight,
    selectedCapabilityId: "BOOK_COVER",
    debugEnabled: true
  });
  const parsed = parseProductDiscoveryHash(hash);
  assert.equal(hash, "#product-discovery/preflight/BOOK_COVER?debug=1");
  assert.equal(parsed.mode, productDiscoveryModes.executionPreflight);
  assert.equal(parsed.selectedCapabilityId, "BOOK_COVER");
});

check("V back/breadcrumb preservation", () => {
  const previous = parseProductDiscoveryHash("#product-discovery/search?q=cover");
  const current = parseProductDiscoveryHash("#product-discovery/preflight/BOOK_COVER?q=cover", previous);
  assert.equal(current.previousState.mode, productDiscoveryModes.searchResults);
  assert.equal(current.searchQuery, "cover");
});

check("W Lisa explanation grounded in preflight", () => {
  assert.ok(book.lisaExplanation.includes("preflight"));
  assert.ok(book.lisaExplanation.includes("Название книги"));
});

check("X normal UI hides provider/model internals", () => {
  const normalText = JSON.stringify({
    statusLabel: book.statusLabel,
    executionClassLabel: book.executionClassLabel,
    activationRequirements: book.activationRequirements,
    costPreview: book.costPreview,
    blockers: book.blockers
  });
  assert.equal(/OPENAI|ANTHROPIC|ZAI|GLM|OpenRouter|providerId/i.test(normalText), false);
});

check("Y debug provenance available", () => {
  assert.equal(book.auditArtifact.artifactType, "ExecutionPreflightUiAuditArtifact");
  assert.ok(book.auditArtifact.sourceVersions.length > 0);
  assert.equal(book.auditArtifact.providerCalls, 0);
});

check("Z no fake launchability", () => {
  [book, website, video, vocal, businessDiscovery, trim].forEach((item) => {
    assert.equal(item.executionEnabled, false);
    assert.equal(item.preflight.executableNow, false);
    assert.equal(item.auditArtifact.executionFlags.executionEnabled, false);
  });
});

if (failures > 0) {
  console.error(`Execution Preflight UI tests failed: ${failures}`);
  process.exit(1);
}

console.log("Execution Preflight UI tests passed.");
