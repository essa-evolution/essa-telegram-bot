import { buildSystemCapabilitySnapshot } from "./capabilityRegistry.js";
import { buildNavigatorProductDiscoveryResponse, isProductDiscoveryQuery } from "./productKnowledgeBridge.js";
import { createDynamicExpressionContext, hasDynamicExpressionContext } from "../identity/dynamicExpressionContext.js";
import { loadLisaCharacterCore } from "../identity/lisaCharacterCore.js";
import { getLisaProductionProfile } from "../identity/lisaProductionProfile.js";
import { buildBoundedPropertyContext, isPropertyDiscoveryQuery } from "../property/index.js";

function createId(prefix = "ctx") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value = "") {
  return String(value || "").toLowerCase();
}

function compactConversation(conversation = [], limit = 6) {
  return Array.isArray(conversation)
    ? conversation.slice(-limit).map((item) => ({
      role: item.role || "unknown",
      content: String(item.content || "").slice(0, 1200),
      source: "conversation"
    }))
    : [];
}

function getProjectArtifacts(project = null) {
  if (!project) {
    return [];
  }

  const directArtifacts = Array.isArray(project.artifacts) ? project.artifacts : [];
  const assetArtifacts = Object.entries(project.assets || {}).flatMap(([category, items]) =>
    Array.isArray(items)
      ? items.map((item) => ({
        ...item,
        category,
        source: "asset"
      }))
      : []
  );
  const byId = new Map();

  [...directArtifacts, ...assetArtifacts].forEach((artifact) => {
    if (artifact?.id) {
      byId.set(artifact.id, artifact);
    }
  });

  return [...byId.values()];
}

function isContinuationReference(userText = "") {
  const text = normalizeText(userText);

  return [
    "продолжим",
    "продолжи",
    "вернёмся к главе",
    "вернемся к главе",
    "сделай как раньше",
    "используй тот же стиль"
  ].some((marker) => text.includes(marker));
}

