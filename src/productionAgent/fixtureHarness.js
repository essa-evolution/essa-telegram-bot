import fs from "fs";
import {
  createFirstLisaVideoProductionAgentRequest
} from "./firstLisaVideoFixture.js";
import { runProductionAgent } from "./runner.js";

function readJsonFile(filePath) {
  try {
    return {
      ok: true,
      value: JSON.parse(fs.readFileSync(filePath, "utf8"))
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "fixture_json_read_failed",
        message: error.message,
        details: { filePath }
      }
    };
  }
}

export function validateFixtureResponseShape(value = {}) {
  const errors = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      code: "fixture_not_object",
      message: "Fixture response must be a JSON object"
    });
  }

  if (!value.providerId) {
    errors.push({
      code: "missing_provider_id",
      message: "Fixture response must include providerId"
    });
  }

  if (value.toolRequests != null && !Array.isArray(value.toolRequests)) {
    errors.push({
      code: "malformed_tool_requests",
      message: "toolRequests must be an array when present"
    });
  }

  if (value.artifacts != null && !Array.isArray(value.artifacts)) {
    errors.push({
      code: "malformed_artifacts",
      message: "artifacts must be an array when present"
    });
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function createApprovalReadyReport(runResult = {}) {
  const trace = Array.isArray(runResult.trace) ? runResult.trace.at(-1) : null;

  return {
    providerCandidate: runResult.providerId || null,
    semanticSummary: runResult.plan?.summary || null,
    proposedEditDecisions: runResult.plan?.semanticDecisions || [],
    subtitlePlan: runResult.plan?.subtitleChunks || [],
    visualRequests: runResult.plan?.visualRequests || [],
    unresolvedItems: runResult.unresolved || [],
    blockedActions: runResult.validation?.blockedTools || [],
    approvalRequired: runResult.approvalRequired !== false,
    validationResult: runResult.validation?.status || "unknown",
    traceId: trace?.requestId || null,
    trace,
    sourceOfTruth: {
      identity: "ESSA",
      productionProfile: "ESSA",
      artifacts: "ESSA",
      approvals: "ESSA",
      providerResult: "proposal_only"
    }
  };
}

export async function runProductionAgentFixture({
  fixturePath,
  request = createFirstLisaVideoProductionAgentRequest(),
  validationPolicy = {}
} = {}) {
  const loaded = readJsonFile(fixturePath);

  if (!loaded.ok) {
    return {
      ok: false,
      providerId: null,
      validation: {
        status: "rejected",
        errors: [loaded.error],
        blockedTools: []
      },
      approvalReport: createApprovalReadyReport({
        ok: false,
        validation: {
          status: "rejected",
          blockedTools: []
        }
      })
    };
  }

  const shape = validateFixtureResponseShape(loaded.value);
  if (!shape.ok) {
    const rejected = {
      ok: false,
      providerId: loaded.value?.providerId || null,
      validation: {
        status: "rejected",
        errors: shape.errors,
        blockedTools: []
      },
      trace: []
    };

    return {
      ...rejected,
      approvalReport: createApprovalReadyReport(rejected)
    };
  }

  const runResult = await runProductionAgent({
    providerId: loaded.value.providerId,
    request,
    validationPolicy,
    allowFixtureProvider: true,
    fixtureResult: loaded.value
  });

  return {
    ...runResult,
    fixturePath,
    fixtureMode: true,
    providerCallMade: false,
    approvalReport: createApprovalReadyReport(runResult)
  };
}
