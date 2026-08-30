import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const propertyTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "ESSA Property Task Package",
  purpose: "Prepare a real estate task package with goals, location, criteria, budget categories, risks and next steps.",
  safety: "Do not present this as legal, financial, tax or investment advice. Mark all items that need local professional verification.",
  structure: [
    "Task Title",
    "Goal",
    "Location",
    "Property Type",
    "Criteria",
    "Budget Categories",
    "Documents Checklist",
    "Risk Points",
    "Questions For Specialist",
    "Search / Action Plan",
    "Approval Block",
    "Next Step"
  ]
});
