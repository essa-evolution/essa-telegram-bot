import { buildContextPackage } from "../agentToolLayer/contextBudget.js";
import { localPropertyRepository } from "./localPropertyRepository.js";
import { buildPropertyPassport } from "./propertyPassportBuilder.js";
import { buildPropertyPassportViewModel } from "./propertyPassportViewModel.js";
import {
  clonePropertyReadValue,
  createPropertyNotFound,
  propertyReadScopes
} from "./propertyRepository.js";
import {
  propertyFactStatuses,
  propertyFreshnessStatuses
} from "./propertyContracts.js";

export const propertyDemoAliases = {
  normal: {
    alias: "normal",
    propertyId: "prop_ge_batumi_sea_view_a_1204",
    evidenceProfile: "current",
    label: "Normal/current property",
    description: "Current local listing evidence with verified, inferred and unverified facts."
  },
  stale: {
    alias: "stale",
    propertyId: "prop_ge_batumi_sea_view_a_1204",
    evidenceProfile: "stale",
    label: "Stale listing example",
    description: "Only stale local listing evidence is shown; the UI must not present it as current."
  },
  incomplete: {
    alias: "incomplete",
    propertyId: "prop_ge_batumi_incomplete_evidence",
    evidenceProfile: "incomplete",
    label: "Incomplete evidence example",
    description: "Missing hierarchy, address and current listing evidence remain visibly missing."
  }
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return clonePropertyReadValue(value);
}

function resolveAliasOrPropertyId(value = "normal") {
  if (propertyDemoAliases[value]) return propertyDemoAliases[value];
  return {
    alias: null,
    propertyId: value,
    evidenceProfile: "repository",
    label: value,
    description: "Canonical Property ID"
  };
}

function applyEvidenceProfile(evidence, profile = "repository") {
  if (!evidence?.ok) return evidence;
  if (profile === "current") {
    return {
      ...evidence,
      listingSnapshots: evidence.listingSnapshots.filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.current)
    };
  }
  if (profile === "stale") {
    const staleSources = evidence.listingSnapshots
      .filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.stale)
      .map((listing) => listing.sourceRef)
      .filter(Boolean);
    return {
      ...evidence,
      property: {
        ...evidence.property,
        freshness: propertyFreshnessStatuses.stale,
        sourceRefs: [
          ...safeArray(evidence.property.sourceRefs),
          ...staleSources
        ]
      },
      facts: evidence.facts.map((fact) => ({
        ...fact,
        freshnessStatus: fact.factType === "LOCATION" ? propertyFreshnessStatuses.stale : fact.freshnessStatus,
        factStatus: fact.factType === "LOCATION" ? propertyFactStatuses.stale : fact.factStatus
      })),
      listingSnapshots: evidence.listingSnapshots.filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.stale),
      sourceRefs: [
        ...safeArray(evidence.sourceRefs),
        ...staleSources
      ]
    };
  }
  return evidence;
}

function currentListing(listings = []) {
  return safeArray(listings)
    .filter((listing) => listing.freshnessStatus === propertyFreshnessStatuses.current)
    .sort((a, b) => String(b.observedAt || "").localeCompare(String(a.observedAt || "")))[0] || null;
}

function evidenceCompletenessFrom(viewModel = {}) {
  const gaps = viewModel.audit?.gaps || [];
  if (!gaps.length) return "COMPLETE_LOCAL_EVIDENCE";
  if (gaps.length <= 2) return "PARTIAL_LOCAL_EVIDENCE";
  return "INCOMPLETE_LOCAL_EVIDENCE";
}

function primaryRiskFlags(viewModel = {}) {
  return safeArray(viewModel.risksSection?.rows).map((row) => row.flag).slice(0, 4);
}

