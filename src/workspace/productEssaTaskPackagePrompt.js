import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const productEssaTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "ESSA Product Task Package",
  purpose: "Prepare an ESSA product package with concept, audience, value, format, roadmap and launch steps.",
  structure: [
    "Task Title",
    "Goal",
    "Product Concept",
    "Audience",
    "Core Value",
    "Format",
    "Modules / Features",
    "Launch Package",
    "Risks",
    "Roadmap",
    "Approval Block",
    "Next Step"
  ]
});
