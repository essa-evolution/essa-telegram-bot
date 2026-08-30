const CHAPTER_COMPLETION_CRITERIA = [
  "requirements_collected",
  "chapter_structure_created",
  "draft_created",
  "artifact_saved",
  "result_verified"
];

function createId(prefix = "goal") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function asSet(items = []) {
  return new Set(Array.isArray(items) ? items.filter(Boolean) : []);
}

function normalizeCriterionMap(value = {}) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, itemValue]) => typeof itemValue === "boolean")
  );
}

function getAnswerCount(workflowState = {}) {
  return workflowState.answers && typeof workflowState.answers === "object"
    ? Object.keys(workflowState.answers).length
    : 0;
}

function isChapterGoal(goalStateOrGoal = {}, workflowState = {}) {
  return goalStateOrGoal?.subject === "chapter" ||
    goalStateOrGoal?.goal?.subject === "chapter" ||
    workflowState?.action === "chapter" ||
    workflowState?.goal?.subject === "chapter";
}

export function createChapterGoalState({
  goalId = createId(),
  linkedProjectId = null,
  createdAt = nowIso(),
  updatedAt = nowIso(),
  decisions = [],
  unresolvedQuestions = [],
  rejectedOptions = []
} = {}) {
  return {
    goalId,
    type: "create_artifact",
    subject: "chapter",
    desiredOutcome: "finished chapter draft saved as project artifact",
    status: "in_progress",
    currentPhase: "intake",
    progress: {
      requirements_collected: false,
      chapter_structure_created: false,
      draft_created: false,
      artifact_saved: false,
      result_verified: false
    },
    decisions,
    unresolvedQuestions,
    rejectedOptions,
    linkedProjectId,
    createdAt,
    updatedAt
  };
}

export function ensureChapterGoalState(workflowState = {}) {
  const existing = workflowState.goalState && typeof workflowState.goalState === "object"
    ? workflowState.goalState
    : null;
  const goalId = existing?.goalId || workflowState.goalId || workflowState.goal?.id || createId();
  const base = existing || createChapterGoalState({
    goalId,
    linkedProjectId: workflowState.linkedProjectId || null,
    createdAt: workflowState.createdAt || nowIso()
  });

  return {
    ...base,
    goalId,
    type: "create_artifact",
    subject: "chapter",
    desiredOutcome: "finished chapter draft saved as project artifact",
    status: base.status || "in_progress",
    currentPhase: base.currentPhase || workflowState.conversationMode || "intake",
    progress: {
      requirements_collected: false,
      chapter_structure_created: false,
      draft_created: false,
      artifact_saved: false,
      result_verified: false,
      ...normalizeCriterionMap(base.progress)
    },
    decisions: Array.isArray(base.decisions) ? base.decisions : [],
    unresolvedQuestions: Array.isArray(base.unresolvedQuestions) ? base.unresolvedQuestions : [],
    rejectedOptions: Array.isArray(base.rejectedOptions) ? base.rejectedOptions : [],
    linkedProjectId: base.linkedProjectId || workflowState.linkedProjectId || null,
    createdAt: base.createdAt || workflowState.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

export function calculateGoalProgress(goalState = {}, workflowState = {}) {
  if (!isChapterGoal(goalState, workflowState)) {
    return {
      completedCriteria: [],
      missingCriteria: [],
      progressPercent: 0,
      nextBestStep: "respond",
      canContinueWithoutAsking: false
    };
  }

  const progressMap = {
    ...normalizeCriterionMap(goalState.progress)
  };
  const answerCount = getAnswerCount(workflowState);

  if (workflowState.intakeCompleted || answerCount >= 5 || workflowState.conversationMode === "planning") {
    progressMap.requirements_collected = true;
  }

  if (workflowState.chapterStructureCreated) {
    progressMap.chapter_structure_created = true;
  }

  if (workflowState.draftCreated) {
    progressMap.draft_created = true;
  }

  if (workflowState.artifactSaved || workflowState.linkedProjectId) {
    progressMap.artifact_saved = true;
  }

  if (workflowState.resultVerified) {
    progressMap.result_verified = true;
  }

  const completedSet = asSet(
    CHAPTER_COMPLETION_CRITERIA.filter((criterion) => progressMap[criterion])
  );
  const completedCriteria = [...completedSet];
  const missingCriteria = CHAPTER_COMPLETION_CRITERIA.filter((criterion) => !completedSet.has(criterion));
  const progressPercent = Math.round((completedCriteria.length / CHAPTER_COMPLETION_CRITERIA.length) * 100);
  let nextBestStep = "continue_chapter_intake";
  let canContinueWithoutAsking = false;

  if (progressMap.requirements_collected && !progressMap.chapter_structure_created) {
    nextBestStep = "create_chapter_structure";
    canContinueWithoutAsking = true;
  } else if (progressMap.chapter_structure_created && !progressMap.draft_created) {
    nextBestStep = "create_chapter_draft";
    canContinueWithoutAsking = true;
  } else if (progressMap.draft_created && !progressMap.artifact_saved) {
    nextBestStep = "save_chapter_artifact";
    canContinueWithoutAsking = true;
  } else if (progressMap.artifact_saved && !progressMap.result_verified) {
    nextBestStep = "verify_chapter_result";
    canContinueWithoutAsking = true;
  } else if (!missingCriteria.length) {
    nextBestStep = "complete_goal";
  }

  return {
    completedCriteria,
    missingCriteria,
    progressPercent,
    nextBestStep,
    canContinueWithoutAsking
  };
}

export function updateChapterGoalState(workflowState = {}) {
  if (!isChapterGoal(workflowState.goalState || workflowState.goal, workflowState)) {
    return workflowState.goalState || null;
  }

  const goalState = ensureChapterGoalState(workflowState);
  const goalProgress = calculateGoalProgress(goalState, workflowState);

  return {
    ...goalState,
    status: goalProgress.nextBestStep === "complete_goal" ? "completed" : "in_progress",
    currentPhase: workflowState.conversationMode || goalState.currentPhase || "intake",
    progress: {
      requirements_collected: goalProgress.completedCriteria.includes("requirements_collected"),
      chapter_structure_created: goalProgress.completedCriteria.includes("chapter_structure_created"),
      draft_created: goalProgress.completedCriteria.includes("draft_created"),
      artifact_saved: goalProgress.completedCriteria.includes("artifact_saved"),
      result_verified: goalProgress.completedCriteria.includes("result_verified")
    },
    updatedAt: nowIso()
  };
}

export function enrichWorkflowStateWithGoal(workflowState = {}) {
  if (!isChapterGoal(workflowState.goalState || workflowState.goal, workflowState)) {
    return workflowState;
  }

  const goalState = updateChapterGoalState(workflowState);
  const goalProgress = calculateGoalProgress(goalState, workflowState);

  return {
    ...workflowState,
    goalId: goalState.goalId,
    goal: {
      id: goalState.goalId,
      type: goalState.type,
      action: "create",
      subject: goalState.subject,
      name: "create chapter",
      workflowId: "production_book",
      source: "production_studio",
      desiredOutcome: goalState.desiredOutcome,
      completionCriteria: CHAPTER_COMPLETION_CRITERIA
    },
    goalState,
    goalProgress
  };
}

export function getChapterCompletionCriteria() {
  return [...CHAPTER_COMPLETION_CRITERIA];
}
