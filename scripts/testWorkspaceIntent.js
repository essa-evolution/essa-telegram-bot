import axios from "axios";
import { detectProductionSubtype } from "../src/workspace/productionStudioTaskPackagePrompt.js";
import { buildWorkspaceTaskPackage, detectWorkspaceIntent } from "../src/workspace/index.js";

const routingCases = [
  ["создай ролик", "production_studio"],
  ["создай мультфильм", "production_studio"],
  ["сделай мультфильм", "production_studio"],
  ["анимационная история", "production_studio"],
  ["создай мини-фильм", "production_studio"],
  ["документальный фильм", "production_studio"],
  ["художественный фильм", "production_studio"],
  ["музыкальный клип", "production_studio"],
  ["клип на песню", "production_studio"],
  ["создай YouTube-серию", "production_studio"],
  ["YouTube-канал", "production_studio"],
  ["создай детскую сказку", "production_studio"],
  ["образовательная анимация", "production_studio"],
  ["размножить контент", "production_studio"],
  ["из главы сделать подкаст и shorts", "production_studio"],
  ["сделать медиапакет", "production_studio"],
  ["из текста сделать ролики", "production_studio"],
  ["нарезать на reels", "production_studio"],
  ["хочу дом с нуля", "project_factory"],
  ["сделай сайт", "website_studio"],
  ["сделай сайт строительной компании", "website_studio"],
  ["создай лендинг", "website_studio"],
  ["нужна реклама", "marketing_factory"],
  ["напиши договор", ["document_factory", "legal_preparation"]],
  ["хочу переехать в Португалию", "travel_planner"],
  ["придумай бизнес-стратегию", "business_strategy"],
  ["хочу обучиться", "education_path"],
  ["хочу пройти путь ESSA", "essa_path"],
  ["нужна квартира в Батуми", "property"],
  ["продукт ESSA", "product_essa"],
  ["привет", "none"],
  ["как дела", "none"]
];

