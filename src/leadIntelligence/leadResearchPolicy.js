import {
  executionDisabledReason,
  leadDataClasses
} from "./leadContracts.js";

export const leadResearchPolicy = {
  policyId: "ESSA_LEAD_RESEARCH_PUBLIC_BUSINESS_ONLY",
  defaultPermittedDataClass: leadDataClasses.publicBusinessData,
  permittedByDefault: [leadDataClasses.publicBusinessData],
  futureConditional: [leadDataClasses.publicRoleContact],
  prohibited: [leadDataClasses.personalData, leadDataClasses.sensitivePersonalData],
  sourceRequirements: [
    "public_accessibility",
    "source_terms_review",
    "robots_or_crawl_restriction_review",
    "rate_limit_respect",
    "jurisdictional_privacy_review",
    "data_minimization",
    "source_attribution",
    "freshness_tracking"
  ],
  legalRevalidation: "LEGAL_POLICY_REVALIDATION_REQUIRED_BEFORE_LIVE_OUTREACH"
};

export function classifyLeadField(fieldName, value) {
  const name = String(fieldName || "").toLowerCase();
  if (!value) return leadDataClasses.unknown;
  if (/owner|founder|person|personal|birthday|age|home|passport|private|salary|health|religion|politic/.test(name)) {
    return /health|religion|politic|passport|biometric/i.test(name)
      ? leadDataClasses.sensitivePersonalData
      : leadDataClasses.personalData;
  }
  if (/role|manager|sales_contact/.test(name)) return leadDataClasses.publicRoleContact;
  if (/business|company|website|public|directory|industry|city|country|phone|email|social|description/.test(name)) {
    return leadDataClasses.publicBusinessData;
  }
  return leadDataClasses.unknown;
}

export function validateBusinessEntityDataPolicy(entity = {}, policy = leadResearchPolicy) {
  const rejectedFields = Object.entries(entity)
    .map(([fieldName, value]) => ({ fieldName, dataClass: classifyLeadField(fieldName, value) }))
    .filter((item) => policy.prohibited.includes(item.dataClass));
  return {
    ok: rejectedFields.length === 0,
    rejectedFields,
    personalDataExcludedCount: rejectedFields.filter((item) => item.dataClass === leadDataClasses.personalData).length,
    sensitiveDataExcludedCount: rejectedFields.filter((item) => item.dataClass === leadDataClasses.sensitivePersonalData).length
  };
}

export function blockLiveLeadDiscoveryAttempt() {
  return {
    ok: false,
    status: executionDisabledReason,
    externalCalls: 0,
    providerCalls: 0,
    outreachPerformed: false
  };
}
