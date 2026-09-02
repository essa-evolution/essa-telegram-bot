import {
  communicationProviderReadinessStates
} from "./communicationDelivery.js";
import {
  communicationProviderRegistry,
  communicationProviderRegistryVersion,
  evaluateCommunicationProviderReadiness
} from "./communicationProviderRegistry.js";
import { redactForTrace } from "./policy.js";

export const communicationProviderSelectionPolicyVersion = "communication-provider-selection-policy-v1";

export const communicationProviderSelectionStatuses = {
  selected: "SELECTED",
  noEligibleProvider: "NO_ELIGIBLE_PROVIDER",
  liveExecutionBlocked: "LIVE_EXECUTION_BLOCKED_PHASE_I"
};

export const communicationProviderSelectionReasonCodes = {
  capabilityMismatch: "CAPABILITY_MISMATCH",
  providerDisabled: "PROVIDER_DISABLED",
  providerUnavailable: "PROVIDER_UNAVAILABLE",
  providerNotConfigured: "PROVIDER_NOT_CONFIGURED",
  providerDegraded: "PROVIDER_DEGRADED",
  lowerPriority: "LOWER_PRIORITY",
  dryRunOnly: "DRY_RUN_ONLY",
  liveExecutionUnsupported: "LIVE_EXECUTION_UNSUPPORTED",
  configurationIncomplete: "CONFIGURATION_INCOMPLETE",
  liveExecutionBlockedPhaseI: "LIVE_EXECUTION_BLOCKED_PHASE_I",
  selectedByReadinessPriority: "SELECTED_BY_READINESS_PRIORITY",
  noEligibleProvider: "NO_ELIGIBLE_PROVIDER"
};

const readinessRank = {
  [communicationProviderReadinessStates.available]: 0,
  [communicationProviderReadinessStates.degraded]: 1,
  [communicationProviderReadinessStates.notConfigured]: 2,
  [communicationProviderReadinessStates.unavailable]: 3,
  [communicationProviderReadinessStates.disabled]: 4
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
}

function candidateReasons(readiness = {}) {
  const reasons = [...safeArray(readiness.blockers)];
  if (readiness.readiness === communicationProviderReadinessStates.degraded) {
    reasons.push(communicationProviderSelectionReasonCodes.providerDegraded);
  }
  if (readiness.dryRunOnly === true) reasons.push(communicationProviderSelectionReasonCodes.dryRunOnly);
  if (readiness.liveProviderConfigured === false) {
    reasons.push(communicationProviderSelectionReasonCodes.liveExecutionUnsupported);
  }
  return [...new Set(reasons)];
}

function eligible(readiness = {}, liveExecutionRequested = false) {
  return liveExecutionRequested !== true &&
    readiness.capabilityMatch === true &&
    readiness.enabled === true &&
    (
      readiness.readiness === communicationProviderReadinessStates.available ||
      readiness.readiness === communicationProviderReadinessStates.degraded
    );
}

function rankCandidates(candidates = []) {
  return [...candidates].sort((left, right) => {
    const leftReadiness = readinessRank[left.readiness.readiness] ?? 99;
    const rightReadiness = readinessRank[right.readiness.readiness] ?? 99;
    if (leftReadiness !== rightReadiness) return leftReadiness - rightReadiness;
    if (left.priority !== right.priority) return left.priority - right.priority;
    return left.providerId.localeCompare(right.providerId);
  });
}

