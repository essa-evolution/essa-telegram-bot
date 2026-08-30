import { createLisaProductGuideContext } from "../capabilities/capabilityKnowledge.js";
import { createChannelEducationBrief } from "./educationContracts.js";
import { getCTATypeForAvailability } from "./educationPolicy.js";

export const educationChannels = {
  reels: "Instagram Reels",
  tiktok: "TikTok",
  shorts: "YouTube Shorts",
  youtube: "YouTube",
  telegram: "Telegram",
  inApp: "ESSA in-app",
  website: "Website",
  email: "Email/Newsletter"
};

export function getChannelStructure(channel) {
  if ([educationChannels.reels, educationChannels.tiktok, educationChannels.shorts].includes(channel)) {
    return ["fast_hook", "one_problem", "one_capability", "quick_demonstration", "outcome", "simple_cta"];
  }
  if (channel === educationChannels.youtube) {
    return ["broader_problem", "explanation", "walkthrough", "limitations", "multiple_examples"];
  }
  if (channel === educationChannels.telegram) {
    return ["concise_education", "use_case", "example_request", "future_cta"];
  }
  if (channel === educationChannels.inApp) {
    return ["contextual_help", "short_step_sequence", "relevant_capability_only"];
  }
  if (channel === educationChannels.website) {
    return ["product_explanation", "outcomes", "use_cases", "capability_availability"];
  }
  if (channel === educationChannels.email) {
    return ["education_sequence", "one_use_case_per_message", "progressive_learning"];
  }
  return ["education_brief"];
}

export function buildChannelEducationBrief({ strategy, angle, demoPlan, channel, format, audience } = {}) {
  const LisaCharacterContextRef = createLisaProductGuideContext().characterCore.id;
  const structure = getChannelStructure(channel);
  const availabilityState = angle?.availabilityState || strategy?.availabilityTruth?.availabilityState;

  return createChannelEducationBrief({
    briefId: `brief_${channel}_${angle?.angleId || strategy?.strategyId}`.replaceAll(/\s+/g, "_").toLowerCase(),
    productId: strategy?.productId || angle?.productId,
    capabilityId: strategy?.capabilityId || angle?.capabilityId,
    channel,
    format: format || structure[0],
    audience: audience || angle?.audience || "GENERAL_USER",
    angleId: angle?.angleId,
    hookConcept: angle?.hookConcept || strategy?.keyMessage,
    problem: angle?.userProblem || strategy?.primaryUserProblem,
    explanation: angle?.teachingPoint || strategy?.keyMessage,
    demoConcept: demoPlan?.demoStatus || angle?.demonstrationIdea || "structured_demo_plan_only",
    steps: structure,
    outcome: angle?.expectedOutcome || strategy?.userOutcome,
    CTAType: getCTATypeForAvailability(availabilityState),
    availabilityState,
    allowedClaims: angle?.allowedClaims || strategy?.availabilityTruth?.allowedClaims || [],
    prohibitedClaims: angle?.prohibitedClaims || strategy?.availabilityTruth?.prohibitedClaims || [],
    LisaCharacterContextRef,
    sourceVersions: strategy?.sourceVersions || angle?.sourceVersion,
    freshnessStatus: strategy?.freshnessStatus || angle?.freshnessStatus || "CURRENT",
    executionEnabled: false
  });
}

export function buildChannelEducationBriefs({ strategy, angles = [], demoPlan, channels = Object.values(educationChannels), audience } = {}) {
  return channels.flatMap((channel) =>
    angles.map((angle) => buildChannelEducationBrief({
      strategy,
      angle,
      demoPlan,
      channel,
      audience
    }))
  );
}
