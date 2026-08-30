import { formatWorkflowStartReply } from "./projectWorkflowEngine.js";

const FINAL_CONTEXT_MARKER = "ESSA_PRODUCTION_WORKFLOW_FINAL_CONTEXT";

const INTAKE_BY_ACTION = {
  video: {
    title: "ролик",
    intake: `🌿 Отлично.

Я помогу создать ролик — от идеи до полностью готового результата.

Мы можем пройти весь путь вместе.

Для начала помогите мне немного понять вашу задачу.

### 1. О чём будет ролик?

(свободный ответ)

### 2. Где он будет опубликован?

* TikTok
* Reels
* Shorts
* Telegram
* YouTube
* Другое

### 3. Какую задачу должен решить ролик?

* Привлечь внимание
* Продать
* Рассказать историю
* Вдохновить
* Обучить
* Другое

### 4. Что уже есть?

* Только идея
* Текст
* Видео
* Фото
* Голос
* Музыка
* Несколько материалов
* Всё готово

### 5. Как будем работать?

🟢 Старт → Финиш

ESSA сама проведёт весь путь до готового проекта.

или

🔵 Пошагово

Мы будем создавать проект вместе, шаг за шагом.`
  },
  short: {
    title: "короткий ролик",
    intro: "Отлично. Я помогу создать короткий ролик от идеи до готового материала.",
    questions: [
      "О чём ролик?",
      "Для какой платформы: TikTok, Reels, Shorts или другая?",
      "Какой стиль нужен: быстрый, экспертный, эмоциональный, продающий, вдохновляющий?",
      "Какой результат нужен: просмотры, подписки, заявки, продажи, узнаваемость?",
      "Есть ли уже материалы или начинаем с нуля?"
    ]
  },
  book: {
    title: "книгу",
    intro: "Отлично. Я помогу собрать книгу от идеи до ясной структуры.",
    questions: [
      "О чём книга?",
      "Для кого она создаётся?",
      "Какой жанр или формат нужен: нон-фикшн, художественная, автобиографическая, практическая, духовная, экспертная?",
      "Какой главный результат должен получить читатель?",
      "Есть ли уже материалы: заметки, главы, голосовые мысли, история, план?"
    ]
  },
  chapter: {
    title: "главу",
    intro: "Отлично. Я помогу создать главу так, чтобы она работала внутри всей книги.",
    questions: [
      "О чём должна быть глава?",
      "Для какой книги или темы она создаётся?",
      "Какой стиль нужен: личный, экспертный, художественный, практический, глубокий?",
      "Что читатель должен понять или почувствовать после главы?",
      "Есть ли уже план книги или предыдущие главы?"
    ]
  },
  song: {
    title: "песню",
    intro: "Отлично. Я помогу создать песню от настроения до текста и музыкального направления.",
    questions: [
      "О чём песня?",
      "Какое настроение нужно: нежное, сильное, драматичное, светлое, танцевальное, медитативное?",
      "Какой жанр или референсы ближе?",
      "От чьего лица звучит песня?",
      "Нужен только текст или ещё структура, стиль, припев и направление музыки?"
    ]
  },
  podcast: {
    title: "подкаст",
    intro: "Отлично. Я помогу собрать подкаст от идеи до выпуска.",
    questions: [
      "О чём выпуск?",
      "Для кого он создаётся?",
      "Какой формат нужен: монолог, интервью, история, разбор, медитативный выпуск?",
      "Какой тон нужен: спокойный, экспертный, живой, провокационный, вдохновляющий?",
      "Какая длительность и где планируется публикация?"
    ]
  },
  image: {
    title: "изображение",
    intro: "Отлично. Я помогу подготовить изображение от идеи до точного визуального задания.",
    questions: [
      "Что должно быть на изображении?",
      "Для чего оно нужно: пост, обложка, реклама, сайт, презентация, продукт?",
      "Какой стиль нужен: реалистичный, кинематографичный, минималистичный, luxury, editorial, иллюстрация?",
      "Какие цвета, настроение или референсы важны?",
      "Нужен текст на изображении или только визуал?"
    ]
  },
  ad: {
    title: "рекламу",
    intro: "Отлично. Я помогу создать рекламу от идеи до готового сообщения.",
    questions: [
      "Что рекламируем?",
      "Для какой площадки: Instagram, Telegram, TikTok, Reels, YouTube, сайт?",
      "Для кого реклама?",
      "Какой результат нужен: заявки, продажи, переходы, узнаваемость, доверие?",
      "Есть ли оффер, цена, фото, видео или ограничения?"
    ]
  },
  product: {
    title: "продукт ESSA",
    intro: "Отлично. Я помогу упаковать продукт ESSA от идеи до понятного предложения.",
    questions: [
      "Какую идею или направление продукта берём?",
      "Для кого он создаётся?",
      "Какую проблему или желание продукт закрывает?",
      "В каком формате он должен существовать: консультация, курс, сервис, набор материалов, приложение, сообщество?",
      "Что уже есть: описание, материалы, аудитория, цена, визуальная идея?"
    ]
  },
  publication: {
    title: "публикацию",
    intro: "Отлично. Я помогу подготовить публикацию от мысли до готового текста.",
    questions: [
      "О чём публикация?",
      "Где она будет опубликована: Telegram, Instagram, LinkedIn, сайт, YouTube?",
      "Какой формат нужен: пост, карусель, сторис, описание, анонс, экспертный текст?",
      "Какой тон нужен: личный, экспертный, продающий, вдохновляющий, спокойный?",
      "Что человек должен сделать после прочтения?"
    ]
  },
  content_multiplication: {
    title: "медиапакет",
    intro: "Отлично. Я помогу размножить один исходный материал в полный медиапакет: подкаст, shorts, reels, визуалы, переводы, публикации и export package.",
    questions: [
      "Что является источником: текст, глава, песня, голос, видео, идея?",
      "Какая главная тема?",
      "Какие форматы нужны: подкаст, shorts, reels, tiktok, визуалы, переводы?",
      "Какие языки нужны?",
      "Где публиковать?",
      "Нужна ли озвучка Lisa?",
      "Сколько материалов создать?"
    ]
  },
  cartoon: {
    title: "мультфильм",
    intro: "Отлично. Я помогу собрать мультфильм через ESSA Story Studio — от идеи до сценария, персонажей, сцен и публикации.",
    questions: [
      "Для кого история?",
      "О чём сюжет?",
      "Кто главный герой?",
      "Какой стиль: сказочный, 3D, 2D, аниме, Pixar-like, минимализм, другое?",
      "Длина: 30 секунд, 1 минута, 3 минуты, серия?",
      "Нужна ли озвучка?",
      "Где будет публикация: YouTube, TikTok, Reels, Shorts, другое?"
    ]
  },
  animated_story: {
    title: "анимационную историю",
    intro: "Отлично. Я помогу собрать анимационную историю через ESSA Animation — сюжет, героя, мир, сцены и публикацию.",
    questions: [
      "Для кого история?",
      "О чём сюжет?",
      "Кто главный герой?",
      "Какой стиль: сказочный, 3D, 2D, аниме, Pixar-like, минимализм, другое?",
      "Длина: 30 секунд, 1 минута, 3 минуты, серия?",
      "Нужна ли озвучка?",
      "Где будет публикация: YouTube, TikTok, Reels, Shorts, другое?"
    ]
  },
  short_film: {
    title: "мини-фильм",
    intro: "Отлично. Я помогу собрать мини-фильм через ESSA Film Flow — идея, герой, сцены, монтаж и публикация.",
    questions: [
      "О чём история?",
      "Кто главный герой?",
      "Какой жанр и настроение нужны?",
      "Какая длительность?",
      "Какие сцены или локации важны?",
      "Нужна ли озвучка или диалоги?",
      "Где будет опубликован фильм?"
    ]
  },
  documentary: {
    title: "документальный фильм",
    intro: "Отлично. Я помогу собрать документальный фильм через ESSA Film Flow — тему, структуру, факты, дикторский текст и публикацию.",
    questions: [
      "О чём тема?",
      "Какая цель: рассказать, раскрыть проблему, вдохновить, обучить?",
      "Кто аудитория?",
      "Какие факты/материалы уже есть?",
      "Нужен ли голос за кадром?",
      "Какая длина?",
      "Где будет опубликован?"
    ]
  },
  feature_film: {
    title: "художественный фильм",
    intro: "Отлично. Я помогу собрать художественный фильм через ESSA Film Flow — концепцию, героев, сцены, мир и производственный план.",
    questions: [
      "О чём история?",
      "Какой жанр?",
      "Кто главный герой и конфликт?",
      "Какой визуальный стиль?",
      "Какая предполагаемая длина?",
      "Нужны ли диалоги/озвучка?",
      "Где планируется публикация или показ?"
    ]
  },
  music_video: {
    title: "музыкальный клип",
    intro: "Отлично. Я помогу собрать музыкальный клип через ESSA Visual Engine — песню, визуальную концепцию, сцены, монтаж и публикацию.",
    questions: [
      "Есть ли песня/текст/аудио?",
      "Какое настроение?",
      "Кто герой/образ?",
      "Какой визуальный стиль?",
      "Вертикальный или горизонтальный формат?",
      "Нужны ли субтитры/lyrics?",
      "Где будет публикация?"
    ]
  },
  youtube_series: {
    title: "YouTube-серию",
    intro: "Отлично. Я помогу собрать YouTube-серию через ESSA Story Studio — формат, темы выпусков, структуру, визуалы и публикацию.",
    questions: [
      "О чём серия или канал?",
      "Для кого это создаётся?",
      "Какой формат: история, обучение, шоу, документально, анимация?",
      "Сколько выпусков в первом цикле?",
      "Какой стиль визуалов и подачи?",
      "Что уже есть: тексты, герои, материалы, бренд?",
      "Какой результат должна дать серия?"
    ]
  },
  fairytale: {
    title: "детскую сказку",
    intro: "Отлично. Я помогу собрать детскую сказку через ESSA Story Studio — сюжет, героя, мир, сцены, озвучку и публикацию.",
    questions: [
      "Для какого возраста сказка?",
      "О чём история?",
      "Кто главный герой?",
      "Какой стиль: сказочный, мягкий, 2D, 3D, книжная иллюстрация, другое?",
      "Это одна сказка или серия/канал?",
      "Нужна ли озвучка?",
      "Где будет публикация?"
    ]
  },
  educational_animation: {
    title: "образовательную анимацию",
    intro: "Отлично. Я помогу собрать образовательную анимацию через ESSA Animation — тему, учебную цель, сцены, визуальные объяснения и публикацию.",
    questions: [
      "Какую тему объясняем?",
      "Для кого материал?",
      "Какой результат обучения нужен?",
      "Какой стиль: 2D, 3D, минимализм, персонажи, инфографика?",
      "Какая длина?",
      "Нужна ли озвучка?",
      "Где будет публикация?"
    ]
  }
};

