export const digitalIdentityWorkflow = {
  id: "digital_identity_profile",
  title: "Digital Identity Profile Workflow",
  type: "digital_identity",
  steps: [
    "identity_purpose",
    "visual_identity",
    "voice_identity",
    "personality",
    "style_prompts",
    "reference_assets",
    "avatar_video_brief",
    "export_identity_passport"
  ]
};

export function getIdentityWorkflow() {
  return digitalIdentityWorkflow;
}
