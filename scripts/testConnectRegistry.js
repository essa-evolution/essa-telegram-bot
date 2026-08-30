import { selectToolForTask, validateToolRegistry } from "../src/connect/index.js";

const registryValidation = validateToolRegistry();
const invalidTools = registryValidation.filter((item) => !item.valid);

if (invalidTools.length) {
  console.error("Invalid tools:");
  console.error(JSON.stringify(invalidTools, null, 2));
  process.exit(1);
}

const cases = [
  {
    name: "voice tool for cheap/local TTS",
    task: {
      category: "voice",
      requiredCapabilities: ["tts", "local_tts", "cheap_tts"],
      costLevel: "cheap",
      executionMode: "local"
    },
    expectedToolId: "piper"
  },
  {
    name: "voice tool for premium clone",
    task: {
      category: "voice",
      requiredCapabilities: ["tts", "voice_clone", "premium_clone"],
      costLevel: "premium",
      executionMode: "local"
    },
    expectedToolId: "xtts"
  },
  {
    name: "video rendering tool",
    task: {
      category: "video",
      requiredCapability: "video_rendering",
      executionMode: "local"
    },
    expectedToolId: "remotion"
  },
  {
    name: "automation tool",
    task: {
      category: "automation",
      requiredCapability: "workflow_orchestration"
    },
    expectedToolId: "n8n"
  },
  {
    name: "browser tool",
    task: {
      category: "browser",
      requiredCapability: "browser_automation"
    },
    expectedToolId: "playwright"
  },
  {
    name: "search tool",
    task: {
      category: "search",
      requiredCapability: "web_search"
    },
    expectedToolId: "perplexity"
  },
  {
    name: "crawl search tool",
    task: {
      category: "search",
      requiredCapability: "crawl"
    },
    expectedToolId: "firecrawl"
  }
];

let failures = 0;

for (const testCase of cases) {
  const result = selectToolForTask(testCase.task);
  const actualToolId = result.selected?.id || null;
  const passed = actualToolId === testCase.expectedToolId;

  if (!passed) {
    failures += 1;
  }

  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.name}`);
  console.log(JSON.stringify({
    selected: actualToolId,
    expected: testCase.expectedToolId,
    execution: result.execution
  }, null, 2));
}

if (failures > 0) {
  console.error(`ESSA Connect registry tests failed: ${failures}`);
  process.exit(1);
}

console.log("ESSA Connect registry tests passed.");
