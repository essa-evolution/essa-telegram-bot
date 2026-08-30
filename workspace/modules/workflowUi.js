function getRequiredOption(options, key) {
  const value = options?.[key];

  if (!value) {
    throw new Error(`Workflow UI option is required: ${key}`);
  }

  return value;
}

function getProjectById(projectId, options) {
  return options.loadProjects().find((item) => item.id === projectId) || null;
}

function getWorkflowStepKey(step) {
  return typeof step === "object" && step !== null
    ? step.key || step.id || step.title || ""
    : String(step || "");
}

function getWorkflowStepTitle(step) {
  if (typeof step === "object" && step !== null) {
    return step.title || step.label || formatWorkflowStepLabel(getWorkflowStepKey(step));
  }

  return formatWorkflowStepLabel(step);
}

function formatWorkflowStepLabel(step) {
  return getWorkflowStepKey(step)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getWorkflowStepQuestion(step) {
  if (typeof step === "object" && step !== null && step.question) {
    return step.question;
  }

  const questions = {
    idea: "Опишите идею проекта одной-двумя фразами.",
    goal: "Какую главную цель должен решить этот проект?",
    concept: "Какое ощущение или смысл должен остаться у человека после контакта с проектом?",
    script: "Какой главный хук или сценарная основа нужны для старта?",
    voice: "Каким должен быть голос, тон или стиль подачи?",
    visual_style: "Какой визуальный стиль нужен проекту?",
    assets: "Какие материалы и активы уже есть, а чего не хватает?",
    editing: "Какой ритм и логика сборки нужны?",
    publication: "Где и как проект должен быть опубликован?",
    final_review: "Есть ли ограничения, важные условия или финальные пожелания?",
    audience: "Для кого создаётся этот проект?",
    structure: "Какая структура должна быть у проекта?",
    content: "Какой контент нужно подготовить первым?",
    design_direction: "Какое дизайн-направление ближе всего?",
    build_plan: "Что нужно собрать в первой рабочей версии?",
    launch_check: "Что важно проверить перед запуском?",
    location: "Какая локация важна для запроса?",
    budget: "Какой бюджет или диапазон нужно учитывать?",
    property_type: "Какой тип недвижимости нужен?",
    criteria: "Какие критерии обязательны?",
    documents: "Какие документы или данные уже есть?",
    next_action: "Какой следующий практический шаг нужен?",
    request: "Опишите задачу своими словами.",
    jurisdiction: "В какой стране или юрисдикции это нужно?",
    risks: "Какие риски или опасения важно учесть?",
    questions: "Какие вопросы нужно прояснить перед следующим шагом?",
    destination: "Куда планируется поездка или маршрут?",
    dates: "Какие даты или сроки нужно учитывать?",
    style: "Какой стиль поездки или работы вам ближе?",
    route: "Какие точки маршрута важны?",
    booking_plan: "Что нужно забронировать или подготовить первым?",
    current_level: "С какого уровня вы начинаете?",
    format: "В каком формате удобнее двигаться?",
    schedule: "Какой ритм работы реалистичен?",
    materials: "Какие материалы уже есть?",
    practice_plan: "Какая практика нужна на первом этапе?",
    user: "Для кого создаётся продукт?",
    value: "В чём главная ценность продукта?",
    prototype: "Какой минимальный прототип можно собрать первым?",
    release_plan: "Какой первый релиз будет достаточным?"
  };

  const stepKey = getWorkflowStepKey(step);
  return questions[stepKey] || `Опишите, пожалуйста, этап: ${getWorkflowStepTitle(step)}`;
}

function saveProjectWorkflowState(projectId, workflowState, updates = {}, options = {}) {
  const updateProject = getRequiredOption(options, "updateProject");
  const showChatMessage = getRequiredOption(options, "showChatMessage");
  const renderProjectsList = options.renderProjectsList || (() => {});
  const normalizeWorkflowState = getRequiredOption(options, "normalizeWorkflowState");

  const project = updateProject(projectId, () => ({
    workflowState: normalizeWorkflowState(workflowState),
    ...updates
  }));

  if (!project) {
    showChatMessage("navigator", "Не получилось сохранить маршрут: проект не найден в localStorage.", "error");
    return null;
  }

  renderProjectsList();
  return project;
}

export function startWorkflow(projectId, options = {}) {
  const project = getProjectById(projectId, options);
  const showChatMessage = getRequiredOption(options, "showChatMessage");
  const openProjectWorkspace = getRequiredOption(options, "openProjectWorkspace");

  if (!project?.workflowState?.steps?.length) {
    showChatMessage("navigator", "Маршрут пока не настроен для этого проекта.", "error");
    return;
  }

  const updatedProject = saveProjectWorkflowState(projectId, {
    ...project.workflowState,
    currentStepIndex: project.workflowState.currentStepIndex || 0,
    started: true,
    completed: false
  }, {}, options);

  if (updatedProject) {
    openProjectWorkspace(projectId, "next");
  }
}

export function saveWorkflowAnswer(projectId, answer, options = {}) {
  const project = getProjectById(projectId, options);
  const showChatMessage = getRequiredOption(options, "showChatMessage");
  const openProjectWorkspace = getRequiredOption(options, "openProjectWorkspace");

  if (!project?.workflowState?.started || !project.workflowState.steps.length) {
    showChatMessage("navigator", "Маршрут проекта ещё не запущен.", "error");
    return;
  }

  const currentStep = project.workflowState.steps[project.workflowState.currentStepIndex];
  const stepKey = getWorkflowStepKey(currentStep);
  const trimmedAnswer = String(answer || "").trim();

  if (!trimmedAnswer) {
    showChatMessage("navigator", "Добавьте ответ перед переходом к следующему шагу.", "error");
    return;
  }

  const nextIndex = project.workflowState.currentStepIndex + 1;
  const completed = nextIndex >= project.workflowState.steps.length;
  const updatedProject = saveProjectWorkflowState(
    projectId,
    {
      ...project.workflowState,
      currentStepIndex: completed ? project.workflowState.steps.length : nextIndex,
      answers: {
        ...(project.workflowState.answers || {}),
        [stepKey]: trimmedAnswer
      },
      completed,
      started: true
    },
    completed ? { status: "ready_for_blueprint" } : {},
    options
  );

  if (updatedProject) {
    openProjectWorkspace(projectId, "next");
  }
}

function formatWorkflowAnswers(project) {
  const answers = project.workflowState?.answers || {};
  const steps = project.workflowState?.steps || [];

  if (!Object.keys(answers).length) {
    return "Ответы пока не сохранены.";
  }

  return steps
    .map((step) => {
      const stepKey = getWorkflowStepKey(step);
      const answer = answers[stepKey];

      if (!answer) {
        return "";
      }

      return `### ${getWorkflowStepTitle(step)}\n${answer}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatWorkflowRouteForBlueprint(project) {
  const steps = project.workflowState?.steps || [];

  if (!steps.length) {
    return "Маршрут не сохранён.";
  }

  return steps
    .map((step, index) => `${index + 1}. ${getWorkflowStepTitle(step)}`)
    .join("\n");
}

function getWorkflowAnswer(project, keys, fallback = "Нужно уточнить") {
  const answers = project.workflowState?.answers || {};
  const keyList = Array.isArray(keys) ? keys : [keys];
  const foundKey = keyList.find((key) => String(answers[key] || "").trim());

  return foundKey ? answers[foundKey] : fallback;
}

function buildWorkflowSpecificBlueprintSection(project) {
  const workflowId = project.workflowId || "";

  if (workflowId === "website_project") {
    return `## Рекомендованная структура результата

### Структура сайта
Цель: ${getWorkflowAnswer(project, "goal")}
Аудитория: ${getWorkflowAnswer(project, "audience")}
Структура: ${getWorkflowAnswer(project, "structure")}

### Страницы и блоки
- Главный экран с ясным предложением.
- Блок доверия и объяснения ценности.
- Основной контент: ${getWorkflowAnswer(project, "content")}
- Визуальное направление: ${getWorkflowAnswer(project, "design_direction")}
- Следующий шаг / CTA.

### Следующий шаг
${getWorkflowAnswer(project, ["build_plan", "launch_check"], "Собрать первый прототип сайта и проверить структуру.")}`;
  }

  if (workflowId === "property_request") {
    return `## Рекомендованная структура результата

### Требования
Локация: ${getWorkflowAnswer(project, "location")}
Бюджет: ${getWorkflowAnswer(project, "budget")}
Тип недвижимости: ${getWorkflowAnswer(project, "property_type")}
Критерии: ${getWorkflowAnswer(project, "criteria")}

### Риски и документы
Документы: ${getWorkflowAnswer(project, "documents")}
Следующий шаг: ${getWorkflowAnswer(project, "next_action")}

### Следующий шаг
Собрать shortlist вариантов и проверить документы до любых обязательств.`;
  }

  if (workflowId === "legal_preparation") {
    return `## Рекомендованная структура результата

### Задача
${getWorkflowAnswer(project, "request")}

### Документы
${getWorkflowAnswer(project, "documents")}

### Вопросы юристу
${getWorkflowAnswer(project, "questions")}

### Риски
${getWorkflowAnswer(project, "risks")}

### Следующий шаг
Подготовить пакет вводных и передать специалисту для проверки по юрисдикции: ${getWorkflowAnswer(project, "jurisdiction")}.`;
  }

  if (workflowId === "production_video") {
    return `## Рекомендованная структура результата

### Идея
${getWorkflowAnswer(project, "idea")}

### Сценарий
${getWorkflowAnswer(project, "script")}

### Визуалы
${getWorkflowAnswer(project, ["visual_style", "assets"])}

### Озвучка
${getWorkflowAnswer(project, "voice")}

### Публикация
${getWorkflowAnswer(project, "publication")}

### Следующий шаг
Собрать сценарий, voice script, visual prompts и монтажный план.`;
  }

  if (workflowId === "marketing_campaign") {
    return `## Рекомендованная структура результата

### Оффер
${getWorkflowAnswer(project, "offer")}

### Аудитория
${getWorkflowAnswer(project, "audience")}

### Каналы
${getWorkflowAnswer(project, "channels")}

### Креативы
${getWorkflowAnswer(project, "creative")}

### Следующий шаг
Собрать тестовый набор сообщений, креативов и launch plan.`;
  }

  if (workflowId === "education_path") {
    return `## Рекомендованная структура результата

### Цель обучения
${getWorkflowAnswer(project, "goal")}

### Этапы
${getWorkflowAnswer(project, ["current_level", "schedule"])}

### Материалы
${getWorkflowAnswer(project, "materials")}

### Практика
${getWorkflowAnswer(project, "practice_plan")}

### Следующий шаг
Собрать первую учебную неделю и практическое задание.`;
  }

  return `## Рекомендованная структура результата

### Основная структура
Использовать ответы маршрута как основу результата.

### Следующий шаг
Уточнить формат итогового результата и собрать первую рабочую версию.`;
}

function buildCoreProjectBlueprint(project) {
  const goal = getWorkflowAnswer(project, ["goal", "idea", "request", "location"], "Собрать рабочий проект на основе маршрута ESSA Core.");
  const specificSection = buildWorkflowSpecificBlueprintSection(project);

  return `# ESSA Blueprint

## Проект

Название: ${project.title}
Тип: ${project.type} / ${project.subtype}
Агент: ${project.agent || "не выбран"}
Workflow: ${project.workflowId || "не выбран"}

## Исходный запрос

${project.initialRequest || project.title}

## Цель

${goal}

## Маршрут

${formatWorkflowRouteForBlueprint(project)}

## Ответы пользователя

${formatWorkflowAnswers(project)}

${specificSection}

## Что делаем дальше?

* Утвердить
* Изменить
* Дополнить
* Создать активы
* Экспортировать
* Продолжить проект`;
}

export function buildCoreBlueprint(projectId, options = {}) {
  const project = getProjectById(projectId, options);
  const updateProject = getRequiredOption(options, "updateProject");
  const showChatMessage = getRequiredOption(options, "showChatMessage");
  const openProjectWorkspace = getRequiredOption(options, "openProjectWorkspace");
  const renderProjectsList = options.renderProjectsList || (() => {});

  if (!project) {
    showChatMessage("navigator", "Не получилось собрать Blueprint: проект не найден.", "error");
    return;
  }

  const blueprint = buildCoreProjectBlueprint(project);
  const updatedProject = updateProject(projectId, (currentProject) => ({
    finalBlueprintText: blueprint,
    status: "blueprint_ready",
    generatedSections: {
      ...(currentProject.generatedSections || {}),
      core_blueprint: blueprint
    }
  }));

  if (!updatedProject) {
    showChatMessage("navigator", "Не получилось сохранить Blueprint: проект не найден в localStorage.", "error");
    return;
  }

  renderProjectsList();
  showChatMessage("navigator", `Blueprint собран и сохранён для проекта «${updatedProject.title}».`);
  openProjectWorkspace(projectId, "blueprint");
}

function renderProjectRoutePrompt(content, project, options) {
  if (!project.workflowState?.started || !project.workflowState?.steps?.length) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "project-route-prompt";

  if (project.workflowState.completed) {
    const done = document.createElement("div");
    done.className = "project-route-complete";

    const title = document.createElement("h4");
    title.textContent = "Маршрут завершён";

    const text = document.createElement("p");
    text.textContent = "Все ответы сохранены. Теперь можно собрать финальный Blueprint проекта.";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Собрать Blueprint";
    button.addEventListener("click", () => buildCoreBlueprint(project.id, options));

    done.append(title, text, button);
    content.append(done);
    return;
  }

  const activeStep = project.workflowState.steps[project.workflowState.currentStepIndex] || project.workflowState.steps[0];
  const title = document.createElement("h4");
  title.textContent = `Текущий шаг: ${getWorkflowStepTitle(activeStep)}`;

  const question = document.createElement("p");
  question.textContent = getWorkflowStepQuestion(activeStep);

  const form = document.createElement("form");
  form.className = "project-route-answer-form";

  const textarea = document.createElement("textarea");
  textarea.rows = 4;
  textarea.placeholder = "Ваш ответ...";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Сохранить ответ и перейти дальше";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveWorkflowAnswer(project.id, textarea.value, options);
  });

  form.append(textarea, button);
  wrapper.append(title, question, form);
  content.append(wrapper);
}

export function renderNextStepsTab(project, options = {}) {
  const content = getRequiredOption(options, "content");
  renderProjectRoutePrompt(content, project, options);
  options.renderNextActions?.(content, project);
}

export function renderWorkflowTab(project, options = {}) {
  const content = getRequiredOption(options, "content");
  const productionWorkflowSteps = options.productionWorkflowSteps || [];
  const wrapper = document.createElement("div");
  wrapper.className = "project-workflow-tab";

  const info = document.createElement("div");
  info.className = "project-workflow-info";
  [
    ["Исходный запрос", project.initialRequest || "не сохранён"],
    ["Тип проекта", `${project.type} / ${project.subtype}`],
    ["Агент", project.agent || "не выбран"],
    ["Workflow", project.workflowId || "не выбран"],
    ["Статус", project.status],
    ["Создан", new Date(project.createdAt).toLocaleString("ru-RU")],
    ["Обновлён", project.updatedAt || project.lastUpdatedAt ? new Date(project.updatedAt || project.lastUpdatedAt).toLocaleString("ru-RU") : "пока нет"]
  ].forEach(([label, value]) => {
    const item = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    item.append(strong, value);
    info.append(item);
  });

  const route = document.createElement("div");
  route.className = "project-workflow-route";

  const routeTitle = document.createElement("h4");
  routeTitle.textContent = "Этапы маршрута";

  const routeList = document.createElement("ol");
  const routeSteps = project.workflowState?.steps?.length
    ? project.workflowState.steps
    : productionWorkflowSteps.map((step) => step.key);
  const currentIndex = project.workflowState?.currentStepIndex || 0;

  routeSteps.forEach((step, index) => {
    const item = document.createElement("li");
    const stepKey = getWorkflowStepKey(step);
    const isCompleted = project.workflowState?.completed || index < currentIndex || Boolean(project.workflowState?.answers?.[stepKey] || project.workflowAnswers?.[stepKey]);
    const isActive = index === currentIndex && !project.workflowState?.completed;
    const icon = isCompleted ? "✅" : isActive ? "🟡" : "🔒";
    item.textContent = `${icon} ${getWorkflowStepTitle(step)}`;
    routeList.append(item);
  });

  route.append(routeTitle, routeList);

  if (project.workflowState?.steps?.length) {
    const activeStep = project.workflowState.completed
      ? null
      : project.workflowState.steps[project.workflowState.currentStepIndex] || project.workflowState.steps[0];
    const active = document.createElement("p");
    active.className = "project-workflow-active-step";
    active.textContent = activeStep
      ? `Активный шаг: ${getWorkflowStepTitle(activeStep)}`
      : "Маршрут завершён.";

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.textContent = project.workflowState.completed
      ? "Собрать Blueprint"
      : project.workflowState.started ? "Продолжить маршрут" : "Начать маршрут";
    startButton.addEventListener("click", () => {
      if (project.workflowState.completed) {
        buildCoreBlueprint(project.id, options);
      } else {
        startWorkflow(project.id, options);
      }
    });

    route.append(active, startButton);
  }

  const answers = document.createElement("div");
  answers.className = "project-workflow-answers";

  const answersTitle = document.createElement("h4");
  answersTitle.textContent = "Ответы пользователя";

  const answerList = document.createElement("div");
  const entries = Object.entries({
    ...(project.workflowAnswers || {}),
    ...(project.workflowState?.answers || {})
  });

  if (entries.length) {
    entries.forEach(([key, value]) => {
      const step = productionWorkflowSteps.find((item) => item.key === key);
      const item = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${step?.label || formatWorkflowStepLabel(key)}: `;
      item.append(strong, value);
      answerList.append(item);
    });
  } else {
    answerList.textContent = "Ответы workflow пока не сохранены.";
  }

  answers.append(answersTitle, answerList);
  wrapper.append(info, route, answers);
  content.append(wrapper);
}
