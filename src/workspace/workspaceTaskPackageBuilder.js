import axios from "axios";
import { approvalBlock, hasApprovalBlock } from "../factory/approvalBlock.js";
import { buildTaskPackage } from "../factory/taskPackageBuilder.js";
import { formatTaskPackage } from "../factory/formatTaskPackage.js";
import { businessTaskPackagePrompt } from "./businessTaskPackagePrompt.js";
import { documentTaskPackagePrompt } from "./documentTaskPackagePrompt.js";
import { analyzeWorkspaceIntent } from "./detectWorkspaceIntent.js";
import { educationTaskPackagePrompt } from "./educationTaskPackagePrompt.js";
import { essaPathTaskPackagePrompt } from "./essaPathTaskPackagePrompt.js";
import { legalTaskPackagePrompt } from "./legalTaskPackagePrompt.js";
import { marketingTaskPackagePrompt } from "./marketingTaskPackagePrompt.js";
import { navigatorCapabilitySummary } from "./navigatorCapabilitySummary.js";
import {
  buildFinalProductionBlueprintReply,
  buildProductionStudioIntakeReply,
  buildProductionStudioRouteReply,
  productionStudioTaskPackagePrompt
} from "./productionStudioTaskPackagePrompt.js";
import { productEssaTaskPackagePrompt } from "./productEssaTaskPackagePrompt.js";
import { propertyTaskPackagePrompt } from "./propertyTaskPackagePrompt.js";
import { travelTaskPackagePrompt } from "./travelTaskPackagePrompt.js";
import {
  buildWebsiteStudioIntakeReply,
  websiteTaskPackagePrompt
} from "./websiteTaskPackagePrompt.js";

const DEFAULT_MODEL = "gpt-4o-mini";

const PROMPT_BUILDERS = {
  website_studio: websiteTaskPackagePrompt,
  marketing_factory: marketingTaskPackagePrompt,
  document_factory: documentTaskPackagePrompt,
  legal_preparation: legalTaskPackagePrompt,
  travel_planner: travelTaskPackagePrompt,
  business_strategy: businessTaskPackagePrompt,
  education_path: educationTaskPackagePrompt,
  essa_path: essaPathTaskPackagePrompt,
  property: propertyTaskPackagePrompt,
  production_studio: productionStudioTaskPackagePrompt,
  product_essa: productEssaTaskPackagePrompt
};

export async function buildWorkspaceTaskPackage(userText, workspaceIntent, options = {}) {
  const routing = analyzeWorkspaceIntent(userText);

  if (workspaceIntent === "content_factory" && routing.intent === "production_studio") {
    workspaceIntent = "production_studio";
  }

  if (workspaceIntent === "content_factory" || workspaceIntent === "project_factory") {
    return buildTaskPackage(userText, workspaceIntent, options);
  }

  if (workspaceIntent === "digital_identity") {
    return formatTaskPackage([
      "Приняла. Я направляю это в работу с цифровой личностью.",
      "",
      "Сначала соберу задачу по образу, голосу, стилю и материалам, а затем подготовлю следующий понятный шаг без необходимости выбирать внутренние разделы вручную."
    ].join("\n"));
  }

  const promptBuilder = PROMPT_BUILDERS[workspaceIntent];

  if (!promptBuilder) {
    throw new Error(`Unsupported workspace intent: ${workspaceIntent}`);
  }

  if (workspaceIntent === "production_studio") {
    const finalBlueprintReply = buildFinalProductionBlueprintReply(userText);

    if (finalBlueprintReply) {
      return formatTaskPackage(finalBlueprintReply);
    }

    const routeReply = buildProductionStudioRouteReply(userText);

    if (routeReply) {
      return formatTaskPackage(routeReply);
    }

    const intakeReply = buildProductionStudioIntakeReply(userText);

    if (intakeReply) {
      return formatTaskPackage(intakeReply);
    }
  }

  if (workspaceIntent === "website_studio") {
    const intakeReply = buildWebsiteStudioIntakeReply(userText);

    if (intakeReply) {
      return formatTaskPackage(intakeReply);
    }
  }

  const apiKey = options.openAiApiKey || process.env.OPENAI_API_KEY;
  const model = options.model || DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to build a workspace task package");
  }

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: promptBuilder(userText, navigatorCapabilitySummary),
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
  if (workspaceIntent === "production_studio") {
    return formatTaskPackage(content);
  }

  const withApproval = hasApprovalBlock(content)
    ? content
    : `${content}\n\n${approvalBlock()}`;

  return formatTaskPackage(withApproval);
}
