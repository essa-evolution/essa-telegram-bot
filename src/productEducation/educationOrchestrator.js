import { productIds } from "../capabilities/productCapabilityMap.js";
import { createProductContentIntentFromEducation } from "../capabilities/productKnowledge.js";
import { createProductEducationAuditArtifact } from "./educationOrchestratorAudit.js";
import { buildChannelEducationBriefs, educationChannels } from "./channelBriefBuilder.js";
import { generateContentAngles } from "./contentAngleGenerator.js";
import { planCapabilityDemo } from "./demoPlanner.js";
import { buildProductEducationStrategy, createEducationRequest } from "./educationStrategy.js";
import {
  buildBoundedProductEducationContext,
  createBookPublishingJourneyPlan,
  createCampaignEducationBriefCandidate,
  createCreatorBriefCandidate,
  createOrganicGrowthPlan,
  createProductEducationCalendarItem,
  createRestaurantOwnerCrossProductJourneyPlan
} from "./growthKnowledgeBridge.js";

export function orchestrateProductEducation(input = {}) {
  const request = createEducationRequest(input);
  const strategy = buildProductEducationStrategy(request);
  const angles = generateContentAngles({
    productId: request.productId,
    capabilityId: request.capabilityId,
    audience: request.audience,
    maxAngles: request.maxContentAngles,
    traceId: request.traceId
  });
  const demoPlan = request.demoRequested
    ? planCapabilityDemo({
      productId: request.productId,
      capabilityId: request.capabilityId,
      userScenario: request.userNeed
    })
    : null;
  const channelTargets = request.channelTargets.length ? request.channelTargets : Object.values(educationChannels);
  const channelBriefs = buildChannelEducationBriefs({
    strategy,
    angles,
    demoPlan,
    channels: channelTargets,
    audience: request.audience
  });
  const creatorBriefCandidates = channelBriefs.map(createCreatorBriefCandidate);
  const advertisingBriefCandidate = createCampaignEducationBriefCandidate(strategy);
  const organicGrowthPlan = createOrganicGrowthPlan({ strategy, angles, channels: channelTargets });
  const calendarItems = angles.map((angle) => createProductEducationCalendarItem({ angle, channel: channelTargets[0] }));
  const boundedEducationContext = buildBoundedProductEducationContext({
    strategy,
    angle: angles[0],
    demoPlan,
    channelBrief: channelBriefs[0]
  });
  const auditArtifact = createProductEducationAuditArtifact({
    strategy,
    angles,
    channelBriefs,
    demoPlan
  });

  return {
    request,
    strategy,
    angles,
    demoPlan,
    channelBriefs,
    creatorBriefCandidates,
    advertisingBriefCandidate,
    organicGrowthPlan,
    calendarItems,
    productContentIntentFuture: createProductContentIntentFromEducation("education_book_cover_angles") || null,
    journeys: [
      createBookPublishingJourneyPlan(),
      createRestaurantOwnerCrossProductJourneyPlan()
    ],
    boundedEducationContext,
    auditArtifact,
    providerCalls: 0,
    contentPublishingPerformed: false,
    executionPerformed: false
  };
}

export function createProductionEducationFixture() {
  return orchestrateProductEducation({
    productId: productIds.production,
    capabilityId: "VIDEO_EDIT",
    audience: "CREATOR",
    userNeed: "Хочу сделать Reels из исходного видео.",
    channelTargets: [educationChannels.reels, educationChannels.inApp],
    maxContentAngles: 3,
    demoRequested: true
  });
}

export function createMusicFactoryEducationFixture() {
  return orchestrateProductEducation({
    productId: productIds.musicFactory,
    capabilityId: "VOCAL_REPLACE",
    audience: "MUSIC_CREATOR",
    userNeed: "Хочу перепеть песню своим голосом.",
    channelTargets: [educationChannels.telegram, educationChannels.website],
    maxContentAngles: 3,
    demoRequested: true
  });
}
