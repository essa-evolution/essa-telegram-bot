const INTENT_TRIGGERS = [
  {
    intent: "production_studio",
    triggers: [
      "production_studio",
      "essa production studio",
      "создать ролик",
      "создай ролик",
      "сделай ролик",
      "создать видео",
      "создай видео",
      "сделай видео",
      "создать shorts",
      "создай shorts",
      "сделай shorts",
      "создать reels",
      "создай reels",
      "сделай reels",
      "создать tiktok",
      "создай tiktok",
      "сделай tiktok",
      "написать книгу",
      "напиши книгу",
      "создать книгу",
      "создай книгу",
      "создать главу",
      "создай главу",
      "написать главу",
      "напиши главу",
      "создать песню",
      "создай песню",
      "написать песню",
      "напиши песню",
      "создать подкаст",
      "создай подкаст",
      "сделай подкаст",
      "создать изображение",
      "создай изображение",
      "сделай изображение",
      "создать рекламу",
      "создай рекламу",
      "сделай рекламу",
      "создать продукт essa",
      "создай продукт essa",
      "подготовить публикацию",
      "подготовь публикацию",
      "сделай публикацию",
      "размножить контент",
      "сделать медиапакет",
      "медиапакет из главы",
      "из главы сделать контент",
      "из главы сделать подкаст",
      "из текста сделать ролики",
      "из текста сделать подкаст и shorts",
      "нарезать на shorts",
      "нарезать на reels",
      "нарезать на tiktok",
      "content multiplication",
      "media package",
      "создай мультфильм",
      "создать мультфильм",
      "сделай мультфильм",
      "сделать мультфильм",
      "анимационная история",
      "создай мини-фильм",
      "создать мини-фильм",
      "документальный фильм",
      "художественный фильм",
      "музыкальный клип",
      "клип на песню",
      "детская сказка",
      "детскую сказку",
      "youtube-канал",
      "youtube канал",
      "youtube-серия",
      "youtube-серию",
      "youtube серия",
      "youtube серию",
      "образовательная анимация"
    ]
  },
  {
    intent: "digital_identity",
    triggers: [
      "цифровая личность",
      "создать цифровую личность",
      "создай цифровую личность",
      "создать аватар",
      "создай аватар",
      "создай мне аватар",
      "аватар лисы",
      "говорящий аватар",
      "поющий аватар",
      "digital identity",
      "avatar",
      "lisa avatar"
    ]
  },
  {
    intent: "project_factory",
    triggers: [
      "проект дома",
      "дом с нуля",
      "архитектура дома",
      "проектный пакет",
      "построить дом",
      "строительный проект",
      "пакет для архитектора"
    ]
  },
  {
    intent: "content_factory",
    triggers: [
      "ролик",
      "видео",
      "shorts",
      "short",
      "reels",
      "рилс",
      "контент",
      "пост для",
      "публикация",
      "сценарий для видео",
      "тикток",
      "tiktok",
      "youtube shorts",
      "instagram reels"
    ]
  },
  {
    intent: "website_studio",
    triggers: ["сайт", "лендинг", "website", "web site", "страница сайта", "структура сайта", "тз на сайт"]
  },
  {
    intent: "marketing_factory",
    triggers: ["реклама", "маркетинг", "оффер", "воронка", "smm", "таргет", "кампания", "продвижение"]
  },
  {
    intent: "legal_preparation",
    triggers: ["договор", "контракт", "юрид", "иск", "претензия", "соглашение", "terms", "privacy policy"]
  },
  {
    intent: "document_factory",
    triggers: ["документ", "письмо", "презентация", "техническое задание", "тз", "резюме", "отчёт", "отчет"]
  },
  {
    intent: "travel_planner",
    triggers: ["переехать", "путешествие", "поездка", "маршрут", "виза", "португали", "релокация", "travel"]
  },
  {
    intent: "business_strategy",
    triggers: [
      "essa business",
      "развить бизнес",
      "развитие бизнеса",
      "у меня есть бизнес",
      "помогите его развить",
      "передать развитие бизнеса",
      "бизнес-стратег",
      "бизнес стратег",
      "стратегия бизнеса",
      "бизнес-план",
      "бизнес план",
      "модель бизнеса"
    ]
  },
  {
    intent: "education_path",
    triggers: ["обучиться", "курс", "учебный план", "образование", "научиться", "программа обучения"]
  },
  {
    intent: "essa_path",
    triggers: ["путь essa", "путь эсса", "путь лисы", "исследовать себя", "путь к себе"]
  },
  {
    intent: "property",
    triggers: ["квартира", "недвижимость", "апартаменты", "дом в", "батум", "batumi", "property", "аренда", "купить жиль"]
  },
  {
    intent: "product_essa",
    triggers: ["продукт essa", "продукт эсса", "essa product", "упаковать продукт", "продуктовая линейка"]
  }
];

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

