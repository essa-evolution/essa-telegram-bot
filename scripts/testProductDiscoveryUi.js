import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildCapabilityDetailViewModel,
  buildProductDetailViewModel,
  buildProductDiscoverySearchViewModel,
  buildProductDiscoveryUiState,
  buildProductEducationViewModel,
  buildProductOverviewViewModel,
  capabilityActivationStates,
  createCapabilityCardViewModel,
  createProductAvailabilitySummary,
  createProviderReplacementUiProbe,
  filterCapabilityCards,
  productEducationCards,
  productIds,
  productKnowledgeNodes
} from "../src/capabilities/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const workspaceHtml = fs.readFileSync("workspace/index.html", "utf8");
const workspaceCss = fs.readFileSync("workspace/styles.css", "utf8");
const workspaceApp = fs.readFileSync("workspace/app.js", "utf8");

const overview = buildProductOverviewViewModel({ maxProducts: 8 });
assert.equal(overview.viewType, "product_overview");
assert.equal(overview.executionEnabled, false);
assert.equal(overview.providerCalls, 0);
assert.ok(overview.products.length > 0 && overview.products.length < overview.debug.totalCapabilityCount);
pass("A Broad catalog overview is bounded", {
  products: overview.products.length,
  totalCapabilityCount: overview.debug.totalCapabilityCount
});

const bookSearch = buildProductDiscoverySearchViewModel("Что у вас есть для книги?");
assert.ok(bookSearch.matchedProducts.some((product) => product.productId === productIds.publishing));
assert.ok(bookSearch.capabilityCards.some((card) => card.productId === productIds.publishing));
pass("B Book query returns Publishing/Books results");

const education = buildProductEducationViewModel("BOOK_COVER", { productId: productIds.publishing });
assert.equal(education.capabilityId, "BOOK_COVER");
assert.equal(education.lisaGuideRole, "LISA_ESSA_PRODUCT_GUIDE");
assert.equal(education.lisaCanMutateProductKnowledge, false);
assert.ok(education.problem && education.examplePrompt);
pass("C Book cover education card renders from ProductEducationCard", {
  examplePrompt: education.examplePrompt,
  availability: education.availability
});

const website = buildProductDiscoverySearchViewModel("Хочу сайт");
assert.ok(website.capabilityCards.some((card) => card.capabilityId === "WEBSITE_GENERATE"));
pass("D Website query returns WEBSITE_GENERATE context");

const reel = buildProductDiscoverySearchViewModel("Хочу сделать ролик");
assert.ok(reel.capabilityCards.some((card) => card.capabilityId === "VIDEO_EDIT"));
pass("E Reel/video query returns production video context");

const vocal = buildProductDiscoverySearchViewModel("Хочу перепеть песню своим голосом");
assert.ok(vocal.capabilityCards.some((card) => card.capabilityId === "VOCAL_REPLACE"));
pass("F Vocal replacement query returns VOCAL_REPLACE context");

const business = buildProductDiscoverySearchViewModel("Что есть для бизнеса?");
assert.ok(business.capabilityCards.some((card) => card.capabilityId === "BUSINESS_ANALYZE"));
pass("G Business query returns business capability context");

const active = createCapabilityCardViewModel({
  capabilityId: "BOOK_COVER",
  productId: productIds.publishing,
  availabilityOverride: capabilityActivationStates.active
});
assert.equal(active.availabilityState, capabilityActivationStates.active);
assert.equal(active.availabilityLabel, "ДОСТУПНО");
pass("H ACTIVE availability renders active badge");

const localReady = createCapabilityCardViewModel({ capabilityId: "VIDEO_TRIM", productId: productIds.production });
assert.equal(localReady.availabilityState, capabilityActivationStates.localReady);
assert.equal(localReady.availabilityLabel, "РАБОТАЕТ ЛОКАЛЬНО");
pass("I LOCAL_READY availability renders local badge");

const payment = createCapabilityCardViewModel({
  capabilityId: "BOOK_COVER",
  productId: productIds.publishing,
  availabilityOverride: capabilityActivationStates.readyForPayment
});
assert.equal(payment.availabilityLabel, "НУЖНА ОПЛАТА ПРОВАЙДЕРА");
assert.match(payment.activationRequirement, /платная|оплата/i);
pass("J READY_FOR_PAYMENT renders payment-required badge");

const architectureOnly = createCapabilityCardViewModel({ capabilityId: "BOOK_COVER", productId: productIds.publishing });
assert.equal(architectureOnly.availabilityState, capabilityActivationStates.architectureOnly);
assert.equal(architectureOnly.availabilityLabel, "В РАЗРАБОТКЕ");
assert.notEqual(architectureOnly.availabilityLabel, "ДОСТУПНО");
pass("K ARCHITECTURE_ONLY never looks active");

