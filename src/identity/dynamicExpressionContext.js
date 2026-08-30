export const dynamicExpressionContextFields = [
  "contentType",
  "topic",
  "performanceMode",
  "emotionalTone",
  "energy",
  "humorLevel",
  "ironyLevel",
  "profanityMode",
  "intimacyLevel",
  "seriousness",
  "absurdityLevel",
  "pacingIntent",
  "currentMomentIntent"
];

export function createDynamicExpressionContext(input = {}) {
  return dynamicExpressionContextFields.reduce((context, field) => ({
    ...context,
    [field]: input[field] ?? null
  }), {});
}

export const dynamicExpressionExamples = {
  standupExpression: createDynamicExpressionContext({
    performanceMode: "standup",
    humorLevel: "high",
    ironyLevel: "high",
    profanityMode: "organic",
    energy: "high",
    absurdityLevel: "high"
  }),
  quietReflection: createDynamicExpressionContext({
    performanceMode: "intimate_reflection",
    humorLevel: "low",
    profanityMode: "none",
    energy: "quiet",
    intimacyLevel: "high",
    pacingIntent: "slow"
  })
};

export function hasDynamicExpressionContext(value = null) {
  return Boolean(value) &&
    typeof value === "object" &&
    dynamicExpressionContextFields.some((field) => value[field] != null);
}
