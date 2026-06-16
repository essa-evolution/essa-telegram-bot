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
    category: "navigator_prompt",
    title: "Navigator Core System",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/00_CORE_SYSTEM.txt.docx"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Guidance Mode",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/01_GUIDANCE_MODE.txt.docx"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Behavior Rules",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/02_BEHAVIOR_RULES.txt.docx"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Action Logic",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/03_ACTION_LOGIC.txt.docx"
  },
  {
    category: "navigator_prompt",
    title: "Navigator Memory Rules",
    path: "02_AGENTS/00_AGENT_CORE/07_NAVIGATOR/04_MEMORY_RULES.docx"
  },
  {
    category: "lisa_identity",
    title: "Lisa Identity",
    path: "02_AGENTS/07_LISA/00_CORE/LISA_IDENTITY.txt.docx"
  },
  {
    category: "memory_architecture",
    title: "ESSA Memory Architecture",
    path: "09_INFRASTRUCTURE/04_MEMORY_SYSTEM/ESSA_MEMORY_ARCHITECTURE.docx"
  },
  {
    category: "voice_architecture",
    title: "ESSA Voice Architecture",
    path: "09_INFRASTRUCTURE/03_VOICE_SYSTEM/ESSA_VOICE_ARCHITECTURE.docx"
  },
  {
    category: "content_factory",
    title: "Content Factory Pipeline",
    path: "09_INFRASTRUCTURE/15_AI_KNOWLEDGE_SYSTEMS/48_CONTENT_FACTORY_PIPELINE/00_OVERVIEW.docx"
  },
  {
    category: "content_system",
    title: "Lisa Living Dialogues",
    path: "ESSA_CONTENT_SYSTEM/LISA_LIVING_DIALOGUES.md",
    priority: "high"
  },
  {
    category: "central_control",
    title: "Central Control Layer",
    path: "09_INFRASTRUCTURE/15_AI_KNOWLEDGE_SYSTEMS/44_CENTRAL_CONTROL_LAYER/00_OVERVIEW.docx"
  }
];

const PRIORITY_IDENTITY_DOCS = CORE_DOCS.filter(
  (doc) => doc.category === "lisa_identity" && doc.priority === "critical"
);

module.exports = { CORE_DOCS, PRIORITY_IDENTITY_DOCS };
