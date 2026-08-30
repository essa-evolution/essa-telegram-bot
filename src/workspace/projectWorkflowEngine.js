const STEP_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫"];

const BASE_WORKFLOW_STEPS = [
  { key: "idea", label: "Идея" },
  { key: "concept", label: "Концепция" },
  { key: "script", label: "Сценарий" },
  { key: "voice", label: "Озвучивание" },
  { key: "visual_style", label: "Визуальный стиль" },
  { key: "images", label: "Изображения" },
  { key: "assembly", label: "Монтаж" },
  { key: "publication", label: "Подготовка публикации" },
  { key: "final_review", label: "Финальная проверка" }
];

const WORKFLOW_STEP_OVERRIDES = {
  book: [
    { key: "idea", label: "Идея" },
    { key: "concept", label: "Концепция книги" },
    { key: "structure", label: "Структура" },
    { key: "chapter_plan", label: "План глав" },
    { key: "draft", label: "Текст" },
    { key: "voice", label: "Стиль и голос" },
    { key: "editing", label: "Редактура" },
    { key: "packaging", label: "Подготовка публикации" },
    { key: "final_review", label: "Финальная проверка" }
  ],
  song: [
    { key: "idea", label: "Идея" },
    { key: "concept", label: "Концепция" },
    { key: "lyrics", label: "Текст" },
    { key: "hook", label: "Припев / хук" },
    { key: "music_style", label: "Музыкальный стиль" },
    { key: "voice", label: "Вокал / подача" },
    { key: "arrangement", label: "Аранжировка" },
    { key: "publication", label: "Подготовка публикации" },
    { key: "final_review", label: "Финальная проверка" }
  ],
  ad: [
    { key: "idea", label: "Идея" },
    { key: "offer", label: "Оффер" },
    { key: "audience", label: "Аудитория" },
    { key: "message", label: "Сообщение" },
    { key: "visual_style", label: "Визуальный стиль" },
    { key: "creative", label: "Креативы" },
    { key: "copy", label: "Текст рекламы" },
    { key: "publication", label: "Подготовка запуска" },
    { key: "final_review", label: "Финальная проверка" }
  ]
};

function clampStepIndex(index, steps) {
  return Math.min(Math.max(Number(index) || 0, 0), steps.length - 1);
}

function getWorkflowSteps(projectType = "default") {
  return WORKFLOW_STEP_OVERRIDES[projectType] || BASE_WORKFLOW_STEPS;
}

function getStepStatus(index, currentStepIndex) {
  if (index < currentStepIndex) {
    return "completed";
  }

  if (index === currentStepIndex) {
    return "current";
  }

  return "locked";
}

function formatWorkflowStep(step, index, currentStepIndex) {
  const number = STEP_NUMBERS[index] || `${index + 1}.`;
  const status = getStepStatus(index, currentStepIndex);

  if (status === "completed") {
    return `✅ ${number} ${step.label}`;
  }

  if (status === "current") {
    return `🟡 ${number} ${step.label}  ← текущий шаг`;
  }

  return `🔒 ${number} ${step.label}`;
}

export function buildProjectWorkflow({
  projectType = "default",
  currentStepIndex = 0,
  title = "Проект"
} = {}) {
  const steps = getWorkflowSteps(projectType);
  const safeCurrentStepIndex = clampStepIndex(currentStepIndex, steps);
  const currentStep = steps[safeCurrentStepIndex];

  return {
    title,
    projectType,
    currentStep: currentStep.key,
    currentStepLabel: currentStep.label,
    steps: steps.map((step, index) => ({
      ...step,
      number: STEP_NUMBERS[index] || `${index + 1}.`,
      status: getStepStatus(index, safeCurrentStepIndex)
    }))
  };
}

export function formatProjectWorkflow(workflow) {
  const currentStepIndex = workflow.steps.findIndex((step) => step.key === workflow.currentStep);
  const stepLines = workflow.steps
    .map((step, index) => formatWorkflowStep(step, index, currentStepIndex))
    .join("\n\n");

  return `━━━━━━━━━━━━━━━━━━

🎬 ${workflow.title}

${stepLines}

━━━━━━━━━━━━━━━━━━`;
}

export function formatWorkflowStartReply({
  projectType = "default",
  title = "Проект"
} = {}) {
  const workflow = buildProjectWorkflow({
    projectType,
    title,
    currentStepIndex: 0
  });

  return `Отлично. Беру режим 🟢 Старт → Финиш.

Я не буду сразу генерировать весь проект. Мы пойдём как в рабочей студии: шаг за шагом, пока не дойдём до готового результата.

Вот маршрут проекта:

${formatProjectWorkflow(workflow)}

Как это работает:

✅ Завершённые шаги будут отмечаться автоматически.
🟡 Текущий шаг подсвечен.
🔒 Следующие шаги закрыты, пока мы не завершим предыдущий.

Начинаем с шага ${workflow.steps[0].number} ${workflow.currentStepLabel}.

Расскажите идею проекта: о чём он, для кого и какой результат должен дать?`;
}