export function selectCommunicationProviderForCapability({
  capabilityId,
  registry = communicationProviderRegistry,
  liveExecutionRequested = false,
  checkedAt = nowIso()
} = {}) {
  const evaluated = registry.map((provider) => {
    const readiness = evaluateCommunicationProviderReadiness(provider, capabilityId, {
      liveExecutionRequested,
      checkedAt
    });
    return {
      providerId: provider.providerId,
      adapterId: provider.adapterId,
      displayLabel: provider.displayLabel,
      priority: provider.priority,
      costClass: provider.costClass,
      dryRunOnly: provider.dryRunOnly !== false,
      supportsLiveExecution: provider.supportsLiveExecution === true,
      executableNow: provider.executableNow === true,
      hypothetical: provider.hypothetical === true,
      readiness,
      reasonCodes: candidateReasons(readiness)
    };
  });
  const usable = evaluated.filter((candidate) => eligible(candidate.readiness, liveExecutionRequested));
  const rankedCandidates = rankCandidates(usable).map((candidate, index) => ({
    providerId: candidate.providerId,
    adapterId: candidate.adapterId,
    readiness: candidate.readiness.readiness,
    priority: candidate.priority,
    rank: index + 1,
    dryRunOnly: candidate.dryRunOnly,
    supportsLiveExecution: candidate.supportsLiveExecution,
    executableNow: candidate.executableNow,
    hypothetical: candidate.hypothetical,
    reasonCodes: index === 0
      ? [communicationProviderSelectionReasonCodes.selectedByReadinessPriority, ...candidate.reasonCodes]
      : [communicationProviderSelectionReasonCodes.lowerPriority, ...candidate.reasonCodes]
  }));
  const selected = rankedCandidates[0] || null;
  const rejectedCandidates = evaluated
    .filter((candidate) => !rankedCandidates.some((ranked) => ranked.providerId === candidate.providerId))
    .map((candidate) => ({
      providerId: candidate.providerId,
      adapterId: candidate.adapterId,
      readiness: candidate.readiness.readiness,
      reasonCodes: candidate.reasonCodes.length
        ? candidate.reasonCodes
        : [communicationProviderSelectionReasonCodes.capabilityMismatch]
    }));
  const status = liveExecutionRequested === true
    ? communicationProviderSelectionStatuses.liveExecutionBlocked
    : selected
      ? communicationProviderSelectionStatuses.selected
      : communicationProviderSelectionStatuses.noEligibleProvider;
  const fallbackProviderIds = selected ? rankedCandidates.slice(1).map((candidate) => candidate.providerId) : [];
  const reasonCodes = [
    status === communicationProviderSelectionStatuses.noEligibleProvider
      ? communicationProviderSelectionReasonCodes.noEligibleProvider
      : null,
    status === communicationProviderSelectionStatuses.liveExecutionBlocked
      ? communicationProviderSelectionReasonCodes.liveExecutionBlockedPhaseI
      : null,
    selected ? communicationProviderSelectionReasonCodes.selectedByReadinessPriority : null,
    ...rejectedCandidates.flatMap((candidate) => candidate.reasonCodes),
    ...rankedCandidates.slice(1).flatMap((candidate) => candidate.reasonCodes)
  ].filter(Boolean);

  return redactForTrace({
    modelType: "CommunicationProviderSelectionDecision",
    capabilityId,
    status,
    selectedProviderId: status === communicationProviderSelectionStatuses.selected ? selected.providerId : null,
    selectedAdapterId: status === communicationProviderSelectionStatuses.selected ? selected.adapterId : null,
    selectedReadiness: status === communicationProviderSelectionStatuses.selected ? selected.readiness : null,
    rankedCandidates: status === communicationProviderSelectionStatuses.selected ? rankedCandidates : [],
    fallbackProviderIds: status === communicationProviderSelectionStatuses.selected ? fallbackProviderIds : [],
    rejectedCandidates,
    selectionReasonCodes: [...new Set(reasonCodes)],
    liveExecutionAllowed: false,
    providerExecutionAllowed: false,
    externalExecution: false,
    credentialsResolved: false,
    liveProviderConfigured: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    outreachActions: 0
  });
}

export function createCommunicationProviderSelectionAudit(input = {}) {
  const decision = input.decision || {};
  return redactForTrace({
    artifactType: "CommunicationProviderSelectionAudit",
    phase: "BUSINESS_ACQUISITION_PHASE_I",
    policyVersion: communicationProviderSelectionPolicyVersion,
    capabilityId: decision.capabilityId || input.capabilityId || null,
    registryVersion: input.registryVersion || communicationProviderRegistryVersion,
    evaluatedProviderIds: safeArray(input.registry || communicationProviderRegistry).map((provider) => provider.providerId),
    selectedProviderId: decision.selectedProviderId || null,
    fallbackProviderIds: safeArray(decision.fallbackProviderIds),
    rejectedProviderIds: safeArray(decision.rejectedCandidates).map((candidate) => candidate.providerId),
    reasonCodes: safeArray(decision.selectionReasonCodes),
    readinessSnapshot: [
      ...safeArray(decision.rankedCandidates).map((candidate) => ({
        providerId: candidate.providerId,
        adapterId: candidate.adapterId,
        readiness: candidate.readiness,
        rank: candidate.rank,
        reasonCodes: candidate.reasonCodes
      })),
      ...safeArray(decision.rejectedCandidates).map((candidate) => ({
        providerId: candidate.providerId,
        adapterId: candidate.adapterId,
        readiness: candidate.readiness,
        rejected: true,
        reasonCodes: candidate.reasonCodes
      }))
    ],
    gatewayRequired: true,
    liveExecutionAllowed: false,
    credentialsResolved: false,
    externalExecution: false,
    providerCalls: 0,
    externalCalls: 0,
    sendActions: 0,
    createdAt: input.createdAt || nowIso()
  });
}
