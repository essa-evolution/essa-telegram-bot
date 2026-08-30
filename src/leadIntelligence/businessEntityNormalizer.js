import { createBusinessEntity, leadFreshnessStates } from "./leadContracts.js";
import { validateBusinessEntityDataPolicy } from "./leadResearchPolicy.js";

function normalizeText(value = "") {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeUrl(value = null) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

export function normalizePhone(value = null) {
  if (!value) return null;
  const normalized = String(value).replace(/[^\d+]/g, "");
  return normalized || null;
}

export function normalizeEmail(value = null) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

export function normalizeBusinessEntity(raw = {}) {
  const policy = validateBusinessEntityDataPolicy(raw);
  if (!policy.ok) {
    return {
      entity: null,
      rejected: true,
      policy
    };
  }

  const now = raw.updatedAt || raw.createdAt || "2026-08-20T00:00:00.000Z";
  return {
    entity: createBusinessEntity({
      businessId: raw.businessId || `biz_${normalizeText(raw.legalOrDisplayName || raw.name).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      legalOrDisplayName: normalizeText(raw.legalOrDisplayName || raw.name),
      businessType: normalizeText(raw.businessType || "organization").toLowerCase(),
      industry: normalizeText(raw.industry).toLowerCase(),
      subIndustry: normalizeText(raw.subIndustry).toLowerCase(),
      country: normalizeText(raw.country),
      region: normalizeText(raw.region),
      city: normalizeText(raw.city),
      website: normalizeUrl(raw.website),
      publicBusinessEmail: normalizeEmail(raw.publicBusinessEmail),
      publicBusinessPhone: normalizePhone(raw.publicBusinessPhone),
      socialProfiles: (raw.socialProfiles || []).map(normalizeUrl).filter(Boolean),
      directoryProfiles: (raw.directoryProfiles || []).map(normalizeUrl).filter(Boolean),
      publicDescription: normalizeText(raw.publicDescription),
      sourceRefs: [...(raw.sourceRefs || [])],
      verificationStatus: raw.verificationStatus || "REVIEW_REQUIRED",
      dataFreshness: raw.dataFreshness || leadFreshnessStates.current,
      createdAt: raw.createdAt || now,
      updatedAt: now
    }),
    rejected: false,
    policy
  };
}

export function normalizeBusinessEntities(rawEntities = []) {
  return rawEntities.map(normalizeBusinessEntity);
}