const workspaceCases = [
  {
    input: "сделай сайт",
    intent: "website_studio",
    includes: ["Отлично. Я помогу собрать сайт", "Какой тип сайта нужен"],
    excludes: ["Website Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "сделай сайт строительной компании",
    intent: "website_studio",
    includes: ["Отлично. Я помогу собрать сайт", "Чем занимается компания"],
    excludes: ["Website Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай лендинг",
    intent: "website_studio",
    includes: ["Отлично. Я помогу собрать сайт", "Какой результат должен дать сайт"],
    excludes: ["Website Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "сделай сайт строительной компании, сделай сразу",
    intent: "website_studio",
    includes: ["Website Blueprint", "APPROVAL REQUIRED"],
    excludes: ["Какой тип сайта нужен"]
  },
  {
    input: "создай ролик",
    intent: "production_studio",
    includes: ["Я помогу создать ролик", "О чём будет ролик"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай мультфильм",
    intent: "production_studio",
    subtype: "cartoon",
    includes: ["мультфильм", "Для кого история?", "Кто главный герой?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай мультфильм про девочку и свет",
    intent: "production_studio",
    subtype: "cartoon",
    includes: ["мультфильм", "Для кого история?", "Какой стиль"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "анимационная история",
    intent: "production_studio",
    subtype: "animated_story",
    includes: ["анимационную историю", "Для кого история?", "Кто главный герой?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай мини-фильм",
    intent: "production_studio",
    subtype: "short_film",
    includes: ["мини-фильм", "Кто главный герой?", "Какие сцены"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай документальный фильм",
    intent: "production_studio",
    subtype: "documentary",
    includes: ["документальный фильм", "О чём тема?", "Какие факты/материалы уже есть?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай художественный фильм",
    intent: "production_studio",
    subtype: "feature_film",
    includes: ["художественный фильм", "Кто главный герой и конфликт?", "визуальный стиль"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай музыкальный клип",
    intent: "production_studio",
    subtype: "music_video",
    includes: ["музыкальный клип", "Есть ли песня/текст/аудио?", "Вертикальный или горизонтальный формат?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай YouTube-серию",
    intent: "production_studio",
    subtype: "youtube_series",
    includes: ["YouTube-серию", "О чём серия или канал?", "Сколько выпусков"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "создай детскую сказку",
    intent: "production_studio",
    subtype: "fairytale",
    includes: ["детскую сказку", "Для какого возраста сказка?", "Нужна ли озвучка?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "образовательная анимация",
    intent: "production_studio",
    subtype: "educational_animation",
    includes: ["образовательную анимацию", "Какую тему объясняем?", "результат обучения"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "размножить контент",
    intent: "production_studio",
    subtype: "content_multiplication",
    includes: ["размножить", "Что является источником", "Сколько материалов создать?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "из главы сделать подкаст и shorts",
    intent: "production_studio",
    subtype: "content_multiplication",
    includes: ["медиапакет", "Какие форматы нужны", "Нужна ли озвучка Lisa?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "сделать медиапакет",
    intent: "production_studio",
    subtype: "content_multiplication",
    includes: ["медиапакет", "Какие языки нужны?", "Где публиковать?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "из текста сделать ролики",
    intent: "production_studio",
    subtype: "content_multiplication",
    includes: ["медиапакет", "Какая главная тема?", "Сколько материалов создать?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  },
  {
    input: "нарезать на reels",
    intent: "production_studio",
    subtype: "content_multiplication",
    includes: ["медиапакет", "Какие форматы нужны", "Где публиковать?"],
    excludes: ["Production Blueprint", "APPROVAL REQUIRED"]
  }
];

let failed = 0;
let mockedBlueprintCalls = 0;

axios.post = async () => {
  mockedBlueprintCalls += 1;

  return {
    data: {
      choices: [
        {
          message: {
            content: `Website Blueprint

Task Title
Сайт строительной компании

Goal
Нужно уточнить детали, но пользователь попросил сделать сразу.`
          }
        }
      ]
    }
  };
};

function assertCase(label, ok, detail = "") {
  console.log(`${ok ? "OK" : "FAIL"} | ${label}${detail ? ` | ${detail}` : ""}`);

  if (!ok) {
    failed += 1;
  }
}

for (const [input, expected] of routingCases) {
  const actual = detectWorkspaceIntent(input);
  const expectedValues = Array.isArray(expected) ? expected : [expected];

  assertCase(`routing: ${input}`, expectedValues.includes(actual), `${actual}`);
}

for (const testCase of workspaceCases) {
  const beforeCalls = mockedBlueprintCalls;
  const reply = await buildWorkspaceTaskPackage(testCase.input, testCase.intent, {
    openAiApiKey: "test-key"
  });

  for (const expectedText of testCase.includes) {
    assertCase(
      `workspace includes: ${testCase.input}`,
      reply.includes(expectedText),
      expectedText
    );
  }

  if (testCase.subtype) {
    assertCase(
      `production subtype: ${testCase.input}`,
      detectProductionSubtype(testCase.input) === testCase.subtype,
      detectProductionSubtype(testCase.input)
    );
  }

  for (const forbiddenText of testCase.excludes) {
    assertCase(
      `workspace excludes: ${testCase.input}`,
      !reply.includes(forbiddenText),
      forbiddenText
    );
  }

  const shouldUseBlueprintBuilder = testCase.input.includes("сделай сразу");
  assertCase(
    `blueprint call gate: ${testCase.input}`,
    shouldUseBlueprintBuilder
      ? mockedBlueprintCalls === beforeCalls + 1
      : mockedBlueprintCalls === beforeCalls,
    `calls=${mockedBlueprintCalls}`
  );
}

if (failed > 0) {
  console.error(`Workspace intent tests failed: ${failed}`);
  process.exit(1);
}

console.log("Workspace intent tests passed.");
