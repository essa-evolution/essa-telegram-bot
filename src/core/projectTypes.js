export const projectTypes = {
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
  },
  production: {
    type: "production",
    title: "Production Project",
    subtypes: [
      "video",
      "book",
      "song",
      "ad",
      "cartoon",
      "animated_story",
      "short_film",
      "documentary",
      "feature_film",
      "music_video",
      "youtube_series",
      "fairytale",
      "educational_animation",
      "content_multiplication"
    ]
  },
  website: {
    type: "website",
    title: "Website Project",
    subtypes: ["site"]
  },
  property: {
    type: "property",
    title: "Property Request",
    subtypes: ["request"]
  },
  marketing: {
    type: "marketing",
    title: "Marketing Campaign",
    subtypes: ["campaign"]
  },
  legal: {
    type: "legal",
    title: "Legal Preparation",
    subtypes: ["preparation"]
  },
  travel: {
    type: "travel",
    title: "Travel Plan",
    subtypes: ["plan"]
  },
  education: {
    type: "education",
    title: "Education Path",
    subtypes: ["path"]
  },
  psychology: {
    type: "psychology",
    title: "Psychology Request",
    subtypes: ["request"]
  },
  product_essa: {
    type: "product_essa",
    title: "ESSA Product",
    subtypes: ["product"]
  },
  unknown: {
    type: "unknown",
    title: "Unknown Project",
    subtypes: ["general"]
  }
};

export function getProjectType(intent) {
  return projectTypes[intent] || projectTypes.unknown;
}