const stale = createCapabilityCardViewModel({
  capabilityId: "BOOK_COVER",
  productId: productIds.publishing,
  sourceVersionOverride: "0.0.1"
});
assert.equal(stale.freshnessStatus, "STALE_CONTENT");
assert.equal(stale.availabilityLabel, "ОБНОВЛЕНИЕ ДАННЫХ ТРЕБУЕТСЯ");
pass("L Stale knowledge warning state renders");

const providerReplacement = createProviderReplacementUiProbe("IMAGE_GENERATE");
assert.equal(providerReplacement.beforeLabel, "Создать изображение");
assert.equal(providerReplacement.afterLabel, "Создать изображение");
assert.equal(providerReplacement.userFacingLabelStable, true);
assert.equal(providerReplacement.providerCalls, 0);
pass("M Provider replacement keeps user-facing label stable", providerReplacement);

assert.ok(overview.debug.totalCapabilityCount >= 100);
assert.ok(overview.products.length <= 8);
assert.ok(bookSearch.boundedContextMetadata.selectedCount <= 5);
pass("N Bounded retrieval avoids full capability dump", {
  selectedCount: bookSearch.boundedContextMetadata.selectedCount,
  candidateCount: bookSearch.boundedContextMetadata.candidateCount
});

const allActions = [
  ...overview.products.flatMap((product) => product.uiActions),
  ...bookSearch.capabilityCards.flatMap((card) => card.uiActions)
];
assert.ok(allActions.length > 0);
assert.ok(allActions.every((action) => action.executionEnabled === false));
assert.equal(bookSearch.executionEnabled, false);
pass("O Execution disabled across Product Discovery UI actions");

const educationSource = productEducationCards.find((card) => card.capabilityId === "BOOK_COVER");
assert.equal(education.examplePrompt, educationSource.examplePrompt);
assert.equal(education.problem, educationSource.problem);
assert.equal(education.lisaGuideRole, "LISA_ESSA_PRODUCT_GUIDE");
pass("P Lisa Product Guide uses same Product Knowledge");

assert.match(workspaceCss, /@media \(max-width: 820px\)/);
assert.match(workspaceCss, /product-card-grid/);
assert.match(workspaceCss, /grid-template-columns: 1fr/);
assert.ok(workspaceHtml.includes("product-discovery-panel"));
assert.ok(workspaceApp.includes("renderProductDiscoveryShell"));
pass("Q Responsive product card behavior is defined");

const uiState = buildProductDiscoveryUiState();
assert.equal(uiState.providerCalls, 0);
assert.equal(uiState.externalCalls, 0);
assert.equal(uiState.overview.providerCalls, 0);
pass("R No provider call recorded by UI state");

assert.equal(uiState.executionEnabled, false);
assert.equal(uiState.overview.executionEnabled, false);
assert.equal(uiState.education.executionEnabled, false);
pass("S No execution recorded by UI state");

const bookCoverNode = productKnowledgeNodes.find((node) => node.capabilityId === "BOOK_COVER");
const originalAvailability = bookCoverNode.availabilityState;
bookCoverNode.availabilityState = capabilityActivationStates.readyForPayment;
try {
  const propagated = createCapabilityCardViewModel({
    capabilityId: "BOOK_COVER",
    productId: productIds.publishing
  });
  assert.equal(propagated.availabilityState, capabilityActivationStates.readyForPayment);
  assert.equal(propagated.availabilityLabel, "НУЖНА ОПЛАТА ПРОВАЙДЕРА");
  pass("T Source-of-truth state change propagates to UI");
} finally {
  bookCoverNode.availabilityState = originalAvailability;
}

const productDetail = buildProductDetailViewModel(productIds.developer);
assert.ok(productDetail.capabilities.some((card) => card.capabilityId === "WEBSITE_GENERATE"));
assert.ok(productDetail.availabilitySummary.totalCapabilities > 0);

const capabilityDetail = buildCapabilityDetailViewModel("BOOK_COVER", productIds.publishing);
assert.equal(capabilityDetail.card.capabilityId, "BOOK_COVER");

const localFilter = filterCapabilityCards(productDetail.capabilities, {
  availabilityState: capabilityActivationStates.localReady
});
assert.ok(Array.isArray(localFilter));

const summary = createProductAvailabilitySummary(productIds.production);
assert.ok(summary.totalCapabilities > 0);

console.log("Product Discovery UI tests passed.");
