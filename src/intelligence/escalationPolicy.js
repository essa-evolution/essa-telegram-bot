import { decisionTypes, reasoningLevels } from "./intelligenceContracts.js";

export const canonicalEscalationPath = [
  "LOCAL",
  "LUNA",
  "TERRA",
  "SOL",
  "SOL_MAX",
  "HUMAN_REVIEW"
];

export const defaultEscalationLimits = {
  maxEscalationSteps: 3,
  maxAttemptsPerTier: 2,
  maxTotalCostUsd: null,
  maxTurns: 6,
  timeoutMs: null,
  humanReviewThreshold: "critical"
};

export const escalationTriggers = [
  "verification_fail",
  "confidence_below_threshold",
  "schema_violation",
  "unresolved_critical_requirement",
  "repeated_repair_failure",
  "provider_unavailable",
  "quality_requirement_unmet"
];

export function evaluateVerificationControlledEscalation({ decision, verification = {}, limits = defaultEscalationLimits } = {}) {
  if (verification.passed === true) {
    return { action: "ACCEPT_VERIFIED", escalationRequired: false, providerCompletionIsProof: false };
  }

  if (verification.passed === false || verification.status === "FAIL") {
    const attempts = Number(verification.failedAttempts || 1);
    if (attempts >= limits.maxAttemptsPerTier && decision?.reasoningLevel === reasoningLevels.solMax) {
      return { action: decisionTypes.humanRequired, escalationRequired: true, reason: "sol_max_failed_verification" };
    }
    return { action: "ESCALATE_OR_REPAIR", escalationRequired: true, reason: "verification_controls_outcome" };
  }

  return { action: "WAIT_FOR_VERIFICATION", escalationRequired: false };
}
