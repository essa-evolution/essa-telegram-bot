# ESSA Autonomous Workflow Orchestration

Phase 21Q adds the first canonical execution workflow orchestration layer for ESSA.

## Scope

The orchestration layer turns one local goal into a verified multi-step execution workflow:

1. `MEDIA_PROBE`
2. `VIDEO_TRIM`
3. `VIDEO_RESIZE`
4. `AUDIO_EXTRACT`

The canonical recipe is `LOCAL_MEDIA_REPURPOSE_PROOF`. Its execution class is `SAFE_LOCAL_MULTI_STEP`.

## Reused Architecture

The implementation is built on the existing execution stack:

- `CapabilityCompositionPlan`
- `Execution21MFlow`
- preflight contracts
- local execution eligibility
- safe local runtime
- 21P workspace artifact and rollback model

It does not introduce a second navigator, planner, media engine, provider layer, or generic shell executor.

## Safety Boundary

Only already-proven local media capabilities may run. Phase 21Q does not allow:

- external providers
- external models
- paid provider activation
- payment actions
- publishing
- deploy
- ads dispatch
- social dispatch
- external account mutation
- production database mutation
- env key or billing mutation
- arbitrary user media upload to an external service

All derived files are created inside `artifacts/execution/phase21q/derived`. The synthetic source fixture is preserved.

## Workflow Contract

`ExecutionWorkflow` contains:

- stable workflow id and version
- recipe id and version
- goal and goal class
- `SAFE_LOCAL_MULTI_STEP` workflow class
- step contracts
- dependencies
- input and output bindings
- preflight result
- final outputs
- verification
- lineage
- rollback state
- zero external action counters

`ExecutionWorkflowStep` contains:

- step id
- capability id
- dependency list
- input bindings
- output bindings
- status
- execution id
- preflight, eligibility, result and verification snapshots

## Binding Rules

Workflow inputs may come from:

- `USER_INPUT`
- `SOURCE_ASSET`
- `STEP_OUTPUT`
- `STEP_OBSERVATION`
- `CANONICAL_DEFAULT`

Downstream steps only receive upstream artifacts or observations after verification. Foreign workflow artifacts, unverified outputs, incompatible types and outputs outside the phase boundary are blocked.

## Execution Policy

The current policy is safe sequential execution. The DAG marks `VIDEO_RESIZE` and `AUDIO_EXTRACT` as parallelizable after `VIDEO_TRIM`, but Phase 21Q executes sequentially for deterministic proof and rollback behavior.

## Failure Policy

Required step failure stops the workflow. Verification failure stops downstream handoff. Failed and verification-failed states are not rewritten as success.

## Rollback

Rollback runs over derived artifacts in reverse topological order and deletes generated files. The source fixture is not modified or deleted.

## Proof

The canonical proof artifact is:

`artifacts/execution/phase21q/AutonomousWorkflowOrchestrationProof.json`

Browser screenshots are written under:

`artifacts/execution/phase21q/screenshots/`

The proof verifies successful execution, invalid DAGs, invalid bindings, type mismatch, stale workflow version, duplicate submit, step failure, verification failure, lineage, rollback and zero external counters.
