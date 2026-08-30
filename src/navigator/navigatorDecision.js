import { selectAgent } from "../core/agentRouter.js";
import {
  calculateGoalProgress,
  createChapterGoalState,
  enrichWorkflowStateWithGoal,
  updateChapterGoalState
} from "./goalState.js";
import { buildChapterProjectPackage } from "./chapterProject.js";
import { decideAskInferActConfirm } from "./actionPolicy.js";
import { buildVerifiedGoalProgress, verifyGoalProgress } from "./verifier.js";
import { executeToolRequest } from "./toolBroker.js";

function normalizeText(value = "") {
  return String(value || "").toLowerCase();
}

function createTraceId(prefix = "nav") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getWorkflowId(corePlan = null, activeWorkflowState = null) {
  return activeWorkflowState?.workflow ||
    corePlan?.workflow?.id ||
    corePlan?.workflowId ||
    null;
}

function getRoute(workspaceIntent, corePlan = null, activeWorkflowState = null) {
  const workflowId = getWorkflowId(corePlan, activeWorkflowState);

  return {
    surface: activeWorkflowState?.module || workspaceIntent || "navigator",
    intent: workspaceIntent || corePlan?.intent || "none",
    action: activeWorkflowState?.action || null,
    workflowId
  };
}

function isChapterProductionBookRequest(userText, activeWorkflowState = null, corePlan = null) {
  const text = normalizeText(userText);
  const workflowId = getWorkflowId(corePlan, activeWorkflowState);

  return workflowId === "production_book" && (
    activeWorkflowState?.action === "chapter" ||
    text.includes("production action key: chapter") ||
    text.includes("target workflow: production_book") ||
    text.includes("создать главу") ||
    text.includes("создай главу") ||
    text.includes("написать главу") ||
    text.includes("напиши главу")
  );
}

function buildGoal(userText, activeWorkflowState = null, corePlan = null) {
  if (activeWorkflowState?.goalState?.subject === "chapter") {
    return {
      id: activeWorkflowState.goalState.goalId,
      type: activeWorkflowState.goalState.type,
      action: "create",
      subject: "chapter",
      name: "create chapter",
      workflowId: "production_book",
      source: "production_studio",
      desiredOutcome: activeWorkflowState.goalState.desiredOutcome,
      completionCriteria: [
        "requirements_collected",
        "chapter_structure_created",
        "draft_created",
        "artifact_saved",
        "result_verified"
      ]
    };
  }

  if (isChapterProductionBookRequest(userText, activeWorkflowState, corePlan)) {
    return {
      id: activeWorkflowState?.goal?.id || activeWorkflowState?.goalId || null,
      type: "create_artifact",
      action: "create",
      subject: "chapter",
      name: "create chapter",
      workflowId: "production_book",
      source: "production_studio",
      desiredOutcome: "finished chapter draft saved as project artifact",
      completionCriteria: [
        "requirements_collected",
        "chapter_structure_created",
        "draft_created",
        "artifact_saved",
        "result_verified"
      ]
    };
  }

  return {
    id: activeWorkflowState?.goal?.id || activeWorkflowState?.goalId || null,
    type: corePlan?.projectDraft?.type || "conversation",
    action: activeWorkflowState?.action || null,
    subject: corePlan?.projectDraft?.subtype || null,
    name: corePlan?.projectDraft?.title || "workspace request",
    workflowId: getWorkflowId(corePlan, activeWorkflowState),
    source: activeWorkflowState?.module || "navigator",
    completionCriteria: []
  };
}

function buildGoalState(goal, workflowState = null) {
  const enrichedWorkflowState = enrichWorkflowStateWithGoal(workflowState || {});

  if (enrichedWorkflowState.goalState) {
    return enrichedWorkflowState.goalState;
  }

  if (goal?.subject === "chapter" && goal?.workflowId === "production_book") {
    return createChapterGoalState({
      goalId: goal.id || undefined
    });
  }

  return {
    goal,
    status: goal?.workflowId ? "active" : "idle",
    currentPhase: workflowState?.conversationMode || (goal?.workflowId ? "routing" : "idle"),
    progress: {
      currentQuestionIndex: workflowState?.currentQuestionIndex ?? null,
      answersCount: workflowState?.answers ? Object.keys(workflowState.answers).length : 0,
      completed: Boolean(workflowState?.completed)
    },
    completionCriteria: goal?.completionCriteria || []
  };
}