const GENERIC_ACTIONS = [
  { key: "content_multiplication", patterns: ["размножить контент", "сделать медиапакет", "медиапакет из главы", "из главы сделать контент", "из главы сделать подкаст", "из текста сделать ролики", "из текста сделать подкаст и shorts", "нарезать на shorts", "нарезать на reels", "нарезать на tiktok", "content multiplication", "media package"] },
  { key: "educational_animation", patterns: ["образовательная анимация", "создай образовательную анимацию", "создать образовательную анимацию"] },
  { key: "animated_story", patterns: ["анимационная история", "создай анимационную историю", "создать анимационную историю"] },
  { key: "documentary", patterns: ["документальный фильм", "создай документальный фильм", "создать документальный фильм"] },
  { key: "feature_film", patterns: ["художественный фильм", "создай художественный фильм", "создать художественный фильм"] },
  { key: "music_video", patterns: ["музыкальный клип", "создай музыкальный клип", "создать музыкальный клип", "клип на песню"] },
  { key: "youtube_series", patterns: ["youtube-серия", "youtube серия", "создай youtube-серию", "создай youtube серию", "youtube-канал", "youtube канал"] },
  { key: "fairytale", patterns: ["детская сказка", "создай детскую сказку", "создать детскую сказку", "сказочный канал"] },
  { key: "short_film", patterns: ["мини-фильм", "создай мини-фильм", "создать мини-фильм"] },
  { key: "cartoon", patterns: ["создай мультфильм", "создать мультфильм", "сделай мультфильм", "сделать мультфильм", "мультфильм"] },
  { key: "short", patterns: ["создай shorts", "создать shorts", "сделай shorts", "создай reels", "создать reels", "сделай reels", "создай tiktok", "создать tiktok", "сделай tiktok", "shorts / reels / tiktok"] },
  { key: "video", patterns: ["создай ролик", "создать ролик", "сделай ролик", "создай видео", "создать видео", "сделай видео"] },
  { key: "book", patterns: ["напиши книгу", "написать книгу", "создай книгу", "создать книгу"] },
  { key: "chapter", patterns: ["создай главу", "создать главу", "напиши главу", "написать главу"] },
  { key: "song", patterns: ["создай песню", "создать песню", "напиши песню", "написать песню"] },
  { key: "podcast", patterns: ["создай подкаст", "создать подкаст", "сделай подкаст"] },
  { key: "image", patterns: ["создай изображение", "создать изображение", "сделай изображение", "создай картинку", "сделай картинку"] },
  { key: "ad", patterns: ["создай рекламу", "создать рекламу", "сделай рекламу"] },
  { key: "product", patterns: ["создай продукт essa", "создать продукт essa", "создай продукт эсса", "создать продукт эсса"] },
  { key: "publication", patterns: ["подготовь публикацию", "подготовить публикацию", "сделай публикацию", "создай публикацию"] }
];

