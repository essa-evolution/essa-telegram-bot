import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const documentTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Document Factory Task Package",
  purpose: "Prepare a structured document package such as letter, brief, presentation outline, report, specification or template.",
  structure: [
    "Task Title",
    "Goal",
    "Document Type",
    "Audience / Recipient",
    "Key Points",
    "Structure",
    "Draft Content",
    "Missing Inputs",
    "Formatting Notes",
    "Approval Block",
    "Next Step"
  ]
});
