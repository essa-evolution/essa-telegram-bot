const CHAPTER_CRITERIA = [
  "requirements_collected",
  "chapter_structure_created",
  "draft_created",
  "artifact_saved",
  "result_verified"
];

const VALID_ARTIFACT_STATUSES = new Set(["saved", "draft", "ready", "verified"]);

function nowIso() {
  return new Date().toISOString();
}

function isChapterGoal(goalState = {}, workflowState = {}) {
  return goalState?.subject === "chapter" ||
    workflowState?.action === "chapter" ||
    workflowState?.workflow === "production_book";
}

function getAnswers(workflowState = {}) {
  return workflowState?.answers && typeof workflowState.answers === "object"
    ? workflowState.answers
    : {};
}

function hasAnswer(answers = {}, key) {
  return String(answers[key] || answers[String(key)] || "").trim().length > 0;
}

function collectArtifacts(project = null, artifacts = [], contextPack = null) {
  const collected = [];
  const directArtifacts = Array.isArray(artifacts) ? artifacts : [];
  const projectArtifacts = Array.isArray(project?.artifacts) ? project.artifacts : [];
  const assetArtifacts = Object.values(project?.assets || {}).flatMap((items) =>
    Array.isArray(items) ? items : []
  );
  const contextArtifacts = Array.isArray(contextPack?.relevantArtifacts)
    ? contextPack.relevantArtifacts
    : [];

  [...directArtifacts, ...projectArtifacts, ...assetArtifacts, ...contextArtifacts].forEach((artifact) => {
    if (artifact?.id && !collected.some((item) => item.id === artifact.id)) {
      collected.push(artifact);
    }
  });

  return collected;
}

function artifactContent(artifact = {}) {
  return String(artifact.content || artifact.contentPreview || artifact.text || "").trim();
}

function artifactIsInProject(artifact = {}, project = null, artifacts = []) {
  if (!artifact?.id) {
    return false;
  }

  const directIds = new Set((Array.isArray(artifacts) ? artifacts : []).map((item) => item?.id).filter(Boolean));
  const projectIds = new Set([
    ...(Array.isArray(project?.artifacts) ? project.artifacts : []),
    ...Object.values(project?.assets || {}).flatMap((items) => Array.isArray(items) ? items : [])
  ].map((item) => item?.id).filter(Boolean));

  return directIds.has(artifact.id) || projectIds.has(artifact.id);
}

function checkArtifact(artifact = {}, {
  expectedType,
  expectedProjectId = null,
  expectedSourceStepId = null,
  project = null,
  artifacts = []
} = {}) {
  const failures = [];
  const content = artifactContent(artifact);

  if (!artifact?.id) failures.push("missing_id");
  if (expectedProjectId && artifact.projectId !== expectedProjectId) failures.push("project_id_mismatch");
  if (expectedType && artifact.type !== expectedType) failures.push("unexpected_type");
  if (!content) failures.push("empty_content");
  if (!VALID_ARTIFACT_STATUSES.has(artifact.status)) failures.push("invalid_status");
  if (expectedSourceStepId && artifact.sourceStepId !== expectedSourceStepId) failures.push("source_step_mismatch");
  if (!artifactIsInProject(artifact, project, artifacts)) failures.push("not_present_in_project_or_response");

  return {
    id: artifact?.id || null,
    projectId: artifact?.projectId || null,
    type: artifact?.type || null,
    expectedType,
    status: artifact?.status || null,
    sourceStepId: artifact?.sourceStepId || null,
    expectedSourceStepId,
    contentLength: content.length,
    presentInProjectOrResponse: artifactIsInProject(artifact, project, artifacts),
    passed: failures.length === 0,
    failures
  };
}

function nextStepForMissing(missingCriteria = [], invalidCriteria = []) {
  const firstInvalid = invalidCriteria[0];

  if (firstInvalid === "chapter_structure_created") return "repair_chapter_outline";
  if (firstInvalid === "draft_created") return "repair_chapter_draft";
  if (firstInvalid === "artifact_saved") return "repair_artifact_save";

  if (missingCriteria.includes("requirements_collected")) return "continue_chapter_intake";
  if (missingCriteria.includes("chapter_structure_created")) return "create_chapter_structure";
  if (missingCriteria.includes("draft_created")) return "create_chapter_draft";
  if (missingCriteria.includes("artifact_saved")) return "save_chapter_artifact";
  if (missingCriteria.includes("result_verified")) return "verify_chapter_result";

  return "complete_goal";
}

function progressFromCompleted(completedCriteria = [], nextBestStep = "respond") {
  const completedSet = new Set(completedCriteria);
  const missingCriteria = CHAPTER_CRITERIA.filter((criterion) => !completedSet.has(criterion));

  return {
    completedCriteria: CHAPTER_CRITERIA.filter((criterion) => completedSet.has(criterion)),
    missingCriteria,
    progressPercent: Math.round((completedSet.size / CHAPTER_CRITERIA.length) * 100),
    nextBestStep,
    canContinueWithoutAsking: nextBestStep !== "continue_chapter_intake" &&
      nextBestStep !== "complete_goal" &&
      nextBestStep !== "respond"
  };
}

function safeFailure(error, goalProgress = null) {
  const missingCriteria = goalProgress?.missingCriteria?.length
    ? goalProgress.missingCriteria
    : CHAPTER_CRITERIA;

  return {
    passed: false,
    goalCompleted: false,
    completedCriteria: goalProgress?.completedCriteria || [],
    missingCriteria,
    invalidCriteria: [],
    artifactChecks: [],
    qualityStatus: "verification_unavailable",
    shouldContinue: true,
    correctionNeeded: false,
    nextBestStep: nextStepForMissing(missingCriteria),
    reason: `verifier unavailable; keeping goal in progress: ${error.message || String(error)}`,
    verifiedAt: nowIso()
  };
}

