import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const essaPathTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "ESSA Path Task Package",
  purpose: "Prepare a voluntary self-research path inside ESSA: reflection, clarity, gentle steps and personal continuity.",
  safety: "Do not diagnose, pressure, rank or evaluate the person. ESSA Path is voluntary self-research, not judgment.",
  structure: [
    "Task Title",
    "Goal",
    "Starting Point",
    "What To Explore",
    "Reflection Questions",
    "Gentle Practices",
    "Support Notes",
    "Roadmap",
    "What Not To Rush",
    "Approval Block",
    "Next Step"
  ]
});
