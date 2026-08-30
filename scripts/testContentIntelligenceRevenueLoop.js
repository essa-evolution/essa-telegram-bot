import assert from "node:assert/strict";

import { getCapability, productKnowledgeNodes, productIds } from "../src/capabilities/index.js";
import {
  attributionModels,
  compareContentEconomicEffectiveness,
  contentGoalTypes,
  contentOperationModes,
  contentProductionModes,
  conversionEventTypes,
  createAttributionRecord,
  createCampaignIntelligenceReport,
  createContentAsset,
  createContentEconomicsRecord,
  createContentExperiment,
  createContentLearningObservation,
  createConversionEvent,
  createFacelessChannelFactoryCapability,
  createGoalAwareSuccessPolicy,
  createOfferReference,
  createPlatformMetricsAdapter,
  createViralPatternObservation,
  dataCompletenessStates,
  learningEvidenceStates,
  metricAvailabilityStates,
  revenueEvidenceTypes,
  sourceOfTruthOwnership
} from "../src/contentIntelligence/index.js";
import { createViewsVsRevenueFixture } from "../src/contentIntelligence/fixtures.js";

function pass(label, details = null) {
  console.log(`PASS ${label}`);
  if (details) console.log(JSON.stringify(details, null, 2));
}

const fixture = createViewsVsRevenueFixture();
const [highViewAsset, lowerViewAsset] = fixture.assets;
const [highViewEconomics, lowerViewEconomics] = fixture.economics;

assert.equal(lowerViewAsset.lineage.parentContentAssetId, highViewAsset.contentAssetId);
assert.equal(lowerViewAsset.lineage.rootContentAssetId, highViewAsset.contentAssetId);
pass("A ContentAsset lineage", lowerViewAsset.lineage);

assert.equal(lowerViewAsset.campaignId, "campaign_product_education");
assert.equal(lowerViewAsset.offerId, "offer_essa_business_future");
const offer = createOfferReference({
  offerId: lowerViewAsset.offerId,
  businessId: "business_essa",
  productOrServiceRef: "ESSA_BUSINESS",
  audience: "business owners",
  promise: "understand content that brings clients",
  cta: "book_call_future",
  funnelRef: lowerViewAsset.funnelId
});
assert.equal(offer.sourceOfTruth, "ESSA_BUSINESS");
pass("B campaign/offer linkage", { campaignId: lowerViewAsset.campaignId, offer });

const viewsMetric = fixture.attention[0].find((metric) => metric.metricKey === "views");
const watchTimeMetric = fixture.attention[0].find((metric) => metric.metricKey === "watchTime");
assert.equal(viewsMetric.availability, metricAvailabilityStates.available);
assert.equal(watchTimeMetric.availability, metricAvailabilityStates.unknown);
pass("C attention metrics", { viewsMetric, watchTimeMetric });

assert.equal(fixture.conversions[0].eventType, conversionEventTypes.purchase);
assert.equal(fixture.conversions[0].privacy.rawUserTrackingEnabled, false);
pass("D conversion events", fixture.conversions[0]);

assert.equal(fixture.attributions[0].attributionModel, attributionModels.lastTouch);
assert.equal(fixture.attributions[0].exactAttributionClaimed, false);
pass("E attribution", fixture.attributions[0]);

assert.equal(fixture.attributions[0].revenueEvidenceType, revenueEvidenceTypes.attributed);
assert.equal(createAttributionRecord({}).revenueEvidenceType, revenueEvidenceTypes.unknown);
pass("F revenue distinction");

assert.equal(lowerViewEconomics.totalCost, 200);
assert.ok(lowerViewEconomics.roi > highViewEconomics.roi);
assert.equal(lowerViewEconomics.fabricatedMetrics, false);
pass("G cost metrics", { highViewEconomics, lowerViewEconomics });

assert.equal(createGoalAwareSuccessPolicy(contentGoalTypes.awareness).revenueRequired, false);
assert.equal(createGoalAwareSuccessPolicy(contentGoalTypes.revenue).revenueRequired, true);
pass("H goal-aware success");