function needsEssaKnowledge(userText = "", context = {}) {
  const text = normalizeText(userText);
  const continuationOnly = isContinuationReference(text) && context.activeProject;

  if (continuationOnly) {
    return false;
  }

  return [
    "essa",
    "эсса",
    "сознани",
    "концепц",
    "философ",
    "knowledge",
    "знани"
  ].some((marker) => text.includes(marker));
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

function buildMissingContext({ workflowState = null, project = null, artifacts = [] } = {}) {
  const missing = [];
  const answers = workflowState?.answers || {};

  if (workflowState?.workflow === "production_book" && workflowState?.action === "chapter") {
    [
      ["0", "chapter_topic"],
      ["1", "book_context"],
      ["2", "chapter_style"],
      ["3", "desired_reader_effect"],
      ["4", "existing_material"]
    ].forEach(([key, label]) => {
      if (!String(answers[key] || answers[Number(key)] || "").trim()) {
        missing.push(label);
      }
    });

    if (!project) {
      missing.push("project");
    }

    if (!artifacts.some((item) => item.type === "chapter_outline")) {
      missing.push("chapter_outline");
    }

    if (!workflowState?.linkedProjectId && !project?.id) {
      missing.push("linkedProjectId");
    }
  }

  return [...new Set(missing)];
}

function buildContextSources(contextPack) {
  const sources = [];

  if (contextPack.conversationContext.length) sources.push("conversation");
  if (contextPack.activeGoal) sources.push("goal_state");
  if (contextPack.activeWorkflow) sources.push("workflow_state");
  if (contextPack.activeProject) sources.push("project");
  if (contextPack.relevantArtifacts.length) sources.push("artifact");
  if (contextPack.profileMemory) sources.push("profile_memory");
  if (contextPack.essaKnowledge.length) sources.push("knowledge");
  if (contextPack.identityContext) sources.push("identity");
  if (contextPack.characterCore) sources.push("character_core");
  if (contextPack.expressionContext) sources.push("expression_context");
  if (contextPack.productionProfile) sources.push("production_profile");
  if (contextPack.productionIntent) sources.push("production_intent");
  if (contextPack.systemCapabilities?.capabilities?.length) sources.push("capability_registry");
  if (contextPack.productDiscovery?.matchedCapabilities?.length || contextPack.productDiscovery?.matchedProducts?.length) {
    sources.push("product_knowledge");
  }
  if (contextPack.propertyContext?.passport?.propertyId) sources.push("property_passport");

  return sources;
}

export async function buildContextPack({
  userText = "",
  sessionId = "default",
  conversation = [],
  activeGoal = null,
  activeWorkflowState = null,
  activeProject = null,
  activeProjectId = null,
  identitySnapshot = null,
  expressionContext = null,
  productionIntent = null,
  permissions = {},
  profileMemory = null,
  projectMemory = null,
  knowledgeSearch = null,
  debugMode = false,
  traceId = createId("trace")
} = {}) {
  const contextPackId = createId("context");
  const project = activeProject || null;
  const useProjectWorkflowAsContinuation = Boolean(activeWorkflowState) ||
    (project && isContinuationReference(userText));
  const workflowState = activeWorkflowState || (useProjectWorkflowAsContinuation ? project?.workflowState : null);
  const goalState = workflowState?.goalState || project?.goalState || activeGoal || null;
  const artifacts = getProjectArtifacts(project);
  const shouldRetrieveKnowledge = needsEssaKnowledge(userText, { activeProject: project, workflowState });
  let essaKnowledge = [];
  let knowledgeRetrieved = false;
  let knowledgeError = null;
  const productDiscovery = isProductDiscoveryQuery(userText)
    ? buildNavigatorProductDiscoveryResponse({
      query: userText,
      maxResults: 6,
      contextBudget: { maxItems: 5, maxChars: 1600 }
    })
    : null;
  const propertyContext = isPropertyDiscoveryQuery(userText)
    ? buildBoundedPropertyContext({
      query: userText,
      maxItems: 4,
      maxChars: 1600
    })
    : null;

  if (shouldRetrieveKnowledge && typeof knowledgeSearch === "function") {
    try {
      essaKnowledge = await knowledgeSearch(userText, {
        matchCount: 4,
        similarityThreshold: 0.2
      });
      knowledgeRetrieved = true;
    } catch (error) {
      knowledgeError = error.message || String(error);
    }
  }

  const contextPack = {
    contextPackId,
    traceId,
    sessionId,
    userText: String(userText || "").slice(0, 1200),
    conversationContext: compactConversation(conversation),
    activeGoal: goalState
      ? {
        ...goalState,
        source: "goal_state"
      }
      : null,
    activeWorkflow: workflowState
      ? {
        workflowId: workflowState.workflow || project?.workflowId || null,
        action: workflowState.action || null,
        conversationMode: workflowState.conversationMode || null,
        linkedProjectId: workflowState.linkedProjectId || project?.id || activeProjectId || null,
        goalId: workflowState.goalId || goalState?.goalId || project?.goalId || null,
        nextBestStep: workflowState.goalProgress?.nextBestStep || null,
        state: workflowState,
        source: "workflow_state"
      }
      : null,
    activeProject: project
      ? {
        id: project.id,
        title: project.title,
        type: project.type,
        subtype: project.subtype,
        status: project.status,
        workflowId: project.workflowId,
        goalId: project.goalId || goalState?.goalId || null,
        source: "project"
      }
      : null,
    activeProjectData: project || null,
    relevantArtifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      projectId: artifact.projectId || project?.id || null,
      type: artifact.type,
      title: artifact.title,
      status: artifact.status,
      sourceStepId: artifact.sourceStepId || null,
      contentPreview: String(artifact.content || "").slice(0, 1200),
      source: "artifact"
    })),
    workflowAnswers: buildWorkflowAnswers(workflowState),
    previousDecisions: [
      ...(Array.isArray(goalState?.decisions) ? goalState.decisions : []),
      ...(Array.isArray(project?.history) ? project.history : [])
    ].slice(-10).map((item) => ({
      ...item,
      source: item.source || "project"
    })),
    rejectedOptions: Array.isArray(goalState?.rejectedOptions)
      ? goalState.rejectedOptions.map((item) => ({ value: item, source: "goal_state" }))
      : [],
    profileMemory,
    projectMemory: projectMemory || (project
      ? {
        status: project.status,
        history: Array.isArray(project.history) ? project.history.slice(-10) : [],
        source: "project"
      }
      : null),
    essaKnowledge: essaKnowledge.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      sourcePath: chunk.source_path,
      contentPreview: String(chunk.content || "").slice(0, 1200),
      source: "knowledge"
    })),
    identityContext: identitySnapshot
      ? {
        id: identitySnapshot.id,
        name: identitySnapshot.name,
        type: identitySnapshot.type,
        source: "identity"
      }
      : null,
    characterCore: identitySnapshot?.id === "lisa"
      ? loadLisaCharacterCore({ includeContent: false })
      : null,
    expressionContext: hasDynamicExpressionContext(expressionContext)
      ? createDynamicExpressionContext(expressionContext)
      : null,
    productionProfile: identitySnapshot?.id === "lisa"
      ? getLisaProductionProfile(identitySnapshot.id)
      : null,
    productionIntent: productionIntent || null,
    permissions,
    systemCapabilities: buildSystemCapabilitySnapshot({
      userText,
      workflowState,
      goalState,
      project,
      permissions
    }),
    productDiscovery,
    propertyContext,
    contextSources: [],
    missingContext: [],
    knowledgeRetrieved,
    knowledgeNeeded: shouldRetrieveKnowledge,
    knowledgeError,
    debugMode
  };

  contextPack.missingContext = buildMissingContext({
    workflowState,
    project,
    artifacts
  });
  contextPack.contextSources = buildContextSources(contextPack);

  return contextPack;
}

export function isContinuationReferenceText(userText = "") {
  return isContinuationReference(userText);
}
