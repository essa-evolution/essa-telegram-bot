import {
  buildNavigatorProductDiscoveryResponse,
  createNavigatorProductKnowledgeBridge,
  createProductDiscoveryIntent,
  isProductDiscoveryQuery,
  productDiscoveryIntentTypes
} from "../src/navigator/productKnowledgeBridge.js";
import { buildContextPack } from "../src/navigator/contextEngine.js";
import { orchestrateNavigatorRequest } from "../src/navigator/navigatorOrchestrator.js";
import { capabilityActivationStates, createEssaCapability, productIds } from "../src/capabilities/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const broad = buildNavigatorProductDiscoveryResponse({ query: "Что умеет ESSA?", maxResults: 6 });
check(
  broad.matchedProducts.length > 1 &&
    broad.matchedCapabilities.length === 0 &&
    broad.boundedContextMetadata.selectedCount <= 6 &&
    broad.boundedContextMetadata.totalCapabilityCount >= 90,
  "A broad catalog returns product overview without 100-capability dump",
  broad.boundedContextMetadata
);

const books = buildNavigatorProductDiscoveryResponse({ query: "Что у вас есть для книги?", maxResults: 7 });
check(
  books.matchedProducts.some((item) => [productIds.publishing, productIds.books].includes(item.productId)) &&
    books.matchedCapabilities.some((item) => ["BOOK_STRUCTURE", "BOOK_COVER"].includes(item.capabilityId)) &&
    !books.matchedProducts.some((item) => item.productId === productIds.property),
  "B book query returns Publishing/Books bounded results",
  { products: books.matchedProducts, capabilities: books.matchedCapabilities }
);

const cover = buildNavigatorProductDiscoveryResponse({ query: "Мне нужна обложка книги." });
check(
  cover.matchedCapabilities[0]?.capabilityId === "BOOK_COVER" &&
    cover.relatedCapabilities.includes("IMAGE_GENERATE"),
  "C book cover resolves to BOOK_COVER",
  cover
);

const site = buildNavigatorProductDiscoveryResponse({ query: "Мне нужен сайт для ресторана." });
check(
  site.matchedCapabilities[0]?.capabilityId === "WEBSITE_GENERATE" &&
    site.compositionPlan.requiredCapabilities.includes("UI_VERIFY"),
  "D restaurant website resolves to WEBSITE_GENERATE",
  site.compositionPlan
);

const reel = buildNavigatorProductDiscoveryResponse({ query: "Я хочу сделать ролик." });
check(
  reel.matchedProducts[0]?.productId === productIds.production &&
    reel.matchedCapabilities.some((item) => item.capabilityId.startsWith("VIDEO_")),
  "E reel request resolves to Production/video capabilities",
  { products: reel.matchedProducts, capabilities: reel.matchedCapabilities }
);

const vocal = buildNavigatorProductDiscoveryResponse({ query: "Хочу заменить вокал своим голосом." });
check(
  vocal.matchedProducts[0]?.productId === productIds.musicFactory &&
    vocal.matchedCapabilities[0]?.capabilityId === "VOCAL_REPLACE" &&
    vocal.compositionPlan.approvalPoints.length > 0,
  "F vocal replacement resolves to Music Factory / VOCAL_REPLACE",
  vocal.compositionPlan
);

const business = buildNavigatorProductDiscoveryResponse({ query: "Что ESSA может для бизнеса?" });
check(
  business.matchedProducts[0]?.productId === productIds.business &&
    business.matchedCapabilities.every((item) => item.capabilityId.startsWith("BUSINESS_") || item.capabilityId === "MARKETING_PLAN"),
  "G business query returns bounded Business results",
  business.matchedCapabilities
);

const availability = buildNavigatorProductDiscoveryResponse({ query: "Можно ли это сделать сейчас?", requestedCapability: "VIDEO_TRIM" });
check(
  availability.availabilitySummary[0]?.availabilityState === capabilityActivationStates.localReady &&
    availability.availabilitySummary[0]?.maySayAvailableNow === true,
  "H availability-aware response data distinguishes local-ready",
  availability.availabilitySummary
);

check(
  cover.availabilitySummary[0]?.availabilityState === capabilityActivationStates.architectureOnly &&
    cover.availabilitySummary[0]?.maySayAvailableNow === false,
  "I ARCHITECTURE_ONLY capability does not claim active",
  cover.availabilitySummary
);

