export const QUALITY_RUBRIC = [
  {
    key: "goal_fulfillment",
    label: "Goal fulfillment",
    scale: "1-10",
    prompt: "Does the output create a usable chapter draft, not just an outline or plan?"
  },
  {
    key: "context_adherence",
    label: "Context adherence",
    scale: "1-10",
    prompt: "Does the output use the supplied topic, book context, style, effect and outline?"
  },
  {
    key: "structure_adherence",
    label: "Structure adherence",
    scale: "1-10",
    prompt: "Does the output follow a coherent chapter structure with clear sections?"
  },
  {
    key: "russian_language_quality",
    label: "Russian language quality",
    scale: "1-10",
    prompt: "Is the Russian natural, precise and readable?"
  },
  {
    key: "depth",
    label: "Depth",
    scale: "1-10",
    prompt: "Does the chapter develop the idea with sufficient philosophical and emotional depth?"
  },
  {
    key: "clarity",
    label: "Clarity",
    scale: "1-10",
    prompt: "Is the text clear, well-paced and understandable?"
  },
  {
    key: "style_consistency",
    label: "Style consistency",
    scale: "1-10",
    prompt: "Does the writing stay deep, human and non-academic as requested?"
  },
  {
    key: "non_repetition",
    label: "Non repetition",
    scale: "1-10",
    prompt: "Does the text avoid looping, padding and repeated claims?"
  },
  {
    key: "hallucination_risk",
    label: "Hallucination risk",
    scale: "1-10",
    prompt: "Higher score means lower risk: no unsupported facts, fake citations or invented project state."
  },
  {
    key: "editing_needed",
    label: "Editing needed",
    scale: "1-10",
    prompt: "Higher score means less editing is needed before saving as a draft artifact."
  }
];

export function createEmptyHumanScorecard(candidateId) {
  return {
    candidateId,
    scores: Object.fromEntries(QUALITY_RUBRIC.map((item) => [item.key, null])),
    reviewerNotes: "",
    recommendation: "KEEP_TESTING"
  };
}

export function calculateManualAverage(scorecard = {}) {
  const values = Object.values(scorecard.scores || {})
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);

  if (!values.length) {
    return null;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function checkStructuredCompliance(result = {}, task = {}) {
  const content = String(result.content || "");
  const missing = [];
  const requirements = task.outputRequirements || {};

  if (!result.ok) {
    missing.push("ok_result");
  }

  if (requirements.language === "ru" && !/[А-Яа-яЁё]/.test(content)) {
    missing.push("russian_text");
  }

  if (requirements.format === "markdown" && !/^#|\n##\s+/m.test(content)) {
    missing.push("markdown_structure");
  }

  if (requirements.artifactType && !content.trim()) {
    missing.push("artifact_content");
  }

  return {
    ok: missing.length === 0,
    missing
  };
}
