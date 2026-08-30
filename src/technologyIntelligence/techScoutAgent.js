import {
  alertLevels,
  createTechnologyCandidate,
  createTechnologyScanResult,
  technologyEventTypes
} from "./technologyContracts.js";
import { getTechnologySource } from "./technologySourceRegistry.js";

function priorityForSignal(signal = {}, knownGaps = []) {
  if (signal.eventType === technologyEventTypes.breakingChange || signal.securityRisk === "HIGH") return alertLevels.urgent;
  if (signal.eventType === technologyEventTypes.costChange || signal.costChangeClass) return alertLevels.important;
  if ((signal.claimedCapabilities || []).some((capability) => knownGaps.includes(capability))) return alertLevels.important;
  if (signal.noise === true) return alertLevels.info;
  return alertLevels.watch;
}

export function createScoutCandidateFromSignal(signal = {}, options = {}) {
  const source = getTechnologySource(signal.sourceId) || {};
  const priority = priorityForSignal(signal, options.knownCapabilityGaps || []);

  return createTechnologyCandidate({
    candidateId: signal.candidateId,
    name: signal.name,
    technologyType: signal.technologyType,
    developer: signal.developer,
    provider: signal.provider,
    discoveredFrom: signal.sourceId,
    discoveredAt: options.discoveredAt || "2026-08-27T00:00:00.000Z",
    firstObservedAt: signal.firstObservedAt || null,
    lastObservedAt: signal.lastObservedAt || null,
    officialUrlRefs: signal.officialUrlRefs || [],
    repositoryRefs: signal.repositoryRefs || [],
    claimedCapabilities: signal.claimedCapabilities || [],
    versionOrModelId: signal.versionOrModelId || null,
    openSourceStatus: signal.openSourceStatus || "UNKNOWN",
    licenseStatus: signal.licenseStatus || "UNKNOWN",
    pricingStatus: signal.pricingStatus || "UNKNOWN",
    availabilityStatus: signal.availabilityStatus || "UNKNOWN",
    trustStatus: source.trustTier || "UNKNOWN",
    lifecycleStatus: signal.lifecycleStatus,
    eventType: signal.eventType || technologyEventTypes.discovered,
    signals: [{ ...signal, priority }],
    sourceRefs: [{ sourceId: signal.sourceId, trustTier: source.trustTier || "UNKNOWN", url: signal.url || null }]
  });
}

export function runTechScoutFixtureScan({ scanId = "phase21k_ts_fixture_scan", signals = [], knownCapabilityGaps = [] } = {}) {
  const candidates = signals.map((signal) => createScoutCandidateFromSignal(signal, { knownCapabilityGaps }));
  const ignoredNoise = candidates.filter((candidate) => candidate.signals.some((signal) => signal.noise === true));
  const activeCandidates = candidates.filter((candidate) => !ignoredNoise.includes(candidate));

  return createTechnologyScanResult({
    scanId,
    candidatesDiscovered: activeCandidates,
    candidatesUpdated: activeCandidates.filter((candidate) => candidate.eventType === technologyEventTypes.update),
    breakingChanges: activeCandidates.filter((candidate) => candidate.eventType === technologyEventTypes.breakingChange),
    opportunities: activeCandidates.filter((candidate) => candidate.eventType === technologyEventTypes.newOpportunity),
    capabilityGapsMatched: activeCandidates.filter((candidate) =>
      candidate.claimedCapabilities.some((capability) => knownCapabilityGaps.includes(capability))
    ),
    researchRequired: activeCandidates.filter((candidate) => candidate.researchStatus === "RESEARCH_REQUIRED"),
    highPriorityItems: activeCandidates.filter((candidate) =>
      candidate.signals.some((signal) => [alertLevels.important, alertLevels.urgent].includes(signal.priority))
    ),
    ignoredNoise,
    sourceCount: new Set(signals.map((signal) => signal.sourceId)).size,
    providerCalls: 0,
    externalCalls: 0,
    timestamp: "2026-08-27T00:00:00.000Z"
  });
}

