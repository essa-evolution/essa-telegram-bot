import { selectAgent } from "./agentRouter.js";
import { detectCoreIntent } from "./intentRouter.js";
import { createProjectDraft } from "./projectRouter.js";
import { selectWorkflow } from "./workflowRouter.js";

export function planEssaRequest(userText = "", options = {}) {
  const intent = options.intent || detectCoreIntent(userText);
  const agent = options.agent || selectAgent(intent);
  const workflow = options.workflow || selectWorkflow(intent, userText);
  const projectDraft = createProjectDraft({
    userText,
    intent,
    agent,
    workflow
  });

  return {
    intent,
    agent,
    workflow,
    projectDraft
  };
}
