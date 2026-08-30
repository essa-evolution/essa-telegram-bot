import { getCapability } from "../capabilities/capabilityRegistry.js";
import { productEducationCards } from "../capabilities/productKnowledge.js";
import { createLisaProductGuideContext } from "../capabilities/capabilityKnowledge.js";
import {
  createProductEducationRequest,
  createProductEducationStrategy
} from "./educationContracts.js";
import { buildClaimPolicy, enforceLisaProductGuideRole } from "./educationPolicy.js";
import { buildSourceVersions, getProductKnowledgeNode } from "./educationFreshness.js";

export function createEducationRequest(input = {}) {
  return createProductEducationRequest({
    requestId: input.requestId || `education_request_${input.productId}_${input.capabilityId}`,
    LisaCharacterContextRef: input.LisaCharacterContextRef || createLisaProductGuideContext().characterCore.id,
    ...input
  });
}

export function buildProductEducationStrategy(input = {}) {
  const request = input.requestId ? createProductEducationRequest(input) : createEducationRequest(input);
  const capability = getCapability(request.capabilityId);
  const productNode = getProductKnowledgeNode(request.productId, request.capabilityId);
  const educationCard = productEducationCards.find((card) =>
    card.productId === request.productId && card.capabilityId === request.capabilityId
  );
  const claimPolicy = buildClaimPolicy({ capability, productNode });
  const sourceVersions = buildSourceVersions({
    productId: request.productId,
    capabilityId: request.capabilityId,
    capability,
    productNode
  });

  const primaryProblem = request.userNeed || educationCard?.problem || productNode?.userNeed || capability?.description || "";
  const userOutcome = educationCard?.expectedOutcome || productNode?.userOutcome || capability?.outputTypes?.join(", ") || "";

  return createProductEducationStrategy({
    strategyId: `strategy_${request.productId}_${request.capabilityId}`,
    productId: request.productId,
    capabilityId: request.capabilityId,
    primaryUserProblem: primaryProblem,
    userOutcome,
    keyMessage: productNode?.plainLanguageDescription || educationCard?.promise || capability?.description || "",
    explanationLevel: request.audience === "DEVELOPER" ? "practical_with_terms" : "plain_practical",
    beginnerAngle: "What this helps with and what the user should provide.",
    practicalAngle: educationCard?.whatUserCanDo || "Describe the goal, input, and expected result.",
    demonstrationAngle: educationCard?.howItWorksPlainLanguage || "Show the workflow as planned steps, not execution.",
    comparisonAngle: "Explain how this differs from a generic template or provider-specific feature.",
    mistakeAngle: "Show the most common request/setup mistakes before execution.",
    FAQAngle: "Answer availability, inputs, outputs, and limitations.",
    eligibility: {
      educationEligible: Boolean(capability?.educationEligible && productNode?.educationEligible !== false),
      contentEligible: Boolean(capability?.contentEligible && productNode?.contentEligible !== false)
    },
    availabilityTruth: claimPolicy,
    limitations: [
      ...(productNode?.limitations || []),
      ...(!claimPolicy.mayClaimCurrentUse ? ["Execution is not currently available for this capability."] : [])
    ],
    freshnessStatus: "CURRENT",
    sourceVersions,
    LisaProductGuide: enforceLisaProductGuideRole(createLisaProductGuideContext().role),
    traceId: request.traceId
  });
}
