const intentRules = [
  {
    intent: "digital_identity",
    patterns: [
      "цифровая личность",
      "создать цифровую личность",
      "создай цифровую личность",
      "создать аватар",
      "создай аватар",
      "создай мне аватар",
      "аватар лисы",
      "lisa avatar",
      "talking avatar",
      "speaking avatar",
      "singing avatar",
      "говорящий аватар",
      "поющий аватар"
    ]
  },
  {
    intent: "production",
    patterns: [
      "создай ролик",
      "создать ролик",
      "создай видео",
      "создать видео",
      "shorts",
      "reels",
      "tiktok",
      "напиши книгу",
      "создай песню",
      "создай подкаст",
      "подготовь публикацию",
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
      "сделать мультфильм",
      "анимационная история",
      "создай мини-фильм",
      "документальный фильм",
      "художественный фильм",
      "музыкальный клип",
      "клип на песню",
      "детская сказка",
      "youtube-канал",
      "youtube канал",
      "youtube-серия",
      "youtube серия",
      "образовательная анимация"
    ]
  },
  {
    intent: "website",
    patterns: ["сделай сайт", "создай сайт", "website", "лендинг", "landing"]
  },
  {
    intent: "property",
    patterns: ["квартира", "дом", "недвижимость", "батиуми", "batumi", "аренда", "купить жилье"]
  },
  {
    intent: "marketing",
    patterns: ["маркетинг", "кампания", "продвижение", "воронка", "лиды"]
  },
  {
    intent: "legal",
    patterns: ["договор", "контракт", "юрид", "иск", "заявление", "документы"]
  },
  {
    intent: "travel",
    patterns: ["путешествие", "поездка", "маршрут", "билеты", "отель"]
  },
  {
    intent: "education",
    patterns: ["обучение", "курс", "научиться", "путь essa", "путь эсса", "пройти путь"]
  },
  {
    intent: "psychology",
    patterns: ["психолог", "тревога", "отношения", "самооценка", "выгорание"]
  },
  {
    intent: "product_essa",
    patterns: ["продукт essa", "essa product", "создай продукт essa", "продукт эсса"]
  }
];

export function detectCoreIntent(userText = "") {
  const text = String(userText).toLowerCase();

  if (
    text.includes("production_studio") ||
    text.includes("production action key:") ||
    text.includes("target workflow: production_book") ||
    text.includes("создать главу") ||
    text.includes("создай главу") ||
    text.includes("написать главу") ||
    text.includes("напиши главу") ||
    text.includes("создать книгу") ||
    text.includes("создай книгу") ||
    text.includes("написать книгу") ||
    text.includes("напиши книгу") ||
    text === "глава" ||
    text === "книга"
  ) {
    return "production";
  }

  if (text.includes("создай рекламу") || text.includes("создать рекламу")) {
    return "marketing";
  }

  const rule = intentRules.find((item) => item.patterns.some((pattern) => text.includes(pattern)));
  return rule?.intent || "unknown";
}

export function listCoreIntents() {
  return [...intentRules.map((rule) => rule.intent), "unknown"];
}
