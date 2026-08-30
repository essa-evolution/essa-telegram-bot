import { openSourceSecurityStates } from "./technologyContracts.js";

export function evaluateTechnologyRisk(candidate = {}, research = {}) {
  const repoRisk = candidate.repositoryRefs?.length > 0;
  const explicitHighRisk = candidate.signals?.some((signal) => signal.securityRisk === "HIGH");
  const routeConflict = research.conflicts?.some((claim) => /privacy|retention|training|route/i.test(claim.text || claim.claim || ""));

  if (explicitHighRisk) {
    return {
      securityStatus: openSourceSecurityStates.rejected,
      blocked: true,
      reasons: ["high_security_risk_signal"],
      installsAllowed: false,
      providerCallsAllowed: false
    };
  }

  if (repoRisk) {
    return {
      securityStatus: openSourceSecurityStates.securityReviewRequired,
      blocked: true,
      reasons: ["repository_identity_license_dependencies_install_scripts_network_filesystem_telemetry_review_required"],
      installsAllowed: false,
      providerCallsAllowed: false
    };
  }

  if (routeConflict) {
    return {
      securityStatus: openSourceSecurityStates.securityReviewRequired,
      blocked: true,
      reasons: ["route_dependent_privacy_or_training_conflict"],
      installsAllowed: false,
      providerCallsAllowed: false
    };
  }

  return {
    securityStatus: openSourceSecurityStates.researched,
    blocked: false,
    reasons: [],
    installsAllowed: false,
    providerCallsAllowed: false
  };
}

