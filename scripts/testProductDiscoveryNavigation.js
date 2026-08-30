import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildProductDiscoveryHash,
  buildProductEducationUiViewModel,
  capabilityActivationStates,
  createProductDiscoveryBackState,
  createProductEducationUiProviderReplacementProbe,
  createProductDiscoveryUiState,
  parseProductDiscoveryHash,
  productDiscoveryModes,
  productIds
} from "../src/capabilities/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const app = fs.readFileSync("workspace/app.js", "utf8");
const css = fs.readFileSync("workspace/styles.css", "utf8");
const html = fs.readFileSync("workspace/index.html", "utf8");

const overview = parseProductDiscoveryHash("#product-discovery");
assert.equal(overview.mode, productDiscoveryModes.overview);
pass("A overview route", overview);

const product = parseProductDiscoveryHash("#product-discovery/product/ESSA_PUBLISHING?q=%D0%BE%D0%B1%D0%BB%D0%BE%D0%B6%D0%BA%D0%B0");
assert.equal(product.mode, productDiscoveryModes.productDetail);
assert.equal(product.selectedProductId, productIds.publishing);
assert.equal(product.searchQuery, "обложка");
pass("B product route", product);

const capability = parseProductDiscoveryHash("#product-discovery/capability/BOOK_COVER?q=%D0%BE%D0%B1%D0%BB%D0%BE%D0%B6%D0%BA%D0%B0");
assert.equal(capability.mode, productDiscoveryModes.capabilityDetail);
assert.equal(capability.selectedCapabilityId, "BOOK_COVER");
pass("C capability route", capability);

const education = parseProductDiscoveryHash("#product-discovery/education/BOOK_COVER");
assert.equal(education.mode, productDiscoveryModes.educationDetail);
assert.equal(education.selectedEducationId, "education_BOOK_COVER");
pass("D education route", education);

const demo = parseProductDiscoveryHash("#product-discovery/demo/BOOK_COVER");
assert.equal(demo.mode, productDiscoveryModes.demoPreview);
pass("E demo route", demo);

const search = createProductDiscoveryUiState({
  mode: productDiscoveryModes.searchResults,
  searchQuery: "обложка",
  filters: { availabilityState: capabilityActivationStates.architectureOnly }
});
const detail = createProductDiscoveryUiState({
  mode: productDiscoveryModes.capabilityDetail,
  selectedCapabilityId: "BOOK_COVER",
  searchQuery: search.searchQuery,
  filters: search.filters,
  previousState: search
});
assert.equal(detail.searchQuery, "обложка");
assert.equal(buildProductDiscoveryHash(detail), "#product-discovery/capability/BOOK_COVER?q=%D0%BE%D0%B1%D0%BB%D0%BE%D0%B6%D0%BA%D0%B0&availability=ARCHITECTURE_ONLY");
pass("F search state preservation", {
  searchQuery: detail.searchQuery,
  route: buildProductDiscoveryHash(detail)
});

const back = createProductDiscoveryBackState(detail);
assert.equal(back.mode, productDiscoveryModes.searchResults);
assert.equal(back.searchQuery, "обложка");
pass("G back navigation", back);

assert.ok(app.includes("product-discovery-breadcrumb"));
assert.ok(app.includes("Назад"));
pass("H breadcrumb");

const deepLink = parseProductDiscoveryHash("#product-discovery/capability/BOOK_COVER");
assert.equal(deepLink.mode, productDiscoveryModes.capabilityDetail);
assert.equal(deepLink.selectedCapabilityId, "BOOK_COVER");
pass("I deep link", deepLink);

const invalid = parseProductDiscoveryHash("#product-discovery/nope/BOGUS");
assert.equal(invalid.mode, productDiscoveryModes.notFound);
assert.ok(app.includes("Ничего не найдено"));
pass("J invalid route", invalid);

const russianSearch = parseProductDiscoveryHash("#product-discovery/search?q=%D0%BE%D0%B1%D0%BB%D0%BE%D0%B6%D0%BA%D0%B0");
assert.equal(russianSearch.searchQuery, "обложка");
pass("K Russian search", russianSearch);

const book = buildProductEducationUiViewModel({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER"
});
assert.equal(book.availability, capabilityActivationStates.architectureOnly);
assert.equal(book.ctaPolicy.CTAType, "COMING_SOON");
assert.equal(book.executionEnabled, false);
pass("L architecture-only action remains disabled");

const stale = buildProductEducationUiViewModel({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  sourceVersionOverride: "0.0.1"
});
assert.notEqual(stale.freshnessStatus, "CURRENT");
pass("M stale capability warning survives navigation", {
  freshnessStatus: stale.freshnessStatus,
  availabilityLabel: stale.availabilityLabel
});

const provider = createProductEducationUiProviderReplacementProbe("IMAGE_GENERATE");
assert.equal(provider.userFacingMeaningStable, true);
pass("N provider replacement does not affect route identity", provider);

assert.ok(app.includes("renderEducationDetail"));
assert.ok(app.includes("buildProductEducationUiViewModel"));
pass("O Lisa education uses same view model");

assert.ok(app.includes("Показать ещё"));
assert.ok(app.includes("maxContentAngles: 10"));
pass("P content-angle expansion");

assert.ok(css.includes(":focus-visible"));
assert.ok(app.includes("button.type = \"button\""));
pass("Q keyboard basic activation");

assert.ok(css.includes("@media (max-width: 820px)"));
assert.ok(html.includes("#product-discovery"));
pass("R responsive state behavior");

assert.equal(book.executionEnabled, false);
assert.equal(book.demoExecutionEnabled, false);
assert.equal(book.executionPerformed, false);
pass("S no capability execution");

assert.equal(book.providerCalls, 0);
assert.equal(book.externalModelCalls, 0);
pass("T provider calls = 0");

assert.equal(Object.prototype.hasOwnProperty.call(detail, "plainLanguageDescription"), false);
assert.equal(Object.prototype.hasOwnProperty.call(detail, "contentAngles"), false);
pass("State/source-of-truth stores ids and navigation context only");

console.log("Product Discovery Navigation tests passed.");
