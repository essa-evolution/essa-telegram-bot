import { lisaIdentityProfile } from "./lisaIdentityProfile.js";

export const personalAvatarTemplate = {
  id: "personal_avatar_template",
  name: "Personal Avatar Template",
  type: "digital_identity_template",
  status: "template",
  roles: ["Personal Avatar", "Talking Avatar", "Avatar Video"],
  visualIdentity: {
    source: "user_provided_reference_or_prompt",
    summary: "Template for a future user-approved personal avatar profile created from explicit consent, reference assets and style direction.",
    referenceImages: [],
    approvedPortraits: [],
    negativePrompt: "no unauthorized likeness, no identity drift, no unsafe or non-consensual personal replication"
  },
  voiceIdentity: {
    source: "user_provided_voice_samples",
    voiceSamples: [],
    singingSamples: [],
    providerMode: "placeholder"
  },
  personality: {
    source: "user_defined_personality_brief",
    tone: "defined during intake",
    communicationStyle: "defined during intake"
  },
  assets: {
    referenceImages: [],
    voiceSamples: [],
    singingSamples: [],
    avatarVideos: [],
    promptPacks: [],
    lipsyncBriefs: []
  },
  safety: {
    consentRequired: true,
    personalAvatarAllowed: true,
    notes: "Personal avatar creation requires explicit consent and approved source assets."
  }
};

export const identityRegistry = {
  [lisaIdentityProfile.id]: lisaIdentityProfile,
  [personalAvatarTemplate.id]: personalAvatarTemplate
};

export function getIdentityProfile(identityId) {
  return identityRegistry[identityId] || null;
}

export function listIdentityProfiles() {
  return Object.values(identityRegistry);
}
