import assert from "node:assert/strict";
import {
  buildBoundedPropertyContext,
  buildPropertyPassportViewModel,
  classifyPropertyReadOnlyIntent,
  createLisaPropertyPassportExplanation,
  propertyBadgeLabels,
  propertyReadOnlyIntentTypes,
  propertyRiskExplanations,
  renderPropertyPassportSurface,
  unavailablePropertyFeatureExplanations
} from "../src/property/index.js";
import { buildContextPack } from "../src/navigator/contextEngine.js";
import {
  buildNavigatorProductDiscoveryResponse
} from "../src/navigator/productKnowledgeBridge.js";
import { productIds, productKnowledgeNodes } from "../src/capabilities/index.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const viewModel = buildPropertyPassportViewModel();

check(
  viewModel.viewModelType === "PropertyPassportViewModel" &&
    viewModel.identitySection.propertyId === "prop_ge_batumi_sea_view_a_1204" &&
    viewModel.locationSection.city === "Batumi" &&
    viewModel.hierarchySection.project === "Batumi Sea View Residence",
  "A PropertyPassportViewModel exposes human sections",
  {
    identity: viewModel.identitySection,
    location: viewModel.locationSection,
    hierarchy: viewModel.hierarchySection
  }
);

check(
  viewModel.verificationSection.verifiedFacts.some((fact) => fact.label === "LOCATION" && fact.badge.label === propertyBadgeLabels.VERIFIED.label) &&
    viewModel.verificationSection.verifiedFacts.some((fact) => fact.label === "UNIT_AREA_SQM"),
  "B verified fact rendering uses verified badge",
  viewModel.verificationSection.verifiedFacts
);

check(
  viewModel.verificationSection.inferredFacts.some((fact) => fact.label === "SEA_VIEW" && fact.badge.label === propertyBadgeLabels.INFERRED.label),
  "C inferred fact rendering uses inferred badge",
  viewModel.verificationSection.inferredFacts
);

check(
  viewModel.freshnessSection.badge.label === propertyBadgeLabels.STALE.label &&
    viewModel.marketSection.staleListingCount === 1 &&
    viewModel.freshnessSection.staleReason.includes("stale"),
  "D stale badge rendering is visible",
  viewModel.freshnessSection
);

check(
  viewModel.verificationSection.unverifiedFacts.some((fact) =>
    fact.label === "OWNERSHIP_STATUS" &&
      fact.badge.label === propertyBadgeLabels.UNVERIFIED.label
  ) &&
    viewModel.documentsSection.rows.some((row) => row.documentType === "ownership_evidence" && row.badge.label === propertyBadgeLabels.MISSING.label),
  "E missing/unverified state is represented without inventing data",
  {
    unverifiedFacts: viewModel.verificationSection.unverifiedFacts,
    documents: viewModel.documentsSection.rows
  }
);

check(
  viewModel.sourcesSection.rows.length >= 3 &&
    viewModel.sourcesSection.rows.every((row) => row.source && row.observedAt && row.freshnessStatus && row.confidence && row.verificationStatus),
  "F source lineage presentation includes source, observedAt, freshness, confidence, verification",
  viewModel.sourcesSection.rows
);

check(
  viewModel.risksSection.rows.some((row) =>
    row.flag === "OWNERSHIP_NOT_VERIFIED" &&
      row.explanation === propertyRiskExplanations.OWNERSHIP_NOT_VERIFIED &&
      row.legalConclusion === false
  ) &&
    viewModel.risksSection.rows.some((row) => row.flag === "STALE_LISTING_DATA"),
  "G risk explanation is human-readable and not a legal conclusion",
  viewModel.risksSection.rows
);

check(
  viewModel.lisaExplanationSection.roleId === "LISA_ESSA_PRODUCT_GUIDE" &&
    viewModel.lisaExplanationSection.mayMutateCharacterCore === false &&
    viewModel.lisaExplanationSection.text.includes("Право собственности ESSA пока не проверяла") &&
    viewModel.lisaExplanationSection.text.includes("Live search"),
  "H Lisa explanation is truthful and bounded",
  viewModel.lisaExplanationSection
);

const propertyContext = buildBoundedPropertyContext({ query: "Какие данные проверены?" });
const lisa = createLisaPropertyPassportExplanation(propertyContext);
check(
  propertyContext.viewModel.viewModelType === "PropertyPassportViewModel" &&
    propertyContext.readOnlyIntent === propertyReadOnlyIntentTypes.verifiedData &&
    propertyContext.boundedContextMetadata.selectedCount <= 4 &&
    lisa.humanExplanation.includes("подтверждены"),
  "I Navigator bounded Property Passport context carries view model to Lisa",
  {
    intent: propertyContext.readOnlyIntent,
    bounded: propertyContext.boundedContextMetadata,
    lisa
  }
);