assert.equal(fixture.learning.scope.brandId, "brand_lisa");
assert.equal(fixture.learning.canRewriteLisaCharacterCore, false);
pass("I content learning scope", fixture.learning.scope);

assert.equal(fixture.insight.evidenceState, learningEvidenceStates.hypothesis);
assert.equal(fixture.insight.causationClaimAllowed, false);
const validatedInsight = createContentLearningObservation({
  evidenceState: learningEvidenceStates.validated
});
assert.equal(validatedInsight.evidenceState, learningEvidenceStates.validated);
pass("J correlation vs validated insight");

assert.equal(fixture.recommendation.autoGenerateContent, false);
assert.equal(fixture.recommendation.publishEnabled, false);
pass("K next content recommendation", fixture.recommendation);

const viral = createViralPatternObservation({
  dimensions: { HookPattern: "direct contradiction", RetentionPattern: "early payoff" },
  sourceProvenance: ["public_metadata_future"]
});
assert.equal(viral.boundary, "PATTERN_EXTRACTION");
assert.equal(viral.contentCloningAllowed, false);
pass("L viral structural pattern without cloning", viral);

assert.equal(createContentAsset({ productionMode: contentProductionModes.faceless }).productionMode, contentProductionModes.faceless);
pass("M faceless mode");

assert.equal(createContentAsset({ productionMode: contentProductionModes.humanCreator }).productionMode, contentProductionModes.humanCreator);
pass("N human mode");

assert.equal(createContentAsset({ productionMode: contentProductionModes.aiAvatar }).productionMode, contentProductionModes.aiAvatar);
pass("O AI avatar mode");

assert.equal(createContentAsset({ productionMode: contentProductionModes.hybrid }).productionMode, contentProductionModes.hybrid);
pass("P hybrid mode");

assert.equal(createContentAsset({ creatorRef: "creator_lisa" }).creatorRef, "creator_lisa");
pass("Q creator network linkage");

const campaignReport = createCampaignIntelligenceReport({
  campaignId: lowerViewAsset.campaignId,
  assets: fixture.assets,
  spend: 0,
  clicks: 1300,
  leads: 20,
  sales: 5,
  revenue: 1300,
  cost: 400
});
assert.equal(campaignReport.sourceOfTruth, "ESSA_ADVERTISING");
pass("R advertising linkage", campaignReport);

assert.equal(offer.businessId, "business_essa");
assert.ok(sourceOfTruthOwnership.business.includes("offers"));
pass("S business linkage");

assert.ok(sourceOfTruthOwnership.transaction.includes("transaction truth"));
assert.equal(fixture.auditArtifact.transactionMutations, 0);
pass("T transaction ownership");

const incompleteEconomics = createContentEconomicsRecord({ contentAssetId: "missing_revenue", views: 10 });
assert.equal(incompleteEconomics.completeness, dataCompletenessStates.partial);
assert.equal(incompleteEconomics.roi, null);
pass("U incomplete-data handling", incompleteEconomics);

assert.equal(fixture.conversions[0].privacy.dataMinimized, true);
assert.equal(fixture.conversions[0].privacy.consentRequiredFuture, true);
pass("V privacy boundary");

assert.equal(fixture.learning.canRewriteLisaCharacterCore, false);
pass("W Lisa Character Core cannot be rewritten by metrics");

const adapter = createPlatformMetricsAdapter({
  adapterId: "adapter_future",
  platform: "YOUTUBE_FUTURE",
  canonicalMetricMap: { viewCount: "views" },
  unsupportedMetrics: ["rewatches"]
});
assert.equal(adapter.liveApiCallsEnabled, false);
assert.equal(highViewAsset.platform, "PLATFORM_INDEPENDENT");
pass("X provider/platform independence", adapter);

assert.equal(fixture.auditArtifact.providerCalls, 0);
assert.equal(fixture.auditArtifact.externalCalls, 0);
assert.equal(highViewAsset.providerCalls + lowerViewAsset.externalCalls, 0);
pass("Y zero external/provider calls", fixture.auditArtifact);

