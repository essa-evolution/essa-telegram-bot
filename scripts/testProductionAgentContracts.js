import fs from "fs";
import {
  canExecuteProductionAgentProvider,
  createProductionAgentProviderRegistry,
  createFirstLisaVideoProductionAgentRequest,
  existingExecutionMappings,
  firstLisaElevenSecondWorkflowFixture,
  getControlledProductionTool,
  getProductionAgentProvider,
  listControlledProductionTools,
  requiresApprovalForProductionTool
} from "../src/productionAgent/index.js";
import { loadLisaCharacterCore } from "../src/identity/lisaCharacterCore.js";
import { lisaProductionProfile } from "../src/identity/lisaProductionProfile.js";
import {
  semanticEditPlanContract,
  visualRequestContract
} from "../src/workspace/semanticEditor.js";
import {
  editPlanContract,
  productionIntentFields
} from "../src/workspace/productionIntent.js";

let failures = 0;

function check(condition, label, details = {}) {
  if (!condition) {
    failures += 1;
  }

  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  if (!condition || Object.keys(details).length) {
    console.log(JSON.stringify(details, null, 2));
  }
}

const claude = getProductionAgentProvider("claude_agent_sdk");
check(
  claude?.providerId === "claude_agent_sdk" &&
    claude.status === "candidate" &&
    claude.executable === false &&
    canExecuteProductionAgentProvider("claude_agent_sdk") === false,
  "Test A claude_agent_sdk exists as candidate/executable=false",
  claude
);

const mvpTools = listControlledProductionTools({ mvp: true });
const request = createFirstLisaVideoProductionAgentRequest();
check(
  firstLisaElevenSecondWorkflowFixture.expectedProcess.includes("human_approval") &&
    request.allowedTools.length === 7 &&
    request.allowedTools.every((toolId) => mvpTools.some((tool) => tool.toolId === toolId)),
  "Test B 11-second workflow can be represented with controlled MVP tools",
  {
    expectedProcess: firstLisaElevenSecondWorkflowFixture.expectedProcess,
    allowedTools: request.allowedTools
  }
);

check(
  mvpTools.every((tool) =>
    !String(tool.toolId).toLowerCase().includes("shell") &&
      !String(tool.capability).toLowerCase().includes("shell") &&
      tool.external === false &&
      tool.paid === false
  ),
  "Test C no unrestricted shell or paid/external tool exists in MVP toolset",
  mvpTools.map((tool) => ({
    toolId: tool.toolId,
    external: tool.external,
    paid: tool.paid
  }))
);

check(
  requiresApprovalForProductionTool("publishing_prepare") === true &&
    getControlledProductionTool("publishing_prepare")?.approvalRequired === true,
  "Test D publishing is approval-required",
  getControlledProductionTool("publishing_prepare")
);

check(
  requiresApprovalForProductionTool("image_request") === true &&
    getControlledProductionTool("image_request")?.paid === true &&
    getControlledProductionTool("image_request")?.external === true,
  "Test E paid/external generation is approval-required",
  getControlledProductionTool("image_request")
);

const mappedToolIds = Object.keys(existingExecutionMappings);
check(
  [
    "inspect_media",
    "transcribe_media",
    "semantic_edit",
    "create_edit_plan",
    "subtitle_render",
    "ffmpeg_render",
    "verify_render"
  ].every((toolId) =>
    mappedToolIds.includes(toolId) &&
      getControlledProductionTool(toolId)?.existingExecutionReference
  ),
  "Test F existing FFmpeg / whisper / semantic editor capabilities map without duplicate implementations",
  existingExecutionMappings
);

check(
  claude.metadata.providerCallsAllowed === false &&
    claude.invoke === null,
  "Test G no provider/API call is possible from registered Claude candidate",
  {
    providerCallsAllowed: claude.metadata.providerCallsAllowed,
    invoke: claude.invoke
  }
);

const extendedRegistry = createProductionAgentProviderRegistry([
  {
    providerId: "openai_agent",
    status: "candidate",
    executable: false,
    capabilities: ["semantic_editing"],
    supports: { controlledTools: true }
  }
]);
const openAiAgent = getProductionAgentProvider("openai_agent", extendedRegistry);
const protectedContractsText = JSON.stringify({
  lisaCharacterCore: loadLisaCharacterCore(),
  lisaProductionProfile,
  semanticEditPlanContract,
  visualRequestContract,
  editPlanContract,
  productionIntentFields
}).toLowerCase();

check(
  openAiAgent?.providerId === "openai_agent" &&
    !protectedContractsText.includes("claude") &&
    !protectedContractsText.includes("anthropic") &&
    !protectedContractsText.includes("claude_agent_sdk"),
  "Test H provider registry can accept another provider without changing Lisa/Semantic contracts",
  {
    addedProvider: openAiAgent?.providerId,
    protectedContractsContainClaude: protectedContractsText.includes("claude")
  }
);

check(
  fs.existsSync("skills/essa-production/SKILL.md"),
  "ESSA Production Skill draft exists"
);

if (failures > 0) {
  console.error(`ProductionAgent contract tests failed: ${failures}`);
  process.exit(1);
}

console.log("ProductionAgent contract tests passed.");