const blocked = buildBoundedPropertyContext({ query: "Купить эту квартиру и оплатить" });
check(
  blocked.status === "NOT_ACTIVE" &&
    blocked.readOnlyIntent === propertyReadOnlyIntentTypes.futureCapability &&
    blocked.blockedLiveActions.includes("pay") &&
    blocked.liveActionsEnabled === false,
  "J unavailable live feature intents remain unavailable",
  {
    status: blocked.status,
    intent: blocked.readOnlyIntent,
    blockedLiveActions: blocked.blockedLiveActions
  }
);

check(
  classifyPropertyReadOnlyIntent("Откуда эта информация?") === propertyReadOnlyIntentTypes.sources &&
    classifyPropertyReadOnlyIntent("Почему объект помечен stale?") === propertyReadOnlyIntentTypes.staleReason &&
    classifyPropertyReadOnlyIntent("Забронировать") === propertyReadOnlyIntentTypes.futureCapability,
  "K first read-only and future-only user intents classify correctly"
);

const navigatorDiscovery = buildNavigatorProductDiscoveryResponse({
  query: "Что известно об этой квартире?"
});
const productNode = productKnowledgeNodes.find((node) => node.nodeId === "property_local_passport_preview");
check(
  navigatorDiscovery.matchedProducts[0]?.productId === productIds.property &&
    navigatorDiscovery.matchedCapabilities[0]?.capabilityId === "PROPERTY_ANALYZE" &&
    productNode.limitations.some((item) => item.includes("live listing imports")) &&
    productNode.plainLanguageDescription.includes("source/freshness badges"),
  "L Product Knowledge reflects Phase 22B available-now and not-active split",
  {
    navigatorDiscovery: {
      products: navigatorDiscovery.matchedProducts,
      capabilities: navigatorDiscovery.matchedCapabilities,
      providerCalls: navigatorDiscovery.providerCalls
    },
    productNode
  }
);

const contextPack = await buildContextPack({ userText: "Есть ли риски по квартире в Батуми?" });
check(
  contextPack.propertyContext?.viewModel?.risksSection?.rows?.length > 0 &&
    contextPack.contextSources.includes("property_passport") &&
    contextPack.propertyContext.externalCalls === 0,
  "M Navigator context includes read-only Property surface without repository ownership",
  {
    contextSources: contextPack.contextSources,
    propertyContext: contextPack.propertyContext?.boundedContextMetadata
  }
);

const rendered = renderPropertyPassportSurface(viewModel);
check(
  rendered.includes("Observed price: 125000 USD") &&
    rendered.includes("Freshness: STALE") &&
    rendered.includes("Lisa:"),
  "N renderable local proof is human-readable text, not raw JSON",
  { rendered }
);

check(
  viewModel.limitationsSection.unavailableFeatures.some((item) =>
    item.feature === "live_listing_imports" &&
      item.explanation === unavailablePropertyFeatureExplanations.live_listing_imports
  ) &&
    viewModel.limitationsSection.unavailableFeatures.every((item) => item.status === "NOT_ACTIVE"),
  "O current limitations surface lists inactive live features",
  viewModel.limitationsSection
);

check(
  viewModel.providerCalls === 0 &&
    viewModel.externalCalls === 0 &&
    viewModel.dbMutations === 0 &&
    viewModel.payments === 0 &&
    viewModel.bookingActions === 0 &&
    viewModel.transactionActions === 0 &&
    propertyContext.providerCalls === 0 &&
    propertyContext.externalCalls === 0,
  "P provider/external/db/payment/booking/transaction counts remain zero",
  {
    viewModel: {
      providerCalls: viewModel.providerCalls,
      externalCalls: viewModel.externalCalls,
      dbMutations: viewModel.dbMutations,
      payments: viewModel.payments,
      bookingActions: viewModel.bookingActions,
      transactionActions: viewModel.transactionActions
    },
    propertyContext: {
      providerCalls: propertyContext.providerCalls,
      externalCalls: propertyContext.externalCalls,
      dbMutations: propertyContext.dbMutations,
      payments: propertyContext.payments
    }
  }
);

assert.equal(failures, 0);
console.log("Property Passport ViewModel tests passed.");
