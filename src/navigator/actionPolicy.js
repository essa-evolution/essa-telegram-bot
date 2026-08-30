const MODE = {
  ASK: "ASK",
  INFER: "INFER",
  ACT: "ACT",
  CONFIRM: "CONFIRM"
};

const ANSWER_LABELS = {
  chapter_topic: ["0", 0],
  book_context: ["1", 1],
  chapter_style: ["2", 2],
  desired_reader_effect: ["3", 3],
  existing_material: ["4", 4]
};

function normalizeText(value = "") {
  return String(value || "").toLowerCase();
}

function hasAny(text = "", markers = []) {
  const normalized = normalizeText(text);

  return markers.some((marker) => normalized.includes(normalizeText(marker)));
}

function getContextUserText(contextPack = {}) {
  return contextPack.userText ||
    contextPack.currentUserText ||
    contextPack.conversationContext?.at?.(-1)?.content ||
    "";
}

function getAnswer(contextPack = {}, label) {
  const keys = ANSWER_LABELS[label] || [];
  const answers = contextPack.activeWorkflow?.state?.answers || {};

  for (const key of keys) {
    if (String(answers[key] || "").trim()) {
      return answers[key];
    }
  }

  const answerItem = (contextPack.workflowAnswers || []).find((item) =>
    keys.map(String).includes(String(item.key))
  );

  return answerItem?.value || null;
}

function findPriorStyle(contextPack = {}) {
  const styleAnswer = getAnswer(contextPack, "chapter_style");

  if (styleAnswer) {
    return {
      chapter_style: styleAnswer,
      source: "workflow_state"
    };
  }

  const artifactStyle = (contextPack.relevantArtifacts || [])
    .map((artifact) => artifact.contentPreview || "")
    .find((preview) => /style|tone|стил|тон|голос/i.test(preview));

  if (artifactStyle) {
    return {
      chapter_style: "reuse_saved_project_style",
      source: "artifact"
    };
  }

  return null;
}

function isActiveChapterGoal(goalState = {}, contextPack = {}) {
  return goalState?.subject === "chapter" ||
    contextPack.activeWorkflow?.workflowId === "production_book" ||
    contextPack.activeProject?.workflowId === "production_book";
}

function isInternalReversibleAction(nextAction = "") {
  return [
    "continue_chapter_intake",
    "create_chapter_structure",
    "create_chapter_draft",
    "save_chapter_artifact",
    "verify_chapter_result",
    "respond"
  ].includes(nextAction);
}

function classifyUserInstruction(userText = "") {
  return {
    doItYourself: hasAny(userText, [
      "сделай сам",
      "сделай сама",
      "не спрашивай",
      "без вопросов",
      "сам реши",
      "сама реши",
      "do it yourself",
      "don't ask",
      "dont ask"
    ]),
    showFirst: hasAny(userText, [
      "сначала покажи",
      "покажи сначала",
      "show me first",
      "review first"
    ]),
    noPublishingWithoutMe: hasAny(userText, [
      "ничего не публикуй",
      "не публикуй без",
      "не отправляй без",
      "don't publish",
      "dont publish",
      "do not publish"
    ]),
    externalActionRequested: hasAny(userText, [
      "опубликуй",
      "запости",
      "выложи",
      "отправь",
      "youtube",
      "ютуб",
      "instagram",
      "telegram",
      "tiktok",
      "reels",
      "send",
      "publish",
      "post"
    ]),
    destructiveActionRequested: hasAny(userText, [
      "удали",
      "сотри",
      "destroy",
      "delete",
      "remove permanently"
    ]),
    paidActionRequested: hasAny(userText, [
      "купи",
      "оплати",
      "заплати",
      "платно",
      "buy",
      "pay",
      "purchase"
    ]),
    reuseContext: hasAny(userText, [
      "как раньше",
      "как в прошлый раз",
      "тот же стиль",
      "тот же тон",
      "сделай так же",
      "используй тот же",
      "same style",
      "like before",
      "as before",
      "reuse"
    ])
  };
}