assert.equal(fixture.auditArtifact.publishActions, 0);
assert.equal(fixture.recommendation.publishEnabled, false);
assert.equal(createFacelessChannelFactoryCapability().autonomousPublishingEnabled, false);
pass("Z no publish/execution");

const ranked = compareContentEconomicEffectiveness(fixture.economics);
assert.equal(ranked[0].contentAssetId, lowerViewAsset.contentAssetId);
assert.equal(highViewEconomics.views > lowerViewEconomics.views, true);
pass("Fixture recognizes most viewed is not most economically effective", ranked.map((item) => ({
  contentAssetId: item.contentAssetId,
  views: item.views,
  attributedRevenue: item.attributedRevenue,
  roi: item.roi
})));

const nonCommercial = createContentAsset({
  contentAssetId: "content_non_commercial",
  goal: contentGoalTypes.education,
  offerId: null
});
assert.equal(nonCommercial.offerId, null);
assert.equal(createGoalAwareSuccessPolicy(nonCommercial.goal).revenueRequired, false);
pass("Non-commercial content supported", nonCommercial);

const experiment = createContentExperiment({
  hypothesis: "Hook A will improve qualified clicks for business-owner audience.",
  variants: ["Hook A", "Hook B"],
  controlledVariables: ["audience", "format", "duration"],
  successMetric: "clicks",
  businessMetric: "qualifiedLeadsFuture"
});
assert.equal(experiment.executionEnabled, false);
pass("Experimentation contract", experiment);

const facelessFactory = createFacelessChannelFactoryCapability({ mode: "AUTONOMOUS" });
assert.equal(facelessFactory.autonomousInheritsApprovalPolicy, true);
assert.equal(facelessFactory.autonomousPublishingEnabled, false);
pass("Faceless Channel Factory", facelessFactory);

assert.equal(contentOperationModes.autonomousFuture, "AUTONOMOUS_FUTURE");
assert.ok(sourceOfTruthOwnership.production.includes("ContentAsset"));
assert.ok(sourceOfTruthOwnership.attribution.includes("mapping between touchpoints and outcomes"));
pass("Source-of-truth ownership", sourceOfTruthOwnership);

for (const capabilityId of [
  "CONTENT_ANALYZE",
  "CONTENT_PERFORMANCE_ANALYZE",
  "CONTENT_ATTRIBUTION",
  "CONTENT_ECONOMICS",
  "CONTENT_LEARN",
  "NEXT_CONTENT_RECOMMEND",
  "CAMPAIGN_INTELLIGENCE",
  "VIRAL_PATTERN_ANALYZE",
  "FACELESS_CHANNEL_BUILD",
  "CONTENT_EXPERIMENT",
  "OFFER_AWARE_CONTENT_PLAN"
]) {
  const capability = getCapability(capabilityId);
  assert.equal(capability.activationState, "ARCHITECTURE_ONLY");
}
pass("Capability Fabric content intelligence entries");

assert.ok(productKnowledgeNodes.some((node) => node.nodeId === "production_content_business_outcome"));
assert.ok(productKnowledgeNodes.some((node) => node.nodeId === "production_faceless_channel_factory"));
const contentOutcomeNode = productKnowledgeNodes.find((node) => node.nodeId === "production_content_business_outcome");
assert.equal(contentOutcomeNode.availabilityState, "ARCHITECTURE_ONLY");
assert.ok(contentOutcomeNode.limitations.some((item) => /No live analytics/i.test(item)));
assert.ok(contentOutcomeNode.limitations.some((item) => /No user tracking/i.test(item)));
pass("Product Knowledge content intelligence entries");

assert.equal(fixture.report.modelType, "ContentIntelligenceReport");
assert.equal(fixture.auditArtifact.artifactType, "ContentAnalyticsAuditArtifact");
assert.equal(fixture.auditArtifact.providerCalls, 0);
assert.equal(fixture.auditArtifact.publishActions, 0);
pass("ContentIntelligenceReport and audit artifact");

console.log("Content Intelligence Revenue Loop tests passed.");
