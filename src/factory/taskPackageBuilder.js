import axios from "axios";
import { approvalBlock, hasApprovalBlock } from "./approvalBlock.js";
import { contentTaskPackagePrompt } from "./contentTaskPackagePrompt.js";
import { formatTaskPackage } from "./formatTaskPackage.js";
import { projectTaskPackagePrompt } from "./projectTaskPackagePrompt.js";

const DEFAULT_MODEL = "gpt-4o-mini";

function getMessages(userText, factoryType) {
  if (factoryType === "content_factory") {
    return contentTaskPackagePrompt(userText);
  }

  if (factoryType === "project_factory") {
    return projectTaskPackagePrompt(userText);
  }

  throw new Error(`Unsupported factory type: ${factoryType}`);
}

export async function buildTaskPackage(userText, factoryType, options = {}) {
  const apiKey = options.openAiApiKey || process.env.OPENAI_API_KEY;
  const model = options.model || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to build a task package");
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: getMessages(userText, factoryType),
      temperature: 0.4
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  const content = response.data.choices[0].message.content;
  const withApproval = hasApprovalBlock(content)
    ? content
    : `${content}\n\n${approvalBlock()}`;

  return formatTaskPackage(withApproval);
}