function normalizeProductionText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getSelectedAction(text) {
  return String(text || "").toLowerCase().match(/selected card:\s*([^.\n]+)/)?.[1]?.trim() || "";
}

function getUserRequestLine(text) {
  return String(text || "")
    .toLowerCase()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) || "";
}

function detectProductionAction(text) {
  const selectedAction = getSelectedAction(text);
  const requestLine = getUserRequestLine(text);
  const combined = normalizeProductionText(`${selectedAction} ${requestLine}`);

  return GENERIC_ACTIONS.find(({ patterns }) =>
    patterns.some((pattern) => combined.includes(pattern))
  )?.key || "video";
}

export function detectProductionSubtype(text) {
  return detectProductionAction(text);
}

export function getProductionIntakeDefinition(actionKey = "video") {
  const action = INTAKE_BY_ACTION[actionKey] || INTAKE_BY_ACTION.video;

  return {
    actionKey,
    title: action.title,
    intro: action.intro || "",
    questions: Array.isArray(action.questions) ? action.questions : []
  };
}

export function buildProductionIntakeContinuationReply(answer, workflowState = {}) {
  const actionKey = workflowState.action || workflowState.actionKey || detectProductionAction(workflowState.initialRequest || "");
  const intake = getProductionIntakeDefinition(actionKey);
  const questions = intake.questions;

  if (!questions.length) {
    return "";
  }

  const answers = {
    ...(workflowState.answers || {})
  };
  const currentQuestionIndex = Math.max(0, Number(workflowState.currentQuestionIndex || 0));
  const currentQuestion = questions[currentQuestionIndex];

  if (currentQuestion) {
    answers[currentQuestionIndex] = String(answer || "").trim();
  }

  const nextQuestionIndex = currentQuestionIndex + 1;
  const nextQuestion = questions[nextQuestionIndex];

  if (nextQuestion) {
    return {
      reply: `Приняла.\n\n${nextQuestion}`,
      workflowState: {
        ...workflowState,
        module: "production_studio",
        conversationMode: "intake",
        action: actionKey,
        workflow: workflowState.workflow || "production_book",
        currentQuestionIndex: nextQuestionIndex,
        answers,
        completed: false
      }
    };
  }

  return {
    reply: [
      "Отлично. Информации достаточно, чтобы собрать основу проекта главы.",
      "",
      "Я зафиксировала ответы:",
      ...questions.map((question, index) => `${index + 1}. ${question}\n${answers[index] || "не указано"}`),
      "",
      "Следующий шаг — создать draft-проект главы внутри существующего production_book workflow."
    ].join("\n"),
    workflowState: {
      ...workflowState,
      module: "production_studio",
      conversationMode: "planning",
      action: actionKey,
      workflow: workflowState.workflow || "production_book",
      currentQuestionIndex: questions.length,
      answers,
      intakeCompleted: true,
      completed: false
    }
  };
}

