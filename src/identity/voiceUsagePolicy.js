const DEFAULT_FALLBACK_VOICE = "neutral_system_voice";

function isVoiceDisabled(project = {}) {
  return project.voiceDisabled === true ||
    project.voiceEnabled === false ||
    project.voiceIdentity === "disabled" ||
    project.voiceIdentityId === "disabled";
}

export function getVoiceUsageForProject(identitySnapshot = null, project = {}) {
  if (isVoiceDisabled(project)) {
    return {
      allowed: true,
      voiceIdentity: "disabled",
      usage: "Voice disabled",
      fallbackVoice: null,
      reason: "voice_disabled"
    };
  }

  if (!identitySnapshot) {
    return {
      allowed: false,
      voiceIdentity: "neutral_system_voice",
      usage: "Fallback to neutral system voice",
      fallbackVoice: DEFAULT_FALLBACK_VOICE,
      reason: "missing_voice_identity"
    };
  }

  const policy = identitySnapshot.voiceUsagePolicy || {};
  const identityId = identitySnapshot.id || "";
  const projectIdentityId = project.identityId || project.identitySnapshot?.id || "";
  const fallbackVoice = policy.fallbackVoice || DEFAULT_FALLBACK_VOICE;

  if (identityId && projectIdentityId && identityId === projectIdentityId) {
    return {
      allowed: true,
      voiceIdentity: identitySnapshot.name || identityId,
      usage: "Allowed for this identity",
      fallbackVoice,
      reason: "same_identity"
    };
  }

  if (policy.ownerOnly === true && policy.allowThirdPartyProjects !== true) {
    return {
      allowed: false,
      voiceIdentity: identitySnapshot.name || identityId || "Digital Identity",
      usage: "Not allowed for this project",
      fallbackVoice,
      reason: "owner_only"
    };
  }

  if (policy.allowPublicUse === true || policy.allowThirdPartyProjects === true) {
    return {
      allowed: true,
      voiceIdentity: identitySnapshot.name || identityId || "Digital Identity",
      usage: "Allowed by voice usage policy",
      fallbackVoice,
      reason: "policy_allowed"
    };
  }

  return {
    allowed: false,
    voiceIdentity: identitySnapshot.name || identityId || "Digital Identity",
    usage: "Fallback to neutral system voice",
    fallbackVoice,
    reason: "fallback"
  };
}

export function canUseVoiceForProject(identitySnapshot = null, project = {}) {
  return getVoiceUsageForProject(identitySnapshot, project).allowed;
}
