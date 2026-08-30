export const voiceProviderStatuses = {
  primary: "primary",
  experimental: "experimental"
};

export const voiceProviderRegistry = {
  elevenlabs: {
    providerId: "elevenlabs",
    status: "primary",
    role: "primary",
    supportsVoiceCloning: true,
    multilingual: true,
    selfHosted: false,
    productionApproved: true,
    commercialLicenseApproved: true,
    requiresSeparateService: false,
    executable: true,
    licenseGuard: null,
    metadata: {
      currentLisaProductionProvider: true
    }
  },
  omnivoice: {
    providerId: "omnivoice",
    status: "experimental",
    role: "secondary",
    supportsVoiceCloning: true,
    multilingual: true,
    selfHosted: true,
    productionApproved: false,
    commercialLicenseApproved: false,
    requiresSeparateService: true,
    executable: false,
    licenseGuard:
      "The currently researched pretrained OmniVoice model is NOT approved for commercial ESSA Production until a commercially safe model/license path is confirmed.",
    metadata: {
      noRuntimeBridge: true,
      providerCallAllowed: false,
      installRequiredBeforeUse: true
    }
  }
};

export function getVoiceProviderRegistration(providerId) {
  const provider = voiceProviderRegistry[providerId];

  return provider
    ? {
        ...provider,
        metadata: { ...(provider.metadata || {}) }
      }
    : null;
}

export function listVoiceProviderRegistrations() {
  return Object.values(voiceProviderRegistry).map((provider) =>
    getVoiceProviderRegistration(provider.providerId)
  );
}

export function canUseVoiceProviderInProduction(providerId) {
  const provider = getVoiceProviderRegistration(providerId);

  return Boolean(
    provider &&
      provider.executable &&
      provider.productionApproved &&
      provider.commercialLicenseApproved
  );
}