function hasEnoughProductionContext(text) {
  const requestLine = getUserRequestLine(text);
  const selectedAction = getSelectedAction(text);
  const cleanLine = requestLine.replace(selectedAction, "").trim();
  const normalized = normalizeProductionText(cleanLine || requestLine);

  if (normalized.includes("сделай сразу")) {
    return true;
  }

  const actionKey = detectProductionAction(text);
  const intakeFirstKeys = [
    "cartoon",
    "animated_story",
    "short_film",
    "documentary",
    "feature_film",
    "music_video",
    "youtube_series",
    "fairytale",
    "educational_animation",
    "content_multiplication"
  ];

  if (intakeFirstKeys.includes(actionKey)) {
    return false;
  }

  if (/\b(про|о|об|для)\b/.test(normalized)) {
    return true;
  }

  const words = normalized.split(" ").filter(Boolean);
  return words.length >= 5 && !GENERIC_ACTIONS.some(({ patterns }) => patterns.includes(normalized));
}

function wantsStartToFinish(text) {
  const normalized = normalizeProductionText(text);

  return normalized.includes("старт → финиш") ||
    normalized.includes("старт -> финиш") ||
    normalized.includes("старт - финиш") ||
    normalized.includes("старт финиш");
}

function wantsStepByStep(text) {
  const normalized = normalizeProductionText(text);

  return normalized.includes("пошагово") ||
    normalized.includes("шаг за шагом");
}

