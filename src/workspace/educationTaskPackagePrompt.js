import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const educationTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Education Path Task Package",
  purpose: "Prepare a learning path with goals, modules, practice tasks, materials and progress checkpoints.",
  structure: [
    "Task Title",
    "Goal",
    "Current Level",
    "Learning Path",
    "Modules",
    "Practice Tasks",
    "Materials Needed",
    "Progress Checkpoints",
    "Schedule",
    "Approval Block",
    "Next Step"
  ]
});
