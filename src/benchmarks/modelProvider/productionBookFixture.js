import { calculateGoalProgress, createChapterGoalState } from "../../navigator/goalState.js";
import { createBenchmarkTask } from "./contracts.js";

function nowIso() {
  return new Date().toISOString();
}

function createFixtureId(prefix) {
  return `${prefix}_benchmark_meaning_of_life`;
}

function buildWorkflowState(goalState) {
  const workflowState = {
    workflow: "production_book",
    workflowId: "production_book",
    action: "chapter",
    conversationMode: "planning",
    intakeCompleted: true,
    linkedProjectId: createFixtureId("project"),
    chapterStructureCreated: true,
    artifactSaved: true,
    draftCreated: false,
    resultVerified: false,
    goalId: goalState.goalId,
    goalState,
    answers: {
      0: "Смысл жизни",
      1: "Философская книга о сознании, выборе и внутренней зрелости.",
      2: "Глубокий, ясный, человечный стиль без академической сухости.",
      3: "Читатель должен почувствовать спокойствие, смысл и желание честно посмотреть на свою жизнь.",
      4: "Готового текста нет; есть только тема и направление."
    }
  };

  return {
    ...workflowState,
    goalProgress: calculateGoalProgress(goalState, workflowState)
  };
}

function buildOutlineArtifact(projectId, createdAt) {
  return {
    id: createFixtureId("artifact_outline"),
    projectId,
    type: "chapter_outline",
    title: "Chapter: Смысл жизни Outline",
    status: "saved",
    sourceStepId: "create_chapter_structure",
    createdAt,
    updatedAt: createdAt,
    content: [
      "# Chapter Blueprint",
      "",
      "Topic: Смысл жизни",
      "Book / context: Философская книга о сознании, выборе и внутренней зрелости.",
      "Style: Глубокий, ясный, человечный стиль без академической сухости.",
      "Desired reader effect: Читатель должен почувствовать спокойствие, смысл и желание честно посмотреть на свою жизнь.",
      "Existing material: Готового текста нет; есть только тема и направление.",
      "",
      "## Initial Structure",
      "1. Вопрос, который невозможно обойти.",
      "2. Почему смысл не находится как предмет, а создаётся как отношение.",
      "3. Свобода, ответственность и внутренняя честность.",
      "4. Смысл в повседневности: выбор, присутствие, связь.",
      "5. Финальный мост к следующей главе."
    ].join("\n")
  };
}

export function createProductionBookDraftBenchmarkFixture() {
  const createdAt = nowIso();
  const goalState = {
    ...createChapterGoalState({
      goalId: createFixtureId("goal"),
      linkedProjectId: createFixtureId("project"),
      createdAt,
      updatedAt: createdAt
    }),
    currentPhase: "drafting",
    progress: {
      requirements_collected: true,
      chapter_structure_created: true,
      draft_created: false,
      artifact_saved: true,
      result_verified: false
    }
  };
  const workflowState = buildWorkflowState(goalState);
  const outline = buildOutlineArtifact(workflowState.linkedProjectId, createdAt);
  const projectSnapshot = {
    id: workflowState.linkedProjectId,
    type: "production",
    subtype: "chapter",
    title: "Chapter: Смысл жизни",
    goalId: goalState.goalId,
    workflowId: "production_book",
    status: "in_progress",
    workflowState,
    goalState,
    artifacts: [outline],
    history: [
      {
        id: createFixtureId("history_project_created"),
        event: "project_created",
        goalId: goalState.goalId,
        workflowId: "production_book",
        createdAt
      },
      {
        id: createFixtureId("history_outline_saved"),
        event: "outline_saved",
        goalId: goalState.goalId,
        workflowId: "production_book",
        artifactId: outline.id,
        createdAt
      }
    ],
    createdAt,
    updatedAt: createdAt
  };
  const contextPack = {
    contextPackId: createFixtureId("context"),
    traceId: createFixtureId("trace"),
    sessionId: "benchmark",
    userText: "Создай черновик главы по собранному контексту.",
    activeGoal: {
      ...goalState,
      source: "goal_state"
    },
    activeWorkflow: {
      workflowId: "production_book",
      action: "chapter",
      conversationMode: "planning",
      linkedProjectId: projectSnapshot.id,
      goalId: goalState.goalId,
      nextBestStep: "create_chapter_draft",
      state: workflowState,
      source: "workflow_state"
    },
    activeProject: {
      id: projectSnapshot.id,
      title: projectSnapshot.title,
      type: projectSnapshot.type,
      subtype: projectSnapshot.subtype,
      status: projectSnapshot.status,
      workflowId: projectSnapshot.workflowId,
      goalId: goalState.goalId,
      source: "project"
    },
    activeProjectData: projectSnapshot,
    relevantArtifacts: [
      {
        id: outline.id,
        projectId: projectSnapshot.id,
        type: outline.type,
        title: outline.title,
        status: outline.status,
        sourceStepId: outline.sourceStepId,
        contentPreview: outline.content,
        source: "artifact"
      }
    ],
    workflowAnswers: Object.entries(workflowState.answers).map(([key, value]) => ({
      key,
      value,
      source: "workflow_state"
    })),
    previousDecisions: projectSnapshot.history.map((item) => ({
      ...item,
      source: "project"
    })),
    rejectedOptions: [],
    missingContext: ["chapter_draft", "result_verified"],
    contextSources: ["goal_state", "workflow_state", "project", "artifact"],
    systemCapabilities: {
      registryEnabled: true,
      generatedAt: createdAt,
      capabilities: [
        {
          capabilityId: "production_chapter_draft",
          category: "documents",
          status: "READY",
          executable: true,
          providers: ["essa_documents", "essa_local_execution"],
          preferredProvider: "essa_documents"
        }
      ]
    }
  };

  return createBenchmarkTask({
    taskId: "production_book_create_chapter_draft_meaning_of_life_v1",
    goal: {
      type: "create_artifact",
      subject: "chapter",
      desiredOutcome: "finished chapter draft saved as project artifact"
    },
    contextPack,
    workflowId: "production_book",
    projectSnapshot,
    artifactInputs: [outline],
    instructions: [
      "Write a complete Russian chapter draft using only the supplied ESSA context.",
      "Preserve the collected intent, style and reader effect.",
      "Do not invent external facts or claim that the chapter was published.",
      "Return plain markdown suitable for saving as a chapter_draft artifact."
    ].join("\n"),
    outputRequirements: {
      language: "ru",
      format: "markdown",
      minimumSections: 5,
      artifactType: "chapter_draft",
      mustUseContext: true,
      noProviderDisclosure: true
    }
  });
}
