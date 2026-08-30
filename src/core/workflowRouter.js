import { getWorkflow } from "./workflowRegistry.js";

function detectProductionWorkflow(userText) {
  const text = String(userText || "").toLowerCase();

  if (
    text.includes("размножить контент") ||
    text.includes("сделать медиапакет") ||
    text.includes("медиапакет из главы") ||
    text.includes("из главы сделать контент") ||
    text.includes("из главы сделать подкаст") ||
    text.includes("из текста сделать ролики") ||
    text.includes("из текста сделать подкаст и shorts") ||
    text.includes("нарезать на shorts") ||
    text.includes("нарезать на reels") ||
    text.includes("нарезать на tiktok") ||
    text.includes("content multiplication") ||
    text.includes("media package")
  ) {
    return "content_multiplication_package";
  }

  if (text.includes("образовательная анимация")) {
    return "production_animated_story";
  }

  if (text.includes("анимационная история")) {
    return "production_animated_story";
  }

  if (text.includes("мультфильм") || text.includes("детская сказка") || text.includes("сказочный канал")) {
    return "production_cartoon";
  }

  if (text.includes("документальный фильм")) {
    return "production_documentary";
  }

  if (text.includes("музыкальный клип") || text.includes("клип на песню")) {
    return "production_music_video";
  }

  if (text.includes("youtube-серия") || text.includes("youtube серия") || text.includes("youtube-канал") || text.includes("youtube канал")) {
    return "production_animated_story";
  }

  if (text.includes("мини-фильм") || text.includes("художественный фильм")) {
    return "production_film";
  }

  if (text.includes("книг") || text.includes("глав")) {
    return "production_book";
  }

  if (text.includes("песн") || text.includes("музык")) {
    return "production_song";
  }

  if (text.includes("реклам")) {
    return "production_ad";
  }

  return "production_video";
}

export function selectWorkflow(intent, userText = "") {
  const workflowIdByIntent = {
    digital_identity: "digital_identity_profile",
    website: "website_project",
    property: "property_request",
    marketing: "marketing_campaign",
    legal: "legal_preparation",
    travel: "travel_plan",
    education: "education_path",
    psychology: "education_path",
    product_essa: "product_essa",
    unknown: null
  };

  const workflowId = intent === "production"
    ? detectProductionWorkflow(userText)
    : workflowIdByIntent[intent];

  return workflowId ? getWorkflow(workflowId) : null;
}
