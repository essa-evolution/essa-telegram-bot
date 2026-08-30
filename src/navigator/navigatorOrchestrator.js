import {
  getWorkflow,
  planEssaRequest,
  selectAgent
} from "../core/index.js";
import { analyzeWorkspaceIntent } from "../workspace/index.js";
import { buildNavigatorDecision } from "./navigatorDecision.js";
import { buildContextPack } from "./contextEngine.js";

function createTraceId(prefix = "workspace") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapCoreIntentToWorkspaceIntent(coreIntent) {
  const mapping = {
    production: "production_studio",
    website: "website_studio",
    property: "property",
    marketing: "marketing_factory",
    legal: "legal_preparation",
    travel: "travel_planner",
    education: "education_path",
    product_essa: "product_essa",
    digital_identity: "digital_identity"
  };

  return mapping[coreIntent] || "none";
}

function workflowIntent(workflowId = "") {
  if (String(workflowId).startsWith("production_") || workflowId === "content_multiplication_package") {
    return "production";
  }

  if (workflowId === "digital_identity_profile") {
    return "digital_identity";
  }

  if (workflowId === "website_project") {
    return "website";
  }

  return null;
}

function workflowWorkspaceIntent(workflowId = "", fallback = "none") {
  const intent = workflowIntent(workflowId);
  return intent ? mapCoreIntentToWorkspaceIntent(intent) : fallback;
}

function isActiveWorkflowContinuation(activeWorkflowState = null) {
  if (!activeWorkflowState?.workflow || activeWorkflowState.completed) {
    return false;
  }

  return !["completed", "cancelled", "canceled"].includes(activeWorkflowState.conversationMode);
}

function detectExplicitWorkflowHint(userText = "") {
  const text = String(userText || "").toLowerCase();

  if (text.includes("target workflow: production_book") || text.includes("production action key: chapter")) {
    return {
      workflowId: "production_book",
      intent: "production",
      workspaceIntent: "production_studio",
      action: text.includes("production action key: chapter") ? "chapter" : null
    };
  }

  return null;
}

function createSelectedCorePlan(userText, intent, workflowId, action = null) {
  const workflow = workflowId ? getWorkflow(workflowId) : null;
  const agent = selectAgent(intent || "unknown");
  const corePlan = planEssaRequest(userText, {
    intent,
    agent,
    workflow
  });

  if (action && corePlan.projectDraft) {
    corePlan.projectDraft.subtype = action === "chapter" ? "book" : corePlan.projectDraft.subtype;
  }

  return corePlan;
}

function createConflicts({
  workspaceRouting,
  rawCorePlan,
  activeWorkflowState,
  selectedWorkspaceIntent,
  selectedCorePlan
}) {
  const conflicts = [];
  const workspaceIntent = workspaceRouting?.intent || "none";
  const coreWorkspaceIntent = mapCoreIntentToWorkspaceIntent(rawCorePlan?.intent);

  if (
    workspaceIntent !== "none" &&
    coreWorkspaceIntent !== "none" &&
    workspaceIntent !== coreWorkspaceIntent
  ) {
    conflicts.push({
      type: "workspace_core_intent_mismatch",
      workspaceIntent,
      coreIntent: rawCorePlan?.intent || "unknown",
      coreWorkspaceIntent,
      resolvedTo: selectedWorkspaceIntent
    });
  }

  if (
    activeWorkflowState?.workflow &&
    rawCorePlan?.workflow?.id &&
    activeWorkflowState.workflow !== rawCorePlan.workflow.id
  ) {
    conflicts.push({
      type: "active_workflow_raw_core_workflow_mismatch",
      activeWorkflow: activeWorkflowState.workflow,
      rawCoreWorkflow: rawCorePlan.workflow.id,
      resolvedTo: activeWorkflowState.workflow
    });
  }

  if (
    activeWorkflowState?.workflow &&
    rawCorePlan?.intent &&
    workflowIntent(activeWorkflowState.workflow) &&
    rawCorePlan.intent !== workflowIntent(activeWorkflowState.workflow)
  ) {
    conflicts.push({
      type: "active_workflow_raw_core_intent_mismatch",
      activeWorkflow: activeWorkflowState.workflow,
      activeIntent: workflowIntent(activeWorkflowState.workflow),
      rawCoreIntent: rawCorePlan.intent,
      resolvedTo: activeWorkflowState.workflow
    });
  }

  return conflicts;
}

