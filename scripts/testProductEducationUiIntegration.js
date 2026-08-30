import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildProductDiscoveryUiState,
  buildProductEducationUiViewModel,
  capabilityActivationStates,
  createProductEducationUiProviderReplacementProbe,
  productIds,
  productKnowledgeNodes
} from "../src/capabilities/index.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const workspaceApp = fs.readFileSync("workspace/app.js", "utf8");
const workspaceCss = fs.readFileSync("workspace/styles.css", "utf8");

const discovery = buildProductDiscoveryUiState({ maxProducts: 8 });
assert.equal(discovery.executionEnabled, false);
assert.ok(discovery.overview.products.length <= 8);
assert.ok(discovery.overview.debug.totalCapabilityCount >= 100);
pass("A Broad ESSA discovery remains bounded", {
  products: discovery.overview.products.length,
  totalCapabilityCount: discovery.overview.debug.totalCapabilityCount
});

const book = buildProductEducationUiViewModel({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  audience: "AUTHOR",
  maxContentAngles: 5
});
assert.equal(book.capabilityId, "BOOK_COVER");
assert.equal(book.availability, capabilityActivationStates.architectureOnly);
assert.equal(book.ctaPolicy.CTAType, "COMING_SOON");
assert.equal(book.executionEnabled, false);
pass("B BOOK_COVER education UI", {
  title: book.title,
  angles: book.contentAngles.map((angle) => angle.hookConcept)
});

const website = buildProductEducationUiViewModel({
  productId: productIds.developer,
  capabilityId: "WEBSITE_GENERATE",
  audience: "BUSINESS_OWNER",
  maxContentAngles: 5
});
assert.equal(website.capabilityId, "WEBSITE_GENERATE");
assert.ok(website.contentAngles.some((angle) => /сайт|Browser/i.test(angle.hookConcept)));
pass("C WEBSITE_GENERATE education UI");

const production = buildProductEducationUiViewModel({
  productId: productIds.production,
  capabilityId: "VIDEO_EDIT",
  audience: "CREATOR",
  maxContentAngles: 3
});
assert.equal(production.productId, productIds.production);
assert.equal(production.demoPlan.executionEnabled, false);
pass("D Production/Reels education", {
  demoStatus: production.demoPlan.demoStatus
});

const music = buildProductEducationUiViewModel({
  productId: productIds.musicFactory,
  capabilityId: "VOCAL_REPLACE",
  audience: "MUSIC_CREATOR",
  maxContentAngles: 3
});
assert.equal(music.availability, capabilityActivationStates.architectureOnly);
assert.ok(music.limitations.join(" ").match(/rights|Execution|approval|актив/i));
pass("E VOCAL_REPLACE / Music Factory education");

assert.equal(book.lisaGuide.roleId, "LISA_ESSA_PRODUCT_GUIDE");
assert.equal(book.lisaGuide.characterCoreMutable, false);
assert.equal(book.lisaGuide.marketerReplacementAllowed, false);
pass("F Lisa guide", book.lisaGuide);

assert.ok(book.contentAngles.length >= 3 && book.contentAngles.length <= 5);
assert.ok(book.contentAngleTotalAvailable >= book.contentAngles.length);
pass("G 3-5 bounded content angles", {
  selected: book.contentAngles.length,
  total: book.contentAngleTotalAvailable
});

assert.equal(book.demoPlan.demoStatus, "PLANNED_DEMO_NOT_EXECUTABLE");
assert.equal(book.demoExecutionEnabled, false);
assert.equal(book.demoPlan.executionEnabled, false);
pass("H Demo planned but not executable");

const active = buildProductEducationUiViewModel({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  availabilityOverride: capabilityActivationStates.active
});
assert.equal(active.availability, capabilityActivationStates.active);
assert.equal(active.ctaPolicy.CTAType, "TRY");
pass("I ACTIVE state");

const localReady = buildProductEducationUiViewModel({
  productId: productIds.production,
  capabilityId: "VIDEO_TRIM"
});
assert.equal(localReady.availability, capabilityActivationStates.localReady);
assert.equal(localReady.ctaPolicy.CTAType, "TRY");
pass("J LOCAL_READY state");