const PRODUCTION_HINT_TRIGGERS = [
  "production_studio",
  "essa production studio",
  "selected card:"
];

const PRODUCTION_REQUEST_TRIGGERS = [
  "создать ролик",
  "создай ролик",
  "сделай ролик",
  "создать видео",
  "создай видео",
  "сделай видео",
  "создать shorts",
  "создай shorts",
  "сделай shorts",
  "создать reels",
  "создай reels",
  "сделай reels",
  "создать tiktok",
  "создай tiktok",
  "сделай tiktok",
  "написать книгу",
  "напиши книгу",
  "создать книгу",
  "создай книгу",
  "создать песню",
  "создай песню",
  "написать песню",
  "напиши песню",
  "создать подкаст",
  "создай подкаст",
  "сделай подкаст",
  "создать рекламу",
  "создай рекламу",
  "сделай рекламу",
  "подготовить публикацию",
  "подготовь публикацию",
  "сделай публикацию",
  "размножить контент",
  "сделать медиапакет",
  "медиапакет из главы",
  "из главы сделать контент",
  "из главы сделать подкаст",
  "из текста сделать ролики",
  "из текста сделать подкаст и shorts",
  "нарезать на shorts",
  "нарезать на reels",
  "нарезать на tiktok",
  "content multiplication",
  "media package",
  "создай мультфильм",
  "создать мультфильм",
  "сделай мультфильм",
  "сделать мультфильм",
  "анимационная история",
  "создай мини-фильм",
  "создать мини-фильм",
  "документальный фильм",
  "художественный фильм",
  "музыкальный клип",
  "клип на песню",
  "детская сказка",
  "детскую сказку",
  "youtube-канал",
  "youtube канал",
  "youtube-серия",
  "youtube-серию",
  "youtube серия",
  "youtube серию",
  "образовательная анимация"
];

function findTrigger(text, triggers) {
  return triggers.find((trigger) => text.includes(trigger)) || "";
}

export function analyzeWorkspaceIntent(userText) {
  const text = normalizeText(userText);

  if (!text) {
    return {
      intent: "none",
      source: "empty",
      hint: ""
    };
  }

  const productionHint = findTrigger(text, PRODUCTION_HINT_TRIGGERS);

  if (productionHint) {
    return {
      intent: "production_studio",
      source: "production_hint",
      hint: productionHint
    };
  }

  const productionRequest = findTrigger(text, PRODUCTION_REQUEST_TRIGGERS);

  if (productionRequest) {
    return {
      intent: "production_studio",
      source: "production_request",
      hint: productionRequest
    };
  }

  const match = INTENT_TRIGGERS.find(({ triggers }) =>
    triggers.some((trigger) => text.includes(trigger))
  );

  return {
    intent: match?.intent || "none",
    source: match ? "workspace_trigger" : "none",
    hint: match ? findTrigger(text, match.triggers) : ""
  };
}

export function detectWorkspaceIntent(userText) {
  return analyzeWorkspaceIntent(userText).intent;
}

export const workspaceIntentTriggers = INTENT_TRIGGERS;
