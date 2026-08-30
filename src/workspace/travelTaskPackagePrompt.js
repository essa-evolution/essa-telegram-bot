import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const travelTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Travel Planner Task Package",
  purpose: "Prepare a travel or relocation planning package with route, documents, budget categories, risks and next steps.",
  safety: "Do not present visa, immigration, tax or legal information as final advice. Mark items that need official verification.",
  structure: [
    "Task Title",
    "Goal",
    "Destination",
    "Trip / Relocation Type",
    "Intake Questions",
    "Documents Checklist",
    "Route / Plan",
    "Budget Categories",
    "Risks / Verification",
    "Preparation Roadmap",
    "Approval Block",
    "Next Step"
  ]
});