function getNextAction(goal, workflowState = null) {
  const goalState = updateChapterGoalState(workflowState || {});
  const goalProgress = calculateGoalProgress(goalState || {}, workflowState || {});

  if (goalProgress.nextBestStep && goalProgress.nextBestStep !== "respond") {
    return goalProgress.nextBestStep;
  }

  if (goal?.name === "create chapter" && !workflowState?.completed) {
    return "continue_chapter_intake";
  }

  if (goal?.name === "create chapter" && workflowState?.completed) {
    return "prepare_chapter_draft";
  }

  return workflowState?.completed ? "complete" : "respond";
}

function getCompletionStatus(workflowState = null) {
  const goalState = updateChapterGoalState(workflowState || {});
  const goalProgress = calculateGoalProgress(goalState || {}, workflowState || {});

  if (goalProgress.missingCriteria?.length) {
    return "in_progress";
  }

  if (goalProgress.nextBestStep === "complete_goal") {
    return "completed";
  }

  if (workflowState?.workflow || workflowState?.conversationMode) {
    return "in_progress";
  }

  return "not_started";
}

function getCompletionStatusFromVerification(verificationResult = null, workflowState = null) {
  if (verificationResult?.goalCompleted) {
    return "completed";
  }

  if (verificationResult && verificationResult.shouldContinue !== false) {
    return "in_progress";
  }

  return getCompletionStatus(workflowState);
}

function buildWorkflowAnswers(workflowState = null) {
  const answers = workflowState?.answers && typeof workflowState.answers === "object"
    ? workflowState.answers
    : {};

  return Object.entries(answers).map(([key, value]) => ({
    key,
    value,
    source: "workflow_state"
  }));
}

function buildPolicyContextPack(contextPack = null, workflowState = null, project = null, artifacts = []) {
  const effectiveProject = project || contextPack?.activeProjectData || contextPack?.activeProject || null;
  const effectiveArtifacts = artifacts.length
    ? artifacts
    : (Array.isArray(contextPack?.relevantArtifacts) ? contextPack.relevantArtifacts : []);

  return {
    ...(contextPack || {}),
    activeWorkflow: workflowState
      ? {
        ...(contextPack?.activeWorkflow || {}),
        workflowId: workflowState.workflow || contextPack?.activeWorkflow?.workflowId || null,
        action: workflowState.action || contextPack?.activeWorkflow?.action || null,
        conversationMode: workflowState.conversationMode || contextPack?.activeWorkflow?.conversationMode || null,
        linkedProjectId: workflowState.linkedProjectId || effectiveProject?.id || null,
        goalId: workflowState.goalId || workflowState.goalState?.goalId || effectiveProject?.goalId || null,
        nextBestStep: workflowState.goalProgress?.nextBestStep || contextPack?.activeWorkflow?.nextBestStep || null,
        state: workflowState,
        source: "workflow_state"
      }
      : contextPack?.activeWorkflow || null,
    activeProject: effectiveProject
      ? {
        ...(contextPack?.activeProject || {}),
        id: effectiveProject.id,
        title: effectiveProject.title,
        type: effectiveProject.type,
        subtype: effectiveProject.subtype,
        status: effectiveProject.status,
        workflowId: effectiveProject.workflowId,
        goalId: effectiveProject.goalId || workflowState?.goalState?.goalId || workflowState?.goalId || null,
        source: "project"
      }
      : contextPack?.activeProject || null,
    activeProjectData: effectiveProject || null,
    relevantArtifacts: effectiveArtifacts.map((artifact) => ({
      ...(artifact || {}),
      projectId: artifact.projectId || effectiveProject?.id || null,
      source: artifact.source || "artifact"
    })),
    workflowAnswers: buildWorkflowAnswers(workflowState),
    permissions: {
      ...(contextPack?.permissions || {})
    }
  };
}