function getAnswer(answers = {}, key, fallback = "Нужно уточнить") {
  const value = String(answers[key] || "").trim();

  return value || fallback;
}

function cleanProjectTopic(value) {
  return String(value || "")
    .trim()
    .replace(/^ролик\s+(про|о|об)\s+/i, "")
    .replace(/[.。]+$/g, "")
    .replace(/\s+/g, " ");
}

function extractFinalWorkflowContext(userText) {
  const text = String(userText || "");
  const markerIndex = text.indexOf(FINAL_CONTEXT_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  const jsonText = text.slice(markerIndex + FINAL_CONTEXT_MARKER.length).trim();

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    return null;
  }
}

export function buildFinalProductionBlueprintReply(userText) {
  const context = extractFinalWorkflowContext(userText);

  if (!context?.answers) {
    return "";
  }

  const answers = context.answers;
  const idea = getAnswer(answers, "idea");
  const concept = getAnswer(answers, "concept");
  const script = getAnswer(answers, "script");
  const voice = getAnswer(answers, "voice");
  const visualStyle = getAnswer(answers, "visual_style");
  const images = getAnswer(answers, "images");
  const assembly = getAnswer(answers, "assembly");
  const publication = getAnswer(answers, "publication");
  const finalReview = getAnswer(answers, "final_review", "Особых ограничений пока не указано");
  const topic = cleanProjectTopic(idea);
  const title = topic.length > 72 ? `${topic.slice(0, 69)}...` : topic;

  return `🎬 Проект
${title}

Краткое описание: ролик на тему: ${topic}

🎯 Цель
Ролик должен создать ощущение: ${concept.toLowerCase()}. После просмотра зрителю должно захотеться досмотреть до конца, понять идею глубже и перейти к взаимодействию с ESSA.

👥 Аудитория
Люди, которым близка тема ролика: ${topic}. Точную аудиторию можно дополнить после уточнения площадки, возраста и контекста просмотра.

🧠 Концепция
Главная идея: ${idea}

Ощущение: ${concept}

✍️ Сценарий
1. Хук: ${script}
2. Раскрытие: коротко показать, почему эта идея важна для зрителя.
3. Смысловой поворот: связать идею с личным путём человека.
4. Финал: оставить ясный вывод и мягкий призыв к действию.

🎙 Озвучка
Готовый voice script:

${script}

${idea}

Это история не просто о проекте. Это приглашение увидеть, как человек может создавать свой путь осознанно, шаг за шагом.

${finalReview}

🎙 Подача: ${voice}

🖼 Визуальный стиль
Атмосфера: ${visualStyle}

Кадры и изображения: ${images}

🎥 Монтаж
План сборки: ${assembly}

Рекомендуемый ритм: начать с сильного хука, затем 2-3 коротких смысловых блока, финал оставить чистым и запоминающимся.

📝 Публикация
Описание / подпись:

${publication}

Заголовок: ${title}

Хэштеги: #ESSA #ESSAEvolution #путьксебе #осознанность #созданиепути

📦 Активы
Уже есть:
- Идея
- Концепция
- Основа сценария
- Направление озвучки
- Визуальное направление
- Монтажная логика
- Публикационный запрос
- Финальные условия

Чего не хватает:
- Финальных исходных видео / фото, если они нужны
- Записанной озвучки
- Готовых визуалов
- Финального монтажа

➡️ Следующий шаг
Выбрать, что делаем дальше: доработать текст, подготовить озвучку, собрать визуалы или перейти к монтажному плану.

### Что делаем дальше?

🟢 Утвердить проект
✏️ Изменить
➕ Дополнить
🎙 Создать озвучку
🖼 Подготовить визуалы
🎥 Перейти к монтажу
📤 Подготовить публикацию
❌ Завершить`;
}