const payment = buildProductEducationUiViewModel({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  availabilityOverride: capabilityActivationStates.readyForPayment
});
assert.equal(payment.ctaPolicy.CTAType, "ACTIVATION_REQUIRED");
pass("K READY_FOR_PAYMENT state");

assert.equal(book.availabilityLabel, "В РАЗРАБОТКЕ");
assert.equal(book.claimPolicy.falseCurrentClaimProbe.status, "BLOCK_INVALID_EDUCATION_CLAIM");
pass("L ARCHITECTURE_ONLY state");

const stale = buildProductEducationUiViewModel({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  sourceVersionOverride: "0.0.1"
});
assert.notEqual(stale.freshnessStatus, "CURRENT");
assert.match(stale.availabilityLabel, /ОБНОВЛЕНИЕ/);
pass("M stale Product Knowledge", {
  freshnessStatus: stale.freshnessStatus,
  availabilityLabel: stale.availabilityLabel
});

assert.equal(book.claimPolicy.falseCurrentClaimProbe.status, "BLOCK_INVALID_EDUCATION_CLAIM");
pass("N false current claim blocked", book.claimPolicy.falseCurrentClaimProbe);

const providerReplacement = createProductEducationUiProviderReplacementProbe("IMAGE_GENERATE");
assert.equal(providerReplacement.userFacingMeaningStable, true);
assert.equal(providerReplacement.providerDetailsHiddenFromNormalUi, true);
pass("O provider replacement", providerReplacement);

assert.ok(book.exampleJourney.capabilitySequence.includes("PUBLISHING_PACKAGE"));
assert.equal(book.exampleJourney.executionEnabled, false);
pass("P journey preview", book.exampleJourney);

assert.ok(book.channelEducationPreview.some((channel) => channel.channel === "Reels"));
assert.equal(book.growthPreview.scriptsGenerated, false);
assert.equal(book.growthPreview.publishingScheduled, false);
pass("Q channel/growth metadata", book.channelEducationPreview);

assert.equal(book.contextEconomy.neverLoadsFullCatalog, true);
assert.ok(book.contextEconomy.selectedItems <= 6);
assert.ok(book.contextEconomy.chars <= 1400);
pass("R context economy", book.contextEconomy);

assert.equal(book.executionEnabled, false);
assert.equal(book.demoExecutionEnabled, false);
assert.equal(book.publishEnabled, false);
pass("S execution disabled");

assert.equal(book.providerCalls, 0);
assert.equal(book.externalModelCalls, 0);
pass("T provider calls = 0");

assert.equal(book.socialPublishingEnabled, false);
assert.equal(book.adLaunchEnabled, false);
assert.equal(book.creatorDispatchEnabled, false);
pass("U publish/social/ad/creator dispatch = 0");

assert.ok(workspaceApp.includes("buildProductEducationUiViewModel"));
assert.ok(workspaceApp.includes("Как этим пользоваться"));
assert.ok(workspaceApp.includes("Product Education & Growth preview"));
assert.ok(workspaceCss.includes("product-demo-preview"));
assert.ok(workspaceCss.includes("@media (max-width: 820px)"));
pass("V responsive view-model behavior");

const bookNode = productKnowledgeNodes.find((node) => node.productId === productIds.publishing && node.capabilityId === "BOOK_COVER");
const originalAvailability = bookNode.availabilityState;
bookNode.availabilityState = capabilityActivationStates.localReady;
try {
  const propagated = buildProductEducationUiViewModel({
    productId: productIds.publishing,
    capabilityId: "BOOK_COVER"
  });
  assert.equal(propagated.availability, capabilityActivationStates.localReady);
  assert.equal(propagated.ctaPolicy.CTAType, "TRY");
  pass("W Product Knowledge availability update propagates automatically", {
    availability: propagated.availability,
    CTAType: propagated.ctaPolicy.CTAType
  });
} finally {
  bookNode.availabilityState = originalAvailability;
}

assert.equal(book.lisaGuide.usesCharacterCore, true);
assert.equal(book.lisaGuide.canRewriteCharacterCore, false);
assert.equal(book.lisaGuide.characterCoreMutable, false);
pass("X Character Core remains untouched");

console.log("Product Education UI Integration tests passed.");