export function buildNavigatorDecision({
  userText = "",
  workspaceIntent = "none",
  workspaceRouting = null,
  corePlan = null,
  activeWorkflowState = null,
  workflowState = null,
  decisionSource = "workspace_router",
  continuation = false,
  conflicts = [],
  fallbackUsed = false,
  traceId = createTraceId()
} = {}) {
  const effectiveWorkflowState = workflowState || activeWorkflowState || null;
  const workflowId = getWorkflowId(corePlan, effectiveWorkflowState);
  const goal = buildGoal(userText, effectiveWorkflowState, corePlan);
  const route = getRoute(workspaceIntent, corePlan, effectiveWorkflowState);
  const agentId = corePlan?.agent || selectAgent(corePlan?.intent || route.intent || "unknown");
  const nextAction = getNextAction(goal, effectiveWorkflowState);

  return {
    goal,
    route,
    workflowId,
    agentId,
    nextAction,
    decisionSource,
    continuation,
    conflicts,
    fallbackUsed,
    reason: continuation
      ? "active workflow state takes priority over new classification"
      : workspaceRouting?.source || "workspace/core routing wrapper",
    confidence: goal?.name === "create chapter" ? "high" : "medium",
    risk: "low",
    traceId
  };
}

export function buildWorkspaceResponse({
  text = "",
  decision = null,
  workflowState = null,
  contextPack = null,
  permissions = {},
  traceId = createTraceId()
} = {}) {
  let enrichedWorkflowState = enrichWorkflowStateWithGoal(workflowState || {});
  let goalState = buildGoalState(decision?.goal || null, enrichedWorkflowState);
  let goalProgress = calculateGoalProgress(goalState || {}, enrichedWorkflowState);
  const projectPackage = buildChapterProjectPackage({
    workflowState: enrichedWorkflowState,
    goalState,
    goalProgress
  });

  if (projectPackage) {
    enrichedWorkflowState = enrichWorkflowStateWithGoal(projectPackage.workflowState);
    goalState = projectPackage.goalState;
    goalProgress = calculateGoalProgress(goalState || {}, enrichedWorkflowState);
  }

  const nextAction = goalProgress.nextBestStep || decision?.nextAction || getNextAction(decision?.goal, enrichedWorkflowState);
  const policyContextPack = buildPolicyContextPack(
    contextPack,
    enrichedWorkflowState,
    projectPackage?.project || contextPack?.activeProjectData || contextPack?.activeProject || null,
    projectPackage?.artifacts || contextPack?.relevantArtifacts || []
  );
  const actionDecision = decideAskInferActConfirm({
    goalState,
    goalProgress,
    contextPack: policyContextPack,
    nextAction,
    permissions: {
      ...(contextPack?.permissions || {}),
      ...(permissions || {})
    },
    risk: decision?.risk || "low"
  });
  const actionHistoryEntry = {
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "action_policy_decision",
    mode: actionDecision.mode,
    reason: actionDecision.reason,
    missingRequiredContext: actionDecision.missingRequiredContext,
    inferredValues: actionDecision.inferredValues,
    requiresConfirmation: actionDecision.requiresConfirmation,
    nextAction,
    createdAt: new Date().toISOString(),
    source: "action_policy"
  };

  let project = projectPackage?.project || policyContextPack.activeProjectData || null;
  let responseArtifacts = projectPackage?.artifacts || [];
  let toolResult = null;

  if (actionDecision.requiresConfirmation) {
    toolResult = executeToolRequest({
      task: {
        action: "external_action"
      },
      input: {
        requestedAction: nextAction,
        traceId
      },
      project,
      workflowState: enrichedWorkflowState,
      goalState,
      permissions: {
        ...(contextPack?.permissions || {}),
        ...(permissions || {}),
        allowExternalActions: false
      },
      contextPack: policyContextPack
    });
  } else if (actionDecision.mode === "ACT" && actionDecision.canContinueAutomatically && nextAction === "create_chapter_draft") {
    toolResult = executeToolRequest({
      task: {
        action: nextAction
      },
      input: {
        nextAction,
        traceId
      },
      project,
      workflowState: enrichedWorkflowState,
      goalState,
      permissions: {
        ...(contextPack?.permissions || {}),
        ...(permissions || {})
      },
      contextPack: policyContextPack
    });

    if (toolResult?.ok) {
      project = toolResult.projectUpdates || project;
      enrichedWorkflowState = toolResult.workflowUpdates || enrichedWorkflowState;
      goalState = enrichedWorkflowState.goalState || goalState;
      responseArtifacts = project?.artifacts?.length ? project.artifacts : (toolResult.artifacts?.length ? toolResult.artifacts : responseArtifacts);
      goalProgress = calculateGoalProgress(goalState || {}, enrichedWorkflowState);
    }
  }

  const verificationResult = verifyGoalProgress({
    goalState,
    goalProgress,
    workflowState: enrichedWorkflowState,
    project,
    artifacts: responseArtifacts,
    actionDecision,
    contextPack: policyContextPack
  });
  goalProgress = buildVerifiedGoalProgress(verificationResult);
  const verificationHistoryEntry = {
    id: `verification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "verification_result",
    passed: verificationResult.passed,
    goalCompleted: verificationResult.goalCompleted,
    missingCriteria: verificationResult.missingCriteria,
    invalidCriteria: verificationResult.invalidCriteria,
    nextBestStep: verificationResult.nextBestStep,
    correctionNeeded: verificationResult.correctionNeeded,
    createdAt: verificationResult.verifiedAt || new Date().toISOString(),
    source: "verifier"
  };

  if (goalState && goalState.subject === "chapter") {
    goalState = {
      ...goalState,
      status: verificationResult.goalCompleted ? "completed" : "in_progress",
      progress: {
        requirements_collected: verificationResult.completedCriteria.includes("requirements_collected"),
        chapter_structure_created: verificationResult.completedCriteria.includes("chapter_structure_created"),
        draft_created: verificationResult.completedCriteria.includes("draft_created"),
        artifact_saved: verificationResult.completedCriteria.includes("artifact_saved"),
        result_verified: verificationResult.completedCriteria.includes("result_verified")
      },
      decisions: [
        ...(Array.isArray(goalState.decisions) ? goalState.decisions : []),
        actionHistoryEntry,
        verificationHistoryEntry
      ].slice(-20),
      updatedAt: verificationHistoryEntry.createdAt
    };

    enrichedWorkflowState = {
      ...enrichedWorkflowState,
      resultVerified: verificationResult.completedCriteria.includes("result_verified"),
      completed: verificationResult.goalCompleted,
      goalState,
      actionDecision,
      verificationResult,
      goalProgress
    };
  }

  if (project && goalState) {
    project = {
      ...project,
      goalState,
      workflowState: {
        ...(project.workflowState || {}),
        goalState,
        actionDecision,
        toolResult,
        verificationResult,
        goalProgress
      },
      history: [
        ...(Array.isArray(project.history) ? project.history : []),
        actionHistoryEntry,
        ...(toolResult?.executionTrace || []),
        verificationHistoryEntry
      ].slice(-20),
      updatedAt: verificationHistoryEntry.createdAt
    };
  }

  return {
    text,
    decision: decision
      ? {
        ...decision,
        goal: {
          ...(decision.goal || {}),
          id: goalState?.goalId || decision.goal?.id || null,
          desiredOutcome: goalState?.desiredOutcome || decision.goal?.desiredOutcome || null
        },
        nextAction: verificationResult.nextBestStep || nextAction,
        actionDecision,
        verificationResult,
        toolResult
      }
      : null,
    goalState,
    goalProgress,
    workflowState: enrichedWorkflowState,
    project,
    artifacts: responseArtifacts,
    nextAction: verificationResult.nextBestStep || nextAction,
    actionDecision,
    toolResult,
    verificationResult,
    completionStatus: getCompletionStatusFromVerification(verificationResult, enrichedWorkflowState),
    traceId
  };
}
