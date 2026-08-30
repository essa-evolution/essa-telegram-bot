export const workflowRegistry = {
  digital_identity_profile: {
    id: "digital_identity_profile",
    title: "Digital Identity Profile Workflow",
    type: "digital_identity",
    steps: [
      "identity_purpose",
      "visual_identity",
      "voice_identity",
      "personality",
      "style_prompts",
      "reference_assets",
      "avatar_video_brief",
      "export_identity_passport"
    ]
  },
  production_video: {
    id: "production_video",
    title: "Production Video Workflow",
    type: "production",
    steps: ["idea", "concept", "script", "voice", "visual_style", "assets", "editing", "publication", "final_review"]
  },
  production_book: {
    id: "production_book",
    title: "Production Book Workflow",
    type: "production",
    steps: ["idea", "audience", "structure", "chapter_plan", "voice_style", "draft", "editing", "publication"]
  },
  production_song: {
    id: "production_song",
    title: "Production Song Workflow",
    type: "production",
    steps: ["idea", "genre", "mood", "lyrics", "melody_direction", "arrangement", "recording_plan", "release"]
  },
  production_ad: {
    id: "production_ad",
    title: "Production Ad Workflow",
    type: "production",
    steps: ["offer", "audience", "platform", "message", "creative", "copy", "assets", "launch_package"]
  },
  production_cartoon: {
    id: "production_cartoon",
    title: "Production Cartoon Workflow",
    type: "production",
    steps: ["idea", "script", "characters", "scenes", "visual_prompts", "voice", "editing_plan", "publication"]
  },
  production_animated_story: {
    id: "production_animated_story",
    title: "Production Animated Story Workflow",
    type: "production",
    steps: ["idea", "script", "characters", "scenes", "visual_prompts", "voice", "editing_plan", "publication"]
  },
  production_documentary: {
    id: "production_documentary",
    title: "Production Documentary Workflow",
    type: "production",
    steps: ["topic", "structure", "facts", "narration_script", "visual_blocks", "editing_plan", "publication"]
  },
  production_film: {
    id: "production_film",
    title: "Production Film Workflow",
    type: "production",
    steps: ["idea", "script", "characters", "scenes", "visual_prompts", "voice", "editing_plan", "publication"]
  },
  production_music_video: {
    id: "production_music_video",
    title: "Production Music Video Workflow",
    type: "production",
    steps: ["song", "visual_concept", "scenes", "prompts", "editing", "cover", "publication"]
  },
  content_multiplication_package: {
    id: "content_multiplication_package",
    title: "Content Multiplication Package Workflow",
    type: "production",
    steps: [
      "source_intake",
      "meaning_extraction",
      "content_map",
      "long_form_podcast",
      "shorts_package",
      "tiktok_package",
      "reels_package",
      "visual_pack",
      "music_pack",
      "lisa_voice_pack",
      "translation_pack",
      "publication_pack",
      "schedule",
      "approval",
      "result_package"
    ]
  },
  website_project: {
    id: "website_project",
    title: "Website Project Workflow",
    type: "website",
    steps: ["goal", "audience", "structure", "content", "design_direction", "build_plan", "launch_check"]
  },
  property_request: {
    id: "property_request",
    title: "Property Request Workflow",
    type: "property",
    steps: ["location", "budget", "property_type", "criteria", "documents", "next_action"]
  },
  marketing_campaign: {
    id: "marketing_campaign",
    title: "Marketing Campaign Workflow",
    type: "marketing",
    steps: ["goal", "audience", "offer", "channels", "creative", "budget", "launch_plan"]
  },
  business_growth: {
    id: "business_growth",
    title: "ESSA Business Growth Workflow",
    type: "business",
    steps: ["business_profile", "intake", "diagnosis", "growth_plan", "offer_draft", "approval", "project_workspace"]
  },
  legal_preparation: {
    id: "legal_preparation",
    title: "Legal Preparation Workflow",
    type: "legal",
    steps: ["request", "jurisdiction", "documents", "risks", "questions", "next_action"]
  },
  travel_plan: {
    id: "travel_plan",
    title: "Travel Plan Workflow",
    type: "travel",
    steps: ["destination", "dates", "budget", "style", "route", "documents", "booking_plan"]
  },
  education_path: {
    id: "education_path",
    title: "Education Path Workflow",
    type: "education",
    steps: ["goal", "current_level", "format", "schedule", "materials", "practice_plan"]
  },
  product_essa: {
    id: "product_essa",
    title: "ESSA Product Workflow",
    type: "product_essa",
    steps: ["idea", "user", "value", "structure", "prototype", "assets", "release_plan"]
  }
};

export function getWorkflow(workflowId) {
  return workflowRegistry[workflowId] || null;
}

export function listWorkflows() {
  return Object.values(workflowRegistry);
}
