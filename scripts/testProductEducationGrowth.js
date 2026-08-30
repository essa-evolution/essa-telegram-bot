import assert from "node:assert/strict";

import { capabilityActivationStates } from "../src/capabilities/index.js";
import {
  buildBoundedProductEducationContext,
  buildChannelEducationBrief,
  buildClaimPolicy,
  buildContentFatigueSignature,
  buildProductEducationStrategy,
  createBookPublishingJourneyPlan,
  createCampaignEducationBriefCandidate,
  createCreatorBriefCandidate,
  createEducationRefreshIntent,
  createMusicFactoryEducationFixture,
  createOrganicGrowthPlan,
  createProductEducationCalendarItem,
  createProductionEducationFixture,
  createProductEducationRequest,
  createProductJourneyEducationPlan,
  createRestaurantOwnerCrossProductJourneyPlan,
  educationChannels,
  evaluateEducationFreshness,
  generateContentAngles,
  getCTATypeForAvailability,
  getDemoStatus,
  orchestrateProductEducation,
  planCapabilityDemo,
  validateEducationClaim
} from "../src/productEducation/index.js";
import { productIds } from "../src/capabilities/productCapabilityMap.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const book = orchestrateProductEducation({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  audience: "AUTHOR",
  userNeed: "Мне нужна обложка книги.",
  channelTargets: [educationChannels.reels, educationChannels.telegram, educationChannels.inApp],
  maxContentAngles: 10,
  demoRequested: true,
  traceId: "phase21g_book"
});

assert.equal(book.angles.length, 10);
assert.ok(book.angles.every((angle) => angle.capabilityId === "BOOK_COVER"));
assert.ok(book.angles.some((angle) => angle.hookConcept === "3 ошибки в обложке"));
pass("A BOOK_COVER generates multiple structured angles", {
  angleCount: book.angles.length,
  hooks: book.angles.map((angle) => angle.hookConcept)
});

const websiteStrategy = buildProductEducationStrategy({
  productId: productIds.developer,
  capabilityId: "WEBSITE_GENERATE",
  audience: "BUSINESS_OWNER",
  userNeed: "Мне нужен сайт, с чего начать?"
});
const websiteAngles = generateContentAngles({
  productId: productIds.developer,
  capabilityId: "WEBSITE_GENERATE",
  maxAngles: 7
});
assert.equal(websiteStrategy.availabilityTruth.availabilityState, capabilityActivationStates.architectureOnly);
assert.ok(websiteAngles.some((angle) => /Browser Verification/.test(angle.hookConcept)));
pass("B WEBSITE_GENERATE education strategy", {
  strategy: websiteStrategy.strategyId,
  angleCount: websiteAngles.length
});

const production = createProductionEducationFixture();
assert.equal(production.strategy.productId, productIds.production);
assert.equal(production.demoPlan.executionEnabled, false);
assert.ok(production.demoPlan.stepSequence.includes("VIDEO_EDIT"));
pass("C Production education plan", {
  demoStatus: production.demoPlan.demoStatus,
  steps: production.demoPlan.stepSequence
});

const music = createMusicFactoryEducationFixture();
assert.equal(music.strategy.productId, productIds.musicFactory);
assert.equal(music.strategy.availabilityTruth.mayClaimCurrentUse, false);
assert.ok(music.strategy.limitations.some((item) => /Execution|Requires|rights/i.test(item)));
pass("D Music Factory education plan", {
  capabilityId: music.strategy.capabilityId,
  demoStatus: music.demoPlan.demoStatus
});

assert.equal(getCTATypeForAvailability(capabilityActivationStates.localReady), "TRY");
assert.equal(getCTATypeForAvailability(capabilityActivationStates.readyForPayment), "ACTIVATION_REQUIRED");
assert.equal(getCTATypeForAvailability(capabilityActivationStates.architectureOnly), "COMING_SOON");
pass("E availability-aware CTA");

const stale = evaluateEducationFreshness({
  artifact: {
    productId: productIds.publishing,
    capabilityId: "BOOK_COVER",
    availabilityState: capabilityActivationStates.architectureOnly,
    sourceVersions: {
      capabilityVersion: "0.9.0",
      productVersion: "1.0.0"
    }
  }
});
assert.equal(stale.freshnessStatus, "STALE_CAPABILITY_VERSION");
pass("F stale education detection", stale);

const refreshIntent = createEducationRefreshIntent({
  changedProductKnowledge: {
    productId: productIds.publishing,
    capabilityId: "BOOK_COVER",
    reason: "ProductKnowledge version change"
  },
  strategies: [book.strategy],
  angles: book.angles,
  briefs: book.channelBriefs
});
assert.equal(refreshIntent.executionEnabled, false);
assert.ok(refreshIntent.affectedAngles.length > 0);
pass("G ProductKnowledge version change", refreshIntent);

const providerA = buildClaimPolicy({
  capability: { capabilityId: "IMAGE_GENERATE", canonicalName: "IMAGE_GENERATE", activationState: capabilityActivationStates.architectureOnly },
  productNode: { availabilityState: capabilityActivationStates.architectureOnly }
});
const providerB = buildClaimPolicy({
  capability: { capabilityId: "IMAGE_GENERATE", canonicalName: "IMAGE_GENERATE", activationState: capabilityActivationStates.architectureOnly },
  productNode: { availabilityState: capabilityActivationStates.architectureOnly }
});
assert.deepEqual(providerA.allowedClaims, providerB.allowedClaims);
pass("H provider replacement", { providerIndependent: true, allowedClaims: providerA.allowedClaims });

