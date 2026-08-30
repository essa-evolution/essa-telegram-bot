import { createProductContentAngle, contentAngleTypes } from "./educationContracts.js";
import { buildClaimPolicy } from "./educationPolicy.js";
import { buildSourceVersions, getProductKnowledgeNode } from "./educationFreshness.js";
import { getCapability } from "../capabilities/capabilityRegistry.js";

export const bookCoverAngleFixtures = [
  ["book_cover_how_to", contentAngleTypes.howTo, "Как сделать обложку книги", "Turn a book idea into a cover direction."],
  ["book_cover_mistakes", contentAngleTypes.commonMistakes, "3 ошибки в обложке", "Avoid vague genre, audience, and style references."],
  ["book_cover_visual_concept", contentAngleTypes.workflow, "Из идеи книги в визуальную концепцию", "Map story, reader, mood, and format into visual direction."],
  ["book_cover_variants", contentAngleTypes.useCase, "Как сделать несколько вариантов", "Plan variants before any future image execution."],
  ["book_cover_publish_ready", contentAngleTypes.advancedTip, "Как подготовить обложку к публикации", "Connect cover concept to format and publishing requirements."],
  ["book_cover_before_after", contentAngleTypes.beforeAfter, "До/после", "Compare weak brief vs structured cover brief."],
  ["book_cover_faq", contentAngleTypes.faq, "FAQ", "Answer inputs, outputs, and current limitations."],
  ["book_cover_audience", contentAngleTypes.useCase, "Для кого эта функция", "Explain author, publisher, and creator use cases."],
  ["book_cover_truth", contentAngleTypes.mythVsReality, "Что ESSA делает, а что не делает", "Separate architecture from live execution."],
  ["book_cover_prompt", contentAngleTypes.beginnerGuide, "Как написать хороший запрос", "Teach the user what details make a better cover brief."]
];

export const websiteAngleFixtures = [
  ["website_start", contentAngleTypes.beginnerGuide, "Мне нужен сайт, с чего начать?", "Collect goal, audience, pages, tone, and proof points."],
  ["website_inputs", contentAngleTypes.howTo, "Что ESSA собирает для сайта?", "Explain business brief, content, style, and constraints."],
  ["website_verify", contentAngleTypes.workflow, "Как ESSA проверяет сайт?", "Connect Browser Verification to local UI proof."],
  ["website_artifacts", contentAngleTypes.faq, "Что нужно дать ESSA на вход?", "List structured inputs without executing generation."],
  ["website_outputs", contentAngleTypes.resultShowcase, "Что будет на выходе?", "Describe project/code/verification artifacts as future-ready output."],
  ["website_vs_template", contentAngleTypes.comparison, "Чем сайт отличается от шаблона?", "Explain goal-driven structure vs fixed template."],
  ["website_browser", contentAngleTypes.demo, "Как подключается Browser Verification?", "Show read-only observation and verification path."]
];

function defaultAngleFixtures(capabilityId) {
  if (capabilityId === "BOOK_COVER") return bookCoverAngleFixtures;
  if (capabilityId === "WEBSITE_GENERATE") return websiteAngleFixtures;
  return [
    [`${capabilityId.toLowerCase()}_how_to`, contentAngleTypes.howTo, "Как это работает", "Explain the capability as a practical workflow."],
    [`${capabilityId.toLowerCase()}_mistakes`, contentAngleTypes.commonMistakes, "Типичные ошибки", "Show what users should avoid."],
    [`${capabilityId.toLowerCase()}_demo`, contentAngleTypes.demo, "Демонстрация", "Plan a truthful non-executing demo concept."]
  ];
}

export function generateContentAngles({ productId, capabilityId, audience = "GENERAL_USER", maxAngles = 6, traceId } = {}) {
  const capability = getCapability(capabilityId);
  const productNode = getProductKnowledgeNode(productId, capabilityId);
  const claimPolicy = buildClaimPolicy({ capability, productNode });
  const sourceVersion = buildSourceVersions({ productId, capabilityId, capability, productNode });
  const fixtures = defaultAngleFixtures(capabilityId).slice(0, maxAngles);

  return fixtures.map(([slug, angleType, hookConcept, teachingPoint], index) =>
    createProductContentAngle({
      angleId: `angle_${slug}`,
      productId,
      capabilityId,
      angleType,
      userProblem: productNode?.userNeed || capability?.description || "",
      hookConcept,
      teachingPoint,
      demonstrationIdea: `${hookConcept}: structured plan only; no media or provider execution.`,
      expectedOutcome: productNode?.userOutcome || capability?.outputTypes?.join(", ") || "",
      audience,
      complexity: index < 3 ? "beginner" : "intermediate",
      availabilityState: claimPolicy.availabilityState,
      allowedClaims: claimPolicy.allowedClaims,
      prohibitedClaims: claimPolicy.prohibitedClaims,
      sourceVersion,
      freshnessStatus: "CURRENT",
      educationEligible: Boolean(capability?.educationEligible),
      contentEligible: Boolean(capability?.contentEligible),
      traceId
    })
  );
}
