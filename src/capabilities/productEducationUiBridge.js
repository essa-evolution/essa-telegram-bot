import {
  buildCapabilityDetailViewModel,
  createCapabilityCardViewModel
} from "./productDiscoveryUi.js";
import { capabilityActivationStates } from "./capabilityContracts.js";
import { productIds } from "./productCapabilityMap.js";
import {
  productEducationCards,
  productKnowledgeNodes
} from "./productKnowledge.js";
import {
  buildBoundedProductEducationContext,
  buildClaimPolicy,
  createBookPublishingJourneyPlan,
  createRestaurantOwnerCrossProductJourneyPlan,
  educationChannels,
  getCTATypeForAvailability,
  orchestrateProductEducation,
  validateEducationClaim
} from "../productEducation/index.js";

export const productEducationUiContract = {
  viewType: "product_education_ui",
  executionEnabled: false,
  demoExecutionEnabled: false,
  publishEnabled: false,
  socialPublishingEnabled: false,
  adLaunchEnabled: false,
  creatorDispatchEnabled: false,
  providerCalls: 0,
  externalModelCalls: 0,
  executionPerformed: false
};

const channelLabels = {
  [educationChannels.reels]: "Reels",
  [educationChannels.tiktok]: "TikTok",
  [educationChannels.shorts]: "Shorts",
  [educationChannels.youtube]: "YouTube",
  [educationChannels.telegram]: "Telegram",
  [educationChannels.inApp]: "ESSA in-app",
  [educationChannels.website]: "Website",
  [educationChannels.email]: "Email / Newsletter"
};

function getEducationCard(capabilityId, productId) {
  return productEducationCards.find((card) => card.capabilityId === capabilityId && card.productId === productId) ||
    productEducationCards.find((card) => card.capabilityId === capabilityId) ||
    null;
}

function getKnowledgeNode(capabilityId, productId) {
  return productKnowledgeNodes.find((node) => node.capabilityId === capabilityId && node.productId === productId) ||
    productKnowledgeNodes.find((node) => node.capabilityId === capabilityId) ||
    null;
}

function getAvailabilityExplanation(state, freshnessStatus = "CURRENT") {
  if (freshnessStatus !== "CURRENT") return "Информация требует обновления перед текущим описанием.";
  if ([capabilityActivationStates.active, capabilityActivationStates.localReady].includes(state)) {
    return "Доступно в проверенном текущем объёме. В Phase 21H это только отображается, без запуска.";
  }
  if (state === capabilityActivationStates.readyForPayment) {
    return "Потребуется будущая платная/provider activation перед запуском.";
  }
  if (state === capabilityActivationStates.architectureOnly) {
    return "В РАЗРАБОТКЕ: можно объяснять workflow, но нельзя обещать выполнение сейчас.";
  }
  return "Текущий запуск недоступен или требует отдельной проверки.";
}

function getUsageSteps(educationCard, orchestration) {
  const cardSteps = educationCard?.stepSequence || [];
  if (cardSteps.length) return cardSteps;
  return orchestration.demoPlan?.stepSequence?.length
    ? orchestration.demoPlan.stepSequence
    : ["describe_need", "map_capability", "prepare_inputs", "review_limitations", "verify_result_future"];
}

function selectJourney(productId, capabilityId) {
  if ([productIds.publishing, productIds.books].includes(productId) || capabilityId?.startsWith("BOOK_")) {
    return createBookPublishingJourneyPlan();
  }
  if ([productIds.business, productIds.developer, productIds.advertising, productIds.creatorNetwork].includes(productId)) {
    return createRestaurantOwnerCrossProductJourneyPlan();
  }
  return null;
}

