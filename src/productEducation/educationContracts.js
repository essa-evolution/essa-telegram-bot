import {
  capabilityActivationStates,
  capabilityCostClasses
} from "../capabilities/capabilityContracts.js";

export const educationAudienceProfiles = {
  beginner: "BEGINNER",
  creator: "CREATOR",
  author: "AUTHOR",
  businessOwner: "BUSINESS_OWNER",
  developer: "DEVELOPER",
  realEstate: "REAL_ESTATE",
  musicCreator: "MUSIC_CREATOR",
  parent: "PARENT",
  generalUser: "GENERAL_USER"
};

export const contentAngleTypes = {
  howTo: "HOW_TO",
  problemSolution: "PROBLEM_SOLUTION",
  commonMistakes: "COMMON_MISTAKES",
  beforeAfter: "BEFORE_AFTER",
  demo: "DEMO",
  faq: "FAQ",
  mythVsReality: "MYTH_VS_REALITY",
  useCase: "USE_CASE",
  beginnerGuide: "BEGINNER_GUIDE",
  advancedTip: "ADVANCED_TIP",
  workflow: "WORKFLOW",
  comparison: "COMPARISON",
  resultShowcase: "RESULT_SHOWCASE"
};

export const educationFreshnessStatuses = {
  current: "CURRENT",
  staleCapabilityVersion: "STALE_CAPABILITY_VERSION",
  staleProductVersion: "STALE_PRODUCT_VERSION",
  staleAvailability: "STALE_AVAILABILITY",
  refreshRequired: "REFRESH_REQUIRED"
};

export const educationClaimClasses = {
  allowedCurrent: "ALLOWED_CURRENT_CLAIM",
  allowedLimited: "ALLOWED_LIMITED_CLAIM",
  futureOnly: "FUTURE_CLAIM_ONLY",
  prohibited: "PROHIBITED_CLAIM"
};

export const educationValidationStatuses = {
  valid: "VALID_EDUCATION_CLAIM",
  blocked: "BLOCK_INVALID_EDUCATION_CLAIM"
};

export const demoStatuses = {
  plannedNotExecutable: "PLANNED_DEMO_NOT_EXECUTABLE",
  localReady: "LOCAL_DEMO_READY",
  activeReady: "ACTIVE_DEMO_READY",
  providerActivationRequired: "PROVIDER_ACTIVATION_REQUIRED"
};

export const productEducationRequestContract = {
  requestId: null,
  productId: null,
  capabilityId: null,
  audience: educationAudienceProfiles.generalUser,
  userNeed: "",
  educationGoal: "explain_capability_truthfully",
  channelTargets: [],
  formatTargets: [],
  availabilityRequired: null,
  sourceCapabilityVersion: null,
  sourceProductVersion: null,
  LisaCharacterContextRef: null,
  maxContentAngles: 6,
  demoRequested: false,
  freshnessRequirement: educationFreshnessStatuses.current,
  traceId: null
};

export const productEducationStrategyContract = {
  strategyId: null,
  productId: null,
  capabilityId: null,
  primaryUserProblem: "",
  userOutcome: "",
  keyMessage: "",
  explanationLevel: "plain_practical",
  beginnerAngle: null,
  practicalAngle: null,
  demonstrationAngle: null,
  comparisonAngle: null,
  mistakeAngle: null,
  FAQAngle: null,
  eligibility: {
    educationEligible: false,
    contentEligible: false
  },
  availabilityTruth: null,
  limitations: [],
  freshnessStatus: educationFreshnessStatuses.current,
  sourceVersions: null,
  traceId: null
};

export const productContentAngleContract = {
  angleId: null,
  productId: null,
  capabilityId: null,
  angleType: contentAngleTypes.howTo,
  userProblem: "",
  hookConcept: "",
  teachingPoint: "",
  demonstrationIdea: "",
  expectedOutcome: "",
  audience: educationAudienceProfiles.generalUser,
  complexity: "beginner",
  availabilityState: capabilityActivationStates.architectureOnly,
  allowedClaims: [],
  prohibitedClaims: [],
  sourceVersion: null,
  freshnessStatus: educationFreshnessStatuses.current,
  educationEligible: false,
  contentEligible: false,
  traceId: null
};

