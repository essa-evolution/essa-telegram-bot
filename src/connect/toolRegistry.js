import { isToolCategory } from "./toolCategories.js";

const internalOnly = "internal_only";

export const toolRegistry = [
  {
    id: "openai",
    name: "OpenAI",
    category: "ai_model",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["reasoning", "text_generation", "structured_output", "multimodal"],
    inputTypes: ["text", "image", "audio"],
    outputTypes: ["text", "json"],
    costLevel: "medium",
    executionMode: "cloud",
    providers: ["openai"],
    notes: "Internal AI model candidate. User-facing surface should remain ESSA."
  },
  {
    id: "claude",
    name: "Claude",
    category: "ai_model",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["reasoning", "text_generation", "long_context", "document_analysis"],
    inputTypes: ["text", "document"],
    outputTypes: ["text", "json"],
    costLevel: "premium",
    executionMode: "cloud",
    providers: ["anthropic"],
    notes: "Internal model candidate for long-form work."
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "voice",
    status: "ready",
    visibility: internalOnly,
    capabilities: ["tts", "voice_clone", "premium_voice", "multilingual_voice"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    costLevel: "premium",
    executionMode: "cloud",
    providers: ["elevenlabs"],
    notes: "Existing cloud TTS candidate. Keep behind ESSA Voice Layer."
  },
  {
    id: "piper",
    name: "Piper",
    category: "voice",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["tts", "local_tts", "cheap_tts", "offline"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    costLevel: "cheap",
    executionMode: "local",
    providers: ["piper"],
    notes: "Local TTS candidate. Adapter placeholder exists; not executed by Connect."
  },
  {
    id: "xtts",
    name: "XTTS",
    category: "voice",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["tts", "voice_clone", "premium_clone", "multilingual_voice", "local_tts"],
    inputTypes: ["text", "audio"],
    outputTypes: ["audio"],
    costLevel: "premium",
    executionMode: "local",
    providers: ["xtts"],
    notes: "Candidate for local/premium cloning experiments."
  },
  {
    id: "kokoro",
    name: "Kokoro",
    category: "voice",
    status: "research",
    visibility: internalOnly,
    capabilities: ["tts", "local_tts", "fast_tts"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    costLevel: "cheap",
    executionMode: "local",
    providers: ["kokoro"],
    notes: "Research candidate for lightweight voice generation."
  },
  {
    id: "remotion",
    name: "Remotion",
    category: "video",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["video_rendering", "programmatic_video", "composition"],
    inputTypes: ["text", "json", "assets"],
    outputTypes: ["video"],
    costLevel: "cheap",
    executionMode: "local",
    providers: ["remotion"],
    notes: "Candidate for local/programmatic video rendering."
  },
  {
    id: "capcut",
    name: "CapCut",
    category: "editing",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["editing", "video_editing", "short_video", "templates", "manual_editing"],
    inputTypes: ["video", "audio", "image", "text"],
    outputTypes: ["video"],
    costLevel: "cheap",
    executionMode: "manual",
    providers: ["capcut"],
    notes: "Potential manual/export workflow tool, not automated here."
  },
  {
    id: "suno",
    name: "Suno",
    category: "music",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["music_generation", "song_generation", "lyrics_to_music"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    costLevel: "medium",
    executionMode: "cloud",
    providers: ["suno"],
    notes: "Candidate for future music workflows."
  },
  {
    id: "leonardo",
    name: "Leonardo",
    category: "image",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["image_generation", "visual_prompt", "style_reference"],
    inputTypes: ["text", "image"],
    outputTypes: ["image"],
    costLevel: "medium",
    executionMode: "cloud",
    providers: ["leonardo"],
    notes: "Candidate for image generation."
  },
  {
    id: "runway",
    name: "Runway",
    category: "video",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["video_generation", "image_to_video", "video_editing"],
    inputTypes: ["text", "image", "video"],
    outputTypes: ["video"],
    costLevel: "premium",
    executionMode: "cloud",
    providers: ["runway"],
    notes: "Candidate for generative video."
  },
  {
    id: "kling",
    name: "Kling",
    category: "video",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["video_generation", "image_to_video", "cinematic_video"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    costLevel: "premium",
    executionMode: "cloud",
    providers: ["kling"],
    notes: "Candidate for generative video."
  },
  {
    id: "pika",
    name: "Pika",
    category: "video",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["video_generation", "short_video", "image_to_video"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    costLevel: "medium",
    executionMode: "cloud",
    providers: ["pika"],
    notes: "Candidate for short generative video."
  },
  {
    id: "n8n",
    name: "n8n",
    category: "automation",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["automation", "workflow_orchestration", "webhook", "integration"],
    inputTypes: ["json", "event"],
    outputTypes: ["json", "event"],
    costLevel: "cheap",
    executionMode: "hybrid",
    providers: ["n8n"],
    notes: "Candidate for automation orchestration."
  },
  {
    id: "dify",
    name: "Dify",
    category: "automation",
    status: "research",
    visibility: internalOnly,
    capabilities: ["agent_workflow", "rag", "app_builder"],
    inputTypes: ["text", "document", "json"],
    outputTypes: ["text", "json"],
    costLevel: "medium",
    executionMode: "hybrid",
    providers: ["dify"],
    notes: "Research candidate for agent apps."
  },
  {
    id: "flowise",
    name: "Flowise",
    category: "automation",
    status: "research",
    visibility: internalOnly,
    capabilities: ["agent_workflow", "visual_builder", "rag"],
    inputTypes: ["text", "document", "json"],
    outputTypes: ["text", "json"],
    costLevel: "cheap",
    executionMode: "hybrid",
    providers: ["flowise"],
    notes: "Research candidate for visual agent workflows."
  },
  {
    id: "open_webui",
    name: "Open WebUI",
    category: "ai_model",
    status: "research",
    visibility: internalOnly,
    capabilities: ["local_model_ui", "model_gateway", "chat"],
    inputTypes: ["text"],
    outputTypes: ["text"],
    costLevel: "cheap",
    executionMode: "local",
    providers: ["open_webui"],
    notes: "Research candidate for local model gateway."
  },
  {
    id: "playwright",
    name: "Playwright",
    category: "browser",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["browser_automation", "testing", "screenshots", "forms"],
    inputTypes: ["url", "script", "text"],
    outputTypes: ["html", "screenshot", "json"],
    costLevel: "cheap",
    executionMode: "local",
    providers: ["playwright"],
    notes: "Candidate for browser automation and UI testing."
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "search",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["web_search", "research", "source_summary"],
    inputTypes: ["text"],
    outputTypes: ["text", "sources"],
    costLevel: "medium",
    executionMode: "cloud",
    providers: ["perplexity"],
    notes: "Candidate for web research."
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    category: "search",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["web_scraping", "crawl", "extract", "markdown"],
    inputTypes: ["url"],
    outputTypes: ["markdown", "json", "html"],
    costLevel: "medium",
    executionMode: "cloud",
    providers: ["firecrawl"],
    notes: "Candidate for structured crawling and extraction."
  },
  {
    id: "essa_website_builder",
    name: "ESSA Website Builder",
    category: "website",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["website_build", "site_structure", "landing_page", "frontend_scaffold"],
    inputTypes: ["text", "json", "assets"],
    outputTypes: ["html", "css", "project"],
    costLevel: "cheap",
    executionMode: "placeholder",
    providers: ["essa"],
    notes: "Internal placeholder for future website execution. Does not run tools."
  },
  {
    id: "essa_documents",
    name: "ESSA Documents",
    category: "documents",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["document_generation", "brief_generation", "contract_draft", "export_text"],
    inputTypes: ["text", "json"],
    outputTypes: ["document", "text"],
    costLevel: "cheap",
    executionMode: "placeholder",
    providers: ["essa"],
    notes: "Internal placeholder for document assembly and export planning."
  },
  {
    id: "essa_publishing",
    name: "ESSA Publishing",
    category: "publishing",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["social_publishing", "publish_package", "caption_package", "posting_checklist"],
    inputTypes: ["text", "assets", "json"],
    outputTypes: ["text", "json"],
    costLevel: "cheap",
    executionMode: "placeholder",
    providers: ["essa"],
    notes: "Internal placeholder for publishing plans. Does not publish."
  },
  {
    id: "essa_storage",
    name: "ESSA Storage",
    category: "storage",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["project_storage", "asset_storage", "local_storage"],
    inputTypes: ["json", "assets"],
    outputTypes: ["json"],
    costLevel: "cheap",
    executionMode: "placeholder",
    providers: ["essa"],
    notes: "Internal placeholder for future storage provider selection."
  },
  {
    id: "essa_analytics",
    name: "ESSA Analytics",
    category: "analytics",
    status: "candidate",
    visibility: internalOnly,
    capabilities: ["campaign_analytics", "performance_report", "tracking_plan"],
    inputTypes: ["text", "json"],
    outputTypes: ["report", "json"],
    costLevel: "cheap",
    executionMode: "placeholder",
    providers: ["essa"],
    notes: "Internal placeholder for analytics planning. Does not read external data."
  }
];

export function listTools(filters = {}) {
  return toolRegistry.filter((tool) => {
    if (filters.category && tool.category !== filters.category) {
      return false;
    }

    if (filters.status && tool.status !== filters.status) {
      return false;
    }

    if (filters.visibility && tool.visibility !== filters.visibility) {
      return false;
    }

    return true;
  });
}

export function getTool(toolId) {
  return toolRegistry.find((tool) => tool.id === toolId) || null;
}

export function validateToolRegistry(registry = toolRegistry) {
  return registry.map((tool) => ({
    id: tool.id,
    valid: Boolean(tool.id && tool.name && isToolCategory(tool.category) && tool.status && tool.visibility),
    category: tool.category
  }));
}