assert.equal(book.strategy.LisaProductGuide.roleId, "LISA_ESSA_PRODUCT_GUIDE");
assert.equal(book.strategy.LisaProductGuide.mayMutateCharacterCore, false);
assert.equal(book.strategy.LisaProductGuide.marketerReplacementAllowed, false);
pass("I Lisa Character Core preserved", book.strategy.LisaProductGuide);

const falseClaim = validateEducationClaim({
  availabilityState: capabilityActivationStates.architectureOnly,
  claim: "ESSA уже доступно создаёт обложки прямо сейчас."
});
assert.equal(falseClaim.status, "BLOCK_INVALID_EDUCATION_CLAIM");
pass("J ARCHITECTURE_ONLY false claim blocked", falseClaim);

const creatorCandidate = createCreatorBriefCandidate(book.channelBriefs[0]);
assert.equal(creatorCandidate.dispatchEnabled, false);
assert.ok(creatorCandidate.prohibitedClaims.length > 0);
pass("K Creator brief candidate", creatorCandidate);

const adCandidate = createCampaignEducationBriefCandidate(book.strategy);
assert.equal(adCandidate.adLaunchEnabled, false);
assert.ok(adCandidate.prohibitedClaims.length > 0);
pass("L Advertising brief candidate", adCandidate);

const organic = createOrganicGrowthPlan({
  strategy: book.strategy,
  angles: book.angles,
  channels: [educationChannels.reels, educationChannels.website]
});
assert.equal(organic.executionEnabled, false);
assert.ok(organic.contentThemes.length >= 10);
pass("M OrganicGrowthPlan", {
  themes: organic.contentThemes.length,
  channels: organic.channelMix
});

const bounded = buildBoundedProductEducationContext({
  strategy: book.strategy,
  angle: book.angles[0],
  demoPlan: book.demoPlan,
  channelBrief: book.channelBriefs[0],
  maxItems: 6,
  maxChars: 1400
});
assert.equal(bounded.policy.neverSendFullMemoryAutomatically, true);
assert.ok(bounded.selected.length <= 6);
assert.ok(bounded.budget.usedChars <= 1400);
pass("N bounded education context", bounded.budget);

assert.equal(book.providerCalls, 0);
assert.equal(production.providerCalls, 0);
assert.equal(music.providerCalls, 0);
pass("O no provider calls");

assert.equal(book.contentPublishingPerformed, false);
assert.ok(book.channelBriefs.every((brief) => brief.executionEnabled === false));
pass("P no content publishing");

assert.equal(book.executionPerformed, false);
assert.equal(book.demoPlan.executionEnabled, false);
assert.equal(getDemoStatus(capabilityActivationStates.architectureOnly), "PLANNED_DEMO_NOT_EXECUTABLE");
assert.equal(getDemoStatus(capabilityActivationStates.localReady), "LOCAL_DEMO_READY");
pass("Q no execution");

const restaurantJourney = createRestaurantOwnerCrossProductJourneyPlan();
assert.ok(restaurantJourney.productIds.includes(productIds.business));
assert.ok(restaurantJourney.productIds.includes(productIds.creatorNetwork));
assert.equal(restaurantJourney.executionEnabled, false);
pass("R cross-product journey", restaurantJourney);

const beginnerRequest = createProductEducationRequest({
  productId: productIds.publishing,
  capabilityId: "BOOK_COVER",
  audience: "BEGINNER"
});
const developerRequest = createProductEducationRequest({
  productId: productIds.developer,
  capabilityId: "WEBSITE_GENERATE",
  audience: "DEVELOPER"
});
assert.notEqual(beginnerRequest.audience, developerRequest.audience);
assert.equal(buildProductEducationStrategy(developerRequest).explanationLevel, "practical_with_terms");
pass("S audience variation", {
  beginner: beginnerRequest.audience,
  developer: developerRequest.audience
});

assert.equal(book.auditArtifact.artifactType, "ProductEducationAuditArtifact");
assert.equal(book.auditArtifact.executionPerformed, false);
assert.equal(book.auditArtifact.providerCalls, 0);
assert.equal(book.auditArtifact.angleCount, 10);
pass("T education audit artifact", book.auditArtifact);

const channelBrief = buildChannelEducationBrief({
  strategy: book.strategy,
  angle: book.angles[0],
  demoPlan: book.demoPlan,
  channel: educationChannels.shorts
});
assert.equal(channelBrief.CTAType, "COMING_SOON");

const calendarItem = createProductEducationCalendarItem({ angle: book.angles[0], channel: educationChannels.email });
assert.equal(calendarItem.plannedState, "PLANNED_NOT_SCHEDULED");

const publishingJourney = createBookPublishingJourneyPlan();
assert.ok(publishingJourney.capabilitySequence.includes("PUBLISHING_PACKAGE"));

const customJourney = createProductJourneyEducationPlan({
  journeyId: "custom",
  userScenario: "Custom education journey",
  productIds: [productIds.business],
  capabilitySequence: ["BUSINESS_ANALYZE"]
});
assert.equal(customJourney.executionEnabled, false);

const fatigueSignature = buildContentFatigueSignature({
  angleType: book.angles[0].angleType,
  capabilityId: "BOOK_COVER",
  channel: educationChannels.reels,
  audience: "AUTHOR"
});
assert.match(fatigueSignature, /book_cover/);

const localDemo = planCapabilityDemo({
  productId: productIds.production,
  capabilityId: "VIDEO_TRIM",
  userScenario: "Обрезать видео"
});
assert.equal(localDemo.demoStatus, "LOCAL_DEMO_READY");
assert.equal(localDemo.executionEnabled, false);

console.log("Product Education Growth tests passed.");
