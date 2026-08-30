import { runProductionBookModelBenchmark } from "../src/benchmarks/modelProvider/runner.js";

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function getNumberArg(name, fallback = null) {
  const value = getArgValue(name);

  if (value === null) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const allowProviderCalls = process.argv.includes("--allow-provider-calls");
const executeProviderCall = process.argv.includes("--execute-provider-call");
const report = await runProductionBookModelBenchmark({
  allowProviderCalls,
  executeProviderCall,
  openaiModel: getArgValue("openai-model"),
  maxOutputTokens: getNumberArg("max-output-tokens", 1200),
  maxEstimatedCostUsd: getNumberArg("max-estimated-cost-usd", null),
  maxProviderCalls: getNumberArg("max-provider-calls", 1),
  openAiInputUsdPer1m: getNumberArg("openai-input-usd-per-1m", null),
  openAiOutputUsdPer1m: getNumberArg("openai-output-usd-per-1m", null)
});

console.log(JSON.stringify(report, null, 2));
