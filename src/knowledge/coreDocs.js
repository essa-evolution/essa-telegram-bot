const CORE_DOCS = [
  {
    category: "lisa_identity",
    title: "Lisa Molis Identity",
    path: "02_AGENTS/07_LISA/00_CORE/LISA_MOLIS_IDENTITY.txt",
    layer: "core_identity",
    priority: "critical",
    sourceOfTruthFor: [
      "Lisa Molis identity",
      "ESSA Evolution authorship",
      "ESSA OS authorship",
      "ESSA Navigator authorship",
      "LISA Agent authorship",
      "Living Cards authorship",
      "ESSA ecosystem origin"
    ]
  },

  {
    category: "presence_system",
    title: "Presence Principles",
    path: "ESSA_PRESENCE_SYSTEM/01_PRESENCE_PRINCIPLES.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "Emotional Intelligence Layer",
    path: "ESSA_PRESENCE_SYSTEM/02_EMOTIONAL_INTELLIGENCE_LAYER.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "Support System",
    path: "ESSA_PRESENCE_SYSTEM/03_SUPPORT_SYSTEM.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "Journey Memory",
    path: "ESSA_PRESENCE_SYSTEM/04_JOURNEY_MEMORY.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "Companion Mode",
    path: "ESSA_PRESENCE_SYSTEM/05_COMPANION_MODE.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "Human Warmth Engine",
    path: "ESSA_PRESENCE_SYSTEM/06_HUMAN_WARMTH_ENGINE.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "ESSA Language System",
    path: "ESSA_PRESENCE_SYSTEM/07_ESSA_LANGUAGE_SYSTEM.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "Lisa Mode",
    path: "ESSA_PRESENCE_SYSTEM/08_LISA_MODE.md",
    layer: "presence_system"
  },
  {
    category: "presence_system",
    title: "ESSA Response Philosophy",
    path: "ESSA_PRESENCE_SYSTEM/09_ESSA_RESPONSE_PHILOSOPHY.md",
    layer: "presence_system",
    priority: "high"
  },
  {
    category: "presence_system",
    title: "ESSA Response Examples",
    path: "ESSA_PRESENCE_SYSTEM/10_ESSA_RESPONSE_EXAMPLES.md",
    layer: "presence_system",
    priority: "high"
  },
  {
    category: "presence_system",
    title: "ESSA Personality Core",
    path: "ESSA_PRESENCE_SYSTEM/11_ESSA_PERSONALITY_CORE.md",
    layer: "presence_system",
    priority: "high"
  },
  {
    category: "presence_system",
    title: "Telegram Presence Test Prompts",
    path: "ESSA_PRESENCE_SYSTEM/TELEGRAM_TEST_PROMPTS.md",
    layer: "presence_system",
    priority: "medium"
  },
  {
    category: "presence_system",
    title: "Presence Engine",
    path: "ESSA_AGENT_SYSTEM/17_PRESENCE_ENGINE.md",
    layer: "presence_system",
    priority: "high"
  },
  {
    category: "presence_system",
    title: "Response Engine",
    path: "ESSA_AGENT_SYSTEM/18_RESPONSE_ENGINE.md",
    layer: "presence_system",
    priority: "high"
  },

  {
    category: "navigator_prompt",
    title: "Navigator Core System",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/00_CORE_SYSTEM.txt"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Guidance Mode",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/01_GUIDANCE_MODE.txt"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Behavior Rules",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/02_BEHAVIOR_RULES.txt"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Action Logic",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/03_ACTION_LOGIC.txt"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Memory Rules",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/04_MEMORY_RULES.txt"
  },
  {
    category: "lisa_identity",
    title: "Lisa Identity",
    path: "02_AGENTS/07_LISA/00_CORE/LISA_MOLIS_IDENTITY.txt"
  },
  {
    category: "content_system",
    title: "Lisa Living Dialogues",
    path: "ESSA_CONTENT_SYSTEM/LISA_LIVING_DIALOGUES.md",
    priority: "high"
  },

  {
    category: "memory_system",
    title: "Adaptive Lexicon Memory",
    path: "ESSA_MEMORY_SYSTEM/01_ADAPTIVE_LEXICON_MEMORY.md",
    priority: "high"
  },
  {
    category: "memory_system",
    title: "ESSA Vocabulary Memory",
    path: "ESSA_MEMORY_SYSTEM/02_ESSA_VOCABULARY_MEMORY.md",
    priority: "high"
  },
  {
    category: "memory_system",
    title: "Living Vocabulary",
    path: "ESSA_MEMORY_SYSTEM/03_LIVING_VOCABULARY.md",
    priority: "medium"
  },
  {
    category: "memory_system",
    title: "Words Of New Era",
    path: "ESSA_MEMORY_SYSTEM/04_WORDS_OF_NEW_ERA.md",
    priority: "medium"
  },
  {
    category: "memory_system",
    title: "User Profile Memory",
    path: "ESSA_MEMORY_SYSTEM/05_USER_PROFILE_MEMORY.md",
    priority: "medium"
  },
  {
    category: "memory_system",
    title: "Session Memory",
    path: "ESSA_MEMORY_SYSTEM/06_SESSION_MEMORY.md",
    priority: "medium"
  },
  {
    category: "memory_system",
    title: "Project Memory",
    path: "ESSA_MEMORY_SYSTEM/07_PROJECT_MEMORY.md",
    priority: "medium"
  },
  {
    category: "memory_system",
    title: "Summary Memory",
    path: "ESSA_MEMORY_SYSTEM/08_SUMMARY_MEMORY.md",
    priority: "medium"
  },
  {
    category: "memory_system",
    title: "Vector User Memory",
    path: "ESSA_MEMORY_SYSTEM/09_VECTOR_USER_MEMORY.md",
    priority: "medium"
  },

  {
    category: "cognitive_system",
    title: "ESSA Soul Recognition",
    path: "ESSA_COGNITIVE_SYSTEM/12_ESSA_SOUL_RECOGNITION.md",
    priority: "high"
  },
  {
    category: "cognitive_system",
    title: "ESSA Cognitive Navigation",
    path: "ESSA_COGNITIVE_SYSTEM/13_ESSA_COGNITIVE_NAVIGATION.md",
    priority: "high"
  },
  {
    category: "cognitive_system",
    title: "ESSA Cognitive Reasoning Layer",
    path: "ESSA_COGNITIVE_SYSTEM/16_ESSA_COGNITIVE_REASONING_LAYER.md",
    priority: "high"
  },
  {
    category: "cognitive_system",
    title: "Reflection System",
    path: "ESSA_COGNITIVE_SYSTEM/14_REFLECTION_SYSTEM.md",
    priority: "medium"
  },
  {
    category: "cognitive_system",
    title: "State Recognition",
    path: "ESSA_COGNITIVE_SYSTEM/15_STATE_RECOGNITION.md",
    priority: "medium"
  },

  {
    category: "agent_system",
    title: "Personal Agent Layer",
    path: "ESSA_AGENT_SYSTEM/16_PERSONAL_AGENT_LAYER.md",
    priority: "medium"
  }
];

const PRIORITY_IDENTITY_DOCS = CORE_DOCS.filter(
  (doc) => doc.category === "lisa_identity" && doc.priority === "critical"
);

module.exports = { CORE_DOCS, PRIORITY_IDENTITY_DOCS };