function classifyMissingContext({ goalState = null, goalProgress = null, contextPack = {}, nextAction = "" } = {}) {
  const missing = new Set(contextPack.missingContext || []);
  const required = [];
  const optional = [];
  const inferable = [];
  const permission = [];
  const inferredValues = {};

  if (!isActiveChapterGoal(goalState, contextPack)) {
    return {
      required,
      optional,
      inferable,
      permission,
      inferredValues
    };
  }

  if (missing.has("chapter_topic") && !getAnswer(contextPack, "chapter_topic")) {
    required.push("chapter_topic");
  }

  if (missing.has("book_context") && !getAnswer(contextPack, "book_context")) {
    optional.push("book_context");
    inferable.push("book_context");
    inferredValues.book_context = {
      value: "standalone_chapter",
      source: "policy_default",
      reversible: true
    };
  }

  if (missing.has("chapter_style") && !getAnswer(contextPack, "chapter_style")) {
    const priorStyle = findPriorStyle(contextPack);
    optional.push("chapter_style");

    if (priorStyle) {
      inferable.push("chapter_style");
      inferredValues.chapter_style = {
        value: priorStyle.chapter_style,
        source: priorStyle.source,
        reversible: true
      };
    }
  }

  if (missing.has("desired_reader_effect") && !getAnswer(contextPack, "desired_reader_effect")) {
    optional.push("desired_reader_effect");
    inferable.push("desired_reader_effect");
    inferredValues.desired_reader_effect = {
      value: "clear, emotionally grounded chapter",
      source: "policy_default",
      reversible: true
    };
  }

  if (missing.has("existing_material") && !getAnswer(contextPack, "existing_material")) {
    optional.push("existing_material");
    inferable.push("existing_material");
    inferredValues.existing_material = {
      value: "none",
      source: "policy_default",
      reversible: true
    };
  }

  if (missing.has("project") || missing.has("linkedProjectId")) {
    if (["create_chapter_structure", "create_chapter_draft", "save_chapter_artifact"].includes(nextAction)) {
      inferable.push("project");
      inferredValues.project = {
        value: contextPack.activeProject?.id || "create_internal_project",
        source: contextPack.activeProject ? "project" : "internal_save_permission",
        reversible: true
      };
    } else {
      optional.push("project");
    }
  }

  if (missing.has("chapter_outline")) {
    if (goalProgress?.completedCriteria?.includes("requirements_collected") || nextAction === "create_chapter_structure") {
      inferable.push("chapter_outline");
      inferredValues.chapter_outline = {
        value: "create_from_collected_intake",
        source: "workflow_answers",
        reversible: true
      };
    } else {
      optional.push("chapter_outline");
    }
  }

  return {
    required: [...new Set(required)],
    optional: [...new Set(optional)],
    inferable: [...new Set(inferable)],
    permission: [...new Set(permission)],
    inferredValues
  };
}

function createDecision({
  mode,
  reason,
  missingRequiredContext = [],
  inferredValues = {},
  requiresConfirmation = false,
  canContinueAutomatically = false,
  contextClassification = null,
  capabilityCheck = null
} = {}) {
  return {
    mode,
    reason,
    missingRequiredContext,
    inferredValues,
    requiresConfirmation,
    canContinueAutomatically,
    contextClassification,
    capabilityCheck
  };
}

function capabilityIdForAction(action = "") {
  const normalized = String(action || "").toLowerCase();

  if (normalized === "create_chapter_structure") return "production_chapter_outline";
  if (normalized === "create_chapter_draft") return "production_chapter_draft";
  if (normalized === "save_chapter_artifact") return "internal_project_save";
  if (normalized === "verify_chapter_result") return "internal_artifact_update";
  if (normalized.includes("youtube") || normalized.includes("publish") || normalized === "external_action") return "youtube_publish";
  if (normalized.includes("tiktok")) return "tiktok_publish";
  if (normalized.includes("paid")) return "paid_capability_simulation";
  if (normalized.includes("degraded")) return "degraded_capability_simulation";

  return null;
}

function getCapabilityCheck(contextPack = {}, action = "") {
  const capabilityId = capabilityIdForAction(action);

  if (!capabilityId) {
    return null;
  }

  const snapshotCapability = (contextPack.systemCapabilities?.capabilities || [])
    .find((capability) => capability.capabilityId === capabilityId);

  if (!snapshotCapability) {
    return null;
  }

  return {
    capabilityId,
    status: snapshotCapability.status,
    health: snapshotCapability.health,
    executable: Boolean(snapshotCapability.executable),
    blockingReason: snapshotCapability.blockingReason || null,
    costMode: snapshotCapability.costMode,
    providers: snapshotCapability.providers || []
  };
}