const paymentRegistry = [
  createEssaCapability({
    capabilityId: "BOOK_COVER",
    canonicalName: "BOOK_COVER",
    category: "document_publishing",
    activationState: capabilityActivationStates.readyForPayment,
    requiredSubCapabilities: ["IMAGE_GENERATE"],
    version: "1.0.0"
  }),
  createEssaCapability({
    capabilityId: "IMAGE_GENERATE",
    canonicalName: "IMAGE_GENERATE",
    category: "image",
    activationState: capabilityActivationStates.readyForPayment
  })
];
const payment = createNavigatorProductKnowledgeBridge({ registry: paymentRegistry }).discover({
  query: "Можно ли здесь сделать обложку?",
  requestedCapability: "BOOK_COVER"
});
check(
  payment.availabilitySummary[0]?.availabilityState === capabilityActivationStates.readyForPayment &&
    payment.activationRequirements.some((item) => item.requirement === "provider_payment_activation_required"),
  "J READY_FOR_PAYMENT discloses activation requirement",
  payment.activationRequirements
);

const replacement = createNavigatorProductKnowledgeBridge().providerReplacementProbe("IMAGE_GENERATE");
check(
  replacement.productVocabularyStable === true &&
    replacement.before.capabilityId === replacement.after.capabilityId,
  "K provider replacement preserves Navigator capability identity",
  replacement
);

const stale = createNavigatorProductKnowledgeBridge({ sourceVersionOverride: "0.0.1" }).discover({
  query: "Мне нужна обложка книги."
});
check(
  stale.freshnessStatus === "KNOWLEDGE_REFRESH_REQUIRED",
  "L stale ProductKnowledge returns KNOWLEDGE_REFRESH_REQUIRED",
  { freshnessStatus: stale.freshnessStatus }
);

const executionRequest = buildNavigatorProductDiscoveryResponse({ query: "Сделай мне сайт." });
check(
  executionRequest.matchedCapabilities[0]?.capabilityId === "WEBSITE_GENERATE" &&
    executionRequest.audit.executionRequested === true &&
    executionRequest.executionPerformed === false,
  "M execution request discovers capability but executionPerformed=false",
  executionRequest.audit
);

const synonymIntent = createProductDiscoveryIntent({ query: "перепеть моим голосом" });
check(
  synonymIntent.requestedCapability === "VOCAL_REPLACE" &&
    synonymIntent.requestedProduct === productIds.musicFactory,
  "N Russian synonym resolves to English capability ID",
  synonymIntent
);

const contextPack = await buildContextPack({ userText: "Мне нужна обложка книги." });
check(
  contextPack.productDiscovery?.boundedContextMetadata?.selectedCount < contextPack.productDiscovery?.boundedContextMetadata?.totalCapabilityCount &&
    contextPack.contextSources.includes("product_knowledge"),
  "O Product search is bounded in Navigator context",
  contextPack.productDiscovery?.boundedContextMetadata
);

const orchestrated = await orchestrateNavigatorRequest({ userText: "Мне нужна обложка книги." });
const lisaBridge = createNavigatorProductKnowledgeBridge();
const lisaContext = lisaBridge.lisaProductGuideContext();
check(
  orchestrated.debugTrace.productDiscovery?.matchedCapabilities[0]?.capabilityId === "BOOK_COVER" &&
    lisaContext.role.roleId === "LISA_ESSA_PRODUCT_GUIDE" &&
    lisaContext.mayMutateCharacterCore === false,
  "P Lisa Product Guide receives same source-of-truth context as Navigator",
  {
    navigator: orchestrated.debugTrace.productDiscovery,
    lisa: lisaContext.role
  }
);

check(
  isProductDiscoveryQuery("Что ты умеешь?") === true &&
    createProductDiscoveryIntent({ query: "Что ты умеешь?" }).intentType === productDiscoveryIntentTypes.generalCapabilityDiscovery,
  "Product discovery intent recognizes self-knowledge questions"
);

if (failures > 0) {
  console.error(`Navigator Product Knowledge tests failed: ${failures}`);
  process.exit(1);
}

console.log("Navigator Product Knowledge tests passed.");

