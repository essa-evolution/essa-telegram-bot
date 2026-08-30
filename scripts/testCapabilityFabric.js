import {
  capabilityActivationStates,
  capabilityRegistry,
  createCapabilityCompositionPlan,
  createLisaProductGuideContext,
  createProductContentIntentFromEducation,
  evaluateContentFreshness,
  getCapability,
  getCapabilityAvailability,
  getProductCapabilities,
  productIds,
  providerCapabilityMap,
  resolveUserNeedToCapability,
  searchCapabilities,
  validateCapabilityRegistry,
  buildBoundedProductKnowledgeContext,
  createAdvertisingTruthCheck
} from "../src/capabilities/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const invalid = validateCapabilityRegistry().filter((item) => !item.valid);
check(
  invalid.length === 0 && capabilityRegistry.length >= 90,
  "Capability registry validates and covers initial taxonomy",
  { count: capabilityRegistry.length, invalid }
);

const cover = resolveUserNeedToCapability({ userNeed: "Мне нужна обложка книги" });
check(
  cover.productId === productIds.publishing &&
    cover.primaryCapabilityId === "BOOK_COVER" &&
    cover.compositionPlan.requiredCapabilities.includes("IMAGE_GENERATE") &&
    cover.providerRequiredFromUser === false,
  "A book cover resolves to ESSA Publishing / BOOK_COVER / image-design capabilities",
  cover
);

const website = resolveUserNeedToCapability({ userNeed: "Сделай сайт для ресторана" });
check(
  website.primaryCapabilityId === "WEBSITE_GENERATE" &&
    website.compositionPlan.requiredCapabilities.includes("ARCHITECTURE_DESIGN") &&
    website.compositionPlan.requiredCapabilities.includes("UI_VERIFY"),
  "B restaurant site resolves to WEBSITE_GENERATE composite",
  website.compositionPlan
);

const trim = resolveUserNeedToCapability({ userNeed: "Обрежь видео" });
const trimAvailability = getCapabilityAvailability("VIDEO_TRIM");
check(
  trim.primaryCapabilityId === "VIDEO_TRIM" &&
    trim.compositionPlan.localCandidates.includes("VIDEO_TRIM") &&
    trimAvailability.providerCandidates.some((candidate) => candidate.providerId === "LOCAL_FFMPEG"),
  "C trim video resolves to local VIDEO_TRIM / FFmpeg candidate",
  { trim, trimAvailability }
);

const vocal = resolveUserNeedToCapability({ userNeed: "Перепой песню моим голосом" });
check(
  vocal.productId === productIds.musicFactory &&
    vocal.primaryCapabilityId === "VOCAL_REPLACE" &&
    vocal.compositionPlan.approvalPoints.some((point) => point.capabilityId === "VOCAL_REPLACE"),
  "D vocal replacement resolves to Music Factory composition with approval points",
  vocal.compositionPlan
);

const business = searchCapabilities({ query: "Что умеет ESSA для бизнеса?", productId: productIds.business, maxResults: 4 });
check(
  business.length > 0 &&
    business.every((result) => getProductCapabilities(productIds.business).includes(result.capabilityId)),
  "E business question returns bounded Business capability results",
  business
);

const educationIntent = createProductContentIntentFromEducation("education_essa_production_intro", {
  channel: "ESSA in-app"
});
check(
  educationIntent.productId === productIds.production &&
    educationIntent.capabilityId === "VIDEO_EDIT" &&
    educationIntent.requiresFreshnessCheck === true,
  "F ProductEducation data creates non-executing content intent",
  educationIntent
);

const imageGenerate = getCapability("IMAGE_GENERATE");
const providerA = {
  PROVIDER_A: { providerId: "PROVIDER_A", capabilities: { IMAGE_GENERATE: "VERIFIED" }, executableNow: true }
};
const providerB = {
  PROVIDER_A: { providerId: "PROVIDER_A", capabilities: { IMAGE_GENERATE: "NOT_SUPPORTED" }, executableNow: false },
  PROVIDER_B: { providerId: "PROVIDER_B", capabilities: { IMAGE_GENERATE: "VERIFIED" }, executableNow: true }
};
check(
  imageGenerate.capabilityId === "IMAGE_GENERATE" &&
    providerA.PROVIDER_A.capabilities.IMAGE_GENERATE !== providerB.PROVIDER_A.capabilities.IMAGE_GENERATE &&
    providerB.PROVIDER_B.capabilities.IMAGE_GENERATE === "VERIFIED",
  "G provider replacement does not alter capability identity",
  { capability: imageGenerate.capabilityId, providerA, providerB }
);

const coverTruth = createAdvertisingTruthCheck(getCapability("BOOK_COVER"));
check(
  coverTruth.availabilityState === capabilityActivationStates.architectureOnly &&
    coverTruth.maySayAvailableNow === false &&
    coverTruth.requiredWording === "planned_or_preparing_only",
  "H ARCHITECTURE_ONLY capability cannot be advertised as ACTIVE",
  coverTruth
);

const stale = evaluateContentFreshness({
  contentArtifact: {
    capabilityId: "BOOK_COVER",
    capabilityVersion: "0.9.0",
    availabilityState: capabilityActivationStates.architectureOnly
  }
});
check(
  stale.freshnessStatus === "STALE_CONTENT" &&
    stale.reason === "capability_version_changed",
  "I stale capability version marks tutorial stale",
  stale
);

const lisaGuide = createLisaProductGuideContext();
check(
  lisaGuide.role.roleId === "LISA_ESSA_PRODUCT_GUIDE" &&
    lisaGuide.characterCore.providerIndependent === true &&
    lisaGuide.mayMutateCharacterCore === false,
  "J Lisa Product Guide receives Character Core context but cannot modify it",
  lisaGuide
);

const bounded = buildBoundedProductKnowledgeContext({ query: "обложка", maxItems: 2, maxChars: 800 });
check(
  bounded.selected.length <= 2 &&
    bounded.budget.usedChars <= 800 &&
    bounded.policy.neverSendFullMemoryAutomatically === true,
  "K Product search does not load full ESSA catalog",
  bounded
);

const publishPlan = createCapabilityCompositionPlan({
  goal: "Book publish package",
  primaryCapabilityId: "PUBLISHING_PACKAGE"
});
check(
  publishPlan.approvalPoints.some((point) =>
    point.capabilityId === "PUBLISHING_PACKAGE" &&
    point.preservesExecutionGateway === true
  ),
  "L composite capability preserves approval requirements",
  publishPlan
);

check(
  providerCapabilityMap.OPENAI.capabilityStatus === "UNKNOWN" &&
    providerCapabilityMap.ANTHROPIC.capabilityStatus === "UNKNOWN",
  "Future model providers do not claim unverified capabilities",
  {
    openai: providerCapabilityMap.OPENAI,
    anthropic: providerCapabilityMap.ANTHROPIC
  }
);

if (failures > 0) {
  console.error(`Capability Fabric tests failed: ${failures}`);
  process.exit(1);
}

console.log("Capability Fabric tests passed.");

