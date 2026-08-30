const NEEDS_USER_DECISION = "NEEDS_USER_DECISION";
const PLATFORM_RULE_REQUIRED = "PLATFORM_RULE_REQUIRED";

function platformProfile(platform) {
  return {
    platform,
    aspectRatio: PLATFORM_RULE_REQUIRED,
    preferredDuration: NEEDS_USER_DECISION,
    maxDuration: PLATFORM_RULE_REQUIRED,
    safeZones: PLATFORM_RULE_REQUIRED,
    subtitleConstraints: PLATFORM_RULE_REQUIRED,
    platformUiObstructions: PLATFORM_RULE_REQUIRED,
    audioConstraints: PLATFORM_RULE_REQUIRED,
    exportRequirements: PLATFORM_RULE_REQUIRED
  };
}

export const lisaProductionProfile = {
  profileId: "lisa_production_profile",
  identityId: "lisa",

  productionPrinciples: [
    "Meaning is more important than effects.",
    "Editing must support the material, not exist for its own sake.",
    "Lisa remains the main carrier when the source material is built around her presence.",
    "A pause, gaze, laugh, breath, reaction or silence can be meaningful material.",
    "There is no mandatory high-dynamic edit; the edit must adapt to the current material."
  ],
  contentPriority: [
    "meaning",
    "Lisa presence",
    "voice and intelligibility",
    "human reaction",
    "dynamic expression",
    "visual support"
  ],
  authenticityRules: [
    "Do not turn Lisa material into generic social-media noise.",
    "Do not hide Lisa behind endless inserts when her face, voice or pause carries the meaning.",
    "Do not force one production template onto all Lisa content.",
    "Do not split dynamic expressions into separate Lisa personas."
  ],

  visualIdentityRules: {
    sourceRef: "src/identity/lisaIdentityProfile.js#visualIdentity",
    principles: [
      "Preserve Lisa visual identity and recognizability.",
      "Visual support must not contradict the established natural, living Lisa identity."
    ]
  },
  voiceRules: {
    sourceRef: "src/identity/voiceUsagePolicy.js",
    principles: [
      "Lisa voice belongs to Lisa identity and follows the voice usage policy.",
      "Speech and meaning have priority over music and effects.",
      "Do not automatically censor or add profanity; follow DynamicExpressionContext.profanityMode."
    ]
  },
  audioRules: {
    principles: [
      "Audio must preserve speech intelligibility.",
      "Sound effects must not disrupt an emotional or semantic moment."
    ],
    unresolved: {
      loudnessTargets: NEEDS_USER_DECISION,
      mixingRules: NEEDS_USER_DECISION
    }
  },

  editingPrinciples: [
    "Select editing mode from the current material and expression context.",
    "Preserve meaningful pauses and reactions.",
    "Avoid decorative edits that weaken the thought."
  ],
  pacingPrinciples: [
    "Pacing may be dense, conversational, minimal, cinematic, observational or another suitable mode.",
    "Pacing intent belongs to the concrete ProductionIntent, not to Lisa as a permanent trait."
  ],
  cutPrinciples: [
    "Cut to clarify, compress or strengthen the material.",
    "Do not automatically remove pauses, laughter, breath, silence or gaze when they carry meaning."
  ],
  zoomPrinciples: [
    "Zooms may emphasize reaction, punchline, thought shift or intimacy.",
    "Do not use zooms as constant decoration."
  ],
  bRollPrinciples: [
    "Use B-roll when it visualizes thought, creates comedic counterpoint, shows an object/event, supports long storytelling or strengthens the narrative.",
    "Avoid B-roll when Lisa's face/reaction is stronger, when it breaks an emotional moment, or when it creates visual clutter."
  ],
  imageInsertPrinciples: [
    "Image inserts are contextual support, not a fixed frequency.",
    "Image inserts must not replace Lisa when Lisa is the stronger carrier of meaning."
  ],

  subtitlePrinciples: {
    stable: [
      "Subtitles must be readable.",
      "Subtitles must not cover Lisa's face.",
      "Subtitles must account for platform UI safe zones.",
      "Subtitles must support meaning without turning the video into visual noise."
    ],
    styleConfiguration: {
      font: NEEDS_USER_DECISION,
      size: NEEDS_USER_DECISION,
      colors: NEEDS_USER_DECISION,
      highlightMode: NEEDS_USER_DECISION,
      background: NEEDS_USER_DECISION,
      shadow: NEEDS_USER_DECISION,
      animation: NEEDS_USER_DECISION,
      wordsPerLine: NEEDS_USER_DECISION,
      presets: NEEDS_USER_DECISION
    }
  },
  typographyPreferences: {
    status: NEEDS_USER_DECISION,
    note: "Phase 16B keeps typography open for later subtitle preset decisions."
  },

  musicPrinciples: [
    "Music is optional.",
    "Music may be none, subtle background, rhythmic, ironic/comedic, cinematic or emotional depending on the material.",
    "Voice and meaning have priority over music."
  ],
  brandingRules: {
    logo: NEEDS_USER_DECISION,
    watermark: NEEDS_USER_DECISION,
    intro: NEEDS_USER_DECISION,
    outro: NEEDS_USER_DECISION
  },
  ctaPrinciples: {
    status: NEEDS_USER_DECISION,
    note: "CTA style should not be forced before first tests."
  },

  durationPreferences: {
    preferred: NEEDS_USER_DECISION,
    maximum: PLATFORM_RULE_REQUIRED
  },
  aspectRatioPreferences: {
    defaultShortForm: PLATFORM_RULE_REQUIRED,
    note: "Exact platform requirements belong to platform rules."
  },
  platformProfiles: {
    TikTok: platformProfile("TikTok"),
    InstagramReels: platformProfile("Instagram Reels"),
    YouTubeShorts: platformProfile("YouTube Shorts")
  },

  adaptiveEditingPolicy: {
    reasoningOrder: [
      "Lisa Character Core",
      "Dynamic Expression Context",
      "Current Content / Transcript / Video",
      "Platform / User Goal",
      "Lisa Production Profile",
      "Production Intent",
      "Edit Plan"
    ],
    rule: "LisaProductionProfile must guide adaptive decisions, not force one edit template."
  },

  forbiddenPatterns: [
    "Generic social-media noise",
    "Effects that distract from Lisa or the thought",
    "Automatic high-dynamic editing for every material",
    "Automatic B-roll every fixed number of seconds",
    "Automatic profanity insertion",
    "Automatic profanity censorship without platform/distribution reason",
    "Turning Lisa into a motivational influencer, generic coach or polished spiritual psychologist"
  ],
  qualityRules: [
    "Final artifact exists.",
    "Target aspect ratio is followed.",
    "Duration matches ProductionIntent and platform constraints.",
    "Audio exists and speech is intelligible.",
    "Subtitles are present if required by ProductionIntent.",
    "Subtitles respect safe-zone requirements.",
    "No broken, black or frozen frames.",
    "No missing assets.",
    "Lisa identity remains consistent.",
    "Visual clutter is absent.",
    "Meaningful preserved moments were not accidentally removed.",
    "ProductionIntent is followed.",
    "Forbidden patterns are absent."
  ],
  approvalRules: [
    "External publishing requires approval.",
    "Voice and identity usage follow existing voice usage policy.",
    "Provider/tool selection is handled later by capability routing."
  ],

  sourceRefs: [
    "02_AGENTS/07_LISA/00_CORE/LISA_MOLIS_IDENTITY.txt",
    "02_AGENTS/07_LISA/00_CORE/LISA_CHARACTER_CORE.md",
    "src/identity/lisaIdentityProfile.js",
    "src/identity/voiceUsagePolicy.js",
    "src/identity/dynamicExpressionContext.js"
  ],
  unresolved: {
    requiredBeforeFirstMvp: [
      "Choose the first test source video/material.",
      "Choose the first target platform for the vertical slice.",
      "Choose whether subtitles are required for the first MVP."
    ],
    canBeLearnedFromFirstTests: [
      "Preferred edit density by material type.",
      "Subtitle preset taste.",
      "Music/no-music preference by expression mode.",
      "B-roll tolerance and visual insert style.",
      "CTA tone."
    ],
    canBePlatformDerived: [
      "Aspect ratio.",
      "Maximum duration.",
      "Safe zones.",
      "Platform UI obstructions.",
      "Export requirements.",
      "Distribution profanity/compliance constraints."
    ],
    optionalBranding: [
      "Logo.",
      "Watermark.",
      "Intro.",
      "Outro."
    ]
  }
};

export function getLisaProductionProfile(identityId = "lisa") {
  return identityId === lisaProductionProfile.identityId ? lisaProductionProfile : null;
}

export { NEEDS_USER_DECISION, PLATFORM_RULE_REQUIRED };
