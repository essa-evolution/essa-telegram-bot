import { toolRegistry } from "./toolRegistry.js";

const statusRank = {
  active: 5,
  ready: 4,
  candidate: 3,
  research: 2,
  deprecated: 0
};

const costRank = {
  free: 1,
  cheap: 2,
  medium: 3,
  premium: 4,
  enterprise: 5
};

function normalizeList(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function scoreTool(tool, task, options) {
  let score = 0;
  const requiredCapabilities = normalizeList(task.requiredCapability || task.requiredCapabilities || task.capability);
  const preferredCostLevel = task.costLevel || options.costLevel;
  const executionMode = task.executionMode || options.executionMode;
  const allowedStatuses = normalizeList(options.status || options.statuses);

  if (task.category && tool.category !== task.category) {
    return -1;
  }

  if (allowedStatuses.length && !allowedStatuses.includes(tool.status)) {
    return -1;
  }

  if (executionMode && tool.executionMode !== executionMode) {
    return -1;
  }

  const missingCapability = requiredCapabilities
    .some((capability) => !tool.capabilities.includes(capability));

  if (missingCapability) {
    return -1;
  }

  score += statusRank[tool.status] || 0;

  if (requiredCapabilities.length) {
    score += requiredCapabilities.length * 10;
  }

  if (preferredCostLevel) {
    if (tool.costLevel === preferredCostLevel) {
      score += 8;
    } else if ((costRank[tool.costLevel] || 99) < (costRank[preferredCostLevel] || 99)) {
      score += 4;
    }
  }

  if (task.executionMode && tool.executionMode === task.executionMode) {
    score += 6;
  }

  if (task.preferredProvider && tool.providers.includes(task.preferredProvider)) {
    score += 5;
  }

  return score;
}

export function selectToolForTask(task = {}, options = {}) {
  const candidates = toolRegistry
    .map((tool) => ({
      tool,
      score: scoreTool(tool, task, options)
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (statusRank[b.tool.status] || 0) - (statusRank[a.tool.status] || 0);
    });

  const selected = candidates[0]?.tool || null;

  return {
    selected,
    candidates: candidates.map((item) => item.tool),
    task,
    execution: "not_started"
  };
}
