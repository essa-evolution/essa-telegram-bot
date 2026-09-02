export function evaluateBusinessActivationReadiness({
  prospect = {},
  offer = {},
  ownershipVerified = false,
  accepted = false
} = {}) {
  const blockers = [];
  if (!prospect.prospectId) blockers.push("PROSPECT_REQUIRED");
  if (prospect.businessProfileCreated) blockers.push("PROSPECT_ALREADY_CONVERTED");
  if (!accepted && offer.acceptanceStatus !== "ACCEPTED") blockers.push("OFFER_ACCEPTANCE_REQUIRED");
  if (!ownershipVerified) blockers.push("BUSINESS_OWNERSHIP_VERIFICATION_REQUIRED");

  return {
    ok: blockers.length === 0,
    status: blockers.length ? "ACTIVATION_BLOCKED" : "READY_FOR_BUSINESS_PROFILE_CREATION",
    blockers,
    businessProfileCreationAllowed: blockers.length === 0,
    businessProfileCreated: false,
    externalCalls: 0,
    paymentActions: 0,
    supabaseMutation: false
  };
}
