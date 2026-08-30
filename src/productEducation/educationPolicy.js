import { capabilityActivationStates } from "../capabilities/capabilityContracts.js";
import {
  educationClaimClasses,
  educationValidationStatuses
} from "./educationContracts.js";

const currentStates = new Set([
  capabilityActivationStates.active,
  capabilityActivationStates.localReady,
  capabilityActivationStates.providerReady
]);

export function getCTATypeForAvailability(availabilityState) {
  if ([capabilityActivationStates.active, capabilityActivationStates.localReady].includes(availabilityState)) {
    return "TRY";
  }
  if (availabilityState === capabilityActivationStates.readyForPayment) return "ACTIVATION_REQUIRED";
  if (availabilityState === capabilityActivationStates.architectureOnly) return "COMING_SOON";
  return "LEARN_MORE";
}

export function classifyEducationClaim({ availabilityState, claim = "" } = {}) {
  const normalized = claim.toLowerCase();
  const saysCurrent = /уже|доступно|try now|попробуй|созда[её]т|может локально|работает/i.test(claim);
  const saysFuture = /готовится|заложена|будет|future|coming soon|в разработке|архитектур/i.test(claim);

  if (currentStates.has(availabilityState)) {
    return saysFuture ? educationClaimClasses.allowedLimited : educationClaimClasses.allowedCurrent;
  }

  if (availabilityState === capabilityActivationStates.readyForPayment) {
    return saysCurrent ? educationClaimClasses.allowedLimited : educationClaimClasses.futureOnly;
  }

  if (availabilityState === capabilityActivationStates.architectureOnly) {
    if (saysCurrent && !saysFuture) return educationClaimClasses.prohibited;
    return educationClaimClasses.futureOnly;
  }

  return saysCurrent ? educationClaimClasses.prohibited : educationClaimClasses.allowedLimited;
}

export function buildClaimPolicy({ capability, productNode } = {}) {
  const availabilityState = productNode?.availabilityState || capability?.activationState || capabilityActivationStates.architectureOnly;
  const currentClaim = `${capability?.canonicalName || "Capability"} is available now.`;
  const futureClaim = `${capability?.canonicalName || "Capability"} is represented in ESSA Product Knowledge with honest availability wording.`;

  const allowedClaims = currentStates.has(availabilityState)
    ? [currentClaim, "ESSA may describe this as currently usable within its verified activation state."]
    : [futureClaim, "ESSA may explain the planned workflow and limitations without claiming live execution."];

  const prohibitedClaims = currentStates.has(availabilityState)
    ? ["Do not claim unsupported providers or bypass approvals."]
    : ["Do not say this is already usable.", "Do not use Try now/Create now CTAs.", "Do not imply provider execution is active."];

  return {
    availabilityState,
    allowedClaims,
    prohibitedClaims,
    mayClaimCurrentUse: currentStates.has(availabilityState),
    CTAType: getCTATypeForAvailability(availabilityState)
  };
}

export function validateEducationClaim({ availabilityState, claim } = {}) {
  const classification = classifyEducationClaim({ availabilityState, claim });
  return {
    status: classification === educationClaimClasses.prohibited
      ? educationValidationStatuses.blocked
      : educationValidationStatuses.valid,
    classification,
    availabilityState,
    claim
  };
}

export function enforceLisaProductGuideRole(context = {}) {
  return {
    ...context,
    roleId: context.roleId || "LISA_ESSA_PRODUCT_GUIDE",
    usesCharacterCore: true,
    mayMutateCharacterCore: false,
    canRewriteCharacterCore: false,
    marketerReplacementAllowed: false,
    styleRules: [
      "direct_human_language",
      "user_need_first",
      "practical_explanation",
      "no_fake_hype",
      "no_invented_capabilities",
      "no_provider_worship"
    ]
  };
}
