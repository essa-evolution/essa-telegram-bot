import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const businessTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Business Strategy Task Package",
  purpose: "Prepare a business strategy package with model, positioning, priorities, roadmap, risks and execution steps.",
  structure: [
    "Task Title",
    "Goal",
    "Business Context",
    "Target Audience",
    "Value Proposition",
    "Business Model",
    "Strategic Options",
    "Risks",
    "Roadmap",
    "First Actions",
    "Approval Block",
    "Next Step"
  ]
});
