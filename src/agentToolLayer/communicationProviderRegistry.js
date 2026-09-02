import { providerCapabilityMap } from "../capabilities/providerCapabilityMap.js";
import { providerCapabilitySupport } from "../capabilities/capabilityContracts.js";
import {
  communicationDeliveryCapabilities,
  communicationProviderReadinessStates
} from "./communicationDelivery.js";
import { redactForTrace } from "./policy.js";

export const communicationProviderRegistryVersion = "communication-provider-readiness-registry-v1";

export const communicationCredentialRequirementTypes = {
  apiToken: "API_TOKEN",
  accountId: "ACCOUNT_ID",
  senderId: "SENDER_ID",
  botToken: "BOT_TOKEN",
  businessAccountId: "BUSINESS_ACCOUNT_ID"
};

export const communicationProviderCostClasses = {
  localDryRun: "LOCAL_DRY_RUN",
  low: "LOW",
  metered: "METERED",
  unknown: "UNKNOWN"
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
}

export function createCommunicationProviderDefinition(input = {}) {
  return redactForTrace({
    modelType: "CommunicationProviderDefinition",
    providerId: input.providerId,
    adapterId: input.adapterId,
    displayLabel: input.displayLabel || input.providerId,
    capabilityIds: safeArray(input.capabilityIds),
    readiness: input.readiness || communicationProviderReadinessStates.notConfigured,
    enabled: input.enabled !== false,
    dryRunOnly: input.dryRunOnly !== false,
    supportsLiveExecution: input.supportsLiveExecution === true,
    executableNow: input.executableNow === true,
    hypothetical: input.hypothetical === true,
    credentialRequirements: safeArray(input.credentialRequirements).map((item) => ({
      credentialType: item.credentialType,
      required: item.required !== false,
      description: item.description || null
    })),
    configurationRequirements: safeArray(input.configurationRequirements),
    regionConstraints: safeArray(input.regionConstraints),
    channelConstraints: safeArray(input.channelConstraints),
    costClass: input.costClass || communicationProviderCostClasses.unknown,
    priority: Number.isFinite(input.priority) ? input.priority : 100,
    experimental: input.experimental === true,
    sourceOfTruth: input.sourceOfTruth || "LOCAL_PHASE_I_FIXTURE",
    notes: safeArray(input.notes)
  });
}

