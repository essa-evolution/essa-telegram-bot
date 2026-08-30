export const capabilityActivationStates = {
  architectureOnly: "ARCHITECTURE_ONLY",
  localReady: "LOCAL_READY",
  providerReady: "PROVIDER_READY",
  readyForKey: "READY_FOR_KEY",
  readyForPayment: "READY_FOR_PAYMENT",
  readyForActivation: "READY_FOR_ACTIVATION",
  active: "ACTIVE",
  degraded: "DEGRADED",
  unavailable: "UNAVAILABLE",
  disabled: "DISABLED"
};

export const providerCapabilitySupport = {
  verified: "VERIFIED",
  declaredNotVerified: "DECLARED_NOT_VERIFIED",
  unknown: "UNKNOWN",
  notSupported: "NOT_SUPPORTED"
};

export const capabilityRiskClasses = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  publish: "PUBLISH",
  externalMutation: "EXTERNAL_MUTATION",
  destructive: "DESTRUCTIVE"
};

export const capabilityCostClasses = {
  free: "FREE",
  localCompute: "LOCAL_COMPUTE",
  metered: "METERED",
  paidExternal: "PAID_EXTERNAL",
  unknown: "UNKNOWN"
};

export const essaCapabilityContract = {
  capabilityId: null,
  canonicalName: null,
  description: "",
  category: null,
  domainTags: [],
  inputTypes: [],
  outputTypes: [],
  requiredSubCapabilities: [],
  optionalSubCapabilities: [],
  deterministicPossible: false,
  localPossible: false,
  externalProviderPossible: false,
  riskClass: capabilityRiskClasses.low,
  costClass: capabilityCostClasses.unknown,
  verificationRequirements: [],
  approvalRequirements: [],
  supportedProviders: [],
  preferredExecutionPolicy: "LOCAL_FIRST_THEN_BEST_ELIGIBLE_PROVIDER",
  activationState: capabilityActivationStates.architectureOnly,
  userFacing: true,
  educationEligible: true,
  contentEligible: true,
  version: "1.0.0",
  metadata: {}
};

export const userNeedContract = {
  text: "",
  locale: "ru",
  productHint: null,
  constraints: {}
};

export const capabilityCompositionPlanContract = {
  goal: "",
  primaryCapability: null,
  requiredCapabilities: [],
  optionalCapabilities: [],
  dependencyOrder: [],
  localCandidates: [],
  providerCandidates: [],
  verificationPlan: [],
  estimatedCostClass: capabilityCostClasses.unknown,
  approvalPoints: []
};

export const productKnowledgeNodeContract = {
  nodeId: null,
  productId: null,
  capabilityId: null,
  userNeed: "",
  userOutcome: "",
  plainLanguageDescription: "",
  exampleRequests: [],
  prerequisites: [],
  availabilityState: capabilityActivationStates.architectureOnly,
  limitations: [],
  relatedCapabilities: [],
  nextPossibleActions: [],
  educationEligible: true,
  contentEligible: true,
  uiLocationFuture: null,
  activationRequirement: null,
  version: "1.0.0"
};

export const productEducationCardContract = {
  educationId: null,
  productId: null,
  capabilityId: null,
  audience: "general_user",
  problem: "",
  promise: "",
  whatUserCanDo: "",
  howItWorksPlainLanguage: "",
  examplePrompt: "",
  stepSequence: [],
  expectedOutcome: "",
  limitations: [],
  availabilityState: capabilityActivationStates.architectureOnly,
  callToActionFuture: null,
  contentAngles: [],
  supportedFormats: [],
  sourceVersion: "1.0.0"
};

export const productContentIntentContract = {
  productId: null,
  capabilityId: null,
  channel: null,
  format: null,
  audience: null,
  hook: "",
  problem: "",
  demonstration: "",
  steps: [],
  outcome: "",
  CTA: "",
  LisaCharacterContext: null,
  sourceCapabilityVersion: null,
  sourceProductVersion: null,
  requiresFreshnessCheck: true
};

export const capabilityDemoContract = {
  demoId: null,
  capabilityId: null,
  input: null,
  steps: [],
  beforeArtifact: null,
  afterArtifact: null,
  providerProvenance: null,
  costClass: capabilityCostClasses.unknown,
  verificationResult: null,
  executable: false
};

export const capabilityUsageRecordContract = {
  capabilityId: null,
  productId: null,
  success: null,
  verificationStatus: null,
  providerUsed: null,
  cost: null,
  latency: null,
  userContinuationAction: null,
  timestamp: null
};

export function createEssaCapability(input = {}) {
  return {
    ...essaCapabilityContract,
    ...input,
    domainTags: [...(input.domainTags || [])],
    inputTypes: [...(input.inputTypes || [])],
    outputTypes: [...(input.outputTypes || [])],
    requiredSubCapabilities: [...(input.requiredSubCapabilities || [])],
    optionalSubCapabilities: [...(input.optionalSubCapabilities || [])],
    verificationRequirements: [...(input.verificationRequirements || [])],
    approvalRequirements: [...(input.approvalRequirements || [])],
    supportedProviders: [...(input.supportedProviders || [])],
    metadata: { ...(input.metadata || {}) }
  };
}

export function createProductKnowledgeNode(input = {}) {
  return {
    ...productKnowledgeNodeContract,
    ...input,
    exampleRequests: [...(input.exampleRequests || [])],
    prerequisites: [...(input.prerequisites || [])],
    limitations: [...(input.limitations || [])],
    relatedCapabilities: [...(input.relatedCapabilities || [])],
    nextPossibleActions: [...(input.nextPossibleActions || [])]
  };
}

export function createProductEducationCard(input = {}) {
  return {
    ...productEducationCardContract,
    ...input,
    stepSequence: [...(input.stepSequence || [])],
    limitations: [...(input.limitations || [])],
    contentAngles: [...(input.contentAngles || [])],
    supportedFormats: [...(input.supportedFormats || [])]
  };
}

export function createProductContentIntent(input = {}) {
  return {
    ...productContentIntentContract,
    ...input,
    steps: [...(input.steps || [])]
  };
}