export function verifyGoalProgress({
  goalState = null,
  goalProgress = null,
  workflowState = null,
  project = null,
  artifacts = [],
  actionDecision = null,
  contextPack = null
} = {}) {
  try {
    if (!isChapterGoal(goalState || {}, workflowState || {})) {
      return {
        passed: false,
        goalCompleted: false,
        completedCriteria: goalProgress?.completedCriteria || [],
        missingCriteria: goalProgress?.missingCriteria || [],
        invalidCriteria: [],
        artifactChecks: [],
        qualityStatus: "not_applicable",
        shouldContinue: false,
        correctionNeeded: false,
        nextBestStep: goalProgress?.nextBestStep || "respond",
        reason: "no production_book chapter goal to verify",
        verifiedAt: nowIso()
      };
    }

    const answers = getAnswers(workflowState || {});
    const effectiveProjectId = project?.id || workflowState?.linkedProjectId || contextPack?.activeProject?.id || null;
    const allArtifacts = collectArtifacts(project, artifacts, contextPack);
    const outlineArtifact = allArtifacts.find((artifact) => artifact.type === "chapter_outline");
    const draftArtifact = allArtifacts.find((artifact) => artifact.type === "chapter_draft");
    const artifactChecks = [];
    const invalidCriteria = [];
    const completedCriteria = [];
    const requirementsCollected = [0, 1, 2, 3, 4].every((key) => hasAnswer(answers, key));

    if (requirementsCollected) {
      completedCriteria.push("requirements_collected");
    }

    if (outlineArtifact) {
      const outlineCheck = checkArtifact(outlineArtifact, {
        expectedType: "chapter_outline",
        expectedProjectId: effectiveProjectId,
        expectedSourceStepId: "create_chapter_structure",
        project,
        artifacts
      });
      artifactChecks.push(outlineCheck);

      if (outlineCheck.passed) {
        completedCriteria.push("chapter_structure_created");
      } else {
        invalidCriteria.push("chapter_structure_created");
      }
    }

    if (draftArtifact) {
      const draftCheck = checkArtifact(draftArtifact, {
        expectedType: "chapter_draft",
        expectedProjectId: effectiveProjectId,
        expectedSourceStepId: "create_chapter_draft",
        project,
        artifacts
      });
      artifactChecks.push(draftCheck);

      if (draftCheck.passed) {
        completedCriteria.push("draft_created");
      } else {
        invalidCriteria.push("draft_created");
      }
    }

    const requiredArtifactsSaved = Boolean(outlineArtifact) &&
      artifactChecks
        .filter((check) => ["chapter_outline", "chapter_draft"].includes(check.expectedType))
        .every((check) => check.presentInProjectOrResponse && check.passed);

    if (requiredArtifactsSaved && completedCriteria.includes("chapter_structure_created")) {
      completedCriteria.push("artifact_saved");
    } else if (workflowState?.artifactSaved || goalState?.progress?.artifact_saved) {
      invalidCriteria.push("artifact_saved");
    }

    const structurallyPassed = completedCriteria.includes("requirements_collected") &&
      completedCriteria.includes("chapter_structure_created") &&
      completedCriteria.includes("draft_created") &&
      completedCriteria.includes("artifact_saved") &&
      invalidCriteria.length === 0;

    if (structurallyPassed) {
      completedCriteria.push("result_verified");
    }

    const uniqueCompletedCriteria = [...new Set(completedCriteria)];
    const missingCriteria = CHAPTER_CRITERIA.filter((criterion) => !uniqueCompletedCriteria.includes(criterion));
    const goalCompleted = missingCriteria.length === 0;
    const correctionNeeded = invalidCriteria.length > 0;
    const nextBestStep = nextStepForMissing(missingCriteria, invalidCriteria);
    const failedArtifactReasons = artifactChecks.flatMap((check) => check.failures.map((failure) => `${check.expectedType}:${failure}`));

    return {
      passed: structurallyPassed,
      goalCompleted,
      completedCriteria: uniqueCompletedCriteria,
      missingCriteria,
      invalidCriteria: [...new Set(invalidCriteria)],
      artifactChecks,
      qualityStatus: correctionNeeded ? "needs_correction" : (goalCompleted ? "verified" : "incomplete"),
      shouldContinue: !goalCompleted,
      correctionNeeded,
      nextBestStep,
      reason: goalCompleted
        ? "all required chapter criteria are structurally complete and verified"
        : [
          missingCriteria.length ? `missing criteria: ${missingCriteria.join(", ")}` : "",
          failedArtifactReasons.length ? `artifact issues: ${failedArtifactReasons.join(", ")}` : "",
          actionDecision?.mode ? `policy mode: ${actionDecision.mode}` : ""
        ].filter(Boolean).join("; "),
      verifiedAt: nowIso()
    };
  } catch (error) {
    return safeFailure(error, goalProgress);
  }
}

export function buildVerifiedGoalProgress(verificationResult = null) {
  if (!verificationResult) {
    return progressFromCompleted([], "respond");
  }

  return {
    completedCriteria: verificationResult.completedCriteria || [],
    missingCriteria: verificationResult.missingCriteria || [],
    progressPercent: Math.round(((verificationResult.completedCriteria || []).length / CHAPTER_CRITERIA.length) * 100),
    nextBestStep: verificationResult.nextBestStep || "respond",
    canContinueWithoutAsking: Boolean(verificationResult.shouldContinue) &&
      !verificationResult.correctionNeeded &&
      !["continue_chapter_intake", "complete_goal", "respond"].includes(verificationResult.nextBestStep)
  };
}

