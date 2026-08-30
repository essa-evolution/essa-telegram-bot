function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function getAnswer(answers = {}, index, fallback = "Not specified") {
  const value = String(answers[index] || answers[String(index)] || "").trim();
  return value || fallback;
}

function buildChapterTitle(answers = {}) {
  const topic = getAnswer(answers, 0, "Chapter");
  const cleanTopic = topic.length > 72 ? `${topic.slice(0, 69)}...` : topic;
  return `Chapter: ${cleanTopic}`;
}

function buildChapterOutlineContent(workflowState = {}) {
  const answers = workflowState.answers || {};
  const topic = getAnswer(answers, 0);
  const bookContext = getAnswer(answers, 1);
  const style = getAnswer(answers, 2);
  const effect = getAnswer(answers, 3);
  const existingMaterial = getAnswer(answers, 4);

  return [
    "# Chapter Blueprint",
    "",
    `Topic: ${topic}`,
    `Book / context: ${bookContext}`,
    `Style: ${style}`,
    `Desired reader effect: ${effect}`,
    `Existing material: ${existingMaterial}`,
    "",
    "## Collected Answers",
    `1. What should the chapter be about?\n${topic}`,
    `2. What book or topic is it for?\n${bookContext}`,
    `3. What style is needed?\n${style}`,
    `4. What should the reader understand or feel after the chapter?\n${effect}`,
    `5. Is there an existing book plan or previous chapters?\n${existingMaterial}`,
    "",
    "## Initial Structure",
    "1. Opening image or question that introduces the chapter theme.",
    "2. Core idea and why it matters inside the book.",
    "3. Personal or conceptual development of the theme.",
    "4. Practical or emotional turn for the reader.",
    "5. Closing bridge into the next chapter or next thought."
  ].join("\n");
}

export function shouldCreateChapterProject(workflowState = {}, goalState = {}) {
  return workflowState.workflow === "production_book" &&
    workflowState.action === "chapter" &&
    workflowState.intakeCompleted === true &&
    goalState?.progress?.requirements_collected === true &&
    !goalState.linkedProjectId;
}

export function buildChapterProjectPackage({ workflowState = {}, goalState = {}, goalProgress = {} } = {}) {
  if (!shouldCreateChapterProject(workflowState, goalState)) {
    return null;
  }

  const createdAt = nowIso();
  const projectId = createId("project");
  const artifactId = createId("artifact");
  const title = buildChapterTitle(workflowState.answers || {});
  const artifact = {
    id: artifactId,
    projectId,
    type: "chapter_outline",
    title: `${title} Outline`,
    content: buildChapterOutlineContent(workflowState),
    status: "saved",
    sourceStepId: "create_chapter_structure",
    createdAt,
    updatedAt: createdAt
  };
  const nextGoalState = {
    ...goalState,
    linkedProjectId: projectId,
    currentPhase: "planning",
    progress: {
      ...(goalState.progress || {}),
      requirements_collected: true,
      chapter_structure_created: true,
      draft_created: false,
      artifact_saved: true,
      result_verified: false
    },
    updatedAt: createdAt
  };
  const nextWorkflowState = {
    ...workflowState,
    linkedProjectId: projectId,
    chapterStructureCreated: true,
    artifactSaved: true,
    goalState: nextGoalState,
    goalProgress: {
      ...goalProgress,
      completedCriteria: [
        "requirements_collected",
        "chapter_structure_created",
        "artifact_saved"
      ],
      missingCriteria: [
        "draft_created",
        "result_verified"
      ],
      progressPercent: 60,
      nextBestStep: "create_chapter_draft",
      canContinueWithoutAsking: true
    }
  };
  const project = {
    id: projectId,
    type: "production",
    subtype: "chapter",
    title,
    goalId: goalState.goalId,
    workflowId: "production_book",
    status: "in_progress",
    workflowState: nextWorkflowState,
    goalState: nextGoalState,
    artifacts: [artifact],
    assets: {
      documents: [artifact]
    },
    history: [
      {
        id: createId("history"),
        event: "project_created",
        goalId: goalState.goalId,
        workflowId: "production_book",
        createdAt
      },
      {
        id: createId("history"),
        event: "outline_saved",
        goalId: goalState.goalId,
        workflowId: "production_book",
        artifactId,
        createdAt
      }
    ],
    createdAt,
    updatedAt: createdAt
  };

  return {
    project,
    artifacts: [artifact],
    workflowState: nextWorkflowState,
    goalState: nextGoalState
  };
}
