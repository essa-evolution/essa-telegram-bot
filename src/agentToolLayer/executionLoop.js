import { autonomousExecutionStates } from "./contracts.js";
import { authorizeAgentToolRequest, createAgentOperationTrace, hasSecretLikeValue } from "./policy.js";

function transition(state, event, extra = {}) {
  return {
    state,
    event,
    ...extra,
    at: new Date().toISOString()
  };
}

export function createAutonomousExecutionPolicy(input = {}) {
  return {
    maxAttempts: input.maxAttempts ?? 2,
    maxTurns: input.maxTurns ?? 4,
    maxCostUsd: input.maxCostUsd ?? 0.10,
    timeoutMs: input.timeoutMs ?? 60000,
    allowedTools: [...(input.allowedTools || [])],
    approvalGates: [...(input.approvalGates || ["PUBLISH", "DEPLOY", "EXTERNAL_MUTATION", "COST_INCURRING", "SECURITY_SENSITIVE"])],
    sourceOfTruth: "ESSA Core"
  };
}

export function evaluateCompletion({ providerResult = {}, verification = null } = {}) {
  return {
    accepted: Boolean(verification?.passed === true),
    reason: verification?.passed === true
      ? "verification_passed"
      : "provider_completion_claim_is_not_evidence",
    providerClaimedCompleted: providerResult?.status === "completed" ||
      providerResult?.completion === true ||
      providerResult?.completionState === "completed"
  };
}

export async function runAutonomousExecutionLoop({
  plan = {},
  policy = createAutonomousExecutionPolicy(),
  providerResult = {},
  executor = async () => ({ ok: true, observation: {} }),
  verifier = async () => ({ passed: false, reason: "no verifier supplied" }),
  repairer = async () => ({ ok: true, repairedPlan: plan })
} = {}) {
  const trace = [transition(autonomousExecutionStates.plan, "plan_created", { sourceOfTruth: policy.sourceOfTruth })];
  let attempts = 0;
  let turns = 0;
  let currentPlan = plan;
  let lastObservation = null;
  let lastVerification = null;

  if (hasSecretLikeValue({ plan, providerResult })) {
    return {
      ok: false,
      state: autonomousExecutionStates.blocked,
      trace: [
        ...trace,
        transition(autonomousExecutionStates.blocked, "secret_like_value_blocked")
      ],
      error: "secret_like_value_detected"
    };
  }

  while (attempts <= policy.maxAttempts && turns < policy.maxTurns) {
    turns += 1;
    trace.push(transition(autonomousExecutionStates.execute, "execute_started", { attempts, turns }));

    for (const toolRequest of currentPlan.toolRequests || []) {
      const authorization = authorizeAgentToolRequest({
        toolId: toolRequest.toolId,
        requestedByModel: true,
        allowedTools: policy.allowedTools,
        operation: toolRequest.operation || "read",
        readScope: toolRequest.readScope,
        writeScope: toolRequest.writeScope,
        environment: toolRequest.environment,
        approval: toolRequest.approval || null
      });

      if (!authorization.ok) {
        trace.push(transition(autonomousExecutionStates.blocked, "tool_authorization_blocked", {
          toolId: toolRequest.toolId,
          errors: authorization.errors
        }));

        return {
          ok: false,
          state: autonomousExecutionStates.blocked,
          trace,
          validation: { errors: authorization.errors }
        };
      }
    }

    lastObservation = await executor(currentPlan);
    trace.push(transition(autonomousExecutionStates.observe, "observation_captured", {
      ok: lastObservation.ok === true
    }));

    lastVerification = await verifier(lastObservation);
    trace.push(transition(
      attempts === 0 ? autonomousExecutionStates.verify : autonomousExecutionStates.reverify,
      "verification_completed",
      { passed: lastVerification.passed === true }
    ));

    const completion = evaluateCompletion({ providerResult, verification: lastVerification });
    if (completion.accepted) {
      trace.push(transition(autonomousExecutionStates.readyForApproval, "ready_for_human_approval", {
        completion
      }));

      return {
        ok: true,
        state: autonomousExecutionStates.readyForApproval,
        attempts,
        turns,
        observation: lastObservation,
        verification: lastVerification,
        trace: [
          ...trace,
          createAgentOperationTrace({
            intent: plan.intent,
            modelProvider: providerResult.providerId || null,
            result: { readyForApproval: true },
            verification: lastVerification,
            approval: { required: true }
          })
        ]
      };
    }

    if (attempts >= policy.maxAttempts) {
      trace.push(transition(autonomousExecutionStates.blocked, "max_repair_attempts_reached", {
        maxAttempts: policy.maxAttempts
      }));

      return {
        ok: false,
        state: autonomousExecutionStates.blocked,
        attempts,
        turns,
        observation: lastObservation,
        verification: lastVerification,
        completion,
        trace
      };
    }

    attempts += 1;
    trace.push(transition(autonomousExecutionStates.repair, "repair_started", { attempts }));
    const repair = await repairer(currentPlan, lastObservation, lastVerification);
    currentPlan = repair.repairedPlan || currentPlan;
  }

  trace.push(transition(autonomousExecutionStates.blocked, "max_turns_reached", {
    maxTurns: policy.maxTurns
  }));

  return {
    ok: false,
    state: autonomousExecutionStates.blocked,
    attempts,
    turns,
    observation: lastObservation,
    verification: lastVerification,
    trace
  };
}