export const communicationProviderRegistry = [
  createCommunicationProviderDefinition({
    providerId: "LOCAL_COMMUNICATION_DRY_RUN",
    adapterId: "LOCAL_COMMUNICATION_DRY_RUN_ADAPTER",
    displayLabel: "Local communication dry-run boundary",
    capabilityIds: Object.values(communicationDeliveryCapabilities),
    readiness: communicationProviderReadinessStates.available,
    enabled: true,
    dryRunOnly: true,
    supportsLiveExecution: false,
    executableNow: false,
    hypothetical: false,
    credentialRequirements: [],
    configurationRequirements: [],
    regionConstraints: ["LOCAL_ONLY"],
    channelConstraints: ["EMAIL", "WHATSAPP", "TELEGRAM", "BUSINESS_DM"],
    costClass: communicationProviderCostClasses.localDryRun,
    priority: 900,
    experimental: false,
    sourceOfTruth: "src/agentToolLayer/communicationDelivery.js",
    notes: [
      "Preserved Phase H provider-neutral dry-run adapter.",
      "Validates requests only after ExecutionGateway returns READY."
    ]
  }),
  createCommunicationProviderDefinition({
    providerId: "HYPOTHETICAL_EMAIL_PRIMARY",
    adapterId: "HYPOTHETICAL_EMAIL_PRIMARY_ADAPTER",
    displayLabel: "Hypothetical email primary",
    capabilityIds: [communicationDeliveryCapabilities.email],
    readiness: communicationProviderReadinessStates.available,
    credentialRequirements: [
      { credentialType: communicationCredentialRequirementTypes.apiToken },
      { credentialType: communicationCredentialRequirementTypes.senderId }
    ],
    configurationRequirements: ["SENDER_DOMAIN_VERIFICATION", "SUPPRESSION_POLICY_MAPPING"],
    regionConstraints: ["FUTURE_REGION_POLICY_REQUIRED"],
    channelConstraints: ["EMAIL"],
    costClass: communicationProviderCostClasses.metered,
    priority: 10,
    hypothetical: true,
    executableNow: false,
    dryRunOnly: true,
    supportsLiveExecution: false,
    notes: ["Non-live fixture for deterministic ranking only."]
  }),
  createCommunicationProviderDefinition({
    providerId: "HYPOTHETICAL_EMAIL_FALLBACK",
    adapterId: "HYPOTHETICAL_EMAIL_FALLBACK_ADAPTER",
    displayLabel: "Hypothetical email fallback",
    capabilityIds: [communicationDeliveryCapabilities.email],
    readiness: communicationProviderReadinessStates.available,
    credentialRequirements: [
      { credentialType: communicationCredentialRequirementTypes.apiToken },
      { credentialType: communicationCredentialRequirementTypes.accountId }
    ],
    configurationRequirements: ["SENDER_ID_MAPPING"],
    regionConstraints: ["FUTURE_REGION_POLICY_REQUIRED"],
    channelConstraints: ["EMAIL"],
    costClass: communicationProviderCostClasses.metered,
    priority: 20,
    hypothetical: true,
    executableNow: false,
    dryRunOnly: true,
    supportsLiveExecution: false,
    notes: ["Non-live fallback fixture; not a verified vendor."]
  }),
  createCommunicationProviderDefinition({
    providerId: "HYPOTHETICAL_WHATSAPP_PRIMARY",
    adapterId: "HYPOTHETICAL_WHATSAPP_PRIMARY_ADAPTER",
    displayLabel: "Hypothetical WhatsApp primary",
    capabilityIds: [communicationDeliveryCapabilities.whatsapp],
    readiness: communicationProviderReadinessStates.notConfigured,
    credentialRequirements: [
      { credentialType: communicationCredentialRequirementTypes.apiToken },
      { credentialType: communicationCredentialRequirementTypes.businessAccountId },
      { credentialType: communicationCredentialRequirementTypes.senderId }
    ],
    configurationRequirements: ["BUSINESS_ACCOUNT_REVIEW", "TEMPLATE_APPROVAL_POLICY"],
    regionConstraints: ["FUTURE_REGION_POLICY_REQUIRED"],
    channelConstraints: ["WHATSAPP"],
    costClass: communicationProviderCostClasses.metered,
    priority: 10,
    hypothetical: true,
    executableNow: false,
    dryRunOnly: true,
    supportsLiveExecution: false,
    notes: ["Non-live fixture intentionally not configured."]
  }),
  createCommunicationProviderDefinition({
    providerId: "HYPOTHETICAL_TELEGRAM_PRIMARY",
    adapterId: "HYPOTHETICAL_TELEGRAM_PRIMARY_ADAPTER",
    displayLabel: "Hypothetical Telegram primary",
    capabilityIds: [communicationDeliveryCapabilities.telegram],
    readiness: communicationProviderReadinessStates.degraded,
    credentialRequirements: [
      { credentialType: communicationCredentialRequirementTypes.botToken }
    ],
    configurationRequirements: ["BOT_OWNERSHIP_REVIEW"],
    regionConstraints: ["FUTURE_REGION_POLICY_REQUIRED"],
    channelConstraints: ["TELEGRAM"],
    costClass: communicationProviderCostClasses.low,
    priority: 10,
    hypothetical: true,
    executableNow: false,
    dryRunOnly: true,
    supportsLiveExecution: false,
    experimental: true,
    notes: ["Non-live fixture marked degraded to prove ranking semantics."]
  }),
  createCommunicationProviderDefinition({
    providerId: "HYPOTHETICAL_BUSINESS_DM_PRIMARY",
    adapterId: "HYPOTHETICAL_BUSINESS_DM_PRIMARY_ADAPTER",
    displayLabel: "Hypothetical business DM primary",
    capabilityIds: [communicationDeliveryCapabilities.businessDm],
    readiness: communicationProviderReadinessStates.disabled,
    enabled: false,
    credentialRequirements: [
      { credentialType: communicationCredentialRequirementTypes.apiToken },
      { credentialType: communicationCredentialRequirementTypes.accountId }
    ],
    configurationRequirements: ["PLATFORM_TERMS_REVIEW", "BUSINESS_ACCOUNT_LINKAGE"],
    regionConstraints: ["FUTURE_REGION_POLICY_REQUIRED"],
    channelConstraints: ["BUSINESS_DM"],
    costClass: communicationProviderCostClasses.metered,
    priority: 10,
    hypothetical: true,
    executableNow: false,
    dryRunOnly: true,
    supportsLiveExecution: false,
    notes: ["Non-live fixture disabled by policy."]
  })
];