export function buildProductionStudioRouteReply(userText) {
  if (!wantsStartToFinish(userText)) {
    return "";
  }

  const actionKey = detectProductionAction(userText);

  return formatWorkflowStartReply({
    projectType: actionKey,
    title: "Проект"
  });
}

export function buildProductionStudioIntakeReply(userText) {
  if (hasEnoughProductionContext(userText)) {
    return "";
  }

  const action = INTAKE_BY_ACTION[detectProductionAction(userText)] || INTAKE_BY_ACTION.video;
  if (action.intake) {
    return action.intake;
  }

  const questions = action.questions.map((question, index) => `${index + 1}. ${question}`).join("\n");

  return `${action.intro}

Сначала уточню несколько вещей, чтобы не придумывать за вас:

${questions}`;
}

export function productionStudioTaskPackagePrompt(userText, capabilitySummary) {
  return [
    {
      role: "system",
      content: `${capabilitySummary}

You are ESSA Navigator inside ESSA Production Studio.

This workflow is text-only for now. Do not call external APIs, do not publish, do not upload files, do not promise automatic generation outside this chat.

Core behavior:
- Use Russian unless the user clearly asks for another language.
- Act as a Production Director: guide the person from idea to result, keep the process alive, specific and human.
- If the user only selected a card or wrote a generic request like "создай ролик", "сделай shorts", "напиши книгу", "создай песню", "создай подкаст", "создай рекламу", "подготовь публикацию", ask intake questions first.
- Do not create a Production Blueprint unless the user gave a topic, answered intake questions, or explicitly wrote "сделай сразу".
- If the user chooses "Старт → Финиш", do not output a huge Blueprint immediately. First create a project workflow route. The route must show completed steps, the current step, and locked future steps.
- Never skip locked steps. Lead the person through the current step only, then move to the next step after the current one is complete.
- If the user chooses "Пошагово", move one clear step at a time and ask for the next useful detail.
- Do not invent context. If the user did not mention a factory, cream, construction company, book topic, audience, platform or product, do not add it as fact. Ask or mark it as "нужно уточнить".
- When there is enough context, create a Production Blueprint in the exact block format below.
- Keep the tone warm, practical and moving.

Production Blueprint format:

🎬 Проект
Название

🎯 Цель
...

👥 Для кого
...

🧩 Формат
...

🪝 Хук
...

✍️ Сценарий
...

🎙 Озвучка
...

🖼 Визуальное направление
...

🎥 План монтажа
...

📝 Подпись
...

#️⃣ Хэштеги
...

📦 Что понадобится
...

➡️ Следующий шаг
...

At the end of a completed Production Blueprint, include this exact block:

### Что делаем дальше?

🟢 Утвердить
✏️ Изменить
➕ Дополнить
🛠 Продолжить вручную
❌ Отменить

Внешние инструменты, публикация и необратимые действия запускаются только после вашего подтверждения.

Forbidden:
- Do not output the old English approval header.
- Do not output old English approve/revise/cancel options.`
    },
    {
      role: "user",
      content: `Production Studio request:\n${userText}`
    }
  ];
}