export const capabilityDemoPlanContract = {
  demoId: null,
  productId: null,
  capabilityId: null,
  userScenario: "",
  inputArtifactType: null,
  expectedOutputArtifactType: null,
  stepSequence: [],
  requiredCapabilities: [],
  requiredProvidersFuture: [],
  verificationPlan: [],
  costClass: capabilityCostClasses.unknown,
  approvalPoints: [],
  availabilityState: capabilityActivationStates.architectureOnly,
  demoStatus: demoStatuses.plannedNotExecutable,
  sourceVersion: null,
  executionEnabled: false
};

export const channelEducationBriefContract = {
  briefId: null,
  productId: null,
  capabilityId: null,
  channel: null,
  format: null,
  audience: educationAudienceProfiles.generalUser,
  angleId: null,
  hookConcept: "",
  problem: "",
  explanation: "",
  demoConcept: "",
  steps: [],
  outcome: "",
  CTAType: null,
  availabilityState: capabilityActivationStates.architectureOnly,
  allowedClaims: [],
  prohibitedClaims: [],
  LisaCharacterContextRef: null,
  sourceVersions: null,
  freshnessStatus: educationFreshnessStatuses.current,
  executionEnabled: false
};

export const educationRefreshIntentContract = {
  refreshIntentId: null,
  eventType: "ProductKnowledgeChanged",
  affectedStrategies: [],
  affectedAngles: [],
  affectedChannelBriefs: [],
  reason: null,
  executionEnabled: false
};

export const productJourneyEducationPlanContract = {
  journeyId: null,
  userScenario: "",
  productIds: [],
  capabilitySequence: [],
  educationSteps: [],
  executionEnabled: false
};

export const organicGrowthPlanContract = {
  growthPlanId: null,
  productId: null,
  capabilityId: null,
  audience: educationAudienceProfiles.generalUser,
  contentThemes: [],
  educationSequence: [],
  channelMix: [],
  demoOpportunities: [],
  crossProductJourneyOpportunities: [],
  frequencyPolicy: "manual_future_only",
  freshnessStatus: educationFreshnessStatuses.current,
  executionEnabled: false
};

export const productEducationCalendarItemContract = {
  itemId: null,
  productId: null,
  capabilityId: null,
  angleId: null,
  channel: null,
  format: null,
  priority: "normal",
  freshness: educationFreshnessStatuses.current,
  availability: capabilityActivationStates.architectureOnly,
  plannedState: "PLANNED_NOT_SCHEDULED"
};

export const productEducationAuditArtifactContract = {
  artifactType: "ProductEducationAuditArtifact",
  sourceProduct: null,
  sourceCapability: null,
  availability: null,
  versions: null,
  educationStrategy: null,
  angleCount: 0,
  channelsPrepared: [],
  demoEligibility: null,
  allowedClaims: [],
  prohibitedClaims: [],
  freshness: educationFreshnessStatuses.current,
  executionPerformed: false,
  providerCalls: 0,
  timestamp: null
};

export function createProductEducationRequest(input = {}) {
  return {
    ...productEducationRequestContract,
    ...input,
    channelTargets: [...(input.channelTargets || [])],
    formatTargets: [...(input.formatTargets || [])]
  };
}

export function createProductEducationStrategy(input = {}) {
  return {
    ...productEducationStrategyContract,
    ...input,
    limitations: [...(input.limitations || [])]
  };
}

export function createProductContentAngle(input = {}) {
  return {
    ...productContentAngleContract,
    ...input,
    allowedClaims: [...(input.allowedClaims || [])],
    prohibitedClaims: [...(input.prohibitedClaims || [])]
  };
}

export function createCapabilityDemoPlan(input = {}) {
  return {
    ...capabilityDemoPlanContract,
    ...input,
    stepSequence: [...(input.stepSequence || [])],
    requiredCapabilities: [...(input.requiredCapabilities || [])],
    requiredProvidersFuture: [...(input.requiredProvidersFuture || [])],
    verificationPlan: [...(input.verificationPlan || [])],
    approvalPoints: [...(input.approvalPoints || [])],
    executionEnabled: false
  };
}

export function createChannelEducationBrief(input = {}) {
  return {
    ...channelEducationBriefContract,
    ...input,
    steps: [...(input.steps || [])],
    allowedClaims: [...(input.allowedClaims || [])],
    prohibitedClaims: [...(input.prohibitedClaims || [])],
    executionEnabled: false
  };
}