export function buildProductEducationUiViewModel({
  productId = productIds.publishing,
  capabilityId = "BOOK_COVER",
  audience = "GENERAL_USER",
  maxContentAngles = 5,
  includeDebug = false,
  traceId = "phase21h_product_education_ui",
  ...cardOptions
} = {}) {
  const card = createCapabilityCardViewModel({ capabilityId, productId, ...cardOptions });
  const detail = buildCapabilityDetailViewModel(capabilityId, productId, cardOptions);
  const educationCard = getEducationCard(capabilityId, productId);
  const knowledgeNode = getKnowledgeNode(capabilityId, productId);
  const orchestration = orchestrateProductEducation({
    productId: productId || card?.productId,
    capabilityId,
    audience,
    userNeed: card?.exampleRequests?.[0] || knowledgeNode?.userNeed || "",
    channelTargets: [
      educationChannels.reels,
      educationChannels.tiktok,
      educationChannels.shorts,
      educationChannels.youtube,
      educationChannels.telegram,
      educationChannels.inApp,
      educationChannels.website,
      educationChannels.email
    ],
    maxContentAngles,
    demoRequested: true,
    traceId
  });

  const availabilityState = card?.availabilityState || orchestration.strategy.availabilityTruth.availabilityState;
  const ctaType = getCTATypeForAvailability(availabilityState);
  const claimPolicy = buildClaimPolicy({
    capability: { capabilityId, canonicalName: capabilityId, activationState: availabilityState },
    productNode: { availabilityState }
  });
  const falseCurrentClaimProbe = validateEducationClaim({
    availabilityState,
    claim: "ESSA уже умеет это делать прямо сейчас."
  });
  const contentAngles = orchestration.angles.slice(0, maxContentAngles);
  const channelEducationPreview = orchestration.channelBriefs
    .filter((brief, index, all) => all.findIndex((item) => item.channel === brief.channel) === index)
    .slice(0, 8)
    .map((brief) => ({
      channel: channelLabels[brief.channel] || brief.channel,
      format: brief.format,
      CTAType: brief.CTAType,
      executionEnabled: false
    }));
  const exampleJourney = selectJourney(productId, capabilityId);
  const boundedContext = buildBoundedProductEducationContext({
    strategy: orchestration.strategy,
    angle: contentAngles[0],
    demoPlan: orchestration.demoPlan,
    channelBrief: orchestration.channelBriefs[0],
    maxItems: 6,
    maxChars: 1400
  });

  return {
    ...productEducationUiContract,
    productId: productId || card?.productId,
    capabilityId,
    title: card?.title || capabilityId,
    plainLanguageDescription: card?.plainLanguageDescription || detail?.explanation?.whatItIs || "",
    userProblem: orchestration.strategy.primaryUserProblem,
    expectedOutcome: orchestration.strategy.userOutcome || card?.userOutcome || "",
    audience,
    availability: availabilityState,
    availabilityLabel: card?.availabilityLabel || availabilityState,
    availabilityExplanation: getAvailabilityExplanation(availabilityState, card?.freshnessStatus),
    activationRequirement: card?.activationRequirement || "",
    limitations: card?.limitations || orchestration.strategy.limitations,
    freshnessStatus: card?.freshnessStatus || orchestration.strategy.freshnessStatus,
    sourceVersions: orchestration.strategy.sourceVersions,
    lisaGuide: {
      ...orchestration.strategy.LisaProductGuide,
      canExplain: [
        "what_capability_does",
        "why_user_might_need_it",
        "simple_example",
        "future_workflow",
        "current_availability",
        "limitations",
        "related_capabilities"
      ],
      characterCoreMutable: false
    },
    educationStrategy: orchestration.strategy,
    usageSteps: getUsageSteps(educationCard, orchestration),
    contentAngles,
    contentAnglePreviewCount: contentAngles.length,
    contentAngleTotalAvailable: orchestration.angles.length,
    contentAnglesCanExpand: orchestration.angles.length > contentAngles.length,
    demoPlan: {
      ...orchestration.demoPlan,
      executionEnabled: false
    },
    examplePrompts: card?.exampleRequests || [],
    exampleJourney,
    channelEducationPreview,
    growthPreview: {
      channels: channelEducationPreview.map((item) => item.channel),
      creatorNetworkFuture: true,
      advertisingFuture: true,
      scriptsGenerated: false,
      publishingScheduled: false
    },
    claimPolicy: {
      ...claimPolicy,
      falseCurrentClaimProbe
    },
    ctaPolicy: {
      CTAType: ctaType,
      informationalOnly: true,
      executionEnabled: false
    },
    contextEconomy: {
      totalAvailableItems: orchestration.angles.length + orchestration.channelBriefs.length + orchestration.journeys.length,
      selectedItems: boundedContext.selected.length,
      chars: boundedContext.budget.usedChars,
      estimatedTokens: Math.ceil(boundedContext.budget.usedChars / 4),
      sourceVersions: orchestration.strategy.sourceVersions,
      neverLoadsFullCatalog: true
    },
    debug: includeDebug ? {
      boundedEducationContext: boundedContext,
      auditArtifact: orchestration.auditArtifact,
      providerDetailsHiddenFromNormalUi: true
    } : null
  };
}

export function createProductEducationUiProviderReplacementProbe(capabilityId = "IMAGE_GENERATE") {
  const before = buildProductEducationUiViewModel({ capabilityId, productId: productIds.production });
  const after = buildProductEducationUiViewModel({ capabilityId, productId: productIds.production });
  return {
    capabilityId,
    beforeTitle: before.title,
    afterTitle: after.title,
    userFacingMeaningStable: before.title === after.title,
    providerDetailsHiddenFromNormalUi: true,
    providerCalls: 0,
    executionPerformed: false
  };
}
