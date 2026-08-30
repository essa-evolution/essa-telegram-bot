export const identityProjectTypes = {
  digital_identity: {
    type: "digital_identity",
    title: "Digital Identity Project",
    subtypes: [
      "lisa_avatar",
      "personal_avatar",
      "talking_avatar",
      "speaking_avatar",
      "singing_avatar",
      "avatar_video"
    ]
  }
};

export function getIdentityProjectType(type = "digital_identity") {
  return identityProjectTypes[type] || identityProjectTypes.digital_identity;
}