export function createPropertyReadService(repository = localPropertyRepository) {
  function getPropertyEvidence(propertyId, options = {}) {
    const resolved = resolveAliasOrPropertyId(propertyId);
    const evidence = repository.getPropertyEvidence(resolved.propertyId);
    if (!evidence.ok) return createPropertyNotFound(resolved.propertyId);
    const profiledEvidence = applyEvidenceProfile(evidence, options.evidenceProfile || resolved.evidenceProfile);
    return {
      ...profiledEvidence,
      alias: resolved.alias,
      label: options.label || resolved.label,
      description: options.description || resolved.description,
      canonicalPropertyId: resolved.propertyId,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function buildPassportInput(propertyId, options = {}) {
    const evidence = getPropertyEvidence(propertyId, options);
    if (!evidence.ok) return evidence;
    return {
      ok: true,
      status: "FOUND",
      propertyId: evidence.propertyId,
      alias: evidence.alias,
      label: evidence.label,
      description: evidence.description,
      property: evidence.property,
      facts: evidence.facts,
      sourceRefs: evidence.sourceRefs,
      listingSnapshots: evidence.listingSnapshots,
      lifecycleEvents: evidence.lifecycleEvents,
      project: evidence.project,
      building: evidence.building,
      floor: evidence.floor,
      unit: evidence.unit,
      developer: evidence.developer,
      landParcel: evidence.landParcel,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function getPropertyPassport(propertyId, options = {}) {
    const input = buildPassportInput(propertyId, options);
    if (!input.ok) return input;
    const generatedAt = options.generatedAt || "2026-08-20T00:00:00.000Z";
    const { passport, audit } = buildPropertyPassport({
      property: input.property,
      facts: input.facts,
      sourceRefs: input.sourceRefs,
      listingSnapshots: input.listingSnapshots,
      lifecycleEvents: input.lifecycleEvents,
      generatedAt
    });
    const viewModel = buildPropertyPassportViewModel({
      property: input.property,
      facts: input.facts,
      listingSnapshots: input.listingSnapshots,
      lifecycleEvents: input.lifecycleEvents,
      project: input.project,
      building: input.building,
      unit: input.unit,
      generatedAt
    });
    return {
      ok: true,
      status: "FOUND",
      propertyId: input.propertyId,
      alias: input.alias,
      label: input.label,
      description: input.description,
      input,
      passport,
      audit,
      viewModel,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function buildPropertySummaryFromEvidence(evidence) {
    if (!evidence?.ok) return null;
    const passportResult = getPropertyPassport(evidence.alias || evidence.propertyId, {
      evidenceProfile: evidence.alias ? undefined : "repository"
    });
    const listing = currentListing(evidence.listingSnapshots);
    return {
      modelType: "PropertySummary",
      propertyId: evidence.propertyId,
      alias: evidence.alias || null,
      label: evidence.label || evidence.propertyId,
      propertyType: evidence.property.propertyType,
      country: evidence.property.country || "Missing",
      city: evidence.property.city || "Missing",
      currentStatus: evidence.property.currentStatus || "Missing",
      observedPrice: listing?.price ?? null,
      currency: listing?.currency || null,
      freshness: passportResult.viewModel.freshnessSection.freshness,
      verificationStatus: passportResult.viewModel.identitySection.verificationStatus,
      evidenceCompleteness: evidenceCompletenessFrom(passportResult.viewModel),
      primaryRiskFlags: primaryRiskFlags(passportResult.viewModel),
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function listProperties(filters = {}) {
    const result = repository.listProperties(filters);
    return {
      ok: true,
      status: "FOUND",
      filters: clone(filters),
      properties: result.properties,
      summaries: result.properties.map((property) => buildPropertySummaryFromEvidence(getPropertyEvidence(property.propertyId, {
        evidenceProfile: "repository",
        label: property.propertyId
      }))).filter(Boolean),
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function listDemoProperties() {
    const summaries = Object.values(propertyDemoAliases)
      .map((alias) => buildPropertySummaryFromEvidence(getPropertyEvidence(alias.alias)))
      .filter(Boolean);
    return {
      ok: true,
      status: "FOUND",
      summaries,
      aliases: clone(propertyDemoAliases),
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function buildBoundedPropertyReadContext({
    query = "",
    propertyId = "normal",
    maxItems = 4,
    maxChars = 1600
  } = {}) {
    const passportResult = getPropertyPassport(propertyId);
    if (!passportResult.ok) {
      return {
        query,
        intent: "PROPERTY_NOT_FOUND",
        propertyId,
        status: "NOT_FOUND",
        boundedContext: buildContextPackage({
          intent: "property_passport_not_found",
          maxItems,
          maxChars,
          memoryItems: []
        }),
        providerCalls: 0,
        externalCalls: 0,
        dbMutations: 0,
        payments: 0
      };
    }
    const memoryItems = [
      {
        id: `${passportResult.propertyId}_summary`,
        text: JSON.stringify(buildPropertySummaryFromEvidence(passportResult.input)),
        relevance: 1,
        source: "PropertyReadService"
      },
      {
        id: `${passportResult.propertyId}_passport_public_view`,
        text: JSON.stringify(passportResult.passport?.publicView || {}),
        relevance: 1,
        source: "PropertyPassport"
      },
      {
        id: `${passportResult.propertyId}_freshness`,
        text: JSON.stringify({
          freshness: passportResult.passport?.freshness,
          verificationStatus: passportResult.passport?.verificationStatus,
          riskFlags: passportResult.passport?.riskFlags,
          gaps: passportResult.audit?.gaps,
          warnings: passportResult.audit?.warnings
        }),
        relevance: 1,
        source: "PropertyPassportAudit"
      },
      {
        id: `${passportResult.propertyId}_view_model_summary`,
        text: JSON.stringify({
          identity: passportResult.viewModel.identitySection,
          market: passportResult.viewModel.marketSection,
          freshness: passportResult.viewModel.freshnessSection,
          risks: passportResult.viewModel.risksSection.rows,
          lisa: passportResult.viewModel.lisaExplanationSection.text
        }),
        relevance: 0.95,
        source: "PropertyPassportViewModel"
      }
    ];
    const boundedContext = buildContextPackage({
      intent: "property_passport_readonly_preview",
      maxItems,
      maxChars,
      memoryItems
    });
    return {
      query,
      intent: "PROPERTY_PASSPORT_PREVIEW",
      propertyId: passportResult.propertyId,
      alias: passportResult.alias,
      passport: passportResult.passport,
      audit: passportResult.audit,
      viewModel: passportResult.viewModel,
      boundedContext,
      boundedContextMetadata: {
        selectedCount: boundedContext.selected.length,
        omittedCount: boundedContext.omittedCount,
        usedChars: boundedContext.budget.usedChars,
        maxChars: boundedContext.budget.maxChars
      },
      status: "READ_ONLY_AVAILABLE",
      readScope: propertyReadScopes.public,
      liveActionsEnabled: false,
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  function publicPropertyResponse(propertyId, options = {}) {
    const passportResult = getPropertyPassport(propertyId, options);
    if (!passportResult.ok) return passportResult;
    return {
      ok: true,
      status: "FOUND",
      readScope: propertyReadScopes.public,
      summary: buildPropertySummaryFromEvidence(passportResult.input),
      passport: {
        propertyId: passportResult.passport.propertyId,
        currentSummary: passportResult.passport.currentSummary,
        publicView: passportResult.passport.publicView,
        freshness: passportResult.passport.freshness,
        confidence: passportResult.passport.confidence,
        verificationStatus: passportResult.passport.verificationStatus,
        riskFlags: passportResult.passport.riskFlags,
        sourceRefs: passportResult.passport.sourceRefs,
        generatedAt: passportResult.passport.generatedAt
      },
      audit: {
        propertyId: passportResult.audit.propertyId,
        operation: passportResult.audit.operation,
        warnings: passportResult.audit.warnings,
        gaps: passportResult.audit.gaps,
        confidence: passportResult.audit.confidence,
        providerCalls: 0,
        externalCalls: 0,
        dbMutations: 0,
        payments: 0
      },
      providerCalls: 0,
      externalCalls: 0,
      dbMutations: 0,
      payments: 0
    };
  }

  return {
    repository,
    getPropertyById: repository.getPropertyById,
    listProperties,
    listDemoProperties,
    getListingsForProperty: repository.getListingsForProperty,
    getFactsForProperty: repository.getFactsForProperty,
    getSourcesForProperty: repository.getSourcesForProperty,
    getLifecycleEvents: repository.getLifecycleEvents,
    getHierarchyForProperty: repository.getHierarchyForProperty,
    getPropertyEvidence,
    buildPassportInput,
    getPropertyPassport,
    buildPropertySummaryFromEvidence,
    buildBoundedPropertyReadContext,
    publicPropertyResponse,
    resolveAliasOrPropertyId,
    providerCalls: 0,
    externalCalls: 0,
    dbMutations: 0,
    payments: 0
  };
}

export const propertyReadService = createPropertyReadService();
