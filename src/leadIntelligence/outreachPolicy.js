export const outreachPolicy = {
  policyId: "ESSA_NO_MASS_UNREVIEWED_OUTREACH",
  rules: [
    "NO_MASS_UNREVIEWED_OUTREACH",
    "NO_CONTACT_WITHOUT_APPROVED_CHANNEL_POLICY",
    "NO_PERSONAL_CONTACT_HARVESTING_BY_DEFAULT",
    "NO_AUTOMATIC_SENDING_FROM_DISCOVERY_RESULTS"
  ],
  discoveryAndOutreachSeparated: true,
  outreachEnabled: false,
  maxPhaseState: "REVIEWED",
  legalRevalidation: "LEGAL_POLICY_REVALIDATION_REQUIRED_BEFORE_LIVE_OUTREACH"
};

export function evaluateOutreachAttempt(input = {}) {
  return {
    ok: false,
    status: input.massSend ? "NO_MASS_UNREVIEWED_OUTREACH" : "OUTREACH_DISABLED_PHASE_21J_LI",
    outreachEnabled: false,
    sendCount: 0,
    emailSent: false,
    smsSent: false,
    dmSent: false,
    crmMutated: false
  };
}
