import { createWorkspaceTaskPackagePrompt } from "./workspacePromptHelpers.js";

export const marketingTaskPackagePrompt = createWorkspaceTaskPackagePrompt({
  title: "Marketing Factory Task Package",
  purpose: "Prepare a marketing package with offer, audience, funnel, messages, channels and campaign steps.",
  structure: [
    "Task Title",
    "Goal",
    "Audience",
    "Offer",
    "Positioning",
    "Funnel",
    "Ad Angles",
    "Content Ideas",
    "Channels",
    "Asset Checklist",
    "Approval Block",
    "Next Step"
  ]
});