export function listCommunicationProviderDefinitions(registry = communicationProviderRegistry) {
  return registry.map((provider) => createCommunicationProviderDefinition(provider));
}

export function getCommunicationProviderDefinition(providerId, registry = communicationProviderRegistry) {
  const provider = registry.find((item) => item.providerId === providerId);
  return provider ? createCommunicationProviderDefinition(provider) : null;
}

export function evaluateCommunicationProviderReadiness(provider = {}, capabilityId, options = {}) {
  const capabilitySupport = providerCapabilityMap[provider.providerId]?.capabilities?.[capabilityId] || null;
  const capabilityMatch = safeArray(provider.capabilityIds).includes(capabilityId) &&
    capabilitySupport !== providerCapabilitySupport.notSupported;
  const blockers = [];
  const warnings = [];

  if (!capabilityMatch) blockers.push("CAPABILITY_MISMATCH");
  if (provider.enabled === false) blockers.push("PROVIDER_DISABLED");
  if (provider.readiness === communicationProviderReadinessStates.disabled) blockers.push("PROVIDER_DISABLED");
  if (provider.readiness === communicationProviderReadinessStates.unavailable) blockers.push("PROVIDER_UNAVAILABLE");
  if (provider.readiness === communicationProviderReadinessStates.notConfigured) blockers.push("PROVIDER_NOT_CONFIGURED");
  if (safeArray(provider.configurationRequirements).length > 0) blockers.push("CONFIGURATION_INCOMPLETE");
  if (provider.supportsLiveExecution !== true) warnings.push("LIVE_EXECUTION_UNSUPPORTED");
  if (provider.dryRunOnly === true) warnings.push("DRY_RUN_ONLY");
  if (provider.readiness === communicationProviderReadinessStates.degraded) warnings.push("PROVIDER_DEGRADED");
  if (options.liveExecutionRequested === true) blockers.push("LIVE_EXECUTION_BLOCKED_PHASE_I");

  return redactForTrace({
    modelType: "CommunicationProviderReadiness",
    providerId: provider.providerId,
    adapterId: provider.adapterId,
    readiness: provider.enabled === false
      ? communicationProviderReadinessStates.disabled
      : provider.readiness,
    capabilityMatch,
    capabilitySupport: capabilitySupport || "LOCAL_REGISTRY_FIXTURE_DECLARED",
    enabled: provider.enabled !== false,
    dryRunOnly: provider.dryRunOnly !== false,
    executableNow: provider.executableNow === true,
    credentialsRequired: safeArray(provider.credentialRequirements).map((item) => item.credentialType),
    credentialsResolved: false,
    configurationComplete: safeArray(provider.configurationRequirements).length === 0,
    liveProviderConfigured: false,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    checkedAt: options.checkedAt || nowIso(),
    source: provider.sourceOfTruth || communicationProviderRegistryVersion
  });
}