export async function orchestrateNavigatorRequest({
  userText = "",
  sessionId = "default",
  surface = "workspace",
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
  traceId = createTraceId()
} = {}) {
  const contextPack = await buildContextPack({
    userText,
    sessionId,
    conversation,
    activeGoal,
    activeWorkflowState,
    activeProject,
    activeProjectId,
    identitySnapshot,
    expressionContext,
    productionIntent,
    permissions,
    profileMemory,
    projectMemory,
    knowledgeSearch,
    debugMode,
    traceId
  });
  const effectiveWorkflowState = activeWorkflowState || contextPack.activeWorkflow?.state || null;
  const effectiveGoal = activeGoal || effectiveWorkflowState?.goal || contextPack.activeGoal || null;
  const effectiveProjectId = activeProjectId || contextPack.activeProject?.id || effectiveWorkflowState?.linkedProjectId || null;
  const workspaceRouting = analyzeWorkspaceIntent(userText);
  const rawCorePlan = planEssaRequest(userText);
  const explicitWorkflow = detectExplicitWorkflowHint(userText);
  const continuation = isActiveWorkflowContinuation(effectiveWorkflowState);
  let decisionSource = "fallback";
  let fallbackUsed = false;
  let workspaceIntent = workspaceRouting.intent;
  let corePlan = rawCorePlan;

  if (continuation) {
    const intent = workflowIntent(effectiveWorkflowState.workflow) || rawCorePlan.intent || "unknown";
    workspaceIntent = effectiveWorkflowState.module || workflowWorkspaceIntent(effectiveWorkflowState.workflow, workspaceIntent);
    corePlan = createSelectedCorePlan(userText, intent, effectiveWorkflowState.workflow, effectiveWorkflowState.action);
    decisionSource = "active_workflow";
  } else if (explicitWorkflow) {
    workspaceIntent = explicitWorkflow.workspaceIntent;
    corePlan = createSelectedCorePlan(userText, explicitWorkflow.intent, explicitWorkflow.workflowId, explicitWorkflow.action);
    decisionSource = "explicit_workflow_hint";
  } else if (workspaceIntent !== "none") {
    decisionSource = "workspace_intent";

    const workspaceIntentName = workspaceIntent === "production_studio"
      ? "production"
      : workspaceIntent === "digital_identity"
        ? "digital_identity"
        : rawCorePlan.intent;

    if (mapCoreIntentToWorkspaceIntent(rawCorePlan.intent) !== workspaceIntent) {
      const workflowId = workspaceIntent === "production_studio" ? "production_video" : null;
      corePlan = workflowId
        ? createSelectedCorePlan(userText, workspaceIntentName, workflowId)
        : rawCorePlan;
    }
  } else if (rawCorePlan?.intent && rawCorePlan.intent !== "unknown") {
    const fallbackIntent = mapCoreIntentToWorkspaceIntent(rawCorePlan.intent);

    if (fallbackIntent !== "none") {
      workspaceIntent = fallbackIntent;
      decisionSource = "core_plan";
      fallbackUsed = true;
    }
  }

  const conflicts = createConflicts({
    workspaceRouting,
    rawCorePlan,
    activeWorkflowState: effectiveWorkflowState,
    selectedWorkspaceIntent: workspaceIntent,
    selectedCorePlan: corePlan
  });
  const decision = buildNavigatorDecision({
    userText,
    workspaceIntent,
    workspaceRouting,
    corePlan,
    activeWorkflowState: {
      ...(effectiveWorkflowState || {}),
      ...(effectiveGoal ? { goal: effectiveGoal } : {})
    },
    decisionSource,
    continuation,
    conflicts,
    fallbackUsed,
    traceId
  });
  const debugTrace = {
    traceId,
    sessionId,
    surface,
    workspaceIntent: workspaceRouting.intent,
    workspaceRouting,
    coreIntent: rawCorePlan.intent,
    corePlan: rawCorePlan,
    activeWorkflow: effectiveWorkflowState?.workflow || null,
    activeProjectId: effectiveProjectId,
    contextPackId: contextPack.contextPackId,
    activeGoalId: contextPack.activeGoal?.goalId || contextPack.activeGoal?.id || null,
    activeWorkflowId: contextPack.activeWorkflow?.workflowId || null,
    artifactIds: contextPack.relevantArtifacts.map((artifact) => ({
      id: artifact.id,
      type: artifact.type
    })),
    contextSources: contextPack.contextSources,
    missingContext: contextPack.missingContext,
    relevantCapabilities: contextPack.systemCapabilities?.capabilities || [],
    productDiscovery: contextPack.productDiscovery
      ? {
        query: contextPack.productDiscovery.query,
        matchedProducts: contextPack.productDiscovery.matchedProducts,
        matchedCapabilities: contextPack.productDiscovery.matchedCapabilities,
        freshnessStatus: contextPack.productDiscovery.freshnessStatus,
        executionPerformed: contextPack.productDiscovery.executionPerformed,
        providerCalls: contextPack.productDiscovery.providerCalls,
        boundedContextMetadata: contextPack.productDiscovery.boundedContextMetadata
      }
      : null,
    knowledgeRetrieved: contextPack.knowledgeRetrieved,
    relevantConversationCount: contextPack.conversationContext.length,
    identitySnapshot: identitySnapshot ? { id: identitySnapshot.id, name: identitySnapshot.name } : null,
    characterCore: contextPack.characterCore ? {
      id: contextPack.characterCore.id,
      path: contextPack.characterCore.path
    } : null,
    expressionContext: contextPack.expressionContext || null,
    productionProfile: contextPack.productionProfile ? {
      profileId: contextPack.productionProfile.profileId,
      identityId: contextPack.productionProfile.identityId
    } : null,
    productionIntent: contextPack.productionIntent || null,
    permissions,
    decisionSource,
    conflicts,
    selectedRoute: decision.route,
    selectedWorkflow: decision.workflowId,
    selectedAgent: decision.agentId,
    fallbackUsed,
    debugMode
  };

  return {
    traceId,
    workspaceRouting,
    rawCorePlan,
    corePlan,
    workspaceIntent,
    decision,
    contextPack,
    debugTrace
  };
}
