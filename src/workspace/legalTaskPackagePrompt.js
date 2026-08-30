import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const legalTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Legal Preparation Task Package",
  purpose: "Prepare a legal-information package for a human lawyer or careful review: facts, questions, document outline and risk points.",
  safety: "This is not legal advice and not a final legal document. It is a preparation package. Recommend professional legal review for jurisdiction-specific decisions.",
  structure: [
    "Task Title",
    "Goal",
    "Context",
    "Jurisdiction Questions",
    "Facts To Collect",
    "Document / Issue Type",
    "Draft Structure",
    "Risk Points",
    "Questions For Lawyer",
    "Approval Block",
    "Next Step"
  ]
});