export function decideAskInferActConfirm({
  goalState = null,
  goalProgress = null,
  contextPack = null,
  nextAction = "respond",
  permissions = {},
  risk = "low"
} = {}) {
  try {
    const safeContextPack = contextPack || {};
    const userText = getContextUserText(safeContextPack);
    const instruction = classifyUserInstruction(userText);
    const contextClassification = classifyMissingContext({
      goalState,
      goalProgress,
      contextPack: safeContextPack,
      nextAction
    });
    const requiredNotInferable = contextClassification.required.filter((item) =>
      !contextClassification.inferable.includes(item)
    );
    const hasSensitiveRisk = ["high", "external", "paid", "destructive", "irreversible"].includes(risk);
    const needsConfirmation = hasSensitiveRisk ||
      instruction.externalActionRequested ||
      instruction.destructiveActionRequested ||
      instruction.paidActionRequested ||
      instruction.noPublishingWithoutMe ||
      permissions.requiresConfirmation === true;
    const capabilityCheck = getCapabilityCheck(safeContextPack, nextAction);

    if (needsConfirmation) {
      return createDecision({
        mode: MODE.CONFIRM,
        reason: "external, paid, destructive, sensitive, or user-gated action requires explicit confirmation",
        missingRequiredContext: requiredNotInferable,
        inferredValues: contextClassification.inferredValues,
        requiresConfirmation: true,
        canContinueAutomatically: false,
        contextClassification,
        capabilityCheck
      });
    }

    if (requiredNotInferable.length) {
      return createDecision({
        mode: MODE.ASK,
        reason: "required context is missing and cannot be safely inferred",
        missingRequiredContext: requiredNotInferable,
        inferredValues: contextClassification.inferredValues,
        requiresConfirmation: false,
        canContinueAutomatically: false,
        contextClassification,
        capabilityCheck
      });
    }

    if (capabilityCheck && !capabilityCheck.executable) {
      const requiresCapabilityConfirmation = capabilityCheck.status === "REQUIRES_PAYMENT" ||
        capabilityCheck.status === "NOT_CONNECTED";

      return createDecision({
        mode: requiresCapabilityConfirmation ? MODE.CONFIRM : MODE.ASK,
        reason: `capability is not executable: ${capabilityCheck.blockingReason || capabilityCheck.status}`,
        missingRequiredContext: [],
        inferredValues: contextClassification.inferredValues,
        requiresConfirmation: requiresCapabilityConfirmation,
        canContinueAutomatically: false,
        contextClassification,
        capabilityCheck
      });
    }

    if (instruction.reuseContext && Object.keys(contextClassification.inferredValues).length) {
      return createDecision({
        mode: MODE.INFER,
        reason: "user asked to reuse prior context and the value is available in ContextPack",
        missingRequiredContext: [],
        inferredValues: contextClassification.inferredValues,
        requiresConfirmation: false,
        canContinueAutomatically: true,
        contextClassification,
        capabilityCheck
      });
    }

    if (
      isActiveChapterGoal(goalState, safeContextPack) &&
      nextAction &&
      nextAction !== "respond" &&
      nextAction !== "continue_chapter_intake" &&
      goalProgress?.canContinueWithoutAsking &&
      isInternalReversibleAction(nextAction) &&
      permissions.internalSave !== false
    ) {
      return createDecision({
        mode: MODE.ACT,
        reason: "active goal has enough context and the next step is internal and reversible",
        missingRequiredContext: [],
        inferredValues: contextClassification.inferredValues,
        requiresConfirmation: false,
        canContinueAutomatically: true,
        contextClassification,
        capabilityCheck
      });
    }

    if (instruction.doItYourself && !requiredNotInferable.length && isInternalReversibleAction(nextAction)) {
      const mode = Object.keys(contextClassification.inferredValues).length ? MODE.INFER : MODE.ACT;

      return createDecision({
        mode,
        reason: "user delegated safe internal choices to Navigator",
        missingRequiredContext: [],
        inferredValues: contextClassification.inferredValues,
        requiresConfirmation: false,
        canContinueAutomatically: true,
        contextClassification,
        capabilityCheck
      });
    }

    return createDecision({
      mode: MODE.ASK,
      reason: "no safe automatic action is available for the current request",
      missingRequiredContext: requiredNotInferable,
      inferredValues: contextClassification.inferredValues,
      requiresConfirmation: false,
      canContinueAutomatically: false,
      contextClassification,
      capabilityCheck
    });
  } catch (error) {
    return createDecision({
      mode: MODE.ASK,
      reason: `action policy unavailable; using safe ask behavior: ${error.message || String(error)}`,
      missingRequiredContext: [],
      inferredValues: {},
      requiresConfirmation: false,
      canContinueAutomatically: false,
      contextClassification: null
    });
  }
}
