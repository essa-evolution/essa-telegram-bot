import {
  CLAUDE_ONE_CALL_APPROVAL_VALUE,
  DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD,
  DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS,
  DEFAULT_CLAUDE_SANDBOX_MODEL,
  DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS,
  runClaudeOneCallSandbox,
  sanitizeClaudeOneCallResult
} from "../src/productionAgent/index.js";

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute-one-call");
const dryRun = !execute || args.has("--dry-run");

const result = await runClaudeOneCallSandbox({
  dryRun,
  execute,
  explicitRuntimeApproval: process.env.CLAUDE_AGENT_RUNTIME_APPROVAL === CLAUDE_ONE_CALL_APPROVAL_VALUE,
  runtimeApprovalValue: process.env.CLAUDE_AGENT_RUNTIME_APPROVAL || "",
  model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_SANDBOX_MODEL,
  maxTokens: Number(process.env.CLAUDE_AGENT_MAX_TOKENS || DEFAULT_CLAUDE_SANDBOX_MAX_TOKENS),
  maxTurns: Number(process.env.CLAUDE_AGENT_MAX_TURNS || 1),
  maxCostUsd: Number(process.env.CLAUDE_AGENT_MAX_COST_USD || DEFAULT_CLAUDE_SANDBOX_MAX_COST_USD),
  timeoutMs: Number(process.env.CLAUDE_AGENT_TIMEOUT_MS || DEFAULT_CLAUDE_SANDBOX_TIMEOUT_MS)
});

const safeResult = sanitizeClaudeOneCallResult(result);
console.log(JSON.stringify(safeResult, null, 2));

if (!safeResult.ok && safeResult.status !== "dry_run") {
  process.exit(1);
}
